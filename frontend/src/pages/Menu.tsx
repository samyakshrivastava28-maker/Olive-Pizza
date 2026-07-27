import { useState, useEffect, useMemo, useRef } from "react";
import { MenuItem } from "../types/models";
import { db } from "../lib/firebase";
import { collection, getDocs, query } from "firebase/firestore";
import { useDataStore } from "../lib/dataStore";
import { useShallow } from "zustand/react/shallow";
import { useDebounce } from "../hooks/useDebounce";
import { useAuthStore } from "../lib/store";
import { subscribeToWishlist } from "../lib/wishlist";
import { motion, Variants, AnimatePresence } from "framer-motion";
import PageTransition from "../components/PageTransition";
import ProductCard from "../components/ProductCard";
import ProductCustomizationModal from "../components/menu/ProductCustomizationModal";
import { isStoreOpen } from "../lib/utils";
import { Search, MapPin, Bell, User, Sparkles, SlidersHorizontal, Flame, Star, Award, Heart } from "lucide-react";
import Galaxy from "../components/ui/Galaxy";
import { useLocation, useNavigate } from "react-router";
import SEO from "../components/SEO";

function MenuSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6 animate-pulse">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="bg-dark-900/80 border border-white/5 rounded-2xl md:rounded-3xl overflow-hidden h-[260px] sm:h-[320px]">
          <div className="w-full h-[140px] sm:h-[180px] bg-dark-800" />
          <div className="p-3 space-y-2">
            <div className="h-4 bg-dark-700 rounded w-3/4" />
            <div className="h-3 bg-dark-800 rounded w-1/2" />
            <div className="flex justify-between items-center pt-2">
              <div className="h-5 bg-dark-700 rounded w-1/3" />
              <div className="h-8 w-16 bg-dark-700 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Menu() {
  const { products, combos, ads, isInitialized, initialize } = useDataStore(
    useShallow((state) => ({
      products: state.products,
      combos: state.combos,
      ads: state.ads,
      isInitialized: state.isInitialized,
      initialize: state.initialize,
    }))
  );

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [category, setCategory] = useState<string>("all");
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);

  useEffect(() => {
    if (!user?.uid) {
      setWishlistIds([]);
      return;
    }
    const unsub = subscribeToWishlist(user.uid, (ids) => {
      setWishlistIds(ids);
    });
    return () => unsub();
  }, [user?.uid]);

  useEffect(() => {
    if (location.search.includes("search=1") && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [location.search]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const allItems: MenuItem[] = useMemo(() => {
    const parsedProducts = products
      .filter((data) => !data.isComboOnly)
      .map((data) => ({
        id: data.id,
        name: data.productName,
        description: data.description,
        category: data.category,
        pricingMode: data.pricingMode || "fixed",
        basePrice: data.basePrice,
        offerPrice: data.offerPrice || 0,
        discountPercentage: data.discountPercentage || 0,
        image: data.imageUrl,
        isVegetarian: data.isVegetarian,
        isAvailable: data.isActive,
      } as MenuItem));

    const parsedCombos = combos.map((data) => ({
      id: data.id,
      name: data.name,
      description: data.description,
      category: "combo",
      pricingMode: data.pricingMode || "fixed",
      basePrice: data.basePrice,
      offerPrice: data.offerPrice || 0,
      discountPercentage: data.discountPercentage || 0,
      image: data.imageUrl,
      isVegetarian: false,
      isAvailable: data.isActive,
      productIds: data.productIds
    } as MenuItem));

    return [...parsedProducts, ...parsedCombos];
  }, [products, combos]);

  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      const matchesCategory = category === "all" || item.category === category || (category === "favourite" && wishlistIds.includes(item.id || ''));
      const q = debouncedSearch.toLowerCase();
      
      let matchesSearch = true;
      if (q) {
        matchesSearch = item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
      }
      return matchesCategory && matchesSearch;
    });
  }, [allItems, category, debouncedSearch]);

  const categoryList = [
    { id: 'all', label: 'All' },
    { id: 'pizza', label: 'Pizza 🍕' },
    { id: 'burgers', label: 'Burgers 🍔' },
    { id: 'pasta', label: 'Pasta 🍝' },
    { id: 'sides', label: 'Fries & Sides 🍟' },
    { id: 'beverage', label: 'Drinks 🥤' },
    { id: 'combo', label: 'Combos 🚀' },
  ];

  return (
    <>
      <SEO 
        title="Artisan Menu"
        description="Browse handcrafted pizzas, gourmet sides, and beverages from Olive Pizza."
        canonicalUrl="/menu"
      />

      <ProductCustomizationModal 
        item={customizingItem}
        onClose={() => setCustomizingItem(null)}
      />

      <PageTransition className="w-full relative min-h-screen">
        {/* Dark Galaxy Background (Preserved) */}
        <div className="fixed inset-0 z-0 pointer-events-none opacity-60">
          <Galaxy
            mouseInteraction={false}
            mouseRepulsion={false}
            density={0.2}
            speed={0.2}
            starSpeed={0.05}
            glowIntensity={0.15}
            twinkleIntensity={0.2}
            transparent={false}
          />
        </div>

        <div className="relative z-10 bg-dark-950/80 min-h-screen text-white pt-2 md:pt-6 pb-32 w-full backdrop-blur-sm">
          <div className="responsive-container space-y-4 md:space-y-6">

            {/* ── Top Bar Header (Reference Aligned) ── */}
            <div className="flex items-center justify-between gap-4 pt-2">
              <div className="flex items-center gap-2 text-xs text-slate-300 bg-dark-900/80 px-3 py-1.5 rounded-full border border-white/10 shadow-md">
                <MapPin size={13} className="text-primary-400 shrink-0 animate-bounce" />
                <div className="truncate max-w-[200px] sm:max-w-xs font-medium">
                  <span className="text-slate-500 font-bold">Delivery: </span>
                  {user?.fullAddress || user?.full_address || "123 Rampanbury Street, Rajnandgaon"}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => navigate('/notifications')} 
                  className="p-2.5 rounded-full bg-dark-900 border border-white/10 text-slate-300 hover:text-white relative min-touch-target shadow-md"
                >
                  <Bell size={16} />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-400 rounded-full animate-ping" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-400 rounded-full" />
                </button>
                
                <button 
                  onClick={() => navigate(user ? '/dashboard' : '/login')} 
                  className="p-1.5 rounded-full bg-dark-900 border border-white/10 text-slate-300 hover:text-white min-touch-target shadow-md"
                >
                  <div className="w-7 h-7 rounded-full bg-primary-600 flex items-center justify-center font-black text-xs text-white">
                    {user?.name ? user.name[0].toUpperCase() : <User size={14} />}
                  </div>
                </button>
              </div>
            </div>

            {/* ── Ultra-Stunning Animated Olive Pizza Branding ── */}
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="text-center py-4 relative flex flex-col items-center justify-center overflow-hidden"
            >
              {/* Background Glow Aura */}
              <motion.div 
                animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute w-48 h-48 bg-gradient-to-r from-amber-500/20 via-primary-500/20 to-amber-400/20 rounded-full blur-3xl pointer-events-none z-0"
              />

              {/* 3D Floating Pizza Icon */}
              <motion.div
                animate={{ y: [0, -6, 0], rotate: [0, 3, -3, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="relative z-10 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-dark-900 to-dark-950 border border-amber-400/30 flex items-center justify-center mb-2 shadow-[0_0_30px_rgba(245,158,11,0.3)]"
              >
                <span className="text-3xl sm:text-4xl filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]">🍕</span>
                <motion.div 
                  animate={{ scale: [1, 1.2, 1], opacity: [0.6, 0, 0.6] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                  className="absolute inset-0 border-2 border-amber-400/40 rounded-2xl pointer-events-none"
                />
              </motion.div>

              {/* Main Shimmering Title */}
              <motion.h1 
                animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="relative z-10 text-fluid-h1 font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-primary-300 drop-shadow-[0_4px_30px_rgba(245,158,11,0.4)]"
                style={{ backgroundSize: "200% 200%" }}
              >
                Ölive Pizza
              </motion.h1>

              {/* Sub-header Rating & Trust Badge */}
              <div className="relative z-10 flex items-center gap-2 text-xs font-bold mt-1.5 bg-dark-900/80 border border-white/10 px-3.5 py-1 rounded-full shadow-md">
                <span className="flex items-center gap-1 text-amber-400">
                  <Star size={13} className="fill-amber-400" /> 4.9 (2.4k+ Reviews)
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <Award size={13} /> Rajnandgaon's #1 Artisan Kitchen
                </span>
              </div>
            </motion.div>

            {/* ── Hero Search Bar (Reference Aligned) ── */}
            <div className="relative max-w-xl mx-auto">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search for glow, supreme pizza, drinks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-dark-900/90 border border-white/15 text-white pl-5 pr-12 py-3.5 rounded-full focus:outline-none focus:border-amber-400 transition-all placeholder:text-slate-500 shadow-[0_0_25px_rgba(0,0,0,0.5)] text-sm"
              />
              <button className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white flex items-center justify-center transition-colors min-touch-target shadow-md">
                <Search size={16} />
              </button>
            </div>

            {/* Store Closed Notice */}
            {!isStoreOpen() && (
              <div className="w-full bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 text-center text-amber-400 text-xs font-bold">
                🔥 Ovens open at 12:00 PM. Pre-orders are active!
              </div>
            )}

            {/* ── Smart Category Section ── */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Category Section</span>
                <button onClick={() => setCategory('all')} className="text-xs font-bold text-primary-400 hover:underline">See All</button>
              </div>

              <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2 pt-1">
                {categoryList.map((cat) => {
                  const isActive = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setCategory(cat.id)}
                      className={`min-touch-target whitespace-nowrap px-5 py-2 rounded-full text-xs font-bold transition-all border ${
                        isActive
                          ? "bg-gradient-to-r from-amber-500 to-amber-600 text-dark-950 border-amber-400 font-black shadow-[0_0_15px_rgba(245,158,11,0.4)] scale-105"
                          : "bg-dark-900/90 text-slate-300 border-white/10 hover:border-white/20"
                      }`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Product Grid (Reference Responsive Breakdown) ── */}
            {!isInitialized ? (
              <MenuSkeleton />
            ) : filteredItems.length === 0 ? (
              <div className="text-center text-slate-400 py-16">
                <span className="text-5xl mb-4 block">🍕</span>
                <p className="text-base font-bold text-white mb-1">No Pizzas Found</p>
                <p className="text-xs text-slate-500">Try searching for "Supreme" or select another category.</p>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Product Grid ({filteredItems.length})
                  </span>
                  <span className="text-xs text-slate-500">Showing best recommendations</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
                  {filteredItems.map((item) => {
                    let discount = (item as any).discountPercentage || 0;
                    return (
                      <ProductCard 
                        key={item.id} 
                        item={item} 
                        discount={discount} 
                        wishlistIds={wishlistIds}
                        onOpenCustomization={(customItem) => setCustomizingItem(customItem)}
                      />
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        </div>
      </PageTransition>
    </>
  );
}
