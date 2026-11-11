import { useMemo, useState } from 'react';
import type { ProsjektData } from '../../../data/prosjekter';
import { fmt, kopierTilUtklippstavle, lastNedTekst } from '../../../lib/format';
import { useBekreftSlett } from '../../common/BekreftSlettModal';
import GlobalRapportBar from '../../common/GlobalRapportBar';
import { Kort, Resultat, TallFelt } from '../../common/ui';
import {
  VENTILASJON_VENTILER,
  beregnVentilasjonsInnregulering,
  type VentilVentilInput,
} from '../../../engine/innregulering';
import VentilasjonRapportModal from './VentilasjonRapportModal';

interface Props {
  prosjekt: ProsjektData;
  melding: (t: string) => void;
}

export default function VentilasjonInnregulering({ prosjekt, melding }: Props) {
  const bekreftSlett = useBekreftSlett();
  const [visRapportModal, setVisRapportModal] = useState(false);
  const bra = prosjekt.bra ?? 1200;

  // Vifteeffekt tilluft + avtrekk [kW]
  const [vifteEffektKw, setVifteEffektKw] = useState(() => Math.max(1.2, Math.round((bra / 1000) * 2.8 * 10) / 10));

  // Ventilliste – tilluft og avtrekk
  const [ventiler, setVentiler] = useState<VentilVentilInput[]>(() => [
    {
      id: 'v1',
      rom: 'Møterom 101 (12 pers)',
      type: 'tilluft',
      ventilId: 'sys_tff_160',
      dimensjon: 'Ø160',
      kFaktor: 4.3,
      qProsjM3h: 320,
      maaltTrykkPa: Math.round(Math.pow(320 / 3.6 / 4.3, 2) * 1.02),
    },
    {
      id: 'v2',
      rom: 'Møterom 101 (Avtrekk)',
      type: 'avtrekk',
      ventilId: 'sys_eff_160',
      dimensjon: 'Ø160',
      kFaktor: 3.9,
      qProsjM3h: 340,
      maaltTrykkPa: Math.round(Math.pow(340 / 3.6 / 3.9, 2) * 0.99),
    },
    {
      id: 'v3',
      rom: 'Kontorlandskap Sone A (Tilluft 1)',
      type: 'tilluft',
      ventilId: 'sys_tff_200',
      dimensjon: 'Ø200',
      kFaktor: 6.8,
      qProsjM3h: 520,
      maaltTrykkPa: Math.round(Math.pow(520 / 3.6 / 6.8, 2) * 0.98),
    },
    {
      id: 'v4',
      rom: 'Kontorlandskap Sone A (Tilluft 2)',
      type: 'tilluft',
      ventilId: 'sys_tff_200',
      dimensjon: 'Ø200',
      kFaktor: 6.8,
      qProsjM3h: 520,
      maaltTrykkPa: Math.round(Math.pow(520 / 3.6 / 6.8, 2) * 1.01),
    },
    {
      id: 'v5',
      rom: 'Kopirom / Kaffestasjon (Avtrekk)',
      type: 'avtrekk',
      ventilId: 'lin_ki_125',
      dimensjon: 'Ø125',
      kFaktor: 2.6,
      qProsjM3h: 180,
      maaltTrykkPa: Math.round(Math.pow(180 / 3.6 / 2.6, 2) * 1.04),
    },
    {
      id: 'v6',
      rom: 'Toaletter & HC-WC (Avtrekk)',
      type: 'avtrekk',
      ventilId: 'sys_eff_125',
      dimensjon: 'Ø125',
      kFaktor: 2.5,
      qProsjM3h: 220,
      maaltTrykkPa: Math.round(Math.pow(220 / 3.6 / 2.5, 2) * 0.98),
    },
    {
      id: 'v7',
      rom: 'Felles Kjøkken / Spiserom',
      type: 'avtrekk',
      ventilId: 'trox_kso_160',
      dimensjon: 'Ø160',
      kFaktor: 3.8,
      qProsjM3h: 380,
      maaltTrykkPa: Math.round(Math.pow(380 / 3.6 / 3.8, 2) * 1.02),
    },
  ]);

  // Kanaldimensjonering
  const [kanalStrekk] = useState([
    { navn: 'Hovedkanal Tilluft (fra aggregat)', qM3h: 2200, dim: 'Ø500', hastighetMs: 3.1, tapPaM: 0.8, lengdeM: 25 },
    { navn: 'Grenkanal Kontorfløy 1. etg', qM3h: 1040, dim: 'Ø315', hastighetMs: 3.7, tapPaM: 1.2, lengdeM: 18 },
    { navn: 'Stikkledning Møterom 101', qM3h: 320, dim: 'Ø160', hastighetMs: 4.4, tapPaM: 2.1, lengdeM: 8 },
    { navn: 'Hovedkanal Avtrekk', qM3h: 2350, dim: 'Ø500', hastighetMs: 3.3, tapPaM: 0.9, lengdeM: 26 },
  ]);

  const resultat = useMemo(
    () => beregnVentilasjonsInnregulering(ventiler, vifteEffektKw),
    [ventiler, vifteEffektKw]
  );

  const oppdaterVentil = (id: string, partial: Partial<VentilVentilInput>) => {
    setVentiler((prev) => prev.map((v) => (v.id === id ? { ...v, ...partial } : v)));
  };

  const leggTilVentil = () => {
    const nyId = `v-${Date.now().toString(36)}`;
    setVentiler((prev) => [
      ...prev,
      {
        id: nyId,
        rom: `Nytt rom ${prev.length + 1}`,
        type: 'tilluft',
        ventilId: 'sys_tff_125',
        dimensjon: 'Ø125',
        kFaktor: 2.7,
        qProsjM3h: 150,
        maaltTrykkPa: Math.round(Math.pow(150 / 3.6 / 2.7, 2)),
      },
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Universal felles rapportlinje */}
      <GlobalRapportBar
        tittel="Luftteknisk Innregulering & Byggbalanse"
        undertittel="K-faktormåling, tilluft/avtrekk, trykkbalanse og SFP-kontroll"
        standard="NS-EN 12599 · TEK17 kap. 13"
        ikon="💨"
        statusBadge={{
          tekst: resultat.alleVentilerOk && resultat.sfpOkTek17 ? '✅ Balansert & SFP OK' : '🚨 Avvik i anlegg',
          tone: resultat.alleVentilerOk && resultat.sfpOkTek17 ? 'ok' : 'feil',
        }}
        onApneRapport={() => setVisRapportModal(true)}
        onKopier={async () => {
          const rpt = `# LUFTTEKNISK INNREGULERINGSPROTOKOLL
Prosjekt: ${prosjekt.navn} (${prosjekt.sted || 'Ikke oppgitt'})
Standard: NS-EN 12599 / TEK17 kap. 13
Utførende: Kim Jørgensen | Rørleggermester & Rådgivende Ingeniør VVS (RIV)

## Nøkkeltall
- Samlet prosjektert tilluft: ${fmt(resultat.sumTilluftProsjM3h, 0)} m³/h
- Samlet målt tilluft: ${fmt(resultat.sumTilluftMaaltM3h, 0)} m³/h
- Samlet prosjektert avtrekk: ${fmt(resultat.sumAvtrekkProsjM3h, 0)} m³/h
- Samlet målt avtrekk: ${fmt(resultat.sumAvtrekkMaaltM3h, 0)} m³/h
- Luftmengdebalanse: ${resultat.balanseM3h >= 0 ? '+' : ''}${fmt(resultat.balanseM3h, 0)} m³/h (${resultat.balanseProsent >= 0 ? '+' : ''}${fmt(resultat.balanseProsent, 1)} %)
- Total vifteeffekt: ${fmt(vifteEffektKw, 2)} kW
- Spesifikk vifteeffekt SFP: ${fmt(resultat.beregnetSfp, 2)} kW/(m³/s) (TEK17-krav: ≤ 1,5 kW/(m³/s))
- SFP-status: ${resultat.sfpOkTek17 ? '✅ Godkjent' : '🚨 Overskrider krav'}

## Ventil- og Romliste
| Rom / Ventil | Type | Dimensjon | K-faktor | q_prosj (m³/h) | Målt Δp (Pa) | q_målt (m³/h) | Avvik (%) | Status |
|:-------------|:-----|:----------|:---------|:---------------|:-------------|:--------------|:----------|:-------|
${resultat.ventiler
  .map(
    (v) =>
      `| ${v.rom} | ${v.type} | ${v.dimensjon} | ${fmt(v.kFaktor, 1)} | ${fmt(v.qProsjM3h, 0)} | ${fmt(v.maaltTrykkPa, 0)} | ${fmt(v.maaltLuftmengdeM3h, 0)} | ${v.avvikProsent >= 0 ? '+' : ''}${fmt(v.avvikProsent, 1)} % | ${v.status !== 'avvik' ? 'OK' : 'AVVIK'} |`
  )
  .join('\n')}
`;
          const ok = await kopierTilUtklippstavle(rpt);
          melding(ok ? '📋 Innreguleringsprotokoll kopiert til utklippstavlen' : 'Kunne ikke kopiere');
        }}
        onLastNedMd={() => {
          const rpt = `# LUFTTEKNISK INNREGULERINGSPROTOKOLL
Prosjekt: ${prosjekt.navn} (${prosjekt.sted || 'Ikke oppgitt'})
Standard: NS-EN 12599 / TEK17 kap. 13
Utførende: Kim Jørgensen | Rørleggermester & Rådgivende Ingeniør VVS (RIV)

## Nøkkeltall
- Samlet prosjektert tilluft: ${fmt(resultat.sumTilluftProsjM3h, 0)} m³/h
- Samlet målt tilluft: ${fmt(resultat.sumTilluftMaaltM3h, 0)} m³/h
- Samlet prosjektert avtrekk: ${fmt(resultat.sumAvtrekkProsjM3h, 0)} m³/h
- Samlet målt avtrekk: ${fmt(resultat.sumAvtrekkMaaltM3h, 0)} m³/h
- Luftmengdebalanse: ${resultat.balanseM3h >= 0 ? '+' : ''}${fmt(resultat.balanseM3h, 0)} m³/h (${resultat.balanseProsent >= 0 ? '+' : ''}${fmt(resultat.balanseProsent, 1)} %)
- Total vifteeffekt: ${fmt(vifteEffektKw, 2)} kW
- Spesifikk vifteeffekt SFP: ${fmt(resultat.beregnetSfp, 2)} kW/(m³/s) (TEK17-krav: ≤ 1,5 kW/(m³/s))
- SFP-status: ${resultat.sfpOkTek17 ? '✅ Godkjent' : '🚨 Overskrider krav'}

## Ventil- og Romliste
| Rom / Ventil | Type | Dimensjon | K-faktor | q_prosj (m³/h) | Målt Δp (Pa) | q_målt (m³/h) | Avvik (%) | Status |
|:-------------|:-----|:----------|:---------|:---------------|:-------------|:--------------|:----------|:-------|
${resultat.ventiler
  .map(
    (v) =>
      `| ${v.rom} | ${v.type} | ${v.dimensjon} | ${fmt(v.kFaktor, 1)} | ${fmt(v.qProsjM3h, 0)} | ${fmt(v.maaltTrykkPa, 0)} | ${fmt(v.maaltLuftmengdeM3h, 0)} | ${v.avvikProsent >= 0 ? '+' : ''}${fmt(v.avvikProsent, 1)} % | ${v.status !== 'avvik' ? 'OK' : 'AVVIK'} |`
  )
  .join('\n')}
`;
          lastNedTekst(`${prosjekt.navn.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-ventilasjon-innregulering.md`, rpt);
          melding('📥 Markdown lastet ned for NotebookLM / KI!');
        }}
        ekstraKnapper={
          <button
            type="button"
            onClick={leggTilVentil}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-cyan-600 px-3.5 py-1.5 text-xs font-bold text-white shadow hover:bg-cyan-500 transition"
          >
            + Legg til ventil / rom
          </button>
        }
      />

      {/* Oppsummeringskort for luftbalanse og SFP */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Resultat
          etikett="Sum Tilluft (Målt)"
          verdi={`${fmt(resultat.sumTilluftMaaltM3h, 0)} m³/h`}
          enhet={`(${fmt(resultat.sumTilluftMaaltLs, 0)} l/s)`}
          tone="ok"
        />
        <Resultat
          etikett="Sum Avtrekk (Målt)"
          verdi={`${fmt(resultat.sumAvtrekkMaaltM3h, 0)} m³/h`}
          enhet={`(${fmt(resultat.sumAvtrekkMaaltLs, 0)} l/s)`}
        />
        <Resultat
          etikett="Trykkbalanse i bygget"
          verdi={`${resultat.balanseM3h >= 0 ? '+' : ''}${fmt(resultat.balanseM3h, 0)} m³/h (${fmt(resultat.balanseProsent, 1)} %)`}
          tone={resultat.balanseVurdering.tone}
        />
        <Resultat
          etikett="SFP-faktor (TEK17 ≤ 1,5)"
          verdi={`${fmt(resultat.beregnetSfp, 2)} kW/(m³/s)`}
          tone={resultat.sfpOkTek17 ? 'ok' : 'feil'}
        />
      </div>

      {/* Innreguleringstabell */}
      <Kort
        tittel="Luftteknisk Innregulering & Måleprotokoll (Tilluft & Avtrekk)"
        ikon="💨"
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <p>
            Formel: <code>q [l/s] = k · √(Δp_m [Pa])</code> · Måletrykk: <code>Δp_m = (q_ls / k)²</code>. Toleranser iht. NS-EN 12599: Godkjent &le; &plusmn;10 %, akseptabel &le; &plusmn;15 %.
          </p>
          <div className="flex items-center gap-2">
            <span className="text-slate-300 font-semibold">Samlet vifteeffekt:</span>
            <TallFelt
              className="w-20"
              ariaLabel="Vifteeffekt kW"
              verdi={vifteEffektKw}
              onChange={setVifteEffektKw}
            />
            <span className="text-slate-400">kW</span>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-700">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-900 text-[11px] uppercase tracking-wider text-slate-300">
                <th className="px-2 py-2.5">Rom / Sone</th>
                <th className="px-2 py-2.5 text-center">Type</th>
                <th className="px-2 py-2.5">Leverandør / Ventilmodell</th>
                <th className="px-2 py-2.5 text-center">Dim</th>
                <th className="px-2 py-2.5 text-right">k-faktor</th>
                <th className="px-2 py-2.5 text-right">q_prosj (m³/h)</th>
                <th className="px-2 py-2.5 text-right">Δp beregnet (Pa)</th>
                <th className="px-2 py-2.5 text-right">Målt Δp (Pa)</th>
                <th className="px-2 py-2.5 text-right">q_målt (m³/h)</th>
                <th className="px-2 py-2.5 text-right">Avvik (%)</th>
                <th className="px-2 py-2.5 text-center">Status</th>
                <th className="px-2 py-2.5 text-center" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {resultat.ventiler.map((v) => (
                <tr key={v.id} className="hover:bg-slate-800/60">
                  <td className="px-2 py-1.5">
                    <input
                      value={v.rom}
                      onChange={(e) => oppdaterVentil(v.id, { rom: e.target.value })}
                      className="w-44 rounded border border-slate-600 bg-slate-900 px-2 py-1 font-semibold text-slate-100 outline-none focus:border-cyan-500"
                    />
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <select
                      value={v.type}
                      onChange={(e) => oppdaterVentil(v.id, { type: e.target.value as 'tilluft' | 'avtrekk' })}
                      className="rounded border border-slate-600 bg-slate-900 px-1.5 py-1 text-slate-200 text-xs"
                    >
                      <option value="tilluft">Tilluft</option>
                      <option value="avtrekk">Avtrekk</option>
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <select
                      value={v.ventilId ?? ''}
                      onChange={(e) => {
                        const vId = e.target.value;
                        const vent = VENTILASJON_VENTILER.find((x) => x.id === vId);
                        if (vent) {
                          oppdaterVentil(v.id, {
                            ventilId: vent.id,
                            dimensjon: vent.dimensjon,
                            kFaktor: vent.kFaktor,
                            type: vent.type,
                          });
                        } else {
                          oppdaterVentil(v.id, { ventilId: undefined });
                        }
                      }}
                      className="w-44 rounded border border-slate-600 bg-slate-900 px-1.5 py-1 text-[11px] text-slate-200"
                    >
                      <option value="">-- Egendefinert --</option>
                      <optgroup label="Systemair (TFF, EFF, TFC, IRIS)">
                        {VENTILASJON_VENTILER.filter((x) => x.merke === 'Systemair').map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.modell} {x.dimensjon} (k = {x.kFaktor})
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Lindab (KI/KSU, KPF, DRU)">
                        {VENTILASJON_VENTILER.filter((x) => x.merke === 'Lindab').map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.modell} {x.dimensjon} (k = {x.kFaktor})
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Trox Auranor (KVU, KSO, Luna, Sirius)">
                        {VENTILASJON_VENTILER.filter((x) => x.merke === 'Trox Auranor').map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.modell} {x.dimensjon} (k = {x.kFaktor})
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </td>
                  <td className="px-1 py-1.5 text-center">
                    <input
                      value={v.dimensjon}
                      onChange={(e) => oppdaterVentil(v.id, { dimensjon: e.target.value })}
                      className="w-14 rounded border border-slate-600 bg-slate-900 px-1 py-1 text-center font-mono text-slate-300"
                    />
                  </td>
                  <td className="px-1 py-1.5">
                    <TallFelt
                      className="w-14"
                      ariaLabel="k-faktor"
                      verdi={v.kFaktor}
                      onChange={(n) => oppdaterVentil(v.id, { kFaktor: n, ventilId: undefined })}
                    />
                  </td>
                  <td className="px-1 py-1.5">
                    <TallFelt
                      className="w-18"
                      ariaLabel="q prosj m3h"
                      verdi={v.qProsjM3h}
                      onChange={(n) => oppdaterVentil(v.id, { qProsjM3h: n })}
                    />
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono text-slate-400">
                    {fmt(v.beregnetTrykkPa, 1)} Pa
                  </td>
                  <td className="px-1 py-1.5">
                    <TallFelt
                      className="w-18 font-bold"
                      ariaLabel="Målt trykk Pa"
                      verdi={v.maaltTrykkPa}
                      onChange={(n) => oppdaterVentil(v.id, { maaltTrykkPa: n })}
                    />
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono font-bold text-slate-100">
                    {fmt(v.maaltLuftmengdeM3h, 0)}
                    <span className="text-[10px] text-slate-400 block font-normal">
                      ({fmt(v.maaltLuftmengdeLs, 0)} l/s)
                    </span>
                  </td>
                  <td
                    className={`px-2 py-1.5 text-right font-mono font-bold ${
                      v.status === 'godkjent'
                        ? 'text-emerald-400'
                        : v.status === 'akseptabel'
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {v.avvikProsent >= 0 ? '+' : ''}
                    {fmt(v.avvikProsent, 1)} %
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    {v.status === 'godkjent' ? (
                      <span className="rounded bg-emerald-950 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                        ✓ OK
                      </span>
                    ) : v.status === 'akseptabel' ? (
                      <span className="rounded bg-amber-950 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                        ~ Akseptabel
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
                      aria-label={`Slett ${v.rom}`}
                      onClick={() =>
                        bekreftSlett({
                          tittel: 'Slette ventil / målerad?',
                          elementNavn: `${v.rom} (${v.dimensjon})`,
                          beskrivelse: 'Er du sikker på at du vil fjerne denne ventilen fra innreguleringsprotokollen?',
                          bekreftTekst: '🗑️ Slett ventil',
                          onBekreft: () => setVentiler((prev) => prev.filter((x) => x.id !== v.id)),
                        })
                      }
                      className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-400 hover:bg-rose-950 hover:text-rose-300"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-900 font-bold border-t-2 border-slate-700">
                <td colSpan={5} className="px-2 py-2 text-right text-[11px] uppercase tracking-wider text-slate-400">
                  SUM PROSJEKTERT
                </td>
                <td className="px-2 py-2 text-right font-mono text-cyan-400">
                  {fmt(resultat.sumTilluftProsjM3h + resultat.sumAvtrekkProsjM3h, 0)} m³/h
                </td>
                <td colSpan={2} className="px-2 py-2 text-right text-[11px] uppercase tracking-wider text-slate-400">
                  SUM MÅLT
                </td>
                <td className="px-2 py-2 text-right font-mono text-emerald-400">
                  {fmt(resultat.sumTilluftMaaltM3h + resultat.sumAvtrekkMaaltM3h, 0)} m³/h
                </td>
                <td colSpan={3} className="px-2 py-2 text-center text-[10px]">
                  {resultat.alleVentilerOk ? '✓ ALLE GODKJENT (NS-EN 12599)' : '🚨 AVVIK KREVER JUSTERING'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Kort>

      {/* Kanaldimensjonering */}
      <Kort tittel="Kanaldimensjonering (Lufthastighet v & Trykktap R)" ikon="📐">
        <p className="mb-3 text-xs text-slate-400">
          Krav til lufthastighet: Hovedkanaler <code>4,0–6,0 m/s</code>, grenkanaler <code>2,5–4,0 m/s</code>, og tilluftsstuss &le; 2,5 m/s for støy under 30 dBA.
        </p>
        <div className="overflow-x-auto rounded-lg border border-slate-700">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-900 text-[11px] uppercase tracking-wider text-slate-300">
                <th className="px-2 py-2">Kanalstrekk</th>
                <th className="px-2 py-2 text-right">Luftmengde (m³/h)</th>
                <th className="px-2 py-2 text-center">Dimensjon</th>
                <th className="px-2 py-2 text-right">Hastighet v (m/s)</th>
                <th className="px-2 py-2 text-right">Friksjon R (Pa/m)</th>
                <th className="px-2 py-2 text-right">Lengde (m)</th>
                <th className="px-2 py-2 text-right">Trykktap Δp (Pa)</th>
                <th className="px-2 py-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700 font-mono">
              {kanalStrekk.map((k, i) => {
                const dp = k.tapPaM * k.lengdeM;
                const hastighetOk = k.hastighetMs <= 5.5;
                return (
                  <tr key={i} className="hover:bg-slate-800/50">
                    <td className="px-2 py-1.5 font-sans font-semibold text-slate-200">{k.navn}</td>
                    <td className="px-2 py-1.5 text-right font-bold text-slate-100">{fmt(k.qM3h, 0)}</td>
                    <td className="px-2 py-1.5 text-center text-cyan-400 font-bold">{k.dim}</td>
                    <td
                      className={`px-2 py-1.5 text-right font-bold ${
                        hastighetOk ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {fmt(k.hastighetMs, 1)}
                    </td>
                    <td className="px-2 py-1.5 text-right text-slate-300">{fmt(k.tapPaM, 1)}</td>
                    <td className="px-2 py-1.5 text-right text-slate-300">{fmt(k.lengdeM, 1)}</td>
                    <td className="px-2 py-1.5 text-right font-bold text-slate-100">{fmt(dp, 0)}</td>
                    <td className="px-2 py-1.5 text-center font-sans">
                      {hastighetOk ? (
                        <span className="rounded bg-emerald-950 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                          ✓ OK
                        </span>
                      ) : (
                        <span className="rounded bg-rose-950 px-1.5 py-0.5 text-[10px] font-bold text-rose-300">
                          🚨 v &gt; 5.5
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
      <VentilasjonRapportModal
        aapen={visRapportModal}
        onLukk={() => setVisRapportModal(false)}
        prosjekt={prosjekt}
        resultat={resultat}
        vifteEffektKw={vifteEffektKw}
        melding={melding}
      />
    </div>
  );
}
