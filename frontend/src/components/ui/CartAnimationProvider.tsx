import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';

// ─── Types ────────────────────────────────────────────────────────────────────
interface AnimationData {
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
    image: string
  ) => void;
}

const CartAnimationContext = createContext<CartAnimationContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────
export function CartAnimationProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<AnimationData[]>([]);
  const [activeAnim, setActiveAnim] = useState<AnimationData | null>(null);
  const idCounter = useRef(0);

  const getCartTarget = (): { x: number; y: number } => {
    let el = document.getElementById('cart-icon-target');
    if (window.innerWidth < 768) {
       const mobileNav = document.getElementById('mobile-cart-nav-target');
       if (mobileNav) el = mobileNav;
    }
    if (el) {
      const rect = el.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }
    return { x: window.innerWidth / 2, y: window.innerHeight - 40 };
  };

  const triggerAnimation = useCallback(
    (e: React.MouseEvent | React.TouchEvent | { clientX: number; clientY: number }, image: string) => {
      const newId = idCounter.current++;
      const target = getCartTarget();
      let clientX = window.innerWidth / 2;
      let clientY = window.innerHeight / 2;

      if (e && 'touches' in e && (e as React.TouchEvent).touches.length > 0) {
        clientX = (e as React.TouchEvent).touches[0].clientX;
        clientY = (e as React.TouchEvent).touches[0].clientY;
      } else if (e && 'clientX' in e && typeof (e as any).clientX === 'number') {
        clientX = (e as any).clientX;
        clientY = (e as any).clientY;
      }

      setQueue((prev) => [
        ...prev,
        { id: newId, startX: clientX, startY: clientY, endX: target.x, endY: target.y, image },
      ]);
    },
    []
  );

  useEffect(() => {
    if (!activeAnim && queue.length > 0) {
      setActiveAnim(queue[0]);
      setQueue((prev) => prev.slice(1));
    }
  }, [activeAnim, queue]);

  const onComplete = useCallback(() => {
    setActiveAnim(null);
  }, []);

  return (
    <CartAnimationContext.Provider value={{ triggerAnimation }}>
      {children}
      <div className="fixed inset-0 pointer-events-none z-[10000] overflow-hidden">
        <AnimatePresence>
          {activeAnim && (
            <PremiumFlyingBox key={activeAnim.id} anim={activeAnim} onComplete={onComplete} />
          )}
        </AnimatePresence>
      </div>
    </CartAnimationContext.Provider>
  );
}

