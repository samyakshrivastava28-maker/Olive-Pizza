// frontend/src/pages/owner/SectionDesigner/components/ChatConsole.tsx
// Prompt input + start / regenerate / cancel controls.

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, StopCircle, RefreshCw, Wand2 } from 'lucide-react';
import { useSectionDesignerStore } from '../../../../stores/sectionDesignerStore';

const PLACEHOLDER_PROMPTS = [
  'Design a festive Diwali hero section with orange fire particles and dark background',
  'Create a popular pizzas grid with glassmorphic cards, hover animation, and "Add to Cart" buttons',
  'Build a coupons section with countdown timers and apply-instantly CTAs',
  'Make a warm testimonials carousel with star ratings and customer photos',
];

export function ChatConsole() {
  const prompt = useSectionDesignerStore((s) => s.prompt);
  const status = useSectionDesignerStore((s) => s.status);
  const setPrompt = useSectionDesignerStore((s) => s.setPrompt);
  const startSession = useSectionDesignerStore((s) => s.startSession);
  const cancelSession = useSectionDesignerStore((s) => s.cancelSession);
  const reset = useSectionDesignerStore((s) => s.reset);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [placeholder, setPlaceholder] = useState(PLACEHOLDER_PROMPTS[0]);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);

  // Cycle placeholder
  useEffect(() => {
    const t = setInterval(() => {
      setPlaceholderIdx((i) => {
        const next = (i + 1) % PLACEHOLDER_PROMPTS.length;
        setPlaceholder(PLACEHOLDER_PROMPTS[next]);
        return next;
      });
    }, 5000);
    return () => clearInterval(t);
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [prompt]);

  const isIdle = status === 'idle';
  const isRunning = status === 'running' || status === 'starting' || status === 'questioning';
  const isDone = status === 'done' || status === 'cancelled' || status === 'error';

  const handleStart = async () => {
    if (!prompt.trim() || prompt.trim().length < 5) return;
    await startSession(prompt.trim());
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleStart();
    }
  };

  return (
    <div className="sd-chat">
      {/* Textarea */}
      <div className="sd-chat-input-wrap">
        <Wand2 size={18} className="sd-chat-icon" />
        <textarea
          ref={textareaRef}
          id="sd-prompt-input"
          className="sd-chat-textarea"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKey}
          placeholder={placeholder}
          disabled={isRunning}
          rows={3}
          maxLength={1500}
          aria-label="Design prompt"
        />
      </div>

      <p className="sd-chat-hint">Ctrl + Enter to generate</p>

      {/* Controls */}
      <div className="sd-chat-controls">
        {isIdle && (
          <motion.button
            id="sd-start-btn"
            className="sd-btn-primary"
            onClick={handleStart}
            disabled={!prompt.trim() || prompt.trim().length < 5}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Send size={16} />
            Generate Section
          </motion.button>
        )}

        {isRunning && (
          <motion.button
            id="sd-cancel-btn"
            className="sd-btn-danger"
            onClick={cancelSession}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <StopCircle size={16} />
            Cancel (Ctrl+D)
          </motion.button>
        )}

        {isDone && (
          <div className="sd-chat-done-controls">
            <motion.button
              id="sd-regenerate-btn"
              className="sd-btn-secondary"
              onClick={() => {
                reset();
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <RefreshCw size={16} />
              New Design
            </motion.button>
          </div>
        )}
      </div>

      {/* Status indicator */}
      <div className="sd-chat-status">
        {status === 'starting' && (
          <span className="sd-status-pill sd-status-running">⟳ Starting session...</span>
        )}
        {status === 'running' && (
          <span className="sd-status-pill sd-status-running">● Agents working...</span>
        )}
        {status === 'questioning' && (
          <span className="sd-status-pill sd-status-question">? Agent has a question for you</span>
        )}
        {status === 'done' && (
          <span className="sd-status-pill sd-status-done">✓ Design complete</span>
        )}
        {status === 'cancelled' && (
          <span className="sd-status-pill sd-status-cancelled">⛔ Cancelled</span>
        )}
        {status === 'error' && (
          <span className="sd-status-pill sd-status-error">⚠️ Error occurred</span>
        )}
      </div>
    </div>
  );
}
