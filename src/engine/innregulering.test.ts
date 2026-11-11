import { describe, expect, it } from 'vitest';
import {
  DELTA_T_PRESETS,
  HYDRONISKE_VENTILER,
  VENTILASJON_VENTILER,
  beregnHydroniskInnregulering,
  beregnVentilasjonsInnregulering,
  beregnKondensOgDuggpunkt,
  beregnSprinklerHydraulikk,
  beregnLccNs3454,
  type HydroniskStrengInput,
  type VentilVentilInput,
} from './innregulering';
import { beregnSprinklerOgBranntrommel, byggTfmKode } from './fagmoduler';

describe('Hydronisk Innregulering & Ventildimensjonering', () => {
  const kretser: HydroniskStrengInput[] = [
    {
      id: 'k1',
      navn: 'Radiatorkrets Fløy A',
      type: 'varme',
      ventilId: 'ta_stad_25',
      presetId: '80_60',
      effektKw: 50,
      deltaTK: 20,
      dpKretsKpa: 15,
      dpVentilKpa: 15,
      valgtKvs: 8.7,
      maaltVannmengdeLh: 2150,
    },
    {
      id: 'k2',
      navn: 'Kjølebatteri VB 01',
      type: 'kjoling',
      ventilId: 'danfoss_abqm_25',
      presetId: '6_12',
      effektKw: 30,
      deltaTK: 6,
      dpKretsKpa: 28, // Indekskurs (høyest motstand)
      dpVentilKpa: 20,
      valgtKvs: 0,
      maaltVannmengdeLh: 4200,
    },
    {
      id: 'k3',
      navn: 'Gulvvarme Bad & Garderober',
      type: 'varme',
      ventilId: 'ta_stad_20',
      presetId: '45_35',
      effektKw: 15,
      deltaTK: 7,
      dpKretsKpa: 10,
      dpVentilKpa: 10,
      valgtKvs: 5.7,
      maaltVannmengdeLh: 1850,
    },
  ];

  it('beregner prosjektert vannmengde q = Φ / (4.187 * ΔT) korrekt', () => {
    const res = beregnHydroniskInnregulering(kretser);
    const k1 = res.strenger.find((s) => s.id === 'k1')!;
    // 50 / (4.187 * 20) = 0.597086 l/s -> 2149.5 l/h
    expect(k1.qProsjLs).toBeCloseTo(0.5971, 3);
    expect(k1.qProsjLh).toBeCloseTo(2149.5, 0);
  });

  it('beregner glykolkrets med cp = 3.95 kJ/(l·K) korrekt', () => {
    const glykolKrets: HydroniskStrengInput[] = [
      {
        id: 'g1',
        navn: 'Snøsmelteanlegg Rampe (30% Glykol)',
        type: 'glykol',
        effektKw: 40,
        deltaTK: 10,
        dpKretsKpa: 25,
        dpVentilKpa: 15,
        valgtKvs: 4.0,
        maaltVannmengdeLh: 3600,
      },
    ];
    const res = beregnHydroniskInnregulering(glykolKrets);
    const g1 = res.strenger[0];
    // 40 / (3.95 * 10) = 1.012658 l/s -> 3645.57 l/h
    expect(g1.qProsjLs).toBeCloseTo(1.0127, 3);
    expect(g1.qProsjLh).toBeCloseTo(3645.6, 0);
  });

  it('kobler mot IMI TA STAD katalog og beregner forinnstilling i omdreininger', () => {
    const res = beregnHydroniskInnregulering(kretser);
    const k1 = res.strenger.find((s) => s.id === 'k1')!;
    expect(k1.valgtVentilNavn).toContain('IMI TA STAD DN25');
    expect(k1.ventilType).toBe('STAD');
    expect(k1.forinnstillingTekst).toContain('omdr.');
  });

  it('kobler mot Danfoss AB-QM 4.0 PICV og beregner forinnstilling i %', () => {
    const res = beregnHydroniskInnregulering(kretser);
    const k2 = res.strenger.find((s) => s.id === 'k2')!;
    expect(k2.valgtVentilNavn).toContain('Danfoss AB-QM 4.0 DN25');
    expect(k2.ventilType).toBe('PICV');
    expect(k2.forinnstillingTekst).toContain('%');
    expect(k2.autoritetStatus).toBe('ideell');
  });

  it('har tilgjengelige temperaturpresets og ventiler', () => {
    expect(DELTA_T_PRESETS.length).toBeGreaterThanOrEqual(6);
    expect(HYDRONISKE_VENTILER.length).toBeGreaterThanOrEqual(15);
  });

  it('beregner ventilautoritet β = dp_ventil / (dp_krets + dp_ventil)', () => {
    const res = beregnHydroniskInnregulering(kretser);
    const k1 = res.strenger.find((s) => s.id === 'k1')!;
    // 15 / (15 + 15) = 0.50 (ideell)
    expect(k1.ventilAutoritetBeta).toBeCloseTo(0.5, 2);
    expect(k1.autoritetStatus).toBe('ideell');

    const k3 = res.strenger.find((s) => s.id === 'k3')!;
    // 10 / (10 + 10) = 0.50 (ideell)
    expect(k3.ventilAutoritetBeta).toBeCloseTo(0.5, 2);
    expect(k3.autoritetStatus).toBe('ideell');
  });

  it('identifiserer indekskurs (ugunstigste kurs med størst dpKrets)', () => {
    const res = beregnHydroniskInnregulering(kretser);
    expect(res.indekskurs).not.toBeNull();
    expect(res.indekskurs?.id).toBe('k2');
    expect(res.indekskurs?.erIndekskurs).toBe(true);
  });

  it('beregner pumpens nødvendige settpunkt H_pumpe [kPa] og [mVS]', () => {
    const res = beregnHydroniskInnregulering(kretser);
    // K2: 28 + 20 = 48 kPa
    expect(res.pumpeSettpunktKpa).toBe(48);
    expect(res.pumpeSettpunktMvs).toBeCloseTo(48 / 9.81, 2);
  });

  it('beregner avvik i % og gir godkjent innenfor ±10 %', () => {
    const res = beregnHydroniskInnregulering(kretser);
    const k1 = res.strenger.find((s) => s.id === 'k1')!;
    expect(Math.abs(k1.avvikProsent)).toBeLessThanOrEqual(10);
    expect(k1.innreguleringStatus).toBe('godkjent');
  });
});

