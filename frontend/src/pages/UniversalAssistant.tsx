import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router';
import { useAuthStore, useCartStore } from '../lib/store';
import {
  Bot, Send, Loader2, Star, Clock, Leaf, Zap, Shield, ShoppingCart,
  CheckCircle, AlertTriangle, ChevronRight, Tag, Navigation,
} from 'lucide-react';
import PageTransition from '../components/PageTransition';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';

// ── Types ─────────────────────────────────────────────────────────────────────
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
  icon: any;
  danger?: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const QUICK_CHIPS = [
  { emoji: '🍕', label: 'Show pizzas', msg: 'Show me all pizzas' },
  { emoji: '🌶️', label: 'Spicy options', msg: 'Show spicy options' },
  { emoji: '🥗', label: 'Veg menu', msg: 'Show vegetarian options' },
  { emoji: '💰', label: 'Best deals', msg: 'What are your best deals?' },
  { emoji: '🎟️', label: 'Coupons', msg: 'Any active coupons?' },
  { emoji: '⏰', label: 'Timings', msg: 'What are your opening hours?' },
  { emoji: '🛵', label: 'Delivery', msg: 'Delivery charges and areas?' },
  { emoji: '📞', label: 'Contact', msg: 'How do I contact Olive Pizza?' },
];

const FOLLOW_UP_MAP: Record<string, string[]> = {
  pizza:    ['Show me spicy pizzas 🌶️', 'Veg pizza options? 🥗', 'Best combo deals? 💰'],
  coupon:   ['How do I apply a coupon?', 'Any combo offers? 🎁'],
  delivery: ['What are the delivery charges?', 'Which areas do you deliver?'],
  cart:     ['Go to cart 🛒', 'Apply a coupon?', 'Go to checkout'],
  default:  ['Show me the menu 🍕', 'Best sellers?', 'Any offers today?'],
};

function getFollowUps(msg: string): string[] {
  const q = msg.toLowerCase();
  if (q.includes('pizza') || q.includes('food') || q.includes('menu')) return FOLLOW_UP_MAP.pizza;
  if (q.includes('coupon') || q.includes('discount') || q.includes('offer')) return FOLLOW_UP_MAP.coupon;
  if (q.includes('deliver')) return FOLLOW_UP_MAP.delivery;
  if (q.includes('cart') || q.includes('add') || q.includes('order')) return FOLLOW_UP_MAP.cart;
  return FOLLOW_UP_MAP.default;
}

// ── Sub-components ────────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3">
      {[0, 0.15, 0.3].map(delay => (
        <motion.div
          key={delay}
          className="w-2 h-2 bg-primary-400 rounded-full"
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 0.55, repeat: Infinity, delay }}
        />
      ))}
    </div>
  );
}

function SourceBadge({ source }: { source?: string }) {
  if (!source) return null;
  const config =
    source === 'local_kb'         ? { text: 'Instant · Local KB', color: 'text-emerald-400', bg: 'bg-emerald-400/10' } :
    source === 'offline_template' ? { text: 'Offline Mode', color: 'text-amber-400', bg: 'bg-amber-400/10' } :
    source.includes('Gemini')     ? { text: `${source}`, color: 'text-blue-400', bg: 'bg-blue-400/10' } :
    source.includes('NVIDIA')     ? { text: `${source}`, color: 'text-green-400', bg: 'bg-green-400/10' } :
                                    { text: source, color: 'text-slate-400', bg: 'bg-white/5' };
  return (
    <div className={`inline-flex items-center gap-1 mt-1 ml-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${config.color} ${config.bg}`}>
      <Shield className="w-2.5 h-2.5" />
      {config.text}
    </div>
  );
}

