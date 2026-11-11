/**
 * Energi og bygningsfysikk (forenklet) – Forus-fasit.
 * Kilde for varmesentral: TEK17 § 14-4 (2), preaksepterte ytelser (verifisert).
 */

export interface Bygningsdel {
  navn: string;
  /** Areal [m²] */
  areal: number;
  /** U-verdi [W/(m²·K)] */
  u: number;
}

/** Transmisjonsvarmetap Σ(U·A) + ψ''·A_BRA [W/K]. */
export function transmisjonstap(
  deler: readonly Bygningsdel[],
  kuldebroVerdi: number,
  braM2: number,
): { deler: number; kuldebro: number; total: number } {
  const d = deler.reduce((s, x) => s + x.u * x.areal, 0);
  const k = kuldebroVerdi * braM2;
  return { deler: d, kuldebro: k, total: d + k };
}

/**
 * Minimumsareal for varmesentral [m²] = 10 + 1 % av oppvarmet BRA, opptil 100 m².
 * Gjelder bygning over 1 000 m² oppvarmet BRA (§ 14-4 (2)); under det returneres null.
 * Øvrige preaksepterte ytelser: takhøyde ≥ 2,5 m og fri dørbredde ≥ 1,0 m.
 */
export function minAreaVarmesentral(braM2: number): number | null {
  if (braM2 <= 1000) return null;
  return Math.min(10 + 0.01 * braM2, 100);
}
