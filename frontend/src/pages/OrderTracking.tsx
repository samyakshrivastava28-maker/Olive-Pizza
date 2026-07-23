import {
  useEffect,
  useState,
  useRef,
  useMemo,
  useCallback,
  lazy,
  Suspense,
} from "react";
import { useParams, useNavigate } from "react-router";
import { useAuthStore } from "../lib/store";
import { auth, db } from "../lib/firebase";
import { doc, getDoc, onSnapshot, updateDoc } from "firebase/firestore";
import { useNotificationDebugger } from "../hooks/useNotificationDebugger";
import { supabase } from "../lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { RESTAURANT_LOCATION } from "../lib/config";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import {
  ChevronLeft,
  Phone,
  MapPin,
  Package,
  ChefHat,
  Truck,
  CheckCircle2,
  X,
  ShoppingBag,
  Navigation,
  Store,
  User,
  Download,
  RotateCcw,
  PartyPopper,
  Shield,
  Lock,
  Share2,
  MessageSquare,
  Star,
  Camera,
  Clock,
} from "lucide-react";
import "leaflet/dist/leaflet.css";

import { GlassCard, GlassButton } from "../components/ui/glass/GlassSystem";
import { OwnerAcceptedOverlay, DeliveredOverlay } from "../components/tracking/OrderEventsOverlay";
import { toast } from "react-hot-toast";
import { playNotificationSound, statusToSoundType } from "../hooks/useNotificationSound";
import OrderTimeline from "../components/ui/OrderTimeline";


// Lazy load map only when needed
const MapSection = lazy(() => import("../components/tracking/TrackingMap"));

// ─── Constants ───────────────────────────────────────────────────────
const TRACKABLE_STATUSES = new Set([
  "accepted",
  "preparing",
  "ready",
  "partner_assigned",
  "picked_up",
  "out_for_delivery",
]);

const LOCKED_STATUSES = new Set([
  "delivered",
  "cancelled",
  "failed",
  "refunded",
]);

// ─── Haversine Distance ──────────────────────────────────────────────
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Status Timeline Config ──────────────────────────────────────────
const TIMELINE_STAGES = [
  { key: "accepted", label: "Confirmed", icon: CheckCircle2, color: "text-emerald-400" },
  { key: "preparing", label: "Preparing", icon: ChefHat, color: "text-amber-400" },
  { key: "partner_assigned", label: "Packing", icon: Package, color: "text-blue-400" },
  { key: "out_for_delivery", label: "On the Way", icon: Truck, color: "text-primary-400" },
  { key: "delivered", label: "Delivered", icon: CheckCircle2, color: "text-emerald-400" },
];

function getStageIndex(status: string): number {
  if (status === "pending") return -1;
  if (status === "accepted") return 0;
  if (status === "preparing") return 1;
  if (status === "ready" || status === "partner_assigned" || status === "picked_up") return 2;
  if (status === "out_for_delivery") return 3;
  if (status === "delivered") return 4;
  return -1;
}

// ─── Particles ──────────────────────────────────────────────────────
function ParticleBackground() {
  const particles = useMemo(
    () =>
      Array.from({ length: 30 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1,
        duration: Math.random() * 20 + 15,
        delay: Math.random() * 10,
      })),
    [],
  );
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[100]">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-white/10"
          style={{ width: p.size, height: p.size, left: `${p.x}%`, top: `${p.y}%` }}
          animate={{ y: [0, -30, 0], opacity: [0, 0.6, 0] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity }}
        />
      ))}
    </div>
  );
}

