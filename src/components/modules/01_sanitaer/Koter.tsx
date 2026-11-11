import { useEffect, useMemo, useState } from 'react';
import {
  OVERHOYDE_DOKUMENTER,
  OVERHOYDE_TEK17,
  fordroyningsVolum,
  koteRegnskap,
  reduserAreal,
  regnavrenning,
  type Flate,
} from '../../../engine/va';
import type { ProsjektData } from '../../../data/prosjekter';
import { fmt, kopierTilUtklippstavle, lastNedTekst } from '../../../lib/format';
import { useBekreftSlett } from '../../common/BekreftSlettModal';
import { Kort, Merkelapp, Resultat, TallFelt } from '../../common/ui';
import GlobalRapportBar from '../../common/GlobalRapportBar';
import KoterRapportModal from './KoterRapportModal';

interface Etasje {
  navn: string;
  kote: number;
}

/**
 * Synkroniseres toveis med aktivt prosjekt (Single Source of Truth).
 */
export default function Koter({
  prosjekt,
  krav: startKrav,
  onOppdaterProsjekt,
  melding = (t: string) => alert(t),
}: {
  prosjekt: ProsjektData;
  krav: number;
  onOppdaterProsjekt?: (p: ProsjektData) => void;
  melding?: (t: string) => void;
}) {
  const k = prosjekt.koter;
  const bekreftSlett = useBekreftSlett();
  const [visRapportModal, setVisRapportModal] = useState(false);
  const [ibr, setIbrState] = useState(k.ibrKum ?? 0);
  const [itr, setItrState] = useState(k.itrKum ?? 0);
  const [itrSatt, setItrSatt] = useState(k.itrKum !== null);
  const [lengde, setLengdeState] = useState(k.stikkLengde ?? 0);
  const [fallNevner, setFallNevnerState] = useState(k.fallNevner ?? 60);
  const [krav, setKrav] = useState(startKrav);
  const [etasjer, setEtasjerState] = useState<Etasje[]>(k.gulv.map((g) => ({ navn: g.navn, kote: g.kote })));

  const [flater, setFlaterState] = useState<Flate[]>(
    prosjekt.overvann.flater.map((f) => ({ navn: f.navn, areal: f.areal, phi: f.phi ?? 0 }))
  );
  const [intensitet, setIntensitetState] = useState(prosjekt.overvann.intensitet ?? 0);
  const [maksUt, setMaksUtState] = useState(prosjekt.overvann.maksPaaslippLs ?? 0);
  const [varighet, setVarighet] = useState(10);

  // Hold lokalt skjemabilde synkronisert dersom Steg 1 eller AI-chatten oppdaterer koter/overvann
  useEffect(() => {
    setIbrState(prosjekt.koter.ibrKum ?? 0);
    setItrState(prosjekt.koter.itrKum ?? 0);
    setItrSatt(prosjekt.koter.itrKum !== null);
    setLengdeState(prosjekt.koter.stikkLengde ?? 0);
    setFallNevnerState(prosjekt.koter.fallNevner ?? 60);
    setEtasjerState(prosjekt.koter.gulv.map((g) => ({ navn: g.navn, kote: g.kote })));
    setFlaterState(prosjekt.overvann.flater.map((f) => ({ navn: f.navn, areal: f.areal, phi: f.phi ?? 0 })));
    setIntensitetState(prosjekt.overvann.intensitet ?? 0);
    setMaksUtState(prosjekt.overvann.maksPaaslippLs ?? 0);
  }, [prosjekt.koter, prosjekt.overvann]);

  const setIbr = (n: number) => {
    setIbrState(n);
    onOppdaterProsjekt?.({
      ...prosjekt,
      kilde: 'bruker',
      koter: { ...prosjekt.koter, ibrKum: n },
    });
  };

  const setItr = (n: number) => {
    setItrState(n);
    setItrSatt(true);
    onOppdaterProsjekt?.({
      ...prosjekt,
      kilde: 'bruker',
      koter: { ...prosjekt.koter, itrKum: n },
    });
  };

  const setLengde = (n: number) => {
    setLengdeState(n);
    onOppdaterProsjekt?.({
      ...prosjekt,
      kilde: 'bruker',
      koter: { ...prosjekt.koter, stikkLengde: n },
    });
  };

  const setFallNevner = (n: number) => {
    setFallNevnerState(n);
    onOppdaterProsjekt?.({
      ...prosjekt,
      kilde: 'bruker',
      koter: { ...prosjekt.koter, fallNevner: n },
    });
  };

  const oppdaterEtasjeListe = (nye: Etasje[]) => {
    setEtasjerState(nye);
    onOppdaterProsjekt?.({
      ...prosjekt,
      kilde: 'bruker',
      koter: { ...prosjekt.koter, gulv: nye },
    });
  };

  const oppdaterFlateListe = (nye: Flate[]) => {
    setFlaterState(nye);
    onOppdaterProsjekt?.({
      ...prosjekt,
      kilde: 'bruker',
      overvann: { ...prosjekt.overvann, flater: nye },
    });
  };

  const setIntensitet = (n: number) => {
    setIntensitetState(n);
    onOppdaterProsjekt?.({
      ...prosjekt,
      kilde: 'bruker',
      overvann: { ...prosjekt.overvann, intensitet: n },
    });
  };

  const setMaksUt = (n: number) => {
    setMaksUtState(n);
    onOppdaterProsjekt?.({
      ...prosjekt,
      kilde: 'bruker',
      overvann: { ...prosjekt.overvann, maksPaaslippLs: n },
    });
  };

  const ikkeOppgitt = [
    k.itrKum === null && 'ITR i kommunal kum',
    k.ibrKum === null && 'IBR i kommunal kum',
    k.stikkLengde === null && 'stikkledningens lengde',
    k.fallNevner === null && 'fall (1:60 brukt som utgangspunkt)',
    k.gulv.length === 0 && 'kote for laveste sluk/gulv',
    prosjekt.overvann.flater.some((f) => f.phi === null) && 'avrenningsfaktor φ',
    prosjekt.overvann.intensitet === null && 'regnintensitet',
    prosjekt.overvann.maksPaaslippLs === null && 'maks påslipp',
  ].filter(Boolean) as string[];

  const fall = fallNevner > 0 ? 1 / fallNevner : 0;
  // Uten ITR finnes det ingen gyldig margin: vis ingen rader i stedet for en misvisende «OK».
  const rader = useMemo(
    () => (itrSatt ? etasjer.map((e) => ({ e, r: koteRegnskap({ ibrKum: ibr, itrKum: itr, stikkLengde: lengde, fall, laveste: e.kote, krav }) })) : []),
    [etasjer, ibr, itr, itrSatt, lengde, fall, krav],
  );
  const harPumpeKrav = useMemo(() => rader.some((x) => !x.r.selvfallOk), [rader]);
  const hoydeIGroft = lengde * fall;

  const aRed = reduserAreal(flater);
  const q = regnavrenning(intensitet, aRed);
  const vol = fordroyningsVolum(q, maksUt, varighet);

  const overvannData = useMemo(
    () => ({
      aRed,
      q,
      vol,
      intensitet,
      maksUt,
      varighet,
      flater,
    }),
    [aRed, q, vol, intensitet, maksUt, varighet, flater]
  );

  const genererMarkdown = () => {
    const datoStreng = new Date().toLocaleDateString('nb-NO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const minKoteUtgang = ibr + hoydeIGroft;
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
      const statusTekst = r.selvfallOk ? 'OK (selvfall)' : `🔴 AVVIK: Krever pumpestasjon (mangler ${fmt(r.mangel, 2)} m)`;
      L.push(`| ${e.navn} | +${fmt(e.kote, 2)} | +${fmt(itr, 2)} | ${r.margin >= 0 ? '+' : ''}${fmt(r.margin, 2)} | ${fmt(krav, 2)} | ${statusTekst} |`);
    }
    L.push('');
    L.push('## 3. Overvann & Fordrøyning');
    L.push(`- Redusert areal A_red: ${fmt(aRed, 0)} m²`);
    L.push(`- Dimensjonerende regnintensitet: ${fmt(intensitet, 0)} l/(s·ha)`);
    L.push(`- Dimensjonerende overvann q: ${fmt(q, 1)} l/s`);
    L.push(`- Maksimalt tillatt påslipp til kommunalt nett: ${fmt(maksUt, 1)} l/s`);
    L.push(`- Nødvendig fordrøyningsvolum (${varighet} min varighet): ${fmt(vol, 1)} m³`);
    return L.join('\n');
  };

  const oppdaterEtasje = (i: number, d: Partial<Etasje>) =>
    oppdaterEtasjeListe(etasjer.map((y, idx) => (idx === i ? { ...y, ...d } : y)));
  const oppdaterFlate = (i: number, d: Partial<Flate>) =>
    oppdaterFlateListe(flater.map((y, idx) => (idx === i ? { ...y, ...d } : y)));

  return (
    <div className="space-y-6">
      {/* Universell eksport- og rapportlinje */}
      <GlobalRapportBar
        tittel="Koteregnskap & Tilbakeslagskontroll"
        undertittel={`Tilkoblingspunkt IBR: +${fmt(ibr, 2)} moh · ITR: +${fmt(itr, 2)} moh · Sikkerhetskrav overhøyde: ${fmt(krav, 2)} m`}
        standard="TEK17 § 15-6/8 · NS-EN 12050"
        ikon="📐"
        statusBadge={{
          tekst: harPumpeKrav ? '🚨 Krever pumpe (NS-EN 12050)' : '✅ Godkjent for selvfall',
          tone: harPumpeKrav ? 'feil' : 'ok',
        }}
        onApneRapport={() => setVisRapportModal(true)}
        onKopier={async () => {
          const rpt = genererMarkdown();
          const ok = await kopierTilUtklippstavle(rpt);
          melding(ok ? '📋 Koteregnskap & overvannsrapport kopiert til utklippstavlen' : 'Kunne ikke kopiere');
        }}
        onLastNedMd={() => {
          const rpt = genererMarkdown();
          const filnavn = `${prosjekt.navn
            .toLowerCase()
            .replace(/[^a-z0-9æøå]+/gi, '-')
            .replace(/^-|-$/g, '')}-koter-rapport.md`;
          lastNedTekst(filnavn, rpt);
          melding('📥 Markdown-rapport lastet ned for NotebookLM / KI!');
        }}
      />

      <div className="rounded-lg border border-emerald-800/70 bg-emerald-950/20 p-3 text-xs text-slate-300">
        🌐 <strong>Toveis synkronisert</strong> med det globale prosjektet <strong className="text-emerald-300">{prosjekt.navn}</strong>. Alle endringer du gjør i koter og overvann her oppdaterer Steg 1, Lov 2-alarmene, Pumper (Modul 4) og Sluttrapporten (Steg 5) direkte!
        {ikkeOppgitt.length > 0 && (
          <div className="mt-2 text-amber-300">
            ⚠️ HINT: prosjektet mangler {ikkeOppgitt.join(', ')}. Fyll dem inn under eller velg «⚠️ Gå videre med estimat» øverst.
          </div>
        )}
      </div>
      <div className="rounded-lg border border-amber-700 bg-amber-950/50 p-3 text-xs text-amber-200">
        ⚠️ <strong>Krav til overhøyde:</strong> TEK17 (§ 15-6 tredje ledd og § 15-8 tredje ledd, preaksepterte ytelser)
        krever minst <strong>0,90 m</strong> mellom vannstand i laveste vannlås og innvendig topp av hovedledningen.
        Prosjektdokumentene bruker «950 mm» og henviser til § 15-7, som gjelder utvendig vannforsyning. 0,95 m kan være
        en strengere kommunal VA-norm, men den ligger ikke i prosjektmappen. Kravet velges under og har startverdi fra ⚙️ Innstillinger.
        Kontroller mot gjeldende kommunale krav. Oppgi sluk-/gulvkote som tilnærming til vannlåsens vannstand.
      </div>

      <Kort tittel="Koteregnskap og tilbakeslagskontroll" ikon="📐">
        <div className="grid grid-cols-2 gap-3 text-xs text-slate-300 sm:grid-cols-5">
          <label>IBR kommunal kum (m)<TallFelt className="mt-1 w-full" ariaLabel="IBR" verdi={ibr} onChange={setIbr} /></label>
          <label>ITR kommunal kum (m)<TallFelt className="mt-1 w-full" ariaLabel="ITR" verdi={itr} onChange={(n) => { setItr(n); setItrSatt(true); }} /></label>
          <label>Stikkledning (m)<TallFelt className="mt-1 w-full" ariaLabel="Lengde" verdi={lengde} onChange={setLengde} /></label>
          <label>Fall 1:<TallFelt className="mt-1 w-full" ariaLabel="Fall" verdi={fallNevner} onChange={setFallNevner} /></label>
          <label>
            Krav til overhøyde
            <select
              value={krav}
              onChange={(e) => setKrav(Number(e.target.value))}
              className="mt-1 w-full rounded border border-slate-600 bg-slate-900 px-2 py-1.5 outline-none"
            >
              <option value={OVERHOYDE_TEK17}>0,90 m (TEK17)</option>
              <option value={OVERHOYDE_DOKUMENTER}>0,95 m (prosjektdokumenter)</option>
            </select>
          </label>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Resultat etikett="Høydetap i grøft (L × fall)" verdi={fmt(hoydeIGroft)} enhet="m" />
          <Resultat etikett="Min. kote bunnledning ved grunnmur" verdi={`C +${fmt(ibr + hoydeIGroft)}`} />
          <Resultat etikett="ITR − IBR (rørhøyde)" verdi={fmt(itr - ibr)} enhet="m" />
        </div>
        {!itrSatt && (
          <p className="mt-3 rounded-lg border border-amber-700 bg-amber-950/40 p-3 text-xs text-amber-200">
            ⚠️ HINT: ITR i kommunal kum er ikke oppgitt. Fyll inn ITR for å få tilbakeslagskontroll (Lov 2).
          </p>
        )}

        <div className="mt-4 overflow-x-auto rounded-lg border border-slate-700">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-900 text-[11px] uppercase tracking-wider text-slate-300">
                {['Etasje / sone', 'Kote laveste sluk (m)', 'Margin mot ITR (m)', 'Krav (m)', 'Status', ''].map((h) => <th key={h} className="px-2 py-2.5 font-semibold">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {rader.map(({ e, r }, i) => (
                <tr key={i} className={r.selvfallOk ? '' : 'bg-rose-950/30'}>
                  <td className="px-2 py-1.5"><input value={e.navn} onChange={(ev) => oppdaterEtasje(i, { navn: ev.target.value })} className="w-32 rounded border border-slate-600 bg-slate-900 px-2 py-1 font-semibold outline-none focus:border-emerald-500" /></td>
                  <td className="px-1 py-1.5"><TallFelt className="w-24" ariaLabel="Kote" verdi={e.kote} onChange={(n) => oppdaterEtasje(i, { kote: n })} /></td>
                  <td className={`px-2 py-1.5 text-right font-mono font-bold ${r.selvfallOk ? 'text-emerald-400' : 'text-rose-400'}`}>{fmt(r.margin)}</td>
                  <td className="px-2 py-1.5 text-right font-mono text-slate-400">{fmt(r.krav)}</td>
                  <td className="px-2 py-1.5">
                    {r.selvfallOk
                      ? <Merkelapp type="ok">Selvfall OK</Merkelapp>
                      : <Merkelapp type="feil">⛔ {fmt(r.mangel)} m for lavt – pumpestasjon eller tilbakestrømningssikring</Merkelapp>}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <button
                      type="button"
                      aria-label={`Slett ${e.navn}`}
                      title="Slett etasje/sone (krever bekreftelse)"
                      onClick={() =>
                        bekreftSlett({
                          tittel: 'Slette etasje / slukkote?',
                          elementNavn: `${e.navn} (Kote +${fmt(e.kote)})`,
                          beskrivelse: `Er du sikker på at du vil fjerne «${e.navn}» fra koteregnskapet?`,
                          bekreftTekst: '🗑️ Slett rad',
                          onBekreft: () => oppdaterEtasjeListe(etasjer.filter((_, idx) => idx !== i)),
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
        <button type="button" onClick={() => oppdaterEtasjeListe([...etasjer, { navn: `Etasje ${etasjer.length + 1}`, kote: 0 }])} className="mt-3 min-h-[44px] rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-500">+ Legg til etasje</button>
        <p className="mt-3 text-[11px] text-slate-500">
          TEK17 § 15-6/15-8: der overhøyden ikke er praktisk mulig må kompenserende tiltak vurderes (tilbakestrømningssikring, pumping).
        </p>

        {/* Tydelig Konklusjonsboks (Sluttkontroll) */}
        {itrSatt && rader.length > 0 && (
          <div
            className={`mt-4 rounded-xl border-2 p-4 transition-all ${
              rader.every((x) => x.r.selvfallOk)
                ? 'border-emerald-500/80 bg-emerald-950/30 text-emerald-200'
                : 'border-rose-500/80 bg-rose-950/30 text-rose-200'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 border border-current text-2xl shadow">
                  {rader.every((x) => x.r.selvfallOk) ? '✅' : '🚨'}
                </span>
                <div>
                  <h4 className="text-sm font-black uppercase tracking-wider text-slate-100">
                    {rader.every((x) => x.r.selvfallOk)
                      ? 'Godkjent tilbakeslagskontroll (Selvfall OK for alle sluk)'
                      : 'Avvik: Krav om avløpspumpestasjon (NS-EN 12050)'}
                  </h4>
                  <p className="mt-0.5 text-xs text-slate-300">
                    {rader.every((x) => x.r.selvfallOk)
                      ? `Alle etasjer og sluk har overhøyde ≥ ${fmt(krav, 2)} m mot kommunal ITR (+${fmt(itr, 2)} moh).`
                      : `${rader
                          .filter((x) => !x.r.selvfallOk)
                          .map((x) => `${x.e.navn} (margin ${x.r.margin >= 0 ? '+' : ''}${fmt(x.r.margin, 2)} m)`)
                          .join(', ')} ligger under kravet på ${fmt(krav, 2)} m.`}
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
        )}
      </Kort>

      <Kort tittel="Overvann og fordrøyning" ikon="🌧️">
        <div className="space-y-3 text-xs text-slate-300">
          {flater.map((f, i) => (
            <div key={i} className="grid grid-cols-1 items-end gap-2 rounded-lg border border-slate-800/80 bg-slate-950/40 p-2.5 sm:grid-cols-12 sm:border-0 sm:bg-transparent sm:p-0">
              <label className="sm:col-span-4">Flate<input value={f.navn} onChange={(e) => oppdaterFlate(i, { navn: e.target.value })} className="mt-1 min-h-[44px] w-full rounded-lg border border-slate-600 bg-slate-900 px-2.5 py-2 font-semibold outline-none focus:border-emerald-500" /></label>
              <label className="sm:col-span-4">Areal (m²)<TallFelt className="mt-1 w-full" ariaLabel="Areal" verdi={f.areal} onChange={(n) => oppdaterFlate(i, { areal: n })} /></label>
              <label className="sm:col-span-3">φ<TallFelt className="mt-1 w-full" ariaLabel="Avrenningsfaktor" verdi={f.phi} onChange={(n) => oppdaterFlate(i, { phi: n })} /></label>
              <button
                type="button"
                aria-label={`Slett ${f.navn}`}
                title="Slett overvannsflate (krever bekreftelse)"
                onClick={() =>
                  bekreftSlett({
                    tittel: 'Slette overvannsflate?',
                    elementNavn: `${f.navn} (${fmt(f.areal, 0)} m², φ=${fmt(f.phi, 2)})`,
                    beskrivelse: `Er du sikker på at du vil slette overvannsflaten «${f.navn}» fra overvannsberegningen?`,
                    bekreftTekst: '🗑️ Slett flate',
                    onBekreft: () => oppdaterFlateListe(flater.filter((_, idx) => idx !== i)),
                  })
                }
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-400 hover:border-rose-700 hover:bg-rose-950/50 hover:text-rose-400 sm:col-span-1"
              >
                ✕
              </button>
            </div>
          ))}
          <button type="button" onClick={() => oppdaterFlateListe([...flater, { navn: 'Ny flate', areal: 100, phi: 0.9 }])} className="min-h-[44px] rounded-lg bg-slate-700 px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-slate-600">+ Legg til flate</button>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 text-xs text-slate-300 sm:grid-cols-3">
          <label>Regnintensitet i (l/s·ha), klimajustert<TallFelt className="mt-1 w-full" ariaLabel="Regnintensitet" verdi={intensitet} onChange={setIntensitet} /></label>
          <label>Maks påslipp (l/s)<TallFelt className="mt-1 w-full" ariaLabel="Maks påslipp" verdi={maksUt} onChange={setMaksUt} /></label>
          <label>Varighet (min)<TallFelt className="mt-1 w-full" ariaLabel="Varighet" verdi={varighet} onChange={setVarighet} /></label>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Resultat etikett="Redusert areal A_red" verdi={fmt(aRed, 0)} enhet="m²" />
          <Resultat etikett="Avrenning q = i · A_red" verdi={fmt(q, 1)} enhet="l/s" />
          <Resultat etikett="Må holdes tilbake" verdi={fmt(Math.max(0, q - maksUt), 1)} enhet="l/s" tone={q > maksUt ? 'feil' : 'ok'} />
          <Resultat etikett="Forenklet magasinvolum" verdi={fmt(vol, 1)} enhet="m³" />
        </div>
        <p className="mt-3 text-[11px] text-slate-500">
          Magasinvolumet er forenklet: konstant intensitet over én varighet. Forus-fasiten oppgir 65 m³, men dette lar seg ikke
          reprodusere fra oppgitt 10 min (gir ca. 57 m³). Full dimensjonering krever IVF-kurve og søk etter varigheten som gir størst volum.
          TEK17 § 15-8 krever at løsningene til sammen håndterer klimajustert 100-årsregn. Fasitens «20-årsregn» er kommunens påslippskrav og må avklares.
        </p>
      </Kort>

      {/* Visuell A4 PDF-rapport modal for koter og overvann */}
      <KoterRapportModal
        aapen={visRapportModal}
        onLukk={() => setVisRapportModal(false)}
        prosjekt={prosjekt}
        ibr={ibr}
        itr={itr}
        lengde={lengde}
        fallNevner={fallNevner}
        krav={krav}
        hoydeIGroft={hoydeIGroft}
        etasjer={etasjer}
        rader={rader}
        overvannData={overvannData}
        melding={melding}
      />
    </div>
  );
}
