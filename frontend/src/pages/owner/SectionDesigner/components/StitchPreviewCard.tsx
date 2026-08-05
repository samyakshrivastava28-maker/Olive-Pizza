import React from 'react';
import { motion } from 'framer-motion';
import { Palette, Check } from 'lucide-react';

interface StitchPreviewCardProps {
  design: {
    id: string;
    name: string;
    thumbnailUrl?: string;
    description?: string;
    category?: string;
  };
  isSelected?: boolean;
  message?: string;
}

export const StitchPreviewCard: React.FC<StitchPreviewCardProps> = ({ design, isSelected, message }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border overflow-hidden ${
        isSelected ? 'border-green-500/50 bg-green-500/5' : 'border-white/10 bg-white/[0.03]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Palette className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-xs font-semibold text-white/80">Google Stitch — Layout Selected</span>
        </div>
        {isSelected && (
          <div className="flex items-center gap-1 text-xs text-green-400 font-medium">
            <Check className="w-3.5 h-3.5" /> Using this layout
          </div>
        )}
      </div>

      {/* Thumbnail */}
      {design.thumbnailUrl ? (
        <img
          src={design.thumbnailUrl}
          alt={design.name}
          className="w-full h-36 object-cover border-b border-white/5"
        />
      ) : (
        <div className="h-28 bg-gradient-to-br from-purple-900/20 to-slate-900/20 flex items-center justify-center border-b border-white/5">
          <div className="text-center opacity-50">
            <Palette className="w-8 h-8 text-purple-400 mx-auto mb-1" />
            <p className="text-xs text-white/40">Layout wireframe</p>
          </div>
        </div>
      )}

      {/* Details */}
      <div className="px-3 py-2 space-y-1">
        <p className="text-sm font-semibold text-white">{design.name}</p>
        {design.category && (
          <span className="inline-block text-xs text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-full">
            {design.category}
          </span>
        )}
        {(message || design.description) && (
          <p className="text-xs text-white/50 leading-relaxed">{message || design.description}</p>
        )}
      </div>
    </motion.div>
  );
};
