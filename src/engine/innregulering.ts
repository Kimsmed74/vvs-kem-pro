/**
 * Faglige beregningsmodeller for hydronisk og luftteknisk innregulering,
 * ventildimensjonering, rør-/kanaldimensjonering, isolasjon (kondens/duggpunkt),
 * sprinklerhydraulikk og NS 3454 LCC-analyser.
 *
 * Forfatter: Kim Jørgensen | Rørleggermester & Rådgivende Ingeniør VVS (RIV)
 * Følger standarder: NS-EN 14336 (hydronikk), NS-EN 12599 (ventilasjon),
 * TEK17 kap. 13/14/15, NS-EN 12845 (sprinkler) og NS 3454 (LCC).
 */

// ============================================================================
// 1. HYDRONISK INNREGULERING & VENTILDIMENSJONERING (VARME & KJØLING)
// ============================================================================

export type HydroniskSystemType = 'varme' | 'kjoling' | 'glykol';

export interface DeltaTPreset {
  id: string;
  navn: string;
  deltaTK: number;
  turC: number;
  returC: number;
  system: HydroniskSystemType;
}

export const DELTA_T_PRESETS: DeltaTPreset[] = [
  { id: '80_60', navn: '80/60 °C (20 K, Radiator)', deltaTK: 20, turC: 80, returC: 60, system: 'varme' },
  { id: '60_40', navn: '60/40 °C (20 K, Lavtemp radiator)', deltaTK: 20, turC: 60, returC: 40, system: 'varme' },
  { id: '45_35', navn: '45/35 °C (10 K, Gulvvarme)', deltaTK: 10, turC: 45, returC: 35, system: 'varme' },
  { id: '35_30', navn: '35/30 °C (5 K, Varmepumpe)', deltaTK: 5, turC: 35, returC: 30, system: 'varme' },
  { id: '6_12', navn: '6/12 °C (6 K, Isvann/Kjøling)', deltaTK: 6, turC: 6, returC: 12, system: 'kjoling' },
  { id: '7_12', navn: '7/12 °C (5 K, Kjøling)', deltaTK: 5, turC: 7, returC: 12, system: 'kjoling' },
];

export interface HydroniskVentilKatalogItem {
  id: string;
  merke: 'IMI TA' | 'Danfoss' | 'Frese';
  modell: string;
  dn: string;
  type: 'STAD' | 'PICV';
  kvs?: number;
  qNomLh?: number;
  dpMinKpa: number;
  beskrivelse: string;
}

export const HYDRONISKE_VENTILER: HydroniskVentilKatalogItem[] = [
  // IMI TA STAD Manuelle reguleringsventiler med måleuttak
  { id: 'ta_stad_15', merke: 'IMI TA', modell: 'STAD', dn: 'DN15', type: 'STAD', kvs: 2.52, dpMinKpa: 3, beskrivelse: 'IMI TA STAD DN15 (kvs 2.52)' },
  { id: 'ta_stad_20', merke: 'IMI TA', modell: 'STAD', dn: 'DN20', type: 'STAD', kvs: 5.7, dpMinKpa: 3, beskrivelse: 'IMI TA STAD DN20 (kvs 5.70)' },
  { id: 'ta_stad_25', merke: 'IMI TA', modell: 'STAD', dn: 'DN25', type: 'STAD', kvs: 8.7, dpMinKpa: 3, beskrivelse: 'IMI TA STAD DN25 (kvs 8.70)' },
  { id: 'ta_stad_32', merke: 'IMI TA', modell: 'STAD', dn: 'DN32', type: 'STAD', kvs: 14.2, dpMinKpa: 3, beskrivelse: 'IMI TA STAD DN32 (kvs 14.2)' },
  { id: 'ta_stad_40', merke: 'IMI TA', modell: 'STAD', dn: 'DN40', type: 'STAD', kvs: 19.2, dpMinKpa: 3, beskrivelse: 'IMI TA STAD DN40 (kvs 19.2)' },
  { id: 'ta_stad_50', merke: 'IMI TA', modell: 'STAD', dn: 'DN50', type: 'STAD', kvs: 33.0, dpMinKpa: 3, beskrivelse: 'IMI TA STAD DN50 (kvs 33.0)' },

  // Danfoss AB-QM 4.0 Trykkuavhengige kontrollventiler (PICV)
  { id: 'danfoss_abqm_15lf', merke: 'Danfoss', modell: 'AB-QM 4.0', dn: 'DN15 LF', type: 'PICV', qNomLh: 200, dpMinKpa: 16, beskrivelse: 'Danfoss AB-QM 4.0 DN15 LF (200 l/h, min 16 kPa)' },
  { id: 'danfoss_abqm_15', merke: 'Danfoss', modell: 'AB-QM 4.0', dn: 'DN15', type: 'PICV', qNomLh: 650, dpMinKpa: 16, beskrivelse: 'Danfoss AB-QM 4.0 DN15 (650 l/h, min 16 kPa)' },
  { id: 'danfoss_abqm_20', merke: 'Danfoss', modell: 'AB-QM 4.0', dn: 'DN20', type: 'PICV', qNomLh: 1100, dpMinKpa: 16, beskrivelse: 'Danfoss AB-QM 4.0 DN20 (1100 l/h, min 16 kPa)' },
  { id: 'danfoss_abqm_25', merke: 'Danfoss', modell: 'AB-QM 4.0', dn: 'DN25', type: 'PICV', qNomLh: 2200, dpMinKpa: 20, beskrivelse: 'Danfoss AB-QM 4.0 DN25 (2200 l/h, min 20 kPa)' },
  { id: 'danfoss_abqm_32', merke: 'Danfoss', modell: 'AB-QM 4.0', dn: 'DN32', type: 'PICV', qNomLh: 4000, dpMinKpa: 20, beskrivelse: 'Danfoss AB-QM 4.0 DN32 (4000 l/h, min 20 kPa)' },
  { id: 'danfoss_abqm_40', merke: 'Danfoss', modell: 'AB-QM 4.0', dn: 'DN40', type: 'PICV', qNomLh: 9000, dpMinKpa: 25, beskrivelse: 'Danfoss AB-QM 4.0 DN40 (9000 l/h, min 25 kPa)' },
  { id: 'danfoss_abqm_50', merke: 'Danfoss', modell: 'AB-QM 4.0', dn: 'DN50', type: 'PICV', qNomLh: 12500, dpMinKpa: 25, beskrivelse: 'Danfoss AB-QM 4.0 DN50 (12500 l/h, min 25 kPa)' },

  // Frese ALPHA / OPTIMA Compact PICV
  { id: 'frese_optima_15', merke: 'Frese', modell: 'OPTIMA Compact', dn: 'DN15', type: 'PICV', qNomLh: 600, dpMinKpa: 17, beskrivelse: 'Frese OPTIMA Compact DN15 (600 l/h, min 17 kPa)' },
  { id: 'frese_optima_20', merke: 'Frese', modell: 'OPTIMA Compact', dn: 'DN20', type: 'PICV', qNomLh: 1200, dpMinKpa: 17, beskrivelse: 'Frese OPTIMA Compact DN20 (1200 l/h, min 17 kPa)' },
  { id: 'frese_optima_25', merke: 'Frese', modell: 'OPTIMA Compact', dn: 'DN25', type: 'PICV', qNomLh: 2500, dpMinKpa: 20, beskrivelse: 'Frese OPTIMA Compact DN25 (2500 l/h, min 20 kPa)' },
  { id: 'frese_optima_32', merke: 'Frese', modell: 'OPTIMA Compact', dn: 'DN32', type: 'PICV', qNomLh: 4500, dpMinKpa: 20, beskrivelse: 'Frese OPTIMA Compact DN32 (4500 l/h, min 20 kPa)' },
  { id: 'frese_optima_40', merke: 'Frese', modell: 'OPTIMA Compact', dn: 'DN40', type: 'PICV', qNomLh: 8500, dpMinKpa: 25, beskrivelse: 'Frese OPTIMA Compact DN40 (8500 l/h, min 25 kPa)' },
  { id: 'frese_optima_50', merke: 'Frese', modell: 'OPTIMA Compact', dn: 'DN50', type: 'PICV', qNomLh: 12000, dpMinKpa: 25, beskrivelse: 'Frese OPTIMA Compact DN50 (12000 l/h, min 25 kPa)' },
];

