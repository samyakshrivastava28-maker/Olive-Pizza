import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  DragEndEvent, DragOverlay, DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SDUISection, AIGenerationVersion } from '../../../types/sdui.types';
import HomepageRenderer from '../../../components/sdui/HomepageRenderer';
import {
  Plus, GripVertical, Eye, EyeOff, Trash2, Copy,
  ChevronLeft, ChevronRight, Smartphone, Check, X, Wand2,
} from 'lucide-react';
import { DeviceMode } from './index';

interface Props {
  sections: SDUISection[];
  selectedSectionId: string | null;
  editingField: string | null;
  deviceMode: DeviceMode;
  onSelectSection: (id: string | null) => void;
  onReorderSections: (sections: SDUISection[]) => void;
  onUpdateSection: (s: SDUISection) => void;
  onDeleteSection: (id: string) => void;
  onDuplicateSection: (id: string) => void;
  onAddSection: () => void;
  isPreviewing: boolean;
  aiVersions: AIGenerationVersion[];
  previewVersionIdx: number | null;
  onPreviewVersion: (idx: number | null) => void;
  onApplyVersion: (idx: number) => void;
}

const DEVICE_STYLES: Record<DeviceMode, { width: string; label: string; frame: boolean }> = {
  mobile:  { width: '390px',  label: 'iPhone 15',      frame: true  },
  tablet:  { width: '768px',  label: 'iPad Pro',        frame: true  },
  laptop:  { width: '1024px', label: 'MacBook Air',     frame: false },
  desktop: { width: '100%',   label: 'Desktop',         frame: false },
};

