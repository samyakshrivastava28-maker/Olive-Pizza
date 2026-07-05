import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi } from 'lucide-react';

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowRestored(true);
      setTimeout(() => setShowRestored(false), 3000); // Hide the "restored" message after 3 seconds
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowRestored(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[100] bg-red-500 text-white py-2 px-4 flex items-center justify-center shadow-lg"
        >
          <WifiOff className="w-4 h-4 mr-2" />
          <span className="text-sm font-semibold">You're offline. Please reconnect to continue.</span>
        </motion.div>
      )}

      {isOnline && showRestored && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[100] bg-green-500 text-white py-2 px-4 flex items-center justify-center shadow-lg"
        >
          <Wifi className="w-4 h-4 mr-2" />
          <span className="text-sm font-semibold">Connection restored.</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
