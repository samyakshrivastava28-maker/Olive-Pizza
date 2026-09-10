import React, { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router";
import { 
  Flame, Leaf, MapPin, ChevronRight, Plus, 
  ArrowRight, Star, Award, Search, ShoppingBag, 
  User, ShieldCheck, Gift
} from "lucide-react";
import { useDataStore } from "../../lib/dataStore";
import { useStoreStatus } from "../../lib/useStoreStatus";
import { useCartStore, useAuthStore } from "../../lib/store";
import { useCartAnimation } from "../ui/CartAnimationProvider";
import { MenuItem } from "../../types/models";
import ProductCustomizationModal from "../menu/ProductCustomizationModal";
import LiveCoupons from "./LiveCoupons";
import LiveAdvertisements from "./LiveAdvertisements";
import TestimonialsCarousel from "./TestimonialsCarousel";
import AppDownloadSection from "./AppDownloadSection";
import CategoryDiscoveryRail from "./CategoryDiscoveryRail";
import PersonalizedProductDiscovery from "./PersonalizedProductDiscovery";
import toast from "react-hot-toast";

export default function StitchMidnightGlowHome() {
  const storeStatus = useStoreStatus();
  const { products, combos } = useDataStore();
  const { items: cartItems, total: cartTotal, addItem } = useCartStore();
  const { user, isAuthenticated } = useAuthStore();
  const { triggerAnimation } = useCartAnimation();
  const navigate = useNavigate();

  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);

  const isStoreOpen = storeStatus.isRestaurantOpen && storeStatus.isWithinBusinessHours;

  // Real location resolution: User address or physical Rajnandgaon store hub
  const userLocationText = useMemo(() => {
    if (user?.fullAddress) {
      const parts = user.fullAddress.split(",");
      return parts[0].trim();
    }
    if (user?.city) {
      return user.city.trim();
    }
    return "Rajnandgaon Central Hub";
  }, [user]);

  // Operational status message strictly derived from storeStatus
  const statusMessage = useMemo(() => {
    if (storeStatus.availabilityMessage) {
      return storeStatus.availabilityMessage;
    }
    if (isStoreOpen) {
      return "Kitchen Open for Orders";
    }
    if (storeStatus.openingTime) {
      return `Kitchen opens at ${storeStatus.openingTime}`;
    }
    return "Restaurant Currently Closed";
  }, [storeStatus, isStoreOpen]);

  // Real featured product to showcase in the Hero section
  const heroProduct = useMemo(() => {
    if (!products || products.length === 0) return null;
    const featured = products.find((p: any) => (p.isFeatured || p.featured) && p.isActive !== false && p.isAvailable !== false);
    if (featured) return featured;
    return products.find((p: any) => p.isActive !== false && p.isAvailable !== false) || null;
  }, [products]);

  const handleAddToCart = useCallback((e: React.MouseEvent, product: any) => {
    e.stopPropagation();

    // If product has variants or customization options, open modal
    const hasVariants = (product.variants && product.variants.length > 0) || 
                        (product.sizes && product.sizes.length > 0) ||
                        (product.crusts && product.crusts.length > 0);
    
    if (hasVariants) {
      setCustomizingItem({
        id: product.id,
        name: product.productName || product.name,
        description: product.description || "",
        category: product.category || "pizza",
        pricingMode: product.pricingMode || "fixed",
        basePrice: Number(product.basePrice || product.price || 0),
        offerPrice: Number(product.offerPrice || 0),
        discountPercentage: Number(product.discountPercentage || 0),
        image: product.imageUrl || product.image || "/images/pizza-placeholder.webp",
        isVegetarian: product.isVegetarian !== undefined ? Boolean(product.isVegetarian) : Boolean(product.isVeg ?? true),
        isAvailable: true,
      });
      return;
    }

    const itemImage = product.imageUrl || product.image || "/images/pizza-placeholder.webp";
    const itemName = product.productName || product.name;
    const finalPrice = Number(product.offerPrice || product.basePrice || product.price || 0);

    triggerAnimation(e, itemImage, () => {
      addItem({
        id: product.id,
        menuItemId: product.id,
        name: itemName,
        price: finalPrice,
        quantity: 1,
        image: itemImage,
        isVegetarian: product.isVegetarian !== undefined ? Boolean(product.isVegetarian) : Boolean(product.isVeg ?? true),
        crust: "Classic Crust",
        size: "Medium"
      });

      toast.success(`Added ${itemName} to cart! 🍕`, {
        style: {
          background: "#0A0A0A",
          color: "#fff",
          border: "1px solid rgba(255, 107, 0, 0.4)",
        },
      });
    });
  }, [addItem, triggerAnimation]);

  const openCustomizer = useCallback((product: any) => {
    setCustomizingItem({
      id: product.id,
      name: product.productName || product.name,
      description: product.description || "",
      category: product.category || "pizza",
      pricingMode: product.pricingMode || "fixed",
      basePrice: Number(product.basePrice || product.price || 0),
      offerPrice: Number(product.offerPrice || 0),
      discountPercentage: Number(product.discountPercentage || 0),
      image: product.imageUrl || product.image || "/images/pizza-placeholder.webp",
      isVegetarian: product.isVegetarian !== undefined ? Boolean(product.isVegetarian) : Boolean(product.isVeg ?? true),
      isAvailable: true,
    });
  }, []);

  return (
    <div className="w-full text-slate-100 antialiased selection:bg-[#FF6B00] selection:text-white bg-[#06070A] min-h-screen">
      
      {/* ── 1. Live Smart Header / Operational Beacon ────────────────── */}
      <header className="sticky top-0 z-40 w-full bg-[#0C0E14]/90 backdrop-blur-xl border-b border-white/5 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3 flex items-center justify-between gap-3">
          {/* Location Selector Beacon */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-[#FF6B00]">
              <MapPin className="w-4 h-4 text-[#FF6B00]" />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-sm font-bold text-white truncate">{userLocationText}</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    isStoreOpen ? "bg-emerald-400" : "bg-amber-400"
                  }`} />
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${
                    isStoreOpen ? "bg-emerald-500" : "bg-amber-500"
                  }`} />
                </span>
                <span className="text-slate-400 truncate text-[11px]">
                  {statusMessage}
                </span>
              </div>
            </div>
          </div>

          {/* Header Action Clusters */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Search Trigger */}
            <button 
              onClick={() => navigate("/menu")}
              aria-label="Search Menu"
              className="w-9 h-9 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-all active:scale-95"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Cart Button with Real Item Count */}
            <Link 
              to="/cart"
              aria-label="View Cart"
              className="relative w-9 h-9 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-all active:scale-95"
            >
              <ShoppingBag className="w-4 h-4" />
              {cartItems.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#FF6B00] text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-[#06070A]">
                  {cartItems.length}
                </span>
              )}
            </Link>

            {/* Profile Avatar */}
            <Link 
              to={isAuthenticated ? "/profile" : "/login"}
              aria-label="Customer Account"
              className="w-9 h-9 rounded-full p-[1.5px] bg-gradient-to-tr from-[#FF6B00] via-[#D4AF37] to-[#50C878] shrink-0 active:scale-95 transition-transform"
            >
              <div className="w-full h-full rounded-full bg-[#111319] flex items-center justify-center text-slate-200 overflow-hidden">
                <User className="w-4 h-4 text-orange-400" />
              </div>
            </Link>
          </div>
        </div>
      </header>

      {/* ── 2. Cinematic Sensory Hero Section ("Hot. Fresh. Made for you.") ─── */}
      <section className="relative w-full overflow-hidden pt-4 pb-8 max-w-7xl mx-auto px-4 sm:px-8">
        {/* Ambient Ember Glow Backing */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-[360px] sm:w-[540px] h-[360px] bg-[#FF6B00]/15 blur-[120px] pointer-events-none rounded-full" />
        <div className="absolute top-1/2 -right-20 w-[300px] h-[300px] bg-emerald-500/10 blur-[100px] pointer-events-none rounded-full" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          
          {/* Left Text & Messaging Column */}
          <div className="lg:col-span-6 flex flex-col justify-center">
            {/* Authentic Brand Quality Badges */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-wrap items-center gap-2 mb-3"
            >
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF6B00]/15 border border-[#FF6B00]/30 text-[#FF8800] text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                <Flame className="w-3.5 h-3.5 text-[#FF6B00] animate-pulse" />
                Wood-Fired Pizzeria
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                <Leaf className="w-3.5 h-3.5 text-emerald-400" />
                Pure Veg Options
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl sm:text-6xl lg:text-7xl font-serif font-black text-white leading-[1.05] tracking-tight mb-4"
            >
              Hot. Fresh. <br />
              <span className="bg-gradient-to-r from-[#FF6B00] via-amber-400 to-[#FF8800] bg-clip-text text-transparent italic">
                Made for you.
              </span>
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-slate-300 text-sm sm:text-base lg:text-lg font-medium max-w-xl mb-6 leading-relaxed"
            >
              Artisanal handcrafted pizzas baked with whole-milk mozzarella, signature sauces, and slow-proved crusts.
            </motion.p>

            {/* Dual Hero CTAs */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-wrap items-center gap-3 mb-6"
            >
              <Link
                to="/menu"
                className="px-8 py-3.5 rounded-full bg-gradient-to-r from-[#FF6B00] via-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-sm uppercase tracking-wider shadow-[0_10px_30px_rgba(255,107,0,0.45)] transition-all hover:scale-105 active:scale-95 flex items-center gap-2 min-h-[48px]"
              >
                <span>{isStoreOpen ? "Order Now" : "View Menu"}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                to="/menu"
                className="px-7 py-3.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 backdrop-blur-xl text-white font-bold text-sm transition-all hover:scale-105 active:scale-95 min-h-[48px] flex items-center gap-2"
              >
                <span>Explore Full Menu</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>
            </motion.div>

            {/* Genuine Quality Pillars */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4 border-t border-white/10 max-w-xl">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-orange-500/15 border border-orange-500/30 flex items-center justify-center shrink-0">
                  <Flame className="w-3.5 h-3.5 text-orange-400" />
                </div>
                <div className="text-xs">
                  <span className="font-bold text-white block text-[11px]">Stone Oven</span>
                  <span className="text-slate-400 text-[10px]">Freshly Baked</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <Leaf className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-xs">
                  <span className="font-bold text-white block text-[11px]">Pure Veg</span>
                  <span className="text-slate-400 text-[10px]">Dedicated Items</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="text-xs">
                  <span className="font-bold text-white block text-[11px]">Real Cheese</span>
                  <span className="text-slate-400 text-[10px]">100% Mozzarella</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <div className="text-xs">
                  <span className="font-bold text-white block text-[11px]">Fresh Delivery</span>
                  <span className="text-slate-400 text-[10px]">Thermal Pack</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Visual Hero Showcase Card: Renders ONLY if real products exist in database */}
          {heroProduct && (
            <div className="lg:col-span-6 relative mt-2 lg:mt-0">
              <div className="relative w-full rounded-3xl overflow-hidden bg-[#161922]/80 backdrop-blur-2xl border border-white/10 p-3 shadow-2xl group">
                <div className="relative w-full h-[260px] sm:h-[340px] rounded-2xl overflow-hidden bg-black/50">
                  <img 
                    src={heroProduct.imageUrl || heroProduct.image || "/images/pizza-placeholder.webp"}
                    alt={heroProduct.productName || heroProduct.name}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#06070A]/95 via-[#06070A]/20 to-transparent pointer-events-none" />

                  {/* Real Rating Badge ONLY if real rating > 0 in database */}
                  {typeof heroProduct.rating === "number" && heroProduct.rating > 0 && (
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#06070A]/85 backdrop-blur-md border border-white/10 text-white text-xs font-bold">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      <span>{heroProduct.rating.toFixed(1)}</span>
                    </div>
                  )}

                  {/* Bottom Card Title & Authoritative Pricing */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#FF6B00] block">
                        {heroProduct.category?.toUpperCase() || "FEATURED"}
                      </span>
                      <h3 className="text-lg sm:text-xl font-serif font-black text-white">
                        {heroProduct.productName || heroProduct.name}
                      </h3>
                    </div>
                    <div className="text-right">
                      {Number(heroProduct.offerPrice) > 0 && Number(heroProduct.offerPrice) < Number(heroProduct.basePrice || heroProduct.price) ? (
                        <>
                          <span className="text-xs text-slate-400 line-through block">
                            ₹{heroProduct.basePrice || heroProduct.price}
                          </span>
                          <span className="text-xl sm:text-2xl font-black text-[#FFB693]">
                            ₹{heroProduct.offerPrice}
                          </span>
                        </>
                      ) : (
                        <span className="text-xl sm:text-2xl font-black text-[#FFB693]">
                          ₹{heroProduct.basePrice || heroProduct.price || 0}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Real Actions underneath Showcase */}
                <div className="grid grid-cols-2 gap-2.5 mt-3">
                  <button
                    onClick={(e) => handleAddToCart(e, heroProduct)}
                    className="w-full h-11 rounded-full bg-gradient-to-r from-[#FF6B00] to-[#FF8800] text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(255,107,0,0.35)] active:scale-95 transition-all"
                  >
                    <span>Add to Cart</span>
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <Link
                    to={`/product/${heroProduct.id}`}
                    className="w-full h-11 rounded-full bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95"
                  >
                    <span>View Details</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </Link>
                </div>
              </div>
            </div>
          )}

        </div>
      </section>

      {/* ── 3. Category Discovery Rail (5-Second Real Product Image Rotation) ── */}
      <CategoryDiscoveryRail />

      {/* ── 4. Smart Personalized Discovery (Guided Experience, NOT dumping 50 items) ── */}
      <PersonalizedProductDiscovery onCustomize={openCustomizer} />

      {/* ── 5. Value Combos (Renders ONLY if real combos exist in DB) ── */}
      {combos && combos.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-8 py-8 border-t border-white/5">
          <div className="flex items-end justify-between mb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-400 mb-1">
                <Gift className="w-3.5 h-3.5 text-amber-400" />
                <span>Pair & Save</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-serif font-black text-white">
                Value Combos
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Curated meal combinations</p>
            </div>
            <Link
              to="/menu?category=combo"
              className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
            >
              <span>All Combos</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {combos.map((combo: any) => {
              const comboPrice = Number(combo.price || combo.basePrice || 0);
              const originalPrice = combo.originalPrice ? Number(combo.originalPrice) : 0;
              const hasComboDiscount = originalPrice > comboPrice;
              const savings = hasComboDiscount ? originalPrice - comboPrice : 0;

              return (
                <div 
                  key={combo.id}
                  className="p-5 rounded-3xl bg-[#161922]/80 border border-white/10 hover:border-[#FF6B00]/40 transition-all flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl group relative overflow-hidden"
                >
                  {hasComboDiscount && (
                    <div className="absolute top-0 right-0 bg-gradient-to-l from-[#FF6B00] to-orange-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-xl shadow">
                      SAVE ₹{savings}
                    </div>
                  )}

                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-black/50 shrink-0">
                      <img
                        src={combo.imageUrl || combo.image || "/images/pizza-placeholder.webp"}
                        alt={combo.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="flex-1 min-w-0 pr-12 sm:pr-0">
                      <h5 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors truncate">
                        {combo.name}
                      </h5>
                      {combo.description && (
                        <p className="text-xs text-slate-400 line-clamp-1">{combo.description}</p>
                      )}
                      
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-lg font-black text-amber-400">₹{comboPrice}</span>
                        {hasComboDiscount && (
                          <span className="text-xs text-slate-500 line-through">₹{originalPrice}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleAddToCart(e, combo)}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-gradient-to-r from-[#FF6B00] to-[#FF8800] text-white font-extrabold text-xs uppercase tracking-wider transition-all shrink-0 hover:scale-105 active:scale-95 shadow-[0_4px_14px_rgba(255,107,0,0.3)] min-h-[42px] flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Combo</span>
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── 6. Active Promo Coupons (Renders ONLY if real coupons exist in DB) ── */}
      <LiveCoupons />

      {/* ── 7. Live Advertisements (Returns null if no active ads) ───── */}
      <LiveAdvertisements />

      {/* ── 8. Verified Customer Reviews (Returns null if no approved reviews) ── */}
      <TestimonialsCarousel />

      {/* ── 9. Mobile App Download & Delivery Platform Assurance ───── */}
      <AppDownloadSection />

      {/* ── 10. Persistent Floating Cart Pill (Shows ONLY if items in cart) ── */}
      {cartItems.length > 0 && (
        <div className="fixed bottom-20 sm:bottom-8 left-0 right-0 z-40 px-4 max-w-lg mx-auto pointer-events-none">
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 25 }}
            className="pointer-events-auto w-full p-3 px-5 rounded-full bg-[#161922]/95 backdrop-blur-2xl border border-[#FF6B00]/40 flex items-center justify-between shadow-[0_15px_35px_rgba(0,0,0,0.85)]"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#FF6B00] flex items-center justify-center text-white shrink-0 shadow-md">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-white">
                    {cartItems.length} {cartItems.length === 1 ? "Item" : "Items"}
                  </span>
                  <span className="text-slate-500 text-xs">•</span>
                  <span className="text-sm font-black text-[#FFB693]">₹{cartTotal}</span>
                </div>
                <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Cart ready for checkout
                </span>
              </div>
            </div>

            <Link
              to="/cart"
              className="px-5 py-2.5 rounded-full bg-gradient-to-r from-[#FF6B00] to-[#FF8800] text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 active:scale-95 shadow-[0_4px_14px_rgba(255,107,0,0.4)] transition-transform"
            >
              <span>View Cart</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </motion.div>
        </div>
      )}

      {/* ── 11. Product Customization Modal ──────────────────────────── */}
      <ProductCustomizationModal
        item={customizingItem}
        onClose={() => setCustomizingItem(null)}
      />

      {/* Bottom spacing */}
      <div className="h-16 w-full" />
    </div>
  );
}
