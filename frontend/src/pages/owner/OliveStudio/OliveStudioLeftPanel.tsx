import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SDUISection } from '../../../types/sdui.types';
import {
  Layers, Plus, Eye, EyeOff, Trash2, Copy, GripVertical,
  Search, LayoutTemplate, Image, Lock, Unlock, ChevronRight,
} from 'lucide-react';
import { CATEGORY_META } from '../../../data/componentLibrary';

interface Props {
  sections: SDUISection[];
  selectedSectionId: string | null;
  onSelectSection: (id: string | null) => void;
  onOpenLibrary: () => void;
  onReorderSections: (sections: SDUISection[]) => void;
  onToggleVisibility: (id: string) => void;
  onDeleteSection: (id: string) => void;
  onDuplicateSection: (id: string) => void;
}

// ─── Section type → emoji map ─────────────────────────────────────────────────
const TYPE_EMOJI: Record<string, string> = {
  hero: '🌟', categories: '🍕', coupons: '🎟️', ads: '📢', gallery: '🖼️',
  testimonials: '⭐', video: '🎬', faq: '❓', best_sellers: '🔥', trending: '⚡',
  recommendations: '🤖', download_app: '📱', timeline: '⏳', stats: '📊',
  blogs: '📰', contact: '📞', maps: '🗺️', instagram: '📸',
  custom_html: '💻', custom_react: '⚛️', blank: '⬛',
};

