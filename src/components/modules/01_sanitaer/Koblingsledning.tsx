import { useMemo, useState } from 'react';
import { PROSJEKT_PRESETS, type ProsjektData } from '../../../data/prosjekter';
import {
  EKSEMPEL_KOBLING,
  ROR_TABELL,
  beregnKobling,
  sumStrekk,
  ugunstigsteKrets,
  type KoblingsStrekk,
} from '../../../engine/sanitaer';
import { fmt, kopierTilUtklippstavle, lastNedTekst } from '../../../lib/format';
import { useBekreftSlett } from '../../common/BekreftSlettModal';
import GlobalRapportBar from '../../common/GlobalRapportBar';
import FagRapportModal from '../common/FagRapportModal';
import { Kort, Knapp, Merkelapp, Resultat, TallFelt } from '../../common/ui';

interface Props {
  prosjekt?: ProsjektData;
  melding: (t: string) => void;
}

export default function Koblingsledning({ prosjekt, melding }: Props) {
  const [rader, setRader] = useState<KoblingsStrekk[]>(EKSEMPEL_KOBLING.map((r) => ({ ...r })));
  const [visRapport, setVisRapport] = useState(false);
  const bekreftSlett = useBekreftSlett();
  const beregnet = useMemo(() => rader.map(beregnKobling), [rader]);
  const ugunstigst = ugunstigsteKrets(beregnet);
  const sum = sumStrekk(beregnet);
  const oppdater = (i: number, d: Partial<KoblingsStrekk>) =>
    setRader((r) => r.map((x, idx) => (idx === i ? { ...x, ...d } : x)));

  const maksHastighet = useMemo(
    () => Math.max(...beregnet.map((b) => b.hastighet), 0),
    [beregnet]
  );
  const alleHastigheterOk = maksHastighet <= 2.5;

  const prosjektObj: ProsjektData = useMemo(
    () => prosjekt ?? PROSJEKT_PRESETS[0],
    [prosjekt]
  );

  const markdownTekst = useMemo(() => {
    const L: string[] = [];
    L.push('# KOBLINGSLEDNINGER OG UGUNSTIGSTE KRETS');
    L.push(`**Standard:** SINTEF Byggforsk Kunnskapssystem 553.102 · TEK17 § 15-5`);
    L.push(`**Prosjekt:** ${prosjektObj.navn} | **Dato:** ${new Date().toLocaleDateString('nb-NO')}`);
    L.push(`**Utførende:** Kim Jørgensen | Rørleggermester & Rådgivende Ingeniør VVS (RIV)`);
    L.push(`**Adresse:** ${prosjektObj.sted || 'Ikke oppgitt'} | **Gnr/Bnr:** ${prosjektObj.matrikkel || 'Ikke oppgitt'}`);
    L.push('');
    L.push('## 1. Nøkkeltall for koblingsledninger');
    L.push(`- Antall tappesteder: ${rader.length} stk`);
    L.push(`- Ugunstigste krets: ${beregnet[ugunstigst]?.navn ?? '–'} (${fmt(beregnet[ugunstigst]?.kretsTap ?? 0, 1)} kPa)`);
    L.push(`- Maksimal vannhastighet: ${fmt(maksHastighet, 2)} m/s (Krav: ≤ 2,5 m/s)`);
    L.push(`- Samlet rørlengde: ${fmt(sum.lengde, 1)} m`);
    L.push(`- Samlet friksjonstap Σ R·l: ${fmt(sum.rxl, 1)} kPa`);
    L.push('');
    L.push('## 2. Dimensjoneringstabell for koblingsledninger');
    L.push('| Tappested | Σ q_N (l/s) | q_N1 (l/s) | q_kont | q_dim (l/s) | Dim (mm) | v (m/s) | R (kPa/m) | l (m) | R·l (kPa) | Armatur (kPa) | Krets (kPa) | Status |');
    L.push('|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|');
    beregnet.forEach((b, i) => {
      const ugunstigMerk = i === ugunstigst ? ' ★ (Ugunstigst)' : '';
      const vStatus = b.hastighet <= 2.5 ? 'OK' : 'HØY HASTIGHET';
      L.push(
        `| ${b.navn}${ugunstigMerk} | ${fmt(rader[i].sumQn, 1)} | ${fmt(rader[i].qn1, 1)} | ${fmt(rader[i].qkont, 1)} | ${fmt(b.qdim, 3)} | DN ${b.dim} | ${fmt(b.hastighet)} | ${fmt(b.R, 3)} | ${fmt(b.l, 1)} | ${fmt(b.rxl)} | ${fmt(b.armaturTap, 0)} | ${fmt(b.kretsTap)} | ${vStatus} |`
      );
    });
    L.push('');
    L.push('## 3. Konklusjon');
    L.push(
      alleHastigheterOk
        ? '✅ Samtlige koblingsledninger tilfredsstiller hastighetskravet (v ≤ 2,5 m/s) iht. SINTEF Byggforsk 553.102.'
        : '🚨 En eller flere koblingsledninger overskrider anbefalt vannhastighet (v > 2,5 m/s). Dimensjoner må økes for å unngå trykkstøt og støy.'
    );
    return L.join('\n');
  }, [prosjektObj, rader, beregnet, ugunstigst, sum, maksHastighet, alleHastigheterOk]);

  return (
    <div className="space-y-6">
      {/* Universell eksport- og rapportlinje */}
      <GlobalRapportBar
        tittel="Koblingsledninger & Ugunstigste Krets"
        undertittel={`Ugunstigste krets: ${beregnet[ugunstigst]?.navn ?? '–'} (${fmt(beregnet[ugunstigst]?.kretsTap ?? 0, 1)} kPa) · Maks v = ${fmt(maksHastighet, 2)} m/s`}
        standard="SINTEF Byggforsk 553.102 · TEK17 § 15-5"
        ikon="🚿"
        statusBadge={{
          tekst: alleHastigheterOk ? '✅ Hastighet OK (≤ 2,5 m/s)' : '🚨 Høy hastighet (> 2,5 m/s)',
          tone: alleHastigheterOk ? 'ok' : 'feil',
        }}
        onApneRapport={() => setVisRapport(true)}
        onKopier={async () => {
          const ok = await kopierTilUtklippstavle(markdownTekst);
          melding(ok ? '📋 Koblingsledningsrapport kopiert til utklippstavlen' : 'Kunne ikke kopiere');
        }}
        onLastNedMd={() => {
          const filnavn = `${prosjektObj.navn
            .toLowerCase()
            .replace(/[^a-z0-9æøå]+/gi, '-')
            .replace(/^-|-$/g, '')}-koblingsledninger.md`;
          lastNedTekst(filnavn, markdownTekst);
          melding('📥 Markdown lastet ned for NotebookLM / KI!');
        }}
        ekstraKnapper={
          <Knapp
            onClick={() =>
              setRader((r) => [
                ...r,
                { navn: `tappested ${r.length + 1}`, sumQn: 0, qn1: 0, qkont: 0.1, dim: 15, l: 1, armaturTap: 50 },
              ])
            }
          >
            + Legg til tappested
          </Knapp>
        }
      />

      <Kort tittel="Koblingsledninger & ugunstigste krets" ikon="🚿">
        <p className="mb-3 text-xs text-slate-400">
          Trykkfall i krets = R·l + trykkfall i armatur. Kretsen med høyest trykkfall er ugunstigste krets. Samme formler og
          rørtabell som fordelingsledningen.
        </p>
        <div className="overflow-x-auto rounded-lg border border-slate-700">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-900 text-[11px] uppercase tracking-wider text-slate-300">
                {['Tappested', 'ΣqN', 'qN1', 'qkont', 'qdim', 'Dim (mm)', 'v (m/s)', 'R (kPa/m)', 'l (m)', 'R·l (kPa)', 'Armatur (kPa)', 'Krets (kPa)', ''].map((h) => (
                  <th key={h} className="px-2 py-2.5 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {beregnet.map((b, i) => (
                <tr key={i} className={i === ugunstigst ? 'bg-amber-950/30' : 'hover:bg-slate-700/30'}>
                  <td className="px-2 py-1.5">
                    <input value={rader[i].navn} onChange={(e) => oppdater(i, { navn: e.target.value })} className="w-32 min-h-[40px] rounded-lg border border-slate-600 bg-slate-900 px-2.5 py-1.5 font-semibold text-xs outline-none focus:border-emerald-500" />
                  </td>
                  <td className="px-1 py-1.5"><TallFelt className="w-16" ariaLabel="ΣqN" verdi={rader[i].sumQn} onChange={(n) => oppdater(i, { sumQn: n })} /></td>
                  <td className="px-1 py-1.5"><TallFelt className="w-16" ariaLabel="qN1" verdi={rader[i].qn1} onChange={(n) => oppdater(i, { qn1: n })} /></td>
                  <td className="px-1 py-1.5"><TallFelt className="w-16" ariaLabel="qkont" verdi={rader[i].qkont} onChange={(n) => oppdater(i, { qkont: n })} /></td>
                  <td className="bg-slate-900/50 px-2 py-1.5 text-right font-mono font-bold">{fmt(b.qdim, 3)}</td>
                  <td className="px-1 py-1.5 text-center">
                    <select value={rader[i].dim} onChange={(e) => oppdater(i, { dim: Number(e.target.value) })} className="min-h-[40px] rounded-lg border border-slate-600 bg-slate-900 px-2.5 py-1.5 font-bold text-xs outline-none focus:border-emerald-500">
                      {ROR_TABELL.map((r) => <option key={r.dim} value={r.dim}>{r.dim}</option>)}
                    </select>
                  </td>
                  <td className="bg-slate-900/50 px-2 py-1.5 text-right font-mono">{fmt(b.hastighet)}</td>
                  <td className="bg-slate-900/50 px-2 py-1.5 text-right font-mono text-slate-300">{fmt(b.R, 3)}</td>
                  <td className="px-1 py-1.5"><TallFelt className="w-16" ariaLabel="l" verdi={rader[i].l} onChange={(n) => oppdater(i, { l: n })} /></td>
                  <td className="bg-slate-900/50 px-2 py-1.5 text-right font-mono">{fmt(b.rxl)}</td>
                  <td className="px-1 py-1.5"><TallFelt className="w-20" ariaLabel="Armaturtrykkfall" verdi={rader[i].armaturTap} onChange={(n) => oppdater(i, { armaturTap: n })} /></td>
                  <td className="bg-slate-900/50 px-2 py-1.5 text-right font-mono font-extrabold">
                    {fmt(b.kretsTap)} {i === ugunstigst && <Merkelapp type="advarsel">ugunstigste</Merkelapp>}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <button
                      type="button"
                      aria-label={`Slett ${rader[i].navn}`}
                      title="Slett tappested (krever bekreftelse)"
                      onClick={() =>
                        bekreftSlett({
                          tittel: 'Slette tappested / koblingsledning?',
                          elementNavn: `${rader[i].navn} (${rader[i].dim} mm)`,
                          beskrivelse: `Er du sikker på at du vil slette tappestedet «${rader[i].navn}» fra koblingsledningstabellen?`,
                          bekreftTekst: '🗑️ Slett tappested',
                          onBekreft: () => setRader((r) => r.filter((_, idx) => idx !== i)),
                        })
                      }
                      className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-400 hover:bg-rose-950/50 hover:text-rose-400"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Knapp onClick={() => setRader((r) => [...r, { navn: `tappested ${r.length + 1}`, sumQn: 0, qn1: 0, qkont: 0.1, dim: 15, l: 1, armaturTap: 50 }])}>+ Legg til tappested</Knapp>
        </div>
        {ugunstigst >= 0 && (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Resultat etikett="Ugunstigste krets" verdi={beregnet[ugunstigst].navn} />
            <Resultat etikett="Trykkfall i ugunstigste krets" verdi={fmt(beregnet[ugunstigst].kretsTap)} enhet="kPa" tone="ok" />
            <Resultat etikett="Σ R·l alle koblingsledninger" verdi={fmt(sum.rxl)} enhet="kPa" />
          </div>
        )}
      </Kort>

      {/* Visuell A4 PDF-rapport modal */}
      <FagRapportModal
        aapen={visRapport}
        onLukk={() => setVisRapport(false)}
        prosjekt={prosjektObj}
        tittel="Koblingsledninger & Ugunstigste Krets"
        undertittel="Dimensjonering av koblingsledninger iht. SINTEF Byggforsk 553.102 og TEK17 § 15-5"
        standardTekst="SINTEF Byggforsk 553.102 · TEK17 § 15-5"
        ikon="🚿"
        nokkeltall={[
          {
            etikett: 'Ugunstigste krets',
            verdi: `${beregnet[ugunstigst]?.navn ?? '–'} (${fmt(beregnet[ugunstigst]?.kretsTap ?? 0, 1)} kPa)`,
            tone: 'ok',
          },
          {
            etikett: 'Maks vannhastighet',
            verdi: `${fmt(maksHastighet, 2)} m/s`,
            enhet: 'Krav ≤ 2,5 m/s',
            tone: alleHastigheterOk ? 'ok' : 'feil',
          },
          {
            etikett: 'Antall tappesteder',
            verdi: `${rader.length}`,
            enhet: 'stk',
          },
          {
            etikett: 'Total rørlengde',
            verdi: fmt(sum.lengde, 1),
            enhet: 'm',
          },
          {
            etikett: 'Samlet friksjonstap Σ R·l',
            verdi: fmt(sum.rxl, 1),
            enhet: 'kPa',
          },
        ]}
        seksjoner={[
          {
            tittel: 'Dimensjoneringstabell for koblingsledninger',
            tabell: {
              kolonner: [
                'Tappested',
                'q_dim (l/s)',
                'Dim (mm)',
                'v (m/s)',
                'R (kPa/m)',
                'l (m)',
                'R·l (kPa)',
                'Armatur (kPa)',
                'Krets (kPa)',
                'Status',
              ],
              rader: beregnet.map((b, i) => [
                `${b.navn}${i === ugunstigst ? ' ★ (Ugunstigst)' : ''}`,
                fmt(b.qdim, 3),
                `DN ${b.dim}`,
                fmt(b.hastighet),
                fmt(b.R, 3),
                fmt(b.l, 1),
                fmt(b.rxl),
                fmt(b.armaturTap, 0),
                fmt(b.kretsTap),
                b.hastighet <= 2.5 ? '✓ OK' : '🚨 HØY HASTIGHET',
              ]),
            },
          },
        ]}
        konklusjon={{
          ok: alleHastigheterOk,
          tittel: alleHastigheterOk
            ? 'GODKJENT KOBLINGSLEDNINGSNETT (TEK17 § 15-5)'
            : 'UNDERDIMENSJONERT KOBLINGSLEDNING – HØY VANNHASTIGHET',
          tekst: `Ugunstigste krets er identifisert til «${beregnet[ugunstigst]?.navn}» med et samlet trykktap på ${fmt(
            beregnet[ugunstigst]?.kretsTap,
            1
          )} kPa (inkludert ${fmt(beregnet[ugunstigst]?.armaturTap, 0)} kPa i armatur). Maksimal beregnet vannhastighet i nettet er ${fmt(
            maksHastighet,
            2
          )} m/s mot normkravet på maksimalt 2,5 m/s i koblingsledninger.`,
        }}
        markdownTekst={markdownTekst}
        filnavnBase="koblingsledninger-rapport"
        rolleTittel="Rådgivende Ingeniør VVS (RIV) & Rørleggermester"
        melding={melding}
      />
    </div>
  );
}
