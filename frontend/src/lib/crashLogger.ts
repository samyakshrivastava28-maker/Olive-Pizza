import { db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';

export function initCrashLogger() {
  window.addEventListener('unhandledrejection', (event) => {
    const msg = (event.reason?.message || event.reason?.code || String(event.reason || '')).toLowerCase();

    // Suppress known non-fatal Firebase/network errors that should never crash the UI
    const isSuppressed =
      msg.includes('network-request-failed') ||
      msg.includes('failed to fetch') ||
      msg.includes('load failed') ||
      msg.includes('firestore') ||
      msg.includes('unavailable') ||
      msg.includes('permission-denied') ||
      msg.includes('timeout') ||
      msg.includes('aborted');

    if (isSuppressed) {
      // Prevent these from bubbling to ErrorBoundary
      event.preventDefault();
      console.warn('[CrashLogger] Suppressed non-fatal rejection:', event.reason?.message || event.reason?.code);
      return;
    }

    logCrash({
      type: 'unhandledrejection',
      message: event.reason?.message || 'Unknown Promise Rejection',
      stack: event.reason?.stack,
      url: window.location.href,
    });
  });

  window.addEventListener('error', (event) => {
    const msg = (event.message || '').toLowerCase();
    
    // Suppress non-fatal asset/network errors
    const isSuppressed =
      msg.includes('network') ||
      msg.includes('failed to fetch') ||
      msg.includes('load') ||
      msg.includes('script error');
    
    if (isSuppressed) {
      console.warn('[CrashLogger] Suppressed non-fatal error:', event.message);
      return;
    }

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
