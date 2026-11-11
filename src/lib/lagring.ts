import { PROSJEKT_PRESETS, tomtProsjekt, type ProsjektData } from '../data/prosjekter';
import type { ChatMelding } from './gemini';
import type { Strekk, Trykkbudsjett } from '../engine/sanitaer';
import type { Utstyrslinje } from '../engine/bereder';
import type { TidssporingTilstand } from './fremdrift';

/** Det minste vi trenger av localStorage – gjør det enkelt å teste uten nettleser. */
export interface Lager {
  getItem(nokkel: string): string | null;
  setItem(nokkel: string, verdi: string): void;
  removeItem(nokkel: string): void;
}

export interface KalkulatorTilstand {
  trykkfall?: {
    budsjett: Trykkbudsjett;
    rader: Strekk[];
    tittel?: string;
  };
  bereder?: {
    linjer: Utstyrslinje[];
    ladetid: number;
    c: number;
    deltaT: number;
  };
  overvann?: {
    navn: string;
    lengde: number;
    bredde: number;
    intensitet: number;
    psi: number;
  }[];
}

export interface OverstyringInfo {
  aktiv: boolean;
  etikett: string;
  estimatVerdi?: string;
  tidspunkt: string;
}

export interface ProsjektTilstand {
  /** Agent 16: avkryssede kontrollpunkter (QA-port) */
  qa: Record<string, boolean>;
  /** Avkryssede sjekklistepunkter per agent, nøkkel `${agentId}:${punktId}` */
  agentSjekk: Record<string, boolean>;
  /** Ferdigmerkede veiviser-steg (1–5) */
  steg: Record<string, boolean>;
  aktivtSteg: number;
  /** Chathistorikk per prosjekt (nøkkel 'hovedchat' eller 'agent-01'..'agent-19') */
  samtaler?: Record<string, ChatMelding[]>;
  /** Lagrede verdier i kalkulatorene for dette prosjektet */
  kalkulatorer?: KalkulatorTilstand;
  /** Gatekeeper: Felt som er overstyrt med «Midlertidig estimat / Venter på kommunen» */
  overstyringer?: Record<string, OverstyringInfo>;
  /** Gatekeeper Steg 5: Status for endelig godkjenning og låsing av prosjektet */
  godkjent?: {
    laast: boolean;
    tidspunkt: string;
    medForbehold: boolean;
  };
  /** Tids- og ressurssporing: RIV-timer og AI-kjøretid */
  tidssporing?: TidssporingTilstand;
}

export interface AppTilstand {
  brukerProsjekter: ProsjektData[];
  aktivId: string;
  /** Krav til overhøyde mot tilbakeslag [m] */
  krav: number;
  tilstand: Record<string, ProsjektTilstand>;
  /** ID-er til standard-prosjekter (Case 01–05) som brukeren har valgt å slette/skjule */
  skjultePresetIder?: string[];
}

export interface Innstillinger {
  geminiNokkel: string;
  modell: string;
}

export const LAGER_NOKKEL = 'vvs-kem-pro:v1';
export const INNSTILLINGER_NOKKEL = 'vvs-kem-pro:innstillinger';
export const STANDARD_MODELL = 'gemini-2.5-flash';

export const tomProsjektTilstand = (): ProsjektTilstand => ({
  qa: {},
  agentSjekk: {},
  steg: {},
  aktivtSteg: 1,
  tidssporing: {
    manuelleTimer: [],
    aiLogger: [],
  },
});

export const standardTilstand = (): AppTilstand => ({
  brukerProsjekter: [],
  aktivId: PROSJEKT_PRESETS[0].id,
  krav: 0.95,
  tilstand: {},
});

/** Fyller inn manglende felt slik at lagrede prosjekter fra eldre versjoner ikke krasjer appen. */
export function normaliserProsjekt(rå: unknown): ProsjektData | null {
  if (typeof rå !== 'object' || rå === null) return null;
  const p = rå as Partial<ProsjektData>;
  if (typeof p.id !== 'string' || typeof p.navn !== 'string') return null;
  const t = tomtProsjekt(p.id);
  return {
    ...t,
    ...p,
    kilde: 'bruker',
    koter: { ...t.koter, ...(p.koter ?? {}), gulv: Array.isArray(p.koter?.gulv) ? p.koter.gulv : [] },
    vanntrykk: { ...t.vanntrykk, ...(p.vanntrykk ?? {}) },
    overvann: { ...t.overvann, ...(p.overvann ?? {}), flater: Array.isArray(p.overvann?.flater) ? p.overvann.flater : [] },
    belastning: { ...t.belastning, ...(p.belastning ?? {}) },
    feller: Array.isArray(p.feller) ? p.feller : [],
    kjenteMangler: Array.isArray(p.kjenteMangler) ? p.kjenteMangler : [],
  };
}

