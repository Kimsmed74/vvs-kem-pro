import { useEffect, useState } from 'react';
import type { ProsjektData } from '../data/prosjekter';
import type { ProsjektAnalyse } from '../lib/analyse';
import { BEREDER_ANTAGELSER } from '../lib/analyse';
import type { ProsjektFil, UttrekkResultat } from '../lib/filer';
import { FIL_KATEGORI_ETIKETTER } from '../lib/filer';
import { lastNedTekst } from '../lib/format';
import {
  flettKartverketInnIProsjekt,
  hentKartverketTerrengkote,
  sokKartverketAdresse,
  type KartverketAdresseTreff,
} from '../lib/kartverket';
import type { Innstillinger, OverstyringInfo } from '../lib/lagring';
import {
  QA_PUNKTER,
  SANITY_PUNKTER,
  beregnKravVarmesentralM2,
  vurderKotekontrollStatus,
  beregnSignaturStatus,
} from '../lib/qa';
import { lagQaRapport } from '../lib/rapport';
import FilOpplaster from './FilOpplaster';
import GatekeeperPanel from './GatekeeperPanel';
import MoteOpptaker from './MoteOpptaker';
import TrykkOgKoteVeileder from './TrykkOgKoteVeileder';
import type { FaneId } from './modules/01_sanitaer';
import { Knapp, Kort } from './common/ui';

interface Props {
  prosjekt: ProsjektData;
  analyse: ProsjektAnalyse;
  filer: readonly ProsjektFil[];
  innstillinger: Innstillinger;
  aktivtSteg: number;
  ferdigeSteg: Record<string, boolean>;
  qa: Record<string, boolean>;
  overstyringer: Record<string, OverstyringInfo>;
  godkjent?: {
    laast: boolean;
    tidspunkt: string;
    medForbehold: boolean;
  };
  onSettSteg: (steg: number) => void;
  onToggleStegFerdig: (steg: number) => void;
  onToggleQa: (id: string) => void;
  onNullstillQa?: () => void;
  onFilerLastetOpp: (nye: ProsjektFil[]) => void;
  onOppdaterFil: (oppdatert: ProsjektFil) => void;
  onBrukUttrekk: (uttrekk: UttrekkResultat, modus: 'oppdater' | 'nytt') => void;
  onOppdaterProsjekt: (oppdatert: ProsjektData, endringer?: string[]) => void;
  onOppdaterProsjektOgOverstyringer: (
    oppdatertProsjekt: ProsjektData,
    nyeOverstyringer: Record<string, OverstyringInfo>,
    endringer: string[]
  ) => void;
  onGodkjennOgLaasProsjekt: (medForbehold: boolean) => void;
  onApneGalleri: () => void;
  onAnalyserFilIChat: (filId: string, sporsmal?: string) => void;
  onApneChatMedSporsmal: (agentId: string, sporsmal: string) => void;
  onRedigerProsjekt: () => void;
  onNyttProsjekt: () => void;
  onSlettProsjekt: () => void;
  onApneSanitaer: (fane: FaneId) => void;
  onVelgAgent: (agentId: string) => void;
  onApneChat: (agentId: string) => void;
  onApneSuperKommandoer: () => void;
  onApneQaPort: () => void;
  onApneDashbord?: () => void;
  onApneInnstillinger: () => void;
  onApneHjelp: () => void;
  melding: (tekst: string) => void;
}

const STEG_DEF = [
  {
    nr: 1,
    tittel: 'Steg 1: Dokumenter, Tegninger & Oppstart',
    undertittel: 'Last opp PDF/tegninger/bilder (AI Vision) og registrer prosjektdata (Agent 01)',
    ikon: '📂',
    agentId: 'agent-01',
  },
  {
    nr: 2,
    tittel: 'Steg 2: Sanitær, VA & Koter',
    undertittel: '950 mm tilbakeslagssjekk (Lov 2), trykkfall, spillvann, overvann og VVB',
    ikon: '💧',
    agentId: 'agent-19',
  },
  {
    nr: 3,
    tittel: 'Steg 3: Varme, Kjøling & Ventilasjon',
    undertittel: 'TEK17 § 14-4 varmesentral, 3 alternativer, hydronikk, ventilasjon og kjøling',
    ikon: '🔥',
    agentId: 'agent-04',
  },
  {
    nr: 4,
    tittel: 'Steg 4: Brann, ITB & Energi',
    undertittel: 'Sprinkler Q/p, branntromler, ITB/elektrogrense, NS 3031 og 25-års LCC',
    ikon: '🧯',
    agentId: 'agent-05',
  },
  {
    nr: 5,
    tittel: 'Steg 5: Kvalitetssikring (Agent 16) & Rapport',
    undertittel: 'Djevelens Advokat, reversert formelsjekk, 6-punkts signatur og ferdig rapport',
    ikon: '🛡️',
    agentId: 'agent-16',
  },
] as const;

