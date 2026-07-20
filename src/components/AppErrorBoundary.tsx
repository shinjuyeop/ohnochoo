import { Component, type ErrorInfo, type ReactNode } from "react";
import { useRouteError } from "react-router-dom";

function ErrorScreen({ message }: { message?: string }) {
  return (
    <main className="app-error" role="alert">
      <div className="app-error-card">
        <span aria-hidden="true">!</span>
        <h1>화면을 불러오지 못했어요</h1>
        <p>{message || "잠시 후 다시 시도해 주세요."}</p>
        <button type="button" onClick={() => window.location.reload()}>다시 시도</button>
      </div>
    </main>
  );
}

export function RouteErrorPage() {
  const error = useRouteError();
  const message = error instanceof Error ? error.message : undefined;
  return <ErrorScreen message={message} />;
}

export class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("app render failed", error, info);
  }

  render() {
    return this.state.failed ? <ErrorScreen /> : this.props.children;
  }
}
