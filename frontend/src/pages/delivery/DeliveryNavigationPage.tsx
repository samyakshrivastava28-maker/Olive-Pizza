import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import { db, getCurrentAuthToken } from "../../lib/firebase";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { Order } from "../../types/models";
import { useAuthStore } from "../../lib/store";
import toast from "react-hot-toast";
import { uploadMediaToCloudinary } from "../../lib/cloudinary";
import { 
  ArrowLeft, MapPin, PhoneCall, Navigation2, Crosshair, Compass,
  Volume2, VolumeX, CheckCircle2, Camera, AlertTriangle, Play, Square, Star
} from "lucide-react";
import { RESTAURANT_LOCATION } from "../../lib/config";
import UniversalMap3D, { MapMarker, UniversalMap3DRef } from "../../components/map/UniversalMap3D";
import { fetchRoute, formatDistance, formatDuration, formatISTArrivalTime, isOffRoute, haversineDistanceMeters } from "../../services/navigationRouting.service";
import { buildInstruction, getNavLanguage, setNavLanguage, NavLanguage } from "../../services/navigationInstructions";
import * as TTS from "../../services/TextToSpeech.service";
import { useTrackingStore } from "../../lib/trackingStore";
import { useShallow } from "zustand/react/shallow";
import { motion, AnimatePresence } from "framer-motion";

