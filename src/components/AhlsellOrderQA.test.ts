import { describe, it, expect } from 'vitest';
import {
  beregnUtpris,
  csvFelt,
  csvTekst,
  INITIAL_ORDER_DATA,
  NRF_VAREKATALOG,
  synkroniserOrdreMedProsjekt,
  genererAhlsellM3CSV,
  genererTripletexCSV,
  genererHolteSmartKalkCSV,
  genererQAKalkyleCSV,
  type OrderItem,
} from './AhlsellOrderQA';
import type { ProsjektData } from '../data/prosjekter';

describe('AhlsellOrderQA - Dekningsgrad & Prisberegninger', () => {
  it('beregner nøyaktig 20,0 % dekningsgrad for Lokkeand-kategorien (faktor 1.25)', () => {
    const innpris = 1000;
    const utpris = beregnUtpris(innpris, 'Lokkeand');
    expect(utpris).toBe(1250);

    // Dekningsgrad = (Utpris - Innpris) / Utpris
    const dg = (utpris - innpris) / utpris;
    expect(dg).toBeCloseTo(0.20, 4);
    expect((dg * 100).toFixed(1)).toBe('20.0');
  });

  it('beregner nøyaktig 52,4 % dekningsgrad for Mester-tillegg (faktor 2.10)', () => {
    const innpris = 1000;
    const utpris = beregnUtpris(innpris, 'Mester-tillegg');
    expect(utpris).toBe(2100);

    // Dekningsgrad = (Utpris - Innpris) / Utpris = 1100 / 2100 = 52.38095... %
    const dg = (utpris - innpris) / utpris;
    expect((dg * 100).toFixed(1)).toBe('52.4');
  });

  it('håndterer 0, negative verdier og NaN uten feil', () => {
    expect(beregnUtpris(0, 'Lokkeand')).toBe(0);
    expect(beregnUtpris(0, 'Mester-tillegg')).toBe(0);
    expect(beregnUtpris(-500, 'Lokkeand')).toBe(0);
    expect(beregnUtpris(NaN, 'Mester-tillegg')).toBe(0);
  });

  it('beregner samlet kalkyleregnskap, Kirsebærplukker-skjold og timeverk nøyaktig', () => {
    const testItems: OrderItem[] = [
      { id: 1, nrf: '6190013', beskrivelse: 'Vegghengt WC', antall: 2, enhet: 'stk', innpris: 3800, kategori: 'Lokkeand' },
      { id: 2, nrf: '5083703', beskrivelse: 'Rør-i-rør 16mm', antall: 50, enhet: 'm', innpris: 40, kategori: 'Mester-tillegg' },
    ];

    // Rå materiellpriser
    // Post 1: 3800 * 1.25 = 4750 kr * 2 stk = 9500 kr (innkjøp: 7600 kr)
    // Post 2: 40 * 2.10 = 84 kr * 50 m = 4200 kr (innkjøp: 2000 kr)
    const materiellInnkjop = testItems.reduce((sum, i) => sum + i.innpris * i.antall, 0);
    expect(materiellInnkjop).toBe(7600 + 2000); // 9600 kr

    const materiellUtprisRaa = testItems.reduce((sum, i) => sum + beregnUtpris(i.innpris, i.kategori) * i.antall, 0);
    expect(materiellUtprisRaa).toBe(9500 + 4200); // 13700 kr

    // Kirsebærplukker-skjold aktiv (5 % rabatt)
    const rabattBelop = Math.round(materiellUtprisRaa * 0.05); // 13700 * 0.05 = 685 kr
    expect(rabattBelop).toBe(685);
    const materiellUtprisNetto = materiellUtprisRaa - rabattBelop; // 13015 kr
    expect(materiellUtprisNetto).toBe(13015);

    // Timeverk: 20 timer @ selvkost 550 kr / timepris ut 1150 kr
    const antallTimer = 20;
    const timeSelvkost = 550;
    const timeprisUt = 1150;

    const timerKost = antallTimer * timeSelvkost; // 11000 kr
    const timerSalg = antallTimer * timeprisUt; // 23000 kr

    const totalInnkjopOgKost = materiellInnkjop + timerKost; // 9600 + 11000 = 20600 kr
    const totalTilbudssumEksMva = materiellUtprisNetto + timerSalg; // 13015 + 23000 = 36015 kr

    const totalDGBelop = totalTilbudssumEksMva - totalInnkjopOgKost; // 36015 - 20600 = 15415 kr
    const totalDGProsent = ((totalDGBelop / totalTilbudssumEksMva) * 100).toFixed(1);

    expect(totalDGProsent).toBe('42.8');
    expect(Number(totalDGProsent)).toBeGreaterThan(38);
  });
});

