/**
 * Sanitær – spillvann og overvann.
 * Formler fra "San avløp.xlsx" (Kurve A/B) og "San.ov.xlsx".
 */

/** Sporadisk mengde qS [l/s] = MAX(q1, 0,55·ΣqN^0,46). */
export function spillvannQs(q1: number, sumQn: number): number {
  if (!sumQn || sumQn <= 0) return q1 || 0;
  return Math.max(q1 || 0, 0.55 * Math.pow(sumQn, 0.46));
}

/** Dimensjonerende mengde qdim [l/s] = qS + Σqkont. */
export function spillvannQdim(q1: number, sumQn: number, sumQkont: number): number {
  return spillvannQs(q1, sumQn) + (sumQkont || 0);
}

export type Ledningstype = 'Ventilert' | 'Uventilert';

/**
 * Kapasitetsgrenser [l/s] per dimensjon.
 *
 * MERK: Verdiene er overtatt uendret fra prototypen Spillvannsdimensjonering.html.
 * De er IKKE verifisert mot Byggforsk 553.111 / NS 3056 (kilden ligger ikke som
 * lesbar tekst i prosjektmappen) og må kontrolleres mot standarden før bruk.
 */
export function maksKapasitet(dim: number, type: Ledningstype, fall: number): number {
  if (dim === 50) return 0.5;
  if (dim === 75) return 0.9;
  if (dim === 110) {
    if (type === 'Uventilert') return 1.8;
    return fall >= 0.016 ? 3.2 : 2.5;
  }
  if (dim === 125) return 4.5;
  if (dim === 160) return 8.0;
  return 10.0;
}

/** Overvann Q [l/s] = A · i · ψ. */
export function overvann(
  lengde: number,
  bredde: number,
  regnintensitet: number,
  avlopskoeffisient: number,
): { areal: number; q: number } {
  const areal = lengde * bredde;
  return { areal, q: areal * regnintensitet * avlopskoeffisient };
}
