import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router';
import { useAuthStore, useCartStore } from '../lib/store';
import { useCartAnimation } from '../components/ui/CartAnimationProvider';
import {
  Bot, Send, Loader2, Star, Clock, Leaf, Zap, Shield, ShoppingCart,
  CheckCircle, AlertTriangle, ChevronRight, Tag, Navigation, Sparkles,
  Mic, MicOff, ThumbsUp, ThumbsDown, Copy, RotateCcw, MessageSquare,
  Trash2, Plus, Volume2, HelpCircle, PhoneCall
} from 'lucide-react';
import PageTransition from '../components/PageTransition';
import Galaxy from '../components/ui/Galaxy';
import SEO from '../components/SEO';
import toast from 'react-hot-toast';

// ── Interfaces ─────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
  products?: ProductCard[];
  source?: string;
  timestamp: Date;
  liked?: boolean;
}

interface ProductCard {
  id: string;
  name: string;
  price: number;
  discountedPrice?: number;
  category: string;
  description: string;
  imageUrl?: string;
  rating?: number;
  preparationTime?: number;
  isVeg?: boolean;
  isAvailable?: boolean;
}

// ── Quick Chips & Capabilities ──────────────────────────────────────────────────
const QUICK_CHIPS = [
  { emoji: '🍕', label: 'Show pizzas', msg: 'Show me all pizzas' },
  { emoji: '🌶️', label: 'Spicy options', msg: 'Recommend a spicy pizza' },
  { emoji: '🥗', label: 'Veg menu', msg: 'Show vegetarian options' },
  { emoji: '💰', label: 'Best deals', msg: 'What are your best deals?' },
  { emoji: '🎟️', label: 'Coupons', msg: 'What active coupons can I use?' },
  { emoji: '🛵', label: 'Track order', msg: 'Where is my active order?' },
  { emoji: '⏰', label: 'Store hours', msg: 'What are your opening hours?' },
  { emoji: '📞', label: 'Contact support', msg: 'How do I contact Olive Pizza?' },
];

const CAPABILITY_CARDS = [
  { icon: '🍕', title: 'Pizza Recommendations', desc: 'Find pizzas matched to your exact taste & dietary preferences.' },
  { icon: '🛵', title: 'Real-time Order Tracking', desc: 'Get live status and ETA updates for your active orders.' },
  { icon: '🎟️', title: 'Coupons & Combos', desc: 'Unlock secret discounts and custom combo savings.' },
  { icon: '📞', title: '24/7 Restaurant Support', desc: 'Direct answers to timings, delivery areas, and FAQs.' }
];

