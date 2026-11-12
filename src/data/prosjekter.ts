/**
 * Prosjektdata. `null` betyr «ikke oppgitt» – appen gjetter aldri (Lov 1) og viser i stedet ⚠️ HINT.
 *
 * De ferdige prosjektene under er hentet fra prosjektunderlagene i mappen «nye instrukser 19 agenter».
 * Felt som dokumentet ikke oppgir er bevisst satt til null.
 */

export const BYGNINGSTYPER = [
  'Kontor / næring',
  'Kombinasjonsbygg (blandet bruk)',
  'Industri / verksted / lager',
  'Helse og omsorg',
  'Skole / barnehage',
  'Bolig (enebolig / småhus)',
  'Boligblokk',
  'Annet',
] as const;

export interface GulvKote {
  navn: string;
  /** Kote for laveste sluk / topp ferdig gulv (OK FG) [m, NN2000] */
  kote: number;
}

export interface FlateInput {
  navn: string;
  /** Areal [m²] */
  areal: number;
  /** Avrenningsfaktor φ; null når den ikke er oppgitt */
  phi: number | null;
}

export interface KlimaData {
  /** Dimensjonerende utetemperatur DUT vinter [°C] */
  dutVinter?: number;
  /** Prosjektert innetemperatur [°C] */
  innetemperatur?: number;
  /** Dimensjonerende utetemperatur DUT sommer [°C] */
  dutSommer?: number;
}

export interface UVerdierData {
  /** U-verdi yttervegg [W/(m²·K)] */
  yttervegg?: number;
  /** U-verdi tak [W/(m²·K)] */
  tak?: number;
  /** U-verdi gulv på grunn [W/(m²·K)] */
  gulv?: number;
  /** U-verdi vinduer og dører [W/(m²·K)] */
  vinduDor?: number;
  /** Luftlekkasjetall ved 50 Pa trykkforskjell n50 [1/h] */
  n50?: number;
  /** Arealer for bygningsdeler [m²] */
  arealer?: {
    yttervegg?: number;
    tak?: number;
    gulv?: number;
    vinduDor?: number;
  };
}

export interface SanitaerUtstyrPost {
  antall: number;
  qnLPrS: number;
  du: number;
}

export interface SanitaerUtstyrData {
  wc: SanitaerUtstyrPost;
  servant: SanitaerUtstyrPost;
  urinal: SanitaerUtstyrPost;
  dusj: SanitaerUtstyrPost;
  kjokkenvask: SanitaerUtstyrPost;
  oppvaskmaskin: SanitaerUtstyrPost;
  badekar?: SanitaerUtstyrPost;
  vaskemaskin?: SanitaerUtstyrPost;
  utslagsvask?: SanitaerUtstyrPost;
  andre?: Record<string, SanitaerUtstyrPost>;
  sumQn: number;
  sumDu: number;
  qsLPrS: number;
}

export interface RorSystemPost {
  /** Kurs/systemnavn, f.eks. 'kaldtvann', 'varmtvann', 'avlop', 'varme' */
  system: string;
  /** Visningsnavn, f.eks. 'Kaldtvann', 'Varmtvann', 'Avløp', 'Varme' */
  navn: string;
  /** Dimensjon, f.eks. 'DN 28', '28 mm', '110 mm', 'DN 110' */
  dimensjon?: string;
  /** Lengde i meter [m] */
  lengdeM?: number;
  /** Rørmateriale, f.eks. 'Kobber (Cu)', 'PP plast', 'PEX', 'Stål' */
  materiale?: string;
}

export interface RorSystemerData {
  kaldtvann?: RorSystemPost;
  varmtvann?: RorSystemPost;
  avlop?: RorSystemPost;
  varme?: RorSystemPost;
  poster: RorSystemPost[];
  totalLengdeM?: number;
}

export interface VarmeanleggData {
  /** Varmekilde, f.eks. 'Væske-vann varmepumpe (bergvarme)', 'Fjernvarme', 'El-kjel' */
  varmekilde?: string;
  /** Antall radiatorer registrert */
  antallRadiatorer?: number;
  /** Areal avsatt til gulvvarme [m²] */
  gulvvarmeM2?: number;
  /** Turtemperatur [°C] */
  turTemperaturC?: number;
  /** Returtemperatur [°C] */
  returTemperaturC?: number;
  /** Effektbehov for romoppvarming [kW] */
  effektbehovKw?: number;
  /** Systemtype, f.eks. 'Vannbåren varme', 'Lavtemperatur' */
  systemType?: string;
}

