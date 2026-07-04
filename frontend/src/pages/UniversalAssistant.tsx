import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation, Link } from 'react-router';
import { useAuthStore, useCartStore } from '../lib/store';
import { Bot, Send, Loader2, Star, Clock, Leaf, Flame, X, ChevronRight, RefreshCw, Zap, Shield } from 'lucide-react';
import PageTransition from '../components/PageTransition';
import { Helmet } from 'react-helmet-async';

interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
  products?: ProductCard[];
  source?: string;
  timestamp: Date;
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

interface PendingAction {
  type: string;
  payload: any;
  label: string;
}

const QUICK_CHIPS = [
  '🍕 Show me pizzas',
  '🌶️ Spicy options',
  '🥗 Veg menu',
  '💰 Best deals',
  '🎟️ Active coupons',
  '⏰ Opening hours',
  '🛵 Delivery info',
  '📞 Contact us',
];

const SUGGESTED_FOLLOW_UPS: Record<string, string[]> = {
  pizza: ['Show me spicy pizzas', 'What combos do you have?', 'Veg pizza options?'],
  coupon: ['How do I apply a coupon?', 'Any combo offers?'],
  delivery: ['What are delivery charges?', 'What areas do you deliver?'],
  default: ['Show me your menu', 'Best sellers?', 'What combos do you have?'],
};

function getFollowUps(lastMessage: string): string[] {
  const q = lastMessage.toLowerCase();
  if (q.includes('pizza')) return SUGGESTED_FOLLOW_UPS.pizza;
  if (q.includes('coupon') || q.includes('discount')) return SUGGESTED_FOLLOW_UPS.coupon;
  if (q.includes('delivery')) return SUGGESTED_FOLLOW_UPS.delivery;
  return SUGGESTED_FOLLOW_UPS.default;
}

