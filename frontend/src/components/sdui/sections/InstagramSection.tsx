import React from 'react';
import { Camera } from 'lucide-react';
import { SDUISection } from '../../../types/sdui.types';

const defaultInsta = [
  { url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=400&q=80', likes: '1.2k' },
  { url: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=400&q=80', likes: '2.4k' },
  { url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=400&q=80', likes: '3.1k' },
  { url: 'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?auto=format&fit=crop&w=400&q=80', likes: '1.8k' },
];

export const InstagramSection: React.FC<{ section: SDUISection }> = ({ section }) => {
  const posts = section.config?.posts || defaultInsta;

  return (
    <div className="w-full my-8 max-w-5xl mx-auto px-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Camera className="w-6 h-6 text-pink-500" />
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">{section.label || 'Follow Us On Instagram'}</h3>
            {section.subtitle && <p className="text-xs text-slate-400">@olivepizza.official</p>}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {posts.map((p: any, i: number) => (
          <div key={i} className="group relative rounded-2xl overflow-hidden aspect-square border border-white/10">
            <img src={p.url} alt="Instagram" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold gap-1 text-sm">
              <span>❤️ {p.likes}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default InstagramSection;
