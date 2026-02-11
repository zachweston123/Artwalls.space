import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Optional fallback UI. Receives the error so callers can show context. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Generic React error boundary.
 *
 * Catches render-time errors in its subtree and shows a recovery UI instead
 * of white-screening the entire app.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  private reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) {
      return this.props.fallback(error, this.reset);
    }

    return (
      <div
        role="alert"
        className="max-w-lg mx-auto mt-16 p-8 text-center"
      >
        <h2 className="text-xl font-semibold mb-3 text-[var(--text)]">
          Something went wrong
        </h2>
        <p className="text-sm text-[var(--text-muted)] mb-6">
          {error.message || 'An unexpected error occurred.'}
        </p>
        <button
          type="button"
          onClick={this.reset}
          className="px-5 py-2 rounded-md border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] text-sm cursor-pointer hover:bg-[var(--surface-3)] transition-colors"
        >
          Try again
        </button>
      </div>
    );
  }
}
