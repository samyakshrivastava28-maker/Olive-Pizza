import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { SDUISection, AIDesignScore, AISuggestion } from '../../../../types/sdui.types';
import { X, Sparkles, Check, ChevronRight, Zap, Send, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

interface Props {
  sections: SDUISection[];
  onClose: () => void;
  onApplySuggestions: (fixed: SDUISection[]) => void;
  onPublish: () => void;
}

// Local mock score generator (until backend AI review endpoint is ready)
const generateMockScore = (sections: SDUISection[]): AIDesignScore => {
  const hasHero = sections.some(s => s.type === 'hero');
  const hasCoupons = sections.some(s => s.type === 'coupons');
  const hasCategories = sections.some(s => s.type === 'categories');
  const hasBestSellers = sections.some(s => s.type === 'best_sellers' || s.type === 'trending');
  const hasFaq = sections.some(s => s.type === 'faq');
  const count = sections.length;

  const spacing = Math.min(95, 70 + count * 3);
  const typography = hasHero ? 88 : 72;
  const accessibility = 80;
  const performance = Math.min(95, 60 + (count < 8 ? 30 : 10));
  const conversions = (hasHero ? 20 : 0) + (hasCoupons ? 20 : 0) + (hasCategories ? 15 : 0) + (hasBestSellers ? 15 : 0) + 30;
  const seo = hasHero ? 85 : 65;
  const responsiveness = 90;
  const overall = Math.round((spacing + typography + accessibility + performance + Math.min(100, conversions) + seo + responsiveness) / 7);

  const suggestions: AISuggestion[] = [];
  if (!hasHero) suggestions.push({ id: 's1', type: 'layout', severity: 'critical', message: 'Add a Hero section — it\'s the first thing customers see.', autoFixable: false });
  if (!hasCoupons) suggestions.push({ id: 's2', type: 'cta', severity: 'warning', message: 'Add a Coupons section to increase conversion rate.', autoFixable: false });
  if (!hasCategories) suggestions.push({ id: 's3', type: 'layout', severity: 'warning', message: 'Menu categories help customers find food faster.', autoFixable: false });
  if (count > 12) suggestions.push({ id: 's4', type: 'layout', severity: 'info', message: 'Too many sections can overwhelm customers. Consider reducing to 8-10.', autoFixable: false });
  if (hasFaq) suggestions.push({ id: 's5', type: 'layout', severity: 'info', message: 'Good! FAQ reduces support queries by ~40%.', autoFixable: false });

  return {
    overall,
    spacing,
    typography,
    accessibility,
    performance,
    conversions: Math.min(100, conversions),
    seo,
    responsiveness,
    suggestions,
    generatedAt: new Date().toISOString(),
  };
};

const ScoreCircle: React.FC<{ score: number; label: string; size?: 'sm' | 'lg' }> = ({ score, label, size = 'sm' }) => {
  const color = score >= 85 ? '#22c55e' : score >= 65 ? '#f59e0b' : '#ef4444';
  const r = size === 'lg' ? 40 : 24;
  const cx = size === 'lg' ? 48 : 30;
  const circumference = 2 * Math.PI * r;
  const dash = (score / 100) * circumference;

  return (
    <div className={`flex flex-col items-center gap-1 ${size === 'lg' ? 'gap-2' : ''}`}>
      <div className="relative">
        <svg width={size === 'lg' ? 96 : 60} height={size === 'lg' ? 96 : 60} viewBox={`0 0 ${cx * 2} ${cx * 2}`}>
          <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={size === 'lg' ? 6 : 4} />
          <circle
            cx={cx} cy={cx} r={r} fill="none"
            stroke={color} strokeWidth={size === 'lg' ? 6 : 4}
            strokeDasharray={circumference}
            strokeDashoffset={circumference - dash}
            strokeLinecap="round"
            transform={`rotate(-90 ${cx} ${cx})`}
            style={{ transition: 'stroke-dashoffset 1s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-black text-white ${size === 'lg' ? 'text-2xl' : 'text-sm'}`} style={{ color }}>
            {score}
          </span>
        </div>
      </div>
      <span className={`font-bold text-slate-400 ${size === 'lg' ? 'text-xs' : 'text-[9px]'}`}>{label}</span>
    </div>
  );
};

export const AIReviewModal: React.FC<Props> = ({ sections, onClose, onApplySuggestions, onPublish }) => {
  const [score, setScore] = useState<AIDesignScore | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/website-manager/ai-review', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sections }),
        });
        const data = await res.json();
        setScore(data?.score || generateMockScore(sections));
      } catch {
        setScore(generateMockScore(sections));
      }
      setIsLoading(false);
    }, 1800);
    return () => clearTimeout(timer);
  }, [sections]);

  const SCORE_CATEGORIES = score ? [
    { label: 'Spacing',       value: score.spacing       },
    { label: 'Typography',    value: score.typography    },
    { label: 'Accessibility', value: score.accessibility },
    { label: 'Performance',   value: score.performance   },
    { label: 'Conversions',   value: score.conversions   },
    { label: 'SEO',           value: score.seo           },
    { label: 'Responsive',    value: score.responsiveness},
  ] : [];

  const getSeverityIcon = (s: AISuggestion['severity']) => {
    if (s === 'critical') return <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />;
    if (s === 'warning') return <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />;
    return <Info className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="w-full max-w-xl bg-[#0d0e12] border border-white/[0.08] rounded-3xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-400" />
            <h2 className="text-lg font-black text-white">AI Design Review</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-500 hover:text-white hover:bg-white/5">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-violet-400 animate-pulse" />
              </div>
              <div className="text-center">
                <p className="text-sm font-black text-white mb-1">Analyzing Your Design...</p>
                <p className="text-xs text-slate-400">Checking accessibility, performance, conversions</p>
              </div>
              <div className="flex gap-1.5">
                {[0,1,2].map(i => (
                  <div key={i} className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: `${i * 0.1}s` }} />
                ))}
              </div>
            </div>
          ) : score ? (
            <>
              {/* Overall score */}
              <div className="flex items-center gap-6 p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                <ScoreCircle score={score.overall} label="Overall" size="lg" />
                <div>
                  <h3 className="text-base font-black text-white mb-1">
                    {score.overall >= 90 ? '🏆 Excellent Design!' :
                     score.overall >= 75 ? '✅ Good Design' :
                     score.overall >= 60 ? '⚠️ Needs Improvement' : '❌ Needs Work'}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {score.overall >= 90 ? 'Your website is optimized for conversions and user experience.' :
                     'Follow the suggestions below to improve your design score.'}
                  </p>
                  <p className="text-[10px] text-slate-600 mt-1">{sections.length} sections analyzed</p>
                </div>
              </div>

              {/* Category scores */}
              <div className="grid grid-cols-4 gap-3">
                {SCORE_CATEGORIES.map(cat => (
                  <div key={cat.label} className="flex flex-col items-center gap-1 p-3 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                    <ScoreCircle score={cat.value} label={cat.label} />
                  </div>
                ))}
              </div>

              {/* Suggestions */}
              {score.suggestions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Suggestions</p>
                  {score.suggestions.map(s => (
                    <div
                      key={s.id}
                      className={`flex items-start gap-3 p-3 rounded-xl border ${
                        s.severity === 'critical' ? 'bg-red-500/5 border-red-500/20' :
                        s.severity === 'warning' ? 'bg-amber-500/5 border-amber-500/20' :
                        'bg-blue-500/5 border-blue-500/20'
                      }`}
                    >
                      {getSeverityIcon(s.severity)}
                      <p className="text-xs text-slate-300 leading-relaxed">{s.message}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 rounded-xl border border-white/10 text-slate-400 text-sm font-bold hover:text-white transition-all"
                >
                  Keep Editing
                </button>
                <button
                  onClick={onPublish}
                  className="flex-1 py-3 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20 transition-all"
                >
                  <Send className="w-4 h-4" /> Publish Now
                </button>
              </div>
            </>
          ) : null}
        </div>
      </motion.div>
    </motion.div>
  );
};