function ProductMiniCard({ product, onView, onSimilar, onAddToCart }: {
  product: ProductCard;
  onView: (p: ProductCard) => void;
  onSimilar: (p: ProductCard) => void;
  onAddToCart: (p: ProductCard) => void;
}) {
  const price = product.discountedPrice ?? product.price;
  const hasDiscount = product.discountedPrice && product.discountedPrice < product.price;
  const discountPct = hasDiscount ? Math.round(((product.price - price) / product.price) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-shrink-0 w-48 bg-dark-900 border border-white/8 rounded-2xl overflow-hidden snap-start"
    >
      <div className="relative">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="w-full h-28 object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-28 bg-primary-500/10 flex items-center justify-center text-4xl">🍕</div>
        )}
        <div className="absolute top-2 left-2 flex gap-1">
          {product.isVeg !== undefined && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${product.isVeg ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
              {product.isVeg ? <Leaf className="w-2.5 h-2.5 inline" /> : '🍗'}
            </span>
          )}
          {discountPct > 0 && (
            <span className="bg-orange-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded">{discountPct}% OFF</span>
          )}
        </div>
        {!product.isAvailable && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="text-white font-bold text-xs">Unavailable</span>
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="font-bold text-white text-xs line-clamp-1">{product.name}</p>
        <p className="text-slate-500 text-[11px] line-clamp-2 mt-0.5 mb-2">{product.description}</p>
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="text-primary-400 font-black text-sm">₹{price}</span>
            {hasDiscount && <span className="text-slate-600 text-[10px] line-through ml-1">₹{product.price}</span>}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
            {product.rating && <span className="flex items-center gap-0.5"><Star className="w-2.5 h-2.5 text-yellow-400 fill-current" />{product.rating}</span>}
            {product.preparationTime && <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{product.preparationTime}m</span>}
          </div>
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => onView(product)} className="flex-1 bg-white/8 hover:bg-white/12 text-slate-300 text-[11px] font-bold py-1.5 rounded-lg transition-colors">View</button>
          {product.isAvailable !== false && (
            <button onClick={() => onAddToCart(product)} className="flex-1 bg-primary-500 hover:bg-primary-600 text-white text-[11px] font-bold py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1">
              <ShoppingCart className="w-3 h-3" /> Add
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function UniversalAssistant() {
  const navigate = useNavigate();
  const location = useLocation();
  const { role, isAuthenticated } = useAuthStore();
  const cartStore = useCartStore();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'ai',
      text: `Hey there! 🍕 I'm your Olive Pizza AI Assistant.\n\nI know our full menu, all current deals, delivery details, and more — all in real time.\n\nAsk me anything, or tap a quick topic below!`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [followUps, setFollowUps] = useState<string[]>(FOLLOW_UP_MAP.default);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [kbStatus, setKbStatus] = useState<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    fetch('/api/ai/kb-status')
      .then(r => r.json())
      .then(d => { if (d.success) setKbStatus(d); })
      .catch(() => {});
  }, []);

  // ── Action parser: convert AI response action into PendingAction ─────────────
  const buildPendingAction = useCallback((action: any): PendingAction | null => {
    if (!action?.type) return null;
    const { type, payload } = action;

    if (type === 'NAVIGATE') {
      const path = payload?.path || '/';
      const labels: Record<string, string> = {
        '/menu': 'Open the Menu page 🍕',
        '/cart': 'Open your Cart 🛒',
        '/checkout': 'Proceed to Checkout 💳',
        '/dashboard': 'Open your Orders Dashboard 📦',
      };
      const label = labels[path] || (path.includes('/product/') ? 'Open product page' : `Navigate to ${path}`);
      return { type, payload, label, icon: Navigation };
    }

    if (type === 'ADD_TO_CART') {
      const { productName, price, quantity = 1, variant } = payload;
      const label = `Add ${quantity}× ${productName}${variant ? ` (${variant})` : ''} — ₹${price * quantity} to cart`;
      return { type, payload, label, icon: ShoppingCart };
    }

    if (type === 'APPLY_COUPON') {
      return { type, payload, label: `Apply coupon code: ${payload.code}`, icon: Tag };
    }

    return null;
  }, []);

  // ── Execute approved action ───────────────────────────────────────────────────
  const executeAction = useCallback(() => {
    if (!pendingAction) return;
    const { type, payload } = pendingAction;

    try {
      if (type === 'NAVIGATE') {
        navigate(payload.path);
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'ai',
          text: `Done! Taking you there now 🚀`,
          timestamp: new Date(),
        }]);
      }

      if (type === 'ADD_TO_CART') {
        const { productId, productName, price, quantity = 1, variant, imageUrl } = payload;
        // Validate product data before adding
        if (!productId || !productName || typeof price !== 'number') {
          toast.error('Could not add to cart — invalid product data.');
          setPendingAction(null);
          return;
        }
        cartStore.addItem({
          id: productId,
          menuItemId: productId,
          name: productName,
          price: price,
          quantity: quantity,
          variant: variant || undefined,
          image: imageUrl || '',
        });
        toast.success(`🍕 ${productName} added to cart!`);
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'ai',
          text: `Done! ✅ **${quantity}× ${productName}** has been added to your cart.\n\nWant to checkout or keep browsing?`,
          timestamp: new Date(),
        }]);
        setFollowUps(['Go to cart 🛒', 'Continue shopping 🍕', 'Apply a coupon? 🎟️']);
      }

      if (type === 'APPLY_COUPON') {
        // Navigate to cart/checkout where coupon can be entered
        // Dispatch custom event for coupon listeners if they exist
        window.dispatchEvent(new CustomEvent('apply-coupon', { detail: { code: payload.code } }));
        toast.success(`Coupon ${payload.code} applied! 🎉`);
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'ai',
          text: `Coupon **${payload.code}** applied! 🎟️ Head to checkout to see your discount.`,
          timestamp: new Date(),
        }]);
      }
    } catch (err: any) {
      console.error('[Assistant] Action execution error:', err.message);
      toast.error('Action failed. Please try manually.');
    }

    setPendingAction(null);
  }, [pendingAction, navigate, cartStore]);

  // ── Send message to backend ───────────────────────────────────────────────────
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
          history: messages.slice(-10).map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text })),
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

      // Parse action → show permission dialog
      if (data.action) {
        const pending = buildPendingAction(data.action);
        if (pending) setPendingAction(pending);
      }
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: "I ran into a quick blip, but I'm back! Ask me anything 🍕",
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  }, [loading, messages, location.pathname, role, isAuthenticated, cartStore, buildPendingAction]);

  // ── Product card actions ──────────────────────────────────────────────────────
  const onViewProduct = useCallback((product: ProductCard) => {
    setPendingAction({
      type: 'NAVIGATE',
      payload: { path: `/product/${product.id}` },
      label: `Open "${product.name}" product page`,
      icon: Navigation,
    });
  }, []);

  const onSimilar = useCallback((product: ProductCard) => {
    sendMessage(`Show me products similar to ${product.name}`);
  }, [sendMessage]);

  const onAddToCartFromCard = useCallback((product: ProductCard) => {
    const price = product.discountedPrice ?? product.price;
    setPendingAction({
      type: 'ADD_TO_CART',
      payload: {
        productId: product.id,
        productName: product.name,
        price,
        quantity: 1,
        imageUrl: product.imageUrl,
      },
      label: `Add 1× ${product.name} — ₹${price} to cart`,
      icon: ShoppingCart,
    });
  }, []);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const activeProvider = kbStatus?.providers?.activeProvider;
  const kbReady = kbStatus?.isReady;

  return (
    <PageTransition className="min-h-[100dvh] bg-dark-950 flex flex-col">
      <Helmet>
        <title>AI Assistant — Olive Pizza</title>
        <meta name="description" content="Ask our AI assistant about menu, offers, delivery, and anything Olive Pizza!" />
      </Helmet>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 bg-dark-950/95 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg shadow-primary-500/30">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-dark-950 animate-pulse" />
          </div>
          <div>
            <h1 className="font-black text-white text-sm">Olive AI Assistant</h1>
            <p className="text-[11px] text-slate-400">
              {kbReady
                ? `${kbStatus.stats?.productCount || 0} items · ${activeProvider && activeProvider !== 'none' ? activeProvider : 'Local KB'}`
                : 'Connecting to knowledge base...'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2.5 py-1 rounded-full">
          <Zap className="w-3 h-3" />
          <span>Always On</span>
        </div>
      </div>

      {/* ── Messages ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5 pb-36">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[88%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
              {msg.role === 'ai' && (
                <div className="w-7 h-7 bg-primary-500 rounded-full flex items-center justify-center mb-1.5">
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
              )}
              <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-gradient-to-br from-primary-500 to-orange-600 text-white rounded-br-sm shadow-lg shadow-primary-500/20'
                  : 'bg-dark-800/80 border border-white/8 text-slate-100 rounded-bl-sm'
              }`}>
                {msg.text}
              </div>

              <SourceBadge source={msg.source} />

              {/* Product cards */}
              {msg.products && msg.products.length > 0 && (
                <div className="mt-3 flex gap-3 overflow-x-auto pb-2 snap-x" style={{ scrollbarWidth: 'none' }}>
                  {msg.products.map(p => (
                    <ProductMiniCard
                      key={p.id}
                      product={p}
                      onView={onViewProduct}
                      onSimilar={onSimilar}
                      onAddToCart={onAddToCartFromCard}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-dark-800/80 border border-white/8 rounded-2xl rounded-bl-sm">
              <TypingDots />
            </div>
          </div>
        )}

        {/* Suggested follow-ups */}
        <AnimatePresence>
          {followUps.length > 0 && !loading && messages.length > 1 && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-wrap gap-2">
              {followUps.map(fu => (
                <button
                  key={fu}
                  onClick={() => sendMessage(fu.replace(/[^\w\s]/g, '').trim())}
                  className="text-xs bg-dark-800/60 hover:bg-dark-700 border border-white/10 text-slate-300 px-3 py-1.5 rounded-full transition-colors"
                >
                  {fu}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* ── Quick chips (first message only) ────────────────────────────────── */}
      {messages.length === 1 && !loading && (
        <div className="px-4 pb-2">
          <div className="flex gap-2 overflow-x-auto pb-1 snap-x" style={{ scrollbarWidth: 'none' }}>
            {QUICK_CHIPS.map(chip => (
              <button
                key={chip.label}
                onClick={() => sendMessage(chip.msg)}
                className="flex-shrink-0 snap-start text-xs bg-dark-800/80 hover:bg-dark-700 border border-white/10 text-slate-200 px-3 py-2 rounded-full transition-colors whitespace-nowrap"
              >
                {chip.emoji} {chip.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Permission Dialog ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {pendingAction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end justify-center p-4"
            onClick={() => setPendingAction(null)}
          >
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="bg-dark-900 border border-white/10 rounded-2xl w-full max-w-sm p-6 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-primary-500/15 border border-primary-500/25 rounded-full flex items-center justify-center">
                  <Shield className="w-5 h-5 text-primary-400" />
                </div>
                <div>
                  <p className="font-black text-white text-sm">AI Action — Permission Required</p>
                  <p className="text-xs text-slate-400">Review before allowing</p>
                </div>
              </div>

              {/* Action label */}
              <div className="bg-dark-800/80 border border-white/8 rounded-xl px-4 py-3 mb-5 flex items-center gap-3">
                <pendingAction.icon className="w-5 h-5 text-primary-400 flex-shrink-0" />
                <p className="text-sm text-slate-200 font-medium">{pendingAction.label}</p>
              </div>

              {/* Buttons */}
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={executeAction}
                  className="w-full bg-gradient-to-r from-primary-500 to-orange-500 hover:from-primary-600 hover:to-orange-600 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20"
                >
                  <CheckCircle className="w-4 h-4" /> Allow
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

      {/* ── Input bar ────────────────────────────────────────────────────────── */}
      <div className="fixed bottom-[72px] md:bottom-0 left-0 right-0 bg-dark-950/98 backdrop-blur-xl border-t border-white/5 px-4 py-3 z-30">
        <form onSubmit={handleFormSubmit} className="flex gap-2 max-w-2xl mx-auto">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask about menu, offers, delivery…"
            className="flex-1 bg-dark-800/80 border border-white/10 hover:border-white/20 focus:border-primary-500 rounded-full px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none transition-colors"
            disabled={loading}
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="w-11 h-11 bg-gradient-to-br from-primary-500 to-orange-500 hover:from-primary-600 hover:to-orange-600 disabled:opacity-40 text-white rounded-full flex items-center justify-center transition-all active:scale-90 shadow-lg shadow-primary-500/30"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </PageTransition>
  );
}