export interface HydroniskStrengInput {
  id: string;
  navn: string;
  type: HydroniskSystemType;
  /** Valgt ventilkatalog-ID f.eks. 'ta_stad_20', 'danfoss_abqm_20' */
  ventilId?: string;
  /** Valgt temperaturpreset-ID f.eks. '80_60', '45_35', '6_12' */
  presetId?: string;
  /** Effekt Φ [kW] */
  effektKw: number;
  /** Temperaturdifferanse ΔT [K] */
  deltaTK: number;
  /** Trykkfall i selve kretsen (rør, bend, varmeveksler/radiator) [kPa] */
  dpKretsKpa: number;
  /** Nødvendig struping / differansetrykk over reguleringsventil [kPa] */
  dpVentilKpa: number;
  /** Valgt kvs-verdi på reguleringsventil [m³/h] */
  valgtKvs: number;
  /** Faktisk målt vannmengde under innregulering [l/h] */
  maaltVannmengdeLh: number;
}

export interface HydroniskStrengBeregnet extends HydroniskStrengInput {
  /** Valgt ventilbeskrivelse fra katalog */
  valgtVentilNavn?: string;
  ventilType?: 'STAD' | 'PICV';
  minDrivtrykkKpa?: number;
  /** Forinnstilling tekst (omdr. for STAD, % for PICV) */
  forinnstillingTekst: string;
  /** Prosjektert vannmengde q [l/s] = Φ / (c_p · ΔT) */
  qProsjLs: number;
  /** Prosjektert vannmengde q [l/h] */
  qProsjLh: number;
  /** Prosjektert volumstrøm q [m³/h] */
  qProsjM3h: number;
  /** Beregnet nødvendig kv-verdi for ventilen = q [m³/h] / sqrt(dp_ventil [bar]) */
  kvBeregnet: number;
  /** Ventilautoritet β = dp_ventil / (dp_krets + dp_ventil) */
  ventilAutoritetBeta: number;
  /** Autoritet status: 'ideell' (>= 0.50), 'godkjent' (0.30 - 0.49), 'lav' (< 0.30) */
  autoritetStatus: 'ideell' | 'godkjent' | 'lav';
  /** Avvik mellom målt og prosjektert vannmengde [%] */
  avvikProsent: number;
  /** Innreguleringsstatus: 'godkjent' (innenfor ±10 %), 'avvik' (> ±10 %) */
  innreguleringStatus: 'godkjent' | 'avvik';
  /** Totalt trykkfall for kursen = dp_krets + dp_ventil [kPa] */
  dpTotaltKpa: number;
  /** Er dette kursen med størst kretsmotstand? */
  erIndekskurs?: boolean;
}

export interface HydroniskInnreguleringResultat {
  strenger: HydroniskStrengBeregnet[];
  totalEffektKw: number;
  totalVannmengdeLh: number;
  totalVannmengdeM3h: number;
  totalMaaltVannmengdeLh: number;
  totaltAvvikProsent: number;
  /** Indekskurs (kursen med høyest kretstrykkfall dp_krets) */
  indekskurs: HydroniskStrengBeregnet | null;
  /** Pumpens nødvendige settpunkt H_pumpe [kPa] og [mVS] */
  pumpeSettpunktKpa: number;
  pumpeSettpunktMvs: number;
  alleAutoriteterOk: boolean;
  alleAvvikOk: boolean;
}

/**
 * Beregner hydronisk innregulering for samtlige kurser/strenger.
 */