export interface VentilasjonKravData {
  /** Personbelastning (antall personer) */
  personbelastning?: number;
  /** Spesifikk vifteeffekt SFP-krav [kW/(m³/s)] */
  sfpKrav?: number;
  /** Prosjektert luftmengde [m³/h eller l/(s·m²)] */
  luftmengdeM3h?: number;
}

export interface ProsjektData {
  id: string;
  navn: string;
  /** 'dokument' = ferdig prosjekt fra prosjektunderlag (skrivebeskyttet), 'bruker' = eget prosjekt */
  kilde: 'dokument' | 'bruker';
  beskrivelse: string;
  bygningstype: string;
  /** Oppvarmet BRA [m²] */
  bra: number | null;
  etasjer: string;
  sted: string;
  matrikkel: string;
  vaMyndighet: string;
  byggherre: string;
  miljoambisjon: string;
  /** Klimadata (DUT vinter, innetemperatur) */
  klima?: KlimaData;
  /** U-verdier for bygningsdeler [W/(m²·K)] */
  uVerdier?: UVerdierData;
  /** Alias for uVerdier / bygningsfysikk */
  klimaskjerm?: UVerdierData;
  /** Sanitærutstyrsposter, sum q_n og sum DU */
  sanitaerUtstyr?: SanitaerUtstyrData;
  /** Rørsystemer (kaldtvann, varmtvann, avløp, varme) registrert fra underlag */
  rorSystemer?: RorSystemerData;
  /** Varmeanlegg (varmekilde, radiatorer, gulvvarme, tur/retur, effekt) registrert fra underlag */
  varmeanlegg?: VarmeanleggData;
  /** Ventilasjonskrav (personbelastning, SFP) */
  ventilasjon?: VentilasjonKravData;
  /** Totalt eller spesifikt transmisjonstap H_T [W/K] */
  transmisjonstapWPerK?: number | null;
  koter: {
    /** Terreng / gatelokk [m] */
    gate: number | null;
    /** Innvendig bunn rør, kommunal kum [m] */
    ibrKum: number | null;
    /** Innvendig topp rør, kommunal kum [m] */
    itrKum: number | null;
    /** Kommunal vannledning [m] */
    vannledning: number | null;
    /** Stikkledning, lengde [m] */
    stikkLengde: number | null;
    /** Fall 1:N på stikkledning */
    fallNevner: number | null;
    gulv: GulvKote[];
  };
  vanntrykk: {
    statiskBar: number | null;
    /** Dynamisk trykk ved uttak (Q/p) [bar] */
    dynamiskBar: number | null;
    /** Uttak ved dynamisk måling [l/min] */
    uttakLmin: number | null;
    /** true når statisk trykk er antatt og ikke målt */
    antatt: boolean;
  };
  overvann: {
    flater: FlateInput[];
    /** Regnintensitet, klimajustert [l/(s·ha)] */
    intensitet: number | null;
    maksPaaslippLs: number | null;
  };
  belastning: {
    dusjer: number | null;
    dusjMinutter: number | null;
    /** Vannmengde per dusj [l/s] */
    dusjLs: number | null;
  };
  /** Areal avsatt til teknisk rom / varmesentral av ARK [m²] */
  tekniskRomM2: number | null;
  /** Feller / avvik som prosjektunderlaget selv peker på */
  feller: string[];
  /** Manglende underlag som dokumentet selv nevner */
  kjenteMangler: string[];
  notater: string;
}

export function tomtProsjekt(id: string): ProsjektData {
  return {
    id,
    navn: '',
    kilde: 'bruker',
    beskrivelse: '',
    bygningstype: BYGNINGSTYPER[0],
    bra: null,
    etasjer: '',
    sted: '',
    matrikkel: '',
    vaMyndighet: '',
    byggherre: '',
    miljoambisjon: '',
    klima: undefined,
    uVerdier: undefined,
    klimaskjerm: undefined,
    sanitaerUtstyr: undefined,
    rorSystemer: undefined,
    varmeanlegg: undefined,
    ventilasjon: undefined,
    transmisjonstapWPerK: null,
    koter: { gate: null, ibrKum: null, itrKum: null, vannledning: null, stikkLengde: null, fallNevner: 60, gulv: [] },
    vanntrykk: { statiskBar: null, dynamiskBar: null, uttakLmin: null, antatt: false },
    overvann: { flater: [], intensitet: null, maksPaaslippLs: null },
    belastning: { dusjer: null, dusjMinutter: null, dusjLs: 0.2 },
    tekniskRomM2: null,
    feller: [],
    kjenteMangler: [],
    notater: '',
  };
}

