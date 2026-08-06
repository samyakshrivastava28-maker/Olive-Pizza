import React, { useState, useEffect } from 'react';
import { useSDUIStore } from '../../../../stores/sduiStore';
import { VersionSnapshot } from '../../../../types/sdui.types';
import { db } from '../../../../lib/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { Send, History, RotateCcw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export const PublishTab: React.FC = () => {
  const homepage = useSDUIStore((state) => state.homepage);
  const draftHomepage = useSDUIStore((state) => state.draftHomepage);
  const hasDraft = useSDUIStore((state) => state.hasDraft);
  const publish = useSDUIStore((state) => state.publish);
  const discardDraft = useSDUIStore((state) => state.discardDraft);
  const restoreVersion = useSDUIStore((state) => state.restoreVersion);

  const [changelog, setChangelog] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [history, setHistory] = useState<VersionSnapshot[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const q = query(collection(db, 'website_versions'), orderBy('timestamp', 'desc'));
      const snap = await getDocs(q);
      const list = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as VersionSnapshot));
      setHistory(list);
    } catch {
      // Fallback empty list if firebase rules restricted
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      await publish(changelog || 'Published website layout updates', 'Store Owner');
      setChangelog('');
      toast.success('Website changes published live to customers!');
      loadHistory();
    } catch (err: any) {
      toast.error(err?.message || 'Publish failed');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDiscard = async () => {
    await discardDraft();
    toast.success('Draft discarded');
  };

  const handleRollback = async (versionId: string, versionNum: number) => {
    if (confirm(`Are you sure you want to rollback the live website to Version ${versionNum}?`)) {
      await restoreVersion(versionId, 'Store Owner');
      toast.success(`Rolled back live site to Version ${versionNum}!`);
      loadHistory();
    }
  };

  return (
    <div className="space-y-6">
      {/* Draft & Publish Control Box */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-white/10 space-y-4 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            {hasDraft ? (
              <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-green-500/20 text-green-400 border border-green-500/30">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-white">
                  {hasDraft ? 'Unpublished Draft Pending' : 'Live Website Up To Date'}
                </h3>
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300">
                  v{homepage.version || 1}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {hasDraft
                  ? 'You have draft changes ready to publish.'
                  : `Last published ${homepage.publishedAt ? new Date(homepage.publishedAt).toLocaleString() : 'recently'}`}
              </p>
            </div>
          </div>

          {hasDraft && (
            <button
              onClick={handleDiscard}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white font-bold text-xs"
            >
              Discard Draft
            </button>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1">Release Notes / Changelog</label>
          <input
            type="text"
            value={changelog}
            onChange={(e) => setChangelog(e.target.value)}
            placeholder="e.g. Added Diwali campaign banner and updated top selling section order"
            className="w-full px-4 py-3 rounded-2xl bg-slate-800 border border-white/10 text-white font-semibold text-sm focus:outline-none focus:border-primary-500"
          />
        </div>

        <button
          onClick={handlePublish}
          disabled={isPublishing}
          className="w-full py-3.5 rounded-2xl bg-primary-500 hover:bg-primary-600 font-bold text-sm text-white shadow-xl shadow-primary-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        >
          {isPublishing ? (
            <span>Publishing Live...</span>
          ) : (
            <>
              <Send className="w-4 h-4" /> Publish Website Changes Live
            </>
          )}
        </button>
      </div>

      {/* Version History Snapshots */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-primary-400" /> Version History & 1-Click Rollback
          </h3>
          <button onClick={loadHistory} className="text-xs font-bold text-slate-400 hover:text-white">
            Refresh History
          </button>
        </div>

        <div className="space-y-3">
          {history.length === 0 ? (
            <div className="p-6 text-center rounded-2xl bg-slate-950/40 border border-white/5 text-xs text-slate-400">
              No previous version snapshots saved yet. Version snapshots are saved automatically on every publish.
            </div>
          ) : (
            history.map((v) => (
              <div
                key={v.id}
                className="p-4 rounded-2xl bg-slate-800/60 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-white">Version {v.version}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(v.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">{v.changelog || 'Published updates'}</p>
                  <p className="text-[10px] text-slate-500">By: {v.publishedBy}</p>
                </div>

                <button
                  onClick={() => handleRollback(v.id, v.version)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 text-xs font-bold transition-all self-end sm:self-center"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Rollback to v{v.version}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
export default PublishTab;
