/**
 * Faglige beregningsmotorer for Modul 2 til Modul 9 i VVS KEM PRO.
 * Alle funksjoner er rene, deterministiske og følger formlene i masterplanen:
 * - Modul 2: Varme, Hydronikk, Pneumatex trykkholding & IMI STAD / PIBCV
 * - Modul 3: Ventilasjon, luftmengder (TEK17 kap. 13), SFP og kanallyd
 * - Modul 4: Pumper (Grundfos MAGNA3) & WWBooster trykkøkning
 * - Modul 5: Isolasjon (Glava varmetap, Armaflex duggpunkt) & PP-R/Stål lengdeutvidelse
 * - Modul 6: Brann & Sprinkler (FG-930:1 / NS-EN 12845) & Noha branntromler
 * - Modul 8: 25-års LCC-analyse (NS 3454 nåverdi) & NS 3031 energibudsjett
 * - Modul 9: TFM-kodegenerator (Statsbygg PA 0802)
 */

// ============================================================================
// MODUL 2: VARME, HYDRONIKK & TRYKKHOLDING (PNEUMATEX / IMI)
// ============================================================================

/** Vannets utvidelseskoeffisient e fra 10 °C til gitt maks turtemperatur (°C). */
export function vannUtvidelsesKoeffisient(maksTempC: number): number {
  if (maksTempC <= 10) return 0.001;
  // Tilnærming til fysikktabell for vann (f.eks. 80 °C -> ca. 0.029, 60 °C -> ca. 0.017, 45 °C -> ca. 0.0098)
  const tabell: [number, number][] = [
    [20, 0.0018],
    [35, 0.006],
    [40, 0.0078],
    [45, 0.0098],
    [50, 0.0121],
    [55, 0.0145],
    [60, 0.0171],
    [65, 0.0198],
    [70, 0.0227],
    [75, 0.0258],
    [80, 0.029],
    [85, 0.0324],
    [90, 0.0359],
    [95, 0.0396],
    [100, 0.0434],
  ];
  if (maksTempC <= tabell[0][0]) return tabell[0][1];
  for (let i = 0; i < tabell.length - 1; i++) {
    const [t1, e1] = tabell[i];
    const [t2, e2] = tabell[i + 1];
    if (maksTempC >= t1 && maksTempC <= t2) {
      const andel = (maksTempC - t1) / (t2 - t1);
      return e1 + andel * (e2 - e1);
    }
  }
  return tabell[tabell.length - 1][1];
}

export interface EkspansjonskarInput {
  /** Totalt anleggsvolum V_a [liter] */
  anleggsVolumLiter: number;
  /** Maksimal turtemperatur [°C] */
  maksTempC: number;
  /** Statisk høyde fra ekspansjonskar til høyeste punkt i anlegget H_st [m] */
  statiskHoydeM: number;
  /** Åpningstrykk på sikkerhetsventil p_sv [bar] (f.eks. 2.5 eller 3.0 bar) */
  sikkerhetsventilBar: number;
}

export interface EkspansjonskarResultat {
  utvidelsesKoeff: number;
  ekspansjonsVolumLiter: number;
  vannreserveLiter: number;
  fortrykkBar: number;
  sluttTrykkBar: number;
  nomineltVolumLiter: number;
  anbefaltStandardKarLiter: number;
  advarsel: string | null;
}

const STANDARD_KAR_STORRELSER = [8, 12, 18, 25, 35, 50, 80, 100, 140, 200, 300, 400, 500, 600, 800, 1000];

