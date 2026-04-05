import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      errorInfo,
    });

    if (typeof this.props.onError === "function") {
      this.props.onError(error, errorInfo);
    }

    if (import.meta.env?.DEV) {
      console.error("ErrorBoundary caught an error:", error, errorInfo);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
          <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
            <div className="rounded-3xl bg-gradient-to-r from-slate-950 via-blue-950 to-blue-800 px-6 py-6 text-white">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-200">
                Application Error
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight">
                Something went wrong
              </h1>
              <p className="mt-3 text-sm leading-6 text-blue-100">
                The page crashed unexpectedly. Try refreshing the app or go back
                to the home page.
              </p>
            </div>

            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-4">
              <p className="text-sm font-medium text-red-700">
                {this.state.error?.message || "Unexpected application error."}
              </p>
            </div>

            {import.meta.env?.DEV && this.state.errorInfo ? (
              <details className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <summary className="cursor-pointer font-semibold text-slate-900">
                  Developer details
                </summary>
                <pre className="mt-3 overflow-auto whitespace-pre-wrap break-words text-xs leading-6">
                  {String(this.state.error)}
                  {"\n\n"}
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            ) : null}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                onClick={this.handleGoHome}
                className="rounded-2xl bg-slate-100 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-200"
              >
                Go Home
              </button>

              <button
                onClick={this.handleReload}
                className="rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
              >
                Reload App
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;