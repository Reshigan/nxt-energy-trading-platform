import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; errorInfo: ErrorInfo | null; }

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) { super(props); this.state = { hasError: false, error: null, errorInfo: null }; }
  static getDerivedStateFromError(error: Error): Partial<State> { return { hasError: true, error }; }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    // Phase 5.6: Send error report to backend for admin dashboard
    try {
      const payload = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      };
      navigator.sendBeacon('/api/v1/errors/frontend', JSON.stringify(payload));
    } catch {
      // Don't let error reporting fail silently
    }
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0a1628] p-4">
          <div className="max-w-md w-full bg-white dark:bg-[#0f1d32] rounded-2xl border border-slate-200 dark:border-white/[0.06] p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Something went wrong</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">An unexpected error occurred. You can try again or report this issue.</p>
            {this.state.error && (
              <details className="mb-4 text-left">
                <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600 dark:hover:text-slate-300">Technical details</summary>
                <pre className="mt-2 p-3 bg-slate-100 dark:bg-white/[0.04] rounded-lg text-xs text-red-600 dark:text-red-400 overflow-auto max-h-40">
                  {this.state.error.message}
                  {this.state.errorInfo?.componentStack && `\n\nComponent Stack:${this.state.errorInfo.componentStack}`}
                </pre>
              </details>
            )}
            <div className="flex gap-3 justify-center">
              <button onClick={this.handleRetry} className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors">Try Again</button>
              <button onClick={() => window.location.reload()} className="px-6 py-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-300 text-sm font-semibold transition-colors">Refresh</button>
              <a href="mailto:support@et.vantax.co.za?subject=Bug Report" className="px-6 py-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-300 text-sm font-semibold transition-colors">Report</a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
