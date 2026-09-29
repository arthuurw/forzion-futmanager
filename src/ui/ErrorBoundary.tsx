import { Component, type ErrorInfo, type ReactNode } from "react";
import { useGame } from "../store";
import { canExport, downloadSave } from "./download";

/**
 * Lancamento AC 16-19: a screen that throws shows a way out instead of a blank page.
 * Correcoes-validacao AC 47: so does an error outside the render - one a store action or the clock
 * reports (`crash`), an uncaught error or a rejected promise nobody handled.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: useGame.getState().crashed };
  private unsubscribe: (() => void) | null = null;

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  private readonly onError = (e: ErrorEvent) => useGame.getState().crash(e.error ?? e.message);
  private readonly onRejection = (e: Event) => useGame.getState().crash((e as PromiseRejectionEvent).reason);

  componentDidMount(): void {
    window.addEventListener("error", this.onError);
    window.addEventListener("unhandledrejection", this.onRejection);
    this.unsubscribe = useGame.subscribe((s) => {
      if (s.crashed && !this.state.failed) this.setState({ failed: true });
    });
    if (useGame.getState().crashed && !this.state.failed) this.setState({ failed: true });
  }

  componentWillUnmount(): void {
    window.removeEventListener("error", this.onError);
    window.removeEventListener("unhandledrejection", this.onRejection);
    this.unsubscribe?.();
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(error, info.componentStack);
  }

  render() {
    return this.state.failed ? <ErrorScreen /> : this.props.children;
  }
}

function ErrorScreen() {
  const game = useGame.getState().game;
  return (
    <main className="app on-title">
      <div className="stage">
        <div className="title-screen">
          <div role="alert" className="panel confirm">
            <p>Algo deu errado</p>
            {canExport(game) && <button onClick={() => downloadSave(game)}>Exportar jogo</button>}
            <button className="primary" onClick={() => window.location.reload()}>
              Recarregar
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
