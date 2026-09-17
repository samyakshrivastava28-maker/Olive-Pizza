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
      return (
        <div className="min-h-[100dvh] w-full flex items-center justify-center bg-[#0B0F14] text-slate-200 p-6 z-[9999] relative">
          <div className="max-w-md w-full bg-[#131922] border border-amber-500/20 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mb-6">
              <RefreshCcw className="w-8 h-8 text-amber-500" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Unable to start Olive Pizza
            </h1>
            <p className="text-slate-400 mb-6 text-sm leading-relaxed">
              Please check your connection and try again.
            </p>
            <div className="flex flex-col sm:flex-row w-full gap-3">
              <button
                onClick={this.handleReload}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-3.5 px-6 rounded-xl transition-all shadow-md active:scale-[0.98]"
              >
                Retry
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex-1 bg-white/5 hover:bg-white/10 border border-slate-700 text-slate-200 font-bold py-3.5 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
