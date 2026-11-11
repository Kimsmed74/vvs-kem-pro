import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { ProsjektData } from '../../data/prosjekter';
import type { ProsjektAnalyse } from '../../lib/analyse';
import { fmt, kopierTilUtklippstavle, lastNedTekst } from '../../lib/format';
import {
  FAG_FASER,
  genererFremdriftOgTidMarkdown,
  STANDARD_RIV_TIMEPRIS_KR,
  type ProsjektFremdriftInfo,
  type TidssporingTilstand,
} from '../../lib/fremdrift';

export interface FremdriftRapportModalProps {
  aapen: boolean;
  onLukk: () => void;
  prosjekt: ProsjektData;
  fremdrift: ProsjektFremdriftInfo;
  analyse: ProsjektAnalyse;
  tidssporing: TidssporingTilstand;
  melding: (t: string) => void;
}

export default function FremdriftRapportModal({
  aapen,
  onLukk,
  prosjekt,
  fremdrift,
  analyse,
  tidssporing,
  melding,
}: FremdriftRapportModalProps) {
  // Lukk med Escape-tasten
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && aapen) {
        onLukk();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [aapen, onLukk]);

  // Hjelpeklasse på body for print-oppførsel
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
      new Date().toLocaleDateString('no-NO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    []
  );

  const markdownInnhold = useMemo(
    () =>
      genererFremdriftOgTidMarkdown({
        prosjekt,
        fremdrift,
        analyse,
        tidssporing,
        dato: datoStreng,
      }),
    [prosjekt, fremdrift, analyse, tidssporing, datoStreng]
  );

  const handleKopier = async () => {
    const ok = await kopierTilUtklippstavle(markdownInnhold);
    if (ok) {
      melding('📋 Fremdrifts- og tidsrapport kopiert til utklippstavlen!');
    } else {
      melding('Kunne ikke kopiere rapporten automatisk.');
    }
  };

  const handleLastNed = () => {
    const filnavn = `${prosjekt.navn.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-fremdrift-og-tid.md`;
    lastNedTekst(filnavn, markdownInnhold);
    melding(`📥 Lastet ned ${filnavn} for NotebookLM / KI`);
  };

  const handleSkrivUt = () => {
    window.print();
  };

  if (!aapen) return null;

  const sumTimer = tidssporing.manuelleTimer.reduce((s, p) => s + (Number(p.timer) || 0), 0);
  const honorarKr = Math.round(sumTimer * STANDARD_RIV_TIMEPRIS_KR);
  const sumInnspartTimer = Math.round((fremdrift.aiInnspartTidMinutterTotalt / 60) * 10) / 10;

  const timerPerFase: Record<string, number> = {};
  for (const p of tidssporing.manuelleTimer) {
    timerPerFase[p.fase] = (timerPerFase[p.fase] || 0) + (Number(p.timer) || 0);
  }

  const modalElement = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Fremdrifts- og tidsrapport forhåndsvisning"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/80 p-2 backdrop-blur-xs sm:p-4 print:static print:inset-auto print:block print:bg-white print:p-0 print:backdrop-blur-none"
    >
      <div
        className="fixed inset-0 print:hidden"
        onClick={onLukk}
        aria-hidden="true"
      />

      <div className="relative z-10 flex max-h-[96vh] w-full max-w-5xl flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl print:max-h-none print:w-full print:max-w-none print:rounded-none print:border-none print:bg-white print:p-0 print:shadow-none">
        {/* Topplinje med handlingsknapper (skjules under utskrift) */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/80 bg-slate-900/90 px-4 py-3 sm:px-6 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xl">📊</span>
            <div>
              <h2 className="text-sm font-bold text-slate-100 sm:text-base">
                Fremdrifts- & Tidsrapport (A4 PDF)
              </h2>
              <p className="text-xs text-slate-400">
                {prosjekt.navn} · Stegstandarden ver. 1.2 & NS 3451
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSkrivUt}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-500"
            >
              🖨️ Skriv ut / Lagre som PDF
            </button>
            <button
              type="button"
              onClick={handleKopier}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700"
            >
              📋 Kopier rapport
            </button>
            <button
              type="button"
              onClick={handleLastNed}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700"
            >
              📥 Last ned .md (NotebookLM)
            </button>
            <button
              type="button"
              onClick={onLukk}
              className="inline-flex min-h-[38px] min-w-[38px] items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Rapporthoveddel (A4 struktur med tvunget print CSS) */}
        <div className="overflow-y-auto p-4 text-slate-200 sm:p-8 print:overflow-visible print:p-8 print:text-black">
          {/* RIV-brevhode */}
          <div className="border-b-2 border-emerald-600 pb-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-emerald-400 print:text-emerald-800">
                  VVS KEM PRO · Faglig Kommandosentral & Prosjektstyring
                </span>
                <h1 className="mt-1 text-xl font-black text-white sm:text-2xl print:text-black">
                  PROSJEKTOVERSIKT, FREMDRIFT & TIDSSPORING
                </h1>
                <p className="mt-0.5 text-xs text-slate-400 print:text-slate-600">
                  Stegstandarden ver. 1.2 · Bygg21 · NS 3451 · Statsbygg PA 0802 · TEK17
                </p>
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-right text-xs print:border-slate-300 print:bg-slate-50 print:text-black">
                <div className="font-extrabold text-emerald-300 print:text-emerald-800">
                  Kim Jørgensen
                </div>
                <div className="text-[11px] text-slate-300 print:text-slate-700">
                  Rørleggermester & Rådgivende Ingeniør VVS (RIV)
                </div>
                <div className="mt-1 font-mono text-[10px] text-slate-400 print:text-slate-500">
                  Dato: {datoStreng}
                </div>
              </div>
            </div>

            {/* Prosjektopplysninger */}
            <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3.5 text-xs text-slate-300 sm:grid-cols-4 print:border-slate-300 print:bg-slate-50 print:text-black">
              <div>
                <span className="block text-[10px] uppercase text-slate-500 print:text-slate-600">Prosjekt</span>
                <strong className="text-white print:text-black">{prosjekt.navn}</strong>
              </div>
              <div>
                <span className="block text-[10px] uppercase text-slate-500 print:text-slate-600">Adresse / Sted</span>
                <strong className="text-white print:text-black">{prosjekt.sted || 'Ikke oppgitt'}</strong>
              </div>
              <div>
                <span className="block text-[10px] uppercase text-slate-500 print:text-slate-600">Matrikkel (Gnr/Bnr)</span>
                <strong className="text-white print:text-black">{prosjekt.matrikkel || 'Ikke oppgitt'}</strong>
              </div>
              <div>
                <span className="block text-[10px] uppercase text-slate-500 print:text-slate-600">Areal & Type</span>
                <strong className="text-white print:text-black">
                  {prosjekt.bra ? `${prosjekt.bra} m² BRA` : '–'} ({prosjekt.bygningstype})
                </strong>
              </div>
            </div>
          </div>

          {/* Seksjon 1: Nøkkeltall-kort */}
          <div className="mt-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 print:text-slate-700">
              1. Fremdrifts- & Ressursregnskap
            </h3>
            <div className="mt-2.5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-700/80 bg-slate-950/60 p-3 print:border-slate-300 print:bg-white">
                <span className="block text-[10px] uppercase text-slate-400 print:text-slate-600">Helhetlig Fremdrift</span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-mono text-2xl font-black text-emerald-300 print:text-emerald-800">
                    {fremdrift.fremdriftProsent} %
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800 print:bg-slate-200">
                  <div
                    className="h-full bg-emerald-500 print:bg-emerald-700"
                    style={{ width: `${fremdrift.fremdriftProsent}%` }}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-slate-700/80 bg-slate-950/60 p-3 print:border-slate-300 print:bg-white">
                <span className="block text-[10px] uppercase text-slate-400 print:text-slate-600">Signaturstatus (QA)</span>
                <div className="mt-1 font-mono text-lg font-bold text-white print:text-black">
                  {fremdrift.signaturStatus.totaltFullfort} / {fremdrift.signaturStatus.totaltAntall} pkt
                </div>
                <span className="mt-1 inline-block text-[11px] font-semibold text-emerald-400 print:text-emerald-700">
                  {fremdrift.signaturStatus.badgeTekst}
                </span>
              </div>

              <div className="rounded-xl border border-slate-700/80 bg-slate-950/60 p-3 print:border-slate-300 print:bg-white">
                <span className="block text-[10px] uppercase text-slate-400 print:text-slate-600">Medgåtte RIV-timer</span>
                <div className="mt-1 font-mono text-2xl font-black text-cyan-300 print:text-cyan-800">
                  {fmt(sumTimer, 1)} t
                </div>
                <span className="text-[11px] text-slate-400 print:text-slate-600">
                  Honorar: {honorarKr.toLocaleString('no-NO')} kr eks. mva
                </span>
              </div>

              <div className="rounded-xl border border-slate-700/80 bg-slate-950/60 p-3 print:border-slate-300 print:bg-white">
                <span className="block text-[10px] uppercase text-slate-400 print:text-slate-600">AI Beregningsstøtte</span>
                <div className="mt-1 font-mono text-2xl font-black text-indigo-300 print:text-indigo-800">
                  {tidssporing.aiLogger.length} analyser
                </div>
                <span className="text-[11px] text-emerald-400 print:text-emerald-700">
                  ca. {fmt(sumInnspartTimer, 1)} timer spart
                </span>
              </div>
            </div>
          </div>

          {/* Seksjon 2: Fagfaser fordeling */}
          <div className="mt-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 print:text-slate-700">
              2. Medgåtte Timer fordelt på Fagfaser (Stegstandarden)
            </h3>
            <div className="mt-2 overflow-x-auto rounded-xl border border-slate-700 print:border-slate-400">
              <table className="w-full text-left text-xs print:text-[11px]">
                <thead className="border-b border-slate-700 bg-slate-800/80 font-bold text-slate-300 print:border-slate-400 print:bg-slate-100 print:text-black">
                  <tr>
                    <th className="p-2.5">Fagfase iht. Stegmodellen</th>
                    <th className="p-2.5 text-center">Medgåtte timer</th>
                    <th className="p-2.5 text-center">Budsjett</th>
                    <th className="p-2.5 text-center">Andel</th>
                    <th className="p-2.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono print:divide-slate-300">
                  {FAG_FASER.map((fase) => {
                    const brukt = timerPerFase[fase.id] || 0;
                    const andel = sumTimer > 0 ? ((brukt / sumTimer) * 100).toFixed(1) : '0,0';
                    const overskredet = brukt > fase.budsjettTimerStandard;
                    return (
                      <tr key={fase.id} className="hover:bg-slate-800/40 print:hover:bg-transparent">
                        <td className="p-2.5 font-sans font-medium text-slate-200 print:text-black">
                          {fase.langtNavn}
                        </td>
                        <td className="p-2.5 text-center font-bold text-emerald-400 print:text-black">
                          {fmt(brukt, 1)} t
                        </td>
                        <td className="p-2.5 text-center text-slate-400 print:text-slate-600">
                          {fase.budsjettTimerStandard} t
                        </td>
                        <td className="p-2.5 text-center text-slate-300 print:text-black">
                          {andel} %
                        </td>
                        <td className="p-2.5 text-right">
                          <span
                            className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold ${
                              overskredet
                                ? 'bg-amber-950/80 text-amber-300 print:bg-amber-100 print:text-amber-800'
                                : 'bg-emerald-950/80 text-emerald-300 print:bg-emerald-100 print:text-emerald-800'
                            }`}
                          >
                            {overskredet ? '⚠️ Over budsjett' : '✅ OK'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="border-t-2 border-slate-600 bg-slate-950/80 font-bold print:border-slate-500 print:bg-slate-100">
                    <td className="p-2.5 font-sans">TOTALT MEDGÅTTE TIMER</td>
                    <td className="p-2.5 text-center text-emerald-400 print:text-black">
                      {fmt(sumTimer, 1)} t
                    </td>
                    <td className="p-2.5 text-center text-slate-400 print:text-black">130 t</td>
                    <td className="p-2.5 text-center">100 %</td>
                    <td className="p-2.5 text-right font-sans text-emerald-300 print:text-black">
                      {honorarKr.toLocaleString('no-NO')} kr eks. mva
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Seksjon 3: Detaljert tidslogg */}
          {tidssporing.manuelleTimer.length > 0 && (
            <div className="mt-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 print:text-slate-700">
                3. Loggførte Arbeidsøkter & Prosjekteringsnotater
              </h3>
              <div className="mt-2 overflow-x-auto rounded-xl border border-slate-700 print:border-slate-400">
                <table className="w-full text-left text-xs print:text-[11px]">
                  <thead className="border-b border-slate-700 bg-slate-800/80 font-bold text-slate-300 print:border-slate-400 print:bg-slate-100 print:text-black">
                    <tr>
                      <th className="p-2">Dato</th>
                      <th className="p-2">Utførende</th>
                      <th className="p-2">Fagfase</th>
                      <th className="p-2">Beskrivelse</th>
                      <th className="p-2 text-right">Timer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 print:divide-slate-300">
                    {tidssporing.manuelleTimer.map((post) => {
                      const faseDef = FAG_FASER.find((f) => f.id === post.fase);
                      return (
                        <tr key={post.id} className="hover:bg-slate-800/40 print:hover:bg-transparent">
                          <td className="p-2 font-mono text-slate-300 print:text-black">{post.dato}</td>
                          <td className="p-2 font-medium text-slate-200 print:text-black">{post.utforende}</td>
                          <td className="p-2 text-slate-300 print:text-black">{faseDef?.kortNavn ?? post.fase}</td>
                          <td className="p-2 text-slate-300 print:text-black">{post.beskrivelse}</td>
                          <td className="p-2 text-right font-mono font-bold text-emerald-400 print:text-black">
                            {fmt(post.timer, 1)} t
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Seksjon 4: AI-analyselogg */}
          {tidssporing.aiLogger.length > 0 && (
            <div className="mt-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 print:text-slate-700">
                4. AI-Agenters Analyselogg & Beregningsytelse
              </h3>
              <div className="mt-2 overflow-x-auto rounded-xl border border-slate-700 print:border-slate-400">
                <table className="w-full text-left text-xs print:text-[11px]">
                  <thead className="border-b border-slate-700 bg-slate-800/80 font-bold text-slate-300 print:border-slate-400 print:bg-slate-100 print:text-black">
                    <tr>
                      <th className="p-2">Tidspunkt</th>
                      <th className="p-2">Agent</th>
                      <th className="p-2">Operasjon</th>
                      <th className="p-2 text-center">Kjøretid</th>
                      <th className="p-2 text-center">Innspart tid</th>
                      <th className="p-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-mono print:divide-slate-300">
                    {tidssporing.aiLogger.map((logg) => (
                      <tr key={logg.id} className="hover:bg-slate-800/40 print:hover:bg-transparent">
                        <td className="p-2 text-slate-400 print:text-slate-600">
                          {logg.tidspunkt.slice(0, 16).replace('T', ' ')}
                        </td>
                        <td className="p-2 font-sans font-medium text-slate-200 print:text-black">
                          {logg.agentNavn}
                        </td>
                        <td className="p-2 font-sans text-slate-300 print:text-black">{logg.operasjon}</td>
                        <td className="p-2 text-center font-bold text-cyan-300 print:text-black">
                          {(logg.kjoretidMs / 1000).toFixed(2)} s
                        </td>
                        <td className="p-2 text-center text-emerald-400 print:text-emerald-700">
                          ca. {logg.innspartTidMinutter} min
                        </td>
                        <td className="p-2 text-right">
                          <span className="inline-block rounded bg-emerald-950/80 px-2 py-0.5 text-[10px] font-bold text-emerald-300 print:bg-emerald-100 print:text-emerald-800">
                            {logg.status === 'fullfort' ? '✅ Fullført' : '❌ Feilet'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Seksjon 5: Konklusjon & Signatur */}
          <div className="mt-8 rounded-2xl border border-emerald-600/80 bg-emerald-950/30 p-5 print:border-slate-400 print:bg-slate-50">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 print:text-emerald-800">
                  Sluttkontroll & RIV-Godkjenning
                </span>
                <h4 className="text-base font-extrabold text-white print:text-black">
                  {fremdrift.erKlarForSignatur
                    ? 'Prosjektet er godkjent og verifisert i henhold til gjeldende standarder'
                    : `Prosjektet er under aktiv prosjektering (${fremdrift.fremdriftProsent} % fullført)`}
                </h4>
                <p className="mt-1 text-xs text-slate-300 print:text-slate-700">
                  Kotekontroll (950 mm / TEK17 0,90 m), trykkbudsjett, innregulering og LCC-dokumentasjon er registrert i VVS KEM PRO.
                </p>
              </div>

              <div className="rounded-xl border border-emerald-500/50 bg-slate-950/80 p-3 text-center text-xs print:border-slate-400 print:bg-white print:text-black">
                <div className="font-mono text-xs font-black text-emerald-300 print:text-emerald-800">
                  KONTROLLSTEMPEL
                </div>
                <div className="mt-1 font-bold text-white print:text-black">Kim Jørgensen</div>
                <div className="text-[10px] text-slate-400 print:text-slate-600">
                  Rørleggermester & RIV
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalElement, document.body);
}
