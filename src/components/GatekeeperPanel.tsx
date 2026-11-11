import { useState } from 'react';
import type { ProsjektData } from '../data/prosjekter';
import type { ProsjektAnalyse } from '../lib/analyse';
import { kopierTilUtklippstavle } from '../lib/format';
import {
  anvendOverstyringMedEstimat,
  evaluerGatekeeper,
  lagKommuneForesporselEpost,
  type GatekeeperPunkt,
  type EpostUtkast,
} from '../lib/gatekeeper';
import type { OverstyringInfo } from '../lib/lagring';

interface Props {
  prosjekt: ProsjektData;
  analyse: ProsjektAnalyse;
  overstyringer: Record<string, OverstyringInfo>;
  qaFullfort: number;
  godkjent?: {
    laast: boolean;
    tidspunkt: string;
    medForbehold: boolean;
  };
  /** Hvis oppgitt, fremheves punktene for dette steget (1–5), med mulighet for å vise alle steg */
  aktivtSteg?: number;
  /** Viser knappen «Godkjenn og lås prosjektet / Generer endelig rapport» (brukes i Steg 5 og QA-port) */
  visSluttkontroll?: boolean;
  onOppdaterProsjektOgOverstyringer: (
    oppdatertProsjekt: ProsjektData,
    nyeOverstyringer: Record<string, OverstyringInfo>,
    endringer: string[]
  ) => void;
  onGaaVidereSteg?: () => void;
  onGodkjennOgLaasProsjekt?: (medForbehold: boolean) => void;
  onApneChatMedTekst?: (sporsmal: string) => void;
  melding: (tekst: string) => void;
}

