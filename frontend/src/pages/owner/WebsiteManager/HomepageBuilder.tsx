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
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useWebsiteConfigStore, Section } from '../../../stores/websiteConfigStore';
import { auth } from '../../../lib/firebase';
import OwnerAIPanel from './OwnerAIPanel';

const BACKEND = import.meta.env.VITE_BACKEND_URL || '';

const SECTION_TEMPLATES = [
  { type: 'testimonials', label: 'Customer Reviews Carousel', icon: '⭐' },
  { type: 'faq', label: 'FAQ Accordion', icon: '❓' },
  { type: 'video', label: 'Brand Video Player', icon: '🎥' },
  { type: 'stats', label: 'Milestone Counters', icon: '📊' },
  { type: 'bestsellers', label: 'Best Sellers Showcase', icon: '🔥' },
  { type: 'trending', label: 'Trending Items', icon: '⚡' },
  { type: 'custom', label: 'Custom HTML Block', icon: '💻' },
];

function SortableItem({
  section,
  onToggleVisibility,
  onOpenSettings,
  onDelete,
  onDuplicate,
}: {
  section: Section;
  onToggleVisibility: (id: string) => void;
  onOpenSettings: (s: Section) => void;
  onDelete: (id: string) => void;
  onDuplicate: (s: Section) => void;
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
      className={`p-4 rounded-xl border flex items-center justify-between gap-3 transition-all ${
        section.isLocked
          ? 'bg-slate-900/40 border-amber-500/20'
          : section.isVisible
          ? 'bg-slate-900/80 border-white/10 hover:border-primary-500/40'
          : 'bg-slate-950/50 border-white/5 opacity-60'
      }`}
    >
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
          <button
            onClick={handleDiscard}
            className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold flex items-center gap-1.5 border border-white/10 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Discard
          </button>
          <button
            onClick={() => handleSaveDraft()}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1.5 border border-white/10 transition-colors"
          >
            <Save className="w-4 h-4" />
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
                  <p className="text-slate-500 text-[10px] mt-0.5">Template component</p>
                </button>
              ))}
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold"
              >
                Cancel
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
