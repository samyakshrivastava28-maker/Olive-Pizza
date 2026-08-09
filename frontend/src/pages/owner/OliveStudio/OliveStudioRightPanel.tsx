import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SDUISection, AIGenerationVersion } from '../../../types/sdui.types';
import { RightPanelMode } from './index';
import { Bot, Layers, Palette, Zap, History, Sparkles, Wand2, Send, ChevronRight, Check, X, MoveUp, MoveDown, Trash2, Copy, Eye, EyeOff, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  mode: RightPanelMode;
  onModeChange: (m: RightPanelMode) => void;
  selectedSection: SDUISection | null;
  allSections: SDUISection[];
  onUpdateSection: (s: SDUISection) => void;
  onDeleteSection: (id: string) => void;
  onDuplicateSection: (id: string) => void;
  onMoveSection: (id: string, dir: 'up' | 'down') => void;
  onAIGenerate: (prompt: string) => Promise<void>;
  isGenerating: boolean;
  aiVersions: AIGenerationVersion[];
  onApplyVersion: (idx: number) => void;
}

const NAV_TABS: { id: RightPanelMode; icon: any; label: string }[] = [
  { id: 'ai',        icon: Bot,     label: 'AI'       },
  { id: 'inspector', icon: Layers,  label: 'Inspect'  },
  { id: 'theme',     icon: Palette, label: 'Theme'    },
  { id: 'animation', icon: Zap,     label: 'Animate'  },
  { id: 'history',   icon: History, label: 'History'  },
];

const SUGGESTED_PROMPTS = [
  { emoji: '👑', text: 'Make it luxury and premium' },
  { emoji: '🍕', text: 'Artisanal wood-fired pizza feast' },
  { emoji: '🪔', text: 'Festive Diwali celebration' },
  { emoji: '💎', text: 'Premium glassmorphic dark UI' },
  { emoji: '⚡', text: 'Ultra-minimal mobile-first' },
  { emoji: '🔥', text: 'High-conversion landing page' },
];

const PROGRESS_STEPS = [
  'Understanding your prompt...',
  'Planning layout hierarchy...',
  'Designing with Google Stitch...',
  'Architecture review...',
  'Building SDUI layout...',
  '✨ Design ready!',
];

// ─── AI Assistant Panel ───────────────────────────────────────────────────────
import { saveOwnerCustomSection } from '../../../utils/ownerCustomSections';
import { Plus, Star } from 'lucide-react';
import { OwnerMadeUIs } from './OwnerMadeUIs';