export default function ProsjektVeiviser({
  prosjekt,
  analyse,
  filer,
  innstillinger,
  aktivtSteg,
  ferdigeSteg,
  qa,
  overstyringer,
  godkjent,
  onSettSteg,
  onToggleStegFerdig,
  onToggleQa,
  onNullstillQa,
  onFilerLastetOpp,
  onOppdaterFil,
  onBrukUttrekk,
  onOppdaterProsjekt,
  onOppdaterProsjektOgOverstyringer,
  onGodkjennOgLaasProsjekt,
  onApneGalleri,
  onAnalyserFilIChat,
  onApneChatMedSporsmal,
  onRedigerProsjekt,
  onNyttProsjekt,
  onSlettProsjekt,
  onApneSanitaer,
  onVelgAgent,
  onApneChat,
  onApneSuperKommandoer,
  onApneQaPort,
  onApneInnstillinger,
  onApneHjelp,
  melding,
}: Props) {
  const [visHurtigGuide, setVisHurtigGuide] = useState(true);
  const [adresseSok, setAdresseSok] = useState(prosjekt.sted || '');
  const [sokerKartverket, setSokerKartverket] = useState(false);
  const [kartverketTreff, setKartverketTreff] = useState<KartverketAdresseTreff[]>([]);
  const [kartverketStatus, setKartverketStatus] = useState<string | null>(null);

  useEffect(() => {
    setAdresseSok(prosjekt.sted || '');
    setKartverketTreff([]);
    setKartverketStatus(null);
  }, [prosjekt.id, prosjekt.sted]);

  const steg = STEG_DEF.find((s) => s.nr === aktivtSteg) ?? STEG_DEF[0];
  const qaFullfort = QA_PUNKTER.filter((p) => qa[p.id]).length;
  const signaturStatus = beregnSignaturStatus(qa);
  const koteStatus = vurderKotekontrollStatus(prosjekt, analyse, qa);

  const velgKartverketTreff = async (treff: KartverketAdresseTreff) => {
    setSokerKartverket(true);
    try {
      let terrengKote: number | null = null;
      let terrengKilde = 'NN2000';
      if (treff.lat !== null && treff.lon !== null) {
        const hoyde = await hentKartverketTerrengkote(treff.lat, treff.lon);
        if (hoyde.koteNn2000 !== null) {
          terrengKote = hoyde.koteNn2000;
          terrengKilde = hoyde.datakilde ?? 'NN2000';
        }
      }
      const { prosjekt: oppdatert, endringer } = flettKartverketInnIProsjekt(prosjekt, {
        valgt: treff,
        alleTreff: [treff],
        terrengkoteNn2000: terrengKote,
        datakilde: terrengKilde,
      });
      onOppdaterProsjekt(oppdatert, endringer);
      setAdresseSok(oppdatert.sted);
      setKartverketStatus(
        `✅ Kartverket: ${oppdatert.sted} · ${oppdatert.matrikkel} · ${oppdatert.vaMyndighet}${
          terrengKote !== null ? ` · Terrengkote C +${terrengKote.toFixed(2)} moh (${terrengKilde})` : ''
        }`
      );
      melding(
        `🗺️ Hentet fra Kartverket: ${oppdatert.matrikkel}${
          terrengKote !== null ? ` og terrengkote C +${terrengKote.toFixed(2)} moh` : ''
        }!`
      );
    } catch {
      setKartverketStatus('⚠️ Kunne ikke hente høydedata fra Kartverket akkurat nå.');
    } finally {
      setSokerKartverket(false);
    }
  };

  const kjorKartverketSok = async () => {
    const sok = (adresseSok || prosjekt.sted).trim();
    if (sok.length < 3) {
      melding('Skriv inn en gateadresse (f.eks. «Kongsgata 10, Stavanger») før du søker.');
      return;
    }
    setSokerKartverket(true);
    setKartverketStatus(null);
    try {
      const treff = await sokKartverketAdresse(sok);
      setKartverketTreff(treff);
      if (treff.length === 0) {
        setKartverketStatus(`⚠️ Fant ingen adresser i Kartverket for «${sok}». Prøv gatenavn + husnummer.`);
        setSokerKartverket(false);
        return;
      }
      await velgKartverketTreff(treff[0]);
    } catch {
      setKartverketStatus('⚠️ Nettverksfeil mot Kartverket API (ws.geonorge.no).');
      setSokerKartverket(false);
    }
  };

  const oppdaterKoteFelt = (
    felt: 'gate' | 'itrKum' | 'ibrKum' | 'lavesteSluk',
    verdiTekst: string
  ) => {
    const ren = verdiTekst.trim().replace(',', '.');
    const tall = ren === '' ? null : Number(ren);
    if (tall !== null && !Number.isFinite(tall)) return;

    if (felt === 'lavesteSluk') {
      const eksisterende = prosjekt.koter.gulv;
      const nyGulv =
        tall === null
          ? eksisterende.slice(1)
          : eksisterende.length > 0
          ? [{ ...eksisterende[0], kote: tall }, ...eksisterende.slice(1)]
          : [{ navn: 'Laveste sluk (OK FG)', kote: tall }];
      onOppdaterProsjekt({
        ...prosjekt,
        kilde: 'bruker',
        koter: { ...prosjekt.koter, gulv: nyGulv },
      });
    } else {
      onOppdaterProsjekt({
        ...prosjekt,
        kilde: 'bruker',
        koter: { ...prosjekt.koter, [felt]: tall },
      });
    }
  };

  const estimerKumFraTerrengkote = () => {
    if (prosjekt.koter.gate === null) {
      melding('Hent eller fyll inn Terrengkote på tomta først for å estimere kumdybde.');
      return;
    }
    // Standard kommunal hovedledning frostfri dybde: ITK ca. 1,60 m under terreng, IBR ca. 1,85 m under terreng
    const estItk = Math.round((prosjekt.koter.gate - 1.6) * 100) / 100;
    const estIbr = Math.round((prosjekt.koter.gate - 1.85) * 100) / 100;
    const notatTillegg = `[Estimat fra terrengkote C +${prosjekt.koter.gate.toFixed(2)}]: ITK antatt C +${estItk.toFixed(2)} (-1,60 m) og IBR antatt C +${estIbr.toFixed(2)} (-1,85 m) inntil kommunalt VA-kart foreligger.`;
    onOppdaterProsjekt(
      {
        ...prosjekt,
        kilde: 'bruker',
        koter: {
          ...prosjekt.koter,
          itrKum: estItk,
          ibrKum: estIbr,
        },
        notater: prosjekt.notater
          ? `${prosjekt.notater}\n${notatTillegg}`
          : notatTillegg,
      },
      [
        `Estimerte Kote ITK/ITR til C +${estItk.toFixed(2)} moh (terrengkote - 1,60 m)`,
        `Estimerte Kote IBR til C +${estIbr.toFixed(2)} moh (terrengkote - 1,85 m)`,
      ]
    );
  };

  const kopierQa = () => {
    const rapport = lagQaRapport(prosjekt, analyse, qa, qa, overstyringer);
    navigator.clipboard?.writeText(rapport);
    melding('📋 Komplett prosjekt- og QA-rapport kopiert til utklippstavlen!');
  };

  const lastNedQa = () => {
    const rapport = lagQaRapport(prosjekt, analyse, qa, qa, overstyringer);
    const filnavn = `${prosjekt.navn.toLowerCase().replace(/[^a-z0-9]+/gi, '-')}-qa-rapport.txt`;
    lastNedTekst(filnavn, rapport);
    melding('📥 QA-rapport lastet ned som .TXT!');
  };

  return (
    <div className="space-y-6">
      {/* Toppboks: Slik bruker du appen */}
      <div className="rounded-xl border border-emerald-800/70 bg-gradient-to-r from-emerald-950/50 via-slate-900 to-slate-900 p-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🚀</span>
              <h2 className="text-lg font-black text-emerald-300">
                Prosjektveiviser (Steg-for-steg fra A til Å)
              </h2>
              <span className="rounded border border-emerald-700 bg-emerald-950 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
                {prosjekt.navn}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-300">
              Følg de 5 stegene fra opplasting av tegninger/dokumenter til ferdig kvalitetssikret VVS-leveranse. Alt lagres permanent i IndexedDB.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Knapp variant="sekundar" onClick={onApneGalleri}>
              🖼️ Prosjektgalleri ({filer.length})
            </Knapp>
            <Knapp variant="sekundar" onClick={() => setVisHurtigGuide((v) => !v)}>
              {visHurtigGuide ? '🔽 Skjul hurtigguide' : '💡 Vis hurtigguide'}
            </Knapp>
            <Knapp variant="sekundar" onClick={onApneHjelp}>
              ❓ Slik bruker du appen
            </Knapp>
            <Knapp variant="fare" onClick={onSlettProsjekt}>
              🗑️ Slett prosjekt
            </Knapp>
          </div>
        </div>

        {visHurtigGuide && (
          <div className="mt-4 grid grid-cols-1 gap-3 border-t border-emerald-900/60 pt-4 text-xs md:grid-cols-2 xl:grid-cols-5">
            {STEG_DEF.map((s) => (
              <div
                key={s.nr}
                onClick={() => onSettSteg(s.nr)}
                className="cursor-pointer rounded-lg border border-slate-800 bg-slate-950/80 p-3.5 hover:border-emerald-600"
              >
                <div className="font-bold text-emerald-300">
                  {s.ikon} Steg {s.nr}
                </div>
                <p className="mt-1 text-[11px] text-slate-400">{s.undertittel}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stegvelger (1 -> 2 -> 3 -> 4 -> 5) */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        {STEG_DEF.map((s) => {
          const erAktiv = s.nr === aktivtSteg;
          const erFerdig = !!ferdigeSteg[String(s.nr)];
          return (
            <button
              key={s.nr}
              type="button"
              onClick={() => onSettSteg(s.nr)}
              className={`rounded-xl border p-3.5 text-left transition ${
                erAktiv
                  ? 'border-emerald-500 bg-emerald-950/40 shadow-lg'
                  : erFerdig
                  ? 'border-emerald-800/60 bg-slate-900/90 hover:border-emerald-600'
                  : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xl">{s.ikon}</span>
                <span
                  className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                    erFerdig
                      ? 'border border-emerald-700 bg-emerald-950 text-emerald-300'
                      : erAktiv
                      ? 'border border-sky-700 bg-sky-950 text-sky-300'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {erFerdig ? '✅ Fullført' : erAktiv ? 'Pågår nå' : `Steg ${s.nr}/5`}
                </span>
              </div>
              <div className="mt-2 text-xs font-bold text-slate-100">{s.tittel}</div>
              <div className="mt-1 line-clamp-2 text-[11px] text-slate-400">{s.undertittel}</div>
            </button>
          );
        })}
      </div>

      {/* STEG 1: LAST OPP DOKUMENTER/TEGNINGER & PROSJEKTOPPSTART (AGENT 01) */}
      {aktivtSteg === 1 && (
        <div className="space-y-4">
          <Kort
            tittel="Steg 1A: Last opp dokumenter, plantegninger, bilder og lydfiler (AI Vision & Transkripsjon)"
            ikon="📂"
          >
            <FilOpplaster
              prosjektId={prosjekt.id}
              prosjektNavn={prosjekt.navn}
              eksisterendeFiler={filer}
              innstillinger={innstillinger}
              onFilerLastetOpp={onFilerLastetOpp}
              onOppdaterFil={onOppdaterFil}
              onBrukUttrekk={onBrukUttrekk}
              onApneInnstillinger={onApneInnstillinger}
              melding={melding}
            />

            {/* Kontinuerlig Møte- og Befaringsopptak med Live Framdriftsindikator (Progress Bar) */}
            <div className="mt-4">
              <MoteOpptaker
                prosjekt={prosjekt}
                innstillinger={innstillinger}
                onOppdaterProsjekt={onOppdaterProsjekt}
                onFilerLastetOpp={onFilerLastetOpp}
                onVelgAgent={onVelgAgent}
                onApneGalleri={onApneGalleri}
                melding={melding}
              />
            </div>

            {filer.length > 0 && (
              <div className="mt-4 border-t border-slate-800 pt-3">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300">
                    Opplastede filer på «{prosjekt.navn}» ({filer.length} stk):
                  </span>
                  <button
                    type="button"
                    onClick={onApneGalleri}
                    className="font-bold text-emerald-400 underline hover:text-emerald-300"
                  >
                    🖼️ Åpne hele Prosjektgalleriet & Dokumentarkivet →
                  </button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {filer.slice(0, 6).map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900 p-2.5 text-xs"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="text-lg">
                          {FIL_KATEGORI_ETIKETTER[f.kategori]?.ikon ?? '📎'}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-slate-200">{f.navn}</div>
                          <div className="text-[10px] text-slate-400">
                            {FIL_KATEGORI_ETIKETTER[f.kategori]?.navn}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          onAnalyserFilIChat(
                            f.id,
                            `Analyser «${f.navn}» og trekk ut viktige VVS-data.`
                          )
                        }
                        className="shrink-0 rounded bg-emerald-700 px-2 py-1 text-[10px] font-bold text-white hover:bg-emerald-600"
                      >
                        💬 AI-chat
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Kort>

          <Kort
            tittel="Steg 1B: Prosjektdata & Forutsetninger (Agent 01 – Orkestrator)"
            ikon="📋"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <div className="text-sm font-bold text-slate-100">
                  {prosjekt.navn}{' '}
                  <span className="text-xs font-normal text-slate-400">
                    ({prosjekt.bygningstype} ·{' '}
                    {prosjekt.bra ? `${prosjekt.bra} m²` : 'BRA ikke satt'})
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-slate-400">
                  Sted: <strong className="text-slate-200">{prosjekt.sted || 'Ikke oppgitt'}</strong>
                  {prosjekt.matrikkel ? (
                    <>
                      {' '}
                      · Matrikkel: <strong className="text-emerald-300">{prosjekt.matrikkel}</strong>
                    </>
                  ) : null}{' '}
                  · VA-myndighet:{' '}
                  <strong className="text-slate-200">{prosjekt.vaMyndighet || 'Ikke oppgitt'}</strong> · Fullføringsgrad grunndata:{' '}
                  <strong className="text-emerald-300">{Math.round(analyse.fullforing * 100)} %</strong>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Knapp variant="primar" onClick={onRedigerProsjekt}>
                  ✏️ Fyll ut / rediger alle prosjektdata
                </Knapp>
                <Knapp variant="sekundar" onClick={onNyttProsjekt}>
                  + Nytt prosjekt
                </Knapp>
                <Knapp variant="sekundar" onClick={() => onApneChat('agent-01')}>
                  💬 Spør Agent 01 i AI-chat
                </Knapp>
                <Knapp variant="sekundar" onClick={() => onVelgAgent('agent-01')}>
                  📄 Åpne Agent 01
                </Knapp>
                <Knapp variant="fare" onClick={onSlettProsjekt}>
                  🗑️ Slett prosjekt
                </Knapp>
              </div>
            </div>

            {/* Kartverket hurtigsøk + dedikerte kote- og matrikkelfelt */}
            <div className="mt-4 rounded-xl border border-emerald-800/70 bg-slate-950/80 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-extrabold text-emerald-300 sm:text-sm">
                    🗺️ Offentlige kartdata fra Kartverket (Geonorge) & Kommunale Koter (ITK/IBR)
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    Søk på gateadresse for å hente <strong>Gnr/Bnr</strong>, <strong>kommune (VA-myndighet)</strong> og{' '}
                    <strong>terrengkote (NN2000 moh)</strong> automatisk, eller skriv dataene rett i AI-chatten.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onApneChat('agent-19')}
                  className="inline-flex min-h-[40px] items-center rounded-lg border border-sky-700 bg-sky-950/60 px-3 py-1.5 text-xs font-bold text-sky-200 hover:bg-sky-900"
                >
                  📋 Lim inn VA-kart (Ctrl+V) i AI-chat
                </button>
              </div>

              {/* Søkelinje mot Kartverket */}
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  aria-label="Søk adresse i Kartverket"
                  value={adresseSok}
                  onChange={(e) => {
                    const nyVerdi = e.target.value;
                    setAdresseSok(nyVerdi);
                    onOppdaterProsjekt({
                      ...prosjekt,
                      kilde: 'bruker',
                      sted: nyVerdi,
                    });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void kjorKartverketSok();
                    }
                  }}
                  placeholder="Skriv gateadresse, f.eks. Friheim 49 eller Kongsgata 10, 4005 Stavanger …"
                  className="min-h-[44px] flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  disabled={sokerKartverket}
                  onClick={() => void kjorKartverketSok()}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-xs font-extrabold text-white shadow hover:bg-emerald-500 disabled:opacity-50"
                >
                  {sokerKartverket
                    ? '🔍 Henter fra Kartverket …'
                    : '🔍 Søk adresse & hent Gnr/Bnr + Kote fra Kartverket'}
                </button>
              </div>

              {kartverketStatus && (
                <div className="mt-2 rounded-lg border border-emerald-800/80 bg-emerald-950/40 px-3 py-2 text-xs font-semibold text-emerald-200">
                  {kartverketStatus}
                </div>
              )}

              {kartverketTreff.length > 1 && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                  <span>Flere treff i Kartverket:</span>
                  {kartverketTreff.map((t, idx) => (
                    <button
                      key={`${t.adressetekst}-${t.gardsnummer}-${t.bruksnummer}-${idx}`}
                      type="button"
                      onClick={() => void velgKartverketTreff(t)}
                      className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-200 hover:border-emerald-500 hover:text-emerald-300"
                    >
                      {t.adressetekst}, {t.postnummer} {t.poststed} (Gnr {t.gardsnummer}/Bnr {t.bruksnummer})
                    </button>
                  ))}
                </div>
              )}

              {/* Direkte skjemafelt for Prosjektnavn, Adresse/Sted, BRA (m²), Bygningstype og Vanntrykk */}
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <label className="block text-[11px] font-semibold text-slate-300">
                  Prosjektnavn
                  <input
                    type="text"
                    value={prosjekt.navn}
                    placeholder="F.eks. Friheim 49"
                    onChange={(e) =>
                      onOppdaterProsjekt({
                        ...prosjekt,
                        kilde: 'bruker',
                        navn: e.target.value,
                      })
                    }
                    className="mt-1 min-h-[44px] w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-100 outline-none focus:border-emerald-500"
                  />
                </label>

                <label className="block text-[11px] font-semibold text-slate-300">
                  Adresse / Sted
                  <input
                    type="text"
                    value={prosjekt.sted}
                    placeholder="F.eks. Friheim 49"
                    onChange={(e) => {
                      const nySted = e.target.value;
                      setAdresseSok(nySted);
                      onOppdaterProsjekt({
                        ...prosjekt,
                        kilde: 'bruker',
                        sted: nySted,
                      });
                    }}
                    className="mt-1 min-h-[44px] w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-emerald-300 outline-none focus:border-emerald-500"
                  />
                </label>

                <label className="block text-[11px] font-semibold text-slate-300">
                  Oppvarmet BRA (m²)
                  <input
                    type="number"
                    step="1"
                    value={prosjekt.bra ?? ''}
                    placeholder="F.eks. 1200"
                    onChange={(e) => {
                      const ren = e.target.value.trim().replace(',', '.');
                      const tall = ren === '' ? null : Number(ren);
                      if (tall !== null && !Number.isFinite(tall)) return;
                      onOppdaterProsjekt({
                        ...prosjekt,
                        kilde: 'bruker',
                        bra: tall,
                      });
                    }}
                    className="mt-1 min-h-[44px] w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 font-mono text-xs text-emerald-300 outline-none focus:border-emerald-500"
                  />
                </label>

                <label className="block text-[11px] font-semibold text-slate-300">
                  Bygningstype
                  <select
                    value={prosjekt.bygningstype}
                    onChange={(e) =>
                      onOppdaterProsjekt({
                        ...prosjekt,
                        kilde: 'bruker',
                        bygningstype: e.target.value as ProsjektData['bygningstype'],
                      })
                    }
                    className="mt-1 min-h-[44px] w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-100 outline-none focus:border-emerald-500"
                  >
                    <option value="Kontor">Kontor</option>
                    <option value="Skole">Skole</option>
                    <option value="Barnehage">Barnehage</option>
                    <option value="Boligblokk">Boligblokk</option>
                    <option value="Småhus">Småhus</option>
                    <option value="Sykehjem">Sykehjem</option>
                    <option value="Sykehus">Sykehus</option>
                    <option value="Hotell">Hotell</option>
                    <option value="Idrettsbygg">Idrettsbygg</option>
                    <option value="Forretning">Forretning</option>
                    <option value="Kulturbygg">Kulturbygg</option>
                    <option value="Lett industri / verksted">Lett industri / verksted</option>
                  </select>
                </label>

                <label className="block text-[11px] font-semibold text-slate-300">
                  <span className="flex items-center justify-between gap-1">
                    <span>Statisk vanntrykk (bar)</span>
                    {prosjekt.vanntrykk.statiskBar !== null && (
                      <span
                        title="Husk: Oppgitt trykk må korrigeres for høydeforskjell (koter) mellom kommunalt tilknytningspunkt (ITK) og byggets høyeste tappested (~0,1 bar/m)."
                        className="cursor-help text-sky-300"
                      >
                        ℹ️ Korriger for kote
                      </span>
                    )}
                  </span>
                  <input
                    type="number"
                    step="0.1"
                    value={prosjekt.vanntrykk.statiskBar ?? ''}
                    placeholder="F.eks. 4.5"
                    onChange={(e) => {
                      const ren = e.target.value.trim().replace(',', '.');
                      const tall = ren === '' ? null : Number(ren);
                      if (tall !== null && !Number.isFinite(tall)) return;
                      onOppdaterProsjekt({
                        ...prosjekt,
                        kilde: 'bruker',
                        vanntrykk: {
                          ...prosjekt.vanntrykk,
                          statiskBar: tall,
                          antatt: false,
                        },
                      });
                    }}
                    className={`mt-1 min-h-[44px] w-full rounded-lg border px-2.5 py-1.5 font-mono text-xs outline-none ${
                      prosjekt.vanntrykk.statiskBar !== null && prosjekt.vanntrykk.statiskBar > 6.0
                        ? 'border-rose-500 bg-rose-950/60 font-bold text-rose-200 focus:border-rose-400'
                        : 'border-slate-700 bg-slate-900 text-sky-300 focus:border-emerald-500'
                    }`}
                  />
                  {prosjekt.vanntrykk.statiskBar !== null && prosjekt.vanntrykk.statiskBar > 6.0 && (
                    <div className="mt-1 rounded border border-rose-500/80 bg-rose-950/60 px-2 py-1 text-[10px] font-bold text-rose-200">
                      🚨 &gt; 6,0 bar: Krever trykkreduksjonsventil (TEK17 § 15-5 / NS-EN 806-2)!
                    </div>
                  )}
                </label>
              </div>

              {/* Dedikerte hurtigfelt for Gnr/Bnr, Terrengkote, ITK, IBR og Laveste sluk */}
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <label className="block text-[11px] font-semibold text-slate-300">
                  Gnr/Bnr (Matrikkel)
                  <input
                    type="text"
                    value={prosjekt.matrikkel}
                    placeholder="F.eks. Gnr. 55 / Bnr. 210"
                    onChange={(e) =>
                      onOppdaterProsjekt({
                        ...prosjekt,
                        kilde: 'bruker',
                        matrikkel: e.target.value,
                      })
                    }
                    className="mt-1 min-h-[44px] w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-100 outline-none focus:border-emerald-500"
                  />
                </label>

                <label className="block text-[11px] font-semibold text-slate-300">
                  Terrengkote på tomta (Kartverket)
                  <input
                    type="number"
                    step="0.01"
                    value={prosjekt.koter.gate ?? ''}
                    placeholder="NN2000 (moh)"
                    onChange={(e) => oppdaterKoteFelt('gate', e.target.value)}
                    className="mt-1 min-h-[44px] w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 font-mono text-xs text-emerald-300 outline-none focus:border-emerald-500"
                  />
                </label>

                <label className="block text-[11px] font-semibold text-slate-300">
                  Kote ITK/ITR (innv. topp kum/rør)
                  <input
                    type="number"
                    step="0.01"
                    value={prosjekt.koter.itrKum ?? ''}
                    placeholder="Fra VA-kart (moh)"
                    onChange={(e) => oppdaterKoteFelt('itrKum', e.target.value)}
                    className="mt-1 min-h-[44px] w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 font-mono text-xs text-sky-300 outline-none focus:border-emerald-500"
                  />
                </label>

                <label className="block text-[11px] font-semibold text-slate-300">
                  Kote IBR (innv. bunn rør i kum)
                  <input
                    type="number"
                    step="0.01"
                    value={prosjekt.koter.ibrKum ?? ''}
                    placeholder="Fra VA-kart (moh)"
                    onChange={(e) => oppdaterKoteFelt('ibrKum', e.target.value)}
                    className="mt-1 min-h-[44px] w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 font-mono text-xs text-sky-300 outline-none focus:border-emerald-500"
                  />
                </label>

                <label className="block text-[11px] font-semibold text-slate-300">
                  Kote laveste sluk (OK FG)
                  <input
                    type="number"
                    step="0.01"
                    value={prosjekt.koter.gulv[0]?.kote ?? ''}
                    placeholder="F.eks. 12.50"
                    onChange={(e) => oppdaterKoteFelt('lavesteSluk', e.target.value)}
                    className="mt-1 min-h-[44px] w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 font-mono text-xs text-amber-300 outline-none focus:border-emerald-500"
                  />
                </label>
              </div>

              {prosjekt.koter.gate !== null &&
                (prosjekt.koter.itrKum === null || prosjekt.koter.ibrKum === null) && (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-800/60 bg-amber-950/30 px-3 py-2 text-xs text-amber-200">
                    <span>
                      💡 Terrengkote fra Kartverket er <strong>C +{prosjekt.koter.gate.toFixed(2)} moh</strong>, men underjordisk kumhøyde (ITK/IBR) står på kommunens VA-kart. Lim inn VA-kart i chatten, eller bruk foreløpig terrengestimat:
                    </span>
                    <button
                      type="button"
                      onClick={estimerKumFraTerrengkote}
                      className="inline-flex min-h-[38px] items-center rounded-lg border border-amber-600 bg-amber-900/50 px-3 py-1 font-bold text-amber-100 hover:bg-amber-800"
                    >
                      📐 Estimer ITK/IBR fra terrengkote (-1,60 m / -1,85 m)
                    </button>
                  </div>
                )}
            </div>

            {/* Fast faglig veileder og sjekkliste for Statisk og dynamisk vanntrykk vs. koter i Steg 1B */}
            <div className="mt-4">
              <TrykkOgKoteVeileder
                prosjekt={prosjekt}
                analyse={analyse}
                modulNavn="Steg 1B: Prosjektdata & Forutsetninger"
                overstyringer={overstyringer}
                qa={qa}
                onToggleQa={onToggleQa}
                onOppdaterProsjekt={onOppdaterProsjekt}
                onOppdaterProsjektOgOverstyringer={onOppdaterProsjektOgOverstyringer}
                melding={melding}
              />
            </div>

            {/* Datasjekk mot Lov 1 */}
            <div className="mt-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-300">
                <span>Lov 1-kontroll av inndata (aldri gjett på manglende tall):</span>
                <span className="text-[11px] font-normal text-emerald-300">
                  💬 Du kan også skrive manglende tall rett i AI-chatten for automatisk utfylling!
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {analyse.datasjekk.map((d) => (
                  <div
                    key={d.id}
                    className={`rounded-lg border p-3 text-xs ${
                      d.ok
                        ? 'border-emerald-800/60 bg-emerald-950/20 text-emerald-200'
                        : 'border-amber-800/70 bg-amber-950/30 text-amber-200'
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold">
                      <span>{d.tekst}</span>
                      <span>{d.ok ? '✅ Registrert' : '⚠️ HINT'}</span>
                    </div>
                    {!d.ok && <div className="mt-1 text-[11px] text-amber-300/90">{d.hint}</div>}
                  </div>
                ))}
              </div>
            </div>
          </Kort>
        </div>
      )}

      {/* STEG 2: SANITÆR, VA & KOTER */}
      {aktivtSteg === 2 && (
        <div className="space-y-4">
          <Kort tittel="Steg 2: Sanitær, Utvendig VA & Koter (Agent 19 & Agent 03)" ikon="💧">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Kotekontroll (Lov 2) */}
              <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-200">
                    Lov 2: Kotekontroll mot ITR ({(analyse.krav * 1000).toFixed(0)} mm)
                  </div>
                  <Knapp variant="sekundar" onClick={() => onApneSanitaer('koter')}>
                    🧮 Åpne Kote-kalkulator
                  </Knapp>
                </div>
                {analyse.gulvKontroller.length === 0 ? (
                  <p className="mt-3 text-xs text-amber-300">
                    ⚠️ HINT: Legg inn kote for ITR i kommunal kum og minst ett laveste sluk/gulv i Steg 1 for å aktivere tilbakeslagskontrollen.
                  </p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {analyse.gulvKontroller.map((g) => (
                      <div
                        key={g.navn}
                        className={`rounded border p-2.5 text-xs ${
                          g.ok
                            ? 'border-emerald-800/60 bg-emerald-950/20 text-emerald-200'
                            : 'border-rose-800/80 bg-rose-950/40 text-rose-200'
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span>
                            {g.navn} (C +{g.kote.toFixed(2)})
                          </span>
                          <span>
                            {g.ok
                              ? `✅ Selvfall OK (+${(g.margin * 1000).toFixed(0)} mm)`
                              : `🚨 PUMPEKRAV (${(g.margin * 1000).toFixed(0)} mm)`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {analyse.minKoteUtgang !== null && (
                  <div className="mt-3 text-xs text-slate-300">
                    Minste utgangskote ved grunnmur: <strong>C +{analyse.minKoteUtgang.toFixed(2)} moh</strong> (stigning i grøft +{analyse.hoydeIGroft?.toFixed(2)} m).
                  </div>
                )}
              </div>

              {/* Overvann & Varmtvann */}
              <div className="space-y-3">
                <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-slate-200">Overvann & Fordrøyning (LOD)</div>
                    <Knapp variant="sekundar" onClick={() => onApneSanitaer('overvann')}>
                      🌧️ Overvann-kalkulator
                    </Knapp>
                  </div>
                  {analyse.overvann ? (
                    <div className="mt-2 text-xs text-slate-300">
                      Redusert areal <code className="text-emerald-300">A_red = {analyse.overvann.aRed.toFixed(0)} m²</code> gir{' '}
                      <strong className="text-sky-300">Q = {analyse.overvann.q.toFixed(1)} l/s</strong>.
                      {analyse.overvann.tilbakehold !== null && (
                        <span> Må fordrøyes: <strong>{analyse.overvann.tilbakehold.toFixed(1)} l/s</strong>.</span>
                      )}
                    </div>
                  ) : (
                    <div className="mt-2 text-xs text-amber-300">
                      ⚠️ Ingen overvannsflater med φ og regnintensitet registrert ennå.
                    </div>
                  )}
                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-slate-200">Varmtvannsbereder & Trykkfall</div>
                    <div className="flex gap-1.5">
                      <Knapp variant="sekundar" onClick={() => onApneSanitaer('trykkfall')}>
                        📏 Trykkfall
                      </Knapp>
                      <Knapp variant="sekundar" onClick={() => onApneSanitaer('bereder')}>
                        🔥 Bereder
                      </Knapp>
                    </div>
                  </div>
                  {analyse.bereder ? (
                    <div className="mt-2 text-xs text-slate-300">
                      Spisslast dusjer: <strong>{analyse.bereder.blandetLiter.toFixed(0)} l</strong> ved {BEREDER_ANTAGELSER.blandetTemp} °C → krever minst{' '}
                      <strong className="text-amber-300">{analyse.bereder.varmLiter.toFixed(0)} l</strong> beredervolum ved {BEREDER_ANTAGELSER.berederTemp} °C.
                    </div>
                  ) : (
                    <div className="mt-2 text-xs text-slate-400">
                      Ingen samtidige dusjer registrert på prosjektet – bruk Bereder-kalkulatoren for NS 3031 / kWh-metode.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-800 pt-4">
              <Knapp variant="primar" onClick={() => onApneChat('agent-19')}>
                💬 Spør Agent 19 (Utvendig VA) i AI-chat
              </Knapp>
              <Knapp variant="sekundar" onClick={() => onApneChat('agent-03')}>
                💬 Spør Agent 03 (Sanitær) i AI-chat
              </Knapp>
              <Knapp variant="sekundar" onClick={() => onApneSanitaer('spillvann')}>
                🚽 Spillvann-kalkulator
              </Knapp>
              <Knapp variant="sekundar" onClick={() => onApneSanitaer('kobling')}>
                🚿 Koblingsledning
              </Knapp>
              <Knapp variant="sekundar" onClick={onApneSuperKommandoer}>
                ⚡ Kjør Super-Kommando 2 (VA/Sanitær/DAK)
              </Knapp>
            </div>
          </Kort>
        </div>
      )}

      {/* STEG 3: VARME, KJØLING & VENTILASJON */}
      {aktivtSteg === 3 && (
        <div className="space-y-4">
          <Kort tittel="Steg 3: Varme, Kjøling & Ventilasjon (Agent 04, 06, 17, 18)" ikon="🔥">
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
              <div className="text-xs font-bold text-slate-200">
                TEK17 § 14-4(2): Areal til varmesentral (10 m² + 1 % av BRA, maks 100 m²)
              </div>
              {analyse.varmesentral.kravM2 !== null ? (
                <div className="mt-2 text-xs">
                  <div className="text-slate-300">
                    Minstekrav for {prosjekt.bra} m² BRA: <strong>{analyse.varmesentral.kravM2.toFixed(0)} m²</strong>
                  </div>
                  {analyse.varmesentral.avsattM2 !== null ? (
                    <div
                      className={`mt-1 font-bold ${
                        analyse.varmesentral.ok ? 'text-emerald-300' : 'text-rose-300'
                      }`}
                    >
                      {analyse.varmesentral.ok
                        ? `✅ Avsatt ${analyse.varmesentral.avsattM2} m² oppfyller kravet`
                        : `🚨 Avsatt ${analyse.varmesentral.avsattM2} m² er for lite (mangler ${(
                            analyse.varmesentral.kravM2 - analyse.varmesentral.avsattM2
                          ).toFixed(0)} m²)`}
                    </div>
                  ) : (
                    <div className="mt-1 text-amber-300">
                      ⚠️ Avsatt areal til teknisk rom er ikke oppgitt i prosjektdataene.
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-2 text-xs text-amber-300">
                  ⚠️ Oppgi BRA i Steg 1 for å beregne minstekravet.
                </div>
              )}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                {
                  id: 'agent-17',
                  tittel: 'Agent 17: 3-Alternativs-Arkitekten',
                  beskrivelse: 'Utreder 3 konsepter: Lavest CAPEX vs. Optimalisert LCC vs. Beste Miljø.',
                },
                {
                  id: 'agent-04',
                  tittel: 'Agent 04: Varmeanlegg & Hydronikk',
                  beskrivelse: 'Varmepumpe, ΔT, PIBCV-ventiler, vakuumavgasser og VDI 2035.',
                },
                {
                  id: 'agent-06',
                  tittel: 'Agent 06: Ventilasjonsanlegg & Inneklima',
                  beskrivelse: 'Luftmengder (TEK17 kap. 13), SFP, gjenvinner (0 % luktsmitte) og lyd (NS 8175).',
                },
                {
                  id: 'agent-18',
                  tittel: 'Agent 18: Kjøling, Kulde & Varmepumper',
                  beskrivelse: 'Kjølebehov, frikjøling fra energibrønner, F-gass og kondensisolering.',
                },
              ].map((a) => (
                <div
                  key={a.id}
                  className="rounded-lg border border-slate-800 bg-slate-950/70 p-3.5 text-xs"
                >
                  <div className="font-bold text-slate-200">{a.tittel}</div>
                  <div className="mt-1 text-[11px] text-slate-400">{a.beskrivelse}</div>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => onApneChat(a.id)}
                      className="rounded bg-emerald-700 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-600"
                    >
                      💬 AI-chat (inkl. bilde/typeskilt)
                    </button>
                    <button
                      type="button"
                      onClick={() => onVelgAgent(a.id)}
                      className="rounded border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] text-slate-200 hover:border-slate-500"
                    >
                      Åpne agent ↗
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Kort>
        </div>
      )}

      {/* STEG 4: BRANN, ITB & ENERGI */}
      {aktivtSteg === 4 && (
        <div className="space-y-4">
          <Kort tittel="Steg 4: Brann/Sprinkler, ITB & Energi/LCC (Agent 05, 08, 09, 12, 13)" ikon="🧯">
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
              <div className="text-xs font-bold text-slate-200">
                Vanntrykk & Q/p-kontroll for Sprinkler (Agent 05)
              </div>
              <div className="mt-2 text-xs text-slate-300">
                {analyse.trykk.statiskBar !== null ? (
                  <>
                    <div>
                      Statisk trykk: <strong>{analyse.trykk.statiskBar} bar</strong>{' '}
                      {analyse.trykk.antatt && (
                        <span className="text-amber-300">(⚠️ antatt – må verifiseres)</span>
                      )}
                    </div>
                    {analyse.trykk.dynamiskBar !== null && analyse.trykk.uttakLmin !== null ? (
                      <div className="mt-1">
                        Dynamisk: <strong>{analyse.trykk.dynamiskBar} bar</strong> ved{' '}
                        <strong>{analyse.trykk.uttakLmin} l/min</strong> (trykkfall{' '}
                        {analyse.trykk.fallBar?.toFixed(1)} bar)
                      </div>
                    ) : (
                      <div className="mt-1 text-amber-300">
                        ⚠️ HINT: Q/p-måling fra vannverket mangler for sprinklerberegning.
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-amber-300">⚠️ Vanntrykk er ikke oppgitt i prosjektet.</div>
                )}
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  id: 'agent-05',
                  tittel: 'Agent 05: Sprinkler & Branntromler',
                  beskrivelse: 'NS-EN 12845, OH-fareklasser, frostsikring og TEK17 § 11-16 ganglinje.',
                },
                {
                  id: 'agent-08',
                  tittel: 'Agent 08: ITB, Automatikk & Elektro',
                  beskrivelse: 'NS 3935/NS 6450 grensesnittsmatrise RIV/RIE/RIAu og brannforrigling.',
                },
                {
                  id: 'agent-09',
                  tittel: 'Agent 09: Energi & Bygningsfysikk',
                  beskrivelse: 'NS 3031 effektbudsjett, transmisjonstap og TEK17 kap. 14.',
                },
                {
                  id: 'agent-12',
                  tittel: 'Agent 12: BREEAM-NOR & Miljø',
                  beskrivelse: 'Ene 01, Wat 01/02/03, Hea 02/04, Pol 01 og EPD-krav.',
                },
                {
                  id: 'agent-13',
                  tittel: 'Agent 13: Kalkyle, Tilbud & 25-års LCC',
                  beskrivelse: 'NS 3454 nåverdiberegning, CAPEX/OPEX og tilbudsbrev.',
                },
                {
                  id: 'agent-07',
                  tittel: 'Agent 07: BIM, DAK & TFM-Merking',
                  beskrivelse: 'Statsbygg PA 0802 TFM-strenger, sjakter og koordinering.',
                },
              ].map((a) => (
                <div
                  key={a.id}
                  className="rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-xs"
                >
                  <div className="font-bold text-slate-200">{a.tittel}</div>
                  <div className="mt-0.5 text-[11px] text-slate-400">{a.beskrivelse}</div>
                  <div className="mt-2.5 flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => onApneChat(a.id)}
                      className="rounded bg-emerald-700 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-600"
                    >
                      💬 AI-chat
                    </button>
                    <button
                      type="button"
                      onClick={() => onVelgAgent(a.id)}
                      className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200 hover:border-slate-500"
                    >
                      Åpne agent ↗
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-800 pt-4">
              <Knapp variant="primar" onClick={onApneSuperKommandoer}>
                ⚡ Kjør Super-Kommando 1 (Tidligfase/LCC) eller 3 (Varme/Brann/Vent/ITB)
              </Knapp>
            </div>
          </Kort>
        </div>
      )}

      {/* STEG 5: KVALITETSSIKRING (AGENT 16) OG FERDIG RAPPORT */}
      {aktivtSteg === 5 && (
        <div className="space-y-4">
          <Kort
            tittel="Steg 5: Kvalitetssikring (Agent 16 – Djevelens Advokat) & Ferdig Rapport"
            ikon="🛡️"
          >
            {/* Aktive alarmer */}
            {analyse.alarmer.length > 0 && (
              <div className="mb-4 space-y-2">
                <div className="text-xs font-bold text-slate-200">
                  Aktive kontrollvarsler for {prosjekt.navn}:
                </div>
                {analyse.alarmer.map((a, i) => (
                  <div
                    key={i}
                    className={`rounded-lg border p-3 text-xs ${
                      a.alvor === 'rod'
                        ? 'border-rose-700 bg-rose-950/50 text-rose-200'
                        : 'border-amber-700 bg-amber-950/40 text-amber-200'
                    }`}
                  >
                    <span className="font-bold">
                      {a.alvor === 'rod' ? '🚨 RØD ALARM: ' : '⚠️ VARSLE: '}
                    </span>
                    {a.tekst}
                  </div>
                ))}
              </div>
            )}

            {/* Sanity Check */}
            <div className="mb-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
                <div className="text-xs font-bold text-slate-200">
                  4. Logisk Brist & Sanity Check (Praksissjekk):
                </div>
                {onNullstillQa && (
                  <button
                    type="button"
                    onClick={onNullstillQa}
                    title="Nullstill alle avkryssinger i sjekklistene"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-300 transition hover:border-amber-500 hover:text-amber-200"
                  >
                    🔄 Nullstill sjekkliste
                  </button>
                )}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {SANITY_PUNKTER.map((p) => {
                  const avkrysset = !!qa[p.id];
                  return (
                    <label
                      key={p.id}
                      className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2.5 text-xs transition ${
                        avkrysset
                          ? 'border-emerald-700/60 bg-emerald-950/20 text-emerald-200'
                          : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={avkrysset}
                        onChange={() => onToggleQa(p.id)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-800 text-emerald-500"
                      />
                      <span>{p.tekst}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* 6-punkts signatursjekk */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
                <div className="text-xs font-bold text-slate-200">
                  5. Seniorrådgiverens 6-punkts kontroll før signatur:
                </div>
                {onNullstillQa && (
                  <button
                    type="button"
                    onClick={onNullstillQa}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-300 transition hover:border-amber-500 hover:text-amber-200"
                  >
                    🔄 Nullstill sjekkliste
                  </button>
                )}
              </div>
              {QA_PUNKTER.map((p) => {
                const avkrysset = !!qa[p.id];

                let visningsTekst: string = p.tekst;
                let erUgyldigKote = false;

                if (p.id === 'sp-1') {
                  erUgyldigKote = !koteStatus.ok;
                } else if (p.id === 'sp-6') {
                  const kravM2 = beregnKravVarmesentralM2(prosjekt.bra);
                  visningsTekst = `${p.tekst} ${kravM2 !== null ? `(Krav: minst ${kravM2} m²)` : '(Krav: oppgi BRA)'}`;
                }

                const visOk = avkrysset && !erUgyldigKote;
                const erAvvik = erUgyldigKote && koteStatus.status === 'ikke_oppfylt';

                return (
                  <div
                    key={p.id}
                    className={`rounded-lg border p-2.5 text-xs transition ${
                      visOk
                        ? 'border-emerald-700/60 bg-emerald-950/20 text-emerald-200'
                        : erAvvik
                        ? 'border-rose-700/80 bg-rose-950/30 text-rose-200'
                        : erUgyldigKote
                        ? 'border-amber-700/80 bg-amber-950/30 text-amber-200'
                        : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <label className="flex cursor-pointer items-start justify-between gap-2.5">
                      <div className="flex items-start gap-2.5">
                        <input
                          type="checkbox"
                          checked={avkrysset}
                          onChange={() => onToggleQa(p.id)}
                          className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-800 text-emerald-500"
                        />
                        <div>
                          <span>{visningsTekst}</span>
                          {p.id === 'sp-1' && !koteStatus.ok && (
                            <div
                              className={`mt-1 flex items-center gap-1.5 text-[11px] font-bold ${
                                erAvvik ? 'text-rose-300' : 'text-amber-400'
                              }`}
                            >
                              <span>{koteStatus.advarsel}</span>
                              <span className="font-normal opacity-90">({koteStatus.detalj})</span>
                            </div>
                          )}
                          {p.id === 'sp-6' && (
                            <div className="mt-0.5 text-[11px] text-slate-400">
                              {prosjekt.tekniskRomM2 !== null
                                ? `Avsatt i prosjekt: ${prosjekt.tekniskRomM2} m² – krever manuell bekreftelse før grønt lys.`
                                : 'Areal ikke oppgitt ennå – krever manuell kontroll og bekreftelse.'}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center">
                        {erAvvik ? (
                          <span className="rounded border border-rose-500 bg-rose-950 px-2.5 py-0.5 text-[10px] font-black text-rose-200 shadow">
                            {koteStatus.advarsel}
                          </span>
                        ) : erUgyldigKote ? (
                          <span className="rounded border border-amber-600 bg-amber-950 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                            {koteStatus.advarsel}
                          </span>
                        ) : avkrysset ? (
                          <span className="rounded border border-emerald-600 bg-emerald-950 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                            OK
                          </span>
                        ) : (
                          <span className="rounded border border-rose-800 bg-rose-950 px-2 py-0.5 text-[10px] font-semibold text-rose-400">
                            Mangler
                          </span>
                        )}
                      </div>
                    </label>
                  </div>
                );
              })}
            </div>

            {/* Total signatur-statusboks (13 punkter) */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/80 p-3">
              <span className="text-xs text-slate-300">
                Fullført totalt: <strong>{signaturStatus.totaltFullfort} av {signaturStatus.totaltAntall}</strong> kontrollpunkter (7 praksissjekk + 6 før signatur)
              </span>
              <span
                className={`rounded-lg px-3 py-1.5 text-xs font-black shadow transition ${signaturStatus.badgeKlasse}`}
              >
                {signaturStatus.badgeTekst}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-800 pt-4">
              <Knapp variant="primar" onClick={kopierQa}>
                📋 Kopier ferdig QA-rapport
              </Knapp>
              <Knapp variant="sekundar" onClick={lastNedQa}>
                📥 Last ned rapport (.TXT)
              </Knapp>
              <Knapp variant="sekundar" onClick={onApneQaPort}>
                🛡️ Åpne full Agent 16 QA-port
              </Knapp>
              <Knapp variant="sekundar" onClick={() => onApneChat('agent-16')}>
                💬 Kjør Agent 16 revisjon i AI-chat
              </Knapp>
            </div>
          </Kort>
        </div>
      )}

      {/* Gatekeeper: Kvalitets- og Mangelsikring + Overstyring (Midlertidig estimat) + AI-Kommunikasjonsassistent */}
      <GatekeeperPanel
        prosjekt={prosjekt}
        analyse={analyse}
        overstyringer={overstyringer}
        qaFullfort={qaFullfort}
        godkjent={godkjent}
        aktivtSteg={aktivtSteg}
        visSluttkontroll={aktivtSteg === 5}
        onOppdaterProsjektOgOverstyringer={onOppdaterProsjektOgOverstyringer}
        onGaaVidereSteg={
          aktivtSteg < 5
            ? () => {
                if (!ferdigeSteg[String(aktivtSteg)]) {
                  onToggleStegFerdig(aktivtSteg);
                }
                onSettSteg(aktivtSteg + 1);
              }
            : undefined
        }
        onGodkjennOgLaasProsjekt={(medForbehold) => {
          onGodkjennOgLaasProsjekt(medForbehold);
          kopierQa();
          lastNedQa();
        }}
        onApneChatMedTekst={(sporsmal) => onApneChatMedSporsmal(steg.agentId, sporsmal)}
        melding={melding}
      />

      {/* Bunnlinje: Steg-navigasjon */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
        <div className="flex items-center gap-2">
          <Knapp
            variant="sekundar"
            disabled={aktivtSteg <= 1}
            onClick={() => onSettSteg(Math.max(1, aktivtSteg - 1))}
          >
            ← Forrige steg
          </Knapp>
          <Knapp variant="sekundar" onClick={() => onToggleStegFerdig(aktivtSteg)}>
            {ferdigeSteg[String(aktivtSteg)]
              ? `✅ Steg ${aktivtSteg} er merket fullført`
              : `☑️ Merk steg ${aktivtSteg} som fullført`}
          </Knapp>
        </div>

        <div className="flex items-center gap-2">
          <Knapp variant="sekundar" onClick={() => onApneChat(steg.agentId)}>
            💬 Spør {steg.agentId.toUpperCase()} i AI-chat
          </Knapp>
          {aktivtSteg < 5 && (
            <Knapp
              variant="primar"
              onClick={() => {
                if (!ferdigeSteg[String(aktivtSteg)]) {
                  onToggleStegFerdig(aktivtSteg);
                }
                onSettSteg(aktivtSteg + 1);
              }}
            >
              Neste steg ({aktivtSteg + 1}/5) →
            </Knapp>
          )}
        </div>
      </div>
    </div>
  );
}
