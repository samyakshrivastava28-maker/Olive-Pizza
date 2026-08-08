import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { SDUISection } from '../../../../types/sdui.types';
import { X, Flame, Sparkles, Wand2, Check } from 'lucide-react';

interface Props {
  onClose: () => void;
  onApply: (sections: SDUISection[]) => void;
}

const CAMPAIGN_TYPES = [
  { id: 'diwali',       emoji: '🪔', name: 'Diwali Festival',    color: '#f59e0b', desc: 'Festive gold theme with offers' },
  { id: 'christmas',    emoji: '🎄', name: 'Christmas Special',  color: '#22c55e', desc: 'Snow effects and holiday deals' },
  { id: 'flash_sale',   emoji: '⚡', name: 'Flash Sale',         color: '#ef4444', desc: 'Urgency countdown with offer' },
  { id: 'weekend',      emoji: '🎉', name: 'Weekend Deal',       color: '#8b5cf6', desc: 'Weekend exclusive combos' },
  { id: 'independence', emoji: '🇮🇳', name: 'Independence Day',  color: '#f97316', desc: 'Patriotic theme with discounts' },
  { id: 'new_year',     emoji: '🎆', name: 'New Year Special',   color: '#06b6d4', desc: 'New Year celebration campaign' },
  { id: 'custom',       emoji: '✏️', name: 'Custom Campaign',    color: '#64748b', desc: 'Build your own campaign' },
];

const DEFAULT_CAMPAIGN_HERO: (type: string, name: string) => SDUISection = (type, name) => ({
  id: `hero_campaign_${Date.now()}`,
  type: 'hero',
  label: `${name} Campaign Hero`,
  isVisible: true,
  order: 0,
  config: {
    headline: `✨ ${name} is Here!`,
    subheadline: 'Exclusive deals crafted just for you',
    ctaText: 'Grab the Deal',
    variant: type === 'flash_sale' ? 'minimal' : 'festival',
  },
  studioMeta: { addedAt: new Date().toISOString(), generatedByAI: true },
});

const DEFAULT_CAMPAIGN_COUPON: (name: string) => SDUISection = (name) => ({
  id: `coupons_campaign_${Date.now() + 1}`,
  type: 'coupons',
  label: `${name} Special Coupons`,
  isVisible: true,
  order: 1,
  config: { title: `${name} Offers`, layout: 'carousel' },
  studioMeta: { addedAt: new Date().toISOString(), generatedByAI: true },
});

export const CampaignModal: React.FC<Props> = ({ onClose, onApply }) => {
  const [step, setStep] = useState<'pick' | 'customize' | 'generating'>('pick');
  const [selectedType, setSelectedType] = useState<typeof CAMPAIGN_TYPES[0] | null>(null);
  const [customName, setCustomName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!selectedType) return;
    setStep('generating');
    setIsGenerating(true);

    const name = customName || selectedType.name;

    // Try AI generation, fallback to default campaign sections
    try {
      const res = await fetch('/api/website-manager/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Create a ${name} campaign homepage with hero, coupons, and offers sections. Use ${selectedType.id} festival theme.`,
          currentSections: [],
        }),
      });
      const data = await res.json();
      if (data?.sections?.length > 0) {
        onApply(data.sections);
        return;
      }
    } catch {}

    // Fallback default sections
    const sections: SDUISection[] = [
      DEFAULT_CAMPAIGN_HERO(selectedType.id, name),
      DEFAULT_CAMPAIGN_COUPON(name),
    ];
    setTimeout(() => {
      setIsGenerating(false);
      onApply(sections);
    }, 1500);
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
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="w-full max-w-2xl bg-[#0d0e12] border border-white/[0.08] rounded-3xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-black text-white">Campaign Studio</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-500 hover:text-white hover:bg-white/5">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'generating' ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                <Wand2 className="w-7 h-7 text-amber-400 animate-pulse" />
              </div>
              <div className="text-center">
                <p className="text-base font-black text-white mb-1">Generating Campaign...</p>
                <p className="text-xs text-slate-400">AI is creating your {selectedType?.name} campaign sections</p>
              </div>
              <div className="flex gap-1.5">
                {[0,1,2].map(i => (
                  <div key={i} className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: `${i * 0.1}s` }} />
                ))}
              </div>
            </div>
          ) : step === 'pick' ? (
            <>
              <p className="text-sm text-slate-400 mb-5">Choose a campaign type — AI generates the complete design</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {CAMPAIGN_TYPES.map(type => (
                  <motion.button
                    key={type.id}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setSelectedType(type); setStep('customize'); }}
                    className="flex flex-col gap-2 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/20 text-left transition-all"
                  >
                    <span className="text-3xl">{type.emoji}</span>
                    <div>
                      <p className="text-xs font-black text-white">{type.name}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{type.desc}</p>
                    </div>
                  </motion.button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-6 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                <span className="text-4xl">{selectedType?.emoji}</span>
                <div>
                  <p className="text-sm font-black text-white">{selectedType?.name}</p>
                  <p className="text-xs text-slate-500">{selectedType?.desc}</p>
                </div>
                <button onClick={() => setStep('pick')} className="ml-auto text-xs text-slate-500 hover:text-white">Change</button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2">Campaign Name (optional)</label>
                  <input
                    value={customName}
                    onChange={e => setCustomName(e.target.value)}
                    placeholder={selectedType?.name}
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm outline-none focus:border-primary-500/50 transition-colors"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setStep('pick')}
                    className="flex-1 py-3 rounded-xl border border-white/10 text-slate-400 text-sm font-bold hover:text-white transition-all"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleGenerate}
                    className="flex-1 py-3 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20 transition-all"
                  >
                    <Sparkles className="w-4 h-4" /> Generate Campaign
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
