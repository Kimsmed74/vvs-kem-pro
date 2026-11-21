import React, { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  harFeil: boolean;
  feil: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    harFeil: false,
    feil: null,
  };

  public static getDerivedStateFromError(feil: Error): State {
    return { harFeil: true, feil };
  }

  public override componentDidCatch(feil: Error, info: ErrorInfo) {
    console.error('Kritisk React-feil fanget av ErrorBoundary:', feil, info);
  }

  private handleNullstillOgStart = () => {
    try {
      if (typeof window !== 'undefined') {
        // Tøm eventuell korrupt lokal cache, men behold standard demo-bruker
        localStorage.removeItem('vvs-kem-pro:v1');
        localStorage.removeItem('vvs-kem-pro:auth:session');
        window.location.href = window.location.origin + window.location.pathname;
      }
    } catch {
      window.location.reload();
    }
  };

  public override render() {
    if (this.state.harFeil) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 selection:bg-rose-600 selection:text-white">
          <div className="w-full max-w-xl rounded-2xl border border-rose-800/80 bg-slate-900 p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400 mb-4">
              <span className="text-3xl">⚠️</span>
              <div>
                <h1 className="text-lg font-bold text-white">Noe gikk galt under lasting av VVS KEM PRO</h1>
                <p className="text-xs text-slate-400">En uventet feil stoppet gjengivelsen av brukergrensesnittet.</p>
              </div>
            </div>

            {this.state.feil && (
              <div className="mb-6 rounded-xl border border-rose-900/60 bg-rose-950/40 p-4 font-mono text-xs text-rose-200 overflow-x-auto">
                <div className="font-bold">{this.state.feil.name}: {this.state.feil.message}</div>
                {this.state.feil.stack && (
                  <pre className="mt-2 text-[10px] text-rose-300/80 whitespace-pre-wrap max-h-40 overflow-y-auto">
                    {this.state.feil.stack}
                  </pre>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={this.handleNullstillOgStart}
                className="flex-1 min-h-[44px] inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg transition hover:bg-blue-500"
              >
                🔄 Nullstill og start på nytt
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="min-h-[44px] inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-700"
              >
                Last siden på nytt
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
