import { useEffect, useState } from 'react';
import { messaging, db, auth } from '../lib/firebase';
import { getToken } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { Bell, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PushNotificationManager() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [userUid, setUserUid] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserUid(user.uid);
        // Only show prompt if permission is 'default' (not yet asked)
        if (Notification.permission === 'default') {
          // Add a small delay so it doesn't pop up instantly over loaders
          const timer = setTimeout(() => setShowPrompt(true), 3000);
          return () => clearTimeout(timer);
        } else if (Notification.permission === 'granted') {
          requestPermissionAndSaveToken(user.uid);
        }
      } else {
        setUserUid(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const requestPermissionAndSaveToken = async (uid: string) => {
    try {
      if (!messaging) return; // Browser doesn't support notifications

      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setShowPrompt(false);
        const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
        if (!vapidKey) {
          console.error('VITE_FIREBASE_VAPID_KEY is missing');
          return;
        }

        const swUrl = `/firebase-messaging-sw.js?apiKey=${import.meta.env.VITE_FIREBASE_API_KEY}&authDomain=${import.meta.env.VITE_FIREBASE_AUTH_DOMAIN}&projectId=${import.meta.env.VITE_FIREBASE_PROJECT_ID}&storageBucket=${import.meta.env.VITE_FIREBASE_STORAGE_BUCKET}&messagingSenderId=${import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID}&appId=${import.meta.env.VITE_FIREBASE_APP_ID}`;
        const registration = await navigator.serviceWorker.register(swUrl);
        
        const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
        if (token) {
          console.log('FCM Token acquired, saving to Firestore...');
          const userRef = doc(db, 'users', uid);
          await updateDoc(userRef, {
            fcmTokens: arrayUnion(token)
          });
        }
      } else {
        setShowPrompt(false); // They denied or dismissed
      }
    } catch (error) {
      console.error('Error getting push notification permission/token:', error);
      setShowPrompt(false);
    }
  };

  const handleEnable = () => {
    if (userUid) {
      requestPermissionAndSaveToken(userUid);
    }
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="fixed top-24 left-1/2 -translate-x-1/2 z-[9999] w-[90%] max-w-sm"
        >
          <div className="bg-dark-900/90 backdrop-blur-2xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.6)] rounded-3xl p-5 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 to-transparent pointer-events-none" />
            
            <button 
              onClick={() => setShowPrompt(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-start gap-4 relative z-10">
              <div className="w-12 h-12 rounded-full bg-primary-500/20 flex items-center justify-center shrink-0 border border-primary-500/30">
                <Bell className="w-6 h-6 text-primary-400 animate-pulse" />
              </div>
              <div>
                <h3 className="text-white font-bold mb-1">Turn on Notifications</h3>
                <p className="text-slate-400 text-xs mb-4">
                  Get real-time updates on your order status and delivery tracking.
                </p>
                <div className="flex gap-2">
                  <button 
                    onClick={handleEnable}
                    className="flex-1 bg-primary-500 hover:bg-primary-600 text-white text-sm font-bold py-2 rounded-xl transition-colors shadow-lg shadow-primary-500/25"
                  >
                    Enable
                  </button>
                  <button 
                    onClick={() => setShowPrompt(false)}
                    className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-bold py-2 rounded-xl transition-colors"
                  >
                    Not Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
