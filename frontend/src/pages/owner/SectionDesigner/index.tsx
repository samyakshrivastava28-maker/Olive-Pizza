import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Eye, Pizza, XCircle } from 'lucide-react';
import { AgentTab } from './AgentTab';
import { LivePreviewTab } from './LivePreviewTab';
import { CancelBanner } from './components/CancelBanner';
import { useSectionDesignerStore } from '../../../stores/sectionDesignerStore';

type Tab = 'agent' | 'preview';

const SectionDesignerPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('agent');
  const { isAgentRunning, cancelSession, reset } = useSectionDesignerStore();

  // Ctrl+D global listener for cancel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'd' && isAgentRunning) {
        e.preventDefault();
        cancelSession();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAgentRunning, cancelSession]);

  // Switch to preview when results are ready
  const { previewJSON } = useSectionDesignerStore();
  useEffect(() => {
    if (previewJSON && !isAgentRunning) {
      // Don't auto-switch on mobile — user can choose
    }
  }, [previewJSON, isAgentRunning]);

  return (
    <div className="flex flex-col h-screen bg-[#0B0F14] text-white overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 shrink-0 bg-[#0D1117]">
        <div className="flex items-center gap-2">
          <Pizza className="w-5 h-5 text-orange-400" />
          <span className="font-bold text-white text-sm hidden sm:block">Olive Pizza</span>
          <span className="text-white/20 hidden sm:block">•</span>
          <span className="text-sm font-semibold text-white/80">Section Designer</span>
        </div>

        <div className="flex-1" />

        {/* Cancel (desktop) */}
        {isAgentRunning && (
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={cancelSession}
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600/20 border border-red-500/40 text-red-400 hover:bg-red-600/30 text-xs font-medium transition-colors"
          >
            <XCircle className="w-3.5 h-3.5" />
            Ctrl+D Cancel
          </motion.button>
        )}
      </div>

      {/* Mobile/Tablet: Tab bar */}
      <div className="flex lg:hidden border-b border-white/10 shrink-0">
        {([
          { key: 'agent', label: 'Agent', icon: <Bot className="w-4 h-4" /> },
          { key: 'preview', label: 'Live Preview', icon: <Eye className="w-4 h-4" /> },
        ] as { key: Tab; label: string; icon: React.ReactNode }[]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === tab.key
                ? 'text-orange-400 border-orange-500'
                : 'text-white/50 border-transparent hover:text-white'
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.key === 'preview' && previewJSON && (
              <span className="w-2 h-2 rounded-full bg-green-400" />
            )}
          </button>
        ))}
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden flex min-h-0">
        {/* Mobile/Tablet: Tab content */}
        <div className="flex-1 overflow-hidden lg:hidden">
          <AnimatePresence mode="wait">
            {activeTab === 'agent' ? (
              <motion.div
                key="agent"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full"
              >
                <AgentTab />
              </motion.div>
            ) : (
              <motion.div
                key="preview"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="h-full"
              >
                <LivePreviewTab />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Desktop: Side by side */}
        <div className="hidden lg:flex w-full">
          {/* Left: Agent tab (50%) */}
          <div className="w-1/2 border-r border-white/10 overflow-hidden">
            <AgentTab />
          </div>
          {/* Right: Live preview (50%) */}
          <div className="w-1/2 overflow-hidden relative">
            <LivePreviewTab />
          </div>
        </div>
      </div>

      {/* Mobile floating cancel button */}
      <CancelBanner isVisible={isAgentRunning} onCancel={cancelSession} />
    </div>
  );
};

export default SectionDesignerPage;
