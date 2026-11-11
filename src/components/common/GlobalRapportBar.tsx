import React from 'react';

export interface GlobalRapportBarProps {
  tittel: string;
  undertittel?: string;
  standard?: string;
  ikon?: string;
  onApneRapport: () => void;
  onKopier: () => void | Promise<void>;
  onLastNedMd: () => void;
  statusBadge?: {
    tekst: string;
    tone?: 'ok' | 'advarsel' | 'feil' | 'info';
  };
  ekstraKnapper?: React.ReactNode;
  className?: string;
}

/**
 * GlobalRapportBar: Felles, universell eksport- og rapportlinje
 * Gjør visuell A4 PDF-rapport, utklippstavlekopiering og NotebookLM-markdown
 * tilgjengelig på tvers av alle moduler, faner og kalkulatorer i VVS KEM PRO.
 */
export default function GlobalRapportBar({
  tittel,
  undertittel,
  standard,
  ikon = '📄',
  onApneRapport,
  onKopier,
  onLastNedMd,
  statusBadge,
  ekstraKnapper,
  className = '',
}: GlobalRapportBarProps) {
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-700/80 bg-slate-900/90 p-3 sm:p-3.5 shadow-md backdrop-blur print:hidden ${className}`}
    >
      {/* Venstre: Ikon, Modultittel og Standardreferanse */}
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 border border-slate-700 text-xl shadow-inner">
          {ikon}
        </span>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-black text-slate-100 tracking-tight">
              {tittel}
            </h3>
            {standard && (
              <span className="rounded bg-sky-950/80 px-2 py-0.5 text-[10px] font-bold text-sky-300 border border-sky-700/60">
                {standard}
              </span>
            )}
            {statusBadge && (
              <span
                className={`rounded px-2 py-0.5 text-[10px] font-black border ${
                  statusBadge.tone === 'ok'
                    ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
                    : statusBadge.tone === 'feil'
                    ? 'bg-rose-950/80 border-rose-700 text-rose-300'
                    : statusBadge.tone === 'advarsel'
                    ? 'bg-amber-950/80 border-amber-700 text-amber-300'
                    : 'bg-slate-800 border-slate-600 text-slate-300'
                }`}
              >
                {statusBadge.tekst}
              </span>
            )}
          </div>
          {undertittel && (
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              {undertittel}
            </p>
          )}
        </div>
      </div>

      {/* Høyre: De tre kanoniske eksportknappene + eventuelle modulfunksjoner */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onApneRapport}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-black text-white shadow-md transition hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          title="Åpne utskriftsklar A4-rapport med formler, nøkkeltall og godkjenningsstempel for RIV"
        >
          <span>📄 Visuell rapport & PDF</span>
        </button>

        <button
          type="button"
          onClick={onKopier}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs font-bold text-slate-200 transition hover:bg-slate-700 hover:text-white"
          title="Kopier strukturert rapport / tabell til utklippstavlen"
        >
          <span>📋 Kopier rapport</span>
        </button>

        <button
          type="button"
          onClick={onLastNedMd}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-purple-700/80 bg-purple-950/60 px-3 py-2 text-xs font-bold text-purple-200 transition hover:bg-purple-900 hover:text-white"
          title="Last ned ren Markdown-tabell (.md) for bruk i Google NotebookLM eller KI-analyser"
        >
          <span>📥 Last ned .md (NotebookLM)</span>
        </button>

        {ekstraKnapper && (
          <div className="ml-1 pl-2 border-l border-slate-700 flex items-center gap-2">
            {ekstraKnapper}
          </div>
        )}
      </div>
    </div>
  );
}
