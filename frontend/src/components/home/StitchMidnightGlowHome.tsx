import React, { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router";
import { 
  Sparkles, Flame, Leaf, MapPin, ChevronRight, Plus, 
  ArrowRight, Star, Clock, ShieldCheck, Award, Zap, Heart
} from "lucide-react";
import { useDataStore } from "../../lib/dataStore";
import { useStoreStatus } from "../../lib/useStoreStatus";
import { useCartStore, useAuthStore } from "../../lib/store";
import { useCartAnimation } from "../ui/CartAnimationProvider";
import { MenuItem } from "../../types/models";
import ProductCustomizationModal from "../menu/ProductCustomizationModal";
import LiveCoupons from "./LiveCoupons";
import PreviouslyOrdered from "./PreviouslyOrdered";
import LiveAdvertisements from "./LiveAdvertisements";
import TestimonialsCarousel from "./TestimonialsCarousel";
import AppDownloadSection from "./AppDownloadSection";
import toast from "react-hot-toast";

export default function StitchMidnightGlowHome() {
  const storeStatus = useStoreStatus();
  const { products, combos } = useDataStore();
  const { addItem } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const { triggerAnimation } = useCartAnimation();
  const navigate = useNavigate();

  // Interactive UI state
  const [pureVegOnly, setPureVegOnly] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);

  const isStoreOpen = storeStatus.isRestaurantOpen && storeStatus.isWithinBusinessHours;

  // Filter real products by Veg and Category
  const filteredProducts = useMemo(() => {
    return (products || [])
      .filter((p: any) => {
        if (p.isActive === false || p.isComboOnly) return false;
        if (pureVegOnly && !p.isVegetarian && p.isVeg !== true) return false;
        if (selectedCategory !== "all") {
          const cat = (p.category || "").toLowerCase();
          if (!cat.includes(selectedCategory.toLowerCase())) return false;
        }
        return true;
      });
  }, [products, pureVegOnly, selectedCategory]);

  // Categories list with dynamic item counts
  const categoryTabs = useMemo(() => {
    const counts: Record<string, number> = {
      all: 0, pizza: 0, burger: 0, pasta: 0, side: 0, combo: combos?.length || 0, dessert: 0, beverage: 0
    };

    (products || []).forEach((p: any) => {
      if (p.isActive === false || p.isComboOnly) return;
      if (pureVegOnly && !p.isVegetarian && p.isVeg !== true) return;
      counts.all++;
      const cat = (p.category || "").toLowerCase();
      if (cat.includes("pizza")) counts.pizza++;
      else if (cat.includes("burger")) counts.burger++;
      else if (cat.includes("pasta")) counts.pasta++;
      else if (cat.includes("side") || cat.includes("bread") || cat.includes("garlic")) counts.side++;
      else if (cat.includes("dessert") || cat.includes("cake") || cat.includes("sweet")) counts.dessert++;
      else if (cat.includes("beverage") || cat.includes("drink") || cat.includes("mojito")) counts.beverage++;
    });

    return [
      { id: "all", label: "All Items", icon: "✨", count: counts.all },
      { id: "pizza", label: "Artisan Pizza", icon: "🍕", count: counts.pizza },
      { id: "combo", label: "Value Combos", icon: "🔥", count: counts.combo },
      { id: "burger", label: "Burgers", icon: "🍔", count: counts.burger },
      { id: "pasta", label: "Pastas", icon: "🍝", count: counts.pasta },
      { id: "side", label: "Sides & Breads", icon: "🥖", count: counts.side },
      { id: "dessert", label: "Desserts", icon: "🍰", count: counts.dessert },
      { id: "beverage", label: "Drinks", icon: "🥤", count: counts.beverage },
    ];
  }, [products, combos, pureVegOnly]);

  const handleAddToCart = useCallback((e: React.MouseEvent, product: any) => {
    e.stopPropagation();

    // If product has variants/customization options, open modal
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
        image: product.imageUrl || product.image || "https://res.cloudinary.com/dxmlvkff1/image/upload/v1786517437/olive-pizza/ai-product-images/dv4uty06rq4tznlpqz2i.jpg",
        isVegetarian: product.isVegetarian !== undefined ? Boolean(product.isVegetarian) : Boolean(product.isVeg ?? true),
        isAvailable: true,
      });
      return;
    }

    const itemImage = product.imageUrl || product.image || "https://res.cloudinary.com/dxmlvkff1/image/upload/v1786517437/olive-pizza/ai-product-images/dv4uty06rq4tznlpqz2i.jpg";
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

  return (
    <div className="w-full text-slate-100 antialiased selection:bg-amber-500 selection:text-black">
      {/* ── 1. Live Kitchen Signal & Operational Beacon ────────────────── */}
      <div className="w-full pt-20 sm:pt-24 md:pt-28 px-4 sm:px-8 max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 py-2.5 px-4 rounded-2xl bg-white/[0.03] border border-white/8 backdrop-blur-xl">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isStoreOpen ? "bg-emerald-400" : "bg-amber-400"
              }`} />
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                isStoreOpen ? "bg-emerald-500" : "bg-amber-500"
              }`} />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              {isStoreOpen ? "Live Wood-Fired Kitchen Active" : "Kitchen Opens 11:00 AM (Pre-orders Open)"}
            </span>
            <span className="hidden sm:inline-block text-slate-500">•</span>
            <span className="hidden sm:inline-flex items-center gap-1 text-xs text-amber-400 font-semibold">
              <Zap className="w-3 h-3 fill-amber-400" />
              <span>30-Min Fast Delivery</span>
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <MapPin className="w-3.5 h-3.5 text-orange-400 shrink-0" />
            <span className="font-medium">Rajnandgaon Central Hub</span>
          </div>
        </div>
      </div>

      {/* ── 2. Cinematic Sensory Hero Section ("Pizza from the Stars") ─── */}
      <section className="relative w-full min-h-[460px] sm:min-h-[520px] md:min-h-[580px] overflow-hidden flex items-end mt-4">
        {/* Background Image with spatial gradient overlay */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <img
            src="https://res.cloudinary.com/dxmlvkff1/image/upload/f_auto,q_auto:best,w_1920/v1783008946/olive-pizza-hero-background_d9rbzc.webp"
            alt="Artisanal wood-fired pizza with molten mozzarella pull and sweet basil"
            className="w-full h-full object-cover object-center scale-105 transform-gpu"
          />
          {/* Gradient Overlays for high readability and spatial depth */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#06070a] via-[#06070a]/65 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#06070a] via-transparent to-[#06070a]/50" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-600/15 blur-[100px] rounded-full" />
          <div className="absolute bottom-10 right-10 w-80 h-80 bg-amber-500/15 blur-[100px] rounded-full" />
        </div>

        {/* Hero Content Container */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 pb-12 sm:pb-16 w-full">
          {/* Operational Signal Capsules */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-wrap items-center gap-2.5 mb-4"
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/40 backdrop-blur-md text-[11px] font-extrabold uppercase tracking-wider text-orange-300 shadow-[0_0_15px_rgba(249,115,22,0.2)]">
              <Flame className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
              Live Wood-Fired Oven
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 backdrop-blur-md text-[11px] font-extrabold uppercase tracking-wider text-emerald-300">
              <Leaf className="w-3.5 h-3.5 text-emerald-400" />
              100% Pure Veg Dedicated Station
            </span>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 backdrop-blur-md text-[11px] font-extrabold uppercase tracking-wider text-amber-300">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              4.9★ Rated in Rajnandgaon
            </span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-6xl md:text-7xl font-serif font-black text-white leading-[1.06] tracking-tight mb-4 drop-shadow-2xl"
          >
            Pizza from the <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-200 bg-clip-text text-transparent">Stars.</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-slate-300 text-sm sm:text-lg md:text-xl font-medium max-w-2xl mb-8 leading-relaxed drop-shadow"
          >
            Hand-stretched 48-hour fermented sourdough, sweet Italian San Marzano sauce, and 100% pure Fior di Latte mozzarella blistered over flamed beechwood.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-wrap items-center gap-3.5"
          >
            <Link
              to="/menu"
              className="px-8 py-4 rounded-full bg-gradient-to-r from-[#FF6B00] via-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-sm uppercase tracking-wider shadow-[0_10px_35px_rgba(255,107,0,0.4)] transition-all hover:scale-105 active:scale-95 flex items-center gap-2 min-h-[48px]"
            >
              <span>{isStoreOpen ? "Order Now" : "Explore Menu"}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/menu?category=pizza"
              className="px-7 py-4 rounded-full bg-white/10 hover:bg-white/15 border border-white/20 backdrop-blur-xl text-white font-bold text-sm transition-all hover:scale-105 min-h-[48px] flex items-center gap-2"
            >
              <span>Artisan Crusts</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </Link>
          </motion.div>

          {/* Quick Value Guarantees Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-8 pt-6 border-t border-white/10 max-w-4xl">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-orange-500/15 border border-orange-500/30 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 text-orange-400" />
              </div>
              <div className="text-xs">
                <span className="font-bold text-white block">30 Min Delivery</span>
                <span className="text-slate-400 text-[11px]">Guaranteed Hot</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <Leaf className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-xs">
                <span className="font-bold text-white block">100% Pure Veg</span>
                <span className="text-slate-400 text-[11px]">Separate Prep</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                <Award className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-xs">
                <span className="font-bold text-white block">Real Mozzarella</span>
                <span className="text-slate-400 text-[11px]">No Analogues</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-xs">
                <span className="font-bold text-white block">Contactless</span>
                <span className="text-slate-400 text-[11px]">Safety Sealed</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. Interactive Filter Bar & Pure Veg Switch ────────────────── */}
      <section className="sticky top-16 z-30 bg-[#06070a]/90 backdrop-blur-xl border-y border-white/5 py-3.5 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-base sm:text-lg font-serif font-black text-white tracking-tight flex items-center gap-2">
              <span>Curated Menu</span>
              <span className="text-xs font-normal text-slate-400">({filteredProducts.length} items)</span>
            </h2>
          </div>

          {/* Tactile Pure Veg Toggle Switch */}
          <div 
            role="button"
            tabIndex={0}
            onClick={() => setPureVegOnly(!pureVegOnly)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setPureVegOnly(!pureVegOnly); }}
            className={`flex items-center gap-2.5 px-4 py-2 rounded-full cursor-pointer border transition-all duration-300 select-none min-h-[44px] ${
              pureVegOnly 
                ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.35)]"
                : "bg-white/5 border-white/10 text-slate-300 hover:border-white/25 hover:bg-white/10"
            }`}
          >
            <div className="w-4 h-4 border-2 border-emerald-400 flex items-center justify-center rounded-sm shrink-0">
              <div className="w-2 h-2 bg-emerald-400 rounded-full" />
            </div>
            <span className="text-xs font-extrabold uppercase tracking-wider">100% Pure Veg</span>
            <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${pureVegOnly ? "bg-emerald-500" : "bg-slate-700"}`}>
              <div className={`w-3 h-3 rounded-full bg-white transition-transform duration-200 ${pureVegOnly ? "translate-x-4" : "translate-x-0"}`} />
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. Horizontal Category Tabs (Glowing Amber Rings) ─────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 pb-2">
        <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto pb-3 scrollbar-none">
          {categoryTabs.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border transition-all duration-300 shrink-0 select-none outline-none active:scale-95 ${
                  isActive
                    ? "bg-gradient-to-r from-orange-500/20 to-amber-500/20 border-[#FF6B00] text-white shadow-[0_0_20px_rgba(255,107,0,0.35)]"
                    : "bg-white/[0.04] border-white/8 hover:border-white/20 text-slate-400 hover:text-white"
                }`}
              >
                <span className="text-lg">{cat.icon}</span>
                <span className="text-xs font-extrabold tracking-wide">{cat.label}</span>
                {cat.count > 0 && (
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                    isActive ? "bg-[#FF6B00] text-white" : "bg-white/10 text-slate-400"
                  }`}>
                    {cat.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* ── 5. Active Promo Coupons ────────────────────────────────────── */}
      <LiveCoupons />

      {/* ── 6. Masterpieces of Crust & Flame (Product Grid) ─────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-400 mb-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Chef's Masterpieces</span>
            </div>
            <h3 className="text-2xl sm:text-4xl font-serif font-black text-white tracking-tight">
              Wood-Fired Creations
            </h3>
          </div>

          <Link
            to="/menu"
            className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
          >
            <span>Full Menu ({filteredProducts.length})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 px-4 rounded-3xl bg-white/[0.02] border border-white/5">
            <span className="text-4xl block mb-3">🍕</span>
            <h4 className="text-lg font-bold text-white mb-1">No items found</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
              {pureVegOnly ? "Try turning off the 100% Pure Veg filter to see more options." : "No dishes matching this category."}
            </p>
            {pureVegOnly && (
              <button
                onClick={() => setPureVegOnly(false)}
                className="px-5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all"
              >
                Show All Menu Items
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.slice(0, 12).map((product: any) => {
              const basePrice = Number(product.basePrice || product.price || 299);
              const offerPrice = Number(product.offerPrice || 0);
              const discountPercentage = Number(product.discountPercentage || 0);
              const finalPrice = offerPrice > 0 ? offerPrice : discountPercentage > 0 ? Math.round(basePrice * (1 - discountPercentage / 100)) : basePrice;

              const isVeg = product.isVegetarian !== undefined ? Boolean(product.isVegetarian) : Boolean(product.isVeg ?? true);
              const imgUrl = product.imageUrl || product.image || "https://res.cloudinary.com/dxmlvkff1/image/upload/v1786517437/olive-pizza/ai-product-images/dv4uty06rq4tznlpqz2i.jpg";
              const realRating = typeof product.rating === "number" && product.rating > 0 ? product.rating.toFixed(1) : "4.8";

              return (
                <motion.div
                  key={product.id}
                  whileHover={{ y: -6, scale: 1.01 }}
                  transition={{ type: "spring", stiffness: 350, damping: 24 }}
                  onClick={() => navigate(`/product/${product.id}`)}
                  className="group relative rounded-3xl overflow-hidden bg-gradient-to-b from-white/[0.06] to-white/[0.015] border border-white/10 hover:border-[#FF6B00]/40 transition-all duration-300 flex flex-col justify-between shadow-xl cursor-pointer"
                >
                  {/* Food Image Container */}
                  <div className="relative w-full h-52 sm:h-56 overflow-hidden bg-black/40">
                    <img
                      src={imgUrl}
                      alt={product.productName || product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#06070a] via-transparent to-transparent opacity-80" />

                    {/* Top Badges */}
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      <div className="w-5 h-5 bg-black/80 backdrop-blur-md rounded-md border border-white/20 flex items-center justify-center shadow">
                        <div className={`w-2 h-2 rounded-full ${isVeg ? "bg-emerald-400" : "bg-red-500"}`} />
                      </div>
                      {isVeg && (
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 backdrop-blur-md">
                          Pure Veg
                        </span>
                      )}
                      {discountPercentage > 0 && (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-orange-500/20 border border-orange-500/40 text-orange-300 backdrop-blur-md">
                          {discountPercentage}% OFF
                        </span>
                      )}
                    </div>

                    {/* Top Right Rating */}
                    <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-md border border-amber-400/40 text-amber-400 text-xs font-black px-2.5 py-1 rounded-full flex items-center gap-1 shadow">
                      <Star className="w-3 h-3 fill-amber-400" />
                      <span>{realRating}</span>
                    </div>
                  </div>

                  {/* Card Details */}
                  <div className="p-5 flex flex-col justify-between flex-1">
                    <div>
                      <h4 className="text-lg font-serif font-black text-white group-hover:text-amber-300 transition-colors line-clamp-1 mb-1.5">
                        {product.productName || product.name}
                      </h4>
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
                        {product.description || "Handcrafted wood-fired artisan pizza with melting mozzarella blend and fresh herb seasonings."}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-white/5 mt-auto">
                      <div>
                        {finalPrice < basePrice ? (
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-xl font-black text-white">₹{finalPrice}</span>
                            <span className="text-xs text-slate-500 line-through">₹{basePrice}</span>
                          </div>
                        ) : (
                          <span className="text-xl font-black text-white">₹{basePrice}</span>
                        )}
                        <span className="text-[10px] text-slate-400 block font-semibold">Freshly Prepared</span>
                      </div>

                      <button
                        onClick={(e) => handleAddToCart(e, product)}
                        className="px-5 py-2.5 rounded-full bg-gradient-to-r from-[#FF6B00] to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-orange-500/25 flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 min-h-[44px] min-w-[80px] justify-center"
                      >
                        <Plus className="w-4 h-4" />
                        <span>ADD</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── 7. Value Feasts & Combos ───────────────────────────────────── */}
      {combos && combos.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-8 py-8 border-t border-white/5">
          <div className="flex items-end justify-between mb-6">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-amber-400 block mb-1">
                Pair & Save
              </span>
              <h3 className="text-2xl sm:text-3xl font-serif font-black text-white">
                Artisanal Value Combos
              </h3>
            </div>
            <span className="text-xs text-slate-400 hidden sm:block">Perfect for 2-4 Foodies</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {combos.slice(0, 4).map((combo: any) => (
              <div 
                key={combo.id}
                className="p-5 rounded-3xl bg-white/[0.04] border border-white/10 hover:border-amber-500/40 transition-all flex items-center justify-between gap-4 shadow-lg group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-black/40 shrink-0">
                    <img
                      src={combo.imageUrl || combo.image || "https://res.cloudinary.com/dxmlvkff1/image/upload/v1786517437/olive-pizza/ai-product-images/dv4uty06rq4tznlpqz2i.jpg"}
                      alt={combo.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 mb-1 inline-block">
                      Value Feast
                    </span>
                    <h5 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors">{combo.name}</h5>
                    <p className="text-xs text-slate-400 line-clamp-1">{combo.description || "Curated feast combo pack"}</p>
                    <span className="text-lg font-black text-amber-400 mt-1 block">₹{combo.price || combo.basePrice || 499}</span>
                  </div>
                </div>

                <button
                  onClick={(e) => handleAddToCart(e, combo)}
                  className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-[#FF6B00] text-white font-extrabold text-xs uppercase tracking-wider transition-all shrink-0 hover:scale-105 active:scale-95 min-h-[44px]"
                >
                  + Add
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 8. Previously Ordered (Personalized for Authenticated Users) ── */}
      {isAuthenticated && (
        <PreviouslyOrdered />
      )}

      {/* ── 9. Live Advertisements / Featured Specials ─────────────────── */}
      <LiveAdvertisements />

      {/* ── 10. Customer Love & Reviews ─────────────────────────────────── */}
      <TestimonialsCarousel />

      {/* ── 11. Mobile App Download & Delivery Assurance ───────────────── */}
      <AppDownloadSection />

      {/* ── 12. Product Customization Modal ────────────────────────────── */}
      <ProductCustomizationModal
        item={customizingItem}
        onClose={() => setCustomizingItem(null)}
      />

      {/* Safe bottom padding to prevent overlap with floating cart or bottom nav */}
      <div className="h-16 w-full" />
    </div>
  );
}
