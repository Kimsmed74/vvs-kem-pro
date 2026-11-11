import { useMemo, useState } from 'react';
import { PROSJEKT_PRESETS, type ProsjektData } from '../../../data/prosjekter';
import { EKSEMPEL_BEREDER, beregnBereder, type Utstyrslinje } from '../../../engine/bereder';
import { fmt, kopierTilUtklippstavle, lastNedTekst } from '../../../lib/format';
import { useBekreftSlett } from '../../common/BekreftSlettModal';
import GlobalRapportBar from '../../common/GlobalRapportBar';
import FagRapportModal from '../common/FagRapportModal';
import { Kort, Knapp, Resultat, TallFelt } from '../../common/ui';

interface Props {
  prosjekt?: ProsjektData;
  startVerdi?: { linjer: Utstyrslinje[]; ladetid: number; c: number; deltaT: number };
  onEndring?: (verdi: { linjer: Utstyrslinje[]; ladetid: number; c: number; deltaT: number }) => void;
  melding?: (t: string) => void;
}

export default function Bereder({
  prosjekt,
  startVerdi,
  onEndring,
  melding = (t: string) => alert(t),
}: Props = {}) {
  const [linjer, setLinjer] = useState<Utstyrslinje[]>(() =>
    (startVerdi?.linjer ?? EKSEMPEL_BEREDER.linjer).map((l) => ({ ...l }))
  );
  const [visRapport, setVisRapport] = useState(false);
  const bekreftSlett = useBekreftSlett();
  const [ladetid, setLadetidState] = useState(startVerdi?.ladetid ?? EKSEMPEL_BEREDER.ladetid);
  const [c, setCState] = useState(startVerdi?.c ?? EKSEMPEL_BEREDER.c);
  const [deltaT, setDeltaTState] = useState(startVerdi?.deltaT ?? EKSEMPEL_BEREDER.deltaT);

  const r = useMemo(() => beregnBereder({ linjer, ladetid, c, deltaT }), [linjer, ladetid, c, deltaT]);
  const setLadetid = (n: number) => {
    setLadetidState(n);
    onEndring?.({ linjer, ladetid: n, c, deltaT });
  };
  const setC = (n: number) => {
    setCState(n);
    onEndring?.({ linjer, ladetid: n, c, deltaT });
  };
  const setDeltaT = (n: number) => {
    setDeltaTState(n);
    onEndring?.({ linjer, ladetid: n, c, deltaT: n });
  };
  const oppdater = (i: number, d: Partial<Utstyrslinje>) =>
    setLinjer((l) => {
      const neste = l.map((x, idx) => (idx === i ? { ...x, ...d } : x));
      onEndring?.({ linjer: neste, ladetid, c, deltaT });
      return neste;
    });

  const prosjektObj: ProsjektData = useMemo(
    () => prosjekt ?? PROSJEKT_PRESETS[0],
    [prosjekt]
  );

  const markdownTekst = useMemo(() => {
    const L: string[] = [];
    L.push('# VARMTVANNSSYSTEM & BEREDERKAPASITET (VVB)');
    L.push(`**Standard:** SINTEF Byggforsk Kunnskapssystem · TEK17 § 15-5`);
    L.push(`**Prosjekt:** ${prosjektObj.navn} | **Dato:** ${new Date().toLocaleDateString('nb-NO')}`);
    L.push(`**Utførende:** Kim Jørgensen | Rørleggermester & Rådgivende Ingeniør VVS (RIV)`);
    L.push(`**Adresse:** ${prosjektObj.sted || 'Ikke oppgitt'} | **Gnr/Bnr:** ${prosjektObj.matrikkel || 'Ikke oppgitt'}`);
    L.push('');
    L.push('## 1. Nøkkeltall for varmtvannsbehov');
    L.push(`- Samlet døgnenergi E_døgn: ${fmt(r.kwhDogn, 1)} kWh`);
    L.push(`- Beregnet kolbeeffekt Φ: ${fmt(r.effekt, 1)} kW (ladetid ${fmt(ladetid, 1)} timer)`);
    L.push(`- Nødvendig akkumuleringsvolum V: ${fmt(r.volum, 0)} liter (ΔT = ${deltaT} K)`);
    L.push('');
    L.push('## 2. Varmtvannsforbruk per utstyrstype');
    L.push('| Utstyr / Brukerformål | Antall | Spesifikt forbruk (kWh/enhet) | Døgnenergi (kWh/døgn) |');
    L.push('|:---|:---:|:---:|:---:|');
    linjer.forEach((l) => {
      L.push(`| ${l.navn} | ${l.antall} | ${fmt(l.kwhPerEnhet, 2)} | ${fmt(l.antall * l.kwhPerEnhet, 2)} |`);
    });
    L.push('');
    L.push('## 3. Konklusjon & Dimensjoneringsgrunnlag');
    L.push(
      `Anleggets varmtvannsbehov krever en samlet akkumulatorkapasitet på minimum ${fmt(
        r.volum,
        0
      )} liter ved en nattladingseffekt på ${fmt(
        r.effekt,
        1
      )} kW fordelt over ${fmt(
        ladetid,
        1
      )} timer. For å forhindre Legionellavekst forutsettes det minimum 65 °C i bereder og 60 °C på sirkulasjonsledning (VVC).`
    );
    return L.join('\n');
  }, [prosjektObj, r, ladetid, deltaT, linjer]);

  return (
    <div className="space-y-6">
      {/* Universell eksport- og rapportlinje */}
      <GlobalRapportBar
        tittel="Bereder & Varmtvannskapasitet (VVB)"
        undertittel={`Døgnenergi: ${fmt(r.kwhDogn, 1)} kWh · Kolbeeffekt: ${fmt(r.effekt, 1)} kW · Volum: ${fmt(r.volum, 0)} liter`}
        standard="SINTEF Byggforsk · TEK17 § 15-5"
        ikon="🔥"
        statusBadge={{
          tekst: `V = ${fmt(r.volum, 0)} liter`,
          tone: 'ok',
        }}
        onApneRapport={() => setVisRapport(true)}
        onKopier={async () => {
          const ok = await kopierTilUtklippstavle(markdownTekst);
          melding(ok ? '📋 Berederrapport kopiert til utklippstavlen' : 'Kunne ikke kopiere');
        }}
        onLastNedMd={() => {
          const filnavn = `${prosjektObj.navn
            .toLowerCase()
            .replace(/[^a-z0-9æøå]+/gi, '-')
            .replace(/^-|-$/g, '')}-bereder.md`;
          lastNedTekst(filnavn, markdownTekst);
          melding('📥 Markdown lastet ned for NotebookLM / KI!');
        }}
        ekstraKnapper={
          <Knapp onClick={() => setLinjer((l) => [...l, { navn: 'Nytt utstyr', antall: 1, kwhPerEnhet: 1 }])}>
            + Legg til utstyr
          </Knapp>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Kort tittel="Varmtvannsbehov (døgn)" ikon="🏨">
          <div className="overflow-x-auto rounded-lg border border-slate-700">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-900 text-[11px] uppercase tracking-wider text-slate-300">
                  <th className="px-2.5 py-2 text-left">Utstyr</th>
                  <th className="px-2 py-2 text-right">Antall</th>
                  <th className="px-2 py-2 text-right">kWh/enhet</th>
                  <th className="px-2 py-2 text-right">kWh/døgn</th>
                  <th className="px-2 py-2 text-center" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {linjer.map((l, i) => (
                  <tr key={i} className="hover:bg-slate-700/30">
                    <td className="px-2 py-1.5"><input value={l.navn} onChange={(e) => oppdater(i, { navn: e.target.value })} className="w-full min-w-[120px] rounded border border-slate-600 bg-slate-900 px-2 py-1 outline-none focus:border-emerald-500" /></td>
                    <td className="px-1 py-1.5"><TallFelt className="w-20" ariaLabel="Antall" verdi={l.antall} onChange={(n) => oppdater(i, { antall: n })} /></td>
                    <td className="px-1 py-1.5"><TallFelt className="w-20" ariaLabel="kWh per enhet" verdi={l.kwhPerEnhet} onChange={(n) => oppdater(i, { kwhPerEnhet: n })} /></td>
                    <td className="px-2 py-1.5 text-right font-mono font-bold text-slate-200">{fmt(l.antall * l.kwhPerEnhet, 3)}</td>
                    <td className="px-2 py-1.5 text-center">
                      <button
                        type="button"
                        aria-label={`Slett ${l.navn}`}
                        title="Slett utstyrslinje (krever bekreftelse)"
                        onClick={() =>
                          bekreftSlett({
                            tittel: 'Slette utstyrslinje fra berederberegning?',
                            elementNavn: `${l.navn} (${l.antall} stk × ${l.kwhPerEnhet} kWh)`,
                            beskrivelse: `Er du sikker på at du vil slette «${l.navn}» fra varmtvannsbehovet?`,
                            bekreftTekst: '🗑️ Slett utstyr',
                            onBekreft: () =>
                              setLinjer((x) => {
                                const neste = x.filter((_, idx) => idx !== i);
                                onEndring?.({ linjer: neste, ladetid, c, deltaT });
                                return neste;
                              }),
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
          <div className="mt-3"><Knapp onClick={() => setLinjer((l) => [...l, { navn: 'Nytt utstyr', antall: 1, kwhPerEnhet: 1 }])}>+ Legg til utstyr</Knapp></div>
        </Kort>

        <Kort tittel="Lading & beredervolum" ikon="🔥">
          <div className="grid grid-cols-1 gap-3 text-xs text-slate-300 sm:grid-cols-3">
            <label>Ladetid (timer)<TallFelt className="mt-1 w-full" ariaLabel="Ladetid" verdi={ladetid} onChange={setLadetid} /></label>
            <label>c (kJ/kg·K)<TallFelt className="mt-1 w-full" ariaLabel="Spesifikk varmekapasitet" verdi={c} onChange={setC} /></label>
            <label>ΔT (K)<TallFelt className="mt-1 w-full" ariaLabel="Temperaturdifferanse" verdi={deltaT} onChange={setDeltaT} /></label>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Resultat etikett="Døgnenergi" verdi={fmt(r.kwhDogn)} enhet="kWh" />
            <Resultat etikett="Kolbeeffekt" verdi={fmt(r.effekt)} enhet="kW" />
            <Resultat etikett="Beredervolum" verdi={fmt(r.volum, 0)} enhet="liter" tone="ok" />
          </div>
          <p className="mt-3 font-mono text-[11px] text-slate-500">V = (E/t · 3600) / (c · ΔT) — som i «San vvb.xlsx»</p>
        </Kort>
      </div>

      {/* Visuell A4 PDF-rapport modal */}
      <FagRapportModal
        aapen={visRapport}
        onLukk={() => setVisRapport(false)}
        prosjekt={prosjektObj}
        tittel="Varmtvannskapasitet & Beredervolum (VVB)"
        undertittel="Dimensjonering av døgnenergi, nattlading og beredervolum iht. SINTEF Byggforsk og TEK17 § 15-5"
        standardTekst="SINTEF Byggforsk · TEK17 § 15-5"
        ikon="🔥"
        nokkeltall={[
          {
            etikett: 'Døgnenergi E_døgn',
            verdi: `${fmt(r.kwhDogn, 1)} kWh`,
            tone: 'ok',
          },
          {
            etikett: 'Nødvendig kolbeeffekt',
            verdi: `${fmt(r.effekt, 1)} kW`,
            enhet: `ved ${fmt(ladetid, 1)} t lading`,
            tone: 'ok',
          },
          {
            etikett: 'Nødvendig beredervolum',
            verdi: `${fmt(r.volum, 0)} liter`,
            tone: 'ok',
          },
        ]}
        seksjoner={[
          {
            tittel: 'Varmtvannsforbruk per utstyrstype',
            tabell: {
              kolonner: [
                'Utstyr / Brukerformål',
                'Antall',
                'Spesifikt forbruk (kWh/enhet)',
                'Døgnenergi (kWh/døgn)',
              ],
              rader: linjer.map((l) => [
                l.navn,
                `${l.antall} stk`,
                `${fmt(l.kwhPerEnhet, 2)} kWh`,
                `${fmt(l.antall * l.kwhPerEnhet, 2)} kWh`,
              ]),
            },
          },
          {
            tittel: 'Tekniske ladeparametere for varmtvann',
            rader: [
              { etikett: 'Dimensjonerende ladetid', verdi: `${fmt(ladetid, 1)} timer` },
              { etikett: 'Spesifikk varmekapasitet vann c', verdi: `${c} kJ/(kg·K)` },
              { etikett: 'Temperaturheving ΔT (65°C - 5°C)', verdi: `${deltaT} K` },
              { etikett: 'Beregnet formel', verdi: 'V = (E / t · 3600) / (c · ΔT)' },
            ],
          },
        ]}
        konklusjon={{
          ok: true,
          tittel: 'DIMENSJONERT VARMTVANNSSYSTEM',
          tekst: `Samlet døgnenergibehov for anlegget er ${fmt(
            r.kwhDogn,
            1
          )} kWh. Ved en ladetid på ${fmt(
            ladetid,
            1
          )} timer kreves en samlet kolbeeffekt på ${fmt(
            r.effekt,
            1
          )} kW og et akkumuleringsvolum på minimum ${fmt(
            r.volum,
            0
          )} liter. For å sikre mot Legionella forutsettes det minimum 65 °C i beredertank og 60 °C på returledning (VVC).`,
        }}
        markdownTekst={markdownTekst}
        filnavnBase="bereder-rapport"
        rolleTittel="Rådgivende Ingeniør VVS (RIV) & Rørleggermester"
        melding={melding}
      />
    </div>
  );
}