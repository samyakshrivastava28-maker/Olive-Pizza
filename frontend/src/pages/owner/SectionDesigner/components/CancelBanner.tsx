// frontend/src/pages/owner/SectionDesigner/components/CancelBanner.tsx
// Persistent banner shown while a generation session is active.
// Includes keyboard shortcut Ctrl+D to cancel.

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, StopCircle } from 'lucide-react';
import { useSectionDesignerStore } from '../../../../stores/sectionDesignerStore';

export function CancelBanner() {
  const status = useSectionDesignerStore((s) => s.status);
  const cancelSession = useSectionDesignerStore((s) => s.cancelSession);

  const isActive = status === 'running' || status === 'questioning' || status === 'starting';

  // Ctrl+D keyboard shortcut
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'd' && isActive) {
        e.preventDefault();
        cancelSession();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isActive, cancelSession]);

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className="sd-cancel-banner"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          <div className="sd-cancel-banner-left">
            <Loader2 size={16} className="sd-spinner" />
            <span>
              {status === 'starting' ? 'Starting session...' : 'Design agents are working...'}
            </span>
          </div>
          <button
            id="sd-cancel-banner-btn"
            className="sd-cancel-btn"
            onClick={cancelSession}
            title="Cancel (Ctrl+D)"
          >
            <StopCircle size={14} />
            Cancel
            <kbd className="sd-kbd">Ctrl+D</kbd>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