const forus: ProsjektData = {
  ...tomtProsjekt('forus'),
  navn: 'Case 01 – Forus Teknologipark & Servicehub',
  kilde: 'dokument',
  beskrivelse: 'Nybygg 4 500 m² BRA + kulvert mot eksisterende bygg fra 1988, 3 200 m² asfaltert uteareal. Kilde: kundeoppdrag + fasit.',
  bygningstype: 'Kombinasjonsbygg (blandet bruk)',
  bra: 4500,
  etasjer: '3 × 1 500 m² + teknisk kjeller/kulvert 300 m²',
  sted: 'Kanalsletta 48, 4033 Stavanger',
  matrikkel: 'Gnr. 42 / Bnr. 815, Stavanger kommune',
  vaMyndighet: 'Stavanger kommune – Vann og avløp (IVAR-normen)',
  byggherre: 'Vestkysten Eiendom & Logistikk AS (Henrik Lindstad)',
  miljoambisjon: 'BREEAM-NOR v6.0 «Very Good» (Excellent utredes i Alt. 3)',
  koter: {
    gate: 15.4,
    ibrKum: 13.6,
    itrKum: 13.9,
    vannledning: 13.8,
    stikkLengde: 40,
    fallNevner: 60,
    gulv: [
      { navn: 'Kjeller / teknisk rom U1', kote: 13.1 },
      { navn: '1. etasje', kote: 15.5 },
      { navn: '2. etasje', kote: 20.0 },
      { navn: '3. etasje', kote: 24.0 },
    ],
  },
  vanntrykk: { statiskBar: 4.5, dynamiskBar: null, uttakLmin: null, antatt: true },
  overvann: {
    flater: [
      { navn: 'Tak', areal: 1500, phi: 0.9 },
      { navn: 'Asfalt', areal: 3200, phi: 0.8 },
    ],
    intensitet: 280,
    maksPaaslippLs: 15,
  },
  belastning: { dusjer: 24, dusjMinutter: 20, dusjLs: 0.2 },
  tekniskRomM2: 28,
  feller: [
    'Kjeller U1 (+13,10) ligger lavere enn kommunal ITR (+13,90): selvfall er umulig. Krever avløpspumpestasjon (NS-EN 12050) med svanehals over oppstuvningsnivå.',
    'Manglende utvendig stoppekran, stake-/spylekum og sandfangkummer; vaskehall mangler oljeutskiller og storkjøkken fettutskiller (NS-EN 858 / NS-EN 1825). 88° T-rør i bunnledning.',
    'Én 400 l bereder til 24 samtidige dusjer à 0,2 l/s i 20 min – kraftig underdimensjonert.',
    'Felles aggregat med roterende gjenvinner for vaskehall, storkjøkken og kontor gir lukt- og forurensningsspredning.',
    'Branntrommel plassert inne på låst kontor 304 (25 m slange) – må ligge i felles rømningsvei, 30 m formstabil slange, reell ganglinje.',
    'Teknisk rom er 28 m², TEK17 § 14-4(2) gir 10 m² + 1 % av BRA. Sjakt på 0,8 m² er for liten.',
    'Vaskehall/verksted mangler tilbakeslagssikring kategori 4 (BA) samt nøddusj/øyevask.',
  ],
  kjenteMangler: [
    'Endelig brannrapport fra RIBr (skjulte hulrom over himling) er ikke levert.',
  ],
};

