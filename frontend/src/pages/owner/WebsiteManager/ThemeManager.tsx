import React, { useState } from 'react';
import { Palette, Sparkles, Save, RotateCcw, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { useWebsiteConfigStore, ThemeConfig } from '../../../stores/websiteConfigStore';
import { auth } from '../../../lib/firebase';

const BACKEND = import.meta.env.VITE_BACKEND_URL || '';

const PRESET_THEMES: Array<{ name: string; icon: string; colors: any }> = [
  {
    name: 'Olive Signature Dark',
    icon: '🍕',
    colors: {
      primary: '#f97316',
      accent: '#fb923c',
      background: '#06070a',
      surface: '#111827',
      text: '#f9fafb',
      textMuted: '#9ca3af',
      border: 'rgba(255,255,255,0.1)',
    },
  },
  {
    name: 'Diwali Gold & Charcoal',
    icon: '🪔',
    colors: {
      primary: '#eab308',
      accent: '#facc15',
      background: '#0b0907',
      surface: '#1a1610',
      text: '#fef08a',
      textMuted: '#ca8a04',
      border: 'rgba(234,179,8,0.2)',
    },
  },
  {
    name: 'Midnight Emerald Lounge',
    icon: '🌿',
    colors: {
      primary: '#10b981',
      accent: '#34d399',
      background: '#040d0a',
      surface: '#062017',
      text: '#ecfdf5',
      textMuted: '#6ee7b7',
      border: 'rgba(16,185,129,0.2)',
    },
  },
  {
    name: 'Crimson Velvet Pizza',
    icon: '🍷',
    colors: {
      primary: '#f43f5e',
      accent: '#fb7185',
      background: '#0d0407',
      surface: '#1f0810',
      text: '#ffe4e6',
      textMuted: '#fda4af',
      border: 'rgba(244,63,94,0.2)',
    },
  },
];

export const ThemeManager: React.FC = () => {
  const currentTheme = useWebsiteConfigStore((state) => state.theme);
  const injectThemeVariables = useWebsiteConfigStore((state) => state.injectThemeVariables);

  const [theme, setTheme] = useState<ThemeConfig>(
    currentTheme || {
      version: 1,
      colors: {
        primary: '#f97316',
        accent: '#fb923c',
        background: '#06070a',
        surface: '#111827',
        text: '#f9fafb',
        textMuted: '#9ca3af',
        border: 'rgba(255,255,255,0.1)',
        success: '#22c55e',
        error: '#ef4444',
      },
      fonts: {
        heading: 'Inter',
        body: 'Inter',
        mono: 'JetBrains Mono',
      },
      borderRadius: {
        sm: '6px',
        md: '12px',
        lg: '20px',
        xl: '32px',
        full: '9999px',
      },
      effects: {
        glassmorphism: true,
        neumorphism: false,
        animations: 'smooth',
        animationSpeed: 1.0,
        blur: '12px',
        shadowIntensity: 'medium',
      },
      mode: 'dark',
      spacing: 'comfortable',
      cardStyle: 'glass',
    }
  );

  const [saving, setSaving] = useState(false);

  const handleColorChange = (key: string, val: string) => {
    const updated = {
      ...theme,
      colors: { ...theme.colors, [key]: val },
    };
    setTheme(updated);
    injectThemeVariables(updated);
  };

  const handleApplyPreset = (presetColors: any) => {
    const updated = {
      ...theme,
      colors: { ...theme.colors, ...presetColors },
    };
    setTheme(updated);
    injectThemeVariables(updated);
    toast.success('Preset applied to live preview');
  };

  const handleSaveTheme = async () => {
    setSaving(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`${BACKEND}/api/website-manager/publish/theme`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ theme }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success('🎨 Theme tokens published live across all devices!');
    } catch (e: any) {
      toast.error(e.message || 'Failed to save theme');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Design Tokens & Theme Customizer
            <span className="px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-400 text-xs font-semibold">
              Real-time CSS
            </span>
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Tune colors, typography, glassmorphism, and border radiuses with instant live feedback.
          </p>
        </div>

        <button
          onClick={handleSaveTheme}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-amber-500 hover:from-primary-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-primary-500/20 transition-all"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Publishing...' : 'Publish Theme'}
        </button>
      </div>

      {/* Preset Theme Cards */}
      <div className="space-y-3">
        <h3 className="text-white font-bold text-sm">Curated Brand Themes</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PRESET_THEMES.map((pt, idx) => (
            <button
              key={idx}
              onClick={() => handleApplyPreset(pt.colors)}
              className="p-4 rounded-xl bg-slate-900/80 border border-white/10 hover:border-primary-500/40 text-left transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">{pt.icon}</span>
                <div className="flex gap-1.5">
                  <span
                    className="w-4 h-4 rounded-full border border-white/20"
                    style={{ background: pt.colors.primary }}
                  />
                  <span
                    className="w-4 h-4 rounded-full border border-white/20"
                    style={{ background: pt.colors.surface }}
                  />
                  <span
                    className="w-4 h-4 rounded-full border border-white/20"
                    style={{ background: pt.colors.background }}
                  />
                </div>
              </div>
              <p className="text-white font-semibold text-xs group-hover:text-primary-400 transition-colors">
                {pt.name}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Color Palette Grid */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 space-y-6">
        <h3 className="text-white font-bold text-sm">Palette Colors</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Object.entries(theme.colors).map(([key, val]) => (
            <div key={key} className="p-3 rounded-xl bg-slate-950/60 border border-white/5 space-y-2">
              <span className="text-xs text-slate-400 font-medium capitalize">{key}</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={val.startsWith('#') ? val : '#06070a'}
                  onChange={(e) => handleColorChange(key, e.target.value)}
                  className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                />
                <input
                  type="text"
                  value={val}
                  onChange={(e) => handleColorChange(key, e.target.value)}
                  className="flex-1 bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-mono focus:outline-none"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Effects & Glassmorphism */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 space-y-6">
        <h3 className="text-white font-bold text-sm">Effects & Card Styles</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5 space-y-2">
            <span className="text-xs text-slate-400 font-medium">Card Style</span>
            <select
              value={theme.cardStyle}
              onChange={(e) =>
                setTheme({ ...theme, cardStyle: e.target.value as any })
              }
              className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
            >
              <option value="glass">Glassmorphism (Frosted)</option>
              <option value="solid">Solid Surface</option>
              <option value="3d">3D Depth Floating</option>
              <option value="outline">Minimal Outline</option>
            </select>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5 space-y-2">
            <span className="text-xs text-slate-400 font-medium">Glassmorphism Blur</span>
            <input
              type="text"
              value={theme.effects?.blur || '12px'}
              onChange={(e) =>
                setTheme({
                  ...theme,
                  effects: { ...theme.effects, blur: e.target.value },
                })
              }
              placeholder="e.g. 16px"
              className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
            />
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5 space-y-2">
            <span className="text-xs text-slate-400 font-medium">Animation Easing</span>
            <select
              value={theme.effects?.animations || 'smooth'}
              onChange={(e) =>
                setTheme({
                  ...theme,
                  effects: { ...theme.effects, animations: e.target.value as any },
                })
              }
              className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
            >
              <option value="smooth">Smooth Natural Spring</option>
              <option value="snappy">Snappy Fast</option>
              <option value="subtle">Subtle Minimal</option>
              <option value="off">Disabled</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ThemeManager;
