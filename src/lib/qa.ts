import type { ProsjektData } from '../data/prosjekter';
import type { ProsjektAnalyse } from './analyse';

/** Kontrollpunkter før signatur (Agent 16, steg 6 i systemmanualen). Avkrysses manuelt per prosjekt. */
export const QA_PUNKTER = [
  { id: 'sp-1', tekst: 'Kotekontroll mot tilbakeslag (950 mm / TEK17 0,90 m) regnet baklengs og kontrollert' },
  { id: 'sp-2', tekst: 'Alle gulv/sluk under kravet er løst med pumpestasjon (NS-EN 12050) eller godkjent tilbakeslagssikring' },
  { id: 'sp-3', tekst: 'Beredervolum er dimensjonert for spissbelastning (ikke standardstørrelse)' },
  { id: 'sp-4', tekst: 'Separate ventilasjonsaggregater/gjenvinnere for kjøkken, vaskehall, helse og kontor der det er relevant' },
  { id: 'sp-5', tekst: 'Branntromler ligger i rømningsvei med reell ganglinje under 30 m; sprinklertrykk er mot Q/p-måling' },
  { id: 'sp-6', tekst: 'Teknisk rom/varmesentral er kontrollert mot TEK17 § 14-4 (10 m² + 1 % BRA)' },
] as const;

/** Punkter i Agent 16 steg 4 (logisk brist / sanity check). Avkrysses manuelt per prosjekt. */
export const SANITY_PUNKTER = [
  { id: 'sa-1', tekst: 'Kun 45° Y-grenrør i liggende bunnledning (aldri 88° T-rør), 2 × 45° bend i foten av stammer' },
  { id: 'sa-2', tekst: 'Stake-/spylegren ved foten av alle stammer og før utgang grunnmur' },
  { id: 'sa-3', tekst: 'Utvendig stoppekran (bakgekran) ved tomtegrense/anboring er med' },
  { id: 'sa-4', tekst: 'Sandfangkummer med dykket utløp og slamsump før fordrøyning/overvannsnett' },
  { id: 'sa-5', tekst: 'Olje-/fettutskiller er med der prosessen krever det (vaskehall, storkjøkken)' },
  { id: 'sa-6', tekst: 'BA-tilbakeslagssikring (væskekategori 4) der kjemikalier/verksted er tilkoblet' },
  { id: 'sa-7', tekst: 'Branntromler og sprinkler er med og ligger der tegningene faktisk har plass' },
] as const;

/** Beregner areal-krav til teknisk rom / varmesentral etter TEK17 § 14-4 (10 m² + 1 % BRA). */
export function beregnKravVarmesentralM2(bra: number | null | undefined): number | null {
  if (bra === null || bra === undefined || isNaN(bra) || bra <= 0) return null;
  return Math.round(10 + 0.01 * bra);
}

export interface KotekontrollStatus {
  ok: boolean;
  status: 'mangler_data' | 'ikke_oppfylt' | 'oppfylt';
  advarsel: string | null;
  detalj: string;
}

/**
 * Kontrollerer reell status for kotekontroll mot tilbakeslag (sp-1) basert på prosjektets koter og analyse.
 * Viser varsel hvis ITK mangler eller laveste sluk har negativ margin uten pumpestasjon/tilbakeslagssikring.
 */
export function vurderKotekontrollStatus(
  prosjekt: ProsjektData,
  analyse: ProsjektAnalyse,
  qa: Record<string, boolean> = {}
): KotekontrollStatus {
  const harItk = typeof prosjekt.koter?.itrKum === 'number' && !isNaN(prosjekt.koter.itrKum);
  const harGulv = Array.isArray(prosjekt.koter?.gulv) && prosjekt.koter.gulv.length > 0;

  if (!harItk || !harGulv) {
    return {
      ok: false,
      status: 'mangler_data',
      advarsel: '⚠️ Mangler kotedata / Ikke oppfylt',
      detalj: 'Kote ITK/ITR eller gulvkoter er ikke fylt ut i prosjektet.',
    };
  }

  const harUnderKravMargin =
    analyse.gulvKontroller.length > 0 &&
    analyse.gulvKontroller.some((g) => !g.ok || g.margin < (g.krav ?? 0.95));
  const harBekreftetPumpe =
    Boolean(qa['sp-2']) ||
    /pumpe|tilbakeslag|svanehals|løft/i.test(
      `${prosjekt.beskrivelse ?? ''} ${prosjekt.feller?.join(' ') ?? ''} ${prosjekt.notater ?? ''}`
    );

  if (harUnderKravMargin && !harBekreftetPumpe) {
    return {
      ok: false,
      status: 'ikke_oppfylt',
      advarsel: '🔴 AVVIK: Krever pumpestasjon/tilbakeslagssikring',
      detalj:
        'Margin mot ITR er under 0,95 m (eller 0,90 m TEK17) – krever avløpspumpestasjon (NS-EN 12050) eller godkjent tilbakeslagssikring.',
    };
  }

  return {
    ok: true,
    status: 'oppfylt',
    advarsel: null,
    detalj: 'Kotekontroll mot tilbakeslag er beregnet og oppfylt.',
  };
}

export interface SignaturStatus {
  sanitySjekket: number;
  qaSjekket: number;
  totaltFullfort: number;
  totaltAntall: number;
  erKlarForSignatur: boolean;
  badgeTekst: string;
  badgeKlasse: string;
}

/**
 * Beregner samlet signatur-status på tvers av de 7 sanity-punktene og 6 QA-punktene (totalt 13).
 */
export function beregnSignaturStatus(qa: Record<string, boolean> = {}): SignaturStatus {
  const sanitySjekket = SANITY_PUNKTER.filter((p) => Boolean(qa[p.id])).length;
  const qaSjekket = QA_PUNKTER.filter((p) => Boolean(qa[p.id])).length;
  const totaltFullfort = sanitySjekket + qaSjekket;
  const totaltAntall = SANITY_PUNKTER.length + QA_PUNKTER.length; // 13
  const erKlarForSignatur = totaltFullfort === totaltAntall;

  return {
    sanitySjekket,
    qaSjekket,
    totaltFullfort,
    totaltAntall,
    erKlarForSignatur,
    badgeTekst: erKlarForSignatur
      ? '✅ KLAR FOR SIGNATUR'
      : `⏳ UNDER KONTROLL (${totaltFullfort} av ${totaltAntall} fullført)`,
    badgeKlasse: erKlarForSignatur
      ? 'border border-emerald-500 bg-emerald-950/80 text-emerald-300'
      : 'border border-amber-600/70 bg-amber-950/60 text-amber-300',
  };
}

