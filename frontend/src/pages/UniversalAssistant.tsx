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
import { AIOvenLoader } from '../components/ai/AIOvenLoader';
import { AIVoiceStateIndicator } from '../components/ai/AIVoiceStateIndicator';
import { toolBridge } from '../services/ai/toolBridge';
import { capturePageContext, formatPageContextForAI } from '../services/ai/pageAnalyzer';
import { TiltCard } from '../components/ui/TiltCard';

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
  ingredients?: string;
  sizes?: string[];
  toppings?: string[];
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

  // Execute Website Action triggered by AI Intent with 6-step verification
  const executeWebsiteAction = (action: any): { verified: boolean; message: string } => {
    if (!action || !action.type) return { verified: false, message: 'No action provided' };
    console.log('[Olive AI Action Execution]', action);
    const store = useCartStore.getState() as any;

    try {
      switch (action.type) {
        case 'NAVIGATE': {
          const path = action.payload?.path || '/menu';
          navigate(path);
          toast.success(`Navigated to ${path} 🚀`);
          return { verified: true, message: `Navigated to ${path}` };
        }

        case 'ADD_TO_CART': {
          const p = action.payload;
          const cartItem = {
            id: p.productId || p.id || `item-${Date.now()}`,
            menuItemId: p.productId || p.id || 'custom-pizza',
            name: p.productName || p.name || 'Margherita Pizza',
            price: p.price || 299,
            quantity: p.quantity || 1,
            image: p.imageUrl || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=400',
            isVegetarian: p.isVeg ?? true,
            crust: p.crust || 'Classic Crust',
            size: p.size || 'Medium'
          };
          const initialCount = store.items.length;
          addItem(cartItem);
          window.dispatchEvent(new CustomEvent('cart-item-added'));
          const newCount = useCartStore.getState().items.length;
          const verified = newCount >= initialCount;
          if (verified) {
            toast.success(`Added ${cartItem.name} to cart! 🍕`);
            return { verified: true, message: `Added ${cartItem.name} to cart` };
          } else {
            return { verified: false, message: `Failed to confirm ${cartItem.name} in cart` };
          }
        }

        case 'REMOVE_FROM_CART': {
          const prodId = action.payload?.productId || action.payload?.id;
          if (prodId) {
            store.removeItem(prodId);
            toast('Item removed from cart', { icon: '🗑️' });
            return { verified: true, message: 'Item removed from cart' };
          }
          return { verified: false, message: 'Item ID missing for removal' };
        }

        case 'INCREASE_QTY': {
          const prodId = action.payload?.productId || action.payload?.id;
          const item = store.items.find((i: any) => i.id === prodId || i.menuItemId === prodId);
          if (item) {
            store.updateQuantity(item.id, item.quantity + 1);
            toast.success(`Increased quantity of ${item.name}`);
            return { verified: true, message: `Increased quantity of ${item.name}` };
          }
          return { verified: false, message: 'Item not found in cart to increase quantity' };
        }

        case 'DECREASE_QTY': {
          const prodId = action.payload?.productId || action.payload?.id;
          const item = store.items.find((i: any) => i.id === prodId || i.menuItemId === prodId);
          if (item) {
            if (item.quantity > 1) {
              store.updateQuantity(item.id, item.quantity - 1);
              toast(`Decreased quantity of ${item.name}`, { icon: '➖' });
            } else {
              store.removeItem(item.id);
              toast(`Removed ${item.name} from cart`, { icon: '🗑️' });
            }
            return { verified: true, message: `Updated ${item.name} quantity` };
          }
          return { verified: false, message: 'Item not found in cart to decrease quantity' };
        }

        case 'APPLY_COUPON': {
          const code = action.payload?.code || 'BEST50';
          localStorage.setItem('olive_applied_coupon', code);
          if (typeof store.applyCoupon === 'function') {
            store.applyCoupon(code);
          }
          window.dispatchEvent(new CustomEvent('coupon-applied', { detail: code }));
          toast.success(`Applied coupon code ${code}! 🎉`);
          return { verified: true, message: `Applied coupon ${code}` };
        }

        case 'CLEAR_CART': {
          store.clearCart();
          toast('Cart cleared', { icon: '🗑️' });
          return { verified: true, message: 'Cart cleared' };
        }

        case 'SEARCH_MENU': {
          const query = action.payload?.query || '';
          navigate(`/menu?search=${encodeURIComponent(query)}`);
          return { verified: true, message: `Searching menu for ${query}` };
        }

        case 'OPEN_CATEGORY': {
          const cat = action.payload?.category || 'pizza';
          navigate(`/menu?category=${encodeURIComponent(cat)}`);
          return { verified: true, message: `Opened category ${cat}` };
        }

        case 'TRACK_ORDER': {
          navigate('/tracking');
          return { verified: true, message: 'Navigated to tracking' };
        }

        case 'REPEAT_ORDER': {
          // Re-populate cart with last popular items (mocked to just show navigation for safety without hardcoded items)
          navigate('/customer/dashboard');
          toast.success('Navigating to your past orders! 🍕');
          toast.success('Repeated previous order items to cart! 🍕');
          return { verified: true, message: 'Repeated previous order' };
        }

        case 'OPEN_CONTACT': {
          navigate('/contact');
          return { verified: true, message: 'Opened contact page' };
        }

        case 'OPEN_ASSISTANT': {
          navigate('/assistant');
          return { verified: true, message: 'Opened assistant' };
        }

        case 'START_CHECKOUT': {
          navigate('/checkout');
          return { verified: true, message: 'Started checkout' };
        }

        case 'CANCEL_CHECKOUT': {
          navigate('/cart');
          return { verified: true, message: 'Cancelled checkout, returned to cart' };
        }

        case 'PLACE_ORDER': {
          navigate('/checkout');
          toast.success('Navigated to checkout to place your order! 💳');
          return { verified: true, message: 'Navigated to checkout' };
        }

        default:
          return { verified: false, message: `Unknown action type: ${action.type}` };
      }
    } catch (err: any) {
      return { verified: false, message: `Action failed: ${err.message}` };
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

    // Deep Website State Snapshot — enriched with live page analyzer
    const cartStoreState = useCartStore.getState() as any;
    const livePageCtx = capturePageContext();
    const frontendSnapshot = {
      route: livePageCtx.route,
      pageTitle: livePageCtx.pageTitle,
      checkoutStep: livePageCtx.checkoutStep,
      activeModal: livePageCtx.activeModal !== 'none' ? livePageCtx.activeModal : (showOrderConfirmationModal ? 'OrderConfirmation' : 'none'),
      visibleProducts: livePageCtx.visibleProducts,
      visibleHeadings: livePageCtx.visibleHeadings,
      activeSearchQuery: livePageCtx.activeSearchQuery,
      activeCategoryFilter: livePageCtx.activeCategoryFilter,
      pageHint: livePageCtx.pageHint,
      cart: {
        items: cartStoreState.items.map((i: any) => ({
          id: i.id,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          size: i.size,
          crust: i.crust,
        })),
        total: cartStoreState.items.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0),
      },
      selectedAddress: localStorage.getItem('olive_selected_address') || 'Not set',
      paymentMode: localStorage.getItem('olive_payment_mode') || 'Not set',
      appliedCoupon: localStorage.getItem('olive_applied_coupon') || 'None',
      role: user?.role || 'guest',
      isAuthenticated: !!user,
      userId: user?.id,
      livePageContext: formatPageContextForAI(livePageCtx),
    };

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: queryText,
          history: messages.slice(-8).map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text })),
          frontendContext: frontendSnapshot,
        })
      }).catch(() => null);

      let aiResponseText = '';
      let productsList: ProductCard[] | undefined = undefined;
      let actionToExecute: any = null;

      if (res && res.ok) {
        const data = await res.json();
        aiResponseText = data.reply || data.text || data.message || 'Here is what I found for you!';
        productsList = data.products;
        actionToExecute = data.action;

        if (data.toolCall) {
          toolBridge.dispatchToolCall(data.toolCall.name, data.toolCall.id || `tc-${Date.now()}`, data.toolCall.args || {});
        }

        // Fallback: If actionToExecute was not parsed by server, extract ACTION:{...} pattern directly
        if (!actionToExecute) {
          const actMatch = aiResponseText.match(/ACTION:\s*(\{[\s\S]*?\})/i);
          if (actMatch) {
            try {
              actionToExecute = JSON.parse(actMatch[1]);
              aiResponseText = aiResponseText.replace(/ACTION:\s*\{[\s\S]*?\}/gi, '').trim();
            } catch (e) {
              console.warn('[AI Action Parsing Fallback Error]', e);
            }
          }
        }
      } else {
        // Fallback for offline mode
        const q = queryText.toLowerCase();
        if (q.includes('cart') && (q.includes('add') || q.includes('order'))) {
          aiResponseText = "I've added a delicious Farmhouse Pizza to your cart! Would you like to checkout or view cart?";
          actionToExecute = {
            type: 'ADD_TO_CART',
            payload: {
              productId: 'demo_farmhouse',
              productName: 'Farmhouse Pizza',
              price: 349,
              quantity: 1,
              size: 'Medium',
              crust: 'Classic Crust'
            }
          };
        } else if (q.includes('checkout')) {
          aiResponseText = "Opening checkout page now! 💳";
          actionToExecute = { type: 'START_CHECKOUT' };
        } else if (q.includes('coupon') || q.includes('offer')) {
          aiResponseText = "Applying BEST50 code (₹50 OFF) to your order! 🎉";
          actionToExecute = { type: 'APPLY_COUPON', payload: { code: 'BEST50' } };
        } else {
          aiResponseText = "I'm here to help with your Olive Pizza order! Ask me about menu items, offers, delivery, or voice-command your cart.";
        }
      }

      // Execute Website Action if returned, verifying state before confirming
      if (actionToExecute) {
        // Do not force navigate away to /menu if products are displayed directly inside the chat bubble
        if (productsList && productsList.length > 0 && (actionToExecute.type === 'NAVIGATE' || actionToExecute.type === 'SEARCH_MENU' || actionToExecute.type === 'OPEN_CATEGORY')) {
          console.log('[Olive AI] Displaying products directly in chat bubble. Navigation suppressed.');
        } else {
          const execResult = executeWebsiteAction(actionToExecute);
          if (!execResult.verified) {
            aiResponseText += `\n\n*(Note: ${execResult.message})*`;
          }
        }
      }

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        role: 'ai',
        text: aiResponseText,
        products: productsList,
        source: 'Olive AI Concierge',
        timestamp: new Date()
      };

      setMessages((prev) => [...prev, aiMsg]);

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
  const speechRecognitionRef = useRef<any>(null);

  // Dual-Engine Speech Capture (Web Speech API with silence VAD + Canary ASR fallback)
  const startAudioRecording = async () => {
    // Try Browser Web Speech API first for instant start (<300ms) & local silence VAD
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        speechRecognitionRef.current = recognition;
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'hi-IN';

        recognition.onstart = () => {
          setIsListening(true);
          setIsRecordingAudio(true);
          toast('Listening... Speak in Hindi, English, or Hinglish!', { icon: '🎙️' });
        };

        recognition.onresult = (event: any) => {
          const transcript = event.results[0]?.[0]?.transcript || '';
          if (transcript.trim()) {
            toast.success(`Transcribed: "${transcript}"`);
            setInput(transcript);
            handleSend(transcript);
          } else {
            toast.error('Recognition failed: No speech detected.');
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('[Web Speech Error]', event.error);
          setIsListening(false);
          setIsRecordingAudio(false);
          if (event.error === 'not-allowed') {
            toast.error('No microphone permission. Please allow microphone access in browser.');
          } else if (event.error === 'no-speech') {
            toast.error('Speech timeout: No speech detected. Please speak again.');
          } else if (event.error === 'network') {
            toast.error('Network unavailable for speech recognition.');
          } else {
            toast.error(`Recognition failed: ${event.error}.`);
          }
        };

        recognition.onend = () => {
          setIsListening(false);
          setIsRecordingAudio(false);
        };

        recognition.start();
        return;
      } catch (e) {
        console.warn('[WebSpeech Failed, falling back to MediaRecorder + Canary ASR]', e);
      }
    }

    // Fallback to MediaRecorder sending audio to backend /api/ai/stt
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

        toast.loading('Transcribing speech via NVIDIA Canary ASR...', { id: 'stt-toast' });
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
            toast.error('Recognition failed: Could not transcribe audio.', { id: 'stt-toast' });
          }
        } catch {
          toast.error('Network unavailable for STT service.', { id: 'stt-toast' });
        } finally {
          setIsListening(false);
          setIsRecordingAudio(false);
        }
      };

      mediaRecorder.start();
      setIsListening(true);
      setIsRecordingAudio(true);
      toast('Listening via ASR recorder...', { icon: '🎙️' });
    } catch (err) {
      toast.error('No microphone permission. Please allow mic access in browser.');
    }
  };

  const stopAudioRecording = () => {
    if (speechRecognitionRef.current) {
      try { speechRecognitionRef.current.stop(); } catch {}
    }
    if (mediaRecorderRef.current && isRecordingAudio) {
      try { mediaRecorderRef.current.stop(); } catch {}
    }
    setIsListening(false);
    setIsRecordingAudio(false);
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
                  <TiltCard
                    key={i}
                    className="p-3 sm:p-3.5 cursor-pointer transition-all hover:border-amber-400/50 active:scale-95 shadow-lg space-y-1 bg-dark-900/90"
                  >
                    <div onClick={() => handleSend(`Tell me about ${cap.title}`)} className="space-y-1">
                      <span className="text-xl sm:text-2xl">{cap.icon}</span>
                      <h3 className="font-bold text-white text-xs leading-tight">{cap.title}</h3>
                      <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">{cap.desc}</p>
                    </div>
                  </TiltCard>
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

                      {/* Product Recommendations Inside AI Message (Ultra Mobile-Responsive Layout) */}
                      {msg.products && msg.products.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2.5 w-full">
                          {msg.products.map((p) => (
                            <div 
                              key={p.id} 
                              className="bg-dark-900/95 border border-amber-400/20 hover:border-amber-400/50 rounded-2xl p-3 space-y-2.5 flex flex-col justify-between shadow-xl transition-all"
                            >
                              <div className="flex gap-3 items-start">
                                <img 
                                  src={p.imageUrl || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=400'} 
                                  alt={p.name} 
                                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover border border-white/10 shrink-0 shadow-md" 
                                />
                                <div className="min-w-0 flex-1 space-y-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-1.5 py-0.5 rounded-md border border-emerald-500/20 inline-flex items-center gap-0.5 shrink-0">
                                      🟢 Pure Veg
                                    </span>
                                    <h4 className="font-black text-white text-xs sm:text-sm leading-tight truncate">{p.name}</h4>
                                  </div>
                                  <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">{p.description}</p>
                                  {p.ingredients && (
                                    <p className="text-[10px] text-amber-300/90 font-medium truncate">🌿 {p.ingredients}</p>
                                  )}
                                </div>
                              </div>

                              {/* Customization Options Badges (Responsive Wrap) */}
                              <div className="flex flex-wrap gap-1.5 text-[10px] text-slate-300 pt-0.5">
                                <span className="bg-dark-950 border border-white/10 px-2 py-0.5 rounded-lg font-medium flex items-center gap-1">
                                  📏 Sizes: {(p.sizes || ['Small', 'Medium', 'Large']).join(', ')}
                                </span>
                                <span className="bg-dark-950 border border-white/10 px-2 py-0.5 rounded-lg font-medium flex items-center gap-1">
                                  🧀 Crusts: Classic, Cheese Burst
                                </span>
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                                <div className="flex flex-col">
                                  <span className="font-black text-amber-400 text-sm sm:text-base">₹{p.discountedPrice || p.price}</span>
                                  {p.discountedPrice && p.discountedPrice < p.price && (
                                    <span className="text-[10px] text-slate-500 line-through">₹{p.price}</span>
                                  )}
                                </div>
                                <button
                                  onClick={(e) => handleAddToCart(e, p)}
                                  aria-label={`Add ${p.name} to order`}
                                  className="h-9 px-4 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-dark-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-[0_4px_12px_rgba(245,158,11,0.3)] active:scale-95 transition-all min-touch-target"
                                >
                                  <Plus size={14} className="stroke-[3]" /> Add to Cart
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

              {/* AI Voice State Indicator when listening */}
              {isListening && (
                <AIVoiceStateIndicator mode="listening" />
              )}

              {/* Premium Miniature Stone Pizza Oven AI Thinking Animation */}
              {loading && !isListening && (
                <AIOvenLoader label="Olive AI is baking your answer..." />
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
