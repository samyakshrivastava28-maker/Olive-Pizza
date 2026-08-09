import React, { useState, useEffect } from "react";
import { useSDUIStore } from "../../../../stores/sduiStore";
import { SDUISection } from "../../../../types/sdui.types";
import { StudioLeftSidebar } from "../studio/StudioLeftSidebar";
import { StudioPromptHub } from "../studio/StudioPromptHub";
import { StudioLiveCanvas } from "../studio/StudioLiveCanvas";
import { StudioInspector } from "../studio/StudioInspector";
import { StudioCopilotBar } from "../studio/StudioCopilotBar";
import { StudioPublishModal } from "../studio/StudioPublishModal";
import { OwnerMadeUIs } from "../../OliveStudio/OwnerMadeUIs";
import { AIReviewModal } from "../../OliveStudio/modals/AIReviewModal";
import { enforceAllSectionsBrand } from "../../../../utils/brandLock";
import {
  Bot,
  Sparkles,
  Zap,
  ShieldCheck,
  Send,
  RotateCcw,
  Save,
  Layers,
  Smartphone,
  Tablet,
  Monitor,
  History,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Eye,
  Settings
} from "lucide-react";
import toast from "react-hot-toast";

interface SavedAIDraft {
  id: string;
  name: string;
  timestamp: string;
  prompt: string;
  sections: SDUISection[];
}

type StudioSubTab = "generate" | "editor" | "preview" | "history" | "review" | "settings";

