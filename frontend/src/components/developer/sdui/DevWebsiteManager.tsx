import React, { useState, useEffect } from 'react';
import {
  Code,
  Lock,
  Unlock,
  Download,
  Upload,
  RefreshCw,
  Save,
  CheckCircle2,
  AlertTriangle,
  FileJson,
  Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useWebsiteConfigStore } from '../../../stores/websiteConfigStore';
import { auth } from '../../../lib/firebase';

const BACKEND = import.meta.env.VITE_BACKEND_URL || '';

export const DevWebsiteManager: React.FC = () => {
  const homepage = useWebsiteConfigStore((state) => state.homepage);
  const invalidateCache = useWebsiteConfigStore((state) => state.invalidateCache);

  const [rawJson, setRawJson] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [locking, setLocking] = useState(false);

  useEffect(() => {
    if (homepage) {
      setRawJson(JSON.stringify(homepage, null, 2));
    }
  }, [homepage]);

  const handleJsonChange = (text: string) => {
    setRawJson(text);
    try {
      JSON.parse(text);
      setJsonError(null);
    } catch (e: any) {
      setJsonError(e.message);
    }
  };

  const handleSaveRawConfig = async () => {
    if (jsonError) {
      toast.error('Cannot save invalid JSON');
      return;
    }
    setSaving(true);
    try {
      const parsed = JSON.parse(rawJson);
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`${BACKEND}/api/website-manager/dev/raw-config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          documentName: 'homepage',
          config: parsed,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success('Developer Master Raw JSON published!');
    } catch (e: any) {
      toast.error(e.message || 'Failed to save raw config');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleLock = async (sectionId: string, currentLock: boolean) => {
    setLocking(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`${BACKEND}/api/website-manager/dev/lock-section`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          documentName: 'homepage',
          sectionId,
          isLocked: !currentLock,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success(`Section ${!currentLock ? 'LOCKED' : 'UNLOCKED'} for Owner edits`);
    } catch (e: any) {
      toast.error(e.message || 'Failed to toggle lock');
    } finally {
      setLocking(false);
    }
  };

  const handleExportJson = () => {
    const blob = new Blob([rawJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `olive_pizza_sdui_homepage_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('SDUI config exported!');
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        JSON.parse(text);
        setRawJson(text);
        setJsonError(null);
        toast.success('Config imported into editor! Click Save Raw to publish.');
      } catch (err) {
        toast.error('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900/80 border border-primary-500/20 backdrop-blur-xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            SDUI Master Control (Developer)
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold">
              Root Level
            </span>
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Low-level JSON manipulation, section locking, live cache purge, and runtime debugging.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              invalidateCache();
              toast.success('SDUI cache flushed and listeners restarted!');
            }}
            className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold flex items-center gap-1.5 border border-white/10"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Purge Cache
          </button>
          <button
            onClick={handleExportJson}
            className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold flex items-center gap-1.5 border border-white/10"
          >
            <Download className="w-3.5 h-3.5" /> Export JSON
          </button>
          <label className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold flex items-center gap-1.5 border border-white/10 cursor-pointer">
            <Upload className="w-3.5 h-3.5" /> Import JSON
            <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
          </label>
          <button
            onClick={handleSaveRawConfig}
            disabled={saving || !!jsonError}
            className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> Save Raw JSON
          </button>
        </div>
      </div>

      {/* Section Locking Control Matrix */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 space-y-4">
        <h3 className="text-white font-bold text-sm flex items-center gap-2">
          <Lock className="w-4 h-4 text-amber-400" />
          Section Protection & Developer Locks
        </h3>
        <p className="text-slate-400 text-xs">
          Locked sections cannot be deleted, reordered, or modified by Owner dashboard users.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {homepage?.sections.map((sec) => (
            <div
              key={sec.id}
              className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                sec.isLocked
                  ? 'bg-amber-500/10 border-amber-500/30'
                  : 'bg-slate-950/60 border-white/5'
              }`}
            >
              <div>
                <p className="text-white text-xs font-semibold">{sec.label}</p>
                <p className="text-slate-500 text-[10px] font-mono">{sec.id}</p>
              </div>
              <button
                onClick={() => handleToggleLock(sec.id, !!sec.isLocked)}
                disabled={locking}
                className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                  sec.isLocked
                    ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                    : 'bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                {sec.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                {sec.isLocked ? 'Locked' : 'Unlocked'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Raw JSON Schema Editor */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code className="w-4 h-4 text-primary-400" />
            <h3 className="text-white font-bold text-sm font-mono">website_config/homepage.json</h3>
          </div>
          {jsonError ? (
            <span className="text-rose-400 text-xs flex items-center gap-1 font-mono">
              <AlertTriangle className="w-3.5 h-3.5" /> Invalid Syntax: {jsonError}
            </span>
          ) : (
            <span className="text-emerald-400 text-xs flex items-center gap-1 font-mono">
              <CheckCircle2 className="w-3.5 h-3.5" /> Valid JSON
            </span>
          )}
        </div>

        <textarea
          value={rawJson}
          onChange={(e) => handleJsonChange(e.target.value)}
          rows={16}
          className="w-full bg-slate-950 border border-white/10 rounded-xl p-4 font-mono text-xs text-primary-300 focus:outline-none focus:border-primary-500"
          spellCheck={false}
        />
      </div>
    </div>
  );
};
export default DevWebsiteManager;
