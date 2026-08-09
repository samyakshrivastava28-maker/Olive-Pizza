import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, CheckCircle2, Archive, RotateCcw, Eye, Edit3, Trash2, Upload, RefreshCw, Loader2, ChevronRight, Shield, Zap } from "lucide-react";
import toast from "react-hot-toast";

interface SDUIVersionRecord {
  versionId: string;
  versionNumber: number;
  status: "DRAFT" | "LIVE" | "ARCHIVED";
  ownerPrompt?: string;
  explanation?: string;
  savedAt: string;
  publishedAt?: string;
  publishedBy?: string;
  sectionCount: number;
  safetyScore?: number;
  pipelineModels?: string[];
}

interface SDUIManifest {
  liveVersionId: string | null;
  liveVersionNumber: number | null;
  lastUpdated: string;
  totalVersions: number;
  versions: SDUIVersionRecord[];
}

interface Props {
  onSelectVersionSections?: (sections: any[], versionId: string) => void;
  onClose?: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  LIVE:     { label: "Live",     color: "text-green-400",  bg: "bg-green-500/10 border-green-500/20",  icon: CheckCircle2 },
  DRAFT:    { label: "Draft",    color: "text-amber-400",  bg: "bg-amber-500/10 border-amber-500/20",  icon: Clock },
  ARCHIVED: { label: "Archived", color: "text-slate-400",  bg: "bg-slate-500/10 border-slate-500/20",  icon: Archive },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export const OwnerMadeUIs: React.FC<Props> = ({ onSelectVersionSections, onClose }) => {
  const [manifest, setManifest] = useState<SDUIManifest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadManifest = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken") || "";
      const res = await fetch("/api/design-studio/sdui/versions", {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setManifest(data.manifest);
    } catch (err: any) {
      toast.error(`Failed to load versions: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadManifest(); }, []);

  const handlePreviewVersion = async (version: SDUIVersionRecord) => {
    if (!onSelectVersionSections) return;
    setActionLoading(`preview_${version.versionId}`);
    try {
      const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken") || "";
      const res = await fetch(`/api/design-studio/sdui/version/${version.versionId}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      onSelectVersionSections(data.sections || [], version.versionId);
      toast.success(`Previewing Version ${version.versionNumber}`);
    } catch (err: any) {
      toast.error(`Preview failed: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePublish = async (version: SDUIVersionRecord) => {
    setActionLoading(`publish_${version.versionId}`);
    try {
      const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken") || "";
      // First load sections
      const secRes = await fetch(`/api/design-studio/sdui/version/${version.versionId}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const secData = await secRes.json();

      const res = await fetch("/api/design-studio/sdui/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ versionId: version.versionId, sections: secData.sections || [], changelog: `Published Version ${version.versionNumber} from Owner Made UIs` }),
      });
      if (!res.ok) throw new Error((await res.json()).error || `HTTP ${res.status}`);
      toast.success(`🎉 Version ${version.versionNumber} is now LIVE!`, { duration: 4000 });
      await loadManifest();
    } catch (err: any) {
      toast.error(`Publish failed: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRollback = async (version: SDUIVersionRecord) => {
    setActionLoading(`rollback_${version.versionId}`);
    try {
      const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken") || "";
      const res = await fetch("/api/design-studio/sdui/rollback", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ targetVersionId: version.versionId }),
      });
      if (!res.ok) throw new Error((await res.json()).error || `HTTP ${res.status}`);
      toast.success(`Rolled back to Version ${version.versionNumber}`);
      await loadManifest();
    } catch (err: any) {
      toast.error(`Rollback failed: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestoreDefault = async () => {
    setActionLoading("restore_default");
    try {
      const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken") || "";
      const res = await fetch("/api/design-studio/sdui/rollback", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ restoreDefault: true }),
      });
      if (!res.ok) throw new Error((await res.json()).error || `HTTP ${res.status}`);
      toast.success("Default Olive Pizza UI restored!");
      await loadManifest();
    } catch (err: any) {
      toast.error(`Restore failed: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const versions = manifest?.versions?.slice().reverse() || [];

  return (
    <div className="flex flex-col h-full bg-[#0a0b0f] rounded-2xl border border-white/[0.07] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <div>
          <h2 className="text-sm font-black text-white">Owner Made UIs</h2>
          <p className="text-[10px] text-slate-500 mt-0.5">{manifest?.totalVersions ?? 0} total versions · {manifest?.liveVersionId ? `v${manifest.liveVersionNumber} live` : "No live version"}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleRestoreDefault} disabled={actionLoading === "restore_default"}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 text-slate-400 text-xs font-bold hover:text-white hover:border-white/20 transition-all">
            {actionLoading === "restore_default" ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
            Default UI
          </button>
          <button onClick={loadManifest} disabled={isLoading}
            className="p-2 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-all">
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            <p className="text-xs text-slate-400">Loading versions...</p>
          </div>
        ) : versions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <Archive className="w-6 h-6 text-slate-500" />
            </div>
            <p className="text-sm font-bold text-white">No saved designs yet</p>
            <p className="text-xs text-slate-500">Generate a design with Google Stitch and save it to create your first version.</p>
          </div>
        ) : (
          <AnimatePresence>
            {versions.map((version, idx) => {
              const sc = STATUS_CONFIG[version.status] || STATUS_CONFIG.ARCHIVED;
              const StatusIcon = sc.icon;
              const isExpanded = expandedId === version.versionId;
              const isLive = version.status === "LIVE";
              return (
                <motion.div key={version.versionId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
                  className={`rounded-2xl border overflow-hidden transition-all ${isLive ? "border-green-500/30 bg-green-500/5" : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"}`}>
                  <button className="w-full flex items-center gap-3 px-4 py-3 text-left"
                    onClick={() => setExpandedId(isExpanded ? null : version.versionId)}>
                    {/* Version badge */}
                    <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black ${isLive ? "bg-green-500/20 text-green-400" : "bg-white/5 text-slate-400"}`}>
                      v{version.versionNumber}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-black px-1.5 py-0.5 rounded-md border ${sc.bg} ${sc.color}`}>
                          <StatusIcon className="w-2.5 h-2.5" />{sc.label}
                        </span>
                        {version.safetyScore !== undefined && (
                          <span className={`text-[10px] font-bold ${version.safetyScore >= 80 ? "text-green-400" : version.safetyScore >= 60 ? "text-amber-400" : "text-red-400"}`}>
                            <Shield className="w-2.5 h-2.5 inline mr-0.5" />{version.safetyScore}
                          </span>
                        )}
                        <span className="text-[9px] text-slate-600">{timeAgo(version.savedAt)}</span>
                      </div>
                      <p className="text-xs text-slate-300 truncate">{version.ownerPrompt || `Design Version ${version.versionNumber}`}</p>
                      <p className="text-[10px] text-slate-500">{version.sectionCount} sections</p>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-slate-600 flex-shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                        <div className="px-4 pb-4 space-y-3">
                          {version.explanation && (
                            <p className="text-[11px] text-slate-400 bg-white/5 rounded-xl px-3 py-2 leading-relaxed">{version.explanation}</p>
                          )}
                          {version.pipelineModels && version.pipelineModels.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Zap className="w-3 h-3 text-primary-400" />
                              {version.pipelineModels.map(m => (
                                <span key={m} className="text-[9px] px-1.5 py-0.5 rounded-md bg-primary-500/10 border border-primary-500/20 text-primary-300 font-mono">{m}</span>
                              ))}
                            </div>
                          )}
                          <div className="flex gap-2">
                            {onSelectVersionSections && (
                              <button onClick={() => handlePreviewVersion(version)} disabled={!!actionLoading}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-xs font-bold hover:text-white hover:bg-white/10 transition-all">
                                {actionLoading === `preview_${version.versionId}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
                                Preview
                              </button>
                            )}
                            {version.status !== "LIVE" && (
                              <button onClick={() => handlePublish(version)} disabled={!!actionLoading}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-500/15 border border-primary-500/30 text-primary-300 text-xs font-bold hover:bg-primary-500/25 transition-all">
                                {actionLoading === `publish_${version.versionId}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                                Publish
                              </button>
                            )}
                            {version.status === "ARCHIVED" && (
                              <button onClick={() => handleRollback(version)} disabled={!!actionLoading}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-bold hover:bg-amber-500/20 transition-all">
                                {actionLoading === `rollback_${version.versionId}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                                Rollback
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default OwnerMadeUIs;
