import React from 'react';
import { motion } from 'framer-motion';
import { Star, Plus, Flame } from 'lucide-react';
import { useCartStore } from '../../../lib/store';
import { useCartAnimation } from '../../ui/CartAnimationProvider';

interface FeaturedItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  image: string;
  isVeg?: boolean;
  isBestseller?: boolean;
}

interface FeaturedItemsCarouselProps {
  title?: string;
  subtitle?: string;
  items?: FeaturedItem[];
}

const DEFAULT_ITEMS: FeaturedItem[] = [
  {
    id: 'f1',
    name: 'Truffle & Burrata Artisan',
    description: 'Fresh burrata, black truffle pesto, wild mushrooms & roasted garlic.',
    price: 649,
    image: 'https://res.cloudinary.com/diwh22z4a/image/upload/v1711200000/olive-pizza/hero_banner.png',
    isVeg: true,
    isBestseller: true,
  },
  {
    id: 'f2',
    name: 'Double Smoked Pepperoni',
    description: 'Wood-fired pepperoni, hot honey drizzle, aged mozzarella.',
    price: 699,
    image: 'https://res.cloudinary.com/diwh22z4a/image/upload/v1711200000/olive-pizza/hero_banner.png',
    isVeg: false,
    isBestseller: true,
  },
  {
    id: 'f3',
    name: 'Smoked Chicken & Jalapeño',
    description: 'Slow-roasted chicken, pickled jalapeño, caramelized onion.',
    price: 599,
    image: 'https://res.cloudinary.com/diwh22z4a/image/upload/v1711200000/olive-pizza/hero_banner.png',
    isVeg: false,
  },
];

export default function FeaturedItemsCarousel({
  title = 'Chef Specials & Bestsellers',
  subtitle = 'Handpicked signature creations prepared with fresh ingredients daily.',
  items = DEFAULT_ITEMS,
}: FeaturedItemsCarouselProps) {
  const list = items.length > 0 ? items : DEFAULT_ITEMS;
  const addItem = useCartStore((s) => s.addItem);
  const { triggerAnimation } = useCartAnimation();

  const handleAdd = (e: React.MouseEvent, item: FeaturedItem) => {
    triggerAnimation(e, item.image || '', () => {
      addItem({
        id: item.id,
        productId: item.id,
        productName: item.name,
        price: item.price,
        quantity: 1,
        imageUrl: item.image || '',
      } as any);
    });
  };

  return (
    <div className="w-full max-w-7xl mx-auto py-12 px-4 sm:px-6">
      <div className="text-left mb-8">
        <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight mb-2">
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm sm:text-base text-slate-400 font-medium">
            {subtitle}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {list.map((item) => (
          <motion.div
            key={item.id}
            whileHover={{ y: -6 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="group relative rounded-3xl overflow-hidden bg-neutral-900 border border-neutral-800 p-4 shadow-xl flex flex-col justify-between"
          >
            {/* Image Container */}
            <div className="relative w-full h-48 sm:h-52 rounded-2xl overflow-hidden mb-4 bg-neutral-950">
              <img
                src={item.image}
                alt={item.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/80 via-transparent to-transparent" />

              {/* Badges */}
              <div className="absolute top-3 left-3 flex items-center gap-2">
                {item.isBestseller && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-500 text-black shadow-md">
                    <Flame className="w-3 h-3 fill-black" />
                    Bestseller
                  </span>
                )}
              </div>

              <div className="absolute top-3 right-3">
                <span
                  className={`inline-block w-4 h-4 rounded-sm border-2 ${
                    item.isVeg ? 'border-emerald-500' : 'border-red-500'
                  } p-0.5`}
                >
                  <span
                    className={`block w-full h-full rounded-full ${
                      item.isVeg ? 'bg-emerald-500' : 'bg-red-500'
                    }`}
                  />
                </span>
              </div>
            </div>

            {/* Details */}
            <div className="flex-1 flex flex-col justify-between text-left">
              <div>
                <h3 className="text-lg font-black text-white mb-1 group-hover:text-amber-400 transition-colors">
                  {item.name}
                </h3>
                {item.description && (
                  <p className="text-xs text-slate-400 font-medium line-clamp-2 mb-4 leading-relaxed">
                    {item.description}
                  </p>
                )}
              </div>

              {/* Footer / Add Button */}
              <div className="flex items-center justify-between pt-3 border-t border-neutral-800">
                <span className="text-lg font-black text-amber-400">
                  ₹{item.price}
                </span>

                <button
                  onClick={(e) => handleAdd(e, item)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-extrabold text-xs text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-md active:scale-95 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
