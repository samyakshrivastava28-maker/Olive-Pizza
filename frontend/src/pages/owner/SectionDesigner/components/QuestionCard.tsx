import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, Check, ChevronRight } from 'lucide-react';
import { AgentQuestion } from '../../../../stores/sectionDesignerStore';

interface QuestionCardProps {
  question: AgentQuestion;
  onAnswer: (answer: string | string[]) => void;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({ question, onAnswer }) => {
  const [selected, setSelected] = useState<string[]>([]);
  const [customText, setCustomText] = useState('');

  const isMulti = question.type === 'multi_select';
  const isText = question.type === 'text_input';

  const handleOptionClick = (option: string) => {
    if (isMulti) {
      setSelected(prev =>
        prev.includes(option) ? prev.filter(o => o !== option) : [...prev, option]
      );
    } else {
      // Single select — answer immediately
      onAnswer(option);
    }
  };

  const handleConfirm = () => {
    if (isText) {
      onAnswer(customText.trim() || 'No preference');
    } else {
      onAnswer(selected.length > 0 ? selected : ['No preference']);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-transparent p-4 space-y-3"
    >
      {/* Header */}
      <div className="flex items-center gap-2 text-orange-400 font-semibold text-sm">
        <HelpCircle className="w-4 h-4" />
        Quick Question
      </div>

      {/* Question text */}
      <p className="text-white text-sm leading-relaxed">{question.question}</p>

      {/* Options */}
      {question.options && question.options.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {question.options.map(opt => {
            const isSel = isMulti && selected.includes(opt);
            return (
              <motion.button
                key={opt}
                onClick={() => handleOptionClick(opt)}
                whileTap={{ scale: 0.96 }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  isSel
                    ? 'bg-orange-500/30 border-orange-500 text-orange-300'
                    : 'bg-white/5 border-white/10 text-white/70 hover:border-orange-500/40 hover:text-white'
                }`}
              >
                {isMulti && isSel && <Check className="w-3 h-3 inline mr-1" />}
                {opt}
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Custom text input */}
      {(isText || question.allowCustomAnswer) && (
        <input
          type="text"
          value={customText}
          onChange={e => setCustomText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleConfirm()}
          placeholder="Or type your own..."
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-orange-500/60"
        />
      )}

      {/* Confirm button for multi-select */}
      {(isMulti || isText) && (
        <motion.button
          onClick={handleConfirm}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-semibold transition-colors"
        >
          Confirm <ChevronRight className="w-3.5 h-3.5" />
        </motion.button>
      )}
    </motion.div>
  );
};
