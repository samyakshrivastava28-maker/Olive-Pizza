import { useState, useEffect, useRef, useCallback } from "react";
import { db } from "../../lib/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { restaurantIcon } from "../../lib/mapIcons";
import { getCurrentAuthToken } from "../../lib/firebase";
import { supabase } from "../../lib/supabase";
import { Order } from "../../types/models";
import { useAuthStore } from "../../lib/store";
import toast from "react-hot-toast";
import { uploadMediaToCloudinary } from "../../lib/cloudinary";
import { MapPin, Package, Map as MapIcon, Power, Wifi, WifiOff, AlertTriangle, ShieldAlert, Clock, Navigation2, Zap, Battery, Crosshair, HelpCircle, Utensils, MessageSquare, AlertCircle, Star, PhoneCall, Navigation, PackageOpen, CheckCircle2, Camera } from "lucide-react";
import { RESTAURANT_LOCATION } from "../../lib/config";

import { GlassCard, GlassButton } from "../../components/ui/glass/GlassSystem";
import { playNotificationSound } from "../../hooks/useNotificationSound";
import { motion, AnimatePresence } from 'framer-motion';
import { useTrackingStore } from "../../lib/trackingStore";
import { useShallow } from 'zustand/react/shallow';
import DeliveryMap from "../../components/delivery/DeliveryMap";


import { Search } from "lucide-react";

