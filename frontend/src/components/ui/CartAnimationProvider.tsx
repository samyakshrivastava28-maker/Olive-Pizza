import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types ──────────────────────────────────────────────────────────────────
export interface FlyingItemData {
  id: number;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  endX: number;
  endY: number;
  image: string;
}

interface CartAnimationContextType {
  triggerAnimation: (
    e: React.MouseEvent | React.TouchEvent | { clientX?: number; clientY?: number; currentTarget?: any },
    image: string,
    onComplete?: () => void
  ) => void;
}

const CartAnimationContext = createContext<CartAnimationContextType | undefined>(undefined);

// ─── Web Audio Impact Synthesizer ───────────────────────────────────────────
export const playCartDropSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // 1. Tactile Bass Thud (Solid physical landing)
    const oscBass = ctx.createOscillator();
    const gainBass = ctx.createGain();
    oscBass.type = 'triangle';
    oscBass.frequency.setValueAtTime(180, now);
    oscBass.frequency.exponentialRampToValueAtTime(42, now + 0.16);
    gainBass.gain.setValueAtTime(0.35, now);
    gainBass.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    oscBass.connect(gainBass);
    gainBass.connect(ctx.destination);
    oscBass.start(now);
    oscBass.stop(now + 0.18);

    // 2. Harmonic Resonant Chime (Crisp confirmation ring)
    const oscChime = ctx.createOscillator();
    const gainChime = ctx.createGain();
    oscChime.type = 'sine';
    oscChime.frequency.setValueAtTime(880, now + 0.02); // A5
    oscChime.frequency.exponentialRampToValueAtTime(1320, now + 0.11); // E6
    gainChime.gain.setValueAtTime(0.25, now + 0.02);
    gainChime.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    oscChime.connect(gainChime);
    gainChime.connect(ctx.destination);
    oscChime.start(now + 0.02);
    oscChime.stop(now + 0.35);
  } catch {
    // Non-fatal audio fallback
  }
};

// ─── Dynamic Target Coordinates Resolution ──────────────────────────────────
const getCartTarget = (): { x: number; y: number } => {
  if (typeof window === 'undefined') return { x: 200, y: 600 };

  // 1. Dedicated shopping bag in FloatingCart
  const bagTarget = document.getElementById('floating-cart-bag-icon') || 
                    document.getElementById('cart-bag-target') || 
                    document.getElementById('cart-icon-target');

  if (bagTarget) {
    const rect = bagTarget.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0 && rect.top > 0) {
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }
  }

  // 2. Mobile bottom navigation bar cart icon
  if (window.innerWidth < 768) {
    const mobileNav = document.getElementById('mobile-cart-nav-target');
    if (mobileNav) {
      const rect = mobileNav.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      }
    }
    // Floating cart anchor position on mobile
    return { x: 54, y: window.innerHeight - 88 };
  }

  // 3. Desktop top header cart or floating cart center
  const topCart = document.getElementById('desktop-cart-btn');
  if (topCart) {
    const rect = topCart.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }
  }

  // Fallback on desktop: centered floating cart bag area
  const centerX = window.innerWidth / 2;
  return { x: Math.max(80, centerX - 160), y: window.innerHeight - 80 };
};

