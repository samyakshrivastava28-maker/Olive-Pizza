import { Component, ReactNode } from 'react';
import { AlertOctagon, RefreshCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class RouteErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Route error caught:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-12 text-center w-full min-h-[50vh]">
          <div className="w-16 h-16 bg-dark-800 rounded-full flex items-center justify-center mb-6">
            <AlertOctagon className="w-8 h-8 text-primary-500 opacity-50" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Section Unavailable</h2>
          <p className="text-slate-400 mb-6 max-w-md">
            We couldn't load this section of the app. It might be a temporary network issue.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false });
            }}
            className="flex items-center gap-2 bg-dark-800 hover:bg-dark-700 text-white font-bold py-2.5 px-5 rounded-xl transition-all border border-dark-700"
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
