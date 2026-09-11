import {
  useEffect,
  useState,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { useParams, useNavigate, useSearchParams } from "react-router";
import { useAuthStore } from "../lib/store";
import { auth, db } from "../lib/firebase";
import { doc, getDoc, onSnapshot, updateDoc, collection, getDocs, query, where } from "firebase/firestore";
import { useNotificationDebugger } from "../hooks/useNotificationDebugger";
import { supabase } from "../lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { RESTAURANT_LOCATION, fetchApi } from "../lib/config";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  ArrowRight,
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
  Receipt,
} from "lucide-react";

import { GlassCard, GlassButton } from "../components/ui/glass/GlassSystem";
import { OwnerAcceptedOverlay, DeliveredOverlay } from "../components/tracking/OrderEventsOverlay";
import { toast } from "react-hot-toast";
import { playNotificationSound, statusToSoundType } from "../hooks/useNotificationSound";
import OrderTimeline from "../components/ui/OrderTimeline";
import UniversalMap3D from "../components/map/UniversalMap3D";
import type { MapMarker } from "../components/map/UniversalMap3D";
import { fetchRoute } from "../services/navigationRouting.service";
import SEO from "../components/SEO";
import { useLiveOrderTracking } from "../hooks/useLiveOrderTracking";

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
  switch (status) {
    case 'accepted':
      return 0;
    case 'preparing':
      return 1;
    case 'ready':
    case 'partner_assigned':
    case 'picked_up':
      return 2;
    case 'out_for_delivery':
      return 3;
    case 'delivered':
      return 4;
    case 'pending':
    default:
      return -1;
  }
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
          <GlassButton 
            variant="secondary" 
            onClick={() => navigate(`/bill/${order.billReference || order.id || orderId}`)} 
            className="w-full flex justify-center items-center gap-2 py-4 rounded-2xl text-xs font-bold"
          >
            <Receipt size={18} /> View Bill
          </GlassButton>
          <GlassButton variant="primary" onClick={() => navigate("/menu")} className="w-full flex justify-center items-center gap-2 py-4 rounded-2xl shadow-[0_0_30px_rgba(249,115,22,0.3)] text-xs font-bold">
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
  const { orderId: paramOrderId } = useParams();
  const [searchParams] = useSearchParams();
  const queryOrderId = searchParams.get('orderId') || searchParams.get('id');
  const navigate = useNavigate();

  // Active tracking target ID
  const [resolvedOrderId, setResolvedOrderId] = useState<string | null>(paramOrderId || queryOrderId || null);
  const [searchOrderIdInput, setSearchOrderIdInput] = useState<string>('');
  const [isResolving, setIsResolving] = useState<boolean>(!paramOrderId && !queryOrderId);
  const [userOrders, setUserOrders] = useState<any[]>([]);

  const orderId = resolvedOrderId || paramOrderId || queryOrderId || null;

  // Data State
  const [order, setOrder] = useState<any>(null);
  const [partnerDetails, setPartnerDetails] = useState<any>(null);
  const [orderNotFound, setOrderNotFound] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  // GPS State
  const [partnerLocation, setPartnerLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [partnerHeading, setPartnerHeading] = useState<number>(0);
  const [routeGeoJSON, setRouteGeoJSON] = useState<GeoJSON.Feature<GeoJSON.LineString> | null>(null);
  const [eta, setEta] = useState<number | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // Bottom Sheet State
  const [sheetState, setSheetState] = useState<"collapsed" | "half" | "expanded">("half");
  const [showAccepted, setShowAccepted] = useState(false);

  // Live Activity & Dynamic Island / Native Notification Synchronization
  const itemsSummary = useMemo(() => {
    if (!order?.items || !Array.isArray(order.items)) return '';
    return order.items.map((i: any) => typeof i === 'string' ? i : `${i.quantity || 1}× ${i.name || 'Item'}`).join(', ');
  }, [order?.items]);

  useLiveOrderTracking(
    order
      ? {
          orderId: order.id || orderId || undefined,
          orderNumber: order.orderNumber || (order.id ? order.id.slice(-6) : ''),
          status: order.status,
          step: getStageIndex(order.status) + 1,
          itemsSummary,
          totalAmount: Number(order.totalAmount || 0),
          etaMinutes: eta || order.estimatedDeliveryMinutes || (order.estimatedDeliveryTime ? parseInt(order.estimatedDeliveryTime) : 25),
          riderName: partnerDetails?.name || order.deliveryPartnerName || '',
          riderPhone: partnerDetails?.phone || order.deliveryPartnerPhone || '',
          restaurantName: 'Olive Pizza',
        }
      : null
  );

  // Refs
  const channelRef = useRef<RealtimeChannel | null>(null);
  const offlineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trackingLockedRef = useRef(false);

  // Auto-resolve active order if no ID provided in URL
  useEffect(() => {
    if (paramOrderId || queryOrderId) {
      setResolvedOrderId(paramOrderId || queryOrderId);
      setIsResolving(false);
      return;
    }

    // 1. Check local storage
    const cachedId = localStorage.getItem('activeOrderId') || localStorage.getItem('lastPlacedOrderId');
    if (cachedId) {
      setResolvedOrderId(cachedId);
      setIsResolving(false);
    }

    // 2. Fetch authenticated user's recent orders
    const currentUser = auth.currentUser || useAuthStore.getState().user;
    if (currentUser?.uid) {
      const q = query(
        collection(db, "orders"),
        where("userId", "==", currentUser.uid)
      );
      getDocs(q).then((snap) => {
        if (!snap.empty) {
          const list = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
          list.sort((a, b) => {
            const tA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
            const tB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
            return tB - tA;
          });
          setUserOrders(list.slice(0, 5));

          // If no cached order or cached order is missing, check for active order
          if (!cachedId) {
            const active = list.find(o => 
              TRACKABLE_STATUSES.has(o.status) || 
              ['pending', 'accepted', 'preparing', 'ready', 'partner_assigned'].includes(o.status)
            );
            if (active) {
              setResolvedOrderId(active.id);
            } else if (list[0]) {
              setResolvedOrderId(list[0].id);
            }
          }
        }
      }).catch(err => {
        console.warn("[OrderTracking] Failed to fetch user orders:", err);
      }).finally(() => {
        setIsResolving(false);
      });
    } else {
      setIsResolving(false);
    }
  }, [paramOrderId, queryOrderId]);

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

  // ── FIRESTORE: Order & Live Telemetry ──
  const prevOrderStatusRef = useRef<string | null>(null);
  useEffect(() => {
    if (!orderId) {
      if (!isResolving) {
        setOrder(null);
      }
      return;
    }

    setOrderError(null);
    setOrderNotFound(false);

    try {
      localStorage.setItem('activeOrderId', orderId);
    } catch {}

    const unsub = onSnapshot(
      doc(db, "orders", orderId),
      async (docSnap) => {
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...(docSnap.data() as any) };

          // Security check: customer, assigned partner, or staff can view
          const currentUser = auth.currentUser;
          const userRole = useAuthStore.getState().user?.role;
          const isStaff = userRole === 'owner' || userRole === 'admin' || userRole === 'restaurant_manager';
          const isAssignedRider = currentUser && data.deliveryPartnerId === currentUser.uid;
          const isCustomer = !currentUser || 
            !data.userId || 
            data.userId === currentUser.uid || 
            data.customerId === currentUser.uid ||
            Boolean(currentUser.phoneNumber && (data.contactPhone === currentUser.phoneNumber || data.customerPhone === currentUser.phoneNumber || data.customerInfo?.phone === currentUser.phoneNumber)) ||
            Boolean(currentUser.email && (data.userEmail === currentUser.email || data.customerInfo?.email === currentUser.email));

          if (!isStaff && !isAssignedRider && !isCustomer) {
            setOrderError("Access restricted: You are not authorized to view tracking for this order.");
            return;
          }

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

          // Populate sanitized partner details from order snapshot
          if (data.deliveryPartnerDetails) {
            setPartnerDetails(data.deliveryPartnerDetails);
          } else if (data.deliveryPartnerName) {
            setPartnerDetails((prev: any) => ({
              ...prev,
              name: data.deliveryPartnerName,
              phone: data.deliveryPartnerPhone || prev?.phone,
              vehicleType: data.deliveryPartnerVehicleType || prev?.vehicleType || 'Scooter'
            }));
          }

          // Live GPS Telemetry direct from Firestore order.driverLocation
          if (TRACKABLE_STATUSES.has(data.status) && (data.status === "picked_up" || data.status === "out_for_delivery")) {
            if (data.driverLocation?.lat && data.driverLocation?.lng) {
              const lat = Number(data.driverLocation.lat);
              const lng = Number(data.driverLocation.lng);
              setPartnerLocation({ lat, lng });
              if (data.driverLocation.heading !== undefined) {
                setPartnerHeading(Number(data.driverLocation.heading));
              }
              resetOfflineTimer();

              if (data.deliveryAddress?.lat && data.deliveryAddress?.lng) {
                const dist = haversine(lat, lng, data.deliveryAddress.lat, data.deliveryAddress.lng);
                const speedKmh = data.driverLocation.speed ? data.driverLocation.speed * 3.6 : 25;
                setDistance(Math.round(dist * 10) / 10);
                setEta(Math.max(1, Math.ceil((dist / speedKmh) * 60)));
              }
            }
          }

          if (LOCKED_STATUSES.has(data.status)) {
            lockTracking();
          }
        } else {
          // Fallback: Check if orderId is a daily order number or short code
          try {
            const qDaily = query(
              collection(db, "orders"),
              where("dailyOrderNumber", "==", orderId)
            );
            const dailySnap = await getDocs(qDaily);
            if (!dailySnap.empty) {
              const found = dailySnap.docs[0];
              setResolvedOrderId(found.id);
              return;
            }
          } catch {}
          setOrderNotFound(true);
        }
      },
      (err) => {
        console.error("[OrderTracking] Snapshot error:", err);
        setOrderError("Unable to load order. Please verify your internet connection.");
      }
    );

    return () => unsub();
  }, [orderId, isResolving, lockTracking, resetOfflineTimer]);

  // ── ROUTE POLYLINE (OSRM Driving Road Path) ──
  useEffect(() => {
    if (!order?.deliveryAddress?.lat || !order?.deliveryAddress?.lng) return;
    const dest = { lat: Number(order.deliveryAddress.lat), lng: Number(order.deliveryAddress.lng) };
    const origin = { lat: RESTAURANT_LOCATION.lat, lng: RESTAURANT_LOCATION.lng };

    fetchRoute(origin, dest, orderId || undefined)
      .then((routeResult) => {
        if (routeResult?.geojson) {
          setRouteGeoJSON(routeResult.geojson);
          if (routeResult.distanceMetres && !distance) {
            setDistance(Math.round((routeResult.distanceMetres / 1000) * 10) / 10);
          }
        }
      })
      .catch((e) => {
        console.warn("[OrderTracking] Route calculation notice:", e);
      });
  }, [orderId, order?.deliveryAddress?.lat, order?.deliveryAddress?.lng, distance]);

  // ── BACKEND REST FALLBACK FOR PARTNER INFO & GPS ──
  useEffect(() => {
    if (!orderId || !order?.deliveryPartnerId) return;
    if (order.deliveryPartnerDetails) return;

    fetchApi(`/api/tracking/order/${orderId}`)
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          if (data) {
            setPartnerDetails((prev: any) => ({
              ...prev,
              name: order.deliveryPartnerName || prev?.name || "Delivery Partner",
              phone: order.deliveryPartnerPhone || prev?.phone,
              vehicleType: prev?.vehicleType || "Scooter",
              speed: data.speed,
              heading: data.heading,
            }));
            if (data.partner_lat && data.partner_lng && !partnerLocation && (order.status === 'picked_up' || order.status === 'out_for_delivery')) {
              setPartnerLocation({ lat: Number(data.partner_lat), lng: Number(data.partner_lng) });
              if (data.heading) setPartnerHeading(Number(data.heading));
            }
          }
        }
      })
      .catch(() => {});
  }, [orderId, order?.deliveryPartnerId, order?.deliveryPartnerDetails, order?.deliveryPartnerName, order?.status, partnerLocation]);

  // ── SUPABASE REALTIME: GPS (Instant Second Channel) ──
  useEffect(() => {
    if (!order?.deliveryPartnerId || !orderId) return;
    if (!TRACKABLE_STATUSES.has(order.status) || (order.status !== "out_for_delivery" && order.status !== "picked_up")) {
      if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
      return;
    }

    const partnerId = order.deliveryPartnerId;

    // Initial position from Supabase
    Promise.resolve(supabase.from("delivery_locations").select("latitude,longitude,heading,speed").eq("delivery_partner_id", partnerId).single())
      .then(({ data, error }) => {
        if (error || trackingLockedRef.current) return;
        if (data && data.latitude && data.longitude) {
          const lat = Number(data.latitude);
          const lng = Number(data.longitude);
          setPartnerLocation({ lat, lng });
          setPartnerHeading(Number(data.heading || 0));
          resetOfflineTimer();
          
          if (order?.deliveryAddress?.lat && order?.deliveryAddress?.lng) {
            const dist = haversine(lat, lng, order.deliveryAddress.lat, order.deliveryAddress.lng);
            const speedKmh = data.speed ? data.speed * 3.6 : 25;
            setDistance(Math.round(dist * 10) / 10);
            setEta(Math.max(1, Math.ceil((dist / speedKmh) * 60)));
          }
        }
      })
      .catch(() => {});

    // Realtime subscription
    const channel = supabase.channel(`tracking-${orderId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_locations", filter: `delivery_partner_id=eq.${partnerId}` }, (payload) => {
        if (trackingLockedRef.current) return;
        const row = payload.new as any;
        if (!row?.latitude || !row?.longitude) return;

        const lat = Number(row.latitude);
        const lng = Number(row.longitude);
        setPartnerLocation({ lat, lng });
        setPartnerHeading(Number(row.heading || 0));
        resetOfflineTimer();

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
    switch (order.status) {
      case "accepted":
        setEta(25);
        break;
      case "preparing":
        setEta(18);
        break;
      case "ready":
      case "partner_assigned":
        setEta(12);
        break;
      case "picked_up":
        setEta(8);
        break;
      default:
        break;
    }
  }, [order?.status]);

  const handleCancel = async () => {
    if (!orderId || cancelling) return;
    setCancelling(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Not authenticated');
      
      const isDebug = useNotificationDebugger.getState().isDebugMode;
      if (isDebug) useNotificationDebugger.getState().startTrace('POST /api/notifications/action', 'Cancel Order', orderId);

      const res = await fetchApi('/api/notifications/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...(isDebug ? { 'X-Debug-Mode': 'true' } : {})
        },
        body: JSON.stringify({ 
          orderId, 
          action: 'cancel_order', 
          currentStage: order.status,
          reason: 'Customer requested cancellation from app'
        })
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

  if (orderNotFound) {
    return (
      <div className="min-h-[100dvh] bg-dark-950 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-amber-500/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="w-20 h-20 bg-dark-900 border border-amber-500/30 rounded-3xl flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(245,158,11,0.2)] relative z-10">
          <Package className="w-10 h-10 text-amber-500" />
        </div>
        <h1 className="text-2xl font-black text-white mb-2 relative z-10">Order Not Found</h1>
        <p className="text-slate-400 mb-6 max-w-sm text-sm relative z-10">
          We couldn't find an order with ID <span className="font-mono text-white font-bold">#{orderId || 'requested'}</span>. Please verify your order ID or search below:
        </p>

        {/* Quick Search Box */}
        <div className="w-full max-w-md relative z-10 mb-6">
          <div className="relative flex items-center">
            <input
              type="text"
              placeholder="Enter Order ID (e.g. OP-1234 or #05)"
              defaultValue={searchOrderIdInput}
              onChange={(e) => setSearchOrderIdInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const val = searchOrderIdInput.trim().replace(/^#/, '');
                  if (val) {
                    setOrderNotFound(false);
                    setResolvedOrderId(val);
                    navigate(`/order-tracking/${val}`);
                  }
                }
              }}
              className="w-full bg-dark-900 border border-white/15 focus:border-amber-500 rounded-2xl py-3.5 pl-4 pr-12 text-white text-sm font-mono focus:outline-none transition-all shadow-inner"
            />
            <button
              onClick={() => {
                const val = searchOrderIdInput.trim().replace(/^#/, '');
                if (val) {
                  setOrderNotFound(false);
                  setResolvedOrderId(val);
                  navigate(`/order-tracking/${val}`);
                }
              }}
              disabled={!searchOrderIdInput.trim()}
              className="absolute right-2 p-2 bg-amber-500 disabled:opacity-40 text-dark-950 font-bold rounded-xl transition-all cursor-pointer"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* User's recent orders */}
        {userOrders.length > 0 && (
          <div className="w-full max-w-md mb-6 text-left relative z-10">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
              Your Recent Orders
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {userOrders.map((o) => (
                <div
                  key={o.id}
                  onClick={() => {
                    setOrderNotFound(false);
                    setResolvedOrderId(o.id);
                    navigate(`/order-tracking/${o.id}`);
                  }}
                  className="bg-dark-900/80 hover:bg-dark-800 border border-white/10 hover:border-amber-500/40 rounded-2xl p-3 flex items-center justify-between cursor-pointer transition-all active:scale-[0.99]"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-xs font-mono">
                      #{o.dailyOrderNumber || o.id.slice(-4).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">₹{o.totalAmount || o.pricing?.finalTotal || 0}</p>
                      <p className="text-[10px] text-slate-400 capitalize">{o.status?.replace(/_/g, ' ') || 'Order'}</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-amber-400 flex items-center gap-1">
                    Track <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 relative z-10">
          <GlassButton variant="secondary" onClick={() => navigate("/dashboard")} className="py-3 px-5 text-sm">
            Dashboard
          </GlassButton>
          <GlassButton variant="primary" onClick={() => navigate("/menu")} className="py-3 px-5 text-sm font-bold">
            Explore Menu
          </GlassButton>
        </div>
      </div>
    );
  }

  if (orderError) {
    return (
      <div className="h-[100dvh] bg-dark-950 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-red-500/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="w-20 h-20 bg-dark-900 border border-red-500/30 rounded-3xl flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(239,68,68,0.2)] relative z-10">
          <Shield className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-2xl font-black text-white mb-2 relative z-10">Unable to Track Order</h1>
        <p className="text-slate-400 mb-6 max-w-sm text-sm relative z-10">{orderError}</p>
        <GlassButton variant="primary" onClick={() => navigate("/dashboard")} className="py-3.5 px-6 text-sm font-bold flex items-center gap-2 relative z-10">
          Return to Dashboard
        </GlassButton>
      </div>
    );
  }

  // If no order ID resolved and finished resolving, display the Lookup View
  if (!orderId && !isResolving) {
    return (
      <div className="min-h-[100dvh] bg-dark-950 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary-500/10 blur-[140px] rounded-full pointer-events-none" />

        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-md relative z-10"
        >
          <div className="w-20 h-20 mx-auto bg-dark-900 border border-primary-500/30 rounded-3xl flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(234,88,12,0.2)]">
            <Navigation className="w-10 h-10 text-primary-400 animate-pulse" />
          </div>

          <h1 className="text-3xl font-black text-white mb-2 tracking-tight">
            Track Your Order
          </h1>
          <p className="text-slate-400 mb-8 text-sm max-w-sm mx-auto">
            Enter your Order ID from SMS, WhatsApp, or checkout confirmation to follow your pizza live from oven to doorstep.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const val = searchOrderIdInput.trim().replace(/^#/, '');
              if (val) {
                setResolvedOrderId(val);
                navigate(`/order-tracking/${val}`);
              }
            }}
            className="mb-8"
          >
            <div className="relative flex items-center">
              <input
                type="text"
                value={searchOrderIdInput}
                onChange={(e) => setSearchOrderIdInput(e.target.value)}
                placeholder="Enter Order ID (e.g. OP-1234 or #05)"
                className="w-full bg-dark-900/90 border border-white/15 focus:border-primary-500 rounded-2xl py-4 pl-5 pr-14 text-white text-base placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all font-mono shadow-inner"
              />
              <button
                type="submit"
                disabled={!searchOrderIdInput.trim()}
                className="absolute right-2 p-2.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-40 text-white rounded-xl transition-all cursor-pointer shadow-lg active:scale-95"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </form>

          {/* Recent orders if user has any */}
          {userOrders && userOrders.length > 0 && (
            <div className="mb-6 text-left">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">
                Your Recent Orders
              </p>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {userOrders.map((o) => (
                  <div
                    key={o.id}
                    onClick={() => {
                      setResolvedOrderId(o.id);
                      navigate(`/order-tracking/${o.id}`);
                    }}
                    className="bg-dark-900/80 hover:bg-dark-800/90 border border-white/10 hover:border-primary-500/40 rounded-2xl p-3.5 flex items-center justify-between cursor-pointer transition-all active:scale-[0.99] group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-400 font-bold text-xs font-mono">
                        #{o.dailyOrderNumber || o.id.slice(-4).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white group-hover:text-primary-400 transition-colors">
                          ₹{o.totalAmount || o.pricing?.finalTotal || 0}
                        </p>
                        <p className="text-xs text-slate-400 capitalize">
                          {o.status?.replace(/_/g, ' ') || 'Order'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-semibold text-primary-400">
                      Track <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-center gap-3">
            <GlassButton
              variant="secondary"
              onClick={() => navigate("/dashboard")}
              className="py-3 px-5 text-sm text-slate-400 hover:text-white"
            >
              Dashboard
            </GlassButton>
            <GlassButton
              variant="primary"
              onClick={() => navigate("/menu")}
              className="py-3 px-5 text-sm font-bold"
            >
              Order Pizza
            </GlassButton>
          </div>
        </motion.div>
      </div>
    );
  }

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
    const reasonText =
      order.cancellationReason ||
      order.cancellation_reason ||
      order.lastRejectionReason ||
      order.reason;

    const orderNum = order.dailyOrderNumber || `#${orderId?.slice(-6).toUpperCase()}`;

    return (
      <div className="h-[100dvh] bg-dark-950 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-red-500/10 blur-[120px] rounded-full pointer-events-none" />
        
        <motion.div 
          initial={{ scale: 0 }} 
          animate={{ scale: 1 }} 
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="w-24 h-24 bg-dark-900 border border-red-500/30 rounded-3xl flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(239,68,68,0.25)] relative z-10"
        >
          <X className="w-12 h-12 text-red-500" />
        </motion.div>

        <span className="text-xs font-black tracking-widest text-red-400 uppercase bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20 mb-3 relative z-10">
          Status: Cancelled
        </span>

        <h1 className="text-3xl font-black text-white mb-2 relative z-10">Order Cancelled</h1>
        <p className="text-slate-400 mb-6 max-w-sm text-sm relative z-10">
          Order <span className="font-bold text-white">{orderNum}</span> was cancelled by the restaurant.
        </p>

        {/* Owner's Reason Display Box */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="w-full max-w-md bg-red-950/30 border border-red-500/30 rounded-2xl p-5 mb-8 text-left relative z-10 backdrop-blur-md shadow-xl"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-500/10 rounded-xl border border-red-500/20 text-red-400 flex-shrink-0">
              <MessageSquare size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-red-400 uppercase tracking-wider mb-1">
                Reason Provided by Restaurant
              </p>
              <p className="text-white font-semibold text-base leading-relaxed">
                {reasonText ? `"${reasonText}"` : "No specific reason was entered by the owner."}
              </p>
            </div>
          </div>
        </motion.div>

        <div className="flex flex-col sm:flex-row gap-3 relative z-10 w-full max-w-xs">
          <GlassButton variant="primary" onClick={() => navigate("/menu")} className="w-full py-3.5 text-sm font-bold flex items-center justify-center gap-2">
            <ShoppingBag size={18} /> Order Again
          </GlassButton>
          <GlassButton variant="secondary" onClick={() => navigate("/dashboard")} className="w-full py-3.5 text-sm font-bold flex items-center justify-center gap-2">
            Back to Dashboard
          </GlassButton>
        </div>
      </div>
    );
  }

  const stageIndex = getStageIndex(order.status);
  const statusLabel = order.status === "accepted" ? "Order Accepted" : order.status === "preparing" ? "Preparing Your Pizza" : order.status === "ready" || order.status === "partner_assigned" || order.status === "picked_up" ? "Packing Your Order" : order.status === "out_for_delivery" ? "On the Way" : "Processing";

  const mapCenter = useMemo(() => {
    if (partnerLocation) return partnerLocation;
    if (order?.deliveryAddress?.lat && order?.deliveryAddress?.lng) {
      return { lat: Number(order.deliveryAddress.lat), lng: Number(order.deliveryAddress.lng) };
    }
    return { lat: RESTAURANT_LOCATION.lat, lng: RESTAURANT_LOCATION.lng };
  }, [partnerLocation, order?.deliveryAddress]);

  const mapMarkers: MapMarker[] = useMemo(() => {
    const list: MapMarker[] = [
      {
        id: 'restaurant',
        position: { lat: RESTAURANT_LOCATION.lat, lng: RESTAURANT_LOCATION.lng },
        type: 'restaurant',
        label: 'Olive Pizza (Gokul Nagar)',
      }
    ];

    if (order?.deliveryAddress?.lat && order?.deliveryAddress?.lng) {
      list.push({
        id: 'customer',
        position: { lat: Number(order.deliveryAddress.lat), lng: Number(order.deliveryAddress.lng) },
        type: 'customer',
        label: order.deliveryAddress?.addressLine || order.deliveryAddress?.address || 'Your Delivery Location',
      });
    }

    if (partnerLocation && TRACKABLE_STATUSES.has(order?.status) && (order?.status === 'picked_up' || order?.status === 'out_for_delivery')) {
      list.push({
        id: 'rider',
        position: partnerLocation,
        type: 'rider',
        heading: partnerHeading,
      });
    }

    return list;
  }, [order?.deliveryAddress, partnerLocation, partnerHeading, order?.status]);

  return (
    <>
      <SEO title="Track Your Order" noIndex={true} />
      <div className="min-h-screen bg-[#07090E] text-slate-100 antialiased selection:bg-[#FF6B00] selection:text-white pt-20 pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* ── Top Header Navigation Bar ─────────────────────────────── */}
          <div className="flex items-center justify-between gap-3 mb-6">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all text-xs font-bold active:scale-95"
            >
              <ChevronLeft className="w-4 h-4 text-orange-400" />
              <span>Dashboard</span>
            </button>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span>Live Order</span>
              </div>
              <span className="text-xs font-mono font-bold text-slate-300 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
                {order?.dailyOrderNumber || `#${orderId?.slice(-6).toUpperCase()}`}
              </span>
            </div>

            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast.success("Tracking link copied! 📋", {
                  style: { background: "#0C0E14", color: "#fff", border: "1px solid rgba(255, 107, 0, 0.4)" }
                });
              }}
              aria-label="Share Link"
              className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-slate-300 hover:text-white transition-all active:scale-95"
            >
              <Share2 className="w-4 h-4 text-orange-400" />
            </button>
          </div>

          {/* ── Responsive Grid: Left Column (Status & Details) / Right Column (Map) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            
            {/* ── Left Column: Status Hero, Stepper, Details, Bill ──────── */}
            <div className="lg:col-span-7 flex flex-col gap-6">

              {/* 1. Status Hero Card (Primary Focal Point) */}
              <div className="p-5 sm:p-6 rounded-3xl bg-[#12151E] border border-white/10 shadow-xl relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/5">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        order.status === 'out_for_delivery'
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : order.status === 'preparing'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {order.status === 'out_for_delivery' ? 'On The Road' : order.status === 'preparing' ? 'In Kitchen' : 'Confirmed'}
                      </span>
                      <span className="text-slate-500 text-xs">•</span>
                      <span className="text-slate-400 text-xs font-medium">Stone oven prep</span>
                    </div>

                    <h1 className="text-xl sm:text-2xl font-serif font-black text-white tracking-tight">
                      {statusLabel}
                    </h1>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      {order.status === 'preparing'
                        ? 'Your pizzas are hand-stretched and baking inside our wood-fired oven.'
                        : order.status === 'out_for_delivery'
                        ? 'Your order has been collected and is actively en-route to your address.'
                        : 'Your order is confirmed and scheduled for instant preparation.'}
                    </p>
                  </div>

                  {/* Timing & Distance Pill */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center p-3 sm:p-0 rounded-2xl bg-white/[0.03] sm:bg-transparent border sm:border-0 border-white/5 shrink-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {order.status === 'out_for_delivery' ? 'Estimated Arrival' : 'Standard Window'}
                    </span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-[#FFB693]">
                        {eta ? `${eta}` : '25-35'}
                      </span>
                      <span className="text-xs font-bold text-slate-400">min</span>
                    </div>
                    {distance && (
                      <span className="text-[10px] text-blue-400 font-semibold mt-0.5">
                        📍 {distance} km away
                      </span>
                    )}
                  </div>
                </div>

                {/* 5-Step Visual Stepper */}
                <div className="pt-6">
                  <div className="grid grid-cols-5 gap-2 relative">
                    <div className="absolute top-4 left-4 right-4 h-1 bg-white/10 -z-0 rounded-full">
                      <div 
                        className="h-full bg-gradient-to-r from-[#FF6B00] to-amber-400 rounded-full transition-all duration-700"
                        style={{ width: `${Math.min(100, Math.max(0, (stageIndex / 4) * 100))}%` }}
                      />
                    </div>

                    {[
                      { label: "Placed", icon: CheckCircle2, step: 0 },
                      { label: "Confirmed", icon: CheckCircle2, step: 1 },
                      { label: "Baking", icon: ChefHat, step: 2 },
                      { label: "On Way", icon: Truck, step: 3 },
                      { label: "Delivered", icon: CheckCircle2, step: 4 },
                    ].map((s, idx) => {
                      const isPassed = stageIndex > s.step;
                      const isCurrent = stageIndex === s.step;

                      return (
                        <div key={idx} className="flex flex-col items-center text-center relative z-10">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                            isCurrent
                              ? "bg-gradient-to-tr from-[#FF6B00] to-amber-400 text-white shadow-[0_0_15px_rgba(255,107,0,0.5)] scale-110"
                              : isPassed
                              ? "bg-emerald-500 text-white"
                              : "bg-[#1A1D27] text-slate-500 border border-white/10"
                          }`}>
                            <s.icon className="w-4 h-4" />
                          </div>
                          <span className={`text-[10px] font-bold mt-2 truncate max-w-[60px] ${
                            isCurrent ? "text-amber-400" : isPassed ? "text-slate-300" : "text-slate-500"
                          }`}>
                            {s.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 2. Mobile Supporting Live Map (Rendered here on mobile screen sizes) */}
              <div className="lg:hidden w-full rounded-3xl overflow-hidden bg-[#12151E] border border-white/10 p-2 shadow-xl">
                <div className="px-3 py-2 flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5 text-orange-400" />
                    <span>Live GPS Route</span>
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">OpenStreetMap</span>
                </div>
                <div className="relative w-full h-[220px] rounded-2xl overflow-hidden bg-[#0A0D14]">
                  <UniversalMap3D
                    mode="customer"
                    center={mapCenter}
                    routeGeoJSON={routeGeoJSON}
                    markers={mapMarkers}
                    zoom={14}
                    className="w-full h-full rounded-2xl"
                  />
                </div>
              </div>

              {/* 3. Delivery Partner Info Card (Only if assigned) */}
              {partnerDetails && ['partner_assigned', 'picked_up', 'out_for_delivery'].includes(order.status) && (
                <div className="p-5 rounded-3xl bg-[#12151E] border border-white/10 flex items-center justify-between gap-4 shadow-lg">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="relative shrink-0">
                      <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center overflow-hidden">
                        {partnerDetails.photoUrl ? (
                          <img src={partnerDetails.photoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Truck className="w-6 h-6 text-orange-400" />
                        )}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#12151E] rounded-full" />
                    </div>

                    <div className="min-w-0">
                      <span className="text-[10px] font-black uppercase tracking-wider text-orange-400 block">
                        Delivery Partner
                      </span>
                      <h4 className="text-base font-bold text-white truncate">
                        {partnerDetails.name || "Delivery Partner"}
                      </h4>
                      <p className="text-xs text-slate-400 truncate">
                        {partnerDetails.vehicleType || "Scooter"}{partnerDetails.vehicleNumber ? ` · ${partnerDetails.vehicleNumber}` : ""}
                      </p>
                    </div>
                  </div>

                  {partnerDetails.phone && (
                    <a
                      href={`tel:${partnerDetails.phone}`}
                      className="w-11 h-11 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 active:scale-95 transition-all shrink-0"
                      aria-label="Call Partner"
                    >
                      <Phone className="w-5 h-5" />
                    </a>
                  )}
                </div>
              )}

              {/* 4. Delivery Address & Store Hub */}
              <div className="p-5 rounded-3xl bg-[#12151E] border border-white/10 shadow-lg flex flex-col gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 block">
                      Delivering To
                    </span>
                    <p className="text-sm font-bold text-white mt-0.5">
                      {order.deliveryAddress?.addressLine || order.deliveryAddress?.address || order.deliveryAddress?.fullAddress || "Your Selected Location"}
                    </p>
                    {order.deliveryAddress?.landmark && (
                      <p className="text-xs text-slate-400 mt-0.5">Landmark: {order.deliveryAddress.landmark}</p>
                    )}
                  </div>
                </div>

                <div className="h-px bg-white/5" />

                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 shrink-0">
                      <Store className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-black uppercase tracking-wider text-orange-400 block">
                        Fulfilling Kitchen
                      </span>
                      <p className="text-xs font-bold text-white truncate">Olive Pizza • Central Hub</p>
                      <p className="text-[11px] text-slate-400 truncate">{RESTAURANT_LOCATION.address}</p>
                    </div>
                  </div>

                  <a
                    href={`tel:${RESTAURANT_LOCATION.phone || '9999999999'}`}
                    className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all shrink-0"
                  >
                    <Phone className="w-3.5 h-3.5 text-orange-400" />
                    <span>Call Store</span>
                  </a>
                </div>
              </div>

              {/* 5. Order Items Breakdown & Bill */}
              <div className="p-5 sm:p-6 rounded-3xl bg-[#12151E] border border-white/10 shadow-lg">
                <h3 className="text-base font-serif font-black text-white mb-4 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-orange-400" />
                  <span>Order Items ({order.items?.length || 0})</span>
                </h3>

                <div className="space-y-3 mb-5 divide-y divide-white/5">
                  {order.items?.map((item: any, i: number) => (
                    <div key={i} className="flex items-center justify-between gap-3 pt-3 first:pt-0">
                      <div className="flex items-center gap-3 min-w-0">
                        {item.image && (
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-black/40 border border-white/10 shrink-0">
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white truncate">{item.name}</p>
                          {(item.variant || item.crust) && (
                            <p className="text-xs text-slate-400 truncate">
                              {[item.variant, item.crust].filter(Boolean).join(" • ")}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-baseline gap-2 shrink-0">
                        <span className="text-xs font-bold text-slate-400">×{item.quantity}</span>
                        <span className="text-sm font-black text-[#FFB693]">₹{item.price * item.quantity}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bill Summary */}
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Subtotal</span>
                    <span>₹{order.totalAmount - (order.deliveryFee || 40)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Delivery Fee</span>
                    <span>₹{order.deliveryFee || 40}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 mt-1 border-t border-white/5">
                    <span className="text-sm font-bold text-white">Grand Total</span>
                    <span className="text-lg font-black text-amber-400">₹{order.totalAmount}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                    <span>Payment Mode</span>
                    <span className="font-bold text-emerald-400">
                      {order.paymentMethod === "online" ? "Paid Online" : "Cash on Delivery"}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                  <button
                    onClick={() => navigate(`/bill/${order.billReference || order.id || orderId}`)}
                    className="py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
                  >
                    <Receipt className="w-4 h-4 text-orange-400" />
                    <span>View Official Bill</span>
                  </button>

                  {["pending", "accepted"].includes(order.status) && (
                    <button
                      onClick={handleCancel}
                      disabled={cancelling}
                      className="py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all disabled:opacity-50"
                    >
                      <span>{cancelling ? "Cancelling..." : "Cancel Order"}</span>
                    </button>
                  )}
                </div>
              </div>

            </div>

            {/* ── Right Column (Desktop Sticky Live 2.5D Map) ─────────── */}
            <div className="hidden lg:block lg:col-span-5 sticky top-24">
              <div className="rounded-3xl overflow-hidden bg-[#12151E] border border-white/10 p-3 shadow-2xl">
                <div className="px-3 py-2 flex items-center justify-between text-xs border-b border-white/5 mb-2">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5 text-orange-400" />
                    <span>Live GPS Tracking</span>
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">OpenStreetMap 2.5D</span>
                </div>

                <div className="relative w-full h-[460px] rounded-2xl overflow-hidden bg-[#0A0D14]">
                  <UniversalMap3D
                    mode="customer"
                    center={mapCenter}
                    routeGeoJSON={routeGeoJSON}
                    markers={mapMarkers}
                    zoom={14}
                    className="w-full h-full rounded-2xl"
                  />
                  
                  {/* Floating Map Status Info */}
                  <div className="absolute bottom-3 left-3 right-3 p-3 rounded-xl bg-[#0C0E14]/90 backdrop-blur-md border border-white/10 flex items-center justify-between text-xs pointer-events-none">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                      <span className="font-bold text-white">Live Fulfill Route</span>
                    </div>
                    <span className="text-slate-400 font-mono text-[11px]">
                      {distance ? `${distance} km` : 'Active'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>

        <OwnerAcceptedOverlay show={showAccepted} onClose={() => setShowAccepted(false)} />
        <DeliveredOverlay show={order?.status === 'delivered'} order={order} />
      </div>
    </>
  );
}

