// frontend/src/pages/owner/SectionDesigner/components/AgentLog.tsx
// Live scrolling feed of all SSE agent events.

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AgentLogEntry } from '../../../../stores/sectionDesignerStore';

const EVENT_ICONS: Record<string, string> = {
  session_started: '🚀',
  planning: '🧠',
  question: '❓',
  question_answered: '✅',
  stitch_not_configured: '⚠️',
  stitch_fetching: '🎨',
  stitch_selected: '🎨',
  subagent_started: '▶️',
  subagent_done: '✅',
  subagent_failed: '❌',
  image_generating: '🖼️',
  image_analyzing: '🔍',
  image_approved: '✅',
  image_rejected: '🔄',
  image_all_attempts_failed: '🎨',
  image_uploaded: '☁️',
  synthesizing: '⚗️',
  validating: '🔒',
  validation_error: '⚠️',
  validation_fixed: '🔧',
  file_generated: '📄',
  preview_ready: '👁️',
  draft_saved: '💾',
  cancelled: '⛔',
  error: '🚨',
  done: '🎉',
};

const EVENT_COLORS: Record<string, string> = {
  error: 'sd-log-error',
  subagent_failed: 'sd-log-warning',
  validation_error: 'sd-log-warning',
  stitch_not_configured: 'sd-log-warning',
  image_rejected: 'sd-log-dim',
  image_all_attempts_failed: 'sd-log-warning',
  done: 'sd-log-success',
  preview_ready: 'sd-log-success',
  subagent_done: 'sd-log-success',
  image_approved: 'sd-log-success',
  image_uploaded: 'sd-log-success',
  cancelled: 'sd-log-cancelled',
};

interface Props {
  entries: AgentLogEntry[];
}

export function AgentLog({ entries }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries.length]);

  return (
    <div className="sd-agent-log" id="sd-agent-log">
      <AnimatePresence initial={false}>
        {entries.map((entry) => (
          <motion.div
            key={entry.id}
            className={`sd-log-entry ${EVENT_COLORS[entry.type] ?? 'sd-log-default'}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
          >
            <span className="sd-log-icon">{EVENT_ICONS[entry.type] ?? '•'}</span>
            <div className="sd-log-body">
              {entry.model && (
                <span className="sd-log-model">{entry.model}</span>
              )}
              <span className="sd-log-msg">{entry.message}</span>
            </div>
            <span className="sd-log-time">
              {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
      <div ref={bottomRef} />
    </div>
  );
}
