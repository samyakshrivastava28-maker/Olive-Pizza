// frontend/src/pages/owner/SectionDesigner/LivePreviewTab.tsx
// Shows the generated SDUI section JSON rendered inside a responsive device frame.
// Also provides Save Draft and Publish controls with 5-step validation notice.

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye, Save, Upload, CheckCircle,
  AlertTriangle, Loader2, RefreshCw
} from 'lucide-react';
import { useSectionDesignerStore } from '../../../stores/sectionDesignerStore';
import { DeviceSwitcher } from './components/DeviceSwitcher';

const DEVICE_WIDTHS = {
  mobile: '375px',
  tablet: '768px',
  desktop: '100%',
};

export function LivePreviewTab() {
  const previewJSON = useSectionDesignerStore((s) => s.previewJSON);
  const status = useSectionDesignerStore((s) => s.status);
  const isPublishing = useSectionDesignerStore((s) => s.isPublishing);
  const publishResult = useSectionDesignerStore((s) => s.publishResult);
  const lastError = useSectionDesignerStore((s) => s.lastError);
  const saveDraft = useSectionDesignerStore((s) => s.saveDraft);
  const publish = useSectionDesignerStore((s) => s.publish);
  const deviceMode = useSectionDesignerStore((s) => s.deviceMode);
  const setDeviceMode = useSectionDesignerStore((s) => s.setDeviceMode);

  const [draftSaved, setDraftSaved] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);

  const isDone = status === 'done';
  const hasPreview = Boolean(previewJSON);

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    await saveDraft();
    setSavingDraft(false);
    setDraftSaved(true);
    setTimeout(() => setDraftSaved(false), 3000);
  };

  const handlePublish = async () => {
    setShowPublishConfirm(false);
    await publish();
  };

  // ── Empty state ────────────────────────────────────────────────────────────

  if (!hasPreview) {
    return (
      <div className="sd-preview-empty">
        <Eye size={48} style={{ opacity: 0.3 }} />
        <h3>Preview Ready Once Design Completes</h3>
        <p>
          {status === 'idle' && 'Start a design generation in the Agent tab.'}
          {(status === 'running' || status === 'starting') && 'Agents are working... preview will appear here when done.'}
          {status === 'questioning' && 'Answer the agent\'s question to continue.'}
          {status === 'cancelled' && 'Session was cancelled. Start a new design.'}
          {status === 'error' && 'Generation failed. Start a new design.'}
        </p>
      </div>
    );
  }

  // ── Preview ────────────────────────────────────────────────────────────────

  return (
    <div className="sd-preview-tab">
      {/* Device switcher */}
      <div className="sd-preview-toolbar">
        <DeviceSwitcher value={deviceMode} onChange={setDeviceMode} />

        <div className="sd-preview-actions">
          {isDone && (
            <>
              <motion.button
                id="sd-save-draft-btn"
                className="sd-btn-secondary"
                onClick={handleSaveDraft}
                disabled={savingDraft || draftSaved}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {savingDraft ? <Loader2 size={14} className="sd-spinner" /> : draftSaved ? <CheckCircle size={14} /> : <Save size={14} />}
                {draftSaved ? 'Draft Saved' : 'Save Draft'}
              </motion.button>

              <motion.button
                id="sd-publish-btn"
                className="sd-btn-primary"
                onClick={() => setShowPublishConfirm(true)}
                disabled={isPublishing || Boolean(publishResult?.success)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isPublishing ? (
                  <Loader2 size={14} className="sd-spinner" />
                ) : publishResult?.success ? (
                  <CheckCircle size={14} />
                ) : (
                  <Upload size={14} />
                )}
                {publishResult?.success ? 'Published ✓' : 'Publish Live'}
              </motion.button>
            </>
          )}
        </div>
      </div>

      {/* Publish confirm dialog */}
      <AnimatePresence>
        {showPublishConfirm && (
          <motion.div
            className="sd-publish-confirm"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <div className="sd-publish-confirm-card">
              <AlertTriangle size={24} style={{ color: '#f97316' }} />
              <h3>Publish to Live Website?</h3>
              <p>This section will replace the current live homepage section.
                A backup version will be saved for rollback.</p>
              <div className="sd-publish-checklist">
                <CheckItem>Schema validated</CheckItem>
                <CheckItem>Action registry verified</CheckItem>
                <CheckItem>Version archived</CheckItem>
                <CheckItem>Realtime listeners will update</CheckItem>
              </div>
              <div className="sd-publish-confirm-actions">
                <button className="sd-btn-ghost" onClick={() => setShowPublishConfirm(false)}>
                  Cancel
                </button>
                <motion.button
                  id="sd-confirm-publish-btn"
                  className="sd-btn-primary"
                  onClick={handlePublish}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Upload size={14} />
                  Yes, Publish Live
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Publish success */}
      <AnimatePresence>
        {publishResult?.success && (
          <motion.div
            className="sd-publish-success"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <CheckCircle size={16} />
            Published live! Version {publishResult.version} — {new Date(publishResult.publishedAt).toLocaleString()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Device frame */}
      <div className="sd-device-frame-wrap">
        <div
          className={`sd-device-frame sd-device-${deviceMode}`}
          style={{ maxWidth: DEVICE_WIDTHS[deviceMode] }}
        >
          {/* JSON preview panel — shows the key section properties */}
          <div className="sd-preview-panel">
            <div className="sd-preview-header">
              <span className="sd-preview-tag">SDUI Section</span>
              <span className="sd-preview-type">{previewJSON?.type ?? 'unknown'}</span>
            </div>

            {/* Hero/Background preview */}
            {previewJSON?.config?.backgroundImage && (
              <div className="sd-preview-bg" style={{ backgroundImage: `url(${previewJSON.config.backgroundImage})` }}>
                <div className="sd-preview-bg-overlay" />
              </div>
            )}

            {previewJSON?.config?.backgroundGradient && (
              <div className="sd-preview-bg" style={{ background: previewJSON.config.backgroundGradient }} />
            )}

            {/* Text content preview */}
            {previewJSON?.config?.headline && (
              <h2 className="sd-preview-headline">{previewJSON.config.headline}</h2>
            )}
            {previewJSON?.config?.subheadline && (
              <p className="sd-preview-subheadline">{previewJSON.config.subheadline}</p>
            )}

            {/* CTA */}
            {previewJSON?.config?.ctaText && (
              <button className="sd-preview-cta">{previewJSON.config.ctaText}</button>
            )}

            <div className="sd-preview-json-badge">
              <span>Section ID: {previewJSON?.id}</span>
              <span>•</span>
              <span>Order: {previewJSON?.order ?? 0}</span>
              <span>•</span>
              <span>{previewJSON?.isVisible ? '👁 Visible' : '🙈 Hidden'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckItem({ children }: { children: React.ReactNode }) {
  return (
    <div className="sd-check-item">
      <CheckCircle size={14} className="sd-icon-success" />
      <span>{children}</span>
    </div>
  );
}
