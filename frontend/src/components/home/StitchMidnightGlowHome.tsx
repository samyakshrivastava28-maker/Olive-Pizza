import React, { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router";
import { 
  Sparkles, Flame, Leaf, MapPin, ChevronRight, Plus, 
  ArrowRight, Star, Clock, ShieldCheck, Award, Zap, 
  Search, ShoppingBag, User, Copy, Check, Tag, Gift
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
import StoryViewerModal, { HOME_STORIES } from "./StoryViewerModal";
import toast from "react-hot-toast";

export default function StitchMidnightGlowHome() {
  const storeStatus = useStoreStatus();
  const { products, combos } = useDataStore();
  const { items: cartItems, total: cartTotal, addItem } = useCartStore();
  const { user, isAuthenticated } = useAuthStore();
  const { triggerAnimation } = useCartAnimation();
  const navigate = useNavigate();

  // Interactive UI state
  const [pureVegOnly, setPureVegOnly] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [copiedCoupon, setCopiedCoupon] = useState<string | null>(null);

  const isStoreOpen = storeStatus.isRestaurantOpen && storeStatus.isWithinBusinessHours;

  // Real location resolution
  const userLocationText = useMemo(() => {
    if (user?.fullAddress) {
      const parts = user.fullAddress.split(",");
      return parts[0].trim();
    }
    return "Rajnandgaon";
  }, [user]);

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

  const copyCouponCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCoupon(code);
    toast.success(`Coupon code ${code} copied! Apply at checkout 🎉`, {
      style: {
        background: "#0A0A0A",
        color: "#fff",
        border: "1px solid rgba(80, 200, 120, 0.5)",
      },
    });
    setTimeout(() => setCopiedCoupon(null), 3000);
  };

  const scrollToMenu = () => {
    const el = document.getElementById("pizzeria-menu");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate("/menu");
    }
  };

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
                  {isStoreOpen ? "Live Wood-Fired Oven • 30-40 min" : "Kitchen opens 11:00 AM • Pre-order"}
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

            {/* Cart Button */}
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
            {/* Operational Badges */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-wrap items-center gap-2 mb-3"
            >
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF6B00]/15 border border-[#FF6B00]/30 text-[#FF8800] text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                <Flame className="w-3.5 h-3.5 text-[#FF6B00] animate-pulse" />
                AUTHENTIC NEAPOLITAN
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                <Leaf className="w-3.5 h-3.5 text-emerald-400" />
                100% Wood-Fired
              </span>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold backdrop-blur-md">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                4.9★ Rated in Rajnandgaon
              </span>
            </motion.div>

            {/* Masterpiece Headline */}
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
              Artisanal 72-hour fermented wood-fired crusts, kissed by open beechwood flame, topped with sweet Italian San Marzano tomatoes and 100% pure Fior di Latte mozzarella.
            </motion.p>

            {/* Dual Hero CTAs */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-wrap items-center gap-3 mb-6"
            >
              <button
                onClick={scrollToMenu}
                className="px-8 py-3.5 rounded-full bg-gradient-to-r from-[#FF6B00] via-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-sm uppercase tracking-wider shadow-[0_10px_30px_rgba(255,107,0,0.45)] transition-all hover:scale-105 active:scale-95 flex items-center gap-2 min-h-[48px]"
              >
                <span>Order Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <Link
                to="/menu"
                className="px-7 py-3.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 backdrop-blur-xl text-white font-bold text-sm transition-all hover:scale-105 active:scale-95 min-h-[48px] flex items-center gap-2"
              >
                <span>Explore Menu</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>
            </motion.div>

            {/* Value Guarantee Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4 border-t border-white/10 max-w-xl">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-orange-500/15 border border-orange-500/30 flex items-center justify-center shrink-0">
                  <Clock className="w-3.5 h-3.5 text-orange-400" />
                </div>
                <div className="text-xs">
                  <span className="font-bold text-white block text-[11px]">30 Min Delivery</span>
                  <span className="text-slate-400 text-[10px]">Guaranteed Hot</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <Leaf className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-xs">
                  <span className="font-bold text-white block text-[11px]">100% Pure Veg</span>
                  <span className="text-slate-400 text-[10px]">Separate Line</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="text-xs">
                  <span className="font-bold text-white block text-[11px]">Fior di Latte</span>
                  <span className="text-slate-400 text-[10px]">100% Real Cheese</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <div className="text-xs">
                  <span className="font-bold text-white block text-[11px]">Tamper Sealed</span>
                  <span className="text-slate-400 text-[10px]">Thermal Box</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Visual Hero Showcase Card */}
          <div className="lg:col-span-6 relative mt-2 lg:mt-0">
            <div className="relative w-full rounded-3xl overflow-hidden bg-[#161922]/80 backdrop-blur-2xl border border-white/10 p-3 shadow-2xl group">
              <div className="relative w-full h-[260px] sm:h-[340px] rounded-2xl overflow-hidden bg-black/50">
                <img 
                  src="https://res.cloudinary.com/dxmlvkff1/image/upload/f_auto,q_auto:best,w_1920/v1783008946/olive-pizza-hero-background_d9rbzc.webp"
                  alt="Artisanal Wood-Fired Pizza Margherita with molten cheese pull"
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#06070A]/95 via-[#06070A]/20 to-transparent pointer-events-none" />

                {/* Top Badge */}
                <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#06070A]/85 backdrop-blur-md border border-white/10 text-white text-xs font-bold">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span>4.9 • Signature Margherita D.O.P</span>
                </div>

                {/* Bottom Card Title & Pricing Bar */}
                <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#FF6B00] block">Wood-Fired Masterpiece</span>
                    <h3 className="text-lg sm:text-xl font-serif font-black text-white">San Marzano & Fresh Basilico</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 line-through block">₹549</span>
                    <span className="text-xl sm:text-2xl font-black text-[#FFB693]">₹449</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons underneath Showcase */}
              <div className="grid grid-cols-2 gap-2.5 mt-3">
                <button
                  onClick={scrollToMenu}
                  className="w-full h-11 rounded-full bg-gradient-to-r from-[#FF6B00] to-[#FF8800] text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(255,107,0,0.35)] active:scale-95 transition-all"
                >
                  <span>Order Now</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <Link
                  to="/menu?category=pizza"
                  className="w-full h-11 rounded-full bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95"
                >
                  <span>View Crusts</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </Link>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── 3. Instagram-Style Story Highlights Rail ─────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 py-3">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-black uppercase tracking-wider text-slate-400">
            Moments & Cravings
          </span>
          <span className="text-xs font-bold text-[#FF6B00] flex items-center gap-1">
            <span>Live Stories</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B00] animate-pulse" />
          </span>
        </div>

        <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-none">
          {HOME_STORIES.map((story, idx) => {
            const isVegStory = story.id === "pure-veg";
            return (
              <button
                key={story.id}
                onClick={() => setActiveStoryIndex(idx)}
                className="flex flex-col items-center gap-1.5 shrink-0 group outline-none select-none active:scale-95 transition-transform"
              >
                <div className={`w-16 h-16 rounded-full p-[2.5px] transition-transform duration-300 group-hover:scale-105 ${
                  isVegStory 
                    ? "bg-gradient-to-tr from-[#50C878] to-emerald-300 shadow-[0_0_15px_rgba(80,200,120,0.4)]"
                    : "bg-gradient-to-tr from-[#FF6B00] via-[#FF8800] to-[#50C878] shadow-[0_0_15px_rgba(255,107,0,0.3)]"
                }`}>
                  <div className="w-full h-full rounded-full bg-[#101218] flex items-center justify-center overflow-hidden border border-[#06070A]">
                    <img 
                      src={story.imageUrl} 
                      alt={story.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                    />
                  </div>
                </div>
                <span className={`text-[11px] font-bold text-center whitespace-nowrap ${
                  isVegStory ? "text-emerald-400" : "text-slate-200 group-hover:text-white"
                }`}>
                  {story.subtitle}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── 4. Pure Veg Tactile Switch & Category Selector Carousel ──── */}
      <section id="pizzeria-menu" className="sticky top-14 z-30 bg-[#06070A]/95 backdrop-blur-2xl border-y border-white/5 py-3 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          {/* Pure Veg Tactile Card Switch */}
          <div 
            role="button"
            tabIndex={0}
            onClick={() => setPureVegOnly(!pureVegOnly)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setPureVegOnly(!pureVegOnly); }}
            className={`flex items-center justify-between sm:justify-start gap-3 px-4 py-2.5 rounded-2xl cursor-pointer border transition-all duration-300 select-none ${
              pureVegOnly 
                ? "bg-[#50C878]/15 border-[#50C878] text-white shadow-[0_0_20px_rgba(80,200,120,0.3)]"
                : "bg-white/5 border-white/10 text-slate-300 hover:border-white/20 hover:bg-white/10"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {/* Official Indian Veg Symbol (Green dot in green square) */}
              <div className="w-5 h-5 border-2 border-[#50C878] rounded flex items-center justify-center p-0.5 bg-[#50C878]/10 shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-[#50C878] shadow-[0_0_8px_rgba(80,200,120,0.8)]" />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black uppercase tracking-wider text-white">Pure Veg Kitchen</span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold tracking-wider bg-[#50C878]/20 text-emerald-300 border border-emerald-500/30">
                    EXCLUSIVE
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 block">Separate stone ovens & dairy</span>
              </div>
            </div>

            {/* Tactile Toggle Switch Pill */}
            <div className={`w-9 h-5 rounded-full p-0.5 transition-colors shrink-0 ml-3 ${pureVegOnly ? "bg-[#50C878]" : "bg-slate-700"}`}>
              <div className={`w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-200 ${pureVegOnly ? "translate-x-4" : "translate-x-0"}`} />
            </div>
          </div>

          {/* Quick Counter */}
          <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400">
            <span>Showing <strong className="text-white font-bold">{filteredProducts.length}</strong> fresh dishes</span>
          </div>

        </div>

        {/* Horizontal Category Rail */}
        <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-3">
          <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
            {categoryTabs.map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-300 shrink-0 select-none outline-none active:scale-95 ${
                    isActive
                      ? "bg-gradient-to-r from-[#FF6B00] to-[#FF8800] border-[#FF6B00] text-white shadow-[0_0_20px_rgba(255,107,0,0.4)] font-extrabold"
                      : "bg-[#161922]/80 border-white/10 hover:border-white/20 text-slate-300 hover:text-white font-semibold"
                  }`}
                >
                  <span className="text-base">{cat.icon}</span>
                  <span className="text-xs">{cat.label}</span>
                  {cat.count > 0 && (
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                      isActive ? "bg-black/40 text-white" : "bg-white/10 text-slate-400"
                    }`}>
                      {cat.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 5. Active Promo Coupons / Vouchers ────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 py-4">
        <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
          {/* Voucher 1: OLIVE150 */}
          <div className="shrink-0 w-[290px] p-3.5 rounded-2xl bg-gradient-to-br from-[#1C1F2A] to-[#12141C] border border-[#FF6B00]/40 relative overflow-hidden shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-black text-[#FF8800] tracking-wider bg-[#FF6B00]/20 px-2 py-0.5 rounded-md border border-[#FF6B00]/30">
                <Tag className="w-3 h-3 text-[#FF6B00]" /> FLAT ₹150 OFF
              </span>
              <button 
                onClick={() => copyCouponCode("OLIVE150")}
                className="text-xs font-extrabold text-[#FF6B00] px-2 py-0.5 rounded bg-white/5 border border-[#FF6B00]/40 hover:bg-[#FF6B00] hover:text-white transition-all flex items-center gap-1"
              >
                {copiedCoupon === "OLIVE150" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCoupon === "OLIVE150" ? "COPIED" : "COPY"}</span>
              </button>
            </div>
            <div className="text-base font-serif font-black text-white tracking-tight">Code: OLIVE150</div>
            <p className="text-xs text-slate-400 mt-0.5">Valid on all wood-fired orders above ₹499</p>
          </div>

          {/* Voucher 2: CHEESY */}
          <div className="shrink-0 w-[290px] p-3.5 rounded-2xl bg-gradient-to-br from-[#1C1F2A] to-[#12141C] border border-emerald-500/40 relative overflow-hidden shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-400 tracking-wider bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-500/30">
                <Gift className="w-3 h-3 text-emerald-400" /> FREE GARLIC BREAD
              </span>
              <button 
                onClick={() => copyCouponCode("CHEESY")}
                className="text-xs font-extrabold text-emerald-400 px-2 py-0.5 rounded bg-white/5 border border-emerald-500/40 hover:bg-emerald-500 hover:text-white transition-all flex items-center gap-1"
              >
                {copiedCoupon === "CHEESY" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCoupon === "CHEESY" ? "COPIED" : "COPY"}</span>
              </button>
            </div>
            <div className="text-base font-serif font-black text-white tracking-tight">Code: CHEESY</div>
            <p className="text-xs text-slate-400 mt-0.5">Unlock stuffed garlic bread on orders ₹699+</p>
          </div>

          {/* Voucher 3: FIRSTPIZZA */}
          <div className="shrink-0 w-[290px] p-3.5 rounded-2xl bg-gradient-to-br from-[#1C1F2A] to-[#12141C] border border-amber-500/40 relative overflow-hidden shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-400 tracking-wider bg-amber-500/20 px-2 py-0.5 rounded-md border border-amber-500/30">
                <Sparkles className="w-3 h-3 text-amber-400" /> 20% WELCOME OFF
              </span>
              <button 
                onClick={() => copyCouponCode("FIRSTPIZZA")}
                className="text-xs font-extrabold text-amber-400 px-2 py-0.5 rounded bg-white/5 border border-amber-500/40 hover:bg-amber-500 hover:text-white transition-all flex items-center gap-1"
              >
                {copiedCoupon === "FIRSTPIZZA" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCoupon === "FIRSTPIZZA" ? "COPIED" : "COPY"}</span>
              </button>
            </div>
            <div className="text-base font-serif font-black text-white tracking-tight">Code: FIRSTPIZZA</div>
            <p className="text-xs text-slate-400 mt-0.5">Welcome discount on your first online order</p>
          </div>
        </div>
      </section>

      {/* ── 6. Chef's Masterpieces (Best Sellers Bento Grid) ─────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 py-6">
        <div className="flex items-end justify-between mb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#FF6B00] mb-1">
              <Sparkles className="w-3.5 h-3.5 text-[#FF6B00]" />
              <span>Curated Signatures</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-black text-white tracking-tight">
              Chef's Masterpieces
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Handcrafted fresh upon order in imported stone ovens
            </p>
          </div>

          <Link
            to="/menu"
            className="text-xs sm:text-sm font-bold text-[#FF8800] hover:text-[#FF6B00] flex items-center gap-1 transition-colors"
          >
            <span>Full Menu ({filteredProducts.length})</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 px-4 rounded-3xl bg-white/[0.02] border border-white/5">
            <span className="text-4xl block mb-3">🍕</span>
            <h4 className="text-lg font-bold text-white mb-1">No dishes match this filter</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
              {pureVegOnly ? "Try turning off the Pure Veg switch to explore our complete collection." : "No dishes found in this category."}
            </p>
            {pureVegOnly && (
              <button
                onClick={() => setPureVegOnly(false)}
                className="px-6 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all"
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
                  whileHover={{ y: -5 }}
                  transition={{ type: "spring", stiffness: 300, damping: 22 }}
                  onClick={() => navigate(`/product/${product.id}`)}
                  className="group relative rounded-3xl overflow-hidden bg-[#161922]/80 backdrop-blur-xl border border-white/10 hover:border-[#FF6B00]/50 transition-all duration-300 flex flex-col justify-between shadow-xl cursor-pointer"
                >
                  {/* Food Image Container */}
                  <div className="relative w-full h-52 sm:h-56 overflow-hidden bg-black/40">
                    <img
                      src={imgUrl}
                      alt={product.productName || product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#06070A] via-transparent to-black/20 opacity-90" />

                    {/* Top Badges */}
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      <div className="w-5 h-5 bg-[#06070A]/80 backdrop-blur-md rounded border border-white/20 flex items-center justify-center shadow">
                        <div className={`w-2.5 h-2.5 rounded-full ${isVeg ? "bg-[#50C878]" : "bg-red-500"}`} />
                      </div>
                      {isVeg && (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#50C878]/20 border border-[#50C878]/40 text-emerald-300 backdrop-blur-md">
                          PURE VEG
                        </span>
                      )}
                      {discountPercentage > 0 && (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#FF6B00]/20 border border-[#FF6B00]/40 text-orange-300 backdrop-blur-md">
                          {discountPercentage}% OFF
                        </span>
                      )}
                    </div>

                    {/* Top Right Rating Badge */}
                    <div className="absolute top-3 right-3 bg-[#06070A]/85 backdrop-blur-md border border-amber-400/40 text-amber-300 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span>{realRating}</span>
                    </div>
                  </div>

                  {/* Card Details Body */}
                  <div className="p-5 flex flex-col justify-between flex-1">
                    <div>
                      <h4 className="text-lg font-serif font-black text-white group-hover:text-amber-300 transition-colors line-clamp-1 mb-1">
                        {product.productName || product.name}
                      </h4>
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
                        {product.description || "Handcrafted wood-fired artisan pizza with melting mozzarella blend and fresh herb seasonings."}
                      </p>
                    </div>

                    {/* Price and Tactile Add Action */}
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
                        className="px-5 py-2.5 rounded-full bg-gradient-to-r from-[#FF6B00] to-[#FF8800] hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-xs uppercase tracking-wider shadow-[0_4px_16px_rgba(255,107,0,0.35)] flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 min-h-[42px] min-w-[84px] justify-center"
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

      {/* ── 7. Artisanal Value Combos ─────────────────────────────────── */}
      {combos && combos.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-8 py-8 border-t border-white/5">
          <div className="flex items-end justify-between mb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-400 mb-1">
                <Gift className="w-3.5 h-3.5 text-amber-400" />
                <span>Pair & Save</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-serif font-black text-white">
                Artisanal Value Combos
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Curated pairings perfect for 2-4 pizza lovers</p>
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
            {combos.slice(0, 4).map((combo: any) => {
              const comboPrice = Number(combo.price || combo.basePrice || 499);
              const originalPrice = combo.originalPrice ? Number(combo.originalPrice) : Math.round(comboPrice * 1.35);
              const savings = originalPrice - comboPrice;

              return (
                <div 
                  key={combo.id}
                  className="p-5 rounded-3xl bg-[#161922]/80 border border-white/10 hover:border-[#FF6B00]/40 transition-all flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl group relative overflow-hidden"
                >
                  {savings > 0 && (
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
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 mb-1 inline-block">
                        Chef's Feast
                      </span>
                      <h5 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors truncate">
                        {combo.name}
                      </h5>
                      <p className="text-xs text-slate-400 line-clamp-1">{combo.description || "Curated feast combo pack"}</p>
                      
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-lg font-black text-amber-400">₹{comboPrice}</span>
                        {originalPrice > comboPrice && (
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

      {/* ── 8. Personalized Previously Ordered Section ────────────────── */}
      {isAuthenticated && (
        <PreviouslyOrdered />
      )}

      {/* ── 9. Live Advertisements & Promotional Specials ─────────────── */}
      <LiveAdvertisements />

      {/* ── 10. Customer Love & Reviews ───────────────────────────────── */}
      <TestimonialsCarousel />

      {/* ── 11. Trust & Quality Badges ────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="p-4 rounded-2xl bg-[#161922]/60 border border-white/5 flex items-center sm:flex-col sm:text-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#FF6B00]/15 flex items-center justify-center text-[#FF6B00] shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-bold text-white block">Fresh 72h Dough</span>
              <span className="text-xs text-slate-400">Naturally cold-fermented sourdough for light digestion</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#161922]/60 border border-white/5 flex items-center sm:flex-col sm:text-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#50C878]/15 flex items-center justify-center text-[#50C878] shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-bold text-white block">100% Fior di Latte</span>
              <span className="text-xs text-slate-400">Authentic fresh whole-milk mozzarella with zero oil substitutes</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#161922]/60 border border-white/5 flex items-center sm:flex-col sm:text-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/15 flex items-center justify-center text-amber-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-bold text-white block">Tamper Sealed Delivery</span>
              <span className="text-xs text-slate-400">Insulated hot-bags ensuring wood-fired heat reaches your door</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 12. Mobile App Download & Delivery Assurance ──────────────── */}
      <AppDownloadSection />

      {/* ── 13. Persistent Floating Cart Pill (Mobile & Desktop) ──────── */}
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
                  Wood-fired hot delivery
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

      {/* ── 14. Product Customization Modal ───────────────────────────── */}
      <ProductCustomizationModal
        item={customizingItem}
        onClose={() => setCustomizingItem(null)}
      />

      {/* ── 15. Instagram Story Viewer Modal ──────────────────────────── */}
      <StoryViewerModal
        activeStoryIndex={activeStoryIndex}
        onClose={() => setActiveStoryIndex(null)}
      />

      {/* Safe bottom padding */}
      <div className="h-16 w-full" />
    </div>
  );
}
