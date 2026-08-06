import React, { useState } from 'react';
import { useSDUIStore, DEFAULT_SECTIONS } from '../../../../stores/sduiStore';
import { SDUISection, SectionType } from '../../../../types/sdui.types';
import { Plus, MoveUp, MoveDown, Eye, EyeOff, Edit, Trash2, Copy, Send, Zap, Layers, Shield, Undo2, Redo2, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';

const ALL_SECTION_TYPES: Array<{ type: SectionType; label: string; desc: string; icon: string }> = [
  { type: 'categories', label: 'Menu Categories', desc: 'Category cards & quick filters', icon: '🍕' },
  { type: 'coupons', label: 'Coupons & Offers', desc: 'Promotional coupon cards', icon: '🎟️' },
  { type: 'ads', label: 'Advertisements', desc: 'Hero ad banners & video carousels', icon: '📢' },
  { type: 'hero', label: 'Hero Section', desc: 'Main headline and CTA banner', icon: '🌟' },
  { type: 'gallery', label: 'Photo Gallery', desc: 'Grid of food & kitchen photos', icon: '🖼️' },
  { type: 'testimonials', label: 'Testimonials', desc: 'Customer reviews carousel', icon: '⭐' },
  { type: 'video', label: 'Video Showcase', desc: 'YouTube or MP4 video banner', icon: '🎬' },
  { type: 'faq', label: 'FAQ Accordion', desc: 'Frequently asked questions', icon: '❓' },
  { type: 'best_sellers', label: 'Best Sellers', desc: 'Top ordered menu items', icon: '🔥' },
  { type: 'trending', label: 'Trending Items', desc: 'Hot trending dishes right now', icon: '⚡' },
  { type: 'recommendations', label: 'AI Recommendations', desc: 'Personalized customer picks', icon: '🤖' },
  { type: 'download_app', label: 'Download App', desc: 'Mobile app download CTA banner', icon: '📱' },
  { type: 'timeline', label: 'Timeline / Process', desc: 'Step-by-step how delivery works', icon: '⏳' },
  { type: 'stats', label: 'Statistics', desc: 'Key store metrics & counters', icon: '📊' },
  { type: 'blogs', label: 'Blogs & News', desc: 'Stories, recipes & updates', icon: '📰' },
  { type: 'contact', label: 'Contact Details', desc: 'Store phone, email & address', icon: '📞' },
  { type: 'maps', label: 'Location Maps', desc: 'Interactive store location map', icon: '🗺️' },
  { type: 'instagram', label: 'Instagram Feed', desc: 'Social media photo wall', icon: '📸' },
  { type: 'custom_html', label: 'Custom HTML', desc: 'Embed custom HTML/CSS code', icon: '💻' },
  { type: 'custom_react', label: 'Custom React', desc: 'Dynamic component wrapper', icon: '⚛️' },
  { type: 'blank', label: 'Blank Section', desc: 'Empty section placeholder', icon: '⬛' },
];

export const HomepageTab: React.FC = () => {
  const homepage = useSDUIStore((state) => state.draftHomepage || state.homepage);
  const saveDraft = useSDUIStore((state) => state.saveDraft);
  const publish = useSDUIStore((state) => state.publish);
  const hasDraft = useSDUIStore((state) => state.hasDraft);

  const [sections, setSections] = useState<SDUISection[]>(homepage?.sections || DEFAULT_SECTIONS);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<SDUISection | null>(null);
  const [autoPublish, setAutoPublish] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  React.useEffect(() => {
    if (homepage?.sections) {
      setSections(homepage.sections);
    }
  }, [homepage?.sections]);

  const updateAndSave = async (newSections: SDUISection[]) => {
    const ordered = newSections.map((s, idx) => ({ ...s, order: idx }));
    setSections(ordered);
    const nextConfig = { ...homepage, sections: ordered };
    await saveDraft(nextConfig);

    if (autoPublish) {
      await publish('Auto-published homepage section changes', 'Owner');
      toast.success('Changes published live to real website!');
    }
  };

  const handlePublishNow = async () => {
    setIsPublishing(true);
    try {
      await publish('Published homepage layout updates', 'Owner');
      toast.success('Website changes published live to real customer home page!');
    } catch (err: any) {
      toast.error(err?.message || 'Publish failed');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;
    const copy = [...sections];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;
    updateAndSave(copy);
    toast.success('Section order updated');
  };

  const handleToggleVisibility = (id: string) => {
    const updated = sections.map((s) => (s.id === id ? { ...s, isVisible: !s.isVisible } : s));
    updateAndSave(updated);
    toast.success('Visibility toggled');
  };

  const handleDelete = (id: string) => {
    const target = sections.find((s) => s.id === id);
    if (target?.isLocked) {
      toast.error('This section is locked and cannot be deleted');
      return;
    }
    const updated = sections.filter((s) => s.id !== id);
    updateAndSave(updated);
    toast.success('Section removed');
  };

  const handleDuplicate = (section: SDUISection) => {
    const newSec: SDUISection = {
      ...section,
      id: `${section.type}_${Date.now()}`,
      label: `${section.label} (Copy)`,
      isLocked: false,
    };
    const updated = [...sections, newSec];
    updateAndSave(updated);
    toast.success('Section duplicated');
  };

  const handleAddSection = (typeItem: (typeof ALL_SECTION_TYPES)[0]) => {
    const newSec: SDUISection = {
      id: `${typeItem.type}_${Date.now()}`,
      type: typeItem.type,
      label: typeItem.label,
      subtitle: typeItem.desc,
      isVisible: true,
      order: sections.length,
      responsive: { mobile: true, tablet: true, desktop: true },
      config: {},
    };
    updateAndSave([...sections, newSec]);
    setIsAddModalOpen(false);
    toast.success(`Added ${typeItem.label} section`);
  };

  const handleSaveEdit = (updatedSec: SDUISection) => {
    const updated = sections.map((s) => (s.id === updatedSec.id ? updatedSec : s));
    updateAndSave(updated);
    setEditingSection(null);
    toast.success('Section properties saved');
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary-400" /> Homepage Drag & Drop Builder
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Reorder, edit, hide, or schedule sections visually. Changes save to Drafts for live preview.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Auto-Publish Toggle */}
          <button
            onClick={() => setAutoPublish(!autoPublish)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
              autoPublish
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                : 'bg-slate-800 border-white/10 text-slate-400 hover:text-white'
            }`}
            title="When enabled, every section edit is instantly published live to the real website"
          >
            <Zap className={`w-3.5 h-3.5 ${autoPublish ? 'text-amber-400 animate-pulse' : ''}`} />
            Auto-Publish: {autoPublish ? 'ON' : 'OFF'}
          </button>

          {/* Add Section Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 font-bold text-xs text-white transition-all"
          >
            <Plus className="w-4 h-4" /> Add Section
          </button>

          {/* Direct Publish Live Button */}
          <button
            onClick={handlePublishNow}
            disabled={isPublishing}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-xs text-white shadow-lg transition-all ${
              hasDraft
                ? 'bg-green-500 hover:bg-green-600 shadow-green-500/20 animate-pulse'
                : 'bg-primary-500 hover:bg-primary-600 shadow-primary-500/20'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            {isPublishing ? 'Publishing...' : hasDraft ? '🚀 Publish Live Now' : 'Publish Live'}
          </button>
        </div>
      </div>

      {/* Sections List */}
      <div className="space-y-3">
        {sections.map((sec, idx) => (
          <div
            key={sec.id}
            className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              sec.isVisible
                ? 'bg-slate-900/80 border-white/10 shadow-lg'
                : 'bg-slate-950/40 border-white/5 opacity-60'
            }`}
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="flex flex-col gap-1 text-slate-400">
                <button
                  disabled={idx === 0}
                  onClick={() => handleMove(idx, 'up')}
                  className="p-1 hover:text-white disabled:opacity-20"
                >
                  <MoveUp className="w-4 h-4" />
                </button>
                <button
                  disabled={idx === sections.length - 1}
                  onClick={() => handleMove(idx, 'down')}
                  className="p-1 hover:text-white disabled:opacity-20"
                >
                  <MoveDown className="w-4 h-4" />
                </button>
              </div>

              <div className="w-10 h-10 rounded-xl bg-primary-500/10 border border-primary-500/30 flex items-center justify-center text-lg font-bold text-primary-400">
                {ALL_SECTION_TYPES.find((t) => t.type === sec.type)?.icon || '📌'}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-white text-base truncate">{sec.label}</h4>
                  {sec.isLocked && (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center gap-1">
                      <Shield className="w-3 h-3" /> Locked
                    </span>
                  )}
                  {!sec.isVisible && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                      Hidden
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 truncate mt-0.5">
                  Type: <span className="text-slate-300 font-mono">{sec.type}</span>
                  {sec.subtitle ? ` • ${sec.subtitle}` : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                onClick={() => handleToggleVisibility(sec.id)}
                className={`p-2 rounded-xl border transition-all ${
                  sec.isVisible
                    ? 'bg-slate-800 text-green-400 border-green-500/30'
                    : 'bg-slate-900 text-slate-500 border-white/5'
                }`}
                title={sec.isVisible ? 'Hide Section' : 'Show Section'}
              >
                {sec.isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>

              <button
                onClick={() => setEditingSection(sec)}
                className="p-2 rounded-xl bg-slate-800 border border-white/10 text-slate-300 hover:text-white hover:bg-slate-700 transition-all"
                title="Edit Section Settings"
              >
                <Edit className="w-4 h-4" />
              </button>

              <button
                onClick={() => handleDuplicate(sec)}
                className="p-2 rounded-xl bg-slate-800 border border-white/10 text-slate-300 hover:text-white hover:bg-slate-700 transition-all"
                title="Duplicate Section"
              >
                <Copy className="w-4 h-4" />
              </button>

              {!sec.isLocked && (
                <button
                  onClick={() => handleDelete(sec.id)}
                  className="p-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all"
                  title="Delete Section"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Section Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="w-full max-w-3xl max-h-[85vh] bg-slate-900 border border-white/10 rounded-3xl p-6 overflow-y-auto space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-xl font-black text-white">Choose Section to Add</h3>
                <p className="text-xs text-slate-400">Select from 21 interactive SDUI components</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {ALL_SECTION_TYPES.map((t) => (
                <button
                  key={t.type}
                  onClick={() => handleAddSection(t)}
                  className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-primary-500/50 hover:bg-primary-500/10 text-left transition-all group flex flex-col justify-between"
                >
                  <div>
                    <span className="text-2xl mb-2 block">{t.icon}</span>
                    <h5 className="font-bold text-white text-sm group-hover:text-primary-300">
                      {t.label}
                    </h5>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{t.desc}</p>
                  </div>
                  <span className="mt-3 text-[10px] font-bold text-primary-400 uppercase tracking-wider">
                    + Add Section
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Edit Section Modal */}
      {editingSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="w-full max-w-xl max-h-[85vh] bg-slate-900 border border-white/10 rounded-3xl p-6 overflow-y-auto space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-bold text-white">Edit Section: {editingSection.label}</h3>
              <button
                onClick={() => setEditingSection(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Section Label Title</label>
                <input
                  type="text"
                  value={editingSection.label}
                  onChange={(e) =>
                    setEditingSection({ ...editingSection, label: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-white font-semibold focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Subtitle</label>
                <input
                  type="text"
                  value={editingSection.subtitle || ''}
                  onChange={(e) =>
                    setEditingSection({ ...editingSection, subtitle: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-white font-semibold focus:outline-none focus:border-primary-500"
                />
              </div>

              {/* Responsive Toggles */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2">
                  Responsive Visibility
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['mobile', 'tablet', 'desktop'] as const).map((device) => {
                    const isChecked = editingSection.responsive?.[device] !== false;
                    return (
                      <button
                        key={device}
                        type="button"
                        onClick={() =>
                          setEditingSection({
                            ...editingSection,
                            responsive: {
                              mobile: editingSection.responsive?.mobile ?? true,
                              tablet: editingSection.responsive?.tablet ?? true,
                              desktop: editingSection.responsive?.desktop ?? true,
                              [device]: !isChecked,
                            },
                          })
                        }
                        className={`py-2 px-3 rounded-xl border text-xs font-bold capitalize transition-all ${
                          isChecked
                            ? 'bg-primary-500/20 border-primary-500 text-primary-300'
                            : 'bg-slate-800 border-white/5 text-slate-500'
                        }`}
                      >
                        {device}: {isChecked ? 'Visible' : 'Hidden'}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Background Style */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Background Type</label>
                <select
                  value={editingSection.style?.bgType || 'none'}
                  onChange={(e) =>
                    setEditingSection({
                      ...editingSection,
                      style: { ...editingSection.style, bgType: e.target.value as any },
                    })
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-white font-semibold"
                >
                  <option value="none">None (Transparent)</option>
                  <option value="color">Solid Color</option>
                  <option value="gradient">Gradient</option>
                  <option value="glass">Glassmorphism</option>
                </select>
              </div>

              {editingSection.style?.bgType === 'color' && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Background Color</label>
                  <input
                    type="color"
                    value={editingSection.style?.bgColor || '#0f172a'}
                    onChange={(e) =>
                      setEditingSection({
                        ...editingSection,
                        style: { ...editingSection.style, bgColor: e.target.value },
                      })
                    }
                    className="w-full h-10 rounded-xl bg-slate-800 border border-white/10 cursor-pointer"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-white/10 pt-4">
              <button
                onClick={() => setEditingSection(null)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white font-bold text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveEdit(editingSection)}
                className="px-5 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 font-bold text-sm text-white shadow-lg shadow-primary-500/20"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default HomepageTab;
