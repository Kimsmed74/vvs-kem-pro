import { describe, expect, it } from 'vitest';
import {
  EKSEMPEL_BUDSJETT,
  EKSEMPEL_FORDELING,
  EKSEMPEL_KOBLING,
  autoDimensjon,
  beregnKobling,
  beregnQs,
  innvendigDiameter,
  ugunstigsteKrets,
  beregnStrekk,
  beregnTrykkbudsjett,
  sumStrekk,
} from './sanitaer';
import { EKSEMPEL_BEREDER, beregnBereder } from './bereder';
import { overvann, spillvannQdim, spillvannQs } from './avlop';

/**
 * Fasit hentet fra Excel-filene i "KEM Skole":
 *  - vannledningsdimensjonering- trykkfallsberegning.xlsx (ark "fordelingsledning")
 *  - San.kv2.xlsx, San vvb.xlsx, San.ov.xlsx
 */
describe('Trykkbudsjett (fordelingsledning)', () => {
  const r = beregnTrykkbudsjett(EKSEMPEL_BUDSJETT);

  it('løftetrykk = 15 m · 9,81', () => expect(r.loftetrykk).toBeCloseTo(147.15, 6));
  it('disponibelt til friksjon + enkeltmotstander = 77,85 kPa', () =>
    expect(r.dispFriksjonOgEnkelt).toBeCloseTo(77.85, 6));
  it('20 % til rørdeler = 15,57 kPa', () => expect(r.rordeler).toBeCloseTo(15.57, 6));
  it('disponibelt til friksjon = 62,28 kPa', () => expect(r.dispFriksjon).toBeCloseTo(62.28, 6));
  it('midlere rørfriksjon = 1,2632860040568 kPa/m', () =>
    expect(r.midlereR).toBeCloseTo(1.2632860040568, 9));
  it('rørlengde 0 gir null (Excel: "rørlengde?")', () =>
    expect(beregnTrykkbudsjett({ ...EKSEMPEL_BUDSJETT, rorlengde: 0 }).midlereR).toBeNull());
});

describe('qS (maks sannsynlig vannmengde)', () => {
  it('San.kv2: ΣqN 0,3 / qN1 0,1 → 0,179026311234993', () =>
    expect(beregnQs(0.3, 0.1)).toBeCloseTo(0.179026311234993, 12));
  it('San.kv2: ΣqN 0,4 / qN1 0,1 → 0,197612834775878', () =>
    expect(beregnQs(0.4, 0.1)).toBeCloseTo(0.197612834775878, 12));
  it('ΣqN = 0 gir 0', () => expect(beregnQs(0, 0)).toBe(0));
  it('ΣqN = qN1 gir qN1', () => expect(beregnQs(0.3, 0.3)).toBeCloseTo(0.3, 12));
});

describe('Fordelingsledning – Σ R·l mot Excel-kontroll', () => {
  const rader = EKSEMPEL_FORDELING.map(beregnStrekk);
  const sum = sumStrekk(rader);

  it('total rørlengde = 49,3 m', () => expect(sum.lengde).toBeCloseTo(49.3, 9));
  it('Σ R·l = 52,7042547830631 kPa (Excel E9)', () =>
    expect(sum.rxl).toBeCloseTo(52.7042547830631, 6));
  it('Σ R·l ligger innenfor disponibelt friksjonstrykk', () =>
    expect(sum.rxl).toBeLessThanOrEqual(beregnTrykkbudsjett(EKSEMPEL_BUDSJETT).dispFriksjon));
  it('PDF-fasit: strekk g-h har qdim ≈ 0,40 l/s', () => {
    const gh = rader.find((x) => x.navn === 'g-h')!;
    expect(gh.qdim).toBeCloseTo(0.4, 1);
  });
});

describe('Fordelingsledning – rad for rad mot Excel (kolonne I, J og L)', () => {
  // [strekk, hastighet I, R J, R·l L] fra arket "fordelingsledning", rad 17–24.
  const fasit: [string, number, number, number][] = [
    ['koblingsledning', 2.40597041711104, 4.23962144086162, 9.75112931398173],
    ['g-h', 2.08027771503491, 2.54390806184902, 6.35977015462255],
    ['f-g', 1.67452571374177, 1.37857316495201, 4.13571949485603],
    ['e-f', 1.20665984251458, 0.562418707104528, 1.68725612131358],
    ['d-e', 1.43768864725547, 0.758387228217046, 2.27516168465114],
    ['c-d', 2.00926046678653, 1.34266834985532, 4.69933922449362],
    ['b-c', 1.86209123862341, 0.905202537517887, 9.05202537517887],
    ['a-b', 1.80797968731883, 0.6701751551802551, 14.7438534139656],
  ];
  const rader = EKSEMPEL_FORDELING.map(beregnStrekk);
  it.each(fasit)('%s', (navn, v, R, rxl) => {
    const b = rader.find((x) => x.navn === navn)!;
    expect(b.hastighet).toBeCloseTo(v, 9);
    expect(b.R).toBeCloseTo(R, 9);
    expect(b.rxl).toBeCloseTo(rxl, 9);
  });
});

