import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Sparkles, Send, CheckCircle2, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { auth } from '../../../lib/firebase';

const BACKEND = import.meta.env.VITE_BACKEND_URL || '';

export const OwnerAIPanel: React.FC<{ onDiffApplied?: () => void }> = ({ onDiffApplied }) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  const QUICK_PROMPTS = [
    'Switch theme to festive Diwali gold and dark orange',
    'Reorder categories section to be directly below hero',
    'Hide customer reviews section for now',
    'Enable 20% discount offer banner with countdown',
    'Make card borders softer with glassmorphism glow',
  ];

  const handleSendCommand = async (textToSend?: string) => {
    const commandText = textToSend || prompt;
    if (!commandText.trim()) return;

    setLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`${BACKEND}/api/owner-ai/command`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ command: commandText }),
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setLastResult(data);
      setPrompt('');
      toast.success('AI updated your draft configuration! Check the preview.');
      if (onDiffApplied) onDiffApplied();
    } catch (e: any) {
      toast.error(e.message || 'Failed to process AI command');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900/90 to-primary-950/30 border border-primary-500/20 backdrop-blur-xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-500/20 border border-primary-500/30 flex items-center justify-center text-primary-400 shadow-lg shadow-primary-500/10">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-white font-bold text-base flex items-center gap-2">
              Website AI Architect
              <span className="px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-400 text-xs font-semibold">
                Autonomous
              </span>
            </h3>
            <p className="text-slate-400 text-xs">
              Describe layout or theme changes in plain English. AI updates your draft instantly.
            </p>
          </div>
        </div>
      </div>

      {/* Input Box */}
      <div className="relative">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. 'Make our theme feel like a luxury midnight lounge with warm amber accents and move customer reviews above coupons'"
          rows={3}
          className="w-full bg-slate-950/70 border border-white/10 rounded-xl p-4 pr-24 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 resize-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendCommand();
            }
          }}
        />
        <button
          onClick={() => handleSendCommand()}
          disabled={loading || !prompt.trim()}
          className="absolute right-3 bottom-3 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Apply
        </button>
      </div>

      {/* Quick Prompt Chips */}
      <div>
        <p className="text-slate-400 text-xs mb-2 font-medium">Quick Suggestions:</p>
        <div className="flex flex-wrap gap-2">
          {QUICK_PROMPTS.map((qp, idx) => (
            <button
              key={idx}
              onClick={() => handleSendCommand(qp)}
              disabled={loading}
              className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors text-left"
            >
              {qp}
            </button>
          ))}
        </div>
      </div>

      {/* Last Result Box */}
      <AnimatePresence>
        {lastResult && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-primary-500/10 border border-primary-500/20 space-y-3"
          >
            <div className="flex items-start gap-2 text-primary-300 text-xs">
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary-400" />
              <p className="leading-relaxed">{lastResult.explanation}</p>
            </div>
            {lastResult.suggestions?.length > 0 && (
              <div className="pt-2 border-t border-primary-500/20 flex flex-wrap gap-2 items-center">
                <span className="text-slate-400 text-[11px]">Next ideas:</span>
                {lastResult.suggestions.map((sug: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => handleSendCommand(sug)}
                    className="text-[11px] text-primary-300 hover:underline inline-flex items-center gap-1"
                  >
                    {sug} <ArrowRight className="w-3 h-3" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
export default OwnerAIPanel;
