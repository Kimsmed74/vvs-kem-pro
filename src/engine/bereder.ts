/**
 * Varmtvannsberedning (VVB).
 * Formler fra "San vvb.xlsx": E_døgn = Σ(antall·kWh/enhet), P = E/t, V = P·3600/(c·ΔT).
 */

export interface Utstyrslinje {
  navn: string;
  antall: number;
  /** kWh per enhet per døgn */
  kwhPerEnhet: number;
}

export interface BerederInput {
  linjer: readonly Utstyrslinje[];
  /** Ladetid [timer] */
  ladetid: number;
  /** Spesifikk varmekapasitet vann [kJ/(kg·K)] */
  c: number;
  /** Temperaturdifferanse kaldtvann → bereder [K] */
  deltaT: number;
}

export interface BerederResultat {
  kwhDogn: number;
  /** Kolbeeffekt [kW] */
  effekt: number;
  /** Beredervolum [liter] */
  volum: number;
}

export function beregnBereder(i: BerederInput): BerederResultat {
  const kwhDogn = i.linjer.reduce((s, l) => s + l.antall * l.kwhPerEnhet, 0);
  const effekt = i.ladetid > 0 ? kwhDogn / i.ladetid : 0;
  const volum = i.c * i.deltaT > 0 ? (effekt * 3600) / (i.c * i.deltaT) : 0;
  return { kwhDogn, effekt, volum };
}

/**
 * Varmtvannsvolum [liter] ved beredertemperatur som trengs for å levere et gitt volum blandet vann.
 * Energibalanse ved blanding: V_varm = V_bl · (T_bl − T_kald) / (T_bereder − T_kald).
 * Dekker kun tappingen som er oppgitt (ikke tap, sirkulasjon eller annen last).
 */
export function varmtvannsVolum(
  blandetLiter: number,
  blandetTemp: number,
  berederTemp: number,
  kaldtTemp: number,
): number {
  const nevner = berederTemp - kaldtTemp;
  if (nevner <= 0) return 0;
  return (blandetLiter * (blandetTemp - kaldtTemp)) / nevner;
}

/** Eksempel fra "San vvb.xlsx" (Ark1). */
export const EKSEMPEL_BEREDER: BerederInput = {
  linjer: [
    { navn: 'Servant', antall: 6, kwhPerEnhet: 0.5 },
    { navn: 'Rengjøring (m²)', antall: 2855, kwhPerEnhet: 0.015 },
  ],
  ladetid: 4,
  c: 4.2,
  deltaT: 50,
};