describe('Luftteknisk Innregulering (Ventilasjon)', () => {
  const ventiler: VentilVentilInput[] = [
    {
      id: 'v1',
      rom: 'Møterom 101',
      type: 'tilluft',
      ventilId: 'sys_tff_160',
      dimensjon: 'Ø160',
      kFaktor: 4.3,
      qProsjM3h: 180,
      maaltTrykkPa: Math.round(Math.pow(180 / 3.6 / 4.3, 2)),
    },
    {
      id: 'v2',
      rom: 'Møterom 101',
      type: 'avtrekk',
      ventilId: 'sys_eff_160',
      dimensjon: 'Ø160',
      kFaktor: 3.9,
      qProsjM3h: 195,
      maaltTrykkPa: Math.round(Math.pow(195 / 3.6 / 3.9, 2)),
    },
  ];

  it('kobler mot ventilasjonskatalog og henter k-faktor for Systemair/Lindab/Trox', () => {
    expect(VENTILASJON_VENTILER.length).toBeGreaterThanOrEqual(18);
    const res = beregnVentilasjonsInnregulering(ventiler, 1.2);
    const v1 = res.ventiler.find((x) => x.id === 'v1')!;
    expect(v1.valgtVentilNavn).toContain('Systemair TFF Ø160');
    expect(v1.kFaktor).toBe(4.3);
  });

  it('beregner teoretisk måletrykk Δp_m = (q_ls / k)²', () => {
    const res = beregnVentilasjonsInnregulering(ventiler, 1.2);
    const v1 = res.ventiler.find((x) => x.id === 'v1')!;
    // 180 m³/h = 50 l/s. (50 / 4.3)² ≈ 135.2 Pa
    expect(v1.qProsjLs).toBeCloseTo(50, 1);
    expect(v1.beregnetTrykkPa).toBeCloseTo(135.2, 0);
  });

  it('beregner innregulert luftmengde q_målt = k * sqrt(Δp_målt) * 3.6', () => {
    const res = beregnVentilasjonsInnregulering(ventiler, 1.2);
    const v1 = res.ventiler.find((x) => x.id === 'v1')!;
    expect(v1.maaltLuftmengdeM3h).toBeCloseTo(180, 0);
    expect(Math.abs(v1.avvikProsent)).toBeLessThan(1.0);
    expect(v1.status).toBe('godkjent');
  });

  it('evaluerer trykkbalanse og SFP-faktor', () => {
    const res = beregnVentilasjonsInnregulering(ventiler, 0.05);
    expect(res.sumTilluftProsjM3h).toBe(180);
    expect(res.sumAvtrekkProsjM3h).toBe(195);
    // Avtrekk > Tilluft gir svakt undertrykk (anbefalt)
    expect(res.balanseM3h).toBeLessThan(0);
    expect(res.balanseVurdering.status).toBe('anbefalt_undertrykk');
    expect(res.sfpOkTek17).toBe(true);
  });
});

