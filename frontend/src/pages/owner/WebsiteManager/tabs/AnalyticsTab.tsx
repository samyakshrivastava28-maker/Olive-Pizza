import React from 'react';
import { useSDUIStore } from '../../../../stores/sduiStore';
import { BarChart3, Eye, MousePointer, TrendingUp, Layers } from 'lucide-react';

export const AnalyticsTab: React.FC = () => {
  const events = useSDUIStore((state) => state.analyticsEvents);
  const homepage = useSDUIStore((state) => state.homepage);

  const totalViews = events.filter((e) => e.eventType === 'view').length;
  const totalClicks = events.filter((e) => e.eventType === 'click').length;
  const ctr = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary-400" /> SDUI Performance Analytics
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Realtime impressions, CTR, section heatmaps, and customer interaction analytics.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-primary-500/20 text-primary-400">
            <Eye className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-black text-white">{totalViews}</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Section Views</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400">
            <MousePointer className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-black text-white">{totalClicks}</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Clicks</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-green-500/20 text-green-400">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-black text-white">{ctr}%</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Engagement CTR</p>
          </div>
        </div>
      </div>

      {/* Section Heatmap Table */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary-400" /> Section Heatmap Breakdown
        </h3>
        <div className="space-y-2">
          {homepage.sections.map((sec) => {
            const secViews = events.filter((e) => e.sectionId === sec.id && e.eventType === 'view').length;
            const secClicks = events.filter((e) => e.sectionId === sec.id && e.eventType === 'click').length;
            return (
              <div key={sec.id} className="p-3 rounded-xl bg-slate-800/60 border border-white/5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-white">{sec.label}</span>
                  <span className="font-mono text-slate-400">({sec.type})</span>
                </div>
                <div className="flex items-center gap-6 text-slate-300">
                  <span>Views: <strong className="text-white">{secViews}</strong></span>
                  <span>Clicks: <strong className="text-white">{secClicks}</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
export default AnalyticsTab;
