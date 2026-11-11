import type { ProsjektData } from '../data/prosjekter';
import { analyserProsjekt, type ProsjektAnalyse } from './analyse';
import { fmt } from './format';
import { beregnSignaturStatus, type SignaturStatus } from './qa';
import type { ProsjektTilstand } from './lagring';

export type FagFase =
  | 'fase1_skisse_konsept'
  | 'fase2_forprosjekt'
  | 'fase3_detalj'
  | 'fase4_anbud'
  | 'fase5_utforelse'
  | 'fase6_overtakelse_fdv';

export interface FagFaseDefinisjon {
  id: FagFase;
  kortNavn: string;
  langtNavn: string;
  beskrivelse: string;
  budsjettTimerStandard: number;
}

export const FAG_FASER: readonly FagFaseDefinisjon[] = [
  {
    id: 'fase1_skisse_konsept',
    kortNavn: '1. Konsept & VA',
    langtNavn: 'Fase 1: Konsept, Tomt & VA-koter (Myndighetsforutsetninger)',
    beskrivelse: 'Innhenting av VA-kart, koter ITR/IBR, vanntrykk, grunnforhold og tilknytningsvilkår.',
    budsjettTimerStandard: 15,
  },
  {
    id: 'fase2_forprosjekt',
    kortNavn: '2. Forprosjekt & LCC',
    langtNavn: 'Fase 2: Forprosjekt, LCC & Systemvalg',
    beskrivelse: 'Prinsippløsninger, energirammer (NS 3031), 25-års LCC-analyse og tverrfaglig plassbehov.',
    budsjettTimerStandard: 25,
  },
  {
    id: 'fase3_detalj',
    kortNavn: '3. Detaljprosjektering',
    langtNavn: 'Fase 3: Detaljprosjektering & Dimensjonering (Sanitær/Varme/Vent/Sprinkler)',
    beskrivelse: 'Full rørdimensjonering, trykkbudsjett, innregulering, kanaler, SFP og sprinklerberegning.',
    budsjettTimerStandard: 45,
  },
  {
    id: 'fase4_anbud',
    kortNavn: '4. Anbud & NS 3420',
    langtNavn: 'Fase 4: Anbud, Beskrivelse & Mengder iht. NS 3420',
    beskrivelse: 'Teknisk beskrivelse, mengdeuttak, grensesnittsmatriser og tilbudsinnhenting.',
    budsjettTimerStandard: 20,
  },
  {
    id: 'fase5_utforelse',
    kortNavn: '5. Utførelseskontroll',
    langtNavn: 'Fase 5: Byggeplassoppfølging & Rørleggermester-kontroll',
    beskrivelse: 'Befaringer, sjaktsjekk, rør-i-rør, tetthetsprøving og uavhengig kontroll (SAK10).',
    budsjettTimerStandard: 20,
  },
  {
    id: 'fase6_overtakelse_fdv',
    kortNavn: '6. Prøvedrift & FDV',
    langtNavn: 'Fase 6: Prøvedrift, Innregulering, TFM & FDV-sluttkontroll',
    beskrivelse: 'Vannbehandling (VDI 2035), innreguleringsprotokoller, TFM-merking og overlevering.',
    budsjettTimerStandard: 15,
  },
];

export interface TimeRegistrering {
  id: string;
  dato: string;
  timer: number;
  fase: FagFase;
  beskrivelse: string;
  utforende: string;
  opprettetTidspunkt?: string;
}

export interface AiKjoretidLogg {
  id: string;
  tidspunkt: string;
  agentId: string;
  agentNavn: string;
  operasjon: string;
  kjoretidMs: number;
  innspartTidMinutter: number;
  status: 'fullfort' | 'feilet';
}

export interface TidssporingTilstand {
  manuelleTimer: TimeRegistrering[];
  aiLogger: AiKjoretidLogg[];
}

export function tomTidssporing(): TidssporingTilstand {
  return {
    manuelleTimer: [],
    aiLogger: [],
  };
}

