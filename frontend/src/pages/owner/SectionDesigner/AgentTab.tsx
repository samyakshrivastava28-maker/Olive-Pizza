// frontend/src/pages/owner/SectionDesigner/AgentTab.tsx
// Mobile-first: single-accordion layout (only one section expanded at a time).
// Sections: Chat Console, AI Log, Image Pipeline, Stitch Status.

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, ChevronDown, ChevronUp,
  Image, Sparkles, Send, StopCircle,
  RefreshCw, CheckCircle, XCircle, Loader2
} from 'lucide-react';
import { useSectionDesignerStore } from '../../../stores/sectionDesignerStore';
import { AgentLog } from './components/AgentLog';
import { QuestionCard } from './components/QuestionCard';
import { ImageQualityPreview } from './components/ImageQualityPreview';
import { ChatConsole } from './components/ChatConsole';

// ─────────────────────────────────────────────────────────────────────────────
// Accordion Section Wrapper (mobile single-open)
// ─────────────────────────────────────────────────────────────────────────────

function AccordionSection({
  id,
  title,
  icon: Icon,
  badge,
  isOpen,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  icon: any;
  badge?: string | number;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={`sd-accordion ${isOpen ? 'sd-accordion-open' : ''}`}>
      <button
        className="sd-accordion-header"
        onClick={onToggle}
        id={`sd-accordion-${id}`}
        aria-expanded={isOpen}
      >
        <div className="sd-accordion-left">
          <Icon size={16} className="sd-accordion-icon" />
          <span className="sd-accordion-title">{title}</span>
          {badge !== undefined && badge !== 0 && (
            <span className="sd-accordion-badge">{badge}</span>
          )}
        </div>
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="sd-accordion-body"
            style={{ overflow: 'hidden' }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Agent Tab
// ─────────────────────────────────────────────────────────────────────────────

export function AgentTab() {
  const status = useSectionDesignerStore((s) => s.status);
  const agentLog = useSectionDesignerStore((s) => s.agentLog);
  const imageJobs = useSectionDesignerStore((s) => s.imageJobs);
  const pendingQuestion = useSectionDesignerStore((s) => s.pendingQuestion);
  const stitchConfigured = useSectionDesignerStore((s) => s.stitchConfigured);
  const stitchDesign = useSectionDesignerStore((s) => s.stitchDesign);
  const accordionOpen = useSectionDesignerStore((s) => s.accordionOpen);
  const setAccordionOpen = useSectionDesignerStore((s) => s.setAccordionOpen);

  // Auto-open question accordion when pending question arrives
  useEffect(() => {
    if (pendingQuestion) setAccordionOpen('question');
  }, [pendingQuestion]);

  // Auto-open image accordion when images start
  useEffect(() => {
    if (imageJobs.length > 0 && accordionOpen === 'log') setAccordionOpen('images');
  }, [imageJobs.length]);

  const toggle = (id: string) => {
    setAccordionOpen(accordionOpen === id ? null : id);
  };

  const isIdle = status === 'idle';
  const isActive = status === 'running' || status === 'questioning' || status === 'starting';
  const isDone = status === 'done';
  const isCancelled = status === 'cancelled';
  const isError = status === 'error';

  return (
    <div className="sd-agent-tab">
      {/* ── Chat Console (prompt input + start button) ── */}
      <AccordionSection
        id="chat"
        title="Design Prompt"
        icon={MessageSquare}
        isOpen={accordionOpen === 'chat'}
        onToggle={() => toggle('chat')}
      >
        <ChatConsole />
      </AccordionSection>

      {/* ── Pending Question ── */}
      <AnimatePresence>
        {pendingQuestion && (
          <AccordionSection
            id="question"
            title="🤔 Agent Question"
            icon={MessageSquare}
            badge="!"
            isOpen={accordionOpen === 'question'}
            onToggle={() => toggle('question')}
          >
            <QuestionCard question={pendingQuestion} />
          </AccordionSection>
        )}
      </AnimatePresence>

      {/* ── Agent Log ── */}
      {agentLog.length > 0 && (
        <AccordionSection
          id="log"
          title="Agent Activity"
          icon={Sparkles}
          badge={agentLog.length}
          isOpen={accordionOpen === 'log'}
          onToggle={() => toggle('log')}
        >
          <AgentLog entries={agentLog} />
        </AccordionSection>
      )}

      {/* ── Image Pipeline ── */}
      {imageJobs.length > 0 && (
        <AccordionSection
          id="images"
          title="Image Pipeline"
          icon={Image}
          badge={imageJobs.filter((j) => j.status === 'done').length + '/' + imageJobs.length}
          isOpen={accordionOpen === 'images'}
          onToggle={() => toggle('images')}
        >
          <ImageQualityPreview jobs={imageJobs} />
        </AccordionSection>
      )}

      {/* ── Stitch Status ── */}
      {stitchConfigured !== null && (
        <AccordionSection
          id="stitch"
          title="Google Stitch"
          icon={Sparkles}
          isOpen={accordionOpen === 'stitch'}
          onToggle={() => toggle('stitch')}
        >
          <div className="sd-stitch-status">
            {stitchConfigured === false ? (
              <div className="sd-stitch-not-configured">
                <XCircle size={20} className="sd-icon-error" />
                <div>
                  <p className="sd-stitch-label">Not Configured</p>
                  <p className="sd-stitch-note">
                    Google Stitch integration is not set up. Contact your developer to configure
                    STITCH_API_KEY and STITCH_PROJECT_ID.
                  </p>
                </div>
              </div>
            ) : stitchDesign ? (
              <div className="sd-stitch-selected">
                <CheckCircle size={20} className="sd-icon-success" />
                <div>
                  <p className="sd-stitch-label">{stitchDesign.name}</p>
                  {stitchDesign.thumbnailUrl && (
                    <img
                      src={stitchDesign.thumbnailUrl}
                      alt={stitchDesign.name}
                      className="sd-stitch-thumb"
                    />
                  )}
                  <p className="sd-stitch-note">{stitchDesign.description}</p>
                </div>
              </div>
            ) : (
              <div className="sd-stitch-loading">
                <Loader2 size={20} className="sd-spinner" />
                <span>Fetching from Google Stitch...</span>
              </div>
            )}
          </div>
        </AccordionSection>
      )}

      {/* ── Idle empty state ── */}
      {isIdle && agentLog.length === 0 && !pendingQuestion && (
        <div className="sd-empty-state">
          <Wand2 size={48} className="sd-empty-icon" />
          <h2>Describe Your Vision</h2>
          <p>
            Tell the AI what section you want — a festive hero, a product grid, a promo banner —
            and 5 specialist models will work in parallel to design it.
          </p>
          <ul className="sd-model-list">
            <li>🟠 GLM 5.2 — Structure</li>
            <li>🟣 Kimi 2.6 — Copy</li>
            <li>🔵 DeepSeek Flash — Components</li>
            <li>🟢 Nemotron Ultra — Design Rules</li>
            <li>⚪ MiniMax M3 — Animations</li>
          </ul>
        </div>
      )}
    </div>
  );
}

// Needed for JSX-only reference
function Wand2({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 4V2m0 14v-2M8 9H2m14 0h-2M4 4l1.5 1.5M18.5 18.5 20 20M4 20l1.5-1.5M18.5 5.5 20 4" />
      <path d="m12 8-8 8 4 4 8-8-4-4z" />
    </svg>
  );
}
