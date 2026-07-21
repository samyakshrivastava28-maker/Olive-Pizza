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

  const BOX_SIZE = 140;
  const HALF = BOX_SIZE / 2;
  const PIZZA_SIZE = 90;

  useEffect(() => {
    let isMounted = true;

    const sequence = async () => {
      // 1. Initial State
      boxControls.set({ x: centerX - HALF, y: -400, scale: 0.5, opacity: 0, rotateZ: 0 });
      lidControls.set({ rotateY: -115 });
      
      flyingPizzaControls.set({ 
        x: anim.startX - PIZZA_SIZE / 2, 
        y: anim.startY - PIZZA_SIZE / 2,
        scale: 1, opacity: 1, rotateZ: 0, rotateX: 0,
        boxShadow: '0 0 0px rgba(0,0,0,0)'
      });

      if (!isMounted) return;

      // 2. Pizza Lifts & Box drops
      await Promise.all([
        flyingPizzaControls.start({
          scale: 1.2,
          y: anim.startY - PIZZA_SIZE / 2 - 40,
          rotateZ: 15,
          boxShadow: '0 30px 60px rgba(0, 0, 0, 0.4)',
          transition: { type: 'spring', stiffness: 300, damping: 15 }
        }),
        boxControls.start({
          y: centerY - HALF,
          scale: 1,
          opacity: 1,
          transition: { type: 'spring', stiffness: 200, damping: 20 }
        })
      ]);
      if (!isMounted) return;

      // 3. Pizza flies into box
      await flyingPizzaControls.start({
        x: centerX - PIZZA_SIZE / 2,
        y: centerY - PIZZA_SIZE / 2,
        scale: 1.1,
        rotateZ: 45,
        rotateX: 55, // Match isometric perspective
        transition: { duration: 0.35, x: { ease: 'easeInOut' }, y: { ease: 'backIn' } }
      });
      if (!isMounted) return;

      // 4. Lid closes & brief glow
      await lidControls.start({
        rotateY: 0,
        transition: { type: 'spring', stiffness: 400, damping: 20 }
      });
      
      if (!isMounted) return;
      
      glowControls.start({
        opacity: [0, 1, 0],
        scale: [1, 1.2, 1],
        transition: { duration: 0.3 }
      });

      // 5. Box slides to cart
      const cartX = anim.endX - HALF;
      const cartY = anim.endY - HALF;

      await boxControls.start({
        x: cartX, 
        y: cartY, 
        scale: 0.1, 
        opacity: 0, 
        rotateZ: 45,
        transition: { duration: 0.5, ease: [0.32, 0.72, 0, 1] }
      });
      
      if (!isMounted) return;

      // 6. Complete
      const cartTarget = document.getElementById('cart-icon-target');
      if (cartTarget) {
        // Trigger soft bounce
        cartTarget.animate(
          [
            { transform: 'scale(1)', offset: 0 },
            { transform: 'scale(1.3) translateY(-5px)', offset: 0.5 },
            { transform: 'scale(1) translateY(0)', offset: 1 }
          ],
          { duration: 400, easing: 'ease-out' }
        );
      }
      
      window.dispatchEvent(new CustomEvent('cart-item-added'));
      
      // Ensure we call onComplete so the queue advances!
      onComplete();
    };

    sequence();
    return () => { isMounted = false; };
  }, [anim, centerX, centerY, boxControls, lidControls, flyingPizzaControls, glowControls, onComplete]);

  const isoStyle = {
    position: 'absolute' as const,
    inset: 0,
    transform: 'rotate(45deg) scaleY(0.577)',
    borderRadius: 8,
  };

  return (
    <>
      {/* ── Box Assembly ── */}
      <motion.div
        className="absolute z-[10000] pointer-events-none"
        style={{ width: BOX_SIZE, height: BOX_SIZE }}
        animate={boxControls}
      >
        {/* Glow Effect */}
        <motion.div 
          animate={glowControls}
          initial={{ opacity: 0 }}
          className="absolute inset-[-40px] bg-primary-500 rounded-full blur-2xl z-0"
        />

        {/* Box Base */}
        <div style={{
          ...isoStyle,
          backgroundColor: '#2D3748', // Dark premium color
          border: '2px solid #1A202C',
          boxShadow: `
            -1px 1px 0 #1A202C, -2px 2px 0 #1A202C, -3px 3px 0 #1A202C,
            -4px 4px 0 #1A202C, -5px 5px 0 #1A202C, -15px 15px 30px rgba(0,0,0,0.6)
          `,
          zIndex: 1
        }}>
          <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 40px rgba(0,0,0,0.8)', borderRadius: 6 }} />
        </div>

        {/* Lid */}
        <div style={{ ...isoStyle, zIndex: 3, perspective: 1200 }}>
          <motion.div
            animate={lidControls}
            style={{
              position: 'absolute', inset: 0,
              transformOrigin: 'left',
              transformStyle: 'preserve-3d',
            }}
          >
            {/* Inside Face of Lid */}
            <div style={{
              position: 'absolute', inset: 0,
              backgroundColor: '#4A5568', border: '2px solid #1A202C', borderRadius: 8,
              boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)'
            }} />

            {/* Outside Face of Lid (Branded) */}
            <div style={{
              position: 'absolute', inset: 0,
              backgroundColor: '#2D3748', border: '2px solid #1A202C', borderRadius: 8,
              backfaceVisibility: 'hidden',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'inset 0 0 30px rgba(249,115,22,0.1)'
            }}>
              <img 
                src="https://res.cloudinary.com/ditkqli2i/image/upload/v1782113833/olive-pizza-logo_nsoh49.webp" 
                alt="Olive Pizza"
                style={{ width: 70, zIndex: 2, filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.5))' }}
              />
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* ── Flying Pizza (External to Box initially, flies in) ── */}
      <motion.img
        src={anim.image}
        alt="Pizza"
        className="absolute object-cover rounded-full pointer-events-none z-[10001]"
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