export function beregnHydroniskInnregulering(
  inndata: HydroniskStrengInput[]
): HydroniskInnreguleringResultat {
  if (inndata.length === 0) {
    return {
      strenger: [],
      totalEffektKw: 0,
      totalVannmengdeLh: 0,
      totalVannmengdeM3h: 0,
      totalMaaltVannmengdeLh: 0,
      totaltAvvikProsent: 0,
      indekskurs: null,
      pumpeSettpunktKpa: 0,
      pumpeSettpunktMvs: 0,
      alleAutoriteterOk: true,
      alleAvvikOk: true,
    };
  }

  // 1. Beregn rad for rad
  const beregnedeUtenIndeks = inndata.map((s) => {
    const tryggDt = Math.max(0.5, s.deltaTK);
    const tryggEffekt = Math.max(0, s.effektKw);
    // Varmekapasitet c_p: For 30% glykol ca. 3.95 kJ/(l·K), for rent vann 4.187 kJ/(l·K)
    const cp = s.type === 'glykol' ? 3.95 : 4.187;
    const qProsjLs = tryggEffekt / (cp * tryggDt);
    const qProsjLh = qProsjLs * 3600;
    const qProsjM3h = qProsjLh / 1000;

    const tryggDpVentilKpa = Math.max(0.1, s.dpVentilKpa);
    const tryggDpKretsKpa = Math.max(0, s.dpKretsKpa);
    const dpVentilBar = tryggDpVentilKpa / 100;
    const kvBeregnet = qProsjM3h / Math.sqrt(dpVentilBar);

    // Koble mot leverandørkatalog dersom ventil er valgt
    const funnetVentil = HYDRONISKE_VENTILER.find((v) => v.id === s.ventilId);
    const ventilType = funnetVentil?.type ?? (s.valgtKvs > 0 ? 'STAD' : 'PICV');
    const valgtVentilNavn = funnetVentil?.beskrivelse;
    const minDrivtrykkKpa = funnetVentil?.dpMinKpa ?? 16;

    // Forinnstilling
    let forinnstillingTekst = '';
    if (ventilType === 'PICV' && funnetVentil?.qNomLh) {
      const prosent = Math.min(100, Math.max(10, Math.round((qProsjLh / funnetVentil.qNomLh) * 100)));
      forinnstillingTekst = `${prosent} %`;
    } else {
      const kvs = funnetVentil?.kvs ?? s.valgtKvs;
      if (kvs > 0) {
        const ratio = Math.min(1, Math.max(0.05, kvBeregnet / kvs));
        const omdr = Math.round((0.5 + 3.5 * Math.sqrt(ratio)) * 10) / 10;
        forinnstillingTekst = `${omdr.toFixed(1)} omdr.`;
      } else {
        forinnstillingTekst = '100 %';
      }
    }

    const dpTotaltKpa = tryggDpKretsKpa + tryggDpVentilKpa;
    const beta = dpTotaltKpa > 0 ? tryggDpVentilKpa / dpTotaltKpa : 1;

    let autoritetStatus: 'ideell' | 'godkjent' | 'lav' = 'lav';
    if (ventilType === 'PICV') {
      autoritetStatus = tryggDpVentilKpa >= minDrivtrykkKpa ? 'ideell' : 'lav';
    } else {
      if (beta >= 0.5) autoritetStatus = 'ideell';
      else if (beta >= 0.3) autoritetStatus = 'godkjent';
    }

    const avvikProsent =
      qProsjLh > 0 ? ((s.maaltVannmengdeLh - qProsjLh) / qProsjLh) * 100 : 0;
    const innreguleringStatus: 'godkjent' | 'avvik' =
      Math.abs(avvikProsent) <= 10 ? 'godkjent' : 'avvik';

    return {
      ...s,
      valgtVentilNavn,
      ventilType,
      minDrivtrykkKpa,
      forinnstillingTekst,
      qProsjLs,
      qProsjLh,
      qProsjM3h,
      kvBeregnet,
      ventilAutoritetBeta: beta,
      autoritetStatus,
      avvikProsent,
      innreguleringStatus,
      dpTotaltKpa,
    };
  });

  // 2. Finn Indekskurs (kursen med høyest dpKretsKpa)
  let maksKretsDp = -1;
  let indeksId = '';
  beregnedeUtenIndeks.forEach((s) => {
    if (s.dpKretsKpa > maksKretsDp) {
      maksKretsDp = s.dpKretsKpa;
      indeksId = s.id;
    }
  });

  const strenger: HydroniskStrengBeregnet[] = beregnedeUtenIndeks.map((s) => ({
    ...s,
    erIndekskurs: s.id === indeksId,
  }));

  const indekskurs = strenger.find((s) => s.erIndekskurs) ?? null;

  // 3. Summering
  const totalEffektKw = strenger.reduce((acc, s) => acc + s.effektKw, 0);
  const totalVannmengdeLh = strenger.reduce((acc, s) => acc + s.qProsjLh, 0);
  const totalVannmengdeM3h = totalVannmengdeLh / 1000;
  const totalMaaltVannmengdeLh = strenger.reduce((acc, s) => acc + s.maaltVannmengdeLh, 0);
  const totaltAvvikProsent =
    totalVannmengdeLh > 0
      ? ((totalMaaltVannmengdeLh - totalVannmengdeLh) / totalVannmengdeLh) * 100
      : 0;

  // Pumpens settpunkt må dekke det maksimale totale trykkfallet i den dimensjonerende kursen
  const pumpeSettpunktKpa = strenger.reduce(
    (max, s) => Math.max(max, s.dpTotaltKpa),
    0
  );
  const pumpeSettpunktMvs = pumpeSettpunktKpa / 9.81;

  const alleAutoriteterOk = strenger.every((s) => s.autoritetStatus !== 'lav');
  const alleAvvikOk = strenger.every((s) => s.innreguleringStatus === 'godkjent');

  return {
    strenger,
    totalEffektKw,
    totalVannmengdeLh,
    totalVannmengdeM3h,
    totalMaaltVannmengdeLh,
    totaltAvvikProsent,
    indekskurs,
    pumpeSettpunktKpa,
    pumpeSettpunktMvs,
    alleAutoriteterOk,
    alleAvvikOk,
  };
}

// ============================================================================
// 2. LUFTTEKNISK INNREGULERING & INNREGULERINGSPROTOKOLL (VENTILASJON)
// ============================================================================

export interface VentilKatalogItem {
  id: string;
  merke: 'Systemair' | 'Lindab' | 'Trox Auranor';
  modell: string;
  dimensjon: string;
  type: 'tilluft' | 'avtrekk';
  kFaktor: number;
  beskrivelse: string;
}

