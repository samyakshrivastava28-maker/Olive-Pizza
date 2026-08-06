import React, { useState } from 'react';
import { SDUISection } from '../../../../types/sdui.types';
import {
  History, Save, LayoutTemplate, Image, Palette, Type,
  AlignHorizontalSpaceAround, Zap, ChevronRight, PlusCircle,
  Star, Clock, Flame
} from 'lucide-react';

interface Props {
  savedDrafts: any[];
  onLoadDraft: (draft: any) => void;
  onClearHistory: () => void;
}

const DESIGN_TEMPLATES = [
  { id: 'modern_feast', emoji: '🍕', name: 'Modern Pizza Feast', desc: 'Best sellers, coupons, hero' },
  { id: 'luxury_restaurant', emoji: '👑', name: 'Luxury Restaurant UI', desc: 'Gold cards, gallery, chef reviews' },
  { id: 'minimal_fast', emoji: '⚡', name: 'Ultra Minimal', desc: 'Clean, fast, conversion focused' },
  { id: 'diwali_festival', emoji: '🪔', name: 'Diwali Festival', desc: 'Gold festive, warm coupons, celebration' },
  { id: 'glass_ui', emoji: '💎', name: 'Premium Glass UI', desc: 'Glassmorphism, glow, floating cards' },
];

const BRAND_TOKENS = [
  { name: 'Pizza Orange', color: '#f97316', label: 'Primary' },
  { name: 'Olive Green', color: '#55775a', label: 'Secondary' },
  { name: 'Gold Accent', color: '#f59e0b', label: 'Accent' },
  { name: 'Near Black', color: '#06070a', label: 'Background' },
  { name: 'Surface', color: '#0f172a', label: 'Surface' },
];

const FONT_OPTIONS = [
  { name: 'Inter', class: 'font-sans', tag: 'Default' },
  { name: 'Outfit', class: '', tag: 'Premium' },
  { name: 'Playfair Display', class: '', tag: 'Luxury' },
];

type PanelType = 'history' | 'templates' | 'brand' | 'theme' | 'media';

export const StudioLeftSidebar: React.FC<Props & { onUseTemplate: (t: any) => void }> = ({
  savedDrafts,
  onLoadDraft,
  onClearHistory,
  onUseTemplate,
}) => {
  const [activePanel, setActivePanel] = useState<PanelType>('templates');

  const navItems: { id: PanelType; Icon: any; label: string }[] = [
    { id: 'templates', Icon: LayoutTemplate, label: 'Templates' },
    { id: 'history', Icon: History, label: 'History' },
    { id: 'brand', Icon: Palette, label: 'Brand' },
    { id: 'theme', Icon: Zap, label: 'Theme' },
    { id: 'media', Icon: Image, label: 'Media' },
  ];

  return (
    <aside className="flex h-full bg-[#0a0b0e] border-r border-white/[0.06]">
      {/* Icon nav */}
      <div className="w-14 flex flex-col items-center py-4 gap-1 border-r border-white/[0.06]">
        {navItems.map(({ id, Icon, label }) => (
          <button
            key={id}
            onClick={() => setActivePanel(id)}
            className={`w-10 h-10 flex flex-col items-center justify-center rounded-xl text-[9px] font-bold gap-1 transition-all ${
              activePanel === id
                ? 'bg-primary-500/20 text-primary-400 border border-primary-500/40'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="leading-none">{label}</span>
          </button>
        ))}
      </div>

      {/* Panel content */}
      <div className="w-52 flex flex-col overflow-hidden">
        {activePanel === 'templates' && (
          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Starter Templates</h4>
            {DESIGN_TEMPLATES.map(t => (
              <button
                key={t.id}
                onClick={() => onUseTemplate(t)}
                className="w-full text-left p-3 rounded-xl bg-slate-900/60 hover:bg-primary-950/40 border border-white/[0.07] hover:border-primary-500/40 transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{t.emoji}</span>
                  <div className="min-w-0">
                    <h5 className="text-xs font-bold text-white truncate group-hover:text-primary-300">{t.name}</h5>
                    <p className="text-[10px] text-slate-500 truncate">{t.desc}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {activePanel === 'history' && (
          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">AI History</h4>
              {savedDrafts.length > 0 && (
                <button onClick={onClearHistory} className="text-[10px] text-red-400 hover:underline">Clear</button>
              )}
            </div>
            {savedDrafts.length === 0 && (
              <div className="py-8 text-center text-slate-600 text-xs">
                <History className="w-6 h-6 mx-auto mb-2 opacity-40" />
                No design history yet
              </div>
            )}
            {savedDrafts.map(d => (
              <button
                key={d.id}
                onClick={() => onLoadDraft(d)}
                className="w-full text-left p-3 rounded-xl bg-slate-900/60 hover:bg-primary-950/40 border border-white/[0.07] hover:border-primary-500/40 transition-all"
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{d.name}</p>
                    <p className="text-[10px] text-slate-500">{d.timestamp}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {activePanel === 'brand' && (
          <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Brand Colors</h4>
            <p className="text-[10px] text-slate-500">AI is locked to these colors. No off-brand generation.</p>
            <div className="space-y-1.5">
              {BRAND_TOKENS.map(t => (
                <div key={t.name} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-900/60 border border-white/[0.07]">
                  <div className="w-7 h-7 rounded-lg border border-white/20 flex-shrink-0" style={{ background: t.color }} />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white">{t.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{t.color} · {t.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activePanel === 'theme' && (
          <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Typography</h4>
            <div className="space-y-1.5">
              {FONT_OPTIONS.map(f => (
                <div key={f.name} className="p-3 rounded-xl bg-slate-900/60 border border-white/[0.07]">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white">{f.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-primary-500/20 text-primary-400 font-bold">{f.tag}</span>
                  </div>
                </div>
              ))}
            </div>
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pt-2">Animations</h4>
            <div className="space-y-1.5 text-xs font-bold text-slate-300">
              {['Framer Motion Spring', 'GSAP ScrollTrigger', 'Floating 3D Cards', 'Magnetic Buttons', 'Smooth Page Transitions'].map(a => (
                <div key={a} className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/60 border border-white/[0.07]">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>{a}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activePanel === 'media' && (
          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Restaurant Images</h4>
            <div className="grid grid-cols-2 gap-2">
              {[
                'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=200&q=80',
                'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=200&q=80',
                'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=200&q=80',
                'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?auto=format&fit=crop&w=200&q=80',
              ].map((url, i) => (
                <div key={i} className="aspect-square rounded-xl overflow-hidden border border-white/[0.07] group cursor-pointer">
                  <img src={url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="media" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
