import { useState } from 'react';
import type { ProsjektData } from '../data/prosjekter';
import type { ProsjektAnalyse } from '../lib/analyse';
import { fmt } from '../lib/format';
import {
  OVERSTYRING_ETIKETT,
  anvendOverstyringMedEstimat,
} from '../lib/gatekeeper';
import {
  flettKartverketInnIProsjekt,
  slaaOppAdresseOgKoteIKartverket,
} from '../lib/kartverket';
import type { OverstyringInfo } from '../lib/lagring';

export const TRYKK_KOTE_SJEKKPUNKT = [
  {
    id: 'tk-1',
    tekst:
      'Referansekote for oppgitt kommunalt vanntrykk er avklart (målt ved hovedledning i gate/kum vs. ved innvendig vannmåler).',
  },
  {
    id: 'tk-2',
    tekst:
      'Hydrostatisk trykktap (Δp_geo = H_geo × 9,81 kPa/m ≈ 0,1 bar/m) fra anboring/inntak til øverste tappested er trukket fra disponibelt trykk.',
  },
  {
    id: 'tk-3',
    tekst:
      'Kontrollert 6,0 bar-regelen (TEK17 § 15-5 / NS-EN 806-2): Trykkreduksjonsventil (innstilt på 3,5–4,5 bar) prosjekteres dersom statisk trykk kan overstige 6,0 bar (600 kPa) i laveste punkt.',
  },
  {
    id: 'tk-4',
    tekst:
      'Resttrykk ved ugunstigste/øverste armatur er kontrollert til minst 1,5–2,0 bar (150–200 kPa) ved dimensjonerende samtidighetsstrøm (q_dim); trykkøkningsanlegg (WWBooster) vurdert ved lavere margin.',
  },
  {
    id: 'tk-5',
    tekst:
      'Kotekontroll for avløp (Lov 2: laveste sluk minst 900/950 mm over ITK/ITR i kommunal kum) og minste utgangskote ved grunnmur (IBR + L × fall) er kryssjekket mot arkitektens snitt.',
  },
] as const;

interface Props {
  prosjekt: ProsjektData;
  analyse: ProsjektAnalyse;
  modulNavn?: string;
  /** Eventuelt lokalt hovedtrykk i kPa fra en kalkulator (f.eks. Trykkfall) for å trigge > 600 kPa varsel også ved lokal endring */
  lokaltTrykkKpa?: number;
  overstyringer?: Record<string, OverstyringInfo>;
  qa?: Record<string, boolean>;
  onToggleQa?: (id: string) => void;
  onOppdaterProsjekt?: (prosjekt: ProsjektData, endringer?: string[]) => void;
  onOppdaterProsjektOgOverstyringer?: (
    prosjekt: ProsjektData,
    overstyringer: Record<string, OverstyringInfo>,
    endringer: string[]
  ) => void;
  melding?: (tekst: string) => void;
  kompakt?: boolean;
}