export const VENTILASJON_VENTILER: VentilKatalogItem[] = [
  // Systemair
  { id: 'sys_tff_100', merke: 'Systemair', modell: 'TFF Tilluft', dimensjon: 'Ø100', type: 'tilluft', kFaktor: 1.8, beskrivelse: 'Systemair TFF Ø100 (k = 1,8)' },
  { id: 'sys_tff_125', merke: 'Systemair', modell: 'TFF Tilluft', dimensjon: 'Ø125', type: 'tilluft', kFaktor: 2.7, beskrivelse: 'Systemair TFF Ø125 (k = 2,7)' },
  { id: 'sys_tff_160', merke: 'Systemair', modell: 'TFF Tilluft', dimensjon: 'Ø160', type: 'tilluft', kFaktor: 4.3, beskrivelse: 'Systemair TFF Ø160 (k = 4,3)' },
  { id: 'sys_tff_200', merke: 'Systemair', modell: 'TFF Tilluft', dimensjon: 'Ø200', type: 'tilluft', kFaktor: 6.8, beskrivelse: 'Systemair TFF Ø200 (k = 6,8)' },

  { id: 'sys_eff_100', merke: 'Systemair', modell: 'EFF Avtrekk', dimensjon: 'Ø100', type: 'avtrekk', kFaktor: 1.6, beskrivelse: 'Systemair EFF Ø100 (k = 1,6)' },
  { id: 'sys_eff_125', merke: 'Systemair', modell: 'EFF Avtrekk', dimensjon: 'Ø125', type: 'avtrekk', kFaktor: 2.5, beskrivelse: 'Systemair EFF Ø125 (k = 2,5)' },
  { id: 'sys_eff_160', merke: 'Systemair', modell: 'EFF Avtrekk', dimensjon: 'Ø160', type: 'avtrekk', kFaktor: 3.9, beskrivelse: 'Systemair EFF Ø160 (k = 3,9)' },
  { id: 'sys_eff_200', merke: 'Systemair', modell: 'EFF Avtrekk', dimensjon: 'Ø200', type: 'avtrekk', kFaktor: 5.8, beskrivelse: 'Systemair EFF Ø200 (k = 5,8)' },

  { id: 'sys_tfc_100', merke: 'Systemair', modell: 'TFC Tilluft/Avtrekk', dimensjon: 'Ø100', type: 'tilluft', kFaktor: 2.0, beskrivelse: 'Systemair TFC Ø100 (k = 2,0)' },
  { id: 'sys_tfc_125', merke: 'Systemair', modell: 'TFC Tilluft/Avtrekk', dimensjon: 'Ø125', type: 'tilluft', kFaktor: 3.1, beskrivelse: 'Systemair TFC Ø125 (k = 3,1)' },
  { id: 'sys_tfc_160', merke: 'Systemair', modell: 'TFC Tilluft/Avtrekk', dimensjon: 'Ø160', type: 'tilluft', kFaktor: 4.9, beskrivelse: 'Systemair TFC Ø160 (k = 4,9)' },

  { id: 'sys_iris_100', merke: 'Systemair', modell: 'IRIS Målespjeld', dimensjon: 'Ø100', type: 'tilluft', kFaktor: 6.0, beskrivelse: 'Systemair IRIS Ø100 (k = 6,0)' },
  { id: 'sys_iris_125', merke: 'Systemair', modell: 'IRIS Målespjeld', dimensjon: 'Ø125', type: 'tilluft', kFaktor: 10.4, beskrivelse: 'Systemair IRIS Ø125 (k = 10,4)' },
  { id: 'sys_iris_160', merke: 'Systemair', modell: 'IRIS Målespjeld', dimensjon: 'Ø160', type: 'tilluft', kFaktor: 17.0, beskrivelse: 'Systemair IRIS Ø160 (k = 17,0)' },
  { id: 'sys_iris_200', merke: 'Systemair', modell: 'IRIS Målespjeld', dimensjon: 'Ø200', type: 'tilluft', kFaktor: 27.5, beskrivelse: 'Systemair IRIS Ø200 (k = 27,5)' },
  { id: 'sys_iris_250', merke: 'Systemair', modell: 'IRIS Målespjeld', dimensjon: 'Ø250', type: 'tilluft', kFaktor: 45.0, beskrivelse: 'Systemair IRIS Ø250 (k = 45,0)' },
  { id: 'sys_iris_315', merke: 'Systemair', modell: 'IRIS Målespjeld', dimensjon: 'Ø315', type: 'tilluft', kFaktor: 75.0, beskrivelse: 'Systemair IRIS Ø315 (k = 75,0)' },

  // Lindab
  { id: 'lin_ki_100', merke: 'Lindab', modell: 'KI/KSU Avtrekk', dimensjon: 'Ø100', type: 'avtrekk', kFaktor: 1.7, beskrivelse: 'Lindab KI/KSU Ø100 (k = 1,7)' },
  { id: 'lin_ki_125', merke: 'Lindab', modell: 'KI/KSU Avtrekk', dimensjon: 'Ø125', type: 'avtrekk', kFaktor: 2.6, beskrivelse: 'Lindab KI/KSU Ø125 (k = 2,6)' },
  { id: 'lin_ki_160', merke: 'Lindab', modell: 'KI/KSU Avtrekk', dimensjon: 'Ø160', type: 'avtrekk', kFaktor: 4.1, beskrivelse: 'Lindab KI/KSU Ø160 (k = 4,1)' },
  { id: 'lin_ki_200', merke: 'Lindab', modell: 'KI/KSU Avtrekk', dimensjon: 'Ø200', type: 'avtrekk', kFaktor: 6.2, beskrivelse: 'Lindab KI/KSU Ø200 (k = 6,2)' },

  { id: 'lin_kpf_100', merke: 'Lindab', modell: 'KPF Tilluft', dimensjon: 'Ø100', type: 'tilluft', kFaktor: 1.9, beskrivelse: 'Lindab KPF Ø100 (k = 1,9)' },
  { id: 'lin_kpf_125', merke: 'Lindab', modell: 'KPF Tilluft', dimensjon: 'Ø125', type: 'tilluft', kFaktor: 2.9, beskrivelse: 'Lindab KPF Ø125 (k = 2,9)' },
  { id: 'lin_kpf_160', merke: 'Lindab', modell: 'KPF Tilluft', dimensjon: 'Ø160', type: 'tilluft', kFaktor: 4.6, beskrivelse: 'Lindab KPF Ø160 (k = 4,6)' },

  { id: 'lin_dru_100', merke: 'Lindab', modell: 'DRU Målespjeld', dimensjon: 'Ø100', type: 'tilluft', kFaktor: 5.5, beskrivelse: 'Lindab DRU Ø100 (k = 5,5)' },
  { id: 'lin_dru_125', merke: 'Lindab', modell: 'DRU Målespjeld', dimensjon: 'Ø125', type: 'tilluft', kFaktor: 9.8, beskrivelse: 'Lindab DRU Ø125 (k = 9,8)' },
  { id: 'lin_dru_160', merke: 'Lindab', modell: 'DRU Målespjeld', dimensjon: 'Ø160', type: 'tilluft', kFaktor: 16.2, beskrivelse: 'Lindab DRU Ø160 (k = 16,2)' },
  { id: 'lin_dru_200', merke: 'Lindab', modell: 'DRU Målespjeld', dimensjon: 'Ø200', type: 'tilluft', kFaktor: 26.0, beskrivelse: 'Lindab DRU Ø200 (k = 26,0)' },
  { id: 'lin_dru_250', merke: 'Lindab', modell: 'DRU Målespjeld', dimensjon: 'Ø250', type: 'tilluft', kFaktor: 43.0, beskrivelse: 'Lindab DRU Ø250 (k = 43,0)' },
  { id: 'lin_dru_315', merke: 'Lindab', modell: 'DRU Målespjeld', dimensjon: 'Ø315', type: 'tilluft', kFaktor: 72.0, beskrivelse: 'Lindab DRU Ø315 (k = 72,0)' },

  // Trox Auranor
  { id: 'trox_kvu_100', merke: 'Trox Auranor', modell: 'KVU Tilluft', dimensjon: 'Ø100', type: 'tilluft', kFaktor: 2.1, beskrivelse: 'Trox Auranor KVU Ø100 (k = 2,1)' },
  { id: 'trox_kvu_125', merke: 'Trox Auranor', modell: 'KVU Tilluft', dimensjon: 'Ø125', type: 'tilluft', kFaktor: 3.2, beskrivelse: 'Trox Auranor KVU Ø125 (k = 3,2)' },
  { id: 'trox_kvu_160', merke: 'Trox Auranor', modell: 'KVU Tilluft', dimensjon: 'Ø160', type: 'tilluft', kFaktor: 5.1, beskrivelse: 'Trox Auranor KVU Ø160 (k = 5,1)' },
  { id: 'trox_kvu_200', merke: 'Trox Auranor', modell: 'KVU Tilluft', dimensjon: 'Ø200', type: 'tilluft', kFaktor: 8.0, beskrivelse: 'Trox Auranor KVU Ø200 (k = 8,0)' },

  { id: 'trox_kso_100', merke: 'Trox Auranor', modell: 'KSO Avtrekk', dimensjon: 'Ø100', type: 'avtrekk', kFaktor: 1.5, beskrivelse: 'Trox Auranor KSO Ø100 (k = 1,5)' },
  { id: 'trox_kso_125', merke: 'Trox Auranor', modell: 'KSO Avtrekk', dimensjon: 'Ø125', type: 'avtrekk', kFaktor: 2.4, beskrivelse: 'Trox Auranor KSO Ø125 (k = 2,4)' },
  { id: 'trox_kso_160', merke: 'Trox Auranor', modell: 'KSO Avtrekk', dimensjon: 'Ø160', type: 'avtrekk', kFaktor: 3.8, beskrivelse: 'Trox Auranor KSO Ø160 (k = 3,8)' },
  { id: 'trox_kso_200', merke: 'Trox Auranor', modell: 'KSO Avtrekk', dimensjon: 'Ø200', type: 'avtrekk', kFaktor: 5.6, beskrivelse: 'Trox Auranor KSO Ø200 (k = 5,6)' },

  { id: 'trox_luna_125', merke: 'Trox Auranor', modell: 'Luna Tilluftsboks', dimensjon: 'Ø125', type: 'tilluft', kFaktor: 5.4, beskrivelse: 'Trox Auranor Luna Ø125/160 (k = 5,4)' },
  { id: 'trox_luna_160', merke: 'Trox Auranor', modell: 'Luna Tilluftsboks', dimensjon: 'Ø160', type: 'tilluft', kFaktor: 8.5, beskrivelse: 'Trox Auranor Luna Ø160/200 (k = 8,5)' },
  { id: 'trox_sirius_125', merke: 'Trox Auranor', modell: 'Sirius VAV', dimensjon: 'Ø125', type: 'tilluft', kFaktor: 4.2, beskrivelse: 'Trox Auranor Sirius VAV Ø125 (k = 4,2)' },
  { id: 'trox_sirius_160', merke: 'Trox Auranor', modell: 'Sirius VAV', dimensjon: 'Ø160', type: 'tilluft', kFaktor: 6.8, beskrivelse: 'Trox Auranor Sirius VAV Ø160 (k = 6,8)' },
];

