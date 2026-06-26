import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router';
import { useAuthStore, useCartStore } from '../lib/store';
import { useAIStore } from '../lib/aiStore';
import { ChevronRight, ChevronLeft } from 'lucide-react';

export default function AIAssistant() {
  const navigate = useNavigate();
  const location = useLocation();
  const authStore = useAuthStore();
  const cartStore = useCartStore();
  const { isOpen, setIsOpen, messages, addMessage } = useAIStore();
  
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  useEffect(() => {
    if (isDismissed || isOpen || isHidden) {
      setShowPopup(false);
      return;
    }
    const interval = setInterval(() => {
      setShowPopup(true);
      setTimeout(() => setShowPopup(false), 5000);
    }, 60000);
    return () => clearInterval(interval);
  }, [isDismissed, isOpen, isHidden]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    addMessage({ role: 'user', text: userMessage });
    setLoading(true);

    try {
      // Build frontend context
      const frontendContext = {
        route: location.pathname,
        role: authStore.role || 'guest',
        cart: {
          total: cartStore.total,
          items: cartStore.items.map(i => `${i.quantity}x ${i.name}`)
        }
      };

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          history: messages.slice(1), // send previous context excluding initial greeting
          frontendContext
        })
      });

      const data = await res.json();
      
      if (data.reply) {
        addMessage({ role: 'ai', text: data.reply });
      }

      // Execute AI-Triggered Actions
      if (data.action) {
        const { type, payload } = data.action;
        console.log("AI Action Triggered:", type, payload);
        
        switch (type) {
          case 'NAVIGATE':
            if (payload.path) navigate(payload.path);
            break;
          case 'ADD_TO_CART':
            if (payload.productId) {
               cartStore.addItem({
                 id: payload.productId,
                 menuItemId: payload.productId,
                 name: payload.productName || payload.productId,
                 price: payload.price || 0,
                 quantity: payload.quantity || 1,
                 image: payload.image || ''
               });
            }
            break;
          case 'CALL_CUSTOMER':
             window.open(`tel:${payload.phone || '0000000000'}`, '_self');
             break;
          case 'OPEN_MAPS':
             window.open(`geo:0,0?q=${encodeURIComponent(payload.address || payload.location || '')}`, '_blank');
             break;
        }
      }
    } catch (error) {
      addMessage({ role: 'ai', text: "We're experiencing high demand right now. Please try again in a moment." });
    } finally {
      setLoading(false);
    }
  };

  if (isHidden) {
    return (
      <button 
        onClick={() => setIsHidden(false)} 
        className="fixed bottom-24 md:bottom-6 right-0 bg-primary-500 text-white p-2 rounded-l-xl z-50 shadow-lg flex items-center hover:bg-primary-600 transition-colors"
      >
        <ChevronLeft size={20} />
      </button>
    );
  }

  return (
    <>
      {/* Floating Action Button Group */}
      <div className={`fixed bottom-24 md:bottom-6 right-6 z-50 flex flex-col items-end gap-2 transition-all duration-300 ${isOpen ? 'opacity-0 translate-y-10 pointer-events-none' : 'opacity-100 translate-y-0'}`}>
        
        <AnimatePresence>
          {showPopup && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white px-4 py-3 rounded-2xl rounded-br-sm shadow-xl border border-slate-200 dark:border-slate-700 text-sm font-bold flex items-center gap-3 cursor-pointer"
              onClick={() => { setIsOpen(true); setShowPopup(false); }}
            >
              Ask me anything! ✨
              <button 
                onClick={(e) => { e.stopPropagation(); setShowPopup(false); setIsDismissed(true); }} 
                className="text-slate-400 hover:text-slate-600 w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsHidden(true)} 
            className="bg-white dark:bg-slate-800 text-slate-400 hover:text-slate-600 p-2.5 rounded-full shadow-lg border border-slate-200 dark:border-slate-700 transition-colors"
            title="Hide AI Assistant"
          >
            <ChevronRight size={20} />
          </button>
          <button
            onClick={() => { setIsOpen(true); setShowPopup(false); }}
            className="w-14 h-14 bg-primary-500 hover:bg-primary-600 text-white rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-110"
          >
            <span className="text-2xl">🍕</span>
          </button>
        </div>
      </div>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-24 md:bottom-6 right-4 md:right-6 w-[calc(100vw-32px)] sm:w-96 h-[500px] max-h-[75vh] bg-white dark:bg-dark-900 rounded-2xl shadow-2xl flex flex-col z-[60] overflow-hidden border border-slate-200 dark:border-slate-700"
          >
            {/* Header */}
            <div className="bg-primary-500 text-white p-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-xl">🍕</span>
                <h3 className="font-bold">Olive AI Assistant</h3>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-white hover:text-slate-200 text-xl font-bold px-2">✕</button>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3 bg-slate-50 dark:bg-dark-800">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-primary-500 text-white rounded-br-sm' : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-sm shadow-sm border border-slate-100 dark:border-slate-600'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-slate-700 p-3 rounded-2xl rounded-bl-sm shadow-sm border border-slate-100 dark:border-slate-600 flex gap-1">
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={sendMessage} className="p-3 bg-white dark:bg-dark-900 border-t border-slate-200 dark:border-slate-700 flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask about our pizzas..."
                className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 transition-shadow"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="bg-primary-500 text-white w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-50 transition-opacity"
              >
                ↑
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
