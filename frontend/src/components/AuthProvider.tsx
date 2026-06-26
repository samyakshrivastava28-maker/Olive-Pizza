import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useAuthStore } from '../lib/store';
import { requestNotificationPermission } from '../lib/fcm';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading, logout } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUser(
              {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                name: data.name,
                phone: data.phone,
                photoURL: firebaseUser.photoURL || data.photoUrl,
                onboardingComplete: data.locationSetupCompleted,
                phoneSetupCompleted: data.phoneSetupCompleted,
                locationSetupCompleted: data.locationSetupCompleted,
                lat: data.lat,
                lng: data.lng,
                fullAddress: data.fullAddress,
                emailVerified: firebaseUser.emailVerified,
                // Delivery Partner fields
                approvalStatus: data.approvalStatus,
                status: data.status,
                photoUrl: data.photoUrl,
                vehicleType: data.vehicleType,
                vehicleNumber: data.vehicleNumber,
                vehicleImage: data.vehicleImage,
                earnings: data.earnings,
                metrics: data.metrics,
              },
              data.role || 'customer'
            );

            // Request FCM permission for owners and delivery partners
            if (data.role === 'owner' || data.role === 'delivery_partner') {
              requestNotificationPermission(firebaseUser.uid);
            }
          } else {
            // Profile doesn't exist yet (e.g., during registration pipeline)
            setUser(
              {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                onboardingComplete: false,
                emailVerified: firebaseUser.emailVerified
              },
              'customer'
            );
          }
        } catch (error) {
          console.warn("Firestore read failed. Defaulting to standard customer.", error);
          setUser(
            {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              onboardingComplete: false,
              emailVerified: firebaseUser.emailVerified
            },
            'customer'
          );
        }
      } else {
        logout();
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setUser, setLoading, logout]);

  return <>{children}</>;
}
