import { useState, useEffect } from 'react';
import { useAuthStore } from '../../lib/store';
import { db } from '../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LocationPrompt() {
  const { user, isAuthenticated, setUser } = useAuthStore();
  const [showPrompt, setShowPrompt] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user && !user.lat && !user.fullAddress && !dismissed) {
      // Small delay to not overwhelm immediately on login
      const timer = setTimeout(() => setShowPrompt(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, user, dismissed]);

  const requestLocation = () => {
    setLoading(true);
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // Reverse geocoding (basic implementation, ideally use Google Maps API)
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await response.json();
          const address = data.display_name;

          // Update Firestore
          if (user?.uid) {
            await updateDoc(doc(db, 'users', user.uid), {
              lat: latitude,
              lng: longitude,
              fullAddress: address || 'Current Location'
            });

            // Update Zustand Store
            setUser({
              ...user,
              lat: latitude,
              lng: longitude,
              fullAddress: address || 'Current Location'
            }, user.role);

            toast.success('Location updated successfully!');
            setShowPrompt(false);
          }
        } catch (error) {
          console.error('Error fetching address:', error);
          toast.error('Failed to get address. Please set manually.');
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        toast.error('Location permission denied. You can set it manually later.');
        setShowPrompt(false);
        setLoading(false);
        setDismissed(true);
      },
      { enableHighAccuracy: true }
    );
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="fixed bottom-20 left-4 right-4 md:left-auto md:right-8 md:bottom-8 z-50 max-w-sm bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl shadow-primary-500/10"
        >
          <button 
            onClick={() => { setShowPrompt(false); setDismissed(true); }}
            className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="w-12 h-12 bg-primary-500/20 rounded-full flex items-center justify-center mb-4">
            <MapPin className="w-6 h-6 text-primary-500" />
          </div>
          
          <h3 className="text-xl font-bold text-white mb-2">Set Delivery Location</h3>
          <p className="text-sm text-slate-300 mb-6 leading-relaxed">
            Allow location access to see accurate delivery fees, nearest outlets, and live tracking.
          </p>
          
          <div className="flex flex-col gap-3">
            <button
              onClick={requestLocation}
              disabled={loading}
              className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Detecting...</>
              ) : (
                'Allow Location Access'
              )}
            </button>
            <button
              onClick={() => { setShowPrompt(false); setDismissed(true); }}
              className="w-full bg-transparent hover:bg-white/5 text-slate-300 font-medium py-3 rounded-xl transition-colors"
            >
              Enter Manually Later
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
