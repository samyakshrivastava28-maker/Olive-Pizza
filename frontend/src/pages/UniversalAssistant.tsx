import React, { useEffect, useRef, useState } from 'react';
import PageTransition from '../components/PageTransition';
import SEO from '../components/SEO';
import { auth } from '../lib/firebase';
import { useAuthStore } from '../lib/store';
import { Sparkles, ExternalLink, RefreshCw } from 'lucide-react';

export default function UniversalAssistant() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { user } = useAuthStore();
  const [aiUrl, setAiUrl] = useState<string>('');

  const baseUrl =
    import.meta.env.VITE_OLIVE_AI_FRONTEND_URL ||
    import.meta.env.VITE_OLIVE_PIZZA_AI_URL ||
    'https://olive-pizza-ai-frontend.vercel.app';

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

  const handleOpenFullscreen = () => {
    if (aiUrl) {
      window.open(aiUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <PageTransition>
      <SEO
        title="Olive Pizza AI Assistant | Your Smart Dining Companion"
        description="Experience the future of ordering with Olive Pizza AI. Ask questions, get recommendations, and order effortlessly with our intelligent AI."
      />
      <div className="w-full h-[calc(100vh-64px)] md:h-[calc(100vh-80px)] overflow-hidden bg-slate-950 flex flex-col relative">
        {/* Top Control Bar */}
        <div className="h-10 bg-dark-900/90 border-b border-white/10 px-4 flex items-center justify-between z-10 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            <span className="text-xs font-bold text-white tracking-wide">Olive Pizza AI Platform</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (iframeRef.current) {
                  iframeRef.current.src = aiUrl;
                }
              }}
              title="Reload AI Assistant"
              className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleOpenFullscreen}
              title="Open Fullscreen in New Tab"
              className="flex items-center gap-1 text-xs font-semibold text-amber-400 hover:text-amber-300 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 transition-all hover:bg-amber-500/20"
            >
              <span>Open in New Tab</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Embedded Iframe */}
        <div className="flex-1 w-full relative">
          {aiUrl ? (
            <iframe
              ref={iframeRef}
              src={aiUrl}
              className="w-full h-full border-none bg-slate-950"
              allow="microphone; clipboard-write; autoplay; camera"
              title="Olive Pizza AI Assistant"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400">
              Connecting to Olive Pizza AI...
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
