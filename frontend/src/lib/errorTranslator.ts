import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Maps technical error codes or messages to human-readable strings.
 * Ensures users never see "Firebase:", "PostgreSQL", or internal stack traces.
 */
export function translateError(error: any): string {
  if (!error) return "Something went wrong. Please try again.";
  
  const rawMsg = typeof error === 'string' ? error : (error?.message || error?.code || String(error));
  const msg = rawMsg.toLowerCase();

  // Network and Connectivity Errors
  if (msg.includes('network-request-failed') || msg.includes('failed to fetch') || msg.includes('net::err_internet_disconnected')) {
    return "Please check your internet connection.";
  }
  if (msg.includes('timeout') || msg.includes('deadline-exceeded')) {
    return "The request took too long. Please try again.";
  }

  // Rate limits
  if (msg.includes('too-many-requests') || msg.includes('rate_limited') || msg.includes('too many login attempts')) {
    return "Too many login attempts. Please try again in a few minutes.";
  }

  // Firebase Auth Errors
  if (
    msg.includes('user-not-found') || 
    msg.includes('wrong-password') || 
    msg.includes('invalid-credential') || 
    msg.includes('invalid-login-credentials')
  ) {
    return "Invalid email or password. Please try again.";
  }
  if (msg.includes('email-already-in-use')) {
    return "This email is already registered. Please sign in.";
  }
  if (msg.includes('weak-password')) {
    return "Password should be at least 6 characters.";
  }
  if (msg.includes('invalid-email')) {
    return "Please enter a valid email address.";
  }
  if (msg.includes('popup-closed-by-user') || msg.includes('cancelled-popup-request')) {
    return "Sign-in was cancelled.";
  }
  if (msg.includes('invalid-verification-code') || msg.includes('invalid-code')) {
    return "Invalid verification code. Please check and try again.";
  }
  if (msg.includes('code-expired')) {
    return "Verification code has expired. Please request a new code.";
  }
  if (msg.includes('user-disabled')) {
    return "This account has been disabled. Please contact support.";
  }
  if (msg.includes('unauthorized-domain')) {
    return "This domain is not authorized for sign-in in Firebase Console.";
  }
  if (msg.includes('session-expired') || msg.includes('auth/invalid-user-token')) {
    return "Your session has expired. Please sign in again.";
  }

  // General Provider/Database Errors
  if (msg.includes('permission-denied') || msg.includes('missing or insufficient permissions')) {
    return "You do not have permission to perform this action.";
  }
  
  // Recaptcha or other 3rd party
  if (msg.includes('recaptcha')) {
    return "Security verification failed. Please try again.";
  }

  // Preserve meaningful, human-readable sentences from backend or forms
  if (
    typeof rawMsg === 'string' &&
    !msg.includes('firebase:') &&
    !msg.includes('stack') &&
    !msg.includes('uncaught') &&
    !msg.includes('syntaxerror') &&
    !msg.includes('typeerror') &&
    !msg.includes('referenceerror') &&
    !msg.startsWith('auth/') &&
    rawMsg.length >= 3 &&
    rawMsg.length <= 200
  ) {
    return rawMsg;
  }

  // Fallback for technical stack traces
  return "Something went wrong. Please try again.";
}

/**
 * Silently logs the detailed technical error to the database for developers.
 * Never shown to users.
 */
export async function logDetailedError(error: any, context?: any) {
  try {
    const errorLog = {
      timestamp: serverTimestamp(),
      type: error?.name || 'Error',
      message: error?.message || String(error),
      code: error?.code || 'unknown',
      stack: error?.stack || null,
      context: context || {},
      device: {
        userAgent: navigator.userAgent,
        appVersion: (window as any).__APP_VERSION__ || 'unknown',
        isOnline: navigator.onLine,
        url: window.location.href,
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight
      }
    };
    
    // Fire and forget
    addDoc(collection(db, 'client_errors'), errorLog).catch(() => {});
  } catch (e) {
    // Failsafe to ensure logging never breaks the main thread
    console.error('Failed to log client error internally');
  }
}
