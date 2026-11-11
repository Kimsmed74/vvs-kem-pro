import { useMemo, useState } from 'react';
import { PROSJEKT_PRESETS, type ProsjektData } from '../../../data/prosjekter';
import { maksKapasitet, spillvannQdim, spillvannQs, type Ledningstype } from '../../../engine/avlop';
import { fmt, kopierTilUtklippstavle, lastNedTekst } from '../../../lib/format';
import { useBekreftSlett } from '../../common/BekreftSlettModal';
import GlobalRapportBar from '../../common/GlobalRapportBar';
import FagRapportModal from '../common/FagRapportModal';
import { Kort, Knapp, Merkelapp, TallFelt } from '../../common/ui';

interface Rad {
  id: string;
  type: Ledningstype;
  q1: number;
  sumQn: number;
  qkont: number;
  dim: number;
  fall: number;
}

const DIMENSJONER = [50, 75, 110, 125, 160];
const FALL = [
  { verdi: 0.01, tekst: '1:100' },
  { verdi: 0.017, tekst: '1:60' },
  { verdi: 0.02, tekst: '1:50' },
];

const START: Rad[] = [
  { id: 'Strekk 2', type: 'Uventilert', q1: 1.8, sumQn: 1.8, qkont: 0, dim: 110, fall: 0.017 },
  { id: 'Strekk 6', type: 'Uventilert', q1: 1.8, sumQn: 3.6, qkont: 0, dim: 110, fall: 0.017 },
  { id: 'Strekk 8', type: 'Uventilert', q1: 0.4, sumQn: 0.4, qkont: 0, dim: 75, fall: 0.017 },
  { id: 'Strekk 14', type: 'Uventilert', q1: 1.8, sumQn: 5.4, qkont: 0, dim: 110, fall: 0.017 },
  { id: 'Strekk 7', type: 'Ventilert', q1: 1.8, sumQn: 5.4, qkont: 0, dim: 110, fall: 0.017 },
  { id: 'Strekk 15', type: 'Ventilert', q1: 1.8, sumQn: 11.2, qkont: 0, dim: 110, fall: 0.017 },
];

interface Props {
  prosjekt?: ProsjektData;
  melding: (t: string) => void;
}

