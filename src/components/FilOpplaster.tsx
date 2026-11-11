import { useRef, useState } from 'react';
import {
  FIL_KATEGORI_ETIKETTER,
  analyserTekstLokalt,
  flettUttrekkResultater,
  harUttrekkData,
  lagKortFunnTekst,
  lesOgAnalyserFilLokalt,
  type ProsjektFil,
  type UttrekkResultat,
} from '../lib/filer';
import { analyserFilerMedGeminiVision } from '../lib/gemini';
import type { Innstillinger } from '../lib/lagring';
import { Knapp } from './common/ui';

interface Props {
  prosjektId: string;
  prosjektNavn: string;
  eksisterendeFiler: readonly ProsjektFil[];
  innstillinger: Innstillinger;
  onFilerLastetOpp: (nyeFiler: ProsjektFil[]) => void;
  onOppdaterFil?: (oppdatert: ProsjektFil) => void;
  onBrukUttrekk?: (uttrekk: UttrekkResultat, modus: 'oppdater' | 'nytt') => void;
  onApneInnstillinger?: () => void;
  melding: (tekst: string) => void;
  kompakt?: boolean;
}

export default function FilOpplaster({
  prosjektId,
  prosjektNavn,
  eksisterendeFiler,
  innstillinger,
  onFilerLastetOpp,
  onOppdaterFil,
  onBrukUttrekk,
  onApneInnstillinger,
  melding,
  kompakt = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const kameraInputRef = useRef<HTMLInputElement>(null);
  const [drarOver, setDrarOver] = useState(false);
  const [lasterOpp, setLasterOpp] = useState(false);
  const [kjorerVision, setKjorerVision] = useState(false);
  const [sisteUttrekk, setSisteUttrekk] = useState<UttrekkResultat | null>(null);
  const [gronnBoksTekst, setGronnBoksTekst] = useState<string | null>(null);
  const [feilMelding, setFeilMelding] = useState<string | null>(null);

  const harGeminiNokkel = innstillinger.geminiNokkel.trim() !== '';

  const behandleFilListe = async (fileList: FileList | File[]) => {
    const arr = Array.from(fileList);
    if (arr.length === 0) return;
    setLasterOpp(true);
    setFeilMelding(null);
    try {
      const nye: ProsjektFil[] = [];
      const samledeTekster: string[] = [];
      for (const f of arr) {
        const pf = await lesOgAnalyserFilLokalt(f, prosjektId);
        nye.push(pf);
        if (pf.uttrukketTekst) samledeTekster.push(pf.uttrukketTekst);
      }
      onFilerLastetOpp(nye);

      // 1. Umiddelbar lokal tekst-/NLP-analyse fra de opplastede filene (Markdown, TXT, PDF, Word, Excel)
      let aktivtUttrekk = analyserTekstLokalt(
        samledeTekster.join('\n\n'),
        arr[0]?.name ?? ''
      );
      setSisteUttrekk(aktivtUttrekk);

      // Fyll ut skjemafeltene i prosjektet UMIDDELBART hvis lokal parser fant data
      if (harUttrekkData(aktivtUttrekk) && onBrukUttrekk) {
        onBrukUttrekk(aktivtUttrekk, 'oppdater');
        const kortTekst = lagKortFunnTekst(aktivtUttrekk);
        setGronnBoksTekst(kortTekst);
        melding(`✅ ${kortTekst}`);
      } else {
        setGronnBoksTekst(null);
        melding(
          `📂 Lastet opp ${nye.length} fil${nye.length === 1 ? '' : 'er'} i «${prosjektNavn}»!`
        );
      }

      // 2. Hvis brukeren har Gemini API-nøkkel: kjør også automatisk AI Vision-analyse (spesielt nyttig for bilder, VA-kart og skannede PDF-er)
      if (harGeminiNokkel) {
        setKjorerVision(true);
        try {
          const aiUttrekk = await analyserFilerMedGeminiVision({
            nokkel: innstillinger.geminiNokkel,
            modell: innstillinger.modell,
            filer: nye.slice(0, 8),
          });
          aktivtUttrekk = flettUttrekkResultater(aktivtUttrekk, aiUttrekk);
          setSisteUttrekk(aktivtUttrekk);

          if (onOppdaterFil && (aiUttrekk.oppsummering || (aiUttrekk.tekniskeFunn && aiUttrekk.tekniskeFunn.length > 0))) {
            for (const f of nye) {
              onOppdaterFil({
                ...f,
                aiOppsummering: aiUttrekk.oppsummering ?? f.aiOppsummering,
                tekniskeFunn:
                  aiUttrekk.tekniskeFunn && aiUttrekk.tekniskeFunn.length > 0
                    ? aiUttrekk.tekniskeFunn
                    : f.tekniskeFunn,
              });
            }
          }

          if (harUttrekkData(aktivtUttrekk) && onBrukUttrekk) {
            onBrukUttrekk(aktivtUttrekk, 'oppdater');
            const kortTekst = lagKortFunnTekst(aktivtUttrekk);
            setGronnBoksTekst(kortTekst);
            melding(`✅ ${kortTekst}`);
          }
        } catch {
          // Stille fallback til det lokale uttrekket hvis API-kallet feiler
        } finally {
          setKjorerVision(false);
        }
      }
    } catch (e) {
      setFeilMelding(e instanceof Error ? e.message : 'Kunne ikke lese filene.');
    } finally {
      setLasterOpp(false);
    }
  };

  const kjorGeminiVision = async () => {
    const filerTilAnalyse = eksisterendeFiler.slice(0, 8);
    if (filerTilAnalyse.length === 0) {
      melding('Last opp minst én tegning, bilde eller dokument først.');
      return;
    }
    if (!harGeminiNokkel) {
      if (onApneInnstillinger) onApneInnstillinger();
      else melding('Legg inn Gemini API-nøkkel under ⚙️ Innstillinger for AI Vision-analyse.');
      return;
    }
    setKjorerVision(true);
    setFeilMelding(null);
    try {
      const uttrekk = await analyserFilerMedGeminiVision({
        nokkel: innstillinger.geminiNokkel,
        modell: innstillinger.modell,
        filer: filerTilAnalyse,
      });
      const kombinert = sisteUttrekk ? flettUttrekkResultater(sisteUttrekk, uttrekk) : uttrekk;
      setSisteUttrekk(kombinert);

      if (onOppdaterFil && (uttrekk.oppsummering || (uttrekk.tekniskeFunn && uttrekk.tekniskeFunn.length > 0))) {
        for (const f of filerTilAnalyse) {
          onOppdaterFil({
            ...f,
            aiOppsummering: uttrekk.oppsummering ?? f.aiOppsummering,
            tekniskeFunn:
              uttrekk.tekniskeFunn && uttrekk.tekniskeFunn.length > 0
                ? uttrekk.tekniskeFunn
                : f.tekniskeFunn,
          });
        }
      }

      if (harUttrekkData(kombinert) && onBrukUttrekk) {
        onBrukUttrekk(kombinert, 'oppdater');
        const kortTekst = lagKortFunnTekst(kombinert);
        setGronnBoksTekst(kortTekst);
        melding(`✅ ${kortTekst}`);
      } else {
        melding('🤖 Gemini Vision fullførte multimodal analyse av tegninger/bilder/dokumenter!');
      }
    } catch (e) {
      setFeilMelding(e instanceof Error ? e.message : 'Gemini Vision-feil.');
    } finally {
      setKjorerVision(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Drag-and-drop & Lim inn (Ctrl+V) sone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDrarOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDrarOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDrarOver(false);
          if (e.dataTransfer?.files?.length) {
            void behandleFilListe(e.dataTransfer.files);
          }
        }}
        onPaste={(e) => {
          const items = e.clipboardData?.files;
          if (items && items.length > 0) {
            e.preventDefault();
            void behandleFilListe(items);
          }
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={`cursor-pointer rounded-xl border-2 border-dashed transition ${
          kompakt ? 'p-3' : 'p-5'
        } ${
          drarOver
            ? 'border-emerald-400 bg-emerald-950/50 text-emerald-200 shadow-lg'
            : 'border-slate-700 bg-slate-900/70 text-slate-300 hover:border-emerald-500/80 hover:bg-slate-900'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.xlsx,.xls,.csv,.tsv,.docx,.doc,.txt,.md,.markdown,.json,.png,.jpg,.jpeg,.webp,.gif,.mp3,.m4a,.wav,.mp4,.webm,.ogg,.aac,text/markdown,text/plain,image/*,application/pdf,audio/*,video/mp4,video/webm"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) {
              void behandleFilListe(e.target.files);
              e.target.value = '';
            }
          }}
        />
        <input
          ref={kameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) {
              void behandleFilListe(e.target.files);
              e.target.value = '';
            }
          }}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className={kompakt ? 'text-2xl' : 'text-3xl'}>📂</span>
            <div>
              <div className="text-xs font-extrabold text-emerald-300 sm:text-sm">
                {lasterOpp
                  ? 'Leser innhold og fyller ut skjema …'
                  : 'Dra og slipp dokumenter (MD, TXT, PDF, Excel), lydfiler (.mp4, .m4a, .mp3, .wav), VA-kart og bilder her'}
              </div>
              {!kompakt && (
                <div className="mt-0.5 text-[11px] text-slate-400">
                  Leser automatisk <strong>prosjektnavn, adresse, BRA (m²) og koter</strong> fra{' '}
                  <strong>Markdown, TXT, PDF, Word, Excel</strong>,{' '}
                  <strong>lydopptak (.mp4, .m4a, .mp3, .wav)</strong> og{' '}
                  <strong>VA-kart / Bilder (PNG, JPG, WEBP)</strong> og fyller ut skjemafeltene direkte.
                </div>
              )}
            </div>
          </div>

          <div
            className="flex flex-wrap items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="inline-flex min-h-[44px] items-center rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow hover:bg-emerald-500"
            >
              📎 Velg filer
            </button>
            <button
              type="button"
              onClick={() => kameraInputRef.current?.click()}
              title="Ta bilde direkte med kamera på mobil eller nettbrett (f.eks. av typeskilt, teknisk rom eller tegning)"
              className="inline-flex min-h-[44px] items-center rounded-lg border border-emerald-600/80 bg-emerald-950/60 px-3.5 py-2 text-xs font-bold text-emerald-200 shadow hover:bg-emerald-900"
            >
              📸 Ta bilde
            </button>
            {eksisterendeFiler.length > 0 && (
              <button
                type="button"
                disabled={kjorerVision}
                onClick={() => void kjorGeminiVision()}
                className="inline-flex min-h-[44px] items-center rounded-lg border border-sky-600 bg-sky-950/70 px-3.5 py-2 text-xs font-bold text-sky-200 hover:bg-sky-900 disabled:opacity-50"
              >
                {kjorerVision
                  ? '🤖 Analyserer med Vision AI …'
                  : `🤖 AI Vision-analyse (${eksisterendeFiler.length})`}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grønn bekreftelsesboks når verdier er gjenkjent og fylt ut i skjemaet */}
      {gronnBoksTekst && (
        <div
          role="status"
          className="rounded-xl border-2 border-emerald-500 bg-emerald-950/70 p-3.5 text-xs font-bold text-emerald-100 shadow-lg"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>✅ {gronnBoksTekst}</span>
            {onBrukUttrekk && sisteUttrekk && (
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => onBrukUttrekk(sisteUttrekk, 'nytt')}
                  className="rounded-lg border border-emerald-400/70 bg-emerald-800/70 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700"
                >
                  ➕ Lagre som eget nytt prosjekt
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hurtigliste over nylig opplastede filer hvis kompakt */}
      {kompakt && eksisterendeFiler.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {eksisterendeFiler.slice(0, 6).map((f) => (
            <span
              key={f.id}
              className="inline-flex items-center gap-1 rounded border border-slate-700 bg-slate-900 px-2 py-0.5 text-[11px] text-slate-300"
            >
              <span>{FIL_KATEGORI_ETIKETTER[f.kategori]?.ikon ?? '📎'}</span>
              <span className="max-w-[160px] truncate">{f.navn}</span>
            </span>
          ))}
        </div>
      )}

      {/* Feilmelding */}
      {feilMelding && (
        <div className="rounded-lg border border-rose-700 bg-rose-950/50 p-3 text-xs text-rose-200">
          ⚠️ {feilMelding}
        </div>
      )}

      {/* Detaljert visning av uttrukne prosjektdata */}
      {sisteUttrekk && (
        <div className="rounded-xl border border-emerald-800/80 bg-emerald-950/20 p-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-bold text-emerald-300">
              ✨ Gjenkjente verdier fra opplastet dokument (automatisk fylt ut i skjema):
            </div>
            {onBrukUttrekk && (
              <div className="flex flex-wrap gap-2">
                <Knapp
                  variant="primar"
                  onClick={() => {
                    onBrukUttrekk(sisteUttrekk, 'oppdater');
                    setGronnBoksTekst(lagKortFunnTekst(sisteUttrekk));
                  }}
                >
                  ✨ Fyll inn på nytt i «{prosjektNavn}»
                </Knapp>
                <Knapp
                  variant="sekundar"
                  onClick={() => onBrukUttrekk(sisteUttrekk, 'nytt')}
                >
                  ➕ Opprett nytt prosjekt fra filene
                </Knapp>
              </div>
            )}
          </div>

          {sisteUttrekk.tekniskeFunn && sisteUttrekk.tekniskeFunn.length > 0 ? (
            <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {sisteUttrekk.tekniskeFunn.map((funn, idx) => (
                <li
                  key={idx}
                  className="rounded border border-emerald-800/60 bg-slate-950/80 px-2.5 py-1.5 font-medium text-emerald-200"
                >
                  ✅ {funn}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-slate-300">
              {sisteUttrekk.oppsummering ?? 'Filen er lastet opp.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
