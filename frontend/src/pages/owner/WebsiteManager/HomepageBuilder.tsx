import React, { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  Eye,
  EyeOff,
  Lock,
  Plus,
  Trash2,
  Settings2,
  Save,
  Rocket,
  RotateCcw,
  Monitor,
  Tablet,
  Smartphone,
  Sparkles,
  ExternalLink,
  Copy,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useWebsiteConfigStore, Section } from '../../../stores/websiteConfigStore';
import { auth } from '../../../lib/firebase';
import OwnerAIPanel from './OwnerAIPanel';
import SectionRenderer from '../../../components/sdui/SectionRenderer';

const BACKEND = import.meta.env.VITE_BACKEND_URL || '';

const SECTION_TEMPLATES = [
  { type: 'testimonials', label: 'Customer Reviews Carousel', icon: '⭐' },
  { type: 'faq', label: 'FAQ Accordion', icon: '❓' },
  { type: 'video', label: 'Brand Video Player', icon: '🎥' },
  { type: 'stats', label: 'Milestone Counters', icon: '📊' },
  { type: 'bestsellers', label: 'Best Sellers Showcase', icon: '🔥' },
  { type: 'trending', label: 'Trending Items', icon: '⚡' },
  { type: 'custom', label: 'Custom HTML Block', icon: '💻' },
  { type: 'stitch', label: 'Google Stitch Design', icon: '🎨' },
];

