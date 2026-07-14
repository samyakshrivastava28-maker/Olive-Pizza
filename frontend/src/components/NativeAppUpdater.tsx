import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Download, Pizza } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../lib/store';

export default function NativeAppUpdater() {
  const [needsNativeUpdate, setNeedsNativeUpdate] = useState(false);
  const [latestVersion, setLatestVersion] = useState<string>('');
  const [currentVersion, setCurrentVersion] = useState<string>('');
  
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const checkNativeVersion = async () => {
      try {
        const info = await App.getInfo();
        const currentNativeVersion = parseFloat(info.version);
        setCurrentVersion(info.version);
        
        const res = await fetch('/api/version/settings', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          const minRequired = parseFloat(data.minimum_version);
          const latest = parseFloat(data.latest_version);
          
          if (currentNativeVersion < minRequired) {
            setLatestVersion(data.latest_version);
            setNeedsNativeUpdate(true);
          }
        }
      } catch (err) {
        console.error('Failed to check native version', err);
      }
    };

    checkNativeVersion();
    
    // Check when app resumes
    App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) checkNativeVersion();
    });
  }, []);

  const handleDownloadUpdate = () => {
    // Open GitHub Releases page
    window.location.href = 'https://github.com/samyakshrivastava28-maker/Olive-Pizza/releases/latest';
  };

  const handleLogout = () => {
    useAuthStore.getState().logout();
    window.location.reload();
  }

  if (!needsNativeUpdate) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full bg-orange-600/20 blur-[120px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] rounded-full bg-red-600/20 blur-[120px]" />
        </div>

        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative max-w-md w-full bg-slate-800/80 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-2xl text-center"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-lg shadow-orange-500/30">
            <Pizza className="w-10 h-10 text-white" />
          </div>
          
          <h1 className="text-3xl font-black text-white mb-2 tracking-tight">App Update Required</h1>
          <p className="text-slate-400 mb-8 leading-relaxed">
            Your Olive Pizza app is outdated and no longer supported. Please download and install the latest APK to continue.
          </p>

          <div className="bg-slate-900/50 rounded-2xl p-5 text-left mb-8 border border-slate-700/50">
            <div className="flex justify-between items-center text-sm font-mono text-slate-300">
              <span className="text-slate-500">Current App Version:</span>
              <span className="text-red-400 font-bold">v{currentVersion}</span>
            </div>
            <div className="flex justify-between items-center text-sm font-mono text-slate-300 mt-2">
              <span className="text-slate-500">Latest Available:</span>
              <span className="text-green-400 font-bold">v{latestVersion}</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleDownloadUpdate}
              className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white font-bold rounded-xl shadow-lg shadow-orange-500/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              Download Latest APK
            </button>
            <button
              onClick={handleLogout}
              className="w-full py-3 bg-transparent border border-slate-700 hover:bg-white/5 text-slate-400 font-bold rounded-xl transition-all"
            >
              Logout & Exit
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
