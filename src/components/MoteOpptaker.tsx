import { useEffect, useRef, useState } from 'react';
import type { ProsjektData } from '../data/prosjekter';
import {
  analyserTekstLokalt,
  flettUttrekkResultater,
  lagKortFunnTekst,
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
  EKSEMPEL_BEFARINGS_TRANSKRIPSJON,
  STANDARD_MOTE_STEG,
  analyserMoteTranskripsjonLokalt,
  formaterOpptaksTid,
  type MoteAnalyseResultat,
  type MoteAnalyseSteg,
} from '../lib/moteopptak';
import { useBekreftSlett } from './common/BekreftSlettModal';

interface Props {
  prosjekt: ProsjektData;
  innstillinger: Innstillinger;
  onOppdaterProsjekt: (oppdatert: ProsjektData, endringer?: string[]) => void;
  onFilerLastetOpp: (nyeFiler: ProsjektFil[]) => void;
  onVelgAgent?: (agentId: string) => void;
  onApneGalleri?: () => void;
  melding: (tekst: string) => void;
  kompakt?: boolean;
}

// Type-definisjon for nettleserens Web Speech API (SpeechRecognition / webkitSpeechRecognition)
interface NettleserSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: unknown) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
}

function hentSpeechRecognitionKonstruktor(): (new () => NettleserSpeechRecognition) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition || w.webkitSpeechRecognition || null) as
    | (new () => NettleserSpeechRecognition)
    | null;
}

