import { useMemo, useState } from 'react';
import type { ProsjektData } from '../../../data/prosjekter';
import { fmt, kopierTilUtklippstavle, lastNedTekst } from '../../../lib/format';
import { useBekreftSlett } from '../../common/BekreftSlettModal';
import GlobalRapportBar from '../../common/GlobalRapportBar';
import { Kort, Resultat, TallFelt } from '../../common/ui';
import {
  DELTA_T_PRESETS,
  HYDRONISKE_VENTILER,
  beregnHydroniskInnregulering,
  type HydroniskStrengInput,
  type HydroniskSystemType,
} from '../../../engine/innregulering';
import HydroniskRapportModal from './HydroniskRapportModal';

interface Props {
  prosjekt: ProsjektData;
  melding: (t: string) => void;
}

export default function HydroniskInnregulering({ prosjekt, melding }: Props) {
  const bekreftSlett = useBekreftSlett();
  const [visRapportModal, setVisRapportModal] = useState(false);
  const bra = prosjekt.bra ?? 1200;

  // Initial standard hydronisk oppsett basert på prosjektets BRA
  const [strenger, setStrenger] = useState<HydroniskStrengInput[]>(() => [
    {
      id: 'k1',
      navn: 'Radiatorkurs Fløy A (1.–3. etg)',
      type: 'varme',
      ventilId: 'ta_stad_25',
      presetId: '80_60',
      effektKw: Math.max(15, Math.round(bra * 0.035)),
      deltaTK: 20,
      dpKretsKpa: 16,
      dpVentilKpa: 14,
      valgtKvs: 8.7,
      maaltVannmengdeLh: Math.round(((Math.max(15, Math.round(bra * 0.035)) * 3600) / (4.187 * 20)) * 0.98),
    },
    {
      id: 'k2',
      navn: 'Gulvvarmekurs Inngang/WC',
      type: 'varme',
      ventilId: 'ta_stad_20',
      presetId: '45_35',
      effektKw: Math.max(8, Math.round(bra * 0.015)),
      deltaTK: 10,
      dpKretsKpa: 12,
      dpVentilKpa: 10,
      valgtKvs: 5.7,
      maaltVannmengdeLh: Math.round(((Math.max(8, Math.round(bra * 0.015)) * 3600) / (4.187 * 10)) * 1.02),
    },
    {
      id: 'k3',
      navn: 'Ventilasjonsvarmebatteri (+360.001)',
      type: 'varme',
      ventilId: 'danfoss_abqm_20',
      presetId: '60_40',
      effektKw: Math.max(20, Math.round(bra * 0.025)),
      deltaTK: 20,
      dpKretsKpa: 24, // Ofte ugunstigste krets
      dpVentilKpa: 18,
      valgtKvs: 0,
      maaltVannmengdeLh: Math.round(((Math.max(20, Math.round(bra * 0.025)) * 3600) / (4.187 * 20)) * 1.01),
    },
    {
      id: 'k4',
      navn: 'Kjølebatteri Kjøling/Frikjøling (+360.002)',
      type: 'kjoling',
      ventilId: 'danfoss_abqm_25',
      presetId: '6_12',
      effektKw: Math.max(25, Math.round(bra * 0.03)),
      deltaTK: 6,
      dpKretsKpa: 28, // Høy motstand i kjøleveksler
      dpVentilKpa: 22,
      valgtKvs: 0,
      maaltVannmengdeLh: Math.round(((Math.max(25, Math.round(bra * 0.03)) * 3600) / (4.187 * 6)) * 0.99),
    },
  ]);

  // Rørdimensjonering for varme/kjøling
  const [rorStrekk] = useState([
    { navn: 'Hovedfordeler Varmesentral', qLs: 1.8, dn: 'DN50 (Ø54 Cu)', vMs: 0.85, rKpaM: 0.18, lengdeM: 18 },
    { navn: 'Stamme Radiator Fløy A', qLs: 0.6, dn: 'DN32 (Ø35 Cu)', vMs: 0.72, rKpaM: 0.22, lengdeM: 24 },
    { navn: 'Fordeler Gulvvarme 1. etg', qLs: 0.45, dn: 'DN25 (Ø28 Cu)', vMs: 0.88, rKpaM: 0.35, lengdeM: 12 },
    { navn: 'Hovedgren Kjøling', qLs: 1.2, dn: 'DN40 (Ø42 Cu)', vMs: 0.98, rKpaM: 0.29, lengdeM: 20 },
  ]);

  const resultat = useMemo(() => beregnHydroniskInnregulering(strenger), [strenger]);

  const oppdaterStreng = (id: string, partial: Partial<HydroniskStrengInput>) => {
    setStrenger((prev) => prev.map((s) => (s.id === id ? { ...s, ...partial } : s)));
  };

  const leggTilStreng = () => {
    const nyId = `k-${Date.now().toString(36)}`;
    setStrenger((prev) => [
      ...prev,
      {
        id: nyId,
        navn: `Ny kurs ${prev.length + 1}`,
        type: 'varme',
        ventilId: 'ta_stad_20',
        presetId: '60_40',
        effektKw: 10,
        deltaTK: 20,
        dpKretsKpa: 12,
        dpVentilKpa: 10,
        valgtKvs: 5.7,
        maaltVannmengdeLh: Math.round((10 * 3600) / (4.187 * 20)),
      },
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Universal felles rapportlinje */}
      <GlobalRapportBar
        tittel="Hydronisk Innregulering & Ventildimensjonering"
        undertittel="STAD strengreguleringsventiler og Danfoss/Frese PICV med ventilautoritet β"
        standard="NS-EN 14336 · VDI 2035"
        ikon="🔥"
        statusBadge={{
          tekst: resultat.alleAvvikOk ? '✅ Alle kurser innregulert' : '🚨 Avvik > 10 %',
          tone: resultat.alleAvvikOk ? 'ok' : 'feil',
        }}
        onApneRapport={() => setVisRapportModal(true)}
        onKopier={async () => {
          const rpt = `# HYDRONISK INNREGULERINGSPROTOKOLL
Prosjekt: ${prosjekt.navn} (${prosjekt.sted || 'Ikke oppgitt'})
Standard: NS-EN 14336 / VDI 2035
Utførende: Kim Jørgensen | Rørleggermester & Rådgivende Ingeniør VVS (RIV)

## Nøkkeltall
- Samlet termisk effekt: ${fmt(resultat.totalEffektKw, 1)} kW
- Total sirkulert vannmengde: ${fmt(resultat.totalVannmengdeLh, 0)} l/h (${fmt(resultat.totalVannmengdeLh / 3600, 3)} l/s)
- Pumpesettpunkt Δp_pumpe: ${fmt(resultat.pumpeSettpunktKpa, 1)} kPa (${fmt(resultat.pumpeSettpunktMvs, 2)} mVS)
- Indekskurs (ugunstigste kurs): ${resultat.indekskurs?.navn ?? 'Ingen'}

## Kursoversikt
| Kurs | System | Ventil | Effekt (kW) | ΔT (K) | q_des (l/h) | q_målt (l/h) | Δp_ventil (kPa) | kvs | β (autoritet) | Avvik (%) |
|------|--------|--------|-------------|--------|-------------|--------------|-----------------|-----|---------------|-----------|
${resultat.strenger
  .map(
    (s) =>
      `| ${s.navn} | ${s.type} | ${s.valgtVentilNavn ?? s.ventilId} | ${fmt(s.effektKw, 1)} | ${s.deltaTK} | ${fmt(s.qProsjLh, 0)} | ${fmt(s.maaltVannmengdeLh, 0)} | ${fmt(s.dpVentilKpa, 1)} | ${s.valgtKvs} | ${fmt(s.ventilAutoritetBeta, 2)} | ${s.avvikProsent >= 0 ? '+' : ''}${fmt(s.avvikProsent, 1)} % |`
  )
  .join('\n')}
`;
          const ok = await kopierTilUtklippstavle(rpt);
          melding(ok ? '📋 Innreguleringsprotokoll kopiert til utklippstavlen' : 'Kunne ikke kopiere');
        }}
        onLastNedMd={() => {
          const rpt = `# HYDRONISK INNREGULERINGSPROTOKOLL
Prosjekt: ${prosjekt.navn} (${prosjekt.sted || 'Ikke oppgitt'})
Standard: NS-EN 14336 / VDI 2035
Utførende: Kim Jørgensen | Rørleggermester & Rådgivende Ingeniør VVS (RIV)

## Nøkkeltall
- Samlet termisk effekt: ${fmt(resultat.totalEffektKw, 1)} kW
- Total sirkulert vannmengde: ${fmt(resultat.totalVannmengdeLh, 0)} l/h (${fmt(resultat.totalVannmengdeLh / 3600, 3)} l/s)
- Pumpesettpunkt Δp_pumpe: ${fmt(resultat.pumpeSettpunktKpa, 1)} kPa (${fmt(resultat.pumpeSettpunktMvs, 2)} mVS)
- Indekskurs (ugunstigste kurs): ${resultat.indekskurs?.navn ?? 'Ingen'}

## Kursoversikt
| Kurs | System | Ventil | Effekt (kW) | ΔT (K) | q_des (l/h) | q_målt (l/h) | Δp_ventil (kPa) | kvs | β (autoritet) | Avvik (%) |
|------|--------|--------|-------------|--------|-------------|--------------|-----------------|-----|---------------|-----------|
${resultat.strenger
  .map(
    (s) =>
      `| ${s.navn} | ${s.type} | ${s.valgtVentilNavn ?? s.ventilId} | ${fmt(s.effektKw, 1)} | ${s.deltaTK} | ${fmt(s.qProsjLh, 0)} | ${fmt(s.maaltVannmengdeLh, 0)} | ${fmt(s.dpVentilKpa, 1)} | ${s.valgtKvs} | ${fmt(s.ventilAutoritetBeta, 2)} | ${s.avvikProsent >= 0 ? '+' : ''}${fmt(s.avvikProsent, 1)} % |`
  )
  .join('\n')}
`;
          lastNedTekst(`${prosjekt.navn.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-hydronisk.md`, rpt);
          melding('📥 Markdown lastet ned for NotebookLM / KI!');
        }}
        ekstraKnapper={
          <button
            type="button"
            onClick={leggTilStreng}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-500 transition"
          >
            + Legg til kurs / streng
          </button>
        }
      />

      {/* Nøkkeltall-kort */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Resultat etikett="Samlet termisk effekt" verdi={fmt(resultat.totalEffektKw, 1)} enhet="kW" />
        <Resultat etikett="Prosjektert vannmengde" verdi={fmt(resultat.totalVannmengdeLh, 0)} enhet="l/h" />
        <Resultat
          etikett="Indekskurs (størst kretsmotstand)"
          verdi={resultat.indekskurs ? `${resultat.indekskurs.navn} (${fmt(resultat.indekskurs.dpKretsKpa, 1)} kPa)` : '–'}
          tone="advarsel"
        />
        <Resultat
          etikett="Pumpens nødvendige settpunkt H_pumpe"
          verdi={`${fmt(resultat.pumpeSettpunktKpa, 1)} kPa (${fmt(resultat.pumpeSettpunktMvs, 2)} mVS)`}
          tone="ok"
        />
      </div>

      {/* Innreguleringstabell */}
      <Kort
        tittel="Hydronisk Innregulering & Ventildimensjonering (Strengventiler & PICV)"
        ikon="🔧"
      >
        <p className="mb-3 text-xs text-slate-400">
          Formler: Vannmengde <code>q = Φ / (c_p · ΔT)</code> (c_p = 4,187 for vann, 3,95 for glykol) · Ventilautoritet <code>β = Δp_ventil / (Δp_krets + Δp_ventil)</code> · 
          Kv-verdi <code>kv = (3,6 · q_ls) / √(Δp_ventil / 100)</code>. Fargekoder: Autoritet β &ge; 0,30 (grønn), avvik &le; ±10 % (grønn).
        </p>

        <div className="overflow-x-auto rounded-lg border border-slate-700">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-900 text-[11px] uppercase tracking-wider text-slate-300">
                <th className="px-2 py-2.5">Kurs / Streng</th>
                <th className="px-2 py-2.5 text-center">Systemtype</th>
                <th className="px-2 py-2.5">Leverandørventil (STAD / PICV)</th>
                <th className="px-2 py-2.5 text-right">Effekt Φ (kW)</th>
                <th className="px-2 py-2.5 text-center">ΔT (K)</th>
                <th className="px-2 py-2.5 text-right">q_prosj (l/h)</th>
                <th className="px-2 py-2.5 text-right">Δp_krets (kPa)</th>
                <th className="px-2 py-2.5 text-right">Δp_ventil (kPa)</th>
                <th className="px-2 py-2.5 text-right">kv beregnet</th>
                <th className="px-2 py-2.5 text-center">kvs / Q_nom</th>
                <th className="px-2 py-2.5 text-center">Forinnstilling</th>
                <th className="px-2 py-2.5 text-center">Autoritet β</th>
                <th className="px-2 py-2.5 text-right">q_målt (l/h)</th>
                <th className="px-2 py-2.5 text-right">Avvik (%)</th>
                <th className="px-2 py-2.5 text-center">Status</th>
                <th className="px-2 py-2.5 text-center" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {resultat.strenger.map((s) => (
                <tr
                  key={s.id}
                  className={`hover:bg-slate-800/60 ${s.erIndekskurs ? 'bg-amber-950/20' : ''}`}
                >
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-1.5">
                      <input
                        value={s.navn}
                        onChange={(e) => oppdaterStreng(s.id, { navn: e.target.value })}
                        className="w-44 min-h-[38px] rounded border border-slate-600 bg-slate-900 px-2 py-1 font-semibold text-slate-100 outline-none focus:border-emerald-500 text-base sm:text-xs"
                      />
                      {s.erIndekskurs && (
                        <span className="rounded bg-amber-500/20 border border-amber-500/40 px-1 py-0.5 text-[9px] font-bold text-amber-300">
                          INDEKS
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <select
                      value={s.type}
                      onChange={(e) => oppdaterStreng(s.id, { type: e.target.value as HydroniskSystemType })}
                      className="min-h-[38px] rounded border border-slate-600 bg-slate-900 px-2 py-1 text-slate-200 text-base sm:text-xs"
                    >
                      <option value="varme">Varme</option>
                      <option value="kjoling">Kjøling</option>
                      <option value="glykol">Glykol (30%)</option>
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <select
                      value={s.ventilId ?? ''}
                      onChange={(e) => {
                        const vId = e.target.value;
                        const v = HYDRONISKE_VENTILER.find((x) => x.id === vId);
                        if (v) {
                          oppdaterStreng(s.id, {
                            ventilId: v.id,
                            valgtKvs: v.kvs ?? 0,
                            dpVentilKpa: v.type === 'PICV' ? Math.max(s.dpVentilKpa, v.dpMinKpa) : s.dpVentilKpa,
                          });
                        } else {
                          oppdaterStreng(s.id, { ventilId: undefined });
                        }
                      }}
                      className="w-44 min-h-[38px] rounded border border-slate-600 bg-slate-900 px-2 py-1 text-base sm:text-[11px] text-slate-200"
                    >
                      <option value="">-- Egendefinert --</option>
                      <optgroup label="IMI TA STAD (Manuell)">
                        {HYDRONISKE_VENTILER.filter((v) => v.merke === 'IMI TA').map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.dn} (kvs {v.kvs})
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Danfoss AB-QM 4.0 (PICV)">
                        {HYDRONISKE_VENTILER.filter((v) => v.merke === 'Danfoss').map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.dn} ({v.qNomLh} l/h)
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Frese OPTIMA (PICV)">
                        {HYDRONISKE_VENTILER.filter((v) => v.merke === 'Frese').map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.dn} ({v.qNomLh} l/h)
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </td>
                  <td className="px-1 py-1.5">
                    <TallFelt
                      className="w-16"
                      ariaLabel="Effekt kW"
                      verdi={s.effektKw}
                      onChange={(n) => oppdaterStreng(s.id, { effektKw: n })}
                    />
                  </td>
                  <td className="px-1 py-1.5">
                    <div className="flex flex-col gap-0.5 items-center">
                      <select
                        value={s.presetId ?? ''}
                        onChange={(e) => {
                          const pId = e.target.value;
                          const p = DELTA_T_PRESETS.find((x) => x.id === pId);
                          if (p) {
                            oppdaterStreng(s.id, {
                              presetId: p.id,
                              deltaTK: p.deltaTK,
                              type: p.system,
                            });
                          } else {
                            oppdaterStreng(s.id, { presetId: undefined });
                          }
                        }}
                        className="w-24 min-h-[32px] rounded border border-slate-700 bg-slate-900 px-1 py-1 text-base sm:text-[10px] text-slate-300"
                      >
                        <option value="">Tilpasset</option>
                        {DELTA_T_PRESETS.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.navn.split(' ')[0]} ({p.deltaTK}K)
                          </option>
                        ))}
                      </select>
                      <TallFelt
                        className="w-16"
                        ariaLabel="Delta T K"
                        verdi={s.deltaTK}
                        onChange={(n) => oppdaterStreng(s.id, { deltaTK: n, presetId: undefined })}
                      />
                    </div>
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono font-bold text-slate-200">
                    {fmt(s.qProsjLh, 0)}
                    <span className="text-[10px] text-slate-400 block">({fmt(s.qProsjLs, 2)} l/s)</span>
                  </td>
                  <td className="px-1 py-1.5">
                    <TallFelt
                      className="w-16"
                      ariaLabel="dp krets kPa"
                      verdi={s.dpKretsKpa}
                      onChange={(n) => oppdaterStreng(s.id, { dpKretsKpa: n })}
                    />
                  </td>
                  <td className="px-1 py-1.5">
                    <TallFelt
                      className="w-16"
                      ariaLabel="dp ventil kPa"
                      verdi={s.dpVentilKpa}
                      onChange={(n) => oppdaterStreng(s.id, { dpVentilKpa: n })}
                    />
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono text-slate-300">
                    {fmt(s.kvBeregnet, 2)}
                  </td>
                  <td className="px-1 py-1.5 text-center font-mono">
                    {s.ventilType === 'PICV' ? (
                      <span className="text-[11px] font-bold text-cyan-300" title="Trykkuavhengig kontrollventil">
                        PICV
                      </span>
                    ) : (
                      <TallFelt
                        className="w-14"
                        ariaLabel="Valgt kvs"
                        verdi={s.valgtKvs}
                        onChange={(n) => oppdaterStreng(s.id, { valgtKvs: n, ventilId: undefined })}
                      />
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-center font-mono font-bold text-cyan-300">
                    {s.forinnstillingTekst}
                  </td>
                  <td className="px-2 py-1.5 text-center font-mono font-bold">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[11px] ${
                        s.autoritetStatus === 'ideell'
                          ? 'bg-emerald-950 border border-emerald-600 text-emerald-300'
                          : s.autoritetStatus === 'godkjent'
                          ? 'bg-emerald-950/60 border border-emerald-700 text-emerald-400'
                          : 'bg-rose-950 border border-rose-600 text-rose-300'
                      }`}
                      title={
                        s.ventilType === 'PICV'
                          ? `PICV: Krever min. ${s.minDrivtrykkKpa} kPa differansetrykk. Status: ${s.autoritetStatus}`
                          : `STAD: Ventilautoritet β = Δp_ventil / (Δp_krets + Δp_ventil)`
                      }
                    >
                      {s.ventilType === 'PICV' ? (s.autoritetStatus === 'ideell' ? 'PICV OK' : 'Lav Δp') : fmt(s.ventilAutoritetBeta, 2)}
                    </span>
                  </td>
                  <td className="px-1 py-1.5">
                    <TallFelt
                      className="w-20 font-bold"
                      ariaLabel="Målt vannmengde l/h"
                      verdi={s.maaltVannmengdeLh}
                      onChange={(n) => oppdaterStreng(s.id, { maaltVannmengdeLh: n })}
                    />
                  </td>
                  <td
                    className={`px-2 py-1.5 text-right font-mono font-bold ${
                      s.innreguleringStatus === 'godkjent' ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {s.avvikProsent >= 0 ? '+' : ''}
                    {fmt(s.avvikProsent, 1)} %
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    {s.innreguleringStatus === 'godkjent' ? (
                      <span className="rounded bg-emerald-950 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                        ✓ Godkjent
                      </span>
                    ) : (
                      <span className="rounded bg-rose-950 px-1.5 py-0.5 text-[10px] font-bold text-rose-300">
                        🚨 Avvik
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <button
                      type="button"
                      aria-label={`Slett ${s.navn}`}
                      onClick={() =>
                        bekreftSlett({
                          tittel: 'Slette kurs?',
                          elementNavn: s.navn,
                          beskrivelse: 'Er du sikker på at du vil fjerne denne kursen fra innreguleringstabellen?',
                          bekreftTekst: '🗑️ Slett kurs',
                          onBekreft: () => setStrenger((prev) => prev.filter((x) => x.id !== s.id)),
                        })
                      }
                      className="inline-flex min-h-[38px] min-w-[38px] items-center justify-center rounded text-slate-400 hover:bg-rose-950 hover:text-rose-300"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-900 font-bold border-t-2 border-slate-700">
                <td colSpan={3} className="px-2 py-2 text-right text-[11px] uppercase tracking-wider text-slate-400">
                  SUM / TOTALT
                </td>
                <td className="px-2 py-2 text-right font-mono text-emerald-400">{fmt(resultat.totalEffektKw, 1)} kW</td>
                <td />
                <td className="px-2 py-2 text-right font-mono text-emerald-300">{fmt(resultat.totalVannmengdeLh, 0)} l/h</td>
                <td colSpan={6} className="px-2 py-2 text-right text-slate-400 text-[11px]">
                  Pumpesettpunkt: <strong>{fmt(resultat.pumpeSettpunktKpa, 1)} kPa ({fmt(resultat.pumpeSettpunktMvs, 2)} mVS)</strong>
                </td>
                <td className="px-2 py-2 text-right font-mono text-slate-100">{fmt(resultat.totalMaaltVannmengdeLh, 0)} l/h</td>
                <td
                  className={`px-2 py-2 text-right font-mono ${
                    Math.abs(resultat.totaltAvvikProsent) <= 10 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {resultat.totaltAvvikProsent >= 0 ? '+' : ''}
                  {fmt(resultat.totaltAvvikProsent, 1)} %
                </td>
                <td className="px-2 py-2 text-center text-[10px]">
                  {resultat.alleAvvikOk ? '✓ OK' : '🚨 AVVIK'}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </Kort>

      {/* Rørdimensjonering for fordelingsnettet */}
      <Kort tittel="Rørdimensjonering (Fordelingsnett & Hovedstrekk)" ikon="📏">
        <p className="mb-3 text-xs text-slate-400">
          Kriterium for hydroniske rør: Vannhastighet <code>0,4 ≤ v ≤ 1,2 m/s</code> og trykkfall <code>R ≤ 0,10–0,25 kPa/m</code> for å unngå sus/erosjon.
        </p>
        <div className="overflow-x-auto rounded-lg border border-slate-700">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-900 text-[11px] uppercase tracking-wider text-slate-300">
                <th className="px-2 py-2">Rørstrekk</th>
                <th className="px-2 py-2 text-right">Vannmengde (l/s)</th>
                <th className="px-2 py-2 text-center">Dimensjon</th>
                <th className="px-2 py-2 text-right">Hastighet v (m/s)</th>
                <th className="px-2 py-2 text-right">Friksjon R (kPa/m)</th>
                <th className="px-2 py-2 text-right">Lengde (m)</th>
                <th className="px-2 py-2 text-right">Trykktap Δp (kPa)</th>
                <th className="px-2 py-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700 font-mono">
              {rorStrekk.map((r, i) => {
                const dp = r.rKpaM * r.lengdeM;
                const hastighetOk = r.vMs <= 1.2;
                return (
                  <tr key={i} className="hover:bg-slate-800/50">
                    <td className="px-2 py-1.5 font-sans font-semibold text-slate-200">{r.navn}</td>
                    <td className="px-2 py-1.5 text-right font-bold text-slate-100">{fmt(r.qLs, 2)}</td>
                    <td className="px-2 py-1.5 text-center text-emerald-400 font-bold">{r.dn}</td>
                    <td
                      className={`px-2 py-1.5 text-right font-bold ${
                        hastighetOk ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {fmt(r.vMs, 2)}
                    </td>
                    <td className="px-2 py-1.5 text-right text-slate-300">{fmt(r.rKpaM, 2)}</td>
                    <td className="px-2 py-1.5 text-right text-slate-300">{fmt(r.lengdeM, 1)}</td>
                    <td className="px-2 py-1.5 text-right font-bold text-slate-100">{fmt(dp, 1)}</td>
                    <td className="px-2 py-1.5 text-center font-sans">
                      {hastighetOk ? (
                        <span className="rounded bg-emerald-950 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                          ✓ OK
                        </span>
                      ) : (
                        <span className="rounded bg-rose-950 px-1.5 py-0.5 text-[10px] font-bold text-rose-300">
                          🚨 v &gt; 1,2
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Kort>

      {/* Visuell A4-rapportmodal */}
      <HydroniskRapportModal
        aapen={visRapportModal}
        onLukk={() => setVisRapportModal(false)}
        prosjekt={prosjekt}
        resultat={resultat}
        melding={melding}
      />
    </div>
  );
}
