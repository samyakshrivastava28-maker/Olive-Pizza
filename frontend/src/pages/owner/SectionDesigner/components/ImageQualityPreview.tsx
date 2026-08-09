// frontend/src/pages/owner/SectionDesigner/components/ImageQualityPreview.tsx
// Visual grid showing each image generation job with quality score, status, and fallback notice.

import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader2, Image, AlertTriangle } from 'lucide-react';
import type { ImageJobDisplay } from '../../../../stores/sectionDesignerStore';

interface Props {
  jobs: ImageJobDisplay[];
}

function QualityBar({ score }: { score: number }) {
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f97316' : '#ef4444';
  return (
    <div className="sd-quality-bar-wrap">
      <div className="sd-quality-bar" style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3 }}>
        <motion.div
          className="sd-quality-bar-fill"
          style={{ height: '100%', background: color, borderRadius: 3 }}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      <span className="sd-quality-score" style={{ color }}>{score}/100</span>
    </div>
  );
}

const STATUS_ICON = {
  generating: <Loader2 size={14} className="sd-spinner" />,
  analyzing: <Loader2 size={14} className="sd-spinner" />,
  approved: <CheckCircle size={14} style={{ color: '#22c55e' }} />,
  rejected: <XCircle size={14} style={{ color: '#ef4444' }} />,
  uploading: <Loader2 size={14} className="sd-spinner" />,
  done: <CheckCircle size={14} style={{ color: '#22c55e' }} />,
  failed: <AlertTriangle size={14} style={{ color: '#f97316' }} />,
};

const MODEL_LABELS: Record<string, string> = {
  'qwen-image': '① Qwen Image',
  'flux': '② FLUX.1',
  'sd3-large': '③ SD3 Large',
};

export function ImageQualityPreview({ jobs }: Props) {
  return (
    <div className="sd-image-grid">
      {jobs.map((job) => (
        <motion.div
          key={job.id}
          className="sd-image-card"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          {/* Header */}
          <div className="sd-image-card-header">
            <span className="sd-image-purpose">{job.purpose}</span>
            <div className="sd-image-status-row">
              {STATUS_ICON[job.status as keyof typeof STATUS_ICON] ?? null}
              <span className="sd-image-model">{MODEL_LABELS[job.model] ?? job.model}</span>
            </div>
          </div>

          {/* Image preview / fallback */}
          {job.generatedUrl && !job.usedCSSGradientFallback && (
            <img
              src={job.generatedUrl}
              alt={`Generated: ${job.purpose}`}
              className="sd-image-thumb"
            />
          )}

          {job.usedCSSGradientFallback && (
            <div
              className="sd-image-gradient-fallback"
              style={{ background: job.cloudinaryUrl }}
            >
              <AlertTriangle size={20} style={{ color: '#f97316' }} />
              <p>Using CSS gradient fallback</p>
              <p className="sd-gradient-note">All 3 image models failed quality threshold</p>
            </div>
          )}

          {!job.generatedUrl && !job.usedCSSGradientFallback && (
            <div className="sd-image-placeholder">
              <Image size={24} style={{ opacity: 0.4 }} />
              <span>{job.status === 'generating' ? 'Generating...' : 'Waiting...'}</span>
            </div>
          )}

          {/* Quality score */}
          {job.qualityScore !== undefined && (
            <div className="sd-image-quality">
              <QualityBar score={job.qualityScore} />
            </div>
          )}

          {/* Rejection reason */}
          {job.rejectionReason && (
            <p className="sd-image-rejection">{job.rejectionReason}</p>
          )}

          {/* Cloudinary done */}
          {job.status === 'done' && job.cloudinaryUrl && !job.usedCSSGradientFallback && (
            <p className="sd-image-cloudinary">✅ Uploaded to Cloudinary</p>
          )}
        </motion.div>
      ))}
    </div>
  );
}
