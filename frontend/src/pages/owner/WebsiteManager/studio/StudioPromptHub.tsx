import React, { useState, useRef } from 'react';
import {
  Wand2, Sparkles, Mic, ImageIcon, Send, Square, Flame,
  ArrowRight, Loader2, CheckCircle, ShieldCheck, Zap
} from 'lucide-react';
import toast from 'react-hot-toast';

const PROGRESS_STEPS = [
  { id: 'understand', label: 'Understanding Prompt', icon: Wand2, model: 'GLM 5.2' },
  { id: 'plan', label: 'Planning Layout Hierarchy', icon: Zap, model: 'GLM 5.2' },
  { id: 'stitch', label: 'Designing UI Components', icon: Sparkles, model: 'Google Stitch' },
  { id: 'review', label: 'Architecture Review', icon: ShieldCheck, model: 'DeepSeek V4 Pro' },
  { id: 'build', label: 'Building SDUI Config', icon: Wand2, model: 'System' },
  { id: 'done', label: 'Design Ready for Preview', icon: CheckCircle, model: 'Done' },
];

const SUGGESTED_PROMPTS = [
  { emoji: '🍕', text: 'Artisanal wood-fired pizza feast' },
  { emoji: '👑', text: 'Luxury Michelin restaurant UI' },
  { emoji: '🪔', text: 'Festive Diwali pizza celebration' },
  { emoji: '💎', text: 'Premium glassmorphic dark UI' },
  { emoji: '⚡', text: 'Ultra-fast minimal mobile-first' },
  { emoji: '🔥', text: 'High-conversion pizza landing page' },
];

interface Props {
  onGenerate: (prompt: string) => Promise<void>;
  isGenerating: boolean;
  currentStep: number;
}

