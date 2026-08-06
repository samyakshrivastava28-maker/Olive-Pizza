import React from 'react';
import { SDUISection } from '../../../types/sdui.types';
import { Sparkles, Camera } from 'lucide-react';
import { motion } from 'framer-motion';

const defaultImages = [
  { url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80', caption: 'Artisanal 900° Brick Oven' },
  { url: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=600&q=80', caption: 'Imported San Marzano Mozzarella' },
  { url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=600&q=80', caption: 'Signature Spicy Pepperoni' },
  { url: 'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?auto=format&fit=crop&w=600&q=80', caption: 'Gourmet Truffle & Basil Crust' }
];

export const GallerySection: React.FC<{ section: SDUISection }> = ({ section }) => {
  const images = section.config?.images || defaultImages;

  return (
    <div className="w-full my-8 p-6 sm:p-8 rounded-[32px] bg-slate-950/80 border border-primary-500/30 shadow-2xl backdrop-blur-2xl relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-2xl font-black text-white tracking-tight">{section.label || 'Photo Gallery'}</h3>
            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Stitch 3D Grid
            </span>
          </div>
          {section.subtitle && <p className="text-xs text-slate-300 mt-1">{section.subtitle}</p>}
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-primary-400">
          <Camera className="w-4 h-4" /> Live Kitchen Photo Wall
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {images.map((img: any, i: number) => (
          <motion.div
            key={i}
            whileHover={{ scale: 1.04 }}
            className="group relative rounded-2xl overflow-hidden aspect-square border border-white/15 shadow-xl bg-slate-900"
          >
            <img src={img.url} alt={img.caption || 'Gallery'} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent opacity-90 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
              <span className="text-xs font-black text-white">{img.caption}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
export default GallerySection;