// ─── Realistic 3D Pizza Box Component ─────────────────────────────────────────
function PremiumFlyingBox({ anim, onComplete }: { anim: AnimationData; onComplete: () => void }) {
  const boxControls = useAnimation();
  const lidControls = useAnimation();
  const flyingPizzaControls = useAnimation();
  const glowControls = useAnimation();

  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 3;

  const BOX_SIZE = 150;
  const HALF = BOX_SIZE / 2;
  const PIZZA_SIZE = 95;

  useEffect(() => {
    let isMounted = true;

    const sequence = async () => {
      // 1. Initial State: Box drops from top with lid wide open
      boxControls.set({ x: centerX - HALF, y: -400, scale: 0.5, opacity: 0, rotateZ: 0 });
      lidControls.set({ rotateY: -120 });
      
      flyingPizzaControls.set({ 
        x: anim.startX - PIZZA_SIZE / 2, 
        y: anim.startY - PIZZA_SIZE / 2,
        scale: 1, opacity: 1, rotateZ: 0, rotateX: 0,
        boxShadow: '0 0 0px rgba(0,0,0,0)'
      });

      if (!isMounted) return;

      // 2. Pizza lifts slightly & 3D Box drops down with elastic bounce
      await Promise.all([
        flyingPizzaControls.start({
          scale: 1.2,
          y: anim.startY - PIZZA_SIZE / 2 - 35,
          rotateZ: 12,
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.4)',
          transition: { type: 'spring', stiffness: 280, damping: 14 }
        }),
        boxControls.start({
          y: centerY - HALF,
          scale: 1,
          opacity: 1,
          transition: { type: 'spring', stiffness: 220, damping: 18 }
        })
      ]);
      if (!isMounted) return;

      // 3. Item image flies inside the box
      await flyingPizzaControls.start({
        x: centerX - PIZZA_SIZE / 2,
        y: centerY - PIZZA_SIZE / 2,
        scale: 1,
        rotateZ: 360,
        rotateX: 45,
        transition: { duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }
      });
      if (!isMounted) return;

      // 4. Lid closes tightly with Olive Pizza logo cover on top
      await lidControls.start({
        rotateY: 0,
        transition: { type: 'spring', stiffness: 350, damping: 22 }
      });
      
      if (!isMounted) return;
      
      glowControls.start({
        opacity: [0, 1, 0],
        scale: [1, 1.25, 1],
        transition: { duration: 0.35 }
      });

      // 5. Box falls down into the floating cart bag
      const cartTarget = getCartTarget();
      const cartX = cartTarget.x - HALF;
      const cartY = cartTarget.y - HALF;

      await boxControls.start({
        x: cartX, 
        y: cartY, 
        scale: 0.12, 
        opacity: 0, 
        rotateZ: 60,
        transition: { duration: 0.55, ease: [0.25, 0.1, 0.25, 1] }
      });
      
      if (!isMounted) return;

      // 6. Floating Cart Bounce & Update
      const cartEl = document.getElementById('cart-icon-target');
      if (cartEl) {
        cartEl.animate(
          [
            { transform: 'scale(1) rotate(0deg)', offset: 0 },
            { transform: 'scale(1.4) translateY(-10px) rotate(-15deg)', offset: 0.5 },
            { transform: 'scale(1) translateY(0) rotate(0deg)', offset: 1 }
          ],
          { duration: 450, easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)' }
        );
      }
      
      window.dispatchEvent(new CustomEvent('cart-item-added'));
      
      onComplete();
    };

    sequence();
    return () => { isMounted = false; };
  }, [anim, centerX, centerY, boxControls, lidControls, flyingPizzaControls, glowControls, onComplete]);

  const isoStyle = {
    position: 'absolute' as const,
    inset: 0,
    transform: 'rotate(45deg) scaleY(0.577)',
    borderRadius: 12,
  };

  return (
    <>
      {/* ── 3D Box Assembly ── */}
      <motion.div
        className="absolute z-[10000] pointer-events-none"
        style={{ width: BOX_SIZE, height: BOX_SIZE }}
        animate={boxControls}
      >
        {/* Ambient Glow */}
        <motion.div 
          animate={glowControls}
          initial={{ opacity: 0 }}
          className="absolute inset-[-50px] bg-gradient-to-r from-amber-500 to-orange-500 rounded-full blur-2xl z-0"
        />

        {/* Box Base */}
        <div style={{
          ...isoStyle,
          backgroundColor: '#451a03',
          border: '3px solid #78350f',
          boxShadow: `
            -1px 1px 0 #270e02, -2px 2px 0 #270e02, -3px 3px 0 #270e02,
            -4px 4px 0 #270e02, -5px 5px 0 #270e02, -15px 15px 35px rgba(0,0,0,0.7)
          `,
          zIndex: 1
        }}>
          <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 40px rgba(0,0,0,0.9)', borderRadius: 10 }} />
        </div>

        {/* Box Lid */}
        <div style={{ ...isoStyle, zIndex: 3, perspective: 1200 }}>
          <motion.div
            animate={lidControls}
            style={{
              position: 'absolute', inset: 0,
              transformOrigin: 'left',
              transformStyle: 'preserve-3d',
            }}
          >
            {/* Inside Face */}
            <div style={{
              position: 'absolute', inset: 0,
              backgroundColor: '#78350f', border: '3px solid #451a03', borderRadius: 12,
              boxShadow: 'inset 0 0 25px rgba(0,0,0,0.6)'
            }} />

            {/* Outside Cover (Branded with Olive Pizza Logo) */}
            <div style={{
              position: 'absolute', inset: 0,
              backgroundColor: '#451a03', border: '3px solid #b45309', borderRadius: 12,
              backfaceVisibility: 'hidden',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'inset 0 0 30px rgba(251,191,36,0.2)',
              padding: 12
            }}>
              <img 
                src="https://res.cloudinary.com/dxmlvkff1/image/upload/v1782376898/olive-pizza/brand/logo.png" 
                alt="Olive Pizza Logo"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://res.cloudinary.com/ditkqli2i/image/upload/v1782113833/olive-pizza-logo_nsoh49.webp";
                }}
                style={{ width: 75, height: 75, objectFit: 'contain', zIndex: 2, filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.6))' }}
              />
              <span style={{ fontSize: 10, fontWeight: 900, color: '#fbbf24', letterSpacing: '0.15em', marginTop: 4, textTransform: 'uppercase' }}>
                Olive Pizza
              </span>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* ── Flying Item Image (Flies into box) ── */}
      <motion.img
        src={anim.image}
        alt="Item"
        className="absolute object-cover rounded-full pointer-events-none z-[10001] shadow-2xl border-2 border-amber-400"
        style={{ width: PIZZA_SIZE, height: PIZZA_SIZE }}
        animate={flyingPizzaControls}
      />
    </>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useCartAnimation = () => {
  const context = useContext(CartAnimationContext);
  if (!context) throw new Error('useCartAnimation must be used within CartAnimationProvider');
  return context;
};
