import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types ──────────────────────────────────────────────────────────────────
export interface FlyingItemData {
  id: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  image: string;
}

interface CartAnimationContextType {
  triggerAnimation: (
    e: React.MouseEvent | React.TouchEvent | { clientX: number; clientY: number },
    image: string,
    onComplete?: () => void
  ) => void;
}

const CartAnimationContext = createContext<CartAnimationContextType | undefined>(undefined);

// ─── Zero-Latency Audio Synthesizer ─────────────────────────────────────────
export const playCartDropSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // 1. Impact Bass Thud (Satisfying physical landing)
    const oscBass = ctx.createOscillator();
    const gainBass = ctx.createGain();
    oscBass.type = 'triangle';
    oscBass.frequency.setValueAtTime(200, now);
    oscBass.frequency.exponentialRampToValueAtTime(45, now + 0.14);
    gainBass.gain.setValueAtTime(0.3, now);
    gainBass.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    oscBass.connect(gainBass);
    gainBass.connect(ctx.destination);
    oscBass.start(now);
    oscBass.stop(now + 0.18);

    // 2. Bright Golden Ding (Sweet chime on drop)
    const oscChime = ctx.createOscillator();
    const gainChime = ctx.createGain();
    oscChime.type = 'sine';
    oscChime.frequency.setValueAtTime(880, now + 0.02); // A5
    oscChime.frequency.exponentialRampToValueAtTime(1320, now + 0.1); // E6
    gainChime.gain.setValueAtTime(0.22, now + 0.02);
    gainChime.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
    oscChime.connect(gainChime);
    gainChime.connect(ctx.destination);
    oscChime.start(now + 0.02);
    oscChime.stop(now + 0.32);
  } catch (e) {
    // Non-fatal audio fallback
  }
};

const getCartTarget = (): { x: number; y: number } => {
  if (typeof window === 'undefined') return { x: 200, y: 600 };

  // Prioritize the dedicated shopping bag in the floating cart
  const bagTarget = document.getElementById('floating-cart-bag-icon') || 
                    document.getElementById('cart-bag-target') || 
                    document.getElementById('cart-icon-target');

  if (bagTarget) {
    const rect = bagTarget.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0 && rect.top > 0) {
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }
  }

  // Mobile navigation bottom cart icon / Floating cart fallback
  if (window.innerWidth < 768) {
    const mobileNav = document.getElementById('mobile-cart-nav-target');
    if (mobileNav) {
      const rect = mobileNav.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      }
    }
    // Fallback on mobile: floating cart shopping bag position
    return { x: 60, y: window.innerHeight - 90 };
  }

  // Fallback on desktop: centered floating cart bag area
  const centerX = window.innerWidth / 2;
  return { x: Math.max(80, centerX - 180), y: window.innerHeight - 90 };
};