/** Standard timepris for rådgivende ingeniør VVS (RIV) / rørleggermester (ekskl. mva) */
export const STANDARD_RIV_TIMEPRIS_KR = 1450;

export interface ProsjektFremdriftInfo {
  prosjektId: string;
  prosjektNavn: string;
  /** Helhetlig fremdriftsgrad 0–100 % */
  fremdriftProsent: number;
  /** Underlagsgrad 0–100 % basert på analyse.datasjekk */
  underlagProsent: number;
  /** QA-sjekkgrad 0–100 % basert på Agent 16 (13 punkter) */
  qaProsent: number;
  /** Veiviser-fullføring 0–100 % (5 steg) */
  veiviserProsent: number;
  /** Kotekontrollstatus mot tilbakeslag */
  koteStatus: 'ok' | 'brudd' | 'mangler';
  /** Signaturstatus fra QA-modulen */
  signaturStatus: SignaturStatus;
  /** Antall åpne mangler (sum av ubesvarte datahints og kritiske alarmer) */
  antallManglerTotalt: number;
  antallRodeAlarmer: number;
  antallGuleAlarmer: number;
  antallDataHints: number;
  /** Er prosjektet godkjent og låst i Gatekeeper */
  erLaast: boolean;
  /** Er prosjektet 100 % klar for signatur */
  erKlarForSignatur: boolean;
  statusTekst: string;
  statusFarge: 'emerald' | 'cyan' | 'amber' | 'rose';
  /** Samlet medgått tid (RIV-timer) */
  timerTotalt: number;
  /** Samlet AI-kjøretid i ms */
  aiKjoretidMsTotalt: number;
  /** Estimert innspart manuell tid (minutter) */
  aiInnspartTidMinutterTotalt: number;
}

/**
 * Beregner helhetlig fremdriftsstatus (0–100 %) og mangelstatistikk for et prosjekt.
 * Vekting:
 * - 30 %: Dataunderlag (datasjekk i analyse.ts)
 * - 25 %: Lov 2 Kotekontroll og hydrostatisk kontroll (OK = 100 %, Brudd = 0 %, Mangler = 30 %)
 * - 25 %: Agent 16 QA-sjekkpunkter (13 punkter før signatur)
 * - 20 %: Prosjektveiviser (5 definerte steg)
 */
