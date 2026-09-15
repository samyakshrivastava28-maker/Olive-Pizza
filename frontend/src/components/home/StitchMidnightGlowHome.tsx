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

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["7deg", "-7deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-7deg", "7deg"]);

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
      image: product.imageUrl || product.image || "https://res.cloudinary.com/dxmlvkff1/image/upload/v1786517437/olive-pizza/ai-product-images/dv4uty06rq4tznlpqz2i.jpg",
      isVegetarian: product.isVegetarian !== undefined ? Boolean(product.isVegetarian) : Boolean(product.isVeg ?? true),
      isAvailable: true,
    });
  }, []);

  return (
    <div className="w-full text-slate-100 antialiased selection:bg-[#FF6B00] selection:text-white bg-[#06070A] min-h-screen pt-20 md:pt-24 relative overflow-hidden">
      
      {/* ── Spatial Depth Ambient Background Glows ────────────────────── */}
      <div className="absolute top-10 left-1/4 -translate-x-1/2 w-[550px] h-[550px] bg-orange-600/10 blur-[140px] pointer-events-none rounded-full" />
      <div className="absolute top-80 right-10 w-[450px] h-[450px] bg-emerald-600/5 blur-[140px] pointer-events-none rounded-full" />

      {/* ── 1. Food-App Native Header: Floating Location & Kitchen Status Pill ──────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-2 pb-4 relative z-20">
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex flex-wrap items-center justify-between gap-3 p-2 sm:p-2.5 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-2xl shadow-[0_15px_35px_rgba(0,0,0,0.4)]"
        >
          {/* Deliver To Location with Click-to-Change */}
          <Link
            to={isAuthenticated ? "/profile" : "/login"}
            className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 hover:border-orange-500/30 backdrop-blur-md transition-all group active:scale-95"
          >
            <div className="w-6 h-6 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400 group-hover:scale-110 transition-transform">
              <MapPin className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider leading-none">Deliver To</span>
              <span className="font-extrabold text-xs text-white truncate max-w-[130px] sm:max-w-[220px] group-hover:text-orange-300 transition-colors mt-0.5">
                {userLocationText}
              </span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 group-hover:text-white transition-all ml-1" />
          </Link>

          {/* Kitchen Live Status & Speed Pill */}
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-md">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isStoreOpen ? "bg-emerald-400" : "bg-amber-400"
              }`} />
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                isStoreOpen ? "bg-emerald-500" : "bg-amber-500"
              }`} />
            </span>
            <span className="text-xs text-slate-200 font-bold tracking-tight">
              {statusMessage}
            </span>
            <span className="h-3.5 w-px bg-white/10 hidden sm:inline-block" />
            <span className="text-[11px] text-amber-400 font-semibold hidden sm:inline-flex items-center gap-1.5">
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
          transition={{ duration: 0.45, delay: 0.05 }}
          onSubmit={handleSearchSubmit} 
          className="relative mb-3 group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 via-transparent to-amber-500/10 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-orange-400 transition-colors pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search artisanal pizzas, garlic bread, desserts, drinks..."
            className="w-full h-13 pl-11 pr-28 rounded-2xl bg-white/[0.04] hover:bg-white/[0.06] border border-white/10 text-white placeholder-slate-400 text-sm focus:outline-none focus:border-[#FF6B00] focus:ring-2 focus:ring-[#FF6B00]/20 transition-all backdrop-blur-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-5 py-2 rounded-xl bg-gradient-to-r from-[#FF6B00] to-orange-600 hover:from-orange-500 hover:to-amber-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-orange-500/30 hover:scale-105 active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <span>Search</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </motion.form>

        {/* Quick Shortcut Chips (Touch Scrollable with Spring micro-interactions) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
          {[
            { label: "All Pizzas", icon: "🍕", link: "/menu?category=pizza" },
            { label: "Signature", icon: "🧀", link: "/menu?category=special" },
            { label: "Sides & Breads", icon: "🥖", link: "/menu?category=sides" },
            { label: "Drinks", icon: "🥤", link: "/menu?category=beverages" },
            { label: "Desserts", icon: "🍰", link: "/menu?category=dessert" },
            { label: "Combos", icon: "🎁", link: "/menu?category=combo" },
            { label: "Pure Veg", icon: "🌿", link: "/menu?veg=1" },
          ].map((chip, index) => (
            <motion.div
              key={chip.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: 0.05 * index }}
            >
              <Link
                to={chip.link}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-white/[0.03] hover:bg-[#FF6B00]/15 hover:border-[#FF6B00]/40 border border-white/10 text-xs font-bold text-slate-200 hover:text-white transition-all whitespace-nowrap active:scale-95 shadow-sm hover:shadow-[0_8px_20px_rgba(255,107,0,0.15)] shrink-0"
              >
                <span className="text-sm">{chip.icon}</span>
                <span>{chip.label}</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── 3. Antigravity 3D Spatial Spotlight Card ──────────────────────── */}
      {heroProduct && (
        <section className="max-w-7xl mx-auto px-4 sm:px-8 pb-6 relative z-10">
          <SpatialTiltCard className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-black/80 via-[#13151D]/90 to-[#0A0B10]/95 border border-white/10 hover:border-orange-500/40 p-5 sm:p-7 shadow-[0_30px_70px_rgba(0,0,0,0.8),0_0_50px_rgba(255,107,0,0.1)] group">
            {/* Ambient Internal Backlight */}
            <div className="absolute top-0 right-1/4 w-80 h-80 bg-gradient-to-br from-orange-500/20 via-amber-500/10 to-transparent blur-[80px] pointer-events-none rounded-full" />

            <div className="relative z-10 flex flex-col-reverse sm:flex-row items-center justify-between gap-6 sm:gap-8">
              {/* Product Info & Call to Actions */}
              <div className="flex-1 min-w-0 text-left w-full sm:w-auto">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <motion.span 
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/40 text-orange-400 text-[10px] font-black uppercase tracking-wider shadow-sm"
                  >
                    <Flame className="w-3.5 h-3.5 text-orange-500" />
                    Kitchen Spotlight
                  </motion.span>

                  {(heroProduct.isVegetarian || heroProduct.isVeg) && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
                      <Leaf className="w-3 h-3 text-emerald-400" />
                      100% Veg
                    </span>
                  )}

                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300 text-[10px] font-bold">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    Fresh Dough Hand-Stretched
                  </span>
                </div>

                <h3 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight group-hover:text-amber-200 transition-colors">
                  {heroProduct.productName || heroProduct.name}
                </h3>

                {heroProduct.description && (
                  <p className="text-xs sm:text-sm text-slate-300 line-clamp-2 mt-1.5 max-w-xl font-normal leading-relaxed">
                    {heroProduct.description}
                  </p>
                )}

                {/* Price, Savings & Sequenced Cart CTA */}
                <div className="flex flex-wrap items-center gap-5 mt-4 pt-3 border-t border-white/5">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-amber-300 via-orange-400 to-primary-500 bg-clip-text text-transparent">
                      ₹{heroProduct.offerPrice && Number(heroProduct.offerPrice) > 0 ? heroProduct.offerPrice : (heroProduct.basePrice || heroProduct.price || 0)}
                    </span>
                    {Number(heroProduct.offerPrice) > 0 && Number(heroProduct.offerPrice) < Number(heroProduct.basePrice || heroProduct.price) && (
                      <span className="text-xs text-slate-500 line-through font-medium">
                        ₹{heroProduct.basePrice || heroProduct.price}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={(e) => handleAddToCart(e, heroProduct)}
                      className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#FF6B00] via-orange-500 to-amber-500 hover:from-orange-500 hover:to-amber-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-[0_8px_25px_rgba(255,107,0,0.4)] hover:shadow-[0_12px_35px_rgba(255,107,0,0.6)] hover:scale-105 active:scale-95 transition-all min-h-[44px] cursor-pointer"
                    >
                      <span>Add to Cart</span>
                      <Plus className="w-4 h-4" />
                    </button>

                    <Link
                      to={`/product/${heroProduct.id}`}
                      className="px-4 py-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 border border-white/10 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 min-h-[44px]"
                    >
                      <span>View</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* Elevated Floating Product Imagery with 3D Popout */}
              <motion.div 
                whileHover={{ scale: 1.04, rotate: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="relative w-full sm:w-56 sm:h-48 h-44 rounded-3xl overflow-hidden bg-black/60 shrink-0 border border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.8)] group-hover:border-orange-500/50 transition-all"
              >
                <img
                  src={heroProduct.imageUrl || heroProduct.image || "https://res.cloudinary.com/dxmlvkff1/image/upload/v1786517437/olive-pizza/ai-product-images/dv4uty06rq4tznlpqz2i.jpg"}
                  alt={heroProduct.productName || heroProduct.name}
                  className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                
                {typeof heroProduct.rating === "number" && heroProduct.rating > 0 && (
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-md border border-white/15 text-white text-[11px] font-black shadow-md">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span>{heroProduct.rating.toFixed(1)}</span>
                  </div>
                )}
              </motion.div>
            </div>
          </SpatialTiltCard>
        </section>
      )}

      {/* ── 4. Category Discovery Rail (Interactive Rotating Product Showcase) ── */}
      <CategoryDiscoveryRail />

      {/* ── 5. Smart Personalized Product Discovery ───────────────────────── */}
      <PersonalizedProductDiscovery onCustomize={openCustomizer} />

      {/* ── 6. Value Combos (Weightless Floating Glass Cards) ──────────────── */}
      {combos && combos.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-8 py-8 border-t border-white/5">
          <div className="flex items-end justify-between mb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-400 mb-1">
                <Gift className="w-3.5 h-3.5 text-amber-400" />
                <span>Pair & Save More</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-serif font-black text-white">
                Curated Value Combos
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Special pairings designed for feasts & parties</p>
            </div>
            <Link
              to="/menu?category=combo"
              className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 hover:translate-x-0.5 transition-transform"
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
                  transition={{ duration: 0.45, delay: 0.08 * i }}
                  whileHover={{ y: -4 }}
                  className="p-5 rounded-3xl bg-gradient-to-br from-[#161922]/90 to-[#0F1117]/95 border border-white/10 hover:border-orange-500/40 transition-all flex flex-col sm:flex-row items-center justify-between gap-5 shadow-[0_20px_50px_rgba(0,0,0,0.6)] group relative overflow-hidden backdrop-blur-xl"
                >
                  {hasComboDiscount && (
                    <div className="absolute top-0 right-0 bg-gradient-to-l from-[#FF6B00] to-orange-600 text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-1 rounded-bl-2xl shadow-lg">
                      SAVE ₹{savings}
                    </div>
                  )}

                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-black/50 shrink-0 border border-white/5 shadow-md">
                      <img
                        src={combo.imageUrl || combo.image || "https://res.cloudinary.com/dxmlvkff1/image/upload/v1786517437/olive-pizza/ai-product-images/dv4uty06rq4tznlpqz2i.jpg"}
                        alt={combo.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    </div>
                    <div className="flex-1 min-w-0 pr-12 sm:pr-0">
                      <h5 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors truncate">
                        {combo.name}
                      </h5>
                      {combo.description && (
                        <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{combo.description}</p>
                      )}
                      
                      <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-xl font-black text-amber-400">₹{comboPrice}</span>
                        {hasComboDiscount && (
                          <span className="text-xs text-slate-500 line-through">₹{originalPrice}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleAddToCart(e, combo)}
                    className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-[#FF6B00] to-orange-600 hover:from-orange-500 hover:to-amber-500 text-white font-black text-xs uppercase tracking-wider transition-all shrink-0 hover:scale-105 active:scale-95 shadow-[0_6px_20px_rgba(255,107,0,0.35)] min-h-[44px] flex items-center justify-center gap-1.5 cursor-pointer"
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

      {/* ── 7. Spatial Gradient Tunnel Callout: Explore Full Menu ─────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 py-6">
        <motion.div 
          whileHover={{ scale: 1.01 }}
          transition={{ duration: 0.3 }}
          className="relative rounded-3xl overflow-hidden p-6 sm:p-9 bg-gradient-to-r from-orange-950/40 via-[#161922] to-amber-950/40 border border-orange-500/25 shadow-[0_25px_60px_rgba(0,0,0,0.8),0_0_40px_rgba(255,107,0,0.1)] flex flex-col sm:flex-row items-center justify-between gap-6 backdrop-blur-2xl"
        >
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 border border-orange-500/30 flex items-center justify-center shrink-0 shadow-lg">
              <Utensils className="w-8 h-8 text-orange-400" />
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-orange-400 block mb-1">
                Handcrafted Stone-Oven Menu
              </span>
              <h4 className="text-xl sm:text-3xl font-black text-white tracking-tight">
                Craving your exact pizza style?
              </h4>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl font-normal leading-relaxed">
                Explore our full line-up of fresh dough pizzas, gourmet stuffed crusts, sizzling appetizers, and decadent desserts.
              </p>
            </div>
          </div>
          <Link
            to="/menu"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-[#FF6B00] via-orange-500 to-amber-500 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-[0_10px_30px_rgba(255,107,0,0.4)] flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all shrink-0 min-h-[48px] cursor-pointer"
          >
            <span>Explore Full Menu</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </section>

      {/* ── 8. Active Promo Coupons ─────────────────────────────────────── */}
      <LiveCoupons />

      {/* ── 7. Live Advertisements (Returns null if no active ads) ───── */}
      <LiveAdvertisements />

      {/* ── 8. Verified Customer Reviews (Returns null if no approved reviews) ── */}
      <TestimonialsCarousel />

      {/* ── 9. Mobile App Download & Delivery Platform Assurance ───── */}
      <AppDownloadSection />


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