// ─── Provider ─────────────────────────────────────────────────────────────────
export function CartAnimationProvider({ children }: { children: React.ReactNode }) {
  const [flyingItems, setFlyingItems] = useState<FlyingItemData[]>([]);
  const idCounter = useRef(0);

  const triggerAnimation = useCallback(
    (
      e: React.MouseEvent | React.TouchEvent | { clientX: number; clientY: number },
      image: string,
      onCompleteCallback?: () => void
    ) => {
      // ── CRITICAL ARCHITECTURAL GUARANTEE ──────────────────────────────────
      // 1. NEVER delay business logic or cart state for animation.
      // Update cart store IMMEDIATELY so count and total update on the spot.
      if (onCompleteCallback) {
        try {
          onCompleteCallback();
        } catch (err) {
          console.error('[CartAnimationProvider] Error in onCompleteCallback:', err);
        }
      }

      // Check if user prefers reduced motion
      const prefersReducedMotion = typeof window !== 'undefined' && 
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      const target = getCartTarget();

      if (prefersReducedMotion) {
        // Immediate subtle cart pulse, skip spatial flight
        window.dispatchEvent(new CustomEvent('cart-item-added'));
        window.dispatchEvent(new CustomEvent('cart-bag-impact', { detail: { x: target.x, y: target.y } }));
        playCartDropSound();
        return;
      }

      // 2. Compute exact starting coordinates
      let clientX = window.innerWidth / 2;
      let clientY = window.innerHeight / 2;

      if (e && 'currentTarget' in e && (e as any).currentTarget) {
        const rect = (e as any).currentTarget.getBoundingClientRect();
        clientX = rect.left + rect.width / 2;
        clientY = rect.top + rect.height / 2;
      } else if (e && 'touches' in e && (e as React.TouchEvent).touches && (e as React.TouchEvent).touches.length > 0) {
        clientX = (e as React.TouchEvent).touches[0].clientX;
        clientY = (e as React.TouchEvent).touches[0].clientY;
      } else if (e && 'clientX' in e && typeof (e as any).clientX === 'number' && (e as any).clientX > 0) {
        clientX = (e as any).clientX;
        clientY = (e as any).clientY;
      }

      // Bounds validation
      if (!clientX || clientX <= 0 || clientX > window.innerWidth) clientX = window.innerWidth / 2;
      if (!clientY || clientY <= 0 || clientY > window.innerHeight) clientY = window.innerHeight / 2;

      const safeImage = image && image.trim().length > 0 
        ? image 
        : 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400';

      const newId = ++idCounter.current;
      const newItem: FlyingItemData = {
        id: newId,
        startX: clientX,
        startY: clientY,
        endX: target.x,
        endY: target.y,
        image: safeImage,
      };

      // Support concurrent rapid adds up to 6 flying items at once
      setFlyingItems((prev) => [...prev.slice(-5), newItem]);
    },
    []
  );

  const removeFlyingItem = useCallback((id: number, endX: number, endY: number) => {
    setFlyingItems((prev) => prev.filter((item) => item.id !== id));
    
    // Impact feedback at exact arrival moment
    playCartDropSound();
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate([15, 20]); } catch {}
    }
    window.dispatchEvent(new CustomEvent('cart-item-added'));
    window.dispatchEvent(new CustomEvent('cart-bag-impact', { detail: { x: endX, y: endY } }));
  }, []);

  // Listen to global trigger event
  useEffect(() => {
    const handleGlobalTrigger = (e: CustomEvent) => {
      const { clientX, clientY, image, onComplete: cb } = e.detail || {};
      const startX = typeof clientX === 'number' ? clientX : window.innerWidth / 2;
      const startY = typeof clientY === 'number' ? clientY : Math.max(160, window.innerHeight / 3);
      triggerAnimation({ clientX: startX, clientY: startY }, image || '', cb);
    };

    window.addEventListener('trigger-cart-animation', handleGlobalTrigger as EventListener);
    return () => {
      window.removeEventListener('trigger-cart-animation', handleGlobalTrigger as EventListener);
    };
  }, [triggerAnimation]);

  return (
    <CartAnimationContext.Provider value={{ triggerAnimation }}>
      {children}
      <div className="fixed inset-0 pointer-events-none z-[10000] overflow-hidden">
        <AnimatePresence>
          {flyingItems.map((item) => (
            <RealisticFlyingProduct
              key={item.id}
              data={item}
              onFinish={() => removeFlyingItem(item.id, item.endX, item.endY)}
            />
          ))}
        </AnimatePresence>
      </div>
    </CartAnimationContext.Provider>
  );
}

// ─── Realistic Physical Flying Product Component ─────────────────────────────
function RealisticFlyingProduct({
  data,
  onFinish,
}: {
  data: FlyingItemData;
  onFinish: () => void;
}) {
  const { startX, startY, endX, endY, image } = data;
  const ITEM_SIZE = 76;
  const HALF = ITEM_SIZE / 2;

  // Calculate realistic curved flight path
  const deltaX = endX - startX;
  const deltaY = endY - startY;

  // Parabolic upward arc: arc pushes higher in the first half of flight
  const midX = deltaX * 0.45;
  const midY = deltaY * 0.25 - Math.max(60, Math.abs(deltaY) * 0.18);

  return (
    <motion.div
      initial={{
        x: startX - HALF,
        y: startY - HALF,
        scale: 1,
        rotate: 0,
        opacity: 1,
      }}
      animate={{
        x: [startX - HALF, startX - HALF + midX, endX - HALF],
        y: [startY - HALF, startY - HALF + midY, endY - HALF],
        scale: [1, 1.18, 0.72, 0.22],
        rotate: [0, 14, -6, 0],
        opacity: [1, 1, 1, 0.85, 0],
      }}
      transition={{
        duration: 0.52,
        ease: [0.22, 1, 0.36, 1], // Natural deceleration curve
        times: [0, 0.45, 1],
      }}
      onAnimationComplete={onFinish}
      className="absolute pointer-events-none will-change-transform z-[10001]"
      style={{ width: ITEM_SIZE, height: ITEM_SIZE }}
    >
      {/* Warm Ambient Crust Glow */}
      <div className="absolute -inset-2 rounded-full bg-gradient-to-tr from-amber-500/30 to-red-500/30 blur-md pointer-events-none" />

      {/* Actual Product Photo Container */}
      <div className="relative w-full h-full rounded-full overflow-hidden border-2 border-amber-400 bg-stone-900 shadow-[0_16px_36px_rgba(0,0,0,0.45)]">
        <img
          src={image}
          alt="Adding to cart"
          className="w-full h-full object-cover"
          loading="eager"
          decoding="sync"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400';
          }}
        />
        {/* Gloss highlight overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent pointer-events-none" />
      </div>
    </motion.div>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useCartAnimation = () => {
  const context = useContext(CartAnimationContext);
  if (!context) throw new Error('useCartAnimation must be used within CartAnimationProvider');
  return context;
};
