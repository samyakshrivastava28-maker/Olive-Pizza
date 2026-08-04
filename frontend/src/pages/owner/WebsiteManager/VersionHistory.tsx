import React, { useState, useEffect } from 'react';
import { History, RotateCcw, Clock, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { auth } from '../../../lib/firebase';

const BACKEND = import.meta.env.VITE_BACKEND_URL || '';

export const VersionHistory: React.FC = () => {
  const [versions, setVersions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const fetchVersions = async () => {
    setLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`${BACKEND}/api/website-manager/versions/homepage`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setVersions(data.versions || []);
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVersions();
  }, []);

  const handleRollback = async (versionId: string) => {
    if (!confirm(`Are you sure you want to rollback to version ${versionId}?`)) return;
    setRestoringId(versionId);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`${BACKEND}/api/website-manager/rollback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          documentName: 'homepage',
          targetVersionId: versionId,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success('Successfully rolled back homepage snapshot!');
      fetchVersions();
    } catch (e: any) {
      toast.error(e.message || 'Rollback failed');
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-xl">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          Version History & Rollbacks
        </h2>
        <p className="text-slate-400 text-xs mt-1">
          Every publish is snapshotted. You can preview or instantly rollback to any previous version.
        </p>
      </div>

      <div className="space-y-3">
        {versions.map((ver, idx) => (
          <div
            key={ver.id}
            className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 font-mono text-xs">
                v{ver.version || idx + 1}
              </div>
              <div>
                <p className="text-white font-semibold text-xs">
                  {ver.changelog || 'Published update'}
                </p>
                <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(ver.createdAt).toLocaleString()}</span>
                  <span>•</span>
                  <span>by {ver.createdBy}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleRollback(ver.id)}
              disabled={restoringId === ver.id}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 border border-white/10 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {restoringId === ver.id ? 'Restoring...' : 'Rollback to this'}
            </button>
          </div>
        ))}

        {versions.length === 0 && !loading && (
          <div className="p-12 text-center text-slate-500 text-xs rounded-2xl bg-slate-900/40 border border-white/5">
            No previous version snapshots saved yet. Snapshots are created automatically when you publish.
          </div>
        )}
      </div>
    </div>
  );
};
export default VersionHistory;
