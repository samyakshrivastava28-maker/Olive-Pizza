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

    // Check if running on native mobile app (Android/iOS Capacitor)
    if (Capacitor.isNativePlatform()) {
      if (nativeIntroShownInProcess) return false;
      nativeIntroShownInProcess = true;
      return true;
    }

    // Web / PWA: sessionStorage survives browser refresh (F5) and SPA route changes,
    // but resets when the user closes the browser/tab completely and opens again.
    const hasSeenIntro = sessionStorage.getItem('hasSeenIntro');
    if (hasSeenIntro === 'true') {
      return false;
    }
    sessionStorage.setItem('hasSeenIntro', 'true');
    return true;
  });

  const [videoFading, setVideoFading] = useState(false);
  const [deviceType] = useState<'mobile' | 'desktop'>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768 ? 'mobile' : 'desktop';
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
    try {
      const auth = getAuth();
      const userId = auth.currentUser?.uid || 'anonymous';
      const timestamp = new Date().toISOString();
      console.log('[StartupGate] [' + timestamp + '] User: ' + userId + ' | Reason: ' + reason, details || '');
    } catch {
      // Diagnostic logging failure should never impact app startup
    }
  }, []);

  const handleVideoEnd = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;

    // Clear all pending timers immediately
    if (maxDurationTimerRef.current) {
      clearTimeout(maxDurationTimerRef.current);
      maxDurationTimerRef.current = null;
    }
    if (initialFailsafeTimerRef.current) {
      clearTimeout(initialFailsafeTimerRef.current);
      initialFailsafeTimerRef.current = null;
    }

    logDiagnostic('Ending intro video with smooth transition');
    setVideoFading(true);

    // Clean up video decoder and memory after transition
    setTimeout(() => {
      if (videoRef.current) {
        try {
          videoRef.current.pause();
          videoRef.current.removeAttribute('src');
          videoRef.current.load(); // Releases GPU video decoder buffers on Android/mobile
        } catch {
          // Ignore cleanup errors on unmount
        }
      }
      setShowVideo(false);
    }, 250);
  }, [logDiagnostic]);

  useEffect(() => {
    if (!showVideo) return;

    logDiagnostic('Initializing intro video sequence (first 5s optimized)');

    // Fast Failsafe: if video fails to load or buffer within 2.5s, skip directly to app
    initialFailsafeTimerRef.current = setTimeout(() => {
      if (!endedRef.current) {
        logDiagnostic('Startup video buffering threshold reached (2.5s), transitioning directly to app');
        handleVideoEnd();
      }
    }, 2500);

    return () => {
      if (initialFailsafeTimerRef.current) {
        clearTimeout(initialFailsafeTimerRef.current);
        initialFailsafeTimerRef.current = null;
      }
      if (maxDurationTimerRef.current) {
        clearTimeout(maxDurationTimerRef.current);
        maxDurationTimerRef.current = null;
      }
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
            logDiagnostic('Video autoplay rejected or failed, skipping immediately to app', error);
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
        logDiagnostic('5.0-second playback limit reached, transitioning smoothly to app');
        handleVideoEnd();
      }, 5000);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current && videoRef.current.currentTime >= 5.0) {
      handleVideoEnd();
    }
  };

  // Dedicated 5-Second Optimized Assets:
  // - so_0,eo_5: Physical trimming to first 5 seconds on Cloudinary CDN
  // - Mobile: H.264 Baseline Profile 3.0, 30fps, 540p, 600k bitrate (~400KB total) for zero lag on all Android devices
  // - Desktop: H.264 1080p profile (~730KB)
  const getOptimizedIntroUrls = () => {
    if (deviceType === 'mobile') {
      return {
        videoUrl: 'https://res.cloudinary.com/dxmlvkff1/video/upload/so_0,eo_5,w_540,c_limit,q_auto:eco,vc_h264:baseline:3.0,br_600k,fps_30/v1782199117/Olive_Pizza_logo_reveal_202606231246_xeyk9t.mp4',
        posterUrl: 'https://res.cloudinary.com/dxmlvkff1/video/upload/so_0,w_540,c_limit,q_auto:eco,f_jpg/v1782199117/Olive_Pizza_logo_reveal_202606231246_xeyk9t.jpg'
      };
    }

    return {
      videoUrl: 'https://res.cloudinary.com/dxmlvkff1/video/upload/so_0,eo_5,w_1080,c_limit,q_auto:good,vc_h264/v1782199127/Olive_Pizza_logo_reveal_202606231247_rrtc3u.mp4',
      posterUrl: 'https://res.cloudinary.com/dxmlvkff1/video/upload/so_0,w_1080,c_limit,q_auto:eco,f_jpg/v1782199127/Olive_Pizza_logo_reveal_202606231247_rrtc3u.jpg'
    };
  };

  const { videoUrl, posterUrl } = getOptimizedIntroUrls();

  return (
    <>
      {/* App Shell & Children render immediately underneath so app is fully ready */}
      {children}

      {showVideo && (
        <div 
          className={'fixed inset-0 z-[99999] flex items-center justify-center transition-opacity duration-250 ease-out will-change-[opacity] ' + (videoFading ? 'opacity-0 pointer-events-none' : 'opacity-100')}
          style={{ transform: 'translateZ(0)', WebkitTransform: 'translateZ(0)' }}
          aria-hidden={videoFading}
        >
          {/* Solid black backdrop */}
          <div className="absolute inset-0 bg-black" />

          {/* Ultra-lightweight first-frame poster (4.8KB) for zero black flash */}
          <img 
            src={posterUrl} 
            alt="Olive Pizza"
            className={'absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ' + (videoReady ? 'opacity-0' : 'opacity-100') + ' z-10'}
            onError={handleVideoEnd}
            loading="eager"
            decoding="async"
            style={{ transform: 'translateZ(0)', WebkitTransform: 'translateZ(0)' }}
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
              logDiagnostic('Video playback error encountered, skipping to app', e);
              handleVideoEnd();
            }}
            className={'absolute inset-0 w-full h-full object-cover z-20 transition-opacity duration-200 will-change-[opacity] ' + (videoReady ? 'opacity-100' : 'opacity-0')}
            style={{ transform: 'translateZ(0)', WebkitTransform: 'translateZ(0)' }}
          />

          {/* Top-Right Quick Skip Button */}
          <button
            onClick={handleVideoEnd}
            aria-label="Skip Intro"
            className="absolute top-6 right-6 z-30 px-4 py-2 rounded-full bg-black/60 hover:bg-black/90 text-white/90 hover:text-white border border-white/20 text-xs font-semibold backdrop-blur-md transition-all active:scale-95 flex items-center gap-1.5 shadow-xl cursor-pointer"
          >
            <span>Skip</span>
            <span aria-hidden="true">✕</span>
          </button>
        </div>
      )}
    </>
  );
}
