/**
 * VVS KEM PRO – Befaring & Romskisse Motor
 * Inspirert av arbeidsflyten i moderne befaringsverktøy (som Svenn Befaring),
 * spisset for norsk VVS-praksis iht. TEK17, NS 3420 og Byggforsk 553.102.
 */

import type { ProsjektData, SanitaerUtstyrData } from '../data/prosjekter';
import {
  type OrderItem,
  NRF_VAREKATALOG,
} from './kalkyleKatalog';

export type BefaringRomType =
  | 'bad'
  | 'wc'
  | 'kjokken'
  | 'vaskerom'
  | 'teknisk_rom'
  | 'oppholdsrom'
  | 'annet';

export const ROMTYPE_INFO: Record<
  BefaringRomType,
  { tittel: string; ikon: string; farge: string; badgeFarge: string }
> = {
  bad: {
    tittel: 'Bad / Våtrom',
    ikon: '💧',
    farge: 'border-blue-500/60 bg-blue-950/40 text-blue-200',
    badgeFarge: 'bg-blue-600/30 text-blue-300 border-blue-500/40',
  },
  wc: {
    tittel: 'WC / Toalettrom',
    ikon: '🚽',
    farge: 'border-indigo-500/60 bg-indigo-950/40 text-indigo-200',
    badgeFarge: 'bg-indigo-600/30 text-indigo-300 border-indigo-500/40',
  },
  kjokken: {
    tittel: 'Kjøkken',
    ikon: '🍳',
    farge: 'border-amber-500/60 bg-amber-950/40 text-amber-200',
    badgeFarge: 'bg-amber-600/30 text-amber-300 border-amber-500/40',
  },
  vaskerom: {
    tittel: 'Vaskerom',
    ikon: '🧺',
    farge: 'border-teal-500/60 bg-teal-950/40 text-teal-200',
    badgeFarge: 'bg-teal-600/30 text-teal-300 border-teal-500/40',
  },
  teknisk_rom: {
    tittel: 'Teknisk rom / Varmesentral',
    ikon: '⚙️',
    farge: 'border-rose-500/60 bg-rose-950/40 text-rose-200',
    badgeFarge: 'bg-rose-600/30 text-rose-300 border-rose-500/40',
  },
  oppholdsrom: {
    tittel: 'Stue / Oppholdsrom / Soverom',
    ikon: '🛋️',
    farge: 'border-emerald-500/60 bg-emerald-950/40 text-emerald-200',
    badgeFarge: 'bg-emerald-600/30 text-emerald-300 border-emerald-500/40',
  },
  annet: {
    tittel: 'Annet rom / Gang',
    ikon: '📦',
    farge: 'border-slate-700 bg-slate-900/60 text-slate-300',
    badgeFarge: 'bg-slate-800 text-slate-400 border-slate-700',
  },
};

export interface RomUtstyr {
  wc: number;
  servant: number;
  dusj: number;
  sluk: number;
  badekar: number;
  kjokkenvask: number;
  oppvaskmaskin: number;
  vaskemaskin: number;
  utslagsvask: number;
  vvb: boolean;
  fordelerskap: boolean;
  utekran: boolean;
  gulvvarme: boolean;
  radiator: number;
}

export interface BefaringRom {
  id: string;
  navn: string;
  etasje: string;
  type: BefaringRomType;
  lengdeM: number;
  breddeM: number;
  arealM2: number;
  utstyr: RomUtstyr;
  notater: string;
  avvik: string[];
  bilder?: { id: string; navn: string; dataUrl?: string; dato: string }[];
  lydfil?: { id: string; navn: string; varighetSek?: number; dato: string } | null;
}

export interface BefaringSjekkpunkt {
  id: string;
  kategori: 'lov2_kote' | 'tek17_sluk' | 'trykk' | 'teknisk_rom' | 'materialflyt';
  tittel: string;
  beskrivelse: string;
  alvor: 'kritisk' | 'viktig' | 'info';
  avklart: boolean;
  romNavn?: string;
}

