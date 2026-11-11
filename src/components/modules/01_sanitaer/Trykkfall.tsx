import { useEffect, useMemo, useRef, useState } from 'react';
import type { ProsjektData } from '../../../data/prosjekter';
import {
  EKSEMPEL_BUDSJETT,
  EKSEMPEL_FORDELING,
  MAKS_HASTIGHET_FORDELING,
  ROR_TABELL,
  autoDimensjon,
  beregnStrekk,
  beregnTrykkbudsjett,
  sumStrekk,
  type Strekk,
  type Trykkbudsjett,
} from '../../../engine/sanitaer';
import type { ProsjektAnalyse } from '../../../lib/analyse';
import { fmt, kopierTilUtklippstavle, lastNedTekst } from '../../../lib/format';
import { genererTrykkfallMarkdown } from '../../../lib/rapportMarkdown';
import { useBekreftSlett } from '../../common/BekreftSlettModal';
import { Kort, Knapp, Merkelapp, Resultat, TallFelt } from '../../common/ui';
import GlobalRapportBar from '../../common/GlobalRapportBar';
import TrykkfallRapportModal from './TrykkfallRapportModal';

const FELT: { nokkel: keyof Trykkbudsjett; etikett: string; enhet: string }[] = [
  { nokkel: 'hovedtrykk', etikett: 'Trykk i hovedledning (p₀)', enhet: 'kPa' },
  { nokkel: 'resttrykk', etikett: 'Nødv. resttrykk før armatur', enhet: 'kPa' },
  { nokkel: 'loftehoyde', etikett: 'Løftehøyde', enhet: 'm' },
  { nokkel: 'enkeltmotstand', etikett: 'Større enkeltmotstand', enhet: 'kPa' },
  { nokkel: 'rordelerProsent', etikett: 'Avsatt til rørdeler', enhet: '%' },
];