export function beregnEkspansjonskar(inn: EkspansjonskarInput): EkspansjonskarResultat {
  const e = vannUtvidelsesKoeffisient(inn.maksTempC);
  const ve = Math.max(0, inn.anleggsVolumLiter) * e;
  const vwr = Math.max(0.005 * Math.max(0, inn.anleggsVolumLiter), 3);
  const p0 = Math.max(0.5, inn.statiskHoydeM / 10 + 0.2);
  const pe = Math.max(p0 + 0.3, inn.sikkerhetsventilBar - 0.5);
  const trykkFaktor = (pe + 1) / (pe - p0);
  const vn = (ve + vwr) * trykkFaktor;
  const anbefalt =
    STANDARD_KAR_STORRELSER.find((s) => s >= vn) ?? Math.ceil(vn / 100) * 100;

  let advarsel: string | null = null;
  if (inn.sikkerhetsventilBar - 0.5 <= p0) {
    advarsel =
      'Sluttrykk (p_sv - 0,5 bar) er lavere eller lik fortrykket p_0! Øk sikkerhetsventilens åpningstrykk eller flytt karet høyere.';
  } else if (vn > 600) {
    advarsel =
      'Stort karvolum (> 600 l): Vurder Pneumatex Compresso (kompressorstyrt trykkholding) fremfor statisk membrankar.';
  }

  return {
    utvidelsesKoeff: e,
    ekspansjonsVolumLiter: ve,
    vannreserveLiter: vwr,
    fortrykkBar: p0,
    sluttTrykkBar: pe,
    nomineltVolumLiter: vn,
    anbefaltStandardKarLiter: anbefalt,
    advarsel,
  };
}

export interface HydroniskKretsResultat {
  /** Massestrøm / volumstrøm [l/s] */
  qLs: number;
  /** Volumstrøm [m³/h] */
  qM3h: number;
  /** Nødvendig Kv-verdi på reguleringsventil [m³/h ved 1 bar] */
  kvVerdi: number;
  /** Ventilautoritet P_v = dp_ventil / (dp_ventil + dp_krets) */
  ventilAutoritet: number;
  autoritetOk: boolean;
}

/**
 * Beregner vannmengde, Kv-verdi og ventilautoritet for en hydronisk varmekrets.
 */
export function beregnHydroniskKrets(
  effektKw: number,
  deltaTK: number,
  dpVentilKpa: number,
  dpKretsOvrigKpa: number
): HydroniskKretsResultat {
  const tryggDt = Math.max(1, deltaTK);
  const qM3h = Math.max(0, effektKw) / (1.163 * tryggDt);
  const qLs = qM3h / 3.6;
  const tryggDpVentil = Math.max(1, dpVentilKpa);
  const kvVerdi = qM3h / Math.sqrt(tryggDpVentil / 100);
  const totalDp = tryggDpVentil + Math.max(0, dpKretsOvrigKpa);
  const ventilAutoritet = totalDp > 0 ? tryggDpVentil / totalDp : 1;

  return {
    qLs,
    qM3h,
    kvVerdi,
    ventilAutoritet,
    autoritetOk: ventilAutoritet >= 0.3 && ventilAutoritet <= 0.7,
  };
}

// ============================================================================
// MODUL 3: VENTILASJON, LUFTMENGDER (TEK17 KAP. 13), SFP & KANALLYD
// ============================================================================

export interface LuftmengdeInput {
  arealM2: number;
  antallPersoner: number;
  /** Emisjonsfaktor [m³/(h·m²)] – 2.52 for lavemitterende materialer, 3.6 for normalt */
  materialFaktorM3hM2: number;
  /** Personfaktor [m³/(h·person)] – TEK17 min. 26 m³/(h·pers) */
  personFaktorM3h: number;
  /** Kjølelast i rommet/sonen [W] */
  kjolebehovWatt: number;
  /** Temperaturdifferanse mellom romluft og tilluft ved kjøling [K] (typisk 6–8 K) */
  deltaTKjolingK: number;
  /** Vifteeffekt tilluft + avtrekk [kW] */
  totalVifteEffektKw: number;
  /** Kanaldiameter på hovedstrekk [mm] */
  kanalDiameterMm: number;
}