describe('Isolasjon & Duggpunkt / Kondens (Kjøling/Isvann)', () => {
  it('identifiserer kondensfare dersom overflatetemperaturen faller under duggpunktet', () => {
    // 6 °C isvann uten isolasjon (s = 1 mm) ved 24 °C og 60 % RF
    const uisolert = beregnKondensOgDuggpunkt({
      rorDiameterMm: 54,
      isoTykkelseMm: 1,
      lambdaIso: 0.036,
      medieTempC: 6,
      omgivelseTempC: 24,
      relativFuktighet: 60,
    });
    // Duggpunkt ved 24 °C / 60 % RF er ca. 15.75 °C
    expect(uisolert.duggpunktTempC).toBeCloseTo(15.75, 1);
    expect(uisolert.overflateTempC).toBeLessThan(uisolert.duggpunktTempC);
    expect(uisolert.kondensfare).toBe(true);
    expect(uisolert.anbefaltMinIsoMm).toBeGreaterThan(5);
  });

  it('bekrefter kondenssikkerhet ved tilstrekkelig cellegummiisolasjon', () => {
    // 32 mm Armaflex cellegummi
    const isolert = beregnKondensOgDuggpunkt({
      rorDiameterMm: 54,
      isoTykkelseMm: 32,
      lambdaIso: 0.036,
      medieTempC: 6,
      omgivelseTempC: 24,
      relativFuktighet: 60,
    });
    expect(isolert.kondensfare).toBe(false);
    expect(isolert.overflateTempC).toBeGreaterThan(isolert.duggpunktTempC);
    expect(isolert.sikkerhetsmarginK).toBeGreaterThan(2.0);
  });
});

describe('Hydraulisk Brann- og Sprinklerkontroll (NS-EN 12845)', () => {
  it('godkjenner direkte tilkobling når kommunalt trykk overstiger behovet inkludert BA-ventil', () => {
    const res = beregnSprinklerHydraulikk({
      fareklasse: 'OH1',
      vannbehovLmin: 900,
      dyseTrykkBar: 1.0,
      lofteHoydeM: 10, // ~1.0 bar
      rorfriksjonBar: 1.0,
      tilgjengeligTrykkBar: 5.5,
    });
    // Inkluderer 0.8 bar for BA-tilbakeslagsventil NS-EN 1717 kat. 4
    expect(res.baVentilTapBar).toBe(0.8);
    expect(res.godkjentDirekte).toBe(true);
    expect(res.kreverPumpe).toBe(false);
  });

  it('krever sprinklerpumpe når kommunalt trykk er utilstrekkelig ved spisslast', () => {
    const res = beregnSprinklerHydraulikk({
      fareklasse: 'OH2',
      vannbehovLmin: 1500,
      dyseTrykkBar: 1.5,
      lofteHoydeM: 25, // ~2.45 bar
      rorfriksjonBar: 1.5,
      tilgjengeligTrykkBar: 3.0,
    });
    // Behov: 1.5 + 1.5 + 2.45 + 0.8 = ~6.25 bar. Tilgjengelig 3.0 bar -> mangler ~3.25 bar
    expect(res.godkjentDirekte).toBe(false);
    expect(res.kreverPumpe).toBe(true);
    expect(res.pumpeLoftehoydeBar).toBeGreaterThan(2.0);
  });
});

