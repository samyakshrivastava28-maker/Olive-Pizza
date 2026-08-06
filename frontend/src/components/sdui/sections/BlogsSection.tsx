import React from 'react';
import { SDUISection } from '../../../types/sdui.types';

const defaultPosts = [
  { title: 'The Secret Behind Authentic Italian Dough', snippet: 'Discover how 72-hour sourdough fermentation creates airy, digestible crusts.', date: 'Aug 2026' },
  { title: 'Top 5 Cheese Pairings for Wood-Fired Pizza', snippet: 'From Fior di Latte to Aged Parmigiano, master the art of melting.', date: 'Jul 2026' },
  { title: 'Why Thermal Express Box keeps Pizza Crispy', snippet: 'How our patented steam-release tech prevents soggy crusts during transit.', date: 'Jun 2026' }
];

export const BlogsSection: React.FC<{ section: SDUISection }> = ({ section }) => {
  const posts = section.config?.posts || defaultPosts;

  return (
    <div className="w-full my-8 max-w-5xl mx-auto px-4">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-white tracking-tight">{section.label || 'Latest Stories & Recipes'}</h3>
        {section.subtitle && <p className="text-xs text-slate-400 mt-1">{section.subtitle}</p>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {posts.map((post: any, i: number) => (
          <div key={i} className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 flex flex-col justify-between hover:border-primary-500/50 transition-all">
            <div>
              <span className="text-[10px] font-bold text-primary-400 uppercase tracking-widest">{post.date}</span>
              <h4 className="text-base font-bold text-white mt-1 mb-2">{post.title}</h4>
              <p className="text-xs text-slate-400 line-clamp-3">{post.snippet}</p>
            </div>
            <button className="mt-4 text-xs font-bold text-primary-400 hover:text-primary-300 text-left flex items-center gap-1">
              Read Story →
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
export default BlogsSection;