export interface VentilVentilInput {
  id: string;
  rom: string;
  type: 'tilluft' | 'avtrekk';
  ventilId?: string;
  /** Ventildimensjon f.eks. "Ø100", "Ø125", "Ø160", "Ø200", "Ø250", "Ø315" */
  dimensjon: string;
  /** Ventilens k-faktor for differansetrykkmåling (q [l/s] = k * sqrt(Δp [Pa])) */
  kFaktor: number;
  /** Prosjektert luftmengde q_prosj [m³/h] */
  qProsjM3h: number;
  /** Målt trykk i måleuttak Δp_m [Pa] */
  maaltTrykkPa: number;
}

export interface VentilVentilBeregnet extends VentilVentilInput {
  valgtVentilNavn?: string;
  /** Prosjektert luftmengde q_prosj [l/s] */
  qProsjLs: number;
  /** Teoretisk beregnet måletrykk Δp_m [Pa] = (q_ls / k)² */
  beregnetTrykkPa: number;
  /** Faktisk innregulert luftmengde q_målt [l/s] = k * sqrt(Δp_målt) */
  maaltLuftmengdeLs: number;
  /** Faktisk innregulert luftmengde q_målt [m³/h] */
  maaltLuftmengdeM3h: number;
  /** Avvik mellom målt og prosjektert luftmengde [%] */
  avvikProsent: number;
  /** Status: 'godkjent' (<= ±10 %), 'akseptabel' (<= ±15 %), 'avvik' (> ±15 %) */
  status: 'godkjent' | 'akseptabel' | 'avvik';
}

