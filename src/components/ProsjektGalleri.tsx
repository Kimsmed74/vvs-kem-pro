import { useState } from 'react';
import { tomtProsjekt, type ProsjektData } from '../data/prosjekter';
import {
  FIL_KATEGORI_ETIKETTER,
  analyserTekstLokalt,
  flettUttrekkResultater,
  type FilKategori,
  type ProsjektFil,
  type UttrekkResultat,
} from '../lib/filer';
import { analyserFilerMedGeminiVision } from '../lib/gemini';
import {
  flettKartverketInnIProsjekt,
  slaaOppAdresseOgKoteIKartverket,
} from '../lib/kartverket';
import type { Innstillinger } from '../lib/lagring';
import {
  STANDARD_MOTE_STEG,
  analyserMoteTranskripsjonLokalt,
  type MoteAnalyseSteg,
} from '../lib/moteopptak';
import FilOpplaster from './FilOpplaster';
import { useBekreftSlett } from './common/BekreftSlettModal';
import Modal from './common/Modal';
import { Knapp, Kort } from './common/ui';

interface Props {
  prosjektId: string;
  prosjektNavn: string;
  prosjekt?: ProsjektData;
  filer: readonly ProsjektFil[];
  innstillinger: Innstillinger;
  onFilerLastetOpp: (nye: ProsjektFil[]) => void;
  onOppdaterFil: (oppdatert: ProsjektFil) => void;
  onOppdaterProsjekt?: (oppdatert: ProsjektData, endringer?: string[]) => void;
  onSlettFil: (filId: string) => void;
  onBrukUttrekk: (uttrekk: UttrekkResultat, modus: 'oppdater' | 'nytt') => void;
  onAnalyserFilIChat: (filId: string, foreslattSporsmal?: string) => void;
  onApneInnstillinger: () => void;
  melding: (tekst: string) => void;
}

