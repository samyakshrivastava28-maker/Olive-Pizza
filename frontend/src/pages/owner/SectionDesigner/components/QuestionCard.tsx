// frontend/src/pages/owner/SectionDesigner/components/QuestionCard.tsx
// Renders an AI question with single/multi select, text input, or image upload.
// Submitting the answer resumes the paused agent pipeline.

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Send, ChevronDown } from 'lucide-react';
import { useSectionDesignerStore } from '../../../../stores/sectionDesignerStore';
import type { AgentQuestion } from '../../../../stores/sectionDesignerStore';

interface Props {
  question: AgentQuestion;
}

export function QuestionCard({ question }: Props) {
  const answerQuestion = useSectionDesignerStore((s) => s.answerQuestion);
  const [selected, setSelected] = useState<string[]>([]);
  const [textValue, setTextValue] = useState('');
  const [customInput, setCustomInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const isSingle = question.type === 'single_select';
  const isMulti = question.type === 'multi_select';
  const isText = question.type === 'text_input';

  const toggleOption = (opt: string) => {
    if (isSingle) {
      setSelected([opt]);
    } else {
      setSelected((prev) =>
        prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]
      );
    }
  };

  const canSubmit = () => {
    if (isText) return textValue.trim().length > 0;
    if (isSingle || isMulti) return selected.length > 0 || customInput.trim().length > 0;
    return false;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    let answer: string | string[];

    if (isText) {
      answer = textValue.trim();
    } else if (customInput.trim()) {
      answer = isSingle ? customInput.trim() : [...selected, customInput.trim()];
    } else {
      answer = isSingle ? selected[0] : selected;
    }

    await answerQuestion(question.id, answer);
    setSubmitted(true);
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="sd-question-submitted">
        <CheckCircle size={20} className="sd-icon-success" />
        <span>Answer submitted — agent continuing...</span>
      </div>
    );
  }

  return (
    <motion.div
      className="sd-question-card"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <p className="sd-question-text">{question.question}</p>

      {/* Options */}
      {(isSingle || isMulti) && question.options && (
        <div className="sd-question-options">
          {question.options.map((opt) => {
            const isSelected = selected.includes(opt);
            return (
              <button
                key={opt}
                id={`sd-opt-${question.id}-${opt.replace(/\s+/g, '-').toLowerCase()}`}
                className={`sd-question-option ${isSelected ? 'sd-option-selected' : ''}`}
                onClick={() => toggleOption(opt)}
              >
                <span className="sd-option-check">
                  {isSelected ? <CheckCircle size={14} /> : <span className="sd-option-circle" />}
                </span>
                {opt}
              </button>
            );
          })}
        </div>
      )}

      {/* Text input */}
      {isText && (
        <textarea
          className="sd-question-textarea"
          value={textValue}
          onChange={(e) => setTextValue(e.target.value)}
          placeholder="Type your answer..."
          rows={3}
          id={`sd-text-answer-${question.id}`}
        />
      )}

      {/* Custom answer */}
      {(isSingle || isMulti) && question.allowCustomAnswer && (
        <input
          type="text"
          className="sd-question-custom"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          placeholder="Or type a custom answer..."
          id={`sd-custom-${question.id}`}
        />
      )}

      {/* Submit */}
      <motion.button
        id={`sd-answer-submit-${question.id}`}
        className="sd-btn-primary sd-question-submit"
        onClick={handleSubmit}
        disabled={!canSubmit() || submitting}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {submitting ? (
          <span className="sd-spinner-inline" />
        ) : (
          <Send size={14} />
        )}
        {submitting ? 'Sending...' : 'Continue Design'}
      </motion.button>
    </motion.div>
  );
}
