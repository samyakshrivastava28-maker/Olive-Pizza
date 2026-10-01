import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { threeCartFlightService } from '../../services/ThreeCartFlightService';
import { Realistic3DPizzaBox } from './Realistic3DPizzaBox';

// ─── Types ──────────────────────────────────────────────────────────────────
export interface PizzaBoxAnimationData {
  id: string;
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

    // 1. Tactile Bass Thud (Solid physical landing into carry bag)
    const oscBass = ctx.createOscillator();
    const gainBass = ctx.createGain();
    oscBass.type = 'triangle';
    oscBass.frequency.setValueAtTime(190, now);
    oscBass.frequency.exponentialRampToValueAtTime(38, now + 0.18);
    gainBass.gain.setValueAtTime(0.4, now);
    gainBass.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    oscBass.connect(gainBass);
    gainBass.connect(ctx.destination);
    oscBass.start(now);
    oscBass.stop(now + 0.2);

    // 2. Harmonic Resonant Chime (Crisp golden confirmation ring)
    const oscChime = ctx.createOscillator();
    const gainChime = ctx.createGain();
    oscChime.type = 'sine';
    oscChime.frequency.setValueAtTime(880, now + 0.02); // A5
    oscChime.frequency.exponentialRampToValueAtTime(1320, now + 0.12); // E6
    gainChime.gain.setValueAtTime(0.28, now + 0.02);
    gainChime.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    oscChime.connect(gainChime);
    gainChime.connect(ctx.destination);
    oscChime.start(now + 0.02);
    oscChime.stop(now + 0.38);
  } catch {
    // Non-fatal audio fallback
  }
};

// ─── Dynamic Target Coordinates Resolution ──────────────────────────────────
export const getCartTarget = (): { x: number; y: number } => {
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
  const [activeAnimations, setActiveAnimations] = useState<PizzaBoxAnimationData[]>([]);
  const idCounter = useRef(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => {
      threeCartFlightService.dispose();
    };
  }, []);

  const triggerImpact = useCallback((endX: number, endY: number) => {
    playCartDropSound();
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate([15, 25]); } catch {}
    }
    window.dispatchEvent(new CustomEvent('cart-item-added'));
    window.dispatchEvent(new CustomEvent('cart-bag-impact', { detail: { x: endX, y: endY } }));
  }, []);

  const triggerAnimation = useCallback(
    (
      e: React.MouseEvent | React.TouchEvent | { clientX?: number; clientY?: number; currentTarget?: any },
      image: string,
      onCompleteCallback?: () => void
    ) => {
      // ── CRITICAL ARCHITECTURAL GUARANTEE ──────────────────────────────────
      // 1. Authoritative Cart Mutation Happens Immediately (0ms latency)
      // Never delay the real shopping cart state for visual physics.
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
        triggerImpact(target.x, target.y);
        return;
      }

      // 2. Discover the EXACT product origin in the DOM for real physical flight
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

      // ── PRIMARY: Photorealistic Three.js 3D WebGL Flight ──
      const launched = threeCartFlightService.launch({
        startX,
        startY,
        endX: target.x,
        endY: target.y,
        image: safeImage,
        onImpact: () => triggerImpact(target.x, target.y),
      });

      // ── FALLBACK: If WebGL is unavailable on older devices, use Realistic3DPizzaBox SVG Flight ──
      if (!launched) {
        const animId = `box_anim_${++idCounter.current}_${Date.now()}`;
        const newItem: PizzaBoxAnimationData = {
          id: animId,
          startX,
          startY,
          startWidth,
          startHeight,
          endX: target.x,
          endY: target.y,
          image: safeImage,
        };
        setActiveAnimations((prev) => [...prev.slice(-3), newItem]);
      }
    },
    [triggerImpact]
  );

  const removeAnimation = useCallback((id: string, endX: number, endY: number) => {
    setActiveAnimations((prev) => prev.filter((item) => item.id !== id));
    triggerImpact(endX, endY);
  }, [triggerImpact]);

  // Global trigger event listener for triggers outside React context (e.g. AI Assistant)
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
      {mounted && typeof document !== 'undefined' && activeAnimations.length > 0 &&
        createPortal(
          <div 
            aria-hidden="true"
            className="fixed inset-0 pointer-events-none z-[99999] overflow-hidden"
            style={{ width: '100vw', height: '100vh', top: 0, left: 0 }}
          >
            <AnimatePresence>
              {activeAnimations.map((anim) => (
                <Realistic3DPizzaBoxFlightFallback
                  key={anim.id}
                  anim={anim}
                  onComplete={() => removeAnimation(anim.id, anim.endX, anim.endY)}
                />
              ))}
            </AnimatePresence>
          </div>,
          document.body
        )}
    </CartAnimationContext.Provider>
  );
}

// ─── High-Fidelity SVG Fallback Flight (Zero Square Artifacts) ────────────────
function Realistic3DPizzaBoxFlightFallback({
  anim,
  onComplete,
}: {
  anim: PizzaBoxAnimationData;
  onComplete: () => void;
}) {
  const isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : true;
  const BOX_SIZE = isMobile ? 86 : 108;
  const HALF_BOX = BOX_SIZE / 2;

  // Arc calculation
  const dx = anim.endX - anim.startX;
  const dy = anim.endY - anim.startY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const midX = anim.startX + dx * 0.5;
  const midY = anim.startY + dy * 0.4 - Math.min(220, Math.max(100, dist * 0.35));
  const tiltSign = dx > 0 ? 1 : -1;

  return (
    <motion.div
      className="absolute pointer-events-none z-[100000] will-change-transform"
      style={{
        left: 0,
        top: 0,
        width: BOX_SIZE,
        height: BOX_SIZE,
      }}
      initial={{
        x: anim.startX - HALF_BOX,
        y: anim.startY - HALF_BOX,
        scale: 1,
        rotate: 0,
        opacity: 1,
      }}
      animate={{
        x: [anim.startX - HALF_BOX, midX - HALF_BOX, anim.endX - HALF_BOX],
        y: [anim.startY - HALF_BOX, midY - HALF_BOX, anim.endY - HALF_BOX],
        scale: [1, 1.1, 0.22],
        rotate: [0, tiltSign * 18, tiltSign * 35],
        opacity: [1, 1, 0.95, 0],
      }}
      transition={{
        duration: 0.8,
        times: [0, 0.45, 1],
        ease: [0.22, 1, 0.36, 1],
      }}
      onAnimationComplete={onComplete}
    >
      <Realistic3DPizzaBox size={BOX_SIZE} productImage={anim.image} />
    </motion.div>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useCartAnimation = () => {
  const context = useContext(CartAnimationContext);
  if (!context) throw new Error('useCartAnimation must be used within CartAnimationProvider');
  return context;
};
