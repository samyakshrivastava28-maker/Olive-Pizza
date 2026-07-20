import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

export default function ProcessingOverlay({ status }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-dark-950/90 backdrop-blur-lg"
    >
      <div className="flex flex-col items-center">
         {status === 'processing' ? (
           <motion.div 
             animate={{ rotate: 360 }} transition={{ repeat: Infinity, ease: 'linear', duration: 2 }}
             className="w-24 h-24 border-4 border-white/10 border-t-primary-500 rounded-full mb-6"
           />
         ) : (
           <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.5 }}>
              <CheckCircle2 className="w-24 h-24 text-green-500 mb-6" />
           </motion.div>
         )}
         
         <motion.h2 
           key={status}
           initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
           className="text-2xl font-bold text-white text-center"
         >
           {status === 'processing' ? 'Processing Order...' : 'Order Placed Successfully!'}
         </motion.h2>
         {status === 'processing' && (
           <p className="text-white/50 mt-2 text-center">Please do not close or refresh this page.</p>
         )}
      </div>
    </motion.div>
  );
}
