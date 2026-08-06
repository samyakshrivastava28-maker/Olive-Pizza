import React, { useState } from 'react';
import { useSDUIStore, DEFAULT_THEME } from '../../../../stores/sduiStore';
import { ThemeConfig } from '../../../../types/sdui.types';
import { Palette, Check, RefreshCw, Sun, Moon, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

const PRESET_THEMES: Array<{ name: string; primary: string; secondary: string; accent: string; bg: string }> = [
  { name: 'Olive Supreme (Default)', primary: '#f97316', secondary: '#ea580c', accent: '#fb923c', bg: '#06070a' },
  { name: 'Gourmet Emerald', primary: '#10b981', secondary: '#059669', accent: '#34d399', bg: '#041712' },
  { name: 'Royal Gold & Truffle', primary: '#eab308', secondary: '#ca8a04', accent: '#fde047', bg: '#0d0b04' },
  { name: 'Midnight Violet', primary: '#8b5cf6', secondary: '#7c3aed', accent: '#a78bfa', bg: '#0b0616' },
  { name: 'Ruby Hot Chili', primary: '#ef4444', secondary: '#dc2626', accent: '#f87171', bg: '#160606' },
];

export const ThemeTab: React.FC = () => {
  const currentTheme = useSDUIStore((state) => state.theme);
  const updateTheme = useSDUIStore((state) => state.updateTheme);

  const [theme, setTheme] = useState<ThemeConfig>(currentTheme || DEFAULT_THEME);

  const handleColorChange = (key: keyof typeof theme.colors, value: string) => {
    const updated = {
      ...theme,
      colors: { ...theme.colors, [key]: value },
    };
    setTheme(updated);
  };

  const handleApplyPreset = (preset: (typeof PRESET_THEMES)[0]) => {
    const updated: ThemeConfig = {
      ...theme,
      colors: {
        ...theme.colors,
        primary: preset.primary,
        secondary: preset.secondary,
        accent: preset.accent,
        background: preset.bg,
      },
    };
    setTheme(updated);
    toast.success(`Preset "${preset.name}" applied`);
  };

  const handleSave = async () => {
    await updateTheme(theme);
    toast.success('Theme system updated live across website!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary-400" /> Dynamic Theme Designer
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Customize primary colors, typography, card style, glassmorphism, and animations in real time.
          </p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 font-bold text-sm text-white shadow-lg shadow-primary-500/20 transition-all"
        >
          <Check className="w-4 h-4" /> Save & Apply Theme
        </button>
      </div>

      {/* Preset Theme Selection */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" /> Palette Presets
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {PRESET_THEMES.map((preset) => (
            <button
              key={preset.name}
              onClick={() => handleApplyPreset(preset)}
              className="p-3 rounded-xl border border-white/10 bg-slate-800/60 hover:border-primary-500 transition-all text-left group"
            >
              <div className="flex items-center gap-1.5 mb-2">
                <span className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: preset.primary }} />
                <span className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: preset.accent }} />
                <span className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: preset.bg }} />
              </div>
              <p className="text-xs font-bold text-white truncate group-hover:text-primary-300">{preset.name}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Color Pickers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-4">
          <h3 className="text-sm font-bold text-white">Brand Colors</h3>
          
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Primary Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={theme.colors?.primary || '#f97316'}
                onChange={(e) => handleColorChange('primary', e.target.value)}
                className="w-10 h-10 rounded-xl bg-slate-800 border border-white/10 cursor-pointer"
              />
              <input
                type="text"
                value={theme.colors?.primary || '#f97316'}
                onChange={(e) => handleColorChange('primary', e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white font-mono text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Accent Highlight</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={theme.colors?.accent || '#fb923c'}
                onChange={(e) => handleColorChange('accent', e.target.value)}
                className="w-10 h-10 rounded-xl bg-slate-800 border border-white/10 cursor-pointer"
              />
              <input
                type="text"
                value={theme.colors?.accent || '#fb923c'}
                onChange={(e) => handleColorChange('accent', e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white font-mono text-xs"
              />
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-4">
          <h3 className="text-sm font-bold text-white">Background & Surface</h3>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Deep Background</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={theme.colors?.background || '#06070a'}
                onChange={(e) => handleColorChange('background', e.target.value)}
                className="w-10 h-10 rounded-xl bg-slate-800 border border-white/10 cursor-pointer"
              />
              <input
                type="text"
                value={theme.colors?.background || '#06070a'}
                onChange={(e) => handleColorChange('background', e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white font-mono text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Surface Cards</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={theme.colors?.surface || '#111827'}
                onChange={(e) => handleColorChange('surface', e.target.value)}
                className="w-10 h-10 rounded-xl bg-slate-800 border border-white/10 cursor-pointer"
              />
              <input
                type="text"
                value={theme.colors?.surface || '#111827'}
                onChange={(e) => handleColorChange('surface', e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white font-mono text-xs"
              />
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-4">
          <h3 className="text-sm font-bold text-white">Card & Effect Settings</h3>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Card Aesthetic Style</label>
            <select
              value={theme.cards?.style || 'glass'}
              onChange={(e) =>
                setTheme({ ...theme, cards: { ...theme.cards, style: e.target.value as any } })
              }
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs font-semibold"
            >
              <option value="glass">Glassmorphism (Modern)</option>
              <option value="solid">Solid Slate</option>
              <option value="outline">Outlined Border</option>
              <option value="3d">3D Layered</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Motion Speed</label>
            <select
              value={theme.effects?.animations || 'smooth'}
              onChange={(e) =>
                setTheme({
                  ...theme,
                  effects: { ...theme.effects, animations: e.target.value as any },
                })
              }
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs font-semibold"
            >
              <option value="smooth">Smooth Spring (Recommended)</option>
              <option value="snappy">Snappy Fast</option>
              <option value="subtle">Subtle</option>
              <option value="off">Disabled</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ThemeTab;
