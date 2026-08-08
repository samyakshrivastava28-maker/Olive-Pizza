import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Undo2, Redo2, Smartphone, Tablet, Monitor, Laptop,
  Zap, Bot, Flame, Eye, Send, Maximize2, Minimize2,
  PanelLeft, ChevronLeft, Sparkles, AlertCircle, CheckCircle2, Save
} from 'lucide-react';
import { DeviceMode } from './index';
import { Link } from 'react-router';

interface Props {
  hasDraft: boolean;
  deviceMode: DeviceMode;
  onDeviceChange: (d: DeviceMode) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  isPublishing: boolean;
  onPublish: () => void;
  onAIReview: () => void;
  onCampaign: () => void;
  isFullscreen: boolean;
  onFullscreenToggle: () => void;
  leftPanelOpen: boolean;
  onLeftPanelToggle: () => void;
  sectionCount: number;
  isPreviewing: boolean;
  onExitPreview: () => void;
}

const DEVICES: { id: DeviceMode; icon: any; label: string }[] = [
  { id: 'mobile',  icon: Smartphone, label: 'Mobile'  },
  { id: 'tablet',  icon: Tablet,     label: 'Tablet'  },
  { id: 'laptop',  icon: Laptop,     label: 'Laptop'  },
  { id: 'desktop', icon: Monitor,    label: 'Desktop' },
];

export const OliveStudioTopbar: React.FC<Props> = ({
  hasDraft, deviceMode, onDeviceChange,
  canUndo, canRedo, onUndo, onRedo,
  isPublishing, onPublish, onAIReview, onCampaign,
  isFullscreen, onFullscreenToggle,
  leftPanelOpen, onLeftPanelToggle,
  sectionCount, isPreviewing, onExitPreview,
}) => {
  return (
    <header className="h-12 flex items-center gap-2 px-3 border-b border-white/[0.06] bg-[#09090d] flex-shrink-0 z-40 relative overflow-x-auto custom-scrollbar min-w-0">

      {/* Left — Logo + Toggle + Back */}
      <div className="flex items-center gap-2 min-w-0">
        <Link
          to="/owner"
          className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-all"
          title="Back to Dashboard"
        >
          <ChevronLeft className="w-4 h-4" />
        </Link>

        <button
          onClick={onLeftPanelToggle}
          className={`p-1.5 rounded-lg transition-all ${leftPanelOpen ? 'bg-primary-500/20 text-primary-400' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
          title="Toggle Layers Panel"
        >
          <PanelLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1.5 select-none">
          <span className="text-lg leading-none">🍕</span>
          <span className="font-black text-sm text-white tracking-tight hidden sm:block">Olive Studio</span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-primary-500/20 text-primary-400 hidden sm:block">v3</span>
        </div>

        <div className="hidden sm:block w-px h-4 bg-white/10 mx-1" />

        <span className="text-[10px] text-slate-500 hidden sm:block">
          {sectionCount} section{sectionCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Center — Device switcher */}
      <div className="flex-1 flex justify-center">
        <div className="flex items-center gap-0.5 p-0.5 rounded-xl bg-slate-950/80 border border-white/[0.06]">
          {DEVICES.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => onDeviceChange(id)}
              title={label}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                deviceMode === id
                  ? 'bg-primary-500 text-white shadow-sm shadow-primary-500/30'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden md:block">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Right — Actions */}
      <div className="flex items-center gap-1.5">

        {/* AI Preview banner */}
        <AnimatePresence>
          {isPreviewing && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex items-center gap-2 px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[11px] font-bold"
            >
              <Eye className="w-3.5 h-3.5 animate-pulse" />
              <span>AI Preview</span>
              <button
                onClick={onExitPreview}
                className="ml-1 text-amber-400 hover:text-white text-[10px]"
              >
                ✕ Exit
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Undo / Redo */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 disabled:opacity-30 transition-all"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 disabled:opacity-30 transition-all"
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 className="w-4 h-4" />
        </button>

        <div className="w-px h-4 bg-white/10" />

        {/* Campaign */}
        <button
          onClick={onCampaign}
          className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-500/10 transition-all"
          title="Campaign Studio"
        >
          <Flame className="w-4 h-4" />
        </button>

        {/* AI Review */}
        <button
          onClick={onAIReview}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-500/20 border border-violet-500/30 text-violet-300 text-[11px] font-bold hover:bg-violet-500/30 transition-all"
          title="AI Design Review"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden sm:block">AI Review</span>
        </button>

        <div className="w-px h-4 bg-white/10" />

        {/* Draft Status */}
        {hasDraft && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <AlertCircle className="w-3 h-3 text-amber-400 animate-pulse" />
            <span className="text-[10px] font-bold text-amber-400 hidden sm:block">Draft</span>
          </div>
        )}

        {/* Publish Button */}
        <motion.button
          onClick={onPublish}
          disabled={isPublishing}
          whileTap={{ scale: 0.96 }}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-[12px] font-black shadow-lg shadow-primary-500/25 transition-all disabled:opacity-60"
        >
          {isPublishing ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Publishing...</span>
            </>
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              <span>Publish</span>
            </>
          )}
        </motion.button>

        {/* Fullscreen / Back to Owner Panel */}
        {isFullscreen ? (
          <div className="flex items-center gap-2 ml-1">
            <Link
              to="/owner/dashboard"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-black shadow-lg shadow-orange-500/30 border border-orange-400/30 transition-all animate-pulse"
              title="Return to Owner Panel"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Back to Owner Panel</span>
            </Link>
            <button
              onClick={onFullscreenToggle}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all border border-white/10"
              title="Exit Fullscreen Mode"
            >
              <Minimize2 className="w-4 h-4 text-orange-400" />
            </button>
          </div>
        ) : (
          <button
            onClick={onFullscreenToggle}
            className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-all"
            title="Maximize Studio (Fullscreen)"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
};