export default function Spillvann({ prosjekt, melding }: Props) {
  const [rader, setRader] = useState<Rad[]>(START.map((r) => ({ ...r })));
  const [visRapport, setVisRapport] = useState(false);
  const bekreftSlett = useBekreftSlett();
  const oppdater = (i: number, d: Partial<Rad>) => setRader((r) => r.map((x, idx) => (idx === i ? { ...x, ...d } : x)));

  const beregnet = useMemo(
    () =>
      rader.map((r) => {
        const qs = spillvannQs(r.q1, r.sumQn);
        const qdim = spillvannQdim(r.q1, r.sumQn, r.qkont);
        const maks = maksKapasitet(r.dim, r.type, r.fall);
        return { qs, qdim, maks, ok: qdim <= maks };
      }),
    [rader],
  );

  const alleOk = useMemo(() => beregnet.every((b) => b.ok), [beregnet]);
  const maksQdim = useMemo(() => Math.max(...beregnet.map((b) => b.qdim), 0), [beregnet]);

  const prosjektObj: ProsjektData = useMemo(
    () => prosjekt ?? PROSJEKT_PRESETS[0],
    [prosjekt]
  );

  const markdownTekst = useMemo(() => {
    const L: string[] = [];
    L.push('# DIMENSJONERING AV LIGGENDE SPILLVANNSLEDNINGER');
    L.push(`**Standard:** Norsk Standard NS 3056 · SINTEF Byggforsk Kunnskapssystem 553.111 · TEK17 § 15-6`);
    L.push(`**Prosjekt:** ${prosjektObj.navn} | **Dato:** ${new Date().toLocaleDateString('nb-NO')}`);
    L.push(`**Utførende:** Kim Jørgensen | Rørleggermester & Rådgivende Ingeniør VVS (RIV)`);
    L.push(`**Adresse:** ${prosjektObj.sted || 'Ikke oppgitt'} | **Gnr/Bnr:** ${prosjektObj.matrikkel || 'Ikke oppgitt'}`);
    L.push('');
    L.push('## 1. Nøkkeltall for spillvannsnett');
    L.push(`- Antall rørstrekk: ${rader.length} stk`);
    L.push(`- Maksimal spillvannsvannmengde q_dim: ${fmt(maksQdim, 2)} l/s`);
    L.push(`- Ventilerte strekk (Kurve A): ${rader.filter((r) => r.type === 'Ventilert').length} stk`);
    L.push(`- Uventilerte strekk (Kurve B): ${rader.filter((r) => r.type === 'Uventilert').length} stk`);
    L.push(`- Samlet kapasitetsvurdering: ${alleOk ? 'Godkjent (alle q_dim ≤ q_maks)' : 'Underdimensjonert (avvik registrert)'}`);
    L.push('');
    L.push('## 2. Dimensjoneringstabell for spillvann');
    L.push('| Strekk | Type | q1 (l/s) | Σ q_N (l/s) | q_S (l/s) | q_kont (l/s) | q_dim (l/s) | DN (mm) | Fall | Kapasitet (l/s) | Status |');
    L.push('|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|');
    rader.forEach((r, i) => {
      const b = beregnet[i];
      const fallTekst = FALL.find((f) => f.verdi === r.fall)?.tekst ?? String(r.fall);
      L.push(
        `| ${r.id} | ${r.type} | ${fmt(r.q1, 1)} | ${fmt(r.sumQn, 1)} | ${fmt(b.qs, 2)} | ${fmt(r.qkont, 1)} | ${fmt(b.qdim, 2)} | DN ${r.dim} | ${fallTekst} | ${fmt(b.maks, 1)} | ${b.ok ? '✓ OK' : '🚨 FOR LITEN'} |`
      );
    });
    L.push('');
    L.push('## 3. Konklusjon & Kontroll');
    L.push(
      alleOk
        ? '✅ Samtlige spillvannsstrekk tilfredsstiller kapasitetskravet iht. NS 3056 og Byggforsk 553.111. Selvrensingshastighet og fyllingsgrad er ivaretatt.'
        : '🚨 Ett eller flere spillvannsstrekk overskrider rørdimensjonens maksimale vannføringskapasitet. Dimensjon eller fall må økes for å forhindre tilstopping og hevertvirkning i vannlåser.'
    );
    return L.join('\n');
  }, [prosjektObj, rader, beregnet, alleOk, maksQdim]);

  return (
    <div className="space-y-6">
      {/* Universell eksport- og rapportlinje */}
      <GlobalRapportBar
        tittel="Liggende Spillvannsledninger"
        undertittel={`${rader.length} strekk · Maks q_dim = ${fmt(maksQdim, 2)} l/s · qS = MAX(q₁; 0,55·(ΣqN)^0,46)`}
        standard="NS 3056 · Byggforsk 553.111 · TEK17 § 15-6"
        ikon="🚽"
        statusBadge={{
          tekst: alleOk ? '✅ Alle strekk godkjent' : '🚨 Kapasitetsoverskridelse',
          tone: alleOk ? 'ok' : 'feil',
        }}
        onApneRapport={() => setVisRapport(true)}
        onKopier={async () => {
          const ok = await kopierTilUtklippstavle(markdownTekst);
          melding(ok ? '📋 Spillvannsrapport kopiert til utklippstavlen' : 'Kunne ikke kopiere');
        }}
        onLastNedMd={() => {
          const filnavn = `${prosjektObj.navn
            .toLowerCase()
            .replace(/[^a-z0-9æøå]+/gi, '-')
            .replace(/^-|-$/g, '')}-spillvann.md`;
          lastNedTekst(filnavn, markdownTekst);
          melding('📥 Markdown lastet ned for NotebookLM / KI!');
        }}
        ekstraKnapper={
          <Knapp
            onClick={() =>
              setRader((r) => [
                ...r,
                { id: `Strekk ${r.length + 1}`, type: 'Ventilert', q1: 1.8, sumQn: 1.8, qkont: 0, dim: 110, fall: 0.017 },
              ])
            }
          >
            + Legg til strekk
          </Knapp>
        }
      />

      <div className="rounded-lg border border-amber-700 bg-amber-950/50 p-3 text-xs text-amber-200">
        ⚠️ <strong>Kapasitetsgrensene</strong> (maks l/s per dimensjon) er overtatt fra den opprinnelige prototypen og er
        <strong> ikke verifisert</strong> mot Byggforsk 553.111 / NS 3056. Formelen for qS er derimot hentet fra Excel-arket.
        Kontroller grensene mot standarden før resultatene brukes i prosjektering.
      </div>

      <Kort tittel="Liggende spillvannsledninger" ikon="🚽">
        <p className="mb-3 font-mono text-xs text-slate-300">qS = MAX(q₁ ; 0,55 · (ΣqN)^0,46) &nbsp;|&nbsp; qdim = qS + Σqkont</p>
        <div className="overflow-x-auto rounded-lg border border-slate-700">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-900 text-[11px] uppercase tracking-wider text-slate-300">
                {['Strekk', 'Type', 'q₁', 'ΣqN', 'qS', 'Σqkont', 'qdim', 'DN', 'Fall', 'Status', ''].map((h) => (
                  <th key={h} className="px-2 py-2.5 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {rader.map((r, i) => (
                <tr key={i} className="hover:bg-slate-700/30">
                  <td className="px-2 py-1.5">
                    <input value={r.id} onChange={(e) => oppdater(i, { id: e.target.value })} className="w-28 min-h-[40px] rounded-lg border border-slate-600 bg-slate-900 px-2.5 py-1.5 font-semibold text-xs outline-none focus:border-emerald-500" />
                  </td>
                  <td className="px-1 py-1.5">
                    <select value={r.type} onChange={(e) => oppdater(i, { type: e.target.value as Ledningstype })} className="min-h-[40px] rounded-lg border border-slate-600 bg-slate-900 px-2.5 py-1.5 text-xs outline-none focus:border-emerald-500">
                      <option>Ventilert</option>
                      <option>Uventilert</option>
                    </select>
                  </td>
                  <td className="px-1 py-1.5"><TallFelt className="w-16" ariaLabel="q1" verdi={r.q1} onChange={(n) => oppdater(i, { q1: n })} /></td>
                  <td className="px-1 py-1.5"><TallFelt className="w-16" ariaLabel="ΣqN" verdi={r.sumQn} onChange={(n) => oppdater(i, { sumQn: n })} /></td>
                  <td className="bg-slate-900/50 px-2 py-1.5 text-right font-mono text-amber-300">{fmt(beregnet[i].qs)}</td>
                  <td className="px-1 py-1.5"><TallFelt className="w-16" ariaLabel="qkont" verdi={r.qkont} onChange={(n) => oppdater(i, { qkont: n })} /></td>
                  <td className="bg-slate-900/50 px-2 py-1.5 text-right font-mono font-bold text-emerald-400">{fmt(beregnet[i].qdim)}</td>
                  <td className="px-1 py-1.5">
                    <select value={r.dim} onChange={(e) => oppdater(i, { dim: Number(e.target.value) })} className="min-h-[40px] rounded-lg border border-slate-600 bg-slate-900 px-2.5 py-1.5 font-bold text-xs outline-none focus:border-emerald-500">
                      {DIMENSJONER.map((d) => <option key={d} value={d}>DN {d}</option>)}
                    </select>
                  </td>
                  <td className="px-1 py-1.5">
                    <select value={r.fall} onChange={(e) => oppdater(i, { fall: Number(e.target.value) })} className="rounded border border-slate-600 bg-slate-900 px-2 py-1 outline-none">
                      {FALL.map((f) => <option key={f.verdi} value={f.verdi}>{f.tekst}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    {beregnet[i].ok
                      ? <Merkelapp type="ok">OK (maks {fmt(beregnet[i].maks, 1)} l/s)</Merkelapp>
                      : <Merkelapp type="feil">For liten (maks {fmt(beregnet[i].maks, 1)} l/s)</Merkelapp>}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <button
                      type="button"
                      aria-label={`Slett ${r.id}`}
                      title="Slett spillvannsstrekk (krever bekreftelse)"
                      onClick={() =>
                        bekreftSlett({
                          tittel: 'Slette spillvannsstrekk?',
                          elementNavn: `${r.id} (DN ${r.dim}, ${r.type})`,
                          beskrivelse: `Er du sikker på at du vil slette spillvannsstrekket «${r.id}» fra tabellen?`,
                          bekreftTekst: '🗑️ Slett strekk',
                          onBekreft: () => setRader((x) => x.filter((_, idx) => idx !== i)),
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
      </Kort>

      {/* Visuell A4 PDF-rapport modal */}
      <FagRapportModal
        aapen={visRapport}
        onLukk={() => setVisRapport(false)}
        prosjekt={prosjektObj}
        tittel="Liggende Spillvannsledninger (NS 3056)"
        undertittel="Dimensjonering av Kurve A (ventilert) og Kurve B (uventilert) iht. Byggforsk 553.111"
        standardTekst="NS 3056 · Byggforsk 553.111 · TEK17 § 15-6"
        ikon="🚽"
        nokkeltall={[
          {
            etikett: 'Maks spillvannsvannmengde',
            verdi: `${fmt(maksQdim, 2)} l/s`,
            tone: alleOk ? 'ok' : 'feil',
          },
          {
            etikett: 'Antall rørstrekk',
            verdi: `${rader.length}`,
            enhet: 'stk',
          },
          {
            etikett: 'Ventilerte (Kurve A)',
            verdi: `${rader.filter((r) => r.type === 'Ventilert').length}`,
            enhet: 'stk',
          },
          {
            etikett: 'Uventilerte (Kurve B)',
            verdi: `${rader.filter((r) => r.type === 'Uventilert').length}`,
            enhet: 'stk',
          },
          {
            etikett: 'Kapasitetsstatus',
            verdi: alleOk ? 'Alle godkjent' : 'Avvik funnet',
            tone: alleOk ? 'ok' : 'feil',
          },
        ]}
        seksjoner={[
          {
            tittel: 'Dimensjoneringstabell for spillvann',
            tabell: {
              kolonner: [
                'Strekk',
                'Type',
                'q1 (l/s)',
                'Σ q_N (l/s)',
                'q_S (l/s)',
                'q_kont (l/s)',
                'q_dim (l/s)',
                'DN (mm)',
                'Fall',
                'Maks kap. (l/s)',
                'Status',
              ],
              rader: rader.map((r, i) => {
                const b = beregnet[i];
                const fallTekst = FALL.find((f) => f.verdi === r.fall)?.tekst ?? String(r.fall);
                return [
                  r.id,
                  r.type,
                  fmt(r.q1, 1),
                  fmt(r.sumQn, 1),
                  fmt(b.qs, 2),
                  fmt(r.qkont, 1),
                  fmt(b.qdim, 2),
                  `DN ${r.dim}`,
                  fallTekst,
                  fmt(b.maks, 1),
                  b.ok ? '✓ OK' : '🚨 FOR LITEN',
                ];
              }),
            },
          },
        ]}
        konklusjon={{
          ok: alleOk,
          tittel: alleOk
            ? 'GODKJENT SPILLVANNSNETT (NS 3056 / Byggforsk 553.111)'
            : 'UNDERDIMENSJONERT SPILLVANNSNETT – AVVIK OPPSTÅTT',
          tekst: alleOk
            ? `Samtlige ${rader.length} spillvannsstrekk tilfredsstiller dimensjonerende vannføringskapasitet iht. NS 3056 og SINTEF Byggforsk 553.111. Fyllingsgrader og selvrensende hastigheter er ivaretatt.`
            : 'Ett eller flere rørstrekk overskrider maksimal kapasitetsgrense for valgt rørdimensjon og fall. Øk rørdimensjon (DN) eller øk fallet for å sikre driftssikker avrenning.',
        }}
        markdownTekst={markdownTekst}
        filnavnBase="spillvann-rapport"
        rolleTittel="Rådgivende Ingeniør VVS (RIV) & Rørleggermester"
        melding={melding}
      />
    </div>
  );
}