export default function ProsjektGalleri({
  prosjektId,
  prosjektNavn,
  prosjekt,
  filer,
  innstillinger,
  onFilerLastetOpp,
  onOppdaterFil,
  onOppdaterProsjekt,
  onSlettFil,
  onBrukUttrekk,
  onAnalyserFilIChat,
  onApneInnstillinger,
  melding,
}: Props) {
  const [filterKat, setFilterKat] = useState<'alle' | FilKategori>('alle');
  const [valgtFil, setValgtFil] = useState<ProsjektFil | null>(null);
  const [analysererFilId, setAnalysererFilId] = useState<string | null>(null);
  const [framdriftProsent, setFramdriftProsent] = useState(0);
  const [aktivtStegTekst, setAktivtStegTekst] = useState('');
  const [stegListe, setStegListe] = useState<MoteAnalyseSteg[]>(STANDARD_MOTE_STEG);
  const bekreftSlett = useBekreftSlett();

  const kjorLydfilAnalyse = async (fil: ProsjektFil) => {
    setAnalysererFilId(fil.id);
    setFramdriftProsent(15);
    setAktivtStegTekst(`Steg 1/5 (20 %): Klargjør lydfil «${fil.navn}» for AI-transkripsjon...`);
    setStegListe((forrige) =>
      forrige.map((s) => ({ ...s, status: s.stegNr === 1 ? 'aktiv' : 'venter' }))
    );

    try {
      await new Promise((r) => setTimeout(r, 200));

      let uttrukketTekst = fil.uttrukketTekst || '';
      let aiUttrekk: UttrekkResultat | undefined;

      // STEG 2: AI-transkripsjon og tekstanalyse
      setFramdriftProsent(45);
      setAktivtStegTekst(`Steg 2/5 (45 %): Transkriberer tale og trekker ut VVS-data fra «${fil.navn}»...`);
      setStegListe((forrige) =>
        forrige.map((s) => ({
          ...s,
          status: s.stegNr < 2 ? 'ferdig' : s.stegNr === 2 ? 'aktiv' : 'venter',
        }))
      );

      if (innstillinger.geminiNokkel.trim()) {
        try {
          const aiRes = await analyserFilerMedGeminiVision({
            nokkel: innstillinger.geminiNokkel,
            modell: innstillinger.modell,
            filer: [fil],
          });
          aiUttrekk = aiRes;
          if (aiRes.oppsummering) {
            uttrukketTekst = `${uttrukketTekst}\n${aiRes.oppsummering}`.trim();
          }
        } catch {
          // Fortsetter med eventuell eksisterende tekst eller filnavn
        }
      }
      await new Promise((r) => setTimeout(r, 250));

      if (!uttrukketTekst) {
        uttrukketTekst = `Lydopptak: ${fil.navn}\n${aiUttrekk?.oppsummering || ''}`.trim();
      }

      // STEG 3: Oppslag mot Kartverket
      setFramdriftProsent(70);
      setAktivtStegTekst(`Steg 3/5 (70 %): Sjekker adresse og henter Gnr/Bnr og terrengkote fra Kartverket...`);
      setStegListe((forrige) =>
        forrige.map((s) => ({
          ...s,
          status: s.stegNr < 3 ? 'ferdig' : s.stegNr === 3 ? 'aktiv' : 'venter',
        }))
      );

      const gjeldendeProsjekt: ProsjektData =
        prosjekt ?? {
          ...tomtProsjekt(prosjektId),
          navn: prosjektNavn,
        };

      const forelopig = analyserMoteTranskripsjonLokalt(
        gjeldendeProsjekt,
        uttrukketTekst,
        180,
        aiUttrekk
      );

      let sluttProsjekt = forelopig.oppdatertProsjekt;
      let sluttUttrekk = forelopig.uttrekk;
      const sokeAdresse = sluttUttrekk.sted || sluttProsjekt.sted;

      if (sokeAdresse && sokeAdresse.trim().length >= 3) {
        try {
          const kvTreff = await slaaOppAdresseOgKoteIKartverket(sokeAdresse);
          if (kvTreff) {
            const flettetKv = flettKartverketInnIProsjekt(sluttProsjekt, kvTreff);
            sluttProsjekt = flettetKv.prosjekt;
            sluttUttrekk = flettUttrekkResultater(sluttUttrekk, {
              sted: sluttProsjekt.sted,
              matrikkel: sluttProsjekt.matrikkel,
              vaMyndighet: sluttProsjekt.vaMyndighet,
              koter: { gate: sluttProsjekt.koter.gate ?? undefined },
            });
          }
        } catch {
          // Ignorer
        }
      }
      await new Promise((r) => setTimeout(r, 200));

      // STEG 4: Synkroniser Global Prosjekt-State
      setFramdriftProsent(90);
      setAktivtStegTekst(`Steg 4/5 (90 %): Oppdaterer global prosjekt-state, koter og vanntrykk...`);
      setStegListe((forrige) =>
        forrige.map((s) => ({
          ...s,
          status: s.stegNr < 4 ? 'ferdig' : s.stegNr === 4 ? 'aktiv' : 'venter',
        }))
      );

      const endeligRes = analyserMoteTranskripsjonLokalt(
        gjeldendeProsjekt,
        uttrukketTekst,
        180,
        sluttUttrekk
      );

      if (onOppdaterProsjekt) {
        onOppdaterProsjekt(endeligRes.oppdatertProsjekt, endeligRes.endringer);
      } else {
        onBrukUttrekk(endeligRes.uttrekk, 'oppdater');
      }

      // STEG 5: Oppdater filen i IndexedDB med transkribert tekst og oppsummering
      setFramdriftProsent(100);
      setAktivtStegTekst(`Steg 5/5 (100 %): Lagrer transkripsjon og tekniske funn på lydfilen...`);
      setStegListe((forrige) => forrige.map((s) => ({ ...s, status: 'ferdig' })));

      onOppdaterFil({
        ...fil,
        uttrukketTekst: endeligRes.transkripsjon,
        aiOppsummering:
          endeligRes.kortFunnTekst ||
          `Transkribert og analysert lydopptak (${fil.navn}). Gjenkjente ${endeligRes.endringer.length} prosjektverdier.`,
        tekniskeFunn: endeligRes.endringer,
      });

      await new Promise((r) => setTimeout(r, 300));
      melding(`✅ Lydfil «${fil.navn}» analysert! Prosjektdata oppdatert.`);
    } catch {
      melding(`⚠️ Kunne ikke analysere lydfilen «${fil.navn}».`);
    } finally {
      setAnalysererFilId(null);
    }
  };

  const beOmSlettFil = (fil: ProsjektFil) => {
    bekreftSlett({
      tittel: 'Slette fil fra prosjektet?',
      elementNavn: `${FIL_KATEGORI_ETIKETTER[fil.kategori]?.ikon ?? '📎'} ${fil.navn}`,
      beskrivelse: `Er du sikker på at du vil slette dokumentet/bildet «${fil.navn}» (${(fil.storrelse / 1024).toFixed(1)} kB) permanent fra prosjektet «${prosjektNavn}» i IndexedDB?`,
      bekreftTekst: '🗑️ Bekreft sletting av fil',
      onBekreft: () => {
        if (valgtFil?.id === fil.id) setValgtFil(null);
        onSlettFil(fil.id);
      },
    });
  };

  const filtrerte =
    filterKat === 'alle' ? filer : filer.filter((f) => f.kategori === filterKat);

  return (
    <div className="space-y-6">
      {/* Toppboks */}
      <div className="rounded-xl border border-emerald-900/60 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🖼️</span>
              <h2 className="text-xl font-bold text-emerald-300">
                Prosjektgalleri & Dokumentarkiv
              </h2>
              <span className="rounded border border-emerald-800 bg-emerald-950 px-2 py-0.5 text-xs font-bold text-emerald-300">
                {prosjektNavn} ({filer.length} filer)
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-300">
              Last opp plantegninger, systemskjemaer, bilder av typeskilt (pumper/aggregater), VA-kart, PDF-rapporter og Excel-kalkyler. Alt lagres permanent i nettleserens IndexedDB på prosjektet.
            </p>
          </div>
        </div>

        <div className="mt-4">
          <FilOpplaster
            prosjektId={prosjektId}
            prosjektNavn={prosjektNavn}
            eksisterendeFiler={filer}
            innstillinger={innstillinger}
            onFilerLastetOpp={onFilerLastetOpp}
            onOppdaterFil={onOppdaterFil}
            onBrukUttrekk={onBrukUttrekk}
            onApneInnstillinger={onApneInnstillinger}
            melding={melding}
          />
        </div>
      </div>

      {/* Live Framdriftsindikator hvis en fil analyseres */}
      {analysererFilId && (
        <div className="rounded-xl border border-indigo-600/80 bg-slate-950 p-4 shadow-xl">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-bold text-indigo-200">
              ⏳ {aktivtStegTekst}
            </div>
            <span className="rounded-full border border-indigo-500 bg-indigo-950 px-2.5 py-0.5 font-mono text-xs font-black text-indigo-200">
              {framdriftProsent}%
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={framdriftProsent}
            className="mt-2 h-3 w-full overflow-hidden rounded-full border border-slate-800 bg-slate-900"
          >
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-400 transition-all duration-300"
              style={{ width: `${framdriftProsent}%` }}
            />
          </div>
          <div className="mt-3 grid gap-1.5 sm:grid-cols-5">
            {stegListe.map((s) => (
              <div
                key={s.stegNr}
                className={`rounded-lg border p-2 text-[10px] transition ${
                  s.status === 'ferdig'
                    ? 'border-emerald-800/80 bg-emerald-950/40 text-emerald-200'
                    : s.status === 'aktiv'
                    ? 'border-indigo-500 bg-indigo-950/70 font-bold text-indigo-100'
                    : 'border-slate-800 bg-slate-900/50 text-slate-500'
                }`}
              >
                <div className="flex items-center justify-between font-bold">
                  <span>Steg {s.stegNr}</span>
                  <span>
                    {s.status === 'ferdig' ? '✅' : s.status === 'aktiv' ? '⏳' : `${s.prosent}%`}
                  </span>
                </div>
                <div className="mt-0.5 line-clamp-2">{s.tittel.replace(/^\d+\.\s*/, '')}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Kategorifilter */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setFilterKat('alle')}
          className={`min-h-[44px] rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
            filterKat === 'alle'
              ? 'border border-emerald-700 bg-emerald-950 text-emerald-300'
              : 'border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
          }`}
        >
          Alle ({filer.length})
        </button>
        {(Object.keys(FIL_KATEGORI_ETIKETTER) as FilKategori[]).map((kat) => {
          const ant = filer.filter((f) => f.kategori === kat).length;
          const info = FIL_KATEGORI_ETIKETTER[kat];
          return (
            <button
              key={kat}
              type="button"
              onClick={() => setFilterKat(kat)}
              className={`min-h-[44px] rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                filterKat === kat
                  ? 'border border-emerald-700 bg-emerald-950 text-emerald-300'
                  : 'border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              {info.ikon} {info.navn} ({ant})
            </button>
          );
        })}
      </div>

      {/* Galleri-rutenett */}
      {filtrerte.length === 0 ? (
        <Kort>
          <div className="py-10 text-center text-xs text-slate-400">
            <div className="text-4xl">📂</div>
            <p className="mt-2 font-semibold text-slate-200">
              Ingen opplastede filer i denne kategorien ennå på «{prosjektNavn}».
            </p>
            <p className="mt-1">
              Dra og slipp PDF-er, Excel-kalkyler, plantegninger eller bilder fra byggeplass/typeskilt i feltet over!
            </p>
          </div>
        </Kort>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtrerte.map((fil) => {
            const erBilde = fil.mimeType.startsWith('image/');
            const erPdf =
              fil.mimeType === 'application/pdf' || fil.navn.toLowerCase().endsWith('.pdf');
            const erLyd =
              fil.kategori === 'lydopptak' ||
              fil.mimeType.startsWith('audio/') ||
              fil.mimeType.startsWith('video/') ||
              /\.(mp3|m4a|wav|mp4|webm|ogg)$/i.test(fil.navn);
            const katInfo = FIL_KATEGORI_ETIKETTER[fil.kategori] ?? FIL_KATEGORI_ETIKETTER.annet;

            return (
              <div
                key={fil.id}
                className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/90 p-4 shadow-lg transition hover:border-emerald-600/80"
              >
                <div>
                  {/* Forhåndsvisning av bilde/tegning eller dokumentikon */}
                  <div
                    onClick={() => setValgtFil(fil)}
                    className="group relative flex h-44 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-slate-800 bg-slate-950"
                  >
                    {erBilde ? (
                      <img
                        src={fil.dataUrl}
                        alt={fil.navn}
                        className="h-full w-full object-contain transition group-hover:scale-105"
                      />
                    ) : erPdf ? (
                      <div className="flex flex-col items-center gap-1.5 text-center p-4">
                        <span className="text-4xl">📑</span>
                        <span className="text-xs font-bold text-rose-300">PDF-dokument / Tegning</span>
                        <span className="text-[11px] text-slate-400">
                          Klikk for forhåndsvisning & tekstuttrekk
                        </span>
                      </div>
                    ) : erLyd ? (
                      <div className="flex flex-col items-center gap-1.5 text-center p-4">
                        <span className="text-5xl">🎙️</span>
                        <span className="text-xs font-bold text-indigo-300">Lydopptak / Befaring</span>
                        <span className="text-[11px] text-slate-400">
                          {fil.uttrukketTekst ? 'Transkribert og analysert' : 'Klikk for avspilling & analyse'}
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1.5 text-center p-4">
                        <span className="text-4xl">{katInfo.ikon}</span>
                        <span className="text-xs font-bold text-emerald-300">{katInfo.navn}</span>
                        <span className="text-[11px] text-slate-400">
                          {fil.uttrukketTekst
                            ? `${fil.uttrukketTekst.length} tegn uttrukket`
                            : `${(fil.storrelse / 1024).toFixed(1)} kB`}
                        </span>
                      </div>
                    )}
                    <span className="absolute right-2 top-2 rounded bg-slate-900/90 px-2 py-0.5 text-[10px] font-semibold text-slate-300 border border-slate-700">
                      🔍 Forhåndsvis
                    </span>
                  </div>

                  {/* Filnavn og kategori-velger */}
                  <div className="mt-3 flex items-start justify-between gap-2">
                    <h3
                      onClick={() => setValgtFil(fil)}
                      className="cursor-pointer truncate text-sm font-bold text-slate-100 hover:text-emerald-300"
                      title={fil.navn}
                    >
                      {fil.navn}
                    </h3>
                    <span className="shrink-0 text-[10px] text-slate-500">
                      {(fil.storrelse / 1024).toFixed(1)} kB
                    </span>
                  </div>

                  <div className="mt-1.5 flex items-center gap-2">
                    <select
                      aria-label={`Kategori for ${fil.navn}`}
                      value={fil.kategori}
                      onChange={(e) =>
                        onOppdaterFil({ ...fil, kategori: e.target.value as FilKategori })
                      }
                      className="min-h-[44px] w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs font-semibold text-slate-300 outline-none focus:border-emerald-500"
                    >
                      {(Object.keys(FIL_KATEGORI_ETIKETTER) as FilKategori[]).map((k) => (
                        <option key={k} value={k}>
                          {FIL_KATEGORI_ETIKETTER[k].ikon} {FIL_KATEGORI_ETIKETTER[k].navn}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Oppsummering & tekniske funn */}
                  {fil.aiOppsummering && (
                    <p className="mt-2 line-clamp-3 text-xs text-slate-300">
                      {fil.aiOppsummering}
                    </p>
                  )}

                  {fil.tekniskeFunn && fil.tekniskeFunn.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {fil.tekniskeFunn.slice(0, 3).map((funn, idx) => (
                        <span
                          key={idx}
                          className="rounded border border-emerald-800/60 bg-emerald-950/30 px-1.5 py-0.5 text-[10px] text-emerald-300"
                        >
                          {funn}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Aksjonsknapper */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-3">
                  <div className="flex flex-wrap gap-1.5">
                    {erLyd && (
                      <button
                        type="button"
                        disabled={analysererFilId === fil.id}
                        onClick={() => void kjorLydfilAnalyse(fil)}
                        className="inline-flex min-h-[44px] items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white shadow hover:bg-indigo-500 disabled:opacity-50"
                      >
                        {analysererFilId === fil.id ? '⏳ Analyserer...' : '🎙️ Analyser lydfil'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        onAnalyserFilIChat(
                          fil.id,
                          erLyd
                            ? `Analyser denne lydfilen («${fil.navn}») og trekk ut koter, vanntrykk, spesifikasjoner og byggherrens ønsker.`
                            : fil.kategori === 'plantegning' || fil.kategori === 'va_kart'
                            ? `Analyser tegningen «${fil.navn}» for sanitær, rørstrekk og koter.`
                            : fil.kategori === 'typeskilt_bilde'
                            ? `Les av dette bildet/typeskiltet («${fil.navn}») og forklar tekniske data og kapasitet.`
                            : `Analyser dokumentet «${fil.navn}» og oppsummer viktige VVS-tall og eventuelle mangler.`
                        )
                      }
                      className="inline-flex min-h-[44px] items-center rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-500"
                    >
                      💬 Analyser i AI-chat
                    </button>
                    {fil.uttrukketTekst && (
                      <button
                        type="button"
                        onClick={() => {
                          const ut = analyserTekstLokalt(fil.uttrukketTekst, fil.navn);
                          onBrukUttrekk(ut, 'oppdater');
                        }}
                        className="inline-flex min-h-[44px] items-center rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700"
                      >
                        ✨ Bruk tall
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => beOmSlettFil(fil)}
                    title="Slett fil (krever bekreftelse)"
                    className="inline-flex min-h-[44px] items-center rounded-lg border border-rose-900/60 bg-rose-950/30 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-900/60"
                  >
                    🗑️ Slett
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Forhåndsvisnings-modal for valgt bilde, tegning, PDF eller dokument */}
      {valgtFil && (
        <Modal
          tittel={`${FIL_KATEGORI_ETIKETTER[valgtFil.kategori]?.ikon ?? '📎'} ${valgtFil.navn}`}
          onLukk={() => setValgtFil(null)}
          bredde="max-w-5xl"
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="text-xs text-slate-400">
                Kategori: <strong className="text-slate-200">{FIL_KATEGORI_ETIKETTER[valgtFil.kategori]?.navn}</strong> ·{' '}
                Størrelse: {(valgtFil.storrelse / 1024).toFixed(1)} kB · Lastet opp:{' '}
                {new Date(valgtFil.opprettetDato).toLocaleString('no-NO')}
              </div>
              <div className="flex flex-wrap gap-2">
                <Knapp
                  variant="primar"
                  onClick={() => {
                    const id = valgtFil.id;
                    const navn = valgtFil.navn;
                    setValgtFil(null);
                    onAnalyserFilIChat(id, `Analyser «${navn}» grundig for dette prosjektet.`);
                  }}
                >
                  💬 Åpne i AI-chat med dette vedlegget
                </Knapp>
                <a
                  href={valgtFil.dataUrl}
                  download={valgtFil.navn}
                  className="inline-flex min-h-[44px] items-center rounded-lg border border-slate-600 bg-slate-800 px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700"
                >
                  📥 Last ned originalfil
                </a>
                <Knapp
                  variant="fare"
                  onClick={() => beOmSlettFil(valgtFil)}
                >
                  🗑️ Slett fil
                </Knapp>
              </div>
            </div>

            {valgtFil.mimeType.startsWith('image/') && (
              <div className="max-h-[65vh] overflow-auto rounded-xl border border-slate-800 bg-slate-950 p-2 text-center">
                <img
                  src={valgtFil.dataUrl}
                  alt={valgtFil.navn}
                  className="mx-auto max-h-[60vh] object-contain"
                />
              </div>
            )}

            {(valgtFil.kategori === 'lydopptak' ||
              valgtFil.mimeType.startsWith('audio/') ||
              valgtFil.mimeType.startsWith('video/') ||
              /\.(mp3|m4a|wav|mp4|webm|ogg)$/i.test(valgtFil.navn)) && (
              <div className="rounded-xl border border-indigo-700/80 bg-slate-950 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🎙️</span>
                    <div>
                      <div className="text-xs font-bold text-indigo-300">
                        Lydavspiller & Transkripsjon
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Spill av opptaket eller kjør automatisk AI-analyse med framdriftsindikator
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={analysererFilId === valgtFil.id}
                    onClick={() => void kjorLydfilAnalyse(valgtFil)}
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-indigo-500 disabled:opacity-50"
                  >
                    {analysererFilId === valgtFil.id
                      ? '⏳ Analyserer lydfil...'
                      : '🎙️ Analyser og oppdater prosjekt'}
                  </button>
                </div>
                <div className="mt-3">
                  {valgtFil.mimeType.startsWith('video/') || valgtFil.navn.toLowerCase().endsWith('.mp4') ? (
                    <video
                      controls
                      src={valgtFil.dataUrl}
                      className="max-h-60 w-full rounded-lg bg-black"
                    />
                  ) : (
                    <audio
                      controls
                      src={valgtFil.dataUrl}
                      className="w-full"
                    />
                  )}
                </div>
              </div>
            )}

            {(valgtFil.mimeType === 'application/pdf' ||
              valgtFil.navn.toLowerCase().endsWith('.pdf')) && (
              <div className="h-[60vh] w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
                <iframe
                  title={valgtFil.navn}
                  src={valgtFil.dataUrl}
                  className="h-full w-full"
                />
              </div>
            )}

            {valgtFil.aiOppsummering && (
              <div className="rounded-lg border border-emerald-800/70 bg-emerald-950/30 p-3 text-xs text-emerald-200">
                <div className="font-bold text-emerald-300">🤖 Analyse / Oppsummering:</div>
                <p className="mt-1 whitespace-pre-wrap">{valgtFil.aiOppsummering}</p>
              </div>
            )}

            {valgtFil.uttrukketTekst && (
              <div>
                <div className="mb-1 text-xs font-bold text-slate-300">
                  Uttrukket tekst / tabellinnhold ({valgtFil.uttrukketTekst.length} tegn):
                </div>
                <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg border border-slate-800 bg-slate-950 p-3 font-mono text-[11px] text-slate-300">
                  {valgtFil.uttrukketTekst}
                </pre>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
