import React, { useState } from 'react';
import { SDUISection } from '../../../../types/sdui.types';
import {
  X, MoveUp, MoveDown, Eye, EyeOff, Trash2, Type, Image,
  Palette, AlignHorizontalSpaceAround, Layers, ChevronDown, ChevronUp, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  section: SDUISection | null;
  allSections: SDUISection[];
  onClose: () => void;
  onUpdate: (updatedSection: SDUISection) => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
  onToggleVisibility: (id: string) => void;
  onDelete: (id: string) => void;
}

const BG_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'color', label: 'Solid Color' },
  { value: 'gradient', label: 'Gradient' },
  { value: 'glass', label: 'Glassmorphism' },
];

const ANIMATION_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'fade', label: 'Fade In' },
  { value: 'slide', label: 'Slide Up' },
  { value: 'zoom', label: 'Zoom In' },
  { value: 'bounce', label: 'Bounce' },
];

type InspectorTab = 'content' | 'style' | 'layout';

export const StudioInspector: React.FC<Props> = ({
  section,
  allSections,
  onClose,
  onUpdate,
  onMove,
  onToggleVisibility,
  onDelete,
}) => {
  const [tab, setTab] = useState<InspectorTab>('content');

  if (!section) {
    return (
      <aside className="w-72 bg-[#0a0b0e] border-l border-white/[0.06] flex flex-col items-center justify-center text-center p-6">
        <div className="w-14 h-14 rounded-2xl bg-slate-900/60 border border-white/[0.08] flex items-center justify-center mb-3">
          <Layers className="w-6 h-6 text-slate-500" />
        </div>
        <h4 className="text-sm font-black text-white mb-1">Visual Inspector</h4>
        <p className="text-xs text-slate-500 leading-relaxed">
          Click any section in the canvas to edit its content, style, and layout properties.
        </p>
      </aside>
    );
  }

  const updateStyle = (key: string, value: string) => {
    onUpdate({ ...section, style: { ...(section.style || {}), [key]: value } as any });
  };
  const updateConfig = (key: string, value: string) => {
    onUpdate({ ...section, config: { ...(section.config || {}), [key]: value } });
  };
  const idx = allSections.findIndex(s => s.id === section.id);

  return (
    <AnimatePresence>
      <motion.aside
        key="inspector"
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="w-72 bg-[#0a0b0e] border-l border-white/[0.06] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] flex-shrink-0">
          <div>
            <h4 className="text-xs font-black text-white">{section.label}</h4>
            <p className="text-[10px] font-mono text-primary-400">{section.type}</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onToggleVisibility(section.id)}
              className={`p-1.5 rounded-lg border transition-all ${
                section.isVisible
                  ? 'bg-green-500/10 border-green-500/30 text-green-400'
                  : 'bg-slate-900 border-white/[0.08] text-slate-500'
              }`}
            >
              {section.isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-white transition-all">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Move / Delete */}
        <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/[0.06] bg-slate-950/40 flex-shrink-0">
          <button
            disabled={idx === 0}
            onClick={() => onMove(section.id, 'up')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/[0.07] text-slate-400 hover:text-white font-bold text-[11px] disabled:opacity-30 transition-all"
          >
            <MoveUp className="w-3 h-3" /> Up
          </button>
          <button
            disabled={idx === allSections.length - 1}
            onClick={() => onMove(section.id, 'down')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/[0.07] text-slate-400 hover:text-white font-bold text-[11px] disabled:opacity-30 transition-all"
          >
            <MoveDown className="w-3 h-3" /> Down
          </button>
          <button
            onClick={() => onDelete(section.id)}
            className="ml-auto flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 font-bold text-[11px] transition-all"
          >
            <Trash2 className="w-3 h-3" /> Delete
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex px-4 py-2 gap-1 border-b border-white/[0.06] flex-shrink-0">
          {(['content', 'style', 'layout'] as InspectorTab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-black capitalize transition-all ${
                tab === t ? 'bg-primary-500 text-white' : 'text-slate-500 hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Panel content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
          {tab === 'content' && (
            <>
              <InspectorField label="Section Title" value={section.label} onChange={v => onUpdate({ ...section, label: v })} />
              <InspectorField label="Subtitle / Tagline" value={section.subtitle || ''} onChange={v => onUpdate({ ...section, subtitle: v })} />
              {section.type === 'hero' && (
                <>
                  <InspectorField label="CTA Button Text" value={section.config?.ctaText || ''} onChange={v => updateConfig('ctaText', v)} />
                  <InspectorField label="Hero Badge Text" value={section.config?.badge || ''} onChange={v => updateConfig('badge', v)} />
                </>
              )}
            </>
          )}

          {tab === 'style' && (
            <>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Background</label>
                <div className="grid grid-cols-2 gap-1">
                  {BG_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => updateStyle('bgType', opt.value)}
                      className={`py-1.5 px-2.5 rounded-xl text-[11px] font-bold border transition-all ${
                        section.style?.bgType === opt.value
                          ? 'bg-primary-500/20 border-primary-500/40 text-primary-300'
                          : 'bg-slate-900 border-white/[0.07] text-slate-400 hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {section.style?.bgType === 'color' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Background Color</label>
                  <div className="flex gap-2 flex-wrap">
                    {['#06070a', '#0f172a', '#f97316', '#55775a', '#f59e0b'].map(c => (
                      <button
                        key={c}
                        onClick={() => updateStyle('bgColor', c)}
                        className={`w-8 h-8 rounded-xl border-2 transition-all ${section.style?.bgColor === c ? 'border-white scale-110' : 'border-transparent hover:border-white/40'}`}
                        style={{ background: c }}
                      />
                    ))}
                  </div>
                </div>
              )}

              <InspectorField label="Padding" value={section.style?.padding || '0px'} onChange={v => updateStyle('padding', v)} placeholder="e.g. 24px or 24px 16px" />
              <InspectorField label="Border Radius" value={section.style?.borderRadius || '0px'} onChange={v => updateStyle('borderRadius', v)} placeholder="e.g. 24px" />

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Animation</label>
                <div className="grid grid-cols-2 gap-1">
                  {ANIMATION_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => updateStyle('animation', opt.value)}
                      className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all ${
                        section.style?.animation === opt.value
                          ? 'bg-primary-500/20 border-primary-500/40 text-primary-300'
                          : 'bg-slate-900 border-white/[0.07] text-slate-400 hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {tab === 'layout' && (
            <>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Visibility By Device</label>
                <div className="space-y-1">
                  {[['Mobile', 'mobile'], ['Tablet', 'tablet'], ['Desktop', 'desktop']].map(([label, key]) => (
                    <div key={key} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-white/[0.07]">
                      <span className="text-xs font-bold text-white">{label}</span>
                      <button
                        onClick={() => onUpdate({
                          ...section,
                          responsive: {
                            ...section.responsive,
                            mobile: section.responsive?.mobile ?? true,
                            tablet: section.responsive?.tablet ?? true,
                            desktop: section.responsive?.desktop ?? true,
                            [key]: !(section.responsive as any)?.[key],
                          }
                        })}
                        className={`px-3 py-1 rounded-lg text-[11px] font-black border transition-all ${
                          (section.responsive as any)?.[key] !== false
                            ? 'bg-green-500/20 border-green-500/40 text-green-300'
                            : 'bg-slate-800 border-white/[0.07] text-slate-500'
                        }`}
                      >
                        {(section.responsive as any)?.[key] !== false ? 'Visible' : 'Hidden'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Section Order</label>
                <p className="text-[11px] text-slate-400">Position {allSections.findIndex(s => s.id === section.id) + 1} of {allSections.length}</p>
              </div>
            </>
          )}
        </div>
      </motion.aside>
    </AnimatePresence>
  );
};

const InspectorField: React.FC<{ label: string; value: string; onChange: (v: string) => void; placeholder?: string }> = ({
  label, value, onChange, placeholder
}) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{label}</label>
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-white/[0.08] focus:border-primary-500/50 text-white text-xs font-semibold focus:outline-none transition-all"
    />
  </div>
);
