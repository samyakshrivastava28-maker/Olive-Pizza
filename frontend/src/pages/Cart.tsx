import { useState, useEffect } from "react";
import { useCartStore, useAuthStore } from "../lib/store";
import { LocationManager } from "../lib/permissions";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import PageTransition from "../components/PageTransition";
import { RESTAURANT_LOCATION } from "../lib/config";
import { useStoreStatus } from "../lib/useStoreStatus";
import { calculateDistance } from "../lib/utils";
import { 
  Minus, Plus, Trash2, ArrowRight, Sparkles, Tag, 
  MapPin, Clock, ShoppingBag, Flame
} from "lucide-react";
import { db } from "../lib/firebase";
import { collection, getDocs, query, limit } from "firebase/firestore";
import { MenuItem } from "../types/models";
import toast from "react-hot-toast";

export default function Cart() {
  const { items, total, addItem, removeItem, updateQuantity, clearCart } = useCartStore();
  const { user } = useAuthStore();
  const storeStatus = useStoreStatus();
  const navigate = useNavigate();

  const [isOutsideDeliveryZone, setIsOutsideDeliveryZone] = useState(false);
  const [recommendations, setRecommendations] = useState<MenuItem[]>([]);
  const [couponCode, setCouponCode] = useState("BEST50");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>({ code: "BEST50", discount: 50 });
  const [showCouponInput, setShowCouponInput] = useState(false);
  const [deliveryInstruction, setDeliveryInstruction] = useState("Please ring the bell");

  useEffect(() => {
    if (!storeStatus.isLoading) {
      LocationManager.getCurrentLocation({ forcePrompt: false })
        .then((location) => {
          const distance = calculateDistance(
            RESTAURANT_LOCATION.lat,
            RESTAURANT_LOCATION.lng,
            location.lat,
            location.lng,
          );
          if (distance > storeStatus.deliveryRadiusKm) {
            setIsOutsideDeliveryZone(true);
          }
        })
        .catch((error) => console.log("Geolocation error", error));
    }

    const fetchRecommendations = async () => {
      try {
        const q = query(collection(db, "products"), limit(20));
        const snap = await getDocs(q);
        const allItems = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem));
        
        const hasPizza = items.some(i => i.name.toLowerCase().includes('pizza'));
        let recs = allItems.filter(i => !items.some(cartItem => cartItem.id === i.id));
        
        if (hasPizza) {
          recs = recs.filter(i => i.category === 'sides' || i.category === 'beverage' || i.category === 'dessert');
        }
        setRecommendations(recs.slice(0, 3));
      } catch (e) {
        console.error(e);
      }
    };
    
    fetchRecommendations();
  }, [items]);

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) return;
    if (couponCode.toUpperCase() === "BEST50" || couponCode.toUpperCase() === "OLIVE20") {
      const discount = couponCode.toUpperCase() === "BEST50" ? 50 : Math.round(total * 0.2);
      setAppliedCoupon({ code: couponCode.toUpperCase(), discount });
      setShowCouponInput(false);
      toast.success(`Coupon ${couponCode.toUpperCase()} applied! Saved ₹${discount}`);
    } else {
      toast.error("Invalid coupon code. Try BEST50");
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    toast.success("Coupon removed");
  };

  const subtotal = total;
  const couponDiscount = appliedCoupon ? appliedCoupon.discount : 0;
  const deliveryFee = 30;
  const taxes = Math.round(subtotal * 0.05);
  const finalTotal = Math.max(0, subtotal - couponDiscount) + deliveryFee + taxes;

  const handleProceed = () => {
    navigate("/checkout");
  };

  const totalItemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  // ─── EMPTY CART STATE ──────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <PageTransition className="responsive-container py-16 md:py-24 text-center min-h-[70vh] flex flex-col items-center justify-center">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 15 }}
          className="w-32 h-32 md:w-40 md:h-40 bg-dark-900 border border-dark-800 rounded-full flex items-center justify-center mb-6 shadow-2xl relative"
        >
          <ShoppingBag className="w-16 h-16 text-primary-500/60" />
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 border-2 border-dashed border-primary-500/30 rounded-full"
          />
        </motion.div>
        
        <h1 className="text-fluid-h1 font-black text-white mb-3">
          Your Cart is Empty
        </h1>
        <p className="text-slate-400 text-fluid-body mb-8 max-w-md mx-auto">
          Looks like you haven't added any handcrafted pizzas or gourmet sides yet!
        </p>
        
        <button
          onClick={() => navigate("/menu")}
          className="min-touch-target bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white px-8 py-4 rounded-2xl font-bold transition-all shadow-lg hover:shadow-primary-500/20 active:scale-95 flex items-center gap-2"
        >
          <Flame className="w-5 h-5 text-accent-400" />
          Explore Handcrafted Menu
        </button>
      </PageTransition>
    );
  }

  // ─── ACTIVE CART DESIGN (REFERENCE ALIGNED) ──────────────────────────────────
  return (
    <PageTransition className="responsive-container pb-36 md:pb-16 pt-4 md:pt-8">
      {/* ── Header & Restaurant Info ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-fluid-h1 font-black text-white tracking-tight">
              Your Cart ({totalItemCount})
            </h1>
            <button 
              onClick={() => clearCart()} 
              className="text-xs text-slate-500 hover:text-red-400 font-bold underline transition-colors"
            >
              Clear All
            </button>
          </div>
          
          {/* Restaurant Badge */}
          <div className="flex items-center gap-2 text-xs md:text-sm text-slate-400 mt-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-white">Olive Pizza</span>
            <span>•</span>
            <span className="flex items-center gap-1"><Clock size={13} className="text-accent-400" /> 30-40 min</span>
            <span>•</span>
            <span className="flex items-center gap-1"><MapPin size={13} className="text-primary-400" /> 2.8 km away</span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <button 
            onClick={() => navigate('/menu')} 
            className="text-xs font-bold text-slate-300 hover:text-white bg-dark-900 border border-dark-700 px-4 py-2.5 rounded-xl transition-colors"
          >
            + Add More Items
          </button>
        </div>
      </div>

      {/* Outside Delivery Zone Banner */}
      {isOutsideDeliveryZone && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 mb-6 flex items-center gap-3"
        >
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="text-amber-400 font-bold text-sm">Outside Standard Delivery Zone</p>
            <p className="text-slate-400 text-xs mt-0.5">Order will be prepared for fast self-pickup at Rajnandgaon branch.</p>
          </div>
        </motion.div>
      )}

      {/* ── Main Cart Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        
        {/* Left Column: Cart Items & Addons (8 Cols on Desktop) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="space-y-3">
            <AnimatePresence>
              {items.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-dark-900/90 border border-white/10 p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl flex gap-3.5 sm:gap-4 items-center shadow-lg relative group overflow-hidden"
                >
                  {/* Item Image */}
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-xl sm:rounded-2xl shrink-0 border border-white/5 shadow-md"
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm sm:text-base md:text-lg font-bold text-white truncate">
                      {item.name}
                    </h3>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      {item.crust || 'Medium • Classic Crust'}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {item.size || item.variant || (item.addons && item.addons.length > 0 ? item.addons.join(', ') : 'Extra Cheese, Fresh Herbs')}
                    </p>

                    {/* Quantity Stepper & Price */}
                    <div className="flex items-center justify-between gap-2 mt-3">
                      <div className="flex items-center gap-2 bg-dark-950 rounded-full p-1 border border-dark-700">
                        <button
                          onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                          className="min-touch-target w-7 h-7 rounded-full bg-dark-800 hover:bg-dark-700 flex items-center justify-center text-white active:scale-90 transition-transform"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-black text-sm text-white px-2">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="min-touch-target w-7 h-7 rounded-full bg-dark-800 hover:bg-dark-700 flex items-center justify-center text-white active:scale-90 transition-transform"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <span className="text-base sm:text-lg font-black text-white">
                        ₹{item.price * item.quantity}
                      </span>
                    </div>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => removeItem(item.id)}
                    className="min-touch-target p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-colors self-start"
                    aria-label="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Add More Items Button (Mobile / Tablet) */}
          <div className="pt-2">
            <button 
              onClick={() => navigate('/menu')} 
              className="w-full py-3 border border-dashed border-white/20 rounded-2xl text-slate-300 font-bold text-xs sm:text-sm hover:border-primary-500 hover:text-primary-400 transition-colors flex items-center justify-center gap-2"
            >
              + Add more items to order
            </button>
          </div>

          {/* ── People Also Ordered / Recommendations ── */}
          {recommendations.length > 0 && (
            <div className="mt-8 bg-dark-900/60 border border-white/10 p-4 sm:p-6 rounded-3xl">
              <h3 className="text-base sm:text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Sparkles className="text-accent-400 w-4 h-4" /> People Also Ordered
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {recommendations.map(rec => (
                  <div key={rec.id} className="bg-dark-950/80 p-3 rounded-2xl border border-dark-800 flex flex-col justify-between">
                    <div className="flex items-center gap-3 sm:flex-col sm:text-center mb-3">
                      <img src={rec.image} alt={rec.name} className="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded-xl shrink-0" />
                      <div className="min-w-0">
                        <h4 className="font-bold text-white text-xs sm:text-sm truncate">{rec.name}</h4>
                        <p className="text-accent-400 font-bold text-xs mt-0.5">₹{rec.basePrice}</p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        addItem({ id: rec.id!, menuItemId: rec.id!, name: rec.name, price: rec.basePrice, quantity: 1, image: rec.image });
                        toast.success(`Added ${rec.name}`);
                      }}
                      className="w-full bg-dark-800 hover:bg-primary-600 text-white py-2 rounded-xl text-xs font-bold transition-colors min-touch-target"
                    >
                      + Add
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trust & Quality Badges */}
          <div className="grid grid-cols-3 gap-2 pt-4">
            <div className="bg-dark-900/40 border border-white/5 p-3 rounded-2xl text-center">
              <span className="text-lg block mb-1">🌿</span>
              <p className="text-[11px] font-bold text-slate-300">100% Fresh</p>
              <p className="text-[9px] text-slate-500">Hand-kneaded dough</p>
            </div>
            <div className="bg-dark-900/40 border border-white/5 p-3 rounded-2xl text-center">
              <span className="text-lg block mb-1">🔥</span>
              <p className="text-[11px] font-bold text-slate-300">Piping Hot</p>
              <p className="text-[9px] text-slate-500">Insulated delivery</p>
            </div>
            <div className="bg-dark-900/40 border border-white/5 p-3 rounded-2xl text-center">
              <span className="text-lg block mb-1">🛡️</span>
              <p className="text-[11px] font-bold text-slate-300">Safe Delivery</p>
              <p className="text-[9px] text-slate-500">Contactless option</p>
            </div>
          </div>
        </div>

        {/* Right Column: Checkout Summary, Coupons & Delivery Details (4 Cols Desktop) */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-24">
          
          {/* ── Coupon Section Card ── */}
          <div className="bg-dark-900/90 border border-white/10 p-4 sm:p-5 rounded-3xl shadow-xl">
            {appliedCoupon ? (
              <div className="bg-emerald-950/40 border border-emerald-500/30 p-3.5 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-xs">
                    <Tag size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">{appliedCoupon.code} applied</p>
                    <p className="text-xs text-slate-300 font-medium">You saved ₹{appliedCoupon.discount} on this order</p>
                  </div>
                </div>
                <button 
                  onClick={handleRemoveCoupon}
                  className="text-xs font-bold text-slate-400 hover:text-white underline transition-colors"
                >
                  Change
                </button>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-white flex items-center gap-2"><Tag size={16} className="text-accent-400" /> Apply Coupon</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="Enter Promo Code"
                    className="flex-1 bg-dark-950 border border-dark-700 rounded-xl px-3.5 py-2.5 text-xs text-white uppercase tracking-wider focus:outline-none focus:border-primary-500"
                  />
                  <button
                    onClick={handleApplyCoupon}
                    className="bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors min-touch-target"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Bill Details Card ── */}
          <div className="bg-dark-900/90 border border-white/10 p-5 rounded-3xl shadow-xl space-y-3">
            <h2 className="text-base font-bold text-white mb-4">Bill Details</h2>
            
            <div className="flex justify-between text-xs text-slate-400">
              <span>Subtotal</span>
              <span className="text-white font-medium">₹{subtotal}</span>
            </div>

            {appliedCoupon && (
              <div className="flex justify-between text-xs text-emerald-400 font-medium">
                <span>Coupon Discount</span>
                <span>-₹{couponDiscount}</span>
              </div>
            )}

            <div className="flex justify-between text-xs text-slate-400">
              <span>Delivery Fee</span>
              <span className="text-white font-medium">₹{deliveryFee}</span>
            </div>

            <div className="flex justify-between text-xs text-slate-400">
              <span>Taxes & Charges</span>
              <span className="text-white font-medium">₹{taxes}</span>
            </div>

            <div className="pt-3 border-t border-white/10 flex justify-between items-baseline">
              <div>
                <p className="text-sm font-black text-white">To Pay</p>
                <p className="text-[10px] text-slate-500">Includes all applicable taxes</p>
              </div>
              <span className="text-2xl font-black text-white tracking-tight">₹{finalTotal}</span>
            </div>

            {/* Desktop Proceed Button */}
            <button
              onClick={handleProceed}
              className="hidden lg:flex w-full mt-4 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white py-4 rounded-2xl font-bold transition-all shadow-lg hover:shadow-primary-500/25 active:scale-98 items-center justify-center gap-2 text-base"
            >
              Proceed to Checkout <ArrowRight size={18} />
            </button>
          </div>

          {/* ── Deliver To Address Preview Card ── */}
          <div className="bg-dark-900/90 border border-white/10 p-4 sm:p-5 rounded-3xl shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin size={14} className="text-primary-400" /> Deliver To
              </span>
              <button onClick={() => navigate('/checkout')} className="text-xs font-bold text-primary-400 hover:underline">
                Change
              </button>
            </div>
            <p className="text-xs font-bold text-white truncate">
              {user?.fullAddress || user?.full_address || "Home"}
            </p>
            <p className="text-[11px] text-slate-400 line-clamp-2">
              Dongargaon Rd, near Saraswati school, Rajnandgaon, CG
            </p>

            <div className="pt-2 border-t border-white/5">
              <label className="block text-[11px] font-bold text-slate-400 mb-1">Delivery Instruction</label>
              <input
                type="text"
                value={deliveryInstruction}
                onChange={(e) => setDeliveryInstruction(e.target.value)}
                placeholder="e.g. Leave at door, don't ring bell"
                className="w-full bg-dark-950 border border-dark-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary-500"
              />
            </div>
          </div>

        </div>

      </div>

      {/* ── Mobile & Tablet Sticky Floating Checkout Bar ── */}
      <div 
        className="lg:hidden fixed left-3 right-3 z-[80] pointer-events-none"
        style={{ bottom: 'var(--app-floating-bottom-offset, calc(72px + env(safe-area-inset-bottom, 0px) + 12px))' }}
      >
        <div className="pointer-events-auto bg-dark-900/95 backdrop-blur-2xl border border-white/15 rounded-2xl p-3 flex items-center justify-between shadow-[0_-10px_40px_rgba(0,0,0,0.6)]">
          <div className="pl-2">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total to pay</p>
            <p className="text-xl font-black text-white leading-none mt-0.5">
              ₹{finalTotal}
            </p>
          </div>
          <button
            onClick={handleProceed}
            className="min-touch-target bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(85,119,90,0.3)] active:scale-95 transition-all text-sm"
          >
            Proceed to Checkout
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </PageTransition>
  );
}
