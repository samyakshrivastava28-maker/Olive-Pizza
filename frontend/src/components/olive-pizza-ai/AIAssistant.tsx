import React, { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Sparkles, Send, Bot, User, Loader2 } from 'lucide-react';
import { speak } from '../../services/TextToSpeech.service';
import { auth } from '../../lib/firebase';

const BACKEND = import.meta.env.VITE_BACKEND_URL || '';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: 'msg-1', role: 'assistant', content: 'Hello! I am Olive Pizza AI. How can I help you today? 🍕' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  useEffect(() => { scrollToBottom(); }, [messages, isOpen]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;
    
    const userMsg: Message = { id: `user-${Date.now()}`, role: 'user', content: inputValue.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const token = await auth.currentUser?.getIdToken().catch(() => null);
      const res = await fetch(`${BACKEND}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify({
          message: userMsg.content,
          history: messages.map(m => ({ role: m.role, content: m.content })),
          sessionId: `session-local-ai-${auth.currentUser?.uid || 'guest'}`
        })
      });

      if (!res.ok) throw new Error('AI API Error');
      const data = await res.json();
      
      const aiMsg: Message = { id: `ai-${Date.now()}`, role: 'assistant', content: data.reply || 'Sorry, I encountered an issue.' };
      setMessages(prev => [...prev, aiMsg]);
      
      if (data.reply) {
        speak(data.reply);
      }
    } catch (err) {
      setMessages(prev => [...prev, { id: `ai-err-${Date.now()}`, role: 'assistant', content: "I'm having trouble connecting right now. Please try again later." }]);
    } finally {
      setIsLoading(false);
    }
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
            className="fixed bottom-24 right-4 z-50 w-[380px] h-[600px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-8rem)] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-primary dark:bg-primary-900 text-white">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-yellow-300" />
                <span className="font-semibold tracking-wide">Olive Pizza AI</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
                aria-label="Close Assistant"
              >
                <X size={18} />
              </button>
            </div>

            {/* Chat Body */}
            <div className="flex-1 w-full bg-slate-50 dark:bg-slate-950 overflow-y-auto p-4 flex flex-col gap-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-primary-100 text-primary-700' : 'bg-primary-600 text-white'}`}>
                    {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div className={`max-w-[80%] rounded-2xl p-3 text-sm shadow-sm ${msg.role === 'user' ? 'bg-primary-500 text-white rounded-tr-sm' : 'bg-white dark:bg-slate-800 dark:text-white border border-slate-100 dark:border-slate-700 rounded-tl-sm'}`}
                       dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br />') }}
                  />
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-primary-600 text-white">
                    <Bot size={16} />
                  </div>
                  <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-3 rounded-2xl rounded-tl-sm flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span className="text-xs text-slate-500 dark:text-slate-400">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
                placeholder="Ask about our menu..."
                className="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-slate-200"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                className="w-10 h-10 rounded-xl bg-primary-600 hover:bg-primary-500 text-white flex items-center justify-center disabled:opacity-50 transition-colors"
              >
                <Send size={18} className="ml-1" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-4 z-50 w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-primary/30"
        aria-label="Toggle AI Assistant"
      >
        {isOpen ? <X size={24} /> : <Sparkles size={24} />}
      </motion.button>
    </>
  );
}
