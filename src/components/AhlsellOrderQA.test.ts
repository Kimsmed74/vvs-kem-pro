import { describe, it, expect } from 'vitest';
import { beregnUtpris, csvFelt, csvTekst, type OrderItem } from './AhlsellOrderQA';

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

describe('AhlsellOrderQA - CSV-eksportformater', () => {
  it('unnslipper anførselstegn og semikolon i CSV-felter (hindrer korrupsjon)', () => {
    expect(csvFelt('Roth QuickBox veggboks 16mm x 1/2"')).toBe('"Roth QuickBox veggboks 16mm x 1/2"""');
    expect(csvFelt('Rør; kobling')).toBe('"Rør; kobling"');
    expect(csvFelt(12345)).toBe('12345');
    expect(csvFelt('Helt vanlig tekst')).toBe('Helt vanlig tekst');
    expect(csvTekst('Helt vanlig tekst')).toBe('"Helt vanlig tekst"');
  });

  it('genererer gyldig Ahlsell M3 format med NRF;Antall', () => {
    const items: OrderItem[] = [
      { id: 1, nrf: '6190013', beskrivelse: 'Vegghengt WC', antall: 3, enhet: 'stk', innpris: 3800, kategori: 'Lokkeand' },
      { id: 2, nrf: '0000000', beskrivelse: 'Tom post', antall: 0, enhet: 'stk', innpris: 0, kategori: 'Lokkeand' },
    ];

    const m3Csv = 'NRF;Antall\n' + items.filter((i) => i.antall > 0).map((i) => `${csvFelt(i.nrf)};${i.antall}`).join('\n');
    expect(m3Csv).toBe('NRF;Antall\n6190013;3');
    expect(m3Csv).not.toContain('0000000');
  });

  it('genererer gyldig Tripletex import-CSV med timer og rabattlinje', () => {
    const item: OrderItem = { id: 1, nrf: '5118805', beskrivelse: 'Veggboks 1/2"', antall: 4, enhet: 'stk', innpris: 295, kategori: 'Mester-tillegg' };
    const ut = beregnUtpris(item.innpris, item.kategori); // 295 * 2.10 = 620

    const rader = [
      `${csvFelt(item.nrf)};${csvTekst(item.beskrivelse)};${item.antall};${csvFelt(item.enhet)};${item.innpris};${ut};3`,
      `TIME-VVS;${csvTekst('Rørleggertimer / Montering')};10;timer;550;1150;3`,
      `RABATT-SYS;${csvTekst('5 % Samlet Systempakke-rabatt (Kirsebærplukker-skjold)')};1;stk;0;-124;3`,
    ];

    const csv = 'Produktnummer;Produktnavn;Antall;Enhet;Innkjøpspris;Utsalgspris;Mva-kode\n' + rader.join('\n');
    expect(csv).toContain('5118805;"Veggboks 1/2""";4;stk;295;620;3');
    expect(csv).toContain('TIME-VVS;"Rørleggertimer / Montering";10;timer;550;1150;3');
    expect(csv).toContain('RABATT-SYS;"5 % Samlet Systempakke-rabatt (Kirsebærplukker-skjold)";1;stk;0;-124;3');
  });

  it('genererer gyldig Holte SmartKalk format med NS 3420 postkoder 31.01 og timer 31.90', () => {
    const item: OrderItem = { id: 1, nrf: '6190013', beskrivelse: 'WC-sisterne', antall: 2, enhet: 'stk', innpris: 3800, kategori: 'Lokkeand' };
    const ut = beregnUtpris(item.innpris, item.kategori); // 4750

    const postnr = '31.01';
    const rad = `${postnr};${csvFelt(item.nrf)};${csvTekst(item.beskrivelse)};${item.antall};${csvFelt(item.enhet)};${item.innpris};${ut};${ut * item.antall}`;
    const timeRad = `31.90;TIME-VVS;${csvTekst('Rørleggertimer / Montering')};15;timer;550;1150;${15 * 1150}`;

    const csv = 'Postnr;NRF;Beskrivelse;Mengde;Enhet;Kostpris;Salgspris;Sum_Salg\n' + rad + '\n' + timeRad;
    expect(csv).toContain('31.01;6190013;"WC-sisterne";2;stk;3800;4750;9500');
    expect(csv).toContain('31.90;TIME-VVS;"Rørleggertimer / Montering";15;timer;550;1150;17250');
  });
});
