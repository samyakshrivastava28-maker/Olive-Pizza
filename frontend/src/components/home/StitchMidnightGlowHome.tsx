import React, { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router";
import { 
  Flame, Leaf, MapPin, ChevronRight, Plus, Minus,
  ArrowRight, Star, ShieldCheck, Gift,
  Search, Utensils, Sparkles, Clock, Check, Heart, Shield
} from "lucide-react";
import { useDataStore } from "../../lib/dataStore";
import { useStoreStatus } from "../../lib/useStoreStatus";
import { useCartStore, useAuthStore } from "../../lib/store";
import { useCartAnimation } from "../ui/CartAnimationProvider";
import { MenuItem } from "../../types/models";
import ProductCard from "../ProductCard";
import ProductCustomizationModal from "../menu/ProductCustomizationModal";
import LiveCoupons from "./LiveCoupons";
import LiveAdvertisements from "./LiveAdvertisements";
import CategoryDiscoveryRail from "./CategoryDiscoveryRail";
import toast from "react-hot-toast";

// ── Canonical Fallback Menu Items (Guarantees zero-blank screen if network/IDB lags) ──
const CANONICAL_ITEMS: any[] = [
  {
    id: "0fF6U5KfX87th6ZBk9FO",
    name: "Smoky BBQ pizza",
    productName: "Smoky BBQ pizza",
    category: "pizza",
    description: "Tender smoked barbecue chicken chunks, caramelized onions, artisan mozzarella blend, and hickory glaze.",
    basePrice: 449,
    price: 449,
    image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=700&q=80",
    imageUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=700&q=80",
    isVegetarian: false,
    isVeg: false,
    rating: 4.8,
    isAvailable: true,
    isChefSpecial: true,
  },
  {
    id: "2AUnaWMMpkP3yYICzxP8",
    name: "Spicy Paneer Tikka Feast",
    productName: "Spicy Paneer Tikka Feast",
    category: "pizza",
    description: "Marinated cottage cheese cubes, crisp diced capsicum, red paprika, and roasted tandoori herb sauce.",
    basePrice: 399,
    price: 399,
    image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=700&q=80",
    imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=700&q=80",
    isVegetarian: true,
    isVeg: true,
    rating: 4.9,
    isAvailable: true,
    isPopular: true,
  },
  {
    id: "9PbP0h6J2SvGT5mMkJiF",
    name: "Farmhouse Gourmet Veggie",
    productName: "Farmhouse Gourmet Veggie",
    category: "pizza",
    description: "Golden corn, sliced button mushrooms, juicy bell peppers, and fresh Fior di Latte mozzarella.",
    basePrice: 349,
    price: 349,
    image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=700&q=80",
    imageUrl: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=700&q=80",
    isVegetarian: true,
    isVeg: true,
    rating: 4.7,
    isAvailable: true,
  },
  {
    id: "C7O9DLgD3Tt7Ve6lMHNy",
    name: "Margherita Supreme",
    productName: "Margherita Supreme",
    category: "pizza",
    description: "Authentic San Marzano tomato sauce, fresh buffalo mozzarella, fragrant whole sweet basil, and extra virgin olive oil.",
    basePrice: 250,
    price: 250,
    image: "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=700&q=80",
    imageUrl: "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=700&q=80",
    isVegetarian: true,
    isVeg: true,
    rating: 4.9,
    isAvailable: true,
  },
  {
    id: "ZtHPAvNntOJ6ETL3KpQS",
    name: "Olive Signature Pizza",
    productName: "Olive Signature Pizza",
    category: "pizza",
    description: "Kalamata black olives, Spanish green olives, sun-dried tomatoes, roasted garlic, and artisan feta crumble.",
    basePrice: 299,
    price: 299,
    image: "https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=700&q=80",
    imageUrl: "https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=700&q=80",
    isVegetarian: true,
    isVeg: true,
    rating: 4.8,
    isAvailable: true,
  },
  {
    id: "XjfApxgOtyDNh3GzBGgr",
    name: "Molten Lava Choco Cake",
    productName: "Molten Lava Choco Cake",
    category: "dessert",
    description: "Rich dark Belgian chocolate sponge with a warm oozing chocolate truffle center.",
    basePrice: 129,
    price: 129,
    image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=700&q=80",
    imageUrl: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=700&q=80",
    isVegetarian: true,
    isVeg: true,
    rating: 5.0,
    isAvailable: true,
  },
];

export default function StitchMidnightGlowHome() {
  const storeStatus = useStoreStatus();
  const { products, combos } = useDataStore();
  const { items, addItem, updateQuantity, removeItem } = useCartStore();
  const { user } = useAuthStore();
  const { triggerAnimation } = useCartAnimation();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/menu?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate("/menu?search=1");
    }
  };

  // Location resolution
  const userLocationText = useMemo(() => {
    if (user?.fullAddress) {
      const parts = user.fullAddress.split(",");
      return parts[0].trim();
    }
    if (user?.city) return user.city.trim();
    return "Rajnandgaon Central Hub";
  }, [user]);

  // Combined product catalog
  const catalogProducts = useMemo(() => {
    const list = products && products.length > 0 ? products : CANONICAL_ITEMS;
    return list.map((p) => ({
      ...p,
      name: p.productName || p.name,
      basePrice: Number(p.basePrice || p.price || 0),
      image: p.imageUrl || p.image || "/images/pizza-placeholder.webp",
      isVegetarian: p.isVegetarian !== undefined ? Boolean(p.isVegetarian) : Boolean(p.isVeg ?? true),
      isAvailable: p.isAvailable !== false,
    }));
  }, [products]);

  // Featured Spotlight Hero
  const heroProduct = useMemo(() => {
    return catalogProducts.find((p) => p.isChefSpecial || p.isSpecial) ||
           catalogProducts.find((p) => p.isPopular) ||
           catalogProducts[0];
  }, [catalogProducts]);

  // Filtered menu products for on-page discovery
  const filteredProducts = useMemo(() => {
    let list = catalogProducts;
    if (activeFilter === "veg") {
      list = list.filter((p) => p.isVegetarian);
    } else if (activeFilter === "nonveg") {
      list = list.filter((p) => !p.isVegetarian);
    } else if (activeFilter === "pizza") {
      list = list.filter((p) => p.category === "pizza" || p.name.toLowerCase().includes("pizza"));
    } else if (activeFilter === "dessert") {
      list = list.filter((p) => p.category === "dessert" || p.name.toLowerCase().includes("cake") || p.name.toLowerCase().includes("choco"));
    } else if (activeFilter === "sides") {
      list = list.filter((p) => p.category === "sides" || p.category === "beverages");
    }
    return list;
  }, [catalogProducts, activeFilter]);

  // Hero in-cart state
  const inCartHero = heroProduct
    ? items.find((i) => i.id === heroProduct.id || i.menuItemId === heroProduct.id)
    : null;
  const heroQty = inCartHero?.quantity || 0;

  // Direct Add to Cart handler for hero
  const handleHeroAdd = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!heroProduct) return;

    const imageUrl = heroProduct.image || "/images/pizza-placeholder.webp";
    const finalPrice = Number(heroProduct.offerPrice || heroProduct.basePrice || heroProduct.price || 0);

    triggerAnimation(e, imageUrl, () => {
      addItem({
        id: heroProduct.id,
        menuItemId: heroProduct.id,
        name: heroProduct.name,
        price: finalPrice,
        quantity: 1,
        image: imageUrl,
        isVegetarian: heroProduct.isVegetarian,
        crust: "Classic Sourdough Crust",
        size: "Medium 10\"",
      });

      toast.success(`Added ${heroProduct.name}! 🍕`, {
        duration: 1800,
        style: {
          background: "#18181B",
          color: "#FFFFFF",
          borderRadius: "14px",
          fontWeight: 600,
          fontSize: "13px",
        },
      });
    });
  }, [heroProduct, triggerAnimation, addItem]);

  // Add Combo handler
  const handleAddCombo = useCallback((e: React.MouseEvent, combo: any) => {
    e.stopPropagation();
    const imageUrl = combo.imageUrl || combo.image || "/images/pizza-placeholder.webp";
    const comboPrice = Number(combo.price || combo.basePrice || 0);

    triggerAnimation(e, imageUrl, () => {
      addItem({
        id: combo.id,
        menuItemId: combo.id,
        name: combo.name,
        price: comboPrice,
        quantity: 1,
        image: imageUrl,
        isVegetarian: combo.isVegetarian !== undefined ? Boolean(combo.isVegetarian) : true,
        crust: "Chef's Combo Crust",
        size: "Combo Feast",
      });

      toast.success(`Added ${combo.name}! 🎁`, {
        duration: 1800,
        style: {
          background: "#18181B",
          color: "#FFFFFF",
          borderRadius: "14px",
          fontWeight: 600,
          fontSize: "13px",
        },
      });
    });
  }, [triggerAnimation, addItem]);

  return (
    <div className="w-full flex flex-col gap-6 sm:gap-8 pt-20 md:pt-22 text-stone-900">
      
      {/* ── 1. Top Ordering Context Header ──────────────────────────── */}
      <header className="max-w-7xl mx-auto w-full px-4 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3 py-2 border-b border-stone-200/80">
          {/* Store Location */}
          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-stone-800">
            <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400 leading-none">
                Delivering From
              </span>
              <span className="text-stone-900 font-extrabold flex items-center gap-1">
                {userLocationText}
                <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
              </span>
            </div>
          </div>

          {/* Live Kitchen Status */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Fired Up • 25–30 Min Fresh Delivery</span>
            </span>
          </div>
        </div>

        {/* ── 2. Functional Search Bar ──────────────────────────────── */}
        <form onSubmit={handleSearchSubmit} className="relative mt-4 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 group-focus-within:text-red-600 transition-colors pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search artisan pizzas, cheesy garlic breads, drinks, desserts..."
            className="w-full h-12 pl-11 pr-24 sm:pr-28 rounded-2xl bg-white border border-stone-200 text-stone-900 placeholder-stone-400 text-xs sm:text-sm focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-500/15 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-4 sm:px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs uppercase tracking-wider transition-all shadow-xs active:scale-95 flex items-center gap-1 cursor-pointer"
          >
            <span>Search</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </form>
      </header>

      {/* ── 3. Visual Category Discovery Rail ───────────────────────── */}
      <CategoryDiscoveryRail />

      {/* ── 4. Kitchen Spotlight Hero Card (Food is Hero) ───────────── */}
      {heroProduct && (
        <section className="max-w-7xl mx-auto w-full px-4 sm:px-8">
          <div 
            data-product-card="true"
            id={`hero-spotlight-${heroProduct.id}`}
            className="relative rounded-3xl overflow-hidden bg-white border border-stone-200/90 p-5 sm:p-7 shadow-[0_8px_30px_-4px_rgba(28,25,23,0.08)] flex flex-col-reverse md:flex-row items-center justify-between gap-6 sm:gap-8 group"
          >
            {/* Info & CTA */}
            <div className="flex-1 min-w-0 text-left w-full md:w-auto">
              <div className="flex flex-wrap items-center gap-2 mb-2.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-700 text-[10px] font-black uppercase tracking-wider">
                  <Flame className="w-3.5 h-3.5 text-red-600" />
                  Kitchen Spotlight
                </span>

                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                  heroProduct.isVegetarian ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                }`}>
                  <Leaf className="w-3 h-3 text-emerald-600" />
                  {heroProduct.isVegetarian ? "100% Pure Veg" : "Gourmet Non-Veg"}
                </span>

                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  Wood-Fired 450°C
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-stone-900 tracking-tight leading-tight group-hover:text-red-600 transition-colors">
                {heroProduct.name}
              </h2>

              <p className="text-xs sm:text-sm text-stone-600 line-clamp-2 mt-2 max-w-xl font-normal leading-relaxed">
                {heroProduct.description}
              </p>

              {/* Price & Action Row */}
              <div className="flex flex-wrap items-center gap-4 mt-5 pt-3 border-t border-stone-100">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-stone-900">
                    ₹{heroProduct.basePrice}
                  </span>
                  <span className="text-xs text-stone-400 line-through font-medium">
                    ₹{Math.round(heroProduct.basePrice * 1.25)}
                  </span>
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
                          triggerAnimation(e, heroProduct.image, () => {
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
                      type="button"
                      onClick={handleHeroAdd}
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
                    <span>Details</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Elevated Food Image (Target for physical flight) */}
            <div className="relative w-full md:w-72 md:h-56 h-48 rounded-2xl overflow-hidden bg-stone-100 shrink-0 border border-stone-200 shadow-md">
              <img
                data-product-img="true"
                src={heroProduct.image}
                alt={heroProduct.name}
                className="w-full h-full object-cover object-center group-hover:scale-106 transition-transform duration-500"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500";
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-900/35 via-transparent to-transparent pointer-events-none" />
              
              {heroProduct.rating && (
                <div className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-md border border-stone-100 text-stone-900 text-[11px] font-black shadow-md">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span>{heroProduct.rating.toFixed(1)}</span>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── 5. The Core Food Menu (DIRECT VISIBILITY, ZERO CLUTTER) ── */}
      <section className="max-w-7xl mx-auto w-full px-4 sm:px-8 py-2">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-red-600 mb-1">
              <Utensils className="w-3.5 h-3.5" />
              <span>Fresh From The Stone Oven</span>
            </span>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
              Handcrafted Pizzas & Specials
            </h3>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              Slow-fermented sourdough, San Marzano sauce & fresh mozzarella baked at 450°C
            </p>
          </div>

          <Link
            to="/menu"
            className="inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700 transition-colors self-start sm:self-auto"
          >
            <span>View Full Menu</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Instant Category Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none">
          {[
            { id: "all", label: "All Items", icon: "✨" },
            { id: "pizza", label: "Wood-Fired Pizzas", icon: "🍕" },
            { id: "veg", label: "100% Veg Only", icon: "🌿" },
            { id: "nonveg", label: "Non-Veg Feast", icon: "🍗" },
            { id: "dessert", label: "Desserts & Cakes", icon: "🍰" },
          ].map((tab) => {
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer active:scale-95 ${
                  isActive
                    ? "bg-red-600 text-white shadow-sm"
                    : "bg-white border border-stone-200 text-stone-700 hover:bg-stone-50"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── Product Grid ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              item={product}
              onOpenCustomization={() => setCustomizingItem(product)}
            />
          ))}
        </div>
      </section>

      {/* ── 6. Value Combos & Family Feasts ─────────────────────────── */}
      {combos && combos.length > 0 && (
        <section className="max-w-7xl mx-auto w-full px-4 sm:px-8 py-4">
          <div className="flex items-end justify-between mb-4">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-red-600 mb-1">
                <Gift className="w-3.5 h-3.5" />
                <span>Pair & Save</span>
              </span>
              <h3 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight">
                Curated Value Combos
              </h3>
            </div>
            <Link
              to="/menu?category=combo"
              className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1"
            >
              <span>All Combos</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {combos.slice(0, 4).map((combo: any) => {
              const comboPrice = Number(combo.price || combo.basePrice || 0);
              const originalPrice = combo.originalPrice ? Number(combo.originalPrice) : 0;
              const hasDiscount = originalPrice > comboPrice;
              const inCart = items.find((i) => i.id === combo.id);
              const qty = inCart?.quantity || 0;

              return (
                <div
                  key={combo.id}
                  data-product-card="true"
                  id={`combo-card-${combo.id}`}
                  className="p-4 rounded-2xl bg-white border border-stone-200/90 shadow-sm flex items-center justify-between gap-4 group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-stone-100 shrink-0 border border-stone-200">
                      <img
                        data-product-img="true"
                        src={combo.imageUrl || combo.image || "/images/pizza-placeholder.webp"}
                        alt={combo.name}
                        className="w-full h-full object-cover group-hover:scale-106 transition-transform duration-500"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500";
                        }}
                      />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-stone-900 group-hover:text-red-600 transition-colors truncate">
                        {combo.name}
                      </h4>
                      {combo.description && (
                        <p className="text-xs text-stone-500 line-clamp-1 mt-0.5">{combo.description}</p>
                      )}
                      <div className="flex items-baseline gap-2 mt-1.5">
                        <span className="text-base font-black text-stone-900">₹{comboPrice}</span>
                        {hasDiscount && (
                          <span className="text-xs text-stone-400 line-through">₹{originalPrice}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {qty > 0 ? (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-2 px-2 py-1 rounded-xl bg-red-50 border border-red-200 text-red-700 shadow-xs shrink-0"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (qty <= 1) removeItem(combo.id);
                          else updateQuantity(combo.id, qty - 1);
                        }}
                        className="w-6 h-6 rounded-lg bg-white text-red-600 hover:bg-red-600 hover:text-white flex items-center justify-center font-black text-xs transition-colors shadow-xs active:scale-90"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-black text-xs min-w-[14px] text-center">{qty}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          triggerAnimation(e, combo.imageUrl || combo.image || "", () => {
                            updateQuantity(combo.id, qty + 1);
                          });
                        }}
                        className="w-6 h-6 rounded-lg bg-red-600 text-white hover:bg-red-700 flex items-center justify-center font-black text-xs transition-colors shadow-xs active:scale-90"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => handleAddCombo(e, combo)}
                      className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider shrink-0 transition-all active:scale-95 shadow-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── 7. Kitchen Craft Proofs & Trust Assurances ───────────────── */}
      <section className="max-w-7xl mx-auto w-full px-4 sm:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 rounded-3xl bg-stone-900 text-white border border-stone-800">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-red-600/20 text-red-400 flex items-center justify-center shrink-0 border border-red-500/30">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h5 className="font-bold text-sm text-white">48-Hour Cold Fermentation</h5>
              <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                Slow-matured dough creates an airy, blistered crust that is remarkably light and easy to digest.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h5 className="font-bold text-sm text-white">450°C Italian Stone Oven</h5>
              <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                Flash-baked in 90 seconds to lock in toppings freshness while blistering the edges with authentic wood-smoke flavor.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h5 className="font-bold text-sm text-white">100% Real Fior Di Latte</h5>
              <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                Pure cow-milk mozzarella from local artisanal dairies. Zero preservatives, zero artificial cheese analogs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 8. Active Promo Coupons ─────────────────────────────────── */}
      <LiveCoupons />

      {/* ── 9. Live Advertisements ──────────────────────────────────── */}
      <LiveAdvertisements />

      {/* ── 10. Product Customization Modal ──────────────────────────── */}
      <ProductCustomizationModal
        item={customizingItem}
        onClose={() => setCustomizingItem(null)}
      />

      {/* Bottom padding for floating cart bar */}
      <div className="h-24 w-full" />
    </div>
  );
}
