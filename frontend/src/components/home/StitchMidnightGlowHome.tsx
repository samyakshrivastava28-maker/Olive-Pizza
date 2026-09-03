import React, { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router";
import { 
  Sparkles, Flame, Leaf, MapPin, ChevronRight, Plus, 
  ArrowRight 
} from "lucide-react";
import { useDataStore } from "../../lib/dataStore";
import { useStoreStatus } from "../../lib/useStoreStatus";
import { useCartStore } from "../../lib/store";
import { MenuItem } from "../../types/models";
import ProductCustomizationModal from "../menu/ProductCustomizationModal";
import toast from "react-hot-toast";

export default function StitchMidnightGlowHome() {
  const storeStatus = useStoreStatus();
  const { products, combos } = useDataStore();
  const { addItem } = useCartStore();

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

  // Categories list
  const categoryTabs = useMemo(() => {
    return [
      { id: "all", label: "All Items", icon: "✨" },
      { id: "pizza", label: "Artisan Pizza", icon: "🍕" },
      { id: "burger", label: "Burgers", icon: "🍔" },
      { id: "pasta", label: "Pastas", icon: "🍝" },
      { id: "side", label: "Sides & Breads", icon: "🥖" },
      { id: "combo", label: "Value Combos", icon: "🔥" },
      { id: "dessert", label: "Desserts", icon: "🍰" },
      { id: "beverage", label: "Drinks", icon: "🥤" },
    ];
  }, []);

  const handleQuickAdd = useCallback((product: any) => {
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

    // Direct add
    addItem({
      id: product.id,
      menuItemId: product.id,
      name: product.productName || product.name,
      price: Number(product.basePrice || product.price || 0),
      quantity: 1,
      image: product.imageUrl || product.image || "https://res.cloudinary.com/dxmlvkff1/image/upload/v1786517437/olive-pizza/ai-product-images/dv4uty06rq4tznlpqz2i.jpg",
      isVegetarian: product.isVegetarian !== undefined ? Boolean(product.isVegetarian) : Boolean(product.isVeg ?? true),
    });

    toast.success(`Added ${product.productName || product.name} to cart!`, {
      icon: "🍕",
      style: {
        background: "#0A0A0A",
        color: "#fff",
        border: "1px solid rgba(255, 107, 0, 0.4)",
      },
    });
  }, [addItem]);

  return (
    <div className="w-full text-slate-100 antialiased selection:bg-amber-500 selection:text-black">
      {/* ── 1. Top Operational Bar (Sticky & Glassmorphic) ── */}
      <header className="sticky top-0 z-40 w-full bg-[#0A0A0A]/85 backdrop-blur-xl border-b border-white/10 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center font-black text-white text-base shadow-lg shadow-orange-500/30">
            OP
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm sm:text-base text-white tracking-tight">Olive Pizza</span>
              <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300">
                Flagship
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <MapPin className="w-3 h-3 text-amber-400" />
              <span>Rajnandgaon (Main)</span>
            </div>
          </div>
        </div>

        {/* Live Status Beacon */}
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border backdrop-blur-md text-xs font-bold ${
            isStoreOpen 
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-amber-500/10 border-amber-500/30 text-amber-300"
          }`}>
            <span className={`w-2 h-2 rounded-full ${isStoreOpen ? "bg-emerald-400 animate-ping" : "bg-amber-400"}`} />
            <span>{isStoreOpen ? "OPEN NOW" : "OPENS 11:00 AM"}</span>
          </div>

          <Link
            to="/menu"
            className="hidden sm:flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-bold text-white transition-all hover:scale-105"
          >
            <span>Full Menu</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* ── 2. Cinematic Hero Section ("Pizza from the Stars") ── */}
      <section className="relative w-full min-h-[460px] sm:min-h-[540px] md:min-h-[620px] overflow-hidden flex items-end">
        {/* Cinematic Wood-Fired Pizza Background */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://res.cloudinary.com/dxmlvkff1/image/upload/f_auto,q_auto:best,w_1920/v1783008946/olive-pizza-hero-background_d9rbzc.webp"
            alt="Artisanal wood-fired pizza with molten mozzarella pull and sweet basil"
            className="w-full h-full object-cover object-center scale-105 transform-gpu"
          />
          {/* Multi-layer Gradient Overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A] via-transparent to-[#0A0A0A]/40" />
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-orange-600/20 blur-3xl rounded-full pointer-events-none" />
        </div>

        {/* Hero Content Box */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-8 pb-12 sm:pb-16 w-full">
          {/* Operational Signal Capsules */}
          <div className="flex flex-wrap items-center gap-2.5 mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/40 backdrop-blur-md text-[11px] font-extrabold uppercase tracking-wider text-orange-300">
              <Flame className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
              Live Wood-Fired Kitchen
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 backdrop-blur-md text-[11px] font-extrabold uppercase tracking-wider text-emerald-300">
              <Leaf className="w-3.5 h-3.5 text-emerald-400" />
              100% Pure Veg Artisan
            </span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-serif font-black text-white leading-[1.08] tracking-tight mb-4 drop-shadow-2xl">
            Pizza from the <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-200 bg-clip-text text-transparent">Stars.</span>
          </h1>

          <p className="text-slate-300 text-sm sm:text-lg md:text-xl font-medium max-w-2xl mb-8 leading-relaxed drop-shadow">
            Hand-stretched fermented sourdough, sweet San Marzano sauce, and 100% pure Fior di Latte mozzarella blistered over flamed beechwood.
          </p>

          <div className="flex flex-wrap items-center gap-3.5">
            <Link
              to="/menu"
              className="px-8 py-4 rounded-full bg-gradient-to-r from-[#FF6B00] to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-sm uppercase tracking-wider shadow-[0_10px_30px_rgba(255,107,0,0.35)] transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
            >
              <span>{isStoreOpen ? "Order Now" : "Explore Menu"}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/menu?category=pizza"
              className="px-7 py-4 rounded-full bg-white/10 hover:bg-white/15 border border-white/20 backdrop-blur-xl text-white font-bold text-sm transition-all hover:scale-105"
            >
              Artisan Crusts
            </Link>
          </div>
        </div>
      </section>

      {/* ── 3. Filters & Pure Veg Switch Bar ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 py-6 flex items-center justify-between flex-wrap gap-4 border-b border-white/5">
        <div>
          <h2 className="text-lg sm:text-xl font-serif font-bold text-white tracking-tight">Curated Menu</h2>
          <p className="text-xs text-slate-400">Discover fresh wood-fired creations crafted right here in Rajnandgaon</p>
        </div>

        {/* Pure Veg Pill Switch */}
        <div 
          onClick={() => setPureVegOnly(!pureVegOnly)}
          className={`flex items-center gap-2.5 px-4 py-2 rounded-full cursor-pointer border transition-all duration-300 select-none ${
            pureVegOnly 
              ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
              : "bg-white/5 border-white/10 text-slate-300 hover:border-white/20"
          }`}
        >
          <div className="w-4 h-4 border-2 border-emerald-400 flex items-center justify-center rounded-sm">
            <div className="w-2 h-2 bg-emerald-400 rounded-full" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider">100% Pure Veg</span>
          <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${pureVegOnly ? "bg-emerald-500" : "bg-slate-700"}`}>
            <div className={`w-3 h-3 rounded-full bg-white transition-transform ${pureVegOnly ? "translate-x-4" : "translate-x-0"}`} />
          </div>
        </div>
      </section>

      {/* ── 4. Circular Category Carousel (Glowing Amber Borders) ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 py-6">
        <div className="flex items-center gap-4 sm:gap-6 overflow-x-auto pb-4 scrollbar-none">
          {categoryTabs.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className="flex flex-col items-center gap-2 group flex-shrink-0 transition-transform active:scale-95 outline-none"
              >
                <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-2xl sm:text-3xl transition-all duration-300 ${
                  isActive
                    ? "bg-gradient-to-tr from-[#FF6B00]/30 to-amber-500/20 border-2 border-[#FF6B00] shadow-[0_0_25px_rgba(255,107,0,0.5)] scale-105"
                    : "bg-white/5 border border-white/10 hover:border-white/25 hover:bg-white/10"
                }`}>
                  <span>{cat.icon}</span>
                </div>
                <span className={`text-xs font-bold transition-colors ${
                  isActive ? "text-[#FF6B00]" : "text-slate-400 group-hover:text-white"
                }`}>
                  {cat.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── 5. Recommended Masterpiece Menu Grid (Stitch Styled) ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-400 mb-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Recommended for You</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-serif font-black text-white tracking-tight">
              Masterpieces of Crust & Flame
            </h3>
          </div>

          <Link
            to="/menu"
            className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
          >
            <span>View All ({filteredProducts.length})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.slice(0, 9).map((product: any) => {
            const price = Number(product.basePrice || product.price || 299);
            const isVeg = product.isVegetarian !== undefined ? Boolean(product.isVegetarian) : Boolean(product.isVeg ?? true);
            const imgUrl = product.imageUrl || product.image || "https://res.cloudinary.com/dxmlvkff1/image/upload/v1786517437/olive-pizza/ai-product-images/dv4uty06rq4tznlpqz2i.jpg";

            return (
              <motion.div
                key={product.id}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                className="group relative rounded-2xl overflow-hidden bg-gradient-to-b from-white/[0.07] to-white/[0.02] border border-white/10 hover:border-[#FF6B00]/40 transition-all duration-300 flex flex-col justify-between shadow-xl"
              >
                {/* Food Image Container */}
                <div className="relative w-full h-52 sm:h-56 overflow-hidden bg-black/40">
                  <img
                    src={imgUrl}
                    alt={product.productName || product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent opacity-80" />

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <div className="w-5 h-5 bg-black/80 backdrop-blur-md rounded-md border border-emerald-500/60 flex items-center justify-center shadow">
                      <div className={`w-2 h-2 rounded-full ${isVeg ? "bg-emerald-400" : "bg-red-500"}`} />
                    </div>
                    {product.isVegetarian && (
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 backdrop-blur-md">
                        Pure Veg
                      </span>
                    )}
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
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Price</span>
                      <span className="text-xl font-black text-white">₹{price}</span>
                    </div>

                    <button
                      onClick={() => handleQuickAdd(product)}
                      className="px-5 py-2.5 rounded-full bg-gradient-to-r from-[#FF6B00] to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-orange-500/20 flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95"
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
      </section>

      {/* ── 6. Value Combos & Offers (When Available in DB) ── */}
      {combos && combos.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-8 py-8 border-t border-white/5">
          <div className="mb-6">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Pair & Save</span>
            <h3 className="text-2xl font-serif font-black text-white">Artisanal Value Combos</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {combos.slice(0, 4).map((combo: any) => (
              <div 
                key={combo.id}
                className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-500/40 transition-all flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-black/40 flex-shrink-0">
                    <img
                      src={combo.imageUrl || combo.image || "https://res.cloudinary.com/dxmlvkff1/image/upload/v1786517437/olive-pizza/ai-product-images/dv4uty06rq4tznlpqz2i.jpg"}
                      alt={combo.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h5 className="text-base font-bold text-white">{combo.name}</h5>
                    <p className="text-xs text-slate-400 line-clamp-1">{combo.description || "Curated value feast combo"}</p>
                    <span className="text-base font-extrabold text-amber-400 mt-1 block">₹{combo.price || combo.basePrice || 499}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleQuickAdd(combo)}
                  className="px-4 py-2 rounded-full bg-white/10 hover:bg-[#FF6B00] text-white font-bold text-xs uppercase transition-all shrink-0"
                >
                  + Add
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 7. Customization Modal ── */}
      <ProductCustomizationModal
        item={customizingItem}
        onClose={() => setCustomizingItem(null)}
      />
    </div>
  );
}
