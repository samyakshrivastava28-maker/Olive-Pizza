import { useState, useEffect, useRef, useCallback } from "react";
import { db } from "../../lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
} from "firebase/firestore";
import { restaurantIcon } from "../../lib/mapIcons";
import { getCurrentAuthToken } from "../../lib/firebase";
import { supabase } from "../../lib/supabase";
import { Order } from "../../types/models";
import { useAuthStore } from "../../lib/store";
import toast from "react-hot-toast";
import { uploadMediaToCloudinary } from "../../lib/cloudinary";
import {
  Navigation,
  PhoneCall,
  CheckCircle2,
  Camera,
  StickyNote,
  PackageOpen,
  MapPin,
  Package,
  Map as MapIcon,
  Route,
  Power,
  Wifi,
  WifiOff,
  Star,
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { RESTAURANT_LOCATION } from "../../lib/config";
import TrackingDebugPanel, {
  DebugData,
} from "../../components/tracking/TrackingDebugPanel";
import { GlassCard, GlassButton } from "../../components/ui/glass/GlassSystem";
import { playNotificationSound } from "../../hooks/useNotificationSound";

// Create a custom pulsing marker icon
const pulsingIcon = new L.DivIcon({
  className: "custom-div-icon",
  html: `<div class="relative flex h-5 w-5"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span><span class="relative inline-flex rounded-full h-5 w-5 bg-primary-500 border-2 border-white shadow-lg"></span></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

export default function DeliveryDashboard() {
  const { user } = useAuthStore();
  const [tasks, setTasks] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [gpsPermission, setGpsPermission] = useState<
    PermissionState | "unsupported"
  >("prompt");

  // Delivery Proof State
  const [showProofModal, setShowProofModal] = useState(false);
  const [completingOrderId, setCompletingOrderId] = useState<string | null>(
    null,
  );
  const [proofNote, setProofNote] = useState("");
  const [proofImage, setProofImage] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Supabase connection + debug panel state ──
  const [supabaseConnected, setSupabaseConnected] = useState(false);
  const [debugData, setDebugData] = useState<DebugData>({});
  const gpsWriteCountRef = useRef(0);

  // ── GPS tracking refs ──
  const lastLocationRef = useRef<{
    lat: number;
    lng: number;
    time: number;
  } | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastGPSPositionRef = useRef<GeolocationPosition | null>(null);
  const gpsCleanupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);



  // ── Verify Supabase connection on mount ──
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const { error } = await supabase
          .from("delivery_locations")
          .select("count")
          .limit(1);
        if (!error) {
          setSupabaseConnected(true);
          setDebugData((prev) => ({ ...prev, supabaseConnected: true }));
          console.log("[Supabase] ✅ Connection verified");
        } else {
          console.error("[Supabase] ❌ Connection error:", error.message);
          setDebugData((prev) => ({ ...prev, supabaseConnected: false }));
        }
      } catch (e) {
        console.error("[Supabase] ❌ Connection failed:", e);
        setDebugData((prev) => ({ ...prev, supabaseConnected: false }));
      }
    };
    checkConnection();
  }, []);

  const toggleStatus = async () => {
    if (!user?.uid) return;
    const newStatus = user.status === "online" ? "offline" : "online";
    try {
      await updateDoc(doc(db, "users", user.uid), { status: newStatus });
      // If going offline, mark in Supabase too
      if (newStatus === "offline") {
        await supabase
          .from("delivery_locations")
          .update({ online_status: false })
          .eq("delivery_partner_id", user.uid);
      }
      toast.success(`You are now ${newStatus}`);
    } catch (e) {
      toast.error("Failed to update status");
    }
  };

  // ── Write GPS to Supabase ──────────────────────────────────────────
  const writeLocationToSupabase = useCallback(
    async (
      lat: number,
      lng: number,
      heading: number | null,
      speed: number | null,
      accuracy: number | null,
      activeOrderId: string | null,
    ) => {
      if (!user?.uid) return;

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

      console.log("[SUPABASE_WRITE_STARTED]", payload);

      const { error } = await supabase
        .from("delivery_locations")
        .upsert(payload, { onConflict: "delivery_partner_id" });

      if (error) {
        console.error("[SUPABASE_WRITE_FAILED]", error.message, error);
        setDebugData((prev) => ({ ...prev, gpsErrorMsg: error.message }));
      } else {
        gpsWriteCountRef.current += 1;
        console.log(
          `[SUPABASE_WRITE_SUCCESS] #${gpsWriteCountRef.current}`,
          `Lat: ${lat.toFixed(6)}`,
          `Lng: ${lng.toFixed(6)}`,
          `Heading: ${heading}°`,
          `Speed: ${speed ? (speed * 3.6).toFixed(1) + " km/h" : "n/a"}`,
          `Timestamp: ${new Date().toISOString()}`,
        );
        setDebugData((prev) => ({
          ...prev,
          dbLat: lat,
          dbLng: lng,
          dbLastUpdated: new Date().toISOString(),
          gpsWriteCount: gpsWriteCountRef.current,
          gpsErrorMsg: undefined,
        }));
      }
    },
    [user?.uid],
  );

  // ── GPS watchPosition → Supabase ─────────────────────────────────
  useEffect(() => {
    const activeDeliveries = tasks.filter(
      (t) => t.status === "out_for_delivery",
    );
    if (!user?.uid || user.status !== "online") {
      // Clean up existing watch
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      return;
    }

    const activeOrderId =
      activeDeliveries.length > 0 ? activeDeliveries[0].id || null : null;

    if (!navigator.geolocation) {
      toast.error("Geolocation not supported on this device");
      return;
    }

    // Start watchPosition with correct options
    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = position.coords.accuracy;
        const speed = position.coords.speed;
        const heading = position.coords.heading;
        const now = Date.now();

        // Always update local state for debug panel
        lastGPSPositionRef.current = position;
        setDebugData((prev) => ({
          ...prev,
          gpsLat: lat,
          gpsLng: lng,
          gpsHeading: heading ?? undefined,
          gpsSpeed: speed ?? undefined,
          gpsAccuracy: accuracy,
          gpsTimestamp: now,
          orderId: activeOrderId || prev.orderId,
          partnerId: user.uid,
        }));

        console.log(
          "[GPS_CAPTURED]",
          `Lat: ${lat.toFixed(6)}`,
          `Lng: ${lng.toFixed(6)}`,
          `Heading: ${heading}°`,
          `Speed: ${speed ? (speed * 3.6).toFixed(1) + "km/h" : "n/a"}`,
          `Accuracy: ±${Math.round(accuracy)}m`,
          `Time: ${new Date(now).toISOString()}`,
        );

        // De-bounce: only write if moved >5m OR >4 seconds elapsed
        if (lastLocationRef.current) {
          const timeDiff = now - lastLocationRef.current.time;
          const R = 6371e3;
          const φ1 = (lastLocationRef.current.lat * Math.PI) / 180;
          const φ2 = (lat * Math.PI) / 180;
          const Δφ = ((lat - lastLocationRef.current.lat) * Math.PI) / 180;
          const Δλ = ((lng - lastLocationRef.current.lng) * Math.PI) / 180;
          const a =
            Math.sin(Δφ / 2) ** 2 +
            Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
          const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

          if (distance < 5 && timeDiff < 4000) return; // Skip minor updates
        }

        lastLocationRef.current = { lat, lng, time: now };
        await writeLocationToSupabase(
          lat,
          lng,
          heading,
          speed,
          accuracy,
          activeOrderId,
        );
      },
      (error) => {
        console.error("[GPS Watch Error]", error.code, error.message);
        setDebugData((prev) => ({
          ...prev,
          gpsErrorMsg: `GPS Error ${error.code}: ${error.message}`,
        }));
        toast.error(`GPS error: ${error.message}`);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0, // ✅ Fixed: always use fresh position
        timeout: 10000,
      },
    );

    // ── GPS Heartbeat: force write every 5s while out_for_delivery ──
    // Even if position hasn't changed, keep DB alive
    if (activeDeliveries.length > 0) {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      heartbeatRef.current = setInterval(async () => {
        const pos = lastGPSPositionRef.current;
        if (!pos) return;
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        // Force write regardless of debounce
        await writeLocationToSupabase(
          lat,
          lng,
          pos.coords.heading,
          pos.coords.speed,
          pos.coords.accuracy,
          activeOrderId,
        );
      }, 5000);
    } else {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      // Cancel scheduled GPS row deletion if component unmounts early
      if (gpsCleanupTimerRef.current) {
        clearTimeout(gpsCleanupTimerRef.current);
        gpsCleanupTimerRef.current = null;
      }
    };
  }, [tasks, user?.uid, user?.status, writeLocationToSupabase]);

  // ── Realtime Orders (Firestore stays for order data) ──────────────
  useEffect(() => {
    // Check GPS permissions automatically
    if (navigator.permissions && navigator.geolocation) {
      navigator.permissions.query({ name: "geolocation" }).then((result) => {
        setGpsPermission(result.state);
        result.onchange = () => {
          setGpsPermission(result.state);
        };
      });
    } else {
      setGpsPermission("unsupported");
    }

    if (!user?.uid) return;
    const q = query(
      collection(db, "orders"),
      where("deliveryPartnerId", "==", user.uid),
      where("status", "in", [
        "partner_assigned",
        "ready",
        "picked_up",
        "out_for_delivery",
      ]),
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const liveOrders = snapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as Order,
      );

      const newAssignments = liveOrders.filter(
        (o) => o.status === "partner_assigned",
      );
      const oldAssignments = tasks.filter(
        (o) => o.status === "partner_assigned",
      );

      if (newAssignments.length > oldAssignments.length) {
        playNotificationSound("partner_assigned");
        toast.success("New Delivery Assigned! Please Accept or Reject.", {
          duration: 5000,
        });
      }

      setTasks(liveOrders);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user?.uid]);

  // ── Update Order Status (Firestore) + Navigation Start (backend) ──
  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const updates: any = { status: newStatus };
      if (newStatus === "out_for_delivery") {
        updates.pickedUpAt = new Date().toISOString();

        const currentTask = tasks.find((t) => t.id === orderId);
        if (currentTask && user?.uid) {
          try {
            const token = await getCurrentAuthToken();
            await fetch("/api/tracking/navigation/start", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`, // ✅ Fixed: auth header attached
              },
              body: JSON.stringify({
                orderId,
                partnerId: user.uid,
                customerLat: currentTask.deliveryAddress?.lat,
                customerLng: currentTask.deliveryAddress?.lng,
                restaurantLat: RESTAURANT_LOCATION.lat,
                restaurantLng: RESTAURANT_LOCATION.lng,
              }),
            });
            console.log(
              "[Navigation] ✅ Tracking session started for order:",
              orderId,
            );
          } catch (navErr) {
            console.warn(
              "[Navigation] Failed to start tracking session (non-critical):",
              navErr,
            );
          }
        }
      }

      await updateDoc(doc(db, "orders", orderId), updates);

      if (newStatus === "out_for_delivery") {
        const order = tasks.find((t) => t.id === orderId);
        if (order?.customerInfo?.email) {
          fetch("/api/email/transactional", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              event: "ORDER_STATUS_CHANGED",
              data: {
                orderId,
                status: "out_for_delivery",
                customerEmail: order.customerInfo.email,
              },
            }),
          }).catch((e) => console.error("Email trigger failed:", e));
        }
      }

      toast.success(`Order status updated to ${newStatus.replace(/_/g, " ")}`);
    } catch (error) {
      toast.error("Update failed");
    }
  };

  const handleCompleteSubmit = async () => {
    if (!completingOrderId) return;
    setIsUploading(true);
    let photoUrl = "";

    try {
      if (proofImage) {
        const res = await uploadMediaToCloudinary(
          proofImage,
          "olive-pizza/delivery-proofs",
        );
        photoUrl = res.secureUrl;
      }

      await updateDoc(doc(db, "orders", completingOrderId), {
        status: "delivered",
        deliveredAt: new Date().toISOString(),
        deliveryProof: { photoUrl, note: proofNote },
      });

      const order = tasks.find((t) => t.id === completingOrderId);
      if (order?.customerInfo?.email) {
        fetch("/api/email/transactional", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "ORDER_STATUS_CHANGED",
            data: {
              orderId: completingOrderId,
              status: "delivered",
              customerEmail: order.customerInfo.email,
            },
          }),
        }).catch((e) => console.error("Email trigger failed:", e));
      }

      // Stop navigation tracking session (backend SQL)
      try {
        const token = await getCurrentAuthToken();
        await fetch("/api/tracking/navigation/stop", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            orderId: completingOrderId,
            partnerId: user?.uid,
          }),
        });
      } catch (navErr) {
        console.warn(
          "[Navigation] Failed to stop tracking session (non-critical):",
          navErr,
        );
      }

      // ── GPS Privacy Cleanup ─────────────────────────────────────
      // STEP 1: Stop GPS watchPosition immediately
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
        console.log("[GPS] 🛑 watchPosition stopped — delivery complete");
      }

      // STEP 2: Stop heartbeat
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
        console.log("[GPS] 🛑 Heartbeat stopped");
      }

      // STEP 3: Mark row offline immediately (customers stop seeing movement)
      const partnerId = user?.uid || "";
      await supabase
        .from("delivery_locations")
        .update({
          active_order_id: null,
          online_status: false,
          last_updated: new Date().toISOString(),
        })
        .eq("delivery_partner_id", partnerId);
      console.log(
        "[GPS] ✅ Supabase row marked offline — customer tracking stopped",
      );

      // STEP 4: Schedule hard DELETE of GPS row after 5 minutes
      // This ensures no stale coordinates can ever be accessed
      if (gpsCleanupTimerRef.current) clearTimeout(gpsCleanupTimerRef.current);
      gpsCleanupTimerRef.current = setTimeout(
        async () => {
          const { error } = await supabase
            .from("delivery_locations")
            .delete()
            .eq("delivery_partner_id", partnerId)
            .eq("online_status", false);
          if (error) {
            console.warn(
              "[GPS Cleanup] Delete failed (pg_cron will handle it):",
              error.message,
            );
          } else {
            console.log(
              "[GPS Cleanup] ✅ GPS row deleted from Supabase after 5 minutes",
            );
          }
          gpsCleanupTimerRef.current = null;
        },
        5 * 60 * 1000,
      ); // 5 minutes
      console.log(
        "[GPS Cleanup] ⏲ Row deletion scheduled for 5 minutes from now",
      );

      // Local aggregation for partner metrics
      try {
        const payoutPerOrder = 40;
        const newEarnings = {
          today: (user?.earnings?.today || 0) + payoutPerOrder,
          thisWeek: (user?.earnings?.thisWeek || 0) + payoutPerOrder,
          thisMonth: (user?.earnings?.thisMonth || 0) + payoutPerOrder,
          total: (user?.earnings?.total || 0) + payoutPerOrder,
          pendingPayout: (user?.earnings?.pendingPayout || 0) + payoutPerOrder,
        };
        const newMetrics = {
          totalDeliveries: (user?.metrics?.totalDeliveries || 0) + 1,
          successfulDeliveries: (user?.metrics?.successfulDeliveries || 0) + 1,
          failedDeliveries: user?.metrics?.failedDeliveries || 0,
          totalTimeTaken: (user?.metrics?.totalTimeTaken || 0) + 20,
          fastestDelivery: user?.metrics?.fastestDelivery || 15,
          ratingSum: (user?.metrics?.ratingSum || 0) + 5,
          ratingCount: (user?.metrics?.ratingCount || 0) + 1,
        };
        await updateDoc(doc(db, "users", user!.uid), {
          earnings: newEarnings,
          metrics: newMetrics,
        });
      } catch (err) {
        console.error("Failed to update partner metrics", err);
      }

      toast.success("Delivery Completed Successfully! 🎉");
      setShowProofModal(false);
      setProofImage(null);
      setProofNote("");
      setCompletingOrderId(null);
    } catch (error) {
      toast.error("Failed to complete delivery");
    } finally {
      setIsUploading(false);
    }
  };

  const activeTask = tasks[0];

  if (loading)
    return (
      <div className="p-8 text-center font-bold text-primary-500 animate-pulse">
        Finding Deliveries...
      </div>
    );

  return (
    <div className="space-y-6 pb-24 max-w-lg mx-auto w-full">
      {/* ── Supabase Connection Banner ── */}
      <div
        className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold border transition-all backdrop-blur-md ${supabaseConnected ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}
      >
        {supabaseConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
        <span>
          Supabase DB: {supabaseConnected ? "Connected" : "Disconnected"}
        </span>
      </div>

      {/* ── GPS Permission Status Banner ── */}
      <div
        className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold border transition-all backdrop-blur-md ${
          gpsPermission === "granted"
            ? "bg-green-500/10 border-green-500/20 text-green-400"
            : gpsPermission === "prompt"
              ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-400"
              : "bg-red-500/10 border-red-500/20 text-red-400"
        }`}
      >
        {gpsPermission === "granted" ? (
          <Navigation size={14} />
        ) : (
          <Power size={14} />
        )}
        <span>
          {gpsPermission === "granted" &&
            "GPS Connected — Location tracking active"}
          {gpsPermission === "prompt" &&
            "GPS Updating — Waiting for permission"}
          {gpsPermission === "denied" &&
            "GPS Permission Denied — Please enable in browser settings"}
          {gpsPermission === "unsupported" &&
            "GPS Disabled — Device does not support GPS"}
        </span>
      </div>

      {/* ── Online/Offline Toggle ── */}
      <GlassCard className="p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full ${user?.status === "online" ? "bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" : "bg-slate-500"}`}
          />
          <div>
            <h3 className="text-white font-bold">
              {user?.status === "online" ? "You are Online" : "You are Offline"}
            </h3>
            <p className="text-xs text-white/60">
              {user?.status === "online"
                ? "GPS tracking active"
                : "Go online to receive orders"}
            </p>
          </div>
        </div>
        <button
          onClick={toggleStatus}
          className={`flex items-center justify-center w-12 h-12 rounded-full shadow-lg transition-all hover:scale-110 active:scale-95 ${user?.status === "online" ? "bg-red-500 hover:bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]" : "bg-green-500 hover:bg-green-600 text-white shadow-[0_0_15px_rgba(34,197,94,0.4)]"}`}
        >
          <Power size={20} />
        </button>
      </GlassCard>

      {/* ── Metrics Row ── */}
      <div className="grid grid-cols-3 gap-3">
        <GlassCard
          className="p-4 flex flex-col items-center justify-center text-center overflow-hidden"
          hoverEffect
        >
          <div className="absolute -right-4 -top-4 text-white/5">
            <Route size={80} />
          </div>
          <div className="text-[10px] text-white/60 font-bold uppercase tracking-wider mb-1 relative z-10">
            Jobs
          </div>
          <div className="text-2xl font-black text-white relative z-10">
            {user?.metrics?.totalDeliveries || 0}
          </div>
        </GlassCard>
        
        <GlassCard
          className="p-4 flex flex-col items-center justify-center text-center overflow-hidden"
          hoverEffect
        >
          <div className="absolute -right-4 -top-4 text-white/5">
            <Star size={80} />
          </div>
          <div className="text-[10px] text-white/60 font-bold uppercase tracking-wider mb-1 relative z-10">
            Rating
          </div>
          <div className="text-2xl font-black text-amber-400 relative z-10 flex items-center gap-1">
            {user?.metrics?.ratingCount ? (user.metrics.ratingSum / user.metrics.ratingCount).toFixed(1) : "New"}
            {user?.metrics?.ratingCount > 0 && <Star className="w-4 h-4 fill-current" />}
          </div>
        </GlassCard>

        <GlassCard
          className="p-4 flex flex-col items-center justify-center text-center overflow-hidden"
          hoverEffect
        >
          <div className="absolute -right-4 -top-4 text-white/5">
            <MapIcon size={80} />
          </div>
          <div className="text-[10px] text-white/60 font-bold uppercase tracking-wider mb-1 relative z-10">
            Earned
          </div>
          <div className="text-2xl font-black text-green-400 relative z-10">
            ₹{user?.earnings?.today || 0}
          </div>
        </GlassCard>
      </div>

      {activeTask ? (
        <GlassCard className="overflow-hidden">
          <div className="h-48 w-full bg-slate-800 relative rounded-t-[24px] overflow-hidden border-b border-white/10">
            <MapContainer
              center={[
                activeTask.deliveryAddress?.lat || 19.076,
                activeTask.deliveryAddress?.lng || 72.8777,
              ]}
              zoom={14}
              style={{ height: "100%", width: "100%" }}
              zoomControl={false}
              dragging={false}
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                attribution="&copy; CARTO"
                maxZoom={19}
              />
              <Marker
                position={[
                  activeTask.deliveryAddress?.lat || 19.076,
                  activeTask.deliveryAddress?.lng || 72.8777,
                ]}
                icon={restaurantIcon}
              />
              {lastLocationRef.current && (
                <>
                  <Marker
                    position={[
                      lastLocationRef.current.lat,
                      lastLocationRef.current.lng,
                    ]}
                    icon={pulsingIcon}
                  />
                  <Polyline
                    positions={[
                      [
                        lastLocationRef.current.lat,
                        lastLocationRef.current.lng,
                      ],
                      [
                        activeTask.deliveryAddress?.lat || 19.076,
                        activeTask.deliveryAddress?.lng || 72.8777,
                      ],
                    ]}
                    color="#f97316"
                    weight={4}
                    dashArray="5, 10"
                    className="animate-pulse"
                  />
                </>
              )}
            </MapContainer>
            <div className="absolute top-4 left-4 z-[400] bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 shadow-lg flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              {activeTask.status.replace(/_/g, " ")}
            </div>
            <div className="absolute bottom-4 right-4 z-[400] bg-primary-500 text-white px-4 py-2 rounded-xl border border-white/20 shadow-lg shadow-primary-500/30">
              <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5 opacity-80">
                Order Total
              </p>
              <p className="text-xl font-black">
                ₹{activeTask.totalAmount + 40}
              </p>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center shrink-0 border border-white/10 shadow-inner">
                <MapPin className="w-6 h-6 text-primary-500" />
              </div>
              <div className="pt-1">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">
                  Deliver To
                </p>
                <p className="font-bold text-lg text-white leading-tight">
                  {activeTask.deliveryAddress?.addressLine ||
                    activeTask.address ||
                    "Address not provided"}
                </p>
                <p className="text-slate-400 text-sm mt-1">
                  📍 {activeTask.deliveryAddress?.landmark || "No landmark"}
                </p>
                <p className="text-slate-500 text-xs mt-2 font-medium">
                  Customer ID: {activeTask.userId?.slice(0, 8)}
                </p>
              </div>
            </div>

            {activeTask.noContactDelivery && (
              <div className="mt-4 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-start gap-3">
                <div className="bg-orange-500/20 p-2 rounded-full">
                  <Package className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h4 className="text-orange-400 font-bold text-sm uppercase tracking-wider mb-1">No Contact Delivery</h4>
                  <p className="text-white/80 text-sm">Please leave the package at the door and take a photo as proof of delivery.</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/10">
              <a
                href={`tel:${activeTask.contactPhone}`}
                className="w-full bg-[#273449] hover:bg-slate-700 text-white border border-white/5 py-4 rounded-2xl font-bold flex flex-col items-center justify-center gap-2 transition-colors active:scale-95 shadow-md"
              >
                <PhoneCall className="w-6 h-6 text-blue-400" />
                <span className="text-sm">Call Customer</span>
              </a>
              <a
                href={
                  ["partner_assigned", "ready"].includes(activeTask.status)
                    ? `https://www.google.com/maps/dir/?api=1&destination=${RESTAURANT_LOCATION.lat},${RESTAURANT_LOCATION.lng}`
                    : `https://www.google.com/maps/dir/?api=1&destination=${activeTask.deliveryAddress?.lat || 19.076},${activeTask.deliveryAddress?.lng || 72.8777}`
                }
                target="_blank"
                rel="noreferrer"
                className="w-full bg-[#f97316] hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20 py-4 rounded-2xl font-bold flex flex-col items-center justify-center gap-2 transition-colors active:scale-95"
              >
                <Navigation className="w-6 h-6 text-white" />
                <span className="text-sm uppercase tracking-wider">
                  {["partner_assigned", "ready"].includes(activeTask.status)
                    ? "Nav to Pickup"
                    : "Nav to Drop"}
                </span>
              </a>
            </div>

            <div className="pt-4 border-t border-white/10">
              {activeTask.status === "partner_assigned" && (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => updateOrderStatus(activeTask.id!, "ready")}
                    className="w-full bg-primary-600 hover:bg-primary-500 text-white font-black py-4 rounded-2xl transition-transform active:scale-95 shadow-lg"
                  >
                    Accept Delivery
                  </button>
                  <button
                    onClick={() => updateOrderStatus(activeTask.id!, "pending")}
                    className="w-full bg-red-500 hover:bg-red-400 text-white font-black py-4 rounded-2xl transition-transform active:scale-95 shadow-lg"
                  >
                    Reject Delivery
                  </button>
                </div>
              )}

              {activeTask.status === "ready" && (
                <button
                  onClick={() =>
                    updateOrderStatus(activeTask.id!, "out_for_delivery")
                  }
                  className="w-full bg-primary-600 active:bg-primary-500 text-white font-black py-5 rounded-2xl transition-transform active:scale-95 flex items-center justify-center gap-3 text-lg"
                >
                  <PackageOpen className="w-6 h-6" />
                  Confirm Pickup
                </button>
              )}

              {activeTask.status === "out_for_delivery" && (
                <button
                  onClick={() => {
                    setCompletingOrderId(activeTask.id!);
                    setShowProofModal(true);
                  }}
                  className="w-full bg-success active:bg-green-400 text-dark-950 font-black py-5 rounded-2xl transition-transform active:scale-95 flex items-center justify-center gap-3 text-lg shadow-[0_0_20px_rgba(74,222,128,0.2)]"
                >
                  <CheckCircle2 className="w-7 h-7" />
                  Mark Delivered
                </button>
              )}
            </div>
          </div>
        </GlassCard>
      ) : (
        <GlassCard className="p-10 flex flex-col items-center text-center mt-8 overflow-hidden">
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: "radial-gradient(#f97316 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />
          <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6 relative z-10 border border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)]">
            <MapIcon className="w-12 h-12 text-white/40" />
          </div>
          <h3 className="text-2xl font-black text-white mb-3 relative z-10">
            No Active Deliveries
          </h3>
          <p className="text-white/60 font-medium max-w-[250px] relative z-10">
            {user?.status === "online"
              ? "You're online and ready. Waiting for the next order to ping."
              : "You're currently offline. Go online to receive delivery requests."}
          </p>
        </GlassCard>
      )}

      {/* ── Proof Modal ── */}
      {showProofModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-end justify-center p-4">
          <GlassCard className="p-6 max-w-md w-full animate-in slide-in-from-bottom-8">
            <h2 className="text-2xl font-black text-white mb-6 text-center drop-shadow-md">
              Delivery Proof
            </h2>
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 text-center">
                  Photo Proof (Optional)
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-dark-700 bg-dark-950 rounded-3xl h-40 flex items-center justify-center cursor-pointer hover:border-primary-500 hover:bg-dark-800 transition-colors overflow-hidden relative"
                >
                  {proofImage ? (
                    <img
                      src={URL.createObjectURL(proofImage)}
                      alt="Proof"
                      className="w-full h-full object-cover opacity-90"
                    />
                  ) : (
                    <div className="text-slate-500 font-bold flex flex-col items-center gap-3">
                      <Camera className="w-10 h-10 text-primary-500/50" />
                      <span className="text-sm">Tap to take photo</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={(e) => {
                      if (e.target.files?.[0]) setProofImage(e.target.files[0]);
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 text-center">
                  Delivery Note (Optional)
                </label>
                <div className="relative">
                  <StickyNote className="absolute left-4 top-4 w-5 h-5 text-slate-500" />
                  <textarea
                    className="w-full p-4 pl-12 bg-dark-950 border border-dark-700 rounded-2xl outline-none focus:border-primary-500 min-h-[100px] text-white placeholder:text-slate-600 text-sm font-medium resize-none"
                    placeholder="e.g. Left at front door, handed to receptionist"
                    value={proofNote}
                    onChange={(e) => setProofNote(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowProofModal(false)}
                  disabled={isUploading}
                  className="w-1/3 py-4 font-bold text-white/60 hover:text-white bg-white/5 border border-white/10 rounded-2xl active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <GlassButton
                  variant="primary"
                  onClick={handleCompleteSubmit}
                  disabled={isUploading}
                  className="w-2/3 py-4 font-black flex items-center justify-center gap-2 text-lg rounded-2xl"
                >
                  {isUploading ? "Uploading..." : "Complete"}
                </GlassButton>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* ── Debug Panel ── */}
      <TrackingDebugPanel data={debugData} side="delivery" />
    </div>
  );
}
