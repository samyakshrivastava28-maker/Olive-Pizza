// frontend/src/pages/owner/SectionDesigner/index.tsx
// Section Designer — AI-powered multi-agent UI builder.
// Mobile-first (default), accordion layout on mobile (only one panel expanded at a time).

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wand2, Eye, Code2, Layers, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router';
import { useSectionDesignerStore } from '../../../stores/sectionDesignerStore';
import { AgentTab } from './AgentTab';
import { LivePreviewTab } from './LivePreviewTab';
import { CodeViewer } from './components/CodeViewer';
import { DeviceSwitcher } from './components/DeviceSwitcher';
import { CancelBanner } from './components/CancelBanner';
import './sectionDesigner.css';


// ─────────────────────────────────────────────────────────────────────────────
// Tabs definition
// ─────────────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'agent', icon: Wand2, label: 'AI Agent' },
  { id: 'preview', icon: Eye, label: 'Preview' },
  { id: 'code', icon: Code2, label: 'JSON' },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function SectionDesignerPage() {
  const activeTab = useSectionDesignerStore((s) => s.activeTab);
  const setActiveTab = useSectionDesignerStore((s) => s.setActiveTab);
  const status = useSectionDesignerStore((s) => s.status);
  const reset = useSectionDesignerStore((s) => s.reset);
  const deviceMode = useSectionDesignerStore((s) => s.deviceMode);
  const setDeviceMode = useSectionDesignerStore((s) => s.setDeviceMode);
  const lastError = useSectionDesignerStore((s) => s.lastError);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (status === 'running' || status === 'questioning') {
        reset();
      }
    };
  }, []);

  return (
    <div className="sd-page">
      {/* ── Header ── */}
      <div className="sd-header">
        <div className="sd-header-left">
          <Link to="/owner/studio" className="sd-back-btn">
            <ArrowLeft size={18} />
            <span className="sd-back-text">Studio</span>
          </Link>
          <div className="sd-title-block">
            <div className="sd-icon-wrap">
              <Layers size={20} />
            </div>
            <div>
              <h1 className="sd-title">Section Designer</h1>
              <p className="sd-subtitle">AI-powered multi-agent UI builder</p>
            </div>
          </div>
        </div>

        {/* Device switcher — only visible on preview tab on desktop */}
        {activeTab === 'preview' && (
          <div className="sd-header-right">
            <DeviceSwitcher value={deviceMode} onChange={setDeviceMode} />
          </div>
        )}
      </div>

      {/* ── Status Error Banner ── */}
      <AnimatePresence>
        {lastError && (
          <motion.div
            className="sd-error-banner"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <span>⚠️ {lastError}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Cancel Banner (running sessions) ── */}
      <CancelBanner />

      {/* ── Tab Bar ── */}
      <div className="sd-tab-bar">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`sd-tab-${tab.id}`}
              className={`sd-tab ${isActive ? 'sd-tab-active' : ''}`}
              onClick={() => setActiveTab(tab.id as any)}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              {tab.id === 'agent' && (status === 'running' || status === 'questioning') && (
                <span className="sd-tab-dot" aria-label="Agent running" />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Tab Content ── */}
      <div className="sd-content">
        <AnimatePresence mode="wait">
          {activeTab === 'agent' && (
            <motion.div
              key="agent"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="sd-tab-pane"
            >
              <AgentTab />
            </motion.div>
          )}

          {activeTab === 'preview' && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="sd-tab-pane"
            >
              <LivePreviewTab />
            </motion.div>
          )}

          {activeTab === 'code' && (
            <motion.div
              key="code"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="sd-tab-pane"
            >
              <CodeViewer />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