export interface LuftmengdeResultat {
  luftPersonerM3h: number;
  luftMaterialerM3h: number;
  luftHygieneM3h: number;
  luftKjolingM3h: number;
  dimensjonerendeM3h: number;
  dimensjonerendeLs: number;
  sfpKwPerM3s: number;
  sfpOkTek17: boolean;
  kanalHastighetMs: number;
  kanalHastighetOk: boolean;
}

export function beregnVentilasjon(inn: LuftmengdeInput): LuftmengdeResultat {
  const luftPersonerM3h = Math.max(0, inn.antallPersoner) * Math.max(0, inn.personFaktorM3h);
  const luftMaterialerM3h = Math.max(0, inn.arealM2) * Math.max(0, inn.materialFaktorM3hM2);
  const luftHygieneM3h = luftPersonerM3h + luftMaterialerM3h;

  const dtKjol = Math.max(1, inn.deltaTKjolingK);
  // V = Phi / (rho * cp * dT) der rho*cp ≈ 0.335 Wh/(m³·K)
  const luftKjolingM3h =
    inn.kjolebehovWatt > 0 ? inn.kjolebehovWatt / (0.335 * dtKjol) : 0;

  const dimensjonerendeM3h = Math.max(luftHygieneM3h, luftKjolingM3h);
  const dimensjonerendeLs = dimensjonerendeM3h / 3.6;
  const qM3s = dimensjonerendeM3h / 3600;

  const sfpKwPerM3s = qM3s > 0 ? Math.max(0, inn.totalVifteEffektKw) / qM3s : 0;
  const dMeter = Math.max(0.05, inn.kanalDiameterMm / 1000);
  const tverrsnittM2 = Math.PI * Math.pow(dMeter / 2, 2);
  const kanalHastighetMs = tverrsnittM2 > 0 ? qM3s / tverrsnittM2 : 0;

  return {
    luftPersonerM3h,
    luftMaterialerM3h,
    luftHygieneM3h,
    luftKjolingM3h,
    dimensjonerendeM3h,
    dimensjonerendeLs,
    sfpKwPerM3s,
    sfpOkTek17: sfpKwPerM3s <= 1.5,
    kanalHastighetMs,
    kanalHastighetOk: kanalHastighetMs <= 5.0,
  };
}

// ============================================================================
// MODUL 4: PUMPER (GRUNDFOS MAGNA3) & TRYKKØKNING (WWBOOSTER)
// ============================================================================

export interface PumpeBeregningResultat {
  hydrauliskEffektW: number;
  elektriskEffektW: number;
  aarligEnergiKwh: number;
  anbefaltModus: string;
  anbefaltModell: string;
}

export function beregnSirkulasjonspumpe(
  qM3h: number,
  lofteHoydeMvs: number,
  virkningsgrad = 0.62,
  driftstimerPerAar = 5500,
  anleggsType: 'radiator' | 'gulvvarme' | 'ventilasjon' | 'vvc' = 'radiator'
): PumpeBeregningResultat {
  const dpKpa = Math.max(0, lofteHoydeMvs) * 9.81;
  // P_hyd [W] = Q [m³/h] * dp [kPa] / 3.6
  const hydrauliskEffektW = (Math.max(0, qM3h) * dpKpa) / 3.6;
  const eta = Math.min(0.9, Math.max(0.15, virkningsgrad));
  const elektriskEffektW = hydrauliskEffektW / eta;
  // Med turtallsregulering (del-last) er midlere effekt ca. 45 % av dimensjonerende spisslast
  const aarligEnergiKwh = (elektriskEffektW * 0.45 * Math.max(0, driftstimerPerAar)) / 1000;

  const anbefaltModus =
    anleggsType === 'radiator'
      ? 'Proporsjonalt trykk (Δp-v) / AutoAdapt'
      : anleggsType === 'gulvvarme'
      ? 'Konstant trykk (Δp-c)'
      : anleggsType === 'ventilasjon'
      ? 'Konstant trykk (Δp-c) mot 2-veis/PIBCV batteriventil'
      : 'Konstant temperatur (VVC sirkulasjon 55–60 °C)';

  const anbefaltModell =
    qM3h <= 3.5
      ? 'Grundfos MAGNA3 25-60 / ALPHA3'
      : qM3h <= 8
      ? 'Grundfos MAGNA3 32-80 / 32-100'
      : qM3h <= 18
      ? 'Grundfos MAGNA3 50-100 / 50-120'
      : 'Grundfos MAGNA3 65-120 / TPE Inline';

  return {
    hydrauliskEffektW,
    elektriskEffektW,
    aarligEnergiKwh,
    anbefaltModus,
    anbefaltModell,
  };
}

