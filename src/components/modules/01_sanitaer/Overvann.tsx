import { useMemo, useState } from 'react';
import { PROSJEKT_PRESETS, type ProsjektData } from '../../../data/prosjekter';
import { overvann } from '../../../engine/avlop';
import { fmt, kopierTilUtklippstavle, lastNedTekst } from '../../../lib/format';
import { useBekreftSlett } from '../../common/BekreftSlettModal';
import GlobalRapportBar from '../../common/GlobalRapportBar';
import FagRapportModal from '../common/FagRapportModal';
import { Knapp, Kort, Resultat, TallFelt } from '../../common/ui';

interface Flate {
  navn: string;
  lengde: number;
  bredde: number;
  intensitet: number;
  psi: number;
}

// Fra "San.ov.xlsx": parkering 50 × 17 m, tak 24,5 × 14,5 m, regnintensitet 0,02 l/(s·m²), ψ = 1.
const START: Flate[] = [
  { navn: 'Parkering', lengde: 50, bredde: 17, intensitet: 0.02, psi: 1 },
  { navn: 'Tak', lengde: 24.5, bredde: 14.5, intensitet: 0.02, psi: 1 },
];

interface Props {
  prosjekt?: ProsjektData;
  startFlater?: Flate[];
  onEndring?: (flater: Flate[]) => void;
  melding?: (t: string) => void;
}

