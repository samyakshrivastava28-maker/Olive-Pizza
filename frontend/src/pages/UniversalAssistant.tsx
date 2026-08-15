import React, { useEffect, useRef, useState } from 'react';
import PageTransition from '../components/PageTransition';
import SEO from '../components/SEO';
import { auth } from '../lib/firebase';
import { useAuthStore } from '../lib/store';

export default function UniversalAssistant() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { user } = useAuthStore();
  const [aiUrl, setAiUrl] = useState<string>('');

  const baseUrl =
    import.meta.env.VITE_OLIVE_AI_FRONTEND_URL ||
    (typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? 'http://localhost:5174'
      : 'https://olive-pizza-ai-frontend.vercel.app');

  useEffect(() => {
    let isMounted = true;

    const syncIdentity = async () => {
      const currentUser = auth.currentUser;
      let token = '';

      if (currentUser) {
        try {
          token = await currentUser.getIdToken(false);
        } catch (e) {
          console.warn('Failed to get user ID token for AI sync:', e);
        }
      }

      if (!isMounted) return;

      const params = new URLSearchParams();
      if (token && currentUser) {
        params.set('token', token);
        params.set('uid', currentUser.uid);
        if (currentUser.email) params.set('email', currentUser.email);
        if (currentUser.displayName) params.set('name', currentUser.displayName);
        if (user?.role) params.set('role', user.role);
      }

      const fullUrl = params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;
      setAiUrl(fullUrl);

      // Also send postMessage if iframe already loaded
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          {
            type: 'OLIVE_AI_AUTH_SYNC',
            payload: {
              isAuthenticated: Boolean(currentUser && token),
              idToken: token || null,
              userId: currentUser?.uid,
              userEmail: currentUser?.email,
              userName: currentUser?.displayName || user?.name,
              userRole: user?.role || 'customer',
            },
          },
          '*'
        );
      }
    };

    syncIdentity();

    const unsubscribe = auth.onAuthStateChanged(() => {
      syncIdentity();
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [user, baseUrl]);

  return (
    <PageTransition>
      <SEO
        title="Olive Pizza AI Assistant | Your Smart Dining Companion"
        description="Experience the future of ordering with Olive Pizza AI. Ask questions, get recommendations, and order effortlessly with our intelligent AI."
      />
      <div className="w-full h-[calc(100vh-64px)] md:h-[calc(100vh-80px)] overflow-hidden bg-slate-50 dark:bg-slate-950">
        {aiUrl ? (
          <iframe
            ref={iframeRef}
            src={aiUrl}
            className="w-full h-full border-none"
            allow="microphone; clipboard-write"
            title="Olive Pizza AI Assistant"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400">
            Connecting to Olive Pizza AI...
          </div>
        )}
      </div>
    </PageTransition>
  );
}
