import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { ProsjektData } from '../../../data/prosjekter';
import { fmt, kopierTilUtklippstavle, lastNedTekst } from '../../../lib/format';
import type { Flate } from '../../../engine/va';

export interface KoterRapportModalProps {
  aapen: boolean;
  onLukk: () => void;
  prosjekt: ProsjektData;
  ibr: number;
  itr: number;
  lengde: number;
  fallNevner: number;
  krav: number;
  hoydeIGroft: number;
  etasjer: Array<{ navn: string; kote: number }>;
  rader: Array<{
    e: { navn: string; kote: number };
    r: {
      margin: number;
      ok?: boolean;
      selvfallOk?: boolean;
      mangel: number;
      minKoteUtgang?: number;
    };
  }>;
  overvannData: {
    aRed: number;
    q: number;
    vol: number;
    intensitet: number;
    maksUt: number;
    varighet: number;
    flater: Flate[];
  };
  melding: (t: string) => void;
}

export default function KoterRapportModal({
  aapen,
  onLukk,
  prosjekt,
  ibr,
  itr,
  lengde,
  fallNevner,
  krav,
  hoydeIGroft,
  rader,
  overvannData,
  melding,
}: KoterRapportModalProps) {
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

  const minKoteUtgang = ibr + hoydeIGroft;
  const harPumpeKrav = rader.some((x) => !(x.r.ok ?? x.r.selvfallOk));

  const markdownTekst = useMemo(() => {
    const L: string[] = [];
    L.push(`# KOTEREGNSKAP & TILBAKESLAGSKONTROLL`);
    L.push(`**Standard:** TEK17 § 15-6 / § 15-8 · NS-EN 12050 · NS 3056`);
    L.push(`**Prosjekt:** ${prosjekt.navn} | **Dato:** ${datoStreng}`);
    L.push(`**Utførende:** Kim Jørgensen | Rørleggermester & Rådgivende Ingeniør VVS (RIV)`);
    L.push(`**Adresse:** ${prosjekt.sted || 'Ikke oppgitt'} | **Matrikkel:** ${prosjekt.matrikkel || 'Ikke oppgitt'}`);
    L.push('');
    L.push('## 1. Forutsetninger for stikkledning & koter');
    L.push(`- Kote IBR i kommunal kum: C +${fmt(ibr, 2)} moh`);
    L.push(`- Kote ITR i kommunal kum: C +${fmt(itr, 2)} moh`);
    L.push(`- Stikkledningens lengde: ${fmt(lengde, 1)} m`);
    L.push(`- Minste fall: 1:${fallNevner} (${(1000 / fallNevner).toFixed(1)} ‰)`);
    L.push(`- Høydetap i grøft (lengde × fall): ${fmt(hoydeIGroft, 3)} m`);
    L.push(`- Minste kote IBR ved utgang grunnmur: C +${fmt(minKoteUtgang, 2)} moh`);
    L.push(`- Krav til overhøyde: ${fmt(krav, 2)} m`);
    L.push('');
    L.push('## 2. Tilbakeslagskontroll (OK FG / laveste sluk mot ITR)');
    L.push('| Etasje / Sluk | Kote (moh) | Kote ITR (moh) | Margin (m) | Krav (m) | Status |');
    L.push('|:---|:---:|:---:|:---:|:---:|:---|');
    for (const { e, r } of rader) {
      const erOk = r.ok ?? r.selvfallOk ?? false;
      const statusTekst = erOk ? 'OK (selvfall)' : `🔴 AVVIK: Krever pumpestasjon (mangler ${fmt(r.mangel, 2)} m)`;
      L.push(`| ${e.navn} | +${fmt(e.kote, 2)} | +${fmt(itr, 2)} | ${r.margin >= 0 ? '+' : ''}${fmt(r.margin, 2)} | ${fmt(krav, 2)} | ${statusTekst} |`);
    }
    L.push('');
    L.push('## 3. Overvann & Fordrøyning');
    L.push(`- Redusert areal A_red: ${fmt(overvannData.aRed, 0)} m²`);
    L.push(`- Dimensjonerende regnintensitet: ${fmt(overvannData.intensitet, 0)} l/(s·ha)`);
    L.push(`- Dimensjonerende overvann q: ${fmt(overvannData.q, 1)} l/s`);
    L.push(`- Maksimalt tillatt påslipp til kommunalt nett: ${fmt(overvannData.maksUt, 1)} l/s`);
    L.push(`- Nødvendig fordrøyningsvolum (${overvannData.varighet} min varighet): ${fmt(overvannData.vol, 1)} m³`);
    L.push('');
    L.push('## 4. Konklusjon & Kvalitetssikring');
    if (harPumpeKrav) {
      L.push(`- 🚨 RØD ALARM: Ett eller flere gulv/sluk ligger under kravet (${fmt(krav, 2)} m over ITR). Krever lukket avløpspumpestasjon (NS-EN 12050) med svanehals over gatenivå for å forhindre oversvømmelse.`);
    } else {
      L.push(`- ✅ GODKJENT: Samtlige gulv har tilstrekkelig margin mot oversvømmelse (≥ ${fmt(krav, 2)} m over kommunal ITR) og kan føres med selvfall.`);
    }
    return L.join('\n');
  }, [prosjekt, ibr, itr, lengde, fallNevner, hoydeIGroft, minKoteUtgang, krav, rader, overvannData, harPumpeKrav, datoStreng]);

  const handleKopierMarkdown = async () => {
    const kopiert = await kopierTilUtklippstavle(markdownTekst);
    melding(
      kopiert
        ? '📋 Koteregnskap & tilbakeslagsrapport kopiert til utklippstavlen'
        : 'Kunne ikke kopiere rapporten'
    );
  };

  const handleLastNedMarkdown = () => {
    const filnavn = `${prosjekt.navn
      .toLowerCase()
      .replace(/[^a-z0-9æøå]+/gi, '-')
      .replace(/^-|-$/g, '')}-koteregnskap-rapport.md`;
    lastNedTekst(filnavn, markdownTekst);
    melding('📥 Koteregnskap lastet ned for NotebookLM / KI!');
  };

  if (!aapen) return null;

  const modalInnhold = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Teknisk rapport for koteregnskap og tilbakeslagskontroll"
      className="vvs-rapport-modal fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/85 p-3 backdrop-blur-sm sm:p-6 print:static print:inset-auto print:block print:overflow-visible print:bg-white print:p-0 print:m-0 print:w-full print:shadow-none print:border-none"
    >
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
          #koter-a4-rapport-utskrift {
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
        {/* Sticky topplinje (skjules ved utskrift) */}
        <div
          data-print-meny="true"
          className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/80 bg-slate-900/95 px-5 py-3.5 backdrop-blur print:hidden"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-950 border border-emerald-600/70 text-lg">
              📐
            </span>
            <div>
              <h2 className="text-sm font-black text-slate-100">
                Visuell Teknisk Rapport (Koteregnskap & Tilbakeslag)
              </h2>
              <p className="text-[11px] text-slate-400">
                TEK17 § 15-6 / § 15-8 · NS-EN 12050 · Utskriftsklar A4-oppstilling
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
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
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-purple-700/80 bg-purple-950/60 px-3 py-1.5 text-xs font-bold text-purple-200 transition hover:bg-purple-900"
            >
              <span>📥 Last ned .md (NotebookLM)</span>
            </button>
            <button
              type="button"
              onClick={onLukk}
              aria-label="Lukk forhåndsvisning"
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-300 transition hover:bg-slate-700 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>

        {/* A4-dokument */}
        <div className="overflow-x-auto p-3 sm:p-8 print:p-0 print:m-0 print:overflow-visible print:w-full">
          <article
            id="koter-a4-rapport-utskrift"
            className="vvs-rapport-ark mx-auto max-w-[210mm] rounded-xl bg-white p-4 sm:p-8 text-slate-900 shadow-xl print:p-0 print:m-0 print:shadow-none print:border-none print:max-w-none print:w-full"
          >
            <div className="mb-6 h-2.5 w-full rounded-full bg-gradient-to-r from-emerald-600 via-sky-600 to-indigo-600 print:h-2" />

            {/* Brevhode */}
            <header className="border-b-2 border-slate-200 pb-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-black tracking-wider text-slate-700 uppercase">
                    <span>🏢 VVS KEM PRO</span>
                    <span className="text-slate-400">|</span>
                    <span>VA- & Sanitærprosjektering</span>
                  </div>
                  <h1 className="mt-2 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
                    KOTEREGNSKAP & TILBAKESLAGSKONTROLL
                  </h1>
                  <p className="text-xs font-bold text-emerald-800">
                    TEK17 § 15-6 (3) / § 15-8 (3) · NS-EN 12050 · NS 3056 · Byggforsk
                  </p>
                </div>

                <div className="text-right text-xs">
                  <div className="font-black text-slate-900">Kim Jørgensen</div>
                  <div className="text-[11px] text-slate-600">
                    Rørleggermester & Rådgivende Ingeniør VVS (RIV)
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    Dato: <strong className="text-slate-800">{datoStreng}</strong>
                  </div>
                </div>
              </div>

              {/* Prosjektopplysninger */}
              <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-xs sm:grid-cols-4">
                <div>
                  <span className="block text-[10px] font-bold text-slate-500 uppercase">Prosjekt</span>
                  <strong className="text-slate-950 truncate block">{prosjekt.navn}</strong>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-500 uppercase">Adresse</span>
                  <span className="text-slate-800 truncate block">{prosjekt.sted || 'Ikke oppgitt'}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-500 uppercase">Matrikkel</span>
                  <span className="text-slate-800 truncate block">{prosjekt.matrikkel || 'Ikke oppgitt'}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-500 uppercase">Bygningstype</span>
                  <span className="text-slate-800 truncate block">{prosjekt.bygningstype || 'Næring'}</span>
                </div>
              </div>
            </header>

            {/* Nøkkeltall-kort: Grøft & Koter */}
            <section className="mt-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  1. Kotedata og Grøftetrasé (Høydesystem NN2000)
                </h3>
                <span className="text-[11px] text-slate-500">
                  Krav til overhøyde: <strong>{fmt(krav, 2)} m</strong>
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-center">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase">Kote IBR kum</span>
                  <span className="mt-1 block text-base font-black text-slate-950">+{fmt(ibr, 2)}</span>
                  <span className="text-[10px] text-slate-500">Innv. bunn rør</span>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-center">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase">Kote ITR kum</span>
                  <span className="mt-1 block text-base font-black text-slate-950">+{fmt(itr, 2)}</span>
                  <span className="text-[10px] text-slate-500">Innv. topp rør</span>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-center">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase">Stikkledning</span>
                  <span className="mt-1 block text-base font-black text-slate-950">{fmt(lengde, 1)} m</span>
                  <span className="text-[10px] text-slate-500">Lengde</span>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-center">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase">Fall</span>
                  <span className="mt-1 block text-base font-black text-slate-950">1:{fallNevner}</span>
                  <span className="text-[10px] text-slate-500">{(1000 / fallNevner).toFixed(1)} ‰</span>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-center">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase">Høydetap grøft</span>
                  <span className="mt-1 block text-base font-black text-slate-950">{fmt(hoydeIGroft, 3)} m</span>
                  <span className="text-[10px] text-slate-500">Lengde × Fall</span>
                </div>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-2.5 text-center">
                  <span className="block text-[10px] font-bold text-emerald-800 uppercase">Kote utgang vegg</span>
                  <span className="mt-1 block text-base font-black text-emerald-950">+{fmt(minKoteUtgang, 2)}</span>
                  <span className="text-[10px] text-emerald-700">Min. bunn grunnmur</span>
                </div>
              </div>
            </section>

            {/* Seksjon 2: Tilbakeslagstabell */}
            <section className="mt-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  2. Kontroll av overhøyde og tilbakeslag per etasje (TEK17 § 15-6 / § 15-8)
                </h3>
                <span className="text-[11px] text-slate-500">
                  Referanse ITR: <strong>C +{fmt(itr, 2)} moh</strong>
                </span>
              </div>

              <div className="mt-3 overflow-x-auto rounded-lg border border-slate-300">
                <table className="w-full text-left text-xs text-slate-800">
                  <thead className="bg-slate-100 text-[11px] font-bold uppercase text-slate-700 border-b border-slate-300">
                    <tr>
                      <th className="px-3 py-2">Etasje / Rom</th>
                      <th className="px-3 py-2 text-right">Kote OK FG (moh)</th>
                      <th className="px-3 py-2 text-right">Kote ITR kum (moh)</th>
                      <th className="px-3 py-2 text-right">Margin mot ITR (m)</th>
                      <th className="px-3 py-2 text-center">Krav</th>
                      <th className="px-3 py-2 text-left">Teknisk Løsning & Tiltak</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                    {rader.map(({ e, r }, idx) => {
                      const zebra = idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white';
                      const erOk = r.ok ?? r.selvfallOk ?? false;
                      return (
                        <tr key={idx} className={zebra}>
                          <td className="px-3 py-2 font-sans font-bold text-slate-900">{e.navn}</td>
                          <td className="px-3 py-2 text-right">+{fmt(e.kote, 2)}</td>
                          <td className="px-3 py-2 text-right">+{fmt(itr, 2)}</td>
                          <td className="px-3 py-2 text-right font-black">
                            <span className={erOk ? 'text-emerald-700' : 'text-rose-700'}>
                              {r.margin >= 0 ? '+' : ''}{fmt(r.margin, 2)} m
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center font-sans">{fmt(krav, 2)} m</td>
                          <td className="px-3 py-2 font-sans font-bold">
                            {erOk ? (
                              <span
                                data-status="ok"
                                className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300"
                              >
                                ✓ Godkjent for selvfall
                              </span>
                            ) : (
                              <span
                                data-status="alarm"
                                className="inline-flex items-center gap-1 text-rose-900 bg-rose-50 px-2 py-0.5 rounded border border-rose-300"
                              >
                                🚨 Krever avløpspumpestasjon (NS-EN 12050)
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Seksjon 3: Overvann & Fordrøyning */}
            <section className="mt-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  3. Overvannsberegning & Fordrøyningsmagasin (LOD)
                </h3>
                <span className="text-[11px] text-slate-500">
                  Rasjonell formel: Q = A_red · i · ψ
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded border border-slate-200 bg-slate-50 p-2.5">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase">Redusert areal A_red</span>
                  <span className="text-sm font-black text-slate-900">{fmt(overvannData.aRed, 0)} m²</span>
                </div>
                <div className="rounded border border-slate-200 bg-slate-50 p-2.5">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase">Dimensjonerende tilsig</span>
                  <span className="text-sm font-black text-slate-900">{fmt(overvannData.q, 1)} l/s</span>
                </div>
                <div className="rounded border border-slate-200 bg-slate-50 p-2.5">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase">Maks tillatt påslipp</span>
                  <span className="text-sm font-black text-slate-900">{fmt(overvannData.maksUt, 1)} l/s</span>
                </div>
                <div className="rounded border border-sky-200 bg-sky-50 p-2.5">
                  <span className="block text-[10px] font-bold text-sky-800 uppercase">Nødvendig magasinvolum</span>
                  <span className="text-sm font-black text-sky-950">{fmt(overvannData.vol, 1)} m³</span>
                </div>
              </div>
            </section>

            {/* Seksjon 4: Konklusjonsboks */}
            <section className="mt-6">
              <div
                data-status={harPumpeKrav ? 'alarm' : 'ok'}
                className={`rounded-xl border p-4 ${
                  harPumpeKrav
                    ? 'border-rose-400 bg-rose-50 text-rose-950'
                    : 'border-emerald-400 bg-emerald-50 text-emerald-950'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{harPumpeKrav ? '🚨' : '✅'}</span>
                  <div>
                    <h4 className="text-sm font-black uppercase tracking-wide">
                      {harPumpeKrav
                        ? 'Avvik avdekket: Avløpspumpestasjon er lovpålagt (TEK17 / NS-EN 12050)'
                        : 'Koteregnskap godkjent: Fullt selvfall oppfyller TEK17'}
                    </h4>
                    <p className="mt-1 text-xs">
                      {harPumpeKrav
                        ? `Ett eller flere innvendige sluk/gulv ligger under sikkerhetskravet (${fmt(krav, 2)} m over kommunal ITR). Avløpet fra disse etasjene må føres til lukket avløpspumpestasjon med trykkrør i svanehals over gatelokk før tilkobling til selvfall.`
                        : `Samtlige etasjer har dokumentert overhøyde ≥ ${fmt(krav, 2)} m over innvendig topp rør (ITR) i kommunal kum. Prosjektet er sikret mot tilbakeslag og kan utføres med selvfall.`}
                    </p>
                  </div>
                </div>
              </div>
            </section>
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