describe('Koblingsledning og ugunstigste krets (Excel-arket "koblingsledning")', () => {
  const rader = EKSEMPEL_KOBLING.map(beregnKobling);
  // [strekk, R·l L, krets N] fra rad 17–19.
  it.each([
    ['badebatteri', 9.75112931398173, 139.751129313982],
    ['servantbatteri', 2.40611627950843, 52.4061162795084],
    ['oppvaskbatteri', 5.94269739966017, 105.94269739966],
  ])('%s', (navn, rxl, krets) => {
    const b = rader.find((x) => x.navn === navn)!;
    expect(b.rxl).toBeCloseTo(rxl, 9);
    expect(b.kretsTap).toBeCloseTo(krets, 9);
  });
  it('ugunstigste krets er badebatteriet', () =>
    expect(rader[ugunstigsteKrets(rader)].navn).toBe('badebatteri'));
  it('Σ R·l = 18,0999429931503 kPa (Excel E9)', () =>
    expect(sumStrekk(rader).rxl).toBeCloseTo(18.0999429931503, 9));
  it('tom liste gir -1', () => expect(ugunstigsteKrets([])).toBe(-1));
});

describe('Auto-dimensjonering', () => {
  it('velger en dimensjon som holder hastigheten ≤ 2,0 m/s', () => {
    for (const s of EKSEMPEL_FORDELING) {
      const dim = autoDimensjon(s);
      expect(beregnStrekk({ ...s, dim }).hastighet).toBeLessThanOrEqual(2.0);
    }
  });
});

describe('Spillvann', () => {
  it('qS = MAX(q1; 0,55·ΣqN^0,46)', () => {
    expect(spillvannQs(1.8, 5.4)).toBeCloseTo(Math.max(1.8, 0.55 * Math.pow(5.4, 0.46)), 12);
  });
  it('q1 dominerer ved liten ΣqN', () => expect(spillvannQs(1.8, 1.8)).toBeCloseTo(1.8, 12));
  it('qdim = qS + Σqkont', () => expect(spillvannQdim(1.8, 1.8, 0.5)).toBeCloseTo(2.3, 12));
});

describe('Overvann (San.ov.xlsx)', () => {
  it('parkering 50 × 17 m = 850 m², 0,02 · ψ 1 → 17 l/s', () => {
    const r = overvann(50, 17, 0.02, 1);
    expect(r.areal).toBeCloseTo(850, 9);
    expect(r.q).toBeCloseTo(17, 9);
  });
  it('tak 24,5 × 14,5 m = 355,25 m²', () =>
    expect(overvann(24.5, 14.5, 0.02, 1).areal).toBeCloseTo(355.25, 9));
});

describe('Bereder (San vvb.xlsx)', () => {
  const r = beregnBereder(EKSEMPEL_BEREDER);
  it('døgnenergi = 45,825 kWh', () => expect(r.kwhDogn).toBeCloseTo(45.825, 9));
  it('kolbeeffekt = 11,45625 kW', () => expect(r.effekt).toBeCloseTo(11.45625, 9));
  it('beredervolum = 196,392857142857 l', () => expect(r.volum).toBeCloseTo(196.392857142857, 9));
});

describe('Robusthet mot NaN og ukjent dimensjon', () => {
  it('saniterer NaN-inndata i trykkbudsjett, strekk og koblingsledning', () => {
    const bud = beregnTrykkbudsjett({
      hovedtrykk: Number.NaN,
      resttrykk: 100,
      loftehoyde: Number.NaN,
      enkeltmotstand: 0,
      rordelerProsent: 20,
      rorlengde: 10,
    });
    expect(Number.isFinite(bud.dispFriksjon)).toBe(true);
    expect(Number.isFinite(bud.midlereR!)).toBe(true);

    const strekk = beregnStrekk({
      navn: 'tom',
      sumQn: Number.NaN,
      qn1: Number.NaN,
      qkont: Number.NaN,
      dim: 15,
      l: Number.NaN,
    });
    expect(strekk.qdim).toBe(0);
    expect(strekk.rxl).toBe(0);

    const kob = beregnKobling({
      navn: 'kob',
      sumQn: 0,
      qn1: 0,
      qkont: 0.2,
      dim: 15,
      l: 2,
      armaturTap: Number.NaN,
    });
    expect(Number.isFinite(kob.kretsTap)).toBe(true);
  });

  it('faller tilbake trygt ved ukjent rørdimensjon uten å kaste unntak', () => {
    expect(innvendigDiameter(20)).toBe(19.0);
    expect(innvendigDiameter(999)).toBe(50.0);
  });
});
