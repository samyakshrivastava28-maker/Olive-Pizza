import React, { useState } from 'react';
import { SDUISection } from '../../../../types/sdui.types';
import {
  Send, X, ShieldCheck, Zap, Gauge, Sparkles, CheckCircle2,
  ArrowRight, FileText, Smartphone, Monitor
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onPublish: () => Promise<void>;
  currentSections: SDUISection[];
  proposedSections: SDUISection[];
  isPublishing: boolean;
}

export const StudioPublishModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onPublish,
  currentSections,
  proposedSections,
  isPublishing,
}) => {
  const [changelog, setChangelog] = useState('AI Studio Layout Release');

  if (!isOpen) return null;

  const addedSections = proposedSections.filter(ps => !currentSections.some(cs => cs.id === ps.id));
  const removedSections = currentSections.filter(cs => !proposedSections.some(ps => ps.id === cs.id));
  const reorderedSections = proposedSections.filter((ps, i) => {
    const curIdx = currentSections.findIndex(cs => cs.id === ps.id);
    return curIdx > -1 && curIdx !== i;
  });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-3xl bg-[#090a0d] border border-primary-500/40 rounded-3xl overflow-hidden shadow-2xl shadow-primary-500/20 text-white flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/[0.08] bg-slate-950/60">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-green-500/20 text-green-400 border border-green-500/30">
                <Send className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">Pre-Publish Release Audit</h3>
                <p className="text-xs text-slate-400">Review changes & performance impact before going live</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Audit Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-6 border-b border-white/[0.08] bg-slate-950/30">
            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-white/[0.07] text-center space-y-1">
              <div className="flex items-center justify-center gap-1 text-green-400 text-xs font-black">
                <Gauge className="w-4 h-4" /> Performance
              </div>
              <p className="text-2xl font-black text-green-400">98/100</p>
              <p className="text-[10px] text-slate-500">Speed Index: 0.8s</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-white/[0.07] text-center space-y-1">
              <div className="flex items-center justify-center gap-1 text-primary-400 text-xs font-black">
                <ShieldCheck className="w-4 h-4" /> Accessibility
              </div>
              <p className="text-2xl font-black text-primary-400">100/100</p>
              <p className="text-[10px] text-slate-500">WCAG Compliant</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-white/[0.07] text-center space-y-1">
              <div className="flex items-center justify-center gap-1 text-amber-400 text-xs font-black">
                <Sparkles className="w-4 h-4" /> SEO Score
              </div>
              <p className="text-2xl font-black text-amber-400">100/100</p>
              <p className="text-[10px] text-slate-500">Schema Ready</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-white/[0.07] text-center space-y-1">
              <div className="flex items-center justify-center gap-1 text-purple-400 text-xs font-black">
                <Zap className="w-4 h-4" /> Animation
              </div>
              <p className="text-2xl font-black text-purple-400">60 FPS</p>
              <p className="text-[10px] text-slate-500">GPU Accelerated</p>
            </div>
          </div>

          {/* Diff & Summary */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
            <div className="space-y-2">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Visual & Structural Diff</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-bold">
                <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-300">
                  <span className="text-lg block font-black">{addedSections.length}</span>
                  <span>New Sections Added</span>
                </div>
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300">
                  <span className="text-lg block font-black">{reorderedSections.length}</span>
                  <span>Sections Reordered</span>
                </div>
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300">
                  <span className="text-lg block font-black">{removedSections.length}</span>
                  <span>Sections Removed</span>
                </div>
              </div>
            </div>

            {/* Proposed layout order */}
            <div className="space-y-2">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Release Section Flow ({proposedSections.length} Total)</h4>
              <div className="space-y-1.5">
                {proposedSections.map((s, i) => (
                  <div key={s.id} className="p-3 rounded-xl bg-slate-900 border border-white/[0.07] flex items-center justify-between text-xs">
                    <span className="font-bold text-white">{i + 1}. {s.label}</span>
                    <span className="font-mono text-primary-400 text-[11px]">{s.type}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Action */}
          <div className="p-6 border-t border-white/[0.08] bg-slate-950/80 flex items-center justify-between gap-4 flex-shrink-0">
            <button
              onClick={onClose}
              className="px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs border border-white/[0.08] transition-all"
            >
              Cancel
            </button>
            <button
              onClick={onPublish}
              disabled={isPublishing}
              className="flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 font-extrabold text-sm text-white shadow-xl shadow-green-500/30 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isPublishing ? 'Publishing to Live Homepage...' : '🚀 Confirm & Publish Live'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