export default function Trykkfall({
  melding,
  startVerdi,
  prosjektNavn,
  prosjektData,
  analyse,
  onOppdaterProsjekt,
  onEndring,
}: {
  melding: (t: string) => void;
  startVerdi?: { budsjett: Trykkbudsjett; rader: Strekk[]; tittel?: string };
  prosjektNavn?: string;
  prosjektData?: ProsjektData;
  analyse?: ProsjektAnalyse;
  onOppdaterProsjekt?: (p: ProsjektData) => void;
  onEndring?: (verdi: { budsjett: Trykkbudsjett; rader: Strekk[]; tittel?: string }) => void;
}) {
  const globaltTrykkKpa =
    prosjektData?.vanntrykk.dynamiskBar !== null && prosjektData?.vanntrykk.dynamiskBar !== undefined
      ? Math.round(prosjektData.vanntrykk.dynamiskBar * 100)
      : prosjektData?.vanntrykk.statiskBar !== null && prosjektData?.vanntrykk.statiskBar !== undefined
      ? Math.round(prosjektData.vanntrykk.statiskBar * 100)
      : null;

  const globalLoftehoydeM = analyse?.hydrostatisk.geodetiskLoftehoydeM ?? null;

  const [budsjett, setBudsjettState] = useState<Trykkbudsjett>(() => ({
    ...(startVerdi?.budsjett ?? {
      ...EKSEMPEL_BUDSJETT,
      ...(globaltTrykkKpa !== null ? { hovedtrykk: globaltTrykkKpa } : {}),
      ...(globalLoftehoydeM !== null ? { loftehoyde: globalLoftehoydeM } : {}),
    }),
  }));
  const [rader, setRaderState] = useState<Strekk[]>(() =>
    (startVerdi?.rader ?? EKSEMPEL_FORDELING).map((r) => ({ ...r }))
  );
  const [prosjekt, setProsjektState] = useState(
    startVerdi?.tittel ?? (prosjektNavn ? `${prosjektNavn} – trykkfallsberegning` : 'Sanitæranlegg – trykkfallsberegning')
  );
  const [visRapportModal, setVisRapportModal] = useState<boolean>(false);
  const bekreftSlett = useBekreftSlett();
  const forrigeGlobalRef = useRef<{ trykk: number | null; hoyde: number | null }>({
    trykk: globaltTrykkKpa,
    hoyde: globalLoftehoydeM,
  });

  // Synkroniser automatisk når globalt vanntrykk eller løftehøyde fra Steg 1 endres etter montering
  useEffect(() => {
    const prev = forrigeGlobalRef.current;
    const trykkEndret = globaltTrykkKpa !== null && globaltTrykkKpa !== prev.trykk;
    const hoydeEndret = globalLoftehoydeM !== null && globalLoftehoydeM !== prev.hoyde;
    forrigeGlobalRef.current = { trykk: globaltTrykkKpa, hoyde: globalLoftehoydeM };

    if (!trykkEndret && !hoydeEndret) return;
    setBudsjettState((forrige) => ({
      ...forrige,
      ...(trykkEndret && globaltTrykkKpa !== null ? { hovedtrykk: globaltTrykkKpa } : {}),
      ...(hoydeEndret && globalLoftehoydeM !== null ? { loftehoyde: globalLoftehoydeM } : {}),
    }));
  }, [globaltTrykkKpa, globalLoftehoydeM]);

  const setBudsjett = (
    oppdater: Trykkbudsjett | ((forrige: Trykkbudsjett) => Trykkbudsjett)
  ) => {
    const neste = typeof oppdater === 'function' ? oppdater(budsjett) : oppdater;
    setBudsjettState(neste);
    onEndring?.({ budsjett: neste, rader, tittel: prosjekt });
  };

  const setRader = (oppdater: Strekk[] | ((forrige: Strekk[]) => Strekk[])) => {
    const neste = typeof oppdater === 'function' ? oppdater(rader) : oppdater;
    setRaderState(neste);
    onEndring?.({ budsjett, rader: neste, tittel: prosjekt });
  };

  const tilbakestillAlt = () => {
    const nesteBudsjett = { ...EKSEMPEL_BUDSJETT };
    const nesteRader = EKSEMPEL_FORDELING.map((r) => ({ ...r }));
    setBudsjettState(nesteBudsjett);
    setRaderState(nesteRader);
    onEndring?.({ budsjett: nesteBudsjett, rader: nesteRader, tittel: prosjekt });
  };

  const setProsjekt = (nyTittel: string) => {
    setProsjektState(nyTittel);
    onEndring?.({ budsjett, rader, tittel: nyTittel });
  };

  const beregnet = useMemo(() => rader.map(beregnStrekk), [rader]);
  const sum = useMemo(() => sumStrekk(beregnet), [beregnet]);
  // Rørlengden i budsjettet følger summen av strekklengdene, som i prototypen.
  const bud = useMemo(() => beregnTrykkbudsjett({ ...budsjett, rorlengde: sum.lengde }), [budsjett, sum.lengde]);
  const margin = bud.dispFriksjon - sum.rxl;
  const ok = margin >= 0;
  const bruktProsent = bud.dispFriksjon > 0 ? (sum.rxl / bud.dispFriksjon) * 100 : 0;

  const oppdater = (i: number, delvis: Partial<Strekk>) =>
    setRader((r) => r.map((x, idx) => (idx === i ? { ...x, ...delvis } : x)));

  const rapport = useMemo(() => {
    return genererTrykkfallMarkdown({
      prosjektTittel: prosjekt,
      prosjektData,
      budsjett,
      bud,
      beregnet,
      sum,
      margin,
      ok,
    });
  }, [prosjekt, prosjektData, budsjett, bud, beregnet, sum, margin, ok]);

  return (
    <div className="space-y-6">
      {/* Universell eksport- og rapportlinje */}
      <GlobalRapportBar
        tittel="Sanitær Trykkfallsberegning"
        undertittel={`Fordelingsledning (${rader.length} strekk) · Σ R·l = ${fmt(sum.rxl)} kPa av disp. ${fmt(bud.dispFriksjon)} kPa`}
        standard="SINTEF Byggforsk 553.102 · TEK17 § 15-5"
        ikon="💧"
        statusBadge={{
          tekst: ok ? `✅ Godkjent (${fmt(margin)} kPa margin)` : `🚨 Avvik (${fmt(margin)} kPa mangler)`,
          tone: ok ? 'ok' : 'feil',
        }}
        onApneRapport={() => setVisRapportModal(true)}
        onKopier={async () => {
          const kopiert = await kopierTilUtklippstavle(rapport);
          melding(kopiert ? '📋 Markdown-rapport kopiert til utklippstavlen' : 'Kunne ikke kopiere');
        }}
        onLastNedMd={() => {
          const filnavn = `${prosjekt
            .toLowerCase()
            .replace(/[^a-z0-9æøå]+/gi, '-')
            .replace(/^-|-$/g, '')}-trykkfall-rapport.md`;
          lastNedTekst(filnavn, rapport);
          melding('📥 Markdown-rapport lastet ned for NotebookLM / KI!');
        }}
        ekstraKnapper={
          <Knapp
            variant="sekundar"
            onClick={() =>
              bekreftSlett({
                tittel: 'Tilbakestille trykkfallstabellen?',
                elementNavn: `Trykkfallsberegning (${rader.length} strekk)`,
                beskrivelse:
                  'Er du sikker på at du vil slette nåværende tall i tabellen og tilbakestille til standard Excel-eksempelet?',
                bekreftTekst: '🔄 Bekreft tilbakestilling',
                onBekreft: () => {
                  tilbakestillAlt();
                  melding('Tilbakestilt til Excel-eksempelet');
                },
              })
            }
          >
            🔄 Tilbakestill
          </Knapp>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex flex-1 items-center gap-3 text-xs font-bold uppercase tracking-wider text-slate-400">
          Prosjekt
          <input
            value={prosjekt}
            onChange={(e) => setProsjekt(e.target.value)}
            className="w-full max-w-md rounded-lg border border-slate-600 bg-slate-900 px-3 py-1.5 text-sm font-semibold normal-case tracking-normal text-slate-100 outline-none focus:border-emerald-500"
          />
        </label>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <Kort tittel="1. Forutsetninger & trykkbudsjett" ikon="⚙️" className="lg:col-span-5">
          <div className="space-y-3">
            {FELT.map((f) => (
              <label key={f.nokkel} className="grid grid-cols-12 items-center gap-2 text-xs font-semibold text-slate-300">
                <span className="col-span-7">{f.etikett}</span>
                <TallFelt
                  className="col-span-5"
                  ariaLabel={f.etikett}
                  verdi={budsjett[f.nokkel]}
                  enhet={f.enhet}
                  onChange={(n) => {
                    setBudsjett((b) => ({ ...b, [f.nokkel]: n }));
                    if (f.nokkel === 'hovedtrykk' && prosjektData && onOppdaterProsjekt) {
                      const bar = Math.round((n / 100) * 100) / 100;
                      const oppdaterDynamisk = prosjektData.vanntrykk.dynamiskBar !== null;
                      onOppdaterProsjekt({
                        ...prosjektData,
                        kilde: 'bruker',
                        vanntrykk: {
                          ...prosjektData.vanntrykk,
                          ...(oppdaterDynamisk ? { dynamiskBar: bar } : { statiskBar: bar }),
                          antatt: false,
                        },
                      });
                    }
                  }}
                />
              </label>
            ))}
          </div>
          {budsjett.hovedtrykk > 600 && (
            <div className="mt-3 rounded-lg border border-rose-500 bg-rose-950/60 p-2.5 text-xs text-rose-200">
              <div className="font-bold">
                🚨 Hovedtrykk ({fmt(budsjett.hovedtrykk, 0)} kPa = {fmt(budsjett.hovedtrykk / 100, 2)} bar) &gt; 6,0 bar!
              </div>
              <p className="mt-0.5 text-[11px]">
                Krav om trykkreduksjonsventil (TEK17 § 15-5 / NS-EN 806-2).
              </p>
              <button
                type="button"
                onClick={() => {
                  setBudsjett((b) => ({ ...b, hovedtrykk: 400 }));
                  melding('Satte hovedtrykk etter trykkreduksjonsventil til 400 kPa (4,0 bar)');
                }}
                className="mt-2 inline-flex min-h-[40px] items-center rounded bg-rose-700 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-rose-600"
              >
                🔧 Sett til 400 kPa (4,0 bar etter reduksjonsventil)
              </button>
            </div>
          )}
          <p className="mt-4 border-t border-slate-700 pt-3 text-xs text-slate-400">
            Total rørlengde (Σ l): <strong className="font-mono text-slate-100">{fmt(sum.lengde, 1)} m</strong>
            {globaltTrykkKpa !== null && (
              <span className="ml-2 text-emerald-300">
                (🌐 Synkronisert med Steg 1: {fmt(globaltTrykkKpa, 0)} kPa)
              </span>
            )}
          </p>
        </Kort>

        <Kort tittel="2. Disponibelt trykk & kontroll" ikon="📊" className="lg:col-span-7">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Resultat etikett="Disp. friksjon + enkeltm." verdi={fmt(bud.dispFriksjonOgEnkelt)} enhet="kPa" />
            <Resultat etikett="Disponibelt til friksjon" verdi={fmt(bud.dispFriksjon)} enhet="kPa" />
            <Resultat etikett="Midlere rørfriksjon" verdi={fmt(bud.midlereR, 3)} enhet="kPa/m" />
            <Resultat etikett="KONTROLL Σ R·l" verdi={fmt(sum.rxl)} enhet="kPa" tone={ok ? 'ok' : 'feil'} />
          </div>
          <div className="mt-4 flex items-center gap-2">
            {ok ? (
              <Merkelapp type="ok">✅ OK – margin {fmt(margin)} kPa til gode</Merkelapp>
            ) : (
              <Merkelapp type="feil">⚠️ Trykkfallet overstiger disponibelt med {fmt(-margin)} kPa</Merkelapp>
            )}
            <span className="font-mono text-xs text-slate-400">{fmt(bruktProsent, 1)} % av disp. friksjon brukt</span>
          </div>
          <TrykkStolpe
            segmenter={[
              { navn: 'Resttrykk', verdi: budsjett.resttrykk, farge: 'bg-slate-500' },
              { navn: 'Løftehøyde', verdi: bud.loftetrykk, farge: 'bg-sky-500' },
              { navn: 'Enkeltm.', verdi: budsjett.enkeltmotstand, farge: 'bg-amber-500' },
              { navn: 'Rørdeler', verdi: bud.rordeler, farge: 'bg-purple-500' },
              { navn: 'Rørfriksjon', verdi: sum.rxl, farge: 'bg-indigo-500' },
              { navn: 'Reserve', verdi: Math.max(0, margin), farge: 'bg-emerald-400' },
            ]}
            total={budsjett.hovedtrykk}
          />
        </Kort>
      </div>

      <Kort tittel="Dimensjoneringstabell – fordelingsledning" ikon="🚰">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-400">
            qS = qN1 + 0,015·(ΣqN − qN1) + 0,17·√(ΣqN − qN1) &nbsp;|&nbsp; anbefalt maks hastighet:{' '}
            <strong className="text-slate-200">{fmt(MAKS_HASTIGHET_FORDELING, 1)} m/s</strong>
          </p>
          <div className="flex flex-wrap gap-2">
            <Knapp
              variant="advarsel"
              onClick={() => {
                setRader((r) => r.map((s) => ({ ...s, dim: autoDimensjon(s) })));
                melding(`Auto-dimensjonert (hastighet ≤ ${fmt(MAKS_HASTIGHET_FORDELING, 1)} m/s)`);
              }}
            >
              ⚡ Auto-dimensjoner
            </Knapp>
            <Knapp
              onClick={() =>
                setRader((r) => [...r, { navn: `strekk ${r.length + 1}`, sumQn: 0.3, qn1: 0.3, qkont: 0, dim: 15, l: 1 }])
              }
            >
              + Legg til strekk
            </Knapp>
          </div>
        </div>
        <div className="overflow-x-auto rounded-lg border border-slate-700">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-900 text-[11px] uppercase tracking-wider text-slate-300">
                {['Strekk', 'ΣqN', 'qN1', 'qS', 'qkont', 'qdim', 'Dim (mm)', 'dᵢ (mm)', 'v (m/s)', 'R (kPa/m)', 'l (m)', 'R·l (kPa)', ''].map((h) => (
                  <th key={h} className="px-2 py-2.5 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {beregnet.map((b, i) => {
                const forFort = b.hastighet > MAKS_HASTIGHET_FORDELING;
                const zebra = i % 2 === 1 ? 'bg-slate-800/40' : 'bg-slate-900/40';
                return (
                  <tr key={i} className={`${zebra} hover:bg-slate-700/40 transition-colors`}>
                    <td className="px-2 py-1.5">
                      <input
                        value={rader[i].navn}
                        onChange={(e) => oppdater(i, { navn: e.target.value })}
                        className="w-28 rounded border border-slate-600 bg-slate-900 px-2 py-1 font-semibold outline-none focus:border-emerald-500"
                      />
                    </td>
                    <td className="px-1 py-1.5"><TallFelt className="w-20" ariaLabel="ΣqN" verdi={rader[i].sumQn} onChange={(n) => oppdater(i, { sumQn: n })} /></td>
                    <td className="px-1 py-1.5"><TallFelt className="w-16" ariaLabel="qN1" verdi={rader[i].qn1} onChange={(n) => oppdater(i, { qn1: n })} /></td>
                    <td className="bg-slate-900/50 px-2 py-1.5 text-right font-mono">{fmt(b.qS, 3)}</td>
                    <td className="px-1 py-1.5"><TallFelt className="w-16" ariaLabel="qkont" verdi={rader[i].qkont} onChange={(n) => oppdater(i, { qkont: n })} /></td>
                    <td className="bg-slate-900/50 px-2 py-1.5 text-right font-mono font-bold">{fmt(b.qdim, 3)}</td>
                    <td className="px-1 py-1.5 text-center">
                      <select
                        value={rader[i].dim}
                        onChange={(e) => oppdater(i, { dim: Number(e.target.value) })}
                        className="rounded border border-slate-600 bg-slate-900 px-2 py-1 font-bold outline-none focus:border-emerald-500"
                      >
                        {ROR_TABELL.map((r) => (
                          <option key={r.dim} value={r.dim}>{r.dim}</option>
                        ))}
                      </select>
                    </td>
                    <td className="bg-slate-900/50 px-2 py-1.5 text-right font-mono text-slate-400">{fmt(b.di, 1)}</td>
                    {/* Fargekodet vannhastighet v (grønt <= 2,0 m/s, rødt > 2,0 m/s) */}
                    <td className="bg-slate-900/50 px-2 py-1.5 text-center font-mono">
                      <span
                        className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-extrabold ${
                          forFort
                            ? 'bg-rose-950/80 text-rose-300 ring-1 ring-rose-500'
                            : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                        }`}
                      >
                        {fmt(b.hastighet)} {forFort ? '⚠️' : '✓'}
                      </span>
                    </td>
                    <td className="bg-slate-900/50 px-2 py-1.5 text-right font-mono text-slate-300">{fmt(b.R, 3)}</td>
                    <td className="px-1 py-1.5"><TallFelt className="w-16" ariaLabel="l" verdi={rader[i].l} onChange={(n) => oppdater(i, { l: n })} /></td>
                    <td className="bg-slate-900/50 px-2 py-1.5 text-right font-mono font-extrabold">{fmt(b.rxl)}</td>
                    <td className="px-2 py-1.5 text-center">
                      <button
                        type="button"
                        aria-label={`Slett ${rader[i].navn}`}
                        title="Slett rørstrekk (krever bekreftelse)"
                        onClick={() =>
                          bekreftSlett({
                            tittel: 'Slette rørstrekk?',
                            elementNavn: `${rader[i].navn} (${rader[i].dim} mm, l = ${rader[i].l} m)`,
                            beskrivelse: `Er du sikker på at du vil slette rørstrekket «${rader[i].navn}» fra trykkfallstabellen?`,
                            bekreftTekst: '🗑️ Slett rørstrekk',
                            onBekreft: () => setRader((r) => r.filter((_, idx) => idx !== i)),
                          })
                        }
                        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-400 hover:bg-rose-950/50 hover:text-rose-400"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-600 bg-slate-900 font-bold">
                <td colSpan={10} className="px-3 py-2.5 text-right text-[11px] uppercase tracking-wider text-slate-400">Sum lengde & Σ R·l</td>
                <td className="px-2 py-2.5 text-right font-mono">{fmt(sum.lengde, 1)} m</td>
                <td className="px-2 py-2.5 text-right font-mono">{fmt(sum.rxl)} kPa</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        {/* 4. Tydelig Konklusjonsboks (Sluttkontroll) */}
        <div
          className={`mt-4 rounded-xl border-2 p-4 transition-all ${
            ok
              ? 'border-emerald-500/80 bg-emerald-950/30 text-emerald-200'
              : 'border-rose-500/80 bg-rose-950/30 text-rose-200'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 border border-current text-2xl shadow">
                {ok ? '✅' : '🚨'}
              </span>
              <div>
                <h4 className="text-sm font-black uppercase tracking-wider text-slate-100">
                  {ok
                    ? 'Godkjent trykkbudsjett (SINTEF Byggforsk 553.102)'
                    : 'Avvik: For stort samlet trykkfall på fordelingsnettet'}
                </h4>
                <p className="mt-0.5 text-xs text-slate-300">
                  Kontroll: Σ R·l = <strong className="text-white">{fmt(sum.rxl)} kPa</strong> mot disponibelt{' '}
                  <strong className="text-white">{fmt(bud.dispFriksjon)} kPa</strong> →{' '}
                  <span className="underline font-black text-white">{ok ? 'OK' : 'IKKE OK'}</span>{' '}
                  (margin: {margin >= 0 ? '+' : ''}
                  <strong className={ok ? 'text-emerald-300' : 'text-rose-300'}>{fmt(margin)} kPa</strong> ·{' '}
                  {bruktProsent.toFixed(1)} % utnyttelse)
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setVisRapportModal(true)}
              className="inline-flex min-h-[38px] items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-black text-white shadow-lg transition hover:bg-emerald-500"
            >
              <span>📄 Åpne A4-rapport & PDF</span>
            </button>
          </div>
        </div>
      </Kort>

      <Kort tittel="Rørtabell – kobber (fra Excel)" ikon="📏">
        <div className="flex flex-wrap gap-2">
          {ROR_TABELL.map((r) => (
            <div key={r.dim} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs">
              <div className="font-bold text-slate-100">{r.dim} mm</div>
              <div className="text-slate-400">t = {fmt(r.t, 1)} · dᵢ = <span className="text-emerald-400">{fmt(r.di, 1)}</span></div>
            </div>
          ))}
        </div>
      </Kort>

      {/* Visuell A4 PDF-rapport modal */}
      <TrykkfallRapportModal
        aapen={visRapportModal}
        onLukk={() => setVisRapportModal(false)}
        prosjektNavn={prosjekt}
        prosjektData={prosjektData}
        budsjett={budsjett}
        bud={bud}
        beregnet={beregnet}
        sum={sum}
        margin={margin}
        ok={ok}
        melding={melding}
      />
    </div>
  );
}

function TrykkStolpe({ segmenter, total }: { segmenter: { navn: string; verdi: number; farge: string }[]; total: number }) {
  const sum = segmenter.reduce((s, x) => s + Math.max(0, x.verdi), 0);
  // Skalerer mot det største av hovedtrykk og summen, slik at overskridelser fortsatt vises.
  const skala = Math.max(total, sum, 1);
  return (
    <div className="mt-4 rounded-lg border border-slate-700 bg-slate-900 p-3">
      <div className="mb-2 flex justify-between text-xs font-semibold text-slate-300">
        <span>Trykkregnskap av hovedledningstrykk ({fmt(total, 0)} kPa)</span>
      </div>
      <div className="flex h-5 overflow-hidden rounded bg-slate-700">
        {segmenter.map((s) => (
          <div key={s.navn} title={`${s.navn}: ${fmt(s.verdi)} kPa`} className={s.farge} style={{ width: `${(Math.max(0, s.verdi) / skala) * 100}%` }} />
        ))}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1 text-[11px] text-slate-400 sm:grid-cols-3">
        {segmenter.map((s) => (
          <div key={s.navn} className="flex items-center gap-1.5">
            <span className={`inline-block h-2.5 w-2.5 rounded-sm ${s.farge}`} />
            {s.navn} ({fmt(s.verdi, 1)})
          </div>
        ))}
      </div>
    </div>
  );
}