export default function GatekeeperPanel({
  prosjekt,
  analyse,
  overstyringer,
  qaFullfort,
  godkjent,
  aktivtSteg,
  visSluttkontroll = false,
  onOppdaterProsjektOgOverstyringer,
  onGaaVidereSteg,
  onGodkjennOgLaasProsjekt,
  onApneChatMedTekst,
  melding,
}: Props) {
  const [visAlleSteg, setVisAlleSteg] = useState<boolean>(visSluttkontroll);
  const [visEpostMal, setVisEpostMal] = useState<boolean>(false);
  const [valgtUtkastFane, setValgtUtkastFane] = useState<
    'kommune' | 'prosjektgruppe' | 'byggherre' | 'alle'
  >('kommune');

  const rapport = evaluerGatekeeper(prosjekt, analyse, overstyringer, qaFullfort);
  const synligePunkter: GatekeeperPunkt[] =
    aktivtSteg && !visAlleSteg
      ? rapport.allePunkter.filter((p) => p.steg === aktivtSteg)
      : rapport.allePunkter;

  const manglendePaaSteg = synligePunkter.filter(
    (p) => p.status === 'kritisk_mangel' || p.status === 'advarsel'
  );

  const epostData = lagKommuneForesporselEpost(
    prosjekt,
    rapport,
    visAlleSteg ? undefined : aktivtSteg,
    analyse
  );

  const aktivtUtkast: EpostUtkast =
    valgtUtkastFane === 'prosjektgruppe'
      ? epostData.mottakerKontroll.utkast.prosjektgruppe
      : valgtUtkastFane === 'byggherre'
      ? epostData.mottakerKontroll.utkast.byggherre
      : epostData.mottakerKontroll.utkast.kommune;

  const overstyrPunkter = (ider: string[], gaaVidereEtterpaa = false) => {
    if (ider.length === 0) {
      if (gaaVidereEtterpaa && onGaaVidereSteg) onGaaVidereSteg();
      return;
    }
    const res = anvendOverstyringMedEstimat(prosjekt, overstyringer, ider);
    onOppdaterProsjektOgOverstyringer(res.prosjekt, res.overstyringer, res.endringer);
    melding(
      `🟡 Overstyrte ${ider.length} felt med «Midlertidig estimat / Venter på kommunen» – du kan jobbe videre uten stopp!`
    );
    if (gaaVidereEtterpaa && onGaaVidereSteg) {
      onGaaVidereSteg();
    }
  };

  const tilbakestillOverstyring = (punktId: string) => {
    const kopi = { ...overstyringer };
    delete kopi[punktId];
    onOppdaterProsjektOgOverstyringer(prosjekt, kopi, [
      'Fjernet midlertidig estimat-markering',
    ]);
  };

  const kopierSpesifiktUtkast = async (utkast: EpostUtkast) => {
    const ok = await kopierTilUtklippstavle(utkast.epostTekst);
    setVisEpostMal(true);
    melding(
      ok
        ? `📋 ${utkast.kortTittel}-utkast kopiert til utklippstavlen!`
        : 'Kunne ikke kopiere automatisk – utkastet vises i boksen under.'
    );
  };

  const kopierAlleTreUtkast = async () => {
    const samlet = epostData.mottakerKontroll.alleUtkast
      .flatMap((u, idx) => [
        ...(idx > 0 ? [''] : []),
        '====================================================================',
        u.tittel.toUpperCase(),
        '====================================================================',
        u.epostTekst,
      ])
      .join('\n');
    const ok = await kopierTilUtklippstavle(samlet);
    setVisEpostMal(true);
    melding(
      ok
        ? '📋 Alle 3 oppdelte e-postutkast kopiert til utklippstavlen i én pakke!'
        : 'Kunne ikke kopiere automatisk.'
    );
  };

  const kopierKommuneEpost = async () => {
    const ok = await kopierTilUtklippstavle(epostData.epostTekst);
    setVisEpostMal(true);
    melding(
      ok
        ? `📧 Forespørsel til ${rapport.kommuneNavn} er kopiert til utklippstavlen!`
        : 'Kunne ikke kopiere automatisk – e-postmalen er åpnet under slik at du kan kopiere den.'
    );
  };

  const kopierTelefonSjekkliste = async () => {
    const ok = await kopierTilUtklippstavle(epostData.telefonSjekkliste);
    setVisEpostMal(true);
    melding(
      ok
        ? '📞 Telefon-sjekkliste mot kommunen er kopiert!'
        : 'Telefon-sjekklisten vises i boksen under.'
    );
  };

  const lagMailtoUrl = (utkast: EpostUtkast) => {
    const mottaker = utkast.mottaker;
    const emne = utkast.emne;
    const body = utkast.epostTekst;
    return `mailto:${encodeURIComponent(mottaker)}?subject=${encodeURIComponent(emne)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="rounded-xl border border-slate-700/90 bg-slate-900/90 p-4 shadow-lg">
      {/* Topplinje: Tittel, status-teller og hovedknapper */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg">🚦</span>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-emerald-300 sm:text-sm">
              Kvalitets- og Mangelsikring (Gatekeeper)
              {aktivtSteg && !visAlleSteg ? ` – Steg ${aktivtSteg}` : ' – Hele prosjektet'}
            </h3>
            {godkjent?.laast && (
              <span className="rounded-md border border-emerald-500 bg-emerald-950 px-2 py-0.5 text-[11px] font-bold text-emerald-200">
                🔒 Prosjekt godkjent & låst{' '}
                {godkjent.medForbehold ? '(med kommuneforbehold)' : '(uten forbehold)'}
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Skiller mellom <strong>🛑 Kritiske mangler</strong> (stoppere før endelig låsing),{' '}
            <strong>🟡 Midlertidige estimater (Venter på kommunen)</strong> og{' '}
            <strong>⚠️ Advarsler / Anbefalt info</strong>.
          </p>
        </div>

        {/* Status-badges */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
          <span
            className={`rounded-md border px-2.5 py-1 ${
              rapport.kritiskeMangler.length > 0
                ? 'border-rose-600 bg-rose-950/70 text-rose-200'
                : 'border-slate-700 bg-slate-950 text-slate-400'
            }`}
          >
            🛑 {rapport.kritiskeMangler.length} Kritiske mangler
          </span>
          <span
            className={`rounded-md border px-2.5 py-1 ${
              rapport.overstyrteEstimater.length > 0
                ? 'border-amber-500 bg-amber-950/70 text-amber-200'
                : 'border-slate-700 bg-slate-950 text-slate-400'
            }`}
          >
            🟡 {rapport.overstyrteEstimater.length} Midlertidige estimater
          </span>
          <span
            className={`rounded-md border px-2.5 py-1 ${
              rapport.advarsler.length > 0
                ? 'border-sky-700 bg-sky-950/60 text-sky-200'
                : 'border-slate-700 bg-slate-950 text-slate-400'
            }`}
          >
            ⚠️ {rapport.advarsler.length} Advarsler
          </span>
          <span className="rounded-md border border-emerald-700/80 bg-emerald-950/50 px-2.5 py-1 text-emerald-300">
            ✅ {rapport.okPunkter.length} Bekreftet
          </span>
        </div>
      </div>

      {/* Hurtigknapper: Overstyr med estimat (aldri stopp prosessen) + Kopier forespørsel til kommune */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/80 p-3">
        <div className="flex flex-wrap items-center gap-2">
          {manglendePaaSteg.length > 0 ? (
            <button
              type="button"
              onClick={() =>
                overstyrPunkter(
                  manglendePaaSteg.map((p) => p.id),
                  Boolean(onGaaVidereSteg)
                )
              }
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-amber-500 bg-amber-600/90 px-3.5 py-2 text-xs font-extrabold text-slate-950 shadow hover:bg-amber-500"
            >
              <span>⚠️ Gå videre med estimat / Overstyr manglende data</span>
              <span className="rounded bg-slate-950/20 px-1.5 py-0.5 text-[10px]">
                {manglendePaaSteg.length} felt
              </span>
            </button>
          ) : (
            <span className="inline-flex min-h-[40px] items-center rounded-lg border border-emerald-800/70 bg-emerald-950/30 px-3 py-1.5 text-xs font-semibold text-emerald-300">
              ✅ Alle sjekkpunkter på dette steget er enten utfylt eller satt som midlertidig estimat!
            </span>
          )}

          <button
            type="button"
            onClick={() => void kopierKommuneEpost()}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-sky-600 bg-sky-950/70 px-3.5 py-2 text-xs font-bold text-sky-100 shadow hover:bg-sky-900"
          >
            📧 Kopier forespørsel til kommune ({rapport.kommuneNavn})
          </button>

          <button
            type="button"
            onClick={() => setVisEpostMal((v) => !v)}
            className="inline-flex min-h-[44px] items-center rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-slate-500"
          >
            {visEpostMal
              ? '🔽 Skjul AI-Kommunikasjonsassistent'
              : '📞 Vis AI-Kommunikasjonsassistent (Hvem & Hva du skal spørre etter)'}
          </button>
        </div>

        {aktivtSteg && (
          <button
            type="button"
            onClick={() => setVisAlleSteg((v) => !v)}
            className="min-h-[38px] rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:border-emerald-600 hover:text-white"
          >
            {visAlleSteg
              ? `Vis kun Steg ${aktivtSteg}`
              : `Vis alle 5 steg (${rapport.allePunkter.length} punkter)`}
          </button>
        )}
      </div>

      {/* Punktliste med Krav vs. Advarsel, Gul «Midlertidig estimat»-status og Veileder for innhenting */}
      <div className="mt-3 space-y-2.5">
        {synligePunkter.map((p) => {
          const erKritisk = p.status === 'kritisk_mangel';
          const erOverstyrt = p.status === 'overstyrt_estimat';
          const erAdvarsel = p.status === 'advarsel';

          return (
            <div
              key={p.id}
              className={`rounded-lg border p-3 text-xs transition ${
                erKritisk
                  ? 'border-rose-700/80 bg-rose-950/35 text-rose-100'
                  : erOverstyrt
                  ? 'border-amber-500/80 bg-amber-950/40 text-amber-100'
                  : erAdvarsel
                  ? 'border-sky-800/70 bg-sky-950/25 text-sky-100'
                  : 'border-emerald-800/60 bg-emerald-950/20 text-emerald-100'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-slate-950/70 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">
                    Steg {p.steg}
                  </span>
                  <span className="font-bold">{p.tittel}</span>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                      erKritisk
                        ? 'border border-rose-500 bg-rose-900/80 text-rose-100'
                        : erOverstyrt
                        ? 'border border-amber-400 bg-amber-500/20 text-amber-200'
                        : erAdvarsel
                        ? 'border border-sky-600 bg-sky-900/60 text-sky-200'
                        : 'border border-emerald-600 bg-emerald-900/60 text-emerald-200'
                    }`}
                  >
                    {erKritisk
                      ? '🛑 Kritisk mangel (Stopper)'
                      : erOverstyrt
                      ? '🟡 Midlertidig estimat / Venter på kommunen'
                      : erAdvarsel
                      ? '⚠️ Advarsel / Anbefalt info'
                      : '✅ Bekreftet'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {(erKritisk || erAdvarsel) && (
                    <button
                      type="button"
                      onClick={() => overstyrPunkter([p.id])}
                      className="min-h-[36px] rounded-md border border-amber-500 bg-amber-500/20 px-2.5 py-1 text-[11px] font-bold text-amber-200 hover:bg-amber-500/30"
                    >
                      ⚠️ Bruk midlertidig estimat
                    </button>
                  )}
                  {erOverstyrt && (
                    <button
                      type="button"
                      onClick={() => tilbakestillOverstyring(p.id)}
                      className="min-h-[36px] rounded-md border border-slate-600 bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:bg-slate-800"
                    >
                      🔄 Fjern estimat-status
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-1 text-[11px] opacity-90">{p.detalj}</div>

              {/* Vis «Veileder for innhenting av manglende data» når punktet mangler eller venter på kommunen */}
              {(erKritisk || erAdvarsel || erOverstyrt) && (
                <div className="mt-2 rounded-md border border-slate-800/90 bg-slate-950/85 p-2.5 text-[11px] text-slate-300">
                  <div className="font-bold text-sky-300">
                    📋 Veileder for innhenting av manglende data:
                  </div>
                  <div className="mt-1 grid gap-1 sm:grid-cols-2">
                    <div>
                      <span className="font-semibold text-slate-400">🏛️ Hvem du skal kontakte: </span>
                      <span className="text-slate-100">{p.veileder.hvemKontakte}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-400">🎯 Hva du skal spørre etter: </span>
                      <span className="text-slate-100">{p.veileder.hvaSporreEtter}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Utvidbar AI-Kommunikasjonsassistent med Mottaker-kontroll & Split-E-post */}
      {visEpostMal && (
        <div className="mt-4 rounded-xl border border-sky-700/80 bg-slate-950 p-4 text-xs">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
            <div>
              <div className="flex items-center gap-2 font-extrabold text-sky-300">
                <span>🤖 AI-Kommunikasjonsassistent: Intelligent Mottaker-kontroll & E-postgenerator</span>
              </div>
              <div className="text-[11px] text-slate-400">
                Skreddersydde, kvalitetssikrede henvendelser for «<strong>{prosjekt.navn}</strong>»
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void kopierAlleTreUtkast()}
                className="min-h-[38px] rounded-lg border border-purple-600 bg-purple-950/70 px-3 py-1.5 text-xs font-bold text-purple-200 hover:bg-purple-900"
              >
                📑 Kopier alle 3 utkast i én pakke
              </button>
              <button
                type="button"
                onClick={() => void kopierTelefonSjekkliste()}
                className="min-h-[38px] rounded-lg border border-sky-700 bg-sky-950/60 px-3 py-1.5 text-xs font-bold text-sky-200 hover:bg-sky-900"
              >
                📞 Kopier telefonmanus
              </button>
              {onApneChatMedTekst && (
                <button
                  type="button"
                  onClick={() =>
                    onApneChatMedTekst(
                      `Tilpass og utdyp disse forespørslene til ${rapport.kommuneNavn} og arkitekt for prosjektet «${prosjekt.navn}» – sjekk at ingen interne krav lekker ut offentlig!`
                    )
                  }
                  className="min-h-[38px] rounded-lg border border-emerald-700 bg-emerald-950/50 px-3 py-1.5 text-xs font-bold text-emerald-200 hover:bg-emerald-900"
                >
                  💬 Spør AI-chat om innhenting
                </button>
              )}
            </div>
          </div>

          {/* 1. STATUS FOR INTELLIGENT MOTTAKER-KONTROLL (FILTER) */}
          <div className="mt-3 rounded-lg border border-emerald-800/80 bg-emerald-950/30 p-3 text-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-base">🛡️</span>
                <span className="font-extrabold text-emerald-300">
                  Intelligent Mottaker-kontroll (Aktivt forvaltningsfilter)
                </span>
              </div>
              <span className="rounded-full border border-emerald-600/80 bg-emerald-900/60 px-2.5 py-0.5 text-[10px] font-bold text-emerald-200">
                {epostData.mottakerKontroll.filtrertBortFraOffentlig.length > 0
                  ? `${epostData.mottakerKontroll.filtrertBortFraOffentlig.length} interne punkter filtrert bort fra offentlige brev`
                  : 'Offentlig brev er rensket'}
              </span>
            </div>

            {epostData.mottakerKontroll.filtrertBortFraOffentlig.length > 0 ? (
              <div className="mt-2 space-y-1.5 text-[11px]">
                <p className="text-slate-300">
                  Før brevet sendes til offentlige etater, har systemet automatisk skannet og <strong>skjermet</strong> interne prosjektforhold (f.eks. TEK17 § 14-4 varmesentral, innvendige slukkoter og arkitektkrav). Disse er overført til <strong>Utkast 3 (Arkitekt / Internt notat)</strong>:
                </p>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {epostData.mottakerKontroll.filtrertBortFraOffentlig.map((f, i) => (
                    <div
                      key={i}
                      className="rounded border border-amber-900/60 bg-amber-950/40 p-2 text-amber-200"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-amber-300">❌ Skjermet: {f.tittel}</span>
                        <span className="text-[10px] text-amber-400">Offentlig filter</span>
                      </div>
                      <div className="mt-0.5 text-[10px] text-slate-300">{f.begrunnelse}</div>
                      <div className="mt-1 text-[10px] font-semibold text-emerald-400">
                        ➔ {f.overfortTil}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-1 text-[11px] text-slate-400">
                ✅ Ingen interne arkitekt- eller budsjettforhold oppdaget. Offentlige henvendelser inneholder kun det etaten faktisk har forvaltningsansvar for (koter ITK/IBR, trykk og overvann).
              </p>
            )}
          </div>

          {/* 2. AUTOMATISK SPLITTING TIL FLERE MOTTAKERE (3 FANER) */}
          <div className="mt-4 flex flex-wrap items-center gap-1.5 border-b border-slate-800 pb-2">
            <button
              type="button"
              onClick={() => setValgtUtkastFane('kommune')}
              className={`min-h-[38px] rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                valgtUtkastFane === 'kommune'
                  ? 'bg-sky-600 text-white shadow ring-2 ring-sky-400'
                  : 'border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
              }`}
            >
              🏛️ Fane 1: Til Kommunen (VA & Geodata)
            </button>
            <button
              type="button"
              onClick={() => setValgtUtkastFane('prosjektgruppe')}
              className={`min-h-[38px] rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                valgtUtkastFane === 'prosjektgruppe'
                  ? 'bg-emerald-600 text-white shadow ring-2 ring-emerald-400'
                  : 'border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
              }`}
            >
              📐 Fane 2: Til Prosjektgruppe (ARK / RIBr / RIAku)
            </button>
            <button
              type="button"
              onClick={() => setValgtUtkastFane('byggherre')}
              className={`min-h-[38px] rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                valgtUtkastFane === 'byggherre'
                  ? 'bg-amber-600 text-white shadow ring-2 ring-amber-400'
                  : 'border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
              }`}
            >
              💼 Fane 3: Til Byggherre (Økonomi & Risiko)
            </button>
            <button
              type="button"
              onClick={() => setValgtUtkastFane('alle')}
              className={`min-h-[38px] rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                valgtUtkastFane === 'alle'
                  ? 'bg-purple-600 text-white shadow ring-2 ring-purple-400'
                  : 'border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
              }`}
            >
              📑 Alle 3 utkast
            </button>
          </div>

          {/* 3. VISNING AV VALGT UTKAST / ALLE UTKAST */}
          {valgtUtkastFane === 'alle' ? (
            <div className="mt-3 space-y-4">
              {epostData.mottakerKontroll.alleUtkast.map((u) => (
                <div
                  key={u.id}
                  className="rounded-lg border border-slate-800 bg-slate-900/90 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                    <div>
                      <div className="font-extrabold text-slate-100">{u.tittel}</div>
                      <div className="text-[11px] text-slate-400">
                        Mottaker: <strong>{u.mottaker}</strong>
                        {u.kopi && ` · Kopi: ${u.kopi}`}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void kopierSpesifiktUtkast(u)}
                        className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-black text-white hover:bg-sky-500 shadow"
                      >
                        📋 Kopier e-post ({u.kortTittel})
                      </button>
                      <a
                        href={lagMailtoUrl(u)}
                        className="inline-flex items-center rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-bold text-slate-200 hover:bg-slate-700"
                      >
                        📧 Åpne i e-post (mailto)
                      </a>
                    </div>
                  </div>
                  <pre className="mt-2 max-h-56 overflow-y-auto whitespace-pre-wrap rounded bg-slate-950 p-2.5 font-mono text-[11px] text-slate-200">
                    {u.epostTekst}
                  </pre>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <div>
                <div className="mb-1 flex flex-wrap items-center justify-between gap-1 text-[11px]">
                  <span className="font-bold text-slate-200">
                    {aktivtUtkast.tittel}:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => void kopierSpesifiktUtkast(aktivtUtkast)}
                      className="rounded bg-sky-600 px-3 py-1.5 text-xs font-black text-white hover:bg-sky-500 shadow"
                    >
                      📋 Kopier e-post
                    </button>
                    <a
                      href={lagMailtoUrl(aktivtUtkast)}
                      className="rounded border border-slate-600 bg-slate-800 px-2.5 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700"
                    >
                      📧 mailto
                    </a>
                  </div>
                </div>

                <div className="mb-1.5 rounded border border-slate-800 bg-slate-900/60 p-2 text-[11px] text-slate-300">
                  <div>
                    <span className="font-semibold text-slate-400">Mottaker: </span>
                    <strong className="text-white">{aktivtUtkast.mottaker}</strong>
                  </div>
                  {aktivtUtkast.kopi && (
                    <div>
                      <span className="font-semibold text-slate-400">Kopi: </span>
                      <span className="text-slate-300">{aktivtUtkast.kopi}</span>
                    </div>
                  )}
                  <div>
                    <span className="font-semibold text-slate-400">Emne: </span>
                    <span className="text-sky-300">{aktivtUtkast.emne}</span>
                  </div>
                </div>

                <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-lg border border-slate-800 bg-slate-900 p-3 font-mono text-[11px] text-slate-200">
                  {aktivtUtkast.epostTekst}
                </pre>
              </div>

              <div>
                <div className="mb-1 text-[11px] font-bold text-slate-300">
                  📞 Telefon-sjekkliste (hva du spør saksbehandler om på telefon):
                </div>
                <div className="mb-1.5 rounded border border-amber-900/60 bg-amber-950/30 p-2 text-[11px] text-amber-200">
                  Bruk dette manuskriptet når du ringer sentralbordet i {rapport.kommuneNavn} for å få raskt svar på manglende koter og trykk.
                </div>
                <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-lg border border-slate-800 bg-slate-900 p-3 font-mono text-[11px] text-amber-200">
                  {epostData.telefonSjekkliste}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sluttkontroll i Steg 5: Godkjenn og lås prosjektet / Generer endelig rapport */}
      {visSluttkontroll && onGodkjennOgLaasProsjekt && (
        <div className="mt-4 rounded-xl border border-emerald-700/80 bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-950 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-black text-emerald-300">
                🛡️ Steg 5 Sluttkontroll: Godkjenn og lås prosjektet / Generer endelig rapport
              </div>
              <p className="mt-0.5 text-xs text-slate-300">
                {rapport.kanGodkjenneUtenForbehold ? (
                  '✅ Alle kritiske krav er verifisert uten midlertidige estimater. Prosjektet er klart for endelig godkjenning!'
                ) : rapport.kanGodkjenneEndelig ? (
                  `🟡 Prosjektet har 0 uavklarte stoppere og ${rapport.overstyrteEstimater.length} dokumenterte midlertidige estimater («Venter på kommunen»). Du kan godkjenne og generere endelig rapport med dokumenterte forbehold!`
                ) : (
                  `🛑 Det gjenstår ${rapport.kritiskeMangler.length} kritiske mangler (${rapport.kritiskeMangler
                    .map((k) => k.tittel)
                    .join(', ')}). Fyll inn verdiene eller trykk «Overstyr med midlertidig estimat» for å låse opp endelig rapport.`
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {!rapport.kanGodkjenneEndelig && (
                <button
                  type="button"
                  onClick={() =>
                    overstyrPunkter(rapport.kritiskeMangler.map((k) => k.id))
                  }
                  className="inline-flex min-h-[44px] items-center rounded-lg border border-amber-500 bg-amber-600 px-3.5 py-2 text-xs font-extrabold text-slate-950 shadow hover:bg-amber-500"
                >
                  ⚠️ Overstyr {rapport.kritiskeMangler.length} kritiske mangler med estimat (Venter på kommunen)
                </button>
              )}

              <button
                type="button"
                disabled={!rapport.kanGodkjenneEndelig}
                onClick={() =>
                  onGodkjennOgLaasProsjekt(rapport.overstyrteEstimater.length > 0)
                }
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-black text-white shadow-lg transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
              >
                <span>🔒 Godkjenn og lås prosjektet / Generer endelig rapport</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
