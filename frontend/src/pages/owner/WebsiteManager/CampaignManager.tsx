import React from 'react';
import { Sparkles, Calendar, Zap } from 'lucide-react';

export const CampaignManager: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-xl">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          Campaign & Festival Engine
        </h2>
        <p className="text-slate-400 text-xs mt-1">
          Launch automated seasonal campaigns with theme overrides, particle effects, and special coupons.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {['Diwali Grand Feast', 'New Year Pizza Bash', 'IPL Cricket Fever'].map((name, i) => (
          <div key={i} className="p-5 rounded-2xl bg-slate-900/40 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                SCHEDULED
              </span>
              <Calendar className="w-4 h-4 text-slate-500" />
            </div>
            <h4 className="text-white font-bold text-sm">{name}</h4>
            <p className="text-slate-400 text-xs">Auto-activates festive theme & banner offers.</p>
          </div>
        ))}
      </div>
    </div>
  );
};
export default CampaignManager;
