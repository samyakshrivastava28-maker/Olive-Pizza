import React from 'react';
import { motion } from 'framer-motion';
import { Mic, Volume2, Sparkles } from 'lucide-react';

export interface AIVoiceStateIndicatorProps {
  mode: 'listening' | 'speaking';
  onStop?: () => void;
}

export const AIVoiceStateIndicator: React.FC<AIVoiceStateIndicatorProps> = ({ mode, onStop }) => {
  const isListening = mode === 'listening';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -10 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="flex flex-col items-center justify-center p-4 bg-dark-900/95 border border-amber-400/30 rounded-3xl backdrop-blur-2xl shadow-[0_10px_30px_rgba(245,158,11,0.25)] my-2 max-w-xs mx-auto relative overflow-hidden"
    >
      {/* Dynamic Background Glow */}
      <motion.div
        animate={{
          scale: [1, 1.25, 1],
          opacity: [0.3, 0.7, 0.3],
        }}
        transition={{
          duration: isListening ? 1.4 : 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className={`absolute inset-0 rounded-full blur-2xl pointer-events-none ${
          isListening
            ? 'bg-gradient-to-r from-red-500/30 via-amber-500/40 to-orange-500/30'
            : 'bg-gradient-to-r from-amber-400/30 via-emerald-400/20 to-amber-500/30'
        }`}
      />

      {/* Ripple Rings */}
      <div className="relative w-20 h-20 flex items-center justify-center mb-2">
        {[0, 1, 2].map((ring) => (
          <motion.div
            key={ring}
            animate={{
              scale: [0.9, 1.7],
              opacity: [0.8, 0],
            }}
            transition={{
              duration: isListening ? 1.6 : 2.2,
              repeat: Infinity,
              delay: ring * 0.5,
              ease: 'easeOut',
            }}
            className={`absolute inset-0 rounded-full border ${
              isListening ? 'border-amber-400/50' : 'border-emerald-400/40'
            }`}
          />
        ))}

        {/* Central Icon Avatar */}
        <motion.div
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl border relative z-10 ${
            isListening
              ? 'bg-gradient-to-br from-amber-500 to-orange-600 border-amber-300 text-dark-950'
              : 'bg-gradient-to-br from-emerald-500 to-amber-500 border-amber-300 text-dark-950'
          }`}
        >
          {isListening ? (
            <Mic size={26} className="animate-pulse stroke-[2.5]" />
          ) : (
            <Volume2 size={26} className="stroke-[2.5]" />
          )}
        </motion.div>
      </div>

      {/* Live Voice Audio Waveform Bars */}
      <div className="flex items-center gap-1.5 h-6 mb-2">
        {[0.4, 0.9, 0.6, 1, 0.7, 0.3, 0.85].map((val, idx) => (
          <motion.div
            key={idx}
            animate={{
              height: isListening ? ['8px', `${val * 24}px`, '6px'] : ['6px', `${val * 18}px`, '8px'],
            }}
            transition={{
              duration: isListening ? 0.4 + idx * 0.08 : 0.6 + idx * 0.1,
              repeat: Infinity,
              repeatType: 'reverse',
              ease: 'easeInOut',
            }}
            className={`w-1.5 rounded-full ${
              isListening ? 'bg-amber-400' : 'bg-emerald-400'
            }`}
          />
        ))}
      </div>

      {/* Label Text */}
      <div className="flex items-center gap-1.5 text-xs font-black text-white">
        <Sparkles size={14} className="text-amber-400 animate-spin" />
        <span>{isListening ? 'Olive AI Listening...' : 'Olive AI Speaking...'}</span>
      </div>

      {onStop && (
        <button
          onClick={onStop}
          className="mt-2 text-[10px] text-slate-400 hover:text-amber-400 underline transition-colors"
        >
          Stop Audio
        </button>
      )}
    </motion.div>
  );
};