export interface VentilasjonInnreguleringResultat {
  ventiler: VentilVentilBeregnet[];
  sumTilluftProsjM3h: number;
  sumTilluftProsjLs: number;
  sumTilluftMaaltM3h: number;
  sumTilluftMaaltLs: number;
  sumAvtrekkProsjM3h: number;
  sumAvtrekkProsjLs: number;
  sumAvtrekkMaaltM3h: number;
  sumAvtrekkMaaltLs: number;
  /** Trykkbalanse i bygget (Tilluft vs. Avtrekk) */
  balanseM3h: number; // Tilluft - Avtrekk
  balanseProsent: number; // Undertrekk / overtrekk i %
  balanseVurdering: {
    status: 'anbefalt_undertrykk' | 'noytral' | 'overtrykk' | 'stort_undertrykk';
    tittel: string;
    beskrivelse: string;
    tone: 'ok' | 'advarsel' | 'feil';
  };
  /** SFP-faktor [kW/(m³/s)] basert på vifteeffekt og dimensjonerende luftmengde */
  beregnetSfp: number;
  sfpOkTek17: boolean;
  alleVentilerOk: boolean;
}

/**
 * Beregner luftteknisk innregulering og bygningsbalanse iht. NS-EN 12599.
 */
export function beregnVentilasjonsInnregulering(
  ventiler: VentilVentilInput[],
  vifteEffektKw: number = 2.4
): VentilasjonInnreguleringResultat {
  const beregnede: VentilVentilBeregnet[] = ventiler.map((v) => {
    const funnetVentil = VENTILASJON_VENTILER.find((x) => x.id === v.ventilId);
    const valgtVentilNavn = funnetVentil?.beskrivelse;
    const kFaktor = funnetVentil?.kFaktor ?? v.kFaktor;

    const qProsjLs = Math.max(0, v.qProsjM3h) / 3.6;
    const tryggK = Math.max(0.1, kFaktor);
    // Δp_m [Pa] = (q_ls / k)²
    const beregnetTrykkPa = Math.pow(qProsjLs / tryggK, 2);

    const tryggMaaltTrykk = Math.max(0, v.maaltTrykkPa);
    const maaltLuftmengdeLs = tryggK * Math.sqrt(tryggMaaltTrykk);
    const maaltLuftmengdeM3h = maaltLuftmengdeLs * 3.6;

    const avvikProsent =
      v.qProsjM3h > 0
        ? ((maaltLuftmengdeM3h - v.qProsjM3h) / v.qProsjM3h) * 100
        : 0;

    let status: 'godkjent' | 'akseptabel' | 'avvik' = 'avvik';
    const absAvvik = Math.abs(avvikProsent);
    if (absAvvik <= 10) status = 'godkjent';
    else if (absAvvik <= 15) status = 'akseptabel';

    return {
      ...v,
      kFaktor,
      valgtVentilNavn,
      qProsjLs,
      beregnetTrykkPa,
      maaltLuftmengdeLs,
      maaltLuftmengdeM3h,
      avvikProsent,
      status,
    };
  });

  const tilluft = beregnede.filter((v) => v.type === 'tilluft');
  const avtrekk = beregnede.filter((v) => v.type === 'avtrekk');

  const sumTilluftProsjM3h = tilluft.reduce((acc, v) => acc + v.qProsjM3h, 0);
  const sumTilluftProsjLs = sumTilluftProsjM3h / 3.6;
  const sumTilluftMaaltM3h = tilluft.reduce((acc, v) => acc + v.maaltLuftmengdeM3h, 0);
  const sumTilluftMaaltLs = sumTilluftMaaltM3h / 3.6;

  const sumAvtrekkProsjM3h = avtrekk.reduce((acc, v) => acc + v.qProsjM3h, 0);
  const sumAvtrekkProsjLs = sumAvtrekkProsjM3h / 3.6;
  const sumAvtrekkMaaltM3h = avtrekk.reduce((acc, v) => acc + v.maaltLuftmengdeM3h, 0);
  const sumAvtrekkMaaltLs = sumAvtrekkMaaltM3h / 3.6;

  // Balanse basert på målt luftmengde
  const balanseM3h = sumTilluftMaaltM3h - sumAvtrekkMaaltM3h;
  const balanseProsent =
    sumAvtrekkMaaltM3h > 0 ? (balanseM3h / sumAvtrekkMaaltM3h) * 100 : 0;

  let balanseVurdering: VentilasjonInnreguleringResultat['balanseVurdering'] = {
    status: 'anbefalt_undertrykk',
    tittel: 'Anbefalt undertrykk (TEK17 optimal)',
    beskrivelse:
      'Avtrekk er 3–8 % høyere enn tilluft. Hindrer fuktig inneluft i å trenge inn i yttervegger/tak.',
    tone: 'ok',
  };

  if (balanseProsent > 2) {
    balanseVurdering = {
      status: 'overtrykk',
      tittel: '⚠️ Overtrykk i bygget (Avvik)',
      beskrivelse:
        'Tilluft overstiger avtrekk. Fare for at varm, fuktig luft presses ut i bygningskroppen med fare for kondens og mugg.',
      tone: 'feil',
    };
  } else if (balanseProsent < -12) {
    balanseVurdering = {
      status: 'stort_undertrykk',
      tittel: '⚠️ For stort undertrykk (> 12 %)',
      beskrivelse:
        'Høyt undertrykk kan gi tunge dører, trekk og luktspredning fra grunn eller avløp.',
      tone: 'advarsel',
    };
  } else if (Math.abs(balanseProsent) <= 2) {
    balanseVurdering = {
      status: 'noytral',
      tittel: 'Nøytral trykkbalanse (±2 %)',
      beskrivelse: 'Tilluft og avtrekk er tilnærmet like store.',
      tone: 'ok',
    };
  }

  // SFP-faktor
  const maksLuftM3s = Math.max(sumTilluftMaaltM3h, sumAvtrekkMaaltM3h) / 3600;
  const beregnetSfp = maksLuftM3s > 0 ? vifteEffektKw / maksLuftM3s : 0;
  const sfpOkTek17 = beregnetSfp <= 1.5 && beregnetSfp > 0;
  const alleVentilerOk = beregnede.every((v) => v.status !== 'avvik');

  return {
    ventiler: beregnede,
    sumTilluftProsjM3h,
    sumTilluftProsjLs,
    sumTilluftMaaltM3h,
    sumTilluftMaaltLs,
    sumAvtrekkProsjM3h,
    sumAvtrekkProsjLs,
    sumAvtrekkMaaltM3h,
    sumAvtrekkMaaltLs,
    balanseM3h,
    balanseProsent,
    balanseVurdering,
    beregnetSfp,
    sfpOkTek17,
    alleVentilerOk,
  };
}

