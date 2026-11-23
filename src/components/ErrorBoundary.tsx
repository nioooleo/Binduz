import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let message = error.message || 'An unexpected rendering issue occurred.';
    try {
      const parsed = JSON.parse(message);
      if (parsed && typeof parsed.error === 'string') {
        message = `${parsed.operationType?.toUpperCase() || 'DATA'} permission error on ${parsed.path || 'record'}: ${parsed.error}`;
      }
    } catch {
      // Plain error message
    }
    return { hasError: true, message };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('Binduz ErrorBoundary caught:', error, info);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950 p-6">
          <div className="max-w-md w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-3 text-[#E1262D]">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h2 className="text-lg font-bold font-display text-neutral-900 dark:text-white">
                Editorial Desk Notice
              </h2>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed mb-5 break-words">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, message: '' });
                window.location.reload();
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#E1262D] hover:bg-[#c51e24] text-white text-sm font-semibold rounded transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reload Newsroom</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