// ─── Confetti ───────────────────────────────────────────────────────
function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        color: ["#f97316", "#22c55e", "#3b82f6", "#eab308", "#ec4899", "#a855f7"][Math.floor(Math.random() * 6)],
        size: Math.random() * 10 + 4,
        delay: Math.random() * 0.8,
        rotation: Math.random() * 360,
      })),
    [],
  );
  return (
    <div className="fixed inset-0 pointer-events-none z-[200] overflow-hidden">
      {pieces.map((p) => (
        <motion.div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}%`, top: -20, width: p.size, height: p.size * 0.6,
            backgroundColor: p.color, borderRadius: 2,
          }}
          initial={{ y: -20, rotate: 0, opacity: 1 }}
          animate={{ y: window.innerHeight + 60, rotate: p.rotation + 720, opacity: [1, 1, 0] }}
          transition={{ duration: 3.5, delay: p.delay, ease: [0.25, 0.46, 0.45, 0.94] }}
        />
      ))}
    </div>
  );
}

// ─── Delivery Success Screen ─────────────────────────────────────────
function DeliverySuccessScreen({ order, orderId, partnerDetails, navigate }: any) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [review, setReview] = useState("");
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShowConfetti(false), 4000);
    return () => clearTimeout(t);
  }, []);

  const deliveredAt = order.deliveredAt
    ? new Date(order.deliveredAt).toLocaleString("en-IN", {
        hour: "2-digit", minute: "2-digit", day: "numeric", month: "long", year: "numeric",
      })
    : "Just now";

  const handleSubmitRating = async () => {
    if (rating === 0) return;
    setIsSubmitting(true);
    try {
      // 1. Update Order
      await updateDoc(doc(db, "orders", orderId), {
        deliveryRating: {
          score: rating,
          review,
          createdAt: new Date().toISOString()
        }
      });
      
      // 2. Update Delivery Partner Metrics
      if (order.deliveryPartnerId) {
        const partnerRef = doc(db, "users", order.deliveryPartnerId);
        const partnerSnap = await getDoc(partnerRef);
        if (partnerSnap.exists()) {
          const pData = partnerSnap.data();
          const currentMetrics = pData.metrics || {};
          const newRatingSum = (currentMetrics.ratingSum || 0) + rating;
          const newRatingCount = (currentMetrics.ratingCount || 0) + 1;
          await updateDoc(partnerRef, {
            "metrics.ratingSum": newRatingSum,
            "metrics.ratingCount": newRatingCount
          });
        }
      }
      
      setRatingSubmitted(true);
      setTimeout(() => {
        navigate("/");
      }, 1500);
    } catch (e) {
      console.error("Error submitting rating:", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadInvoice = () => {
    const lines = [
      "OLIVE PIZZA — ORDER INVOICE",
      "=".repeat(40),
      `Order ID: #${orderId.slice(-8).toUpperCase()}`,
      `Date: ${deliveredAt}`,
      `Delivery Partner: ${partnerDetails?.name || "N/A"}`,
      "",
      "ITEMS:",
      ...(order.items || []).map((item: any) =>
        `  ${item.name}${item.variant ? ` (${item.variant})` : ""} x${item.quantity}  ₹${item.price * item.quantity}`
      ),
      "",
      `Subtotal: ₹${order.totalAmount - (order.deliveryFee || 40)}`,
      `Delivery: ₹${order.deliveryFee || 40}`,
      `TOTAL: ₹${order.totalAmount}`,
      `Payment: ${order.paymentMethod === "online" ? "Paid Online" : "Cash on Delivery"}`,
      "",
      "Thank you for ordering from Olive Pizza!",
    ].join("\n");
    const blob = new Blob([lines], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `olive-pizza-invoice-${orderId.slice(-8).toUpperCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-[100dvh] bg-dark-950 flex flex-col items-center justify-start overflow-y-auto pb-12">
      <ParticleBackground />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-emerald-500/20 blur-[120px] rounded-full pointer-events-none" />
      {showConfetti && <Confetti />}

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full flex flex-col items-center pt-20 pb-8 px-6 relative z-10"
      >
        <motion.div
          animate={{ scale: [1, 1.05, 1], rotate: [0, 5, -5, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="w-32 h-32 rounded-3xl bg-gradient-to-br from-emerald-500 to-green-400 flex items-center justify-center mb-8 shadow-[0_20px_60px_rgba(34,197,94,0.3)] border border-white/20"
        >
          <PartyPopper className="w-16 h-16 text-white" />
        </motion.div>

        <h1 className="text-4xl font-black text-white text-center mb-3 tracking-tight">
          Delivered!
        </h1>
        <p className="text-emerald-400 font-bold text-lg text-center mb-1">
          Enjoy your fresh pizza 🍕
        </p>
        <p className="text-slate-400 text-sm text-center mb-6">{deliveredAt}</p>

        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-dark-900/80 backdrop-blur-md border border-white/10 text-xs text-slate-400 font-medium shadow-xl"
        >
          <Shield className="w-4 h-4 text-emerald-500" />
          Live tracking securely closed
          <Lock className="w-4 h-4 text-emerald-500" />
        </motion.div>

        {order.deliveryProof && order.deliveryProof.photoUrl && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="mt-6 w-full max-w-sm">
            <GlassCard className="p-4 overflow-hidden border border-emerald-500/30 bg-emerald-500/5">
              <h3 className="text-emerald-400 font-bold text-sm uppercase tracking-wider mb-3 flex items-center justify-center gap-2">
                <Camera className="w-4 h-4" /> Delivery Proof
              </h3>
              <div className="w-full h-48 rounded-xl overflow-hidden border border-white/10 relative">
                <img src={order.deliveryProof.photoUrl} alt="Delivery Proof" className="w-full h-full object-cover" />
                <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-xl" />
              </div>
              {order.deliveryProof.note && (
                <div className="mt-3 bg-dark-950 p-3 rounded-xl border border-white/5 text-sm text-slate-300">
                  <span className="text-slate-500 font-bold mr-2">Note:</span>
                  {order.deliveryProof.note}
                </div>
              )}
            </GlassCard>
          </motion.div>
        )}
      </motion.div>

      <div className="w-full max-w-md px-5 space-y-4 relative z-10">
        <GlassCard hoverEffect className="p-6 text-center">
          <p className="text-white font-bold text-lg mb-5 drop-shadow-md">How was your delivery?</p>
          {!ratingSubmitted ? (
            <div className="flex flex-col gap-4">
              <div className="flex justify-center gap-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                    className="text-4xl transition-all duration-300 hover:scale-125 hover:-translate-y-2 active:scale-90"
                    style={{ filter: star <= (hoverRating || rating) ? "drop-shadow(0 0 15px rgba(250,204,21,0.5))" : "grayscale(1) opacity(0.3)" }}
                  >
                    ⭐
                  </button>
                ))}
              </div>
              
              {rating > 0 && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4 space-y-4 overflow-hidden">
                  <textarea
                    value={review}
                    onChange={(e) => setReview(e.target.value)}
                    placeholder="Leave a review (optional)..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 resize-none h-24"
                  />
                  <div className="flex gap-2">
                    <GlassButton variant="primary" onClick={handleSubmitRating} disabled={isSubmitting} className="w-full">
                      {isSubmitting ? "Submitting..." : "Submit Rating"}
                    </GlassButton>
                    <GlassButton variant="secondary" onClick={() => navigate("/")} className="w-full">
                      Skip
                    </GlassButton>
                  </div>
                </motion.div>
              )}
            </div>
          ) : (
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
              <p className="text-2xl drop-shadow-[0_0_15px_rgba(250,204,21,0.5)] mb-2">{"⭐".repeat(rating)}</p>
              <p className="text-emerald-400 font-bold">Awesome! Redirecting to home...</p>
            </motion.div>
          )}
        </GlassCard>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="grid grid-cols-2 gap-4">
          <GlassButton variant="secondary" onClick={handleDownloadInvoice} className="w-full flex justify-center gap-2 py-4 rounded-2xl">
            <Download size={18} /> Invoice
          </GlassButton>
          <GlassButton variant="primary" onClick={() => navigate("/menu")} className="w-full flex justify-center gap-2 py-4 rounded-2xl shadow-[0_0_30px_rgba(249,115,22,0.3)]">
            <RotateCcw size={18} /> Reorder
          </GlassButton>
        </motion.div>
        
        <motion.button
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
          onClick={() => navigate("/dashboard")}
          className="w-full py-4 text-slate-500 hover:text-white font-bold text-sm transition-colors text-center"
        >
          Return to Dashboard
        </motion.button>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────
export default function OrderTracking() {
  const { orderId } = useParams();
  const navigate = useNavigate();

  // Data State
  const [order, setOrder] = useState<any>(null);
  const [partnerDetails, setPartnerDetails] = useState<any>(null);

  // GPS State
  const [partnerLocation, setPartnerLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [partnerHeading, setPartnerHeading] = useState<number>(0);
  const [eta, setEta] = useState<number | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // Bottom Sheet State
  const [sheetState, setSheetState] = useState<"collapsed" | "half" | "expanded">("half");
  const [showAccepted, setShowAccepted] = useState(false);


  // Refs
  const channelRef = useRef<RealtimeChannel | null>(null);
  const offlineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trackingLockedRef = useRef(false);

  // ── Privacy Guard ──
  const lockTracking = useCallback(() => {
    if (trackingLockedRef.current) return;
    trackingLockedRef.current = true;
    setPartnerLocation(null);
    setPartnerHeading(0);
    setEta(null);
    setDistance(null);
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    if (offlineTimerRef.current) clearTimeout(offlineTimerRef.current);
  }, []);

  const resetOfflineTimer = useCallback(() => {
    if (offlineTimerRef.current) clearTimeout(offlineTimerRef.current);
    offlineTimerRef.current = setTimeout(() => {
      // Offline fallback silently ignored for premium feel, GPS interpolation handles minor drops
    }, 30000);
  }, []);

  // ── FIRESTORE: Order ──
  const prevOrderStatusRef = useRef<string | null>(null);
  useEffect(() => {
    if (!orderId) return;
    const unsub = onSnapshot(doc(db, "orders", orderId), (docSnap) => {
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...(docSnap.data() as any) };
        // Play sound when status changes
        if (prevOrderStatusRef.current && prevOrderStatusRef.current !== data.status) {
          const soundType = statusToSoundType(data.status);
          if (soundType) playNotificationSound(soundType);
        }
        if (prevOrderStatusRef.current === 'pending' && data.status === 'accepted') {
          setShowAccepted(true);
        }
        prevOrderStatusRef.current = data.status;
        setOrder(data);
        if (LOCKED_STATUSES.has(data.status)) lockTracking();
      }
    });
    return () => unsub();
  }, [orderId, lockTracking]);


  // ── FIRESTORE: Partner ──
  useEffect(() => {
    if (!order?.deliveryPartnerId) return;
    const unsub = onSnapshot(doc(db, "users", order.deliveryPartnerId), (docSnap) => {
      if (docSnap.exists()) {
        const { liveLocation: _stripped, ...safeData } = docSnap.data();
        setPartnerDetails(safeData);
      }
    });
    return () => unsub();
  }, [order?.deliveryPartnerId]);

  // ── SUPABASE REALTIME: GPS ──
  useEffect(() => {
    if (!order?.deliveryPartnerId || !orderId) return;
    if (!TRACKABLE_STATUSES.has(order.status) || order.status !== "out_for_delivery") {
      if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
      return;
    }

    const partnerId = order.deliveryPartnerId;

    // Initial position
    supabase.from("delivery_locations").select("latitude,longitude,heading,speed").eq("delivery_partner_id", partnerId).single()
      .then(({ data, error }) => {
        if (error || trackingLockedRef.current) return;
        if (data) {
          const lat = data.latitude;
          const lng = data.longitude;
          setPartnerLocation({ lat, lng });
          setPartnerHeading(data.heading || 0);
          resetOfflineTimer();
          
          if (order?.deliveryAddress?.lat && order?.deliveryAddress?.lng) {
            const dist = haversine(lat, lng, order.deliveryAddress.lat, order.deliveryAddress.lng);
            const speedKmh = data.speed ? data.speed * 3.6 : 25;
            setDistance(Math.round(dist * 10) / 10);
            setEta(Math.max(1, Math.ceil((dist / speedKmh) * 60)));
          }
        }
      });

    // Realtime subscription
    const channel = supabase.channel(`tracking-${orderId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_locations", filter: `delivery_partner_id=eq.${partnerId}` }, (payload) => {
        if (trackingLockedRef.current) return;
        const row = payload.new as any;
        if (!row?.latitude || !row?.longitude) return;

        const lat = row.latitude as number;
        const lng = row.longitude as number;
        setPartnerLocation({ lat, lng });
        setPartnerHeading(row.heading || 0);
        resetOfflineTimer();

        // Calculate dynamic ETA
        if (order?.deliveryAddress?.lat && order?.deliveryAddress?.lng) {
          const dist = haversine(lat, lng, order.deliveryAddress.lat, order.deliveryAddress.lng);
          const speedKmh = row.speed ? row.speed * 3.6 : 25;
          setDistance(Math.round(dist * 10) / 10);
          setEta(Math.max(1, Math.ceil((dist / speedKmh) * 60)));
        }
      }).subscribe();

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
      if (offlineTimerRef.current) clearTimeout(offlineTimerRef.current);
    };
  }, [order?.deliveryPartnerId, order?.status, orderId, resetOfflineTimer]);

  // ── Fallback ETA ──
  useEffect(() => {
    if (!order || LOCKED_STATUSES.has(order.status)) return;
    if (order.status === "accepted") setEta(25);
    else if (order.status === "preparing") setEta(18);
    else if (order.status === "ready" || order.status === "partner_assigned") setEta(12);
    else if (order.status === "picked_up") setEta(8);
  }, [order?.status]);

  const handleCancel = async () => {
    if (!orderId || cancelling) return;
    setCancelling(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Not authenticated');
      
      const isDebug = useNotificationDebugger.getState().isDebugMode;
      if (isDebug) useNotificationDebugger.getState().startTrace('POST /api/notifications/action', 'Cancel Order', orderId);

      const res = await fetch('/api/notifications/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...(isDebug ? { 'X-Debug-Mode': 'true' } : {})
        },
        body: JSON.stringify({ orderId, action: 'cancel', currentStage: order.status })
      });
      const data = await res.json();
      if (isDebug && data.trace) useNotificationDebugger.getState().updateTrace(data.trace);
      if (!res.ok) {
        if (!data.duplicate) throw new Error(data.error);
      }
    } catch (e) {
      console.error('Cancel failed', e);
    } finally {
      setCancelling(false);
    }
  };

  if (!order) {
    return (
      <div className="h-[100dvh] bg-dark-950 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary-500/10 blur-[100px] rounded-full" />
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} className="w-16 h-16 border-4 border-primary-500/30 border-t-primary-500 rounded-full mb-6 z-10" />
        <p className="text-white font-bold tracking-widest uppercase text-sm animate-pulse z-10">Locating Order...</p>
      </div>
    );
  }

  if (order.status === "delivered") return <DeliverySuccessScreen order={order} orderId={orderId!} partnerDetails={partnerDetails} navigate={navigate} />;

  if (order.status === "cancelled") {
    return (
      <div className="h-[100dvh] bg-dark-950 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-red-500/10 blur-[100px] rounded-full" />
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-24 h-24 bg-dark-900 border border-white/10 rounded-3xl flex items-center justify-center mb-8 shadow-2xl relative z-10">
          <X className="w-12 h-12 text-red-500" />
        </motion.div>
        <h1 className="text-3xl font-black text-white mb-3 relative z-10">Order Cancelled</h1>
        <p className="text-slate-400 mb-10 max-w-sm relative z-10">Your order {order.dailyOrderNumber || `#${orderId?.slice(-6).toUpperCase()}`} has been successfully cancelled.</p>
        <GlassButton variant="primary" onClick={() => navigate("/menu")} className="px-10 py-4 relative z-10">Order Again</GlassButton>
      </div>
    );
  }

  const stageIndex = getStageIndex(order.status);
  const statusLabel = order.status === "accepted" ? "Order Accepted" : order.status === "preparing" ? "Preparing Your Pizza" : order.status === "ready" || order.status === "partner_assigned" || order.status === "picked_up" ? "Packing Your Order" : order.status === "out_for_delivery" ? "On the Way" : "Processing";
  
  // Bottom sheet drag logic
  const handleDragEnd = (event: any, info: PanInfo) => {
    const offset = info.offset.y;
    const velocity = info.velocity.y;
    
    if (offset > 100 || velocity > 500) {
      if (sheetState === "expanded") setSheetState("half");
      else if (sheetState === "half") setSheetState("collapsed");
    } else if (offset < -100 || velocity < -500) {
      if (sheetState === "collapsed") setSheetState("half");
      else if (sheetState === "half") setSheetState("expanded");
    }
  };

  const sheetVariants = {
    collapsed: { y: "calc(100vh - 200px)" }, // Peek top bar
    half: { y: "55vh" },
    expanded: { y: "15vh" }
  };

  return (
    <div className="h-[100dvh] w-full bg-slate-100 flex flex-col overflow-hidden relative">
      
      {/* ─── FULLSCREEN MAP ─── */}
      <div className="absolute inset-0 z-0">
        <Suspense fallback={<div className="w-full h-full bg-slate-200 flex items-center justify-center"><div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" /></div>}>
          <MapSection
            restaurantLat={RESTAURANT_LOCATION.lat} restaurantLng={RESTAURANT_LOCATION.lng}
            customerLat={order.deliveryAddress?.lat} customerLng={order.deliveryAddress?.lng}
            partnerLat={partnerLocation?.lat} partnerLng={partnerLocation?.lng}
            partnerHeading={partnerHeading} status={order.status}
          />
        </Suspense>
        {/* Subtle bottom gradient so the sheet blends in */}
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-white/60 to-transparent pointer-events-none z-10" />
      </div>

      {/* ─── FLOATING TOP HUD ─── */}
      <div className="absolute top-0 left-0 right-0 z-50 p-4 pt-safe flex flex-col gap-3 pointer-events-none">
        
        {/* Navbar Row */}
        <div className="flex items-center justify-between pointer-events-auto">
          <button
            onClick={() => navigate("/dashboard")}
            className="w-11 h-11 flex items-center justify-center bg-white/90 backdrop-blur-xl rounded-full border border-black/10 text-slate-700 shadow-lg hover:bg-white transition-colors active:scale-95"
          >
            <ChevronLeft size={22} />
          </button>
          
          <div className="flex bg-white/90 backdrop-blur-xl rounded-full border border-black/10 shadow-lg px-5 py-2.5 items-center gap-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-black tracking-widest text-emerald-600 uppercase">Live</span>
            <div className="w-px h-4 bg-slate-200" />
            <span className="text-sm font-bold text-slate-800">{order?.dailyOrderNumber || `#${orderId?.slice(-6).toUpperCase()}`}</span>
          </div>

          <button
            onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("Tracking link copied!"); }}
            className="w-11 h-11 flex items-center justify-center bg-white/90 backdrop-blur-xl rounded-full border border-black/10 text-slate-700 shadow-lg hover:bg-white transition-colors active:scale-95"
          >
            <Share2 size={18} />
          </button>
        </div>

        {/* ETA Pill */}
        {eta && (
          <motion.div
            initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
            className="self-center pointer-events-auto"
          >
            <div className="bg-white/95 backdrop-blur-xl border border-black/10 shadow-xl rounded-2xl px-7 py-3.5 flex flex-col items-center">
              <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-0.5">Estimated Arrival</p>
              <div className="flex items-baseline gap-1.5">
                <motion.span
                  key={eta} initial={{ opacity: 0, scale: 0.8, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="text-3xl font-black text-slate-900 tracking-tighter"
                >
                  {eta}
                </motion.span>
                <span className="text-base font-bold text-slate-400">min</span>
              </div>
              {distance && (
                <div className="mt-1.5 flex items-center gap-1.5 px-3 py-0.5 bg-blue-50 rounded-full border border-blue-100">
                  <Navigation size={10} className="text-blue-500" />
                  <span className="text-[10px] font-bold text-blue-600">{distance} km away</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* ─── DRAGGABLE BOTTOM SHEET ─── */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[2rem] shadow-[0_-8px_40px_rgba(0,0,0,0.15)] z-[100] flex flex-col"
        initial="half"
        animate={sheetState}
        variants={sheetVariants}
        transition={{ type: "spring", damping: 28, stiffness: 220 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.18}
        onDragEnd={handleDragEnd}
        style={{ height: "100vh" }}
      >
        {/* Drag Handle */}
        <div className="w-full flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing">
          <div className="w-10 h-1 bg-slate-300 rounded-full" />
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain pb-10">

          {/* ── Status Banner ── */}
          <div className="px-5 pt-2 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">{statusLabel}</h2>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Updating in real-time</p>
              </div>
              {order.status === "preparing" && (
                <div className="w-11 h-11 bg-amber-50 rounded-xl flex items-center justify-center">
                  <ChefHat size={22} className="text-amber-500" />
                </div>
              )}
              {order.status === "out_for_delivery" && (
                <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center animate-pulse">
                  <span className="text-2xl">🛵</span>
                </div>
              )}
            </div>
          </div>

          {/* ── Timeline ── */}
          <div className="px-5 pb-5">
            <OrderTimeline status={order.status} />
          </div>

          {/* Divider */}
          <div className="h-2 bg-slate-50 border-y border-slate-100" />

          {/* ── Delivery Partner ── */}
          {partnerDetails && (
            <div className="px-5 py-4">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Your Delivery Partner</p>
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-orange-400 shadow-md">
                    {partnerDetails.photoUrl ? (
                      <img src={partnerDetails.photoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-orange-50 flex items-center justify-center">
                        <User size={24} className="text-orange-400" />
                      </div>
                    )}
                  </div>
                  {/* Online dot */}
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-base font-bold text-slate-900 truncate">{partnerDetails.name || "Delivery Partner"}</h4>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    {partnerDetails.vehicleType || "Scooter"}{partnerDetails.vehicleNumber ? ` · ${partnerDetails.vehicleNumber}` : ""}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <Star size={11} className="text-amber-400 fill-amber-400" />
                    <span className="text-xs font-bold text-slate-600">
                      {partnerDetails.metrics?.ratingSum && partnerDetails.metrics?.ratingCount
                        ? (partnerDetails.metrics.ratingSum / partnerDetails.metrics.ratingCount).toFixed(1)
                        : "4.9"}
                    </span>
                    <span className="text-xs text-slate-400 ml-1">
                      {partnerDetails.metrics?.totalDeliveries ? `${partnerDetails.metrics.totalDeliveries} deliveries` : ""}
                    </span>
                  </div>
                </div>

                {/* Call button */}
                {partnerDetails.phone && (
                  <div className="flex gap-2 shrink-0">
                    <a
                      href={`tel:${partnerDetails.phone}`}
                      className="w-11 h-11 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-200 hover:bg-emerald-600 active:scale-95 transition-all"
                    >
                      <Phone size={18} />
                    </a>
                    <button className="w-11 h-11 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-200 active:scale-95 transition-all">
                      <MessageSquare size={18} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="h-2 bg-slate-50 border-y border-slate-100" />

          {/* ── Delivery Address ── */}
          <div className="px-5 py-4">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Delivery Address</p>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                <MapPin size={18} className="text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 leading-snug">
                  {order.deliveryAddress?.address || order.deliveryAddress?.fullAddress || "Your Location"}
                </p>
                {order.deliveryAddress?.landmark && (
                  <p className="text-xs text-slate-400 mt-0.5">Near {order.deliveryAddress.landmark}</p>
                )}
              </div>
            </div>
          </div>

          <div className="h-2 bg-slate-50 border-y border-slate-100" />

          {/* ── Restaurant Info ── */}
          <div className="px-5 py-4">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Restaurant</p>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                <span className="text-lg">🍕</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800">Olive Pizza</p>
                <p className="text-xs text-slate-400 truncate mt-0.5">{RESTAURANT_LOCATION.address}</p>
              </div>
              <a
                href="tel:9999999999"
                className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <Phone size={15} />
              </a>
            </div>
          </div>

          <div className="h-2 bg-slate-50 border-y border-slate-100" />

          {/* ── Order Summary ── */}
          <div className="px-5 py-4">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <ShoppingBag size={12} /> Your Order
            </p>
            <div className="space-y-3 mb-4">
              {order.items?.map((item: any, i: number) => (
                <div key={i} className="flex items-center gap-3">
                  {item.image && (
                    <div className="w-11 h-11 rounded-xl overflow-hidden border border-slate-100 shrink-0">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{item.name}</p>
                    {(item.variant || item.crust) && (
                      <p className="text-xs text-slate-400 truncate">{[item.variant, item.crust].filter(Boolean).join(" · ")}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">×{item.quantity}</span>
                    <span className="text-sm font-bold text-slate-900">₹{item.price * item.quantity}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Bill summary */}
            <div className="bg-slate-50 rounded-2xl p-4 space-y-2">
              <div className="flex justify-between text-sm text-slate-500">
                <span>Item Total</span>
                <span>₹{order.totalAmount - (order.deliveryFee || 40)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-500">
                <span>Delivery Fee</span>
                <span>₹{order.deliveryFee || 40}</span>
              </div>
              <div className="flex justify-between items-center pt-2 mt-1 border-t border-slate-200">
                <span className="text-sm font-bold text-slate-800">Grand Total</span>
                <span className="text-lg font-black text-orange-500">₹{order.totalAmount}</span>
              </div>
              <div className="flex items-center gap-1.5 pt-1">
                <div className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center">
                  <span className="text-[9px]">💳</span>
                </div>
                <span className="text-xs text-slate-400 font-medium">
                  {order.paymentMethod === "online" ? "Paid Online" : "Cash on Delivery"}
                </span>
              </div>
            </div>
          </div>

          {/* ── Actions ── */}
          <div className="px-5 pt-2 pb-6 space-y-3">
            {["pending", "accepted", "preparing"].includes(order.status) && (
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="w-full py-3.5 rounded-2xl border-2 border-red-200 bg-red-50 text-red-500 font-bold text-sm hover:bg-red-100 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {cancelling ? "Cancelling..." : "Cancel Order"}
              </button>
            )}
            <button className="w-full py-3.5 rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 font-semibold text-sm hover:bg-slate-100 active:scale-[0.98] transition-all">
              Need Help? Contact Support
            </button>
          </div>

        </div>
      </motion.div>

      <OwnerAcceptedOverlay show={showAccepted} onClose={() => setShowAccepted(false)} />
      <DeliveredOverlay show={order?.status === 'delivered'} order={order} />
    </div>
  );
}
