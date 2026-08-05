import React, { Suspense, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ZoomIn, ZoomOut, Save, Globe, Pizza } from 'lucide-react';
import { useSectionDesignerStore } from '../../../stores/sectionDesignerStore';
import { DeviceSwitcher } from './components/DeviceSwitcher';

const DEVICE_WIDTHS: Record<string, string> = {
  mobile: '375px',
  tablet: '820px',
  desktop: '100%',
};

const ZOOM_LEVELS = [50, 75, 100, 125];

export const LivePreviewTab: React.FC = () => {
  const { previewJSON, previewDevice, setPreviewDevice, isAgentRunning, saveDraft, publish, sessionId } = useSectionDesignerStore();
  const [zoom, setZoom] = useState(100);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  const handleSaveDraft = async () => {
    setIsSaving(true);
    await saveDraft();
    setIsSaving(false);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3000);
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    setShowPublishDialog(false);
    await publish();
    setIsPublishing(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#0B0F14]">
      {/* Top toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 shrink-0">
        <DeviceSwitcher current={previewDevice} onChange={setPreviewDevice} />

        {/* Zoom */}
        <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl px-2 py-1">
          <button onClick={() => setZoom(z => Math.max(50, z - 25))} className="p-0.5 text-white/40 hover:text-white">
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs text-white/60 w-8 text-center">{zoom}%</span>
          <button onClick={() => setZoom(z => Math.min(125, z + 25))} className="p-0.5 text-white/40 hover:text-white">
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1" />

        {/* Actions */}
        {sessionId && (
          <>
            <motion.button
              onClick={handleSaveDraft}
              disabled={!previewJSON || isSaving}
              whileTap={{ scale: 0.96 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/20 text-white/70 hover:text-white hover:border-white/40 text-xs font-medium transition-colors disabled:opacity-40"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save Draft
            </motion.button>

            <motion.button
              onClick={() => setShowPublishDialog(true)}
              disabled={!previewJSON || isPublishing}
              whileTap={{ scale: 0.96 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold transition-colors disabled:opacity-40"
            >
              {isPublishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
              Publish
            </motion.button>
          </>
        )}
      </div>

      {/* Preview area */}
      <div className="flex-1 overflow-auto flex items-start justify-center p-4 bg-[#080B10]" style={{ minHeight: 0 }}>
        <div
          style={{
            width: DEVICE_WIDTHS[previewDevice],
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'top center',
            transition: 'width 0.3s ease, transform 0.2s ease',
          }}
        >
          {/* Device frame for mobile/tablet */}
          {previewDevice !== 'desktop' ? (
            <div
              className="relative mx-auto"
              style={{ width: DEVICE_WIDTHS[previewDevice] }}
            >
              {/* Phone frame chrome */}
              <div className="absolute inset-0 rounded-[2.5rem] border-[10px] border-[#1a1a2e] shadow-2xl shadow-black/60 z-10 pointer-events-none" />
              {/* Notch */}
              {previewDevice === 'mobile' && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-[#1a1a2e] rounded-b-2xl z-20 pointer-events-none" />
              )}
              {/* Screen content */}
              <div className="rounded-[2.5rem] overflow-hidden bg-[#0B0F14] min-h-[600px] relative z-0">
                <PreviewContent previewJSON={previewJSON} isAgentRunning={isAgentRunning} />
              </div>
              {/* Home indicator */}
              {previewDevice === 'mobile' && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-20 h-1 bg-white/30 rounded-full z-20" />
              )}
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden bg-[#0B0F14] min-h-[500px] border border-white/5">
              <PreviewContent previewJSON={previewJSON} isAgentRunning={isAgentRunning} />
            </div>
          )}
        </div>
      </div>

      {/* Status bar */}
      {previewJSON && (
        <div className="flex items-center gap-3 px-4 py-2 border-t border-white/10 text-xs text-white/40">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Preview ready
          <span className="ml-auto">Section: {previewJSON.type || 'custom'}</span>
        </div>
      )}

      {/* Saved toast */}
      <AnimatePresence>
        {savedToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-16 right-4 flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm shadow-lg"
          >
            <Save className="w-4 h-4" /> Draft saved!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Publish confirm dialog */}
      <AnimatePresence>
        {showPublishDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#111827] border border-white/10 rounded-2xl p-6 max-w-sm w-full space-y-4"
            >
              <h3 className="text-white font-bold text-lg">Publish to Live Homepage?</h3>
              <p className="text-white/60 text-sm">This will replace the current live homepage with the AI-generated section. This action cannot be undone without restoring a previous version.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowPublishDialog(false)} className="flex-1 py-2 rounded-xl border border-white/20 text-white/70 hover:text-white text-sm transition-colors">
                  Cancel
                </button>
                <button onClick={handlePublish} className="flex-1 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm transition-colors">
                  Publish
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const PreviewContent: React.FC<{ previewJSON: any; isAgentRunning: boolean }> = ({ previewJSON, isAgentRunning }) => {
  if (isAgentRunning && !previewJSON) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-2 border-orange-500/30 animate-ping absolute inset-0" />
          <div className="w-16 h-16 rounded-full border-2 border-orange-500/60 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-orange-400 animate-spin" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-white/60 text-sm font-medium">Generating your section...</p>
          <p className="text-white/30 text-xs mt-1">AI models are working in parallel</p>
        </div>
        {/* Skeleton placeholders */}
        <div className="w-full max-w-xs space-y-3 px-4">
          <div className="h-8 bg-white/5 rounded-xl animate-pulse" />
          <div className="h-4 bg-white/5 rounded-lg animate-pulse w-3/4 mx-auto" />
          <div className="h-32 bg-white/5 rounded-xl animate-pulse" />
          <div className="h-10 bg-orange-500/10 rounded-xl animate-pulse w-1/2 mx-auto" />
        </div>
      </div>
    );
  }

  if (!previewJSON) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 px-6 text-center">
        <Pizza className="w-12 h-12 text-orange-400 opacity-50" />
        <p className="text-white/50 text-sm font-medium">Start by describing the section you want in the Agent tab.</p>
        <p className="text-white/25 text-xs">Example: "Create a premium Diwali offer section with festive gold colors and a countdown timer"</p>
      </div>
    );
  }

  // Render the generated JSON as a formatted preview
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="p-4 space-y-4"
    >
      {/* Section header info */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-orange-400 font-mono uppercase tracking-wider">
          {previewJSON.type || 'section'}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-green-400">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
          Preview Ready
        </span>
      </div>

      {/* Config preview */}
      {previewJSON.config?.backgroundImage && (
        <div className="relative rounded-xl overflow-hidden h-40">
          <img src={previewJSON.config.backgroundImage} alt="Section background" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          {previewJSON.config?.headline && (
            <div className="absolute bottom-3 left-3 right-3">
              <h2 className="text-white font-bold text-lg leading-tight">{previewJSON.config.headline}</h2>
              {previewJSON.config?.subheadline && (
                <p className="text-white/70 text-xs mt-0.5">{previewJSON.config.subheadline}</p>
              )}
            </div>
          )}
        </div>
      )}

      {!previewJSON.config?.backgroundImage && previewJSON.config?.headline && (
        <div className="text-center py-6 px-4">
          <h2 className="text-white font-bold text-2xl leading-tight">{previewJSON.config.headline}</h2>
          {previewJSON.config?.subheadline && (
            <p className="text-white/60 text-sm mt-2">{previewJSON.config.subheadline}</p>
          )}
        </div>
      )}

      {previewJSON.config?.ctaText && (
        <div className="flex justify-center">
          <button className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-full text-sm font-semibold transition-colors">
            {previewJSON.config.ctaText}
          </button>
        </div>
      )}

      {/* Raw JSON fallback */}
      {!previewJSON.config?.headline && !previewJSON.config?.backgroundImage && (
        <pre className="text-xs font-mono text-green-300 bg-black/20 rounded-xl p-3 overflow-auto max-h-64">
          {JSON.stringify(previewJSON, null, 2)}
        </pre>
      )}
    </motion.div>
  );
};