export function beregnTrykkokning(
  minGateTrykkBar: number,
  geodetiskHoydeM: number,
  rorOgKomponentTapBar: number,
  kravResttrykkTapstedBar = 2.0
): {
  nodvendigTrykkBar: number;
  trykkLoftBar: number;
  trengerBooster: boolean;
} {
  const pGeoBar = Math.max(0, geodetiskHoydeM) * 0.0981;
  const nodvendigTrykkBar =
    kravResttrykkTapstedBar + pGeoBar + Math.max(0, rorOgKomponentTapBar);
  const trykkLoftBar = Math.max(0, nodvendigTrykkBar - Math.max(0, minGateTrykkBar));
  return {
    nodvendigTrykkBar,
    trykkLoftBar,
    trengerBooster: trykkLoftBar > 0.05,
  };
}

// ============================================================================
// MODUL 5: ISOLASJON (GLAVA VARMETAP, ARMAFLEX DUGGPUNKT) & LENGDEUTVIDELSE
// ============================================================================

/**
 * Beregner varmetap q [W/m] fra isolert rør iht. NS-EN 12828,
 * duggpunktstemperatur T_dugg [°C] (Magnus-formel) for kondensisolering,
 * og termisk lengdeutvidelse dL [mm] for PP-R, PEX, kobber og stål.
 */
export function beregnRorIsolasjonOgUtvidelse(inn: {
  ytreRorDiameterMm: number;
  isolasjonsTykkelseMm: number;
  lambdaWmk: number;
  medieTempC: number;
  omgivelseTempC: number;
  relativFuktighetProsent: number;
  rorLengdeM: number;
  alphaMmPerMK: number;
  deltaTUtvidelseK: number;
}): {
  varmetapWattPerM: number;
  totaltVarmetapWatt: number;
  duggpunktTempC: number;
  kondensRisikoUisolert: boolean;
  lengdeUtvidelseMm: number;
} {
  const di = Math.max(5, inn.ytreRorDiameterMm) / 1000;
  const dy = (Math.max(5, inn.ytreRorDiameterMm) + 2 * Math.max(1, inn.isolasjonsTykkelseMm)) / 1000;
  const lambda = Math.max(0.01, inn.lambdaWmk);
  const varmetapWattPerM =
    (2 * Math.PI * lambda * (inn.medieTempC - inn.omgivelseTempC)) / Math.log(dy / di);
  const totaltVarmetapWatt = varmetapWattPerM * Math.max(0, inn.rorLengdeM);

  // Magnus-formel for duggpunkt
  const rh = Math.min(100, Math.max(5, inn.relativFuktighetProsent));
  const a = 17.62;
  const b = 243.12;
  const gamma = (a * inn.omgivelseTempC) / (b + inn.omgivelseTempC) + Math.log(rh / 100);
  const duggpunktTempC = (b * gamma) / (a - gamma);
  const kondensRisikoUisolert = inn.medieTempC < duggpunktTempC;

  const lengdeUtvidelseMm =
    Math.max(0, inn.rorLengdeM) * Math.max(0, inn.alphaMmPerMK) * Math.abs(inn.deltaTUtvidelseK);

  return {
    varmetapWattPerM,
    totaltVarmetapWatt,
    duggpunktTempC,
    kondensRisikoUisolert,
    lengdeUtvidelseMm,
  };
}

