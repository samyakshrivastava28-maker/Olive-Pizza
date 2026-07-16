import React, { useState, useEffect, useRef } from 'react';
import { useNetworkStore } from '../../lib/networkQuality';
import { getAuth } from 'firebase/auth';

interface StartupGateProps {
  children: React.ReactNode;
}

export default function StartupGate({ children }: StartupGateProps) {
  const [showVideo, setShowVideo] = useState(false);
  const [videoFading, setVideoFading] = useState(false);
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
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
    // Check session storage to see if we already played it in this browser tab session
    const hasPlayed = sessionStorage.getItem('startup_video_played');
    if (!hasPlayed) {
      logDiagnostic("Initializing intro video");
      setShowVideo(true);
      document.body.style.overflow = "hidden";
      
      // Strict fallback timer — if video hangs or network drops, force skip to prevent black screens
      const fallbackTimer = setTimeout(() => {
        logDiagnostic("Startup video timed out, forcing skip.", { timeout: 4500 });
        handleVideoEnd();
      }, 4500);
      
      return () => {
        clearTimeout(fallbackTimer);
      };
    }
  }, []);

  useEffect(() => {
    const w = window.innerWidth;
    if (w < 768) setDeviceType('mobile');
    else if (w < 1024) setDeviceType('tablet');
    else setDeviceType('desktop');
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
            // Instantly dismiss if autoplay is blocked
            handleVideoEnd();
          });
      }
    }
  }, [showVideo, videoReady]);

  const getOptimizedIntroUrls = () => {
    const base = "https://res.cloudinary.com/dxmlvkff1/video/upload";
    const transformations = ["f_auto", "vc_auto", "fl_fast_start"];
    
    // We can't guarantee useNetworkStore has hydrated instantly on mount if it's async,
    // but we can try to grab the current state.
    const speed = useNetworkStore.getState().speed;

    // Degrade video quality if network is slow
    if (speed === 'slow-2g' || speed === '2g' || speed === '3g') {
      transformations.push("q_auto:eco", "h_360", "c_scale", "br_250k");
    } else if (deviceType === 'mobile') {
      transformations.push("q_auto:eco", "h_540", "c_scale");
    } else if (deviceType === 'tablet') {
      transformations.push("q_auto:good", "h_720", "c_scale");
    } else {
      transformations.push("q_auto:best", "h_1080", "c_scale");
    }
    
    const paramsStr = transformations.join(",");
    const videoId = "v1782199127/Olive_Pizza_logo_reveal_202606231247_rrtc3u";
    
    return {
      videoUrl: `${base}/${paramsStr}/${videoId}.mp4`,
      posterUrl: `${base}/${paramsStr}/${videoId}.jpg`
    };
  };

  const { videoUrl, posterUrl } = getOptimizedIntroUrls();

  const handleVideoEnd = () => {
    if (videoFading || !showVideo) return;
    
    logDiagnostic("Ending video");
    setVideoFading(true);
    document.body.style.overflow = "";
    sessionStorage.setItem('startup_video_played', 'true');
    
    setTimeout(() => {
      setShowVideo(false);
      setVideoFading(false);
    }, 500); // 500ms match with transition duration
  };

  return (
    <>
      {/* 
        We ALWAYS render children. 
        This is critical. It allows React Router, Firebase Auth, AI services, 
        and prefetching to initialize in the background while the video plays on top.
      */}
      {children}
      
      {showVideo && (
        <div 
          className={`fixed inset-0 z-[99999] bg-black flex items-center justify-center transition-opacity duration-500 ${videoFading ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        >
          {/* Fallback poster or loading state */}
          <div className="absolute inset-0 bg-black" />
          
          <img 
            src={posterUrl} 
            alt="Loading Olive Pizza"
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[400ms] ${videoReady ? 'opacity-0' : 'opacity-100'} z-10`}
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
            }} // Skip if video fails to load entirely
            className={`absolute inset-0 w-full h-full object-cover z-20 transition-opacity duration-500 ${videoReady ? 'opacity-100' : 'opacity-0'}`}
          />
        </div>
      )}
    </>
  );
}

