import React, { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router";
import { 
  Flame, Leaf, MapPin, ChevronRight, Plus, 
  ArrowRight, Star, Award, ShieldCheck, Gift,
  Search, Utensils
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
    <div className="w-full text-slate-100 antialiased selection:bg-[#FF6B00] selection:text-white bg-[#06070A] min-h-screen pt-20 md:pt-24">
      
      {/* ── 1. Food-App Native Header: Location & Store Status ──────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-2 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Deliver To Location with Click-to-Change */}
          <Link
            to={isAuthenticated ? "/dashboard" : "/profile"}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 backdrop-blur-md transition-colors group"
          >
            <MapPin className="w-3.5 h-3.5 text-[#FF6B00] shrink-0" />
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 font-medium">Deliver to:</span>
              <span className="font-bold text-white truncate max-w-[130px] sm:max-w-[220px] group-hover:text-orange-300 transition-colors">
                {userLocationText}
              </span>
            </div>
            <ChevronRight className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </Link>

          {/* Kitchen Live Status & Speed Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.03] border border-white/5 backdrop-blur-md">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isStoreOpen ? "bg-emerald-400" : "bg-amber-400"
              }`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                isStoreOpen ? "bg-emerald-500" : "bg-amber-500"
              }`} />
            </span>
            <span className="text-[11px] text-slate-200 font-semibold">
              {statusMessage}
            </span>
            <span className="h-3 w-px bg-white/20 hidden sm:inline-block" />
            <span className="text-[11px] text-amber-400 font-medium hidden sm:inline-flex items-center gap-1">
              <Flame className="w-3 h-3 text-orange-500" />
              Stone Oven Fresh
            </span>
          </div>
        </div>
      </div>

      {/* ── 2. Quick Search & Category Shortcut Chips ────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 pb-4">
        {/* Search Input Box */}
        <form onSubmit={handleSearchSubmit} className="relative mb-3">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search artisanal pizzas, garlic bread, desserts, drinks..."
            className="w-full h-12 pl-11 pr-24 rounded-2xl bg-white/[0.06] border border-white/10 text-white placeholder-slate-400 text-sm focus:outline-none focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] transition-all backdrop-blur-md"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF6B00] to-orange-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-95"
          >
            Search
          </button>
        </form>

        {/* Quick Shortcut Chips (Horizontal Touch Scrollable) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
          {[
            { label: "All Pizzas", icon: "🍕", link: "/menu?category=pizza" },
            { label: "Signature", icon: "🧀", link: "/menu?category=special" },
            { label: "Sides & Breads", icon: "🥖", link: "/menu?category=sides" },
            { label: "Drinks", icon: "🥤", link: "/menu?category=beverages" },
            { label: "Desserts", icon: "🍰", link: "/menu?category=dessert" },
            { label: "Combos", icon: "🎁", link: "/menu?category=combo" },
            { label: "Pure Veg", icon: "🌿", link: "/menu?veg=1" },
          ].map((chip) => (
            <Link
              key={chip.label}
              to={chip.link}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/[0.04] hover:bg-[#FF6B00]/15 hover:border-[#FF6B00]/40 border border-white/10 text-xs font-semibold text-slate-200 hover:text-white transition-all whitespace-nowrap active:scale-95 shrink-0"
            >
              <span>{chip.icon}</span>
              <span>{chip.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── 3. Compact Daily Special Spotlight Card (High-Conversion Food Banner) ── */}
      {heroProduct && (
        <section className="max-w-7xl mx-auto px-4 sm:px-8 pb-5">
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#1C120C] via-[#161922] to-[#12151C] border border-[#FF6B00]/25 p-4 sm:p-5 shadow-2xl group">
            {/* Ambient Ember Glow */}
            <div className="absolute top-0 right-1/4 w-72 h-72 bg-[#FF6B00]/10 blur-[90px] pointer-events-none rounded-full" />

            <div className="relative z-10 flex flex-col-reverse sm:flex-row items-center justify-between gap-4 sm:gap-6">
              {/* Product Info & CTA */}
              <div className="flex-1 min-w-0 text-left w-full sm:w-auto">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FF6B00]/20 border border-[#FF6B00]/40 text-[#FF8800] text-[10px] font-black uppercase tracking-wider">
                    <Flame className="w-3 h-3 text-[#FF6B00] animate-pulse" />
                    Today's Kitchen Spotlight
                  </span>
                  {(heroProduct.isVegetarian || heroProduct.isVeg) && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
                      <Leaf className="w-3 h-3 text-emerald-400" />
                      Pure Veg
                    </span>
                  )}
                </div>

                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate">
                  {heroProduct.productName || heroProduct.name}
                </h3>

                {heroProduct.description && (
                  <p className="text-xs text-slate-300 line-clamp-1 sm:line-clamp-2 mt-0.5 max-w-lg">
                    {heroProduct.description}
                  </p>
                )}

                {/* Price & Actions Row */}
                <div className="flex flex-wrap items-center gap-4 mt-3">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl sm:text-2xl font-black text-amber-400">
                      ₹{heroProduct.offerPrice && Number(heroProduct.offerPrice) > 0 ? heroProduct.offerPrice : (heroProduct.basePrice || heroProduct.price || 0)}
                    </span>
                    {Number(heroProduct.offerPrice) > 0 && Number(heroProduct.offerPrice) < Number(heroProduct.basePrice || heroProduct.price) && (
                      <span className="text-xs text-slate-500 line-through">
                        ₹{heroProduct.basePrice || heroProduct.price}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleAddToCart(e, heroProduct)}
                      className="px-5 py-2.5 rounded-full bg-gradient-to-r from-[#FF6B00] to-orange-600 hover:from-orange-500 hover:to-amber-500 text-white font-extrabold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-[0_4px_16px_rgba(255,107,0,0.4)] active:scale-95 transition-all min-h-[40px]"
                    >
                      <span>Add to Cart</span>
                      <Plus className="w-3.5 h-3.5" />
                    </button>

                    <Link
                      to={`/product/${heroProduct.id}`}
                      className="px-4 py-2.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 font-bold text-xs uppercase tracking-wider flex items-center gap-1 transition-all active:scale-95 min-h-[40px]"
                    >
                      <span>Details</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* Real Food Image Card (appetizing, crisp thumbnail) */}
              <div className="relative w-full sm:w-44 sm:h-36 h-36 rounded-2xl overflow-hidden bg-black/60 shrink-0 border border-white/10 shadow-lg group-hover:border-orange-500/40 transition-colors">
                <img
                  src={heroProduct.imageUrl || heroProduct.image || "https://res.cloudinary.com/dxmlvkff1/image/upload/v1786517437/olive-pizza/ai-product-images/dv4uty06rq4tznlpqz2i.jpg"}
                  alt={heroProduct.productName || heroProduct.name}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                {typeof heroProduct.rating === "number" && heroProduct.rating > 0 && (
                  <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-md border border-white/10 text-white text-[10px] font-bold">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <span>{heroProduct.rating.toFixed(1)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

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
                        src={combo.imageUrl || combo.image || "https://res.cloudinary.com/dxmlvkff1/image/upload/v1786517437/olive-pizza/ai-product-images/dv4uty06rq4tznlpqz2i.jpg"}
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

      {/* ── 6. High-Conversion "Explore Full Menu" Callout Banner ──────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 py-6">
        <div className="relative rounded-3xl overflow-hidden p-6 sm:p-8 bg-gradient-to-r from-orange-950/40 via-[#161922] to-amber-950/30 border border-orange-500/20 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center shrink-0">
              <Utensils className="w-7 h-7 text-orange-400" />
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-orange-400 block mb-0.5">
                Complete Wood-Fired Catalog
              </span>
              <h4 className="text-xl sm:text-2xl font-black text-white">
                Looking for something specific?
              </h4>
              <p className="text-xs text-slate-300 mt-1 max-w-xl">
                Browse our entire menu of handcrafted stone-oven pizzas, stuffed crusts, crispy sides, desserts, and refreshing beverages.
              </p>
            </div>
          </div>
          <Link
            to="/menu"
            className="w-full sm:w-auto px-7 py-3 rounded-full bg-gradient-to-r from-[#FF6B00] via-orange-500 to-amber-500 text-white font-extrabold text-sm uppercase tracking-wider shadow-[0_8px_25px_rgba(255,107,0,0.4)] flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all shrink-0 min-h-[46px]"
          >
            <span>Explore Full Menu</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── 7. Active Promo Coupons (Renders ONLY if real coupons exist in DB) ── */}
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
