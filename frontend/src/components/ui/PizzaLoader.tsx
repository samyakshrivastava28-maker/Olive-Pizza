import { motion, AnimatePresence } from 'framer-motion';
import { useLoadingStore } from '../../lib/loadingStore';

export default function PizzaLoader() {
  const { isLoading, currentMessage } = useLoadingStore();

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0 } }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] backdrop-blur-md bg-black/40 flex flex-col items-center justify-center pointer-events-auto"
        >
          <div className="glass-card bg-white/10 dark:bg-slate-900/40 p-8 rounded-[40px] border border-white/20 shadow-2xl flex flex-col items-center justify-center relative overflow-hidden backdrop-blur-2xl w-72 h-72">
            
            {/* Glow effect */}
            <div className="absolute inset-0 bg-primary-500/20 blur-[50px] rounded-full pointer-events-none" />

            <div className="relative w-40 h-40 mb-4 z-10">
              <img 
                src="https://cdnl.iconscout.com/lottie/premium/thumb/pizza-loader-animation-gif-download-5673819.gif" 
                alt="Loading..."
                className="w-full h-full object-contain drop-shadow-2xl"
              />
            </div>

            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="z-10"
            >
              <p className="text-white font-black tracking-widest uppercase text-sm drop-shadow-md text-center">
                {currentMessage}
              </p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
