import { describe, expect, it } from 'vitest';
import {
  OVERHOYDE_DOKUMENTER,
  OVERHOYDE_TEK17,
  fordroyningsVolum,
  koteRegnskap,
  regnavrenning,
  reduserAreal,
} from './va';
import { minAreaVarmesentral, transmisjonstap } from './energi';
import { diskontering, enkelTilbakebetaling, lcc, nvFaktor } from './lcc';

/**
 * Fasit: "4_FASIT_Seniorradgiver_Losning_og_Beregninger_19_Agenter.pdf" (Forus Teknologipark),
 * "Prosjektunderlag Jåttåvågen Horisont (Case 02)", "Prosjektunderlag Landet Varmeverk (Case 03)"
 * og "case_04___solbakken_helsehus_vvs_rapport.txt".
 * Krav til overhøyde er verifisert mot TEK17 § 15-6 (3) / § 15-8 (3): 0,90 m.
 */
describe('TEK17-parametere', () => {
  it('TEK17 krever 0,90 m, dokumentene bruker 0,95 m', () => {
    expect(OVERHOYDE_TEK17).toBe(0.9);
    expect(OVERHOYDE_DOKUMENTER).toBe(0.95);
  });
});

describe('Forus – koteregnskap (felle 1)', () => {
  const kum = { ibrKum: 13.6, itrKum: 13.9, stikkLengde: 40, fall: 1 / 60 };

  it('40 m × 1:60 gir 0,67 m høydetap, utgang grunnmur minst C +14,27', () => {
    const r = koteRegnskap({ ...kum, laveste: 15.5 });
    expect(r.hoydeIGroft).toBeCloseTo(0.6667, 4);
    expect(r.minKoteUtgang).toBeCloseTo(14.27, 2);
  });
  it('1. etasje (OK FG +15,50): margin 1,60 m → selvfall OK', () => {
    const r = koteRegnskap({ ...kum, laveste: 15.5 });
    expect(r.margin).toBeCloseTo(1.6, 9);
    expect(r.selvfallOk).toBe(true);
  });
  it('Kjeller (OK FG +13,10): margin −0,80 m → RØD ALARM, pumpestasjon', () => {
    const r = koteRegnskap({ ...kum, laveste: 13.1 });
    expect(r.margin).toBeCloseTo(-0.8, 9);
    expect(r.selvfallOk).toBe(false);
  });
  it('fasitens «1,75 m» er mangel mot 0,95 m; mot TEK17 (0,90 m) er den 1,70 m', () => {
    expect(koteRegnskap({ ...kum, laveste: 13.1, krav: OVERHOYDE_DOKUMENTER }).mangel).toBeCloseTo(1.75, 9);
    expect(koteRegnskap({ ...kum, laveste: 13.1 }).mangel).toBeCloseTo(1.7, 9);
  });
  it('tegnerens bunnledning på C +12,80 gir motfall mot kum (IBR +13,60)', () => {
    expect(koteRegnskap({ ...kum, laveste: 13.1, planlagtBunnledning: 12.8 }).motfall).toBe(true);
    expect(koteRegnskap({ ...kum, laveste: 15.5, planlagtBunnledning: 14.3 }).motfall).toBe(false);
  });
  it('grensetilfelle: margin akkurat lik kravet godkjennes', () => {
    expect(koteRegnskap({ ...kum, laveste: 13.9 + 0.9 }).selvfallOk).toBe(true);
  });
});

describe('Case 02 og 03 – kotefeller', () => {
  it('Jåttåvågen: U1 +1,85 mot ITR +2,10 → margin −0,25 m, selvfall ulovlig', () => {
    const r = koteRegnskap({ ibrKum: 0, itrKum: 2.1, stikkLengde: 0, fall: 0, laveste: 1.85 });
    expect(r.margin).toBeCloseTo(-0.25, 9);
    expect(r.selvfallOk).toBe(false);
  });
  it('Landet Varmeverk: +2,40 mot ITR +2,20 → margin +0,20 m (kun 20 cm), ikke OK', () => {
    const r = koteRegnskap({ ibrKum: 0, itrKum: 2.2, stikkLengde: 30, fall: 1 / 60, laveste: 2.4 });
    expect(r.margin).toBeCloseTo(0.2, 9);
    expect(r.selvfallOk).toBe(false);
    expect(r.hoydeIGroft).toBeCloseTo(0.5, 9);
  });
});

describe('Forus – overvann', () => {
  const aRed = reduserAreal([
    { navn: 'Tak', areal: 1500, phi: 0.9 },
    { navn: 'Asfalt', areal: 3200, phi: 0.8 },
  ]);
  it('A_red = 1 350 + 2 560 = 3 910 m²', () => expect(aRed).toBeCloseTo(3910, 9));
  it('q = 280 l/(s·ha) × 0,391 ha ≈ 109,5 l/s', () =>
    expect(regnavrenning(280, aRed)).toBeCloseTo(109.48, 2));
  it('må holde tilbake q − 15 l/s = 94,5 l/s', () =>
    expect(regnavrenning(280, aRed) - 15).toBeCloseTo(94.48, 2));
  it('fasitens 65 m³ kan IKKE reproduseres fra oppgitt varighet (10 min gir ≈ 56,7 m³)', () => {
    const v10 = fordroyningsVolum(regnavrenning(280, aRed), 15, 10);
    expect(v10).toBeCloseTo(56.69, 1);
    expect(v10).toBeLessThan(65);
  });
});