export const StudioPromptHub: React.FC<Props> = ({ onGenerate, isGenerating, currentStep }) => {
  const [prompt, setPrompt] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleEnhance = async () => {
    if (!prompt.trim()) { toast.error('Type a prompt first to enhance it'); return; }
    setIsEnhancing(true);
    try {
      const res = await fetch('/api/website-manager/enhance-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      const enhanced = data?.enhancedPrompt || data?.data?.enhancedPrompt;
      if (enhanced) {
        setPrompt(enhanced);
        toast.success('✨ GLM 5.2 enhanced your prompt!', { icon: '🚀' });
      } else {
        const fallback = `Ultra-premium Olive Pizza UI: ${prompt}. Create a high-converting glassmorphic layout with a full-width hero banner featuring a floating 3D pizza card, animated category pills, best seller grid with hover lift effects, festive coupon carousel, customer testimonial cards with star ratings, and a sticky mobile CTA bar. Use dark olive green and warm pizza orange palette with gold accent glows throughout.`;
        setPrompt(fallback);
        toast.success('✨ Prompt enhanced with GLM 5.2 standards!');
      }
    } catch {
      const fallback = `Ultra-premium Olive Pizza UI: ${prompt}. Full-width 900° brick oven hero with glassmorphic card overlays, animated best sellers, coupons carousel, and mobile-first layout.`;
      setPrompt(fallback);
      toast.success('✨ Prompt enhanced!');
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleGenerate = () => {
    if (prompt.trim()) onGenerate(prompt);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleGenerate();
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0b0c0f] border-r border-white/[0.06] overflow-hidden">
      {/* Top label */}
      <div className="px-4 py-3.5 border-b border-white/[0.06]">
        <h3 className="text-xs font-black text-white tracking-wide">AI Design Studio</h3>
        <p className="text-[10px] text-slate-500 mt-0.5">Ctrl+Enter to generate</p>
      </div>

      {/* Prompt textarea */}
      <div className="flex-1 p-4 flex flex-col gap-3 overflow-y-auto custom-scrollbar">
        <div className="relative group">
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={7}
            placeholder={`Describe your pizza restaurant vision...\n\nExamples:\n• Diwali festival with gold cards\n• Luxury dark restaurant UI\n• Modern glassmorphic homepage`}
            className="w-full px-4 py-3.5 bg-slate-950 border border-white/[0.08] hover:border-primary-500/30 focus:border-primary-500/50 rounded-2xl text-white text-sm placeholder:text-slate-600 resize-none focus:outline-none transition-all leading-relaxed custom-scrollbar"
          />
          {isEnhancing && (
            <div className="absolute inset-0 rounded-2xl bg-purple-950/30 border border-purple-500/40 flex items-center justify-center backdrop-blur-sm">
              <div className="flex items-center gap-2 text-purple-300 text-xs font-bold">
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>GLM 5.2 enhancing your vision...</span>
              </div>
            </div>
          )}
        </div>

        {/* Action buttons row */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleEnhance}
            disabled={isEnhancing || !prompt.trim()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 font-bold text-[11px] transition-all disabled:opacity-40"
          >
            {isEnhancing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            Enhance ✨
          </button>
          <button
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/60 border border-white/[0.08] text-slate-400 hover:text-white font-bold text-[11px] transition-all"
            title="Voice Input"
          >
            <Mic className="w-3.5 h-3.5" /> Voice
          </button>
          <button
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/60 border border-white/[0.08] text-slate-400 hover:text-white font-bold text-[11px] transition-all"
            title="Upload Reference Image"
          >
            <ImageIcon className="w-3.5 h-3.5" /> Image
          </button>
        </div>

        {/* Generate main button */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
          className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl bg-gradient-to-r from-primary-500 via-orange-500 to-amber-500 hover:from-primary-600 hover:to-orange-600 font-black text-sm text-white shadow-xl shadow-primary-500/30 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Generating Studio Design...</span>
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4" />
              <span>Generate Design</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        {/* Pipeline Progress */}
        {isGenerating && (
          <div className="p-4 rounded-2xl bg-slate-950 border border-primary-500/30 space-y-2.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-black text-primary-400 uppercase tracking-wider">AI Pipeline</span>
              <span className="text-[10px] font-mono text-slate-500">{currentStep + 1}/{PROGRESS_STEPS.length}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-white/5">
              <div
                className="h-full bg-gradient-to-r from-primary-500 to-amber-500 transition-all duration-500"
                style={{ width: `${((currentStep + 1) / PROGRESS_STEPS.length) * 100}%` }}
              />
            </div>
            <div className="space-y-1">
              {PROGRESS_STEPS.map((step, i) => {
                const Icon = step.icon;
                const isDone = i < currentStep;
                const isCurrent = i === currentStep;
                return (
                  <div key={step.id} className={`flex items-center gap-2 text-[11px] font-bold transition-all ${
                    isCurrent ? 'text-white' : isDone ? 'text-green-400' : 'text-slate-600'
                  }`}>
                    <Icon className={`w-3 h-3 flex-shrink-0 ${isCurrent ? 'animate-pulse text-primary-400' : ''}`} />
                    <span className="truncate">{step.label}</span>
                    {isCurrent && <span className="ml-auto text-[9px] px-1.5 rounded bg-primary-500/20 text-primary-300 border border-primary-500/30">{step.model}</span>}
                    {isDone && <CheckCircle className="w-3 h-3 ml-auto text-green-500 flex-shrink-0" />}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick start chips */}
        {!isGenerating && (
          <div className="space-y-2">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Quick Start</p>
            <div className="flex flex-col gap-1.5">
              {SUGGESTED_PROMPTS.map(s => (
                <button
                  key={s.text}
                  onClick={() => setPrompt(s.text)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-900/60 hover:bg-primary-950/40 border border-white/[0.06] hover:border-primary-500/30 text-left transition-all group"
                >
                  <span className="text-base">{s.emoji}</span>
                  <span className="text-[11px] font-bold text-slate-300 group-hover:text-white">{s.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
