import React, { useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router";
import { Plus, Minus, Star, Heart } from "lucide-react";
import { useCartStore } from "../../lib/store";
import { trackEvent } from "../../lib/analytics";
import WishlistButton from "./WishlistButton";
import toast from "react-hot-toast";
import { useCartAnimation } from "./CartAnimationProvider";
import { getOptimizedImageUrl } from "../../lib/imageOptimizer";

interface LuxuryProductCardProps {
  product: any;
  wishlistIds: string[];
  index: number;
}

export default function LuxuryProductCard({ product, wishlistIds, index }: LuxuryProductCardProps) {
  const { items, addItem, updateQuantity, removeItem } = useCartStore();
  const { triggerAnimation } = useCartAnimation();

  const inCartItem = items.find((i) => i.id === product.id || i.menuItemId === product.id);
  const cartQuantity = inCartItem?.quantity || 0;

  const appliedDiscount = Number(product.discountPercentage || 0);
  const basePrice = Number(product.basePrice || product.price || 0);
  const finalPrice =
    product.pricingMode === "offer" && product.offerPrice
      ? Number(product.offerPrice)
      : appliedDiscount > 0
      ? Math.round(basePrice * (1 - appliedDiscount / 100))
      : basePrice;

  const imageUrl = product.imageUrl || product.image || "/images/pizza-placeholder.webp";

  const handleAddToCart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      triggerAnimation(e, imageUrl, () => {
        addItem({
          id: product.id,
          productId: product.id,
          name: product.productName || product.name,
          price: finalPrice,
          quantity: 1,
          image: imageUrl,
          isVegetarian: product.isVegetarian !== undefined ? Boolean(product.isVegetarian) : true,
        } as any);

        trackEvent({ type: "product_view", productId: product.id });
        toast.success(`Added ${product.productName || product.name}! 🍕`, {
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
    },
    [addItem, product, triggerAnimation, imageUrl, finalPrice]
  );

  const handleIncrease = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!inCartItem) {
      handleAddToCart(e);
      return;
    }
    triggerAnimation(e, imageUrl, () => {
      updateQuantity(inCartItem.id, inCartItem.quantity + 1);
    });
  };

  const handleDecrease = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!inCartItem) return;
    if (inCartItem.quantity <= 1) {
      removeItem(inCartItem.id);
      toast.success(`Removed item`, { duration: 1500 });
    } else {
      updateQuantity(inCartItem.id, inCartItem.quantity - 1);
    }
  };

  const isCombo = product.items?.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      data-product-card="true"
      id={`luxury-card-${product.id}`}
      className="relative group cursor-pointer"
    >
      <Link to={`/product/${product.id}`} className="block">
        <div className="relative overflow-hidden rounded-2xl md:rounded-3xl bg-white border border-stone-200/90 shadow-[0_4px_20px_-2px_rgba(28,25,23,0.06)] hover:shadow-[0_12px_32px_-4px_rgba(28,25,23,0.12)] transition-all duration-300">
          {/* ── Image Container ────────────────────────────────────────── */}
          <div className="relative aspect-square overflow-hidden bg-stone-100">
            <img
              data-product-img="true"
              src={getOptimizedImageUrl(imageUrl, { width: 500 })}
              alt={product.productName || product.name}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-106"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500";
              }}
            />

            {/* Top row badges */}
            <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-10">
              <div className="flex items-center gap-1.5">
                {/* Veg / Non-veg dot */}
                {product.isVegetarian !== undefined && (
                  <div
                    className={`w-4 h-4 rounded-sm border-2 bg-white/95 backdrop-blur-sm flex items-center justify-center shadow-sm ${
                      product.isVegetarian ? "border-emerald-600" : "border-rose-600"
                    }`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${
                        product.isVegetarian ? "bg-emerald-600" : "bg-rose-600"
                      }`}
                    />
                  </div>
                )}

                {appliedDiscount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
                    {appliedDiscount}% OFF
                  </span>
                )}
                {isCombo && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
                    COMBO
                  </span>
                )}
              </div>

              <div onClick={(e) => e.preventDefault()}>
                <WishlistButton productId={product.id} wishlistIds={wishlistIds} size="sm" />
              </div>
            </div>

            {/* Bottom gradient on image */}
            <div className="absolute bottom-0 left-0 right-0 h-14 bg-gradient-to-t from-stone-900/40 to-transparent pointer-events-none" />
          </div>

          {/* ── Card Info ──────────────────────────────────────────────── */}
          <div className="p-3.5 sm:p-4 bg-white">
            <h3 className="font-extrabold text-stone-900 text-sm sm:text-base line-clamp-1 mb-1 group-hover:text-red-600 transition-colors">
              {product.productName || product.name}
            </h3>

            {product.description && (
              <p className="text-stone-500 text-xs line-clamp-2 min-h-[2rem] leading-relaxed">
                {product.description}
              </p>
            )}

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-stone-100">
              {/* Pricing */}
              <div className="flex items-baseline gap-1.5">
                <span className="text-base sm:text-lg font-black text-stone-900">
                  ₹{finalPrice}
                </span>
                {appliedDiscount > 0 && (
                  <span className="text-xs text-stone-400 line-through font-medium">
                    ₹{basePrice}
                  </span>
                )}
              </div>

              {/* Add / Stepper */}
              {cartQuantity > 0 ? (
                <div
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  className="flex items-center gap-2 px-2 py-1 rounded-xl bg-red-50 border border-red-200 text-red-700 shadow-xs"
                >
                  <button
                    type="button"
                    onClick={handleDecrease}
                    className="w-6 h-6 rounded-lg bg-white text-red-600 hover:bg-red-600 hover:text-white flex items-center justify-center font-black text-xs transition-colors shadow-xs active:scale-90 cursor-pointer"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="font-black text-xs sm:text-sm min-w-[14px] text-center">
                    {cartQuantity}
                  </span>
                  <button
                    type="button"
                    onClick={handleIncrease}
                    className="w-6 h-6 rounded-lg bg-red-600 text-white hover:bg-red-700 flex items-center justify-center font-black text-xs transition-colors shadow-xs active:scale-90 cursor-pointer"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={handleAddToCart}
                  className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1 shadow-sm shadow-red-500/20 transition-all cursor-pointer min-h-[34px]"
                  aria-label={`Add ${product.productName} to cart`}
                >
                  <span>Add</span>
                  <Plus className="w-3.5 h-3.5" />
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
