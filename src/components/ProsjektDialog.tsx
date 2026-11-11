import { useState, type ReactNode } from 'react';
import { BYGNINGSTYPER, type ProsjektData } from '../data/prosjekter';
import {
  analyserTekstLokalt,
  flettUttrekkResultater,
  harUttrekkData,
  lagKortFunnTekst,
  lesOgAnalyserFilLokalt,
  type ProsjektFil,
  type UttrekkResultat,
} from '../lib/filer';
import { analyserFilerMedGeminiVision } from '../lib/gemini';
import { slaaOppAdresseOgKoteIKartverket } from '../lib/kartverket';
import type { Innstillinger } from '../lib/lagring';
import { useBekreftSlett } from './common/BekreftSlettModal';
import Modal from './common/Modal';

export interface Skjema {
  navn: string;
  bygningstype: string;
  bra: string;
  etasjer: string;
  sted: string;
  matrikkel: string;
  vaMyndighet: string;
  byggherre: string;
  miljoambisjon: string;
  gate: string;
  ibr: string;
  itr: string;
  vannledning: string;
  stikkLengde: string;
  fallNevner: string;
  gulv: { navn: string; kote: string }[];
  statisk: string;
  antatt: boolean;
  dynamisk: string;
  uttak: string;
  flater: { navn: string; areal: string; phi: string }[];
  intensitet: string;
  paaslipp: string;
  dusjer: string;
  dusjMin: string;
  dusjLs: string;
  tekniskRom: string;
  notater: string;
}

const s = (n: number | null): string => (n === null ? '' : String(n).replace('.', ','));

export function tilSkjema(p: ProsjektData): Skjema {
  return {
    navn: p.navn,
    bygningstype: p.bygningstype,
    bra: s(p.bra),
    etasjer: p.etasjer,
    sted: p.sted,
    matrikkel: p.matrikkel,
    vaMyndighet: p.vaMyndighet,
    byggherre: p.byggherre,
    miljoambisjon: p.miljoambisjon,
    gate: s(p.koter.gate),
    ibr: s(p.koter.ibrKum),
    itr: s(p.koter.itrKum),
    vannledning: s(p.koter.vannledning),
    stikkLengde: s(p.koter.stikkLengde),
    fallNevner: s(p.koter.fallNevner),
    gulv: p.koter.gulv.length > 0 ? p.koter.gulv.map((g) => ({ navn: g.navn, kote: s(g.kote) })) : [{ navn: 'Laveste sluk (OK FG)', kote: '' }],
    statisk: s(p.vanntrykk.statiskBar),
    antatt: p.vanntrykk.antatt,
    dynamisk: s(p.vanntrykk.dynamiskBar),
    uttak: s(p.vanntrykk.uttakLmin),
    flater:
      p.overvann.flater.length > 0
        ? p.overvann.flater.map((f) => ({ navn: f.navn, areal: s(f.areal), phi: s(f.phi) }))
        : [
            { navn: 'Tak', areal: '', phi: '0,9' },
            { navn: 'Asfalt / belegg', areal: '', phi: '0,8' },
          ],
    intensitet: s(p.overvann.intensitet),
    paaslipp: s(p.overvann.maksPaaslippLs),
    dusjer: s(p.belastning.dusjer),
    dusjMin: s(p.belastning.dusjMinutter),
    dusjLs: s(p.belastning.dusjLs),
    tekniskRom: s(p.tekniskRomM2),
    notater: p.notater,
  };
}

const lesTall = (tekst: string): number | null | 'feil' => {
  const t = tekst.trim().replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : 'feil';
};