export interface BefaringData {
  befarer: string;
  dato: string;
  rom: BefaringRom[];
  generelleNotater: string;
  sjekkpunkter: BefaringSjekkpunkt[];
  sistOppdatert: string;
}

/**
 * Standard tomt utstyrsobjekt
 */
export function tomtRomUtstyr(): RomUtstyr {
  return {
    wc: 0,
    servant: 0,
    dusj: 0,
    sluk: 0,
    badekar: 0,
    kjokkenvask: 0,
    oppvaskmaskin: 0,
    vaskemaskin: 0,
    utslagsvask: 0,
    vvb: false,
    fordelerskap: false,
    utekran: false,
    gulvvarme: false,
    radiator: 0,
  };
}

/**
 * Oppretter et forhåndskonfigurert rom basert på romtype og etasje
 */
export function opprettStandardRom(
  type: BefaringRomType,
  etasje = '1. etg',
  customNavn?: string
): BefaringRom {
  const id = `rom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const utstyr = tomtRomUtstyr();

  let lengdeM = 3.0;
  let breddeM = 2.5;
  let navn = customNavn || 'Nytt rom';

  switch (type) {
    case 'bad':
      lengdeM = 2.8;
      breddeM = 2.2;
      navn = customNavn || `Hovedbad (${etasje})`;
      utstyr.wc = 1;
      utstyr.servant = 1;
      utstyr.dusj = 1;
      utstyr.sluk = 1;
      utstyr.gulvvarme = true;
      break;
    case 'wc':
      lengdeM = 1.8;
      breddeM = 1.3;
      navn = customNavn || `Gjeste-WC (${etasje})`;
      utstyr.wc = 1;
      utstyr.servant = 1;
      break;
    case 'kjokken':
      lengdeM = 3.8;
      breddeM = 3.2;
      navn = customNavn || `Kjøkken (${etasje})`;
      utstyr.kjokkenvask = 1;
      utstyr.oppvaskmaskin = 1;
      break;
    case 'vaskerom':
      lengdeM = 2.6;
      breddeM = 2.0;
      navn = customNavn || `Vaskerom (${etasje})`;
      utstyr.vaskemaskin = 1;
      utstyr.utslagsvask = 1;
      utstyr.sluk = 1;
      break;
    case 'teknisk_rom':
      lengdeM = 3.0;
      breddeM = 2.5;
      navn = customNavn || `Teknisk rom (${etasje})`;
      utstyr.sluk = 1;
      utstyr.vvb = true;
      utstyr.fordelerskap = true;
      break;
    case 'oppholdsrom':
      lengdeM = 5.2;
      breddeM = 4.2;
      navn = customNavn || `Stue / Allrom (${etasje})`;
      utstyr.gulvvarme = true;
      break;
    case 'annet':
    default:
      lengdeM = 3.0;
      breddeM = 2.0;
      navn = customNavn || `Gang / Bod (${etasje})`;
      break;
  }

  const arealM2 = Math.round(lengdeM * breddeM * 10) / 10;

  return {
    id,
    navn,
    etasje,
    type,
    lengdeM,
    breddeM,
    arealM2,
    utstyr,
    notater: '',
    avvik: [],
    bilder: [],
    lydfil: null,
  };
}

/**
 * Standard befaringsmal for et bolig-/næringsprosjekt
 */
export function standardBefaring(forvalgtNavn = 'Enebolig TP-01'): BefaringData {
  const rom: BefaringRom[] = [
    opprettStandardRom('bad', '2. etg', 'Hovedbad 2. etg'),
    opprettStandardRom('wc', '1. etg', 'Gjeste-WC 1. etg'),
    opprettStandardRom('kjokken', '1. etg', 'Kjøkken'),
    opprettStandardRom('vaskerom', '1. etg', 'Vaskerom'),
    opprettStandardRom('teknisk_rom', 'Kjeller / U1', 'Teknisk rom U1'),
    opprettStandardRom('oppholdsrom', '1. etg', 'Stue / Allrom 1. etg'),
  ];

  return {
    befarer: 'Kim Jørgensen (Rørleggermester & RIV)',
    dato: new Date().toISOString().slice(0, 10),
    rom,
    generelleNotater: `Opprinnelig befaring for ${forvalgtNavn}. Eksisterende vanninntak lokalisert i teknisk rom.`,
    sjekkpunkter: [],
    sistOppdatert: new Date().toISOString(),
  };
}

/**
 * Analyserer rommene for faglige avvik iht. TEK17 og Byggforsk
 */
export function analyserBefaringsAvvik(romListe: BefaringRom[]): BefaringSjekkpunkt[] {
  const punkter: BefaringSjekkpunkt[] = [];

  for (const rom of romListe) {
    // 1. TEK17 § 13-15 Våtrom skal ha sluk
    if (rom.type === 'bad' && rom.utstyr.sluk === 0) {
      punkter.push({
        id: `sluk-mangler-${rom.id}`,
        kategori: 'tek17_sluk',
        tittel: `⚠️ Mangler sluk i ${rom.navn}`,
        beskrivelse: 'Våtrom SKAL ha minst ett sluk og gulv med tilstrekkelig fall (TEK17 § 13-15).',
        alvor: 'kritisk',
        avklart: false,
        romNavn: rom.navn,
      });
    }

    if (rom.type === 'vaskerom' && rom.utstyr.sluk === 0) {
      punkter.push({
        id: `sluk-vaskerom-${rom.id}`,
        kategori: 'tek17_sluk',
        tittel: `Mangler sluk i ${rom.navn}`,
        beskrivelse: 'Rom med vanninstallasjon uten sluk krever automatisk vannstoppeventil og vanntett gulv.',
        alvor: 'viktig',
        avklart: false,
        romNavn: rom.navn,
      });
    }

    // 2. TEK17 § 15-7 / 950 mm tilbakeslagskontroll i kjeller/U1
    const erKjeller = /kjeller|u1|u2|underetasje|bakkeplan/i.test(rom.etasje);
    if (erKjeller && (rom.utstyr.sluk > 0 || rom.utstyr.wc > 0)) {
      punkter.push({
        id: `kote-kjeller-${rom.id}`,
        kategori: 'lov2_kote',
        tittel: `950 mm kotekontroll for ${rom.navn} (${rom.etasje})`,
        beskrivelse:
          'Laveste sluk/toalett i kjeller krever verifisering mot kommunal ITR-kote. Ligger kote < 950 mm over ITR, SKAL det prosjekteres pumpe (NS-EN 12050) eller tilbakeslagssikring.',
        alvor: 'kritisk',
        avklart: false,
        romNavn: rom.navn,
      });
    }

    // 3. Teknisk rom for varmesentral og VVB
    if (rom.type === 'teknisk_rom') {
      if (rom.arealM2 < 5.0) {
        punkter.push({
          id: `areal-teknisk-${rom.id}`,
          kategori: 'teknisk_rom',
          tittel: `Kompakt teknisk rom (${rom.arealM2} m²) i ${rom.navn}`,
          beskrivelse:
            'Areal for varmesentral og VVB bør være tilstrekkelig for service, ekspansjonskar og fordelerskap (min. 5–6 m² anbefalt).',
          alvor: 'viktig',
          avklart: false,
          romNavn: rom.navn,
        });
      }
      if (rom.utstyr.sluk === 0 && rom.utstyr.vvb) {
        punkter.push({
          id: `sluk-vvb-${rom.id}`,
          kategori: 'tek17_sluk',
          tittel: `Sikkerhetsventil VVB krever avløp/sluk i ${rom.navn}`,
          beskrivelse: 'Avblåsning fra VVB-sikkerhetsventil må ledes til sluk uten fare for skade.',
          alvor: 'kritisk',
          avklart: false,
          romNavn: rom.navn,
        });
      }
    }
  }

  // Sjekk om utekran mangler frostsikring
  const harUtekran = romListe.some((r) => r.utstyr.utekran);
  if (harUtekran) {
    punkter.push({
      id: 'frostfri-utekran',
      kategori: 'materialflyt',
      tittel: 'Frostfri utekran registrert',
      beskrivelse: 'Utekran må monteres med automatisk drenering og fall utover for å hindre frostsprengning.',
      alvor: 'info',
      avklart: true,
    });
  }

  return punkter;
}

/**
 * Omsetter rom, mål og utstyr fra befaringen direkte til komplette VVS-mengder og oppdatert prosjektdata
 */
export function omsettBefaringTilVVS(
  befaring: BefaringData,
  aktivtProsjekt: ProsjektData
): {
  oppdatertProsjekt: ProsjektData;
  generertVareliste: OrderItem[];
  sjekkpunkter: BefaringSjekkpunkt[];
  estimertTimeverk: number;
  oppsummering: {
    totalArealM2: number;
    antallRom: number;
    totalWc: number;
    totalServant: number;
    totalDusj: number;
    totalSluk: number;
    gulvvarmeM2: number;
  };
} {
  const romListe = befaring.rom;

  // 1. Summer opp areal og utstyr
  let totalArealM2 = 0;
  let totalWc = 0;
  let totalServant = 0;
  let totalDusj = 0;
  let totalSluk = 0;
  let totalBadekar = 0;
  let totalKjokkenvask = 0;
  let totalOppvaskmaskin = 0;
  let totalVaskemaskin = 0;
  let totalUtslagsvask = 0;
  let totalRadiatorer = 0;
  let harVvb = false;
  let antallFordelerskap = 0;
  let harUtekran = false;
  let gulvvarmeM2 = 0;

  for (const r of romListe) {
    totalArealM2 += r.arealM2;
    totalWc += r.utstyr.wc;
    totalServant += r.utstyr.servant;
    totalDusj += r.utstyr.dusj;
    totalSluk += r.utstyr.sluk;
    totalBadekar += r.utstyr.badekar;
    totalKjokkenvask += r.utstyr.kjokkenvask;
    totalOppvaskmaskin += r.utstyr.oppvaskmaskin;
    totalVaskemaskin += r.utstyr.vaskemaskin;
    totalUtslagsvask += r.utstyr.utslagsvask;
    totalRadiatorer += r.utstyr.radiator;
    if (r.utstyr.vvb) harVvb = true;
    if (r.utstyr.fordelerskap) antallFordelerskap++;
    if (r.utstyr.utekran) harUtekran = true;
    if (r.utstyr.gulvvarme) gulvvarmeM2 += r.arealM2;
  }

  // Minimum 1 fordelerskap hvis tappesteder finnes
  const totalTappesteder =
    totalWc + totalServant + totalDusj + totalBadekar + totalKjokkenvask + totalVaskemaskin;
  if (antallFordelerskap === 0 && totalTappesteder > 0) {
    antallFordelerskap = Math.max(1, Math.ceil(totalTappesteder / 10));
  }

  // 2. Bygg oppdatert sanitærutstyr-objekt
  const sumQn =
    totalWc * 0.1 +
    totalServant * 0.1 +
    totalDusj * 0.2 +
    totalBadekar * 0.3 +
    totalKjokkenvask * 0.2 +
    totalOppvaskmaskin * 0.15 +
    totalVaskemaskin * 0.15 +
    totalUtslagsvask * 0.2;

  const sumDu =
    totalWc * 1.0 +
    totalServant * 0.5 +
    totalDusj * 0.8 +
    totalBadekar * 1.5 +
    totalKjokkenvask * 0.8 +
    totalOppvaskmaskin * 0.8 +
    totalVaskemaskin * 0.8 +
    totalUtslagsvask * 0.8;

  // q_s formel iht. NS-EN 806-3 / Byggforsk 553.102
  const qsLPrS = sumQn > 0 ? Math.round((0.17 * Math.pow(sumQn, 0.45)) * 100) / 100 : 0;

  const sanitaerUtstyr: SanitaerUtstyrData = {
    wc: { antall: totalWc, qnLPrS: 0.1, du: 1.0 },
    servant: { antall: totalServant, qnLPrS: 0.1, du: 0.5 },
    urinal: { antall: 0, qnLPrS: 0.1, du: 0.5 },
    dusj: { antall: totalDusj, qnLPrS: 0.2, du: 0.8 },
    badekar: { antall: totalBadekar, qnLPrS: 0.3, du: 1.5 },
    kjokkenvask: { antall: totalKjokkenvask, qnLPrS: 0.2, du: 0.8 },
    oppvaskmaskin: { antall: totalOppvaskmaskin, qnLPrS: 0.15, du: 0.8 },
    vaskemaskin: { antall: totalVaskemaskin, qnLPrS: 0.15, du: 0.8 },
    utslagsvask: { antall: totalUtslagsvask, qnLPrS: 0.2, du: 0.8 },
    sumQn: Math.round(sumQn * 100) / 100,
    sumDu: Math.round(sumDu * 10) / 10,
    qsLPrS,
  };

  // 3. Generer komplett VVS-vareliste med NRF-koder
  const vareliste: OrderItem[] = [];
  let nextId = 101;

  const leggTil = (
    nrf: string,
    antall: number,
    kategoriOverstyring?: 'Lokkeand' | 'Mester-tillegg'
  ) => {
    if (antall <= 0) return;
    const info = NRF_VAREKATALOG[nrf];
    if (!info) return;

    vareliste.push({
      id: nextId++,
      nrf,
      beskrivelse: info.beskrivelse,
      antall,
      enhet: info.enhet,
      innpris: info.innpris,
      kategori: kategoriOverstyring || info.kategori,
    });
  };

  // Synlige sanitærarmaturer & utstyr (Lokkeand 20 % DG)
  if (totalWc > 0) leggTil('6190013', totalWc); // Geberit Duofix WC
  if (totalServant > 0) leggTil('4290154', totalServant); // Porsgrund Servant m/underskap
  if (harVvb) leggTil('8000552', 1); // OSO Saga S 200

  // QuickBox Veggbokser (1 per WC, 2 per servant/dusj/badekar/kjøkken, 1 per maskin/utekran)
  const sumVeggbokser =
    totalWc * 1 +
    totalServant * 2 +
    totalDusj * 2 +
    totalBadekar * 2 +
    totalKjokkenvask * 2 +
    totalOppvaskmaskin * 1 +
    totalVaskemaskin * 1 +
    (harUtekran ? 1 : 0);

  if (sumVeggbokser > 0) {
    leggTil('5118805', sumVeggbokser); // Roth QuickBox 16mm
  }

  // PEX Tappevannskurser 16mm (ca. 10m per veggboks/tappested)
  const estimertPexMeter = Math.max(50, Math.round(sumVeggbokser * 9));
  leggTil('5083703', estimertPexMeter); // Roth MultiPex 16mm

  // PEX Hovedledning 20mm fra inntak til skap
  const hovedledningMeter = Math.max(15, antallFordelerskap * 12);
  leggTil('5083705', hovedledningMeter); // Roth MultiPex 20mm

  // Fordelerskap
  if (antallFordelerskap > 0) {
    leggTil('5118712', antallFordelerskap); // Roth fordelerskap 550mm
  }

  // Gulvvarmerør (5 m per m² gulvvarme)
  if (gulvvarmeM2 > 0) {
    leggTil('8370003', Math.round(gulvvarmeM2 * 5)); // Roth X-PERT 16mm
  }

  // Kuleventiler (1 hovedavstengning + 2 per fordelerskap)
  leggTil('5621414', 1); // 3/4" Hovedavstengning
  if (antallFordelerskap > 0) {
    leggTil('5621404', antallFordelerskap * 2); // 1/2" Avstengningsventiler
  }

  // Avløp 110mm for toaletter og stammer
  const antallAvlop110 = Math.max(6, totalWc * 3 + romListe.length);
  leggTil('2213316', antallAvlop110); // Wavin AS+ 110x1000mm
  leggTil('2213346', Math.max(4, totalWc * 2)); // 110mm 45° bend

  // Avløp 75mm og 50mm for servanter, sluk, kjøkken, vaskemaskin
  const antallSmaAvlop = totalServant + totalDusj + totalKjokkenvask + totalVaskemaskin;
  if (antallSmaAvlop > 0) {
    leggTil('2213233', Math.max(4, Math.round(antallSmaAvlop * 1.5))); // 75mm rør
    leggTil('2213253', Math.max(4, antallSmaAvlop)); // 75mm 45° bend
    leggTil('2213133', Math.max(5, antallSmaAvlop * 2)); // 50mm rør
    leggTil('2213166', Math.max(4, antallSmaAvlop * 2)); // 50mm 87.5° bend
  }

  // Sluk Joti 110mm m/klemring
  if (totalSluk > 0) {
    leggTil('3401202', totalSluk); // Joti K-sluk
  }

  // Rørklammer med gummi (RSK)
  const totalRorMeter = estimertPexMeter + hovedledningMeter;
  const estimertKlammer = Math.max(15, Math.round(totalRorMeter / 10) * 4);
  leggTil('5083818', estimertKlammer); // Klammer 20-25mm
  leggTil('5083824', Math.max(10, Math.round(antallAvlop110 * 1.5))); // Klammer 110mm

  // Utekran
  if (harUtekran) {
    leggTil('5648112', 1); // FM Mattsson frostfri utekran
  }

  // 4. Timeverkestimat (normtider)
  // Basis 25 timer + 6t per bad + 3t per WC/vaskerom/kjøkken + 1t per 10m² gulvvarme
  const estimertTimer = Math.round(
    25 +
      totalWc * 5 +
      totalServant * 3 +
      totalDusj * 4 +
      totalKjokkenvask * 3 +
      totalSluk * 3 +
      (gulvvarmeM2 > 0 ? (gulvvarmeM2 / 10) * 1.2 : 0) +
      antallFordelerskap * 4
  );

  // 5. Analyser avvik
  const sjekkpunkter = analyserBefaringsAvvik(romListe);

  // 6. Oppdater prosjektet
  const oppdatertProsjekt: ProsjektData = {
    ...aktivtProsjekt,
    bra: totalArealM2 > 0 ? Math.round(totalArealM2) : aktivtProsjekt.bra,
    sanitaerUtstyr,
    varmeanlegg: {
      ...(aktivtProsjekt.varmeanlegg || {}),
      gulvvarmeM2: gulvvarmeM2 > 0 ? gulvvarmeM2 : aktivtProsjekt.varmeanlegg?.gulvvarmeM2,
      antallRadiatorer: totalRadiatorer > 0 ? totalRadiatorer : aktivtProsjekt.varmeanlegg?.antallRadiatorer,
    },
    befaring: {
      ...befaring,
      sjekkpunkter,
      sistOppdatert: new Date().toISOString(),
    },
  };

  return {
    oppdatertProsjekt,
    generertVareliste: vareliste,
    sjekkpunkter,
    estimertTimeverk: Math.max(35, estimertTimer),
    oppsummering: {
      totalArealM2: Math.round(totalArealM2 * 10) / 10,
      antallRom: romListe.length,
      totalWc,
      totalServant,
      totalDusj,
      totalSluk,
      gulvvarmeM2: Math.round(gulvvarmeM2 * 10) / 10,
    },
  };
}
