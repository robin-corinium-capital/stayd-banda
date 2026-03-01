"use client";

import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("ErrorBoundary caught:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="mx-auto max-w-lg px-4 py-16 text-center">
            <div className="rounded-card bg-surface-card p-8 shadow-sm ring-1 ring-surface-border">
              <h2 className="text-lg font-semibold text-gray-900">
                Something went wrong
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Please try refreshing the page.
              </p>
              <button
                onClick={() => this.setState({ hasError: false })}
                className="mt-4 rounded-btn bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-light"
              >
                Try again
              </button>
            </div>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
