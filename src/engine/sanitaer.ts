/**
 * Sanitær – forbruksvann (kaldt/varmt).
 * Formler hentet fra "vannledningsdimensjonering- trykkfallsberegning.xlsx"
 * og prototypen vvs_r_rdimensjonering_trykkfallskalkulator_pro.html.
 */

export interface RorDim {
  /** Utvendig diameter [mm] */
  dim: number;
  /** Godstykkelse [mm] */
  t: number;
  /** Innvendig diameter [mm] */
  di: number;
}

/** Oppslagstabell for kobberrør (fra Excel-arket). */
export const ROR_TABELL: readonly RorDim[] = [
  { dim: 10, t: 1.0, di: 8.0 },
  { dim: 12, t: 1.0, di: 10.0 },
  { dim: 15, t: 1.2, di: 12.6 },
  { dim: 18, t: 1.2, di: 15.6 },
  { dim: 22, t: 1.5, di: 19.0 },
  { dim: 28, t: 1.5, di: 25.0 },
  { dim: 35, t: 2.0, di: 31.0 },
  { dim: 42, t: 2.0, di: 38.0 },
  { dim: 54, t: 2.0, di: 50.0 },
];

export function innvendigDiameter(dim: number): number {
  const funnet = ROR_TABELL.find((r) => r.dim === dim);
  if (!funnet) throw new Error(`Ukjent rørdimensjon: ${dim} mm`);
  return funnet.di;
}

/** Maks anbefalt vannhastighet [m/s]. */
export const MAKS_HASTIGHET_FORDELING = 2.0;

export interface Trykkbudsjett {
  /** Trykk i hovedledning [kPa] */
  hovedtrykk: number;
  /** Nødvendig resttrykk før armatur [kPa] */
  resttrykk: number;
  /** Løftehøyde [m] */
  loftehoyde: number;
  /** Større enkeltmotstander [kPa] */
  enkeltmotstand: number;
  /** Andel av disponibelt trykk avsatt til rørdeler [%] */
  rordelerProsent: number;
  /** Total rørlengde [m] */
  rorlengde: number;
}

export interface TrykkbudsjettResultat {
  loftetrykk: number;
  dispFriksjonOgEnkelt: number;
  rordeler: number;
  dispFriksjon: number;
  /** Midlere rørfriksjon [kPa/m]; null når rørlengde er 0 */
  midlereR: number | null;
}

export function beregnTrykkbudsjett(b: Trykkbudsjett): TrykkbudsjettResultat {
  const loftetrykk = b.loftehoyde * 9.81;
  const dispFriksjonOgEnkelt = b.hovedtrykk - b.resttrykk - loftetrykk - b.enkeltmotstand;
  const rordeler = dispFriksjonOgEnkelt * (b.rordelerProsent / 100);
  const dispFriksjon = dispFriksjonOgEnkelt - rordeler;
  const midlereR = b.rorlengde > 0 ? dispFriksjon / b.rorlengde : null;
  return { loftetrykk, dispFriksjonOgEnkelt, rordeler, dispFriksjon, midlereR };
}

/** Maks sannsynlig vannmengde qS [l/s] (Excel: qN1 + 0,015·(ΣqN−qN1) + 0,17·√(ΣqN−qN1)). */
export function beregnQs(sumQn: number, qn1: number): number {
  if (sumQn <= 0) return 0;
  const diff = Math.max(0, sumQn - qn1);
  return qn1 + 0.015 * diff + 0.17 * Math.sqrt(diff);
}

export interface Strekk {
  navn: string;
  sumQn: number;
  qn1: number;
  qkont: number;
  /** Utvendig diameter [mm] */
  dim: number;
  /** Lengde [m] */
  l: number;
}

export interface StrekkResultat extends Strekk {
  qS: number;
  qdim: number;
  di: number;
  /** Vannhastighet [m/s] */
  hastighet: number;
  /** Spesifikt trykkfall [kPa/m] */
  R: number;
  /** Trykkfall på strekket [kPa] */
  rxl: number;
}

