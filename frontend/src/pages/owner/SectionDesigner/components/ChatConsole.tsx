import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Paperclip, X, Bot, User, Loader2, AlertCircle, CheckCircle, Sparkles } from 'lucide-react';
import { AgentMessage, AgentQuestion } from '../../../../stores/sectionDesignerStore';
import { QuestionCard } from './QuestionCard';
import { StitchPreviewCard } from './StitchPreviewCard';
import { ImageQualityPreview } from './ImageQualityPreview';

interface ChatConsoleProps {
  messages: AgentMessage[];
  pendingQuestion: AgentQuestion | null;
  isAgentRunning: boolean;
  onSend: (prompt: string, images?: string[]) => void;
  onAnswer: (questionId: string, answer: string | string[]) => void;
}

const MessageBubble: React.FC<{ msg: AgentMessage }> = ({ msg }) => {
  if (msg.role === 'owner') {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex justify-end"
      >
        <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-tr-sm bg-orange-500 text-white text-sm">
          {msg.content}
        </div>
        <div className="w-7 h-7 rounded-full bg-orange-500/20 border border-orange-500/40 flex items-center justify-center ml-2 shrink-0 mt-auto">
          <User className="w-3.5 h-3.5 text-orange-400" />
        </div>
      </motion.div>
    );
  }

  if (msg.type === 'question') {
    // Will be handled by QuestionCard — skip rendering here
    return null;
  }

  if (msg.type === 'stitch_preview' && msg.metadata?.design) {
    return (
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-start gap-2">
        <AgentAvatar />
        <div className="flex-1">
          <StitchPreviewCard design={msg.metadata.design} isSelected message={msg.content} />
        </div>
      </motion.div>
    );
  }

  if (msg.type === 'image_preview' && msg.metadata) {
    return (
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-start gap-2">
        <AgentAvatar />
        <div className="flex-1">
          <ImageQualityPreview
            model={msg.metadata.model || 'Image Pipeline'}
            status={msg.metadata.status || 'generating'}
            score={msg.metadata.score}
            imageUrl={msg.metadata.generatedUrl}
            cloudinaryUrl={msg.metadata.cloudinaryUrl}
            rejectionReason={msg.metadata.rejectionReason}
            message={msg.content}
          />
        </div>
      </motion.div>
    );
  }

  if (msg.type === 'step') {
    return (
      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 py-0.5">
        <div className="w-5 h-5 shrink-0 flex items-center justify-center">
          <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />
        </div>
        <p className="text-xs text-white/50">{msg.content}</p>
      </motion.div>
    );
  }

  if (msg.type === 'error') {
    return (
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-start gap-2">
        <AgentAvatar />
        <div className="flex-1 px-3 py-2 rounded-2xl rounded-tl-sm bg-red-900/30 border border-red-500/30 text-sm text-red-300">
          <AlertCircle className="w-4 h-4 inline mr-1.5 mb-0.5" />
          {msg.content}
        </div>
      </motion.div>
    );
  }

  if (msg.type === 'success') {
    return (
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-start gap-2">
        <AgentAvatar />
        <div className="flex-1 px-3 py-2 rounded-2xl rounded-tl-sm bg-green-900/30 border border-green-500/30 text-sm text-green-300">
          <CheckCircle className="w-4 h-4 inline mr-1.5 mb-0.5" />
          {msg.content}
        </div>
      </motion.div>
    );
  }

  // Default agent text message
  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-start gap-2">
      <AgentAvatar />
      <div className="flex-1 px-3 py-2.5 rounded-2xl rounded-tl-sm bg-white/5 border border-white/10 text-sm text-white/80">
        {msg.content}
      </div>
    </motion.div>
  );
};

const AgentAvatar: React.FC = () => (
  <div className="w-7 h-7 rounded-full bg-orange-500/20 border border-orange-500/40 flex items-center justify-center shrink-0 mt-1">
    <span className="text-sm">🍕</span>
  </div>
);

export const ChatConsole: React.FC<ChatConsoleProps> = ({
  messages, pendingQuestion, isAgentRunning, onSend, onAnswer,
}) => {
  const [prompt, setPrompt] = useState('');
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!prompt.trim() || isAgentRunning || pendingQuestion) return;
    onSend(prompt.trim(), attachedImages.length ? attachedImages : undefined);
    setPrompt('');
    setAttachedImages([]);
  };

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 5);
    files.forEach(f => {
      const reader = new FileReader();
      reader.onload = ev => {
        setAttachedImages(prev => [...prev, ev.target?.result as string].slice(0, 5));
      };
      reader.readAsDataURL(f);
    });
    e.target.value = '';
  };

  const isInputDisabled = isAgentRunning || !!pendingQuestion;

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-3 opacity-50">
              <Sparkles className="w-10 h-10 text-orange-400 mx-auto" />
              <p className="text-sm text-white/60">Describe the section you want to build.</p>
              <p className="text-xs text-white/30">Example: "Create a Diwali offer hero with a golden theme and countdown timer"</p>
            </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map(msg => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}
        </AnimatePresence>

        {/* Inline question card */}
        {pendingQuestion && (
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-start gap-2">
            <AgentAvatar />
            <div className="flex-1">
              <QuestionCard question={pendingQuestion} onAnswer={a => onAnswer(pendingQuestion.id, a)} />
            </div>
          </motion.div>
        )}

        <div ref={endRef} />
      </div>

      {/* Attached image thumbnails */}
      {attachedImages.length > 0 && (
        <div className="flex gap-2 px-4 pb-2 flex-wrap">
          {attachedImages.map((img, i) => (
            <div key={i} className="relative w-12 h-12 rounded-lg overflow-hidden border border-white/20">
              <img src={img} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => setAttachedImages(prev => prev.filter((_, idx) => idx !== i))}
                className="absolute top-0.5 right-0.5 bg-black/70 rounded-full p-0.5"
              >
                <X className="w-2.5 h-2.5 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className={`relative border-t border-white/10 px-4 py-3 ${isInputDisabled ? 'opacity-60' : ''}`}>
        {isAgentRunning && !pendingQuestion && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center rounded-b-2xl z-10">
            <div className="flex items-center gap-2 text-sm text-white/60">
              <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
              Agent is working... (Ctrl+D to cancel)
            </div>
          </div>
        )}
        <div className="flex items-end gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isInputDisabled}
            className="p-2 rounded-xl hover:bg-white/10 text-white/40 hover:text-white transition-colors disabled:cursor-not-allowed"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={handleFileAttach} className="hidden" />
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
            disabled={isInputDisabled}
            placeholder="Describe the section you want..."
            rows={1}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-orange-500/60 resize-none disabled:cursor-not-allowed"
            style={{ maxHeight: '120px', overflowY: 'auto' }}
          />
          <motion.button
            onClick={handleSend}
            disabled={isInputDisabled || !prompt.trim()}
            whileTap={{ scale: 0.92 }}
            className="p-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
          >
            <Send className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
    </div>
  );
};
