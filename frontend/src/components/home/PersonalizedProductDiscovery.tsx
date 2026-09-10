import React from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router";
import { 
  RotateCcw, Sparkles, Heart, Plus, ArrowRight, 
  ChevronRight, Utensils
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

  const { addItem } = useCartStore();
  const { triggerAnimation } = useCartAnimation();
  const navigate = useNavigate();

  const handleAdd = (e: React.MouseEvent, item: RecommendedProduct) => {
    e.stopPropagation();

    if (item.hasVariants) {
      onCustomize(item.rawProduct);
      return;
    }

    triggerAnimation(e, item.image, () => {
      addItem({
        id: item.id,
        menuItemId: item.id,
        name: item.name,
        price: item.price,
        quantity: 1,
        image: item.image,
        isVegetarian: item.isVegetarian,
        crust: "Classic Crust",
        size: "Medium"
      });

      toast.success(`Added ${item.name} to cart! 🍕`, {
        style: {
          background: "#0A0A0A",
          color: "#fff",
          border: "1px solid rgba(255, 107, 0, 0.4)",
        },
      });
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 animate-pulse">
        <div className="h-6 w-48 bg-white/5 rounded-full mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="h-44 bg-white/5 rounded-3xl" />
          <div className="h-44 bg-white/5 rounded-3xl" />
          <div className="h-44 bg-white/5 rounded-3xl" />
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
                <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-400 mb-1">
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Ready For Your Usual?</span>
                </span>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-serif font-black text-white tracking-tight">
                  Order Again
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Your recent wood-fired favorites with current live prices
                </p>
              </div>

              <Link
                to="/orders"
                className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
              >
                <span>Past Orders</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Compact Re-order Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {orderAgainItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => navigate(`/product/${item.id}`)}
                  className="p-4 rounded-3xl bg-[#161922]/80 backdrop-blur-xl border border-white/10 hover:border-emerald-500/40 transition-all flex items-center justify-between gap-4 shadow-xl cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden bg-black/40 shrink-0">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        {item.isVegetarian && (
                          <div className="w-3.5 h-3.5 border border-[#50C878] rounded flex items-center justify-center shrink-0">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#50C878]" />
                          </div>
                        )}
                        <h4 className="text-sm sm:text-base font-bold text-white group-hover:text-emerald-300 transition-colors truncate">
                          {item.name}
                        </h4>
                      </div>
                      <span className="text-xs text-slate-400 block mt-0.5">
                        Ordered {item.orderCount} {item.orderCount === 1 ? "time" : "times"}
                      </span>
                      <span className="text-sm font-black text-emerald-400 mt-1 block">
                        ₹{item.price}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleAdd(e, item)}
                    className="px-4 py-2 rounded-full bg-emerald-500/20 hover:bg-emerald-500 border border-emerald-500/40 text-emerald-300 hover:text-white font-extrabold text-xs uppercase tracking-wider transition-all shrink-0 hover:scale-105 active:scale-95 min-h-[38px] flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Reorder</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. "Your Favorites" / Recommended Based on Preferred Category */}
        {(favoriteItems.length > 0 || categoryRecommendations.length > 0) && (
          <div>
            <div className="mb-4">
              <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#FF6B00] mb-1">
                <Heart className="w-3.5 h-3.5" />
                <span>Handpicked for Your Taste</span>
              </span>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-serif font-black text-white tracking-tight">
                {preferredCategory 
                  ? `Because You Enjoy ${preferredCategory.charAt(0).toUpperCase() + preferredCategory.slice(1)}` 
                  : "Your Top Selections"}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...favoriteItems, ...categoryRecommendations].slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  onClick={() => navigate(`/product/${item.id}`)}
                  className="rounded-3xl overflow-hidden bg-[#161922]/80 backdrop-blur-xl border border-white/10 hover:border-[#FF6B00]/50 transition-all flex flex-col justify-between shadow-xl cursor-pointer group"
                >
                  <div className="relative w-full h-44 overflow-hidden bg-black/40">
                    <img
                      src={item.image || "https://res.cloudinary.com/dxmlvkff1/image/upload/v1786517437/olive-pizza/ai-product-images/dv4uty06rq4tznlpqz2i.jpg"}
                      alt={item.name}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://res.cloudinary.com/dxmlvkff1/image/upload/v1786517437/olive-pizza/ai-product-images/dv4uty06rq4tznlpqz2i.jpg";
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#06070A] via-transparent to-transparent opacity-80" />

                    {item.isVegetarian && (
                      <div className="absolute top-3 left-3 w-5 h-5 bg-[#06070A]/80 backdrop-blur-md rounded border border-white/20 flex items-center justify-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#50C878]" />
                      </div>
                    )}

                    {item.recommendationReason && (
                      <span className="absolute bottom-3 left-3 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-black/75 text-amber-300 border border-white/10 backdrop-blur-md">
                        {item.recommendationReason}
                      </span>
                    )}
                  </div>

                  <div className="p-4 flex flex-col justify-between flex-1">
                    <div>
                      <h4 className="text-base font-serif font-black text-white group-hover:text-amber-300 transition-colors line-clamp-1 mb-1">
                        {item.name}
                      </h4>
                      {item.description && (
                        <p className="text-xs text-slate-400 line-clamp-1 mb-3">
                          {item.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/5 mt-auto">
                      <span className="text-lg font-black text-white">₹{item.price}</span>
                      <button
                        onClick={(e) => handleAdd(e, item)}
                        className="px-4 py-2 rounded-full bg-gradient-to-r from-[#FF6B00] to-[#FF8800] text-white font-extrabold text-xs uppercase tracking-wider shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Prominent "View Full Menu" CTA */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-white/[0.05] to-white/[0.02] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <h3 className="text-lg font-serif font-black text-white">Looking for something else?</h3>
            <p className="text-xs text-slate-400 mt-0.5">Explore our complete catalog of wood-fired pizzas, sides, and drinks</p>
          </div>
          <Link
            to="/menu"
            className="px-7 py-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shrink-0"
          >
            <span>View Full Menu</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

      </section>
    );
  }

  // ── CASE B: NEW CUSTOMER (OR UN-AUTHENTICATED) ─────────────────────────────
  // Reveal progressively: small curated selection of 3-4 items max!
  if (curatedHighlights.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-8 py-6 flex flex-col gap-6">
      <div className="flex items-end justify-between">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#FF6B00] mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Chef's Selections</span>
          </span>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-serif font-black text-white tracking-tight">
            Curated Highlights
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            A taste of our signature wood-fired recipes
          </p>
        </div>

        <Link
          to="/menu"
          className="text-xs font-bold text-[#FF8800] hover:text-[#FF6B00] flex items-center gap-1 transition-colors"
        >
          <span>Full Menu</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Curated 3-4 Products (Not dumping 50 items!) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {curatedHighlights.map((item) => (
          <div
            key={item.id}
            onClick={() => navigate(`/product/${item.id}`)}
            className="rounded-3xl overflow-hidden bg-[#161922]/80 backdrop-blur-xl border border-white/10 hover:border-[#FF6B00]/50 transition-all flex flex-col justify-between shadow-xl cursor-pointer group"
          >
            <div className="relative w-full h-44 overflow-hidden bg-black/40">
              <img
                src={item.image || "https://res.cloudinary.com/dxmlvkff1/image/upload/v1786517437/olive-pizza/ai-product-images/dv4uty06rq4tznlpqz2i.jpg"}
                alt={item.name}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://res.cloudinary.com/dxmlvkff1/image/upload/v1786517437/olive-pizza/ai-product-images/dv4uty06rq4tznlpqz2i.jpg";
                }}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#06070A] via-transparent to-transparent opacity-80" />

              {item.isVegetarian && (
                <div className="absolute top-3 left-3 w-5 h-5 bg-[#06070A]/80 backdrop-blur-md rounded border border-white/20 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#50C878]" />
                </div>
              )}
            </div>

            <div className="p-4 flex flex-col justify-between flex-1">
              <div>
                <h4 className="text-base font-serif font-black text-white group-hover:text-amber-300 transition-colors line-clamp-1 mb-1">
                  {item.name}
                </h4>
                {item.description && (
                  <p className="text-xs text-slate-400 line-clamp-1 mb-3">
                    {item.description}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/5 mt-auto">
                <span className="text-lg font-black text-white">₹{item.price}</span>
                <button
                  onClick={(e) => handleAdd(e, item)}
                  className="px-4 py-2 rounded-full bg-gradient-to-r from-[#FF6B00] to-[#FF8800] text-white font-extrabold text-xs uppercase tracking-wider shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Prominent "View Full Menu" CTA */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-white/[0.05] to-white/[0.02] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left mt-2">
        <div>
          <h3 className="text-lg font-serif font-black text-white">Ready to explore more?</h3>
          <p className="text-xs text-slate-400 mt-0.5">Discover our full menu with all crust styles, toppings, and sides</p>
        </div>
        <Link
          to="/menu"
          className="px-7 py-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shrink-0"
        >
          <span>View Full Menu</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}
