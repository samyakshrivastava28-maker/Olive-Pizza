import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, RefreshCw, Send, Volume2, Radio, Edit2, Save, X, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { devGet, devPost } from '../../lib/devopsApi';
import { StatusPill, DevErrorBoundary } from '../../components/developer/DevUI';

export default function DeveloperTemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingTemplateId, setTestingTemplateId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const fetchTemplates = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const res = await devGet('/notification-templates', signal);
      if (res.aborted) return;
      if (res.success && res.data) {
        setTemplates(res.data);
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        toast.error('Failed to load notification templates');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchTemplates(controller.signal);
    return () => controller.abort();
  }, [fetchTemplates]);

  const handleSendTest = async (templateId: string) => {
    setTestingTemplateId(templateId);
    try {
      const res = await devPost('/notifications/send-test', { templateId });
      if (res.success) {
        toast.success(res.message || `Test notification dispatched for template [${templateId}]!`);
      } else {
        toast.error(res.error || 'Failed to dispatch test notification');
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setTestingTemplateId(null);
    }
  };

  const startEdit = (t: any) => {
    setEditingId(t.id);
    setEditForm({ ...t });
  };

  const handleSave = async () => {
    if (!editForm) return;
    setSaving(true);
    try {
      const res = await devPost('/notification-templates', editForm);
      if (res.success) {
        toast.success(`Template [${editForm.name}] saved to database!`);
        setEditingId(null);
        fetchTemplates();
      } else {
        toast.error(res.error || 'Failed to save template');
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DevErrorBoundary pageTitle="Notification Templates">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
              <Bell className="w-6 h-6 text-primary-400" />
              Notification Template & Dispatch Engine
            </h1>
            <p className="text-slate-400 text-xs mt-1">Configure real-time push and inbox template strings, dynamic variable bindings, channel priority, and audio signals.</p>
          </div>
          <button
            onClick={() => fetchTemplates()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Templates
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-44 bg-white/5 rounded-2xl animate-pulse" />)}
          </div>
        ) : templates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((t) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900/60 border border-white/[0.08] rounded-2xl p-5 space-y-3 flex flex-col justify-between"
              >
                {editingId === t.id ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">Template Name</label>
                      <input
                        value={editForm.name}
                        onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">Title Pattern (e.g. 🔔 New Order #{'{orderNumber}'})</label>
                      <input
                        value={editForm.titlePattern}
                        onChange={e => setEditForm({ ...editForm, titlePattern: e.target.value })}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-primary-300 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">Body Pattern</label>
                      <textarea
                        rows={2}
                        value={editForm.bodyPattern}
                        onChange={e => setEditForm({ ...editForm, bodyPattern: e.target.value })}
                        className="w-full bg-black/50 border border-white/10 rounded-xl p-2 text-xs text-slate-200"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-bold text-slate-300 block mb-1">Sound</label>
                        <input
                          value={editForm.sound}
                          onChange={e => setEditForm({ ...editForm, sound: e.target.value })}
                          className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-1 text-xs text-slate-300 font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-300 block mb-1">Channel ID</label>
                        <input
                          value={editForm.channelId}
                          onChange={e => setEditForm({ ...editForm, channelId: e.target.value })}
                          className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-1 text-xs text-slate-300 font-mono"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-400"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-xs font-bold text-white flex items-center gap-1.5"
                      >
                        <Save className="w-3.5 h-3.5" />
                        {saving ? 'Saving...' : 'Save to DB'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-white font-bold text-sm">{t.name || t.id}</span>
                        <div className="flex items-center gap-2">
                          <StatusPill status={t.priority || 'HIGH'} />
                          <button
                            onClick={() => startEdit(t)}
                            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                            title="Edit template"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-primary-300 font-semibold text-xs mt-1 font-mono">{t.titlePattern || t.title}</p>
                      <p className="text-slate-400 text-xs mt-1">{t.bodyPattern || t.body}</p>
                    </div>

                    <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                      <div className="text-[11px] text-slate-500 font-mono flex items-center gap-3">
                        <span className="flex items-center gap-1"><Volume2 className="w-3 h-3 text-slate-400" /> {t.sound || 'default'}</span>
                        <span className="flex items-center gap-1"><Radio className="w-3 h-3 text-slate-400" /> {t.channelId || 'general'}</span>
                      </div>
                      <button
                        onClick={() => handleSendTest(t.id)}
                        disabled={testingTemplateId === t.id}
                        className="px-3 py-1.5 rounded-lg bg-primary-600/20 hover:bg-primary-600/40 text-primary-300 hover:text-white border border-primary-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Send className={`w-3 h-3 ${testingTemplateId === t.id ? 'animate-spin' : ''}`} />
                        {testingTemplateId === t.id ? 'Sending...' : 'Send Test'}
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-white/5 text-slate-500 text-sm">
            No notification templates found.
          </div>
        )}
      </div>
    </DevErrorBoundary>
  );
}