export default function MoteOpptaker({
  prosjekt,
  innstillinger,
  onOppdaterProsjekt,
  onFilerLastetOpp,
  onVelgAgent,
  onApneGalleri,
  melding,
  kompakt = false,
}: Props) {
  const bekreftSlett = useBekreftSlett();

  const [erOpptakAktiv, setErOpptakAktiv] = useState(false);
  const [erPauset, setErPauset] = useState(false);
  const [varighetSek, setVarighetSek] = useState(0);
  const [lydNivaaProsent, setLydNivaaProsent] = useState(0);
  const [transkripsjon, setTranskripsjon] = useState('');
  const [mellombelsTekst, setMellombelsTekst] = useState('');
  const [opptaksModusMelding, setOpptaksModusMelding] = useState<string | null>(null);

  // Framdriftsindikator (Progress bar) under analyse og synkronisering
  const [analyserer, setAnalyserer] = useState(false);
  const [framdriftProsent, setFramdriftProsent] = useState(0);
  const [aktivtStegTekst, setAktivtStegTekst] = useState('');
  const [stegListe, setStegListe] = useState<MoteAnalyseSteg[]>(STANDARD_MOTE_STEG);
  const [sisteResultat, setSisteResultat] = useState<MoteAnalyseResultat | null>(null);
  const [kartverketDetalj, setKartverketDetalj] = useState<string | null>(null);

  // Referanser for kontinuerlig opptak uten tidsbegrensning
  const aktivRef = useRef(false);
  const pausetRef = useRef(false);
  const recognitionRef = useRef<NettleserSpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lydFilInputRef = useRef<HTMLInputElement | null>(null);

  // Live forhåndsvisning av gjenkjente VVS-data mens man snakker / skriver
  const liveUttrekk: UttrekkResultat = analyserTekstLokalt(
    `${transkripsjon} ${mellombelsTekst}`.trim(),
    'live-mote.txt'
  );
  const liveKortFunn = lagKortFunnTekst(liveUttrekk);

  // Tidtaker som teller kontinuerlig uten tidsbegrensning
  useEffect(() => {
    if (!erOpptakAktiv || erPauset) return;
    const timer = window.setInterval(() => {
      setVarighetSek((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [erOpptakAktiv, erPauset]);

  // Rydd opp ressurser ved unmount
  useEffect(() => {
    return () => {
      stoppAlleStrømmer();
    };
  }, []);

  const stoppAlleStrømmer = () => {
    aktivRef.current = false;
    pausetRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch {
        // Ignorer
      }
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Ignorer
      }
    }
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((t) => t.stop());
      audioStreamRef.current = null;
    }
    setLydNivaaProsent(0);
  };

  const startKontinuerligOpptak = async () => {
    setSisteResultat(null);
    setKartverketDetalj(null);
    aktivRef.current = true;
    pausetRef.current = false;
    setErOpptakAktiv(true);
    setErPauset(false);

    // 1. Start Web Speech API med automatisk restart ved onend (slik at den aldri stopper etter 60 sek)
    const SpeechKonstr = hentSpeechRecognitionKonstruktor();
    if (SpeechKonstr) {
      try {
        const rec = new SpeechKonstr();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'nb-NO';

        rec.onresult = (ev: unknown) => {
          const e = ev as {
            resultIndex: number;
            results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
          };
          let nyFinal = '';
          let nyInterim = '';
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const res = e.results[i];
            if (res.isFinal) {
              nyFinal += res[0].transcript.trim() + ' ';
            } else {
              nyInterim += res[0].transcript;
            }
          }
          if (nyFinal) {
            setTranskripsjon((forrige) =>
              forrige ? `${forrige.trim()}\n${nyFinal.trim()}` : nyFinal.trim()
            );
          }
          setMellombelsTekst(nyInterim);
        };

        rec.onerror = () => {
          // Fortsett lytte-loop selv ved mindre nettverks-/talepauser
        };

        rec.onend = () => {
          // Automatisk omstart for uavbrutt langtidsopptak uten tidsbegrensning!
          if (aktivRef.current && !pausetRef.current) {
            try {
              rec.start();
            } catch {
              // Ignorer dersom allerede startet
            }
          }
        };

        rec.start();
        recognitionRef.current = rec;
      } catch {
        // Fallback til kun MediaRecorder + manuell/AI-transkripsjon
      }
    }

    // 2. Start mikrofon-strøm og MediaRecorder + lydnivåmåler
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStreamRef.current = stream;
        audioChunksRef.current = [];

        if (typeof MediaRecorder !== 'undefined') {
          const recorder = new MediaRecorder(stream);
          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              audioChunksRef.current.push(e.data);
            }
          };
          recorder.start(5000); // Lagrer lyd-chunks hvert 5. sekund for ubegrenset lengde
          mediaRecorderRef.current = recorder;
        }

        // Lydnivåmåler
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const kilde = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          kilde.connect(analyser);
          audioContextRef.current = ctx;

          const dataArr = new Uint8Array(analyser.frequencyBinCount);
          const oppdaterNivaa = () => {
            if (!aktivRef.current || pausetRef.current) {
              setLydNivaaProsent(0);
              return;
            }
            analyser.getByteFrequencyData(dataArr);
            const snitt = dataArr.reduce((sum, v) => sum + v, 0) / dataArr.length;
            setLydNivaaProsent(Math.min(100, Math.round((snitt / 128) * 100)));
            animFrameRef.current = requestAnimationFrame(oppdaterNivaa);
          };
          animFrameRef.current = requestAnimationFrame(oppdaterNivaa);
        }

        setOpptaksModusMelding(
          '🎙️ Kontinuerlig opptak aktivt (uten tidsbegrensning) – lytter og transkriberer fortløpende...'
        );
      } catch {
        setOpptaksModusMelding(
          '🎙️ Kontinuerlig opptaksmodus aktivt. (Mikrofontilgang ble ikke gitt av nettleseren – du kan skrive/lime inn mønstertekst direkte eller teste med demo-knappen.)'
        );
      }
    } else {
      setOpptaksModusMelding(
        '🎙️ Kontinuerlig opptaksmodus aktivt – skriv eller bruk demo-befaring under.'
      );
    }
  };

  const vekslePause = () => {
    if (!erOpptakAktiv) return;
    if (erPauset) {
      pausetRef.current = false;
      setErPauset(false);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch {
          // Ignorer
        }
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
        mediaRecorderRef.current.resume();
      }
      setOpptaksModusMelding('🎙️ Opptak gjenopptatt – lytter uavbrutt...');
    } else {
      pausetRef.current = true;
      setErPauset(true);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignorer
        }
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.pause();
      }
      setOpptaksModusMelding('⏸️ Opptak satt på pause (klikk «Fortsett» for å lytte videre).');
    }
  };

  const stoppOpptak = () => {
    stoppAlleStrømmer();
    setErOpptakAktiv(false);
    setErPauset(false);
    setMellombelsTekst('');
    setOpptaksModusMelding('⏹️ Opptak stoppet. Klikk «Analyser & oppdater prosjekt» for å kjøre full uttrekks- og agent-synkronisering.');
  };

  const slettTranskripsjonMedBekreftelse = () => {
    bekreftSlett({
      tittel: 'Tøm møteopptak og transkripsjon?',
      beskrivelse:
        'Er du sikker på at du vil slette den nåværende møtetranskripsjonen? (Allerede lagrede møtereferater i Prosjektgalleriet påvirkes ikke.)',
      elementNavn: `Møteopptak (${formaterOpptaksTid(varighetSek)})`,
      bekreftTekst: 'Ja, tøm opptak',
      onBekreft: () => {
        stoppAlleStrømmer();
        setErOpptakAktiv(false);
        setErPauset(false);
        setVarighetSek(0);
        setTranskripsjon('');
        setMellombelsTekst('');
        setSisteResultat(null);
        setKartverketDetalj(null);
        setFramdriftProsent(0);
        setOpptaksModusMelding(null);
        melding('🗑️ Møtetranskripsjon tømt');
      },
    });
  };

  /**
   * Kjører 5-stegs analyse med tydelig, levende framdriftsindikator (progress bar 0% -> 100%).
   */
  const kjorAnalyseMedFramdrift = async (tekstSomSkalAnalyseres?: string) => {
    if (erOpptakAktiv) {
      stoppOpptak();
    }
    const tekst = (tekstSomSkalAnalyseres ?? `${transkripsjon} ${mellombelsTekst}`).trim();
    if (!tekst) {
      melding('⚠️ Ingen transkripsjon å analysere ennå. Start opptak eller klikk «Fyll inn demo-befaring» først.');
      return;
    }

    setAnalyserer(true);
    setSisteResultat(null);
    setKartverketDetalj(null);

    const oppdaterSteg = (aktivtNr: 1 | 2 | 3 | 4 | 5, prosent: number, tekstMelding: string) => {
      setFramdriftProsent(prosent);
      setAktivtStegTekst(tekstMelding);
      setStegListe((forrige) =>
        forrige.map((s) => ({
          ...s,
          status:
            s.stegNr < aktivtNr ? 'ferdig' : s.stegNr === aktivtNr ? 'aktiv' : 'venter',
        }))
      );
    };

    try {
      // STEG 1 (20 %): Klargjør lydopptak og transkripsjon
      oppdaterSteg(
        1,
        20,
        'Steg 1/5 (20 %): Klargjør lydopptak og sammenstiller kontinuerlig transkripsjon...'
      );
      await new Promise((r) => setTimeout(r, 220));

      // STEG 2 (45 %): AI-analyse + VVS-faglig tekstanalyse
      oppdaterSteg(
        2,
        45,
        'Steg 2/5 (45 %): Analyserer transkripsjon og trekker ut koter, vanntrykk, BRA og adresse...'
      );
      let aiUttrekk: UttrekkResultat | undefined;
      if (innstillinger.geminiNokkel.trim()) {
        try {
          const tempFil: ProsjektFil = {
            id: 'temp-mote',
            prosjektId: prosjekt.id,
            navn: 'moteopptak.txt',
            mimeType: 'text/plain',
            storrelse: tekst.length,
            kategori: 'annet',
            opprettetDato: new Date().toISOString(),
            base64Data: '',
            dataUrl: '',
            uttrukketTekst: tekst,
            aiOppsummering: '',
          };
          const aiUtt = await analyserFilerMedGeminiVision({
            nokkel: innstillinger.geminiNokkel,
            modell: innstillinger.modell,
            filer: [tempFil],
          });
          aiUttrekk = aiUtt;
        } catch {
          // Fortsetter sømløst med lokal VVS NLP-parser dersom API-kall feiler
        }
      }
      await new Promise((r) => setTimeout(r, 240));

      const forelopig = analyserMoteTranskripsjonLokalt(
        prosjekt,
        tekst,
        varighetSek || 120,
        aiUttrekk
      );

      // STEG 3 (70 %): Automatisk oppslag mot Kartverket hvis adresse finnes
      oppdaterSteg(
        3,
        70,
        'Steg 3/5 (70 %): Slår opp gjenkjent adresse mot Kartverket (Gnr/Bnr, kommune og NN2000)...'
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
            const v = kvTreff.valgt;
            setKartverketDetalj(
              `🗺️ Kartverket bekreftet: ${v.adressetekst} (Gnr ${v.gardsnummer} / Bnr ${v.bruksnummer}, ${v.kommunenavn})${
                kvTreff.terrengkoteNn2000 !== null ? `, terrengkote C +${kvTreff.terrengkoteNn2000.toFixed(2)} m` : ''
              }`
            );
          }
        } catch {
          // Offline / ingen nettverk i sandbox – fortsetter med lokalt uttrekk
        }
      }
      await new Promise((r) => setTimeout(r, 220));

      // STEG 4 (90 %): Oppdaterer global prosjekt-state, de 9 fagmodulene og de 19 agentene
      oppdaterSteg(
        4,
        90,
        'Steg 4/5 (90 %): Oppdaterer Global Prosjekt-State, de 9 fagmodulene og de 19 agentene...'
      );
      const endeligRes = analyserMoteTranskripsjonLokalt(
        prosjekt,
        tekst,
        varighetSek || 120,
        sluttUttrekk
      );
      // Sikre at eventuelle Kartverket-koordinater på sluttProsjekt blir med
      const sluttMedKv: ProsjektData = {
        ...endeligRes.oppdatertProsjekt,
        matrikkel: sluttProsjekt.matrikkel || endeligRes.oppdatertProsjekt.matrikkel,
        vaMyndighet: sluttProsjekt.vaMyndighet || endeligRes.oppdatertProsjekt.vaMyndighet,
      };
      onOppdaterProsjekt(sluttMedKv, endeligRes.endringer);
      await new Promise((r) => setTimeout(r, 200));

      // STEG 5 (100 %): Lagrer møtereferat (.md) og evt. lydopptak i Prosjektgalleriet (IndexedDB)
      oppdaterSteg(
        5,
        100,
        'Steg 5/5 (100 %): Lagrer møtereferat (.md) i Prosjektgalleriet (IndexedDB) – Fullført!'
      );
      const nyeFiler: ProsjektFil[] = [endeligRes.referatFil];
      onFilerLastetOpp(nyeFiler);

      setStegListe((forrige) => forrige.map((s) => ({ ...s, status: 'ferdig' })));
      setSisteResultat({
        ...endeligRes,
        oppdatertProsjekt: sluttMedKv,
      });
      melding(
        `✅ Møteopptak analysert! ${
          endeligRes.kortFunnTekst || 'Møtereferat lagret i Prosjektgalleriet og synkronisert med alle 19 agenter.'
        }`
      );
    } finally {
      setAnalyserer(false);
    }
  };

  const handterLydfilOpplasting = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fil = e.target.files?.[0];
    if (!fil) return;
    e.target.value = '';

    // Hvis det er en tekst/markdown-fil eller lydfil
    if (fil.type.startsWith('text/') || /\.(md|txt|csv)$/i.test(fil.name)) {
      const tekst = await fil.text();
      setTranskripsjon(tekst);
      await kjorAnalyseMedFramdrift(tekst);
      return;
    }

    // Lydfil (.mp3, .wav, .m4a, .webm, .ogg): les som DataURL og kjør gjennom framdriftsindikatoren
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      let ekstraTekst = transkripsjon;
      if (innstillinger.geminiNokkel.trim() && dataUrl) {
        try {
          setAnalyserer(true);
          setFramdriftProsent(25);
          setAktivtStegTekst(`Transkriberer lydfil «${fil.name}» med Gemini Multimodal AI...`);
          const base64Data = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
          const lydFilObj: ProsjektFil = {
            id: `lyd-${Date.now()}`,
            prosjektId: prosjekt.id,
            navn: fil.name,
            mimeType: fil.type || 'audio/webm',
            storrelse: fil.size,
            kategori: 'annet',
            opprettetDato: new Date().toISOString(),
            base64Data,
            dataUrl,
            uttrukketTekst: '',
            aiOppsummering: '',
          };
          const aiRes = await analyserFilerMedGeminiVision({
            nokkel: innstillinger.geminiNokkel,
            modell: innstillinger.modell,
            filer: [lydFilObj],
          });
          ekstraTekst = `${transkripsjon}\n${aiRes.oppsummering || ''}`.trim();
          setTranskripsjon(ekstraTekst);
        } catch {
          // Fallback hvis API feiler
        } finally {
          setAnalyserer(false);
        }
      }
      if (!ekstraTekst.trim()) {
        ekstraTekst = `Opplastet lydopptak: ${fil.name} (${Math.round(fil.size / 1024)} KB).\n${transkripsjon}`.trim();
        setTranskripsjon(ekstraTekst);
      }
      await kjorAnalyseMedFramdrift(ekstraTekst);
    };
    reader.readAsDataURL(fil);
  };

  return (
    <div className="rounded-xl border border-indigo-700/80 bg-gradient-to-br from-indigo-950/50 via-slate-900 to-slate-950 p-4 shadow-xl">
      {/* Toppseksjon med status og kontroller */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/60 bg-indigo-950/90 px-2.5 py-0.5 text-[11px] font-bold text-indigo-200">
              {erOpptakAktiv && !erPauset ? (
                <span className="h-2 w-2 animate-ping rounded-full bg-rose-500" />
              ) : (
                <span>🎙️</span>
              )}
              KONTINUERLIG MØTE- & BEFARINGSOPPTAK
            </span>
            <span className="rounded border border-emerald-700/60 bg-emerald-950/60 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
              ∞ Uten tidsbegrensning
            </span>
            <span className="rounded border border-slate-700 bg-slate-900 px-2 py-0.5 font-mono text-xs font-bold text-slate-200">
              ⏱️ {formaterOpptaksTid(varighetSek)}
            </span>
          </div>
          {!kompakt && (
            <p className="mt-1 text-xs text-slate-300">
              Lytter uavbrutt gjennom hele særmøtet eller befaringen. Når opptaket analyseres, oppdateres{' '}
              <strong className="text-white">Global Prosjekt-State</strong>,{' '}
              <strong className="text-white">Prosjektgalleriet (IndexedDB)</strong> og alle{' '}
              <strong className="text-white">19 agenter & 9 fagmoduler</strong> automatisk.
            </p>
          )}
        </div>

        {/* Opptaksknapper */}
        <div className="flex flex-wrap items-center gap-2">
          {!erOpptakAktiv ? (
            <button
              type="button"
              onClick={startKontinuerligOpptak}
              className="inline-flex min-h-[42px] items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-bold text-white shadow-lg transition hover:bg-rose-500"
            >
              🔴 Start kontinuerlig opptak
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={vekslePause}
                className="inline-flex min-h-[42px] items-center gap-1 rounded-lg border border-amber-600 bg-amber-950/70 px-3 py-2 text-xs font-bold text-amber-200 hover:bg-amber-900/70"
              >
                {erPauset ? '▶️ Fortsett opptak' : '⏸️ Pause'}
              </button>
              <button
                type="button"
                onClick={() => kjorAnalyseMedFramdrift()}
                className="inline-flex min-h-[42px] items-center gap-1 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow hover:bg-emerald-500"
              >
                ⏹️ Stopp & Analyser opptak
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => {
              setTranskripsjon(EKSEMPEL_BEFARINGS_TRANSKRIPSJON);
              setVarighetSek(845); // 14 min 05 sek
              kjorAnalyseMedFramdrift(EKSEMPEL_BEFARINGS_TRANSKRIPSJON);
            }}
            disabled={analyserer}
            className="inline-flex min-h-[42px] items-center gap-1 rounded-lg border border-indigo-600/80 bg-indigo-950/70 px-3 py-2 text-xs font-bold text-indigo-200 transition hover:bg-indigo-900/70 disabled:opacity-50"
            title="Test hele opptaks-, framdrifts- og auto-utfyllingskjeden med et realistisk befaringsopptak"
          >
            🎯 Demo-befaring (Auto-fyll)
          </button>

          <button
            type="button"
            onClick={() => lydFilInputRef.current?.click()}
            disabled={analyserer}
            className="inline-flex min-h-[42px] items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700"
          >
            📁 Last opp lydfil / referat
          </button>
          <input
            ref={lydFilInputRef}
            type="file"
            accept="audio/*,.mp3,.wav,.m4a,.webm,.ogg,.txt,.md"
            onChange={handterLydfilOpplasting}
            className="hidden"
          />

          {transkripsjon.trim().length > 0 && (
            <button
              type="button"
              onClick={slettTranskripsjonMedBekreftelse}
              className="inline-flex min-h-[42px] items-center rounded-lg border border-rose-800/70 bg-rose-950/40 px-2.5 py-2 text-xs font-bold text-rose-300 hover:bg-rose-900/50"
              title="Tøm opptak (krever 2-stegs bekreftelse)"
            >
              🗑️ Tøm
            </button>
          )}
        </div>
      </div>

      {/* Live lydnivå-indikator når opptak pågår */}
      {erOpptakAktiv && (
        <div className="mt-3 rounded-lg border border-rose-800/60 bg-rose-950/30 p-2.5">
          <div className="flex items-center justify-between text-[11px] text-rose-200">
            <span className="font-semibold">{opptaksModusMelding}</span>
            <span className="font-mono">Lydnivå: {lydNivaaProsent}%</span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-900">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500 transition-all duration-150"
              style={{ width: `${Math.max(8, lydNivaaProsent)}%` }}
            />
          </div>
        </div>
      )}

      {/* Transkripsjons- og notatfelt */}
      <div className="mt-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
          <label htmlFor="mote-transkripsjon-felt" className="font-semibold text-slate-300">
            📝 Kontinuerlig transkripsjon / møtenotat (oppdateres live mens du snakker eller skriver):
          </label>
          <button
            type="button"
            onClick={() => kjorAnalyseMedFramdrift()}
            disabled={analyserer || (!transkripsjon.trim() && !mellombelsTekst.trim())}
            className="rounded border border-emerald-600 bg-emerald-700 px-3 py-1 text-[11px] font-bold text-white shadow hover:bg-emerald-600 disabled:opacity-40"
          >
            ⚡ Analyser & oppdater prosjekt, arkiv og agenter nå
          </button>
        </div>

        <textarea
          id="mote-transkripsjon-felt"
          rows={kompakt ? 3 : 4}
          value={mellombelsTekst ? `${transkripsjon}\n${mellombelsTekst}` : transkripsjon}
          onChange={(e) => setTranskripsjon(e.target.value)}
          placeholder="Start opptak for å transkribere møtet kontinuerlig, eller skriv/lim inn stikkord fra befaring (f.eks. «Adresse: Friheim 49, BRA 1200 m², ITK +14,20, laveste sluk +12,50, statisk vanntrykk 6,4 bar»)..."
          className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950/90 p-3 text-xs leading-relaxed text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
        />

        {/* Live deteksjon mens opptaket pågår */}
        {liveKortFunn && !sisteResultat && !analyserer && (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-700/70 bg-emerald-950/40 px-3 py-2 text-xs text-emerald-200">
            <span>
              🔎 <strong>Gjenkjent i sanntid:</strong> {liveKortFunn}
            </span>
            <button
              type="button"
              onClick={() => kjorAnalyseMedFramdrift()}
              className="rounded bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-500"
            >
              Bruk verdier nå →
            </button>
          </div>
        )}
      </div>

      {/* LIVE FRAMDRIFTSINDIKATOR (PROGRESS BAR) UNDER ANALYSE OG SYNKRONISERING */}
      {(analyserer || framdriftProsent > 0) && (
        <div
          className="mt-4 rounded-xl border border-indigo-600/80 bg-slate-950/95 p-4 shadow-inner"
          aria-live="polite"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-bold text-indigo-200">
              {analyserer
                ? `⏳ ${aktivtStegTekst}`
                : '✅ Møteopptak ferdig analysert og synkronisert (100 %)'}
            </div>
            <span className="rounded-full border border-indigo-500 bg-indigo-950 px-2.5 py-0.5 font-mono text-xs font-black text-indigo-200">
              {framdriftProsent}%
            </span>
          </div>

          {/* Selve Progress Bar */}
          <div
            role="progressbar"
            aria-label="Framdrift for analyse av møteopptak"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={framdriftProsent}
            className="mt-2 h-3 w-full overflow-hidden rounded-full border border-slate-800 bg-slate-900"
          >
            <div
              className={`h-full transition-all duration-300 ${
                framdriftProsent === 100
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                  : 'bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-400'
              }`}
              style={{ width: `${framdriftProsent}%` }}
            />
          </div>

          {/* 5-stegs statusindikator */}
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

      {/* Grønn resultatboks med utfylte felt, Kartverket-data og oppdaterte agenter */}
      {sisteResultat && (
        <div
          role="status"
          className="mt-3 space-y-2.5 rounded-xl border-2 border-emerald-500/80 bg-emerald-950/50 p-3.5 text-xs text-emerald-100 shadow-lg"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-bold text-emerald-300">
              ✅ {sisteResultat.kortFunnTekst || 'Møteopptak analysert og fylt ut i skjema!'}
            </div>
            {onApneGalleri && (
              <button
                type="button"
                onClick={onApneGalleri}
                className="rounded border border-emerald-600 bg-emerald-900/70 px-2.5 py-1 text-[11px] font-bold text-emerald-100 hover:bg-emerald-800"
              >
                📂 Se lagret møtereferat i Prosjektgalleriet →
              </button>
            )}
          </div>

          {kartverketDetalj && (
            <div className="rounded border border-sky-700/70 bg-sky-950/60 px-2.5 py-1.5 text-[11px] text-sky-200">
              {kartverketDetalj}
            </div>
          )}

          {/* Oversikt over hvilke av de 19 agentene som ble oppdatert */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
              🤖 Synkronisert med følgende agenter og moduler ({sisteResultat.berorteAgenter.length} stk):
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {sisteResultat.berorteAgenter.map((ag) => (
                <button
                  key={ag.agentId}
                  type="button"
                  onClick={() => onVelgAgent?.(ag.agentId)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-700/80 bg-slate-900/90 px-2.5 py-1 text-left text-[11px] text-slate-200 transition hover:border-emerald-400 hover:bg-slate-800"
                  title={ag.relevans}
                >
                  <span className="font-bold text-emerald-400">Agent {ag.agentNummer}:</span>
                  <span>{ag.agentNavn}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
