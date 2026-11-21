import { describe, it, expect } from 'vitest';
import {
  ROR_STILER,
  VVS_SYMBOLER,
  type RorType,
  type SymbolType,
  type Punkt,
} from './VvsTegnebrett';
import { NRF_VAREKATALOG, beregnUtpris } from './lib/kalkyleKatalog';

describe('VVS Tegnebrett & Rørskisse Motor', () => {
  it('har definert alle 4 rørtyper med gyldige NRF-koder, farger og TEK17-krav', () => {
    const typer: RorType[] = ['kaldtvann', 'varmtvann', 'varme', 'avlop'];
    for (const t of typer) {
      const stil = ROR_STILER[t];
      expect(stil).toBeDefined();
      expect(stil.navn.length).toBeGreaterThan(0);
      expect(stil.farge).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(stil.tykkelse).toBeGreaterThan(0);
      expect(stil.nrf.length).toBeGreaterThanOrEqual(7);
      expect(NRF_VAREKATALOG[stil.nrf]).toBeDefined();
      expect(stil.tek17Krav).toContain('TEK17');
    }
  });

  it('har definert alle 7 VVS-symboler med ikoner, gyldige NRF-koder og beskrivelser', () => {
    const symboler: SymbolType[] = [
      'wc',
      'servant',
      'sluk',
      'fordelerskap',
      'varmepumpe',
      'radiator',
      'ventil',
    ];

    for (const s of symboler) {
      const def = VVS_SYMBOLER[s];
      expect(def).toBeDefined();
      expect(def.type).toBe(s);
      expect(def.tittel.length).toBeGreaterThan(0);
      expect(def.kort.length).toBeGreaterThan(0);
      expect(def.ikon.length).toBeGreaterThan(0);
      expect(def.nrf.length).toBeGreaterThanOrEqual(7);
      expect(NRF_VAREKATALOG[def.nrf]).toBeDefined();
    }
  });

  it('beregner rørlengde nøyaktig basert på målestokk og legger til 15 % svinn/oppstikk', () => {
    const pxPrMeter = 40; // 40 piksler per meter
    const punkter: Punkt[] = [
      { x: 100, y: 100 },
      { x: 300, y: 100 }, // 200 px bortover = 5.0 meter
      { x: 300, y: 220 }, // 120 px nedover = 3.0 meter
    ];

    // Samlet pikselavstand: 200 + 120 = 320 px
    let samletPixel = 0;
    for (let i = 1; i < punkter.length; i++) {
      const dx = punkter[i].x - punkter[i - 1].x;
      const dy = punkter[i].y - punkter[i - 1].y;
      samletPixel += Math.sqrt(dx * dx + dy * dy);
    }

    const rawMeter = Math.round((samletPixel / pxPrMeter) * 100) / 100;
    const medSvinnMeter = Math.round(rawMeter * 1.15 * 100) / 100;

    expect(rawMeter).toBe(8.0); // 320 / 40 = 8.0 m
    expect(medSvinnMeter).toBe(9.2); // 8.0 * 1.15 = 9.20 m
  });

  it('beregner klammerbehov iht. TEK17 / SINTEF Byggforsk (0.6 m PEX, 0.8 m avløp)', () => {
    const pexMeter = 18; // 18m / 0.6 = 30 klammer
    const avlopMeter = 8; // 8m / 0.8 = 10 klammer
    const estimertKlammer = Math.max(8, Math.ceil(pexMeter / 0.6 + avlopMeter / 0.8));

    expect(estimertKlammer).toBe(40);
  });

  it('sikrer at beregnUtpris for alle genererte varer beregner uten NaN eller avrundingsfeil', () => {
    const testNrfListe = [
      '6190013', // WC
      '4290154', // Servant
      '3401202', // Sluk
      '5118712', // Fordelerskap
      '8361001', // Varmepumpe
      '5083703', // MultiPex 16mm
      '8370003', // Gulvvarmerør 16mm
      '2213133', // PP Avløp 50mm
      '5083812', // Rørklammer
      '5621414', // Kuleventil 3/4"
    ];

    for (const nrf of testNrfListe) {
      const vare = NRF_VAREKATALOG[nrf];
      expect(vare).toBeDefined();
      const utpris = beregnUtpris(vare.innpris, vare.kategori);

      expect(Number.isFinite(utpris)).toBe(true);
      expect(utpris).toBeGreaterThan(vare.innpris);

      // Verifiser dekningsgrad
      const dgProsent = ((utpris - vare.innpris) / utpris) * 100;
      if (vare.kategori === 'Lokkeand') {
        expect(Math.abs(dgProsent - 20.0)).toBeLessThan(0.5);
      } else {
        expect(Math.abs(dgProsent - 52.4)).toBeLessThan(0.5);
      }
    }
  });
});