export default function TrykkOgKoteVeileder({
  prosjekt,
  analyse,
  modulNavn,
  lokaltTrykkKpa,
  overstyringer = {},
  qa = {},
  onToggleQa,
  onOppdaterProsjekt,
  onOppdaterProsjektOgOverstyringer,
  melding,
  kompakt = false,
}: Props) {
  const [visDetaljer, setVisDetaljer] = useState(!kompakt);
  const [lasterKartverket, setLasterKartverket] = useState(false);
  const h = analyse.hydrostatisk;

  const slaaOppKartverketDirekte = async () => {
    if (!onOppdaterProsjekt) return;
    const sok = (prosjekt.sted || prosjekt.navn).trim();
    if (sok.length < 3) {
      melding?.('⚠️ Skriv inn gateadresse eller stedsnavn i adressefeltet først.');
      return;
    }
    setLasterKartverket(true);
    try {
      const treff = await slaaOppAdresseOgKoteIKartverket(sok);
      if (!treff) {
        melding?.(`Fant ingen adresse i Kartverket for «${sok}».`);
        return;
      }
      const { prosjekt: oppdatert, endringer } = flettKartverketInnIProsjekt(prosjekt, treff);
      onOppdaterProsjekt(oppdatert, endringer);
      const v = treff.valgt;
      melding?.(
        `🗺️ Kartverket oppdatert: ${v.adressetekst} (Gnr ${v.gardsnummer} / Bnr ${v.bruksnummer}, ${v.kommunenavn})${
          treff.terrengkoteNn2000 !== null ? `, terrengkote C +${fmt(treff.terrengkoteNn2000, 2)} m` : ''
        }`
      );
    } catch {
      melding?.('⚠️ Kunne ikke nå Kartverkets API akkurat nå.');
    } finally {
      setLasterKartverket(false);
    }
  };

  const lokaltBar = lokaltTrykkKpa !== undefined ? lokaltTrykkKpa / 100 : null;
  const over6Bar =
    h.kravTrykkreduksjonsventil || (lokaltBar !== null && lokaltBar > 6.0);
  const aktivMaksBar = Math.max(
    h.maksStatiskTrykkBar ?? 0,
    prosjekt.vanntrykk.statiskBar ?? 0,
    lokaltBar ?? 0
  );

  const manglerTrykkEllerKote =
    prosjekt.vanntrykk.statiskBar === null ||
    prosjekt.koter.itrKum === null ||
    prosjekt.koter.gulv.length === 0 ||
    prosjekt.bra === null;

  const antallAvkrysset = TRYKK_KOTE_SJEKKPUNKT.filter((p) => qa[p.id]).length;

  const aktiverMidlertidigEstimat = () => {
    if (!onOppdaterProsjektOgOverstyringer && !onOppdaterProsjekt) return;
    const manglendeIder: string[] = [];
    if (prosjekt.bra === null) manglendeIder.push('bra_areal');
    if (prosjekt.koter.itrKum === null || prosjekt.koter.ibrKum === null) {
      manglendeIder.push('kote_itr_ibr');
    }
    if (prosjekt.koter.gulv.length === 0) manglendeIder.push('kote_laveste_sluk');
    if (
      prosjekt.vanntrykk.statiskBar === null ||
      prosjekt.vanntrykk.dynamiskBar === null
    ) {
      manglendeIder.push('vanntrykk_qp');
    }
    if (manglendeIder.length === 0) return;

    const {
      prosjekt: oppdatertProsjekt,
      overstyringer: nyeOverstyringer,
      endringer,
    } = anvendOverstyringMedEstimat(prosjekt, overstyringer, manglendeIder);

    if (onOppdaterProsjektOgOverstyringer) {
      onOppdaterProsjektOgOverstyringer(oppdatertProsjekt, nyeOverstyringer, endringer);
    } else if (onOppdaterProsjekt) {
      onOppdaterProsjekt(oppdatertProsjekt, endringer);
    }
    melding?.(
      `⚠️ Fylte inn midlertidige fagestimater (${OVERSTYRING_ETIKETT}) slik at du kan regne videre uten stopp!`
    );
  };

  const oppdaterTall = (
    felt: 'statiskBar' | 'dynamiskBar' | 'itrKum' | 'lavesteSluk' | 'bra',
    verdiTekst: string
  ) => {
    if (!onOppdaterProsjekt) return;
    const ren = verdiTekst.trim().replace(',', '.');
    const tall = ren === '' ? null : Number(ren);
    if (tall !== null && !Number.isFinite(tall)) return;

    if (felt === 'statiskBar' || felt === 'dynamiskBar') {
      onOppdaterProsjekt({
        ...prosjekt,
        kilde: 'bruker',
        vanntrykk: {
          ...prosjekt.vanntrykk,
          [felt]: tall,
          antatt: false,
        },
      });
    } else if (felt === 'itrKum') {
      onOppdaterProsjekt({
        ...prosjekt,
        kilde: 'bruker',
        koter: {
          ...prosjekt.koter,
          itrKum: tall,
        },
      });
    } else if (felt === 'lavesteSluk') {
      const eks = prosjekt.koter.gulv;
      const nyGulv =
        tall === null
          ? eks.slice(1)
          : eks.length > 0
          ? [{ ...eks[0], kote: tall }, ...eks.slice(1)]
          : [{ navn: 'Laveste sluk (OK FG)', kote: tall }];
      onOppdaterProsjekt({
        ...prosjekt,
        kilde: 'bruker',
        koter: {
          ...prosjekt.koter,
          gulv: nyGulv,
        },
      });
    } else if (felt === 'bra') {
      onOppdaterProsjekt({
        ...prosjekt,
        kilde: 'bruker',
        bra: tall,
      });
    }
  };

  return (
    <div className="space-y-3">
      {/* AUTOMATISK GLOBAL ALARM VED > 6,0 BAR STATISK VANNTRYKK */}
      {over6Bar && (
        <div
          role="alert"
          className="rounded-xl border-2 border-rose-500 bg-rose-950/75 p-4 text-xs text-rose-100 shadow-lg"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-black text-rose-200">
              <span>🚨</span>
              <span>
                GLOBALT VARSEL (&gt; 6,0 bar): Krav om trykkreduksjonsventil (TEK17 § 15-5 / NS-EN 806-2)
              </span>
            </div>
            <span className="rounded border border-rose-400 bg-rose-900/80 px-2.5 py-1 font-mono text-xs font-extrabold text-white">
              Maks statisk trykk: {fmt(aktivMaksBar, 2)} bar ({fmt(aktivMaksBar * 100, 0)} kPa)
            </span>
          </div>
          <p className="mt-1.5 text-xs text-rose-200/95">
            Statisk vanntrykk i systemet overstiger <strong>6,0 bar (600 kPa)</strong>. For å forhindre vannslag, kavitasjon, armaturstøy og at sikkerhetsventilen på varmtvannsberederen (typisk 9–10 bar) løser ut ved termisk ekspansjon, <strong>SKAL det monteres trykkreduksjonsventil</strong> med manometer og smussfilter på hovedinntaket etter vannmåler (anbefalt innstilling: <strong>3,5–4,5 bar / 350–450 kPa</strong>).
          </p>
        </div>
      )}

      {/* GLOBAL PROSJEKT-STATE & HYDROSTATISK VEILEDER */}
      <div className="rounded-xl border border-sky-800/70 bg-slate-900/95 p-4 shadow">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base">🌐</span>
            <span className="text-xs font-extrabold text-sky-300 sm:text-sm">
              Globale prosjektdata (Single Source of Truth){modulNavn ? ` → ${modulNavn}` : ''}: Vanntrykk vs. Koter & Hydrostatisk trykktap
            </span>
            {Object.keys(overstyringer).some((k) => overstyringer[k]?.aktiv) && (
              <span className="rounded border border-amber-600/80 bg-amber-950/70 px-2 py-0.5 text-[10px] font-bold text-amber-200">
                🟡 {OVERSTYRING_ETIKETT}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {manglerTrykkEllerKote && (onOppdaterProsjektOgOverstyringer || onOppdaterProsjekt) && (
              <button
                type="button"
                onClick={aktiverMidlertidigEstimat}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-amber-500/80 bg-amber-900/50 px-3 py-1.5 text-[11px] font-extrabold text-amber-100 hover:bg-amber-800/70"
              >
                ⚠️ Gå videre med estimat / Venter på kommunen
              </button>
            )}
            <button
              type="button"
              onClick={() => setVisDetaljer((v) => !v)}
              className="inline-flex min-h-[38px] items-center rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-[11px] font-bold text-slate-200 hover:border-sky-500"
            >
              {visDetaljer ? '🔽 Skjul veileder & sjekkliste' : `📐 Vis trykk/kote-veileder & sjekkliste (${antallAvkrysset}/${TRYKK_KOTE_SJEKKPUNKT.length})`}
            </button>
          </div>
        </div>

        {/* Hurtiglinje for Adresse, Gnr/Bnr og direkte oppslag mot Kartverket (Geonorge) */}
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-xs">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400">📍 Adresse & Gnr/Bnr:</span>
            {onOppdaterProsjekt ? (
              <>
                <input
                  type="text"
                  aria-label="Global prosjektadresse"
                  value={prosjekt.sted}
                  placeholder="Skriv gateadresse (f.eks. Kongsgata 10, Stavanger)"
                  onChange={(e) =>
                    onOppdaterProsjekt({
                      ...prosjekt,
                      kilde: 'bruker',
                      sted: e.target.value,
                    })
                  }
                  className="min-w-[200px] flex-1 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500"
                />
                <input
                  type="text"
                  aria-label="Global matrikkel Gnr/Bnr"
                  value={prosjekt.matrikkel}
                  placeholder="Gnr/Bnr"
                  onChange={(e) =>
                    onOppdaterProsjekt({
                      ...prosjekt,
                      kilde: 'bruker',
                      matrikkel: e.target.value,
                    })
                  }
                  className="w-36 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200 outline-none focus:border-sky-500"
                />
              </>
            ) : (
              <span className="font-semibold text-slate-200">
                {prosjekt.sted || 'Ikke oppgitt'} · {prosjekt.matrikkel || 'Gnr/Bnr ikke oppgitt'}
              </span>
            )}
          </div>
          {onOppdaterProsjekt && (
            <button
              type="button"
              onClick={slaaOppKartverketDirekte}
              disabled={lasterKartverket}
              className="inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-sky-600/80 bg-sky-950/80 px-2.5 py-1 text-[11px] font-bold text-sky-200 transition hover:bg-sky-900/80 disabled:opacity-50"
              title="Slå opp Gnr/Bnr, kommune og terrengkote (NN2000) fra Kartverkets åpne API"
            >
              {lasterKartverket ? '⏳ Henter Kartverket...' : '🗺️ Kartverket-oppslag (Gnr/Bnr & NN2000)'}
            </button>
          )}
        </div>

        {/* Live nøkkeltall fra global prosjekt-state (kan også hurtigredigeres her og synker til Steg 1 og alle 9 moduler) */}
        <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-2.5 text-xs">
            <div className="text-[10px] font-semibold uppercase text-slate-400">Prosjekt & BRA</div>
            <div className="mt-0.5 truncate font-bold text-slate-100" title={prosjekt.navn}>
              {prosjekt.navn}
            </div>
            {onOppdaterProsjekt ? (
              <div className="mt-1 flex items-center gap-1">
                <input
                  type="number"
                  aria-label="Globalt BRA (m²)"
                  value={prosjekt.bra ?? ''}
                  placeholder="BRA m²"
                  onChange={(e) => oppdaterTall('bra', e.target.value)}
                  className="w-20 rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 font-mono text-xs text-emerald-300 outline-none focus:border-emerald-500"
                />
                <span className="text-[10px] text-slate-400">m² ({prosjekt.bygningstype})</span>
              </div>
            ) : (
              <div className="text-[11px] text-emerald-300">
                {prosjekt.bra ? `${fmt(prosjekt.bra, 0)} m²` : 'Ikke oppgitt'} · {prosjekt.bygningstype}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-2.5 text-xs">
            <div className="text-[10px] font-semibold uppercase text-slate-400">
              Statisk trykk (p_stat)
            </div>
            {onOppdaterProsjekt ? (
              <div className="mt-1 flex items-center gap-1">
                <input
                  type="number"
                  step="0.1"
                  aria-label="Globalt statisk vanntrykk (bar)"
                  value={prosjekt.vanntrykk.statiskBar ?? ''}
                  placeholder="f.eks. 4.5"
                  onChange={(e) => oppdaterTall('statiskBar', e.target.value)}
                  className={`w-20 rounded border px-1.5 py-0.5 font-mono text-xs font-bold outline-none ${
                    over6Bar
                      ? 'border-rose-500 bg-rose-950/60 text-rose-200'
                      : 'border-slate-700 bg-slate-900 text-sky-300 focus:border-emerald-500'
                  }`}
                />
                <span className="text-[10px] text-slate-400">
                  bar ({prosjekt.vanntrykk.statiskBar !== null ? `${fmt(prosjekt.vanntrykk.statiskBar * 100, 0)} kPa` : '–'})
                </span>
              </div>
            ) : (
              <div className="mt-0.5 font-mono font-bold text-sky-300">
                {prosjekt.vanntrykk.statiskBar !== null
                  ? `${fmt(prosjekt.vanntrykk.statiskBar, 1)} bar (${fmt(prosjekt.vanntrykk.statiskBar * 100, 0)} kPa)`
                  : 'Ikke oppgitt'}
              </div>
            )}
            <div className="mt-0.5 text-[10px] text-slate-400">
              {over6Bar ? '🚨 > 6,0 bar: Reduksjonsventil!' : 'Maks tillatt: 6,0 bar'}
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-2.5 text-xs">
            <div className="text-[10px] font-semibold uppercase text-slate-400">
              Dynamisk trykk (Q/p)
            </div>
            {onOppdaterProsjekt ? (
              <div className="mt-1 flex items-center gap-1">
                <input
                  type="number"
                  step="0.1"
                  aria-label="Globalt dynamisk vanntrykk (bar)"
                  value={prosjekt.vanntrykk.dynamiskBar ?? ''}
                  placeholder="f.eks. 3.8"
                  onChange={(e) => oppdaterTall('dynamiskBar', e.target.value)}
                  className="w-20 rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 font-mono text-xs font-bold text-sky-300 outline-none focus:border-emerald-500"
                />
                <span className="text-[10px] text-slate-400">bar</span>
              </div>
            ) : (
              <div className="mt-0.5 font-mono font-bold text-sky-300">
                {prosjekt.vanntrykk.dynamiskBar !== null
                  ? `${fmt(prosjekt.vanntrykk.dynamiskBar, 1)} bar`
                  : 'Ikke oppgitt'}
              </div>
            )}
            <div className="mt-0.5 text-[10px] text-slate-400">
              {prosjekt.vanntrykk.uttakLmin
                ? `Ved ${fmt(prosjekt.vanntrykk.uttakLmin, 0)} l/min`
                : 'Dimensjonerende ved tapp/brann'}
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-2.5 text-xs">
            <div className="text-[10px] font-semibold uppercase text-slate-400">
              Kote ITK/ITR & Terreng
            </div>
            {onOppdaterProsjekt ? (
              <div className="mt-1 flex items-center gap-1">
                <input
                  type="number"
                  step="0.01"
                  aria-label="Global Kote ITK/ITR (moh)"
                  value={prosjekt.koter.itrKum ?? ''}
                  placeholder="ITK moh"
                  onChange={(e) => oppdaterTall('itrKum', e.target.value)}
                  className="w-20 rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 font-mono text-xs text-sky-300 outline-none focus:border-emerald-500"
                />
                <span className="text-[10px] text-slate-400">moh</span>
              </div>
            ) : (
              <div className="mt-0.5 font-mono font-bold text-sky-300">
                {prosjekt.koter.itrKum !== null ? `C +${fmt(prosjekt.koter.itrKum)}` : 'Ikke oppgitt'}
              </div>
            )}
            <div className="mt-0.5 text-[10px] text-slate-400">
              Terreng: {prosjekt.koter.gate !== null ? `C +${fmt(prosjekt.koter.gate)}` : '–'} · IBR:{' '}
              {prosjekt.koter.ibrKum !== null ? `C +${fmt(prosjekt.koter.ibrKum)}` : '–'}
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-2.5 text-xs">
            <div className="text-[10px] font-semibold uppercase text-slate-400">
              Kote laveste sluk (OK FG)
            </div>
            {onOppdaterProsjekt ? (
              <div className="mt-1 flex items-center gap-1">
                <input
                  type="number"
                  step="0.01"
                  aria-label="Global Kote laveste sluk (moh)"
                  value={prosjekt.koter.gulv[0]?.kote ?? ''}
                  placeholder="Sluk moh"
                  onChange={(e) => oppdaterTall('lavesteSluk', e.target.value)}
                  className="w-20 rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 font-mono text-xs text-amber-300 outline-none focus:border-emerald-500"
                />
                <span className="text-[10px] text-slate-400">moh</span>
              </div>
            ) : (
              <div className="mt-0.5 font-mono font-bold text-amber-300">
                {h.lavesteGulvKote !== null ? `C +${fmt(h.lavesteGulvKote)}` : 'Ikke oppgitt'}
              </div>
            )}
            <div className="mt-0.5 text-[10px] text-slate-400">
              Lov 2: {analyse.lov2Status === 'ok' ? '✅ Selvfall OK' : analyse.lov2Status === 'brudd' ? '🚨 Pumpekrav' : '⚠️ Uavklart'}
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-2.5 text-xs">
            <div className="text-[10px] font-semibold uppercase text-slate-400">
              Hydrostatisk løftehøyde
            </div>
            <div className="mt-0.5 font-mono font-bold text-emerald-300">
              H_geo = {fmt(h.geodetiskLoftehoydeM, 1)} m
            </div>
            <div className="mt-0.5 text-[10px] text-slate-400">
              Trykktap: <strong>−{fmt(h.hydrostatiskTapBar, 2)} bar</strong> (−{fmt(h.hydrostatiskTapKpa, 0)} kPa)
            </div>
          </div>
        </div>

        {/* Automatisk info-påminnelse når statisk vanntrykk er oppgitt */}
        {prosjekt.vanntrykk.statiskBar !== null && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-sky-700/70 bg-sky-950/35 px-3 py-2 text-xs text-sky-100">
            <div className="flex items-start gap-2">
              <span className="text-sm" aria-hidden="true">ℹ️</span>
              <span>
                <strong>Påminnelse (Statisk/dynamisk trykk vs. koter):</strong> Oppgitt trykk ({fmt(prosjekt.vanntrykk.statiskBar, 1)} bar) må korrigeres for høydeforskjell (koter) mellom kommunalt tilknytningspunkt (ITK/vannledning:{' '}
                <strong className="text-sky-300">
                  {h.koteMaalepunkt !== null ? `C +${fmt(h.koteMaalepunkt)} moh` : 'ikke oppgitt'}
                </strong>
                ) og bygningens høyeste tappested (
                <strong className="text-sky-300">
                  {h.hoyesteTapKote !== null ? `C +${fmt(h.hoyesteTapKote)} moh` : `løftehøyde ${fmt(h.geodetiskLoftehoydeM, 1)} m`}
                </strong>
                ). Hydrostatisk trykktap er{' '}
                <strong className="text-amber-300">
                  −{fmt(h.hydrostatiskTapBar, 2)} bar (−{fmt(h.hydrostatiskTapKpa, 0)} kPa)
                </strong>
                {h.disponibeltToppBar !== null && (
                  <>
                    {' '}→ gjenstående trykk i toppen før rørfriksjon:{' '}
                    <strong className={h.trengerTrykkokning ? 'text-rose-300' : 'text-emerald-300'}>
                      {fmt(h.disponibeltToppBar, 2)} bar
                    </strong>
                    .
                  </>
                )}
              </span>
            </div>
          </div>
        )}

        {/* Utvidet fagveileder og interaktiv sjekkliste */}
        {visDetaljer && (
          <div className="mt-3 grid gap-3 border-t border-slate-800 pt-3 md:grid-cols-12">
            <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-950/90 p-3 text-xs md:col-span-6">
              <div className="font-bold text-sky-300">
                📘 Fagveileder: Slik henger Vanntrykk, Koter og Hydrostatisk Trykktap sammen
              </div>
              <ul className="list-disc space-y-1.5 pl-4 text-[11px] text-slate-300">
                <li>
                  <strong>Hydrostatisk trykkgradient:</strong> <code className="text-emerald-300">Δp_geo = ρ · g · Δh = 9,81 kPa/m ≈ 0,1 bar per høydemeter</code>. For hver 10 meter vannet må løftes opp i bygget (fra kote vannledning <code className="text-sky-300">{h.koteMaalepunkt !== null ? `C +${fmt(h.koteMaalepunkt)}` : 'ukjent'}</code> til øverste tappested <code className="text-sky-300">{h.hoyesteTapKote !== null ? `C +${fmt(h.hoyesteTapKote)}` : 'ukjent'}</code>), mister du ca. <strong>1,0 bar (100 kPa)</strong>.
                </li>
                <li>
                  <strong>Trykkøkning i lavtliggende kjeller:</strong> Dersom laveste etasje/teknisk rom ligger <em>lavere</em> enn kommunens målepunkt i gata, <strong>øker</strong> det statiske trykket med <code className="text-emerald-300">+0,1 bar/m</code> nedover.
                </li>
                <li>
                  <strong>Grenseverdier i norske bygg (Byggforsk 553.102 / TEK17 § 15-5):</strong>
                  <div className="mt-1 grid grid-cols-1 gap-1 sm:grid-cols-3">
                    <span className="rounded border border-rose-800/70 bg-rose-950/40 px-2 py-1 text-[10px] text-rose-200">
                      <strong>&gt; 6,0 bar:</strong> Påbudt med trykkreduksjonsventil!
                    </span>
                    <span className="rounded border border-emerald-800/70 bg-emerald-950/40 px-2 py-1 text-[10px] text-emerald-200">
                      <strong>3,0–5,5 bar:</strong> Optimalt driftstrykk i rørnett
                    </span>
                    <span className="rounded border border-amber-800/70 bg-amber-950/40 px-2 py-1 text-[10px] text-amber-200">
                      <strong>&lt; 2,0 bar (topp):</strong> Krever trykkøkningspumpe
                    </span>
                  </div>
                </li>
              </ul>
            </div>

            <div className="space-y-1.5 rounded-lg border border-slate-800 bg-slate-950/90 p-3 text-xs md:col-span-6">
              <div className="flex items-center justify-between font-bold text-emerald-300">
                <span>✅ Sjekkliste: Vanntrykk vs. Koter ({antallAvkrysset}/{TRYKK_KOTE_SJEKKPUNKT.length})</span>
                <span className="text-[10px] font-normal text-slate-400">Lagres globalt på prosjektet</span>
              </div>
              <div className="space-y-1.5">
                {TRYKK_KOTE_SJEKKPUNKT.map((pkt) => {
                  const avkrysset = !!qa[pkt.id];
                  return (
                    <label
                      key={pkt.id}
                      className={`flex cursor-pointer items-start gap-2 rounded border p-2 text-[11px] transition ${
                        avkrysset
                          ? 'border-emerald-700/60 bg-emerald-950/30 text-emerald-200'
                          : 'border-slate-800 bg-slate-900/70 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={avkrysset}
                        onChange={() => onToggleQa?.(pkt.id)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-800 text-emerald-500"
                      />
                      <span>{pkt.tekst}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