export function beregnProsjektFremdrift(
  prosjekt: ProsjektData,
  tilstand?: Partial<ProsjektTilstand> | null,
  krav = 0.95,
  forhandsberegnetAnalyse?: ProsjektAnalyse
): ProsjektFremdriftInfo {
  const analyse = forhandsberegnetAnalyse ?? analyserProsjekt(prosjekt, krav);
  const qa = tilstand?.qa ?? {};
  const steg = tilstand?.steg ?? {};
  const tidssporing = tilstand?.tidssporing;
  const godkjent = tilstand?.godkjent;

  // 1. Dataunderlag
  const totalDatasjekk = analyse.datasjekk.length || 1;
  const okDatasjekk = analyse.datasjekk.filter((d) => d.ok).length;
  const underlagProsent = Math.round((okDatasjekk / totalDatasjekk) * 100);

  // 2. Kotesjekk (Lov 2)
  let koteScore = 0;
  let koteStatus: 'ok' | 'brudd' | 'mangler' = 'mangler';
  if (analyse.lov2Status === 'ok') {
    koteScore = 100;
    koteStatus = 'ok';
  } else if (analyse.lov2Status === 'brudd') {
    koteScore = 0;
    koteStatus = 'brudd';
  } else {
    koteScore = 30;
    koteStatus = 'mangler';
  }

  // 3. QA Sjekklister (Agent 16, 13 punkter)
  const signaturStatus = beregnSignaturStatus(qa);
  const qaProsent = Math.round((signaturStatus.totaltFullfort / signaturStatus.totaltAntall) * 100);

  // 4. Steg i veiviser (steg 1-5)
  const ferdigeSteg = [1, 2, 3, 4, 5].filter((nr) => Boolean(steg[String(nr)])).length;
  const veiviserProsent = Math.round((ferdigeSteg / 5) * 100);

  // Samlet vektet fremdrift: 30% underlag + 25% koter + 25% QA + 20% veiviser
  const råFremdrift =
    underlagProsent * 0.3 +
    koteScore * 0.25 +
    qaProsent * 0.25 +
    veiviserProsent * 0.2;
  const fremdriftProsent = Math.min(100, Math.max(0, Math.round(råFremdrift)));

  // Alarmer & mangler
  const rodeAlarmer = analyse.alarmer.filter((a) => a.alvor === 'rod').length;
  const guleAlarmer = analyse.alarmer.filter((a) => a.alvor === 'gul').length;
  const dataHints = analyse.mangler.length;
  const antallManglerTotalt = rodeAlarmer + guleAlarmer + dataHints;

  const erLaast = Boolean(godkjent?.laast);
  const erKlarForSignatur = signaturStatus.erKlarForSignatur && rodeAlarmer === 0;

  // Status og farge
  let statusTekst = 'Under prosjektering';
  let statusFarge: 'emerald' | 'cyan' | 'amber' | 'rose' = 'cyan';

  if (erLaast) {
    statusTekst = '🔒 Godkjent & Signert';
    statusFarge = 'emerald';
  } else if (rodeAlarmer > 0) {
    statusTekst = `🚨 ${rodeAlarmer} kritisk${rodeAlarmer === 1 ? 't' : 'e'} avvik`;
    statusFarge = 'rose';
  } else if (erKlarForSignatur) {
    statusTekst = '✅ Klar for signatur';
    statusFarge = 'emerald';
  } else if (fremdriftProsent >= 75) {
    statusTekst = 'Sluttkontroll pågår';
    statusFarge = 'cyan';
  } else if (fremdriftProsent >= 40) {
    statusTekst = 'Dimensjonering pågår';
    statusFarge = 'amber';
  } else {
    statusTekst = 'Underlagsinnhenting';
    statusFarge = 'amber';
  }

  // Tidssporing
  const timerTotalt =
    tidssporing?.manuelleTimer?.reduce((sum, post) => sum + (Number(post.timer) || 0), 0) ?? 0;
  const aiKjoretidMsTotalt =
    tidssporing?.aiLogger?.reduce((sum, post) => sum + (Number(post.kjoretidMs) || 0), 0) ?? 0;
  const aiInnspartTidMinutterTotalt =
    tidssporing?.aiLogger?.reduce((sum, post) => sum + (Number(post.innspartTidMinutter) || 0), 0) ?? 0;

  return {
    prosjektId: prosjekt.id,
    prosjektNavn: prosjekt.navn,
    fremdriftProsent,
    underlagProsent,
    qaProsent,
    veiviserProsent,
    koteStatus,
    signaturStatus,
    antallManglerTotalt,
    antallRodeAlarmer: rodeAlarmer,
    antallGuleAlarmer: guleAlarmer,
    antallDataHints: dataHints,
    erLaast,
    erKlarForSignatur,
    statusTekst,
    statusFarge,
    timerTotalt,
    aiKjoretidMsTotalt,
    aiInnspartTidMinutterTotalt,
  };
}

/**
 * Standard eksempel-timer for Case 01–05 slik at nye brukere umiddelbart ser
 * en realistisk tids- og ressursfordeling for VVS-fagene.
 */
