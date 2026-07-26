import React from 'react';
import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';

interface TestimonialItem {
  id: string;
  quote: string;
  author: string;
  role?: string;
  rating?: number;
  avatar?: string;
}

interface TestimonialsBlockProps {
  title?: string;
  testimonials?: TestimonialItem[];
}

const DEFAULT_TESTIMONIALS: TestimonialItem[] = [
  {
    id: 't1',
    quote: 'The wood-fired sourdough crust is incredible! Hands down the best artisanal pizza in Jaipur.',
    author: 'Aarav Sharma',
    role: 'Verified Customer',
    rating: 5,
    avatar: 'https://res.cloudinary.com/diwh22z4a/image/upload/v1711200000/olive-pizza/avatar_placeholder.png',
  },
  {
    id: 't2',
    quote: 'Super fast delivery and the Truffle Mushroom Pizza arrived piping hot inside the 3D box!',
    author: 'Priya Mehta',
    role: 'Food Blogger',
    rating: 5,
    avatar: 'https://res.cloudinary.com/diwh22z4a/image/upload/v1711200000/olive-pizza/avatar_placeholder.png',
  },
];

export default function TestimonialsBlock({
  title = 'What Our Customers Say',
  testimonials = DEFAULT_TESTIMONIALS,
}: TestimonialsBlockProps) {
  const list = testimonials.length > 0 ? testimonials : DEFAULT_TESTIMONIALS;

  return (
    <div className="w-full max-w-7xl mx-auto py-12 px-4 sm:px-6">
      {title && (
        <h2 className="text-2xl sm:text-4xl font-black text-white text-center tracking-tight mb-10">
          {title}
        </h2>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {list.map((item) => (
          <motion.div
            key={item.id}
            whileHover={{ y: -4 }}
            className="relative rounded-3xl bg-neutral-900 border border-neutral-800 p-8 shadow-xl text-left flex flex-col justify-between"
          >
            <Quote className="w-10 h-10 text-amber-500/20 mb-4" />

            {/* Stars */}
            <div className="flex items-center gap-1 mb-4">
              {Array.from({ length: item.rating || 5 }).map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
              ))}
            </div>

            <p className="text-base text-slate-200 font-medium italic mb-6 leading-relaxed">
              "{item.quote}"
            </p>

            <div className="flex items-center gap-3 pt-4 border-t border-neutral-800">
              {item.avatar ? (
                <img
                  src={item.avatar}
                  alt={item.author}
                  className="w-11 h-11 rounded-full object-cover border border-amber-500/30"
                />
              ) : (
                <div className="w-11 h-11 rounded-full bg-amber-500/20 text-amber-400 font-black flex items-center justify-center">
                  {item.author.charAt(0)}
                </div>
              )}

              <div>
                <h4 className="text-sm font-black text-white">{item.author}</h4>
                {item.role && (
                  <p className="text-xs text-slate-400 font-medium">{item.role}</p>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
