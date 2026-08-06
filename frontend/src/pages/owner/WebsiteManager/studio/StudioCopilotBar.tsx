import React, { useState } from 'react';
import { SDUISection } from '../../../../types/sdui.types';
import { Sparkles, CheckCircle, X, ChevronUp, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Suggestion {
  id: string;
  priority: 'high' | 'medium' | 'low';
  icon: string;
  message: string;
  action: string;
  applyFn?: (sections: SDUISection[]) => SDUISection[];
}

interface Props {
  sections: SDUISection[];
  onApply: (updatedSections: SDUISection[]) => void;
}

function generateSuggestions(sections: SDUISection[]): Suggestion[] {
  const suggestions: Suggestion[] = [];

  const hasHero = sections.some(s => s.type === 'hero');
  const hasCoupons = sections.some(s => s.type === 'coupons');
  const hasBestSellers = sections.some(s => s.type === 'best_sellers');
  const hasDownloadApp = sections.some(s => s.type === 'download_app');
  const hasTestimonials = sections.some(s => s.type === 'testimonials');
  const couponsIdx = sections.findIndex(s => s.type === 'coupons');
  const adsIdx = sections.findIndex(s => s.type === 'ads');
  const categoriesIdx = sections.findIndex(s => s.type === 'categories');

  if (hasCoupons && adsIdx > -1 && couponsIdx > adsIdx) {
    suggestions.push({
      id: 'move-coupons-up',
      priority: 'high',
      icon: '🎟️',
      message: 'Coupons convert better above Ads. Move it higher for more redemptions.',
      action: 'Move Coupons Above Ads',
      applyFn: (secs) => {
        const reordered = [...secs];
        const cidx = reordered.findIndex(s => s.type === 'coupons');
        const aidx = reordered.findIndex(s => s.type === 'ads');
        if (cidx > -1 && aidx > -1 && cidx > aidx) {
          const [coupon] = reordered.splice(cidx, 1);
          reordered.splice(aidx, 0, coupon);
        }
        return reordered.map((s, i) => ({ ...s, order: i }));
      }
    });
  }

  if (!hasTestimonials) {
    suggestions.push({
      id: 'add-testimonials',
      priority: 'medium',
      icon: '⭐',
      message: 'Customer testimonials build trust and increase conversion by 30%.',
      action: 'Add Customer Reviews Section',
    });
  }

  if (!hasDownloadApp) {
    suggestions.push({
      id: 'add-app-download',
      priority: 'medium',
      icon: '📱',
      message: 'App download CTA at page end boosts app installs by 40%.',
      action: 'Add App Download Banner',
    });
  }

  if (categoriesIdx > 2) {
    suggestions.push({
      id: 'move-categories-top',
      priority: 'high',
      icon: '🍕',
      message: 'Menu categories should appear early — customers want to browse pizza first.',
      action: 'Move Categories Higher',
    });
  }

  if (!hasBestSellers) {
    suggestions.push({
      id: 'add-best-sellers',
      priority: 'high',
      icon: '🔥',
      message: 'Best Sellers drive 60% of first-time orders. Add them!',
      action: 'Add Best Sellers Section',
    });
  }

  if (sections.length < 4) {
    suggestions.push({
      id: 'more-sections',
      priority: 'low',
      icon: '📐',
      message: 'Your homepage has too few sections. Add more for a richer experience.',
      action: 'See Recommended Sections',
    });
  }

  if (sections.filter(s => !s.isVisible).length > 0) {
    suggestions.push({
      id: 'hidden-sections',
      priority: 'low',
      icon: '👁️',
      message: `${sections.filter(s => !s.isVisible).length} section(s) are hidden. Consider enabling them.`,
      action: 'Enable All Sections',
      applyFn: (secs) => secs.map(s => ({ ...s, isVisible: true })),
    });
  }

  return suggestions.slice(0, 5);
}

export const StudioCopilotBar: React.FC<Props> = ({ sections, onApply }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const suggestions = generateSuggestions(sections).filter(s => !dismissed.has(s.id));

  if (suggestions.length === 0) return null;

  const priorityColor = (p: string) =>
    p === 'high' ? 'text-red-400 bg-red-500/10 border-red-500/30' :
    p === 'medium' ? 'text-amber-400 bg-amber-500/10 border-amber-500/30' :
    'text-slate-400 bg-slate-900 border-white/[0.07]';

  return (
    <div className="border-t border-white/[0.06] bg-[#09090c] flex-shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary-400 animate-pulse" />
          <span className="text-xs font-black text-white">AI Co-pilot Suggestions</span>
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-300 border border-primary-500/30">
            {suggestions.length}
          </span>
        </div>
        <button onClick={() => setCollapsed(v => !v)} className="text-slate-500 hover:text-white">
          <ChevronUp className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Suggestions row */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-x-auto"
          >
            <div className="flex items-start gap-3 p-3 overflow-x-auto custom-scrollbar min-w-0">
              {suggestions.map(s => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="flex-shrink-0 w-64 p-3 rounded-2xl bg-slate-950/80 border border-white/[0.07] space-y-2"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-lg">{s.icon}</span>
                    <div className="min-w-0 flex-1">
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border uppercase ${priorityColor(s.priority)}`}>{s.priority}</span>
                      <p className="text-[11px] text-slate-200 font-semibold leading-snug mt-1">{s.message}</p>
                    </div>
                    <button
                      onClick={() => setDismissed(d => new Set([...d, s.id]))}
                      className="flex-shrink-0 text-slate-600 hover:text-slate-400"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex gap-1.5">
                    {s.applyFn && (
                      <button
                        onClick={() => {
                          if (s.applyFn) {
                            onApply(s.applyFn(sections));
                            setDismissed(d => new Set([...d, s.id]));
                          }
                        }}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl bg-primary-500 text-white font-black text-[10px] hover:bg-primary-600 transition-all"
                      >
                        <CheckCircle className="w-3 h-3" /> Apply
                      </button>
                    )}
                    <button
                      onClick={() => setDismissed(d => new Set([...d, s.id]))}
                      className="flex-1 flex items-center justify-center py-1.5 rounded-xl bg-slate-900 border border-white/[0.07] text-slate-400 font-black text-[10px] hover:text-white transition-all"
                    >
                      Ignore
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
