import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
    e: React.MouseEvent | { clientX: number; clientY: number },
    image: string
  ) => void;
}

const CartAnimationContext = createContext<CartAnimationContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function CartAnimationProvider({ children }: { children: React.ReactNode }) {
  const [animations, setAnimations] = useState<AnimationData[]>([]);
  const idCounter = useRef(0);

  const getCartTarget = (): { x: number; y: number } => {
    // Try to find the floating cart first (usually visible on desktop)
    let el = document.getElementById('cart-icon-target');
    
    // If not found or if we are on a small screen where mobile nav is visible, look for mobile nav target
    if (window.innerWidth < 768) {
       const mobileNav = document.getElementById('mobile-cart-nav-target');
       if (mobileNav) el = mobileNav;
    }

    if (el) {
      const rect = el.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }
    // Fallback: bottom-right
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
      } else if (e && 'clientX' in e && typeof e.clientX === 'number') {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(50);
      }

      setAnimations((prev) => [
        ...prev,
        {
          id: newId,
          startX: clientX,
          startY: clientY,
          endX: target.x,
          endY: target.y,
          image,
        },
      ]);

      // Cleanup + bounce the cart icon after flight completes
      setTimeout(() => {
        setAnimations((prev) => prev.filter((a) => a.id !== newId));
        // Bounce the cart bag icon
        const cartIcon = document.getElementById('cart-icon-target');
        if (cartIcon) {
          cartIcon.classList.add('cart-bounce');
          setTimeout(() => cartIcon.classList.remove('cart-bounce'), 600);
        }
      }, 900);
    },
    []
  );

  return (
    <CartAnimationContext.Provider value={{ triggerAnimation }}>
      {children}

      {/* Global style for cart bounce */}
      <style>{`
        @keyframes cartBounce {
          0%   { transform: scale(1) rotate(0deg); }
          25%  { transform: scale(1.4) rotate(-12deg); }
          50%  { transform: scale(1.2) rotate(8deg); }
          75%  { transform: scale(1.35) rotate(-6deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        .cart-bounce {
          animation: cartBounce 0.6s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
        }
      `}</style>

      {/* Animation Portal — renders on top of everything */}
      <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
        <AnimatePresence>
          {animations.map((anim) => (
            <FlyingBox key={anim.id} anim={anim} />
          ))}
        </AnimatePresence>
      </div>
    </CartAnimationContext.Provider>
  );
}

// ─── Flying Box Component ───────────────────────────────────────────────────
import { PackageOpen } from 'lucide-react';

function FlyingBox({ anim }: { anim: AnimationData }) {
  const SIZE = 70; // px — size of the flying box
  const HALF = SIZE / 2;

  // Control point for the arc (curve the flight path)
  const midX = (anim.startX + anim.endX) / 2 - 40;
  const midY = Math.min(anim.startY, anim.endY) - 150;

  return (
    <motion.div
      className="absolute flex items-center justify-center z-[9999] drop-shadow-2xl"
      style={{
        left: anim.startX - HALF,
        top: anim.startY - HALF,
        width: SIZE,
        height: SIZE,
      }}
      initial={{ opacity: 1, scale: 0.5, x: 0, y: 0 }}
      animate={{
        // Cubic bezier arc path via keyframes
        x: [0, midX - (anim.startX - HALF), anim.endX - anim.startX + HALF],
        y: [0, midY - (anim.startY - HALF), anim.endY - anim.startY + HALF],
        scale: [0.5, 1.3, 0.15],
        rotate: [0, 10, 360],
        opacity: [1, 1, 0],
      }}
      transition={{
        duration: 0.9,
        times: [0, 0.45, 1],
        ease: ['easeOut', 'easeIn'],
      }}
    >
      {/* Box visual wrapper */}
      <div className="relative w-[70px] h-[70px] flex items-center justify-center bg-orange-200/90 backdrop-blur-md rounded-lg border-2 border-orange-500 shadow-[0_10px_25px_rgba(249,115,22,0.6)] overflow-hidden">
        
        {/* The product image packing into the box */}
        <motion.img
          src={anim.image}
          alt=""
          className="absolute w-12 h-12 object-contain rounded-full shadow-md z-10"
          initial={{ y: -30, scale: 1.2, opacity: 0 }}
          animate={{ y: 0, scale: 0.8, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        />

        {/* Box flaps/lid */}
        <motion.div 
          className="absolute top-0 left-0 right-0 h-4 bg-orange-400 border-b-2 border-orange-600 z-20 origin-top"
          initial={{ rotateX: 0 }}
          animate={{ rotateX: -90 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        />

        <PackageOpen className="absolute bottom-1 right-1 w-4 h-4 text-orange-600/50" />
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