// ============================================================================
// 3. ISOLASJON: KONDENS- & DUGGPUNKTSBEREGNING (KJØLING & ISVANN)
// ============================================================================

export interface KondensInput {
  /** Ytre rørdiameter [mm] (f.eks. 54 mm) */
  rorDiameterMm: number;
  /** Isolasjonstykkelse [mm] (f.eks. 19 mm eller 32 mm cellegummi) */
  isoTykkelseMm: number;
  /** Varmeledningsevne isolasjon λ [W/(m·K)] (typisk 0.036 for Armaflex) */
  lambdaIso: number;
  /** Medietemperatur i rør [°C] (f.eks. 6 °C isvann) */
  medieTempC: number;
  /** Omgivelsestemperatur luft [°C] (f.eks. 24 °C i teknisk rom/himling) */
  omgivelseTempC: number;
  /** Relativ fuktighet i omgivelse [%] (f.eks. 60 %) */
  relativFuktighet: number;
  /** Varmeovergangstall utvendig α_y [W/(m²·K)] (typisk 8.0 for innendørs stillestående luft) */
  alfaUtvendig?: number;
}

export interface KondensResultat {
  duggpunktTempC: number;
  overflateTempC: number;
  kondensfare: boolean;
  sikkerhetsmarginK: number;
  anbefaltMinIsoMm: number;
  varmetapWattPerM: number;
}

/**
 * Beregner duggpunktstemperatur (Magnus-formelen) og overflatetemperatur på rør.
 */
export function beregnKondensOgDuggpunkt(inn: KondensInput): KondensResultat {
  const T = inn.omgivelseTempC;
  const RH = Math.min(100, Math.max(1, inn.relativFuktighet));
  const alfa = inn.alfaUtvendig ?? 8.0;

  // Magnus-Tetens formel for duggpunkt:
  const a = 17.27;
  const b = 237.7;
  const gamma = (a * T) / (b + T) + Math.log(RH / 100);
  const duggpunktTempC = (b * gamma) / (a - gamma);

  const d1 = Math.max(0.005, inn.rorDiameterMm / 1000);
  const s = Math.max(0.001, inn.isoTykkelseMm / 1000);
  const d2 = d1 + 2 * s;

  // Termisk motstand for sylindrisk isolasjon: R_iso = ln(d2/d1) / (2 * pi * lambda) [m·K/W]
  const rIso = Math.log(d2 / d1) / (2 * Math.PI * inn.lambdaIso);
  // Termisk overgangsmotstand utvendig: R_se = 1 / (pi * d2 * alfa) [m·K/W]
  const rSe = 1 / (Math.PI * d2 * alfa);
  const rTot = rIso + rSe;

  const deltaT = inn.omgivelseTempC - inn.medieTempC;
  const qVarmetapWm = rTot > 0 ? deltaT / rTot : 0;

  // Overflatetemperatur: T_se = T_omg - q * R_se
  const overflateTempC = inn.omgivelseTempC - qVarmetapWm * rSe;
  const sikkerhetsmarginK = overflateTempC - duggpunktTempC;
  const kondensfare = sikkerhetsmarginK <= 0;

  // Beregn omtrentlig minste isolasjonstykkelse for å få overflateTempC > duggpunkt + 1 K
  let anbefaltMinIsoMm = inn.isoTykkelseMm;
  if (kondensfare || sikkerhetsmarginK < 1.5) {
    for (let testS = inn.isoTykkelseMm; testS <= 100; testS += 2) {
      const td2 = d1 + 2 * (testS / 1000);
      const trIso = Math.log(td2 / d1) / (2 * Math.PI * inn.lambdaIso);
      const trSe = 1 / (Math.PI * td2 * alfa);
      const tq = deltaT / (trIso + trSe);
      const tOverflate = inn.omgivelseTempC - tq * trSe;
      if (tOverflate - duggpunktTempC >= 1.5) {
        anbefaltMinIsoMm = testS;
        break;
      }
    }
  }

  return {
    duggpunktTempC,
    overflateTempC,
    kondensfare,
    sikkerhetsmarginK,
    anbefaltMinIsoMm,
    varmetapWattPerM: qVarmetapWm,
  };
}

// ============================================================================
// 4. BRANN & SPRINKLER: HYDRAULISK KONTROLL AV Q/p-TRYKK (NS-EN 12845)
// ============================================================================

export interface SprinklerHydrauliskInput {
  fareklasse: string;
  /** Dimensjonerende vannbehov spisslast Q [l/min] */
  vannbehovLmin: number;
  /** Nødvendig dynamisk trykk ved fjerneste dyse/gren p_dyse [bar] */
  dyseTrykkBar: number;
  /** Geometrisk løftehøyde fra kommunalt tilknytningspunkt til høyeste sprinkler H_geo [m] */
  lofteHoydeM: number;
  /** Estimert rørfriksjon og komponenttap i fordelingsnettet [bar] */
  rorfriksjonBar: number;
  /** Trykkfall i tilbakeslagsventil BA (NS-EN 1717 kat. 4 / NS-EN 12729) og alarmventil [bar] */
  baVentilTapBar?: number;
  /** Målt eller oppgitt vanntrykk fra kommunalt nett ved gitt vannmengde [bar] */
  tilgjengeligTrykkBar: number;
}

