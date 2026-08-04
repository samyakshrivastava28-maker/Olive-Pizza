import React from 'react';
import { Layers, Palette, ToggleRight, Sparkles } from 'lucide-react';
import { useWebsiteConfigStore } from '../../../stores/websiteConfigStore';

export const DevLiveInspector: React.FC = () => {
  const homepage = useWebsiteConfigStore((state) => state.homepage);
  const theme = useWebsiteConfigStore((state) => state.theme);
  const featureFlags = useWebsiteConfigStore((state) => state.featureFlags);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Sections breakdown */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 space-y-3">
        <h3 className="text-white font-bold text-xs flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary-400" />
          Active Sections ({homepage?.sections.length || 0})
        </h3>
        <div className="space-y-1.5 font-mono text-[11px] max-h-48 overflow-y-auto">
          {homepage?.sections.map((s, i) => (
            <div
              key={s.id}
              className="p-2 rounded bg-slate-950 flex items-center justify-between text-slate-300"
            >
              <span>
                {i + 1}. {s.id}
              </span>
              <span className={s.isVisible ? 'text-emerald-400' : 'text-slate-500'}>
                {s.isVisible ? 'VISIBLE' : 'HIDDEN'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Theme tokens snapshot */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 space-y-3">
        <h3 className="text-white font-bold text-xs flex items-center gap-2">
          <Palette className="w-4 h-4 text-amber-400" />
          Live CSS Tokens
        </h3>
        <div className="space-y-1.5 font-mono text-[11px] max-h-48 overflow-y-auto">
          {theme?.colors &&
            Object.entries(theme.colors).map(([k, v]) => (
              <div
                key={k}
                className="p-2 rounded bg-slate-950 flex items-center justify-between text-slate-300"
              >
                <span>--color-{k}</span>
                <span className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-white/20"
                    style={{ background: v }}
                  />
                  <span className="text-slate-400">{v}</span>
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* Feature Flags */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 space-y-3">
        <h3 className="text-white font-bold text-xs flex items-center gap-2">
          <ToggleRight className="w-4 h-4 text-emerald-400" />
          Feature Flags State
        </h3>
        <div className="space-y-1.5 font-mono text-[11px] max-h-48 overflow-y-auto">
          {Object.entries(featureFlags).map(([k, f]) => (
            <div
              key={k}
              className="p-2 rounded bg-slate-950 flex items-center justify-between text-slate-300"
            >
              <span>{k}</span>
              <span className={f.enabled ? 'text-emerald-400' : 'text-rose-400'}>
                {f.enabled ? 'ENABLED' : 'DISABLED'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
export default DevLiveInspector;