// ============================================================================
// MODUL 6: BRANN, SPRINKLER (FG-930:1 / NS-EN 12845) & NOHA BRANNTROMLER
// ============================================================================

export type SprinklerFareklasse = 'LH' | 'OH1' | 'OH2' | 'OH3' | 'OH4' | 'HHP1';

export const SPRINKLER_KLASSER: Record<
  SprinklerFareklasse,
  { navn: string; tetthetMmMin: number; virkearealM2: number; varighetMin: number }
> = {
  LH: { navn: 'LH – Lav fare (skole, kontor, bolig)', tetthetMmMin: 2.25, virkearealM2: 84, varighetMin: 30 },
  OH1: { navn: 'OH1 – Ordinær fare gr. 1 (hotell, sykehus, restaurant)', tetthetMmMin: 5.0, virkearealM2: 72, varighetMin: 60 },
  OH2: { navn: 'OH2 – Ordinær fare gr. 2 (parkering, verksted, vaskehall)', tetthetMmMin: 5.0, virkearealM2: 144, varighetMin: 60 },
  OH3: { navn: 'OH3 – Ordinær fare gr. 3 (kjøpesenter, lager/produksjon)', tetthetMmMin: 5.0, virkearealM2: 216, varighetMin: 60 },
  OH4: { navn: 'OH4 – Ordinær fare gr. 4 (kino, trevare, høyt brannpotensial)', tetthetMmMin: 5.0, virkearealM2: 360, varighetMin: 60 },
  HHP1: { navn: 'HHP1 – Høy fare prosess/industri', tetthetMmMin: 7.5, virkearealM2: 260, varighetMin: 90 },
};

export function beregnSprinklerOgBranntrommel(inn: {
  fareklasse: SprinklerFareklasse;
  kFaktor: number;
  dekningPerDyseM2: number;
  rortapMarginFaktor?: number;
  ganglinjeTilFjernesteHjorneM: number;
  slangeLengdeM: number;
  tilgjengeligDynamiskTrykkBar: number | null;
}): {
  tetthetMmMin: number;
  virkearealM2: number;
  varighetMin: number;
  vannmengdeLmin: number;
  vannmengdeLs: number;
  magasinVolumM3: number;
  minDyseTrykkBar: number;
  ganglinjeOk: boolean;
  maksTillattGanglinjeM: number;
  trykkOkForSprinkler: boolean | null;
} {
  const spec = SPRINKLER_KLASSER[inn.fareklasse] ?? SPRINKLER_KLASSER.OH1;
  const faktor = inn.rortapMarginFaktor ?? 1.2;
  const vannmengdeLmin = spec.virkearealM2 * spec.tetthetMmMin * faktor;
  const vannmengdeLs = vannmengdeLmin / 60;
  const magasinVolumM3 = (vannmengdeLmin * spec.varighetMin) / 1000;

  const qDyseLmin = spec.tetthetMmMin * Math.max(4, inn.dekningPerDyseM2);
  const k = Math.max(50, inn.kFaktor);
  const minDyseTrykkBar = Math.max(0.5, Math.pow(qDyseLmin / k, 2));

  // TEK17 § 11-16 / NS-EN 671-1: maks slangelengde 30 m + kasteradius 5 m = 35 m reell ganglinje (vi bruker også 25 m ved mye innredning/dører)
  const maksTillattGanglinjeM = Math.min(30, Math.max(0, inn.slangeLengdeM)) + 5;
  const ganglinjeOk = inn.ganglinjeTilFjernesteHjorneM <= maksTillattGanglinjeM;

  const trykkOkForSprinkler =
    inn.tilgjengeligDynamiskTrykkBar !== null
      ? inn.tilgjengeligDynamiskTrykkBar >= minDyseTrykkBar + 1.5
      : null;

  return {
    tetthetMmMin: spec.tetthetMmMin,
    virkearealM2: spec.virkearealM2,
    varighetMin: spec.varighetMin,
    vannmengdeLmin,
    vannmengdeLs,
    magasinVolumM3,
    minDyseTrykkBar,
    ganglinjeOk,
    maksTillattGanglinjeM,
    trykkOkForSprinkler,
  };
}

