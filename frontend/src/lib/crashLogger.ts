import { db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';

export function initCrashLogger() {
  window.addEventListener('unhandledrejection', (event) => {
    logCrash({
      type: 'unhandledrejection',
      message: event.reason?.message || 'Unknown Promise Rejection',
      stack: event.reason?.stack,
      url: window.location.href,
    });
  });

  window.addEventListener('error', (event) => {
    logCrash({
      type: 'error',
      message: event.message,
      stack: event.error?.stack,
      url: window.location.href,
    });
  });
}

export async function logCrash(errorDetails: any) {
  try {
    const memory = (performance as any).memory;
    const connection = (navigator as any).connection;

    const errorPayload = {
      ...errorDetails,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      memory: memory ? {
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        totalJSHeapSize: memory.totalJSHeapSize,
        usedJSHeapSize: memory.usedJSHeapSize,
      } : null,
      network: connection ? {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData,
      } : null,
    };

    // Store in internal Firebase collection
    await addDoc(collection(db, 'client_errors'), errorPayload);
  } catch (e) {
    // Silent fail if Firestore is unreachable
    console.warn('[CrashLogger] Failed to log crash', e);
  }
}
