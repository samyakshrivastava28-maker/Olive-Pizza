import { useState, useEffect } from "react";
import { useCartStore, useAuthStore } from "../lib/store";
import { useNavigate } from "react-router";
import { auth, db } from "../lib/firebase";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  getDoc,
  updateDoc,
  increment,
  runTransaction,
  setDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import PageTransition from "../components/PageTransition";
import { useStoreStatus } from "../lib/useStoreStatus";
import { usePWA } from "../lib/usePWA";
import { RESTAURANT_LOCATION, MAX_DELIVERY_RADIUS_KM } from "../lib/config";
import {
  Check,
  ChevronLeft,
  CreditCard,
  MapPin,
  MapPinned,
  Receipt,
} from "lucide-react";
import toast from "react-hot-toast";

// Haversine distance calculator
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function Checkout() {
  const { items, total, clearCart } = useCartStore();
  const { isAuthenticated, user } = useAuthStore();
  const storeStatus = useStoreStatus();
  const navigate = useNavigate();
  const { isOffline } = usePWA();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [address, setAddress] = useState(user?.fullAddress || "");
  const [deliveryType, setDeliveryType] = useState<"delivery" | "pickup">(
    "delivery",
  );
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "online">("cash");

  const [orderTiming, setOrderTiming] = useState<"now" | "scheduled">("now");
  const [scheduledDate, setScheduledDate] = useState<string>("today");
  const [scheduledTime, setScheduledTime] = useState<string>("");
  const [noContactDelivery, setNoContactDelivery] = useState(false);

  const generateTimeSlots = (dateType: string) => {
    const slots = [];
    const now = new Date();
    let startHour = 10; // 10 AM
    const endHour = 23; // 11 PM
    
    if (dateType === "today") {
      startHour = Math.max(startHour, now.getHours() + 1);
    }
    
    for (let i = startHour; i < endHour; i++) {
      const period = i >= 12 ? 'PM' : 'AM';
      const displayHour = i > 12 ? i - 12 : (i === 0 ? 12 : i);
      slots.push(`${displayHour}:00 ${period}`);
      slots.push(`${displayHour}:30 ${period}`);
    }
    return slots;
  };

  const availableSlots = generateTimeSlots(scheduledDate);

  useEffect(() => {
    if (
      !storeStatus.isLoading &&
      !storeStatus.isDeliveryAvailable &&
      deliveryType === "delivery"
    ) {
      setDeliveryType("pickup");
    }
  }, [storeStatus.isLoading, storeStatus.isDeliveryAvailable, deliveryType]);

  const [activeEvents, setActiveEvents] = useState<any[]>([]);
  const [standaloneCoupons, setStandaloneCoupons] = useState<any[]>([]);
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    type: "percent" | "flat";
    value: number;
    isFirstOrderOnly?: boolean;
  } | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login?redirect=/checkout");
    }
    if (items.length === 0) {
      navigate("/cart");
    }
    if (
      !storeStatus.isLoading &&
      (!storeStatus.isRestaurantOpen || !storeStatus.isWithinBusinessHours)
    ) {
      const audio = new Audio(
        "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3",
      );
      audio.play().catch(() => {});
      toast.error("The restaurant is currently closed. Please order later.", {
        duration: 5000,
      });
      navigate("/");
    }
  }, [isAuthenticated, items, navigate, storeStatus]);

  useEffect(() => {
    const fetchPromos = async () => {
      try {
        const eventsSnap = await getDocs(
          query(collection(db, "events"), where("isActive", "==", true)),
        );
        const now = Date.now();
        setActiveEvents(
          eventsSnap.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .filter((e: any) => e.startDate <= now && e.endDate >= now),
        );

        const couponsSnap = await getDocs(
          query(collection(db, "coupons"), where("isActive", "==", true)),
        );
        setStandaloneCoupons(
          couponsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
        );
      } catch (err) {}
    };
    fetchPromos();
  }, []);

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    const code = promoInput.trim().toUpperCase();

    let foundCoupon = null;

    // 1. Check standalone coupons
    const standaloneMatch = standaloneCoupons.find((c) => c.code === code);
    if (standaloneMatch) {
      foundCoupon = {
        code: standaloneMatch.code,
        type: standaloneMatch.type === "percentage" ? "percent" : "flat",
        value: standaloneMatch.discountValue,
        isFirstOrderOnly:
          standaloneMatch.isFirstOrderOnly ||
          standaloneMatch.type === "first_order",
      };
    }

    // 2. Check event coupons
    if (!foundCoupon) {
      for (const event of activeEvents) {
        if (event.coupons) {
          const match = event.coupons.find((c: any) => c.code === code);
          if (match) {
            foundCoupon = match;
            break;
          }
        }
      }
    }

    if (!foundCoupon) {
      toast.error("Invalid or expired promo code.");
      setAppliedPromo(null);
      return;
    }

    // 3. First Order Coupon Abuse Prevention Check
    if (foundCoupon.isFirstOrderOnly) {
      if (user?.phone) {
        try {
          const identityRef = doc(db, "customer_identities", user.phone);
          const identityDoc = await getDoc(identityRef);
          if (identityDoc.exists() && (identityDoc.data() as any)?.firstOrderCouponUsed) {
            toast.error(
              "This phone number has already used the First Order offer.",
            );
            
            // Log security violation
            try {
              await addDoc(collection(db, "security_logs"), {
                action: "coupon_abuse_attempt",
                email: user?.email || "Unknown",
                uid: user?.uid || "Unknown",
                role: user?.role || "customer",
                path: "/checkout",
                timestamp: new Date().toISOString(),
                details: `Attempted to reuse First Order Coupon with phone ${user.phone}`
              });
            } catch (e) {
              console.error("Failed to log security event");
            }

            setAppliedPromo(null);
            return;
          }
        } catch (e) {
          console.error("Error validating coupon", e);
        }
      } else {
        toast.error(
          "Please verify your phone number first to use this coupon.",
        );
        setAppliedPromo(null);
        return;
      }
    }

    setAppliedPromo(foundCoupon);
    toast.success(`Coupon ${code} applied!`);
  };

  const discountAmount = appliedPromo
    ? appliedPromo.type === "percent"
      ? Math.round(total * (appliedPromo.value / 100))
      : appliedPromo.value
    : 0;
  const finalSubtotal = Math.max(0, total - discountAmount);
  const deliveryFee = deliveryType === "delivery" ? 40 : 0;
  const finalTotal = finalSubtotal + deliveryFee;

  const placeOrder = async () => {
    if (isOffline) {
      toast.error(
        "You are currently offline. Please connect to the internet to place an order.",
      );
      return;
    }

    setLoading(true);
    setError("");
    try {
      // 1. Fetch Global Settings for Timezone (Fallback to Asia/Kolkata)
      let timezone = "Asia/Kolkata";
      await runTransaction(db, async (transaction) => {
        const settingsSnap = await transaction.get(doc(db, "settings", "global"));
        const settings = settingsSnap.exists() ? (settingsSnap.data() as any) : {};
        timezone = settings.restaurantTimezone || "Asia/Kolkata";
      });

      // 2. Generate Time-Based Keys
      const dateObj = new Date();
      const options: Intl.DateTimeFormatOptions = { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' };
      const dateParts = new Intl.DateTimeFormat('en-CA', options).formatToParts(dateObj); // YYYY-MM-DD
      const year = dateParts.find(p => p.type === 'year')?.value;
      const month = dateParts.find(p => p.type === 'month')?.value;
      const day = dateParts.find(p => p.type === 'day')?.value;
      const dateKey = `${year}${month}${day}`;

      const displayOptions: Intl.DateTimeFormatOptions = { timeZone: timezone, day: '2-digit', month: 'long', year: 'numeric' };
      const displayDateStr = new Intl.DateTimeFormat('en-GB', displayOptions).format(dateObj); // 02 July 2026

      const counterRef = doc(db, 'daily_counters', dateKey);
      let currentOrderNumber = 1;

      // 3. Atomic Transaction for Daily Counter
      await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        if (!counterDoc.exists()) {
          transaction.set(counterRef, { count: 1 });
          currentOrderNumber = 1;
        } else {
          currentOrderNumber = counterDoc.data().count + 1;
          transaction.update(counterRef, { count: currentOrderNumber });
        }
      });

      // 4. Generate Identifiers
      const paddedNumber = `#${String(currentOrderNumber).padStart(3, '0')}`;
      const dailyOrderNumber = `${displayDateStr} ${paddedNumber}`;
      const randomStr = Math.random().toString(36).substring(2, 10).toUpperCase();
      const permanentOrderId = `OP-${dateKey}-${randomStr}`;
      
      const orderRef = doc(db, "orders", permanentOrderId);
      await setDoc(orderRef, {
        dailyOrderNumber,
        dateKey,
        dailySequence: currentOrderNumber,
        userId: auth.currentUser?.uid || null,
        customerName: user?.name || "Guest",
        contactPhone: user?.phone || "",
        customerInfo: {
          name: user?.name || "Guest",
          phone: user?.phone || "",
          email: user?.email || "",
        },
        items: items,
        subtotal: total,
        discountApplied: discountAmount,
        promoCode: appliedPromo?.code || null,
        deliveryFee,
        deliveryType,
        paymentMethod,
        orderTiming,
        scheduledDate: orderTiming === 'scheduled' ? scheduledDate : null,
        scheduledTime: orderTiming === 'scheduled' ? scheduledTime : null,
        noContactDelivery: deliveryType === 'delivery' ? noContactDelivery : false,
        address: deliveryType === "delivery" ? address : "Self Pickup",
        deliveryAddress:
          deliveryType === "delivery"
            ? {
                addressLine: address,
                landmark: user?.defaultAddress?.landmark || "",
                pincode: user?.pincode || user?.defaultAddress?.pincode || "",
                lat: user?.lat || null,
                lng: user?.lng || null,
              }
            : null,
        totalAmount: finalTotal,
        status: "pending",
        createdAt: new Date().toISOString(),
        alertSent: false,
        firstAlertAt: null,
        secondAlertAt: null,
        urgentAlertAt: null,
      });

      // Update customer_identities ledger for abuse prevention
      if (user?.phone) {
        const identityRef = doc(db, "customer_identities", user.phone);
        const updateData: any = {
          totalOrders: increment(1),
          totalSpent: increment(finalTotal),
        };

        if (appliedPromo?.isFirstOrderOnly) {
          updateData.firstOrderCouponUsed = true;
          updateData.firstOrderDate = new Date().toISOString();
          updateData.firstOrderCouponCode = appliedPromo.code;
        }

        try {
          await updateDoc(identityRef, updateData);
        } catch (identityError) {
          console.error("Failed to update identity ledger", identityError);
        }
      }

      // Trigger Order Placed Email
      fetch("/api/email/transactional", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "ORDER_PLACED",
          data: {
            orderId: permanentOrderId,
            dailyOrderNumber,
            customerName: user?.name || "Guest",
            customerEmail: user?.email || "",
            totalAmount: finalTotal,
            deliveryType,
          },
        }),
      }).catch((e) => console.error("Email trigger failed:", e));

      // Trigger Push Notification for new order
      auth.currentUser?.getIdToken().then(token => {
        fetch("/api/notifications/trigger-event", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify({ orderId: permanentOrderId, action: "new_order" })
        }).catch(console.error);
      });

      clearCart();
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { num: 1, title: "Address", icon: <MapPin className="w-5 h-5" /> },
    { num: 2, title: "Delivery", icon: <MapPinned className="w-5 h-5" /> },
    { num: 3, title: "Payment", icon: <CreditCard className="w-5 h-5" /> },
    { num: 4, title: "Review", icon: <Receipt className="w-5 h-5" /> },
  ];

  return (
    <PageTransition className="w-full max-w-2xl mx-auto px-4 py-6 md:py-12">
      {/* Header */}
      <div className="flex items-center mb-8">
        <button
          onClick={() =>
            step > 1 ? setStep((step - 1) as any) : navigate("/cart")
          }
          className="p-2 -ml-2 text-slate-400 hover:text-white"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-black text-white ml-2">Checkout</h1>
      </div>

      {/* Progress Steps */}
      <div className="flex justify-between mb-10 relative">
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-dark-800 -z-10 -translate-y-1/2" />
        {steps.map((s) => {
          const isActive = step === s.num;
          const isPassed = step > s.num;
          return (
            <div
              key={s.num}
              className="flex flex-col items-center gap-2 bg-dark-950 px-2"
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                  isActive
                    ? "bg-primary-600 text-white shadow-[0_0_15px_rgba(85,119,90,0.4)]"
                    : isPassed
                      ? "bg-success text-dark-950"
                      : "bg-dark-800 text-slate-500"
                }`}
              >
                {isPassed ? <Check className="w-5 h-5" /> : s.icon}
              </div>
              <span
                className={`text-[10px] uppercase tracking-wider font-bold ${isActive ? "text-white" : "text-slate-500"}`}
              >
                {s.title}
              </span>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="bg-error/10 text-error p-4 rounded-xl mb-6 text-sm font-medium">
          {error}
        </div>
      )}

      <div className="bg-dark-900 border border-dark-800 rounded-3xl p-6 md:p-8">
        {isOffline && (
          <div className="bg-red-500/20 text-red-500 border border-red-500/50 p-4 rounded-xl mb-6 font-bold flex items-center justify-center gap-2">
            You are currently offline. Checkout is disabled until you reconnect.
          </div>
        )}
        <AnimatePresence mode="wait">
          {/* STEP 1: Address */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="text-xl font-bold text-white mb-6">
                Confirm Address
              </h2>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter complete delivery address..."
                className="w-full bg-dark-950 border border-dark-800 rounded-xl p-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary-500 min-h-[120px]"
              />
              <button
                onClick={() => {
                  if (deliveryType === "delivery" && user?.lat && user?.lng) {
                    const distance = calculateDistance(
                      RESTAURANT_LOCATION.lat,
                      RESTAURANT_LOCATION.lng,
                      user.lat,
                      user.lng,
                    );
                    if (distance > storeStatus.deliveryRadiusKm) {
                      toast.error(
                        `Your address is ${distance.toFixed(1)}km away. We only deliver within ${storeStatus.deliveryRadiusKm}km. Please select Self Pickup.`,
                      );
                      setDeliveryType("pickup");
                    }
                  }
                  setStep(2);
                }}
                disabled={!address.trim() || isOffline}
                className="w-full mt-6 bg-primary-600 hover:bg-primary-500 text-white py-4 rounded-full font-bold transition-transform active:scale-95 disabled:opacity-50"
              >
                Continue
              </button>
            </motion.div>
          )}

          {/* STEP 2: Delivery Type */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="text-xl font-bold text-white mb-6">
                Delivery Method
              </h2>
              <div className="space-y-4">
                <button
                  onClick={() => {
                    if (!storeStatus.isDeliveryAvailable) {
                      const audio = new Audio(
                        "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3",
                      );
                      audio.play().catch(() => {});
                      toast.error(
                        "Delivery is closed for now. You can pickup your order from our restaurant.",
                        { duration: 5000 },
                      );
                      return;
                    }
                    setDeliveryType("delivery");
                  }}
                  className={`w-full flex items-center p-4 rounded-xl border transition-colors ${!storeStatus.isDeliveryAvailable ? "opacity-50 cursor-not-allowed bg-dark-950 border-dark-800 text-slate-500" : deliveryType === "delivery" ? "bg-primary-600/10 border-primary-500 text-white" : "bg-dark-950 border-dark-800 text-slate-400"}`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center ${deliveryType === "delivery" ? "border-primary-500" : "border-slate-600"}`}
                  >
                    {deliveryType === "delivery" && (
                      <div className="w-2.5 h-2.5 bg-primary-500 rounded-full" />
                    )}
                  </div>
                  <div className="text-left">
                    <p className="font-bold">Home Delivery</p>
                    <p className="text-xs opacity-80 mt-1">
                      Delivered to your door in ~30 mins. (+₹40)
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => setDeliveryType("pickup")}
                  className={`w-full flex items-center p-4 rounded-xl border transition-colors ${deliveryType === "pickup" ? "bg-primary-600/10 border-primary-500 text-white" : "bg-dark-950 border-dark-800 text-slate-400"}`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center ${deliveryType === "pickup" ? "border-primary-500" : "border-slate-600"}`}
                  >
                    {deliveryType === "pickup" && (
                      <div className="w-2.5 h-2.5 bg-primary-500 rounded-full" />
                    )}
                  </div>
                  <div className="text-left">
                    <p className="font-bold">Self Pickup</p>
                    <p className="text-xs opacity-80 mt-1">
                      Pick up from our Rajnandgaon store. (Free)
                    </p>
                  </div>
                </button>
              </div>

              {/* Order Timing Options */}
              <div className="mt-8">
                <h3 className="font-bold text-white mb-4">When would you like your order?</h3>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setOrderTiming("now")}
                    className={`p-4 rounded-xl border text-center transition-colors ${orderTiming === "now" ? "bg-primary-600/10 border-primary-500 text-white" : "bg-dark-950 border-dark-800 text-slate-400"}`}
                  >
                    <p className="font-bold">ASAP</p>
                    <p className="text-xs opacity-80 mt-1">Deliver/Pickup Now</p>
                  </button>
                  <button
                    onClick={() => setOrderTiming("scheduled")}
                    className={`p-4 rounded-xl border text-center transition-colors ${orderTiming === "scheduled" ? "bg-primary-600/10 border-primary-500 text-white" : "bg-dark-950 border-dark-800 text-slate-400"}`}
                  >
                    <p className="font-bold">Schedule</p>
                    <p className="text-xs opacity-80 mt-1">For Later</p>
                  </button>
                </div>

                <AnimatePresence>
                  {orderTiming === "scheduled" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 space-y-4 overflow-hidden"
                    >
                      <div>
                        <label className="block text-sm font-bold text-slate-400 mb-2">Select Date</label>
                        <select
                          value={scheduledDate}
                          onChange={(e) => {
                            setScheduledDate(e.target.value);
                            setScheduledTime(""); // Reset time when date changes
                          }}
                          className="w-full bg-dark-950 border border-dark-800 rounded-xl p-3 text-white focus:outline-none focus:border-primary-500"
                        >
                          <option value="today">Today</option>
                          <option value="tomorrow">Tomorrow</option>
                        </select>
                      </div>

                      {availableSlots.length > 0 ? (
                        <div>
                          <label className="block text-sm font-bold text-slate-400 mb-2">Select Time</label>
                          <select
                            value={scheduledTime}
                            onChange={(e) => setScheduledTime(e.target.value)}
                            className="w-full bg-dark-950 border border-dark-800 rounded-xl p-3 text-white focus:outline-none focus:border-primary-500"
                          >
                            <option value="">-- Choose a Time --</option>
                            {availableSlots.map((slot) => (
                              <option key={slot} value={slot}>{slot}</option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div className="bg-orange-500/10 text-orange-500 p-3 rounded-lg text-sm">
                          No more time slots available for {scheduledDate}. Please select another date.
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* No Contact Delivery Toggle */}
              {deliveryType === "delivery" && (
                <div className="mt-8 bg-dark-950 border border-dark-800 p-4 rounded-xl flex items-center justify-between cursor-pointer" onClick={() => setNoContactDelivery(!noContactDelivery)}>
                  <div>
                    <h3 className="font-bold text-white">No-Contact Delivery</h3>
                    <p className="text-xs text-slate-400 mt-1">Delivery partner will leave the order at your door and provide photo proof.</p>
                  </div>
                  <div className={`w-12 h-6 rounded-full transition-colors relative ${noContactDelivery ? 'bg-primary-500' : 'bg-dark-800'}`}>
                    <div className={`absolute top-1 bottom-1 w-4 bg-white rounded-full transition-transform ${noContactDelivery ? 'translate-x-7' : 'translate-x-1'}`} />
                  </div>
                </div>
              )}

              <button
                onClick={() => {
                  if (storeStatus.isLoading) {
                    toast("Loading store settings...", { icon: "⏳" });
                    return;
                  }
                  if (
                    deliveryType === "delivery" &&
                    !storeStatus.isDeliveryAvailable
                  ) {
                    const audio = new Audio(
                      "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3",
                    );
                    audio.play().catch(() => {});
                    toast.error(
                      "Delivery is closed for now. You can pickup your order from our restaurant.",
                      { duration: 5000 },
                    );
                    return;
                  }
                  if (orderTiming === 'scheduled' && !scheduledTime) {
                    toast.error('Please select a scheduled time for your order.');
                    return;
                  }
                  setStep(3);
                }}
                className="w-full mt-8 bg-primary-600 hover:bg-primary-500 text-white py-4 rounded-full font-bold transition-transform active:scale-95"
              >
                Continue
              </button>
            </motion.div>
          )}

          {/* STEP 3: Payment */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="text-xl font-bold text-white mb-6">
                Payment Method
              </h2>
              <div className="space-y-4">
                <button
                  onClick={() => setPaymentMethod("online")}
                  className={`w-full flex items-center p-4 rounded-xl border transition-colors ${paymentMethod === "online" ? "bg-primary-600/10 border-primary-500 text-white" : "bg-dark-950 border-dark-800 text-slate-400"}`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center ${paymentMethod === "online" ? "border-primary-500" : "border-slate-600"}`}
                  >
                    {paymentMethod === "online" && (
                      <div className="w-2.5 h-2.5 bg-primary-500 rounded-full" />
                    )}
                  </div>
                  <div className="text-left">
                    <p className="font-bold">Pay Online (UPI / Card)</p>
                  </div>
                </button>
                <button
                  onClick={() => setPaymentMethod("cash")}
                  className={`w-full flex items-center p-4 rounded-xl border transition-colors ${paymentMethod === "cash" ? "bg-primary-600/10 border-primary-500 text-white" : "bg-dark-950 border-dark-800 text-slate-400"}`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center ${paymentMethod === "cash" ? "border-primary-500" : "border-slate-600"}`}
                  >
                    {paymentMethod === "cash" && (
                      <div className="w-2.5 h-2.5 bg-primary-500 rounded-full" />
                    )}
                  </div>
                  <div className="text-left">
                    <p className="font-bold">Cash on Delivery</p>
                  </div>
                </button>
              </div>
              <button
                onClick={() => setStep(4)}
                className="w-full mt-8 bg-primary-600 hover:bg-primary-500 text-white py-4 rounded-full font-bold transition-transform active:scale-95"
              >
                Review Order
              </button>
            </motion.div>
          )}

          {/* STEP 4: Review */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="text-xl font-bold text-white mb-6">
                Review Order
              </h2>

              <div className="bg-dark-950 border border-dark-800 rounded-xl p-4 mb-6">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center py-2 border-b border-dark-800 last:border-0 text-sm"
                  >
                    <span className="text-slate-300">
                      <span className="text-primary-500 font-bold mr-2">
                        {item.quantity}x
                      </span>{" "}
                      {item.name}
                    </span>
                    <span className="font-bold text-white">
                      ₹{item.price * item.quantity}
                    </span>
                  </div>
                ))}
              </div>

              {/* Promo Code */}
              <div className="flex gap-2 mb-6">
                <input
                  type="text"
                  placeholder="Promo Code"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value)}
                  className="flex-1 bg-dark-950 border border-dark-800 rounded-lg px-4 text-sm uppercase text-white focus:outline-none focus:border-primary-500"
                />
                <button
                  onClick={handleApplyPromo}
                  className="bg-dark-800 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-dark-700 transition-colors"
                >
                  Apply
                </button>
              </div>

              <div className="space-y-2 text-sm mb-6">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal</span>
                  <span>₹{total}</span>
                </div>
                {appliedPromo && (
                  <div className="flex justify-between text-success">
                    <span>Discount ({appliedPromo.code})</span>
                    <span>-₹{discountAmount}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-400 border-b border-dark-800 pb-2">
                  <span>Delivery Fee</span>
                  <span>₹{deliveryFee}</span>
                </div>
                <div className="flex justify-between text-xl font-black text-white pt-2">
                  <span>Total</span>
                  <span className="text-accent-400">₹{finalTotal}</span>
                </div>
              </div>

              <button
                onClick={placeOrder}
                disabled={loading}
                className="w-full bg-primary-600 hover:bg-primary-500 text-white py-4 rounded-full font-bold transition-transform active:scale-95 flex items-center justify-center disabled:opacity-50"
              >
                {loading ? "Processing..." : "Place Order"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
}