export default function Overvann({
  prosjekt,
  startFlater,
  onEndring,
  melding = (t: string) => alert(t),
}: Props = {}) {
  const [flater, setFlater] = useState<Flate[]>(() =>
    (startFlater && startFlater.length > 0 ? startFlater : START).map((f) => ({ ...f }))
  );
  const [visRapport, setVisRapport] = useState(false);
  const bekreftSlett = useBekreftSlett();
  const oppdaterFlater = (neste: Flate[]) => {
    setFlater(neste);
    onEndring?.(neste);
  };
  const oppdater = (i: number, d: Partial<Flate>) =>
    oppdaterFlater(flater.map((x, idx) => (idx === i ? { ...x, ...d } : x)));

  const beregninger = useMemo(
    () => flater.map((f) => overvann(f.lengde, f.bredde, f.intensitet, f.psi)),
    [flater]
  );

  const totaltAreal = useMemo(
    () => beregninger.reduce((s, r) => s + r.areal, 0),
    [beregninger]
  );
  const totaltQ = useMemo(
    () => beregninger.reduce((s, r) => s + r.q, 0),
    [beregninger]
  );

  const prosjektObj: ProsjektData = useMemo(
    () => prosjekt ?? PROSJEKT_PRESETS[0],
    [prosjekt]
  );

  const markdownTekst = useMemo(() => {
    const L: string[] = [];
    L.push('# OVERVANNSBEREGNING & FORDRØYNINGSMAGASIN (LOD)');
    L.push(`**Standard:** Rasjonell formel Q = A · i · ψ · SINTEF Byggforsk · TEK17 § 15-8`);
    L.push(`**Prosjekt:** ${prosjektObj.navn} | **Dato:** ${new Date().toLocaleDateString('nb-NO')}`);
    L.push(`**Utførende:** Kim Jørgensen | Rørleggermester & Rådgivende Ingeniør VVS (RIV)`);
    L.push(`**Adresse:** ${prosjektObj.sted || 'Ikke oppgitt'} | **Gnr/Bnr:** ${prosjektObj.matrikkel || 'Ikke oppgitt'}`);
    L.push('');
    L.push('## 1. Nøkkeltall for overvann');
    L.push(`- Samlet overflateareal: ${fmt(totaltAreal, 0)} m²`);
    L.push(`- Samlet dimensjonerende tilsig Q: ${fmt(totaltQ, 1)} l/s`);
    L.push(`- Antall overvannsflater: ${flater.length} stk`);
    L.push('');
    L.push('## 2. Flatespesifikasjon og beregnet avrenning');
    L.push('| Flatenavn | Lengde (m) | Bredde (m) | Areal (m²) | Intensitet i (l/s·m²) | Avløpskoeffisient ψ | Avrenning Q (l/s) |');
    L.push('|:---|:---:|:---:|:---:|:---:|:---:|:---:|');
    flater.forEach((f, i) => {
      const r = beregninger[i];
      L.push(
        `| ${f.navn} | ${fmt(f.lengde, 1)} | ${fmt(f.bredde, 1)} | ${fmt(r.areal, 0)} | ${fmt(f.intensitet, 3)} | ${fmt(f.psi, 2)} | ${fmt(r.q, 1)} |`
      );
    });
    L.push('');
    L.push('## 3. Konklusjon & Overvannsdisponering');
    L.push(
      `Totalt dimensjonerende overvannstilsig fra tomten og takflatene utgjør ${fmt(
        totaltQ,
        1
      )} l/s. Ved påslippsbegrensning til offentlig nett må det etableres fordrøyningsmagasin / kassetter dimensjonert iht. lokal IVF-kurve og tillatt påslippsmengde.`
    );
    return L.join('\n');
  }, [prosjektObj, flater, beregninger, totaltAreal, totaltQ]);

  return (
    <div className="space-y-6">
      {/* Universell eksport- og rapportlinje */}
      <GlobalRapportBar
        tittel="Overvannsberegning (LOD)"
        undertittel={`${flater.length} flater · Totalt Areal: ${fmt(totaltAreal, 0)} m² · Dimensjonerende Q = ${fmt(totaltQ, 1)} l/s`}
        standard="Rasjonell formel Q = A · i · ψ · TEK17 § 15-8"
        ikon="🌧️"
        statusBadge={{
          tekst: `Q = ${fmt(totaltQ, 1)} l/s`,
          tone: 'info',
        }}
        onApneRapport={() => setVisRapport(true)}
        onKopier={async () => {
          const ok = await kopierTilUtklippstavle(markdownTekst);
          melding(ok ? '📋 Overvannsrapport kopiert til utklippstavlen' : 'Kunne ikke kopiere');
        }}
        onLastNedMd={() => {
          const filnavn = `${prosjektObj.navn
            .toLowerCase()
            .replace(/[^a-z0-9æøå]+/gi, '-')
            .replace(/^-|-$/g, '')}-overvann.md`;
          lastNedTekst(filnavn, markdownTekst);
          melding('📥 Markdown lastet ned for NotebookLM / KI!');
        }}
        ekstraKnapper={
          <Knapp
            onClick={() =>
              oppdaterFlater([
                ...flater,
                { navn: `Flate ${flater.length + 1}`, lengde: 20, bredde: 10, intensitet: 0.02, psi: 0.9 },
              ])
            }
          >
            + Legg til overvannsflate
          </Knapp>
        }
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {flater.map((f, i) => {
          const r = beregninger[i];
          return (
            <Kort key={i} tittel={`Overvann – ${f.navn}`} ikon="🌧️">
              <div className="mb-3 flex items-center justify-between gap-2">
                <input
                  value={f.navn}
                  onChange={(e) => oppdater(i, { navn: e.target.value })}
                  aria-label="Flatenavn"
                  className="min-h-[44px] flex-1 rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-100 outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() =>
                    bekreftSlett({
                      tittel: 'Slette overvannsflate?',
                      elementNavn: `${f.navn} (${fmt(r.areal, 0)} m², Q = ${fmt(r.q, 1)} l/s)`,
                      beskrivelse: `Er du sikker på at du vil slette overvannsflaten «${f.navn}»?`,
                      bekreftTekst: '🗑️ Slett flate',
                      onBekreft: () => oppdaterFlater(flater.filter((_, idx) => idx !== i)),
                    })
                  }
                  className="inline-flex min-h-[44px] items-center rounded-lg border border-rose-900/60 bg-rose-950/30 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-900/60"
                >
                  🗑️ Slett
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3 text-xs text-slate-300 sm:grid-cols-2">
                <label>Lengde (m)<TallFelt className="mt-1 w-full" ariaLabel="Lengde" verdi={f.lengde} onChange={(n) => oppdater(i, { lengde: n })} /></label>
                <label>Bredde (m)<TallFelt className="mt-1 w-full" ariaLabel="Bredde" verdi={f.bredde} onChange={(n) => oppdater(i, { bredde: n })} /></label>
                <label>Regnintensitet (l/s·m²)<TallFelt className="mt-1 w-full" ariaLabel="Regnintensitet" verdi={f.intensitet} onChange={(n) => oppdater(i, { intensitet: n })} /></label>
                <label>Avløpskoeffisient ψ<TallFelt className="mt-1 w-full" ariaLabel="Avløpskoeffisient" verdi={f.psi} onChange={(n) => oppdater(i, { psi: n })} /></label>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Resultat etikett="Areal" verdi={fmt(r.areal)} enhet="m²" />
                <Resultat etikett="Avrenning Q = A·i·ψ" verdi={fmt(r.q, 1)} enhet="l/s" tone="ok" />
              </div>
            </Kort>
          );
        })}
      </div>

      {/* Visuell A4 PDF-rapport modal */}
      <FagRapportModal
        aapen={visRapport}
        onLukk={() => setVisRapport(false)}
        prosjekt={prosjektObj}
        tittel="Overvannsberegning & Fordrøyningsbehov (LOD)"
        undertittel="Dimensjonerende overvannsavrenning iht. rasjonell formel (Q = A · i · ψ) og TEK17 § 15-8"
        standardTekst="SINTEF Byggforsk · NS 3056 · TEK17 § 15-8"
        ikon="🌧️"
        nokkeltall={[
          {
            etikett: 'Samlet areal',
            verdi: `${fmt(totaltAreal, 0)} m²`,
            tone: 'ok',
          },
          {
            etikett: 'Dimensjonerende avrenning Q',
            verdi: `${fmt(totaltQ, 1)} l/s`,
            tone: 'ok',
          },
          {
            etikett: 'Antall beregnede flater',
            verdi: `${flater.length}`,
            enhet: 'stk',
          },
        ]}
        seksjoner={[
          {
            tittel: 'Flatespesifikasjon og beregningsresultater',
            tabell: {
              kolonner: [
                'Flatenavn',
                'Lengde (m)',
                'Bredde (m)',
                'Areal (m²)',
                'Intensitet (l/s·m²)',
                'Avløpskoeffisient ψ',
                'Avrenning Q (l/s)',
              ],
              rader: flater.map((f, i) => {
                const r = beregninger[i];
                return [
                  f.navn,
                  fmt(f.lengde, 1),
                  fmt(f.bredde, 1),
                  fmt(r.areal, 0),
                  fmt(f.intensitet, 3),
                  fmt(f.psi, 2),
                  fmt(r.q, 1),
                ];
              }),
            },
          },
        ]}
        konklusjon={{
          ok: true,
          tittel: 'DOKUMENTERT OVERVANNSAVRENNING',
          tekst: `Samlet dimensjonerende overvannstilsig for anlegget er beregnet til ${fmt(
            totaltQ,
            1
          )} l/s over et samlet areal på ${fmt(
            totaltAreal,
            0
          )} m². Ved tilknytning til kommunalt overvannsnett med påslippsrestriksjoner skal det etableres fordrøyningsmagasin for å utjevne regnskylltopper i henhold til kommunens overvannsnorm.`,
        }}
        markdownTekst={markdownTekst}
        filnavnBase="overvann-rapport"
        rolleTittel="Rådgivende Ingeniør VVS (RIV) & Rørleggermester"
        melding={melding}
      />
    </div>
  );
}
