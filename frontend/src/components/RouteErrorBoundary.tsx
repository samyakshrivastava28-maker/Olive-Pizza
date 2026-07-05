import { Component, ReactNode } from 'react';
import { RefreshCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  retryCount: number;
}

const MAX_AUTO_RETRIES = 1;

/**
 * RouteErrorBoundary — catches errors in individual route components.
 * Auto-retries once for transient (chunk/network) failures.
 * Never shows a full-page error for non-critical issues.
 */
export class RouteErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    retryCount: 0,
  };

  public static getDerivedStateFromError(_: Error): Partial<State> {
    return { hasError: true };
  }

  public componentDidCatch(error: Error) {
    console.warn('[RouteErrorBoundary] Route error caught:', error.message);

    // Auto-retry transient chunk loading errors
    const msg = error.message?.toLowerCase() || '';
    const isTransient =
      msg.includes('loading chunk') ||
      msg.includes('failed to fetch') ||
      msg.includes('dynamically imported module') ||
      msg.includes('loading css chunk');

    if (isTransient && this.state.retryCount < MAX_AUTO_RETRIES) {
      setTimeout(() => {
        this.setState(prev => ({
          hasError: false,
          retryCount: prev.retryCount + 1,
        }));
      }, 800);
    }
  }

  public render() {
    if (this.state.hasError) {
      // During auto-retry, render nothing (seamless)
      if (this.state.retryCount < MAX_AUTO_RETRIES) {
        return null;
      }

      return (
        <div className="flex flex-col items-center justify-center p-12 text-center w-full min-h-[40vh]">
          <div className="w-14 h-14 bg-slate-800 rounded-full flex items-center justify-center mb-4">
            <RefreshCcw className="w-7 h-7 text-orange-500 opacity-60" />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Section Unavailable</h2>
          <p className="text-slate-400 mb-5 text-sm max-w-sm">
            This section couldn't load. Please check your connection.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, retryCount: 0 })}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2 px-5 rounded-xl transition-all border border-slate-700 text-sm"
          >
            <RefreshCcw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
