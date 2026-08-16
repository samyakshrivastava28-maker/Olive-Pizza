import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getAuth } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';

interface StartupGateProps {
  children: React.ReactNode;
}

// In-memory process flag for Native Capacitor apps (resets on full app close/relaunch)
let nativeIntroShownInProcess = false;

export default function StartupGate({ children }: StartupGateProps) {
  const [showVideo, setShowVideo] = useState(() => {
    if (typeof window === 'undefined') return false;

    // Check if running on native mobile app (Android/iOS)
    if (Capacitor.isNativePlatform()) {
      if (nativeIntroShownInProcess) return false;
      nativeIntroShownInProcess = true;
      return true;
    }

    // Web / PWA: sessionStorage survives browser refresh (F5) and route changes,
    // but resets when the user closes the browser/tab completely and opens again.
    const hasSeenIntro = sessionStorage.getItem('hasSeenIntro');
    if (hasSeenIntro === 'true') {
      return false;
    }
    sessionStorage.setItem('hasSeenIntro', 'true');
    return true;
  });

  const [videoFading, setVideoFading] = useState(false);
  const [deviceType] = useState<'mobile' | 'tablet' | 'desktop'>(() => {
    if (typeof window !== 'undefined') {
      const w = window.innerWidth;
      if (w < 768) return 'mobile';
      if (w < 1024) return 'tablet';
      return 'desktop';
    }
    return 'desktop';
  });

  const [videoReady, setVideoReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playStarted = useRef(false);
  const endedRef = useRef(false);
  const maxDurationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initialFailsafeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const logDiagnostic = useCallback((reason: string, details?: any) => {
    const auth = getAuth();
    const userId = auth.currentUser?.uid || 'anonymous';
    const timestamp = new Date().toISOString();
    console.log('[StartupGate] [' + timestamp + '] User: ' + userId + ' | Reason: ' + reason, details || '');
  }, []);

  const handleVideoEnd = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;

    if (maxDurationTimerRef.current) {
      clearTimeout(maxDurationTimerRef.current);
      maxDurationTimerRef.current = null;
    }
    if (initialFailsafeTimerRef.current) {
      clearTimeout(initialFailsafeTimerRef.current);
      initialFailsafeTimerRef.current = null;
    }

    logDiagnostic('Ending intro video smoothly');
    setVideoFading(true);
    document.body.style.overflow = '';

    setTimeout(() => {
      setShowVideo(false);
    }, 300);
  }, [logDiagnostic]);

  useEffect(() => {
    if (!showVideo) return;

    logDiagnostic('Initializing intro video sequence');

    // Failsafe: if video fails to load or buffer within 3.5s, skip directly to app
    initialFailsafeTimerRef.current = setTimeout(() => {
      if (!endedRef.current) {
        logDiagnostic('Startup video buffering timed out, skipping to app', { timeout: 3500 });
        handleVideoEnd();
      }
    }, 3500);

    return () => {
      if (initialFailsafeTimerRef.current) clearTimeout(initialFailsafeTimerRef.current);
      if (maxDurationTimerRef.current) clearTimeout(maxDurationTimerRef.current);
    };
  }, [showVideo, handleVideoEnd, logDiagnostic]);

  useEffect(() => {
    if (showVideo && videoRef.current && !playStarted.current) {
      playStarted.current = true;
      const video = videoRef.current;

      logDiagnostic('Attempting video play()');
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            logDiagnostic('Video autoplay started successfully');
          })
          .catch((error) => {
            logDiagnostic('Video autoplay rejected or failed, skipping immediately', error);
            handleVideoEnd();
          });
      }
    }
  }, [showVideo, handleVideoEnd, logDiagnostic]);

  const handlePlaying = () => {
    setVideoReady(true);
    if (initialFailsafeTimerRef.current) {
      clearTimeout(initialFailsafeTimerRef.current);
      initialFailsafeTimerRef.current = null;
    }

    // STRICT 5-SECOND DURATION: Cap display to exactly 5 seconds
    if (!maxDurationTimerRef.current) {
      maxDurationTimerRef.current = setTimeout(() => {
        logDiagnostic('5.0-second playback limit reached, transitioning to app');
        handleVideoEnd();
      }, 5000);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current && videoRef.current.currentTime >= 5.0) {
      handleVideoEnd();
    }
  };

  const getOptimizedIntroUrls = () => {
    let videoUrl = '';
    if (deviceType === 'mobile') {
      videoUrl = 'https://res.cloudinary.com/dxmlvkff1/video/upload/v1782199117/Olive_Pizza_logo_reveal_202606231246_xeyk9t.mp4';
    } else {
      videoUrl = 'https://res.cloudinary.com/dxmlvkff1/video/upload/v1782199127/Olive_Pizza_logo_reveal_202606231247_rrtc3u.mp4';
    }

    return {
      videoUrl,
      posterUrl: videoUrl.replace('.mp4', '.jpg')
    };
  };

  const { videoUrl, posterUrl } = getOptimizedIntroUrls();

  return (
    <>
      {children}

      {showVideo && (
        <div 
          className={'fixed inset-0 z-[99999] flex items-center justify-center transition-opacity duration-300 ' + (videoFading ? 'opacity-0 pointer-events-none' : 'opacity-100')}
        >
          {/* Subtle dark backdrop */}
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

          <img 
            src={posterUrl} 
            alt="Loading Olive Pizza"
            className={'absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ' + (videoReady ? 'opacity-0' : 'opacity-100') + ' z-10'}
            onError={handleVideoEnd}
          />

          <video
            ref={videoRef}
            src={videoUrl}
            autoPlay
            playsInline
            muted
            preload="auto"
            poster={posterUrl}
            onEnded={handleVideoEnd}
            onCanPlay={() => setVideoReady(true)}
            onPlaying={handlePlaying}
            onTimeUpdate={handleTimeUpdate}
            onError={(e) => {
              logDiagnostic('Video onError fired', e);
              handleVideoEnd();
            }}
            className={'absolute inset-0 w-full h-full object-cover z-20 transition-opacity duration-300 ' + (videoReady ? 'opacity-100' : 'opacity-0')}
          />

          {/* Top-Right Quick Skip Button */}
          <button
            onClick={handleVideoEnd}
            className="absolute top-6 right-6 z-30 px-3.5 py-1.5 rounded-full bg-black/50 hover:bg-black/80 text-white/80 hover:text-white border border-white/20 text-xs font-bold backdrop-blur-md transition-all active:scale-95 flex items-center gap-1 shadow-lg"
          >
            Skip ✕
          </button>
        </div>
      )}
    </>
  );
}
