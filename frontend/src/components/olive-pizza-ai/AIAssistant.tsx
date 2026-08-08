import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Sparkles, ExternalLink, Bot } from 'lucide-react';
import { OlivePizzaAIClient, OLIVE_PIZZA_AI_PLATFORM_URL } from '../../lib/olivePizzaAISDK';
import { auth } from '../../lib/firebase';

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpenPlatform = () => {
    OlivePizzaAIClient.openPlatform('customer', auth.currentUser?.uid);
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-24 right-4 z-50 w-[380px] h-[580px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-8rem)] bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-800 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3.5 bg-gradient-to-r from-emerald-800 to-amber-700 text-white">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-yellow-300 animate-pulse" />
                <span className="font-semibold tracking-wide text-sm">Olive Pizza AI Platform</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleOpenPlatform}
                  title="Open Fullscreen Platform"
                  className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
                >
                  <ExternalLink size={16} />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
                  aria-label="Close Assistant"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Platform Embed / Direct Connection */}
            <div className="flex-1 w-full bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
              <iframe
                src={`${OLIVE_PIZZA_AI_PLATFORM_URL}?embed=true&uid=${auth.currentUser?.uid || 'guest'}`}
                title="Olive Pizza AI Platform"
                className="w-full h-full border-0 rounded-2xl bg-slate-950"
                onError={() => {}}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-5 py-3.5 bg-gradient-to-r from-emerald-700 via-emerald-800 to-amber-600 hover:from-emerald-600 hover:to-amber-500 text-white rounded-full shadow-2xl shadow-emerald-950/50 border border-white/20 cursor-pointer transition-all"
      >
        <Bot size={22} className="text-yellow-300" />
        <span className="font-semibold tracking-wide text-sm hidden sm:inline">Olive Pizza AI</span>
      </motion.button>
    </>
  );
}
