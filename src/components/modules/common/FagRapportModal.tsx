import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { ProsjektData } from '../../../data/prosjekter';
import { kopierTilUtklippstavle, lastNedTekst } from '../../../lib/format';

export interface FagRapportModalProps {
  aapen: boolean;
  onLukk: () => void;
  prosjekt: ProsjektData;
  tittel: string;
  undertittel: string;
  standardTekst: string;
  ikon?: string;
  nokkeltall: Array<{
    etikett: string;
    verdi: string;
    enhet?: string;
    tone?: 'ok' | 'advarsel' | 'feil';
  }>;
  seksjoner?: Array<{
    tittel: string;
    rader?: Array<{ etikett: string; verdi: string; detalj?: string }>;
    tabell?: { kolonner: string[]; rader: string[][] };
  }>;
  konklusjon: {
    tittel: string;
    tekst: string;
    ok: boolean;
  };
  markdownTekst: string;
  filnavnBase: string;
  rolleTittel?: string;
  melding: (t: string) => void;
}

export default function FagRapportModal({
  aapen,
  onLukk,
  prosjekt,
  tittel,
  undertittel,
  standardTekst,
  ikon = '📄',
  nokkeltall,
  seksjoner = [],
  konklusjon,
  markdownTekst,
  filnavnBase,
  rolleTittel = 'Utførende Rådgivende Ingeniør VVS (RIV)',
  melding,
}: FagRapportModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && aapen) onLukk();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [aapen, onLukk]);

  // Hjelpeklasse på body for å skjule app-innhold under utskrift
  useEffect(() => {
    if (aapen) {
      document.body.classList.add('vvs-rapport-aapen');
      return () => {
        document.body.classList.remove('vvs-rapport-aapen');
      };
    }
  }, [aapen]);

  const datoStreng = useMemo(
    () =>
      new Date().toLocaleDateString('nb-NO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    []
  );

  if (!aapen) return null;

  const modalInnhold = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="fag-rapport-tittel"
      className="vvs-rapport-modal fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/85 p-2 sm:p-4 backdrop-blur-sm print:static print:inset-auto print:block print:overflow-visible print:bg-white print:p-0 print:m-0 print:w-full print:shadow-none print:border-none"
    >
      <div className="vvs-rapport-ramme relative w-full max-w-5xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl my-6 flex flex-col max-h-[92vh] print:static print:my-0 print:max-w-none print:border-none print:bg-white print:shadow-none print:w-full print:max-h-none print:block">
        {/* Modal Topplinje (skjules under utskrift) */}
        <div
          data-print-meny="true"
          className="flex items-center justify-between border-b border-slate-700/80 px-6 py-4 bg-slate-950/60 rounded-t-2xl print:hidden"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-lg">
              {ikon}
            </span>
            <div>
              <h3 id="fag-rapport-tittel" className="text-sm font-bold text-slate-100">
                {tittel}
              </h3>
              <p className="text-[11px] text-slate-400">{standardTekst}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-500 transition"
              title="Skriv ut eller lagre som PDF"
            >
              🖨️ Skriv ut / Lagre PDF
            </button>
            <button
              type="button"
              onClick={async () => {
                const ok = await kopierTilUtklippstavle(markdownTekst);
                melding(ok ? '📋 Rapport kopiert til utklippstavlen' : 'Kunne ikke kopiere');
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
            >
              📋 Kopier
            </button>
            <button
              type="button"
              onClick={() => {
                const filnavn = `${prosjekt.navn.toLowerCase().replace(/[^a-z0-9æøå]+/gi, '-')}-${filnavnBase}.md`;
                lastNedTekst(filnavn, markdownTekst);
                melding('📥 Markdown lastet ned for NotebookLM / KI!');
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
            >
              📥 Last ned .md
            </button>
            <button
              type="button"
              onClick={onLukk}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Rapportinnhold – A4-ark */}
        <div className="overflow-y-auto p-6 space-y-6 bg-slate-900 text-slate-100 print:bg-white print:text-slate-900 print:p-0 print:m-0 print:space-y-4 print:overflow-visible print:w-full">
          <div
            id="fag-a4-rapport-utskrift"
            className="vvs-rapport-ark border border-slate-700/80 bg-white text-slate-900 p-8 rounded-xl shadow-lg print:border-none print:shadow-none print:p-0 print:m-0 max-w-4xl mx-auto print:max-w-none print:w-full"
          >
            {/* Brevhode */}
            <div className="border-b-2 border-emerald-700 pb-4 flex flex-wrap justify-between items-start gap-4">
              <div>
                <div className="text-[11px] font-black tracking-widest text-emerald-800 uppercase">
                  RÅDGIVENDE INGENIØR VVS (RIV) & TEKNISK DOKUMENTASJON
                </div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
                  {tittel.toUpperCase()}
                </h1>
                <p className="text-xs text-slate-600 mt-1">{undertittel}</p>
              </div>

              <div className="text-right text-xs">
                <div className="font-bold text-slate-900">Kim Jørgensen</div>
                <div className="text-slate-600">Rørleggermester & RIV</div>
                <div className="text-[11px] text-slate-500 mt-1">Dato: {datoStreng}</div>
              </div>
            </div>

            {/* Prosjektdata */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Prosjekt</span>
                <strong className="text-slate-900">{prosjekt.navn}</strong>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Sted / Adresse</span>
                <span className="text-slate-800">{prosjekt.sted || 'Ikke oppgitt'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Gnr / Bnr</span>
                <span className="text-slate-800">{prosjekt.matrikkel || 'Ikke oppgitt'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Oppvarmet BRA</span>
                <strong className="text-slate-900">{prosjekt.bra ? `${prosjekt.bra} m²` : 'Ikke oppgitt'}</strong>
              </div>
            </div>

            {/* Nøkkeltall */}
            <div className="mt-5">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1 mb-3">
                1. Dimensjonerende Nøkkeltall
              </h2>
              <div className={`grid grid-cols-2 gap-3 sm:grid-cols-${Math.min(4, Math.max(2, nokkeltall.length))}`}>
                {nokkeltall.map((n, i) => (
                  <div
                    key={i}
                    data-status={n.tone === 'ok' ? 'ok' : n.tone === 'feil' ? 'avvik' : n.tone === 'advarsel' ? 'advarsel' : undefined}
                    className={`p-3 rounded-lg border ${
                      n.tone === 'ok'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                        : n.tone === 'feil'
                        ? 'bg-rose-50 border-rose-200 text-rose-950'
                        : n.tone === 'advarsel'
                        ? 'bg-amber-50 border-amber-200 text-amber-950'
                        : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  >
                    <div className="text-[10px] font-bold uppercase text-slate-600">{n.etikett}</div>
                    <div className="text-lg font-black mt-0.5">
                      {n.verdi} {n.enhet && <span className="text-xs font-bold text-slate-600">{n.enhet}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Seksjoner & Tabeller */}
            {seksjoner.map((sek, sIdx) => (
              <div key={sIdx} className="mt-6">
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1 mb-3">
                  {sIdx + 2}. {sek.tittel}
                </h2>

                {sek.rader && sek.rader.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mb-3">
                    {sek.rader.map((r, rIdx) => (
                      <div key={rIdx} className="flex justify-between items-center p-2 rounded bg-slate-50 border border-slate-200">
                        <span className="text-slate-600 font-medium">{r.etikett}</span>
                        <strong className="text-slate-900 font-mono">{r.verdi}</strong>
                      </div>
                    ))}
                  </div>
                )}

                {sek.tabell && (
                  <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                          {sek.tabell.kolonner.map((k, kIdx) => (
                            <th key={kIdx} className="p-2">
                              {k}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 font-mono">
                        {sek.tabell.rader.map((rad, rIdx) => {
                          const zebra = rIdx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white';
                          return (
                            <tr key={rIdx} className={zebra}>
                              {rad.map((celle, cIdx) => (
                                <td key={cIdx} className={`p-2 ${cIdx === 0 ? 'font-sans font-bold text-slate-900' : ''}`}>
                                  {celle}
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}

            {/* Konklusjon */}
            <div
              data-status={konklusjon.ok ? 'ok' : 'avvik'}
              className={`mt-6 p-4 rounded-lg border ${
                konklusjon.ok ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{konklusjon.ok ? '✅' : '🚨'}</span>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                  {konklusjon.tittel}
                </h3>
              </div>
              <p className="mt-1 text-xs text-slate-700 leading-relaxed">{konklusjon.tekst}</p>
            </div>

            {/* Signaturblokk */}
            <div className="mt-8 pt-4 border-t border-slate-200 grid grid-cols-2 gap-8 text-xs text-slate-700">
              <div>
                <div className="font-bold text-slate-900">{rolleTittel}:</div>
                <div className="h-10 border-b border-dashed border-slate-300 mt-2" />
                <div className="text-[10px] text-slate-500 mt-1">Dato / Signatur / Kontroll</div>
              </div>
              <div>
                <div className="font-bold text-slate-900">Kontrollert & Godkjent av RIV:</div>
                <div className="h-10 border-b border-dashed border-slate-300 mt-2 flex items-end pb-1 font-serif italic text-emerald-900 font-bold">
                  Kim Jørgensen | RIV & Rørleggermester
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Dato: {datoStreng} | VVS KEM PRO</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalInnhold, document.body);
  }
  return modalInnhold;
}