function ProductCardUI({ product, onViewProduct, onViewSimilar }: { product: ProductCard; onViewProduct: (p: ProductCard) => void; onViewSimilar: (p: ProductCard) => void }) {
  const effectivePrice = product.discountedPrice ?? product.price;
  const hasDiscount = product.discountedPrice && product.discountedPrice < product.price;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-dark-900 border border-white/10 rounded-2xl overflow-hidden flex-shrink-0 w-52 snap-start"
    >
      <div className="relative">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="w-full h-32 object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-32 bg-primary-500/10 flex items-center justify-center">
            <span className="text-4xl">🍕</span>
          </div>
        )}
        <div className="absolute top-2 left-2 flex gap-1">
          {product.isVeg !== undefined && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${product.isVeg ? 'bg-green-500/90 text-white' : 'bg-red-500/90 text-white'}`}>
              {product.isVeg ? <Leaf className="w-3 h-3 inline" /> : '🍗'}
            </span>
          )}
          {hasDiscount && (
            <span className="bg-orange-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
              {Math.round(((product.price - effectivePrice) / product.price) * 100)}% OFF
            </span>
          )}
        </div>
        {!product.isAvailable && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="text-white font-bold text-sm">Unavailable</span>
          </div>
        )}
      </div>

      <div className="p-3">
        <h3 className="font-bold text-white text-sm line-clamp-1">{product.name}</h3>
        <p className="text-slate-400 text-xs line-clamp-2 mt-0.5 mb-2">{product.description}</p>

        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="text-primary-400 font-black text-sm">₹{effectivePrice}</span>
            {hasDiscount && <span className="text-slate-500 text-xs line-through ml-1">₹{product.price}</span>}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            {product.rating && (
              <span className="flex items-center gap-0.5"><Star className="w-3 h-3 text-yellow-400 fill-current" />{product.rating}</span>
            )}
            {product.preparationTime && (
              <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{product.preparationTime}m</span>
            )}
          </div>
        </div>

        <div className="flex gap-1.5">
          <button
            onClick={() => onViewProduct(product)}
            className="flex-1 bg-primary-500 hover:bg-primary-600 text-white text-xs font-bold py-1.5 px-2 rounded-lg transition-colors"
          >
            View
          </button>
          <button
            onClick={() => onViewSimilar(product)}
            className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold py-1.5 px-2 rounded-lg transition-colors"
          >
            Similar
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 150, 300].map(delay => (
        <motion.div
          key={delay}
          className="w-2 h-2 bg-primary-400 rounded-full"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: delay / 1000 }}
        />
      ))}
    </div>
  );
}

export default function UniversalAssistant() {
  const navigate = useNavigate();
  const location = useLocation();
  const { role, isAuthenticated } = useAuthStore();
  const cartStore = useCartStore();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'ai',
      text: `Hey there! 🍕 I'm your Olive Pizza AI Assistant. I know everything about our menu, offers, delivery, and more.\n\nAsk me anything — or pick a quick topic below!`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [followUps, setFollowUps] = useState<string[]>(SUGGESTED_FOLLOW_UPS.default);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [kbStatus, setKbStatus] = useState<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    // Fetch KB status quietly
    fetch('/api/ai/kb-status')
      .then(r => r.json())
      .then(d => { if (d.success) setKbStatus(d); })
      .catch(() => {});
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: text.trim(), timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setFollowUps([]);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          history: messages.slice(-8).map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text })),
          frontendContext: {
            route: location.pathname,
            role: role || 'guest',
            isAuthenticated,
            cart: {
              total: cartStore.total,
              items: cartStore.items.map(i => `${i.quantity}x ${i.name}`),
            },
          },
        }),
      });

      const data = await res.json();

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: data.reply || "I'm here! Ask me anything about Olive Pizza 🍕",
        products: data.products,
        source: data.source,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMsg]);
      setFollowUps(getFollowUps(text));

      // If AI wants to perform an action, show permission dialog
      if (data.action) {
        const { type, payload } = data.action;
        let label = '';
        if (type === 'NAVIGATE') label = `Navigate to ${payload.path}`;
        else if (type === 'VIEW_PRODUCT') label = `Open product details`;
        if (label) setPendingAction({ type, payload, label });
      }
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: "I'm available — let me try again. Ask me anything! 🍕",
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  }, [loading, messages, location.pathname, role, isAuthenticated, cartStore]);

  const handleViewProduct = useCallback((product: ProductCard) => {
    setPendingAction({
      type: 'NAVIGATE',
      payload: { path: `/product/${product.id}` },
      label: `Open "${product.name}" page`,
    });
  }, []);

  const handleViewSimilar = useCallback((product: ProductCard) => {
    sendMessage(`Show me products similar to ${product.name}`);
  }, [sendMessage]);

  const executeAction = useCallback(() => {
    if (!pendingAction) return;
    const { type, payload } = pendingAction;
    if (type === 'NAVIGATE') navigate(payload.path);
    else if (type === 'VIEW_PRODUCT') navigate(`/product/${payload.productId}`);
    setPendingAction(null);
  }, [pendingAction, navigate]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const sourceLabel = (source?: string) => {
    if (!source || source === 'local_kb') return { text: 'Local KB', color: 'text-green-400' };
    if (source === 'offline_template') return { text: 'Offline Mode', color: 'text-amber-400' };
    return { text: source.split(' ')[0], color: 'text-blue-400' };
  };

  return (
    <PageTransition className="min-h-[100dvh] bg-dark-950 flex flex-col">
      <Helmet>
        <title>AI Assistant — Olive Pizza</title>
        <meta name="description" content="Ask our AI assistant about menu, offers, delivery, and anything Olive Pizza!" />
      </Helmet>

      {/* Header */}
      <div className="sticky top-0 z-40 bg-dark-950/90 backdrop-blur-md border-b border-white/5 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center shadow-lg shadow-primary-500/30">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-black text-white text-sm">Olive AI Assistant</h1>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              <span className="text-xs text-slate-400">
                {kbStatus ? `${kbStatus.stats?.productCount || 0} products indexed` : 'Connecting...'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded-full">
            <Zap className="w-3 h-3" />
            <span>Always On</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-32">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] ${msg.role === 'user' ? 'order-2' : 'order-1'}`}>
              {msg.role === 'ai' && (
                <div className="w-7 h-7 bg-primary-500 rounded-full flex items-center justify-center mb-1.5 ml-1">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}
              <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-primary-500 text-white rounded-br-sm'
                  : 'bg-dark-800 border border-white/8 text-slate-200 rounded-bl-sm'
              }`}>
                {msg.text}
              </div>

              {/* Source badge */}
              {msg.source && msg.role === 'ai' && (
                <div className={`flex items-center gap-1 mt-1 ml-1 text-[10px] ${sourceLabel(msg.source).color}`}>
                  <Shield className="w-2.5 h-2.5" />
                  {sourceLabel(msg.source).text}
                </div>
              )}

              {/* Product Cards */}
              {msg.products && msg.products.length > 0 && (
                <div className="mt-3 flex gap-3 overflow-x-auto pb-2 snap-x scrollbar-hide">
                  {msg.products.map(p => (
                    <ProductCardUI
                      key={p.id}
                      product={p}
                      onViewProduct={handleViewProduct}
                      onViewSimilar={handleViewSimilar}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-dark-800 border border-white/8 rounded-2xl rounded-bl-sm">
              <TypingDots />
            </div>
          </div>
        )}

        {/* Suggested follow-ups */}
        {followUps.length > 0 && !loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-wrap gap-2 mt-2">
            {followUps.map(fu => (
              <button
                key={fu}
                onClick={() => sendMessage(fu)}
                className="text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 px-3 py-1.5 rounded-full transition-colors"
              >
                {fu}
              </button>
            ))}
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick chips - show only on first message */}
      {messages.length === 1 && (
        <div className="px-4 pb-2">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide snap-x">
            {QUICK_CHIPS.map(chip => (
              <button
                key={chip}
                onClick={() => sendMessage(chip.replace(/^[^\s]+ /, ''))}
                className="flex-shrink-0 snap-start text-xs bg-dark-800 hover:bg-dark-700 border border-white/10 text-slate-200 px-3 py-2 rounded-full transition-colors whitespace-nowrap"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Permission Dialog */}
      <AnimatePresence>
        {pendingAction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center p-4"
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="bg-dark-900 border border-white/10 rounded-2xl w-full max-w-sm p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-primary-500/20 rounded-full flex items-center justify-center">
                  <Shield className="w-5 h-5 text-primary-400" />
                </div>
                <div>
                  <p className="font-bold text-white text-sm">Permission Required</p>
                  <p className="text-xs text-slate-400">AI wants to perform an action</p>
                </div>
              </div>
              <p className="text-slate-200 text-sm mb-6 bg-dark-800 p-3 rounded-xl border border-white/5">
                {pendingAction.label}
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={executeAction}
                  className="w-full bg-primary-500 hover:bg-primary-600 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <ChevronRight className="w-4 h-4" /> Allow Once
                </button>
                <button
                  onClick={() => setPendingAction(null)}
                  className="w-full bg-white/5 hover:bg-white/10 text-slate-300 font-bold py-3 rounded-xl transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="fixed bottom-[72px] md:bottom-0 left-0 right-0 bg-dark-950/95 backdrop-blur-md border-t border-white/5 px-4 py-3">
        <form onSubmit={handleFormSubmit} className="flex gap-2 max-w-2xl mx-auto">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask about menu, offers, delivery..."
            className="flex-1 bg-dark-800 border border-white/10 rounded-full px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-primary-500 transition-colors"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="w-11 h-11 bg-primary-500 hover:bg-primary-600 disabled:opacity-40 text-white rounded-full flex items-center justify-center transition-all active:scale-95 shadow-lg shadow-primary-500/30"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </PageTransition>
  );
}
