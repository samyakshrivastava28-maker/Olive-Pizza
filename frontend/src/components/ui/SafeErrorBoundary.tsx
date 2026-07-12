import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class SafeErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("SafeErrorBoundary caught an error:", error, errorInfo);
    const msg = error.message.toLowerCase();
    const isChunkError = error.name === 'ChunkLoadError' || 
                         msg.includes('dynamically imported module') ||
                         msg.includes('failed to fetch') ||
                         msg.includes('importing a module script failed');
                         
    if (isChunkError) {
      // Let the user see the error UI and click the button to nuke caches.
      // Auto-reloading here can cause an infinite loop in some WebViews if cache isn't cleared synchronously.
      console.warn("Caught chunk load error. Waiting for manual refresh to clear caches.");
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      // Nuke all PWA caches and service workers before reloading to fix ChunkLoadErrors
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(regs => {
          for (const reg of regs) reg.unregister();
        }).catch(() => {});
      }
      if ('caches' in window) {
        caches.keys().then(keys => {
          Promise.all(keys.map(k => caches.delete(k))).finally(() => {
            window.location.href = window.location.pathname + '?v=' + new Date().getTime();
          });
        }).catch(() => {
          window.location.reload();
        });
      } else {
        window.location.reload();
      }
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-red-500/10 p-4 rounded-full mb-4">
            <AlertTriangle className="w-12 h-12 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-100 mb-2">Something went wrong</h2>
          <p className="text-slate-400 max-w-md mb-8">
            We encountered an unexpected issue while loading this part of the application. 
            Please try again.
          </p>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-bold transition-all hover:scale-105 active:scale-95"
          >
            <RefreshCcw className="w-5 h-5" />
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