export function lastTilstand(lager: Lager): AppTilstand {
  const std = standardTilstand();
  try {
    const tekst = lager.getItem(LAGER_NOKKEL);
    if (!tekst) return std;
    const d = JSON.parse(tekst) as Partial<AppTilstand>;
    const brukerProsjekter = (Array.isArray(d.brukerProsjekter) ? d.brukerProsjekter : [])
      .map(normaliserProsjekt)
      .filter((x): x is ProsjektData => x !== null);
    const skjultePresetIder = Array.isArray(d.skjultePresetIder)
      ? d.skjultePresetIder.filter((id): id is string => typeof id === 'string')
      : [];
    const synligePresets = PROSJEKT_PRESETS.filter((p) => !skjultePresetIder.includes(p.id));
    const alle = [...synligePresets, ...brukerProsjekter];
    const fallbackId = alle[0]?.id ?? std.aktivId;
    const aktivId = typeof d.aktivId === 'string' && alle.some((x) => x.id === d.aktivId) ? d.aktivId : fallbackId;
    const krav = typeof d.krav === 'number' && d.krav > 0 && d.krav < 5 ? d.krav : std.krav;
    const tilstand: Record<string, ProsjektTilstand> = {};
    for (const [id, v] of Object.entries(d.tilstand ?? {})) {
      tilstand[id] = { ...tomProsjektTilstand(), ...(v as Partial<ProsjektTilstand>) };
    }
    return skjultePresetIder.length > 0
      ? { brukerProsjekter, aktivId, krav, tilstand, skjultePresetIder }
      : { brukerProsjekter, aktivId, krav, tilstand };
  } catch {
    return std;
  }
}

export function lagreTilstand(lager: Lager, t: AppTilstand): boolean {
  try {
    lager.setItem(LAGER_NOKKEL, JSON.stringify(t));
    return true;
  } catch {
    return false;
  }
}

export function lastInnstillinger(lager: Lager): Innstillinger {
  try {
    const d = JSON.parse(lager.getItem(INNSTILLINGER_NOKKEL) ?? '{}') as Partial<Innstillinger>;
    return {
      geminiNokkel: typeof d.geminiNokkel === 'string' ? d.geminiNokkel : '',
      modell: typeof d.modell === 'string' && d.modell.trim() ? d.modell : STANDARD_MODELL,
    };
  } catch {
    return { geminiNokkel: '', modell: STANDARD_MODELL };
  }
}

export function lagreInnstillinger(lager: Lager, i: Innstillinger): boolean {
  try {
    lager.setItem(INNSTILLINGER_NOKKEL, JSON.stringify(i));
    return true;
  } catch {
    return false;
  }
}

export function nyttProsjektId(): string {
  return `p-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** Returnerer alle synlige prosjekter (ikke-slettede standard-presets + brukerprosjekter, der redigerte presets overstyrer originalen). */
export function hentSynligeProsjekter(t: AppTilstand): ProsjektData[] {
  const skjulte = new Set(t.skjultePresetIder ?? []);
  const brukerIds = new Set(t.brukerProsjekter.map((p) => p.id));
  return [
    ...PROSJEKT_PRESETS.filter((p) => !skjulte.has(p.id) && !brukerIds.has(p.id)),
    ...t.brukerProsjekter,
  ];
}

/** Sletter et prosjekt (enten brukerprosjekt eller standard-preset) og velger neste tilgjengelige prosjekt. */
export function slettProsjektFraTilstand(t: AppTilstand, prosjektId: string): AppTilstand {
  const erPreset = PROSJEKT_PRESETS.some((p) => p.id === prosjektId);
  const nyBrukerProsjekter = t.brukerProsjekter.filter((p) => p.id !== prosjektId);
  const eksisterendeSkjulte = t.skjultePresetIder ?? [];
  const nySkjulte =
    erPreset && !eksisterendeSkjulte.includes(prosjektId)
      ? [...eksisterendeSkjulte, prosjektId]
      : eksisterendeSkjulte;

  const nyTilstand = { ...t.tilstand };
  delete nyTilstand[prosjektId];

  const synligePresets = PROSJEKT_PRESETS.filter((p) => !nySkjulte.includes(p.id));
  let alleIgjen = [...synligePresets, ...nyBrukerProsjekter];

  // Hvis brukeren har slettet absolutt alle prosjekter, opprett et tomt prosjekt så appen alltid har et aktivt prosjekt
  let sluttBrukerProsjekter = nyBrukerProsjekter;
  if (alleIgjen.length === 0) {
    const nytt = tomtProsjekt(nyttProsjektId());
    sluttBrukerProsjekter = [nytt];
    alleIgjen = [nytt];
  }

  const nyAktivId =
    t.aktivId === prosjektId || !alleIgjen.some((p) => p.id === t.aktivId)
      ? alleIgjen[0].id
      : t.aktivId;

  return {
    ...t,
    brukerProsjekter: sluttBrukerProsjekter,
    aktivId: nyAktivId,
    tilstand: nyTilstand,
    ...(nySkjulte.length > 0 ? { skjultePresetIder: nySkjulte } : { skjultePresetIder: undefined }),
  };
}

/** Gjenoppretter alle standard-prosjekter (Case 01–05) som tidligere er slettet. */
export function gjenopprettPresetsITilstand(t: AppTilstand): AppTilstand {
  const kopi = { ...t };
  delete kopi.skjultePresetIder;
  return kopi;
}
