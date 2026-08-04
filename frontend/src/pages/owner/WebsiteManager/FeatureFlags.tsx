import React, { useState } from 'react';
import { ToggleLeft, ToggleRight, ShieldAlert, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { useWebsiteConfigStore } from '../../../stores/websiteConfigStore';
import { auth } from '../../../lib/firebase';

const BACKEND = import.meta.env.VITE_BACKEND_URL || '';

export const FeatureFlags: React.FC = () => {
  const flags = useWebsiteConfigStore((state) => state.featureFlags);
  const [localFlags, setLocalFlags] = useState(flags);
  const [saving, setSaving] = useState(false);

  const handleToggle = (key: string) => {
    setLocalFlags({
      ...localFlags,
      [key]: {
        ...localFlags[key],
        enabled: !localFlags[key]?.enabled,
      },
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`${BACKEND}/api/website-manager/flags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ flags: localFlags }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success('Feature flags updated across website & mobile apps!');
    } catch (e: any) {
      toast.error(e.message || 'Failed to update feature flags');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Feature Flags & Rollouts
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Safely enable or disable platform capabilities in real time without deploying new code.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-amber-500 hover:from-primary-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-primary-500/20"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Flags'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(localFlags).map(([key, flag]) => (
          <div
            key={key}
            className={`p-5 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
              flag.enabled
                ? 'bg-slate-900/80 border-white/10'
                : 'bg-slate-950/40 border-white/5 opacity-60'
            }`}
          >
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-white font-bold text-sm capitalize">{key}</h4>
                {flag.isKillSwitched && (
                  <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 text-[10px] font-bold">
                    KILL SWITCHED
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-xs mt-1">{flag.description}</p>
            </div>

            <button
              onClick={() => handleToggle(key)}
              className={`p-1.5 rounded-xl transition-colors ${
                flag.enabled ? 'text-primary-400' : 'text-slate-600'
              }`}
            >
              {flag.enabled ? (
                <ToggleRight className="w-8 h-8" />
              ) : (
                <ToggleLeft className="w-8 h-8" />
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
export default FeatureFlags;
