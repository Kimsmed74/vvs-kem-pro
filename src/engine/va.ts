/**
 * Utvendig VA: koteregnskap, tilbakeslagskontroll og overvann.
 *
 * KILDER (verifisert mot "Byggteknisk forskrift (TEK17) med veiledning", DiBK-utskrift 05.11.2026):
 *  - § 15-6 (3) + preakseptert ytelse 1: vannstanden i laveste vannlås og innvendige kummer/tanker
 *    skal ligge minimum 0,90 m over innvendig topp av hovedledningen i forgreningspunktet.
 *  - § 15-8 (3) + preakseptert ytelse 1–2: tilsvarende 0,90 m for overvann/felles avløp. Der overhøyden
 *    ikke er praktisk mulig må kompenserende tiltak (tilbakestrømningssikring, pumping) vurderes.
 *
 * MERK: Prosjektdokumentene i "nye instrukser 19 agenter" bruker 950 mm og henviser til § 15-7.
 * Det samsvarer ikke med TEK17-teksten: § 15-7 gjelder utvendig vannforsyning, og kravet er 0,90 m.
 * 0,95 m kan være en strengere kommunal VA-norm, men er ikke funnet i prosjektmappen. Kravet er derfor
 * en parameter: standardverdi 0,90 m (TEK17), og 0,95 m kan velges eksplisitt.
 */

export const OVERHOYDE_TEK17 = 0.9;
export const OVERHOYDE_DOKUMENTER = 0.95;

export interface KoteInput {
  /** Innvendig bunn rør i kommunal kum/hovedledning [m, NN2000] */
  ibrKum: number;
  /** Innvendig topp rør i kommunal kum/hovedledning [m, NN2000] */
  itrKum: number;
  /** Stikkledningens lengde [m] */
  stikkLengde: number;
  /** Fall på stikkledning [m/m], f.eks. 1/60 */
  fall: number;
  /** Kote laveste sluk/vannlås, antatt lik topp ferdig gulv (OK FG) [m] */
  laveste: number;
  /** Planlagt kote på bunnledning ved utgang grunnmur [m] (valgfri) */
  planlagtBunnledning?: number;
  /** Krav til overhøyde [m]. Standard 0,90 (TEK17). */
  krav?: number;
}

export interface KoteResultat {
  /** Høydetap/-stigning i grøft = lengde × fall [m] */
  hoydeIGroft: number;
  /** Laveste mulige kote på bunnledning ved utgang grunnmur = IBR + L·fall [m] */
  minKoteUtgang: number;
  /** Margin = laveste sluk − ITR i kum [m] */
  margin: number;
  krav: number;
  /** true når margin ≥ krav */
  selvfallOk: boolean;
  /** Hvor mye margin mangler til kravet [m], 0 når OK */
  mangel: number;
  /** true når planlagt bunnledning ligger lavere enn minimum (motfall). Udefinert uten planlagt kote. */
  motfall?: boolean;
}

/**
 * Bruker topp ferdig gulv som tilnærming for vannlåsens vannstand. TEK17 måler fra vannstanden i
 * laveste vannlås, som ligger litt under sluk-risten, så metoden er svakt optimistisk.
 */
export function koteRegnskap(i: KoteInput): KoteResultat {
  const krav = i.krav ?? OVERHOYDE_TEK17;
  const hoydeIGroft = i.stikkLengde * i.fall;
  const margin = i.laveste - i.itrKum;
  const selvfallOk = margin >= krav - 1e-9;
  return {
    hoydeIGroft,
    minKoteUtgang: i.ibrKum + hoydeIGroft,
    margin,
    krav,
    selvfallOk,
    mangel: selvfallOk ? 0 : krav - margin,
    motfall:
      i.planlagtBunnledning === undefined
        ? undefined
        : i.planlagtBunnledning < i.ibrKum + hoydeIGroft - 1e-9,
  };
}

export interface Flate {
  navn: string;
  /** Areal [m²] */
  areal: number;
  /** Avrenningsfaktor φ [–] */
  phi: number;
}

/** Redusert areal A_red = Σ(A·φ) [m²]. */
export function reduserAreal(flater: readonly Flate[]): number {
  return flater.reduce((s, f) => s + f.areal * f.phi, 0);
}

/** Rasjonell metode: q = i · A_red, i [l/(s·ha)], A_red [m²] → [l/s]. */
export function regnavrenning(intensitetLsHa: number, aRedM2: number): number {
  return intensitetLsHa * (aRedM2 / 10000);
}

/** Klimajustert regnintensitet = i · klimafaktor. */
export function klimajustert(intensitet: number, klimafaktor: number): number {
  return intensitet * klimafaktor;
}

/**
 * Enkel fordrøyningsvolum [m³] = (q inn − q ut) · varighet. Forenklet: konstant intensitet over
 * varigheten. En full dimensjonering bruker IVF-kurver og finner varighet som gir størst volum.
 */
export function fordroyningsVolum(qInn: number, qUt: number, varighetMin: number): number {
  return (Math.max(0, qInn - qUt) * varighetMin * 60) / 1000;
}

/** Margin = laveste sluk/vannlås − ITR i kommunal kum [m], og om den oppfyller kravet. */
export function tilbakeslagMargin(
  lavesteKote: number,
  itrKum: number,
  krav: number = OVERHOYDE_TEK17,
): { margin: number; ok: boolean; mangel: number } {
  const margin = lavesteKote - itrKum;
  const ok = margin >= krav - 1e-9;
  return { margin, ok, mangel: ok ? 0 : krav - margin };
}