export default function DeliveryDashboard() {
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
  const { setLocation, setDebugData: setStoreDebugData } = useTrackingStore(useShallow(state => ({
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
  }, []);

  const toggleStatus = async (forcedStatus?: string) => {
    if (!user?.uid) return;
    const newStatus = forcedStatus || (user.status === "online" ? "offline" : "online");
    try {
      await updateDoc(doc(db, "users", user.uid), { status: newStatus });
      if (newStatus === "offline" || newStatus === "break") {
        await supabase.from("delivery_locations").update({ online_status: false }).eq("delivery_partner_id", user.uid);
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

  useEffect(() => {
    const activeDeliveries = tasks.filter((t) => t.status === "out_for_delivery");
    if (!user?.uid || user.status !== "online") {
      if (watchIdRef.current !== null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
      if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null; }
      return;
    }

    const activeOrderId = activeDeliveries.length > 0 ? activeDeliveries[0].id || null : null;
    if (!navigator.geolocation) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = position.coords.accuracy;
        const speed = position.coords.speed;
        const heading = position.coords.heading;
        const now = Date.now();

        lastGPSPositionRef.current = position;
        setStoreDebugData((prev) => ({
          ...prev, gpsLat: lat, gpsLng: lng, gpsHeading: heading ?? undefined, gpsSpeed: speed ?? undefined, gpsAccuracy: accuracy, gpsTimestamp: now, orderId: activeOrderId || prev.orderId, partnerId: user.uid,
        }));

        if (lastLocationRef.current) {
          const timeDiff = now - lastLocationRef.current.time;
          const distance = calculateDistance(lastLocationRef.current.lat, lastLocationRef.current.lng, lat, lng);
          if (distance < 5 && timeDiff < 4000) return; 
        }

        const newLoc = { lat, lng, time: now, heading };
        lastLocationRef.current = newLoc;
        setLocation(newLoc);
        await writeLocationToSupabase(lat, lng, heading, speed, accuracy, activeOrderId);
      },
      (error) => console.error("GPS Error", error),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );

    if (activeDeliveries.length > 0) {
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
      if (watchIdRef.current !== null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
      if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null; }
    };
  }, [tasks, user?.uid, user?.status, writeLocationToSupabase]);

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
      const oldAssignments = tasks.filter((o) => o.status === "partner_assigned");
      if (newAssignments.length > oldAssignments.length) {
        playNotificationSound("partner_assigned");
        toast.success("New Delivery Assigned!", { duration: 5000 });
      }
      setTasks(liveOrders);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user?.uid]);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      if (isOfflineMode) {
        toast.error("Cannot update status while offline. Action queued.");
        return; // In full app, queue this in IndexedDB
      }
      const updates: any = { status: newStatus };
      if (newStatus === "out_for_delivery") updates.pickedUpAt = new Date().toISOString();

      const currentTask = tasks.find((t) => t.id === orderId);
      if (newStatus === "out_for_delivery" && currentTask && user?.uid) {
        try {
          const token = await getCurrentAuthToken();
          await fetch("/api/tracking/navigation/start", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ orderId, partnerId: user.uid, customerLat: currentTask.deliveryAddress?.lat, customerLng: currentTask.deliveryAddress?.lng, restaurantLat: RESTAURANT_LOCATION.lat, restaurantLng: RESTAURANT_LOCATION.lng }),
          });
        } catch (e) {}
      }
      await updateDoc(doc(db, "orders", orderId), updates);
      toast.success(`Status updated: ${newStatus.replace(/_/g, " ").toUpperCase()}`);
    } catch (error) { toast.error("Update failed"); }
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
      await updateDoc(doc(db, "orders", completingOrderId), { status: "delivered", deliveredAt: new Date().toISOString(), deliveryProof: { photoUrl, note: proofNote } });
      try {
        const token = await getCurrentAuthToken();
        await fetch("/api/tracking/navigation/stop", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ orderId: completingOrderId, partnerId: user?.uid }) });
      } catch (e) {}

      if (watchIdRef.current !== null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
      if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null; }
      
      const partnerId = user?.uid || "";
      await supabase.from("delivery_locations").update({ active_order_id: null, online_status: false, last_updated: new Date().toISOString() }).eq("delivery_partner_id", partnerId);
      
      if (gpsCleanupTimerRef.current) clearTimeout(gpsCleanupTimerRef.current);
      gpsCleanupTimerRef.current = setTimeout(async () => {
        await supabase.from("delivery_locations").delete().eq("delivery_partner_id", partnerId).eq("online_status", false);
        gpsCleanupTimerRef.current = null;
      }, 300000);

      const payoutPerOrder = activeTask?.deliveryFee || 40;
      await updateDoc(doc(db, "users", user!.uid), {
        "earnings.today": (user?.earnings?.today || 0) + payoutPerOrder,
        "earnings.total": (user?.earnings?.total || 0) + payoutPerOrder,
        "metrics.totalDeliveries": (user?.metrics?.totalDeliveries || 0) + 1,
        "metrics.successfulDeliveries": (user?.metrics?.successfulDeliveries || 0) + 1,
      });

      toast.success("Delivery Completed! 🎉");
      setShowProofModal(false); setProofImage(null); setProofNote(""); setCompletingOrderId(null);
    } catch (error) { toast.error("Failed to complete delivery"); } finally { setIsUploading(false); }
  };

  const [searchTerm, setSearchTerm] = useState("");
  
  const filteredTasks = tasks.filter(t => {
    if (!searchTerm.trim()) return true;
    const lower = searchTerm.toLowerCase();
    return t.dailyOrderNumber?.toLowerCase().includes(lower) || 
           t.id?.toLowerCase().includes(lower);
  });

  const activeTask = filteredTasks[0];

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-dark-950 text-primary-500 font-bold animate-pulse">Initializing Dashboard...</div>;

  return (
    <div className="bg-dark-950 min-h-screen text-slate-200 pb-24 font-sans">
      
      {/* ── Offline Banner ── */}
      <AnimatePresence>
        {isOfflineMode && (
          <motion.div initial={{ y: -50 }} animate={{ y: 0 }} exit={{ y: -50 }} className="bg-red-500 text-white font-bold py-2 px-4 flex items-center justify-center gap-2 sticky top-0 z-[1000] shadow-lg">
            <WifiOff size={16} /> YOU ARE OFFLINE - Actions Queued
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header: GPS & Status Bar ── */}
      <div className="bg-dark-900 border-b border-dark-800 p-4 sticky top-0 z-[100] shadow-md backdrop-blur-xl bg-opacity-90">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${user?.status === 'online' ? 'bg-green-500 animate-pulse shadow-[0_0_8px_#22c55e]' : user?.status === 'break' ? 'bg-amber-500' : 'bg-slate-500'}`} />
              <span className="font-black text-lg tracking-wide text-white uppercase">{user?.status}</span>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium text-slate-400 mt-1">
              <span className="flex items-center gap-1"><Crosshair size={12} className={gpsPermission === 'granted' ? 'text-green-400' : 'text-red-400'} /> {lastGPSPositionRef.current ? `±${Math.round(lastGPSPositionRef.current.coords.accuracy)}m` : 'Wait..'}</span>
              <span className="flex items-center gap-1"><Zap size={12} className={supabaseConnected ? 'text-blue-400' : 'text-red-400'} /> Sync</span>
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
        
        {/* ── Warning Alerts ── */}
        {user?.status === "online" && gpsPermission !== "granted" && (
          <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-2xl flex items-center gap-3 text-red-400 text-sm font-bold">
            <ShieldAlert size={20} className="shrink-0" />
            <p>GPS tracking is disabled. You cannot receive orders. Please allow location permissions.</p>
          </div>
        )}

        {/* ── Active Task Premium Card ── */}
        {activeTask ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-dark-900 border border-dark-800 rounded-[32px] overflow-hidden shadow-2xl relative">
            
            {/* Live Map Header */}
            <div className="h-56 w-full relative bg-dark-950">
              <DeliveryMap 
                destinationLat={activeTask.deliveryAddress?.lat} 
                destinationLng={activeTask.deliveryAddress?.lng} 
              />
              
              <div className="absolute top-4 left-4 z-[400] bg-dark-950/80 backdrop-blur-xl px-4 py-2 rounded-full border border-dark-700 flex items-center gap-2 shadow-lg">
                <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-ping" />
                <span className="text-xs font-black text-white uppercase tracking-wider">{activeTask.status.replace(/_/g, " ")}</span>
              </div>
              <div className="absolute bottom-4 right-4 z-[400] bg-primary-500 px-4 py-2 rounded-2xl shadow-xl border border-primary-400/50">
                <span className="block text-[10px] font-bold text-white/80 uppercase">Est. Payout</span>
                <span className="text-xl font-black text-white">₹{activeTask.deliveryFee || 40}</span>
              </div>
            </div>

            <div className="p-6">
              {/* Customer Info */}
              <div className="flex items-start justify-between mb-6 pb-6 border-b border-dark-800">
                <div>
                  <h3 className="text-xl font-black text-white mb-1 flex items-center gap-2">{activeTask.customerInfo?.name || "Customer"} {(activeTask.customerInfo as any)?.isVIP && <Star size={16} className="text-primary-500 fill-current" />}</h3>
                  <p className="text-sm text-slate-400 font-medium">{activeTask.dailyOrderNumber || `Order #${activeTask.id?.slice(-6).toUpperCase()}`}</p>
                </div>
                <a href={`tel:${activeTask.contactPhone}`} className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 hover:bg-blue-500 hover:text-white transition-all">
                  <PhoneCall size={20} />
                </a>
              </div>

              {/* Address */}
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

              {/* Order Items Summary */}
              <div className="bg-dark-950 rounded-2xl p-4 mb-6 border border-dark-800">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Utensils size={14}/> Items Ordered ({activeTask.items.length})</h4>
                <div className="space-y-2">
                  {activeTask.items.slice(0,2).map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-slate-300 font-medium">{item.quantity}x {item.name}</span>
                    </div>
                  ))}
                  {activeTask.items.length > 2 && <p className="text-xs text-primary-500 font-bold mt-2">+{activeTask.items.length - 2} more items</p>}
                </div>
                {activeTask.noContactDelivery && (
                  <div className="mt-4 pt-3 border-t border-dark-800 flex items-start gap-2 text-primary-400 text-sm font-bold">
                    <Package size={16} className="mt-0.5" /> No-Contact Delivery Requested
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <a href={["partner_assigned", "ready"].includes(activeTask.status) ? `https://www.google.com/maps/dir/?api=1&destination=${RESTAURANT_LOCATION.lat},${RESTAURANT_LOCATION.lng}` : `https://www.google.com/maps/dir/?api=1&destination=${activeTask.deliveryAddress?.lat || 19.076},${activeTask.deliveryAddress?.lng || 72.8777}`} target="_blank" rel="noreferrer" className="w-full bg-dark-800 hover:bg-dark-700 border border-dark-700 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all">
                  <Navigation size={18} /> Open in Navigation
                </a>

                {activeTask.status === "partner_assigned" && (
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => updateOrderStatus(activeTask.id!, "ready")} className="w-full bg-primary-600 hover:bg-primary-500 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-primary-500/20">Accept</button>
                    <button onClick={() => updateOrderStatus(activeTask.id!, "pending")} className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 font-black py-4 rounded-2xl transition-all">Reject</button>
                  </div>
                )}
                {activeTask.status === "ready" && (
                  <button onClick={() => updateOrderStatus(activeTask.id!, "out_for_delivery")} className="w-full bg-primary-600 hover:bg-primary-500 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-primary-500/20 flex items-center justify-center gap-2"><PackageOpen size={20}/> Confirm Pickup</button>
                )}
                {activeTask.status === "out_for_delivery" && (
                  <button onClick={() => { setCompletingOrderId(activeTask.id!); setShowProofModal(true); }} className="w-full bg-green-500 hover:bg-green-400 text-dark-950 font-black py-4 rounded-2xl transition-all shadow-lg shadow-green-500/20 flex items-center justify-center gap-2"><CheckCircle2 size={24}/> Mark Delivered</button>
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

      {/* Proof Modal */}
      <AnimatePresence>
      {showProofModal && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm z-[1000] flex items-end justify-center p-4">
          <motion.div initial={{ y: 200 }} animate={{ y: 0 }} exit={{ y: 200 }} className="bg-dark-900 border border-dark-800 p-6 rounded-[32px] w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-black text-white mb-6 text-center">Delivery Proof</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 text-center">Photo Proof</label>
                <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-dark-700 bg-dark-950 rounded-[24px] h-48 flex items-center justify-center cursor-pointer hover:border-primary-500 transition-colors overflow-hidden">
                  {proofImage ? (
                    <img src={URL.createObjectURL(proofImage)} alt="Proof" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-slate-500 flex flex-col items-center gap-2"><Camera size={32} /> <span className="font-bold text-sm">Tap to capture</span></div>
                  )}
                  <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInputRef} onChange={(e) => { if (e.target.files?.[0]) setProofImage(e.target.files[0]); }} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 text-center">Note (Optional)</label>
                <textarea className="w-full p-4 bg-dark-950 border border-dark-700 rounded-2xl outline-none focus:border-primary-500 text-white min-h-[100px] resize-none text-sm" placeholder="e.g. Left at door" value={proofNote} onChange={(e) => setProofNote(e.target.value)} />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowProofModal(false)} disabled={isUploading} className="w-1/3 py-4 font-bold text-slate-400 hover:text-white bg-dark-800 rounded-2xl">Cancel</button>
                <button onClick={handleCompleteSubmit} disabled={isUploading || (!proofImage && activeTask?.noContactDelivery)} className="w-2/3 py-4 font-black text-white bg-primary-600 hover:bg-primary-500 rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed">
                  {isUploading ? "Uploading..." : "Complete Delivery"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

    </div>
  );
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
