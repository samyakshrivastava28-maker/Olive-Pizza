import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { ShoppingBag, ChevronRight, Sparkles } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router';
import { useCartStore } from '../../lib/store';

export default function FloatingCart() {
  const location = useLocation();
  
  // Hide on tracking, checkout, cart, or order detail pages
  const p = location.pathname;
  const isHiddenPage = [
    '/cart',
    '/checkout',
    '/order-tracking',
    '/tracking',
    '/track',
    '/order-success',
    '/recheck-order',
    '/processing-order',
    '/order/',
    '/orders/',
    '/order-details',
    '/owner',
    '/delivery'
  ].some(prefix => p === prefix || p.startsWith(prefix));

  if (isHiddenPage) return null;
  const playSuccessSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
      
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      // Ignore
    }
  };

  const { items, total } = useCartStore();
  const navigate = useNavigate();
  const count = items.reduce((acc, item) => acc + item.quantity, 0);
  const controls = useAnimation();
  const [particles, setParticles] = useState<{ id: number; x: number; y: number }[]>([]);

  useEffect(() => {
    const handleItemAdded = () => {
      playSuccessSound();
      // Trigger the bounce and glow animation
      controls.start({
        scale: [1, 1.1, 0.9, 1.05, 1],
        boxShadow: [
          '0 10px 40px rgba(85,119,90,0.4)',
          '0 20px 60px rgba(249,115,22,0.8)',
          '0 10px 40px rgba(85,119,90,0.4)'
        ],
        transition: { duration: 0.6, ease: "easeInOut" }
      });

      // Spawn particles
      const newParticles = Array.from({ length: 6 }).map((_, i) => ({
        id: Date.now() + i,
        x: (Math.random() - 0.5) * 100,
        y: (Math.random() - 0.5) * 100
      }));
      setParticles(prev => [...prev, ...newParticles]);
      
      // Cleanup particles
      setTimeout(() => {
        setParticles(prev => prev.filter(p => !newParticles.find(n => n.id === p.id)));
      }, 1000);
    };

    window.addEventListener('cart-item-added', handleItemAdded);
    return () => window.removeEventListener('cart-item-added', handleItemAdded);
  }, [controls]);

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ y: 150, opacity: 0, scale: 0.8 }}
          animate={{ y: [-3, 3, -3], opacity: 1, scale: 1 }}
          exit={{ y: 150, opacity: 0, scale: 0.8 }}
          transition={{ 
            y: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
            opacity: { duration: 0.3 },
            scale: { type: 'spring', damping: 20, stiffness: 200 }
          }}
          className="fixed left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-md z-[70] pointer-events-none"
          style={{ bottom: 'var(--app-floating-bottom-offset, calc(72px + env(safe-area-inset-bottom, 0px) + 12px))' }}
        >
          {/* Continuous Idle Animation Wrapper */}
          <motion.div
             animate={{ y: [0, -6, 0] }}
             transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
             className="w-full relative"
          >
            <motion.button
              animate={controls}
              onClick={() => navigate('/cart')}
              id="cart-icon-target"
              className="w-full bg-gradient-to-r from-primary-600 to-primary-500 rounded-3xl p-4 shadow-[0_10px_40px_rgba(85,119,90,0.4)] border border-primary-400/30 flex items-center justify-between text-white pointer-events-auto active:scale-95 transition-transform group relative overflow-hidden"
            >
              {/* Soft breathing background glow */}
              <motion.div 
                 className="absolute inset-0 bg-gradient-to-r from-orange-400/20 to-primary-400/20 mix-blend-overlay"
                 animate={{ opacity: [0, 0.5, 0] }}
                 transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
              />

              <div className="flex items-center gap-4 relative z-10">
                <div className="bg-white/20 p-3 rounded-2xl relative shadow-inner">
                  <ShoppingBag className="w-6 h-6 text-white" />
                  
                  {/* Live Badge Update */}
                  <motion.div
                    key={count}
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', damping: 12, stiffness: 250 }}
                    className="absolute -top-2 -right-2 bg-gradient-to-br from-orange-400 to-red-500 text-white text-[11px] font-black min-w-[20px] h-[20px] px-1 flex items-center justify-center rounded-full border-2 border-primary-500 shadow-md"
                  >
                    {count}
                  </motion.div>
                </div>
                
                <div className="text-left flex-1 min-w-0">
                  <p className="text-sm font-bold opacity-90 truncate">{count} Item{count > 1 ? 's' : ''}</p>
                  <motion.p 
                     key={total}
                     initial={{ y: 10, opacity: 0 }}
                     animate={{ y: 0, opacity: 1 }}
                     className="text-xl font-black tracking-tight leading-none drop-shadow-md"
                  >
                     ₹{total}
                  </motion.p>
                </div>
              </div>
              
              <div className="flex items-center gap-1 font-bold text-sm bg-white/15 px-4 py-2 rounded-xl group-hover:bg-white/25 transition-colors relative z-10 shadow-inner backdrop-blur-sm">
                View Cart <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.button>

            {/* Particles */}
            <AnimatePresence>
               {particles.map(p => (
                 <motion.div
                   key={p.id}
                   initial={{ opacity: 1, x: 0, y: 0, scale: 0 }}
                   animate={{ opacity: 0, x: p.x, y: p.y, scale: 1.5, rotate: p.x * 2 }}
                   exit={{ opacity: 0 }}
                   transition={{ duration: 0.8, ease: "easeOut" }}
                   className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none text-orange-400"
                 >
                   <Sparkles className="w-5 h-5" />
                 </motion.div>
               ))}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
