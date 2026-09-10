import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { useNavigate } from "react-router";
import { useDataStore } from "../../lib/dataStore";
import { Utensils } from "lucide-react";

interface CategoryCardData {
  id: string;
  name: string;
  itemCount: number;
  images: { url: string; title: string }[];
  targetUrl: string;
}

// ── Single Category Card with 5-Second Real Product Image Rotation ──────────
function RotatingCategoryCard({
  category,
  index,
  isSectionInView,
  prefersReducedMotion,
}: {
  category: CategoryCardData;
  index: number;
  isSectionInView: boolean;
  prefersReducedMotion: boolean;
}) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isTabVisible, setIsTabVisible] = useState(!document.hidden);
  const navigate = useNavigate();

  // Listen to tab visibility to pause rotation in background
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(!document.hidden);
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Rotate images every 5 seconds only when section is in viewport and tab is active
  useEffect(() => {
    if (category.images.length <= 1 || !isSectionInView || !isTabVisible || prefersReducedMotion) {
      return;
    }

    const timer = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % category.images.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [category.images.length, isSectionInView, isTabVisible, prefersReducedMotion]);

  // Preload next rotating image
  useEffect(() => {
    if (category.images.length <= 1) return;
    const nextIdx = (currentIdx + 1) % category.images.length;
    const nextUrl = category.images[nextIdx]?.url;
    if (nextUrl) {
      const img = new Image();
      img.src = nextUrl;
    }
  }, [currentIdx, category.images]);

  const activeImage = category.images[currentIdx % category.images.length];

  const handleClick = useCallback(() => {
    navigate(category.targetUrl);
  }, [category.targetUrl, navigate]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.96 }}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      className="group relative flex flex-col items-center cursor-pointer select-none outline-none shrink-0 w-28 sm:w-32 md:w-36"
    >
      {/* Fixed Dimension Circular Avatar Frame (guarantees NO layout shifts) */}
      <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full p-1 bg-gradient-to-tr from-[#FF6B00]/40 via-amber-500/20 to-transparent border border-white/10 group-hover:border-[#FF6B00] transition-colors duration-300 shadow-xl overflow-hidden flex items-center justify-center">
        
        {/* Real Product Image Crossfade Container */}
        <div className="relative w-full h-full rounded-full overflow-hidden bg-black/60">
          {activeImage ? (
            <AnimatePresence mode="wait">
              <motion.img
                key={activeImage.url}
                src={activeImage.url}
                alt={activeImage.title}
                initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 1.08 }}
                animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
                exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.94 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.65, ease: "easeInOut" }}
                className="w-full h-full object-cover rounded-full group-hover:scale-105 transition-transform duration-500 pointer-events-none"
                loading="lazy"
              />
            </AnimatePresence>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-500">
              <Utensils className="w-6 h-6 text-amber-500/60" />
            </div>
          )}

          {/* Glossy radial glass reflection */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/20 pointer-events-none rounded-full" />
        </div>
      </div>

      {/* Category Title & Real Count */}
      <div className="mt-2.5 text-center px-1 w-full">
        <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-300 transition-colors truncate">
          {category.name}
        </h3>
        <span className="text-[10px] text-slate-400 block mt-0.5">
          {category.itemCount} {category.itemCount === 1 ? "item" : "items"}
        </span>
      </div>
    </motion.div>
  );
}

// ── Main Category Discovery Rail ────────────────────────────────────────────
export default function CategoryDiscoveryRail() {
  const { products, combos } = useDataStore();
  const sectionRef = useRef<HTMLDivElement>(null);
  const isSectionInView = useInView(sectionRef, { margin: "100px" });

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      setPrefersReducedMotion(mediaQuery.matches);
      const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      mediaQuery.addEventListener("change", listener);
      return () => mediaQuery.removeEventListener("change", listener);
    }
  }, []);

  // Dynamically group products into categories and collect real product images
  const categories: CategoryCardData[] = useMemo(() => {
    const categoryMap = new Map<string, { name: string; images: { url: string; title: string }[]; count: number }>();

    (products || []).forEach((p: any) => {
      if (p.isActive === false || p.isAvailable === false || p.isComboOnly) return;
      
      const rawCat = (p.category || "Pizzas").trim();
      // Capitalize category name nicely
      const catKey = rawCat.toLowerCase();
      const displayName = rawCat.charAt(0).toUpperCase() + rawCat.slice(1);

      if (!categoryMap.has(catKey)) {
        categoryMap.set(catKey, { name: displayName, images: [], count: 0 });
      }

      const entry = categoryMap.get(catKey)!;
      entry.count += 1;

      const img = p.imageUrl || p.image;
      if (img && !entry.images.some((i) => i.url === img)) {
        entry.images.push({
          url: img,
          title: p.productName || p.name || displayName,
        });
      }
    });

    const result: CategoryCardData[] = [];

    // Format into category array
    categoryMap.forEach((data, catKey) => {
      if (data.count > 0) {
        result.push({
          id: catKey,
          name: data.name,
          itemCount: data.count,
          images: data.images,
          targetUrl: `/menu?category=${encodeURIComponent(catKey)}`,
        });
      }
    });

    // Add Combos if real combos exist
    if (combos && combos.length > 0) {
      const activeCombos = combos.filter((c: any) => c.isActive !== false && c.isAvailable !== false);
      if (activeCombos.length > 0) {
        const comboImages = activeCombos
          .map((c: any) => ({
            url: c.imageUrl || c.image,
            title: c.name || "Value Combo",
          }))
          .filter((i: any) => Boolean(i.url));

        result.push({
          id: "combo",
          name: "Combos",
          itemCount: activeCombos.length,
          images: comboImages,
          targetUrl: "/menu?category=combo",
        });
      }
    }

    return result;
  }, [products, combos]);

  if (categories.length === 0) return null;

  return (
    <section ref={sectionRef} className="max-w-7xl mx-auto px-4 sm:px-8 py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-[11px] font-black uppercase tracking-wider text-[#FF6B00] block">
            Explore Flavors
          </span>
          <h2 className="text-xl sm:text-2xl font-serif font-black text-white tracking-tight">
            Menu Categories
          </h2>
        </div>
        <span className="text-xs text-slate-400 hidden sm:block">
          Tap to explore full collection
        </span>
      </div>

      {/* Horizontal Scrollable Rail with 5s Image Rotation Cards */}
      <div className="flex items-start gap-4 sm:gap-6 overflow-x-auto pb-4 scrollbar-none">
        {categories.map((cat, idx) => (
          <RotatingCategoryCard
            key={cat.id}
            category={cat}
            index={idx}
            isSectionInView={isSectionInView}
            prefersReducedMotion={prefersReducedMotion}
          />
        ))}
      </div>
    </section>
  );
}
