import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { db } from "../../lib/firebase";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  getDocs,
} from "firebase/firestore";
import { useAuthStore } from "../../lib/store";
import {
  useHomeLayoutStore,
  DEFAULT_SECTIONS,
  HomeSection,
} from "../../lib/homeLayout";
import {
  GripVertical, Eye, EyeOff, Monitor, Tablet, Smartphone,
  Moon, Sun, Save, Upload, RotateCcw, History, Layout, X,
} from "lucide-react";
import toast from "react-hot-toast";

const SECTION_ICONS: Record<string, string> = {
  hero: "🎬",
  ads: "📢",
  coupons: "🎟️",
  special_categories: "🎪",
  top_selling: "🔥",
  menu: "🍕",
  personalization: "✨",
  order_again: "🔄",
  wishlist: "❤️",
};

const PREVIEW_SIZES = [
  { id: "desktop", label: "Desktop", icon: Monitor, width: "100%" },
  { id: "tablet", label: "Tablet", icon: Tablet, width: "768px" },
  { id: "mobile", label: "Mobile", icon: Smartphone, width: "390px" },
];

export default function OwnerHomepageManager() {
  const { user } = useAuthStore();
  const {
    sections: publishedSections,
    draftSections,
    hasDraft,
    topSelling,
    versionHistory,
    subscribePublished,
    saveDraft,
    publish,
    discardDraft,
    restoreVersion,
    updateTopSelling,
  } = useHomeLayoutStore();

  const [sections, setSections] = useState<HomeSection[]>(DEFAULT_SECTIONS);
  const [previewSize, setPreviewSize] = useState("desktop");
  const [darkMode, setDarkMode] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyEntries, setHistoryEntries] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [topSellingMode, setTopSellingMode] = useState<"automatic" | "manual">(topSelling.mode);
  const [manualProductIds, setManualProductIds] = useState<string[]>(topSelling.manualProductIds);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const unsub = subscribePublished();
    return unsub;
  }, []);

  useEffect(() => {
    // Load from draft if available, else published
    setSections(draftSections || publishedSections);
  }, [publishedSections, draftSections]);

  useEffect(() => {
    setTopSellingMode(topSelling.mode);
    setManualProductIds(topSelling.manualProductIds);
  }, [topSelling]);

  useEffect(() => {
    // Load products for manual selector
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!showHistory) return;
    getDocs(collection(db, "home_layout_versions")).then((snap) => {
      const entries = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setHistoryEntries(entries);
    });
  }, [showHistory]);

  const handleSaveDraft = async () => {
    setSaving(true);
    await saveDraft(sections);
    await updateTopSelling({ mode: topSellingMode, manualProductIds });
    toast.success("Draft saved!");
    setSaving(false);
  };

  const handlePublish = async () => {
    if (!confirm("Publish this layout to the live website?")) return;
    setPublishing(true);
    await publish(sections, user?.email || "owner");
    await updateTopSelling({ mode: topSellingMode, manualProductIds });
    toast.success("🚀 Homepage published!");
    setPublishing(false);
  };

  const handleDiscard = () => {
    if (!confirm("Discard all unsaved changes?")) return;
    discardDraft();
    setSections(publishedSections);
    toast("Changes discarded");
  };

  const handleRestoreVersion = async (versionId: string) => {
    if (!confirm("Restore this version? It will overwrite the current published layout.")) return;
    await restoreVersion(versionId, user?.email || "owner");
    toast.success("Version restored!");
    setShowHistory(false);
  };

  const toggleSection = (id: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isEnabled: !s.isEnabled } : s))
    );
  };

  const toggleManualProduct = (productId: string) => {
    setManualProductIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const previewUrl = window.location.origin + "/";

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <Layout className="w-8 h-8 text-primary-400" /> Homepage Manager
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Drag & drop sections to reorder. Changes won't go live until you click Publish.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1.5 px-3 py-2 border border-white/10 text-slate-400 rounded-xl font-bold text-sm hover:border-white/30 transition-all">
            <History className="w-4 h-4" /> History
          </button>
          <button onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-1.5 px-3 py-2 border border-white/10 text-slate-400 rounded-xl font-bold text-sm hover:border-white/30 transition-all">
            <Eye className="w-4 h-4" /> {showPreview ? "Hide" : "Preview"}
          </button>
          <button onClick={handleSaveDraft} disabled={saving}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-60">
            <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Draft"}
          </button>
          {hasDraft && (
            <button onClick={handleDiscard}
              className="flex items-center gap-1.5 px-3 py-2 border border-red-500/30 text-red-400 rounded-xl font-bold text-sm hover:bg-red-500/10 transition-all">
              <X className="w-4 h-4" /> Discard
            </button>
          )}
          <button onClick={handlePublish} disabled={publishing}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-60 shadow-lg shadow-primary-600/25">
            <Upload className="w-4 h-4" /> {publishing ? "Publishing..." : "Publish"}
          </button>
        </div>
      </div>

      {/* Draft banner */}
      {hasDraft && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 flex items-center gap-3 text-amber-400 text-sm font-bold">
          <Save className="w-4 h-4 flex-shrink-0" />
          You have unsaved draft changes. Click Publish to make them live, or Discard to revert.
        </div>
      )}

      <div className={`grid gap-6 ${showPreview ? "grid-cols-1 xl:grid-cols-2" : "grid-cols-1"}`}>
        {/* Left: Builder */}
        <div className="space-y-6">
          {/* Section order builder */}
          <div className="bg-[#1E293B] border border-white/10 rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-white/5">
              <h2 className="font-black text-white text-lg">Section Order</h2>
              <p className="text-slate-400 text-xs mt-1">Drag to reorder. Toggle the eye icon to show/hide.</p>
            </div>
            <div className="p-4">
              <Reorder.Group axis="y" values={sections} onReorder={setSections} className="space-y-2">
                {sections.sort((a, b) => a.order - b.order).map((section, i) => (
                  <Reorder.Item key={section.id} value={section}>
                    <motion.div
                      whileDrag={{ scale: 1.02, zIndex: 50, boxShadow: "0 20px 40px rgba(0,0,0,0.4)" }}
                      className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-grab active:cursor-grabbing transition-all ${
                        section.isEnabled
                          ? "bg-dark-900 border-white/10 hover:border-white/20"
                          : "bg-dark-900/40 border-white/5 opacity-50"
                      }`}
                    >
                      <GripVertical className="w-5 h-5 text-slate-600 flex-shrink-0" />
                      <span className="text-xl flex-shrink-0">{SECTION_ICONS[section.type] || "📦"}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`font-bold text-sm ${section.isEnabled ? "text-white" : "text-slate-500"}`}>
                          {section.name}
                        </p>
                        <p className="text-xs text-slate-500 capitalize">{section.type.replace(/_/g, " ")}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className="text-xs text-slate-600 font-mono mr-1">{i + 1}</span>
                        <button
                          onClick={() => toggleSection(section.id)}
                          className={`p-2 rounded-lg border transition-all ${
                            section.isEnabled
                              ? "border-green-500/30 text-green-400 hover:bg-green-500/10"
                              : "border-white/10 text-slate-600 hover:border-white/20"
                          }`}
                        >
                          {section.isEnabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </motion.div>
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            </div>
          </div>

          {/* Top Selling Settings */}
          <div className="bg-[#1E293B] border border-white/10 rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-white/5">
              <h2 className="font-black text-white text-lg flex items-center gap-2">
                🔥 Top Selling Configuration
              </h2>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex gap-3">
                <button
                  onClick={() => setTopSellingMode("automatic")}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm border transition-all ${
                    topSellingMode === "automatic"
                      ? "bg-primary-600/20 border-primary-500 text-primary-300"
                      : "border-white/10 text-slate-400 hover:border-white/20"
                  }`}
                >
                  ⚡ Automatic
                  <p className="text-xs font-normal mt-0.5 opacity-70">AI-ranked by sales & engagement</p>
                </button>
                <button
                  onClick={() => setTopSellingMode("manual")}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm border transition-all ${
                    topSellingMode === "manual"
                      ? "bg-primary-600/20 border-primary-500 text-primary-300"
                      : "border-white/10 text-slate-400 hover:border-white/20"
                  }`}
                >
                  ✋ Manual
                  <p className="text-xs font-normal mt-0.5 opacity-70">You pick the products</p>
                </button>
              </div>

              {topSellingMode === "manual" && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Select up to 10 products</p>
                  {products.slice(0, 30).map((p) => {
                    const isSelected = manualProductIds.includes(p.id);
                    return (
                      <button key={p.id} type="button" onClick={() => toggleManualProduct(p.id)}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all ${
                          isSelected ? "border-primary-500 bg-primary-500/10" : "border-white/5 hover:border-white/20 bg-dark-900"
                        }`}>
                        {p.imageUrl && <img src={p.imageUrl} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-white text-sm line-clamp-1">{p.productName}</p>
                          <p className="text-xs text-slate-400">₹{p.basePrice}</p>
                        </div>
                        {isSelected && (
                          <span className="text-xs font-bold text-primary-400 flex-shrink-0">
                            #{manualProductIds.indexOf(p.id) + 1}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Preview */}
        {showPreview && (
          <div className="space-y-4">
            <div className="bg-[#1E293B] border border-white/10 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-white/5 flex flex-wrap items-center gap-3">
                <h2 className="font-black text-white text-base">Live Preview</h2>
                <div className="flex gap-1 ml-auto">
                  {PREVIEW_SIZES.map(({ id, label, icon: Icon }) => (
                    <button key={id} onClick={() => setPreviewSize(id)}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        previewSize === id
                          ? "bg-primary-600/30 text-primary-300 border border-primary-500/50"
                          : "border border-white/10 text-slate-400 hover:border-white/20"
                      }`}>
                      <Icon className="w-3 h-3" /> {label}
                    </button>
                  ))}
                </div>
                <button onClick={() => setDarkMode(!darkMode)}
                  className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:border-white/20">
                  {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="p-4 bg-dark-950 flex justify-center overflow-auto">
                <div
                  style={{ width: PREVIEW_SIZES.find((s) => s.id === previewSize)?.width, maxWidth: "100%", minWidth: previewSize === "mobile" ? "390px" : undefined }}
                  className="transition-all duration-500"
                >
                  <iframe
                    ref={iframeRef}
                    src={previewUrl}
                    title="Homepage Preview"
                    className="w-full rounded-xl border border-white/10"
                    style={{ height: previewSize === "mobile" ? "700px" : "550px" }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Version History Modal */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowHistory(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1E293B] border border-white/10 rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-black text-white text-xl flex items-center gap-2">
                  <History className="w-5 h-5 text-primary-400" /> Version History
                </h2>
                <button onClick={() => setShowHistory(false)} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {historyEntries.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <p>No version history yet. Version history is saved each time you publish.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {historyEntries.map((entry: any) => (
                    <div key={entry.id} className="flex items-center gap-3 p-4 bg-dark-900 rounded-xl border border-white/5">
                      <div className="flex-1">
                        <p className="font-bold text-white text-sm">
                          {new Date(entry.timestamp).toLocaleDateString("en-IN", {
                            day: "numeric", month: "short", year: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">by {entry.editedBy || "owner"}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{entry.sections?.length || 0} sections</p>
                      </div>
                      <button
                        onClick={() => handleRestoreVersion(entry.id)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-primary-600/20 border border-primary-500/40 text-primary-300 rounded-xl text-xs font-bold hover:bg-primary-600/30 transition-all"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Restore
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