// ─── Sortable Layer Item ──────────────────────────────────────────────────────
const LayerItem: React.FC<{
  section: SDUISection;
  isSelected: boolean;
  onSelect: () => void;
  onToggleVisibility: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}> = ({ section, isSelected, onSelect, onToggleVisibility, onDelete, onDuplicate }) => {
  const [hovered, setHovered] = useState(false);
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={false}
      animate={{ backgroundColor: isSelected ? 'rgba(249,115,22,0.1)' : 'transparent' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`group relative flex items-center gap-2 px-2 py-2 rounded-xl cursor-pointer transition-colors border ${
        isSelected
          ? 'border-primary-500/40 bg-primary-500/10'
          : 'border-transparent hover:border-white/[0.08] hover:bg-white/[0.03]'
      }`}
      onClick={onSelect}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="flex-shrink-0 p-0.5 text-slate-600 hover:text-slate-400 cursor-grab active:cursor-grabbing"
        onClick={e => e.stopPropagation()}
      >
        <GripVertical className="w-3.5 h-3.5" />
      </button>

      {/* Emoji */}
      <span className="text-base leading-none flex-shrink-0">
        {TYPE_EMOJI[section.type] || '📦'}
      </span>

      {/* Label */}
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-semibold truncate ${isSelected ? 'text-primary-300' : 'text-slate-300'}`}>
          {section.label}
        </p>
        {!section.isVisible && (
          <p className="text-[9px] text-slate-600 font-bold uppercase tracking-wide">Hidden</p>
        )}
      </div>

      {/* Actions (visible on hover/selected) */}
      <AnimatePresence>
        {(hovered || isSelected) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-0.5 flex-shrink-0"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={onToggleVisibility}
              className="p-1 rounded text-slate-500 hover:text-slate-200 transition-colors"
              title={section.isVisible ? 'Hide' : 'Show'}
            >
              {section.isVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            </button>
            <button
              onClick={onDuplicate}
              className="p-1 rounded text-slate-500 hover:text-blue-400 transition-colors"
              title="Duplicate"
            >
              <Copy className="w-3 h-3" />
            </button>
            {!section.isLocked && (
              <button
                onClick={onDelete}
                className="p-1 rounded text-slate-500 hover:text-red-400 transition-colors"
                title="Delete"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
            {section.isLocked && (
              <Lock className="w-3 h-3 text-slate-600 ml-0.5" />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─── Main Left Panel ──────────────────────────────────────────────────────────
type PanelTab = 'layers' | 'pages';

export const OliveStudioLeftPanel: React.FC<Props> = ({
  sections, selectedSectionId, onSelectSection, onOpenLibrary,
  onReorderSections, onToggleVisibility, onDeleteSection, onDuplicateSection,
}) => {
  const [tab, setTab] = useState<PanelTab>('layers');
  const [search, setSearch] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = sections.findIndex(s => s.id === active.id);
    const newIdx = sections.findIndex(s => s.id === over.id);
    onReorderSections(arrayMove(sections, oldIdx, newIdx));
  };

  const filteredSections = search
    ? sections.filter(s => s.label.toLowerCase().includes(search.toLowerCase()) || s.type.includes(search.toLowerCase()))
    : sections;

  return (
    <aside className="w-[280px] h-full flex flex-col bg-[#09090d] border-r border-white/[0.06] overflow-hidden">

      {/* Tab header */}
      <div className="flex items-center gap-1 px-3 pt-3 pb-2 border-b border-white/[0.06]">
        <button
          onClick={() => setTab('layers')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
            tab === 'layers' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" /> Layers
        </button>
        <button
          onClick={() => setTab('pages')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
            tab === 'pages' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white'
          }`}
        >
          <LayoutTemplate className="w-3.5 h-3.5" /> Pages
        </button>

        {/* Add button */}
        <button
          onClick={onOpenLibrary}
          className="ml-auto p-1.5 rounded-xl bg-primary-500/20 border border-primary-500/30 text-primary-400 hover:bg-primary-500/30 transition-all"
          title="Add Section"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Search */}
      {tab === 'layers' && (
        <div className="px-3 py-2 border-b border-white/[0.04]">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
            <Search className="w-3 h-3 text-slate-500 flex-shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search sections..."
              className="bg-transparent text-[11px] text-slate-300 placeholder-slate-600 outline-none flex-1 min-w-0"
            />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-0.5">
        {tab === 'layers' && (
          <>
            {filteredSections.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                  <Layers className="w-5 h-5 text-slate-600" />
                </div>
                <p className="text-xs text-slate-500">No sections yet.</p>
                <button
                  onClick={onOpenLibrary}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-500/20 border border-primary-500/30 text-primary-400 text-xs font-bold hover:bg-primary-500/30 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> Add First Section
                </button>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={filteredSections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                  {filteredSections.map(section => (
                    <LayerItem
                      key={section.id}
                      section={section}
                      isSelected={selectedSectionId === section.id}
                      onSelect={() => onSelectSection(section.id)}
                      onToggleVisibility={() => onToggleVisibility(section.id)}
                      onDelete={() => onDeleteSection(section.id)}
                      onDuplicate={() => onDuplicateSection(section.id)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}

            {/* Add Section CTA at bottom */}
            {filteredSections.length > 0 && (
              <button
                onClick={onOpenLibrary}
                className="w-full mt-2 py-2.5 rounded-xl border border-dashed border-white/10 text-slate-600 hover:text-slate-300 hover:border-white/20 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> Add Section
              </button>
            )}
          </>
        )}

        {tab === 'pages' && (
          <div className="space-y-1">
            {[
              { label: 'Homepage', emoji: '🏠', active: true },
              { label: 'Menu Page', emoji: '🍕', active: false },
              { label: 'Offers Page', emoji: '🎟️', active: false },
            ].map((page) => (
              <div
                key={page.label}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all border ${
                  page.active
                    ? 'bg-primary-500/10 border-primary-500/30 text-white'
                    : 'border-transparent text-slate-400 hover:bg-white/[0.03] hover:border-white/[0.06]'
                }`}
              >
                <span className="text-base">{page.emoji}</span>
                <span className="text-xs font-semibold flex-1">{page.label}</span>
                {page.active && (
                  <span className="text-[9px] font-black text-primary-400 bg-primary-500/20 px-2 py-0.5 rounded-full">EDITING</span>
                )}
                {!page.active && (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer stats */}
      <div className="px-3 py-2 border-t border-white/[0.06] flex items-center justify-between">
        <span className="text-[10px] text-slate-600">
          {sections.filter(s => s.isVisible).length}/{sections.length} visible
        </span>
        <span className="text-[10px] text-slate-600">
          {sections.filter(s => s.isLocked).length} locked
        </span>
      </div>
    </aside>
  );
};