export function standardTimerForPreset(prosjektId: string): TimeRegistrering[] {
  const iDag = new Date().toISOString().slice(0, 10);
  switch (prosjektId) {
    case 'forus':
      return [
        {
          id: 't-forus-1',
          dato: iDag,
          fase: 'fase1_skisse_konsept',
          timer: 6.5,
          beskrivelse: 'Innhentet VA-kart fra Stavanger kommune, avstemt koter ITR 12.10 m og vanntrykk 4.5 bar.',
          utforende: 'Kim Jørgensen | RIV',
        },
        {
          id: 't-forus-2',
          dato: iDag,
          fase: 'fase2_forprosjekt',
          timer: 8.0,
          beskrivelse: 'LCC-vurdering NS 3454: Bergvarme vs Fjernvarme for 3 200 m² kontorbygg.',
          utforende: 'Kim Jørgensen | RIV',
        },
        {
          id: 't-forus-3',
          dato: iDag,
          fase: 'fase3_detalj',
          timer: 14.5,
          beskrivelse: 'Dimensjonering av trykkfall forbruksvann (Byggforsk 553.102) og IMI STAD innregulering.',
          utforende: 'Kim Jørgensen | RIV',
        },
        {
          id: 't-forus-4',
          dato: iDag,
          fase: 'fase5_utforelse',
          timer: 5.0,
          beskrivelse: 'Uavhengig kontroll (SAK10) våtrom og kotekontroll mot tilbakeslag (margin 950 mm).',
          utforende: 'Kim Jørgensen | RIV',
        },
      ];
    case 'ostensjoveien':
      return [
        {
          id: 't-ost-1',
          dato: iDag,
          fase: 'fase1_skisse_konsept',
          timer: 12.0,
          beskrivelse: 'Omfattende koteregnskap for 17 600 m² kombinasjonsbygg. Avdekket kjeller U1 under ITR.',
          utforende: 'Kim Jørgensen | RIV',
        },
        {
          id: 't-ost-2',
          dato: iDag,
          fase: 'fase3_detalj',
          timer: 18.0,
          beskrivelse: 'Prosjektering av lukket avløpspumpestasjon (NS-EN 12050) med svanehals over gatenivå.',
          utforende: 'Kim Jørgensen | RIV',
        },
        {
          id: 't-ost-3',
          dato: iDag,
          fase: 'fase3_detalj',
          timer: 16.5,
          beskrivelse: 'Ventilasjonsbalanse iht. TEK17 kap. 13 med separate aggregater for vaskehall og lager.',
          utforende: 'Kim Jørgensen | RIV',
        },
      ];
    default:
      return [
        {
          id: `t-init-${prosjektId}`,
          dato: iDag,
          fase: 'fase1_skisse_konsept',
          timer: 4.0,
          beskrivelse: 'Oppstartsmøte og innhenting av grunnlagsdata, koter og vanntrykk.',
          utforende: 'Kim Jørgensen | RIV',
        },
      ];
  }
}

/** Standard AI-logg for preset-caser */
export function standardAiLoggerForPreset(prosjektId: string): AiKjoretidLogg[] {
  const iDag = new Date().toISOString();
  return [
    {
      id: `ai-log-1-${prosjektId}`,
      tidspunkt: iDag,
      agentId: 'agent-19',
      agentNavn: 'Agent 19: VA & Koteregnskap',
      operasjon: 'Kotekontroll mot tilbakeslag & 950 mm-analyse',
      kjoretidMs: 1420,
      innspartTidMinutter: 40,
      status: 'fullfort',
    },
    {
      id: `ai-log-2-${prosjektId}`,
      tidspunkt: iDag,
      agentId: 'agent-16',
      agentNavn: 'Agent 16: Djevelens Advokat (QA)',
      operasjon: 'Full reversert QA-kontroll og signaturverifisering',
      kjoretidMs: 2150,
      innspartTidMinutter: 60,
      status: 'fullfort',
    },
    {
      id: `ai-log-3-${prosjektId}`,
      tidspunkt: iDag,
      agentId: 'epost',
      agentNavn: 'Intelligent E-postfordeler',
      operasjon: 'Generering og splitting til 3 etatsspesifikke e-postutkast',
      kjoretidMs: 1680,
      innspartTidMinutter: 35,
      status: 'fullfort',
    },
  ];
}

/**
 * Genererer komplett rapport i ren Markdown tilpasset visuell PDF-utskrift og NotebookLM.
 */
