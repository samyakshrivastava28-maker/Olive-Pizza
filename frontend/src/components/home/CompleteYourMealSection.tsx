import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Sparkles } from 'lucide-react';
import { useDataStore } from '../../lib/dataStore';
import { useCartStore } from '../../lib/store';
import { useCartAnimation } from '../ui/CartAnimationProvider';
import toast from 'react-hot-toast';

export default function CompleteYourMealSection() {
  const products = useDataStore((s) => s.products);
  const addItem = useCartStore((s) => s.addItem);
  const { triggerAnimation } = useCartAnimation();

  // Smart resolution of complementary items (Sides, Beverages, Desserts)
  const mealAddons = useMemo(() => {
    if (!products || products.length === 0) return [];

    const sides = products.filter(
      (p: any) => p.isActive !== false && (p.category === 'sides' || p.category === 'breads' || (p.name || '').toLowerCase().includes('garlic'))
    );
    const beverages = products.filter(
      (p: any) => p.isActive !== false && (p.category === 'beverage' || p.category === 'drinks' || (p.name || '').toLowerCase().includes('coke') || (p.name || '').toLowerCase().includes('pepsi'))
    );
    const desserts = products.filter(
      (p: any) => p.isActive !== false && (p.category === 'dessert' || (p.name || '').toLowerCase().includes('lava') || (p.name || '').toLowerCase().includes('brownie'))
    );

    // Pick best 4 representative items across categories
    const selected: any[] = [];
    if (sides[0]) selected.push(sides[0]);
    if (beverages[0]) selected.push(beverages[0]);
    if (desserts[0]) selected.push(desserts[0]);
    if (sides[1]) selected.push(sides[1]);
    else if (beverages[1]) selected.push(beverages[1]);
    else if (desserts[1]) selected.push(desserts[1]);

    return selected;
  }, [products]);

  if (mealAddons.length === 0) return null;

  const handleQuickAdd = (e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    const finalPrice = Number(item.offerPrice || item.basePrice || item.price || 99);
    const imgUrl = item.imageUrl || item.image || '';

    triggerAnimation(e, imgUrl, () => {
      addItem({
        id: item.id,
        menuItemId: item.id,
        name: item.name || item.productName,
        price: finalPrice,
        quantity: 1,
        image: imgUrl,
        isVegetarian: item.isVegetarian !== undefined ? Boolean(item.isVegetarian) : true,
      });

      toast.success(`Added ${item.name || item.productName || 'item'} to cart! 🍽️`, {
        style: {
          background: '#18181b',
          color: '#fff',
          border: '1px solid rgba(249, 115, 22, 0.4)',
          borderRadius: '16px',
        },
      });
    });
  };

  return (
    <section className="relative py-12 sm:py-16 overflow-hidden z-10">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-5xl h-64 bg-gradient-to-r from-emerald-500/10 via-amber-500/10 to-orange-500/10 blur-3xl pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 md:mb-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-md mb-3">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-black uppercase tracking-wider text-emerald-300">
                Tasty Pairings
              </span>
            </div>
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">
              Complete Your <span className="bg-gradient-to-r from-emerald-400 via-amber-300 to-orange-400 bg-clip-text text-transparent">Meal</span>
            </h2>
          </div>
          <p className="text-slate-400 text-xs sm:text-sm md:text-base max-w-md mt-2 md:mt-0 font-medium">
            Pair your pizza with fresh garlic breads, cold beverages, and warm desserts.
          </p>
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {mealAddons.map((item: any, idx: number) => {
            const price = Number(item.offerPrice || item.basePrice || item.price || 99);
            const originalPrice = item.offerPrice ? Number(item.basePrice || 0) : 0;
            const imgUrl = item.imageUrl || item.image || 'https://images.unsplash.com/photo-1544982503-9f984c14501a?w=400&q=80';

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.08 }}
                whileHover={{ y: -6, scale: 1.02 }}
                className="group relative bg-dark-900/90 border border-white/10 rounded-2xl md:rounded-3xl p-3.5 sm:p-4 overflow-hidden flex flex-col justify-between hover:border-emerald-500/40 hover:shadow-[0_0_25px_rgba(16,185,129,0.15)] transition-all duration-300"
              >
                {/* Product Image */}
                <div className="aspect-square relative rounded-xl sm:rounded-2xl overflow-hidden bg-dark-950/60 mb-3">
                  <img
                    src={imgUrl.replace('/upload/', '/upload/f_auto,q_auto,w_400/')}
                    alt={item.name || item.productName}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-dark-950/70 via-transparent to-transparent opacity-80" />

                  {/* Veg / Non-Veg Indicator */}
                  <div
                    className="absolute top-2 left-2 w-4 h-4 rounded border flex items-center justify-center shadow-md backdrop-blur-sm"
                    style={{
                      borderColor: item.isVegetarian !== false ? '#22c55e' : '#ef4444',
                      background: item.isVegetarian !== false ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
                    }}
                  >
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: item.isVegetarian !== false ? '#22c55e' : '#ef4444' }}
                    />
                  </div>
                </div>

                {/* Product Info */}
                <div className="flex-1 flex flex-col">
                  <h3 className="font-bold text-white text-xs sm:text-sm md:text-base line-clamp-1 mb-1 group-hover:text-emerald-300 transition-colors">
                    {item.name || item.productName}
                  </h3>
                  {item.description && (
                    <p className="text-slate-400 text-[11px] sm:text-xs line-clamp-1 mb-3 font-normal">
                      {item.description}
                    </p>
                  )}
                </div>

                {/* Price & Quick Add Button */}
                <div className="flex items-center justify-between pt-2 border-t border-white/10 mt-auto">
                  <div className="flex flex-col leading-none">
                    {originalPrice > price && (
                      <span className="text-[10px] text-slate-500 line-through">₹{originalPrice}</span>
                    )}
                    <span className="text-sm sm:text-base font-black text-emerald-400">
                      ₹{price}
                    </span>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => handleQuickAdd(e, item)}
                    className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20 transition-all"
                    aria-label={`Add ${item.name || item.productName || 'item'} to cart`}
                  >
                    <Plus className="w-4 h-4" />
                  </motion.button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
