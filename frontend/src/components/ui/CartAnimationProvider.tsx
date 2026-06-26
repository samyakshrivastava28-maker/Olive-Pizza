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

  /**
   * Get the current screen coordinates of the floating cart bag icon.
   * Falls back to bottom-right corner if element not found.
   */
  const getCartTarget = (): { x: number; y: number } => {
    const el = document.getElementById('cart-icon-target');
    if (el) {
      const rect = el.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }
    // Fallback: bottom-right (where the floating cart lives)
    return { x: window.innerWidth - 48, y: window.innerHeight - 80 };
  };

  const triggerAnimation = useCallback(
    (e: React.MouseEvent | { clientX: number; clientY: number }, image: string) => {
      const newId = idCounter.current++;
      const target = getCartTarget();

      setAnimations((prev) => [
        ...prev,
        {
          id: newId,
          startX: e.clientX,
          startY: e.clientY,
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
      }, 1100);
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
      <div className="fixed inset-0 pointer-events-none z-[999] overflow-hidden">
        <AnimatePresence>
          {animations.map((anim) => (
            <FlyingPizza key={anim.id} anim={anim} />
          ))}
        </AnimatePresence>
      </div>
    </CartAnimationContext.Provider>
  );
}

// ─── Flying Pizza Component ───────────────────────────────────────────────────

function FlyingPizza({ anim }: { anim: AnimationData }) {
  const SIZE = 80; // px — size of the flying image
  const HALF = SIZE / 2;

  // Control point for the arc (curve the flight path)
  const midX = (anim.startX + anim.endX) / 2 - 60;
  const midY = Math.min(anim.startY, anim.endY) - 150;

  return (
    <motion.div
      className="absolute"
      style={{
        left: anim.startX - HALF,
        top: anim.startY - HALF,
        width: SIZE,
        height: SIZE,
      }}
      initial={{ opacity: 1, scale: 1, x: 0, y: 0 }}
      animate={{
        // Cubic bezier arc path via keyframes
        x: [0, midX - (anim.startX - HALF), anim.endX - anim.startX + HALF],
        y: [0, midY - (anim.startY - HALF), anim.endY - anim.startY + HALF],
        scale: [1, 1.15, 0.15],
        rotate: [0, -20, 360],
        opacity: [1, 1, 0],
      }}
      transition={{
        duration: 1.0,
        times: [0, 0.45, 1],
        ease: ['easeOut', 'easeIn'],
      }}
    >
      {/* Glow ring */}
      <motion.div
        className="absolute inset-0 rounded-full"
        initial={{ boxShadow: '0 0 0px 0px rgba(249,115,22,0)' }}
        animate={{
          boxShadow: [
            '0 0 0px 0px rgba(249,115,22,0)',
            '0 0 20px 8px rgba(249,115,22,0.6)',
            '0 0 0px 0px rgba(249,115,22,0)',
          ],
        }}
        transition={{ duration: 1.0, times: [0, 0.4, 1] }}
      />

      {/* Pizza image */}
      <img
        src={anim.image}
        alt=""
        className="w-full h-full object-contain drop-shadow-2xl rounded-full"
        style={{ filter: 'drop-shadow(0 8px 24px rgba(249,115,22,0.5))' }}
      />

      {/* Bag icon appears at the end */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center rounded-full bg-primary-600"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: [0, 0, 1], scale: [0, 0, 1] }}
        transition={{ duration: 1.0, times: [0, 0.7, 1] }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="w-8 h-8">
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 01-8 0" />
        </svg>
      </motion.div>
    </motion.div>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useCartAnimation = () => {
  const context = useContext(CartAnimationContext);
  if (!context) throw new Error('useCartAnimation must be used within CartAnimationProvider');
  return context;
};
