import { useState, useEffect } from 'react';
import { usePWA } from '../../lib/usePWA';
import { Download, RefreshCw, X, Smartphone, Monitor, Laptop, Tablet } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function getDeviceType() {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return 'Tablet';
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) return 'Mobile';
  if (/(macintosh|mac os x)/i.test(ua)) return 'Mac';
  return 'Desktop';
}

export default function PWAPrompts() {
  const { needRefresh, updateApp, installApp, canInstall } = usePWA();
  const [showInstall, setShowInstall] = useState(false);
  const [deviceType, setDeviceType] = useState('Desktop');

  useEffect(() => {
    setDeviceType(getDeviceType());
    
    // Show after 30 seconds if it can be installed
    if (canInstall) {
      const timer = setTimeout(() => {
        const dismissed = localStorage.getItem('pwa_install_dismissed');
        if (!dismissed) {
          setShowInstall(true);
        }
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [canInstall]);

  const handleDismiss = () => {
    setShowInstall(false);
    localStorage.setItem('pwa_install_dismissed', 'true');
  };

  const getDeviceIcon = () => {
    switch (deviceType) {
      case 'Mobile': return <Smartphone className="w-5 h-5 text-primary-500" />;
      case 'Tablet': return <Tablet className="w-5 h-5 text-primary-500" />;
      case 'Mac': return <Laptop className="w-5 h-5 text-primary-500" />;
      default: return <Monitor className="w-5 h-5 text-primary-500" />;
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] pointer-events-none flex flex-col items-center p-4 gap-4">
      <AnimatePresence>
        {needRefresh && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="pointer-events-auto bg-dark-900 border border-primary-500 shadow-2xl rounded-2xl p-4 max-w-md w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="bg-primary-500/20 p-2 rounded-full text-primary-500">
                <RefreshCw className="w-6 h-6 animate-spin-slow" />
              </div>
              <div>
                <h4 className="font-bold text-white">New Version Available</h4>
                <p className="text-sm text-slate-400">Update now for the best experience.</p>
              </div>
            </div>
            <button 
              onClick={updateApp}
              className="bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-xl font-bold transition-colors"
            >
              Update
            </button>
          </motion.div>
        )}

        {showInstall && !needRefresh && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="pointer-events-auto bg-[#1E293B] border border-white/10 shadow-2xl rounded-2xl p-4 max-w-sm w-full relative"
          >
            <button onClick={handleDismiss} className="absolute top-2 right-2 text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
            <div className="flex gap-4 items-center">
              <div className="bg-dark-950 p-3 rounded-xl border border-dark-800">
                {getDeviceIcon()}
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-white leading-tight">Install Olive Pizza</h4>
                <p className="text-xs text-slate-400 mt-1">Get the native app for your {deviceType}</p>
              </div>
              <button 
                onClick={() => {
                  installApp();
                  setShowInstall(false);
                }}
                className="bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-xl font-bold transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Install
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