// ============================================================================
// MODUL 8: LCC-KALKULATOR (NS 3454 NÅVERDI OVER 25 ÅR)
// ============================================================================

export interface LccAlternativInput {
  navn: string;
  capexKr: number;
  aarligEnergiKwh: number;
  aarligVedlikeholdKr: number;
}

export interface LccAlternativResultat extends LccAlternativInput {
  aarligDriftskostnadKr: number;
  naaverdiDriftKr: number;
  totalNaaverdi25AarKr: number;
  annuitetKrPerAar: number;
}

/**
 * Beregner nåverdifaktor for en fast årlig kontantstrøm over n år med realrente r (i desimal, f.eks. 0.04 for 4 %).
 */
export function naaverdiFaktor(realrenteDesimal: number, analysePeriodeAar: number): number {
  const n = Math.max(1, analysePeriodeAar);
  if (Math.abs(realrenteDesimal) < 1e-6) return n;
  return (1 - Math.pow(1 + realrenteDesimal, -n)) / realrenteDesimal;
}

export function beregnLccAlternativer(
  alternativer: readonly LccAlternativInput[],
  stromprisKrPerKwh = 1.25,
  realrenteProsent = 4.0,
  analysePeriodeAar = 25
): LccAlternativResultat[] {
  const r = realrenteProsent / 100;
  const faktor = naaverdiFaktor(r, analysePeriodeAar);
  return alternativer.map((alt) => {
    const aarligDriftskostnadKr =
      alt.aarligEnergiKwh * stromprisKrPerKwh + alt.aarligVedlikeholdKr;
    const naaverdiDriftKr = aarligDriftskostnadKr * faktor;
    const totalNaaverdi25AarKr = alt.capexKr + naaverdiDriftKr;
    const annuitetKrPerAar = faktor > 0 ? totalNaaverdi25AarKr / faktor : 0;
    return {
      ...alt,
      aarligDriftskostnadKr,
      naaverdiDriftKr,
      totalNaaverdi25AarKr,
      annuitetKrPerAar,
    };
  });
}

// ============================================================================
// MODUL 9: TFM-KODEGENERATOR (STATSBYGG PA 0802)
// ============================================================================

/**
 * Bygger en komplett TFM-streng iht. Statsbygg PA 0802:
 * Format: +{lokasjon}={system}.{systemLopenr}-{komponent}{kompLopenr}[%{typeKode}]
 * Eksempel: +A=320.001-PU001 eller +A=320.001-PU001%TF
 */
export function byggTfmKode(inn: {
  lokasjon: string;
  systemKode: string;
  systemLopenr: number;
  komponentKode: string;
  komponentLopenr: number;
  typeKode?: string;
}): string {
  const lok = (inn.lokasjon.trim() || 'A').replace(/^\+/, '');
  const sys = inn.systemKode.trim() || '310';
  const sysNr = String(Math.max(1, Math.floor(inn.systemLopenr))).padStart(3, '0');
  const komp = (inn.komponentKode.trim() || 'PU').toUpperCase();
  const kompNr = String(Math.max(1, Math.floor(inn.komponentLopenr))).padStart(3, '0');
  const typeDel = inn.typeKode && inn.typeKode.trim() ? `%${inn.typeKode.trim().replace(/^%/, '')}` : '';
  return `+${lok}=${sys}.${sysNr}-${komp}${kompNr}${typeDel}`;
}