export function genererFremdriftOgTidMarkdown(opts: {
  prosjekt: ProsjektData;
  fremdrift: ProsjektFremdriftInfo;
  analyse: ProsjektAnalyse;
  tidssporing: TidssporingTilstand;
  dato?: string;
}): string {
  const { prosjekt, fremdrift, analyse, tidssporing } = opts;
  const dato = opts.dato ?? new Date().toLocaleDateString('no-NO', { year: 'numeric', month: 'long', day: 'numeric' });

  const timerPerFase: Record<FagFase, number> = {
    fase1_skisse_konsept: 0,
    fase2_forprosjekt: 0,
    fase3_detalj: 0,
    fase4_anbud: 0,
    fase5_utforelse: 0,
    fase6_overtakelse_fdv: 0,
  };

  for (const post of tidssporing.manuelleTimer) {
    if (timerPerFase[post.fase] !== undefined) {
      timerPerFase[post.fase] += Number(post.timer) || 0;
    }
  }

  const sumTimer = tidssporing.manuelleTimer.reduce((s, p) => s + (Number(p.timer) || 0), 0);
  const honorarKr = Math.round(sumTimer * STANDARD_RIV_TIMEPRIS_KR);
  const sumInnspartTimer = Math.round((fremdrift.aiInnspartTidMinutterTotalt / 60) * 10) / 10;

  const linjer: string[] = [
    `# PROSJEKTOVERSIKT, FREMDRIFT & TIDSSPORING`,
    `**Standarder:** Stegstandarden ver. 1.2 · Bygg21 · NS 3451 · Statsbygg PA 0802 · TEK17`,
    ``,
    `## Prosjektopplysninger`,
    `- **Prosjekt:** ${prosjekt.navn}`,
    `- **Adresse / Sted:** ${prosjekt.sted || 'Ikke oppgitt'}`,
    `- **Matrikkel (Gnr/Bnr):** ${prosjekt.matrikkel || 'Ikke oppgitt'}`,
    `- **Oppvarmet BRA:** ${prosjekt.bra ? `${prosjekt.bra} m²` : 'Ikke oppgitt'}`,
    `- **Bygningskategori:** ${prosjekt.bygningstype || 'Ikke oppgitt'}`,
    `- **Dato for rapport:** ${dato}`,
    `- **Utførende RIV:** Kim Jørgensen | Rørleggermester & Rådgivende Ingeniør VVS (RIV)`,
    ``,
    `## 1. Nøkkeltall & Fremdriftsstatus`,
    `- **Helhetlig fremdriftsgrad:** **${fremdrift.fremdriftProsent} %**`,
    `- **Status:** **${fremdrift.statusTekst}**`,
    `- **Signaturstatus:** ${fremdrift.signaturStatus.badgeTekst}`,
    `- **Underlagsgrad (Datasjekk):** ${fremdrift.underlagProsent} % oppfylt (${analyse.datasjekk.filter((d) => d.ok).length} av ${analyse.datasjekk.length} punkter OK)`,
    `- **Lov 2 Kotekontroll mot tilbakeslag:** ${fremdrift.koteStatus === 'ok' ? '✅ Godkjent (≥ 0,95 m / 0,90 m TEK17)' : fremdrift.koteStatus === 'brudd' ? '🔴 BRUDD: Krever avløpspumpestasjon (NS-EN 12050)' : '⚠️ Mangler kotedata'}`,
    `- **Åpne mangler og avvik:** ${fremdrift.antallRodeAlarmer} kritiske avvik · ${fremdrift.antallGuleAlarmer} gule varsler · ${fremdrift.antallDataHints} underlagshints`,
    `- **Medgåtte RIV-timer:** ${fmt(sumTimer, 1)} timer (${fmt(honorarKr, 0)} kr ekskl. mva ved ${STANDARD_RIV_TIMEPRIS_KR} kr/t)`,
    `- **AI-agent effektivitet:** ${tidssporing.aiLogger.length} analyser kjørt · ${fmt(sumInnspartTimer, 1)} timer manuell beregningstid innspart`,
    ``,
    `## 2. Medgåtte RIV-timer fordelt på Fagfaser`,
    `| Fagfase | Medgåtte timer | Standard budsjett | Andel (%) | Status |`,
    `| :--- | :---: | :---: | :---: | :---: |`,
  ];

  for (const def of FAG_FASER) {
    const medgaatt = timerPerFase[def.id] || 0;
    const andel = sumTimer > 0 ? ((medgaatt / sumTimer) * 100).toFixed(1) : '0,0';
    const status = medgaatt > def.budsjettTimerStandard ? '⚠️ Over budsjett' : '✅ Innenfor budsjett';
    linjer.push(`| ${def.kortNavn} | ${fmt(medgaatt, 1)} t | ${def.budsjettTimerStandard} t | ${andel} % | ${status} |`);
  }

  linjer.push(
    `| **TOTALT MEDGÅTT** | **${fmt(sumTimer, 1)} t** | **130 t** | **100 %** | **${honorarKr.toLocaleString('no-NO')} kr eks. mva** |`,
    ``,
    `## 3. Loggførte Arbeidsøkter & Fagnotater`,
    `| Dato | Utførende | Fagfase | Beskrivelse | Timer |`,
    `| :--- | :--- | :--- | :--- | :---: |`
  );

  if (tidssporing.manuelleTimer.length === 0) {
    linjer.push(`| - | Ingen timer registrert ennå | - | - | 0 t |`);
  } else {
    for (const post of tidssporing.manuelleTimer) {
      const faseDef = FAG_FASER.find((f) => f.id === post.fase);
      linjer.push(`| ${post.dato} | ${post.utforende} | ${faseDef?.kortNavn ?? post.fase} | ${post.beskrivelse.replace(/\|/g, '-')} | ${fmt(post.timer, 1)} t |`);
    }
  }

  linjer.push(
    ``,
    `## 4. AI-Agenters Analyselogg & Beregningsytelse`,
    `| Tidspunkt | Agent | Operasjon / Analyse | Kjøretid | Innspart tid | Status |`,
    `| :--- | :--- | :--- | :---: | :---: | :---: |`
  );

  if (tidssporing.aiLogger.length === 0) {
    linjer.push(`| - | Ingen AI-kjøringer logget ennå | - | 0 ms | 0 min | - |`);
  } else {
    for (const logg of tidssporing.aiLogger) {
      const tidStr = logg.tidspunkt.slice(0, 16).replace('T', ' ');
      linjer.push(`| ${tidStr} | ${logg.agentNavn} | ${logg.operasjon.replace(/\|/g, '-')} | ${fmt(logg.kjoretidMs / 1000, 2)} s | ca. ${logg.innspartTidMinutter} min | ${logg.status === 'fullfort' ? '✅ Fullført' : '❌ Feilet'} |`);
    }
  }

  linjer.push(
    ``,
    `## 5. Åpne Mangler & Sanity Check-tiltaksliste`,
    fremdrift.antallManglerTotalt === 0
      ? `> ✅ **Gratulerer!** Ingen åpne mangler eller kritiske avvik registrert på prosjektet.`
      : `> ⚠️ **OBS:** Det gjenstår ${fremdrift.antallManglerTotalt} åpne punkter som må avklares før endelig signatur.`
  );

  if (analyse.alarmer.length > 0) {
    linjer.push(``, `### Registrerte Alarmer & Tekniske Avvik:`);
    for (const alarm of analyse.alarmer) {
      linjer.push(`- ${alarm.alvor === 'rod' ? '🔴 **KRITISK:**' : '🟡 **ADVARSEL:**'} ${alarm.tekst}`);
    }
  }

  if (analyse.mangler.length > 0) {
    linjer.push(``, `### Manglende Prosjekteringsunderlag (Lov 1 HINT):`);
    for (const mangel of analyse.mangler) {
      linjer.push(`- ⚠️ ${mangel}`);
    }
  }

  linjer.push(
    ``,
    `---`,
    `*Rapport generert av VVS KEM PRO · Kim Jørgensen | Rørleggermester & RIV*`
  );

  return linjer.join('\n');
}
