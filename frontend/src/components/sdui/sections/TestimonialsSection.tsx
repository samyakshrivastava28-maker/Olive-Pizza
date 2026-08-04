import React from 'react';
import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';

interface TestimonialsProps {
  config?: {
    title?: string;
    subtitle?: string;
    testimonials?: Array<{
      id: string;
      name: string;
      role?: string;
      avatar?: string;
      rating: number;
      text: string;
    }>;
  };
}

const DEFAULT_TESTIMONIALS = [
  {
    id: '1',
    name: 'Aarav Sharma',
    role: 'Food Blogger, Rajnandgaon',
    rating: 5,
    text: 'Olive Pizza is hands down the best gourmet pizza in town! The hand-stretched crust and live 3D tracking make the entire experience feel magical.',
  },
  {
    id: '2',
    name: 'Priya Verma',
    role: 'Verified Customer',
    rating: 5,
    text: 'Lightning fast 30-minute delivery. The cheese pull on the Farmhouse Special is absolutely unreal. Highly recommended!',
  },
  {
    id: '3',
    name: 'Rohan Gupta',
    role: 'Regular Patron',
    rating: 5,
    text: 'The AI assistant helped me customize my pizza perfectly according to my dietary preferences. Truly a 10/10 tech-forward restaurant.',
  },
];

export const TestimonialsSection: React.FC<TestimonialsProps> = ({ config }) => {
  const title = config?.title || 'What Our Customers Say';
  const subtitle = config?.subtitle || 'Real reviews from authentic pizza lovers across Rajnandgaon';
  const list = config?.testimonials && config.testimonials.length > 0 ? config.testimonials : DEFAULT_TESTIMONIALS;

  return (
    <section className="py-12 px-4 max-w-7xl mx-auto relative z-10">
      <div className="text-center mb-10">
        <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">{title}</h2>
        <p className="text-slate-400 text-sm mt-2 max-w-xl mx-auto">{subtitle}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {list.map((item, idx) => (
          <motion.div
            key={item.id || idx}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.1 }}
            className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl relative flex flex-col justify-between"
          >
            <div>
              <Quote className="w-8 h-8 text-primary-500/30 mb-3" />
              <p className="text-slate-300 text-sm leading-relaxed mb-6 italic">"{item.text}"</p>
            </div>
            <div>
              <div className="flex items-center gap-1 mb-2 text-amber-400">
                {[...Array(item.rating || 5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400" />
                ))}
              </div>
              <p className="text-white font-bold text-sm">{item.name}</p>
              {item.role && <p className="text-slate-500 text-xs">{item.role}</p>}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};
export default TestimonialsSection;
