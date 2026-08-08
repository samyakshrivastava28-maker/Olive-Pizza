import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SDUISection, SectionVariant } from '../../../../types/sdui.types';
import { COMPONENT_LIBRARY, CATEGORY_META, ALL_CATEGORIES, getVariantsByCategory } from '../../../../data/componentLibrary';
import { X, Search, Plus, Star, Sparkles } from 'lucide-react';

import { getOwnerCustomSections, deleteOwnerCustomSection } from '../../../../utils/ownerCustomSections';
import { Trash2 } from 'lucide-react';

interface Props {
  onClose: () => void;
  onAddSection: (section: SDUISection) => void;
  existingSectionIds: string[];
}

export const ComponentLibraryModal: React.FC<Props> = ({ onClose, onAddSection }) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [ownerCustomSections, setOwnerCustomSections] = useState<SectionVariant[]>(() => getOwnerCustomSections());

  const allVariants = useMemo(() => {
    return [...ownerCustomSections.map(s => ({ ...s, isOwnerCustom: true })), ...COMPONENT_LIBRARY];
  }, [ownerCustomSections]);

  const filteredVariants = useMemo(() => {
    let list = allVariants;
    if (selectedCategory === 'owner_custom') {
      list = allVariants.filter(v => (v as any).isOwnerCustom);
    } else if (selectedCategory !== 'all') {
      list = list.filter(v => v.category === selectedCategory && !(v as any).isOwnerCustom);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(v =>
        v.name.toLowerCase().includes(q) ||
        v.description.toLowerCase().includes(q) ||
        v.category.includes(q)
      );
    }
    return list;
  }, [allVariants, search, selectedCategory]);

  const handleAdd = (variant: SectionVariant) => {
    const section: SDUISection = {
      id: `${variant.type}_${Date.now()}`,
      type: variant.type,
      label: variant.name,
      isVisible: true,
      order: 999,
      config: { ...variant.defaultConfig },
      style: variant.defaultStyle ? { ...variant.defaultStyle } as any : undefined,
      variantId: variant.id,
      studioMeta: { addedAt: new Date().toISOString() },
    };
    onAddSection(section);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm pt-16 px-4 pb-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="w-full max-w-5xl max-h-[85vh] bg-[#0d0e12] border border-white/[0.08] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] flex-shrink-0">
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary-400" /> Component Library
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">{COMPONENT_LIBRARY.length}+ premium sections — click to add</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-500 hover:text-white hover:bg-white/5 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left category nav */}
          <div className="w-48 flex-shrink-0 border-r border-white/[0.06] overflow-y-auto custom-scrollbar py-3">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`w-full text-left px-4 py-2 text-xs font-bold transition-all ${selectedCategory === 'all' ? 'text-primary-400 bg-primary-500/10' : 'text-slate-400 hover:text-white'}`}
            >
              ✨ All Sections ({allVariants.length})
            </button>
            <button
              onClick={() => setSelectedCategory('owner_custom')}
              className={`w-full text-left px-4 py-2 text-xs font-bold transition-all flex items-center gap-2 ${selectedCategory === 'owner_custom' ? 'text-amber-400 bg-amber-500/10 border-r-2 border-amber-400' : 'text-amber-400/80 hover:text-amber-300'}`}
            >
              <span>👑</span> Created by Owner ({ownerCustomSections.length})
            </button>
            {ALL_CATEGORIES.map(cat => {
              const meta = CATEGORY_META[cat];
              const count = getVariantsByCategory(cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`w-full text-left px-4 py-2 text-xs font-semibold transition-all flex items-center gap-2 ${
                    selectedCategory === cat
                      ? 'text-white bg-white/[0.06] border-r-2 border-primary-500'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
                  }`}
                >
                  <span>{meta.emoji}</span>
                  <span className="flex-1 truncate">{meta.label}</span>
                  <span className="text-[10px] text-slate-600">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Right content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search */}
            <div className="px-4 py-3 border-b border-white/[0.04] flex-shrink-0">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                <Search className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search sections..."
                  autoFocus
                  className="bg-transparent text-sm text-slate-300 placeholder-slate-600 outline-none flex-1"
                />
              </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
              {filteredVariants.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-slate-500">
                  <Search className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-sm">No sections found for "{search}"</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {filteredVariants.map(variant => {
                    const isOwnerCustom = (variant as any).isOwnerCustom;
                    return (
                      <motion.div
                        key={variant.id}
                        whileHover={{ scale: 1.02, y: -2 }}
                        onClick={() => handleAdd(variant)}
                        className={`relative flex flex-col gap-2 p-4 rounded-2xl border transition-all cursor-pointer text-left group ${
                          isOwnerCustom
                            ? 'bg-amber-500/5 border-amber-500/30 hover:border-amber-400'
                            : 'bg-white/[0.03] border-white/[0.06] hover:border-primary-500/40 hover:bg-primary-500/5'
                        }`}
                      >
                        {isOwnerCustom ? (
                          <div className="flex items-center justify-between w-full">
                            <span className="text-[9px] font-black uppercase text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                              Created by Owner
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const updated = deleteOwnerCustomSection(variant.id);
                                setOwnerCustomSections(updated);
                              }}
                              className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                              title="Delete custom section"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : variant.premium ? (
                          <div className="absolute top-2 right-2">
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                          </div>
                        ) : null}

                        <span className="text-3xl leading-none">{variant.emoji}</span>
                        <div>
                          <p className="text-xs font-black text-white leading-tight">{variant.name}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed line-clamp-2">{variant.description}</p>
                        </div>
                        <div className="mt-auto pt-2">
                          <div className="flex items-center gap-1 text-[10px] font-bold text-primary-400 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Plus className="w-3 h-3" /> Add to Canvas
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
