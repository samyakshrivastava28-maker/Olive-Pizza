import { useState, useEffect } from "react";
import { useCartStore, useAuthStore } from "../lib/store";
import { useDataStore } from "../lib/dataStore";
import { LocationManager } from "../lib/permissions";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import PageTransition from "../components/PageTransition";
import { RESTAURANT_LOCATION } from "../lib/config";
import { useStoreStatus } from "../lib/useStoreStatus";
import { calculateDistance } from "../lib/utils";
import { 
  Minus, Plus, Trash2, ArrowRight, Sparkles, Tag, 
  MapPin, Clock, ShoppingBag, Flame, AlertTriangle, AlertCircle
} from "lucide-react";
import { OrderingContextService } from "../lib/orderingContext";
import { openLocationModal } from "../components/location/LocationChangeModal";
import { db } from "../lib/firebase";
import { collection, getDocs, query, limit } from "firebase/firestore";
import { MenuItem } from "../types/models";
import toast from "react-hot-toast";
import SEO from "../components/SEO";
import { getOptimizedImageUrl } from "../lib/imageOptimizer";

export default function Cart() {
  const { items, total, addItem, removeItem, updateQuantity, clearCart, franchiseId: cartFranchiseId, setFranchiseId } = useCartStore();
  const { user } = useAuthStore();
  const storeStatus = useStoreStatus();
  const navigate = useNavigate();

  const [isOutsideDeliveryZone, setIsOutsideDeliveryZone] = useState(false);
  const [showFranchiseMismatch, setShowFranchiseMismatch] = useState(false);
  const [resolvedFranchiseInfo, setResolvedFranchiseInfo] = useState<{ id: string; name: string } | null>(null);
  const [recommendations, setRecommendations] = useState<MenuItem[]>([]);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [showCouponInput, setShowCouponInput] = useState(false);
  const [deliveryInstruction, setDeliveryInstruction] = useState("Please ring the bell");
  const [activeAddress, setActiveAddress] = useState<string>(() => {
    if (user?.fullAddress) return user.fullAddress;
    try {
      const stored = localStorage.getItem('op_active_location');
      if (stored) return JSON.parse(stored).fullAddress;
    } catch {}
    return '';
  });

  useEffect(() => {
    if (user?.fullAddress) {
      setActiveAddress(user.fullAddress);
    }
  }, [user?.fullAddress]);

  const verifyCartLocationAndFranchise = async (coords?: { lat: number; lng: number }) => {
    let lat = coords?.lat ?? (user as any)?.lat;
    let lng = coords?.lng ?? (user as any)?.lng;

    if (!lat || !lng) {
      try {
        const stored = localStorage.getItem('op_active_location');
        if (stored) {
          const parsed = JSON.parse(stored);
          lat = parsed.lat;
          lng = parsed.lng;
        }
      } catch {}
    }

    if (lat != null && lng != null && !isNaN(Number(lat)) && !isNaN(Number(lng))) {
      const res = await OrderingContextService.resolveContext({
        lat: Number(lat),
        lng: Number(lng),
        customerId: user?.uid
      });

      if (!res.isServiceable || !res.context) {
        setIsOutsideDeliveryZone(true);
      } else {
        setIsOutsideDeliveryZone(false);
        const currentFranchiseId = res.context.franchiseId;

        // Check if cart has items belonging to another franchise (Section 3c)
        if (items.length > 0 && cartFranchiseId && cartFranchiseId !== currentFranchiseId) {
          setResolvedFranchiseInfo({
            id: currentFranchiseId,
            name: res.context.branchName || 'Olive Pizza'
          });
          setShowFranchiseMismatch(true);
        } else if (!cartFranchiseId && currentFranchiseId) {
          setFranchiseId(currentFranchiseId);
        }
      }
    }
  };

  useEffect(() => {
    verifyCartLocationAndFranchise();
  }, [user?.lat, user?.lng, items.length, cartFranchiseId]);

  useEffect(() => {
    const handleLocationChange = (e: any) => {
      if (e.detail?.fullAddress) {
        setActiveAddress(e.detail.fullAddress);
      }
      if (e.detail?.lat && e.detail?.lng) {
        verifyCartLocationAndFranchise({ lat: e.detail.lat, lng: e.detail.lng });
      }
    };
    window.addEventListener('location-changed', handleLocationChange as EventListener);
    return () => window.removeEventListener('location-changed', handleLocationChange as EventListener);
  }, []);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const { products: storeProducts } = useDataStore.getState();
        let allItems: MenuItem[] = [];

        if (storeProducts && storeProducts.length > 0) {
          allItems = storeProducts.map((p: any) => ({
            id: p.id,
            name: p.productName || p.name,
            description: p.description || '',
            category: p.category || 'sides',
            pricingMode: p.pricingMode || 'fixed',
            basePrice: p.basePrice || 0,
            offerPrice: p.offerPrice || 0,
            discountPercentage: p.discountPercentage || 0,
            image: p.imageUrl || p.image || '',
            isVegetarian: p.isVegetarian ?? true,
            isAvailable: p.isActive ?? true
          }));
        } else {
          const q = query(collection(db, "products"), limit(20));
          const snap = await getDocs(q);
          allItems = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem));
        }
        
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

    const savedCoupon = localStorage.getItem('olive_applied_coupon');
    if (savedCoupon && savedCoupon.toUpperCase() !== "BEST50") {
      const code = savedCoupon.toUpperCase();
      const { coupons } = useDataStore.getState();
      const matching = coupons?.find((c: any) => (c.code || '').toUpperCase() === code);
      let discount = 30;
      if (matching) {
        if (matching.discountType === 'percentage') {
          discount = Math.round(total * (Number(matching.discountValue) / 100));
          if (matching.maxDiscountAmount && discount > matching.maxDiscountAmount) {
            discount = matching.maxDiscountAmount;
          }
        } else {
          discount = Number(matching.discountValue) || 50;
        }
      } else if (code === "OLIVE20") {
        discount = Math.round(total * 0.2);
      }
      setAppliedCoupon({ code, discount });
      setCouponCode(code);
    } else if (savedCoupon?.toUpperCase() === "BEST50") {
      localStorage.removeItem('olive_applied_coupon');
    }

    const handleCouponAppliedEvent = (e: any) => {
      const code = e.detail || localStorage.getItem('olive_applied_coupon');
      if (code && typeof code === 'string') {
        const uppercaseCode = code.toUpperCase();
        const { coupons } = useDataStore.getState();
        const matching = coupons?.find((c: any) => (c.code || '').toUpperCase() === uppercaseCode);
        let discount = 30;
        if (matching) {
          if (matching.discountType === 'percentage') {
            discount = Math.round(total * (Number(matching.discountValue) / 100));
            if (matching.maxDiscountAmount && discount > matching.maxDiscountAmount) {
              discount = matching.maxDiscountAmount;
            }
          } else {
            discount = Number(matching.discountValue) || 50;
          }
        } else if (uppercaseCode === "BEST50") {
          discount = 50;
        } else if (uppercaseCode === "OLIVE20") {
          discount = Math.round(total * 0.2);
        }
        setAppliedCoupon({ code: uppercaseCode, discount });
        setCouponCode(uppercaseCode);
      }
    };

    window.addEventListener('coupon-applied', handleCouponAppliedEvent);
    return () => window.removeEventListener('coupon-applied', handleCouponAppliedEvent);
  }, [items]);

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) return;
    const code = couponCode.trim().toUpperCase();
    const { coupons } = useDataStore.getState();
    const matchingCoupon = (coupons && coupons.length > 0)
      ? coupons.find((c: any) => (c.code || '').toUpperCase() === code && c.isActive !== false)
      : null;

    if (matchingCoupon) {
      if (matchingCoupon.minOrderAmount && total < matchingCoupon.minOrderAmount) {
        toast.error(`Minimum order amount of ₹${matchingCoupon.minOrderAmount} required for ${code}`);
        return;
      }
      let discount = 0;
      if (matchingCoupon.discountType === 'percentage') {
        discount = Math.round(total * (Number(matchingCoupon.discountValue) / 100));
        if (matchingCoupon.maxDiscountAmount && discount > matchingCoupon.maxDiscountAmount) {
          discount = matchingCoupon.maxDiscountAmount;
        }
      } else {
        discount = Number(matchingCoupon.discountValue) || 50;
      }
      setAppliedCoupon({ code, discount });
      localStorage.setItem('olive_applied_coupon', code);
      setShowCouponInput(false);
      toast.success(`Coupon ${code} applied! Saved ₹${discount}`);
      return;
    }

    if (code === "BEST50") {
      if (total < 349) {
        toast.error("Minimum order of ₹349 required for BEST50");
        return;
      }
      setAppliedCoupon({ code: "BEST50", discount: 50 });
      localStorage.setItem('olive_applied_coupon', "BEST50");
      setShowCouponInput(false);
      toast.success("Coupon BEST50 applied! Saved ₹50");
    } else if (code === "OLIVE20") {
      const discount = Math.round(total * 0.2);
      setAppliedCoupon({ code: "OLIVE20", discount });
      localStorage.setItem('olive_applied_coupon', "OLIVE20");
      setShowCouponInput(false);
      toast.success(`Coupon OLIVE20 applied! Saved ₹${discount}`);
    } else {
      toast.error("Invalid coupon code");
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    localStorage.removeItem('olive_applied_coupon');
    toast.success("Coupon removed");
  };

  const subtotal = total;
  const couponDiscount = appliedCoupon ? appliedCoupon.discount : 0;
  const deliveryFee = 30;
  const taxes = Math.round(subtotal * 0.05);
  const finalTotal = Math.max(0, subtotal - couponDiscount) + deliveryFee + taxes;

  const handleProceed = () => {
    if (isOutsideDeliveryZone) {
      toast.error("We currently don't deliver to this location.");
      return;
    }
    if (showFranchiseMismatch) {
      toast.error("Your cart has items from another location. Please resolve to proceed.");
      return;
    }
    navigate("/checkout");
  };

  const totalItemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  // ─── EMPTY CART STATE ──────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <PageTransition className="responsive-container py-16 md:py-24 text-center min-h-[70vh] flex flex-col items-center justify-center bg-[#FAF8F5]">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 15 }}
          className="w-32 h-32 md:w-40 md:h-40 bg-white border border-[#F8E7C9] rounded-full flex items-center justify-center mb-6 shadow-md relative"
        >
          <ShoppingBag className="w-16 h-16 text-primary-600" />
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 border-2 border-dashed border-primary-500/30 rounded-full"
          />
        </motion.div>
        
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">
          Your Cart is Empty
        </h1>
        <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
          Looks like you haven't added any handcrafted pizzas or gourmet sides yet!
        </p>
        
        <button
          onClick={() => navigate("/menu")}
          className="min-touch-target bg-primary-600 hover:bg-primary-700 text-champagne px-8 py-3.5 rounded-2xl font-bold transition-all shadow-md shadow-primary-900/15 active:scale-95 flex items-center gap-2 cursor-pointer text-sm"
        >
          <Flame className="w-4 h-4 text-champagne" />
          Explore Handcrafted Menu
        </button>
      </PageTransition>
    );
  }

  // Offer threshold calculation
  const OFFER_THRESHOLD = 349;
  const amountNeeded = Math.max(0, OFFER_THRESHOLD - subtotal);
  const progressPct = Math.min(100, Math.round((subtotal / OFFER_THRESHOLD) * 100));

  // ─── ACTIVE CART DESIGN (REFERENCE ALIGNED) ──────────────────────────────────
  return (
    <>
      <SEO title="Your Cart" noIndex={true} />
      <PageTransition className="responsive-container pb-36 md:pb-16 pt-4 md:pt-8 bg-[#FAF8F5] text-slate-900 min-h-screen">
      {/* ── Header & Restaurant Info ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Your Cart ({totalItemCount})
            </h1>
            <button 
              onClick={() => clearCart()} 
              className="text-xs text-slate-400 hover:text-red-500 font-bold underline transition-colors cursor-pointer"
            >
              Clear All
            </button>
          </div>
          
          {/* Restaurant Badge */}
          <div className="flex items-center gap-2 text-xs md:text-sm text-slate-500 mt-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-slate-900">Olive Pizza</span>
            <span>•</span>
            <span className="flex items-center gap-1 text-slate-600"><Clock size={13} className="text-primary-600" /> 25-30 min</span>
            <span>•</span>
            <span className="flex items-center gap-1 text-slate-600"><MapPin size={13} className="text-primary-600" /> Rajnandgaon Hub</span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <button 
            onClick={() => navigate('/menu')} 
            className="text-xs font-bold text-slate-700 hover:text-primary-700 bg-white border border-slate-200 px-4 py-2.5 rounded-xl transition-colors shadow-xs cursor-pointer"
          >
            + Add More Items
          </button>
        </div>
      </div>

      {/* ── Offer Unlock Progress Bar (Feature 11) ── */}
      <div className="bg-secondary-100 border border-secondary-300/80 rounded-2xl p-4 mb-6 shadow-xs">
        <div className="flex items-center justify-between text-xs font-bold text-primary-950 mb-2">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-primary-700 shrink-0" />
            {amountNeeded > 0 
              ? `Add ₹${amountNeeded} more to unlock special discounts on orders above ₹${OFFER_THRESHOLD}!`
              : `🎉 Congratulations! Your cart qualifies for special discounts & offers!`}
          </span>
          <span className="font-extrabold text-primary-800">{progressPct}%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-secondary-200/80 overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="h-full bg-primary-600 rounded-full"
          />
        </div>
      </div>

      {/* Outside Delivery Zone Banner */}
      {isOutsideDeliveryZone && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex items-center gap-3 text-slate-900"
        >
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="text-amber-800 font-bold text-sm">Outside Standard Delivery Zone</p>
            <p className="text-slate-600 text-xs mt-0.5">Order will be prepared for fast self-pickup at Rajnandgaon central kitchen.</p>
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
                  className="bg-white border border-slate-200 p-3.5 sm:p-4 rounded-2xl flex gap-3.5 sm:gap-4 items-center shadow-xs relative group overflow-hidden"
                >
                  {/* Item Image */}
                  <img
                    src={getOptimizedImageUrl(item.image, { preset: 'thumbnail', width: 200, height: 200 })}
                    alt={item.name}
                    loading="lazy"
                    decoding="async"
                    className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-xl shrink-0 border border-slate-100 shadow-xs"
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                      {item.name}
                    </h3>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {item.crust || 'Medium • Classic Crust'}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {item.size || item.variant || (item.addons && item.addons.length > 0 ? item.addons.join(', ') : 'Extra Cheese, Fresh Herbs')}
                    </p>

                    {/* Quantity Stepper & Price */}
                    <div className="flex items-center justify-between gap-2 mt-3">
                      <div className="flex items-center gap-2 bg-primary-50 rounded-xl px-2 py-1 border border-primary-200">
                        <button
                          onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                          className="min-touch-target w-6 h-6 rounded-lg bg-white hover:bg-primary-600 hover:text-white flex items-center justify-center text-primary-900 active:scale-90 transition-colors shadow-xs cursor-pointer border border-primary-100"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-black text-xs sm:text-sm text-primary-950 px-1">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="min-touch-target w-6 h-6 rounded-lg bg-primary-600 hover:bg-primary-700 flex items-center justify-center text-champagne active:scale-90 transition-colors shadow-xs cursor-pointer"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <span className="text-base sm:text-lg font-black text-primary-700">
                        ₹{item.price * item.quantity}
                      </span>
                    </div>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => removeItem(item.id)}
                    className="min-touch-target p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors self-start cursor-pointer"
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
              className="w-full py-3 border border-dashed border-slate-300 rounded-2xl text-slate-600 font-bold text-xs sm:text-sm hover:border-primary-600 hover:text-primary-700 transition-colors flex items-center justify-center gap-2 bg-white cursor-pointer"
            >
              + Add more items to order
            </button>
          </div>

          {/* ── People Also Ordered / Recommendations ── */}
          {recommendations.length > 0 && (
            <div className="mt-8 bg-white border border-slate-200 p-4 sm:p-6 rounded-3xl shadow-xs">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Sparkles className="text-primary-600 w-4 h-4" /> People Also Ordered
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {recommendations.map(rec => (
                  <div key={rec.id} className="bg-[#FAF8F5] p-3 rounded-2xl border border-slate-200 flex flex-col justify-between hover:border-primary-500/40 transition-colors">
                    <div className="flex items-center gap-3 sm:flex-col sm:text-center mb-3">
                      <img
                        src={getOptimizedImageUrl(rec.image, { preset: 'thumbnail', width: 140, height: 140 })}
                        alt={rec.name}
                        loading="lazy"
                        decoding="async"
                        className="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded-xl shrink-0 border border-slate-200/80 shadow-xs"
                      />
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate">{rec.name}</h4>
                        <p className="text-primary-700 font-extrabold text-xs mt-0.5">₹{rec.basePrice}</p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        addItem({ id: rec.id!, menuItemId: rec.id!, name: rec.name, price: rec.basePrice, quantity: 1, image: rec.image });
                        toast.success(`Added ${rec.name}`);
                      }}
                      className="w-full bg-primary-600 hover:bg-primary-700 text-champagne py-2 rounded-xl text-xs font-bold transition-colors min-touch-target cursor-pointer shadow-xs active:scale-95"
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
            <div className="bg-white border border-slate-200/80 p-3 rounded-2xl text-center shadow-xs">
              <span className="text-lg block mb-1">🌿</span>
              <p className="text-[11px] font-bold text-slate-800">100% Fresh</p>
              <p className="text-[9px] text-slate-500">Hand-kneaded dough</p>
            </div>
            <div className="bg-white border border-slate-200/80 p-3 rounded-2xl text-center shadow-xs">
              <span className="text-lg block mb-1">🔥</span>
              <p className="text-[11px] font-bold text-slate-800">Piping Hot</p>
              <p className="text-[9px] text-slate-500">Insulated delivery</p>
            </div>
            <div className="bg-white border border-slate-200/80 p-3 rounded-2xl text-center shadow-xs">
              <span className="text-lg block mb-1">🛡️</span>
              <p className="text-[11px] font-bold text-slate-800">Safe Delivery</p>
              <p className="text-[9px] text-slate-500">Contactless option</p>
            </div>
          </div>
        </div>

        {/* Right Column: Checkout Summary, Coupons & Delivery Details (5 Cols Desktop) */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-24">
          
          {/* ── Coupon Section Card ── */}
          <div className="bg-white border border-[#F8E7C9] p-4 sm:p-5 rounded-3xl shadow-xs">
            {appliedCoupon ? (
              <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary-600 text-champagne flex items-center justify-center font-black text-xs shadow-xs">
                    <Tag size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-primary-900 uppercase tracking-wider">{appliedCoupon.code} applied</p>
                    <p className="text-xs text-primary-700 font-medium">You saved ₹{appliedCoupon.discount} on this order</p>
                  </div>
                </div>
                <button 
                  onClick={handleRemoveCoupon}
                  className="text-xs font-bold text-slate-500 hover:text-red-600 underline transition-colors cursor-pointer"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Tag size={16} className="text-primary-600" /> Apply Coupon
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="Enter Promo Code"
                    className="flex-1 bg-[#FAF8F5] border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 uppercase tracking-wider focus:outline-none focus:border-primary-600 focus:bg-white transition-colors"
                  />
                  <button
                    onClick={handleApplyCoupon}
                    className="bg-primary-600 hover:bg-primary-700 text-champagne text-xs font-bold px-4 py-2.5 rounded-xl transition-colors min-touch-target cursor-pointer shadow-xs active:scale-95"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Bill Details Card ── */}
          <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-xs space-y-3">
            <h2 className="text-base font-bold text-slate-900 mb-4">Bill Details</h2>
            
            <div className="flex justify-between text-xs text-slate-500">
              <span>Subtotal</span>
              <span className="text-slate-900 font-bold">₹{subtotal}</span>
            </div>

            {appliedCoupon && (
              <div className="flex justify-between text-xs text-emerald-700 font-bold">
                <span>Coupon Discount</span>
                <span>-₹{couponDiscount}</span>
              </div>
            )}

            <div className="flex justify-between text-xs text-slate-500">
              <span>Delivery Fee</span>
              <span className="text-slate-900 font-bold">₹{deliveryFee}</span>
            </div>

            <div className="flex justify-between text-xs text-slate-500">
              <span>Taxes & Charges (5% GST)</span>
              <span className="text-slate-900 font-bold">₹{taxes}</span>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
              <div>
                <p className="text-sm font-black text-slate-900">To Pay</p>
                <p className="text-[10px] text-slate-500">Includes all applicable taxes</p>
              </div>
              <span className="text-2xl font-black text-primary-800 tracking-tight">₹{finalTotal}</span>
            </div>

            {/* Desktop Proceed Button */}
            <button
              onClick={handleProceed}
              className="hidden lg:flex w-full mt-4 bg-primary-600 hover:bg-primary-700 text-champagne py-4 rounded-2xl font-bold transition-all shadow-md shadow-primary-900/15 active:scale-98 items-center justify-center gap-2 text-base cursor-pointer"
            >
              Proceed to Checkout <ArrowRight size={18} />
            </button>
          </div>

          {/* ── Deliver To Address Preview Card ── */}
          <div className="bg-white border border-slate-200 p-4 sm:p-5 rounded-3xl shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin size={14} className="text-primary-600" /> Deliver To
              </span>
              <button 
                type="button"
                onClick={() => openLocationModal()} 
                className="text-xs font-bold text-primary-700 hover:text-primary-800 hover:underline cursor-pointer"
              >
                Change
              </button>
            </div>
            <p className="text-xs font-bold text-slate-900 truncate">
              {activeAddress ? activeAddress.split(',')[0] : (user?.fullAddress || user?.full_address || "Set Delivery Location")}
            </p>
            <p className="text-[11px] text-slate-500 line-clamp-2">
              {activeAddress || user?.fullAddress || user?.full_address || "Tap Change to choose a saved address or add a new delivery location"}
            </p>

            <div className="pt-2 border-t border-slate-100">
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Delivery Instruction</label>
              <input
                type="text"
                value={deliveryInstruction}
                onChange={(e) => setDeliveryInstruction(e.target.value)}
                placeholder="e.g. Leave at door, don't ring bell"
                className="w-full bg-[#FAF8F5] border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-primary-600 focus:bg-white transition-colors"
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
        <div className="pointer-events-auto bg-[#064E3B] text-white border border-champagne/30 rounded-2xl p-3 flex items-center justify-between shadow-[0_8px_30px_rgba(6,78,59,0.35)] backdrop-blur-xl">
          <div className="pl-2">
            <p className="text-[10px] text-champagne/80 font-bold uppercase tracking-wider">Total to pay</p>
            <p className="text-xl font-black text-champagne leading-none mt-0.5">
              ₹{finalTotal}
            </p>
          </div>
          <button
            onClick={handleProceed}
            className="min-touch-target bg-champagne hover:bg-champagne/90 text-primary-950 px-6 py-3 rounded-xl font-black flex items-center gap-2 shadow-sm active:scale-95 transition-all text-sm cursor-pointer"
          >
            Checkout
            <ArrowRight className="w-4 h-4 text-primary-950" />
          </button>
        </div>
      </div>

      {/* ── Cross-Franchise Cart Mismatch Modal (Section 3c) ── */}
      <AnimatePresence>
        {showFranchiseMismatch && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-dark-900 border border-amber-500/30 rounded-3xl p-6 max-w-md w-full text-center space-y-4 shadow-2xl"
            >
              <div className="w-14 h-14 mx-auto rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-black text-white">Different Store Location</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Your cart contains items from a different Olive Pizza location. Would you like to start a new cart for your current location?
              </p>
              <div className="pt-2 flex flex-col gap-2">
                <button
                  onClick={() => {
                    clearCart();
                    if (resolvedFranchiseInfo) {
                      setFranchiseId(resolvedFranchiseInfo.id);
                    }
                    setShowFranchiseMismatch(false);
                    toast.success('Started a fresh cart for your location');
                    navigate('/menu');
                  }}
                  className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-dark-950 font-black text-sm transition-all shadow-lg active:scale-95"
                >
                  Start New Cart
                </button>
                <button
                  onClick={() => {
                    setShowFranchiseMismatch(false);
                    navigate('/onboarding/location');
                  }}
                  className="w-full py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-sm transition-all"
                >
                  Keep Previous Location
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PageTransition>
    </>
  );
}
