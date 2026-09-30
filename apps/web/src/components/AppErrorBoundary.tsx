import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Defaults to reloading the page. */
  onReload?: () => void;
}

interface State {
  error?: Error;
}

/** Last-resort boundary: an unexpected render error shows a friendly screen instead of a blank page. */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = {};

  static getDerivedStateFromError(error: unknown): State {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('CodeAdda crashed while rendering', error, info.componentStack);
  }

  private reload = () => {
    if (this.props.onReload) this.props.onReload();
    else window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="min-h-dvh bg-page p-6 text-ink">
        <div role="alert" className="mx-auto mt-16 max-w-lg rounded-lg border border-bad-line bg-bad-bg p-5 text-bad">
          <p className="font-semibold">Something went wrong</p>
          <p className="mt-1 text-sm">CodeAdda hit an unexpected error. Reloading the page usually fixes it; your progress and drafts are saved.</p>
          <pre className="mt-3 font-mono text-xs whitespace-pre-wrap">{error.message}</pre>
          <button type="button" onClick={this.reload} className="mt-4 rounded-md bg-inverse px-4 py-2 text-sm font-semibold text-on-inverse">
            Reload
          </button>
        </div>
      </div>
    );
  }
}