/** Gjør skjemaet om til prosjektdata. Returnerer feilmeldinger i stedet for å gjette ved ugyldig input. */
export function fraSkjema(f: Skjema, base: ProsjektData): { prosjekt?: ProsjektData; feil: string[] } {
  const feil: string[] = [];
  const tall = (etikett: string, tekst: string, min?: number): number | null => {
    const v = lesTall(tekst);
    if (v === 'feil') {
      feil.push(`«${etikett}» er ikke et gyldig tall.`);
      return null;
    }
    if (v !== null && min !== undefined && v < min) {
      feil.push(`«${etikett}» må være minst ${min}.`);
      return null;
    }
    return v;
  };
  if (f.navn.trim() === '') feil.push('Prosjektnavn må fylles ut.');

  const gulv = f.gulv
    .filter((g) => g.kote.trim() !== '')
    .map((g) => ({ navn: g.navn.trim() || 'Laveste sluk (OK FG)', kote: tall(`Kote ${g.navn || 'sluk'}`, g.kote) }))
    .filter((g): g is { navn: string; kote: number } => g.kote !== null);
  const flater = f.flater
    .filter((x) => x.areal.trim() !== '')
    .map((x) => ({ navn: x.navn.trim() || 'Flate', areal: tall(`Areal ${x.navn}`, x.areal, 0) ?? 0, phi: tall(`φ ${x.navn}`, x.phi, 0) }))
    .filter((x) => x.areal > 0);

  const statisk = tall('Statisk vanntrykk', f.statisk, 0);
  const fall = tall('Fall (1:N)', f.fallNevner, 1);

  const prosjekt: ProsjektData = {
    ...base,
    navn: f.navn.trim(),
    bygningstype: f.bygningstype,
    bra: tall('BRA', f.bra, 1),
    etasjer: f.etasjer.trim(),
    sted: f.sted.trim(),
    matrikkel: f.matrikkel.trim(),
    vaMyndighet: f.vaMyndighet.trim(),
    byggherre: f.byggherre.trim(),
    miljoambisjon: f.miljoambisjon.trim(),
    koter: {
      gate: tall('Kote terreng/gatelokk', f.gate),
      ibrKum: tall('IBR i kum', f.ibr),
      itrKum: tall('ITR i kum', f.itr),
      vannledning: tall('Kote vannledning', f.vannledning),
      stikkLengde: tall('Stikkledning lengde', f.stikkLengde, 0),
      fallNevner: fall,
      gulv,
    },
    vanntrykk: {
      statiskBar: statisk,
      antatt: f.antatt && statisk !== null,
      dynamiskBar: tall('Dynamisk vanntrykk', f.dynamisk, 0),
      uttakLmin: tall('Uttak (l/min)', f.uttak, 0),
    },
    overvann: { flater, intensitet: tall('Regnintensitet', f.intensitet, 0), maksPaaslippLs: tall('Maks påslipp', f.paaslipp, 0) },
    belastning: { dusjer: tall('Antall dusjer', f.dusjer, 0), dusjMinutter: tall('Dusjvarighet', f.dusjMin, 0), dusjLs: tall('l/s per dusj', f.dusjLs, 0) },
    tekniskRomM2: tall('Teknisk rom', f.tekniskRom, 0),
    notater: f.notater.trim(),
  };
  return feil.length > 0 ? { feil } : { prosjekt, feil };
}

const inputKlasse = 'mt-1 min-h-[44px] w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500';

