"use client";

// Per-region client error boundary.
//
// Several browser extensions (share-modal injectors, "feature_collector"
// telemetry, survey overlays) mutate the DOM before React hydrates, which
// can throw mid-render. Without a boundary, any single component crash
// bubbles to the route's error.tsx and replaces the WHOLE page with the
// snag screen — even though only one widget is broken.
//
// Wrapping non-essential, third-party-touching widgets (chatbot, Google
// Translate, share buttons, etc.) in this boundary contains the blast
// radius: the rest of the page keeps rendering, the broken widget is
// silently replaced with `null` (or a custom fallback).
//
// Usage:
//   <ClientErrorBoundary><AIChatbot /></ClientErrorBoundary>

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  /** Optional label for console diagnostics. */
  label?: string;
}

interface State {
  hasError: boolean;
}

export default class ClientErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error): void {
    // Console-only — Sentry forwarding happens at the route boundary.
    // We don't want hundreds of duplicate events when a single bad
    // extension breaks every page on the site.
    if (typeof console !== "undefined") {
      // eslint-disable-next-line no-console
      console.warn(
        `[ClientErrorBoundary${this.props.label ? `:${this.props.label}` : ""}] caught`,
        error?.message ?? error,
      );
    }
  }

  render(): ReactNode {
    if (this.state.hasError) return this.props.fallback ?? null;
    return this.props.children;
  }
}
