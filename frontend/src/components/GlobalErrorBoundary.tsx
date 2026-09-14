import React, { Component, ErrorInfo, ReactNode } from "react";
import { RefreshCcw, Home } from "lucide-react";

import { logCrash } from '../lib/crashLogger';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

const MAX_AUTO_RETRIES = 2;

/**
 * GlobalErrorBoundary — ONLY activates when React itself cannot continue rendering.
 * 
 * Network errors, Firebase disconnects, AI failures, notification failures, etc.
 * must NEVER reach this boundary — they must be caught locally and handled gracefully.
 * 
 * This boundary auto-retries rendering up to 2 times before showing the fallback UI.
 */
export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    retryCount: 0,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[GlobalErrorBoundary] React render error:", error.message, errorInfo.componentStack);
    
    // Log crash to Firestore
    logCrash({
      type: 'GlobalErrorBoundary',
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });

    this.setState({ errorInfo });
    
    // Auto-retry for transient errors (e.g., lazy chunk loading)
    const msg = error.message?.toLowerCase() || '';
    const isTransient =
      msg.includes('loading chunk') ||
      msg.includes('loading css chunk') ||
      msg.includes('failed to fetch') ||
      msg.includes('dynamically imported module');

    if (isTransient && this.state.retryCount < MAX_AUTO_RETRIES) {
      console.log(`[GlobalErrorBoundary] Auto-retrying (${this.state.retryCount + 1}/${MAX_AUTO_RETRIES})...`);
      setTimeout(() => {
        this.setState(prev => ({
          hasError: false,
          error: null,
          errorInfo: null,
          retryCount: prev.retryCount + 1,
        }));
      }, 1000);
    }
  }

  private handleReload = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => {
        for (const reg of regs) reg.unregister();
      }).catch(() => {});
    }
    if (typeof window !== 'undefined' && 'caches' in window) {
      caches.keys().then(keys => {
        Promise.all(keys.map(k => caches.delete(k))).finally(() => {
          window.location.href = window.location.pathname + '?v=' + new Date().getTime();
        });
      }).catch(() => {
        window.location.reload();
      });
    } else {
      (window as any).location.reload();
    }
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, retryCount: 0 });
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      // If still within auto-retry window, show nothing (blank is better than error)
      if (this.state.retryCount < MAX_AUTO_RETRIES) {
        return null;
      }

      return (
        <div className="min-h-[100dvh] w-full flex items-center justify-center bg-[#020617] text-slate-200 p-6 z-[9999] relative">
          <div className="max-w-2xl w-full bg-[#0f172a] border border-red-500/30 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
              <RefreshCcw className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-2xl font-black text-red-500 mb-3">
              Application Crashed
            </h1>
            <p className="text-slate-400 mb-6 text-sm leading-relaxed">
              We encountered a critical error while rendering this part of the application.
            </p>
            
            <div className="w-full text-center bg-black/40 p-6 rounded-2xl border border-slate-800 mb-8">
              <p className="text-slate-300 text-sm font-medium mb-3">
                {this.state.error?.message && !this.state.error.message.includes('at ') && !this.state.error.message.includes('node_modules')
                  ? "We encountered a temporary interface issue. Please refresh or return home."
                  : "An unexpected error occurred. Please try reloading."}
              </p>
              <div className="inline-block bg-slate-900/80 px-3.5 py-1.5 rounded-lg border border-slate-700 text-xs font-mono text-slate-400">
                Incident Reference: <span className="text-amber-400 font-bold font-mono">OP-{Math.abs((this.state.error?.message || '').split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0)).toString(16).toUpperCase().padStart(6, '0').slice(-6)}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row w-full gap-3">
              <button
                onClick={this.handleReload}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-md active:scale-[0.98]"
              >
                Clear Cache & Reload
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex-1 bg-transparent hover:bg-white/5 border border-slate-700 text-slate-300 font-bold py-3.5 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                Go to Homepage
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