function Felt({ etikett, hjelp, children, className = '' }: { etikett: string; hjelp?: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block text-xs font-semibold text-slate-300 ${className}`}>
      {etikett}
      {children}
      {hjelp && <span className="mt-0.5 block text-[10px] font-normal text-slate-500">{hjelp}</span>}
    </label>
  );
}

function Seksjon({ tittel, children }: { tittel: string; children: ReactNode }) {
  return (
    <fieldset className="rounded-lg border border-slate-700 p-4">
      <legend className="px-2 text-xs font-bold uppercase tracking-wider text-emerald-400">{tittel}</legend>
      {children}
    </fieldset>
  );
}

export function flettUttrekkInnISkjema(prev: Skjema, u: UttrekkResultat): Skjema {
  const skalOppdatereNavn =
    Boolean(u.navn) &&
    (Boolean(u.eksaktNavnFraTekst) ||
      !prev.navn.trim() ||
      prev.navn === 'Nytt prosjekt' ||
      prev.navn.endsWith('(Kopi)'));

  const nyttNavn = skalOppdatereNavn
    ? u.navn!
    : (!prev.navn.trim() || prev.navn === 'Nytt prosjekt') && u.sted
    ? u.sted
    : prev.navn;

  let nyeGulv = prev.gulv;
  if (u.koter?.gulv && u.koter.gulv.length > 0) {
    nyeGulv = u.koter.gulv.map((g) => ({
      navn: g.navn,
      kote: s(g.kote),
    }));
  }

  return {
    ...prev,
    navn: nyttNavn,
    bygningstype: u.bygningstype || prev.bygningstype,
    bra: u.bra !== undefined ? s(u.bra) : prev.bra,
    etasjer: u.etasjer || prev.etasjer,
    sted: u.sted || prev.sted,
    matrikkel: u.matrikkel || prev.matrikkel,
    vaMyndighet: u.vaMyndighet || prev.vaMyndighet,
    byggherre: u.byggherre || prev.byggherre,
    miljoambisjon: u.miljoambisjon || prev.miljoambisjon,
    gate: u.koter?.gate !== undefined ? s(u.koter.gate) : prev.gate,
    ibr: u.koter?.ibrKum !== undefined ? s(u.koter.ibrKum) : prev.ibr,
    itr: u.koter?.itrKum !== undefined ? s(u.koter.itrKum) : prev.itr,
    vannledning:
      u.koter?.vannledning !== undefined ? s(u.koter.vannledning) : prev.vannledning,
    stikkLengde:
      u.koter?.stikkLengde !== undefined ? s(u.koter.stikkLengde) : prev.stikkLengde,
    fallNevner:
      u.koter?.fallNevner !== undefined ? s(u.koter.fallNevner) : prev.fallNevner,
    gulv: nyeGulv,
    statisk:
      u.vanntrykk?.statiskBar !== undefined
        ? s(u.vanntrykk.statiskBar)
        : prev.statisk,
    antatt: u.vanntrykk?.antatt ?? prev.antatt,
    dynamisk:
      u.vanntrykk?.dynamiskBar !== undefined
        ? s(u.vanntrykk.dynamiskBar)
        : prev.dynamisk,
    uttak:
      u.vanntrykk?.uttakLmin !== undefined ? s(u.vanntrykk.uttakLmin) : prev.uttak,
    intensitet:
      u.overvann?.intensitet !== undefined
        ? s(u.overvann.intensitet)
        : prev.intensitet,
    paaslipp:
      u.overvann?.maksPaaslippLs !== undefined
        ? s(u.overvann.maksPaaslippLs)
        : prev.paaslipp,
    dusjer:
      u.belastning?.dusjer !== undefined ? s(u.belastning.dusjer) : prev.dusjer,
    tekniskRom:
      u.tekniskRomM2 !== undefined ? s(u.tekniskRomM2) : prev.tekniskRom,
    notater: u.oppsummering
      ? [prev.notater, u.oppsummering].filter(Boolean).join('\n\n')
      : prev.notater,
  };
}

export default function ProsjektDialog({
  tittel,
  start,
  innstillinger,
  onLagre,
  onAvbryt,
  onFilerLastetOpp,
  onSlettProsjekt,
}: {
  tittel: string;
  start: ProsjektData;
  innstillinger?: Innstillinger;
  onLagre: (p: ProsjektData) => void;
  onAvbryt: () => void;
  onFilerLastetOpp?: (nye: ProsjektFil[]) => void;
  onSlettProsjekt?: () => void;
}) {
  const [f, setF] = useState<Skjema>(() => tilSkjema(start));
  const [feil, setFeil] = useState<string[]>([]);
  const [opplastetInfo, setOpplastetInfo] = useState<string | null>(null);
  const [lasterFiler, setLasterFiler] = useState(false);
  const [sokerKartverket, setSokerKartverket] = useState(false);
  const [kartverketMelding, setKartverketMelding] = useState<string | null>(null);
  const bekreftSlett = useBekreftSlett();
  const sett = <K extends keyof Skjema>(k: K, v: Skjema[K]) => setF((x) => ({ ...x, [k]: v }));
  const tekstFelt = (k: keyof Skjema, etikett: string, hjelp?: string, className = '') => (
    <Felt etikett={etikett} hjelp={hjelp} className={className}>
      <input className={inputKlasse} value={f[k] as string} onChange={(e) => sett(k, e.target.value as never)} />
    </Felt>
  );

  const slaaOppIKartverket = async (adresseTekst?: string) => {
    const sok = (adresseTekst ?? f.sted).trim();
    if (sok.length < 3) {
      setKartverketMelding('⚠️ Skriv inn gateadresse (f.eks. Kongsgata 10, Stavanger) først.');
      return;
    }
    setSokerKartverket(true);
    setKartverketMelding(null);
    try {
      const oppslag = await slaaOppAdresseOgKoteIKartverket(sok);
      if (!oppslag) {
        setKartverketMelding(`⚠️ Fant ingen treff i Kartverket for «${sok}».`);
        return;
      }
      const { valgt, terrengkoteNn2000, datakilde } = oppslag;
      setF((prev) => ({
        ...prev,
        sted: valgt.fullAdresse || prev.sted,
        matrikkel: valgt.matrikkelTekst || prev.matrikkel,
        vaMyndighet: valgt.vaMyndighetTekst || prev.vaMyndighet,
        gate:
          terrengkoteNn2000 !== null
            ? String(terrengkoteNn2000).replace('.', ',')
            : prev.gate,
      }));
      setKartverketMelding(
        `✅ Kartverket: ${valgt.fullAdresse} · ${valgt.matrikkelTekst}${
          terrengkoteNn2000 !== null
            ? ` · Terrengkote C +${terrengkoteNn2000.toFixed(2)} moh (${datakilde ?? 'NN2000'})`
            : ''
        }`
      );
    } catch {
      setKartverketMelding('⚠️ Kunne ikke kontakte Kartverkets API akkurat nå.');
    } finally {
      setSokerKartverket(false);
    }
  };

  const behandleSlupneFiler = async (fileList: FileList) => {
    const arr = Array.from(fileList);
    if (arr.length === 0) return;
    setLasterFiler(true);
    try {
      const nye: ProsjektFil[] = [];
      const tekster: string[] = [];
      for (const file of arr) {
        const pf = await lesOgAnalyserFilLokalt(file, start.id);
        nye.push(pf);
        if (pf.uttrukketTekst) tekster.push(pf.uttrukketTekst);
      }
      if (onFilerLastetOpp) onFilerLastetOpp(nye);

      let uttrekk = analyserTekstLokalt(tekster.join('\n\n'), arr[0]?.name ?? '');
      setF((prev) => flettUttrekkInnISkjema(prev, uttrekk));
      setOpplastetInfo(lagKortFunnTekst(uttrekk));

      // Hvis brukeren har Gemini API-nøkkel: kjør også AI Vision for bilder/PDF
      if (innstillinger?.geminiNokkel?.trim()) {
        try {
          const aiUttrekk = await analyserFilerMedGeminiVision({
            nokkel: innstillinger.geminiNokkel,
            modell: innstillinger.modell,
            filer: nye.slice(0, 8),
          });
          if (harUttrekkData(aiUttrekk)) {
            uttrekk = flettUttrekkResultater(uttrekk, aiUttrekk);
            setF((prev) => flettUttrekkInnISkjema(prev, uttrekk));
            setOpplastetInfo(lagKortFunnTekst(uttrekk));
          }
        } catch {
          // Stille fallback til lokalt uttrekk
        }
      }

      if (uttrekk.sted) {
        void slaaOppIKartverket(uttrekk.sted);
      }
    } finally {
      setLasterFiler(false);
    }
  };

  const lagre = () => {
    const r = fraSkjema(f, start);
    if (r.prosjekt) onLagre(r.prosjekt);
    else setFeil(r.feil);
  };

  return (
    <Modal tittel={tittel} onLukk={onAvbryt} bredde="max-w-4xl">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          lagre();
        }}
      >
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer?.files?.length) void behandleSlupneFiler(e.dataTransfer.files);
          }}
          onPaste={(e) => {
            if (e.clipboardData?.files?.length) {
              e.preventDefault();
              void behandleSlupneFiler(e.clipboardData.files);
            }
          }}
          className="rounded-lg border border-dashed border-emerald-700/70 bg-emerald-950/20 p-3 text-xs text-slate-300"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              📂{' '}
              <strong>
                {lasterFiler
                  ? 'Leser filinnhold og fyller ut skjema …'
                  : 'Dra og slipp (eller lim inn med Ctrl+V)'}
              </strong>{' '}
              Markdown (.md), TXT, PDF, Word, Excel, VA-kart eller plantegning her for å fylle ut feltene automatisk.
            </span>
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex min-h-[44px] cursor-pointer items-center rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-500">
                📎 Velg fil(er)
                <input
                  type="file"
                  multiple
                  accept=".pdf,.xlsx,.xls,.csv,.tsv,.docx,.doc,.txt,.md,.markdown,.json,.png,.jpg,.jpeg,.webp,text/markdown,text/plain,image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.length) {
                      void behandleSlupneFiler(e.target.files);
                      e.target.value = '';
                    }
                  }}
                />
              </label>
              <label className="inline-flex min-h-[44px] cursor-pointer items-center rounded-lg border border-emerald-600 bg-emerald-950/60 px-3 py-2 text-xs font-bold text-emerald-200 hover:bg-emerald-900">
                📸 Ta bilde
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.length) {
                      void behandleSlupneFiler(e.target.files);
                      e.target.value = '';
                    }
                  }}
                />
              </label>
            </div>
          </div>
          {opplastetInfo && (
            <div
              role="status"
              className="mt-2.5 rounded-lg border-2 border-emerald-500 bg-emerald-950/80 px-3 py-2 text-xs font-bold text-emerald-100 shadow"
            >
              ✅ {opplastetInfo}
            </div>
          )}
        </div>

        <p className="text-xs text-slate-400">
          Kun prosjektnavn er påkrevd. Felt du lar stå tomme blir <strong>ikke</strong> gjettet – appen flagger dem som ⚠️ HINT (Lov 1) og hopper over beregninger som mangler data.
        </p>

        <Seksjon tittel="Prosjekt & Kartverket-oppslag">
          <div className="grid gap-3 sm:grid-cols-3">
            <Felt etikett="Prosjektnavn *" className="sm:col-span-2">
              <input className={inputKlasse} autoFocus value={f.navn} onChange={(e) => sett('navn', e.target.value)} placeholder="F.eks. Bjørkeveien 12" />
            </Felt>
            <Felt etikett="Bygningstype">
              <select className={inputKlasse} value={f.bygningstype} onChange={(e) => sett('bygningstype', e.target.value)}>
                {[...new Set([...BYGNINGSTYPER, f.bygningstype])].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Felt>

            <div className="sm:col-span-3 rounded-lg border border-emerald-800/60 bg-slate-900/70 p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <Felt etikett="Adresse / sted (søk i Kartverket)" className="flex-1">
                  <input
                    className={inputKlasse}
                    value={f.sted}
                    onChange={(e) => sett('sted', e.target.value)}
                    placeholder="F.eks. Kongsgata 10, 4005 Stavanger"
                  />
                </Felt>
                <button
                  type="button"
                  disabled={sokerKartverket}
                  onClick={() => void slaaOppIKartverket()}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-extrabold text-white shadow hover:bg-emerald-500 disabled:opacity-50"
                >
                  {sokerKartverket
                    ? '🔍 Søker i Kartverket …'
                    : '🔍 Søk adresse & hent Gnr/Bnr + Kote fra Kartverket'}
                </button>
              </div>
              {kartverketMelding && (
                <div className="mt-2 text-xs font-semibold text-emerald-300">
                  {kartverketMelding}
                </div>
              )}
            </div>

            {tekstFelt('matrikkel', 'Gnr/Bnr (fra Kartverket)', 'F.eks. Gnr. 55 / Bnr. 210')}
            {tekstFelt('vaMyndighet', 'Kommunal VA-myndighet')}
            {tekstFelt('byggherre', 'Byggherre / oppdragsgiver')}
            {tekstFelt('bra', 'Oppvarmet BRA (m²)')}
            {tekstFelt('etasjer', 'Etasjer', 'F.eks. 3 + kjeller')}
          </div>
        </Seksjon>

        <Seksjon tittel="Koter (NN2000) – tilbakeslagskontroll, Lov 2">
          <div className="grid gap-3 sm:grid-cols-4">
            {tekstFelt('gate', 'Terrengkote på tomta (fra Kartverket, m)', 'NN2000 moh')}
            {tekstFelt('itr', 'Kote ITK/ITR (innv. topp kum/rør, m)', 'Fra kommunalt VA-kart')}
            {tekstFelt('ibr', 'Kote IBR (innv. bunn rør i kum, m)', 'Fra kommunalt VA-kart')}
            {tekstFelt('vannledning', 'Kommunal vannledning (m)')}
            {tekstFelt('stikkLengde', 'Stikkledning, lengde (m)')}
            <Felt etikett="Fall 1:">
              <input className={inputKlasse} value={f.fallNevner} onChange={(e) => sett('fallNevner', e.target.value)} />
            </Felt>
          </div>
          <div className="mt-4 text-xs font-semibold text-slate-300">Laveste sluk / ferdig gulv (OK FG)</div>
          <div className="mt-1 space-y-2">
            {f.gulv.map((g, i) => (
              <div key={i} className="grid grid-cols-12 items-center gap-2">
                <input aria-label="Navn" className={`${inputKlasse} col-span-6 sm:col-span-7 mt-0`} value={g.navn} onChange={(e) => sett('gulv', f.gulv.map((x, j) => (j === i ? { ...x, navn: e.target.value } : x)))} />
                <input aria-label="Kote" placeholder="Kote (m)" className={`${inputKlasse} col-span-4 mt-0 text-right font-mono`} value={g.kote} onChange={(e) => sett('gulv', f.gulv.map((x, j) => (j === i ? { ...x, kote: e.target.value } : x)))} />
                <button
                  type="button"
                  aria-label="Fjern rad"
                  title="Slett gulv/sluk-rad (krever bekreftelse)"
                  className="col-span-2 sm:col-span-1 inline-flex min-h-[44px] items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-400 hover:border-rose-700 hover:bg-rose-950/50 hover:text-rose-300"
                  onClick={() =>
                    bekreftSlett({
                      tittel: 'Fjerne gulv-/slukkote?',
                      elementNavn: `${g.navn || 'Gulv/sluk'} (${g.kote ? `Kote +${g.kote}` : 'tom kote'})`,
                      beskrivelse: 'Er du sikker på at du vil slette denne gulv-/slukraden fra prosjektets kotedata?',
                      bekreftTekst: '🗑️ Fjern rad',
                      onBekreft: () => sett('gulv', f.gulv.filter((_, j) => j !== i)),
                    })
                  }
                >
                  ✕
                </button>
              </div>
            ))}
            <button type="button" className="min-h-[44px] rounded-lg bg-slate-700 px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-slate-600" onClick={() => sett('gulv', [...f.gulv, { navn: `Etasje ${f.gulv.length + 1}`, kote: '' }])}>
              + Legg til gulv/sluk
            </button>
          </div>
        </Seksjon>

        <Seksjon tittel="Vanntrykk">
          <div className="grid gap-3 sm:grid-cols-4">
            {tekstFelt('statisk', 'Statisk trykk (bar)')}
            {tekstFelt('dynamisk', 'Dynamisk trykk, Q/p (bar)')}
            {tekstFelt('uttak', 'Ved uttak (l/min)')}
            <label className="flex items-end gap-2 pb-2 text-xs text-slate-300">
              <input type="checkbox" checked={f.antatt} onChange={(e) => sett('antatt', e.target.checked)} />
              Statisk trykk er antatt (ikke målt)
            </label>
          </div>
        </Seksjon>

        <details className="rounded-lg border border-slate-700 p-4">
          <summary className="cursor-pointer text-xs font-bold uppercase tracking-wider text-emerald-400">Valgfritt: overvann, dusjer, teknisk rom, notater</summary>
          <div className="mt-4 space-y-4">
            <div>
              <div className="text-xs font-semibold text-slate-300">Overvannsflater (areal og avrenningsfaktor φ)</div>
              <div className="mt-1 space-y-2">
                {f.flater.map((x, i) => (
                  <div key={i} className="grid grid-cols-12 items-center gap-2">
                    <input aria-label="Flate" className={`${inputKlasse} col-span-4 sm:col-span-5 mt-0`} value={x.navn} onChange={(e) => sett('flater', f.flater.map((y, j) => (j === i ? { ...y, navn: e.target.value } : y)))} />
                    <input aria-label="Areal" placeholder="m²" className={`${inputKlasse} col-span-3 mt-0 text-right font-mono`} value={x.areal} onChange={(e) => sett('flater', f.flater.map((y, j) => (j === i ? { ...y, areal: e.target.value } : y)))} />
                    <input aria-label="φ" placeholder="φ" className={`${inputKlasse} col-span-3 mt-0 text-right font-mono`} value={x.phi} onChange={(e) => sett('flater', f.flater.map((y, j) => (j === i ? { ...y, phi: e.target.value } : y)))} />
                    <button
                      type="button"
                      aria-label="Fjern flate"
                      title="Slett overvannsflate (krever bekreftelse)"
                      className="col-span-2 sm:col-span-1 inline-flex min-h-[44px] items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-400 hover:border-rose-700 hover:bg-rose-950/50 hover:text-rose-300"
                      onClick={() =>
                        bekreftSlett({
                          tittel: 'Fjerne overvannsflate?',
                          elementNavn: `${x.navn || 'Flate'} (${x.areal ? `${x.areal} m²` : 'tomt areal'})`,
                          beskrivelse: 'Er du sikker på at du vil slette denne overvannsflaten fra prosjektet?',
                          bekreftTekst: '🗑️ Fjern flate',
                          onBekreft: () => sett('flater', f.flater.filter((_, j) => j !== i)),
                        })
                      }
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button type="button" className="min-h-[44px] rounded-lg bg-slate-700 px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-slate-600" onClick={() => sett('flater', [...f.flater, { navn: 'Ny flate', areal: '', phi: '0,9' }])}>
                  + Legg til flate
                </button>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {tekstFelt('intensitet', 'Regnintensitet, klimajustert (l/(s·ha))', 'Kommunens dimensjonerende verdi')}
                {tekstFelt('paaslipp', 'Maks påslipp til kommunalt nett (l/s)')}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              {tekstFelt('dusjer', 'Samtidige dusjer')}
              {tekstFelt('dusjMin', 'Varighet (min)')}
              {tekstFelt('dusjLs', 'l/s per dusj')}
              {tekstFelt('tekniskRom', 'Teknisk rom avsatt av ARK (m²)')}
            </div>
            <Felt etikett="Notater">
              <textarea className={`${inputKlasse} h-20`} value={f.notater} onChange={(e) => sett('notater', e.target.value)} />
            </Felt>
          </div>
        </details>

        {feil.length > 0 && (
          <div role="alert" className="rounded-lg border border-rose-700 bg-rose-950/60 p-3 text-xs text-rose-200">
            {feil.map((x) => (
              <div key={x}>• {x}</div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-4">
          <div>
            {onSlettProsjekt && (
              <button
                type="button"
                onClick={onSlettProsjekt}
                className="inline-flex min-h-[44px] items-center rounded-lg border border-rose-800 bg-rose-950/50 px-3.5 py-2 text-xs font-bold text-rose-200 hover:bg-rose-900"
              >
                🗑️ Slett prosjekt
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onAvbryt} className="min-h-[44px] rounded-lg border border-slate-600 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800">
              Avbryt
            </button>
            <button type="submit" className="min-h-[44px] rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500">
              💾 Lagre prosjekt
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