const jatta: ProsjektData = {
  ...tomtProsjekt('jatta'),
  navn: 'Case 02 – Jåttåvågen Horisont',
  kilde: 'dokument',
  beskrivelse: 'Kombinasjonsbygg 6 200 m² BRA: kontor, legesenter, restaurant, dagligvare, datasenter, parkeringskjeller og vernet bygg fra 1979.',
  bygningstype: 'Kombinasjonsbygg (blandet bruk)',
  bra: 6200,
  etasjer: '4 etasjer + underetasje U1',
  sted: 'Jåttåvågen, Stavanger',
  matrikkel: '',
  vaMyndighet: 'Stavanger kommune (VA-norm)',
  byggherre: 'Jåttå Utvikling AS',
  miljoambisjon: 'BREEAM-NOR v6.1.1 «Excellent» i Alternativ 3',
  koter: {
    gate: 4.2,
    ibrKum: null,
    itrKum: 2.1,
    vannledning: null,
    stikkLengde: null,
    fallNevner: null,
    gulv: [{ navn: 'U1 (parkering, garderobe, vaskehall)', kote: 1.85 }],
  },
  vanntrykk: { statiskBar: 3.8, dynamiskBar: 1.7, uttakLmin: 800, antatt: false },
  overvann: {
    flater: [{ navn: 'Tette flater (tak + asfaltert varelevering)', areal: 2200, phi: null }],
    intensitet: null,
    maksPaaslippLs: 15,
  },
  belastning: { dusjer: 12, dusjMinutter: null, dusjLs: null },
  feller: [
    'R32-utedel for varmepumpe i P-kjeller: forbudt (branncelle, NS-EN 378, isdannelse).',
    'Kjellergulv U1 (+1,85) ligger lavere enn kommunal ITR (+2,10): krever pumpekum, oljeutskiller med koalesensfilter og nivåalarm.',
    'Sjømatrestaurant mangler fettutskiller (NS-EN 1825) med høyvannsalarm.',
    'Ett aggregat (35 000 m³/h, roterende gjenvinner) for kjøkken, legesenter og kontor: luktsmitte/hygiene. Krever separate aggregater og batterigjenvinner.',
    'Friskluftinntak 2,5 m over lastebilrampe suger eksos.',
    '14 baderomsmoduler: krever SINTEF-godkjenning, vanntett kassett/drenering og lekkasjestopper.',
    'Brannskap (115 mm) i 100 mm EI60-vegg + dynamisk trykk 1,7 bar: krever trykkøkning/sprinklerpumpe.',
    'Sjakt 0,84 m² for 35 000 m³/h er for liten (3,0–3,5 m²). NS 3451:2022 firesifrede koder.',
    '45 % glassfasade uten solskjerming (TEK17 § 13-4, BREEAM Hea 03/04).',
    'Vernet 1979-bygg med takhøyde 2,45 m: fravikssøknad (PBL § 31-2), ombrukskartlegging.',
    'Vannbehandling: kun smussil og kranvann i anlegg med flere metaller (VDI 2035 / NS-EN 17671).',
    'Spillvarme: 60 kW fra datasenter + 45 kW fra dagligvare (105 kW) bør utnyttes i Alt. 2 og 3.',
  ],
};

const landet: ProsjektData = {
  ...tomtProsjekt('landet'),
  navn: 'Case 03 – Landet Varmeverk',
  kilde: 'dokument',
  beskrivelse: 'Transformasjon av kornlager/industri til mikrobryggeri, kulturarena og gründerhub. 4 800 m² BRA.',
  bygningstype: 'Kombinasjonsbygg (blandet bruk)',
  bra: 4800,
  etasjer: '3 etasjer + loft',
  sted: 'Elvebredden, Sandnes kommune',
  matrikkel: '',
  vaMyndighet: 'Sandnes kommune (VA-norm)',
  byggherre: 'Rogaland Eiendomsutvikling AS',
  miljoambisjon: 'BREEAM-NOR v6.1.1 «Very Good», fokus på ombruk',
  koter: {
    gate: 3.1,
    ibrKum: null,
    itrKum: 2.2,
    vannledning: null,
    stikkLengde: 30,
    fallNevner: 60,
    gulv: [{ navn: '1. etasje (mikrobryggeri / mathall)', kote: 2.4 }],
  },
  vanntrykk: { statiskBar: 5.2, dynamiskBar: 2.1, uttakLmin: 1200, antatt: false },
  feller: [
    'Gulv 1. etasje (+2,40) er kun 20 cm over ITR i gata (+2,20): tilbakeslagsfare ved høyvann, dype bryggerisluk.',
    'Felles aggregat for mikrobryggeri (fukt, CO₂, gjæringslukt) og gründerhub gir inneklima- og sikkerhetsrisiko.',
    'Fullsprinkling kolliderer med fredet treverk i loftet (synlige rør ikke tillatt av Byantikvaren).',
    'Akustikk: ingen himling i råbetong; Lp,A,T ≤ 30 dB krever lyddempende tiltak (Hea 05).',
    'Bryggeriets varmeveksler krever vannkvalitet iht. VDI 2035 / NS-EN 17671.',
  ],
};

