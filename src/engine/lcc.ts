/**
 * Livssykluskostnad (LCC) i henhold til prinsippene i NS 3454: nåverdi av drift og reinvesteringer.
 */

/** Nåverdifaktor for en jevn årlig betaling: (1 − (1+r)^−n) / r. */
export function nvFaktor(rente: number, aar: number): number {
  return rente === 0 ? aar : (1 - Math.pow(1 + rente, -aar)) / rente;
}

/** Diskonteringsfaktor for en enkeltbetaling i år t: (1+r)^−t. */
export function diskontering(rente: number, aar: number): number {
  return Math.pow(1 + rente, -aar);
}

export interface Reinvestering {
  aar: number;
  belop: number;
}

export interface Alternativ {
  navn: string;
  capex: number;
  /** Årlig drift (energi + service) [kr/år] */
  opexAar: number;
  reinvesteringer?: readonly Reinvestering[];
}

export interface LccResultat {
  navn: string;
  capex: number;
  nvOpex: number;
  nvReinvest: number;
  lcc: number;
}

export function lcc(a: Alternativ, rente: number, aar: number): LccResultat {
  const nvOpex = a.opexAar * nvFaktor(rente, aar);
  const nvReinvest = (a.reinvesteringer ?? []).reduce(
    (s, r) => s + r.belop * diskontering(rente, r.aar),
    0,
  );
  return { navn: a.navn, capex: a.capex, nvOpex, nvReinvest, lcc: a.capex + nvOpex + nvReinvest };
}

/** Enkel tilbakebetalingstid [år] = merinvestering / årlig besparelse. null når det ikke er besparelse. */
export function enkelTilbakebetaling(
  merinvestering: number,
  aarligBesparelse: number,
): number | null {
  return aarligBesparelse > 0 ? merinvestering / aarligBesparelse : null;
}
