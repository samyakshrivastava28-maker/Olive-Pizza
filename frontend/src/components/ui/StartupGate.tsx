import React, { useState, useEffect, useRef } from 'react';
import { useNetworkStore } from '../../lib/networkQuality';
import { getAuth } from 'firebase/auth';


interface StartupGateProps {
  children: React.ReactNode;
}

export default function StartupGate({ children }: StartupGateProps) {
  const [showVideo, setShowVideo] = useState(() => {
    return typeof window !== 'undefined' && sessionStorage.getItem('hasSeenIntro') !== 'true';
  });
  const [videoFading, setVideoFading] = useState(false);
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>(() => {
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

  const logDiagnostic = (reason: string, details?: any) => {
    const auth = getAuth();
    const userId = auth.currentUser?.uid || 'anonymous';
    const timestamp = new Date().toISOString();
    console.log(`[StartupGate] [${timestamp}] User: ${userId} | Reason: ${reason}`, details || '');
  };

  useEffect(() => {
    if (showVideo) {
      sessionStorage.setItem('hasSeenIntro', 'true');
      logDiagnostic("Initializing intro video");
      
      // Strict fallback timer — if video hangs or network drops, force skip quickly (1.5s max)
      const fallbackTimer = setTimeout(() => {
        logDiagnostic("Startup video timed out, forcing skip.", { timeout: 1500 });
        handleVideoEnd();
      }, 1500);
      
      return () => {
        clearTimeout(fallbackTimer);
      };
    }
  }, []);

  useEffect(() => {
    if (showVideo && videoRef.current && !playStarted.current) {
      playStarted.current = true;
      const video = videoRef.current;
      
      logDiagnostic("Attempting video play()");
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            logDiagnostic("Video autoplay started successfully");
          })
          .catch((error) => {
            logDiagnostic("Video autoplay rejected or failed", error);
            handleVideoEnd();
          });
      }
    }
  }, [showVideo, videoReady]);

  const getOptimizedIntroUrls = () => {
    let videoUrl = "";
    if (deviceType === 'mobile') {
      videoUrl = "https://res.cloudinary.com/dxmlvkff1/video/upload/v1782199117/Olive_Pizza_logo_reveal_202606231246_xeyk9t.mp4";
    } else {
      videoUrl = "https://res.cloudinary.com/dxmlvkff1/video/upload/v1782199127/Olive_Pizza_logo_reveal_202606231247_rrtc3u.mp4";
    }

    return {
      videoUrl,
      posterUrl: videoUrl.replace('.mp4', '.jpg')
    };
  };

  const { videoUrl, posterUrl } = getOptimizedIntroUrls();

  const handleVideoEnd = () => {
    logDiagnostic("Ending video");
    setVideoFading(true);
    document.body.style.overflow = "";
    
    setTimeout(() => {
      setShowVideo(false);
    }, 300);
  };

  return (
    <>
      {children}
      
      {showVideo && (
        <div 
          className={`fixed inset-0 z-[99999] flex items-center justify-center transition-opacity duration-300 ${videoFading ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        >
          {/* Subtle dark backdrop instead of pitch black */}
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
          
          <img 
            src={posterUrl} 
            alt="Loading Olive Pizza"
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${videoReady ? 'opacity-0' : 'opacity-100'} z-10`}
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
            onPlaying={() => setVideoReady(true)}
            onError={(e) => {
              logDiagnostic("Video onError fired", e);
              handleVideoEnd();
            }}
            className={`absolute inset-0 w-full h-full object-cover z-20 transition-opacity duration-300 ${videoReady ? 'opacity-100' : 'opacity-0'}`}
          />
        </div>
      )}
    </>
  );
}

