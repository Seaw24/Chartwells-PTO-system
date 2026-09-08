import React from "react";
import { queryClient } from "../../lib/queryClient.js";
import { friendlyError } from "../../utils/errors.jsx";
export class QueryBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  retry = async () => {
    await queryClient.resetQueries();
    this.setState({ error: null });
  };
  render() {
    return this.state.error ? (
      <section
        role="alert"
        className="rounded-card border border-line bg-card p-6 shadow-card"
      >
        <h2 className="text-lg font-bold text-ink">
          We couldn't load this view
        </h2>
        <p className="mt-2 text-sm text-ink-soft">
          {friendlyError(this.state.error)}
        </p>
        <button
          className="mt-4 rounded-btn bg-accent-strong px-4 py-2 text-sm font-semibold text-white"
          onClick={this.retry}
        >
          Try again
        </button>
      </section>
    ) : (
      this.props.children
    );
  }
}
