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
  const insidePizzaControls = useAnimation();

  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 3;

  const BOX_SIZE = 120;
  const HALF = BOX_SIZE / 2;
  const PIZZA_SIZE = 80; // Flying pizza size

  useEffect(() => {
    let isMounted = true;

    const sequence = async () => {
      // Setup initial states
      boxControls.set({ x: centerX - HALF, y: -400, scale: 0.5, opacity: 0 });
      lidControls.set({ rotateY: -115 }); // Lid swung open
      
      flyingPizzaControls.set({ 
        x: anim.startX - PIZZA_SIZE / 2, 
        y: anim.startY - PIZZA_SIZE / 2,
        scale: 1, opacity: 1, rotateZ: 0, rotateX: 0,
        boxShadow: '0 0 0px rgba(0,0,0,0)'
      });
      insidePizzaControls.set({ opacity: 0 });

      if (!isMounted) return;

      // ── Step 1: Pizza lifts & Box drops IN PARALLEL ──
      await Promise.all([
        flyingPizzaControls.start({
          scale: 1.2,
          y: anim.startY - PIZZA_SIZE / 2 - 20,
          boxShadow: '0 20px 40px rgba(85, 119, 90, 0.5)',
          transition: { type: 'spring', stiffness: 600, damping: 20 }
        }),
        boxControls.start({
          y: centerY - HALF,
          scale: 1,
          opacity: 1,
          transition: { type: 'spring', stiffness: 400, damping: 20 }
        })
      ]);
      if (!isMounted) return;

      // ── Step 2: Pizza shrinks and flies into box ──
      await flyingPizzaControls.start({
        x: centerX - PIZZA_SIZE / 2,
        y: centerY - PIZZA_SIZE / 2,
        scale: 1.2,
        rotateZ: 45,
        rotateX: 55, // Isometric squash match
        boxShadow: '0 5px 15px rgba(0,0,0,0.5)',
        transition: { duration: 0.25, x: { ease: 'linear' }, y: { ease: 'easeIn' } }
      });
      if (!isMounted) return;

      // Swap flying pizza with inside pizza seamlessly
      flyingPizzaControls.set({ opacity: 0 });
      insidePizzaControls.set({ opacity: 1 });

      // ── Step 3: Lid closes & Box flies to cart IN PARALLEL ──
      const cartX = anim.endX - HALF;
      const cartY = anim.endY - HALF;

      await Promise.all([
        lidControls.start({
          rotateY: 0,
          transition: { type: 'spring', stiffness: 600, damping: 25 }
        }),
        boxControls.start({
          x: cartX, y: cartY, scale: 0.15, opacity: 0, rotateZ: 90,
          transition: { duration: 0.45, x: { ease: 'linear' }, y: { ease: 'easeIn' }, scale: { ease: 'easeIn' }, delay: 0.05 }
        })
      ]);
      if (!isMounted) return;

      // ── Step 4: Complete ──
      window.dispatchEvent(new CustomEvent('cart-item-added'));
      onComplete();
    };

    sequence();
    return () => { isMounted = false; };
  }, [anim, centerX, centerY, boxControls, lidControls, flyingPizzaControls, insidePizzaControls, onComplete]);

  const isoStyle = {
    position: 'absolute' as const,
    inset: 0,
    transform: 'rotate(45deg) scaleY(0.577)', // Mathematically perfect isometric projection
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
        {/* Box Base (Faux 3D Extrusion) */}
        <div style={{
          ...isoStyle,
          backgroundColor: '#D1B48C',
          border: '2px solid #A67C52',
          boxShadow: `
            -1px 1px 0 #9E744A, -2px 2px 0 #9E744A, -3px 3px 0 #9E744A, -4px 4px 0 #9E744A,
            -5px 5px 0 #9E744A, -6px 6px 0 #9E744A, -7px 7px 0 #9E744A, -8px 8px 0 #9E744A,
            -9px 9px 0 #9E744A, -10px 10px 0 #9E744A, -15px 15px 25px rgba(0,0,0,0.5)
          `,
          zIndex: 1
        }}>
          {/* Cardboard Texture */}
          <div style={{ position: 'absolute', inset: 0, opacity: 0.3, backgroundImage: 'url("https://www.transparenttextures.com/patterns/cardboard-flat.png")' }} />
          {/* Inner grease/shadow tray */}
          <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 30px rgba(139,69,19,0.3)', borderRadius: 6 }} />
        </div>

        {/* Inside Pizza (Rendered after swap) */}
        <motion.img 
          src={anim.image}
          animate={insidePizzaControls}
          style={{
            ...isoStyle,
            width: '80%', height: '80%',
            left: '10%', top: '10%',
            objectFit: 'cover', borderRadius: '50%',
            zIndex: 2,
            boxShadow: '0 5px 15px rgba(0,0,0,0.4)'
          }}
        />

        {/* Lid (Hinged at local left edge) */}
        <div style={{ ...isoStyle, zIndex: 3, perspective: 1000 }}>
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
              backgroundColor: '#C5A57A', border: '2px solid #A67C52', borderRadius: 8,
              boxShadow: 'inset 0 0 20px rgba(0,0,0,0.1)'
            }}>
              <div style={{ position: 'absolute', inset: 0, opacity: 0.3, backgroundImage: 'url("https://www.transparenttextures.com/patterns/cardboard-flat.png")' }} />
            </div>

            {/* Outside Face of Lid (Branded) */}
            <div style={{
              position: 'absolute', inset: 0,
              backgroundColor: '#E8CC9A', border: '2px solid #A67C52', borderRadius: 8,
              backfaceVisibility: 'hidden',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
            }}>
              <div style={{ position: 'absolute', inset: 0, opacity: 0.2, backgroundImage: 'url("https://www.transparenttextures.com/patterns/cardboard-flat.png")' }} />
              <img 
                src="https://res.cloudinary.com/ditkqli2i/image/upload/v1782113833/olive-pizza-logo_nsoh49.webp" 
                alt="Olive Pizza"
                style={{ width: 60, zIndex: 2, filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.2))' }}
              />
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* ── Flying Pizza (External to Box) ── */}
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
