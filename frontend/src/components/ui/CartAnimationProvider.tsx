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

      if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(50);
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

// ─── Premium Flying Box Component (8-Step Animation) ──────────────────────────
function PremiumFlyingBox({ anim, onComplete }: { anim: AnimationData; onComplete: () => void }) {
  const boxControls = useAnimation();
  const lidControls = useAnimation();
  const imageControls = useAnimation();
  const [showImage, setShowImage] = useState(true);

  // Center of screen for assembly
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 3;

  const BOX_SIZE = 80;
  const HALF = BOX_SIZE / 2;

  useEffect(() => {
    let isMounted = true;

    const sequence = async () => {
      // Setup initial states off-screen
      boxControls.set({ x: centerX - HALF, y: -200, scale: 0.8, rotateX: 45, rotateZ: -20, opacity: 0 });
      lidControls.set({ rotateX: 0 });
      imageControls.set({ 
        x: anim.startX - 30, // 60px image
        y: anim.startY - 30,
        scale: 1, 
        opacity: 1,
        boxShadow: '0 0 0px rgba(0,0,0,0)'
      });

      if (!isMounted) return;

      // Step 1: Selected pizza lifts from menu (Small scale, glow effect)
      await imageControls.start({
        scale: 1.3,
        boxShadow: '0 15px 30px rgba(85, 119, 90, 0.6)',
        transition: { type: 'spring', stiffness: 300, damping: 20 }
      });
      if (!isMounted) return;

      // Step 2: Realistic pizza box drops from top
      await boxControls.start({
        y: centerY - HALF,
        opacity: 1,
        rotateX: 30, // isometric view
        rotateZ: 0,
        transition: { type: 'spring', stiffness: 200, damping: 15 }
      });
      if (!isMounted) return;

      // Step 3: Lid automatically opens
      await lidControls.start({
        rotateX: -120,
        transition: { type: 'spring', stiffness: 150, damping: 15 }
      });
      if (!isMounted) return;

      // Step 4: Pizza shrinks and flies into box (Bezier easing)
      await imageControls.start({
        x: centerX - 30,
        y: centerY - 30,
        scale: 0.8,
        rotateZ: 180,
        boxShadow: '0 2px 5px rgba(0,0,0,0.5)',
        transition: {
          duration: 0.45,
          x: { ease: 'linear' },
          y: { ease: 'easeIn' }
        }
      });
      if (!isMounted) return;
      setShowImage(false);

      // Step 5: Lid closes naturally
      await lidControls.start({
        rotateX: 0,
        transition: { type: 'spring', stiffness: 200, damping: 12 }
      });
      if (!isMounted) return;

      // Step 6: Pizza box jumps slightly (Small compression bounce)
      await boxControls.start({
        scale: 0.75,
        y: centerY - HALF + 15,
        transition: { type: 'spring', stiffness: 500, damping: 10 }
      });
      if (!isMounted) return;
      await boxControls.start({
        scale: 0.8,
        y: centerY - HALF,
        transition: { type: 'spring', stiffness: 400, damping: 12 }
      });
      if (!isMounted) return;

      // Step 7: Pizza box flies toward cart (Bezier path)
      const cartX = anim.endX - HALF;
      const cartY = anim.endY - HALF;

      await boxControls.start({
        x: cartX,
        y: cartY,
        scale: 0.15,
        opacity: 0,
        rotateZ: 90,
        transition: {
          duration: 0.55,
          x: { ease: 'linear' },
          y: { ease: 'easeIn' },
          scale: { ease: 'easeIn' },
          opacity: { ease: 'easeIn' }
        }
      });
      if (!isMounted) return;

      // Step 8: Trigger cart events
      window.dispatchEvent(new CustomEvent('cart-item-added'));
      onComplete();
    };

    sequence();

    return () => { isMounted = false; };
  }, [anim, centerX, centerY, boxControls, lidControls, imageControls, onComplete, HALF]);

  return (
    <>
      {/* ── Realistic 3D Pizza Box ── */}
      <motion.div
        className="absolute z-[10000] flex items-center justify-center pointer-events-none"
        style={{
          width: BOX_SIZE,
          height: BOX_SIZE,
          transformStyle: 'preserve-3d',
          perspective: 1200
        }}
        animate={boxControls}
      >
        {/* Box Shadow on ground */}
        <div style={{
          position: 'absolute',
          bottom: -20, left: '10%', right: '10%', height: 20,
          background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0) 70%)',
          transform: 'rotateX(70deg)',
          zIndex: -1
        }} />

        {/* Box Base (Tray) */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundColor: '#e6dfd1',
          borderRadius: 4,
          border: '1px solid #c9beaa',
          boxShadow: 'inset 0 10px 20px rgba(0,0,0,0.1), 0 5px 15px rgba(0,0,0,0.2)',
          transformStyle: 'preserve-3d'
        }}>
          {/* Cardboard Texture Overlay */}
          <div style={{
            position: 'absolute', inset: 0, opacity: 0.4,
            backgroundImage: 'url("https://www.transparenttextures.com/patterns/cardboard-flat.png")'
          }} />
        </div>

        {/* Lid (Hinged Top) */}
        <motion.div 
          style={{
            position: 'absolute',
            inset: 0,
            transformOrigin: 'top',
            transformStyle: 'preserve-3d',
            zIndex: 10
          }}
          animate={lidControls}
        >
          {/* Front Face (Outside Logo) */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundColor: '#f6f2e9',
            borderRadius: 4,
            border: '1px solid #d4c5b0',
            backfaceVisibility: 'hidden',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
          }}>
            <div style={{
              position: 'absolute', inset: 0, opacity: 0.3,
              backgroundImage: 'url("https://www.transparenttextures.com/patterns/cardboard-flat.png")'
            }} />
            <div style={{
              width: 30, height: 30,
              backgroundColor: '#55775a',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 4, zIndex: 2
            }}>
              <span style={{ color: 'white', fontWeight: 900, fontSize: '10px' }}>OP</span>
            </div>
            <span style={{ color: '#55775a', fontWeight: 900, fontSize: '10px', zIndex: 2, letterSpacing: '-0.5px' }}>Olive Pizza</span>
          </div>

          {/* Back Face (Inside Lid) */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundColor: '#e2d5c1',
            borderRadius: 4,
            border: '1px solid #cbbda5',
            backfaceVisibility: 'hidden',
            transform: 'rotateX(180deg)'
          }}>
            <div style={{
              position: 'absolute', inset: 0, opacity: 0.2,
              backgroundImage: 'url("https://www.transparenttextures.com/patterns/cardboard-flat.png")'
            }} />
          </div>
        </motion.div>
      </motion.div>

      {/* ── Flowing Pizza Image ── */}
      <AnimatePresence>
        {showImage && (
          <motion.img
            src={anim.image}
            alt="Pizza"
            className="absolute object-cover rounded-full z-[10001] pointer-events-none"
            style={{ width: 60, height: 60 }}
            animate={imageControls}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useCartAnimation = () => {
  const context = useContext(CartAnimationContext);
  if (!context) throw new Error('useCartAnimation must be used within CartAnimationProvider');
  return context;
};