describe('AhlsellOrderQA - Komplett TP-01 Mengdeuttak & NRF Vareoppslagsverk', () => {
  it('inneholder 100 % komplett materiellflyt for enebolig (TP-01) fra inntak til avløp', () => {
    expect(INITIAL_ORDER_DATA.length).toBe(21);

    // 1. Hovedledning PEX 20mm (15m)
    const pex20 = INITIAL_ORDER_DATA.find((i) => i.nrf === '5083705');
    expect(pex20).toBeDefined();
    expect(pex20?.antall).toBe(15);
    expect(pex20?.enhet).toBe('m');
    expect(pex20?.kategori).toBe('Mester-tillegg');

    // 2. Kurser PEX 16mm (75m)
    const pex16 = INITIAL_ORDER_DATA.find((i) => i.nrf === '5083703');
    expect(pex16).toBeDefined();
    expect(pex16?.antall).toBe(75);
    expect(pex16?.enhet).toBe('m');
    expect(pex16?.kategori).toBe('Mester-tillegg');

    // 3. Gulvvarmerør PEX 16mm (120m)
    const gulvvarme = INITIAL_ORDER_DATA.find((i) => i.nrf === '8370003');
    expect(gulvvarme).toBeDefined();
    expect(gulvvarme?.antall).toBe(120);
    expect(gulvvarme?.enhet).toBe('m');
    expect(gulvvarme?.kategori).toBe('Mester-tillegg');

    // 4. Fordelerskap komplett med ramme
    const fordelerskap = INITIAL_ORDER_DATA.find((i) => i.nrf === '5118712');
    expect(fordelerskap).toBeDefined();
    expect(fordelerskap?.antall).toBe(1);
    expect(fordelerskap?.enhet).toBe('stk');
    expect(fordelerskap?.kategori).toBe('Mester-tillegg');

    // 5. Veggbokser (QuickBox)
    const quickbox = INITIAL_ORDER_DATA.find((i) => i.nrf === '5118805');
    expect(quickbox).toBeDefined();
    expect(quickbox?.antall).toBe(8);
    expect(quickbox?.enhet).toBe('stk');
    expect(quickbox?.kategori).toBe('Mester-tillegg');

    // 6. Avløpsrør i PP (50mm, 75mm, 110mm)
    const ror110 = INITIAL_ORDER_DATA.find((i) => i.nrf === '2213316');
    const ror75 = INITIAL_ORDER_DATA.find((i) => i.nrf === '2213233');
    const ror50 = INITIAL_ORDER_DATA.find((i) => i.nrf === '2213133');
    expect(ror110?.antall).toBe(8);
    expect(ror75?.antall).toBe(6);
    expect(ror50?.antall).toBe(5);

    // 7. Avløpsbøyer (45° og 87.5°)
    const bend110 = INITIAL_ORDER_DATA.find((i) => i.nrf === '2213346');
    const bend75 = INITIAL_ORDER_DATA.find((i) => i.nrf === '2213253');
    const bend50_87 = INITIAL_ORDER_DATA.find((i) => i.nrf === '2213166');
    const bend50_45 = INITIAL_ORDER_DATA.find((i) => i.nrf === '2213153');
    expect(bend110?.antall).toBe(4);
    expect(bend75?.antall).toBe(4);
    expect(bend50_87?.antall).toBe(4);
    expect(bend50_45?.antall).toBe(4);

    // 8. Rørklammer med gummi (RSK)
    const rskKlammer = INITIAL_ORDER_DATA.find((i) => i.nrf === '5083812');
    const avlopKlammer = INITIAL_ORDER_DATA.find((i) => i.nrf === '2213914');
    expect(rskKlammer?.antall).toBe(30);
    expect(avlopKlammer?.antall).toBe(8);

    // 9. Kuleventiler / avstengningsventiler
    const kuleventil34 = INITIAL_ORDER_DATA.find((i) => i.nrf === '5621414');
    const kuleventil12 = INITIAL_ORDER_DATA.find((i) => i.nrf === '5621404');
    expect(kuleventil34?.antall).toBe(2);
    expect(kuleventil12?.antall).toBe(4);

    // 10. Sanitær og varmepumpe
    const wc = INITIAL_ORDER_DATA.find((i) => i.nrf === '6190013');
    const servant = INITIAL_ORDER_DATA.find((i) => i.nrf === '4290154');
    const vp = INITIAL_ORDER_DATA.find((i) => i.nrf === '8361001');
    expect(wc?.antall).toBe(3);
    expect(wc?.kategori).toBe('Lokkeand');
    expect(servant?.antall).toBe(2);
    expect(servant?.kategori).toBe('Lokkeand');
    expect(vp?.antall).toBe(1);
    expect(vp?.kategori).toBe('Lokkeand');
  });

  it('tilordner konsekvent margin-strategi: 20 % Lokkeand og 52,4 % Mester-tillegg', () => {
    for (const item of INITIAL_ORDER_DATA) {
      if (['6190013', '4290154', '8361001'].includes(item.nrf)) {
        expect(item.kategori).toBe('Lokkeand');
      } else {
        expect(item.kategori).toBe('Mester-tillegg');
      }
      expect(Number.isFinite(item.innpris)).toBe(true);
      expect(item.innpris).toBeGreaterThan(0);
      expect(item.antall).toBeGreaterThan(0);
    }
  });

  it('synkroniserOrdreMedProsjekt oppdaterer mengder basert på prosjektdata', () => {
    const prosjektMock = {
      id: 'tp-01',
      navn: 'Test Enebolig',
      sanitaerUtstyr: {
        wc: { antall: 4, normflomLPrS: 0.1 },
        servant: { antall: 3, normflomLPrS: 0.1 },
        dusj: { antall: 2, normflomLPrS: 0.2 },
      },
      varmeanlegg: {
        gulvvarmeM2: 50,
      },
    } as unknown as ProsjektData;

    const synket = synkroniserOrdreMedProsjekt(INITIAL_ORDER_DATA, prosjektMock);
    const wcItem = synket.find((i) => i.nrf === '6190013');
    const servantItem = synket.find((i) => i.nrf === '4290154');
    const quickboxItem = synket.find((i) => i.nrf === '5118805');
    const gulvvarmeItem = synket.find((i) => i.nrf === '8370003');

    expect(wcItem?.antall).toBe(4);
    expect(servantItem?.antall).toBe(3);
    // 4 WC (4) + 3 servant (6) + 2 dusj (4) = 14 bokser
    expect(quickboxItem?.antall).toBe(14);
    // 50 m² gulvvarme * 5 m/m² = 250 m
    expect(gulvvarmeItem?.antall).toBe(250);
  });

  it('NRF_VAREKATALOG inneholder alle påkrevde varer med fullstendige data', () => {
    expect(Object.keys(NRF_VAREKATALOG).length).toBeGreaterThanOrEqual(20);
    expect(NRF_VAREKATALOG['5083705'].beskrivelse).toContain('20mm');
    expect(NRF_VAREKATALOG['5083703'].beskrivelse).toContain('16mm');
    expect(NRF_VAREKATALOG['8370003'].beskrivelse).toContain('gulvvarmerør');
    expect(NRF_VAREKATALOG['5118712'].beskrivelse).toContain('fordelerskap');
  });
});

