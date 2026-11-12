import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MODULER } from './modules';
import { AGENTER } from './agents/agentData';
import { PROSJEKT_PRESETS, tomtProsjekt, type ProsjektData } from './data/prosjekter';
import type { FaneId } from './components/modules/01_sanitaer';
import type { DashbordFane } from './components/ProsjektDashbord';
import type { AkademiFane } from './components/AkademiModul';
import LiveFremdriftsBar from './components/common/LiveFremdriftsBar';
import { beregnProsjektFremdrift } from './lib/fremdrift';
import { BekreftSlettProvider, useBekreftSlett } from './components/common/BekreftSlettModal';
import { analyserProsjekt } from './lib/analyse';
import {
  flettUttrekkInnIProsjekt,
  lagKortFunnTekst,
  type ProsjektFil,
  type UttrekkResultat,
} from './lib/filer';
import { lastNedTekst } from './lib/format';
import type { ChatMelding } from './lib/gemini';
import {
  flettKartverketInnIProsjekt,
  slaaOppAdresseOgKoteIKartverket,
} from './lib/kartverket';
import {
  hentFilerForProsjektIDB,
  hentTilstandIDB,
  lagProsjektBackupJson,
  lagreFilerIDB,
  lagreTilstandIDB,
  lesProsjektBackupJson,
  slettFilIDB,
  slettFilerForProsjektIDB,
} from './lib/idb';
import { QA_PUNKTER, beregnSignaturStatus } from './lib/qa';
import {
  gjenopprettPresetsITilstand,
  hentSynligeProsjekter,
  lagreInnstillinger,
  lagreTilstand,
  lastInnstillinger,
  lastTilstand,
  nyttProsjektId,
  slettProsjektFraTilstand,
  tomProsjektTilstand,
  type AppTilstand,
  type Innstillinger,
  type KalkulatorTilstand,
  type OverstyringInfo,
} from './lib/lagring';

const Sanitaer = lazy(() => import('./components/modules/01_sanitaer'));
const FagModulVisning = lazy(() => import('./components/modules/FagModulVisning'));
const AgentHub = lazy(() => import('./agents/AgentHub'));
const AgentView = lazy(() => import('./agents/AgentView'));
const SuperKommandoer = lazy(() => import('./agents/SuperKommandoer'));
const Agent16QAPort = lazy(() => import('./agents/Agent16QAPort'));
const ProsjektVeiviser = lazy(() => import('./components/ProsjektVeiviser'));
const ProsjektGalleri = lazy(() => import('./components/ProsjektGalleri'));
const ProsjektDialog = lazy(() => import('./components/ProsjektDialog'));
const InnstillingerDialog = lazy(() => import('./components/InnstillingerDialog'));
const HjelpDialog = lazy(() => import('./components/HjelpDialog'));
const MoteOpptaker = lazy(() => import('./components/MoteOpptaker'));
const AgentChat = lazy(() => import('./components/AgentChat'));
const ProsjektDashbord = lazy(() => import('./components/ProsjektDashbord'));
const AkademiModul = lazy(() => import('./components/AkademiModul'));

type HovedVisning =
  | { type: 'veiviser' }
  | { type: 'galleri' }
  | { type: 'prosjektoversikt'; startFane?: DashbordFane }
  | { type: 'akademi'; startFane?: AkademiFane }
  | { type: 'dashbord_moduler' }
  | { type: 'modul'; modulId: string; sanitaerFane?: FaneId }
  | { type: 'agent_hub' }
  | { type: 'agent_view'; agentId: string }
  | { type: 'super_kommandoer' }
  | { type: 'qa_port' };

type ProsjektModalModus =
  | { modus: 'nytt'; start: ProsjektData }
  | { modus: 'rediger'; start: ProsjektData }
  | null;

export default function App() {
  return (
    <BekreftSlettProvider>
      <AppInnhold />
    </BekreftSlettProvider>
  );
}

