import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router";
import { db } from "../../lib/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { getCurrentAuthToken } from "../../lib/firebase";
import { supabase } from "../../lib/supabase";
import { Order } from "../../types/models";
import { useAuthStore } from "../../lib/store";
import toast from "react-hot-toast";
import { uploadMediaToCloudinary } from "../../lib/cloudinary";
import DeclineDeliveryReasonModal from "../../components/delivery/DeclineDeliveryReasonModal";
import { useNotificationDebugger } from "../../hooks/useNotificationDebugger";
import { DeliveryAlarmManager } from "../../services/DeliveryAlarmManager";
import { 
  MapPin, Package, Map as MapIcon, ShieldAlert, Navigation2, Zap, 
  Crosshair, Utensils, Star, PhoneCall, CheckCircle2, Camera, Volume2, VolumeX,
  Compass, RotateCcw, Play, Square, WifiOff, AlertTriangle, AlertCircle, PackageOpen
} from "lucide-react";
import { RESTAURANT_LOCATION } from "../../lib/config";
import { playNotificationSound } from "../../hooks/useNotificationSound";
import { motion, AnimatePresence } from 'framer-motion';
import { useTrackingStore } from "../../lib/trackingStore";
import { Capacitor } from '@capacitor/core';
import { DeliveryPlugin } from "../../lib/DeliveryPlugin";
import { useShallow } from 'zustand/react/shallow';
import UniversalMap3D from "../../components/map/UniversalMap3D";
import type { MapMarker, UniversalMap3DRef } from "../../components/map/UniversalMap3D";
import { fetchRoute, formatDistance, formatDuration, formatISTArrivalTime, isOffRoute, haversineDistanceMeters } from "../../services/navigationRouting.service";
import { buildInstruction, getNavLanguage, setNavLanguage, NavLanguage } from "../../services/navigationInstructions";
import * as TTS from "../../services/TextToSpeech.service";
import { Search } from "lucide-react";