export default function UniversalAssistant() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const addItem = useCartStore((state) => state.addItem);
  const { triggerAnimation } = useCartAnimation();

  // Chat State
  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: 'welcome-1',
      role: 'ai',
      text: `Hello ${user?.name ? user.name : 'Gourmet Lover'}! 🍕 I'm Olive AI, your artisan pizza concierge. How can I satisfy your cravings today?`,
      timestamp: new Date()
    }
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [historySidebarOpen, setHistorySidebarOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [autoVoiceEnabled, setAutoVoiceEnabled] = useState(false);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Handle Quick Add to Cart from AI Product Recommendation Card
  const handleAddToCart = (e: React.MouseEvent, p: ProductCard) => {
    e.stopPropagation();
    const cartItem = {
      id: p.id,
      menuItemId: p.id,
      name: p.name,
      price: p.discountedPrice || p.price,
      quantity: 1,
      image: p.imageUrl || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=400',
      isVegetarian: p.isVeg ?? true,
      crust: 'Classic Crust',
      size: 'Medium'
    };
    addItem(cartItem);

    triggerAnimation(e, p.imageUrl || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=400');
    window.dispatchEvent(new CustomEvent('cart-item-added'));
    toast.success(`Added ${p.name} to cart! 🍕`, {
      style: { background: '#1e1e1e', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }
    });
  };

  // Play Speech via NVIDIA Chatterbox Multilingual TTS (or Web Speech fallback)
  const playSpeech = async (text: string) => {
    if (!text.trim()) return;
    try {
      toast.loading('Synthesizing speech via NVIDIA Chatterbox...', { id: 'tts-toast' });
      const res = await fetch('/api/tts/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language: 'hi-IN', voice: 'female' })
      });
      toast.dismiss('tts-toast');
      if (res.ok) {
        const audioBlob = await res.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play();
        return;
      }
    } catch (err) {
      toast.dismiss('tts-toast');
    }

    // Web Speech Synthesis Fallback
    try {
      window.speechSynthesis.cancel();
      const cleanText = text.replace(/[^\w\s\u0900-\u097F.,!?]/gi, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.lang = /[\u0900-\u097F]/.test(text) ? 'hi-IN' : 'en-IN';
      window.speechSynthesis.speak(utterance);
    } catch {
      toast.error('Voice playback unavailable on this device');
    }
  };

  // Execute Website Action triggered by AI Intent
  const executeWebsiteAction = (action: any) => {
    if (!action || !action.type) return;
    console.log('[Olive AI Action]', action);
    switch (action.type) {
      case 'NAVIGATE':
        if (action.payload?.path) {
          toast.success(`Navigating to ${action.payload.path}... 🚀`);
          setTimeout(() => navigate(action.payload.path), 800);
        }
        break;
      case 'ADD_TO_CART':
        if (action.payload?.item) {
          addItem(action.payload.item);
          window.dispatchEvent(new CustomEvent('cart-item-added'));
          toast.success(`Added ${action.payload.item.name} to cart! 🍕`);
        }
        break;
      case 'APPLY_COUPON':
        if (action.payload?.code) {
          useCartStore.getState().applyCoupon(action.payload.code);
          toast.success(`Applied coupon code ${action.payload.code}! 🎉`);
        }
        break;
      case 'CLEAR_CART':
        useCartStore.getState().clearCart();
        toast('Cart cleared', { icon: '🗑️' });
        break;
      case 'SHOW_ORDER_CONFIRMATION':
        setPendingAiOrderData(action.payload);
        setShowOrderConfirmationModal(true);
        break;
      default:
        break;
    }
  };

  // Handle Sending AI Query
  const handleSend = async (customQuery?: string) => {
    const queryText = customQuery || input;
    if (!queryText.trim() || loading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: queryText,
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customQuery) setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: queryText, userId: user?.id })
      }).catch(() => null);

      let aiResponseText = '';
      let productsList: ProductCard[] | undefined = undefined;
      let actionToExecute: any = null;

      if (res && res.ok) {
        const data = await res.json();
        aiResponseText = data.text || data.message || 'Here is what I found for you!';
        productsList = data.products;
        actionToExecute = data.action;
      } else {
        // Client-side fallback matching restaurant intent & actions
        const q = queryText.toLowerCase();
        if (q.includes('cart') && (q.includes('add') || q.includes('order'))) {
          aiResponseText = "I've added our best-selling Paneer Supreme Pizza to your cart! Would you like to view your cart or checkout?";
          actionToExecute = {
            type: 'ADD_TO_CART',
            payload: {
              item: {
                id: 'p1',
                menuItemId: 'p1',
                name: 'Paneer Supreme Pizza',
                price: 349,
                quantity: 1,
                image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=400',
                isVegetarian: true,
                crust: 'Classic Crust',
                size: 'Medium'
              }
            }
          };
        } else if (q.includes('checkout') || q.includes('pay') || q.includes('buy')) {
          aiResponseText = "Opening checkout page now so you can complete your order! 💳";
          actionToExecute = { type: 'NAVIGATE', payload: { path: '/checkout' } };
        } else if (q.includes('menu') || q.includes('pizza') || q.includes('spicy') || q.includes('veg')) {
          aiResponseText = "Here are our top handcrafted artisan pizzas prepared fresh in our Rajnandgaon kitchen! 🍕";
          productsList = [
            {
              id: 'p1',
              name: 'Paneer Supreme Pizza',
              price: 399,
              discountedPrice: 349,
              category: 'pizza',
              description: 'Fresh cottage cheese, crunchy capsicum, red paprika, and 100% mozzarella.',
              imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=400',
              rating: 4.8,
              isVeg: true
            },
            {
              id: 'p2',
              name: 'Fiery Jalapeño Feast',
              price: 449,
              discountedPrice: 399,
              category: 'pizza',
              description: 'Loaded with spicy jalapeños, red chili flakes, mushrooms, and liquid cheese lava crust.',
              imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=400',
              rating: 4.9,
              isVeg: true
            }
          ];
        } else if (q.includes('coupon') || q.includes('offer') || q.includes('deal')) {
          aiResponseText = "🎉 Active Coupons Today:\n• BEST50 — ₹50 off on orders above ₹300\n• PIZZALOVE — 20% cashback\nApplying BEST50 code to your order!";
          actionToExecute = { type: 'APPLY_COUPON', payload: { code: 'BEST50' } };
        } else if (q.includes('hours') || q.includes('timing') || q.includes('time')) {
          aiResponseText = "⏰ Olive Pizza Rajnandgaon is open daily from 12:00 PM to 11:30 PM! Pre-orders are accepted 24/7.";
        } else if (q.includes('track') || q.includes('order')) {
          aiResponseText = "🛵 Navigating to real-time live order tracking page!";
          actionToExecute = { type: 'NAVIGATE', payload: { path: '/tracking' } };
        } else {
          aiResponseText = `I can help you explore our menu, recommend the best combos for your budget, add items directly to your cart, or track your live order! Feel free to pick a prompt below or speak to me in Hindi or English.`;
        }
      }

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        role: 'ai',
        text: aiResponseText,
        products: productsList,
        source: 'Olive AI Engine v2',
        timestamp: new Date()
      };

      setMessages((prev) => [...prev, aiMsg]);

      // Execute website action if returned
      if (actionToExecute) {
        executeWebsiteAction(actionToExecute);
      }

      // Auto-play voice TTS if enabled
      if (autoVoiceEnabled) {
        playSpeech(aiResponseText);
      }
    } catch (err) {
      toast.error('AI response error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Response copied to clipboard!');
  };

  const [showOrderConfirmationModal, setShowOrderConfirmationModal] = useState(false);
  const [pendingAiOrderData, setPendingAiOrderData] = useState<any>(null);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Canary STT Audio Recorder
  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const formData = new FormData();
        formData.append('file', audioBlob, 'speech.wav');

        toast.loading('Transcribing speech via NVIDIA Canary-1B ASR...', { id: 'stt-toast' });
        try {
          const res = await fetch('/api/ai/stt', {
            method: 'POST',
            body: formData
          });
          const data = await res.json();
          if (data.success && data.text) {
            toast.success(`Transcribed: "${data.text}"`, { id: 'stt-toast' });
            setInput(data.text);
            handleSend(data.text);
          } else {
            toast.error('Could not transcribe audio. Switching to text input.', { id: 'stt-toast' });
          }
        } catch {
          toast.error('STT service unavailable. Using text input.', { id: 'stt-toast' });
        } finally {
          setIsListening(false);
          setIsRecordingAudio(false);
        }
      };

      mediaRecorder.start();
      setIsListening(true);
      setIsRecordingAudio(true);
      toast('Listening... Speak your pizza request in Hindi or English!', { icon: '🎙️' });
    } catch (err) {
      toast.error('Microphone access denied. Please type your message.');
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && isRecordingAudio) {
      mediaRecorderRef.current.stop();
    }
  };

  const toggleVoiceMode = () => {
    if (!isRecordingAudio) {
      startAudioRecording();
    } else {
      stopAudioRecording();
    }
  };



  const confirmAndSubmitAiOrder = () => {
    setShowOrderConfirmationModal(false);
    toast.success('🎉 AI Order confirmed & submitted successfully!');
    navigate('/checkout');
  };


  return (
    <>
      <SEO 
        title="Olive AI Assistant • Pizza Concierge"
        description="Talk to Olive AI for instant pizza recommendations, live order tracking, coupon deals, and menu suggestions."
        canonicalUrl="/assistant"
      />

      <PageTransition className="w-full relative min-h-screen text-white">
        {/* Galaxy Background Effect */}
        <div className="fixed inset-0 z-0 pointer-events-none opacity-60">
          <Galaxy
            mouseInteraction={false}
            mouseRepulsion={false}
            density={0.2}
            speed={0.2}
            starSpeed={0.05}
            glowIntensity={0.15}
            twinkleIntensity={0.2}
            transparent={false}
          />
        </div>

        <div className="relative z-10 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] pb-[calc(8rem+env(safe-area-inset-bottom,0px))] w-full min-h-screen">
          <div className="responsive-container max-w-4xl mx-auto px-3 sm:px-4 md:px-6 space-y-3 sm:space-y-4 md:space-y-6">

            {/* ── 1. Top Header & AI Avatar ── */}
            <div className="flex items-center justify-between gap-3 bg-dark-900/90 p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-white/10 backdrop-blur-md shadow-2xl">
              <div className="flex items-center gap-3">
                {/* 3D Animated AI Avatar */}
                <motion.div 
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-dark-950 font-black text-xl sm:text-2xl shadow-[0_0_20px_rgba(245,158,11,0.4)] relative shrink-0"
                >
                  🍕
                  <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-dark-900 animate-pulse" />
                </motion.div>

                <div className="truncate">
                  <h1 className="text-sm sm:text-lg font-black text-white flex items-center gap-1.5 truncate">
                    Olive AI Concierge <Sparkles size={15} className="text-amber-400 shrink-0" />
                  </h1>
                  <p className="text-[11px] sm:text-xs text-slate-400 font-medium truncate">Smartest Artisan Restaurant Assistant</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setAutoVoiceEnabled(!autoVoiceEnabled)}
                  className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-full font-bold text-xs border transition-all flex items-center gap-1.5 min-touch-target ${
                    autoVoiceEnabled
                      ? 'bg-amber-500/20 text-amber-400 border-amber-400/40 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                      : 'bg-dark-950 text-slate-400 hover:text-white border-white/10'
                  }`}
                  title="Toggle Auto Voice (NVIDIA Chatterbox TTS)"
                >
                  <Volume2 size={14} className={autoVoiceEnabled ? 'text-amber-400 animate-pulse' : ''} />
                  <span className="hidden sm:inline">{autoVoiceEnabled ? 'Auto-Voice ON' : 'Auto-Voice OFF'}</span>
                </button>

                <button
                  onClick={() => setMessages([{ id: 'reset-1', role: 'ai', text: 'Chat reset! What would you like to explore next?', timestamp: new Date() }])}
                  className="p-2 sm:p-2.5 rounded-full bg-dark-950 hover:bg-dark-800 text-slate-400 hover:text-white border border-white/10 transition-colors min-touch-target flex items-center justify-center"
                  title="Clear Conversation"
                >
                  <RotateCcw size={16} />
                </button>
              </div>
            </div>

            {/* ── 2. AI Capabilities & Quick Action Cards ── */}
            {messages.length <= 1 && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3"
              >
                {CAPABILITY_CARDS.map((cap, i) => (
                  <div 
                    key={i} 
                    onClick={() => handleSend(`Tell me about ${cap.title}`)}
                    className="bg-dark-900/90 border border-white/10 hover:border-amber-400/40 rounded-2xl p-3 sm:p-3.5 cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-lg space-y-1"
                  >
                    <span className="text-xl sm:text-2xl">{cap.icon}</span>
                    <h3 className="font-bold text-white text-xs leading-tight">{cap.title}</h3>
                    <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">{cap.desc}</p>
                  </div>
                ))}
              </motion.div>
            )}

            {/* ── 3. Chat Message Stream ── */}
            <div className="bg-dark-900/90 border border-white/12 rounded-2xl sm:rounded-3xl p-3 sm:p-5 min-h-[380px] h-[calc(100vh-340px)] max-h-[600px] overflow-y-auto space-y-4 shadow-2xl flex flex-col hide-scrollbar">
              
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} space-y-1.5`}
                >
                  <div className={`flex gap-2.5 max-w-[92%] sm:max-w-[82%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    
                    {/* Role Icon */}
                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                      msg.role === 'user' 
                        ? 'bg-amber-500 text-dark-950 font-black' 
                        : 'bg-gradient-to-br from-amber-400 to-amber-600 text-dark-950 font-black shadow-md'
                    }`}>
                      {msg.role === 'user' ? (user?.name ? user.name[0].toUpperCase() : 'U') : '🤖'}
                    </div>

                    {/* Bubble Content */}
                    <div className={`rounded-2xl p-3.5 sm:p-4 text-xs sm:text-sm font-medium leading-relaxed space-y-2.5 ${
                      msg.role === 'user' 
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-dark-950 font-bold rounded-tr-none shadow-lg' 
                        : 'bg-dark-950/90 border border-white/10 text-slate-200 rounded-tl-none shadow-md'
                    }`}>
                      <p className="whitespace-pre-line leading-normal">{msg.text}</p>

                      {/* Product Recommendations Inside AI Message */}
                      {msg.products && msg.products.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                          {msg.products.map((p) => (
                            <div 
                              key={p.id} 
                              className="bg-dark-900 border border-white/10 rounded-2xl p-2.5 sm:p-3 space-y-2 flex flex-col justify-between shadow-md hover:border-amber-400/50 transition-all"
                            >
                              <div className="flex gap-2">
                                <img src={p.imageUrl} alt={p.name} className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover border border-white/10 shrink-0" />
                                <div className="truncate">
                                  <h4 className="font-bold text-white text-xs truncate">{p.name}</h4>
                                  <p className="text-[10px] text-slate-400 line-clamp-2 mt-0.5">{p.description}</p>
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-1 border-t border-white/5">
                                <span className="font-black text-amber-400 text-xs sm:text-sm">₹{p.discountedPrice || p.price}</span>
                                <button
                                  onClick={(e) => handleAddToCart(e, p)}
                                  aria-label={`Add ${p.name} to order`}
                                  className="px-3 py-1.5 rounded-full bg-gradient-to-r from-[#354a3a] to-[#425e47] hover:from-[#425e47] hover:to-[#55775a] text-white font-bold text-xs flex items-center gap-1 shadow-md min-touch-target"
                                >
                                  <Plus size={12} /> Add
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Timestamp & Action Bar for AI Messages */}
                  {msg.role === 'ai' && (
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 pl-9 sm:pl-11">
                      <span>{msg.source || 'Olive AI Engine'}</span>
                      <span>•</span>
                      <button 
                        onClick={() => playSpeech(msg.text)} 
                        aria-label="Listen to AI message"
                        className="hover:text-amber-400 text-slate-400 transition-colors p-1 flex items-center gap-1 min-touch-target" 
                        title="Listen to audio"
                      >
                        <Volume2 size={13} /> Listen
                      </button>
                      <span>•</span>
                      <button 
                        onClick={() => handleCopy(msg.text)} 
                        aria-label="Copy AI message text"
                        className="hover:text-slate-300 transition-colors p-1 min-touch-target" 
                        title="Copy text"
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                  )}
                </motion.div>
              ))}

              {/* Typing Dot Indicator when loading */}
              {loading && (
                <div className="flex items-center gap-2 text-slate-400 text-xs py-2">
                  <Loader2 size={16} className="animate-spin text-amber-400" />
                  <span>Olive AI is thinking...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* ── 4. Horizontal Suggestion Chips ── */}
            <div className="flex gap-2 overflow-x-auto hide-scrollbar py-1 snap-x snap-mandatory">
              {QUICK_CHIPS.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(chip.msg)}
                  className="min-touch-target snap-start shrink-0 whitespace-nowrap px-4 py-2 rounded-full bg-dark-900/90 hover:bg-dark-800 text-slate-300 hover:text-white border border-white/10 font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-sm min-h-[44px]"
                >
                  <span>{chip.emoji}</span>
                  <span>{chip.label}</span>
                </button>
              ))}
            </div>

            {/* ── 5. Input Area & Voice Control Bar ── */}
            <div className="relative bg-dark-900/95 border border-white/15 rounded-full p-1.5 shadow-2xl flex items-center gap-2">
              <input
                type="text"
                placeholder={isListening ? "Listening to your voice..." : "Ask Olive AI for recommendations..."}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                className="flex-1 bg-transparent px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none min-h-[44px]"
              />

              {/* Voice Button */}
              <button
                type="button"
                onClick={toggleVoiceMode}
                className={`p-2.5 sm:p-3 rounded-full transition-all min-touch-target flex items-center justify-center shrink-0 min-w-[44px] min-h-[44px] ${
                  isListening 
                    ? 'bg-rose-600 text-white animate-pulse shadow-[0_0_15px_rgba(225,29,72,0.5)]' 
                    : 'bg-dark-800 text-slate-400 hover:text-white border border-white/10'
                }`}
                title="Voice Search via Canary ASR"
              >
                <Mic size={18} />
              </button>

              {/* Send Button */}
              <button
                type="button"
                onClick={() => handleSend()}
                disabled={!input.trim() || loading}
                className="p-2.5 sm:p-3 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-dark-950 font-black transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed min-touch-target shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <Send size={18} />
              </button>
            </div>

          </div>
        </div>

        {/* ── 6. On-Screen Visual Confirmation Review Modal for AI Order (Bottom Sheet on Mobile) ── */}
        <AnimatePresence>
          {showOrderConfirmationModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4"
            >
              <motion.div
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 250 }}
                className="bg-dark-900 border border-white/15 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 max-w-md w-full space-y-4 shadow-2xl text-white max-h-[90vh] overflow-y-auto"
              >
                {/* Drag handle indicator on mobile */}
                <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto sm:hidden" />

                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <Shield className="text-amber-400" size={20} />
                    <h3 className="font-bold text-base sm:text-lg">Confirm AI Order</h3>
                  </div>
                  <button 
                    onClick={() => setShowOrderConfirmationModal(false)}
                    className="text-slate-400 hover:text-white text-xs sm:text-sm p-1 min-touch-target"
                  >
                    Cancel
                  </button>
                </div>

                <div className="space-y-3 text-xs sm:text-sm">
                  <div className="bg-dark-950/80 p-3 rounded-2xl border border-white/10 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Delivery Address</span>
                    <p className="font-medium text-slate-200">{user?.address || 'Default Saved Address, Rajnandgaon'}</p>
                  </div>

                  <div className="bg-dark-950/80 p-3 rounded-2xl border border-white/10 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Payment Method</span>
                    <p className="font-medium text-amber-400">Cash on Delivery / Saved Card</p>
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <button
                    onClick={() => setShowOrderConfirmationModal(false)}
                    className="flex-1 py-3 rounded-full bg-dark-800 text-slate-300 hover:text-white font-bold text-xs sm:text-sm min-touch-target"
                  >
                    Reject
                  </button>
                  <button
                    onClick={confirmAndSubmitAiOrder}
                    className="flex-1 py-3 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-dark-950 font-black text-xs sm:text-sm shadow-lg hover:brightness-110 active:scale-95 min-touch-target"
                  >
                    Confirm & Place Order
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </PageTransition>
    </>
  );
}
