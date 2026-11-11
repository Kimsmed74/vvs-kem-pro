import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { ProsjektData } from '../../../data/prosjekter';
import type {
  StrekkResultat,
  Trykkbudsjett,
  TrykkbudsjettResultat,
} from '../../../engine/sanitaer';
import { fmt, kopierTilUtklippstavle, lastNedTekst } from '../../../lib/format';
import { genererTrykkfallMarkdown } from '../../../lib/rapportMarkdown';

export interface TrykkfallRapportModalProps {
  aapen: boolean;
  onLukk: () => void;
  prosjektNavn: string;
  prosjektData?: ProsjektData;
  budsjett: Trykkbudsjett;
  bud: TrykkbudsjettResultat;
  beregnet: StrekkResultat[];
  sum: { lengde: number; rxl: number };
  margin: number;
  ok: boolean;
  melding: (t: string) => void;
}

export default function TrykkfallRapportModal({
  aapen,
  onLukk,
  prosjektNavn,
  prosjektData,
  budsjett,
  bud,
  beregnet,
  sum,
  margin,
  ok,
  melding,
}: TrykkfallRapportModalProps) {
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

  const markdownTekst = useMemo(
    () =>
      genererTrykkfallMarkdown({
        prosjektTittel: prosjektNavn,
        prosjektData,
        budsjett,
        bud,
        beregnet,
        sum,
        margin,
        ok,
        dato: datoStreng,
      }),
    [prosjektNavn, prosjektData, budsjett, bud, beregnet, sum, margin, ok, datoStreng]
  );

  const handleKopierMarkdown = async () => {
    const kopiert = await kopierTilUtklippstavle(markdownTekst);
    melding(
      kopiert
        ? '📋 Markdown-rapport kopiert til utklippstavlen (klar for NotebookLM / KI)'
        : 'Kunne ikke kopiere rapporten automatisk'
    );
  };

  const handleLastNedMarkdown = () => {
    const tryggFilnavn = `${prosjektNavn
      .toLowerCase()
      .replace(/[^a-z0-9æøå]+/gi, '-')
      .replace(/^-|-$/g, '')}-trykkfall-rapport.md`;
    lastNedTekst(tryggFilnavn, markdownTekst);
    melding('📥 Markdown-rapport lastet ned for NotebookLM / AI!');
  };

  const handleSkrivUtPdf = () => {
    window.print();
  };

  if (!aapen) return null;

  const adresse = prosjektData?.sted?.trim() || 'Ikke oppgitt';
  const matrikkel = prosjektData?.matrikkel?.trim() || 'Ikke oppgitt';
  const bygningstype = prosjektData?.bygningstype || 'Næring / Bolig';
  const utnyttelseProsent =
    bud.dispFriksjon > 0
      ? ((sum.rxl / bud.dispFriksjon) * 100).toFixed(1)
      : '0.0';

  const modalInnhold = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Teknisk rapport for sanitær trykkfallsberegning"
      className="vvs-rapport-modal fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/85 p-3 backdrop-blur-sm sm:p-6 print:static print:inset-auto print:block print:overflow-visible print:bg-white print:p-0 print:m-0 print:w-full print:shadow-none print:border-none"
    >
      {/* CSS-styling dedikert for A4 PDF-utskrift */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 10mm 12mm 10mm;
          }
          *, *::before, *::after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          body {
            background-color: #ffffff !important;
            color: #0f172a !important;
          }
          [data-print-meny="true"],
          .print\\:hidden {
            display: none !important;
            visibility: hidden !important;
          }
          #vvs-a4-rapport-utskrift {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #0f172a !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
          }
        }
      `}</style>

      <div className="vvs-rapport-ramme relative my-4 w-full max-w-5xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl print:static print:my-0 print:max-w-none print:border-none print:bg-white print:shadow-none print:w-full print:block">
        {/* Kontroll- og handlingslinje (skjules under PDF-utskrift) */}
        <div
          data-print-meny="true"
          className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/80 bg-slate-900/95 px-5 py-3.5 backdrop-blur print:hidden"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-950 border border-sky-600/70 text-lg">
              📄
            </span>
            <div>
              <h2 className="text-sm font-black text-slate-100">
                Visuell Teknisk Rapport (SINTEF Byggforsk 553.102)
              </h2>
              <p className="text-[11px] text-slate-400">
                Utskriftsklar A4-oppstilling med forutsetninger, tabeller og kontrollboks
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSkrivUtPdf}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-black text-white shadow-lg transition hover:bg-emerald-500"
            >
              <span>🖨️ Skriv ut / Lagre som PDF</span>
            </button>
            <button
              type="button"
              onClick={handleKopierMarkdown}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 transition hover:bg-slate-700"
            >
              <span>📋 Kopier rapport</span>
            </button>
            <button
              type="button"
              onClick={handleLastNedMarkdown}
              title="Last ned ren Markdown-tabell for bruk i Google NotebookLM eller KI-analyser"
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-purple-700/80 bg-purple-950/60 px-3 py-1.5 text-xs font-bold text-purple-200 transition hover:bg-purple-900"
            >
              <span>📥 Last ned .md (NotebookLM)</span>
            </button>
            <button
              type="button"
              onClick={onLukk}
              className="inline-flex min-h-[38px] min-w-[38px] items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-300 transition hover:bg-slate-700 hover:text-white"
              aria-label="Lukk forhåndsvisning"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Hovedvisning: Det A4-optimaliserte rapportdokumentet */}
        <div className="overflow-x-auto p-4 sm:p-8 print:p-0 print:m-0 print:overflow-visible print:w-full">
          <article
            id="vvs-a4-rapport-utskrift"
            className="vvs-rapport-ark mx-auto max-w-[210mm] rounded-xl bg-white p-6 sm:p-8 text-slate-900 shadow-xl print:p-0 print:m-0 print:shadow-none print:border-none print:max-w-none print:w-full"
          >
            {/* Topp-dekorasjon i profilerte farger */}
            <div className="mb-6 h-2.5 w-full rounded-full bg-gradient-to-r from-sky-600 via-indigo-600 to-emerald-600 print:h-2" />

            {/* Toppfelt: Logo, Standardreferanse & RIV-informasjon */}
            <header className="border-b-2 border-slate-200 pb-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-black tracking-wider text-slate-700 uppercase">
                    <span>🏢 VVS KEM PRO</span>
                    <span className="text-slate-400">|</span>
                    <span>Ingeniørrapportering</span>
                  </div>
                  <h1 className="mt-2 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
                    SANITÆR TRYKKFALLSBEREGNING
                  </h1>
                  <p className="text-xs font-bold text-sky-800">
                    SINTEF Byggforsk Kunnskapssystem 553.102 · TEK17 § 15-5 · NS-EN 806
                  </p>
                </div>

                <div className="text-right text-xs">
                  <div className="font-black text-slate-900">
                    Kim Jørgensen
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Rørleggermester & Rådgivende Ingeniør VVS (RIV)
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    Dato: <strong className="text-slate-800">{datoStreng}</strong>
                  </div>
                </div>
              </div>

              {/* Prosjektopplysninger Grid */}
              <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-xs sm:grid-cols-4">
                <div>
                  <span className="block text-[10px] font-bold text-slate-500 uppercase">Prosjekt / Tiltak</span>
                  <strong className="text-slate-950 truncate block">{prosjektNavn}</strong>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-500 uppercase">Adresse / Sted</span>
                  <span className="text-slate-800 truncate block">{adresse}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-500 uppercase">Matrikkel (Gnr/Bnr)</span>
                  <span className="text-slate-800 truncate block">{matrikkel}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-500 uppercase">Bygningskategori</span>
                  <span className="text-slate-800 truncate block">{bygningstype}</span>
                </div>
              </div>
            </header>

            {/* Seksjon 1: Forutsetninger & Trykkbudsjett Nøkkeltall-kort */}
            <section className="mt-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  1. Forutsetninger & Trykkbudsjett (Trykkregnskap)
                </h3>
                <span className="text-[11px] text-slate-500">
                  Rørmateriale: <strong>Kobberrør iht. EN 1057</strong>
                </span>
              </div>

              {/* Rutenett med nøkkeltall-kort */}
              <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-center">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase">
                    Trykk i hovedledning (p₀)
                  </span>
                  <span className="mt-1 block text-base font-black text-slate-950">
                    {fmt(budsjett.hovedtrykk, 0)} <span className="text-xs font-normal text-slate-600">kPa</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    {fmt(budsjett.hovedtrykk / 100, 2)} bar
                  </span>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-center">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase">
                    Nødvendig resttrykk
                  </span>
                  <span className="mt-1 block text-base font-black text-slate-950">
                    {fmt(budsjett.resttrykk, 0)} <span className="text-xs font-normal text-slate-600">kPa</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    {fmt(budsjett.resttrykk / 100, 2)} bar
                  </span>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-center">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase">
                    Løftetrykk ({fmt(budsjett.loftehoyde, 1)} m)
                  </span>
                  <span className="mt-1 block text-base font-black text-slate-950">
                    {fmt(bud.loftetrykk)} <span className="text-xs font-normal text-slate-600">kPa</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    h · 9,81 kPa/m
                  </span>
                </div>

                <div className="rounded-lg border border-sky-200 bg-sky-50/70 p-2.5 text-center">
                  <span className="block text-[10px] font-bold text-sky-800 uppercase">
                    Disponibelt til friksjon
                  </span>
                  <span className="mt-1 block text-base font-black text-sky-950">
                    {fmt(bud.dispFriksjon)} <span className="text-xs font-normal text-sky-700">kPa</span>
                  </span>
                  <span className="text-[10px] text-sky-600 font-medium">
                    p_disp,frik
                  </span>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-center">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase">
                    Total rørlengde (Σ l)
                  </span>
                  <span className="mt-1 block text-base font-black text-slate-950">
                    {fmt(sum.lengde, 1)} <span className="text-xs font-normal text-slate-600">m</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    Ugunstigste trasé
                  </span>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-center">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase">
                    Midlere rørfriksjon (R_midlere)
                  </span>
                  <span className="mt-1 block text-base font-black text-slate-950">
                    {bud.midlereR !== null ? fmt(bud.midlereR, 3) : '0,000'}{' '}
                    <span className="text-[10px] font-normal text-slate-600">kPa/m</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    Retningsgivende R
                  </span>
                </div>
              </div>

              {/* Supplerende forutsetninger */}
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-[11px] text-slate-600">
                <span>
                  Større enkeltmotstander (vannmåler, tilbakeslag, filter):{' '}
                  <strong className="text-slate-900">{fmt(budsjett.enkeltmotstand, 1)} kPa</strong>
                </span>
                <span>
                  Avsatt til rørdeler / bend ({fmt(budsjett.rordelerProsent, 0)} %):{' '}
                  <strong className="text-slate-900">{fmt(bud.rordeler)} kPa</strong>
                </span>
                <span>
                  Disponibelt friksjon + enkeltmotstander:{' '}
                  <strong className="text-slate-900">{fmt(bud.dispFriksjonOgEnkelt)} kPa</strong>
                </span>
              </div>
            </section>

            {/* Seksjon 2: Stylet Dimensjoneringstabell med Fargekoding */}
            <section className="mt-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  2. Dimensjoneringstabell for fordelingsledning (SINTEF Byggforsk 553.102)
                </h3>
                <span className="text-[11px] text-slate-500">
                  Hastighetsgrense: <strong>v ≤ 2,0 m/s</strong> (fordelingsledning)
                </span>
              </div>

              <div className="mt-3 overflow-x-auto rounded-lg border border-slate-300">
                <table className="w-full text-left text-xs text-slate-800">
                  <thead className="bg-slate-100 text-[11px] font-bold uppercase text-slate-700 border-b border-slate-300">
                    <tr>
                      <th scope="col" className="px-2.5 py-2">Strekk</th>
                      <th scope="col" className="px-2 py-2 text-right">Σ q_N (l/s)</th>
                      <th scope="col" className="px-2 py-2 text-right">q_N1 (l/s)</th>
                      <th scope="col" className="px-2 py-2 text-right">q_S (l/s)</th>
                      <th scope="col" className="px-2 py-2 text-right">q_kont</th>
                      <th scope="col" className="px-2 py-2 text-right">q_dim (l/s)</th>
                      <th scope="col" className="px-2 py-2 text-center">Dim (mm)</th>
                      <th scope="col" className="px-2 py-2 text-right">d_i (mm)</th>
                      <th scope="col" className="px-2 py-2 text-center">v (m/s)</th>
                      <th scope="col" className="px-2 py-2 text-right">R (kPa/m)</th>
                      <th scope="col" className="px-2 py-2 text-right">l (m)</th>
                      <th scope="col" className="px-2.5 py-2 text-right font-extrabold">R · l (kPa)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                    {beregnet.map((b, idx) => {
                      const vOk = b.hastighet <= 2.0;
                      const zebra = idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white';
                      return (
                        <tr key={idx} className={`${zebra} hover:bg-sky-50/40 transition-colors`}>
                          <td className="px-2.5 py-2 font-sans font-bold text-slate-900">{b.navn}</td>
                          <td className="px-2 py-2 text-right text-slate-700">{fmt(b.sumQn, 1)}</td>
                          <td className="px-2 py-2 text-right text-slate-600">{fmt(b.qn1, 1)}</td>
                          <td className="px-2 py-2 text-right text-slate-700">{fmt(b.qS, 3)}</td>
                          <td className="px-2 py-2 text-right text-slate-500">{fmt(b.qkont, 1)}</td>
                          <td className="px-2 py-2 text-right font-bold text-slate-900">{fmt(b.qdim, 3)}</td>
                          <td className="px-2 py-2 text-center font-bold text-sky-900">
                            DN {b.dim}
                          </td>
                          <td className="px-2 py-2 text-right text-slate-600">{fmt(b.di, 1)}</td>
                          {/* Fargekodet vannhastighet (grønt <= 2.0, rødt > 2.0) */}
                          <td className="px-2 py-2 text-center">
                            <span
                              data-status={vOk ? 'ok' : 'avvik'}
                              className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-extrabold ${
                                vOk
                                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                  : 'bg-rose-100 text-rose-900 border border-rose-300 ring-1 ring-rose-500'
                              }`}
                            >
                              {fmt(b.hastighet)} {vOk ? '✓' : '⚠️'}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-right text-slate-700">{fmt(b.R, 3)}</td>
                          <td className="px-2 py-2 text-right text-slate-800">{fmt(b.l, 1)}</td>
                          <td className="px-2.5 py-2 text-right font-black text-slate-950">
                            {fmt(b.rxl)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {/* Uthevet bunnlinje for sum lengde og trykkfall */}
                  <tfoot className="border-t-2 border-slate-400 bg-slate-100/90 font-mono text-xs font-black text-slate-950">
                    <tr>
                      <td colSpan={8} className="px-2.5 py-2.5 font-sans uppercase tracking-wider text-slate-700">
                        SUM LENGDE & SAMLET TRYKKFALL (Σ R · l)
                      </td>
                      <td className="px-2 py-2.5 text-center font-sans text-[10px] text-slate-600">
                        Maks 2,0 m/s
                      </td>
                      <td className="px-2 py-2.5 text-right font-sans text-[10px] text-slate-500">
                        -
                      </td>
                      <td className="px-2 py-2.5 text-right font-black text-slate-950 text-sm">
                        {fmt(sum.lengde, 1)} m
                      </td>
                      <td className="px-2.5 py-2.5 text-right font-black text-sky-950 text-sm">
                        {fmt(sum.rxl)} kPa
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>

            {/* Seksjon 3: Tydelig Konklusjonsboks (Sluttkontroll) */}
            <section className="mt-6">
              <div
                data-status={ok ? 'ok' : 'avvik'}
                className={`rounded-xl border-2 p-5 shadow-sm ${
                  ok
                    ? 'border-emerald-600 bg-emerald-50/90 text-emerald-950'
                    : 'border-rose-600 bg-rose-50/90 text-rose-950'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white border border-current text-xl shadow-sm">
                      {ok ? '✅' : '🚨'}
                    </span>
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-wider">
                        {ok
                          ? 'GODKJENT TRYKKBUDSJETT (SINTEF Byggforsk 553.102)'
                          : 'UNDERDIMENSJONERT TRYKKBUDSJETT – AVVIK OPPSTÅTT'}
                      </h4>
                      <p className="text-xs font-semibold opacity-90">
                        Kontroll: Σ R·l = <strong>{fmt(sum.rxl)} kPa</strong> mot disponibelt{' '}
                        <strong>{fmt(bud.dispFriksjon)} kPa</strong> →{' '}
                        <span className="underline font-black">{ok ? 'OK' : 'IKKE OK'}</span>{' '}
                        (margin: {margin >= 0 ? '+' : ''}
                        <strong>{fmt(margin)} kPa</strong> · {utnyttelseProsent} % utnyttelse)
                      </p>
                    </div>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider ${
                      ok
                        ? 'bg-emerald-600 text-white'
                        : 'bg-rose-600 text-white animate-pulse'
                    }`}
                  >
                    {ok ? 'RIV Godkjent' : 'Tiltak påkrevd'}
                  </span>
                </div>

                <div className="mt-3 border-t border-current/20 pt-2.5 text-xs leading-relaxed">
                  {ok ? (
                    <p>
                      Det beregnede fordelingsnettet tilfredsstiller kravene til maksimalt trykktap og
                      vannhastigheter (v ≤ 2,0 m/s) i henhold til SINTEF Byggforsk 553.102 og TEK17 § 15-5.
                      Nødvendig resttrykk opprettholdes ved ugunstigste tappested med en trykkmargin på{' '}
                      <strong>{fmt(margin)} kPa</strong>. Røranlegget er klart for produksjon og anbudsunderlag.
                    </p>
                  ) : (
                    <p>
                      Det samlede friksjonstapet overstiger det tilgjengelige trykket med{' '}
                      <strong>{fmt(Math.abs(margin))} kPa</strong>. Anlegget vil få utilstrekkelig vanntrykk ved
                      samtidig tapping. Tiltak: Øk rørdimensjonene på de mest belastede hovedstrekkene, eller
                      prosjekter trykkøkningsstasjon (f.eks. Grundfos Hydro MPC / CMBE booster).
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* Seksjon 4: RIV-Godkjenning og Signaturstempel */}
            <footer className="mt-8 border-t border-slate-300 pt-5 text-xs text-slate-700">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <span className="block text-[10px] font-bold text-slate-500 uppercase">
                    Beregnet & Prosjektert Av
                  </span>
                  <div className="mt-1 font-black text-slate-950">Kim Jørgensen</div>
                  <div className="text-[11px] text-slate-600">
                    Rørleggermester & Rådgivende Ingeniør VVS (RIV)
                  </div>
                  <div className="mt-2 text-[10px] text-slate-400 font-mono">
                    Verifisert iht. VVS KEM PRO Fagmotor
                  </div>
                </div>

                <div>
                  <span className="block text-[10px] font-bold text-slate-500 uppercase">
                    Kvalitetssikring & Standarder
                  </span>
                  <div className="mt-1 text-[11px] font-semibold text-slate-800">
                    • SINTEF Byggforsk Kunnskapssystem 553.102
                  </div>
                  <div className="text-[11px] font-semibold text-slate-800">
                    • Byggteknisk forskrift TEK17 § 15-5
                  </div>
                  <div className="text-[11px] font-semibold text-slate-800">
                    • NS-EN 806 Spesifikasjon for drikkevannsinstallasjoner
                  </div>
                </div>

                <div className="rounded-lg border border-slate-300 bg-slate-50/70 p-3 text-center sm:col-span-2 lg:col-span-1">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Offisielt Kontrollstempel
                  </div>
                  <div className="mt-1 text-xs font-black text-slate-900">
                    {ok ? '✅ GODKJENT FOR UTGIVELSE' : '⚠️ REVISJON PÅKREVD'}
                  </div>
                  <div className="mt-0.5 text-[10px] text-slate-600">
                    Stavanger · {datoStreng}
                  </div>
                  <div className="mt-1.5 border-t border-dashed border-slate-300 pt-1 text-[9px] font-mono text-slate-400">
                    Ref: VVS-KEM-PRO-553-102
                  </div>
                </div>
              </div>
            </footer>
          </article>
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalInnhold, document.body);
  }
  return modalInnhold;
}