const solbakken: ProsjektData = {
  ...tomtProsjekt('solbakken'),
  navn: 'Case 04 – Solbakken Helsehus',
  kilde: 'dokument',
  beskrivelse: 'Totalrehabilitering og tilbygg: 4 000 m² betongbygg fra 1984 + 2 200 m² nytt tilbygg i massivtre. 65 omsorgsleiligheter.',
  bygningstype: 'Helse og omsorg',
  bra: 6200,
  etasjer: '4 etasjer + underetasje med teknisk sentral',
  sted: 'Nord-Jæren / Rogaland',
  matrikkel: '',
  vaMyndighet: '',
  byggherre: '',
  miljoambisjon: 'BREEAM-NOR «Very Good»',
  feller: [
    'Varmtvann 58 °C i tank og 48 °C på sirkulasjon: for lavt mot legionella (TEK17 § 15-5). Dokumentene oppgir ulike krav (70/60 °C) – verifiser mot veiledningen.',
    'Blindledning på 12 m til utvendig spylekran, ikke på sirkulasjon: legionellafelle.',
    'Roterende veksler på aggregat +360.001 for smitteisolat, medisinrom, bad og oppholdsrom: lukt-/smitteoverføring. Krever batterigjenvinner eller separate anlegg.',
    'Vinduer U = 1,1 W/(m²·K): TEK17 krever ≤ 0,80 (tiltaksmetoden).',
    'Fordelerskap i sjakt uten skjøtefrie varerør, plassert over korridorhimling.',
    'Serviceareal foran aggregat er 650 mm (dokumentet kaller dette «950 mm-regelen» / § 15-7 – det er ikke tilbakeslagsregelen).',
    'Radiatorer dimensjonert for 80/60 °C ønskes kjørt på 45/35 °C – og LED reduserer internlast: ny varmetapsberegning kreves.',
  ],
  kjenteMangler: ['Ingen koter eller VA-data i prosjektunderlaget – tilbakeslagskontroll kan ikke utføres.'],
  notater: 'Alternativ 1: el-kjel 450 kW + luft/vann 120 kW. Alt. 2: fjernvarme 350 kW + el-spiss. Alt. 3: bergvarme 180 kW (12 × 250 m).',
};

const enebolig: ProsjektData = {
  ...tomtProsjekt('enebolig'),
  navn: 'Case 05 – Enebolig 1986 (Terje Olsen)',
  kilde: 'dokument',
  beskrivelse: 'Totalrenovering og energioppgradering av enebolig fra 1986, 350 m² BRA, med utleid sokkelleilighet (ca. 60 m²).',
  bygningstype: 'Bolig (enebolig / småhus)',
  bra: 350,
  etasjer: '3 etasjer (sokkel/kjeller, hovedetasje, loft), 20 × 10 m',
  sted: '',
  matrikkel: '',
  vaMyndighet: '',
  byggherre: 'Terje Olsen (tiltakshaver) – oppdrag fra Asplan Viak',
  miljoambisjon: 'Oppgradering til TEK17-nivå, inneklima (Hea 02)',
  feller: [
    'Strøm inkludert i leien (8 500 kr/mnd) gir ingen sparing: krever sub-måling/sonestyring.',
    'To bruksenheter: felles aggregat for 350 m² vs. eget kompaktaggregat i sokkelleilighet (brann/lukt).',
    'Rørstammer fra 1986 skal skiftes uten å ødelegge takhøyden i kjellerstuen.',
  ],
  kjenteMangler: ['Ingen koter, trykk eller VA-data i oppdragsnotatet.'],
};

export const PROSJEKT_PRESETS: ProsjektData[] = [forus, jatta, landet, solbakken, enebolig];
