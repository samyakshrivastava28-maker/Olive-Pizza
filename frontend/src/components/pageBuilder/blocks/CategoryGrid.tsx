import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router';
import { Pizza, Flame, Sparkles, Coffee, IceCream, Utensils } from 'lucide-react';

interface CategoryItem {
  id: string;
  name: string;
  image?: string;
  slug: string;
  itemCount?: number;
}

interface CategoryGridProps {
  title?: string;
  categories?: CategoryItem[];
  gridColumns?: 2 | 3 | 4 | 6;
}

const DEFAULT_CATEGORIES: CategoryItem[] = [
  { id: '1', name: 'Wood-Fired Pizzas', slug: 'pizzas', itemCount: 18 },
  { id: '2', name: 'Artisan Sides', slug: 'sides', itemCount: 12 },
  { id: '3', name: 'Gourmet Pastas', slug: 'pastas', itemCount: 8 },
  { id: '4', name: 'Desserts & Sweets', slug: 'desserts', itemCount: 10 },
  { id: '5', name: 'Craft Beverages', slug: 'beverages', itemCount: 14 },
  { id: '6', name: 'Special Combos', slug: 'combos', itemCount: 6 },
];

export default function CategoryGrid({
  title = 'Explore Our Menu',
  categories = DEFAULT_CATEGORIES,
  gridColumns = 4,
}: CategoryGridProps) {
  const list = categories.length > 0 ? categories : DEFAULT_CATEGORIES;

  const colMap = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 sm:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4',
    6: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-6',
  };

  return (
    <div className="w-full max-w-7xl mx-auto py-10 px-4 sm:px-6">
      {title && (
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {title}
          </h2>
          <Link
            to="/menu"
            className="text-xs sm:text-sm font-bold text-amber-400 hover:text-amber-300 transition-colors"
          >
            View Full Menu →
          </Link>
        </div>
      )}

      <div className={`grid ${colMap[gridColumns] || colMap[4]} gap-4 sm:gap-6`}>
        {list.map((cat, idx) => (
          <motion.div
            key={cat.id || idx}
            whileHover={{ y: -6, scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <Link
              to={`/menu?category=${encodeURIComponent(cat.slug)}`}
              className="group relative block h-40 sm:h-48 rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800 p-5 shadow-lg flex flex-col justify-end"
            >
              {/* Background Glow or Image */}
              {cat.image ? (
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-neutral-950 group-hover:from-amber-950/40 group-hover:to-orange-950/40 transition-colors duration-300" />
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10" />

              {/* Icon & Details */}
              <div className="relative z-20">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 group-hover:bg-amber-500 group-hover:text-black transition-all">
                  <Pizza className="w-5 h-5" />
                </div>
                <h3 className="text-base sm:text-lg font-black text-white leading-snug group-hover:text-amber-400 transition-colors">
                  {cat.name}
                </h3>
                {cat.itemCount !== undefined && (
                  <p className="text-xs text-slate-400 font-medium mt-1">
                    {cat.itemCount} Items
                  </p>
                )}
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