export const AIDesignerTab: React.FC = () => {
  const homepage = useSDUIStore((state) => state.draftHomepage || state.homepage);
  const saveDraft = useSDUIStore((state) => state.saveDraft);
  const publish = useSDUIStore((state) => state.publish);

  const [activeSubTab, setActiveSubTab] = useState<StudioSubTab>("generate");
  const [proposedSections, setProposedSections] = useState<SDUISection[] | null>(null);
  const [selectedSection, setSelectedSection] = useState<SDUISection | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [currentProgressStep, setCurrentProgressStep] = useState(0);

  const [savedDrafts, setSavedDrafts] = useState<SavedAIDraft[]>([]);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const [deviceMode, setDeviceMode] = useState<"mobile" | "tablet" | "desktop">("mobile");
  const [stitchTelemetry, setStitchTelemetry] = useState<any>(null);
  const [testingStitch, setTestingStitch] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("olive_sdui_ai_studio_drafts");
      if (stored) setSavedDrafts(JSON.parse(stored));
    } catch {}
    // Load initial sections if empty
    if (!proposedSections && homepage?.sections) {
      setProposedSections(homepage.sections);
    }
  }, [homepage]);

  const saveDraftsToStorage = (drafts: SavedAIDraft[]) => {
    setSavedDrafts(drafts);
    try {
      localStorage.setItem("olive_sdui_ai_studio_drafts", JSON.stringify(drafts));
    } catch {}
  };

  // Test Stitch Connection Diagnostic
  const handleTestStitch = async () => {
    setTestingStitch(true);
    try {
      const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken") || "";
      const res = await fetch("/api/design-studio/sdui/stitch/verify", {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const data = await res.json();
      if (data?.success) {
        setStitchTelemetry(data);
        toast.success(`✅ Google Stitch Connected! Project: ${data.projectId}`, { duration: 4000 });
      } else {
        throw new Error(data?.error || "Stitch verification failed");
      }
    } catch (err: any) {
      toast.error(`❌ Google Stitch Diagnostic Error: ${err.message}`, { duration: 5000 });
    } finally {
      setTestingStitch(false);
    }
  };

  // Generate Design using Multi-Model Pipeline (GLM 5.2 + DeepSeek V4 Pro + Google Stitch)
  const handleGenerate = async (prompt: string) => {
    setIsGenerating(true);
    setCurrentProgressStep(0);

    const interval = setInterval(() => {
      setCurrentProgressStep((prev) => (prev < 5 ? prev + 1 : prev));
    }, 400);

    try {
      const res = await fetch("/api/website-manager/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, currentSections: proposedSections || homepage.sections }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}: Stitch generation failed`);
      }

      const data = await res.json();
      if (data?.sections) {
        // Enforce strict Olive Pizza brand lock colors
        const brandLocked = enforceAllSectionsBrand(data.sections);
        setProposedSections(brandLocked);
        if (data.stitchStatus) {
          setStitchTelemetry(data.stitchStatus);
          if (data.stitchStatus.warning) {
            toast.error(`Google Stitch Notice: ${data.stitchStatus.warning}`, { duration: 5000 });
          } else {
            toast.success(`✨ Google Stitch visual design generated successfully!`, { duration: 4000 });
          }
        } else {
          toast.success("🚀 SDUI Design generated & brand locked!");
        }
        // Auto navigate to Editor tab on successful generation
        setActiveSubTab("editor");
      } else {
        throw new Error("Stitch returned empty section payload");
      }
    } catch (err: any) {
      // Surface real error message — NO fake fallback mock generation per architecture rules
      console.error("[SDUI Designer Agent Error]:", err);
      toast.error(`Google Stitch Generation Error: ${err.message}`, { duration: 6000 });
    } finally {
      clearInterval(interval);
      setCurrentProgressStep(5);
      setIsGenerating(false);
    }
  };

  const handleUpdateSection = (updated: SDUISection) => {
    if (!proposedSections) return;
    const next = proposedSections.map((s) => (s.id === updated.id ? updated : s));
    setProposedSections(next);
    setSelectedSection(updated);
  };

  const handleMoveSection = (id: string, direction: "up" | "down") => {
    if (!proposedSections) return;
    const idx = proposedSections.findIndex((s) => s.id === id);
    const target = direction === "up" ? idx - 1 : idx + 1;
    if (target < 0 || target >= proposedSections.length) return;
    const copy = [...proposedSections];
    const temp = copy[idx];
    copy[idx] = copy[target];
    copy[target] = temp;
    setProposedSections(copy.map((s, i) => ({ ...s, order: i })));
  };

  const handleToggleVisibility = (id: string) => {
    if (!proposedSections) return;
    setProposedSections(proposedSections.map((s) => (s.id === id ? { ...s, isVisible: !s.isVisible } : s)));
  };

  const handleDeleteSection = (id: string) => {
    if (!proposedSections) return;
    setProposedSections(proposedSections.filter((s) => s.id !== id));
    if (selectedSection?.id === id) setSelectedSection(null);
  };

  const handleSaveDraft = () => {
    if (!proposedSections) return;
    const newDraft: SavedAIDraft = {
      id: `studio_draft_${Date.now()}`,
      name: `Studio Draft ${new Date().toLocaleTimeString()}`,
      timestamp: new Date().toLocaleTimeString(),
      prompt: "Studio AI Design",
      sections: proposedSections,
    };
    saveDraftsToStorage([newDraft, ...savedDrafts]);
    toast.success("Saved to Studio Drafts history!");
  };

  const handlePublishConfirm = async () => {
    if (!proposedSections) return;
    setIsPublishing(true);
    try {
      await saveDraft({
        ...homepage,
        sections: proposedSections,
        changelog: "Published AI Studio Generated Design",
      });
      await publish("Published AI Studio Generated Design", "Owner AI Studio");
      toast.success("🚀 Published live to customer website!");
      setIsPublishModalOpen(false);
    } catch (err: any) {
      toast.error(`Publishing failed: ${err.message}`);
    } finally {
      setIsPublishing(false);
    }
  };

  const SUB_TABS: Array<{ id: StudioSubTab; label: string; icon: any; badge?: string }> = [
    { id: "generate", label: "🤖 AI & Stitch Agent", icon: Bot },
    { id: "editor", label: "🎨 Visual Editor", icon: Layers, badge: proposedSections?.length ? `${proposedSections.length}` : undefined },
    { id: "preview", label: "📱 Device Preview", icon: Eye },
    { id: "history", label: "📜 Version History", icon: History },
    { id: "review", label: "🛡️ AI Review & Safety", icon: ShieldCheck },
    { id: "settings", label: "⚙️ Stitch Diagnostics", icon: Settings },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] min-h-[720px] bg-[#06070a] rounded-3xl border border-white/[0.08] overflow-hidden shadow-2xl">
      {/* Studio Header Bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-[#0a0b0e] border-b border-white/[0.06] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary-500/20 text-primary-400 border border-primary-500/30">
            <Bot className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-white tracking-tight">SDUI Design Agent Studio</h2>
              <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-primary-500/20 border border-primary-500/40 text-primary-300 uppercase tracking-widest">
                Dedicated Page Mode
              </span>
              {stitchTelemetry?.projectId ? (
                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-green-500/20 border border-green-500/40 text-green-300 flex items-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5" /> Stitch Project: {stitchTelemetry.projectId}
                </span>
              ) : null}
            </div>
            <p className="text-[10px] text-slate-400">Google Stitch • DeepSeek V4 Pro • GLM 5.2 • Brand Lock Active 🛡️</p>
          </div>
        </div>

        {/* Sub-navigation tabs */}
        <div className="flex items-center gap-1 p-1 bg-white/[0.04] border border-white/[0.08] rounded-2xl">
          {SUB_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? "bg-primary-500 text-white shadow-lg shadow-primary-500/20"
                    : "text-slate-400 hover:text-white hover:bg-white/[0.05]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono ${isActive ? "bg-white/20 text-white" : "bg-white/10 text-slate-400"}`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {proposedSections && (
            <>
              <button
                onClick={handleSaveDraft}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs border border-white/[0.08] transition-all"
              >
                <Save className="w-3.5 h-3.5" /> Save Draft
              </button>
              <button
                onClick={() => setIsPublishModalOpen(true)}
                className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 font-black text-xs text-white shadow-lg shadow-green-500/20 transition-all hover:scale-105"
              >
                <Send className="w-3.5 h-3.5" /> 🚀 Publish Live
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Studio Body — Separate Clean Page per SubTab */}
      <div className="flex-1 overflow-hidden relative">
        {/* SUBTAB 1: AI & Stitch Generator */}
        {activeSubTab === "generate" && (
          <div className="h-full grid grid-cols-12 overflow-hidden">
            <div className="col-span-4 border-r border-white/[0.06] h-full overflow-hidden">
              <StudioLeftSidebar
                savedDrafts={savedDrafts}
                onLoadDraft={(d: SavedAIDraft) => {
                  setProposedSections(d.sections);
                  setActiveSubTab("editor");
                }}
                onClearHistory={() => saveDraftsToStorage([])}
                onUseTemplate={(t: any) => handleGenerate(t.name)}
              />
            </div>
            <div className="col-span-8 h-full overflow-y-auto custom-scrollbar p-6">
              <StudioPromptHub
                onGenerate={handleGenerate}
                isGenerating={isGenerating}
                currentStep={currentProgressStep}
              />
            </div>
          </div>
        )}

        {/* SUBTAB 2: Visual Editor & Canvas */}
        {activeSubTab === "editor" && (
          <div className="h-full grid grid-cols-12 overflow-hidden">
            <div className={`${selectedSection ? "col-span-8" : "col-span-12"} h-full min-w-0 transition-all`}>
              <StudioLiveCanvas
                proposedSections={proposedSections}
                onSectionClick={(sec: SDUISection) => setSelectedSection(sec)}
                selectedSectionId={selectedSection?.id || null}
              />
            </div>
            {selectedSection && (
              <div className="col-span-4 h-full border-l border-white/[0.06] min-w-0">
                <StudioInspector
                  section={selectedSection}
                  allSections={proposedSections || []}
                  onClose={() => setSelectedSection(null)}
                  onUpdate={handleUpdateSection}
                  onMove={handleMoveSection}
                  onToggleVisibility={handleToggleVisibility}
                  onDelete={handleDeleteSection}
                />
              </div>
            )}
          </div>
        )}

        {/* SUBTAB 3: Device Preview */}
        {activeSubTab === "preview" && (
          <div className="h-full flex flex-col items-center p-6 overflow-y-auto custom-scrollbar bg-[#040508]">
            <div className="flex items-center gap-3 mb-6 bg-white/[0.04] p-1.5 rounded-2xl border border-white/10">
              <button
                onClick={() => setDeviceMode("mobile")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  deviceMode === "mobile" ? "bg-primary-500 text-white shadow-lg" : "text-slate-400 hover:text-white"
                }`}
              >
                <Smartphone className="w-4 h-4" /> Mobile (375px)
              </button>
              <button
                onClick={() => setDeviceMode("tablet")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  deviceMode === "tablet" ? "bg-primary-500 text-white shadow-lg" : "text-slate-400 hover:text-white"
                }`}
              >
                <Tablet className="w-4 h-4" /> Tablet (768px)
              </button>
              <button
                onClick={() => setDeviceMode("desktop")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  deviceMode === "desktop" ? "bg-primary-500 text-white shadow-lg" : "text-slate-400 hover:text-white"
                }`}
              >
                <Monitor className="w-4 h-4" /> Desktop (1440px)
              </button>
            </div>
            <div
              className={`transition-all duration-300 rounded-3xl border border-white/10 shadow-2xl overflow-hidden bg-[#090b10] ${
                deviceMode === "mobile" ? "w-[375px] min-h-[667px]" : deviceMode === "tablet" ? "w-[768px] min-h-[800px]" : "w-full max-w-[1440px] min-h-[800px]"
              }`}
            >
              <StudioLiveCanvas
                proposedSections={proposedSections}
                onSectionClick={(sec: SDUISection) => setSelectedSection(sec)}
                selectedSectionId={selectedSection?.id || null}
              />
            </div>
          </div>
        )}

        {/* SUBTAB 4: Version History & Owner Made UIs */}
        {activeSubTab === "history" && (
          <div className="h-full p-6 overflow-y-auto custom-scrollbar">
            <OwnerMadeUIs
              onSelectVersionSections={(sections) => {
                setProposedSections(sections);
                setActiveSubTab("editor");
                toast.success("Loaded saved version into editor!");
              }}
            />
          </div>
        )}

        {/* SUBTAB 5: AI Review & Safety */}
        {activeSubTab === "review" && (
          <div className="h-full p-6 overflow-y-auto custom-scrollbar">
            <AIReviewModal
              sections={proposedSections || []}
              ownerPrompt="SDUI Design Agent Request"
              onClose={() => setActiveSubTab("editor")}
              onApplySuggestions={(fixedSections) => {
                setProposedSections(fixedSections);
                toast.success("AI Suggestions applied to design!");
              }}
              onPublish={handlePublishConfirm}
            />
          </div>
        )}

        {/* SUBTAB 6: Stitch Diagnostics & Settings */}
        {activeSubTab === "settings" && (
          <div className="h-full p-8 overflow-y-auto custom-scrollbar space-y-6 max-w-4xl mx-auto text-slate-200">
            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary-400" /> Google Stitch MCP Diagnostics
              </h3>
              <p className="text-xs text-slate-400">
                Verify Google Stitch Engine API authentication, project configuration, and latency metrics.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleTestStitch}
                  disabled={testingStitch}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs shadow-lg transition-all"
                >
                  {testingStitch ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                  Test Stitch Connection
                </button>
              </div>
              {stitchTelemetry && (
                <pre className="p-4 rounded-xl bg-black/50 border border-white/10 text-xs font-mono text-green-400 overflow-x-auto">
                  {JSON.stringify(stitchTelemetry, null, 2)}
                </pre>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Co-Pilot Bar for Quick Edits (only on Editor tab) */}
      {activeSubTab === "editor" && proposedSections && (
        <StudioCopilotBar
          sections={proposedSections}
          onApply={(updated: SDUISection[]) => setProposedSections(updated)}
        />
      )}

      {/* Release Audit & Publish Modal */}
      <StudioPublishModal
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        onPublish={handlePublishConfirm}
        currentSections={homepage.sections}
        proposedSections={proposedSections || []}
        isPublishing={isPublishing}
      />
    </div>
  );
};

export default AIDesignerTab;
