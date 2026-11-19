import { Component } from "react";

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Frontend rendering error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-app-bg px-4 text-app-text">
          <section className="w-full max-w-md rounded-lg border border-app-border bg-app-surface p-6 text-center">
            <h1 className="text-lg font-semibold text-app-text">Something went wrong</h1>
            <p className="mt-2 text-sm text-app-muted">
              The page hit an unexpected error. Reload to try again.
            </p>
            <button
              className="mt-5 h-9 rounded-md bg-accent px-4 text-sm font-medium text-accent-contrast hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-app-surface"
              onClick={() => window.location.reload()}
              type="button"
            >
              Reload
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