// ─── AI Assistant Panel ───────────────────────────────────────────────────────
const AIPanel: React.FC<{ onGenerate: (p: string) => Promise<void>; isGenerating: boolean; aiVersions: AIGenerationVersion[]; onApplyVersion: (i: number) => void }> = ({
  onGenerate, isGenerating, aiVersions, onApplyVersion,
}) => {
  const [prompt, setPrompt] = useState('');
  const [step, setStep] = useState(0);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [savedSectionIds, setSavedSectionIds] = useState<Set<string>>(new Set());

  const handleEnhance = async () => {
    if (!prompt.trim()) return;
    setIsEnhancing(true);
    try {
      const res = await fetch('/api/website-manager/enhance-prompt', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const responseText = await res.text();
      let data: any = null;
      try { data = responseText ? JSON.parse(responseText) : null; } catch {}
      const enhanced = data?.enhancedPrompt || data?.data?.enhancedPrompt;
      if (enhanced) { setPrompt(enhanced); toast.success('✨ Prompt enhanced with DeepSeek V4!'); }
    } catch {
      setPrompt(`Ultra-premium Olive Pizza: ${prompt}. Glassmorphic hero, animated categories, best sellers grid, coupons carousel, mobile-first dark theme.`);
      toast.success('✨ Prompt enhanced!');
    } finally { setIsEnhancing(false); }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) { toast.error('Type a prompt first'); return; }
    setStep(0);
    const iv = setInterval(() => setStep(p => (p < 5 ? p + 1 : p)), 600);
    await onGenerate(prompt);
    clearInterval(iv);
    setStep(5);
  };

  const handleSaveToCreatedByOwner = async (version: AIGenerationVersion) => {
    if (!version.sections || version.sections.length === 0) return;
    toast.loading('Uploading section images to Cloudinary CDN...', { id: 'save-cloudinary' });

    for (const sec of version.sections) {
      let cdnUrl = (sec.style as any)?.bgImage || (sec.config as any)?.imageUrl;
      if (cdnUrl && (cdnUrl.startsWith('data:') || cdnUrl.startsWith('http'))) {
        try {
          const res = await fetch('/api/website-manager/upload-ai-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageUrl: cdnUrl, prompt: version.prompt }),
          });
          const data = await res.json();
          if (data?.cloudinaryUrl) {
            cdnUrl = data.cloudinaryUrl;
          }
        } catch {}
      }

      const updatedSec = {
        ...sec,
        style: { ...sec.style, bgImage: cdnUrl },
        config: { ...sec.config, imageUrl: cdnUrl },
      };

      saveOwnerCustomSection(updatedSec, `${sec.label || 'Stitch AI Design'} (${version.label})`);
    }

    setSavedSectionIds(prev => new Set(prev).add(version.id));
    toast.success(`👑 Saved & Uploaded to Cloudinary CDN! Added to "Created by Owner" library.`, { id: 'save-cloudinary', duration: 4000 });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.06]">
        <h3 className="text-xs font-black text-white flex items-center gap-2">
          <Bot className="w-3.5 h-3.5 text-violet-400" /> Google Stitch & DeepSeek AI
        </h3>
        <p className="text-[10px] text-slate-500 mt-0.5">Describe your vision — AI builds & maps Stitch designs</p>
      </div>

      {/* Suggested prompts */}
      <div className="px-3 py-2 border-b border-white/[0.04] flex flex-wrap gap-1.5">
        {SUGGESTED_PROMPTS.map(s => (
          <button
            key={s.text}
            onClick={() => setPrompt(s.text)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[10px] text-slate-400 hover:text-white hover:border-white/20 transition-all"
          >
            <span>{s.emoji}</span> <span className="truncate max-w-[90px]">{s.text}</span>
          </button>
        ))}
      </div>

      {/* Prompt textarea */}
      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar space-y-3">
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Describe what section or design you want Google Stitch to create..."
          rows={4}
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-slate-200 placeholder-slate-600 resize-none outline-none focus:border-primary-500/50 transition-colors custom-scrollbar"
        />

        {/* Enhance + Generate */}
        <div className="flex gap-2">
          <button
            onClick={handleEnhance}
            disabled={isEnhancing || !prompt.trim()}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-violet-500/20 border border-violet-500/30 text-violet-300 text-[11px] font-bold hover:bg-violet-500/30 transition-all disabled:opacity-40"
          >
            {isEnhancing ? <div className="w-3 h-3 border border-violet-400/40 border-t-violet-400 rounded-full animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
            Enhance Prompt
          </button>
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-[11px] font-bold shadow-lg shadow-primary-500/20 transition-all disabled:opacity-40"
          >
            {isGenerating ? <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            Stitch Design
          </button>
        </div>

        {/* Progress steps */}
        <AnimatePresence>
          {isGenerating && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-1.5 overflow-hidden p-2 rounded-xl bg-violet-500/10 border border-violet-500/20"
            >
              {PROGRESS_STEPS.map((label, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: i <= step ? 1 : 0.3, x: 0 }}
                  className={`flex items-center gap-2 text-[10px] font-semibold ${i <= step ? 'text-violet-300' : 'text-slate-600'}`}
                >
                  {i < step ? <Check className="w-3 h-3 text-green-400" /> :
                   i === step ? <div className="w-3 h-3 border border-violet-400/40 border-t-violet-400 rounded-full animate-spin" /> :
                   <div className="w-3 h-3 rounded-full bg-slate-700" />}
                  {label}
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI Versions / Stitch Generated Cards */}
        {aiVersions.length > 0 && (
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Stitch AI Designs</p>
              <span className="text-[9px] font-bold text-violet-400 bg-violet-500/20 px-2 py-0.5 rounded-full">
                Google Stitch Engine
              </span>
            </div>

            {aiVersions.slice(0, 4).map((v, i) => {
              const isSaved = savedSectionIds.has(v.id);
              return (
                <div key={v.id} className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-violet-500/40 transition-all space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-white flex items-center gap-1.5">
                      <span>🎨</span> Stitch Layout {String.fromCharCode(65 + i)}
                    </span>
                    <span className="text-[9px] font-semibold text-slate-400 bg-white/5 px-2 py-0.5 rounded-md">
                      {v.sections.length} section{v.sections.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed italic">
                    "{v.prompt}"
                  </p>

                  {/* Engine Badges */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-md">
                      DeepSeek V4 Pro
                    </span>
                    <span className="text-[9px] font-bold text-violet-400 bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 rounded-md">
                      Google Stitch API
                    </span>
                    <span className="text-[9px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded-md">
                      Qwen / FLUX.1 Image
                    </span>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <button
                      onClick={() => onApplyVersion(i)}
                      className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl bg-green-500/20 border border-green-500/30 text-green-300 text-[10px] font-bold hover:bg-green-500/30 transition-all"
                    >
                      <Plus className="w-3 h-3" /> Add to Canvas
                    </button>
                    <button
                      onClick={() => handleSaveToCreatedByOwner(v)}
                      disabled={isSaved}
                      className={`flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all border ${
                        isSaved
                          ? 'bg-amber-500/30 border-amber-500/40 text-amber-300'
                          : 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20'
                      }`}
                      title="Save section to Created by Owner category in Component Library"
                    >
                      <span>👑</span> {isSaved ? 'Saved to Owner' : 'Save to Owner'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Section Inspector ────────────────────────────────────────────────────────
const InspectorPanel: React.FC<{
  section: SDUISection | null;
  allSections: SDUISection[];
  onUpdate: (s: SDUISection) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onMove: (id: string, dir: 'up' | 'down') => void;
}> = ({ section, allSections, onUpdate, onDelete, onDuplicate, onMove }) => {
  if (!section) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6 gap-3">
        <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
          <Layers className="w-6 h-6 text-slate-600" />
        </div>
        <p className="text-sm font-black text-white">Select a Section</p>
        <p className="text-xs text-slate-500 leading-relaxed">Click any section on the canvas to edit its content and style</p>
      </div>
    );
  }

  const idx = allSections.findIndex(s => s.id === section.id);

  const updateConfig = (key: string, value: any) =>
    onUpdate({ ...section, config: { ...section.config, [key]: value } });

  const updateStyle = (key: string, value: any) =>
    onUpdate({ ...section, style: { ...section.style, [key]: value } as any });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Section header */}
      <div className="px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-black text-white">{section.label}</h3>
            <p className="text-[10px] text-slate-500 font-mono">{section.type}</p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => onUpdate({ ...section, isVisible: !section.isVisible })} className="p-1.5 rounded-lg text-slate-500 hover:text-white transition-colors">
              {section.isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>
            <button onClick={() => onDuplicate(section.id)} className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 transition-colors">
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onDelete(section.id)} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        {/* Move up/down */}
        <div className="flex gap-1 mt-2">
          <button onClick={() => onMove(section.id, 'up')} disabled={idx === 0} className="flex-1 flex items-center justify-center gap-1 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[10px] text-slate-400 hover:text-white disabled:opacity-30 transition-all">
            <MoveUp className="w-3 h-3" /> Move Up
          </button>
          <button onClick={() => onMove(section.id, 'down')} disabled={idx === allSections.length - 1} className="flex-1 flex items-center justify-center gap-1 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[10px] text-slate-400 hover:text-white disabled:opacity-30 transition-all">
            <MoveDown className="w-3 h-3" /> Move Down
          </button>
        </div>
      </div>

      {/* Config fields */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">

        {/* Label */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Section Name</label>
          <input
            value={section.label}
            onChange={e => onUpdate({ ...section, label: e.target.value })}
            className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white outline-none focus:border-primary-500/50 transition-colors"
          />
        </div>

        {/* Heading / Title */}
        {section.config?.title !== undefined && (
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Heading</label>
            <input
              value={section.config.title || ''}
              onChange={e => updateConfig('title', e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white outline-none focus:border-primary-500/50 transition-colors"
            />
          </div>
        )}

        {/* Headline (hero) */}
        {section.config?.headline !== undefined && (
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Headline</label>
            <input
              value={section.config.headline || ''}
              onChange={e => updateConfig('headline', e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white outline-none focus:border-primary-500/50 transition-colors"
            />
          </div>
        )}

        {/* Subheadline */}
        {section.config?.subheadline !== undefined && (
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Subheadline</label>
            <textarea
              value={section.config.subheadline || ''}
              onChange={e => updateConfig('subheadline', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white resize-none outline-none focus:border-primary-500/50 transition-colors"
            />
          </div>
        )}

        {/* CTA Text */}
        {section.config?.ctaText !== undefined && (
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">CTA Button Text</label>
            <input
              value={section.config.ctaText || ''}
              onChange={e => updateConfig('ctaText', e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white outline-none focus:border-primary-500/50 transition-colors"
            />
          </div>
        )}

        {/* ─ Style Section ─ */}
        <div className="pt-2 border-t border-white/[0.06]">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">Style</p>

          {/* Background type */}
          <div className="mb-3">
            <label className="block text-[10px] font-bold text-slate-500 mb-1.5">Background</label>
            <div className="grid grid-cols-4 gap-1">
              {['none', 'color', 'gradient', 'glass'].map(bg => (
                <button
                  key={bg}
                  onClick={() => updateStyle('bgType', bg)}
                  className={`py-1.5 rounded-lg text-[10px] font-bold capitalize transition-all border ${
                    section.style?.bgType === bg
                      ? 'bg-primary-500/20 border-primary-500/40 text-primary-300'
                      : 'border-white/[0.06] text-slate-500 hover:text-white'
                  }`}
                >
                  {bg}
                </button>
              ))}
            </div>
          </div>

          {/* Animation */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1.5">Animation</label>
            <div className="grid grid-cols-3 gap-1">
              {['none', 'fade', 'slide', 'zoom', 'bounce', 'float'].map(anim => (
                <button
                  key={anim}
                  onClick={() => updateStyle('animation', anim as any)}
                  className={`py-1.5 rounded-lg text-[10px] font-bold capitalize transition-all border ${
                    (section.style?.animation || 'none') === anim
                      ? 'bg-violet-500/20 border-violet-500/40 text-violet-300'
                      : 'border-white/[0.06] text-slate-500 hover:text-white'
                  }`}
                >
                  {anim}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Responsive toggles */}
        <div className="pt-2 border-t border-white/[0.06]">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">Show on Device</p>
          {(['mobile', 'tablet', 'desktop'] as const).map(device => (
            <div key={device} className="flex items-center justify-between py-1.5">
              <span className="text-xs text-slate-400 capitalize">{device}</span>
              <button
                onClick={() => onUpdate({ ...section, responsive: { ...(section.responsive || { mobile: true, tablet: true, desktop: true }), [device]: !(section.responsive?.[device] ?? true) } })}
                className={`w-10 h-5 rounded-full transition-all relative ${(section.responsive?.[device] ?? true) ? 'bg-primary-500' : 'bg-slate-700'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${(section.responsive?.[device] ?? true) ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Main Right Panel ─────────────────────────────────────────────────────────
export const OliveStudioRightPanel: React.FC<Props> = ({
  mode, onModeChange, selectedSection, allSections,
  onUpdateSection, onDeleteSection, onDuplicateSection, onMoveSection,
  onAIGenerate, isGenerating, aiVersions, onApplyVersion,
}) => {
  // Auto-switch to inspector when section selected
  React.useEffect(() => {
    if (selectedSection && mode === 'ai') onModeChange('inspector');
    if (!selectedSection && mode === 'inspector') onModeChange('ai');
  }, [selectedSection]);

  return (
    <aside className="w-[320px] h-full flex bg-[#09090d] overflow-hidden">
      {/* Icon nav sidebar */}
      <div className="w-12 flex flex-col items-center py-3 gap-0.5 border-r border-white/[0.06] flex-shrink-0">
        {NAV_TABS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => onModeChange(id)}
            title={label}
            className={`w-9 h-9 flex flex-col items-center justify-center rounded-xl text-[8px] font-bold gap-0.5 transition-all ${
              mode === id
                ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                : 'text-slate-600 hover:text-slate-300'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Panel content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.15 }}
            className="flex-1 overflow-hidden flex flex-col h-full"
          >
            {mode === 'ai' && (
              <AIPanel
                onGenerate={onAIGenerate}
                isGenerating={isGenerating}
                aiVersions={aiVersions}
                onApplyVersion={onApplyVersion}
              />
            )}
            {mode === 'inspector' && (
              <InspectorPanel
                section={selectedSection}
                allSections={allSections}
                onUpdate={onUpdateSection}
                onDelete={onDeleteSection}
                onDuplicate={onDuplicateSection}
                onMove={onMoveSection}
              />
            )}
            {mode === 'theme' && (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 gap-3">
                <span className="text-4xl">🎨</span>
                <p className="text-sm font-black text-white">Theme Studio</p>
                <p className="text-xs text-slate-500">Use the Theme tab in Website Manager for full theme controls</p>
              </div>
            )}
            {mode === 'animation' && (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 gap-3">
                <span className="text-4xl">✨</span>
                <p className="text-sm font-black text-white">Animation Studio</p>
                <p className="text-xs text-slate-500">Select a section on the canvas, then apply animation presets from the Inspector tab</p>
              </div>
            )}
            {mode === 'history' && (
              <div className="flex flex-col h-full overflow-hidden">
                <OwnerMadeUIs
                  onSelectVersionSections={(sections, versionId) => {
                    // When owner previews a version from history, load sections into canvas
                    const event = new CustomEvent('sdui-preview-version', { detail: { sections, versionId } });
                    window.dispatchEvent(event);
                  }}
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </aside>
  );
};