describe('NS 3454 LCC-Kalkulator', () => {
  it('beregner nåverdi av livsløpskostnader over levetiden inkludert 40 og 60 år', () => {
    const alt = [
      {
        navn: 'Alt 1: Lav CAPEX',
        investeringCapexKr: 500000,
        aarligEnergiKwh: 100000,
        stromprisKrPerKwh: 1.5,
        aarligVedlikeholdKr: 20000,
        levetidAar: 30,
        kalkulasjonsrenteProsent: 4.0,
      },
      {
        navn: 'Alt 2: Bergvarmepumpe',
        investeringCapexKr: 1200000,
        aarligEnergiKwh: 35000,
        stromprisKrPerKwh: 1.5,
        aarligVedlikeholdKr: 15000,
        levetidAar: 30,
        kalkulasjonsrenteProsent: 4.0,
      },
    ];

    const res = beregnLccNs3454(alt, 1000);
    expect(res.alternativer).toHaveLength(2);
    expect(res.besteAlternativ?.navn).toBe('Alt 2: Bergvarmepumpe');
    expect(res.alternativer[0].totalLivslopskostnad40AarKr).toBeGreaterThan(0);
    expect(res.alternativer[0].totalLivslopskostnad60AarKr).toBeGreaterThan(res.alternativer[0].totalLivslopskostnad40AarKr);
  });
});

describe('TFM-Merkesystem (Statsbygg PA 0802)', () => {
  it('bygger standard TFM-kode med lokasjon, system og komponent', () => {
    const kode = byggTfmKode({
      lokasjon: 'A',
      systemKode: '320',
      systemLopenr: 1,
      komponentKode: 'PU',
      komponentLopenr: 1,
    });
    expect(kode).toBe('+A=320.001-PU001');
  });

  it('støtter valgfri %Typekode iht. Statsbygg PA 0802', () => {
    const kodeMedType = byggTfmKode({
      lokasjon: 'A',
      systemKode: '360',
      systemLopenr: 1,
      komponentKode: 'JV',
      komponentLopenr: 2,
      typeKode: 'TF',
    });
    expect(kodeMedType).toBe('+A=360.001-JV002%TF');
  });
});

describe('Robusthet & underdimensjonering', () => {
  it('flagget underdimensjonert PICV-ventil i forinnstillingTekst', () => {
    const res = beregnHydroniskInnregulering([
      {
        id: 'u1',
        navn: 'Stor krets på liten PICV',
        type: 'kjoling',
        ventilId: 'danfoss_abqm_15lf',
        effektKw: 20,
        deltaTK: 6,
        dpKretsKpa: 15,
        dpVentilKpa: 16,
        valgtKvs: 0,
        maaltVannmengdeLh: 2800,
      },
    ]);
    expect(res.strenger[0].forinnstillingTekst).toContain('Underdim.');
  });

  it('beskytter beregnKondensOgDuggpunkt mot lambdaIso <= 0 eller NaN', () => {
    const res = beregnKondensOgDuggpunkt({
      rorDiameterMm: 54,
      isoTykkelseMm: 32,
      lambdaIso: 0,
      medieTempC: 6,
      omgivelseTempC: 24,
      relativFuktighet: 60,
    });
    expect(Number.isFinite(res.overflateTempC)).toBe(true);
    expect(Number.isFinite(res.varmetapWattPerM)).toBe(true);
  });

  it('klemmer negativ slangelengde i branntrommelkontroll til >= 0', () => {
    const res = beregnSprinklerOgBranntrommel({
      fareklasse: 'OH1',
      kFaktor: 80,
      dekningPerDyseM2: 12,
      ganglinjeTilFjernesteHjorneM: 10,
      slangeLengdeM: -10,
      tilgjengeligDynamiskTrykkBar: 4.0,
    });
    expect(res.maksTillattGanglinjeM).toBe(5);
    expect(res.ganglinjeOk).toBe(false);
  });
});