export interface SprinklerHydrauliskResultat {
  geodetiskTapBar: number;
  rorFriksjonBar: number;
  baVentilTapBar: number;
  totaltTrykkbehovBar: number;
  tilgjengeligTrykkBar: number;
  marginBar: number;
  godkjentDirekte: boolean;
  kreverPumpe: boolean;
  pumpeLoftehoydeBar: number;
  konklusjon: string;
}

/**
 * Utfører hydraulisk kontroll for sprinkleranlegg mot kommunal Q/p-kapasitet.
 */
export function beregnSprinklerHydraulikk(
  inn: SprinklerHydrauliskInput
): SprinklerHydrauliskResultat {
  const geodetiskTapBar = inn.lofteHoydeM / 10.2;
  const baVentilTapBar = inn.baVentilTapBar ?? 0.8; // NS-EN 1717 kat. 4 BA-tilbakeslagssikring
  const totaltTrykkbehovBar =
    inn.dyseTrykkBar + inn.rorfriksjonBar + geodetiskTapBar + baVentilTapBar;
  const marginBar = inn.tilgjengeligTrykkBar - totaltTrykkbehovBar;
  const godkjentDirekte = marginBar >= 0.5; // Minst 0.5 bar sikkerhetsmargin iht. FG
  const kreverPumpe = !godkjentDirekte;
  const pumpeLoftehoydeBar = kreverPumpe ? Math.max(0, -marginBar + 1.0) : 0;

  let konklusjon = '';
  if (godkjentDirekte) {
    konklusjon = `✅ GODKJENT FOR DIREKTE TILKOBLING: Kommunalt nettrykk gir tilstrekkelig trykk og vannmengde ved ${inn.vannbehovLmin} l/min (sikkerhetsmargin +${marginBar.toFixed(2)} bar inkl. BA-ventil ${baVentilTapBar.toFixed(2)} bar).`;
  } else {
    konklusjon = `🚨 KRAV OM SPRINKLERPUMPE (NS-EN 12845): Kommunalt trykk mangler ${Math.abs(marginBar).toFixed(2)} bar ved dimensjonerende vannmengde (${inn.vannbehovLmin} l/min) inkl. BA-ventil (${baVentilTapBar.toFixed(2)} bar). Krever godkjent diesel-/elektrisk sprinklerpumpe med løftehøyde minst ${pumpeLoftehoydeBar.toFixed(1)} bar.`;
  }

  return {
    geodetiskTapBar,
    rorFriksjonBar: inn.rorfriksjonBar,
    baVentilTapBar,
    totaltTrykkbehovBar,
    tilgjengeligTrykkBar: inn.tilgjengeligTrykkBar,
    marginBar,
    godkjentDirekte,
    kreverPumpe,
    pumpeLoftehoydeBar,
    konklusjon,
  };
}

// ============================================================================
// 5. NS 3454 LCC-KALKULATOR & ENERGIBUDSJETT (MODUL 8)
// ============================================================================

export interface LccAlternativDetallert {
  navn: string;
  investeringCapexKr: number;
  aarligEnergiKwh: number;
  stromprisKrPerKwh: number;
  aarligVedlikeholdKr: number;
  levetidAar: number;
  kalkulasjonsrenteProsent: number;
  varmepumpeDekningsgrad?: number; // f.eks. 0.85 (85 %)
  scop?: number; // f.eks. 3.8
}

export interface LccBeregnetAlternativ extends LccAlternativDetallert {
  aarligEnergikostnadKr: number;
  aarligTotalDriftKr: number;
  naaverdiDriftKr: number;
  totalLivslopskostnadKr: number;
  kostnadPerM2Bra: number;
  totalLivslopskostnad40AarKr: number;
  totalLivslopskostnad60AarKr: number;
}

/**
 * Beregner nåverdi av livssykluskostnader iht. NS 3454 over 25, 40 og 60 år.
 */
export function beregnLccNs3454(
  alternativer: LccAlternativDetallert[],
  braM2: number = 1000
): {
  alternativer: LccBeregnetAlternativ[];
  besteAlternativ: LccBeregnetAlternativ | null;
} {
  const tryggBra = Math.max(1, braM2);
  const beregnede: LccBeregnetAlternativ[] = alternativer.map((alt) => {
    const aarligEnergikostnadKr = alt.aarligEnergiKwh * alt.stromprisKrPerKwh;
    const aarligTotalDriftKr = aarligEnergikostnadKr + alt.aarligVedlikeholdKr;

    // Nåverdifaktorer: ((1 + r)^n - 1) / (r * (1 + r)^n)
    const r = alt.kalkulasjonsrenteProsent / 100;
    const n = Math.max(1, alt.levetidAar);
    const naaverdiFaktor = r > 0 ? (Math.pow(1 + r, n) - 1) / (r * Math.pow(1 + r, n)) : n;
    const naaverdiFaktor40 = r > 0 ? (Math.pow(1 + r, 40) - 1) / (r * Math.pow(1 + r, 40)) : 40;
    const naaverdiFaktor60 = r > 0 ? (Math.pow(1 + r, 60) - 1) / (r * Math.pow(1 + r, 60)) : 60;

    const naaverdiDriftKr = aarligTotalDriftKr * naaverdiFaktor;
    const totalLivslopskostnadKr = alt.investeringCapexKr + naaverdiDriftKr;
    const kostnadPerM2Bra = totalLivslopskostnadKr / tryggBra;

    const totalLivslopskostnad40AarKr = alt.investeringCapexKr + aarligTotalDriftKr * naaverdiFaktor40;
    const totalLivslopskostnad60AarKr = alt.investeringCapexKr + aarligTotalDriftKr * naaverdiFaktor60;

    return {
      ...alt,
      aarligEnergikostnadKr,
      aarligTotalDriftKr,
      naaverdiDriftKr,
      totalLivslopskostnadKr,
      kostnadPerM2Bra,
      totalLivslopskostnad40AarKr,
      totalLivslopskostnad60AarKr,
    };
  });

  let minLcc = Number.POSITIVE_INFINITY;
  let besteAlternativ: LccBeregnetAlternativ | null = null;
  beregnede.forEach((alt) => {
    if (alt.totalLivslopskostnadKr < minLcc) {
      minLcc = alt.totalLivslopskostnadKr;
      besteAlternativ = alt;
    }
  });

  return {
    alternativer: beregnede,
    besteAlternativ,
  };
}
