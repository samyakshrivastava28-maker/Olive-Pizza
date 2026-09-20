import React, { memo, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { MenuItem } from '../types/models';
import { Plus, Minus, Star, Clock, SlidersHorizontal } from 'lucide-react';
import WishlistButton from './ui/WishlistButton';
import { useCartStore } from '../lib/store';
import { useCartAnimation } from './ui/CartAnimationProvider';
import toast from 'react-hot-toast';

interface ProductCardProps {
  item: MenuItem;
  discount?: number;
  wishlistIds?: string[];
  onOpenCustomization?: (item: MenuItem) => void;
}

export default memo(function ProductCard({
  item,
  discount = 0,
  wishlistIds = [],
  onOpenCustomization,
}: ProductCardProps) {
  const navigate = useNavigate();
  const { items, addItem, updateQuantity, removeItem } = useCartStore();
  const { triggerAnimation } = useCartAnimation();

  // Find if item is already added to cart
  const inCartItem = items.find((i) => i.id === item.id || i.menuItemId === item.id);
  const cartQuantity = inCartItem?.quantity || 0;

  const appliedDiscount = item.discountPercentage || discount;
  const finalPrice =
    item.pricingMode === 'offer' && item.offerPrice
      ? item.offerPrice
      : appliedDiscount > 0
      ? Math.round(item.basePrice * (1 - appliedDiscount / 100))
      : item.basePrice;

  const handleCardClick = () => {
    if (item.isAvailable) {
      if (onOpenCustomization) {
        onOpenCustomization(item);
      } else {
        navigate(`/product/${item.id}`);
      }
    }
  };

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!item.isAvailable) return;

    const imageUrl = item.image || '/images/pizza-placeholder.webp';

    // Zero-latency state commitment + physical flight animation
    triggerAnimation(e, imageUrl, () => {
      addItem({
        id: item.id || '',
        menuItemId: item.id || '',
        name: item.name,
        price: finalPrice,
        quantity: 1,
        image: imageUrl,
        isVegetarian: item.isVegetarian,
        crust: 'Classic Crust',
        size: 'Medium',
      });

      toast.success(`Added ${item.name}! 🍕`, {
        duration: 1800,
        style: {
          background: '#1C1917',
          color: '#FFFFFF',
          borderRadius: '14px',
          fontWeight: 600,
          fontSize: '13px',
        },
      });
    });
  };

  const handleIncrease = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!inCartItem) {
      handleAdd(e);
      return;
    }
    const imageUrl = item.image || '/images/pizza-placeholder.webp';
    triggerAnimation(e, imageUrl, () => {
      updateQuantity(inCartItem.id, inCartItem.quantity + 1);
    });
  };

  const handleDecrease = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!inCartItem) return;
    if (inCartItem.quantity <= 1) {
      removeItem(inCartItem.id);
      toast.success(`Removed ${item.name}`, { duration: 1500 });
    } else {
      updateQuantity(inCartItem.id, inCartItem.quantity - 1);
    }
  };

  const isPizza = item.category === 'pizza' || item.name.toLowerCase().includes('pizza');
  const ratingValue =
    typeof (item as any).rating === 'number' && (item as any).rating > 0
      ? (item as any).rating.toFixed(1)
      : null;

  const optimizedImage = item.image?.includes('cloudinary')
    ? item.image.replace('/upload/', '/upload/f_auto,q_auto:good,w_500/')
    : item.image || '/images/pizza-placeholder.webp';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-20px' }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      onClick={handleCardClick}
      data-product-card="true"
      id={`product-card-${item.id}`}
      className={`rounded-2xl md:rounded-3xl bg-white border border-stone-200/90 shadow-[0_4px_20px_-2px_rgba(28,25,23,0.06)] hover:shadow-[0_12px_32px_-4px_rgba(28,25,23,0.12)] overflow-hidden flex flex-col relative transition-all duration-300 group cursor-pointer ${
        !item.isAvailable ? 'opacity-65 grayscale cursor-not-allowed' : ''
      }`}
    >
      {/* ── Top Visual / Food Image Area ───────────────────────────── */}
      <div className="relative w-full aspect-[4/3] overflow-hidden bg-stone-100">
        <img
          data-product-img="true"
          src={optimizedImage}
          alt={item.name}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover object-center group-hover:scale-106 transition-transform duration-500 ease-out"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500';
          }}
        />

        {/* Subtle Bottom Shade for Photo Depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-900/40 via-transparent to-transparent pointer-events-none" />

        {/* Top Badges Row */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-10">
          <div className="flex items-center gap-1.5">
            {/* Statutory FSSAI Veg / Non-Veg Indicator */}
            <div
              className={`w-4 h-4 rounded-sm border-2 bg-white/95 backdrop-blur-sm flex items-center justify-center shadow-sm ${
                item.isVegetarian ? 'border-emerald-600' : 'border-rose-600'
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  item.isVegetarian ? 'bg-emerald-600' : 'bg-rose-600'
                }`}
              />
            </div>

            {/* Discount Badge */}
            {appliedDiscount > 0 && item.isAvailable && (
              <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
                {appliedDiscount}% OFF
              </span>
            )}
          </div>

          {/* Wishlist Button */}
          <div onClick={(e) => e.stopPropagation()}>
            <WishlistButton productId={item.id || ''} wishlistIds={wishlistIds} size="sm" />
          </div>
        </div>

        {/* Bottom Floating Metadata on Image */}
        <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between z-10 pointer-events-none">
          {ratingValue ? (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/95 backdrop-blur-md text-stone-900 text-[11px] font-extrabold shadow-sm">
              <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
              <span>{ratingValue}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[11px] text-white/90 font-medium drop-shadow-md">
              <Clock className="w-3 h-3 text-amber-400" />
              <span>15–20m</span>
            </div>
          )}
        </div>

        {/* Sold Out Overlay */}
        {!item.isAvailable && (
          <div className="absolute inset-0 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center z-20">
            <span className="px-3.5 py-1 rounded-full bg-stone-900 text-stone-200 text-xs font-bold uppercase tracking-wider border border-stone-700">
              Sold Out
            </span>
          </div>
        )}
      </div>

      {/* ── Product Content Body ───────────────────────────────────── */}
      <div className="p-3.5 sm:p-4 flex flex-col flex-1 bg-white">
        {/* Title */}
        <h3 className="font-extrabold text-stone-900 text-sm sm:text-base leading-snug line-clamp-1 group-hover:text-red-600 transition-colors">
          {item.name}
        </h3>

        {/* Description */}
        <p className="text-stone-500 text-xs line-clamp-2 mt-1 min-h-[2rem] leading-relaxed">
          {item.description || 'Authentic hand-stretched dough with San Marzano sauce and melted mozzarella.'}
        </p>

        {/* ── Card Footer: Pricing & Action ──────────────────────────── */}
        <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
          {/* Price Stack */}
          <div className="flex items-baseline gap-1.5">
            <span className="text-base sm:text-lg font-black text-stone-900">
              ₹{finalPrice}
            </span>
            {appliedDiscount > 0 && (
              <span className="text-xs text-stone-400 line-through font-medium">
                ₹{item.basePrice}
              </span>
            )}
          </div>

          {/* Action: Customizer & Add / Quantity Stepper */}
          <div className="flex items-center gap-1.5">
            {isPizza && onOpenCustomization && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenCustomization(item);
                }}
                className="w-8 h-8 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition-colors border border-stone-200/80 active:scale-90"
                title="Customize Crust & Toppings"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>
            )}

            {/* If item is in cart: show Stepper; otherwise show ADD */}
            {cartQuantity > 0 ? (
              <div
                onClick={(e) => e.stopPropagation()}
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
                type="button"
                data-add-btn="true"
                whileTap={{ scale: 0.94 }}
                disabled={!item.isAvailable}
                onClick={handleAdd}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-sm shadow-red-500/20 transition-all cursor-pointer min-h-[36px]"
              >
                <span>Add</span>
                <Plus className="w-3.5 h-3.5" />
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
});
