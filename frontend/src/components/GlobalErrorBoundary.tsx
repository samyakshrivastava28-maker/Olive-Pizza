import React, { Component, ErrorInfo, ReactNode } from "react";
import { RefreshCcw, Home, AlertOctagon } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[100dvh] w-full flex items-center justify-center bg-dark-950 text-slate-200 p-6 z-[9999] relative">
          <div className="max-w-md w-full bg-dark-900 border border-dark-800 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
              <AlertOctagon className="w-10 h-10 text-red-500" />
            </div>
            <h1 className="text-2xl font-black text-white mb-3">
              Oops! Something went wrong.
            </h1>
            <p className="text-slate-400 mb-8 text-sm leading-relaxed">
              We encountered an unexpected error. Don't worry, your data is safe.
              You can try again or reload the application.
            </p>

            <div className="flex flex-col w-full gap-3">
              <button
                onClick={this.handleRetry}
                className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-md active:scale-[0.98]"
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="w-full bg-dark-800 hover:bg-dark-700 text-white font-bold py-3.5 px-6 rounded-xl border border-dark-700 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <RefreshCcw className="w-4 h-4" />
                Reload App
              </button>
              <button
                onClick={this.handleGoHome}
                className="w-full bg-transparent hover:bg-white/5 text-slate-300 font-bold py-3.5 px-6 rounded-xl transition-all flex items-center justify-center gap-2 mt-2"
              >
                <Home className="w-4 h-4" />
                Return Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
