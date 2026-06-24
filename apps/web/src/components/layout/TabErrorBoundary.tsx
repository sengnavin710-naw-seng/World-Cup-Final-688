import { Component, type ErrorInfo, type ReactNode } from "react";
import { TabLoadState } from "./TabLoadState";

type TabErrorBoundaryProps = {
  children: ReactNode;
  label: string;
  resetKey: string | number;
};

type TabErrorBoundaryState = {
  hasError: boolean;
};

export class TabErrorBoundary extends Component<
  TabErrorBoundaryProps,
  TabErrorBoundaryState
> {
  state: TabErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error("Unable to render tournament tab", error, info);
    }
  }

  componentDidUpdate(previousProps: TabErrorBoundaryProps) {
    if (
      this.state.hasError &&
      previousProps.resetKey !== this.props.resetKey
    ) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <TabLoadState
          label={this.props.label}
          state="error"
          onRetry={() => window.location.reload()}
        />
      );
    }

    return this.props.children;
  }
}
