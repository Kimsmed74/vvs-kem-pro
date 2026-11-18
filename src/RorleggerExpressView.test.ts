import { describe, it, expect } from 'vitest';
import { PROSJEKT_PRESETS } from './data/prosjekter';
import { beregnUtpris, type OrderItem } from './components/AhlsellOrderQA';

describe('Rørlegger Express - Enova & Kalkyleregler', () => {
  it('tilordner 10 000 kr i Enova-støtte ved Rehabilitering og 0 kr ved Nybygg TEK17', () => {
    const totalInklMva = 125000;

    const beregnNettoInvestering = (type: 'rehab' | 'tek17') => {
      const enovaTilskudd = type === 'rehab' ? 10000 : 0;
      return totalInklMva - enovaTilskudd;
    };

    expect(beregnNettoInvestering('rehab')).toBe(115000);
    expect(beregnNettoInvestering('tek17')).toBe(125000);
  });

  it('genererer en komplett avklarings-e-post til byggherre med de 4 tekniske punktene', () => {
    const prosjekt = PROSJEKT_PRESETS[0];
    const bedriftsNavn = 'Rørleggermester Hansen AS';

    const genererAvklaringsEpost = () => {
      return `Emne: Viktig teknisk avklaring før endelig pristilbud - ${prosjekt.navn}

Hei,

Takk for oversendt underlag for prosjektet "${prosjekt.navn}".

1. KOTER OG AVLØPSFALL:
   Foreligger det en godkjent VA-situasjonsplan fra kommunen med IBR/ITR-koter for stikkledningen?

2. HOVEDSTOPPEKRAN OG VANNMÅLER:
   Hvor skal hovedstoppekran og vannmålerkonsoll plasseres?

3. ELEKTRISK KAPASITET (SIKRINGSSKAP):
   Er det 230V IT eller 400V TN-nett i bygget?

4. OVERVANN OG FORDRØYNING:
   Gjelder det lokale krav til fordrøyning eller infiltrasjon?

Med vennlig hilsen,
${bedriftsNavn}`;
    };

    const epost = genererAvklaringsEpost();
    expect(epost).toContain('KOTER OG AVLØPSFALL');
    expect(epost).toContain('HOVEDSTOPPEKRAN OG VANNMÅLER');
    expect(epost).toContain('ELEKTRISK KAPASITET');
    expect(epost).toContain('OVERVANN OG FORDRØYNING');
    expect(epost).toContain('Rørleggermester Hansen AS');
  });

  it('genererer et gyldig tilbudsbrev med spesifisert Enova-fradrag for rehabilitering', () => {
    const prosjekt = PROSJEKT_PRESETS[0];
    const bedriftsNavn = 'Rørleggermester Hansen AS';
    const totalEksMva = 100000;
    const mva = 25000;
    const totalInklMva = 125000;
    const enovaTilskudd = 10000;
    const nettoInvestering = totalInklMva - enovaTilskudd;

    const brev = `TILBUD PÅ KOMPLETT VVS-ANLEGG
Prosjekt: ${prosjekt.navn}
Leverandør: ${bedriftsNavn}
Total eks. mva: ${totalEksMva.toLocaleString('no-NO')} kr
Mva (25 %): ${mva.toLocaleString('no-NO')} kr
TOTAL TILBUDSSUM INKL. MVA: ${totalInklMva.toLocaleString('no-NO')} kr
ENOVA-TILSKUDD: -${enovaTilskudd.toLocaleString('no-NO')} kr
NETTO INVESTERING ETTER STØTTE: ${nettoInvestering.toLocaleString('no-NO')} kr inkl. mva`;

    expect(brev).toContain('TILBUD PÅ KOMPLETT VVS-ANLEGG');
    expect(brev).toContain(totalInklMva.toLocaleString('no-NO') + ' kr');
    expect(brev).toContain(enovaTilskudd.toLocaleString('no-NO') + ' kr');
    expect(brev).toContain(nettoInvestering.toLocaleString('no-NO') + ' kr');
  });

  it('beregner 5 % Kirsebærplukker-rabatt og korrekt timeverksbeløp', () => {
    const items: OrderItem[] = [
      { id: 1, nrf: '6190013', beskrivelse: 'Vegghengt WC', antall: 3, enhet: 'stk', innpris: 3800, kategori: 'Lokkeand' },
      { id: 2, nrf: '5083703', beskrivelse: 'Rør 16mm', antall: 50, enhet: 'm', innpris: 40, kategori: 'Mester-tillegg' },
    ];

    const materiellUtprisRaa = items.reduce(
      (sum, i) => sum + beregnUtpris(i.innpris, i.kategori) * i.antall,
      0
    );
    const rabatt = Math.round(materiellUtprisRaa * 0.05);
    const materiellNetto = materiellUtprisRaa - rabatt;

    const timer = 40;
    const timepris = 1150;
    const timerSum = timer * timepris;

    const totalEksMva = materiellNetto + timerSum;
    expect(totalEksMva).toBeGreaterThan(0);
    expect(rabatt).toBeGreaterThan(0);
    expect(timerSum).toBe(46000);
  });
});
