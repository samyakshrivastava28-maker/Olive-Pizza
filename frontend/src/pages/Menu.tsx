import { useState, useEffect, useMemo, useRef } from "react";
import { MenuItem } from "../types/models";
import { db } from "../lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { useDataStore } from "../lib/dataStore";
import { useShallow } from "zustand/react/shallow";
import { useLoadingStore } from "../lib/loadingStore";
import { useDebounce } from "../hooks/useDebounce";
import { motion, Variants } from "framer-motion";
import PageTransition from "../components/PageTransition";
import ProductCard from "../components/ProductCard";
import { isStoreOpen } from "../lib/utils";
import { Search } from "lucide-react";
import Galaxy from "../components/ui/Galaxy";
import { useLocation } from "react-router";
import SEO from "../components/SEO";

// Custom premium skeleton
function MenuSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 animate-pulse">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="bg-dark-900/60 border border-white/5 rounded-2xl overflow-hidden h-[300px]">
          <div className="w-full h-[200px] bg-dark-800" />
          <div className="p-3 space-y-3">
            <div className="h-4 bg-dark-700 rounded w-3/4" />
            <div className="flex justify-between items-center">
              <div className="h-5 bg-dark-700 rounded w-1/4" />
              <div className="h-8 w-8 bg-dark-700 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Menu() {
  const {
    products,
    combos,
    ads,
    isInitialized,
    initialize,
  } = useDataStore(useShallow((state) => ({
    products: state.products,
    combos: state.combos,
    ads: state.ads,
    isInitialized: state.isInitialized,
    initialize: state.initialize,
  })));

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [category, setCategory] = useState<"all" | "pizza" | "sides" | "beverage" | "combo">("all");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();

  useEffect(() => {
    if (location.search.includes("search=1") && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [location.search]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Menu items are rendered conditionally based on isInitialized below.

  // Combine products and combos, matching the MenuItem interface exactly
  const allItems: MenuItem[] = useMemo(() => {
    const parsedProducts = products.map((data) => ({
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
      const matchesCategory = category === "all" || item.category === category;
      
      const q = debouncedSearch.toLowerCase();
      
      // Simulate AI Food Finder semantic search
      const isSpicyQuery = q.includes("spicy") || q.includes("hot");
      const isVegQuery = q.includes("veg") || q.includes("vegetarian");
      const isUnderQuery = q.match(/under\s*(?:₹|rs\.?|rupees)?\s*(\d+)/i);
      
      let matchesSearch = true;
      
      if (q) {
        matchesSearch = false;
        
        // Exact match
        if (item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)) {
          matchesSearch = true;
        }
        
        // Semantic match
        if (!matchesSearch) {
          let semanticMatch = true;
          
          if (isSpicyQuery && !item.name.toLowerCase().includes("spicy") && !item.description.toLowerCase().includes("spicy")) semanticMatch = false;
          if (isVegQuery && !item.isVegetarian) semanticMatch = false;
          if (isUnderQuery && item.basePrice > parseInt(isUnderQuery[1])) semanticMatch = false;
          
          if ((isSpicyQuery || isVegQuery || isUnderQuery) && semanticMatch) {
            matchesSearch = true;
          }
        }
      }

      return matchesCategory && matchesSearch;
    });
  }, [allItems, category, debouncedSearch]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 300, damping: 24 },
    },
  };

  return (
    <>
      <SEO 
        title="Menu"
        description="Browse our artisan pizza menu. Hot, fresh, and delicious pizzas, sides, and beverages."
        canonicalUrl="/menu"
      />
      <PageTransition className="w-full relative min-h-screen">
        <div className="fixed inset-0 z-0 pointer-events-none opacity-60">
          <Galaxy
            mouseInteraction={false}
            mouseRepulsion={false}
            density={0.2}
            speed={0.2}
            starSpeed={0.05}
            glowIntensity={0.15}
            twinkleIntensity={0.2}
            saturation={0}
            transparent={false}
          />
        </div>
        <div className="relative z-10 bg-dark-950/80 min-h-screen text-white pt-4 md:pt-12 pb-24 w-full backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 space-y-6 md:space-y-12">
            {!isStoreOpen() && (
              <div className="w-full bg-accent-500/10 border border-accent-500/20 rounded-2xl p-4 md:p-6 text-center text-accent-500">
                <h3 className="text-lg md:text-xl font-bold mb-1">
                  Our ovens are currently resting.
                </h3>
                <p className="text-sm md:text-base opacity-80">
                  We open at 12:00 PM. Orders placed now will be scheduled for
                  tomorrow.
                </p>
              </div>
            )}

            {/* Promotional Ads Section */}
            {ads.length > 0 && (
              <div className="space-y-4">
                {ads.map((ad, idx) => (
                  <div
                    key={idx}
                    className="w-full rounded-2xl overflow-hidden shadow-xl relative group bg-dark-900 min-h-[140px] md:min-h-[200px] flex items-center justify-center"
                  >
                    {ad.mediaType === "video" ? (
                      <video
                        src={ad.mediaUrl}
                        autoPlay
                        muted
                        loop
                        playsInline
                        className="absolute inset-0 w-full h-full object-cover opacity-50"
                      />
                    ) : (
                      <img
                        src={ad.mediaUrl}
                        alt={ad.title}
                        className="absolute inset-0 w-full h-full object-cover opacity-50"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-r from-dark-950/80 to-transparent z-0" />
                    <div className="relative z-10 p-6 w-full flex flex-col items-start max-w-3xl">
                      <span className="bg-accent-500 text-dark-950 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest mb-2 shadow-sm border border-white/20">
                        Offer
                      </span>
                      <h2 className="text-2xl md:text-4xl font-black text-white mb-2 tracking-tight">
                        {ad.title}
                      </h2>
                      <p className="text-sm md:text-lg text-slate-300 font-medium">
                        {ad.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Search & Sticky Categories */}
            <div className="sticky top-16 z-40 bg-dark-950/95 backdrop-blur-md pt-4 pb-4 -mx-4 px-4 border-b border-dark-800">
              <div className="max-w-7xl mx-auto flex flex-col gap-4">
                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search for pizza, sides..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-dark-900 border border-dark-700 text-white pl-12 pr-4 py-3 rounded-full focus:outline-none focus:border-primary-500 transition-colors placeholder:text-slate-500 shadow-sm"
                  />
                </div>

                {/* Horizontal Categories */}
                <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                  {["all", "pizza", "sides", "beverage", "combo"].map((cat) => {
                    const isActive = category === cat;
                    return (
                      <button
                        key={cat}
                        onClick={() => setCategory(cat as any)}
                        className={`relative whitespace-nowrap px-6 py-2 rounded-full text-sm font-bold transition-all duration-200 ${
                          isActive
                            ? "bg-primary-600 text-white shadow-md"
                            : "bg-dark-800 text-slate-400 hover:text-slate-200 border border-dark-700"
                        } capitalize`}
                      >
                        {cat === "combo" ? "Combos 🚀" : cat}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Product Grid */}
            {!isInitialized ? (
              <MenuSkeleton />
            ) : filteredItems.length === 0 ? (
              <div className="text-center text-slate-400 py-12">
                <span className="text-4xl mb-4 block opacity-50">🍕</span>
                <p className="text-lg">No items found matching your search.</p>
              </div>
            ) : (
              <motion.div
                key={category + searchQuery}
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6"
              >
                {filteredItems.map((item) => {
                  let discount = (item as any).discountPercentage || 0;
                  return (
                    <motion.div
                      key={item.id}
                      variants={itemVariants}
                      className="h-full"
                    >
                      <ProductCard item={item} discount={discount} />
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </div>
        </div>
      </PageTransition>
    </>
  );
}
