import React from 'react';
import { motion } from 'framer-motion';
import { Image, CheckCircle, XCircle, Loader2, Upload, AlertTriangle } from 'lucide-react';

type ImageStatus = 'generating' | 'analyzing' | 'approved' | 'rejected' | 'uploading' | 'done';

interface ImageQualityPreviewProps {
  model: string;
  status: ImageStatus;
  score?: number;
  imageUrl?: string;
  cloudinaryUrl?: string;
  rejectionReason?: string;
  message?: string;
}

const statusConfig: Record<ImageStatus, { icon: React.ReactNode; color: string; label: string }> = {
  generating: { icon: <Loader2 className="w-4 h-4 animate-spin" />, color: 'text-blue-400', label: 'Generating...' },
  analyzing: { icon: <Loader2 className="w-4 h-4 animate-spin" />, color: 'text-yellow-400', label: 'Analyzing quality...' },
  approved: { icon: <CheckCircle className="w-4 h-4" />, color: 'text-green-400', label: 'Approved' },
  rejected: { icon: <XCircle className="w-4 h-4" />, color: 'text-red-400', label: 'Rejected — Regenerating' },
  uploading: { icon: <Upload className="w-4 h-4 animate-bounce" />, color: 'text-blue-400', label: 'Uploading to CDN...' },
  done: { icon: <CheckCircle className="w-4 h-4" />, color: 'text-green-400', label: 'Ready' },
};

export const ImageQualityPreview: React.FC<ImageQualityPreviewProps> = ({
  model, status, score, imageUrl, cloudinaryUrl, rejectionReason, message,
}) => {
  const cfg = statusConfig[status];
  const displayUrl = cloudinaryUrl || imageUrl;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Image className="w-3.5 h-3.5 text-orange-400" />
          <span className="text-xs font-semibold text-white/80">{model}</span>
        </div>
        <div className={`flex items-center gap-1 text-xs font-medium ${cfg.color}`}>
          {cfg.icon}
          {cfg.label}
          {score !== undefined && <span className="ml-1 text-white/40">({score}/100)</span>}
        </div>
      </div>

      {/* Image preview */}
      {displayUrl ? (
        <div className="relative">
          <img
            src={displayUrl}
            alt="AI generated"
            className="w-full h-40 object-cover"
          />
          {status === 'done' && (
            <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 bg-green-500/80 backdrop-blur-sm rounded-full text-white text-xs font-semibold">
              <CheckCircle className="w-3 h-3" /> CDN Ready
            </div>
          )}
        </div>
      ) : (
        <div className="h-32 flex items-center justify-center bg-white/[0.02]">
          <div className="text-center">
            <Loader2 className="w-6 h-6 animate-spin text-orange-400 mx-auto mb-2" />
            <p className="text-xs text-white/40">Generating image...</p>
          </div>
        </div>
      )}

      {/* Rejection reason */}
      {rejectionReason && status === 'rejected' && (
        <div className="flex items-start gap-2 px-3 py-2 bg-red-500/10">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
          <p className="text-xs text-red-300">{rejectionReason}</p>
        </div>
      )}
    </motion.div>
  );
};