export default function DeliveryNavigationPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  // Navigation State
  const [isNavigating, setIsNavigating] = useState(true);
  const [navRoute, setNavRoute] = useState<GeoJSON.Feature<GeoJSON.LineString> | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);
  const [currentInstruction, setCurrentInstruction] = useState<string>("");
  const [distanceRemainingMeters, setDistanceRemainingMeters] = useState<number>(0);
  const [durationRemainingSeconds, setDurationRemainingSeconds] = useState<number>(0);
  const [isMuted, setIsMuted] = useState(TTS.getMuted());
  const [navLang, setNavLang] = useState<NavLanguage>(getNavLanguage());
  const [mapOrientation, setMapOrientation] = useState<'heading' | 'north'>('heading');
  const [riderSpeedKmh, setRiderSpeedKmh] = useState<number | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [isRerouting, setIsRerouting] = useState(false);

  // Proof Modal State
  const [showProofModal, setShowProofModal] = useState(false);
  const [proofNote, setProofNote] = useState("");
  const [proofImage, setProofImage] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mapRef = useRef<UniversalMap3DRef | null>(null);
  const lastGPSPositionRef = useRef<GeolocationPosition | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const { location, setLocation } = useTrackingStore(useShallow(state => ({
    location: state.location,
    setLocation: state.setLocation
  })));

  // Warm up TTS voices on mount
  useEffect(() => { TTS.warmVoices(); }, []);

  // Fetch Order details from Firestore
  useEffect(() => {
    if (!orderId) return;
    const unsubscribe = onSnapshot(doc(db, "orders", orderId), (docSnap) => {
      if (docSnap.exists()) {
        setOrder({ id: docSnap.id, ...docSnap.data() } as Order);
      } else {
        toast.error("Order not found");
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [orderId]);

  // Customer destination coordinates
  const customerCoords = useMemo(() => {
    if (!order) return null;
    const lat = order.deliveryAddress?.lat ?? (order as any).deliveryAddressCoordinates?.lat ?? (order as any).lat ?? (order as any).customerLocation?.lat;
    const lng = order.deliveryAddress?.lng ?? (order as any).deliveryAddressCoordinates?.lng ?? (order as any).lng ?? (order as any).customerLocation?.lng;
    if (lat != null && lng != null && !isNaN(Number(lat)) && !isNaN(Number(lng))) {
      return { lat: Number(lat), lng: Number(lng) };
    }
    return null;
  }, [order]);

  // Haversine distance to customer
  const distanceToCustomerMeters = useMemo(() => {
    if (!location || !customerCoords) return Infinity;
    return haversineDistanceMeters(location.lat, location.lng, customerCoords.lat, customerCoords.lng);
  }, [location, customerCoords]);

  const canMarkDelivered = distanceToCustomerMeters <= 100;

  // Load route calculation
  const loadRouteData = useCallback(async (origin: { lat: number; lng: number }, destination: { lat: number; lng: number }) => {
    try {
      const token = await getCurrentAuthToken();
      const res = await fetch('/api/navigation/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ origin, destination, orderId }),
      });

      if (res.ok) {
        const data = await res.json();
        setNavRoute(data.geojson);
        setRouteCoordinates(data.coordinates || []);
        setDistanceRemainingMeters(data.distanceMeters || 0);
        setDurationRemainingSeconds(data.durationSeconds || 0);
        if (data.steps?.[0]) {
          const text = buildInstruction(data.steps[0], navLang);
          setCurrentInstruction(text);
          if (!isMuted) TTS.speak(text, true);
        }
        return data;
      }
    } catch {}

    const clientRoute = await fetchRoute(origin, destination, orderId);
    if (clientRoute) {
      setNavRoute(clientRoute.geojson);
      setRouteCoordinates(clientRoute.coordinates);
      setDistanceRemainingMeters(clientRoute.distanceMetres);
      setDurationRemainingSeconds(clientRoute.durationSeconds);
      if (clientRoute.steps[0]) {
        const text = buildInstruction(clientRoute.steps[0], navLang);
        setCurrentInstruction(text);
        if (!isMuted) TTS.speak(text, true);
      }
    }
    return clientRoute;
  }, [orderId, navLang, isMuted]);

  // GPS Tracking Effect
  useEffect(() => {
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

        if (rawSpeed != null && !isNaN(rawSpeed) && rawSpeed >= 0) {
          const kmh = Math.round(rawSpeed * 3.6);
          setRiderSpeedKmh(kmh > 120 ? null : kmh);
        }

        const newLoc = { lat, lng, time: now, heading: heading ?? 0 };
        setLocation(newLoc);

        // Check off-route
        if (isNavigating && customerCoords && routeCoordinates.length > 0) {
          const off = isOffRoute({ lat, lng }, routeCoordinates, accuracy > 50 ? 80 : 50);
          if (off && !isRerouting) {
            setIsRerouting(true);
            toast("Off route — Recalculating...", { icon: '🔄' });
            loadRouteData({ lat, lng }, customerCoords).finally(() => setIsRerouting(false));
          }
        }
      },
      (err) => console.error("GPS error", err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [isNavigating, customerCoords, routeCoordinates, isRerouting, loadRouteData, setLocation]);

  // Initial Route Fetch
  useEffect(() => {
    if (location && customerCoords && !navRoute) {
      loadRouteData({ lat: location.lat, lng: location.lng }, customerCoords);
    }
  }, [location, customerCoords, navRoute, loadRouteData]);

  // Delivery Completion Submit
  const handleCompleteSubmit = async () => {
    if (!orderId) return;
    setIsUploading(true);
    let photoUrl = "";
    try {
      if (proofImage) {
        const res = await uploadMediaToCloudinary(proofImage, "olive-pizza/delivery-proofs");
        photoUrl = res.secureUrl;
      }
      
      const token = await getCurrentAuthToken();
      const res = await fetch(`/api/delivery/orders/${orderId}/status`, {
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

      if (user?.uid) {
        const payout = order?.deliveryFee || 40;
        await updateDoc(doc(db, "users", user.uid), {
          "earnings.today": ((user as any).earnings?.today || 0) + payout,
          "earnings.total": ((user as any).earnings?.total || 0) + payout,
          "metrics.totalDeliveries": ((user as any).metrics?.totalDeliveries || 0) + 1,
          "metrics.successfulDeliveries": ((user as any).metrics?.successfulDeliveries || 0) + 1,
        });
      }

      TTS.stopAll();
      toast.success("Delivery Completed! 🎉");
      navigate("/delivery/dashboard", { replace: true });
    } catch (err: any) {
      toast.error(err.message || "Failed to complete delivery");
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-950 text-primary-500 font-bold animate-pulse">
        Opening Olive Pizza Navigation...
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-dark-950 overflow-hidden font-sans select-none">
      
      {/* ── Fullscreen Map Viewport ── */}
      <div className="absolute inset-0 z-0">
        <UniversalMap3D
          ref={mapRef}
          mode="delivery"
          center={location ? { lat: location.lat, lng: location.lng } : { lat: RESTAURANT_LOCATION.lat, lng: RESTAURANT_LOCATION.lng }}
          markers={[
            {
              id: 'restaurant',
              position: { lat: RESTAURANT_LOCATION.lat, lng: RESTAURANT_LOCATION.lng },
              type: 'restaurant',
              label: 'Olive Pizza Kitchen',
            },
            ...(customerCoords ? [{
              id: 'customer',
              position: customerCoords,
              type: 'customer' as const,
              label: order?.customerInfo?.name || 'Customer Home',
            }] : []),
            ...(location ? [{
              id: 'rider',
              position: { lat: location.lat, lng: location.lng },
              type: 'rider' as const,
              heading: (location as any).heading || 0,
            }] : []),
          ] satisfies MapMarker[]}
          routeGeoJSON={navRoute}
          zoom={17}
          className="w-full h-full"
        />
      </div>

      {/* ── Top Header Bar ── */}
      <div className="absolute top-0 inset-x-0 z-[500] p-4 bg-gradient-to-b from-dark-950/90 via-dark-950/60 to-transparent backdrop-blur-md">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate("/delivery/dashboard")}
            className="w-10 h-10 rounded-full bg-dark-900/90 border border-dark-700 flex items-center justify-center text-white hover:bg-dark-800 transition-colors shadow-lg"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="flex-1 text-center px-3">
            <h2 className="text-base font-black text-white truncate">
              {order?.dailyOrderNumber || `#${orderId?.slice(-6).toUpperCase()}`}
            </h2>
            <p className="text-xs font-bold text-slate-400 truncate">
              Deliver to: {order?.customerInfo?.name || "Customer"}
            </p>
          </div>

          <a
            href={`tel:${order?.contactPhone}`}
            className="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 hover:bg-blue-500 hover:text-white transition-all shadow-lg"
          >
            <PhoneCall size={18} />
          </a>
        </div>
      </div>

      {/* ── Floating Turn Maneuver Banner ── */}
      <AnimatePresence>
        {currentInstruction && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-20 inset-x-4 z-[500] max-w-md mx-auto bg-dark-900/95 border border-primary-500/40 rounded-3xl p-4 shadow-2xl backdrop-blur-xl flex items-center gap-3"
          >
            <div className="w-12 h-12 rounded-2xl bg-primary-500/20 border border-primary-500/30 flex items-center justify-center text-primary-400 shrink-0">
              <Navigation2 size={24} />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Next Maneuver</p>
              <p className="text-sm font-black text-white">{currentInstruction}</p>
            </div>
            <button
              onClick={() => !isMuted && TTS.speak(currentInstruction, true)}
              className="w-10 h-10 rounded-xl bg-primary-500/20 border border-primary-500/30 text-primary-400 hover:bg-primary-500 hover:text-white transition-colors flex items-center justify-center shrink-0"
              title="Repeat instruction"
            >
              <Volume2 size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Right Control Stack (Orientation & Recenter) ── */}
      <div className="absolute right-4 top-40 z-[500] flex flex-col gap-3">
        <button
          onClick={() => setMapOrientation(o => o === 'heading' ? 'north' : 'heading')}
          className="w-12 h-12 rounded-full bg-dark-900/90 border border-dark-700 flex items-center justify-center text-white shadow-xl hover:bg-dark-800 transition-colors"
          title={mapOrientation === 'heading' ? 'Heading-Up Mode' : 'North-Up Mode'}
        >
          <Compass size={22} className={mapOrientation === 'heading' ? 'text-primary-400 rotate-45' : 'text-slate-400'} />
        </button>
        <button
          onClick={() => {
            if (location && mapRef.current) {
              mapRef.current.flyTo({ lat: location.lat, lng: location.lng }, 17);
            }
          }}
          className="w-12 h-12 rounded-full bg-dark-900/90 border border-dark-700 flex items-center justify-center text-white shadow-xl hover:bg-dark-800 transition-colors"
          title="Recenter Camera"
        >
          <Crosshair size={22} className="text-blue-400" />
        </button>
      </div>

      {/* ── Low GPS Accuracy Alert ── */}
      {gpsAccuracy != null && gpsAccuracy > 50 && (
        <div className="absolute top-36 left-4 right-16 z-[500] max-w-md bg-amber-500/20 border border-amber-500/40 p-2.5 rounded-2xl flex items-center gap-2 text-amber-300 text-xs font-bold backdrop-blur-md">
          <AlertTriangle size={16} className="shrink-0" />
          <p>GPS accuracy is low (±{Math.round(gpsAccuracy)}m)</p>
        </div>
      )}

      {/* ── Bottom Telemetry & Navigation Action Control Dock ── */}
      <div className="absolute bottom-0 inset-x-0 z-[500] bg-gradient-to-t from-dark-950 via-dark-900 to-transparent pt-8 pb-6 px-4">
        <div className="max-w-md mx-auto space-y-4">

          {/* Voice Controls Row */}
          <div className="bg-dark-900/90 border border-dark-800 rounded-2xl p-3 flex items-center justify-between backdrop-blur-xl shadow-xl">
            <div className="flex items-center gap-2">
              <button
                onClick={() => { const m = TTS.toggleMute(); setIsMuted(m); }}
                className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors ${
                  isMuted ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-primary-500/10 border-primary-500/30 text-primary-400'
                }`}
              >
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                <span>{isMuted ? 'Muted' : 'Voice On'}</span>
              </button>

              <select
                value={navLang}
                onChange={(e) => {
                  const l = e.target.value as NavLanguage;
                  setNavLang(l);
                  setNavLanguage(l);
                  TTS.setTTSLanguage(l);
                }}
                className="bg-dark-950 border border-dark-700 text-xs font-bold text-slate-300 rounded-xl px-3 py-2 outline-none"
              >
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="hinglish">Hinglish</option>
              </select>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Live Speed</span>
              <span className="text-sm font-black text-green-400">
                {riderSpeedKmh != null ? `${riderSpeedKmh} km/h` : 'Waiting GPS'}
              </span>
            </div>
          </div>

          {/* Telemetry Display Card */}
          <div className="bg-dark-900/90 border border-dark-800 rounded-3xl p-4 flex items-center justify-between backdrop-blur-xl shadow-2xl">
            <div>
              <div className="text-2xl font-black text-white flex items-center gap-2">
                <span>{formatDistance(distanceRemainingMeters || 2400)}</span>
                <span className="text-slate-600">•</span>
                <span className="text-primary-400">{formatDuration(durationRemainingSeconds || 480)}</span>
              </div>
              <div className="text-xs font-bold text-slate-400 mt-1">
                {formatISTArrivalTime(durationRemainingSeconds || 480)}
              </div>
            </div>

            <button
              onClick={() => {
                if (customerCoords && location) {
                  loadRouteData({ lat: location.lat, lng: location.lng }, customerCoords);
                }
              }}
              className="px-4 py-2.5 rounded-2xl bg-dark-800 hover:bg-dark-700 border border-dark-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Navigation2 size={14} /> Recalculate
            </button>
          </div>

          {/* Mark Delivered Action Button */}
          <div>
            <button
              disabled={!canMarkDelivered}
              onClick={() => setShowProofModal(true)}
              className={`w-full py-4 font-black text-base rounded-2xl transition-all flex items-center justify-center gap-2 shadow-2xl ${
                canMarkDelivered
                  ? 'bg-green-500 hover:bg-green-400 text-dark-950 shadow-green-500/20 cursor-pointer'
                  : 'bg-dark-800 text-slate-500 border border-dark-700 cursor-not-allowed opacity-60'
              }`}
            >
              <CheckCircle2 size={24} /> Mark Delivered
            </button>
            {!canMarkDelivered && (
              <p className="text-center text-xs font-bold text-amber-400 mt-2">
                Available within 100 m ({Math.round(distanceToCustomerMeters)} m remaining to customer home)
              </p>
            )}
          </div>

        </div>
      </div>

      {/* Proof Submission Modal */}
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