describe('AhlsellOrderQA - CSV-eksportformater', () => {
  it('unnslipper anførselstegn og semikolon i CSV-felter (hindrer korrupsjon)', () => {
    expect(csvFelt('Roth QuickBox veggboks 16mm x 1/2"')).toBe('"Roth QuickBox veggboks 16mm x 1/2"""');
    expect(csvFelt('Rør; kobling')).toBe('"Rør; kobling"');
    expect(csvFelt(12345)).toBe('12345');
    expect(csvFelt('Helt vanlig tekst')).toBe('Helt vanlig tekst');
    expect(csvTekst('Helt vanlig tekst')).toBe('"Helt vanlig tekst"');
  });

  it('genererer fullstendig Ahlsell M3 Hurtigordre med alle 21 varelinjer uten NaN', () => {
    const csv = genererAhlsellM3CSV(INITIAL_ORDER_DATA);
    const linjer = csv.trim().split('\n');

    expect(linjer[0]).toBe('NRF;Antall');
    expect(linjer.length).toBe(22); // Header + 21 varelinjer

    for (const item of INITIAL_ORDER_DATA) {
      expect(csv).toContain(`${item.nrf};${item.antall}`);
    }
    expect(csv).not.toContain('NaN');
    expect(csv).not.toContain('undefined');
  });

  it('genererer fullstendig Tripletex VVS-import med timer og Kirsebærplukker-skjold', () => {
    const antallTimer = 65;
    const timeSelvkost = 550;
    const timeprisUt = 1150;
    const rabattBelop = 6523;

    const csv = genererTripletexCSV(
      INITIAL_ORDER_DATA,
      antallTimer,
      timeSelvkost,
      timeprisUt,
      true,
      true,
      rabattBelop
    );
    const linjer = csv.trim().split('\n');

    expect(linjer[0]).toBe('Produktnummer;Produktnavn;Antall;Enhet;Innkjøpspris;Utsalgspris;Mva-kode');
    // 1 header + 21 varer + 1 timer + 1 rabatt = 24 linjer
    expect(linjer.length).toBe(24);

    // Sjekk at alle 21 NRF-varer finnes med mva-kode 3
    for (const item of INITIAL_ORDER_DATA) {
      const ut = beregnUtpris(item.innpris, item.kategori);
      expect(csv).toContain(`${item.nrf};${csvTekst(item.beskrivelse)};${item.antall};${item.enhet};${item.innpris};${ut};3`);
    }

    // Timer og rabatt
    expect(csv).toContain(`TIME-VVS;"Rørleggertimer / Montering";65;timer;550;1150;3`);
    expect(csv).toContain(`RABATT-SYS;"5 % Samlet Systempakke-rabatt (Kirsebærplukker-skjold)";1;stk;0;-6523;3`);
    expect(csv).not.toContain('NaN');
    expect(csv).not.toContain('undefined');
  });

  it('genererer fullstendig Holte SmartKalk format med NS 3420 postkoder 31.01-31.21', () => {
    const antallTimer = 65;
    const timeSelvkost = 550;
    const timeprisUt = 1150;
    const rabattBelop = 6523;

    const csv = genererHolteSmartKalkCSV(
      INITIAL_ORDER_DATA,
      antallTimer,
      timeSelvkost,
      timeprisUt,
      true,
      true,
      rabattBelop
    );
    const linjer = csv.trim().split('\n');

    expect(linjer[0]).toBe('Postnr;NRF;Beskrivelse;Mengde;Enhet;Kostpris;Salgspris;Sum_Salg');
    // 1 header + 21 varer + 1 timer + 1 rabatt = 24 linjer
    expect(linjer.length).toBe(24);

    // Sjekk at første og siste varepost er nummerert iht. NS 3420
    expect(linjer[1]).toContain('31.01;6190013;"Geberit Duofix Vegghengt WC-sisterne komplett";3;stk;3800;4750;14250');
    expect(linjer[21]).toContain('31.21;5648184;"Waterguard+ sentral med trådløse sensorer & magnetventil";1;stk;5400;11340;11340');

    // Sjekk at timer er på 31.90 og rabatt på 31.99
    expect(csv).toContain(`31.90;TIME-VVS;"Rørleggertimer / Montering";65;timer;550;1150;74750`);
    expect(csv).toContain(`31.99;RABATT;"5 % Samlet Systempakke-rabatt (Kirsebærplukker-skjold)";1;stk;0;-6523;-6523`);

    // Sjekk at ingen rader har regnefeil (Sum_Salg = Salgspris * Mengde)
    for (let i = 1; i <= 21; i++) {
      const deler = linjer[i].split(';');
      const mengde = Number(deler[3]);
      const salgspris = Number(deler[6]);
      const sumSalg = Number(deler[7]);
      expect(sumSalg).toBe(mengde * salgspris);
    }

    expect(csv).not.toContain('NaN');
    expect(csv).not.toContain('undefined');
  });

  it('genererer fullstendig intern QA-kalkyle med nøyaktige marginer', () => {
    const csv = genererQAKalkyleCSV(INITIAL_ORDER_DATA, 65, 550, 1150, true);
    expect(csv).toContain('NRF;Antall;Beskrivelse;Kategori;Enhetspris_Inn;Enhetspris_Ut;Total_Inn;Total_Ut;DG_Prosent');
    expect(csv).toContain('6190013;3;"Geberit Duofix Vegghengt WC-sisterne komplett";Lokkeand;3800;4750;11400;14250;20.0%');
    expect(csv).toContain('5083705;15;"Roth MultiPex rør-i-rør 20mm (Hovedledning inntak/fordeler)";Mester-tillegg;54;113;810;1695;52.2%');
    expect(csv).not.toContain('NaN');
  });
});
