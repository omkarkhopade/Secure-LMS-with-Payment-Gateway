import { Component } from 'react';
export default class ErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="fatal-state">
        <h1>Let’s start fresh.</h1>
        <p>Something went wrong while opening this page.</p>
        <button className="button" onClick={() => window.location.reload()}>
          Reload Forma
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