// ─── Provider Component ──────────────────────────────────────────────────────
export function CartAnimationProvider({ children }: { children: React.ReactNode }) {
  const [flyingItems, setFlyingItems] = useState<FlyingItemData[]>([]);
  const idCounter = useRef(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const triggerAnimation = useCallback(
    (
      e: React.MouseEvent | React.TouchEvent | { clientX?: number; clientY?: number; currentTarget?: any },
      image: string,
      onCompleteCallback?: () => void
    ) => {
      // ── CRITICAL ARCHITECTURAL GUARANTEE ──────────────────────────────────
      // 1. Update cart store synchronously on the spot (0ms latency)
      // Never make business state wait for visual physics.
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
        // Immediate subtle cart impact, skip spatial flight
        window.dispatchEvent(new CustomEvent('cart-item-added'));
        window.dispatchEvent(new CustomEvent('cart-bag-impact', { detail: { x: target.x, y: target.y } }));
        playCartDropSound();
        return;
      }

      // 2. Discover the EXACT product image in the DOM for real physical lift-off
      let startX = window.innerWidth / 2;
      let startY = window.innerHeight / 2;
      let startWidth = 84;
      let startHeight = 84;

      const currentTarget = (e as any)?.currentTarget || (e as any)?.target;
      if (currentTarget instanceof HTMLElement) {
        // Search upward to find card container, then locate the rendered product image
        const card = currentTarget.closest('[data-product-card], article, .group, div.relative');
        const imgEl = card?.querySelector('img') || 
                      (currentTarget.tagName === 'IMG' ? currentTarget : null) ||
                      document.querySelector(`img[src="${image}"]`);

        if (imgEl instanceof HTMLImageElement) {
          const imgRect = imgEl.getBoundingClientRect();
          if (imgRect.width > 20 && imgRect.height > 20) {
            startX = imgRect.left + imgRect.width / 2;
            startY = imgRect.top + imgRect.height / 2;
            startWidth = Math.min(imgRect.width, 140);
            startHeight = Math.min(imgRect.height, 140);
          }
        } else {
          // Fallback to button bounds
          const btnRect = currentTarget.getBoundingClientRect();
          startX = btnRect.left + btnRect.width / 2;
          startY = btnRect.top + btnRect.height / 2;
        }
      } else if (e && 'touches' in e && (e as React.TouchEvent).touches?.[0]) {
        startX = (e as React.TouchEvent).touches[0].clientX;
        startY = (e as React.TouchEvent).touches[0].clientY;
      } else if (e && 'clientX' in (e as any) && typeof (e as any).clientX === 'number' && (e as any).clientX > 0) {
        startX = (e as any).clientX;
        startY = (e as any).clientY || window.innerHeight / 2;
      }

      // Safety bounds
      if (startX <= 0 || startX > window.innerWidth) startX = window.innerWidth / 2;
      if (startY <= 0 || startY > window.innerHeight) startY = window.innerHeight / 2;

      const safeImage = image && image.trim().length > 0 
        ? image 
        : 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400';

      const newId = ++idCounter.current;
      const newItem: FlyingItemData = {
        id: newId,
        startX,
        startY,
        startWidth,
        startHeight,
        endX: target.x,
        endY: target.y,
        image: safeImage,
      };

      // Support concurrent rapid additions (up to 8 visual items in flight simultaneously)
      setFlyingItems((prev) => [...prev.slice(-7), newItem]);
    },
    []
  );

  const removeFlyingItem = useCallback((id: number, endX: number, endY: number) => {
    setFlyingItems((prev) => prev.filter((item) => item.id !== id));
    
    // Impact feedback at exact arrival moment
    playCartDropSound();
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate([15, 25]); } catch {}
    }
    window.dispatchEvent(new CustomEvent('cart-item-added'));
    window.dispatchEvent(new CustomEvent('cart-bag-impact', { detail: { x: endX, y: endY } }));
  }, []);

  // Global trigger event listener for triggers outside React context
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
      {mounted && typeof document !== 'undefined' &&
        createPortal(
          <div 
            aria-hidden="true"
            className="fixed inset-0 pointer-events-none z-[99999] overflow-hidden"
            style={{ width: '100vw', height: '100vh', top: 0, left: 0 }}
          >
            <AnimatePresence>
              {flyingItems.map((item) => (
                <RealisticFlyingProduct
                  key={item.id}
                  data={item}
                  onFinish={() => removeFlyingItem(item.id, item.endX, item.endY)}
                />
              ))}
            </AnimatePresence>
          </div>,
          document.body
        )}
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
  const { startX, startY, startWidth, startHeight, endX, endY, image } = data;

  const initialSize = Math.max(72, Math.min(startWidth, 110));
  const halfInitial = initialSize / 2;

  // Compute curved flight coordinates
  const deltaX = endX - startX;
  const deltaY = endY - startY;

  // Natural parabolic arc: apex arches upward above the straight path
  const midX = deltaX * 0.48;
  const midY = deltaY * 0.22 - Math.max(70, Math.abs(deltaY) * 0.16);

  return (
    <motion.div
      initial={{
        x: startX - halfInitial,
        y: startY - halfInitial,
        width: initialSize,
        height: initialSize,
        scale: 1,
        rotate: 0,
        opacity: 1,
      }}
      animate={{
        x: [startX - halfInitial, startX - halfInitial + midX, endX - 22],
        y: [startY - halfInitial, startY - halfInitial + midY, endY - 22],
        scale: [1, 1.09, 0.62, 0.18],
        rotate: [0, 8, -4, 0],
        opacity: [1, 1, 0.95, 0],
      }}
      transition={{
        duration: 0.58,
        ease: [0.22, 1, 0.36, 1], // Deceleration spring-like ease
        times: [0, 0.42, 1],
      }}
      onAnimationComplete={onFinish}
      className="absolute pointer-events-none will-change-transform z-[100000]"
      style={{
        filter: 'drop-shadow(0 14px 28px rgba(0,0,0,0.35))',
      }}
    >
      {/* Warm artisan dough/crust ambient halo */}
      <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-amber-500/40 to-red-500/40 blur-sm pointer-events-none" />

      {/* Actual Product Photo Disc Container */}
      <div className="relative w-full h-full rounded-full overflow-hidden border-2 border-amber-400 bg-stone-900 shadow-xl">
        <img
          src={image}
          alt="Adding pizza to cart"
          className="w-full h-full object-cover"
          loading="eager"
          decoding="sync"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400';
          }}
        />
        {/* Soft gloss highlight */}
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
