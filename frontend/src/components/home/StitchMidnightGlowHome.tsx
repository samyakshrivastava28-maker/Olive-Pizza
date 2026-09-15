import React, { useState, useMemo, useCallback } from "react";
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";
import { Link, useNavigate } from "react-router";
import { 
  Flame, Leaf, MapPin, ChevronRight, Plus, 
  ArrowRight, Star, Award, ShieldCheck, Gift,
  Search, Utensils, Sparkles, Clock, Compass
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

// ── 3D Tilt Card Container for Spotlight Product ──────────────────────────────
function SpatialTiltCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 20 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["5deg", "-5deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-5deg", "5deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      }}
      className={`transition-shadow duration-500 will-change-transform ${className}`}
    >
      {children}
    </motion.div>
  );
}

export default function StitchMidnightGlowHome() {
  const storeStatus = useStoreStatus();
  const { products, combos } = useDataStore();
  const { addItem } = useCartStore();
  const { user, isAuthenticated } = useAuthStore();
  const { triggerAnimation } = useCartAnimation();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/menu?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate("/menu?search=1");
    }
  };

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

  // Dynamic status text
  const statusMessage = useMemo(() => {
    if (storeStatus.isLoading) return "Checking Kitchen...";
    if (!storeStatus.isRestaurantOpen) return "Store Closed — Opens Tomorrow";
    if (!storeStatus.isWithinBusinessHours) return "Closed — Next Slot 11:00 AM";
    return "Wood-Fired Ovens Fired Up • 25-35m Delivery";
  }, [storeStatus]);

  // Featured / Spotlight Hero Product: Pick Daily Chef Special or best-selling pizza
  const heroProduct = useMemo(() => {
    if (!products || products.length === 0) return null;
    return products.find(p => p.isDailySpecial || p.isSpecial || p.isChefSpecial) ||
           products.find(p => p.isPopular || p.isBestseller) ||
           products[0];
  }, [products]);

  // Safe 5-Step Add to Cart handler with sound and animation trigger
  const handleAddToCart = useCallback((e: React.MouseEvent, product: any) => {
    e.stopPropagation();
    
    // If product has multiple sizes or crusts, open modal instead of raw add
    const hasVariants = product.sizes?.length > 1 || 
                        product.crusts?.length > 1 || 
                        (product.sizeOptions && Object.keys(product.sizeOptions).length > 1);
    
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
          background: "#1E293B",
          color: "#fff",
          borderRadius: "16px",
          border: "1px solid rgba(249, 115, 22, 0.4)",
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
    <div className="w-full text-slate-900 antialiased bg-[#FAF7F2] min-h-screen pt-20 md:pt-24 relative overflow-hidden selection:bg-rose-500 selection:text-white">
      
      {/* ── Warm Food Delivery Ambient Backdrops ────────────────────── */}
      <div className="absolute top-10 left-1/4 -translate-x-1/2 w-[550px] h-[550px] bg-orange-200/40 blur-[130px] pointer-events-none rounded-full" />
      <div className="absolute top-80 right-10 w-[450px] h-[450px] bg-red-200/30 blur-[130px] pointer-events-none rounded-full" />

      {/* ── 1. Food-App Native Header: Floating Location & Kitchen Status Pill ──────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-2 pb-4 relative z-20">
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="flex flex-wrap items-center justify-between gap-3 p-2 sm:p-2.5 rounded-3xl bg-white/90 border border-orange-100/80 backdrop-blur-xl shadow-[0_10px_30px_rgba(249,115,22,0.06)]"
        >
          {/* Deliver To Location with Click-to-Change */}
          <Link
            to={isAuthenticated ? "/profile" : "/login"}
            className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-orange-50/70 hover:bg-orange-100/70 border border-orange-100 backdrop-blur-md transition-all group active:scale-95"
          >
            <div className="w-6 h-6 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-600 group-hover:scale-110 transition-transform">
              <MapPin className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider leading-none">Deliver To</span>
              <span className="font-extrabold text-xs text-slate-800 truncate max-w-[130px] sm:max-w-[220px] group-hover:text-orange-600 transition-colors mt-0.5">
                {userLocationText}
              </span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 group-hover:text-slate-800 transition-all ml-1" />
          </Link>

          {/* Kitchen Live Status & Speed Pill */}
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-orange-50/50 border border-orange-100/60">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isStoreOpen ? "bg-emerald-400" : "bg-amber-400"
              }`} />
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                isStoreOpen ? "bg-emerald-500" : "bg-amber-500"
              }`} />
            </span>
            <span className="text-xs text-slate-700 font-bold tracking-tight">
              {statusMessage}
            </span>
            <span className="h-3.5 w-px bg-slate-200 hidden sm:inline-block" />
            <span className="text-[11px] text-orange-600 font-bold hidden sm:inline-flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
              <span>Wood-Fired Hub</span>
            </span>
          </div>
        </motion.div>
      </div>

      {/* ── 2. Ethereal Search Bar & Quick Category Shortcut Chips ────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 pb-5 relative z-20">
        {/* Floating Glass Search Input */}
        <motion.form 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          onSubmit={handleSearchSubmit} 
          className="relative mb-3 group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-orange-400/20 via-red-400/10 to-amber-400/20 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-red-500 transition-colors pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search wood-fired pizzas, cheesy garlic breads, drinks, desserts..."
            className="w-full h-13 pl-11 pr-28 rounded-2xl bg-white border border-orange-200/80 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all shadow-[0_10px_25px_rgba(249,115,22,0.06)]"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-red-500/25 hover:scale-105 active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <span>Search</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </motion.form>

        {/* Quick Shortcut Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
          {[
            { label: "All Pizzas", icon: "🍕", link: "/menu?category=pizza" },
            { label: "Signature Special", icon: "🧀", link: "/menu?category=special" },
            { label: "Sides & Breads", icon: "🥖", link: "/menu?category=sides" },
            { label: "Cold Beverages", icon: "🥤", link: "/menu?category=beverages" },
            { label: "Sweet Desserts", icon: "🍰", link: "/menu?category=dessert" },
            { label: "Value Combos", icon: "🎁", link: "/menu?category=combo" },
            { label: "100% Veg Only", icon: "🌿", link: "/menu?veg=1" },
          ].map((chip, index) => (
            <motion.div
              key={chip.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.04 * index }}
            >
              <Link
                to={chip.link}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-white hover:bg-red-50 hover:border-red-300 border border-orange-100 text-xs font-bold text-slate-700 hover:text-red-600 transition-all whitespace-nowrap active:scale-95 shadow-sm shrink-0"
              >
                <span className="text-sm">{chip.icon}</span>
                <span>{chip.label}</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── 3. 3D Spatial Kitchen Spotlight Card ──────────────────────── */}
      {heroProduct && (
        <section className="max-w-7xl mx-auto px-4 sm:px-8 pb-6 relative z-10">
          <SpatialTiltCard className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-white via-[#FFFDF9] to-[#FFF7EE] border-2 border-orange-100 p-5 sm:p-7 shadow-[0_20px_50px_rgba(249,115,22,0.08)] group">
            {/* Ambient Internal Backlight */}
            <div className="absolute top-0 right-1/4 w-80 h-80 bg-gradient-to-br from-orange-200/40 via-red-100/30 to-transparent blur-[60px] pointer-events-none rounded-full" />

            <div className="relative z-10 flex flex-col-reverse sm:flex-row items-center justify-between gap-6 sm:gap-8">
              {/* Product Info & Actions */}
              <div className="flex-1 min-w-0 text-left w-full sm:w-auto">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <motion.span 
                    animate={{ y: [0, -3, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100/80 border border-red-200 text-red-700 text-[10px] font-black uppercase tracking-wider shadow-sm"
                  >
                    <Flame className="w-3.5 h-3.5 text-red-600" />
                    Kitchen Spotlight
                  </motion.span>

                  {(heroProduct.isVegetarian || heroProduct.isVeg) && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100/80 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                      <Leaf className="w-3 h-3 text-emerald-600" />
                      100% Veg
                    </span>
                  )}

                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100/80 border border-orange-200 text-orange-800 text-[10px] font-bold">
                    <Sparkles className="w-3 h-3 text-orange-500" />
                    Fresh Wood-Fired
                  </span>
                </div>

                <h3 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight group-hover:text-red-600 transition-colors">
                  {heroProduct.productName || heroProduct.name}
                </h3>

                {heroProduct.description && (
                  <p className="text-xs sm:text-sm text-slate-600 line-clamp-2 mt-1.5 max-w-xl font-normal leading-relaxed">
                    {heroProduct.description}
                  </p>
                )}

                {/* Price, Savings & Sequenced Cart CTA */}
                <div className="flex flex-wrap items-center gap-5 mt-4 pt-3 border-t border-orange-100/80">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-black text-red-600">
                      ₹{heroProduct.offerPrice && Number(heroProduct.offerPrice) > 0 ? heroProduct.offerPrice : (heroProduct.basePrice || heroProduct.price || 0)}
                    </span>
                    {Number(heroProduct.offerPrice) > 0 && Number(heroProduct.offerPrice) < Number(heroProduct.basePrice || heroProduct.price) && (
                      <span className="text-xs text-slate-400 line-through font-medium">
                        ₹{heroProduct.basePrice || heroProduct.price}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={(e) => handleAddToCart(e, heroProduct)}
                      className="px-6 py-3 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md shadow-red-500/25 hover:scale-105 active:scale-95 transition-all min-h-[44px] cursor-pointer"
                    >
                      <span>Add to Cart</span>
                      <Plus className="w-4 h-4" />
                    </button>

                    <Link
                      to={`/product/${heroProduct.id}`}
                      className="px-4 py-3 rounded-2xl bg-white hover:bg-orange-50 text-slate-700 border border-slate-200 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 min-h-[44px]"
                    >
                      <span>View</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* Elevated Floating Product Imagery */}
              <motion.div 
                whileHover={{ scale: 1.04, rotate: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="relative w-full sm:w-56 sm:h-48 h-44 rounded-3xl overflow-hidden bg-slate-100 shrink-0 border border-orange-100 shadow-[0_15px_35px_rgba(249,115,22,0.12)] group-hover:border-red-300 transition-all"
              >
                <img
                  src={heroProduct.imageUrl || heroProduct.image || "/images/pizza-placeholder.webp"}
                  alt={heroProduct.productName || heroProduct.name}
                  className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                
                {typeof heroProduct.rating === "number" && heroProduct.rating > 0 && (
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-md border border-slate-100 text-slate-900 text-[11px] font-black shadow-md">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span>{heroProduct.rating.toFixed(1)}</span>
                  </div>
                )}
              </motion.div>
            </div>
          </SpatialTiltCard>
        </section>
      )}

      {/* ── 4. Category Discovery Rail ──────────────────────────────────── */}
      <CategoryDiscoveryRail />

      {/* ── 5. Smart Personalized Product Discovery ───────────────────────── */}
      <PersonalizedProductDiscovery onCustomize={openCustomizer} />

      {/* ── 6. Value Combos ──────────────────────────────────────────────── */}
      {combos && combos.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-8 py-8 border-t border-orange-100/60">
          <div className="flex items-end justify-between mb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-red-600 mb-1">
                <Gift className="w-3.5 h-3.5 text-red-600" />
                <span>Pair & Save More</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-serif font-black text-slate-900">
                Curated Value Combos
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Special pairings designed for feasts & parties</p>
            </div>
            <Link
              to="/menu?category=combo"
              className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 hover:translate-x-0.5 transition-transform"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {combos.map((combo: any, i: number) => {
              const comboPrice = Number(combo.price || combo.basePrice || 0);
              const originalPrice = combo.originalPrice ? Number(combo.originalPrice) : 0;
              const hasComboDiscount = originalPrice > comboPrice;
              const savings = hasComboDiscount ? originalPrice - comboPrice : 0;

              return (
                <motion.div 
                  key={combo.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: 0.05 * i }}
                  whileHover={{ y: -3 }}
                  className="p-5 rounded-3xl bg-white border border-orange-100 hover:border-red-200 transition-all flex flex-col sm:flex-row items-center justify-between gap-5 shadow-[0_10px_30px_rgba(249,115,22,0.06)] group relative overflow-hidden"
                >
                  {hasComboDiscount && (
                    <div className="absolute top-0 right-0 bg-gradient-to-l from-red-600 to-rose-600 text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-1 rounded-bl-2xl shadow-sm">
                      SAVE ₹{savings}
                    </div>
                  )}

                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-slate-100 shrink-0 border border-orange-100 shadow-sm">
                      <img
                        src={combo.imageUrl || combo.image || "/images/pizza-placeholder.webp"}
                        alt={combo.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    </div>
                    <div className="flex-1 min-w-0 pr-12 sm:pr-0">
                      <h5 className="text-base font-bold text-slate-900 group-hover:text-red-600 transition-colors truncate">
                        {combo.name}
                      </h5>
                      {combo.description && (
                        <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{combo.description}</p>
                      )}
                      
                      <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-xl font-black text-red-600">₹{comboPrice}</span>
                        {hasComboDiscount && (
                          <span className="text-xs text-slate-400 line-through">₹{originalPrice}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleAddToCart(e, combo)}
                    className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white font-black text-xs uppercase tracking-wider transition-all shrink-0 hover:scale-105 active:scale-95 shadow-md shadow-red-500/20 min-h-[44px] flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Combo</span>
                  </button>
                </motion.div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── 7. Explore Full Menu Callout Banner ──────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 py-6">
        <motion.div 
          whileHover={{ scale: 1.01 }}
          transition={{ duration: 0.3 }}
          className="relative rounded-3xl overflow-hidden p-6 sm:p-9 bg-gradient-to-r from-red-600 via-rose-600 to-orange-500 text-white shadow-[0_20px_50px_rgba(225,29,72,0.25)] flex flex-col sm:flex-row items-center justify-between gap-6"
        >
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 shadow-lg">
              <Utensils className="w-8 h-8 text-white" />
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-orange-200 block mb-1">
                Handcrafted Stone-Oven Menu
              </span>
              <h4 className="text-xl sm:text-3xl font-black text-white tracking-tight">
                Craving your exact pizza style?
              </h4>
              <p className="text-xs sm:text-sm text-rose-100 mt-1 max-w-xl font-normal leading-relaxed">
                Explore our full line-up of fresh dough pizzas, gourmet stuffed crusts, sizzling appetizers, and decadent desserts.
              </p>
            </div>
          </div>
          <Link
            to="/menu"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white text-red-600 hover:bg-orange-50 font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all shrink-0 min-h-[48px] cursor-pointer"
          >
            <span>Explore Full Menu</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </section>

      {/* ── 8. Active Promo Coupons ─────────────────────────────────────── */}
      <LiveCoupons />

      {/* ── 9. Live Advertisements ──────────────────────────────────────── */}
      <LiveAdvertisements />

      {/* ── 10. Verified Customer Reviews ────────────────────────────────── */}
      <TestimonialsCarousel />

      {/* ── 11. Mobile App Download & Delivery Assurance ────────────────── */}
      <AppDownloadSection />

      {/* ── 12. Product Customization Modal ──────────────────────────────── */}
      <ProductCustomizationModal
        item={customizingItem}
        onClose={() => setCustomizingItem(null)}
      />

      {/* Bottom spacing */}
      <div className="h-16 w-full" />
    </div>
  );
}
