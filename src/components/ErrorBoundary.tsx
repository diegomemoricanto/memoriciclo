import { Component, type ErrorInfo, type ReactNode } from "react";
import { reportLovableError } from "@/lib/lovable-error-reporting";

type Props = {
  children: ReactNode;
  /** mensagem curta exibida no lugar do conteúdo quebrado */
  message?: string;
  onReset?: () => void;
};

type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportLovableError(error, { componentStack: info.componentStack ?? undefined });
  }

  private reset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.error) {
      return (
        <div
          role="alert"
          className="mx-auto my-6 max-w-md rounded-2xl border bg-card p-5 text-center shadow-soft"
        >
          <p className="text-sm font-semibold">
            {this.props.message ??
              "Ocorreu um problema ao atualizar a tela. Seu progresso salvo foi preservado."}
          </p>
          <button
            type="button"
            onClick={this.reset}
            className="mt-4 rounded-full bg-mint px-4 py-2 text-sm font-semibold text-mint-foreground"
          >
            Tentar novamente
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
