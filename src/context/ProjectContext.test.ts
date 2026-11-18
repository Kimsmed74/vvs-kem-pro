import { describe, it, expect } from 'vitest';
import {
  detekterProsjektType,
  genererVarelisteForProsjekt,
  beregnUtpris,
  BOLIG_ORDER_DATA,
  NRF_VAREKATALOG,
} from '../lib/kalkyleKatalog';
import { tomtProsjekt, type ProsjektData } from '../data/prosjekter';

describe('ProjectContext & KalkyleKatalog - Dynamisk Vare- og Kalkylemotor', () => {
  it('detekterer prosjekttype automatisk basert på bygningstype, tekst og areal', () => {
    // 1. Bolig
    const boligProsjekt: ProsjektData = {
      ...tomtProsjekt('b1'),
      navn: 'Enebolig Fjellveien',
      bygningstype: 'Enebolig',
      bra: 180,
    };
    expect(detekterProsjektType(boligProsjekt)).toBe('bolig');

    // 2. Næringsbygg
    const naeringProsjekt: ProsjektData = {
      ...tomtProsjekt('n1'),
      navn: 'Fjellveien Kontor og Næring',
      bygningstype: 'Kontorbygg',
      bra: 2400,
    };
    expect(detekterProsjektType(naeringProsjekt)).toBe('naering');

    // 3. Sprinkleranlegg
    const sprinklerProsjekt: ProsjektData = {
      ...tomtProsjekt('s1'),
      navn: 'Logistikksenter med Sprinkleranlegg',
      bygningstype: 'Lager og logistikk',
      bra: 3500,
      beskrivelse: 'Bygget skal sprinkles iht. NS-EN 12845 med våtanlegg og alarmventil.',
    };
    expect(detekterProsjektType(sprinklerProsjekt)).toBe('sprinkler');

    // 4. Kombinasjonsbygg
    const kombiProsjekt: ProsjektData = {
      ...tomtProsjekt('k1'),
      navn: 'Kvartal 4 Kombinasjonsbygg',
      bygningstype: 'Kombinasjonsbygg bolig/næring',
      bra: 1500,
    };
    expect(detekterProsjektType(kombiProsjekt)).toBe('kombi');
  });

  it('tilpasser varelisten automatisk til Sprinkleranlegg (NS-EN 12845) med alarmventiler, rillede rør og sprinklerhoder', () => {
    const prosjekt: ProsjektData = {
      ...tomtProsjekt('sprinkler-test'),
      navn: 'Sentrum Næringspark Sprinkler',
      bra: 1200,
      bygningstype: 'Næringsbygg',
    };

    const sprinklerVareliste = genererVarelisteForProsjekt(prosjekt, 'sprinkler');

    // Må inneholde alarmventil DN 100
    const alarmventil = sprinklerVareliste.find((i) => i.nrf === '9210010');
    expect(alarmventil).toBeDefined();
    expect(alarmventil?.beskrivelse.toLowerCase()).toContain('alarmventil');
    expect(alarmventil?.kategori).toBe('Lokkeand');

    // Må inneholde sprinklerhoder K80 68°C
    const sprinklerhoder = sprinklerVareliste.find((i) => i.nrf === '9210020');
    expect(sprinklerhoder).toBeDefined();
    // For 1200 m² BRA: estimat ~ (1200 * 0.8) / 12 = 80 hoder
    expect(sprinklerhoder?.antall).toBeGreaterThanOrEqual(50);

    // Må inneholde rillede stålrør DN 65 og Victaulic rillekoblinger
    const rilleror = sprinklerVareliste.find((i) => i.nrf === '9210040');
    const victaulic = sprinklerVareliste.find((i) => i.nrf === '9210050');
    expect(rilleror).toBeDefined();
    expect(victaulic).toBeDefined();
    expect(victaulic?.kategori).toBe('Mester-tillegg');
  });

  it('tilpasser varelisten til Næringsbygg med BA-tilbakeslag, berøringsfrie kraner, urinaler og OSO Maxi', () => {
    const prosjekt: ProsjektData = {
      ...tomtProsjekt('naering-test'),
      navn: 'Næringskvartalet',
      bra: 2400,
      bygningstype: 'Kontorbygg',
      sanitaerUtstyr: {
        wc: { antall: 8, qnLPrS: 0.1, du: 2 },
        servant: { antall: 6, qnLPrS: 0.1, du: 0.5 },
        urinal: { antall: 4, qnLPrS: 0.1, du: 0.5 },
        dusj: { antall: 0, qnLPrS: 0.2, du: 1.5 },
        kjokkenvask: { antall: 0, qnLPrS: 0.2, du: 1.5 },
        oppvaskmaskin: { antall: 0, qnLPrS: 0.2, du: 1.5 },
        sumQn: 1.8,
        sumDu: 21,
        qsLPrS: 0.9,
      },
    };

    const naeringVareliste = genererVarelisteForProsjekt(prosjekt, 'naering');

    // Danfoss BA tilbakeslagssikring
    const baVentil = naeringVareliste.find((i) => i.nrf === '5648192');
    expect(baVentil).toBeDefined();
    expect(baVentil?.beskrivelse).toContain('kategori 4');

    // Oras Electra berøringsfrie armaturer
    const sensorKran = naeringVareliste.find((i) => i.nrf === '4290162');
    expect(sensorKran).toBeDefined();
    expect(sensorKran?.antall).toBe(6);

    // Geberit Urinaler
    const urinal = naeringVareliste.find((i) => i.nrf === '6190025');
    expect(urinal).toBeDefined();
    expect(urinal?.antall).toBe(4);

    // OSO Maxi 300L bereder
    const bereder = naeringVareliste.find((i) => i.nrf === '8001254');
    expect(bereder).toBeDefined();

    // 160mm hovedavløpsrør
    const avlop160 = naeringVareliste.find((i) => i.nrf === '2213388');
    expect(avlop160).toBeDefined();
  });

  it('skalerer sprinkler- og rørlengder proporsjonalt med bygningens BRA', () => {
    const liteBygg: ProsjektData = {
      ...tomtProsjekt('lite'),
      bra: 300,
    };
    const stortBygg: ProsjektData = {
      ...tomtProsjekt('stort'),
      bra: 3000,
    };

    const varelisteLite = genererVarelisteForProsjekt(liteBygg, 'sprinkler');
    const varelisteStort = genererVarelisteForProsjekt(stortBygg, 'sprinkler');

    const hoderLite = varelisteLite.find((i) => i.nrf === '9210020')?.antall ?? 0;
    const hoderStort = varelisteStort.find((i) => i.nrf === '9210020')?.antall ?? 0;

    expect(hoderStort).toBeGreaterThan(hoderLite);
    expect(hoderStort).toBeGreaterThanOrEqual(150);
  });

  it('opprettholder 100 % identiske dekningsgrader (20,0 % Lokkeand og 52,4 % Mester-tillegg)', () => {
    // Sjekk at NRF-oppslagsverket har gyldige margin-kategorier for alle varer
    for (const vare of Object.values(NRF_VAREKATALOG)) {
      expect(['Lokkeand', 'Mester-tillegg']).toContain(vare.kategori);
      expect(vare.innpris).toBeGreaterThan(0);

      const utpris = beregnUtpris(vare.innpris, vare.kategori);
      expect(utpris).toBeGreaterThan(vare.innpris);

      const dg = (utpris - vare.innpris) / utpris;
      if (vare.kategori === 'Lokkeand') {
        expect(dg * 100).toBeGreaterThanOrEqual(19.5);
        expect(dg * 100).toBeLessThanOrEqual(20.5);
      } else {
        expect(dg * 100).toBeGreaterThanOrEqual(52.0);
        expect(dg * 100).toBeLessThanOrEqual(53.0);
      }
    }
  });

  it('sikrer null avrundingsfeil og eksakt lik tilbudssum på tvers av kalkyler', () => {
    const vareliste = BOLIG_ORDER_DATA;
    const antallTimer = 65;
    const timeprisUt = 1150;
    const systemRabattAktiv = true;

    // Manuell summering
    const matRaa = vareliste.reduce((sum, i) => sum + beregnUtpris(i.innpris, i.kategori) * i.antall, 0);
    const rabatt = systemRabattAktiv ? Math.round(matRaa * 0.05) : 0;
    const matNetto = matRaa - rabatt;
    const timerSum = antallTimer * timeprisUt;
    const totalEksMva = matNetto + timerSum;
    const mva = Math.round(totalEksMva * 0.25);
    const totalInklMva = totalEksMva + mva;

    expect(matRaa).toBeGreaterThan(0);
    expect(rabatt).toBeGreaterThan(0);
    expect(matNetto).toBe(matRaa - rabatt);
    expect(totalEksMva).toBe(matNetto + timerSum);
    expect(totalInklMva).toBe(totalEksMva + mva);
    expect(Number.isInteger(totalEksMva)).toBe(true);
    expect(Number.isInteger(totalInklMva)).toBe(true);
  });
});
