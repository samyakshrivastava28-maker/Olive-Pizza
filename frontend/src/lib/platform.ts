/**
 * Platform Detection Utilities
 * Handles detection of Apple platforms, PWA standalone modes, and Web Push support.
 */

export const isIOS = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
         (navigator.userAgent.includes("Mac") && "ontouchend" in document);
};

export const isMacOS = (): boolean => {
  if (typeof window === 'undefined') return false;
  return navigator.userAgent.includes("Mac OS X") && !isIOS();
};

export const isSafari = (): boolean => {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent;
  return ua.includes("Safari") && !ua.includes("Chrome") && !ua.includes("CriOS") && !ua.includes("FxiOS");
};

export const isStandalonePWA = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || 
         // @ts-ignore
         window.navigator.standalone === true;
};

export const getPushCompatibility = () => {
  const ios = isIOS();
  const macos = isMacOS();
  const safari = isSafari();
  const standalone = isStandalonePWA();
  
  // iOS Safari requires iOS 16.4+ and Standalone PWA mode for Web Push
  if (ios && safari) {
    if (!standalone) {
      return {
        supported: false,
        reason: 'iOS requires the app to be added to the Home Screen (Standalone Mode) to receive notifications.'
      };
    }
  }

  // General check
  const hasServiceWorker = 'serviceWorker' in navigator;
  const hasPushManager = 'PushManager' in window;
  const hasNotification = 'Notification' in window;

  if (!hasServiceWorker || !hasPushManager || !hasNotification) {
    return {
      supported: false,
      reason: 'This browser does not support Web Push Notifications.'
    };
  }

  return { supported: true, reason: 'Supported' };
};
