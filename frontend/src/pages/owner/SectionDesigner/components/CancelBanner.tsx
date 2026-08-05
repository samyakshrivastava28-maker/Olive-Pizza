import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XCircle } from 'lucide-react';

interface CancelBannerProps {
  isVisible: boolean;
  onCancel: () => void;
  isDesktop?: boolean;
}

export const CancelBanner: React.FC<CancelBannerProps> = ({ isVisible, onCancel, isDesktop }) => {
  if (isDesktop) {
    // Desktop: shown as a button in the top bar — rendered inline, not floating
    return null;
  }

  // Mobile: floating button
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          onClick={onCancel}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[999] flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-2xl shadow-red-900/50 font-semibold text-sm"
        >
          <XCircle className="w-4 h-4" />
          Cancel Task
        </motion.button>
      )}
    </AnimatePresence>
  );
};
