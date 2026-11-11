import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { ProsjektData } from '../../../data/prosjekter';
import { fmt, kopierTilUtklippstavle, lastNedTekst } from '../../../lib/format';
import type { HydroniskInnreguleringResultat } from '../../../engine/innregulering';

export interface HydroniskRapportModalProps {
  aapen: boolean;
  onLukk: () => void;
  prosjekt: ProsjektData;
  resultat: HydroniskInnreguleringResultat;
  melding: (t: string) => void;
}

export default function HydroniskRapportModal({
  aapen,
  onLukk,
  prosjekt,
  resultat,
  melding,
}: HydroniskRapportModalProps) {
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
    L.push(`# HYDRONISK INNREGULERINGSPROTOKOLL & VENTILDIMENSJONERING`);
    L.push(`**Standard:** NS-EN 14336 · VDI 2035 · TEK17 § 14-4 · IMI / Danfoss PICV-standard`);
    L.push(`**Prosjekt:** ${prosjekt.navn} | **Dato:** ${datoStreng}`);
    L.push(`**Utførende:** Kim Jørgensen | Rørleggermester & Rådgivende Ingeniør VVS (RIV)`);
    L.push(`**Adresse:** ${prosjekt.sted || 'Ikke oppgitt'} | **Matrikkel:** ${prosjekt.matrikkel || 'Ikke oppgitt'}`);
    L.push('');
    L.push('## 1. Forutsetninger & Dimensjonerende Nøkkeltall');
    L.push(`- Samlet termisk effekt: ${fmt(resultat.totalEffektKw, 1)} kW`);
    L.push(`- Total prosjektert vannmengde: ${fmt(resultat.totalVannmengdeLh, 0)} l/h (${fmt(resultat.totalVannmengdeM3h, 2)} m³/h)`);
    L.push(`- Total målt vannmengde: ${fmt(resultat.totalMaaltVannmengdeLh, 0)} l/h`);
    L.push(`- Samlet avvik: ${resultat.totaltAvvikProsent >= 0 ? '+' : ''}${fmt(resultat.totaltAvvikProsent, 1)} %`);
    L.push(`- Indekskurs (Ugunstigste kurs): ${resultat.indekskurs ? resultat.indekskurs.navn : 'Ingen'} (Kretsmotstand: ${fmt(resultat.indekskurs?.dpKretsKpa ?? 0, 1)} kPa)`);
    L.push(`- Pumpens nødvendige settpunkt H_pumpe: ${fmt(resultat.pumpeSettpunktKpa, 1)} kPa (${fmt(resultat.pumpeSettpunktMvs, 2)} mVS)`);
    L.push('');
    L.push('## 2. Innreguleringstabell for Strengreguleringsventiler & PICV');
    L.push('| Kurs / Streng | Ventil & Forinnstilling | Type | Effekt (kW) | ΔT (K) | q_prosj (l/h) | Δp_krets (kPa) | Δp_ventil (kPa) | kv (m³/h) | Autoritet β | q_målt (l/h) | Avvik (%) | Status |');
    L.push('|:---|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---|');
    for (const s of resultat.strenger) {
      const indeksMerk = s.erIndekskurs ? ' ★ (Indeks)' : '';
      const autLabel = s.autoritetStatus === 'ideell' ? 'Ideell (≥0.50)' : s.autoritetStatus === 'godkjent' ? 'Godkjent (≥0.30)' : '⚠️ Lav (<0.30)';
      const innregLabel = s.innreguleringStatus === 'godkjent' ? 'OK (±10%)' : '🚨 Avvik';
      const ventilBeskr = s.valgtVentilNavn ? `${s.valgtVentilNavn} (${s.forinnstillingTekst})` : (s.valgtKvs > 0 ? `STAD kvs ${s.valgtKvs} (${s.forinnstillingTekst})` : 'PICV');
      L.push(
        `| ${s.navn}${indeksMerk} | ${ventilBeskr} | ${s.type === 'glykol' ? 'Glykol' : s.type === 'varme' ? 'Varme' : 'Kjøling'} | ${fmt(s.effektKw, 1)} | ${fmt(s.deltaTK, 1)} | ${fmt(s.qProsjLh, 0)} | ${fmt(s.dpKretsKpa, 1)} | ${fmt(s.dpVentilKpa, 1)} | ${fmt(s.kvBeregnet, 2)} | ${s.ventilType === 'PICV' ? 'PICV' : fmt(s.ventilAutoritetBeta, 2)} (${autLabel}) | ${fmt(s.maaltVannmengdeLh, 0)} | ${s.avvikProsent >= 0 ? '+' : ''}${fmt(s.avvikProsent, 1)} | ${innregLabel} |`
      );
    }
    L.push('');
    L.push('## 3. Konklusjon & FDV-Godkjenning');
    L.push(resultat.alleAvvikOk ? '✅ Samtlige kurser er innregulert innenfor kravet til ±10 % avvik.' : '🚨 Noen kurser avviker mer enn ±10 % og krever ytterligere struping/etterjustering.');
    L.push(resultat.alleAutoriteterOk ? '✅ Ventilautoritet β ≥ 0,30 er ivaretatt på alle reguleringsventiler.' : '⚠️ Noen ventiler har autoritet β < 0,30, noe som gir fare for reguleringspendling og støy.');
    return L.join('\n');
  }, [prosjekt, resultat, datoStreng]);

  if (!aapen) return null;

  const modalInnhold = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rapport-tittel"
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
              🔥
            </span>
            <div>
              <h3 id="rapport-tittel" className="text-sm font-bold text-slate-100">
                Utskriftsklar Innreguleringsprotokoll (Varme & Kjøling)
              </h3>
              <p className="text-[11px] text-slate-400">
                NS-EN 14336 · FDV-godkjent dokumentasjon for overlevering til byggherre
              </p>
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
                melding(ok ? '📋 Protokoll kopiert til utklippstavlen' : 'Kunne ikke kopiere');
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
            >
              📋 Kopier
            </button>
            <button
              type="button"
              onClick={() => {
                const filnavn = `${prosjekt.navn.toLowerCase().replace(/[^a-z0-9æøå]+/gi, '-')}-hydronisk-innregulering.md`;
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

        {/* Rapportinnhold – formatert som et A4-dokument */}
        <div className="overflow-y-auto p-6 space-y-6 bg-slate-900 text-slate-100 print:bg-white print:text-slate-900 print:p-0 print:m-0 print:space-y-4 print:overflow-visible print:w-full">
          <div
            id="hydronisk-a4-rapport-utskrift"
            className="vvs-rapport-ark border border-slate-700/80 bg-white text-slate-900 p-8 rounded-xl shadow-lg print:border-none print:shadow-none print:p-0 print:m-0 max-w-4xl mx-auto print:max-w-none print:w-full"
          >
            {/* Brevhode */}
            <div className="border-b-2 border-emerald-700 pb-4 flex flex-wrap justify-between items-start gap-4">
              <div>
                <div className="text-[11px] font-black tracking-widest text-emerald-800 uppercase">
                  RÅDGIVENDE INGENIØR VVS & PROSJEKTERENDE
                </div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
                  HYDRONISK INNREGULERINGSPROTOKOLL
                </h1>
                <p className="text-xs text-slate-600 mt-1">
                  Strengreguleringsventiler, trykkuavhengige kontrollventiler (PICV) & ventilautoritet
                </p>
              </div>

              <div className="text-right text-xs">
                <div className="font-bold text-slate-900">Kim Jørgensen</div>
                <div className="text-slate-600">Rørleggermester & RIV</div>
                <div className="text-[11px] text-slate-500 mt-1">Dato: {datoStreng}</div>
              </div>
            </div>

            {/* Prosjektdetaljer */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Prosjekt</span>
                <strong className="text-slate-900">{prosjekt.navn}</strong>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Adresse / Sted</span>
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

            {/* Nøkkeltall for anlegget */}
            <div className="mt-5">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1 mb-3">
                1. Forutsetninger & Dimensjonerende Nøkkeltall
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <div className="text-[10px] font-bold uppercase text-emerald-800">Total Termisk Effekt</div>
                  <div className="text-lg font-black text-emerald-950 mt-0.5">{fmt(resultat.totalEffektKw, 1)} kW</div>
                  <div className="text-[10px] text-emerald-700 mt-0.5">Varme & Kjøling</div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-[10px] font-bold uppercase text-slate-600">Prosjektert Mengde</div>
                  <div className="text-lg font-black text-slate-900 mt-0.5">{fmt(resultat.totalVannmengdeLh, 0)} l/h</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{fmt(resultat.totalVannmengdeM3h, 2)} m³/h</div>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="text-[10px] font-bold uppercase text-amber-800">Indekskurs (Ugunstigst)</div>
                  <div className="text-sm font-black text-amber-950 truncate mt-0.5">
                    {resultat.indekskurs ? resultat.indekskurs.navn : '–'}
                  </div>
                  <div className="text-[10px] text-amber-700 mt-0.5">
                    Δp: {fmt(resultat.indekskurs?.dpKretsKpa ?? 0, 1)} kPa
                  </div>
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-[10px] font-bold uppercase text-blue-800">Pumpens Settpunkt H_pumpe</div>
                  <div className="text-lg font-black text-blue-950 mt-0.5">{fmt(resultat.pumpeSettpunktKpa, 1)} kPa</div>
                  <div className="text-[10px] font-bold text-blue-700 mt-0.5">{fmt(resultat.pumpeSettpunktMvs, 2)} mVS</div>
                </div>
              </div>
            </div>

            {/* Innreguleringstabell */}
            <div className="mt-6">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1 mb-3">
                2. Måleresultater og Ventildimensjonering
              </h2>
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                      <th className="p-2">Kurs / Streng</th>
                      <th className="p-2 text-right">Effekt</th>
                      <th className="p-2 text-center">ΔT</th>
                      <th className="p-2 text-right">q_prosj</th>
                      <th className="p-2 text-right">Δp_krets</th>
                      <th className="p-2 text-right">Δp_ventil</th>
                      <th className="p-2 text-right">kv</th>
                      <th className="p-2 text-center">kvs</th>
                      <th className="p-2 text-center">Autoritet β</th>
                      <th className="p-2 text-right">q_målt</th>
                      <th className="p-2 text-right">Avvik</th>
                      <th className="p-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono">
                    {resultat.strenger.map((s, idx) => {
                      const zebra = idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white';
                      return (
                        <tr key={s.id} className={zebra}>
                          <td className="p-2 font-sans font-bold text-slate-900">
                            <div>
                              {s.navn}
                              {s.erIndekskurs && (
                                <span className="ml-1.5 inline-block rounded bg-amber-100 text-amber-800 text-[9px] px-1 font-bold">
                                  INDEKS
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] font-normal text-slate-500">
                              {s.valgtVentilNavn ?? (s.valgtKvs > 0 ? `STAD kvs ${s.valgtKvs}` : 'PICV')} · Forinnstilling: <strong>{s.forinnstillingTekst}</strong>
                            </div>
                          </td>
                          <td className="p-2 text-right">{fmt(s.effektKw, 1)} kW</td>
                          <td className="p-2 text-center">{fmt(s.deltaTK, 0)} K</td>
                          <td className="p-2 text-right font-bold text-slate-800">{fmt(s.qProsjLh, 0)} l/h</td>
                          <td className="p-2 text-right text-slate-600">{fmt(s.dpKretsKpa, 1)} kPa</td>
                          <td className="p-2 text-right text-slate-600">{fmt(s.dpVentilKpa, 1)} kPa</td>
                          <td className="p-2 text-right">{fmt(s.kvBeregnet, 2)}</td>
                          <td className="p-2 text-center font-bold text-slate-800">{fmt(s.valgtKvs, 1)}</td>
                          <td className="p-2 text-center">
                            <span
                              data-status={s.autoritetStatus === 'lav' ? 'avvik' : 'ok'}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                s.autoritetStatus === 'ideell'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : s.autoritetStatus === 'godkjent'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {fmt(s.ventilAutoritetBeta, 2)}
                            </span>
                          </td>
                          <td className="p-2 text-right font-bold text-slate-900">{fmt(s.maaltVannmengdeLh, 0)} l/h</td>
                          <td
                            data-status={s.innreguleringStatus === 'godkjent' ? 'ok' : 'avvik'}
                            className={`p-2 text-right font-bold ${
                              s.innreguleringStatus === 'godkjent' ? 'text-emerald-700' : 'text-rose-700'
                            }`}
                          >
                            {s.avvikProsent >= 0 ? '+' : ''}
                            {fmt(s.avvikProsent, 1)} %
                          </td>
                          <td className="p-2 text-center font-sans">
                            {s.innreguleringStatus === 'godkjent' ? (
                              <span className="text-emerald-700 font-bold text-[10px]">✓ OK</span>
                            ) : (
                              <span className="text-rose-700 font-bold text-[10px]">🚨 Justér</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                      <td className="p-2 font-sans uppercase text-[10px] text-slate-600">SUM / TOTALT</td>
                      <td className="p-2 text-right font-mono">{fmt(resultat.totalEffektKw, 1)} kW</td>
                      <td className="p-2" />
                      <td className="p-2 text-right font-mono">{fmt(resultat.totalVannmengdeLh, 0)} l/h</td>
                      <td colSpan={5} className="p-2 text-right font-sans text-[10px] text-slate-500">
                        Pumpe: {fmt(resultat.pumpeSettpunktKpa, 1)} kPa ({fmt(resultat.pumpeSettpunktMvs, 2)} mVS)
                      </td>
                      <td className="p-2 text-right font-mono">{fmt(resultat.totalMaaltVannmengdeLh, 0)} l/h</td>
                      <td
                        className={`p-2 text-right font-mono ${
                          Math.abs(resultat.totaltAvvikProsent) <= 10 ? 'text-emerald-800' : 'text-rose-800'
                        }`}
                      >
                        {resultat.totaltAvvikProsent >= 0 ? '+' : ''}
                        {fmt(resultat.totaltAvvikProsent, 1)} %
                      </td>
                      <td className="p-2 text-center font-sans text-[10px]">
                        {resultat.alleAvvikOk ? '✓ GODKJENT' : 'AVVIK'}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Konklusjon & Godkjenning */}
            <div
              data-status={resultat.alleAvvikOk ? 'ok' : 'avvik'}
              className={`mt-6 p-4 rounded-lg border ${
                resultat.alleAvvikOk
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                  : 'bg-rose-50 border-rose-300 text-rose-950'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">{resultat.alleAvvikOk ? '✅' : '🚨'}</span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  3. Faglig Konklusjon & FDV-Dokumentasjon
                </h3>
              </div>
              <p className="mt-1 text-xs text-slate-700 leading-relaxed">
                Innreguleringen er utført iht. NS-EN 14336. Systemets indekskurs er identifisert med et samlet
                kretsfall på <strong>{fmt(resultat.indekskurs?.dpKretsKpa ?? 0, 1)} kPa</strong>.
                Sirkulasjonspumpen innstilles på differansetrykkstyrt modus med settpunkt{' '}
                <strong>
                  {fmt(resultat.pumpeSettpunktKpa, 1)} kPa ({fmt(resultat.pumpeSettpunktMvs, 2)} mVS)
                </strong>
                .
              </p>
            </div>

            {/* Signaturblokk */}
            <div className="mt-8 pt-4 border-t border-slate-200 grid grid-cols-2 gap-8 text-xs text-slate-700">
              <div>
                <div className="font-bold text-slate-900">Utførende Innreguleringsingeniør:</div>
                <div className="h-10 border-b border-dashed border-slate-300 mt-2" />
                <div className="text-[10px] text-slate-500 mt-1">Dato / Signatur / Måleutstyr (TA-Scope)</div>
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
