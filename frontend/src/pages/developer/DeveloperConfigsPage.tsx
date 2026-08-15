import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { HardDrive, Save, RefreshCw, Plus, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { devGet, devPost, devDelete } from '../../lib/devopsApi';
import { DevErrorBoundary } from '../../components/developer/DevUI';

export default function DeveloperConfigsPage() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [savingKey, setSavingKey] = useState<string | null>(null);

  // New config state
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newCategory, setNewCategory] = useState('general');
  const [newValueJson, setNewValueJson] = useState('{}');

  const fetchConfigs = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const res = await devGet('/configs', signal);
      if (res.aborted) return;
      if (res.success && res.data) {
        setConfigs(res.data);
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        toast.error('Failed to load platform configs');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchConfigs(controller.signal);
    return () => controller.abort();
  }, [fetchConfigs]);

  const handleSaveConfig = async (key: string, valueJsonStr: string, category = 'general') => {
    let parsed: any;
    try {
      parsed = JSON.parse(valueJsonStr);
    } catch (e) {
      toast.error('Invalid JSON format');
      return;
    }

    setSavingKey(key);
    try {
      const res = await devPost('/configs', { key, valueJson: parsed, category });
      if (res.success) {
        toast.success(`Config [${key}] saved successfully!`);
        setEditingKey(null);
        setIsAddingNew(false);
        setNewKey('');
        setNewValueJson('{}');
        fetchConfigs();
      } else {
        toast.error(res.error || 'Failed to save config');
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSavingKey(null);
    }
  };

  const handleDeleteConfig = async (key: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete platform configuration key '${key}'?`)) return;
    try {
      const res = await devDelete(`/configs/${encodeURIComponent(key)}`);
      if (res.success) {
        toast.success(`Config '${key}' deleted from database`);
        fetchConfigs();
      } else {
        toast.error(res.error || 'Failed to delete config');
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <DevErrorBoundary pageTitle="Platform Configurations">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
              <HardDrive className="w-6 h-6 text-primary-400" />
              Visual Platform Configs & Feature Flags
            </h1>
            <p className="text-slate-400 text-xs mt-1">Live dynamic settings, operational parameters, and runtime feature toggles without redeployments.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAddingNew(!isAddingNew)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-xs font-bold text-white transition-all shadow-md cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Config
            </button>
            <button
              onClick={() => fetchConfigs()}
              disabled={loading}
              className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Add New Config Form */}
        {isAddingNew && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-2xl bg-primary-500/10 border border-primary-500/30 space-y-4"
          >
            <h3 className="font-bold text-white text-sm">Create New Platform Configuration Key</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Config Key (e.g. store_flags)</label>
                <input
                  value={newKey}
                  onChange={e => setNewKey(e.target.value)}
                  placeholder="feature_flag_name"
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary-500 font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Category</label>
                <input
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                  placeholder="general, store, checkout..."
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary-500 font-mono"
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">JSON Value</label>
              <textarea
                rows={4}
                value={newValueJson}
                onChange={e => setNewValueJson(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-primary-500 font-mono"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsAddingNew(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-400"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveConfig(newKey, newValueJson, newCategory)}
                disabled={!newKey.trim() || savingKey === newKey}
                className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-xs font-bold text-white shadow-md disabled:opacity-50"
              >
                {savingKey === newKey ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </motion.div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-white/5 rounded-2xl animate-pulse" />)}
          </div>
        ) : configs.length > 0 ? (
          <div className="space-y-4">
            {configs.map((c) => (
              <motion.div
                key={c.key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900/60 border border-white/[0.08] rounded-2xl p-5 space-y-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="text-primary-400 font-bold font-mono text-sm">{c.key}</span>
                    <span className="text-slate-500 text-xs ml-3 font-mono">
                      v{c.version || 1} • {c.category || 'general'}
                    </span>
                  </div>
                  <span className="text-slate-500 text-xs">
                    Updated: {c.updatedAt ? new Date(c.updatedAt).toLocaleString() : 'N/A'} {c.updatedBy ? `by ${c.updatedBy}` : ''}
                  </span>
                </div>

                {editingKey === c.key ? (
                  <div className="space-y-3">
                    <textarea
                      rows={6}
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      className="w-full bg-black/60 border border-primary-500/50 rounded-xl p-3 text-xs text-slate-200 font-mono focus:outline-none"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingKey(null)}
                        className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-400"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveConfig(c.key, editValue, c.category)}
                        disabled={savingKey === c.key}
                        className="px-4 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-xs font-bold text-white flex items-center gap-1.5"
                      >
                        <Save className="w-3.5 h-3.5" />
                        {savingKey === c.key ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <pre className="bg-black/40 border border-white/5 p-3 rounded-xl text-xs text-slate-300 overflow-x-auto font-mono max-h-56 leading-relaxed">
                      {JSON.stringify(c.valueJson, null, 2)}
                    </pre>
                    <div className="pt-2 flex justify-end gap-2">
                      <button
                        onClick={() => handleDeleteConfig(c.key)}
                        className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-xs font-semibold text-red-400 transition-all cursor-pointer"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => {
                          setEditingKey(c.key);
                          setEditValue(JSON.stringify(c.valueJson, null, 2));
                        }}
                        className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer"
                      >
                        Edit JSON
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-white/5 text-slate-500 text-sm">
            No platform configs found. Click "Add Config" to initialize a feature flag.
          </div>
        )}
      </div>
    </DevErrorBoundary>
  );
}
