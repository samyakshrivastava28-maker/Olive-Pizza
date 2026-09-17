import { useEffect, useRef } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useAuthStore } from '../lib/store';
import { requestNotificationPermission, verifyAndRefreshTokens } from '../lib/fcm';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading, logout } = useAuthStore();
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let mounted = true;
    let authResolved = false;
    let failsafeTimer: ReturnType<typeof setTimeout> | null = null;

    // Safety Watchdog: Guarantee that initial loading state is NEVER held beyond 1200ms
    // even if Firebase Auth persistence resolution is slow or IndexedDB is locked on cold start
    failsafeTimer = setTimeout(() => {
      if (!authResolved && mounted) {
        console.warn('[AuthProvider] Watchdog safety timeout triggered: clearing initial auth loading state');
        authResolved = true;
        setLoading(false);
      }
    }, 1200);

    const setupAuth = () => {
      try {
        unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
          if (!mounted) return;
          authResolved = true;
          if (failsafeTimer) {
            clearTimeout(failsafeTimer);
            failsafeTimer = null;
          }

          if (firebaseUser) {
            const emailLower = (firebaseUser.email || '').toLowerCase().trim();
            const fallbackRole = ['olivepizzarjn@gmail.com', 'webhub2811@gmail.com'].includes(emailLower) ? 'owner' : 'customer';
            const existingUser = useAuthStore.getState().user;

            // 1. Immediately set basic user state & unlock UI without waiting for remote Firestore I/O
            setUser(
              {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                name: existingUser?.name || firebaseUser.displayName || undefined,
                photoURL: existingUser?.photoURL || firebaseUser.photoURL || undefined,
                emailVerified: firebaseUser.emailVerified,
                phoneVerified: existingUser?.phoneVerified ?? false,
                phoneSetupCompleted: existingUser?.phoneSetupCompleted ?? false,
                locationSetupCompleted: existingUser?.locationSetupCompleted ?? false,
                lat: existingUser?.lat,
                lng: existingUser?.lng,
                fullAddress: existingUser?.fullAddress,
                ...existingUser,
              },
              (existingUser?.role || fallbackRole)
            );
            setLoading(false);

            // 2. Asynchronously fetch full Firestore profile in background without blocking app render
            getDoc(doc(db, 'users', firebaseUser.uid))
              .then((userDoc) => {
                if (!mounted) return;
                if (userDoc.exists()) {
                  const data = userDoc.data();
                  setUser(
                    {
                      uid: firebaseUser.uid,
                      email: firebaseUser.email,
                      name: data.name || firebaseUser.displayName,
                      phone: data.phone,
                      photoURL: firebaseUser.photoURL || data.photoUrl,
                      phoneVerified: data.phoneVerified ?? false,
                      phoneSetupCompleted: data.phoneVerified ? (data.phoneSetupCompleted ?? true) : false,
                      locationSetupCompleted: data.locationSetupCompleted ?? !!data.fullAddress,
                      lat: data.lat,
                      lng: data.lng,
                      fullAddress: data.fullAddress,
                      emailVerified: firebaseUser.emailVerified,
                      approvalStatus: data.approvalStatus,
                      status: data.status,
                      photoUrl: data.photoUrl,
                      vehicleType: data.vehicleType,
                      vehicleNumber: data.vehicleNumber,
                      vehicleImage: data.vehicleImage,
                      earnings: data.earnings,
                      metrics: data.metrics,
                    },
                    (data.role === 'delivery' ? 'delivery_partner' : (data.role || fallbackRole))
                  );

                  // Silently verify / sync push tokens for already-granted sessions
                  verifyAndRefreshTokens(firebaseUser.uid).catch(() => {});
                }
              })
              .catch((error: any) => {
                console.warn('[AuthProvider] Background Firestore profile fetch error:', error?.code || error?.message);
              });
          } else {
            logout();
            setLoading(false);
          }
        }, (error: any) => {
          // onAuthStateChanged error callback (e.g., network issue)
          console.warn('[AuthProvider] Auth state error:', error?.code || error?.message);
          authResolved = true;
          setLoading(false);
          // Retry auth setup after 5 seconds
          if (mounted) {
            retryTimer.current = setTimeout(setupAuth, 5000);
          }
        });
      } catch (err: any) {
        console.error('[AuthProvider] Fatal auth init error:', err?.message);
        authResolved = true;
        setLoading(false);
      }
    };

    setupAuth();

    return () => {
      mounted = false;
      if (failsafeTimer) clearTimeout(failsafeTimer);
      if (unsubscribe) unsubscribe();
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, [setUser, setLoading, logout]);

  return <>{children}</>;
}