describe('Forus – energi (felle 6)', () => {
  it('Σ(U·A) + kuldebro = 1 492,8 W/K', () => {
    const r = transmisjonstap(
      [
        { navn: 'Yttervegg netto', areal: 2400 - 720, u: 0.16 },
        { navn: 'Vinduer', areal: 640, u: 0.8 },
        { navn: 'Porter', areal: 80, u: 1.4 },
        { navn: 'Tak', areal: 1500, u: 0.12 },
        { navn: 'Gulv', areal: 1500, u: 0.13 },
      ],
      0.05,
      4500,
    );
    expect(r.deler).toBeCloseTo(1267.8, 9);
    expect(r.kuldebro).toBeCloseTo(225, 9);
    expect(r.total).toBeCloseTo(1492.8, 9);
  });
  it('varmesentral: 10 + 1 % av 4 500 m² = 55 m² (TEK17 § 14-4 (2))', () =>
    expect(minAreaVarmesentral(4500)).toBeCloseTo(55, 9));
  it('varmesentral: maks 100 m², og krav gjelder ikke under 1 000 m²', () => {
    expect(minAreaVarmesentral(20000)).toBe(100);
    expect(minAreaVarmesentral(900)).toBeNull();
  });
});

describe('Forus – 25 års LCC (4 %)', () => {
  const NV = 15.62; // fasitens avrundede nåverdifaktor
  it('eksakt nåverdifaktor 4 %, 25 år ≈ 15,622', () => expect(nvFaktor(0.04, 25)).toBeCloseTo(15.6221, 3));
  const alt = [
    { navn: 'Fjernvarme', capex: 1_450_000, opex: 404_600, fasit: 7_769_850 },
    { navn: 'Luft/vann R290', capex: 2_650_000, opex: 214_830, fasit: 6_005_645 },
    { navn: 'Bergvarme', capex: 3_850_000, opex: 119_775, fasit: 5_720_885 },
  ];
  it.each(alt)('$navn: LCC = CAPEX + OPEX × 15,62', ({ capex, opex, fasit }) => {
    expect(capex + opex * NV).toBeCloseTo(fasit, -1);
  });
  it('eksakt faktor gir < 0,1 % avvik fra fasiten', () => {
    for (const a of alt) {
      const r = lcc({ navn: a.navn, capex: a.capex, opexAar: a.opex }, 0.04, 25);
      expect(Math.abs(r.lcc - a.fasit) / a.fasit).toBeLessThan(0.001);
    }
  });
  it('bergvarme: merinvestering 2,4 mill, besparelse 284 825 kr/år, tilbakebetaling 8,4 år', () => {
    expect(3_850_000 - 1_450_000).toBe(2_400_000);
    expect(404_600 - 119_775).toBe(284_825);
    expect(enkelTilbakebetaling(2_400_000, 284_825)).toBeCloseTo(8.43, 2);
  });
  it('ingen besparelse gir null', () => expect(enkelTilbakebetaling(1000, 0)).toBeNull());
  it('fasitens nettogevinst på «over 2,0 mill.» stemmer (2,05 mill.)', () =>
    expect(7_769_850 - 5_720_885).toBe(2_048_965));
});

describe('Solbakken – LCC (3,5 %, 25 år)', () => {
  it('rapportens faktor 16,487 avviker fra eksakt (16,4815) – feilen er under 0,1 %', () => {
    const eksakt = nvFaktor(0.035, 25);
    expect(eksakt).toBeCloseTo(16.4815, 3);
    expect(Math.abs(16.487 - eksakt) / eksakt).toBeLessThan(0.001);
  });
  it('reinvesteringsfaktorene 0,5969 (år 15) og 0,5026 (år 20) stemmer', () => {
    expect(diskontering(0.035, 15)).toBeCloseTo(0.5969, 4);
    expect(diskontering(0.035, 20)).toBeCloseTo(0.5026, 4);
  });
  it('alternativ 3: eksakt LCC ≈ 8,05 mill., rapportens 8 049 615 innenfor 0,1 %', () => {
    const r = lcc(
      {
        navn: 'Bergvarme',
        capex: 3_500_000,
        opexAar: 200_408,
        reinvesteringer: [
          { aar: 15, belop: 1_750_000 },
          { aar: 20, belop: 400_000 },
        ],
      },
      0.035,
      25,
    );
    expect(Math.abs(r.lcc - 8_049_615) / 8_049_615).toBeLessThan(0.001);
  });
  it('rangering: alt 3 < alt 2 < alt 1', () => {
    const a1 = lcc({ navn: '1', capex: 1_200_000, opexAar: 542_759, reinvesteringer: [{ aar: 15, belop: 1_200_000 }] }, 0.035, 25);
    const a2 = lcc({ navn: '2', capex: 1_000_000, opexAar: 553_670, reinvesteringer: [{ aar: 20, belop: 250_000 }] }, 0.035, 25);
    const a3 = lcc({ navn: '3', capex: 3_500_000, opexAar: 200_408, reinvesteringer: [{ aar: 15, belop: 1_750_000 }, { aar: 20, belop: 400_000 }] }, 0.035, 25);
    expect(a3.lcc).toBeLessThan(a2.lcc);
    expect(a2.lcc).toBeLessThan(a1.lcc);
  });
});