function AppInnhold() {
  const bekreftSlett = useBekreftSlett();
  const [tilstand, setTilstand] = useState<AppTilstand>(() =>
    typeof window !== 'undefined' && window.localStorage
      ? lastTilstand(window.localStorage)
      : { brukerProsjekter: [], aktivId: PROSJEKT_PRESETS[0].id, krav: 0.95, tilstand: {} }
  );

  const [innstillinger, setInnstillinger] = useState<Innstillinger>(() =>
    typeof window !== 'undefined' && window.localStorage
      ? lastInnstillinger(window.localStorage)
      : { geminiNokkel: '', modell: 'gemini-2.5-flash' }
  );

  const [visning, setVisningState] = useState<HovedVisning>({ type: 'agent_hub' });
  const [mobilMenyApen, setMobilMenyApen] = useState<boolean>(false);
  const [toast, setToast] = useState<string | null>(null);
  const [visAlleAgenterISidebar, setVisAlleAgenterISidebar] = useState<boolean>(true);

  const setVisning = useCallback((ny: HovedVisning) => {
    setVisningState(ny);
    setMobilMenyApen(false);
  }, []);

  // Opplastede filer (tegninger, bilder, PDF, Excel) for aktivt prosjekt fra IndexedDB
  const [prosjektFiler, setProsjektFiler] = useState<ProsjektFil[]>([]);

  // Dialoger og AI-chat skuff
  const [prosjektModal, setProsjektModal] = useState<ProsjektModalModus>(null);
  const [visInnstillinger, setVisInnstillinger] = useState<boolean>(false);
  const [visHjelp, setVisHjelp] = useState<boolean>(false);
  const [visMoteOpptaker, setVisMoteOpptaker] = useState<boolean>(false);
  const [chatAgentId, setChatAgentId] = useState<string | null>(null);
  const [sistBrukteAgentId, setSistBrukteAgentId] = useState<string>('hovedchat');
  const [forhandsvalgtFilId, setForhandsvalgtFilId] = useState<string | null>(null);
  const [forhandsvalgtSporsmal, setForhandsvalgtSporsmal] = useState<string | null>(null);

  const importJsonInputRef = useRef<HTMLInputElement>(null);
  const harHydrertIdbRef = useRef<boolean>(false);
  const toastTimerRef = useRef<number | null>(null);
  const tilstandRef = useRef<AppTilstand>(tilstand);
  tilstandRef.current = tilstand;

  const melding = useCallback((tekst: string) => {
    setToast(tekst);
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 3500);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  // Last inn full tilstand fra IndexedDB ved oppstart (hvis nyere/rikere enn localStorage)
  useEffect(() => {
    let aktiv = true;
    void hentTilstandIDB()
      .then((idbTilstand) => {
        if (!aktiv) return;
        harHydrertIdbRef.current = true;
        if (!idbTilstand) {
          void lagreTilstandIDB(tilstandRef.current);
          return;
        }
        setTilstand((nå) => {
          if (
            idbTilstand.brukerProsjekter.length > nå.brukerProsjekter.length ||
            Object.keys(idbTilstand.tilstand).length > Object.keys(nå.tilstand).length
          ) {
            return idbTilstand;
          }
          void lagreTilstandIDB(nå);
          return nå;
        });
      })
      .catch(() => {
        harHydrertIdbRef.current = true;
      });
    return () => {
      aktiv = false;
    };
  }, []);

  // Lagre tilstand til både localStorage og IndexedDB ved endring (etter IDB-hydrering)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      lagreTilstand(window.localStorage, tilstand);
    }
    if (harHydrertIdbRef.current) {
      void lagreTilstandIDB(tilstand);
    }
  }, [tilstand]);

  const synligePresets = useMemo(() => {
    const skjulte = new Set(tilstand.skjultePresetIder ?? []);
    const brukerIds = new Set(tilstand.brukerProsjekter.map((p) => p.id));
    return PROSJEKT_PRESETS.filter((p) => !skjulte.has(p.id) && !brukerIds.has(p.id));
  }, [tilstand.skjultePresetIder, tilstand.brukerProsjekter]);

  const alleProsjekter = useMemo(
    () => hentSynligeProsjekter(tilstand),
    [tilstand]
  );

  const prosjekt: ProsjektData =
    alleProsjekter.find((p) => p.id === tilstand.aktivId) ||
    alleProsjekter[0] ||
    PROSJEKT_PRESETS[0];

  // Last inn prosjektets tegninger, bilder og dokumenter fra IndexedDB når aktivt prosjekt byttes
  useEffect(() => {
    let aktiv = true;
    void hentFilerForProsjektIDB(prosjekt.id).then((filer) => {
      if (aktiv) setProsjektFiler(filer);
    });
    return () => {
      aktiv = false;
    };
  }, [prosjekt.id]);

  const prosjektTilstand = tilstand.tilstand[prosjekt.id] ?? tomProsjektTilstand();

  const analyse = useMemo(
    () => analyserProsjekt(prosjekt, tilstand.krav),
    [prosjekt, tilstand.krav]
  );

  const qaFullfort = QA_PUNKTER.filter((p) => prosjektTilstand.qa[p.id]).length;
  const signaturStatus = beregnSignaturStatus(prosjektTilstand.qa);
  const aktivFremdrift = useMemo(
    () => beregnProsjektFremdrift(prosjekt, prosjektTilstand, tilstand.krav, analyse),
    [prosjekt, prosjektTilstand, tilstand.krav, analyse]
  );

  const oppdaterProsjektTilstand = useCallback(
    (
      oppdater: (
        forrige: ReturnType<typeof tomProsjektTilstand>
      ) => ReturnType<typeof tomProsjektTilstand>
    ) => {
      setTilstand((prev) => {
        const nå = prev.tilstand[prosjekt.id] ?? tomProsjektTilstand();
        return {
          ...prev,
          tilstand: {
            ...prev.tilstand,
            [prosjekt.id]: oppdater(nå),
          },
        };
      });
    },
    [prosjekt.id]
  );

  // Chathistorikk lagres per prosjekt
  const samtaler = prosjektTilstand.samtaler ?? {};
  const oppdaterSamtaler = useCallback(
    (fn: (forrige: Record<string, ChatMelding[]>) => Record<string, ChatMelding[]>) => {
      oppdaterProsjektTilstand((t) => ({
        ...t,
        samtaler: fn(t.samtaler ?? {}),
      }));
    },
    [oppdaterProsjektTilstand]
  );

  const oppdaterKalkulatorer = useCallback(
    (delvis: Partial<KalkulatorTilstand>) => {
      oppdaterProsjektTilstand((t) => ({
        ...t,
        kalkulatorer: { ...(t.kalkulatorer ?? {}), ...delvis },
      }));
    },
    [oppdaterProsjektTilstand]
  );

  const apneChatForAgent = (agentId: string) => {
    setSistBrukteAgentId(agentId);
    setChatAgentId(agentId);
  };

  const apneChatMedSporsmal = (agentId: string, sporsmal: string) => {
    setSistBrukteAgentId(agentId);
    setForhandsvalgtSporsmal(sporsmal);
    setChatAgentId(agentId);
  };

  const analyserFilIChat = (filId: string, sporsmal?: string) => {
    setForhandsvalgtFilId(filId);
    if (sporsmal) setForhandsvalgtSporsmal(sporsmal);
    setChatAgentId(sistBrukteAgentId);
  };

  const handterNyeFiler = (nyeFiler: ProsjektFil[]) => {
    setProsjektFiler((prev) => [...nyeFiler, ...prev]);
    void lagreFilerIDB(nyeFiler);
  };

  const handterOppdaterFil = (oppdatert: ProsjektFil) => {
    setProsjektFiler((prev) => prev.map((f) => (f.id === oppdatert.id ? oppdatert : f)));
    void lagreFilerIDB([oppdatert]);
  };

  const handterSlettFil = (filId: string) => {
    setProsjektFiler((prev) => prev.filter((f) => f.id !== filId));
    void slettFilIDB(filId);
    melding('🗑 Fil slettet fra prosjektarkivet');
  };

  const oppdaterAktivtProsjekt = useCallback(
    (oppdatert: ProsjektData, endringer?: string[]) => {
      const lagret: ProsjektData = { ...oppdatert, kilde: 'bruker' };
      setTilstand((prev) => {
        const finnes = prev.brukerProsjekter.some((p) => p.id === lagret.id);
        const brukerProsjekter = finnes
          ? prev.brukerProsjekter.map((p) => (p.id === lagret.id ? lagret : p))
          : [lagret, ...prev.brukerProsjekter];
        return {
          ...prev,
          brukerProsjekter,
          aktivId: lagret.id,
        };
      });
      if (endringer && endringer.length > 0) {
        melding(`✅ Oppdaterte «${lagret.navn}»: ${endringer[0]}`);
      }
    },
    [melding]
  );

  const oppdaterProsjektOgOverstyringer = useCallback(
    (
      oppdatert: ProsjektData,
      nyeOverstyringer: Record<string, OverstyringInfo>,
      endringer: string[]
    ) => {
      const lagret: ProsjektData = { ...oppdatert, kilde: 'bruker' };
      setTilstand((prev) => {
        const finnes = prev.brukerProsjekter.some((p) => p.id === lagret.id);
        const brukerProsjekter = finnes
          ? prev.brukerProsjekter.map((p) => (p.id === lagret.id ? lagret : p))
          : [lagret, ...prev.brukerProsjekter];
        const nåTilstand = prev.tilstand[lagret.id] ?? tomProsjektTilstand();
        return {
          ...prev,
          brukerProsjekter,
          aktivId: lagret.id,
          tilstand: {
            ...prev.tilstand,
            [lagret.id]: {
              ...nåTilstand,
              overstyringer: nyeOverstyringer,
            },
          },
        };
      });
      if (endringer.length > 0) {
        melding(`🟡 Midlertidig estimat oppdatert på «${lagret.navn}»`);
      }
    },
    [melding]
  );

  const godkjennOgLaasProsjekt = useCallback(
    (medForbehold: boolean) => {
      oppdaterProsjektTilstand((t) => {
        const erAlleredeLaast = Boolean(t.godkjent?.laast);
        if (erAlleredeLaast) {
          return {
            ...t,
            godkjent: {
              laast: false,
              tidspunkt: new Date().toISOString(),
              medForbehold: false,
            },
          };
        }
        return {
          ...t,
          steg: { ...t.steg, '5': true },
          godkjent: {
            laast: true,
            tidspunkt: new Date().toISOString(),
            medForbehold,
          },
        };
      });
    },
    [oppdaterProsjektTilstand]
  );

  const nullstillQa = useCallback(() => {
    oppdaterProsjektTilstand((t) => ({
      ...t,
      qa: {},
    }));
    melding('🔄 Sjekklisten er nullstilt. Alle punkter må verifiseres på nytt før signatur.');
  }, [oppdaterProsjektTilstand, melding]);

  const handterBrukUttrekk = (uttrekk: UttrekkResultat, modus: 'oppdater' | 'nytt') => {
    if (modus === 'nytt') {
      const nyId = nyttProsjektId();
      const nyttProsjekt = flettUttrekkInnIProsjekt(tomtProsjekt(nyId), uttrekk);
      setTilstand((prev) => ({
        ...prev,
        brukerProsjekter: [nyttProsjekt, ...prev.brukerProsjekter],
        aktivId: nyId,
      }));
      // Kopier også de opplastede filene til det nye prosjektet
      const kopierteFiler = prosjektFiler.map((f) => ({
        ...f,
        id: `${f.id}-${nyId.slice(-4)}`,
        prosjektId: nyId,
      }));
      void lagreFilerIDB(kopierteFiler);
      melding(`➕ Opprettet nytt prosjekt «${nyttProsjekt.navn}» fra filanalysen!`);
      if (uttrekk.sted && uttrekk.sted.trim().length >= 3) {
        void slaaOppAdresseOgKoteIKartverket(uttrekk.sted).then((kv) => {
          if (kv) {
            const { prosjekt: medKv, endringer } = flettKartverketInnIProsjekt(nyttProsjekt, kv);
            oppdaterAktivtProsjekt(medKv, endringer);
          }
        });
      }
    } else {
      let flettetProsjekt: ProsjektData = prosjekt;
      setTilstand((prev) => {
        const gjeldende =
          prev.brukerProsjekter.find((p) => p.id === prev.aktivId) ||
          PROSJEKT_PRESETS.find((p) => p.id === prev.aktivId) ||
          prosjekt;
        const oppdatert = flettUttrekkInnIProsjekt(gjeldende, uttrekk);
        flettetProsjekt = oppdatert;
        const lagret: ProsjektData = { ...oppdatert, kilde: 'bruker' };
        const finnes = prev.brukerProsjekter.some((p) => p.id === lagret.id);
        const brukerProsjekter = finnes
          ? prev.brukerProsjekter.map((p) => (p.id === lagret.id ? lagret : p))
          : [lagret, ...prev.brukerProsjekter];
        return {
          ...prev,
          brukerProsjekter,
          aktivId: lagret.id,
        };
      });
      const kortFunn = lagKortFunnTekst(uttrekk);
      melding(kortFunn ? `✅ ${kortFunn}` : `✨ Oppdaterte prosjektdata på «${flettetProsjekt.navn}»!`);
      if (uttrekk.sted && uttrekk.sted.trim().length >= 3) {
        void slaaOppAdresseOgKoteIKartverket(uttrekk.sted).then((kv) => {
          if (kv) {
            const { prosjekt: medKv, endringer } = flettKartverketInnIProsjekt(flettetProsjekt, kv);
            oppdaterAktivtProsjekt(medKv, endringer);
          }
        });
      }
    }
  };

  const apneNyttProsjekt = () => {
    setProsjektModal({ modus: 'nytt', start: tomtProsjekt(nyttProsjektId()) });
  };

  const apneRedigerEllerKopierProsjekt = () => {
    if (prosjekt.kilde === 'bruker') {
      setProsjektModal({ modus: 'rediger', start: prosjekt });
    } else {
      const kopi: ProsjektData = {
        ...prosjekt,
        id: nyttProsjektId(),
        navn: `${prosjekt.navn} (Kopi)`,
        kilde: 'bruker',
      };
      setProsjektModal({ modus: 'nytt', start: kopi });
    }
  };

  const slettAktivtProsjekt = () => {
    const slettetId = prosjekt.id;
    const slettetNavn = prosjekt.navn;
    const erPreset = prosjekt.kilde === 'dokument';
    bekreftSlett({
      tittel: 'Slette prosjekt permanent?',
      elementNavn: `📁 ${slettetNavn} (${prosjekt.bra ? `${prosjekt.bra} m²` : prosjekt.bygningstype})`,
      beskrivelse: erPreset
        ? `Er du sikker på at du vil fjerne standardprosjektet «${slettetNavn}» og slette alle tilhørende opplastede filer (${prosjektFiler.length} stk), kalkulatortall og chathistorikk fra IndexedDB? (Standard-casene Case 01–05 kan senere gjenopprettes under ⚙️ Innstillinger).`
        : `Er du sikker på at du vil slette prosjektet «${slettetNavn}» permanent, inkludert alle opplastede tegninger/dokumenter (${prosjektFiler.length} stk), kalkulatortall, sjekklister og chathistorikk fra IndexedDB?`,
      bekreftTekst: '🗑️ Bekreft sletting av prosjekt',
      onBekreft: () => {
        void slettFilerForProsjektIDB(slettetId);
        setProsjektModal(null);
        setTilstand((prev) => slettProsjektFraTilstand(prev, slettetId));
        melding(`🗑️ Slettet prosjektet «${slettetNavn}»`);
      },
    });
  };

  const gjenopprettStandardPresets = () => {
    setTilstand((prev) => gjenopprettPresetsITilstand(prev));
    melding('🔄 Gjenopprettet alle standard-prosjekter (Case 01–05)!');
  };

  const lagreProsjektFraModal = (nytt: ProsjektData) => {
    setTilstand((prev) => {
      const finnes = prev.brukerProsjekter.some((p) => p.id === nytt.id);
      const brukerProsjekter = finnes
        ? prev.brukerProsjekter.map((p) => (p.id === nytt.id ? nytt : p))
        : [nytt, ...prev.brukerProsjekter];
      return {
        ...prev,
        brukerProsjekter,
        aktivId: nytt.id,
      };
    });
    setProsjektModal(null);
    melding(`💾 Lagret prosjekt «${nytt.navn}»!`);
  };

  const eksporterAktivtProsjektJson = () => {
    const json = lagProsjektBackupJson({
      prosjekter: [prosjekt],
      tilstand: { [prosjekt.id]: prosjektTilstand },
      filer: prosjektFiler,
      aktivId: prosjekt.id,
      krav: tilstand.krav,
    });
    const filnavn = `${prosjekt.navn.toLowerCase().replace(/[^a-z0-9]+/gi, '-')}-prosjektbackup.json`;
    lastNedTekst(filnavn, json);
    melding(`📤 Eksporterte «${prosjekt.navn}» (inkl. ${prosjektFiler.length} filer og historikk) til .json!`);
  };

  const importerProsjektFraJsonFil = async (file: File) => {
    try {
      const tekst = await file.text();
      const pakke = lesProsjektBackupJson(tekst);
      if (pakke.filer.length > 0) {
        await lagreFilerIDB(pakke.filer);
      }
      setTilstand((prev) => {
        const eksisterendeMap = new Map(prev.brukerProsjekter.map((p) => [p.id, p]));
        for (const p of pakke.prosjekter) {
          eksisterendeMap.set(p.id, p);
        }
        return {
          ...prev,
          brukerProsjekter: [...eksisterendeMap.values()],
          aktivId: pakke.aktivId ?? pakke.prosjekter[0].id,
          krav: pakke.krav ?? prev.krav,
          tilstand: { ...prev.tilstand, ...pakke.tilstand },
        };
      });
      const aktivImpId = pakke.aktivId ?? pakke.prosjekter[0].id;
      const impFiler = await hentFilerForProsjektIDB(aktivImpId);
      setProsjektFiler(impFiler);
      melding(
        `📥 Importerte ${pakke.prosjekter.length} prosjekt(er) og ${pakke.filer.length} fil(er) fra backup!`
      );
    } catch (e) {
      melding(`⚠️ Importfeil: ${e instanceof Error ? e.message : 'Ugyldig JSON-fil'}`);
    }
  };

  const lagreNyeInnstillinger = (nye: Innstillinger, nyttKrav: number) => {
    setInnstillinger(nye);
    if (typeof window !== 'undefined' && window.localStorage) {
      lagreInnstillinger(window.localStorage, nye);
    }
    setTilstand((prev) => ({ ...prev, krav: nyttKrav }));
    setVisInnstillinger(false);
    melding('⚙️ Innstillinger lagret!');
  };

  const aktivAgent =
    visning.type === 'agent_view'
      ? AGENTER.find((a) => a.id === visning.agentId) || AGENTER[0]
      : null;

  const aktivModul =
    visning.type === 'modul'
      ? MODULER.find((m) => m.id === visning.modulId)
      : null;

  const lavesteKontroll =
    analyse.gulvKontroller.length > 0
      ? [...analyse.gulvKontroller].sort((a, b) => a.margin - b.margin)[0]
      : null;

  const sidebarInnhold = (erMobilDrawer = false) => (
    <>
      <div className="mb-3 flex items-center justify-between border-b border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setVisning({ type: 'agent_hub' })}
          className="text-left"
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">🚀</span>
            <span className="text-lg font-black tracking-tight text-emerald-400">VVS KEM PRO</span>
          </div>
          <div className="text-[11px] text-slate-400">Kommandosentral & AI Vision</div>
        </button>
        {erMobilDrawer && (
          <button
            type="button"
            onClick={() => setMobilMenyApen(false)}
            aria-label="Lukk meny"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-sm font-bold text-slate-300 hover:bg-slate-800"
          >
            ✕
          </button>
        )}
      </div>

      {/* Hovedknapp øverst i venstremenyen: Prosjektveiviser (Steg-for-steg) */}
      <div className="mb-4 space-y-1.5">
        <button
          type="button"
          onClick={() => setVisning({ type: 'veiviser' })}
          className={`min-h-[48px] w-full rounded-xl border px-3.5 py-2.5 text-left text-xs font-extrabold shadow-md transition ${
            visning.type === 'veiviser'
              ? 'border-emerald-400 bg-emerald-600 text-white'
              : 'border-emerald-700/80 bg-gradient-to-r from-emerald-900/80 to-slate-900 text-emerald-200 hover:border-emerald-500 hover:text-white'
          }`}
        >
          <div>🚀 Prosjektveiviser (Steg-for-steg)</div>
          <div className="mt-0.5 text-[10px] font-normal opacity-90">
            Steg 1 Filer → 2 VA → 3 Varme/Vent → 4 Brann/ITB → 5 QA
          </div>
        </button>

        <button
          type="button"
          onClick={() => setVisning({ type: 'prosjektoversikt' })}
          className={`min-h-[44px] w-full rounded-lg border px-3 py-2 text-left text-xs font-bold transition ${
            visning.type === 'prosjektoversikt'
              ? 'border-cyan-400 bg-cyan-950 text-cyan-200 shadow-md ring-1 ring-cyan-500'
              : 'border-slate-800 bg-slate-900/80 text-slate-200 hover:border-cyan-700 hover:bg-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span>📊 Prosjektoversikt & Tid</span>
            <span className="font-mono text-[10px] font-extrabold text-cyan-300">
              {aktivFremdrift.fremdriftProsent} %
            </span>
          </div>
          <div className="mt-0.5 text-[10px] font-normal text-slate-400">
            Fremdrift, mangler og timeføring
          </div>
        </button>

        <button
          type="button"
          onClick={() => setVisning({ type: 'akademi' })}
          className={`min-h-[44px] w-full rounded-lg border px-3 py-2 text-left text-xs font-bold transition ${
            visning.type === 'akademi'
              ? 'border-indigo-400 bg-indigo-950 text-indigo-200 shadow-md ring-1 ring-indigo-500'
              : 'border-slate-800 bg-slate-900/80 text-slate-200 hover:border-indigo-700 hover:bg-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span>🎓 Akademi & Guider</span>
            <span className="rounded bg-indigo-900/60 px-1.5 py-0.5 font-mono text-[10px] text-indigo-300">
              KURS
            </span>
          </div>
          <div className="mt-0.5 text-[10px] font-normal text-slate-400">
            Fagkurs, 19 agenter & NotebookLM
          </div>
        </button>

        <button
          type="button"
          onClick={() => setVisning({ type: 'galleri' })}
          className={`min-h-[44px] w-full rounded-lg border px-3 py-2 text-left text-xs font-bold transition ${
            visning.type === 'galleri'
              ? 'border-emerald-500 bg-emerald-950 text-emerald-300'
              : 'border-slate-800 bg-slate-900/80 text-slate-200 hover:border-emerald-700 hover:bg-slate-900'
          }`}
        >
          🖼️ Prosjektgalleri & Arkiv ({prosjektFiler.length})
        </button>

        <button
          type="button"
          onClick={() => {
            setMobilMenyApen(false);
            setVisning({ type: 'akademi', startFane: 'brukerveiledning' });
          }}
          className="min-h-[44px] w-full rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-left text-xs font-semibold text-sky-300 hover:border-sky-700 hover:bg-slate-900"
        >
          ❓ Slik bruker du appen (Manual)
        </button>
      </div>

      {/* Gruppe 1: Kommandosentral & 19 Agenter */}
      <div className="mb-5 space-y-1">
        <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          AI Kommandosentral (19 Agenter)
        </div>
        <NavKnapp
          aktiv={visning.type === 'agent_hub'}
          onClick={() => setVisning({ type: 'agent_hub' })}
        >
          ⚡ Kommandosentral Hub
        </NavKnapp>
        <NavKnapp
          aktiv={visning.type === 'super_kommandoer'}
          onClick={() => setVisning({ type: 'super_kommandoer' })}
        >
          🚀 Super-Kommandoer (1, 2, 3)
        </NavKnapp>
        <NavKnapp
          aktiv={visning.type === 'qa_port'}
          onClick={() => setVisning({ type: 'qa_port' })}
          fremhevet="rose"
        >
          🛡️ Agent 16: Djevelens Advokat (QA)
        </NavKnapp>

        {/* Underliste av Agenter */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setVisAlleAgenterISidebar((prev) => !prev)}
            className="flex min-h-[40px] w-full items-center justify-between px-2 py-1 text-[11px] font-semibold text-slate-500 hover:text-slate-300"
          >
            <span>ALLE 19 AGENTER</span>
            <span>{visAlleAgenterISidebar ? '▼' : '▶'}</span>
          </button>
          {visAlleAgenterISidebar && (
            <div className="mt-1 max-h-60 space-y-0.5 overflow-y-auto pl-2">
              {AGENTER.map((a) => {
                const erAktiv = visning.type === 'agent_view' && visning.agentId === a.id;
                return (
                  <div key={a.id} className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSistBrukteAgentId(a.id);
                        setVisning({ type: 'agent_view', agentId: a.id });
                      }}
                      className={`min-h-[40px] flex-1 truncate rounded px-2 py-1.5 text-left text-xs transition ${
                        erAktiv
                          ? 'border-l-2 border-emerald-400 bg-emerald-950 font-bold text-emerald-300'
                          : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                      }`}
                    >
                      <span className="mr-1.5 font-mono text-[10px] text-slate-500">
                        {a.nummer < 10 ? `0${a.nummer}` : a.nummer}
                      </span>
                      {a.kortNavn}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMobilMenyApen(false);
                        apneChatForAgent(a.id);
                      }}
                      title={`Åpne AI-chat med Agent ${a.nummer}`}
                      className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded px-1.5 py-1 text-xs text-slate-500 hover:bg-slate-800 hover:text-emerald-300"
                    >
                      💬
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Gruppe 2: Fag- og Beregningsmoduler (1-9) */}
      <div className="space-y-1 border-t border-slate-800/80 pt-3">
        <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Fag- & Beregningsmoduler
        </div>
        <NavKnapp
          aktiv={visning.type === 'dashbord_moduler'}
          onClick={() => setVisning({ type: 'dashbord_moduler' })}
        >
          🏠 Alle 9 Moduler
        </NavKnapp>
        {MODULER.map((m) => (
          <NavKnapp
            key={m.id}
            aktiv={visning.type === 'modul' && visning.modulId === m.id}
            onClick={() => setVisning({ type: 'modul', modulId: m.id })}
            dempet={m.status !== 'klar'}
          >
            {m.ikon} {m.nummer}. {m.navn}
          </NavKnapp>
        ))}
      </div>

      {/* Footer info */}
      <div className="mt-auto border-t border-slate-800 pt-4 text-[10px] text-slate-500">
        <div>Rørleggermester & RIV Kim Jørgensen</div>
        <div>IndexedDB + Gemini Vision | TEK17</div>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      {/* Sidebar for Desktop (lg+) */}
      <aside className="hidden max-h-screen w-72 shrink-0 flex-col overflow-y-auto border-r border-slate-800 bg-slate-950 p-4 lg:flex">
        {sidebarInnhold(false)}
      </aside>

      {/* Uttrekkbar meny-skuff (Drawer) for Mobil & Nettbrett (< lg) */}
      {mobilMenyApen && (
        <div
          className="fixed inset-0 z-40 flex lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Hovedmeny"
        >
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs"
            onClick={() => setMobilMenyApen(false)}
          />
          <aside className="relative z-10 flex h-full w-80 max-w-[85vw] flex-col overflow-y-auto border-r border-slate-700 bg-slate-950 p-4 shadow-2xl">
            {sidebarInnhold(true)}
          </aside>
        </div>
      )}

      {/* Hovedinnhold */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topplinje med menyknapp (mobil/nettbrett), prosjektvelger, + Nytt prosjekt, Slett prosjekt, Filer, Eksport/Import (.json), globale lover og Hjelp */}
        <header className="border-b border-slate-800 bg-slate-900 px-3 py-3 shadow-sm sm:px-6">
          <div className="flex flex-col gap-2.5">
            {/* Rad 1: Hamburger-meny (mobil/nettbrett) + Prosjektadministrasjon */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                {/* Hamburger-menyknapp for mobil og nettbrett */}
                <button
                  type="button"
                  onClick={() => setMobilMenyApen(true)}
                  aria-label="Åpne hovedmeny"
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-emerald-700 bg-slate-950 px-3 py-2 text-xs font-extrabold text-emerald-300 shadow hover:bg-slate-800 lg:hidden"
                >
                  <span className="text-base leading-none">☰</span>
                  <span>Meny</span>
                </button>

                <span className="hidden text-xs font-semibold text-slate-400 sm:inline">
                  Prosjekt:
                </span>
                <select
                  aria-label="Aktivt prosjekt"
                  value={prosjekt.id}
                  onChange={(e) => {
                    const id = e.target.value;
                    setTilstand((prev) => ({ ...prev, aktivId: id }));
                    const valgt = alleProsjekter.find((p) => p.id === id);
                    if (valgt) melding(`Byttet aktivt prosjekt til «${valgt.navn}»`);
                  }}
                  className="min-h-[44px] max-w-[240px] sm:max-w-xs rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-bold text-emerald-300 focus:border-emerald-500 focus:outline-none"
                >
                  {tilstand.brukerProsjekter.length > 0 && (
                    <optgroup label="Egne prosjekter (IndexedDB)">
                      {tilstand.brukerProsjekter.map((p) => (
                        <option key={p.id} value={p.id}>
                          ★ {p.navn} ({p.bra ? `${p.bra} m²` : p.bygningstype})
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {synligePresets.length > 0 && (
                    <optgroup label="Referanse-case (Case 01–05)">
                      {synligePresets.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.navn} ({p.bra ? `${p.bra} m²` : p.bygningstype})
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>

                <button
                  type="button"
                  onClick={apneNyttProsjekt}
                  className="inline-flex min-h-[44px] items-center rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow transition hover:bg-emerald-500"
                >
                  + Nytt prosjekt
                </button>

                <button
                  type="button"
                  onClick={apneRedigerEllerKopierProsjekt}
                  className="inline-flex min-h-[44px] items-center rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-slate-600 hover:bg-slate-700"
                >
                  {prosjekt.kilde === 'bruker' ? '✏️ Rediger' : '📋 Kopier & tilpass'}
                </button>

                <button
                  type="button"
                  onClick={slettAktivtProsjekt}
                  title="Slett aktivt prosjekt (krever 2-stegs bekreftelse)"
                  className="inline-flex min-h-[44px] items-center rounded-lg border border-rose-800/80 bg-rose-950/40 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-900/60"
                >
                  🗑️ Slett prosjekt
                </button>

                <button
                  type="button"
                  onClick={() => setVisning({ type: 'galleri' })}
                  title="Åpne Prosjektgalleri & Dokumentarkiv (tegninger, bilder, PDF)"
                  className="inline-flex min-h-[44px] items-center rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-emerald-300 hover:border-emerald-600 hover:bg-slate-700"
                >
                  📂 Filer ({prosjektFiler.length})
                </button>

                <button
                  type="button"
                  onClick={() => setVisMoteOpptaker((v) => !v)}
                  title="Åpne kontinuerlig møte- og befaringsopptak (uten tidsbegrensning) med live framdriftsindikator"
                  className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold transition ${
                    visMoteOpptaker
                      ? 'border-rose-500 bg-rose-950/70 text-rose-200 shadow-lg'
                      : 'border-indigo-700/80 bg-indigo-950/60 text-indigo-200 hover:bg-indigo-900/70'
                  }`}
                >
                  🎙️ {visMoteOpptaker ? 'Skjul møteopptak' : 'Møteopptak'}
                </button>

                <button
                  type="button"
                  onClick={eksporterAktivtProsjektJson}
                  title="Eksporter aktivt prosjekt med filer, kalkulatorer og chathistorikk til .json"
                  className="inline-flex min-h-[44px] items-center rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                >
                  📤 Eksport
                </button>

                <button
                  type="button"
                  onClick={() => importJsonInputRef.current?.click()}
                  title="Importer prosjekt eller backup fra .json-fil"
                  className="inline-flex min-h-[44px] items-center rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                >
                  📥 Import
                </button>
                <input
                  ref={importJsonInputRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      void importerProsjektFraJsonFil(file);
                      e.target.value = '';
                    }
                  }}
                />
              </div>

              {/* Globale Lover Statusindikatorer + Live Fremdrift + Innstillinger & Brukerveiledning */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                {/* Live Fremdriftsindikator & Mangelliste */}
                <LiveFremdriftsBar
                  fremdrift={aktivFremdrift}
                  onApneDashbord={() =>
                    setVisning({ type: 'prosjektoversikt', startFane: 'alle_prosjekter' })
                  }
                  onApneMangler={() =>
                    setVisning({ type: 'prosjektoversikt', startFane: 'mangelliste' })
                  }
                  onApneQa={() => setVisning({ type: 'qa_port' })}
                />

                {/* Lov 1 */}
                <button
                  type="button"
                  onClick={() => setVisning({ type: 'veiviser' })}
                  title="Lov 1: 100 % Sikkerhet / Manglende underlag"
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-amber-800/80 bg-amber-950/40 px-2.5 py-1.5 text-amber-300 hover:bg-amber-900/40"
                >
                  <span>⚠️</span>
                  <span className="font-semibold">{analyse.mangler.length} HINTs</span>
                </button>

                {/* Lov 2 */}
                <button
                  type="button"
                  onClick={() =>
                    setVisning({ type: 'modul', modulId: 'sanitaer', sanitaerFane: 'koter' })
                  }
                  title="Lov 2: Kotesjekk mot tilbakeslag (klikk for Kote-kalkulator)"
                  className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-semibold transition ${
                    analyse.lov2Status === 'brudd'
                      ? 'border-rose-700/80 bg-rose-950/50 text-rose-300 hover:bg-rose-900/60'
                      : analyse.lov2Status === 'ok'
                      ? 'border-emerald-700/80 bg-emerald-950/50 text-emerald-300 hover:bg-emerald-900/60'
                      : 'border-amber-700/80 bg-amber-950/40 text-amber-300 hover:bg-amber-900/40'
                  }`}
                >
                  <span>🚨</span>
                  <span>
                    {analyse.lov2Status === 'brudd' && lavesteKontroll
                      ? `${lavesteKontroll.navn}: ${(lavesteKontroll.margin * 1000).toFixed(0)} mm`
                      : analyse.lov2Status === 'ok'
                      ? `Koter OK (≥ ${(tilstand.krav * 1000).toFixed(0)} mm)`
                      : 'Mangler koter'}
                  </span>
                </button>

                {/* Lov 3 */}
                <button
                  type="button"
                  onClick={() => setVisning({ type: 'qa_port' })}
                  title="Lov 3: Bransjeutstyr & Agent 16 QA-port (13 kontrollpunkter før signatur)"
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-emerald-700/80 bg-emerald-950/50 px-2.5 py-1.5 font-semibold text-emerald-300 transition hover:bg-emerald-900"
                >
                  <span>🛡️</span>
                  <span>QA ({signaturStatus.totaltFullfort}/13)</span>
                </button>

                {/* Innstillinger */}
                <button
                  type="button"
                  onClick={() => setVisInnstillinger(true)}
                  className="inline-flex min-h-[44px] items-center rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 font-semibold text-slate-200 hover:bg-slate-700"
                >
                  ⚙️ Innstillinger
                </button>

                {/* Akademi & Guider */}
                <button
                  type="button"
                  onClick={() => setVisning({ type: 'akademi' })}
                  title="🎓 Akademi: Fagkurs, leksikon for alle 19 agenter, brukerveiledning og NotebookLM-prompts"
                  className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border px-3 py-1.5 font-bold transition ${
                    visning.type === 'akademi'
                      ? 'border-indigo-400 bg-indigo-950 text-indigo-200 shadow-md ring-1 ring-indigo-500'
                      : 'border-indigo-800/80 bg-indigo-950/60 text-indigo-300 hover:bg-indigo-900/80'
                  }`}
                >
                  <span>🎓</span>
                  <span>Akademi</span>
                </button>

                {/* Brukermanual: ❓ Slik bruker du appen */}
                <button
                  type="button"
                  onClick={() => setVisning({ type: 'akademi', startFane: 'brukerveiledning' })}
                  title="Åpne interaktiv brukerveiledning (trinn 1–6)"
                  className="inline-flex min-h-[44px] items-center rounded-lg border border-sky-700 bg-sky-950/60 px-3 py-1.5 font-bold text-sky-200 hover:bg-sky-900"
                >
                  ❓ Slik bruker du appen
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Hovedvisning */}
        <main className="flex-1 overflow-y-auto p-3 pb-20 sm:p-6 lg:pb-6">
          <Suspense
            fallback={
              <div className="flex min-h-[240px] items-center justify-center rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-xs font-semibold text-slate-300">
                ⏳ Laster fagmodul…
              </div>
            }
          >
          {visMoteOpptaker && (
            <div className="mb-5">
              <MoteOpptaker
                key={prosjekt.id}
                prosjekt={prosjekt}
                innstillinger={innstillinger}
                onOppdaterProsjekt={oppdaterAktivtProsjekt}
                onFilerLastetOpp={handterNyeFiler}
                onVelgAgent={(agentId) => {
                  setSistBrukteAgentId(agentId);
                  setVisning({ type: 'agent_view', agentId });
                }}
                onApneGalleri={() => setVisning({ type: 'galleri' })}
                melding={melding}
              />
            </div>
          )}

          {visning.type === 'veiviser' && (
            <ProsjektVeiviser
              key={prosjekt.id}
              prosjekt={prosjekt}
              analyse={analyse}
              filer={prosjektFiler}
              innstillinger={innstillinger}
              aktivtSteg={prosjektTilstand.aktivtSteg}
              ferdigeSteg={prosjektTilstand.steg}
              qa={prosjektTilstand.qa}
              overstyringer={prosjektTilstand.overstyringer ?? {}}
              godkjent={prosjektTilstand.godkjent}
              onSettSteg={(steg) =>
                oppdaterProsjektTilstand((t) => ({ ...t, aktivtSteg: steg }))
              }
              onToggleStegFerdig={(steg) =>
                oppdaterProsjektTilstand((t) => ({
                  ...t,
                  steg: { ...t.steg, [String(steg)]: !t.steg[String(steg)] },
                }))
              }
              onToggleQa={(id) =>
                oppdaterProsjektTilstand((t) => ({
                  ...t,
                  qa: { ...t.qa, [id]: !t.qa[id] },
                }))
              }
              onNullstillQa={nullstillQa}
              onFilerLastetOpp={handterNyeFiler}
              onOppdaterFil={handterOppdaterFil}
              onBrukUttrekk={handterBrukUttrekk}
              onOppdaterProsjekt={oppdaterAktivtProsjekt}
              onOppdaterProsjektOgOverstyringer={oppdaterProsjektOgOverstyringer}
              onGodkjennOgLaasProsjekt={godkjennOgLaasProsjekt}
              onApneGalleri={() => setVisning({ type: 'galleri' })}
              onAnalyserFilIChat={analyserFilIChat}
              onApneChatMedSporsmal={apneChatMedSporsmal}
              onRedigerProsjekt={apneRedigerEllerKopierProsjekt}
              onNyttProsjekt={apneNyttProsjekt}
              onSlettProsjekt={slettAktivtProsjekt}
              onApneSanitaer={(fane) =>
                setVisning({ type: 'modul', modulId: 'sanitaer', sanitaerFane: fane })
              }
              onVelgAgent={(agentId) => {
                setSistBrukteAgentId(agentId);
                setVisning({ type: 'agent_view', agentId });
              }}
              onApneChat={apneChatForAgent}
              onApneSuperKommandoer={() => setVisning({ type: 'super_kommandoer' })}
              onApneQaPort={() => setVisning({ type: 'qa_port' })}
              onApneInnstillinger={() => setVisInnstillinger(true)}
              onApneHjelp={() => setVisHjelp(true)}
              melding={melding}
            />
          )}

          {visning.type === 'galleri' && (
            <ProsjektGalleri
              prosjektId={prosjekt.id}
              prosjektNavn={prosjekt.navn}
              prosjekt={prosjekt}
              filer={prosjektFiler}
              innstillinger={innstillinger}
              onFilerLastetOpp={handterNyeFiler}
              onOppdaterFil={handterOppdaterFil}
              onOppdaterProsjekt={oppdaterAktivtProsjekt}
              onSlettFil={handterSlettFil}
              onBrukUttrekk={handterBrukUttrekk}
              onAnalyserFilIChat={analyserFilIChat}
              onApneInnstillinger={() => setVisInnstillinger(true)}
              melding={melding}
            />
          )}

          {visning.type === 'prosjektoversikt' && (
            <ProsjektDashbord
              prosjekt={prosjekt}
              alleProsjekter={alleProsjekter}
              tilstand={tilstand}
              analyse={analyse}
              innstillinger={innstillinger}
              startFane={visning.startFane}
              onVelgAktivtProsjekt={(id) => {
                setTilstand((prev) => ({ ...prev, aktivId: id }));
              }}
              onNyttProsjekt={apneNyttProsjekt}
              onRedigerProsjekt={apneRedigerEllerKopierProsjekt}
              onOppdaterProsjektTilstand={oppdaterProsjektTilstand}
              onNavigerTilVeiviser={() => setVisning({ type: 'veiviser' })}
              onNavigerTilModul={(modulId, sanitaerFane) =>
                setVisning({ type: 'modul', modulId, sanitaerFane: sanitaerFane as FaneId })
              }
              onNavigerTilQaPort={() => setVisning({ type: 'qa_port' })}
              onNavigerTilAgent={(agentId) => {
                setSistBrukteAgentId(agentId);
                setVisning({ type: 'agent_view', agentId });
              }}
              melding={melding}
            />
          )}

          {visning.type === 'akademi' && (
            <AkademiModul
              startFane={visning.startFane}
              prosjekt={prosjekt}
              onNavigerTilModul={(modulId, sanitaerFane) =>
                setVisning({ type: 'modul', modulId, sanitaerFane: sanitaerFane as FaneId })
              }
              onNavigerTilVeiviser={() => setVisning({ type: 'veiviser' })}
              onNavigerTilQaPort={() => setVisning({ type: 'qa_port' })}
              onNavigerTilDashbord={() => setVisning({ type: 'prosjektoversikt' })}
              onApneChat={(agentId, sporsmal) => {
                if (sporsmal) {
                  apneChatMedSporsmal(agentId, sporsmal);
                } else {
                  apneChatForAgent(agentId);
                }
              }}
              melding={melding}
            />
          )}

          {visning.type === 'agent_hub' && (
            <AgentHub
              prosjekt={prosjekt}
              analyse={analyse}
              filer={prosjektFiler}
              innstillinger={innstillinger}
              qaFullfort={qaFullfort}
              onFilerLastetOpp={handterNyeFiler}
              onOppdaterFil={handterOppdaterFil}
              onBrukUttrekk={handterBrukUttrekk}
              onApneGalleri={() => setVisning({ type: 'galleri' })}
              onApneInnstillinger={() => setVisInnstillinger(true)}
              melding={melding}
              onVelgAgent={(agentId) => {
                setSistBrukteAgentId(agentId);
                setVisning({ type: 'agent_view', agentId });
              }}
              onApneChat={apneChatForAgent}
              onVelgSuperKommando={() => setVisning({ type: 'super_kommandoer' })}
              onVelgQAPort={() => setVisning({ type: 'qa_port' })}
              onStartVeiviser={() => setVisning({ type: 'veiviser' })}
              onSlettProsjekt={slettAktivtProsjekt}
              onGaaTilModul={(modulId) => setVisning({ type: 'modul', modulId })}
            />
          )}

          {visning.type === 'agent_view' && aktivAgent && (
            <AgentView
              key={`${prosjekt.id}:${aktivAgent.id}`}
              agent={aktivAgent}
              prosjekt={prosjekt}
              analyse={analyse}
              sjekk={prosjektTilstand.agentSjekk}
              qa={prosjektTilstand.qa}
              overstyringer={prosjektTilstand.overstyringer ?? {}}
              qaFullfort={qaFullfort}
              innstillinger={innstillinger}
              onToggleSjekk={(punktId) => {
                const nokkel = `${aktivAgent.id}:${punktId}`;
                oppdaterProsjektTilstand((t) => ({
                  ...t,
                  agentSjekk: { ...t.agentSjekk, [nokkel]: !t.agentSjekk[nokkel] },
                }));
              }}
              onToggleQa={(id) =>
                oppdaterProsjektTilstand((t) => ({
                  ...t,
                  qa: { ...t.qa, [id]: !t.qa[id] },
                }))
              }
              onOppdaterProsjekt={oppdaterAktivtProsjekt}
              onOppdaterProsjektOgOverstyringer={oppdaterProsjektOgOverstyringer}
              onFilerLastetOpp={handterNyeFiler}
              onOppdaterFil={handterOppdaterFil}
              onBrukUttrekk={handterBrukUttrekk}
              onApneInnstillinger={() => setVisInnstillinger(true)}
              onVelgAgent={(agentId) => {
                setSistBrukteAgentId(agentId);
                setVisning({ type: 'agent_view', agentId });
              }}
              melding={melding}
              onGaaTilModul={(modulId) => setVisning({ type: 'modul', modulId })}
              onGaaTilQAPort={() => setVisning({ type: 'qa_port' })}
              onApneChat={(agentId, sporsmal) => {
                if (sporsmal) {
                  apneChatMedSporsmal(agentId, sporsmal);
                } else {
                  apneChatForAgent(agentId);
                }
              }}
            />
          )}

          {visning.type === 'super_kommandoer' && (
            <SuperKommandoer
              prosjekt={prosjekt}
              analyse={analyse}
              melding={melding}
              onVelgAgent={(agentId) => {
                setSistBrukteAgentId(agentId);
                setVisning({ type: 'agent_view', agentId });
              }}
              onApneChat={apneChatForAgent}
            />
          )}

          {visning.type === 'qa_port' && (
            <Agent16QAPort
              key={prosjekt.id}
              prosjekt={prosjekt}
              analyse={analyse}
              qa={prosjektTilstand.qa}
              overstyringer={prosjektTilstand.overstyringer ?? {}}
              godkjent={prosjektTilstand.godkjent}
              onToggleQa={(id) =>
                oppdaterProsjektTilstand((t) => ({
                  ...t,
                  qa: { ...t.qa, [id]: !t.qa[id] },
                }))
              }
              onNullstillQa={nullstillQa}
              onOppdaterProsjektOgOverstyringer={oppdaterProsjektOgOverstyringer}
              onGodkjennOgLaasProsjekt={godkjennOgLaasProsjekt}
              melding={melding}
              onGaaTilAgent={(agentId) => setVisning({ type: 'agent_view', agentId })}
              onApneChat={apneChatForAgent}
            />
          )}

          {visning.type === 'dashbord_moduler' && (
            <ModulDashbord onVelgModul={(modulId) => setVisning({ type: 'modul', modulId })} />
          )}

          {visning.type === 'modul' && aktivModul?.id === 'sanitaer' && (
            <Sanitaer
              prosjekt={prosjekt}
              analyse={analyse}
              krav={tilstand.krav}
              startFane={visning.sanitaerFane}
              kalkulatorer={prosjektTilstand.kalkulatorer}
              overstyringer={prosjektTilstand.overstyringer ?? {}}
              qa={prosjektTilstand.qa}
              onToggleQa={(id) =>
                oppdaterProsjektTilstand((t) => ({
                  ...t,
                  qa: { ...t.qa, [id]: !t.qa[id] },
                }))
              }
              onOppdaterKalkulatorer={oppdaterKalkulatorer}
              onOppdaterProsjekt={(p, endringer) => oppdaterAktivtProsjekt(p, endringer)}
              onOppdaterProsjektOgOverstyringer={oppdaterProsjektOgOverstyringer}
              melding={melding}
              onVelgAgent={(agentId) => {
                setSistBrukteAgentId(agentId);
                setVisning({ type: 'agent_view', agentId });
              }}
            />
          )}

          {visning.type === 'modul' && aktivModul && aktivModul.id !== 'sanitaer' && (
            <FagModulVisning
              key={`${prosjekt.id}:${aktivModul.id}`}
              modul={aktivModul}
              prosjekt={prosjekt}
              analyse={analyse}
              qa={prosjektTilstand.qa}
              overstyringer={prosjektTilstand.overstyringer ?? {}}
              qaFullfort={qaFullfort}
              onToggleQa={(id) =>
                oppdaterProsjektTilstand((t) => ({
                  ...t,
                  qa: { ...t.qa, [id]: !t.qa[id] },
                }))
              }
              onOppdaterProsjekt={(p, endringer) => oppdaterAktivtProsjekt(p, endringer)}
              onOppdaterProsjektOgOverstyringer={oppdaterProsjektOgOverstyringer}
              onVelgAgent={(agentId) => {
                setSistBrukteAgentId(agentId);
                setVisning({ type: 'agent_view', agentId });
              }}
              onApneChat={apneChatForAgent}
              onNavigerTilDashbord={() => setVisning({ type: 'prosjektoversikt' })}
              melding={melding}
            />
          )}
          </Suspense>
        </main>

        {/* Mobilbunn-navigasjon */}
        <nav
          className="flex gap-1 overflow-x-auto border-t border-slate-800 bg-slate-950 p-2 lg:hidden"
          aria-label="Navigasjon (mobil)"
        >
          <NavKnapp
            aktiv={visning.type === 'prosjektoversikt'}
            onClick={() => setVisning({ type: 'prosjektoversikt' })}
          >
            📊 Oversikt ({aktivFremdrift.fremdriftProsent}%)
          </NavKnapp>
          <NavKnapp
            aktiv={visning.type === 'veiviser'}
            onClick={() => setVisning({ type: 'veiviser' })}
          >
            🚀 Veiviser
          </NavKnapp>
          <NavKnapp
            aktiv={visning.type === 'galleri'}
            onClick={() => setVisning({ type: 'galleri' })}
          >
            🖼️ Filer ({prosjektFiler.length})
          </NavKnapp>
          <NavKnapp
            aktiv={visning.type === 'agent_hub'}
            onClick={() => setVisning({ type: 'agent_hub' })}
          >
            ⚡ Hub
          </NavKnapp>
          <NavKnapp
            aktiv={visning.type === 'qa_port'}
            onClick={() => setVisning({ type: 'qa_port' })}
          >
            🛡️ QA
          </NavKnapp>
          <NavKnapp
            aktiv={visning.type === 'akademi'}
            onClick={() => setVisning({ type: 'akademi' })}
          >
            🎓 Akademi
          </NavKnapp>
          <NavKnapp
            aktiv={visning.type === 'modul' && visning.modulId === 'sanitaer'}
            onClick={() => setVisning({ type: 'modul', modulId: 'sanitaer' })}
          >
            💧 Sanitær
          </NavKnapp>
        </nav>
      </div>

      {/* Fast AI-chat-knapp nede i høyre hjørne */}
      {!chatAgentId && (
        <button
          type="button"
          onClick={() => apneChatForAgent(aktivAgent?.id ?? sistBrukteAgentId)}
          className="fixed bottom-20 right-4 z-30 flex min-h-[44px] items-center gap-2 rounded-full border border-emerald-400/60 bg-emerald-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-2xl transition hover:bg-emerald-500 lg:bottom-5 lg:right-5"
        >
          <span className="text-base">💬</span>
          <span>
            AI-chat (
            {(aktivAgent?.id ?? sistBrukteAgentId) === 'hovedchat'
              ? 'Prosjekt-AI'
              : (aktivAgent?.id ?? sistBrukteAgentId).replace('agent-', 'Agent ')}
            )
          </span>
        </button>
      )}

      {/* AI-chat skuff */}
      {chatAgentId && (
        <Suspense fallback={null}>
          <AgentChat
            key={prosjekt.id}
            agentId={chatAgentId}
          onByttAgent={(id) => {
            setSistBrukteAgentId(id);
            setChatAgentId(id);
          }}
          prosjekt={prosjekt}
          analyse={analyse}
          prosjektFiler={prosjektFiler}
          overstyringer={prosjektTilstand.overstyringer ?? {}}
          qaFullfort={qaFullfort}
          forhandsvalgtFilId={forhandsvalgtFilId}
          forhandsvalgtSporsmal={forhandsvalgtSporsmal}
          onNullstillForhandsvalg={() => {
            setForhandsvalgtFilId(null);
            setForhandsvalgtSporsmal(null);
          }}
          onFilerLastetOpp={handterNyeFiler}
          onOppdaterProsjekt={oppdaterAktivtProsjekt}
          onOppdaterProsjektOgOverstyringer={oppdaterProsjektOgOverstyringer}
          innstillinger={innstillinger}
          samtaler={samtaler}
          onSamtaler={oppdaterSamtaler}
          onRedigerProsjekt={apneRedigerEllerKopierProsjekt}
          onApneInnstillinger={() => setVisInnstillinger(true)}
          onLukk={() => setChatAgentId(null)}
          melding={melding}
        />
        </Suspense>
      )}

      {/* Prosjekt-dialog (opprett / rediger) */}
      {prosjektModal && (
        <Suspense fallback={null}>
        <ProsjektDialog
          tittel={
            prosjektModal.modus === 'nytt'
              ? '➕ Opprett nytt prosjekt'
              : `✏️ Rediger prosjekt: ${prosjektModal.start.navn}`
          }
          start={prosjektModal.start}
          innstillinger={innstillinger}
          onLagre={lagreProsjektFraModal}
          onAvbryt={() => setProsjektModal(null)}
          onFilerLastetOpp={handterNyeFiler}
          onSlettProsjekt={prosjektModal.modus === 'rediger' ? slettAktivtProsjekt : undefined}
        />
        </Suspense>
      )}

      {/* Innstillinger-dialog */}
      {visInnstillinger && (
        <Suspense fallback={null}>
        <InnstillingerDialog
          innstillinger={innstillinger}
          krav={tilstand.krav}
          antallSkjultePresets={(tilstand.skjultePresetIder ?? []).length}
          onGjenopprettPresets={gjenopprettStandardPresets}
          onLagre={lagreNyeInnstillinger}
          onLukk={() => setVisInnstillinger(false)}
        />
        </Suspense>
      )}

      {/* Hjelp & Veiledning-dialog */}
      {visHjelp && (
        <Suspense fallback={null}>
        <HjelpDialog
          onLukk={() => setVisHjelp(false)}
          onStartVeiviser={() => {
            setVisHjelp(false);
            setVisning({ type: 'veiviser' });
          }}
          onApneInnstillinger={() => {
            setVisHjelp(false);
            setVisInnstillinger(true);
          }}
        />
        </Suspense>
      )}

      {/* Toast-notifikasjon */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-36 right-4 left-4 z-50 rounded-lg border-l-4 border-emerald-500 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-100 shadow-2xl sm:left-auto sm:right-5 lg:bottom-20"
        >
          {toast}
        </div>
      )}
    </div>
  );
}

function NavKnapp({
  aktiv,
  onClick,
  children,
  dempet = false,
  fremhevet,
}: {
  aktiv: boolean;
  onClick: () => void;
  children: React.ReactNode;
  dempet?: boolean;
  fremhevet?: 'rose' | 'amber';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={aktiv ? 'page' : undefined}
      className={`min-h-[44px] w-full whitespace-nowrap rounded-lg px-3 py-2 text-left text-xs font-semibold transition ${
        aktiv
          ? 'border-l-2 border-emerald-400 bg-emerald-950 text-emerald-300'
          : fremhevet === 'rose'
          ? 'text-rose-300 hover:bg-rose-950/40'
          : dempet
          ? 'text-slate-500 hover:bg-slate-900'
          : 'text-slate-300 hover:bg-slate-900'
      }`}
    >
      {children}
    </button>
  );
}

function ModulDashbord({ onVelgModul }: { onVelgModul: (id: string) => void }) {
  const klare = MODULER.filter((m) => m.status === 'klar').length;
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-700 bg-slate-900 p-5">
        <h2 className="text-lg font-bold text-slate-100">De 9 Tekniske Beregningsmodulene (Global Prosjekt-State)</h2>
        <p className="mt-1 text-xs text-slate-400">
          {klare} av {MODULER.length} moduler er aktive og henter automatisk prosjektnavn, adresse, Gnr/Bnr, koter, vanntrykk og BRA fra global prosjekt-state (Single Source of Truth). Hver modul er koblet til Gatekeeper-kontroll og de 19 AI-agentene.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {MODULER.map((m) => (
          <button
            key={m.id}
            onClick={() => onVelgModul(m.id)}
            className="rounded-xl border border-slate-700 bg-slate-800 p-5 text-left shadow-lg transition hover:border-emerald-600 hover:bg-slate-800/90"
          >
            <div className="flex items-start justify-between">
              <span className="text-3xl">{m.ikon}</span>
              <span className="rounded border border-emerald-700 bg-emerald-950 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                Aktiv (Fase {m.fase})
              </span>
            </div>
            <h3 className="mt-3 text-base font-bold text-slate-100">
              {m.nummer}. {m.navn}
            </h3>
            <p className="mt-1 text-xs text-slate-400">{m.beskrivelse}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
