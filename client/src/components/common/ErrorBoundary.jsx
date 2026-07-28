import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="grid min-h-screen place-items-center bg-slate-50 p-6">
          <section className="max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-card">
            <h1 className="text-2xl font-bold">We could not display this page</h1>
            <p className="mt-3 text-slate-600">
              Your banking data was not changed. Reload the application to try again.
            </p>
            <button
              className="mt-6 rounded-lg bg-bank-700 px-5 py-3 font-semibold text-white"
              type="button"
              onClick={() => window.location.reload()}
            >
              Reload application
            </button>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}
