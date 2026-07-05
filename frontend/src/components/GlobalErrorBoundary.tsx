import React, { Component, ErrorInfo, ReactNode } from "react";
import { RefreshCcw, Home } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
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
    retryCount: 0,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[GlobalErrorBoundary] React render error:", error.message, errorInfo.componentStack);
    
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
          retryCount: prev.retryCount + 1,
        }));
      }, 1000);
    }
  }

  private handleReload = () => {
    // Clear any corrupted caches before reloading
    if ('caches' in window) {
      caches.keys().then(keys => keys.forEach(k => caches.delete(k))).catch(() => {});
    }
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null, retryCount: 0 });
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
          <div className="max-w-md w-full bg-[#0f172a] border border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mb-6">
              <RefreshCcw className="w-8 h-8 text-orange-500" />
            </div>
            <h1 className="text-2xl font-black text-white mb-3">
              Oops! Something went wrong.
            </h1>
            <p className="text-slate-400 mb-8 text-sm leading-relaxed">
              An unexpected error occurred. Your data is safe. Please try reloading.
            </p>

            <div className="flex flex-col w-full gap-3">
              <button
                onClick={this.handleReload}
                className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-md active:scale-[0.98]"
              >
                Reload Application
              </button>
              <button
                onClick={this.handleGoHome}
                className="w-full bg-transparent hover:bg-white/5 text-slate-300 font-bold py-3.5 px-6 rounded-xl transition-all flex items-center justify-center gap-2 mt-2"
              >
                <Home className="w-4 h-4" />
                Return to Homepage
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
