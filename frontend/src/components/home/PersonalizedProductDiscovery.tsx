import React from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router";
import { 
  RotateCcw, Sparkles, Heart, Plus, Minus, ArrowRight, 
  ChevronRight, Utensils, Star 
} from "lucide-react";
import { usePersonalizedRecommendations, RecommendedProduct } from "../../hooks/usePersonalizedRecommendations";
import { useCartStore } from "../../lib/store";
import { useCartAnimation } from "../ui/CartAnimationProvider";
import toast from "react-hot-toast";

interface PersonalizedProductDiscoveryProps {
  onCustomize: (product: any) => void;
}

export default function PersonalizedProductDiscovery({ onCustomize }: PersonalizedProductDiscoveryProps) {
  const { 
    isReturningCustomer, 
    isLoading, 
    orderAgainItems, 
    favoriteItems, 
    categoryRecommendations, 
    curatedHighlights,
    preferredCategory
  } = usePersonalizedRecommendations();

  const { items, addItem, updateQuantity, removeItem } = useCartStore();
  const { triggerAnimation } = useCartAnimation();
  const navigate = useNavigate();

  const handleAdd = (e: React.MouseEvent, item: RecommendedProduct) => {
    e.stopPropagation();

    if (item.hasVariants) {
      onCustomize(item.rawProduct);
      return;
    }

    const imageUrl = item.image || "/images/pizza-placeholder.webp";

    triggerAnimation(e, imageUrl, () => {
      addItem({
        id: item.id,
        menuItemId: item.id,
        name: item.name,
        price: item.price,
        quantity: 1,
        image: imageUrl,
        isVegetarian: item.isVegetarian,
        crust: "Classic Crust",
        size: "Medium"
      });

      toast.success(`Added ${item.name}! 🍕`, {
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
  };

  const handleIncrease = (e: React.MouseEvent, item: RecommendedProduct, currentQty: number) => {
    e.stopPropagation();
    const imageUrl = item.image || "/images/pizza-placeholder.webp";
    triggerAnimation(e, imageUrl, () => {
      updateQuantity(item.id, currentQty + 1);
    });
  };

  const handleDecrease = (e: React.MouseEvent, item: RecommendedProduct, currentQty: number) => {
    e.stopPropagation();
    if (currentQty <= 1) {
      removeItem(item.id);
      toast.success(`Removed ${item.name}`, { duration: 1500 });
    } else {
      updateQuantity(item.id, currentQty - 1);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 animate-pulse">
        <div className="h-6 w-48 bg-stone-200 rounded-full mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-64 bg-stone-200/70 rounded-3xl" />
          ))}
        </div>
      </div>
    );
  }

  // ── CASE A: RETURNING CUSTOMER WITH REAL ORDER HISTORY ─────────────────────
  if (isReturningCustomer && (orderAgainItems.length > 0 || favoriteItems.length > 0 || categoryRecommendations.length > 0)) {
    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-8 py-6 flex flex-col gap-10">
        
        {/* 1. "Ready for your usual?" / Order Again Section */}
        {orderAgainItems.length > 0 && (
          <div>
            <div className="flex items-end justify-between mb-4">
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-700 mb-1">
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Ready For Your Usual?</span>
                </span>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-serif font-black text-stone-900 tracking-tight">
                  Order Again
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Your recent wood-fired favorites with current live prices
                </p>
              </div>

              <Link
                to="/orders"
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 transition-colors"
              >
                <span>Past Orders</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Compact Re-order Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {orderAgainItems.map((item) => {
                const inCart = items.find((i) => i.id === item.id || i.menuItemId === item.id);
                const qty = inCart?.quantity || 0;

                return (
                  <div
                    key={item.id}
                    onClick={() => navigate(`/product/${item.id}`)}
                    className="p-3.5 sm:p-4 rounded-2xl bg-white border border-stone-200 shadow-sm hover:shadow-md transition-all flex items-center justify-between gap-4 cursor-pointer group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-stone-100 shrink-0 border border-stone-100">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-106 transition-transform duration-300"
                          loading="lazy"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          {item.isVegetarian && (
                            <div className="w-3.5 h-3.5 border-2 border-emerald-600 rounded-sm flex items-center justify-center shrink-0">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                            </div>
                          )}
                          <h4 className="text-sm sm:text-base font-bold text-stone-900 group-hover:text-red-600 transition-colors truncate">
                            {item.name}
                          </h4>
                        </div>
                        <span className="text-[11px] text-stone-400 block mt-0.5">
                          Ordered {item.orderCount} {item.orderCount === 1 ? "time" : "times"}
                        </span>
                        <span className="text-sm font-black text-stone-900 mt-1 block">
                          ₹{item.price}
                        </span>
                      </div>
                    </div>

                    {qty > 0 ? (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-red-50 border border-red-200 text-red-700 shadow-xs shrink-0"
                      >
                        <button
                          type="button"
                          onClick={(e) => handleDecrease(e, item, qty)}
                          className="w-6 h-6 rounded-lg bg-white text-red-600 hover:bg-red-600 hover:text-white flex items-center justify-center font-black text-xs transition-colors shadow-xs active:scale-90"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-black text-xs min-w-[12px] text-center">{qty}</span>
                        <button
                          type="button"
                          onClick={(e) => handleIncrease(e, item, qty)}
                          className="w-6 h-6 rounded-lg bg-red-600 text-white hover:bg-red-700 flex items-center justify-center font-black text-xs transition-colors shadow-xs active:scale-90"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => handleAdd(e, item)}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-600 border border-emerald-300 text-emerald-800 hover:text-white font-extrabold text-xs uppercase tracking-wider transition-all shrink-0 hover:scale-105 active:scale-95 min-h-[34px] flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Reorder</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. "Your Favorites" / Recommended Based on Preferred Category */}
        {(favoriteItems.length > 0 || categoryRecommendations.length > 0) && (
          <div>
            <div className="flex items-end justify-between mb-4">
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-red-600 mb-1">
                  <Heart className="w-3.5 h-3.5" />
                  <span>Handpicked for Your Taste</span>
                </span>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-serif font-black text-stone-900 tracking-tight">
                  {preferredCategory 
                    ? `Because You Enjoy ${preferredCategory.charAt(0).toUpperCase() + preferredCategory.slice(1)}` 
                    : "Your Top Selections"}
                </h2>
              </div>
              <Link to="/menu" className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1">
                <span>View All</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...favoriteItems, ...categoryRecommendations].slice(0, 3).map((item) => {
                const inCart = items.find((i) => i.id === item.id || i.menuItemId === item.id);
                const qty = inCart?.quantity || 0;

                return (
                  <div
                    key={item.id}
                    onClick={() => navigate(`/product/${item.id}`)}
                    className="rounded-2xl bg-white border border-stone-200/90 shadow-[0_4px_20px_-2px_rgba(28,25,23,0.06)] hover:shadow-md transition-all flex flex-col justify-between overflow-hidden cursor-pointer group"
                  >
                    <div className="relative w-full h-44 overflow-hidden bg-stone-100">
                      <img
                        src={item.image || "/images/pizza-placeholder.webp"}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-106 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-stone-900/40 via-transparent to-transparent pointer-events-none" />

                      {item.isVegetarian && (
                        <div className="absolute top-2.5 left-2.5 w-4 h-4 bg-white/95 rounded-sm border-2 border-emerald-600 flex items-center justify-center shadow-sm">
                          <div className="w-2 h-2 rounded-full bg-emerald-600" />
                        </div>
                      )}

                      {item.recommendationReason && (
                        <span className="absolute bottom-2 left-2.5 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-stone-900/80 text-amber-300 backdrop-blur-md">
                          {item.recommendationReason}
                        </span>
                      )}
                    </div>

                    <div className="p-4 flex flex-col justify-between flex-1">
                      <div>
                        <h4 className="text-base font-bold text-stone-900 group-hover:text-red-600 transition-colors line-clamp-1 mb-1">
                          {item.name}
                        </h4>
                        {item.description && (
                          <p className="text-xs text-stone-500 line-clamp-2 mb-3 leading-relaxed">
                            {item.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-stone-100 mt-auto">
                        <span className="text-base font-black text-stone-900">₹{item.price}</span>
                        {qty > 0 ? (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-red-50 border border-red-200 text-red-700 shadow-xs"
                          >
                            <button
                              type="button"
                              onClick={(e) => handleDecrease(e, item, qty)}
                              className="w-6 h-6 rounded-lg bg-white text-red-600 hover:bg-red-600 hover:text-white flex items-center justify-center font-black text-xs transition-colors shadow-xs active:scale-90"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="font-black text-xs min-w-[12px] text-center">{qty}</span>
                            <button
                              type="button"
                              onClick={(e) => handleIncrease(e, item, qty)}
                              className="w-6 h-6 rounded-lg bg-red-600 text-white hover:bg-red-700 flex items-center justify-center font-black text-xs transition-colors shadow-xs active:scale-90"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => handleAdd(e, item)}
                            className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs uppercase tracking-wider shadow-sm transition-all flex items-center gap-1 active:scale-95"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
    );
  }

  // ── CASE B: NEW CUSTOMER (OR UN-AUTHENTICATED) ─────────────────────────────
  if (curatedHighlights.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-8 py-6 flex flex-col gap-6">
      {/* ── Section Header (High Contrast, Stone-900) ───────────────── */}
      <div className="flex items-end justify-between">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-red-600 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-red-600" />
            <span>Chef's Selections</span>
          </span>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-serif font-black text-stone-900 tracking-tight">
            Curated Highlights
          </h2>
          <p className="text-xs text-stone-600 mt-0.5">
            A taste of our signature hand-stretched wood-fired recipes
          </p>
        </div>

        <Link
          to="/menu"
          className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 transition-colors"
        >
          <span>Full Menu</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* ── Clean 4-Product Grid with High Contrast Cards ────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {curatedHighlights.map((item) => {
          const inCart = items.find((i) => i.id === item.id || i.menuItemId === item.id);
          const qty = inCart?.quantity || 0;

          return (
            <div
              key={item.id}
              onClick={() => navigate(`/product/${item.id}`)}
              className="rounded-2xl md:rounded-3xl overflow-hidden bg-white border border-stone-200/90 shadow-[0_4px_20px_-2px_rgba(28,25,23,0.06)] hover:shadow-[0_12px_32px_-4px_rgba(28,25,23,0.12)] transition-all duration-300 flex flex-col justify-between cursor-pointer group"
            >
              {/* Product Food Photo */}
              <div className="relative w-full aspect-[4/3] overflow-hidden bg-stone-100">
                <img
                  src={item.image || "/images/pizza-placeholder.webp"}
                  alt={item.name}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500";
                  }}
                  className="w-full h-full object-cover group-hover:scale-106 transition-transform duration-500 ease-out"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-900/40 via-transparent to-transparent pointer-events-none" />

                {/* FSSAI Veg Indicator */}
                {item.isVegetarian && (
                  <div className="absolute top-2.5 left-2.5 w-4 h-4 bg-white/95 rounded-sm border-2 border-emerald-600 flex items-center justify-center shadow-sm">
                    <div className="w-2 h-2 rounded-full bg-emerald-600" />
                  </div>
                )}
              </div>

              {/* Product Body Information */}
              <div className="p-3.5 sm:p-4 flex flex-col justify-between flex-1 bg-white">
                <div>
                  <h4 className="text-sm sm:text-base font-bold text-stone-900 group-hover:text-red-600 transition-colors line-clamp-1 mb-1">
                    {item.name}
                  </h4>
                  {item.description && (
                    <p className="text-xs text-stone-500 line-clamp-2 mb-3 leading-relaxed min-h-[2rem]">
                      {item.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-stone-100 mt-auto">
                  <span className="text-base sm:text-lg font-black text-stone-900">₹{item.price}</span>

                  {qty > 0 ? (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-red-50 border border-red-200 text-red-700 shadow-xs"
                    >
                      <button
                        type="button"
                        onClick={(e) => handleDecrease(e, item, qty)}
                        className="w-6 h-6 rounded-lg bg-white text-red-600 hover:bg-red-600 hover:text-white flex items-center justify-center font-black text-xs transition-colors shadow-xs active:scale-90"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-black text-xs min-w-[12px] text-center">{qty}</span>
                      <button
                        type="button"
                        onClick={(e) => handleIncrease(e, item, qty)}
                        className="w-6 h-6 rounded-lg bg-red-600 text-white hover:bg-red-700 flex items-center justify-center font-black text-xs transition-colors shadow-xs active:scale-90"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => handleAdd(e, item)}
                      className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs uppercase tracking-wider shadow-sm shadow-red-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-1 min-h-[34px]"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── High Contrast "Ready to Explore More" CTA ──────────────── */}
      <div className="p-6 rounded-3xl bg-white border border-stone-200/90 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left mt-2">
        <div>
          <h3 className="text-lg font-serif font-black text-stone-900">Ready to explore more?</h3>
          <p className="text-xs text-stone-500 mt-0.5">Discover our full menu with all crust styles, toppings, and sides</p>
        </div>
        <Link
          to="/menu"
          className="px-6 py-3 rounded-2xl bg-stone-900 hover:bg-red-600 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shrink-0"
        >
          <span>View Full Menu</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}
