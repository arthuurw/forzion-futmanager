import { Component, type ErrorInfo, type ReactNode } from "react";
import { useGame } from "../store";
import { canExport, downloadSave } from "./download";

/** Lancamento AC 16-19: a screen that throws shows a way out instead of a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
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
