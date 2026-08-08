import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSDUIStore } from '../../../stores/sduiStore';
import { SDUISection, CanvasSelection, AIGenerationVersion } from '../../../types/sdui.types';
import { OliveStudioTopbar } from './OliveStudioTopbar';
import { OliveStudioLeftPanel } from './OliveStudioLeftPanel';
import { OliveStudioCanvas } from './OliveStudioCanvas';
import { OliveStudioRightPanel } from './OliveStudioRightPanel';
import { AIReviewModal } from './modals/AIReviewModal';
import { CampaignModal } from './modals/CampaignModal';
import { ComponentLibraryModal } from './modals/ComponentLibraryModal';
import { Link } from 'react-router';
import toast from 'react-hot-toast';
import { enforceAllSectionsBrand } from '../../../utils/brandLock';
import { ChevronLeft } from 'lucide-react';

export type RightPanelMode = 'ai' | 'inspector' | 'theme' | 'animation' | 'history';
export type DeviceMode = 'mobile' | 'tablet' | 'laptop' | 'desktop';

export default function OliveStudio() {
  // ─── Store ──────────────────────────────────────────────────────────────────
  const subscribe = useSDUIStore(s => s.subscribe);
  const draftHomepage = useSDUIStore(s => s.draftHomepage);
  const homepage = useSDUIStore(s => s.homepage);
  const hasDraft = useSDUIStore(s => s.hasDraft);
  const saveDraft = useSDUIStore(s => s.saveDraft);
  const publish = useSDUIStore(s => s.publish);
  const canUndo = useSDUIStore(s => s.canUndo);
  const canRedo = useSDUIStore(s => s.canRedo);
  const undo = useSDUIStore(s => s.undo);
  const redo = useSDUIStore(s => s.redo);

  // ─── Local State ────────────────────────────────────────────────────────────
  const [sections, setSections] = useState<SDUISection[]>([]);
  const [selection, setSelection] = useState<CanvasSelection>({ sectionId: null, editingField: null });
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('mobile');
  const [rightPanel, setRightPanel] = useState<RightPanelMode>('ai');
  const [showLibrary, setShowLibrary] = useState(false);
  const [showCampaign, setShowCampaign] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiVersions, setAiVersions] = useState<AIGenerationVersion[]>([]);
  const [previewVersionIdx, setPreviewVersionIdx] = useState<number | null>(null);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const autosaveRef = useRef<ReturnType<typeof setInterval>>();

  // ─── Sync sections from store ────────────────────────────────────────────────
  useEffect(() => {
    const unsub = subscribe();
    return () => unsub();
  }, [subscribe]);

  useEffect(() => {
    const src = draftHomepage || homepage;
    if (src?.sections) setSections(src.sections);
  }, [draftHomepage, homepage]);

  // ─── Autosave every 5 seconds ────────────────────────────────────────────────
  useEffect(() => {
    autosaveRef.current = setInterval(async () => {
      if (sections.length > 0) {
        try {
          await saveDraft({ ...(draftHomepage || homepage), sections });
        } catch { /* silent */ }
      }
    }, 5000);
    return () => clearInterval(autosaveRef.current);
  }, [sections, saveDraft, draftHomepage, homepage]);

  // ─── Section update helpers ──────────────────────────────────────────────────
  const updateSections = useCallback(async (newSections: SDUISection[]) => {
    const ordered = newSections.map((s, i) => ({ ...s, order: i }));
    setSections(ordered);
    await saveDraft({ ...(draftHomepage || homepage), sections: ordered });
  }, [saveDraft, draftHomepage, homepage]);

  const handleSectionUpdate = useCallback((updated: SDUISection) => {
    const newSections = sections.map(s => s.id === updated.id ? { ...updated, studioMeta: { ...updated.studioMeta, lastEditedAt: new Date().toISOString() } } : s);
    updateSections(newSections);
  }, [sections, updateSections]);

  const handleSectionDelete = useCallback((id: string) => {
    const section = sections.find(s => s.id === id);
    if (section?.isLocked) { toast.error('This section is locked'); return; }
    updateSections(sections.filter(s => s.id !== id));
    setSelection({ sectionId: null, editingField: null });
    toast.success('Section removed');
  }, [sections, updateSections]);

  const handleSectionDuplicate = useCallback((id: string) => {
    const section = sections.find(s => s.id === id);
    if (!section) return;
    const clone: SDUISection = {
      ...section,
      id: `${section.type}_${Date.now()}`,
      label: `${section.label} (Copy)`,
      order: section.order + 1,
      studioMeta: { ...section.studioMeta, addedAt: new Date().toISOString() },
    };
    const idx = sections.findIndex(s => s.id === id);
    const next = [...sections];
    next.splice(idx + 1, 0, clone);
    updateSections(next);
    toast.success('Section duplicated');
  }, [sections, updateSections]);

  const handleAddSection = useCallback((newSection: SDUISection) => {
    const withMeta: SDUISection = {
      ...newSection,
      order: sections.length,
      studioMeta: { addedAt: new Date().toISOString() },
    };
    updateSections([...sections, withMeta]);
    setShowLibrary(false);
    toast.success(`"${newSection.label}" added to canvas`);
  }, [sections, updateSections]);

  // ─── Section selection ───────────────────────────────────────────────────────
  const handleSelectSection = useCallback((sectionId: string | null) => {
    setSelection({ sectionId, editingField: null });
    if (sectionId) setRightPanel('inspector');
    else setRightPanel('ai');
  }, []);

  // ─── AI Generation (Google Stitch Only) ───────────────────────────────────────
  const handleAIGenerate = useCallback(async (prompt: string) => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/website-manager/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, currentSections: sections, generateVersions: 4 }),
      });

      let data: any = null;
      const responseText = await res.text();
      try {
        data = responseText ? JSON.parse(responseText) : null;
      } catch {
        data = { success: false, error: `❌ Server Response Error (HTTP ${res.status}): ${responseText.slice(0, 100)}` };
      }
      if (res.ok && data?.success && data?.sections) {
        const branded = enforceAllSectionsBrand(data.sections);

        // Generate 4 distinct Stitch versions (Version A, B, C, D)
        const versions: AIGenerationVersion[] = [
          {
            id: `v_a_${Date.now()}`,
            label: 'Version A (Stitch Default)',
            prompt,
            sections: branded,
            generatedAt: new Date().toISOString(),
            stitchStatus: data.stitchStatus,
          },
          {
            id: `v_b_${Date.now()}`,
            label: 'Version B (Stitch Glassmorphism)',
            prompt,
            sections: branded.map(s => ({
              ...s,
              style: { ...s.style, bgType: 'glass', borderRadius: '32px' },
            })),
            generatedAt: new Date().toISOString(),
            stitchStatus: data.stitchStatus,
          },
          {
            id: `v_c_${Date.now()}`,
            label: 'Version C (Stitch Gold Accent)',
            prompt,
            sections: branded.map(s => ({
              ...s,
              style: { ...s.style, bgType: 'gradient', bgGradient: 'linear-gradient(135deg, rgba(245,158,11,0.25), rgba(6,7,10,0.9))' },
            })),
            generatedAt: new Date().toISOString(),
            stitchStatus: data.stitchStatus,
          },
          {
            id: `v_d_${Date.now()}`,
            label: 'Version D (Stitch Mobile Compact)',
            prompt,
            sections: branded.map(s => ({
              ...s,
              style: { ...s.style, padding: '16px' },
            })),
            generatedAt: new Date().toISOString(),
            stitchStatus: data.stitchStatus,
          },
        ];

        setAiVersions(versions);
        setPreviewVersionIdx(0);
        toast.success('✨ Google Stitch designs ready! Preview Versions A, B, C, D before applying.', { duration: 5000 });
      } else {
        const errMsg = data?.error || data?.details || '❌ Google Stitch Connection Error';
        toast.error(errMsg, { duration: 6000 });
      }
    } catch (err: any) {
      const errMsg = err?.message || '❌ Google Stitch Endpoint Unavailable';
      toast.error(errMsg, { duration: 6000 });
    } finally {
      setIsGenerating(false);
    }
  }, [sections]);

  const handleApplyAIVersion = useCallback((versionIdx: number) => {
    const version = aiVersions[versionIdx];
    if (!version) return;
    updateSections(version.sections);
    setPreviewVersionIdx(null);
    toast.success('AI design applied to canvas!');
  }, [aiVersions, updateSections]);

  // ─── Publish ─────────────────────────────────────────────────────────────────
  const handlePublish = useCallback(async () => {
    setIsPublishing(true);
    try {
      await publish('Published via Olive Studio', 'Store Owner');
      toast.success('🎉 Website is live!', { duration: 4000 });
    } catch (err: any) {
      toast.error(err?.message || 'Publish failed');
    } finally {
      setIsPublishing(false);
    }
  }, [publish]);

  // ─── Keyboard shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); if (canUndo) undo(); }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); if (canRedo) redo(); }
      if (e.key === 'Escape') setSelection({ sectionId: null, editingField: null });
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selection.sectionId && !selection.editingField) handleSectionDelete(selection.sectionId);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [canUndo, canRedo, undo, redo, selection, handleSectionDelete]);

  // ─── Displayed sections (preview or live) ───────────────────────────────────
  const displaySections = previewVersionIdx !== null
    ? aiVersions[previewVersionIdx]?.sections || sections
    : sections;

  const selectedSection = selection.sectionId
    ? sections.find(s => s.id === selection.sectionId) ?? null
    : null;

  const content = (
    <div
      className={`flex flex-col bg-[#06070a] text-white ${
        isFullscreen
          ? 'fixed inset-0 z-[999999] w-screen h-screen overflow-hidden'
          : 'w-full h-[calc(100vh-140px)] min-h-[650px] overflow-hidden rounded-2xl border border-white/10 relative z-10'
      }`}
      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
    >
      {/* ── Top Bar ─────────────────────────────────────────────────────── */}
      <OliveStudioTopbar
        hasDraft={hasDraft}
        deviceMode={deviceMode}
        onDeviceChange={setDeviceMode}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        isPublishing={isPublishing}
        onPublish={handlePublish}
        onAIReview={() => setShowReview(true)}
        onCampaign={() => setShowCampaign(true)}
        isFullscreen={isFullscreen}
        onFullscreenToggle={() => setIsFullscreen(v => !v)}
        leftPanelOpen={leftPanelOpen}
        onLeftPanelToggle={() => setLeftPanelOpen(v => !v)}
        sectionCount={sections.length}
        isPreviewing={previewVersionIdx !== null}
        onExitPreview={() => setPreviewVersionIdx(null)}
      />

      {/* ── Main 3-Panel Layout ─────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT PANEL */}
        <AnimatePresence>
          {leftPanelOpen && (
            <motion.div
              key="left-panel"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 35 }}
              className="overflow-hidden flex-shrink-0"
            >
              <OliveStudioLeftPanel
                sections={sections}
                selectedSectionId={selection.sectionId}
                onSelectSection={handleSelectSection}
                onOpenLibrary={() => setShowLibrary(true)}
                onReorderSections={updateSections}
                onToggleVisibility={(id) => {
                  handleSectionUpdate({ ...sections.find(s => s.id === id)!, isVisible: !sections.find(s => s.id === id)!.isVisible });
                }}
                onDeleteSection={handleSectionDelete}
                onDuplicateSection={handleSectionDuplicate}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* CANVAS */}
        <div className="flex-1 overflow-hidden relative">
          <OliveStudioCanvas
            sections={displaySections}
            selectedSectionId={selection.sectionId}
            editingField={selection.editingField}
            deviceMode={deviceMode}
            onSelectSection={handleSelectSection}
            onReorderSections={updateSections}
            onUpdateSection={handleSectionUpdate}
            onDeleteSection={handleSectionDelete}
            onDuplicateSection={handleSectionDuplicate}
            onAddSection={() => setShowLibrary(true)}
            isPreviewing={previewVersionIdx !== null}
            aiVersions={aiVersions}
            previewVersionIdx={previewVersionIdx}
            onPreviewVersion={setPreviewVersionIdx}
            onApplyVersion={handleApplyAIVersion}
          />
        </div>

        {/* RIGHT PANEL */}
        <motion.div
          initial={false}
          animate={{ width: 320 }}
          className="flex-shrink-0 border-l border-white/[0.06] overflow-hidden"
        >
          <OliveStudioRightPanel
            mode={rightPanel}
            onModeChange={setRightPanel}
            selectedSection={selectedSection}
            allSections={sections}
            onUpdateSection={handleSectionUpdate}
            onDeleteSection={handleSectionDelete}
            onDuplicateSection={handleSectionDuplicate}
            onMoveSection={(id, dir) => {
              const idx = sections.findIndex(s => s.id === id);
              const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
              if (targetIdx < 0 || targetIdx >= sections.length) return;
              const next = [...sections];
              [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
              updateSections(next);
            }}
            onAIGenerate={handleAIGenerate}
            isGenerating={isGenerating}
            aiVersions={aiVersions}
            onApplyVersion={handleApplyAIVersion}
          />
        </motion.div>
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showLibrary && (
          <ComponentLibraryModal
            onClose={() => setShowLibrary(false)}
            onAddSection={handleAddSection}
            existingSectionIds={sections.map(s => s.id)}
          />
        )}
        {showCampaign && (
          <CampaignModal
            onClose={() => setShowCampaign(false)}
            onApply={(campSections) => {
              updateSections([...sections, ...campSections]);
              setShowCampaign(false);
              toast.success('Campaign sections added to canvas!');
            }}
          />
        )}
        {showReview && (
          <AIReviewModal
            sections={sections}
            onClose={() => setShowReview(false)}
            onApplySuggestions={(fixedSections) => {
              updateSections(fixedSections);
              setShowReview(false);
              toast.success('AI suggestions applied!');
            }}
            onPublish={handlePublish}
          />
        )}
      </AnimatePresence>

      {/* Floating Back to Owner Panel button when maximized */}
      {isFullscreen && (
        <div className="fixed top-3 right-3 z-[9999999]">
          <Link
            to="/owner/dashboard"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black shadow-2xl shadow-orange-500/50 border border-orange-300/40 transition-all active:scale-95"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Owner Panel</span>
          </Link>
        </div>
      )}
    </div>
  );

  if (isFullscreen) {
    return createPortal(content, document.body);
  }

  return content;
}