export function beregnStrekk(s: Strekk): StrekkResultat {
  const qS = beregnQs(Math.max(0, s.sumQn), Math.max(0, s.qn1));
  const qdim = qS + Math.max(0, s.qkont);
  const di = innvendigDiameter(s.dim);
  const hastighet = qdim > 0 ? (4000 * qdim) / (Math.PI * di * di) : 0;
  const R = qdim > 0 ? 3.62315 * Math.pow(qdim * 3600, 1.70651) * Math.pow(di, -4.64237) : 0;
  return { ...s, qS, qdim, di, hastighet, R, rxl: R * Math.max(0, s.l) };
}

export function sumStrekk(rader: readonly StrekkResultat[]): { lengde: number; rxl: number } {
  return rader.reduce((acc, r) => ({ lengde: acc.lengde + r.l, rxl: acc.rxl + r.rxl }), {
    lengde: 0,
    rxl: 0,
  });
}

/** Minste rørdimensjon som holder hastigheten ≤ grense. Returnerer største dimensjon om ingen holder. */
export function autoDimensjon(
  s: Strekk,
  maksHastighet: number = MAKS_HASTIGHET_FORDELING,
): number {
  for (const r of ROR_TABELL) {
    if (beregnStrekk({ ...s, dim: r.dim }).hastighet <= maksHastighet) return r.dim;
  }
  return ROR_TABELL[ROR_TABELL.length - 1].dim;
}

export interface KoblingsStrekk extends Strekk {
  /** Trykkfall i armatur [kPa] */
  armaturTap: number;
}

export interface KoblingsResultat extends StrekkResultat {
  armaturTap: number;
  /** Trykkfall i kretsen = R·l + armaturtap [kPa] */
  kretsTap: number;
}

/** Koblingsledning (Excel-arket "koblingsledning"): krets = R·l + armaturtrykkfall. */
export function beregnKobling(s: KoblingsStrekk): KoblingsResultat {
  const b = beregnStrekk(s);
  return { ...b, armaturTap: s.armaturTap, kretsTap: b.rxl + s.armaturTap };
}

/** Indeks til ugunstigste krets (høyest trykkfall), eller -1 om listen er tom. */
export function ugunstigsteKrets(rader: readonly KoblingsResultat[]): number {
  let best = -1;
  rader.forEach((r, i) => {
    if (best === -1 || r.kretsTap > rader[best].kretsTap) best = i;
  });
  return best;
}

/** Eksempel fra Excel-arket "koblingsledning" (rad 17–19). */
export const EKSEMPEL_KOBLING: readonly KoblingsStrekk[] = [
  { navn: 'badebatteri', sumQn: 0, qn1: 0, qkont: 0.3, dim: 15, l: 2.3, armaturTap: 130 },
  { navn: 'servantbatteri', sumQn: 0, qn1: 0, qkont: 0.1, dim: 15, l: 3.7, armaturTap: 50 },
  { navn: 'oppvaskbatteri', sumQn: 0, qn1: 0, qkont: 0.2, dim: 15, l: 2.8, armaturTap: 100 },
];

/** Standardverdier fra Excel-arket "fordelingsledning". */
export const EKSEMPEL_BUDSJETT: Trykkbudsjett = {
  hovedtrykk: 387,
  resttrykk: 150,
  loftehoyde: 15,
  enkeltmotstand: 12,
  rordelerProsent: 20,
  rorlengde: 49.3,
};

export const EKSEMPEL_FORDELING: readonly Strekk[] = [
  { navn: 'koblingsledning', sumQn: 0.3, qn1: 0.3, qkont: 0.0, dim: 15, l: 2.3 },
  { navn: 'g-h', sumQn: 0.6, qn1: 0.3, qkont: 0.0, dim: 18, l: 2.5 },
  { navn: 'f-g', sumQn: 1.2, qn1: 0.3, qkont: 0.0, dim: 22, l: 3.0 },
  { navn: 'e-f', sumQn: 2.6, qn1: 0.3, qkont: 0.0, dim: 28, l: 3.0 },
  { navn: 'd-e', sumQn: 4.4, qn1: 0.3, qkont: 0.0, dim: 28, l: 3.0 },
  { navn: 'c-d', sumQn: 5.9, qn1: 0.3, qkont: 0.2, dim: 28, l: 3.5 },
  { navn: 'b-c', sumQn: 15.9, qn1: 0.3, qkont: 0.2, dim: 35, l: 10.0 },
  { navn: 'a-b', sumQn: 23.0, qn1: 0.3, qkont: 0.6, dim: 42, l: 22.0 },
];