function SortableItem({
  section,
  onToggleVisibility,
  onOpenSettings,
  onDelete,
  onDuplicate,
  builderMode,
}: {
  section: Section;
  onToggleVisibility: (id: string) => void;
  onOpenSettings: (s: Section) => void;
  onDelete: (id: string) => void;
  onDuplicate: (s: Section) => void;
  builderMode: 'beginner' | 'advanced';
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
    disabled: section.isLocked,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-4 rounded-xl border flex flex-col items-stretch justify-start gap-3 transition-all relative group overflow-hidden ${
        section.isLocked
          ? 'bg-slate-900/40 border-amber-500/20'
          : section.isVisible
          ? 'bg-slate-900/80 border-white/10 hover:border-primary-500/40 hover:shadow-[0_0_30px_rgba(85,119,90,0.15)]'
          : 'bg-slate-950/50 border-white/5 opacity-60'
      }`}
    >
      <div className="flex items-center justify-between w-full z-10 relative bg-slate-900/90 rounded-lg p-2 border border-white/5 shadow-md">
      <div className="flex items-center gap-3">
        {!section.isLocked ? (
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 text-slate-500 hover:text-slate-300"
            aria-label="Reorder section"
          >
            <GripVertical className="w-5 h-5" />
          </button>
        ) : (
          <div className="p-1 text-amber-400" title="Section locked by developer">
            <Lock className="w-4 h-4" />
          </div>
        )}

        <div>
          <div className="flex items-center gap-2">
            <span className="text-white font-semibold text-sm">{section.label}</span>
            {section.isLocked && (
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-bold">
                LOCKED
              </span>
            )}
          </div>
          <span className="text-slate-500 text-xs font-mono">type: {section.type}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onToggleVisibility(section.id)}
          className={`p-2 rounded-lg transition-colors ${
            section.isVisible
              ? 'text-primary-400 hover:bg-primary-500/10'
              : 'text-slate-600 hover:bg-white/5'
          }`}
          title={section.isVisible ? 'Hide section' : 'Show section'}
        >
          {section.isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>

        <button
          onClick={() => onOpenSettings(section)}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          title="Section settings"
        >
          <Settings2 className="w-4 h-4" />
        </button>

        {!section.isLocked && (
          <>
            <button
              onClick={() => onDuplicate(section)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Duplicate section"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(section.id)}
              className="p-2 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="Delete section"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
      </div>

      {builderMode === 'beginner' && (
        <div className="absolute inset-x-0 bottom-0 top-16 opacity-0 group-hover:opacity-100 bg-dark-900/40 backdrop-blur-[2px] transition-opacity pointer-events-none rounded-b-xl overflow-hidden flex items-center justify-center">
          <span className="px-3 py-1 bg-black/80 rounded-full text-white text-xs font-semibold shadow-xl border border-white/10">Live Preview Container</span>
        </div>
      )}
      {builderMode === 'beginner' && section.type !== 'stitch' && (
        <div className="w-full mt-4 p-4 bg-black/20 rounded-xl overflow-hidden relative pointer-events-none scale-90 origin-top h-[200px]">
          <SectionRenderer section={section} />
        </div>
      )}
      {builderMode === 'beginner' && section.type === 'stitch' && (
        <div className="w-full mt-4 p-4 bg-black/20 rounded-xl overflow-hidden relative pointer-events-none flex items-center justify-center h-[100px] border border-dashed border-primary-500/30">
          <p className="text-primary-400 font-medium text-sm flex items-center gap-2"><span className="text-xl">🎨</span> Google Stitch Canvas: {section.config?.stitchId || 'Layout'}</p>
        </div>
      )}
    </div>
  );
}

export const HomepageBuilder: React.FC = () => {
  const homepage = useWebsiteConfigStore((state) => state.homepage);
  const draftHomepage = useWebsiteConfigStore((state) => state.draftHomepage);

  const [sections, setSections] = useState<Section[]>([]);
  const [activeSectionEdit, setActiveSectionEdit] = useState<Section | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [changelog, setChangelog] = useState('');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('mobile');
  const [saving, setSaving] = useState(false);
  const [builderMode, setBuilderMode] = useState<'beginner' | 'advanced'>('beginner');
  const [showStitchModal, setShowStitchModal] = useState(false);
  const [stitchDesignId, setStitchDesignId] = useState('');
  const [importingStitch, setImportingStitch] = useState(false);

  useEffect(() => {
    const active = draftHomepage?.sections || homepage?.sections || [];
    setSections([...active].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
  }, [draftHomepage, homepage]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sections.findIndex((s) => s.id === active.id);
    const newIndex = sections.findIndex((s) => s.id === over.id);
    const newArr = arrayMove(sections, oldIndex, newIndex).map((s, idx) => ({
      ...s,
      order: idx,
    }));
    setSections(newArr);
    handleSaveDraft(newArr);
  };

  const handleToggleVisibility = (id: string) => {
    const newArr = sections.map((s) => (s.id === id ? { ...s, isVisible: !s.isVisible } : s));
    setSections(newArr);
    handleSaveDraft(newArr);
  };

  const handleDeleteSection = (id: string) => {
    const newArr = sections.filter((s) => s.id !== id);
    setSections(newArr);
    handleSaveDraft(newArr);
    toast.success('Section removed from draft');
  };

  const handleDuplicateSection = (sec: Section) => {
    const newSec: Section = {
      ...sec,
      id: `${sec.type}_${Date.now()}`,
      label: `${sec.label} (Copy)`,
      order: sections.length,
      isLocked: false,
    };
    const newArr = [...sections, newSec];
    setSections(newArr);
    handleSaveDraft(newArr);
    toast.success('Section duplicated in draft');
  };

  const handleAddSection = (type: string, label: string) => {
    if (type === 'stitch') {
      setShowAddModal(false);
      setShowStitchModal(true);
      return;
    }
    
    const newSec: Section = {
      id: `${type}_${Date.now()}`,
      type,
      label,
      isVisible: true,
      order: sections.length,
      config: {},
      isLocked: false,
    };
    const newArr = [...sections, newSec];
    setSections(newArr);
    handleSaveDraft(newArr);
    setShowAddModal(false);
    toast.success(`Added ${label}`);
  };

  const handleImportStitch = async () => {
    if (!stitchDesignId.trim()) return;
    setImportingStitch(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`${BACKEND}/api/stitch/import/${stitchDesignId.trim()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      const newSec: Section = {
        ...data.section,
        id: `stitch_${Date.now()}`,
        label: `Stitch: ${stitchDesignId}`,
        isVisible: true,
        order: sections.length,
        isLocked: false,
      };
      
      const newArr = [...sections, newSec];
      setSections(newArr);
      handleSaveDraft(newArr);
      toast.success('Google Stitch design imported successfully!');
      setShowStitchModal(false);
      setStitchDesignId('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to import Stitch design');
    } finally {
      setImportingStitch(false);
    }
  };

  const handleSaveDraft = async (secsToSave = sections) => {
    setSaving(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      await fetch(`${BACKEND}/api/website-manager/draft/homepage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sections: secsToSave }),
      });
    } catch (e: any) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setSaving(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`${BACKEND}/api/website-manager/publish/homepage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sections,
          changelog: changelog || 'Updated homepage layout and sections',
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setShowPublishModal(false);
      setChangelog('');
      toast.success('🚀 Published live to production website & apps!');
    } catch (e: any) {
      toast.error(e.message || 'Failed to publish');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = async () => {
    if (!confirm('Are you sure you want to discard all unpublished draft changes?')) return;
    try {
      const token = await auth.currentUser?.getIdToken();
      await fetch(`${BACKEND}/api/website-manager/draft/homepage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sections: homepage?.sections || [] }),
      });
      toast.success('Draft reset to published layout');
    } catch (e: any) {
      toast.error('Failed to reset draft');
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Homepage Visual Canvas
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold">
              Live SDUI Engine
            </span>
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Drag to reorder sections. Changes save to draft in real-time. Publish when ready.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-slate-400 text-sm mt-1">Visually design and publish your Olive Pizza app layouts.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-950 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setBuilderMode('beginner')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${builderMode === 'beginner' ? 'bg-primary-500 text-white' : 'text-slate-400 hover:text-slate-300'}`}
            >
              Visual Mode
            </button>
            <button
              onClick={() => setBuilderMode('advanced')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${builderMode === 'advanced' ? 'bg-primary-500 text-white' : 'text-slate-400 hover:text-slate-300'}`}
            >
              Developer Mode
            </button>
          </div>
          
          <button
            onClick={() => handleSaveDraft()}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold flex items-center gap-2 border border-white/10 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Draft
          </button>
          <button
            onClick={() => setShowPublishModal(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary-600 to-amber-500 hover:from-primary-500 hover:to-amber-400 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-primary-500/20 transition-all"
          >
            <Rocket className="w-4 h-4" />
            Publish Live
          </button>
        </div>
      </div>

      {/* AI Assistant Section */}
      <OwnerAIPanel onDiffApplied={() => toast.success('Draft refreshed!')} />

      {/* Canvas Layout: Left Drag List, Right Live Device Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Sortable Sections List */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-bold text-sm">Sections on Page ({sections.length})</h3>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3 py-1.5 rounded-lg bg-primary-500/20 hover:bg-primary-500/30 text-primary-400 text-xs font-semibold flex items-center gap-1 transition-colors border border-primary-500/30"
            >
              <Plus className="w-4 h-4" />
              Add Section
            </button>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {sections.map((section) => (
                  <SortableItem
                    key={section.id}
                    section={section}
                    onToggleVisibility={handleToggleVisibility}
                    onOpenSettings={(s) => setActiveSectionEdit(s)}
                    onDelete={handleDeleteSection}
                    onDuplicate={handleDuplicateSection}
                    builderMode={builderMode}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* Right Column: Live Device Preview */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-xl flex flex-col items-center">
          <div className="w-full flex items-center justify-between pb-4 mb-4 border-b border-white/10">
            <span className="text-white font-bold text-xs">Live Device Viewport</span>
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-white/10">
              <button
                onClick={() => setPreviewDevice('mobile')}
                className={`p-1.5 rounded ${previewDevice === 'mobile' ? 'bg-primary-500 text-white' : 'text-slate-400'}`}
                title="Mobile (390px)"
              >
                <Smartphone className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPreviewDevice('tablet')}
                className={`p-1.5 rounded ${previewDevice === 'tablet' ? 'bg-primary-500 text-white' : 'text-slate-400'}`}
                title="Tablet (768px)"
              >
                <Tablet className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPreviewDevice('desktop')}
                className={`p-1.5 rounded ${previewDevice === 'desktop' ? 'bg-primary-500 text-white' : 'text-slate-400'}`}
                title="Desktop"
              >
                <Monitor className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div
            className={`transition-all duration-300 rounded-2xl overflow-hidden border border-white/20 bg-slate-950 shadow-2xl flex flex-col ${
              previewDevice === 'mobile'
                ? 'w-[320px] h-[580px]'
                : previewDevice === 'tablet'
                ? 'w-[420px] h-[580px]'
                : 'w-full h-[580px]'
            }`}
          >
            <div className="bg-slate-900 px-3 py-2 flex items-center justify-between border-b border-white/10 text-[10px] text-slate-400">
              <span>olivepizza.in</span>
              <a href="/" target="_blank" rel="noreferrer" className="hover:text-white">
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <iframe
              src="/"
              title="SDUI Live Preview"
              className="w-full flex-1 border-none bg-slate-950"
            />
          </div>
        </div>
      </div>

      {/* Add Section Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-slate-900 border border-white/10 space-y-4">
            <h3 className="text-white font-bold text-base">Add Section to Homepage</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
              {SECTION_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.type}
                  onClick={() => handleAddSection(tmpl.type, tmpl.label)}
                  className="p-4 rounded-xl bg-white/5 hover:bg-primary-500/10 border border-white/10 hover:border-primary-500/40 text-left transition-all"
                >
                  <div className="text-2xl mb-1">{tmpl.icon}</div>
                  <p className="text-white font-semibold text-xs">{tmpl.label}</p>
                  <p className="text-white font-semibold text-xs">{tmpl.label}</p>
                </button>
              ))}
            </div>
            <div className="flex justify-end pt-4 border-t border-white/10">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white font-semibold text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stitch Import Modal */}
      {showStitchModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-white/10 space-y-4">
            <h3 className="text-white font-bold text-base flex items-center gap-2">
              <span className="text-xl">🎨</span> Import Google Stitch Design
            </h3>
            <p className="text-sm text-slate-400">
              Enter the unique ID of the Google Stitch design you wish to convert into a live SDUI section.
            </p>
            <div>
              <input
                type="text"
                placeholder="e.g. stitch-uuid-1234"
                value={stitchDesignId}
                onChange={(e) => setStitchDesignId(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-primary-500 transition-colors"
              />
            </div>
            <div className="flex justify-end pt-4 gap-3">
              <button
                onClick={() => setShowStitchModal(false)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white font-semibold text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImportStitch}
                disabled={importingStitch || !stitchDesignId.trim()}
                className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {importingStitch ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Import Design
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Section Settings Modal */}
      {activeSectionEdit && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-white/10 space-y-4">
            <h3 className="text-white font-bold text-base">Edit: {activeSectionEdit.label}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 font-medium">Display Title</label>
                <input
                  type="text"
                  value={activeSectionEdit.config?.title || ''}
                  onChange={(e) =>
                    setActiveSectionEdit({
                      ...activeSectionEdit,
                      config: { ...activeSectionEdit.config, title: e.target.value },
                    })
                  }
                  placeholder="e.g. Chef's Secret Recommendations"
                  className="w-full mt-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-medium">Subtitle / Description</label>
                <input
                  type="text"
                  value={activeSectionEdit.config?.subtitle || ''}
                  onChange={(e) =>
                    setActiveSectionEdit({
                      ...activeSectionEdit,
                      config: { ...activeSectionEdit.config, subtitle: e.target.value },
                    })
                  }
                  placeholder="e.g. Freshly curated gourmet pizzas"
                  className="w-full mt-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setActiveSectionEdit(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const newArr = sections.map((s) =>
                    s.id === activeSectionEdit.id ? activeSectionEdit : s
                  );
                  setSections(newArr);
                  handleSaveDraft(newArr);
                  setActiveSectionEdit(null);
                  toast.success('Section settings saved');
                }}
                className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Publish Snapshot Modal */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-white/10 space-y-4">
            <h3 className="text-white font-bold text-base flex items-center gap-2">
              <Rocket className="w-5 h-5 text-primary-400" />
              Publish Homepage Live
            </h3>
            <p className="text-slate-400 text-xs">
              This will update the live website and mobile app layout for all customers in real-time.
            </p>
            <div>
              <label className="text-xs text-slate-400 font-medium">Changelog / Release Notes</label>
              <textarea
                value={changelog}
                onChange={(e) => setChangelog(e.target.value)}
                placeholder="e.g. Reordered best sellers above offers for weekend festival"
                rows={3}
                className="w-full mt-1 bg-slate-950 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-primary-500 resize-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowPublishModal(false)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handlePublish}
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary-600 to-amber-500 text-white text-xs font-bold shadow-lg shadow-primary-500/20"
              >
                {saving ? 'Publishing...' : 'Confirm & Publish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default HomepageBuilder;