export default function DeliveryDashboard() {
  const navigate = useNavigate();
  const { user: authUser } = useAuthStore();
  const [liveUser, setLiveUser] = useState<any>(authUser);
  const user = liveUser; 
  const [tasks, setTasks] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [gpsPermission, setGpsPermission] = useState<PermissionState | "unsupported">("prompt");
  const [isOfflineMode, setIsOfflineMode] = useState(!navigator.onLine);
  
  // Proof State
  const [showProofModal, setShowProofModal] = useState(false);
  const [completingOrderId, setCompletingOrderId] = useState<string | null>(null);
  const [proofNote, setProofNote] = useState("");
  const [proofImage, setProofImage] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [supabaseConnected, setSupabaseConnected] = useState(false);

  // ── Navigation Subsystem State ──────────────────────────────────────────────
  const [isNavigating, setIsNavigating] = useState(false);
  const [navRoute, setNavRoute] = useState<GeoJSON.Feature<GeoJSON.LineString> | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);
  const [routeSteps, setRouteSteps] = useState<any[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [currentInstruction, setCurrentInstruction] = useState<string>('');
  const [distanceRemainingMeters, setDistanceRemainingMeters] = useState<number>(0);
  const [durationRemainingSeconds, setDurationRemainingSeconds] = useState<number>(0);
  const [isMuted, setIsMuted] = useState(TTS.getMuted());
  const [navLang, setNavLang] = useState<NavLanguage>(getNavLanguage());
  const [mapOrientation, setMapOrientation] = useState<'heading' | 'north'>('heading');
  const [riderSpeedKmh, setRiderSpeedKmh] = useState<number | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [isRerouting, setIsRerouting] = useState(false);

  const mapRef = useRef<UniversalMap3DRef | null>(null);
  const lastSpokenManeuverRef = useRef<string>('');

  // Warm TTS voices on mount
  useEffect(() => { TTS.warmVoices(); }, []);

  const { location, setLocation, setDebugData: setStoreDebugData } = useTrackingStore(useShallow(state => ({
    location: state.location,
    setLocation: state.setLocation,
    setDebugData: state.setDebugData
  })));
  const gpsWriteCountRef = useRef(0);

  const lastLocationRef = useRef<{lat: number; lng: number; time: number} | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastGPSPositionRef = useRef<GeolocationPosition | null>(null);
  const gpsCleanupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Network offline listener
  useEffect(() => {
    const handleOnline = () => setIsOfflineMode(false);
    const handleOffline = () => setIsOfflineMode(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!authUser?.uid) return;
    const unsubscribe = onSnapshot(doc(db, "users", authUser.uid), (docSnap) => {
      if (docSnap.exists()) {
        setLiveUser((prev: any) => ({ ...(prev || authUser), ...docSnap.data() }));
      }
    });
    return () => unsubscribe();
  }, [authUser?.uid]);

  const [isNative, setIsNative] = useState(false);
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const { error } = await supabase.from("delivery_locations").select("count").limit(1);
        if (!error) {
          setSupabaseConnected(true);
          setStoreDebugData((prev) => ({ ...prev, supabaseConnected: true }));
        }
      } catch (e) {
        setSupabaseConnected(false);
      }
    };
    checkConnection();

    import('@capacitor/core').then(({ Capacitor }) => {
      setIsNative(Capacitor.isNativePlatform());
    }).catch(() => {});
  }, []);

  const toggleStatus = async (forcedStatus?: string) => {
    if (!user?.uid) return;
    const newStatus = forcedStatus || ((user.deliveryStatus || user.status) === "online" ? "offline" : "online");
    try {
      await updateDoc(doc(db, "users", user.uid), { 
        status: newStatus,
        deliveryStatus: newStatus,
        lastStatusUpdate: new Date().toISOString()
      });
      if (newStatus === "offline" || newStatus === "break") {
        await supabase.from("delivery_locations").update({ online_status: false }).eq("delivery_partner_id", user.uid);
      } else {
        await supabase.from("delivery_locations").update({ online_status: true }).eq("delivery_partner_id", user.uid);
      }
      toast.success(`Status changed to ${newStatus.toUpperCase()}`);
    } catch (e) {
      toast.error("Failed to update status");
    }
  };

  const writeLocationToSupabase = useCallback(
    async (lat: number, lng: number, heading: number | null, speed: number | null, accuracy: number | null, activeOrderId: string | null) => {
      if (!user?.uid || isOfflineMode) return;
      const payload = {
        delivery_partner_id: user.uid,
        active_order_id: activeOrderId,
        latitude: lat,
        longitude: lng,
        accuracy,
        speed,
        heading,
        online_status: true,
        last_updated: new Date().toISOString(),
      };
      const { error } = await supabase.from("delivery_locations").upsert(payload, { onConflict: "delivery_partner_id" });
      if (!error) {
        gpsWriteCountRef.current += 1;
        setStoreDebugData((prev) => ({
          ...prev, dbLat: lat, dbLng: lng, dbLastUpdated: new Date().toISOString(), gpsWriteCount: gpsWriteCountRef.current,
        }));
      }
    },
    [user?.uid, isOfflineMode],
  );

  const [searchTerm, setSearchTerm] = useState("");
  
  const filteredTasks = tasks.filter(t => {
    if (!searchTerm.trim()) return true;
    const lower = searchTerm.toLowerCase();
    return t.dailyOrderNumber?.toLowerCase().includes(lower) || 
           t.id?.toLowerCase().includes(lower);
  });

  const activeTask = filteredTasks[0];

  // Extract customer destination coordinates
  const customerCoords = useMemo(() => {
    if (!activeTask) return null;
    const lat = activeTask.deliveryAddress?.lat ?? (activeTask as any).deliveryAddressCoordinates?.lat ?? (activeTask as any).lat ?? (activeTask as any).customerLocation?.lat;
    const lng = activeTask.deliveryAddress?.lng ?? (activeTask as any).deliveryAddressCoordinates?.lng ?? (activeTask as any).lng ?? (activeTask as any).customerLocation?.lng;
    if (lat != null && lng != null && !isNaN(Number(lat)) && !isNaN(Number(lng))) {
      return { lat: Number(lat), lng: Number(lng) };
    }
    return null;
  }, [activeTask]);

  // Calculate distance to customer for 100m rule
  const distanceToCustomerMeters = useMemo(() => {
    if (!location || !customerCoords) return Infinity;
    return haversineDistanceMeters(location.lat, location.lng, customerCoords.lat, customerCoords.lng);
  }, [location, customerCoords]);

  const canMarkDelivered = distanceToCustomerMeters <= 100;

  // Load driving route when active task or location updates
  const loadRoute = useCallback(async (origin: { lat: number; lng: number }, destination: { lat: number; lng: number }, orderId?: string) => {
    try {
      const token = await getCurrentAuthToken();
      // Try backend routing route first
      const res = await fetch('/api/navigation/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ origin, destination, orderId }),
      });

      if (res.ok) {
        const data = await res.json();
        setNavRoute(data.geojson);
        setRouteCoordinates(data.coordinates || []);
        setRouteSteps(data.steps || []);
        setDistanceRemainingMeters(data.distanceMeters || 0);
        setDurationRemainingSeconds(data.durationSeconds || 0);
        if (data.steps?.[0]) {
          const text = buildInstruction(data.steps[0], navLang);
          setCurrentInstruction(text);
        }
        return data;
      }
    } catch (e) {
      // Fall back to client OSRM service
    }

    const clientRoute = await fetchRoute(origin, destination, orderId);
    if (clientRoute) {
      setNavRoute(clientRoute.geojson);
      setRouteCoordinates(clientRoute.coordinates);
      setRouteSteps(clientRoute.steps);
      setDistanceRemainingMeters(clientRoute.distanceMetres);
      setDurationRemainingSeconds(clientRoute.durationSeconds);
      if (clientRoute.steps[0]) {
        const text = buildInstruction(clientRoute.steps[0], navLang);
        setCurrentInstruction(text);
      }
    }
    return clientRoute;
  }, [navLang]);

  // Start Navigation session
  const handleStartNavigation = async () => {
    if (!activeTask?.id) {
      toast.error("No active order for navigation");
      return;
    }
    navigate(`/delivery/navigation/${activeTask.id}`);
  };

  // Stop Navigation session
  const handleStopNavigation = async () => {
    setIsNavigating(false);
    if (activeTask?.id) {
      try {
        const token = await getCurrentAuthToken();
        await fetch('/api/navigation/session/stop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ orderId: activeTask.id }),
        });
      } catch (e: any) {
        console.warn('[Navigation] Stop session warning:', e.message);
      }
    }
    TTS.stopAll();
    toast.success("Navigation Stopped");
  };

  // Tracking effect
  useEffect(() => {
    const activeDeliveries = tasks.filter((t) => t.status === "out_for_delivery");
    
    const stopAllTracking = async () => {
      if (watchIdRef.current !== null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
      if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null; }
      if (Capacitor.isNativePlatform()) {
        await DeliveryPlugin.stopTracking().catch(console.error);
      }
    };

    if (!user?.uid || user.status !== "online") {
      stopAllTracking();
      return;
    }

    const activeOrderId = activeDeliveries.length > 0 ? activeDeliveries[0].id || null : null;
    
    const startNativeTracking = async (orderId: string) => {
      if (Capacitor.isNativePlatform()) {
        const { auth } = await import('../../lib/firebase');
        const token = await auth.currentUser?.getIdToken();
        if (token) {
          await DeliveryPlugin.startTracking({ orderId, token }).catch(console.error);
        }
      }
    };

    if (activeOrderId) {
      startNativeTracking(activeOrderId);
    } else {
      if (Capacitor.isNativePlatform()) {
        DeliveryPlugin.stopTracking().catch(console.error);
      }
    }

    if (!navigator.geolocation) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = position.coords.accuracy;
        const rawSpeed = position.coords.speed;
        const heading = position.coords.heading;
        const now = Date.now();

        lastGPSPositionRef.current = position;
        setGpsAccuracy(accuracy);

        // Convert speed m/s to km/h with sensible filtering
        if (rawSpeed != null && !isNaN(rawSpeed) && rawSpeed >= 0) {
          const kmh = Math.round(rawSpeed * 3.6);
          setRiderSpeedKmh(kmh > 120 ? null : kmh); // Filter GPS speed spikes
        } else {
          setRiderSpeedKmh(null);
        }

        setStoreDebugData((prev) => ({
          ...prev, gpsLat: lat, gpsLng: lng, gpsHeading: heading ?? undefined, gpsSpeed: rawSpeed ?? undefined, gpsAccuracy: accuracy, gpsTimestamp: now, orderId: activeOrderId || prev.orderId, partnerId: user.uid,
        }));

        if (lastLocationRef.current) {
          const timeDiff = now - lastLocationRef.current.time;
          const distance = haversineDistanceMeters(lastLocationRef.current.lat, lastLocationRef.current.lng, lat, lng);
          if (distance < 5 && timeDiff < 4000) return; 
        }

        const newLoc = { lat, lng, time: now, heading: heading ?? 0 };
        lastLocationRef.current = newLoc;
        setLocation(newLoc);
        
        // Auto reroute check during navigation
        if (isNavigating && customerCoords && routeCoordinates.length > 0) {
          const offRoute = isOffRoute({ lat, lng }, routeCoordinates, accuracy > 50 ? 80 : 50);
          if (offRoute && !isRerouting) {
            setIsRerouting(true);
            toast("Off route detected — Recalculating route...", { icon: '🔄' });
            loadRoute({ lat, lng }, customerCoords, activeTask?.id).finally(() => setIsRerouting(false));
          }
        }

        // Telemetry update to backend if active navigation
        if (isNavigating && activeOrderId) {
          try {
            const token = await getCurrentAuthToken();
            fetch('/api/navigation/session/update', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ orderId: activeOrderId, latitude: lat, longitude: lng, speed: rawSpeed, heading, accuracy }),
            }).catch(() => {});
          } catch {}
        }

        if (!Capacitor.isNativePlatform()) {
          await writeLocationToSupabase(lat, lng, heading, rawSpeed, accuracy, activeOrderId);
        }
      },
      (error) => console.error("GPS Error", error),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );

    if (activeDeliveries.length > 0 && !Capacitor.isNativePlatform()) {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      heartbeatRef.current = setInterval(async () => {
        const pos = lastGPSPositionRef.current;
        if (!pos) return;
        await writeLocationToSupabase(pos.coords.latitude, pos.coords.longitude, pos.coords.heading, pos.coords.speed, pos.coords.accuracy, activeOrderId);
      }, 5000);
    } else {
      if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null; }
    }

    return () => {
      stopAllTracking();
    };
  }, [tasks, user?.uid, user?.status, writeLocationToSupabase, isNavigating, customerCoords, routeCoordinates, isRerouting, loadRoute, activeTask?.id, setLocation, setStoreDebugData]);

  const prevAssignmentsCountRef = useRef(0);

  useEffect(() => {
    if (navigator.permissions && navigator.geolocation) {
      navigator.permissions.query({ name: "geolocation" }).then((result) => {
        setGpsPermission(result.state);
        result.onchange = () => setGpsPermission(result.state);
      });
    }
    if (!user?.uid) return;
    const q = query(collection(db, "orders"), where("deliveryPartnerId", "==", user.uid), where("status", "in", ["partner_assigned", "ready", "picked_up", "out_for_delivery"]));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const liveOrders = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Order);
      const newAssignments = liveOrders.filter((o) => o.status === "partner_assigned");
      
      if (newAssignments.length > prevAssignmentsCountRef.current) {
        playNotificationSound("partner_assigned");
        toast.success("New Delivery Assigned!", { duration: 5000 });
      }
      prevAssignmentsCountRef.current = newAssignments.length;
      
      setTasks(liveOrders);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user?.uid]);

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [decliningOrderId, setDecliningOrderId] = useState<string | null>(null);

  const handleDeclineSubmit = async (reason: string) => {
    if (!decliningOrderId) return;
    setProcessingId(decliningOrderId);
    try {
      const token = await getCurrentAuthToken();
      const res = await fetch('/api/notifications/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderId: decliningOrderId, action: 'reject_delivery', reason })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to decline');
      toast.success('Order declined');
    } catch (error: any) {
      toast.error(`Decline failed: ${error.message}`);
      throw error;
    } finally {
      setProcessingId(null);
      setDecliningOrderId(null);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setProcessingId(orderId);
    DeliveryAlarmManager.stopAlarm();
    const isDebug = useNotificationDebugger.getState().isDebugMode;
    try {
      if (isOfflineMode) {
        toast.error("Cannot update status while offline.");
        return;
      }
      
      const currentTask = tasks.find((t) => t.id === orderId);
      const token = await getCurrentAuthToken();

      // If out_for_delivery, trigger navigation start automatically
      if (newStatus === "out_for_delivery" && currentTask && user?.uid && customerCoords && location) {
        handleStartNavigation();
      }

      const isDebug = useNotificationDebugger.getState().isDebugMode;
      if (isDebug) useNotificationDebugger.getState().startTrace('POST /api/notifications/action', newStatus, orderId);

      const res = await fetch('/api/notifications/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...(isDebug ? { 'X-Debug-Mode': 'true' } : {})
        },
        body: JSON.stringify({ orderId, action: newStatus, currentStage: currentTask?.status })
      });

      const data = await res.json();
      if (isDebug && data.trace) useNotificationDebugger.getState().updateTrace(data.trace);
      if (!res.ok) {
        if (!data.duplicate) throw new Error(data.error);
      }

      toast.success(`Status updated: ${newStatus.replace(/_/g, " ").toUpperCase()}`);
    } catch (error: any) { 
      toast.error(`Update failed: ${error.message}`); 
    } finally {
      setProcessingId(null);
    }
  };

  const handleCompleteSubmit = async () => {
    if (!completingOrderId) return;
    setIsUploading(true);
    let photoUrl = "";
    try {
      if (proofImage) {
        const res = await uploadMediaToCloudinary(proofImage, "olive-pizza/delivery-proofs");
        photoUrl = res.secureUrl;
      }
      
      const token = await getCurrentAuthToken();

      // Submit delivery completion to backend (includes strict 100m validation on server)
      const res = await fetch(`/api/delivery/orders/${completingOrderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          status: "delivered",
          lat: location?.lat,
          lng: location?.lng,
          deliveryProof: { photoUrl, note: proofNote }
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to complete delivery');

      // Stop active navigation session
      await handleStopNavigation();
      
      const partnerId = user?.uid || "";
      try {
        await supabase.from("delivery_locations").update({ active_order_id: null, online_status: false, last_updated: new Date().toISOString() }).eq("delivery_partner_id", partnerId);
      } catch (e) {
        console.warn('Supabase delivery location update warning:', e);
      }

      const payoutPerOrder = activeTask?.deliveryFee || 40;
      if (user?.uid) {
        await updateDoc(doc(db, "users", user.uid), {
          "earnings.today": (user?.earnings?.today || 0) + payoutPerOrder,
          "earnings.total": (user?.earnings?.total || 0) + payoutPerOrder,
          "metrics.totalDeliveries": (user?.metrics?.totalDeliveries || 0) + 1,
          "metrics.successfulDeliveries": (user?.metrics?.successfulDeliveries || 0) + 1,
        }).catch(err => console.warn('User metrics update warning:', err));
      }

      toast.success("Delivery Completed! 🎉");
      setShowProofModal(false); setProofImage(null); setProofNote(""); setCompletingOrderId(null);
    } catch (error: any) { 
      toast.error(error.message || "Failed to complete delivery"); 
    } finally { 
      setIsUploading(false); 
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-dark-950 text-primary-500 font-bold animate-pulse">Initializing Dashboard...</div>;

  return (
    <div className="bg-dark-950 min-h-screen text-slate-200 pb-24 font-sans">
      
      {/* ── Offline Banner ── */}
      <AnimatePresence>
        {isOfflineMode && (
          <motion.div initial={{ y: -50 }} animate={{ y: 0 }} exit={{ y: -50 }} className="bg-red-500 text-white font-bold py-2 px-4 flex items-center justify-center gap-2 sticky top-0 z-[1000] shadow-lg">
            <WifiOff size={16} /> YOU ARE OFFLINE - Reconnecting...
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header: GPS & Status Bar ── */}
      <div className="bg-dark-900 border-b border-dark-800 p-4 sticky top-0 z-[100] shadow-md backdrop-blur-xl bg-opacity-90">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${user?.status === 'online' ? 'bg-green-500 animate-pulse shadow-[0_0_8px_#22c55e]' : user?.status === 'break' ? 'bg-amber-500' : 'bg-slate-500'}`} />
              <span className="font-black text-lg tracking-wide text-white uppercase">{user?.status}</span>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium text-slate-400 mt-1">
              <span className="flex items-center gap-1">
                <Crosshair size={12} className={gpsPermission === 'granted' ? 'text-green-400' : 'text-red-400'} /> 
                {gpsAccuracy != null ? `±${Math.round(gpsAccuracy)}m` : 'Wait..'}
              </span>
              <span className="flex items-center gap-1">
                <Zap size={12} className={supabaseConnected ? 'text-blue-400' : 'text-red-400'} /> Sync
              </span>
            </div>
          </div>
          
          <div className="flex gap-2 bg-dark-950 p-1 rounded-full border border-dark-700">
            <button onClick={() => toggleStatus('online')} className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${user?.status === 'online' ? 'bg-primary-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>ONLINE</button>
            <button onClick={() => toggleStatus('offline')} className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${user?.status === 'offline' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>OFF</button>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        
        {/* ── Search Bar ── */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search Assigned Orders..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-dark-900 border border-dark-800 rounded-full py-3 pl-12 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-primary-500 transition-colors shadow-lg"
          />
        </div>

        {/* ── Low GPS Accuracy Warning Overlay ── */}
        {gpsAccuracy != null && gpsAccuracy > 50 && (
          <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-2xl flex items-center gap-3 text-amber-400 text-xs font-bold">
            <AlertTriangle size={18} className="shrink-0" />
            <p>GPS accuracy is low (±{Math.round(gpsAccuracy)}m). Keep outdoor line of sight for precise navigation.</p>
          </div>
        )}

        {/* ── Active Task Navigation Card ── */}
        {activeTask ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-dark-900 border border-dark-800 rounded-[32px] overflow-hidden shadow-2xl relative">
            
            {/* Live Map Header — MapLibre GL JS (Olive Pizza Navigation Engine) */}
            <div className="h-72 w-full relative bg-dark-950">
              <UniversalMap3D
                ref={mapRef}
                mode="delivery"
                center={location ? { lat: location.lat, lng: location.lng } : { lat: RESTAURANT_LOCATION.lat, lng: RESTAURANT_LOCATION.lng }}
                markers={[
                  // Restaurant pickup
                  {
                    id: 'restaurant',
                    position: { lat: RESTAURANT_LOCATION.lat, lng: RESTAURANT_LOCATION.lng },
                    type: 'restaurant',
                    label: 'Olive Pizza Kitchen',
                  },
                  // Customer destination
                  ...(customerCoords ? [{
                    id: 'customer',
                    position: customerCoords,
                    type: 'customer' as const,
                    label: activeTask.customerInfo?.name || 'Customer',
                  }] : []),
                  // Rider (self)
                  ...(location ? [{
                    id: 'rider',
                    position: { lat: location.lat, lng: location.lng },
                    type: 'rider' as const,
                    heading: (location as any).heading || 0,
                  }] : []),
                ] satisfies MapMarker[]}
                routeGeoJSON={navRoute}
                zoom={16}
                className="w-full h-full rounded-none"
                onMapReady={async () => {
                  if (customerCoords && location) {
                    loadRoute({ lat: location.lat, lng: location.lng }, customerCoords, activeTask.id);
                  }
                }}
              />

              {/* Navigation Status Badge */}
              <div className="absolute top-3 left-3 z-[400] bg-dark-950/90 backdrop-blur-xl px-4 py-2 rounded-full border border-dark-700 flex items-center gap-2 shadow-lg">
                <div className={`w-2.5 h-2.5 rounded-full ${isNavigating ? 'bg-green-500 animate-ping' : 'bg-amber-500'}`} />
                <span className="text-xs font-black text-white uppercase tracking-wider">
                  {isNavigating ? 'Navigating' : activeTask.status.replace(/_/g, " ")}
                </span>
              </div>

              {/* Map Controls (Orientation Toggle & Recenter) */}
              <div className="absolute top-3 right-3 z-[400] flex flex-col gap-2">
                <button
                  onClick={() => setMapOrientation(o => o === 'heading' ? 'north' : 'heading')}
                  className="w-10 h-10 rounded-full bg-dark-900/90 backdrop-blur-md border border-dark-700 flex items-center justify-center text-white hover:bg-dark-800 transition-colors shadow-xl"
                  title={mapOrientation === 'heading' ? 'Heading-Up Mode' : 'North-Up Mode'}
                >
                  <Compass size={18} className={mapOrientation === 'heading' ? 'text-primary-400 rotate-45' : 'text-slate-400'} />
                </button>
                <button
                  onClick={() => {
                    if (location && mapRef.current) {
                      mapRef.current.flyTo({ lat: location.lat, lng: location.lng }, 16);
                    }
                  }}
                  className="w-10 h-10 rounded-full bg-dark-900/90 backdrop-blur-md border border-dark-700 flex items-center justify-center text-white hover:bg-dark-800 transition-colors shadow-xl"
                  title="Recenter Camera"
                >
                  <Crosshair size={18} className="text-blue-400" />
                </button>
              </div>

              {/* Telemetry Bar (Distance, Duration, IST Arrival Time, Speed) */}
              <div className="absolute bottom-3 inset-x-3 z-[400] bg-dark-950/90 backdrop-blur-xl px-4 py-3 rounded-2xl border border-dark-800 flex items-center justify-between shadow-2xl">
                <div>
                  <div className="text-lg font-black text-white flex items-center gap-2">
                    <span>{formatDistance(distanceRemainingMeters || 2400)}</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-primary-400">{formatDuration(durationRemainingSeconds || 480)}</span>
                  </div>
                  <div className="text-[11px] font-bold text-slate-400 mt-0.5">
                    {formatISTArrivalTime(durationRemainingSeconds || 480)}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Speed</span>
                  <span className="text-base font-black text-green-400">
                    {riderSpeedKmh != null ? `${riderSpeedKmh} km/h` : 'Speed unavailable'}
                  </span>
                </div>
              </div>
            </div>

            {/* Turn-by-Turn Instruction Banner */}
            <AnimatePresence>
              {currentInstruction && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="mx-4 mt-3 bg-primary-600/20 border border-primary-500/40 rounded-2xl px-4 py-3 flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                    <Navigation2 size={16} className="text-primary-400" />
                  </div>
                  <p className="text-sm font-bold text-primary-200 flex-1">{currentInstruction}</p>
                  <button
                    onClick={() => !isMuted && TTS.speak(currentInstruction, true)}
                    className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-400 hover:bg-primary-500/40 transition-colors flex-shrink-0"
                    title="Repeat instruction"
                  >
                    <Volume2 size={14} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Voice & Navigation Controls Row */}
            <div className="px-6 pt-4 flex items-center justify-between border-b border-dark-800/60 pb-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { const m = TTS.toggleMute(); setIsMuted(m); }}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors ${
                    isMuted ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-primary-500/10 border-primary-500/30 text-primary-400'
                  }`}
                >
                  {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                  <span>{isMuted ? 'Voice Off' : 'Voice On'}</span>
                </button>

                <select
                  value={navLang}
                  onChange={(e) => {
                    const l = e.target.value as NavLanguage;
                    setNavLang(l);
                    setNavLanguage(l);
                    TTS.setTTSLanguage(l);
                  }}
                  className="bg-dark-950 border border-dark-700 text-xs font-bold text-slate-300 rounded-xl px-2.5 py-1.5 outline-none"
                >
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                  <option value="hinglish">Hinglish</option>
                </select>
              </div>

              <button
                onClick={() => navigate(`/delivery/navigation/${activeTask.id}`)}
                className="bg-primary-600 hover:bg-primary-500 text-white font-black text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg hover:shadow-primary-600/30"
              >
                <Navigation2 size={16} /> Open Turn-by-Turn Navigation
              </button>
            </div>

            <div className="p-6">
              {/* Customer Info */}
              <div className="flex items-start justify-between mb-6 pb-6 border-b border-dark-800">
                <div>
                  <h3 className="text-xl font-black text-white mb-1 flex items-center gap-2">
                    {activeTask.customerInfo?.name || "Customer"} 
                    {(activeTask.customerInfo as any)?.isVIP && <Star size={16} className="text-primary-500 fill-current" />}
                  </h3>
                  <p className="text-sm text-slate-400 font-medium">{activeTask.dailyOrderNumber || `Order #${activeTask.id?.slice(-6).toUpperCase()}`}</p>
                </div>
                <a href={`tel:${activeTask.contactPhone}`} className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 hover:bg-blue-500 hover:text-white transition-all">
                  <PhoneCall size={20} />
                </a>
              </div>

              {/* Address Details */}
              <div className="flex gap-4 mb-6">
                <div className="mt-1 flex flex-col items-center gap-1">
                  <div className="w-8 h-8 rounded-full bg-dark-800 flex items-center justify-center border border-dark-700 text-slate-400"><MapPin size={16} /></div>
                  <div className="w-0.5 h-8 bg-dark-800 rounded-full" />
                  <div className="w-8 h-8 rounded-full bg-primary-500/10 flex items-center justify-center border border-primary-500/20 text-primary-500"><Navigation2 size={16} /></div>
                </div>
                <div className="flex-1 space-y-6">
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Pickup From</p>
                    <p className="font-bold text-white">Olive Pizza Kitchen</p>
                    <p className="text-sm text-slate-400 line-clamp-1">{RESTAURANT_LOCATION.address || "Rajnandgaon"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Deliver To</p>
                    <p className="font-bold text-white line-clamp-2">{activeTask.deliveryAddress?.addressLine || activeTask.address}</p>
                    <p className="text-sm text-slate-400 line-clamp-1">Landmark: {activeTask.deliveryAddress?.landmark || "None"}</p>
                  </div>
                </div>
              </div>

              {/* Task Stage Actions & 100m Delivery Completion Rule */}
              <div className="space-y-3">
                {activeTask.status === "partner_assigned" && (
                  <div className="grid grid-cols-2 gap-3">
                    <button disabled={processingId === activeTask.id} onClick={() => updateOrderStatus(activeTask.id!, "ready")} className="w-full bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-primary-500/20">{processingId === activeTask.id ? 'Processing...' : 'Accept'}</button>
                    <button disabled={processingId === activeTask.id} onClick={() => { setDecliningOrderId(activeTask.id!); setShowDeclineModal(true); }} className="w-full bg-red-500/10 hover:bg-red-500/20 disabled:opacity-50 text-red-500 font-black py-4 rounded-2xl transition-all">{processingId === activeTask.id ? 'Processing...' : 'Reject'}</button>
                  </div>
                )}
                {activeTask.status === "ready" && (
                  <button disabled={processingId === activeTask.id} onClick={() => updateOrderStatus(activeTask.id!, "out_for_delivery")} className="w-full bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-primary-500/20 flex items-center justify-center gap-2"><PackageOpen size={20}/> {processingId === activeTask.id ? 'Processing...' : 'Confirm Pickup & Start Delivery'}</button>
                )}
                {activeTask.status === "out_for_delivery" && (
                  <div>
                    <button 
                      disabled={!canMarkDelivered} 
                      onClick={() => { setCompletingOrderId(activeTask.id!); setShowProofModal(true); }} 
                      className={`w-full font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg ${
                        canMarkDelivered 
                          ? 'bg-green-500 hover:bg-green-400 text-dark-950 shadow-green-500/20 cursor-pointer' 
                          : 'bg-dark-800 text-slate-500 border border-dark-700 cursor-not-allowed opacity-60'
                      }`}
                    >
                      <CheckCircle2 size={24}/> Mark Delivered
                    </button>
                    {!canMarkDelivered && (
                      <p className="text-center text-xs font-bold text-amber-400 mt-2">
                        Available within 100 m ({Math.round(distanceToCustomerMeters)} m remaining)
                      </p>
                    )}
                  </div>
                )}
              </div>
              
              <div className="mt-6 flex justify-center">
                 <button className="text-slate-500 text-xs font-bold uppercase tracking-wider flex items-center gap-1 hover:text-red-400 transition-colors"><AlertCircle size={14}/> Report Issue / SOS</button>
              </div>

            </div>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-dark-900 border border-dark-800 p-10 rounded-[32px] flex flex-col items-center text-center mt-4">
            <div className="w-24 h-24 bg-dark-800 rounded-full flex items-center justify-center mb-6 relative">
              <div className="absolute inset-0 rounded-full border-2 border-primary-500 border-t-transparent animate-spin opacity-20" />
              <MapIcon className="w-10 h-10 text-slate-500" />
            </div>
            <h3 className="text-2xl font-black text-white mb-3">Looking for Orders</h3>
            <p className="text-slate-400 font-medium max-w-[250px]">Stay online and keep your app open. You will hear a ping when an order is assigned to you.</p>
          </motion.div>
        )}

      </div>
      
      {/* ── Other Assigned Orders ── */}
      {filteredTasks.length > 1 && (
        <div className="max-w-md mx-auto p-4 pt-0 space-y-4">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Other Assigned Orders</h3>
          {filteredTasks.slice(1).map(task => (
            <div key={task.id} className="bg-dark-900 border border-dark-800 rounded-2xl p-4 flex justify-between items-center">
              <div>
                <p className="font-bold text-white">{task.dailyOrderNumber || `Order #${task.id?.slice(-6).toUpperCase()}`}</p>
                <p className="text-xs text-slate-400">{task.deliveryAddress?.addressLine || task.address}</p>
              </div>
              <span className="text-xs font-bold text-primary-500 uppercase px-2 py-1 bg-primary-500/10 rounded-lg">{task.status.replace(/_/g, " ")}</span>
            </div>
          ))}
        </div>
      )}

      {/* Decline Modal */}
      <DeclineDeliveryReasonModal
        isOpen={showDeclineModal}
        orderNumber={activeTask?.dailyOrderNumber || activeTask?.id?.slice(-6).toUpperCase()}
        onClose={() => {
          setShowDeclineModal(false);
          setDecliningOrderId(null);
        }}
        onSubmit={handleDeclineSubmit}
      />

      {/* Proof Modal */}
      <AnimatePresence>
      {showProofModal && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm z-[1000] flex items-end justify-center px-4 pb-24 pt-4">
          <motion.div
            initial={{ y: 200 }}
            animate={{ y: 0 }}
            exit={{ y: 200 }}
            className="bg-dark-900 border border-dark-800 rounded-[32px] w-full max-w-md shadow-2xl flex flex-col"
            style={{ maxHeight: '85dvh' }}
          >
            {/* Sticky header */}
            <div className="px-6 pt-6 pb-4 border-b border-dark-800 flex-shrink-0">
              <div className="w-10 h-1 bg-dark-600 rounded-full mx-auto mb-4" />
              <h2 className="text-2xl font-black text-white text-center">Delivery Proof</h2>
              <p className="text-xs text-slate-500 text-center mt-1">All fields are optional — tap Complete Delivery to finish</p>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 text-center">
                  Photo Proof <span className="normal-case font-medium text-slate-600 tracking-normal">(optional)</span>
                </label>
                <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-dark-700 bg-dark-950 rounded-[24px] h-48 flex items-center justify-center cursor-pointer hover:border-primary-500 transition-colors overflow-hidden">
                  {proofImage ? (
                    <img src={URL.createObjectURL(proofImage)} alt="Proof" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-slate-500 flex flex-col items-center gap-2"><Camera size={32} /> <span className="font-bold text-sm">Tap to capture photo</span><span className="text-xs text-slate-600">Not required</span></div>
                  )}
                  <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInputRef} onChange={(e) => { if (e.target.files?.[0]) setProofImage(e.target.files[0]); }} />
                </div>
                {proofImage && (
                  <button onClick={() => setProofImage(null)} className="mt-2 text-xs text-red-400 hover:text-red-300 w-full text-center">✕ Remove photo</button>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 text-center">
                  Note <span className="normal-case font-medium text-slate-600 tracking-normal">(optional)</span>
                </label>
                <textarea
                  className="w-full p-4 bg-dark-950 border border-dark-700 rounded-2xl outline-none focus:border-primary-500 text-white min-h-[100px] resize-none text-sm"
                  placeholder="e.g. Left at door, handed to security, etc."
                  value={proofNote}
                  onChange={(e) => setProofNote(e.target.value)}
                />
              </div>
            </div>

            {/* Sticky footer buttons */}
            <div className="px-6 pb-6 pt-4 border-t border-dark-800 flex gap-3 flex-shrink-0">
              <button onClick={() => setShowProofModal(false)} disabled={isUploading} className="w-1/3 py-4 font-bold text-slate-400 hover:text-white bg-dark-800 rounded-2xl transition-colors">Cancel</button>
              <button onClick={handleCompleteSubmit} disabled={isUploading} className="w-2/3 py-4 font-black text-white bg-primary-600 hover:bg-primary-500 rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {isUploading ? "Uploading..." : "Complete Delivery"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

    </div>
  );
}