// ─── Draggable Section Wrapper ─────────────────────────────────────────────────
const DraggableSection: React.FC<{
  section: SDUISection;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onToggleVisibility: () => void;
}> = ({ section, isSelected, onSelect, onDelete, onDuplicate, onToggleVisibility }) => {
  const [hovered, setHovered] = useState(false);
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const TYPE_EMOJI: Record<string, string> = {
    hero: '🌟', categories: '🍕', coupons: '🎟️', ads: '📢', gallery: '🖼️',
    testimonials: '⭐', video: '🎬', faq: '❓', best_sellers: '🔥', trending: '⚡',
    recommendations: '🤖', download_app: '📱', timeline: '⏳', stats: '📊',
    blogs: '📰', contact: '📞', maps: '🗺️', instagram: '📸',
    custom_html: '💻', custom_react: '⚛️', blank: '⬛',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group transition-all ${isDragging ? 'z-50 opacity-50' : 'z-0'}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={e => { e.stopPropagation(); onSelect(); }}
    >
      {/* Selection / hover border */}
      <div className={`absolute inset-0 pointer-events-none rounded-sm transition-all z-10 ${
        isSelected
          ? 'ring-2 ring-primary-500 ring-offset-0 shadow-lg shadow-primary-500/20'
          : hovered
            ? 'ring-1 ring-white/20'
            : 'ring-0'
      }`} />

      {/* Hidden section overlay */}
      {!section.isVisible && (
        <div className="absolute inset-0 bg-black/60 z-20 flex items-center justify-center pointer-events-none">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/80 border border-white/10">
            <EyeOff className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-400">Hidden — invisible to customers</span>
          </div>
        </div>
      )}

      {/* Floating toolbar (shown on hover or selected) */}
      <AnimatePresence>
        {(hovered || isSelected) && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute top-2 left-1/2 -translate-x-1/2 z-30 flex items-center gap-0.5 px-2 py-1 rounded-xl bg-[#09090d]/95 border border-white/10 shadow-xl backdrop-blur-sm"
            onClick={e => e.stopPropagation()}
          >
            {/* Drag handle */}
            <button
              {...attributes}
              {...listeners}
              className="p-1.5 text-slate-500 hover:text-white cursor-grab active:cursor-grabbing transition-colors"
              title="Drag to reorder"
            >
              <GripVertical className="w-3.5 h-3.5" />
            </button>

            <div className="w-px h-4 bg-white/10" />

            {/* Section info */}
            <span className="px-2 text-[10px] font-bold text-slate-400">
              {TYPE_EMOJI[section.type] || '📦'} {section.label}
            </span>

            <div className="w-px h-4 bg-white/10" />

            {/* Actions */}
            <button
              onClick={onToggleVisibility}
              className="p-1.5 text-slate-500 hover:text-white transition-colors"
              title={section.isVisible ? 'Hide' : 'Show'}
            >
              {section.isVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            </button>
            <button
              onClick={onDuplicate}
              className="p-1.5 text-slate-500 hover:text-blue-400 transition-colors"
              title="Duplicate section"
            >
              <Copy className="w-3 h-3" />
            </button>
            {!section.isLocked && (
              <button
                onClick={onDelete}
                className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                title="Delete section (Del)"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Section content rendered via existing HomepageRenderer logic */}
      <div className={`transition-opacity ${!section.isVisible ? 'opacity-30' : 'opacity-100'}`}>
        <HomepageRenderer overrideSections={[section]} />
      </div>
    </div>
  );
};

// ─── AI Version Switcher Bar ──────────────────────────────────────────────────
const AIVersionBar: React.FC<{
  versions: AIGenerationVersion[];
  activeIdx: number | null;
  onPreview: (idx: number | null) => void;
  onApply: (idx: number) => void;
}> = ({ versions, activeIdx, onPreview, onApply }) => {
  if (versions.length === 0) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#0d0e12]/95 border border-white/10 shadow-2xl backdrop-blur-md"
    >
      <Wand2 className="w-4 h-4 text-violet-400 flex-shrink-0" />
      <span className="text-[11px] font-black text-violet-300 mr-1">AI Versions</span>

      {versions.slice(0, 4).map((v, i) => (
        <button
          key={v.id}
          onClick={() => onPreview(activeIdx === i ? null : i)}
          className={`px-3 py-1 rounded-xl text-[11px] font-bold border transition-all ${
            activeIdx === i
              ? 'bg-violet-500/30 border-violet-500/50 text-violet-200'
              : 'border-white/10 text-slate-400 hover:text-white hover:border-white/20'
          }`}
        >
          {String.fromCharCode(65 + i)}
        </button>
      ))}

      {activeIdx !== null && (
        <>
          <div className="w-px h-4 bg-white/10" />
          <button
            onClick={() => onApply(activeIdx)}
            className="flex items-center gap-1 px-3 py-1 rounded-xl bg-green-500/20 border border-green-500/30 text-green-300 text-[11px] font-bold hover:bg-green-500/30 transition-all"
          >
            <Check className="w-3 h-3" /> Apply
          </button>
          <button
            onClick={() => onPreview(null)}
            className="flex items-center gap-1 px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-[11px] font-bold hover:text-white transition-all"
          >
            <X className="w-3 h-3" /> Discard
          </button>
        </>
      )}
    </motion.div>
  );
};

// ─── Main Canvas ──────────────────────────────────────────────────────────────
export const OliveStudioCanvas: React.FC<Props> = ({
  sections, selectedSectionId, editingField, deviceMode,
  onSelectSection, onReorderSections, onUpdateSection,
  onDeleteSection, onDuplicateSection, onAddSection,
  isPreviewing, aiVersions, previewVersionIdx, onPreviewVersion, onApplyVersion,
}) => {
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = sections.findIndex(s => s.id === active.id);
    const newIdx = sections.findIndex(s => s.id === over.id);
    onReorderSections(arrayMove(sections, oldIdx, newIdx));
  };

  const { width: deviceWidth, frame } = DEVICE_STYLES[deviceMode];

  const activeSection = activeDragId ? sections.find(s => s.id === activeDragId) : null;

  return (
    <div
      className="h-full overflow-auto bg-[#06070a] relative flex flex-col items-center"
      onClick={() => onSelectSection(null)}
      style={{
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.025) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    >
      {/* Preview mode banner */}
      <AnimatePresence>
        {isPreviewing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="w-full flex items-center justify-center gap-2 py-2 bg-amber-500/10 border-b border-amber-500/20 flex-shrink-0"
          >
            <Wand2 className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="text-[11px] font-bold text-amber-300">
              Previewing AI Version {previewVersionIdx !== null ? String.fromCharCode(65 + previewVersionIdx) : ''} — Click "Apply" to use it
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Canvas centered container */}
      <div className="flex-1 w-full flex justify-center py-6 px-4">
        <motion.div
          key={deviceMode}
          initial={{ scale: 0.97, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="relative flex flex-col"
          style={{ width: deviceWidth, maxWidth: '100%' }}
        >
          {/* Device frame wrapper */}
          {frame ? (
            <div className="relative bg-[#06070a] rounded-[32px] border-4 border-slate-700/80 shadow-2xl shadow-black/60 overflow-hidden min-h-[600px]">
              {/* Phone notch for mobile */}
              {deviceMode === 'mobile' && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-slate-700/80 rounded-b-2xl z-10" />
              )}
              <div className={`overflow-y-auto ${deviceMode === 'mobile' ? 'pt-6' : ''}`} style={{ maxHeight: 'calc(100vh - 200px)' }}>
                <CanvasSectionList
                  sections={sections}
                  selectedSectionId={selectedSectionId}
                  onSelectSection={onSelectSection}
                  onDeleteSection={onDeleteSection}
                  onDuplicateSection={onDuplicateSection}
                  onUpdateSection={onUpdateSection}
                  onAddSection={onAddSection}
                  sensors={sensors}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                />
              </div>
            </div>
          ) : (
            <div className="bg-[#06070a] border border-white/[0.06] rounded-2xl shadow-xl overflow-hidden min-h-[600px]">
              <CanvasSectionList
                sections={sections}
                selectedSectionId={selectedSectionId}
                onSelectSection={onSelectSection}
                onDeleteSection={onDeleteSection}
                onDuplicateSection={onDuplicateSection}
                onUpdateSection={onUpdateSection}
                onAddSection={onAddSection}
                sensors={sensors}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              />
            </div>
          )}
        </motion.div>
      </div>

      {/* AI Version switcher bar */}
      <AIVersionBar
        versions={aiVersions}
        activeIdx={previewVersionIdx}
        onPreview={onPreviewVersion}
        onApply={onApplyVersion}
      />
    </div>
  );
};

// ─── Inner sortable list (extracted to avoid hooks-in-conditional issues) ──────
const CanvasSectionList: React.FC<{
  sections: SDUISection[];
  selectedSectionId: string | null;
  onSelectSection: (id: string | null) => void;
  onDeleteSection: (id: string) => void;
  onDuplicateSection: (id: string) => void;
  onUpdateSection: (s: SDUISection) => void;
  onAddSection: () => void;
  sensors: any;
  onDragStart: (e: DragStartEvent) => void;
  onDragEnd: (e: DragEndEvent) => void;
}> = ({
  sections, selectedSectionId, onSelectSection, onDeleteSection,
  onDuplicateSection, onUpdateSection, onAddSection, sensors, onDragStart, onDragEnd,
}) => {
  if (sections.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-24 gap-4 text-center px-6"
      >
        <div className="w-20 h-20 rounded-3xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center">
          <span className="text-4xl">🍕</span>
        </div>
        <div>
          <h3 className="text-base font-black text-white mb-1">Start Building Your Website</h3>
          <p className="text-xs text-slate-400 leading-relaxed max-w-[220px]">
            Add sections from the library or let AI generate your homepage.
          </p>
        </div>
        <button
          onClick={onAddSection}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-bold shadow-lg shadow-primary-500/25 transition-all"
        >
          <Plus className="w-4 h-4" /> Add First Section
        </button>
      </motion.div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
        <div className="relative">
          {sections.map(section => (
            <DraggableSection
              key={section.id}
              section={section}
              isSelected={selectedSectionId === section.id}
              onSelect={() => onSelectSection(section.id)}
              onDelete={() => onDeleteSection(section.id)}
              onDuplicate={() => onDuplicateSection(section.id)}
              onToggleVisibility={() => onUpdateSection({ ...section, isVisible: !section.isVisible })}
            />
          ))}
        </div>
      </SortableContext>

      {/* Add between sections indicator */}
      <div className="p-3">
        <button
          onClick={onAddSection}
          className="w-full py-3 rounded-2xl border-2 border-dashed border-white/[0.08] text-slate-600 hover:text-slate-400 hover:border-white/20 text-xs font-bold flex items-center justify-center gap-2 transition-all"
        >
          <Plus className="w-3.5 h-3.5" /> Add Section
        </button>
      </div>
    </DndContext>
  );
};
