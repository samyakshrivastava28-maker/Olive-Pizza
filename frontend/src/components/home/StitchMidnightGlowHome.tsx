import React, { useState, useMemo, useCallback } from "react";
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";
import { Link, useNavigate } from "react-router";
import { 
  Flame, Leaf, MapPin, ChevronRight, Plus, Minus,
  ArrowRight, Star, Award, ShieldCheck, Gift,
  Search, Utensils, Sparkles, Clock, Check
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

// ── Subtle 3D Spatial Tilt Card for Spotlight Product ─────────────────────────
function SpatialTiltCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 260, damping: 24 });
  const mouseYSpring = useSpring(y, { stiffness: 260, damping: 24 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["3deg", "-3deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-3deg", "3deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (typeof window !== "undefined" && window.matchMedia && !window.matchMedia("(hover: hover)").matches) {
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    x.set(mouseX / width - 0.5);
    y.set(mouseY / height - 0.5);
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
      className={`transition-shadow duration-300 will-change-transform ${className}`}
    >
      {children}
    </motion.div>
  );
}

export default function StitchMidnightGlowHome() {
  const storeStatus = useStoreStatus();
  const { products, combos } = useDataStore();
  const { items, addItem, updateQuantity, removeItem } = useCartStore();
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
    if (!storeStatus.isRestaurantOpen) return "Store Closed • Opens Tomorrow";
    if (!storeStatus.isWithinBusinessHours) return "Closed • Next Slot 11:00 AM";
    return "Fired Up • 25–35m Delivery";
  }, [storeStatus]);

  // Featured / Spotlight Hero Product: Pick Daily Chef Special or best-selling pizza
  const heroProduct = useMemo(() => {
    if (!products || products.length === 0) return null;
    return products.find(p => p.isDailySpecial || p.isSpecial || p.isChefSpecial) ||
           products.find(p => p.isPopular || p.isBestseller) ||
           products[0];
  }, [products]);

  // Hero product in-cart state
  const inCartHero = heroProduct
    ? items.find((i) => i.id === heroProduct.id || i.menuItemId === heroProduct.id)
    : null;
  const heroQty = inCartHero?.quantity || 0;

  // Safe Add to Cart handler with zero-latency state commitment + physical flight
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

      toast.success(`Added ${itemName}! 🍕`, {
        duration: 1800,
        style: {
          background: "#1C1917",
          color: "#FFFFFF",
          borderRadius: "14px",
          fontWeight: 600,
          fontSize: "13px",
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
    <div className="w-full text-stone-900 antialiased bg-[#FDFBF7] min-h-screen pt-20 md:pt-24 relative selection:bg-red-600 selection:text-white">
      
      {/* ── 1. Top Delivery & Kitchen Status Header Bar ─────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-2 pb-3 relative z-20">
        <motion.div 
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-between gap-2 p-2 sm:p-2.5 rounded-2xl bg-white border border-stone-200/90 shadow-[0_4px_16px_-2px_rgba(28,25,23,0.05)]"
        >
          {/* Deliver To Location */}
          <Link
            to={isAuthenticated ? "/profile" : "/login"}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-stone-50 transition-colors group active:scale-98 min-w-0"
          >
            <div className="w-7 h-7 rounded-lg bg-red-50 border border-red-200/80 flex items-center justify-center text-red-600 shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="flex flex-col text-left min-w-0">
              <span className="text-[10px] uppercase font-black text-stone-400 tracking-wider leading-none">Deliver To</span>
              <span className="font-extrabold text-xs sm:text-sm text-stone-900 truncate max-w-[150px] sm:max-w-[260px] group-hover:text-red-600 transition-colors mt-0.5">
                {userLocationText}
              </span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:translate-x-0.5 group-hover:text-stone-700 transition-all shrink-0 ml-0.5" />
          </Link>

          {/* Kitchen Live Status Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-50 border border-stone-200/80 shrink-0">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isStoreOpen ? "bg-emerald-500" : "bg-amber-500"
              }`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                isStoreOpen ? "bg-emerald-600" : "bg-amber-600"
              }`} />
            </span>
            <span className="text-xs font-bold text-stone-800 tracking-tight">
              {statusMessage}
            </span>
            <span className="h-3 w-px bg-stone-300 hidden sm:inline-block" />
            <span className="text-[11px] text-red-700 font-bold hidden sm:inline-flex items-center gap-1">
              <Flame className="w-3 h-3 text-red-600" />
              <span>Wood-Fired Hub</span>
            </span>
          </div>
        </motion.div>
      </div>

      {/* ── 2. High-Precision Search Bar & Shortcut Pills ───────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 pb-5 relative z-20">
        <form 
          onSubmit={handleSearchSubmit} 
          className="relative mb-3 group"
        >
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 group-focus-within:text-red-600 transition-colors pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search artisan pizzas, cheesy garlic breads, drinks, desserts..."
            className="w-full h-12 pl-11 pr-24 sm:pr-28 rounded-2xl bg-white border border-stone-200 text-stone-900 placeholder-stone-400 text-xs sm:text-sm focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-500/15 transition-all shadow-[0_4px_16px_-2px_rgba(28,25,23,0.05)]"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3.5 sm:px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider transition-all shadow-sm active:scale-95 flex items-center gap-1 cursor-pointer"
          >
            <span>Search</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </form>

        {/* Category Shortcut Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {[
            { label: "All Pizzas", icon: "🍕", link: "/menu?category=pizza" },
            { label: "Signature Specials", icon: "🧀", link: "/menu?category=special" },
            { label: "Sides & Breads", icon: "🥖", link: "/menu?category=sides" },
            { label: "Cold Beverages", icon: "🥤", link: "/menu?category=beverages" },
            { label: "Sweet Desserts", icon: "🍰", link: "/menu?category=dessert" },
            { label: "Value Combos", icon: "🎁", link: "/menu?category=combo" },
            { label: "100% Veg Only", icon: "🌿", link: "/menu?veg=1" },
          ].map((chip, index) => (
            <Link
              key={chip.label}
              to={chip.link}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 text-xs font-bold text-stone-700 hover:text-red-600 transition-all whitespace-nowrap active:scale-95 shadow-xs shrink-0"
            >
              <span className="text-sm">{chip.icon}</span>
              <span>{chip.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── 3. Kitchen Spotlight Hero Card ──────────────────────────── */}
      {heroProduct && (
        <section className="max-w-7xl mx-auto px-4 sm:px-8 pb-6 relative z-10">
          <SpatialTiltCard className="relative rounded-3xl overflow-hidden bg-white border border-stone-200/90 p-5 sm:p-7 shadow-[0_8px_30px_-4px_rgba(28,25,23,0.08)] group">
            <div className="relative z-10 flex flex-col-reverse md:flex-row items-center justify-between gap-6 sm:gap-8">
              {/* Product Info & Actions */}
              <div className="flex-1 min-w-0 text-left w-full md:w-auto">
                <div className="flex flex-wrap items-center gap-2 mb-2.5">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-700 text-[10px] font-black uppercase tracking-wider">
                    <Flame className="w-3.5 h-3.5 text-red-600" />
                    Kitchen Spotlight
                  </span>

                  {(heroProduct.isVegetarian || heroProduct.isVeg) && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      <Leaf className="w-3 h-3 text-emerald-600" />
                      100% Veg
                    </span>
                  )}

                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    Wood-Fired
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-stone-900 tracking-tight leading-tight group-hover:text-red-600 transition-colors">
                  {heroProduct.productName || heroProduct.name}
                </h2>

                {heroProduct.description && (
                  <p className="text-xs sm:text-sm text-stone-600 line-clamp-2 mt-2 max-w-xl font-normal leading-relaxed">
                    {heroProduct.description}
                  </p>
                )}

                {/* Price & Action Row */}
                <div className="flex flex-wrap items-center gap-4 mt-5 pt-3 border-t border-stone-100">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-black text-stone-900">
                      ₹{heroProduct.offerPrice && Number(heroProduct.offerPrice) > 0 ? heroProduct.offerPrice : (heroProduct.basePrice || heroProduct.price || 0)}
                    </span>
                    {Number(heroProduct.offerPrice) > 0 && Number(heroProduct.offerPrice) < Number(heroProduct.basePrice || heroProduct.price) && (
                      <span className="text-xs text-stone-400 line-through font-medium">
                        ₹{heroProduct.basePrice || heroProduct.price}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {heroQty > 0 ? (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 shadow-xs"
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (heroQty <= 1) {
                              removeItem(heroProduct.id);
                            } else {
                              updateQuantity(heroProduct.id, heroQty - 1);
                            }
                          }}
                          className="w-8 h-8 rounded-xl bg-white text-red-600 hover:bg-red-600 hover:text-white flex items-center justify-center font-black text-xs transition-colors shadow-xs active:scale-90"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="font-black text-sm min-w-[16px] text-center">{heroQty}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerAnimation(e, heroProduct.imageUrl || heroProduct.image || "", () => {
                              updateQuantity(heroProduct.id, heroQty + 1);
                            });
                          }}
                          className="w-8 h-8 rounded-xl bg-red-600 text-white hover:bg-red-700 flex items-center justify-center font-black text-xs transition-colors shadow-xs active:scale-90"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => handleAddToCart(e, heroProduct)}
                        className="px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm shadow-red-500/20 active:scale-95 transition-all min-h-[44px] cursor-pointer"
                      >
                        <span>Add to Cart</span>
                        <Plus className="w-4 h-4" />
                      </button>
                    )}

                    <Link
                      to={`/product/${heroProduct.id}`}
                      className="px-4 py-3 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95 min-h-[44px]"
                    >
                      <span>View</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* Elevated Product Imagery with Real Food Photography */}
              <div className="relative w-full md:w-64 md:h-52 h-48 rounded-2xl overflow-hidden bg-stone-100 shrink-0 border border-stone-200 shadow-md group-hover:border-red-300 transition-all">
                <img
                  src={heroProduct.imageUrl || heroProduct.image || "/images/pizza-placeholder.webp"}
                  alt={heroProduct.productName || heroProduct.name}
                  className="w-full h-full object-cover object-center group-hover:scale-106 transition-transform duration-500"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500";
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-900/40 via-transparent to-transparent pointer-events-none" />
                
                {typeof heroProduct.rating === "number" && heroProduct.rating > 0 && (
                  <div className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-md border border-stone-100 text-stone-900 text-[11px] font-black shadow-md">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span>{heroProduct.rating.toFixed(1)}</span>
                  </div>
                )}
              </div>
            </div>
          </SpatialTiltCard>
        </section>
      )}

      {/* ── 4. Category Discovery Rail ──────────────────────────────── */}
      <CategoryDiscoveryRail />

      {/* ── 5. Smart Personalized Product Discovery Grid ────────────── */}
      <PersonalizedProductDiscovery onCustomize={openCustomizer} />

      {/* ── 6. Value Combos ─────────────────────────────────────────── */}
      {combos && combos.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-8 py-8 border-t border-stone-200/80">
          <div className="flex items-end justify-between mb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-red-600 mb-1">
                <Gift className="w-3.5 h-3.5 text-red-600" />
                <span>Pair & Save More</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-serif font-black text-stone-900">
                Curated Value Combos
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">Special pairings designed for feasts & parties</p>
            </div>
            <Link
              to="/menu?category=combo"
              className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1"
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

              const inCartCombo = items.find((item) => item.id === combo.id);
              const comboQty = inCartCombo?.quantity || 0;

              return (
                <div 
                  key={combo.id}
                  className="p-5 rounded-3xl bg-white border border-stone-200/90 shadow-[0_4px_20px_-2px_rgba(28,25,23,0.06)] hover:shadow-md transition-all flex flex-col sm:flex-row items-center justify-between gap-5 group relative overflow-hidden"
                >
                  {hasComboDiscount && (
                    <div className="absolute top-0 right-0 bg-red-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-2xl shadow-xs">
                      SAVE ₹{savings}
                    </div>
                  )}

                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-stone-100 shrink-0 border border-stone-200">
                      <img
                        src={combo.imageUrl || combo.image || "/images/pizza-placeholder.webp"}
                        alt={combo.name}
                        className="w-full h-full object-cover group-hover:scale-106 transition-transform duration-500"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500";
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0 pr-12 sm:pr-0">
                      <h5 className="text-base font-bold text-stone-900 group-hover:text-red-600 transition-colors truncate">
                        {combo.name}
                      </h5>
                      {combo.description && (
                        <p className="text-xs text-stone-500 line-clamp-1 mt-0.5">{combo.description}</p>
                      )}
                      
                      <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-lg sm:text-xl font-black text-stone-900">₹{comboPrice}</span>
                        {hasComboDiscount && (
                          <span className="text-xs text-stone-400 line-through font-medium">₹{originalPrice}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {comboQty > 0 ? (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-2 px-2 py-1 rounded-xl bg-red-50 border border-red-200 text-red-700 shadow-xs shrink-0"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (comboQty <= 1) {
                            removeItem(combo.id);
                          } else {
                            updateQuantity(combo.id, comboQty - 1);
                          }
                        }}
                        className="w-6 h-6 rounded-lg bg-white text-red-600 hover:bg-red-600 hover:text-white flex items-center justify-center font-black text-xs transition-colors shadow-xs active:scale-90"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-black text-xs min-w-[14px] text-center">{comboQty}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          triggerAnimation(e, combo.imageUrl || combo.image || "", () => {
                            updateQuantity(combo.id, comboQty + 1);
                          });
                        }}
                        className="w-6 h-6 rounded-lg bg-red-600 text-white hover:bg-red-700 flex items-center justify-center font-black text-xs transition-colors shadow-xs active:scale-90"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => handleAddToCart(e, combo)}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider transition-all shrink-0 active:scale-95 shadow-xs flex items-center justify-center gap-1.5 cursor-pointer min-h-[38px]"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Combo</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── 7. Explore Full Menu Callout Banner ──────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 py-6">
        <div className="relative rounded-3xl overflow-hidden p-6 sm:p-8 bg-stone-900 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6 border border-stone-800">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-red-600 flex items-center justify-center shrink-0 shadow-lg text-white">
              <Utensils className="w-7 h-7" />
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-amber-400 block mb-1">
                Handcrafted Stone-Oven Menu
              </span>
              <h4 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Craving your exact pizza style?
              </h4>
              <p className="text-xs sm:text-sm text-stone-300 mt-1 max-w-xl font-normal leading-relaxed">
                Explore our full line-up of fresh sourdough pizzas, gourmet stuffed crusts, sizzling appetizers, and desserts.
              </p>
            </div>
          </div>
          <Link
            to="/menu"
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all shrink-0 min-h-[44px] cursor-pointer"
          >
            <span>Explore Full Menu</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── 8. Active Promo Coupons ─────────────────────────────────── */}
      <LiveCoupons />

      {/* ── 9. Live Advertisements ──────────────────────────────────── */}
      <LiveAdvertisements />

      {/* ── 10. Verified Customer Reviews ────────────────────────────── */}
      <TestimonialsCarousel />

      {/* ── 11. Mobile App Download & Delivery Assurance ────────────── */}
      <AppDownloadSection />

      {/* ── 12. Product Customization Modal ──────────────────────────── */}
      <ProductCustomizationModal
        item={customizingItem}
        onClose={() => setCustomizingItem(null)}
      />

      {/* Bottom safe spacing for floating cart */}
      <div className="h-20 w-full" />
    </div>
  );
}
