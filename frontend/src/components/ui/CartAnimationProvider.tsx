import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';

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
        // Immediate subtle cart impact, skip spatial 3D flight
        window.dispatchEvent(new CustomEvent('cart-item-added'));
        window.dispatchEvent(new CustomEvent('cart-bag-impact', { detail: { x: target.x, y: target.y } }));
        playCartDropSound();
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

      // Support concurrent rapid additions (up to 6 visual boxes in flight simultaneously)
      setActiveAnimations((prev) => [...prev.slice(-5), newItem]);
    },
    []
  );

  const removeAnimation = useCallback((id: string, endX: number, endY: number) => {
    setActiveAnimations((prev) => prev.filter((item) => item.id !== id));
    
    // Impact feedback at exact arrival into cart carry bag
    playCartDropSound();
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate([15, 25]); } catch {}
    }
    window.dispatchEvent(new CustomEvent('cart-item-added'));
    window.dispatchEvent(new CustomEvent('cart-bag-impact', { detail: { x: endX, y: endY } }));
  }, []);

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
      {mounted && typeof document !== 'undefined' &&
        createPortal(
          <div 
            aria-hidden="true"
            className="fixed inset-0 pointer-events-none z-[99999] overflow-hidden"
            style={{ width: '100vw', height: '100vh', top: 0, left: 0 }}
          >
            <AnimatePresence>
              {activeAnimations.map((anim) => (
                <Premium3DPizzaBoxPackingSequence
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

// ─── 3D Pizza Box Packing Sequence Component ─────────────────────────────────
function Premium3DPizzaBoxPackingSequence({
  anim,
  onComplete,
}: {
  anim: PizzaBoxAnimationData;
  onComplete: () => void;
}) {
  const boxControls = useAnimation();
  const lidControls = useAnimation();
  const pizzaControls = useAnimation();
  const sealGlowControls = useAnimation();

  // Responsive Box Dimensions
  const isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : true;
  const BOX_SIZE = isMobile ? 130 : 155;
  const HALF_BOX = BOX_SIZE / 2;
  const PIZZA_SIZE = isMobile ? 86 : 102;
  const HALF_PIZZA = PIZZA_SIZE / 2;

  // Staging area where box stops to receive the pizza:
  // Center horizontally, and vertically placed comfortably in the upper-mid screen
  const stagingX = Math.round(window.innerWidth / 2);
  const stagingY = Math.round(
    Math.min(
      Math.max(140, anim.startY - 70),
      window.innerHeight * 0.42
    )
  );

  useEffect(() => {
    let isMounted = true;

    const runPackingSequence = async () => {
      // ── STAGE 0: Initial Positions ──
      // Box originates near the product card/button, scaled down and ready to enter
      const enterOffsetX = anim.startX > stagingX ? 80 : -80;
      boxControls.set({
        x: anim.startX + enterOffsetX - HALF_BOX,
        y: anim.startY - 120 - HALF_BOX,
        scale: 0.35,
        opacity: 0,
        rotateZ: -12,
        rotateX: 25,
        boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
      });

      // Lid starts closed
      lidControls.set({ rotateY: 0 });

      // Product image appears at source card position
      pizzaControls.set({
        x: anim.startX - HALF_PIZZA,
        y: anim.startY - HALF_PIZZA,
        scale: 1,
        opacity: 1,
        rotateZ: 0,
        rotateX: 0,
        boxShadow: '0 10px 25px rgba(0,0,0,0.35)',
      });

      if (!isMounted) return;

      // ── STAGE 1: 3D Box Flies In & Hovers at Staging Area ──
      // Simultaneously, the product image lifts slightly with tactile anticipation
      await Promise.all([
        boxControls.start({
          x: stagingX - HALF_BOX,
          y: stagingY - HALF_BOX,
          scale: 1,
          opacity: 1,
          rotateZ: 0,
          rotateX: 20,
          boxShadow: '0 25px 50px rgba(0,0,0,0.6)',
          transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
        }),
        pizzaControls.start({
          scale: 1.15,
          y: anim.startY - HALF_PIZZA - 24,
          rotateZ: 6,
          boxShadow: '0 20px 45px rgba(0,0,0,0.5)',
          transition: { duration: 0.25, ease: 'easeOut' },
        }),
      ]);

      if (!isMounted) return;

      // ── STAGE 2: Box Stops / Settles & Lid Opens (3D Hinge) ──
      await Promise.all([
        // Box settles smoothly
        boxControls.start({
          scale: [1, 1.03, 1],
          rotateX: 18,
          transition: { duration: 0.16, ease: 'easeInOut' },
        }),
        // Lid opens smoothly along left hinge to reveal interior
        lidControls.start({
          rotateY: -115,
          transition: { duration: 0.24, ease: [0.34, 1.56, 0.64, 1] },
        }),
      ]);

      if (!isMounted) return;

      // ── STAGE 3: Product Enters The Open Box (Curved Arc) ──
      // Product flies into the open box liner and scales to fit
      await pizzaControls.start({
        x: stagingX - HALF_PIZZA,
        y: stagingY - HALF_PIZZA + 4,
        scale: 0.88,
        rotateZ: 180,
        rotateX: 25,
        boxShadow: '0 6px 16px rgba(0,0,0,0.4)',
        transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] },
      });

      if (!isMounted) return;

      // ── STAGE 4: Packing Effect (Pizza Settles Inside Box) ──
      await pizzaControls.start({
        y: stagingY - HALF_PIZZA + 8,
        scale: 0.82,
        transition: { duration: 0.1, ease: 'easeIn' },
      });

      if (!isMounted) return;

      // ── STAGE 5: Box Closes & Seals (Lid Closes Around Product) ──
      await Promise.all([
        // Lid swings tightly shut
        lidControls.start({
          rotateY: 0,
          transition: { type: 'spring', stiffness: 380, damping: 24 },
        }),
        // Pizza disappears securely inside the closed box
        pizzaControls.start({
          opacity: 0,
          scale: 0.65,
          transition: { duration: 0.12 },
        }),
      ]);

      if (!isMounted) return;

      // Subtle seal glow flash confirming box is locked & packed
      sealGlowControls.start({
        opacity: [0, 1, 0],
        scale: [0.9, 1.3, 1],
        transition: { duration: 0.22, ease: 'easeOut' },
      });

      // ── STAGE 6: Packed 3D Box Flies Toward Floating Cart Carry Bag ──
      // Dynamically re-verify latest cart target coordinates
      const freshTarget = getCartTarget();
      const bagX = freshTarget.x - HALF_BOX;
      const bagY = freshTarget.y - HALF_BOX;

      // Parabolic flight towards cart bag aperture
      await boxControls.start({
        x: bagX,
        y: bagY,
        scale: 0.16, // Shrinks naturally to fit inside the shopping bag aperture
        rotateZ: 35,
        rotateX: 0,
        opacity: [1, 1, 0.9, 0],
        transition: { duration: 0.44, ease: [0.32, 0, 0.67, 0] },
      });

      if (!isMounted) return;

      // ── STAGE 7: Box Lands Inside Bag & Trigger Bag Physical Reaction ──
      onComplete();
    };

    runPackingSequence();
    return () => {
      isMounted = false;
    };
  }, [anim, stagingX, stagingY, HALF_BOX, HALF_PIZZA, boxControls, lidControls, pizzaControls, sealGlowControls, onComplete]);

  // Isometric / 3D transform style for box base & lid
  const isoBaseStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    transform: 'rotate(45deg) scaleY(0.577)',
    borderRadius: 12,
  };

  return (
    <>
      {/* ── 1. 3D PIZZA BOX ASSEMBLY ── */}
      <motion.div
        className="absolute z-[100000] pointer-events-none will-change-transform"
        style={{
          width: BOX_SIZE,
          height: BOX_SIZE,
          perspective: 1200,
          transformStyle: 'preserve-3d',
        }}
        animate={boxControls}
      >
        {/* Subtle Ambient Aroma / Seal Glow */}
        <motion.div
          animate={sealGlowControls}
          initial={{ opacity: 0 }}
          className="absolute inset-[-30px] rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-primary-500 blur-xl z-0 pointer-events-none"
        />

        {/* Box Base (Deep Terracotta Exterior with 3D Extrusion Shadows) */}
        <div
          style={{
            ...isoBaseStyle,
            backgroundColor: '#ea580c', // Authentic Olive Pizza warm red-orange cardboard
            border: '2.5px solid #c2410c',
            boxShadow: `
              -1px 1px 0 #9a3412,
              -2px 2px 0 #9a3412,
              -3px 3px 0 #9a3412,
              -4px 4px 0 #7c2d12,
              -5px 5px 0 #7c2d12,
              -12px 16px 30px rgba(0, 0, 0, 0.65)
            `,
            zIndex: 1,
          }}
        >
          {/* Internal Kraft Cardboard Well & Corrugated Pizza Liner Pad */}
          <div
            style={{
              position: 'absolute',
              inset: 7,
              backgroundColor: '#d97706', // Kraft cardboard liner
              borderRadius: 8,
              border: '2px solid #b45309',
              boxShadow: 'inset 0 0 18px rgba(0, 0, 0, 0.55)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {/* White Corrugated Fluted Pad with authentic greaseproof ridges */}
            <div
              style={{
                width: '86%',
                height: '86%',
                backgroundColor: '#f8fafc',
                borderRadius: 6,
                backgroundImage: 'repeating-linear-gradient(90deg, #e2e8f0, #e2e8f0 3px, #f8fafc 3px, #f8fafc 9px)',
                boxShadow: 'inset 0 0 10px rgba(0, 0, 0, 0.25), 0 1px 4px rgba(0, 0, 0, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Subtle inner Olive Pizza water-mark on greaseproof paper */}
              <span className="text-[7px] font-black text-slate-300 uppercase tracking-widest opacity-40 select-none">
                OLIVE PIZZA
              </span>
            </div>
          </div>
        </div>

        {/* ── Hinged 3D Lid ── */}
        <div
          style={{
            ...isoBaseStyle,
            zIndex: 3,
            perspective: 1200,
          }}
        >
          <motion.div
            animate={lidControls}
            style={{
              position: 'absolute',
              inset: 0,
              transformOrigin: 'left center', // Real cardboard hinge on the left
              transformStyle: 'preserve-3d',
            }}
          >
            {/* Inside Face of Lid (Kraft cardboard + inner rim) */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: '#d97706',
                border: '2.5px solid #c2410c',
                borderRadius: 12,
                boxShadow: 'inset 0 0 18px rgba(0, 0, 0, 0.45)',
              }}
            />

            {/* Outside Top Cover (Branded Olive Pizza Graphic Design) */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: '#ea580c',
                border: '2.5px solid #c2410c',
                borderRadius: 12,
                backfaceVisibility: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'inset 0 0 24px rgba(254, 215, 170, 0.3), 0 4px 12px rgba(0,0,0,0.3)',
                padding: 10,
              }}
            >
              {/* Olive Pizza Brand Emblem */}
              <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-white/10 p-1.5 flex items-center justify-center border border-white/20 shadow-inner">
                <img
                  src="https://res.cloudinary.com/ditkqli2i/image/upload/v1782113833/olive-pizza-logo_nsoh49.webp"
                  alt="Olive Pizza Logo"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://res.cloudinary.com/dxmlvkff1/image/upload/v1782376898/olive-pizza/brand/logo.png';
                  }}
                  className="w-full h-full object-contain filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                />
              </div>

              {/* Brand Typography */}
              <span className="text-[9px] sm:text-[10px] font-black text-white tracking-widest mt-1.5 uppercase drop-shadow-md">
                Olive Pizza
              </span>
              <span className="text-[6px] sm:text-[7px] font-bold text-amber-200 tracking-wider uppercase opacity-90">
                Fresh • Hot • Handcrafted
              </span>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* ── 2. PRODUCT / PIZZA IMAGE (Flies directly into open box) ── */}
      <motion.div
        animate={pizzaControls}
        className="absolute pointer-events-none will-change-transform z-[100001]"
        style={{
          width: PIZZA_SIZE,
          height: PIZZA_SIZE,
          filter: 'drop-shadow(0 12px 24px rgba(0,0,0,0.45))',
        }}
      >
        <div className="relative w-full h-full rounded-full overflow-hidden border-2 border-amber-400 bg-stone-900 shadow-xl">
          <img
            src={anim.image}
            alt="Pizza product entering box"
            className="w-full h-full object-cover"
            loading="eager"
            decoding="sync"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400';
            }}
          />
          {/* Subtle gloss highlight on crust */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent pointer-events-none" />
        </div>
      </motion.div>
    </>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useCartAnimation = () => {
  const context = useContext(CartAnimationContext);
  if (!context) throw new Error('useCartAnimation must be used within CartAnimationProvider');
  return context;
};
