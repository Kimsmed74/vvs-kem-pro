import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { ProsjektData } from '../../../data/prosjekter';
import { fmt, kopierTilUtklippstavle, lastNedTekst } from '../../../lib/format';
import type { VentilasjonInnreguleringResultat } from '../../../engine/innregulering';

export interface VentilasjonRapportModalProps {
  aapen: boolean;
  onLukk: () => void;
  prosjekt: ProsjektData;
  resultat: VentilasjonInnreguleringResultat;
  vifteEffektKw: number;
  melding: (t: string) => void;
}

export default function VentilasjonRapportModal({
  aapen,
  onLukk,
  prosjekt,
  resultat,
  vifteEffektKw,
  melding,
}: VentilasjonRapportModalProps) {
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

  const markdownTekst = useMemo(() => {
    const L: string[] = [];
    L.push(`# LUFTTEKNISK INNREGULERINGSPROTOKOLL`);
    L.push(`**Standard:** NS-EN 12599 · TEK17 kap. 13 · NS-EN 13779 / NS-EN 16798`);
    L.push(`**Prosjekt:** ${prosjekt.navn} | **Dato:** ${datoStreng}`);
    L.push(`**Utførende:** Kim Jørgensen | Rørleggermester & Rådgivende Ingeniør VVS (RIV)`);
    L.push(`**Adresse:** ${prosjekt.sted || 'Ikke oppgitt'} | **Matrikkel:** ${prosjekt.matrikkel || 'Ikke oppgitt'}`);
    L.push('');
    L.push('## 1. Oppsummering og Byggbalanse');
    L.push(`- Total prosjektert tilluft: ${fmt(resultat.sumTilluftProsjM3h, 0)} m³/h (${fmt(resultat.sumTilluftProsjLs, 0)} l/s)`);
    L.push(`- Total målt tilluft: ${fmt(resultat.sumTilluftMaaltM3h, 0)} m³/h (${fmt(resultat.sumTilluftMaaltLs, 0)} l/s)`);
    L.push(`- Total prosjektert avtrekk: ${fmt(resultat.sumAvtrekkProsjM3h, 0)} m³/h (${fmt(resultat.sumAvtrekkProsjLs, 0)} l/s)`);
    L.push(`- Total målt avtrekk: ${fmt(resultat.sumAvtrekkMaaltM3h, 0)} m³/h (${fmt(resultat.sumAvtrekkMaaltLs, 0)} l/s)`);
    L.push(`- Trykkbalanse i bygget (Tilluft − Avtrekk): ${resultat.balanseM3h >= 0 ? '+' : ''}${fmt(resultat.balanseM3h, 0)} m³/h (${fmt(resultat.balanseProsent, 1)} %)`);
    L.push(`- Vurdering av trykkbalanse: ${resultat.balanseVurdering.tittel} – ${resultat.balanseVurdering.beskrivelse}`);
    L.push(`- Installert vifteeffekt P_el: ${fmt(vifteEffektKw, 2)} kW`);
    L.push(`- Spesifikk vifteeffekt SFP: ${fmt(resultat.beregnetSfp, 2)} kW/(m³/s) (TEK17-ramme: ≤ 1,5 kW/(m³/s) -> ${resultat.sfpOkTek17 ? 'OK' : 'AVVIK'})`);
    L.push('');
    L.push('## 2. Innreguleringstabell per Ventil (Tilluft & Avtrekk)');
    L.push('| Rom / Sone | Ventilmodell | Type | Dimensjon | k-faktor | q_prosj (m³/h) | q_prosj (l/s) | Måletrykk beregnet (Pa) | Måletrykk målt (Pa) | q_målt (m³/h) | Avvik (%) | Status |');
    L.push('|:---|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---|');
    for (const v of resultat.ventiler) {
      const statusLabel = v.status === 'godkjent' ? '✓ OK (≤±10%)' : v.status === 'akseptabel' ? 'Akseptabel (≤±15%)' : '🚨 Avvik';
      const ventilNavn = v.valgtVentilNavn ?? `${v.dimensjon} (k=${v.kFaktor})`;
      L.push(
        `| ${v.rom} | ${ventilNavn} | ${v.type === 'tilluft' ? 'Tilluft' : 'Avtrekk'} | ${v.dimensjon} | ${fmt(v.kFaktor, 1)} | ${fmt(v.qProsjM3h, 0)} | ${fmt(v.qProsjLs, 1)} | ${fmt(v.beregnetTrykkPa, 1)} | ${fmt(v.maaltTrykkPa, 1)} | ${fmt(v.maaltLuftmengdeM3h, 0)} | ${v.avvikProsent >= 0 ? '+' : ''}${fmt(v.avvikProsent, 1)} | ${statusLabel} |`
      );
    }
    L.push('');
    L.push('## 3. FDV-Konklusjon & Godkjenning');
    L.push(resultat.alleVentilerOk ? '✅ Samtlige ventiler er innregulert innenfor toleransekravet iht. NS-EN 12599.' : '🚨 Enkeltventiler avviker med mer enn ±15 % og krever ytterligere justering av spjeld/ventilåpning.');
    return L.join('\n');
  }, [prosjekt, resultat, datoStreng, vifteEffektKw]);

  if (!aapen) return null;

  const modalInnhold = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ventilasjon-rapport-tittel"
      className="vvs-rapport-modal fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/85 p-2 sm:p-4 backdrop-blur-sm print:static print:inset-auto print:block print:overflow-visible print:bg-white print:p-0 print:m-0 print:w-full print:shadow-none print:border-none"
    >
      <div className="vvs-rapport-ramme relative w-full max-w-5xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl my-2 sm:my-6 flex flex-col max-h-[94vh] print:static print:my-0 print:max-w-none print:border-none print:bg-white print:shadow-none print:w-full print:max-h-none print:block">
        {/* Modal Topplinje (skjules under utskrift) */}
        <div
          data-print-meny="true"
          className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/80 px-4 py-3 sm:px-6 sm:py-4 bg-slate-950/60 rounded-t-2xl print:hidden"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-600/20 border border-cyan-500/40 text-lg">
              💨
            </span>
            <div>
              <h3 id="ventilasjon-rapport-tittel" className="text-sm font-bold text-slate-100">
                Utskriftsklar Luftteknisk Innreguleringsprotokoll (FDV)
              </h3>
              <p className="text-[11px] text-slate-400">
                NS-EN 12599 · Trykkbalanse, SFP-faktor & ventilprotokoll
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-500 transition"
              title="Skriv ut eller lagre som PDF"
            >
              🖨️ Skriv ut / Lagre PDF
            </button>
            <button
              type="button"
              onClick={async () => {
                const ok = await kopierTilUtklippstavle(markdownTekst);
                melding(ok ? '📋 Protokoll kopiert til utklippstavlen' : 'Kunne ikke kopiere');
              }}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
            >
              📋 Kopier
            </button>
            <button
              type="button"
              onClick={() => {
                const filnavn = `${prosjekt.navn.toLowerCase().replace(/[^a-z0-9æøå]+/gi, '-')}-ventilasjon-protokoll.md`;
                lastNedTekst(filnavn, markdownTekst);
                melding('📥 Markdown lastet ned for NotebookLM / KI!');
              }}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
            >
              📥 Last ned .md
            </button>
            <button
              type="button"
              onClick={onLukk}
              aria-label="Lukk protokoll"
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Innhold – formatert som et A4-ark */}
        <div className="overflow-y-auto p-3 sm:p-6 space-y-6 bg-slate-900 text-slate-100 print:bg-white print:text-slate-900 print:p-0 print:m-0 print:space-y-4 print:overflow-visible print:w-full">
          <div
            id="ventilasjon-a4-rapport-utskrift"
            className="vvs-rapport-ark border border-slate-700/80 bg-white text-slate-900 p-4 sm:p-8 rounded-xl shadow-lg print:border-none print:shadow-none print:p-0 print:m-0 max-w-4xl mx-auto print:max-w-none print:w-full"
          >
            {/* Brevhode */}
            <div className="border-b-2 border-cyan-700 pb-4 flex flex-wrap justify-between items-start gap-4">
              <div>
                <div className="text-[11px] font-black tracking-widest text-cyan-800 uppercase">
                  RÅDGIVENDE INGENIØR VVS & INNREGULERING
                </div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
                  LUFTTEKNISK INNREGULERINGSPROTOKOLL
                </h1>
                <p className="text-xs text-slate-600 mt-1">
                  NS-EN 12599 · K-faktormåling, tilluft/avtrekk, SFP-faktor & trykkbalanse
                </p>
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
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Sted</span>
                <span className="text-slate-800">{prosjekt.sted || 'Ikke oppgitt'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Matrikkel</span>
                <span className="text-slate-800">{prosjekt.matrikkel || 'Ikke oppgitt'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Oppvarmet BRA</span>
                <strong className="text-slate-900">{prosjekt.bra ? `${prosjekt.bra} m²` : 'Ikke oppgitt'}</strong>
              </div>
            </div>

            {/* Nøkkeltall for ventilasjonsanlegget */}
            <div className="mt-5">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1 mb-3">
                1. Systemoppsummering & Byggbalanse
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-cyan-50 border border-cyan-200 rounded-lg">
                  <div className="text-[10px] font-bold uppercase text-cyan-800">Sum Tilluft (Målt)</div>
                  <div className="text-lg font-black text-cyan-950 mt-0.5">
                    {fmt(resultat.sumTilluftMaaltM3h, 0)} m³/h
                  </div>
                  <div className="text-[10px] text-cyan-700 mt-0.5">
                    {fmt(resultat.sumTilluftMaaltLs, 0)} l/s (Prosj: {fmt(resultat.sumTilluftProsjM3h, 0)})
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-[10px] font-bold uppercase text-slate-600">Sum Avtrekk (Målt)</div>
                  <div className="text-lg font-black text-slate-900 mt-0.5">
                    {fmt(resultat.sumAvtrekkMaaltM3h, 0)} m³/h
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {fmt(resultat.sumAvtrekkMaaltLs, 0)} l/s (Prosj: {fmt(resultat.sumAvtrekkProsjM3h, 0)})
                  </div>
                </div>

                <div
                  className={`p-3 rounded-lg border ${
                    resultat.balanseVurdering.tone === 'ok'
                      ? 'bg-emerald-50 border-emerald-200'
                      : resultat.balanseVurdering.tone === 'feil'
                      ? 'bg-rose-50 border-rose-200'
                      : 'bg-amber-50 border-amber-200'
                  }`}
                >
                  <div className="text-[10px] font-bold uppercase text-slate-700">Trykkbalanse</div>
                  <div className="text-sm font-black text-slate-900 mt-0.5">
                    {resultat.balanseM3h >= 0 ? '+' : ''}
                    {fmt(resultat.balanseM3h, 0)} m³/h ({fmt(resultat.balanseProsent, 1)} %)
                  </div>
                  <div className="text-[10px] font-bold mt-0.5 text-slate-600">
                    {resultat.balanseVurdering.tittel}
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <div className="text-[10px] font-bold uppercase text-emerald-800">SFP-Faktor (TEK17)</div>
                  <div className="text-lg font-black text-emerald-950 mt-0.5">
                    {fmt(resultat.beregnetSfp, 2)} kW/(m³/s)
                  </div>
                  <div className="text-[10px] font-bold text-emerald-700 mt-0.5">
                    {resultat.sfpOkTek17
                      ? `✓ Krav ≤ 1,5 oppfylt (P_el: ${fmt(vifteEffektKw, 1)} kW)`
                      : `🚨 Krav > 1,5 overskredet (P_el: ${fmt(vifteEffektKw, 1)} kW)`}
                  </div>
                </div>
              </div>
            </div>

            {/* Innreguleringstabell */}
            <div className="mt-6">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1 mb-3">
                2. Protokoll for Ventiler & Rom
              </h2>
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                      <th className="p-2">Rom / Sone</th>
                      <th className="p-2 text-center">Type</th>
                      <th className="p-2 text-center">Dim</th>
                      <th className="p-2 text-right">k-faktor</th>
                      <th className="p-2 text-right">q_prosj</th>
                      <th className="p-2 text-right">Måletrykk beregnet</th>
                      <th className="p-2 text-right">Måletrykk målt</th>
                      <th className="p-2 text-right">q_målt</th>
                      <th className="p-2 text-right">Avvik</th>
                      <th className="p-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono">
                    {resultat.ventiler.map((v, idx) => {
                      const zebra = idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white';
                      return (
                        <tr key={v.id} className={zebra}>
                          <td className="p-2 font-sans font-bold text-slate-900">
                            <div>{v.rom}</div>
                            {v.valgtVentilNavn && (
                              <div className="text-[10px] font-normal text-slate-500">{v.valgtVentilNavn}</div>
                            )}
                          </td>
                          <td className="p-2 text-center font-sans">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                v.type === 'tilluft' ? 'bg-cyan-100 text-cyan-800' : 'bg-slate-200 text-slate-800'
                              }`}
                            >
                              {v.type === 'tilluft' ? 'Tilluft' : 'Avtrekk'}
                            </span>
                          </td>
                          <td className="p-2 text-center">{v.dimensjon}</td>
                          <td className="p-2 text-right">{fmt(v.kFaktor, 1)}</td>
                          <td className="p-2 text-right font-bold text-slate-800">
                            {fmt(v.qProsjM3h, 0)} m³/h ({fmt(v.qProsjLs, 0)} l/s)
                          </td>
                          <td className="p-2 text-right text-slate-500">{fmt(v.beregnetTrykkPa, 1)} Pa</td>
                          <td className="p-2 text-right font-bold text-slate-900">{fmt(v.maaltTrykkPa, 1)} Pa</td>
                          <td className="p-2 text-right font-bold text-slate-900">
                            {fmt(v.maaltLuftmengdeM3h, 0)} m³/h
                          </td>
                          <td
                            data-status={v.status === 'godkjent' ? 'ok' : v.status === 'akseptabel' ? 'advarsel' : 'avvik'}
                            className={`p-2 text-right font-bold ${
                              v.status === 'godkjent'
                                ? 'text-emerald-700'
                                : v.status === 'akseptabel'
                                ? 'text-amber-700'
                                : 'text-rose-700'
                            }`}
                          >
                            {v.avvikProsent >= 0 ? '+' : ''}
                            {fmt(v.avvikProsent, 1)} %
                          </td>
                          <td className="p-2 text-center font-sans">
                            {v.status === 'godkjent' ? (
                              <span
                                data-status="ok"
                                className="text-emerald-700 font-bold text-[10px]"
                              >
                                ✓ OK
                              </span>
                            ) : v.status === 'akseptabel' ? (
                              <span
                                data-status="advarsel"
                                className="text-amber-700 font-bold text-[10px]"
                              >
                                ~ Aksept
                              </span>
                            ) : (
                              <span
                                data-status="avvik"
                                className="text-rose-700 font-bold text-[10px]"
                              >
                                🚨 Justér
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                      <td colSpan={4} className="p-2 font-sans uppercase text-[10px] text-slate-600">
                        SAMLET LUFTMENGDE
                      </td>
                      <td className="p-2 text-right font-mono text-slate-700">
                        {fmt(resultat.sumTilluftProsjM3h + resultat.sumAvtrekkProsjM3h, 0)} m³/h
                      </td>
                      <td colSpan={2} />
                      <td className="p-2 text-right font-mono text-slate-900">
                        {fmt(resultat.sumTilluftMaaltM3h + resultat.sumAvtrekkMaaltM3h, 0)} m³/h
                      </td>
                      <td colSpan={2} className="p-2 text-center font-sans text-[10px]">
                        {resultat.alleVentilerOk ? '✓ ALLE GODKJENT' : 'AVVIK REGISTRERT'}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Inneklima & Konklusjon */}
            <div
              data-status={resultat.alleVentilerOk && resultat.sfpOkTek17 ? 'ok' : 'avvik'}
              className={`mt-6 p-4 rounded-lg border ${
                resultat.alleVentilerOk && resultat.sfpOkTek17
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                  : 'bg-rose-50 border-rose-300 text-rose-950'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">{resultat.alleVentilerOk && resultat.sfpOkTek17 ? '✅' : '🚨'}</span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  3. Faglig Konklusjon & Trykkforhold
                </h3>
              </div>
              <p className="mt-1 text-xs text-slate-700 leading-relaxed">
                Innreguleringen er utført i henhold til NS-EN 12599. Anlegget har et beregnet energitall SFP på{' '}
                <strong>{fmt(resultat.beregnetSfp, 2)} kW/(m³/s)</strong> ved målt luftmengde, noe som{' '}
                {resultat.sfpOkTek17
                  ? 'tilfredsstiller energikravet i TEK17 (§ 14-2, ≤ 1,5 kW/(m³/s))'
                  : 'overskrider energikravet i TEK17 (§ 14-2, ≤ 1,5 kW/(m³/s)) og krever gjennomgang av vifteeffekt/kanalføring'}
                . Trykkforholdene i bygget er kontrollert og sikrer{' '}
                {resultat.balanseVurdering.beskrivelse.toLowerCase()}
              </p>
            </div>

            {/* Signaturblokk */}
            <div className="mt-8 pt-4 border-t border-slate-200 grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8 text-xs text-slate-700">
              <div>
                <div className="font-bold text-slate-900">Utførende Innreguleringstekniker:</div>
                <div className="h-10 border-b border-dashed border-slate-300 mt-2" />
                <div className="text-[10px] text-slate-500 mt-1">Dato / Signatur / Måleapparat (DP-Calc)</div>
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
