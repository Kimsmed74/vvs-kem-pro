import { describe, expect, it } from 'vitest';
import { PROSJEKT_PRESETS, tomtProsjekt } from '../data/prosjekter';
import { MODULER } from '../modules';
import { varmtvannsVolum } from '../engine/bereder';
import { tilbakeslagMargin } from '../engine/va';
import { analyserProsjekt } from './analyse';
import {
  analyserTekstLokalt,
  beskrivUttrekkEndringer,
  detekterFilKategori,
  flettUttrekkInnIProsjekt,
  flettUttrekkResultater,
  harUttrekkData,
  lagKortFunnTekst,
  lesOgAnalyserFilLokalt,
} from './filer';
import { flettUttrekkInnISkjema, tilSkjema } from '../components/ProsjektDialog';
import {
  OVERSTYRING_ETIKETT,
  anvendOverstyringMedEstimat,
  evaluerGatekeeper,
  lagKommuneForesporselEpost,
} from './gatekeeper';
import {
  byggGeminiForesporsel,
  lesGeminiSvar,
  sendTilGemini,
  tolkGeminiVisionJson,
  trekkUtProsjektJsonFraChatSvar,
} from './gemini';
import { lagProsjektBackupJson, lesProsjektBackupJson } from './idb';
import {
  flettKartverketInnIProsjekt,
  slaaOppAdresseOgKoteIKartverket,
} from './kartverket';
import {
  QA_PUNKTER,
  SANITY_PUNKTER,
  beregnKravVarmesentralM2,
  beregnSignaturStatus,
  vurderKotekontrollStatus,
} from './qa';
import { genererTrykkfallMarkdown } from './rapportMarkdown';
import { flyttIArray, rensLatexFormler } from './format';
import {
  beregnProsjektFremdrift,
  genererFremdriftOgTidMarkdown,
  FAG_FASER,
  type TidssporingTilstand,
} from './fremdrift';
import {
  EKSEMPEL_BUDSJETT,
  EKSEMPEL_FORDELING,
  beregnStrekk,
  beregnTrykkbudsjett,
  sumStrekk,
} from '../engine/sanitaer';
import {
  EKSEMPEL_BEFARINGS_TRANSKRIPSJON,
  STANDARD_MOTE_STEG,
  analyserMoteTranskripsjonLokalt,
  formaterOpptaksTid,
} from './moteopptak';
import {
  INNSTILLINGER_NOKKEL,
  LAGER_NOKKEL,
  gjenopprettPresetsITilstand,
  hentSynligeProsjekter,
  lagreInnstillinger,
  lagreTilstand,
  lastInnstillinger,
  lastTilstand,
  slettProsjektFraTilstand,
  standardTilstand,
  type Lager,
} from './lagring';
import { prosjektKontekst } from './prompt';

const hent = (id: string) => PROSJEKT_PRESETS.find((p) => p.id === id)!;

function fakeLager(): Lager & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

describe('engine-tillegg', () => {
  it('tilbakeslagMargin: margin og krav', () => {
    expect(tilbakeslagMargin(15.5, 13.9, 0.95)).toMatchObject({ ok: true });
    const r = tilbakeslagMargin(13.1, 13.9, 0.95);
    expect(r.ok).toBe(false);
    expect(r.margin).toBeCloseTo(-0.8, 6);
    expect(r.mangel).toBeCloseTo(1.75, 6); // Forus-fasit: «bryter 950 mm-regelen med 1,75 m»
  });
  it('varmtvannsVolum: 5 760 l blandet 38 °C fra 70 °C bereder og 7 °C kaldtvann', () => {
    expect(varmtvannsVolum(5760, 38, 70, 7)).toBeCloseTo(2834.29, 1);
    expect(varmtvannsVolum(100, 38, 7, 7)).toBe(0);
  });
});

describe('analyserProsjekt – ferdige prosjekter (kun dokumenterte data)', () => {
  it('Forus: kjeller bryter kravet, 1. etasje OK, kote ved grunnmur og overvann stemmer med fasit', () => {
    const a = analyserProsjekt(hent('forus'), 0.95);
    const kjeller = a.gulvKontroller.find((g) => g.navn.startsWith('Kjeller'))!;
    const etg1 = a.gulvKontroller.find((g) => g.navn === '1. etasje')!;
    expect(kjeller.margin).toBeCloseTo(-0.8, 6);
    expect(kjeller.ok).toBe(false);
    expect(etg1.margin).toBeCloseTo(1.6, 6);
    expect(etg1.ok).toBe(true);
    expect(a.lov2Status).toBe('brudd');
    expect(a.minKoteUtgang).toBeCloseTo(14.2667, 3);
    expect(a.overvann!.aRed).toBeCloseTo(3910, 6);
    expect(a.overvann!.q).toBeCloseTo(109.48, 2);
    expect(a.overvann!.tilbakehold).toBeCloseTo(94.48, 2);
    expect(a.bereder!.blandetLiter).toBeCloseTo(5760, 6);
    expect(a.varmesentral).toMatchObject({ kravM2: 55, avsattM2: 28, ok: false });
  });

  it('Forus: statisk trykk er antatt, så Q/p flagges som mangel (Lov 1)', () => {
    const a = analyserProsjekt(hent('forus'), 0.95);
    expect(a.datasjekk.find((d) => d.id === 'trykk')!.ok).toBe(false);
    expect(a.mangler.some((m) => m.includes('antatt'))).toBe(true);
  });

  it('Jåttåvågen: U1 er 250 mm under ITR; overvann kan ikke beregnes uten φ', () => {
    const a = analyserProsjekt(hent('jatta'), 0.95);
    expect(a.gulvKontroller[0].margin).toBeCloseTo(-0.25, 6);
    expect(a.lov2Status).toBe('brudd');
    expect(a.overvann).toBeNull();
    expect(a.minKoteUtgang).toBeNull(); // IBR og stikkledning er ikke oppgitt
    expect(a.trykk.fallBar).toBeCloseTo(2.1, 6);
  });

  it('Landet Varmeverk: margin kun +0,20 m bryter både 0,90 og 0,95', () => {
    for (const krav of [0.9, 0.95]) {
      const a = analyserProsjekt(hent('landet'), krav);
      expect(a.gulvKontroller[0].margin).toBeCloseTo(0.2, 6);
      expect(a.gulvKontroller[0].ok).toBe(false);
    }
  });

  it('Solbakken og Enebolig har ingen koter: Lov 2 kan ikke vurderes (ingen gjetting)', () => {
    for (const id of ['solbakken', 'enebolig']) {
      const a = analyserProsjekt(hent(id), 0.95);
      expect(a.lov2Status).toBe('mangler_data');
      expect(a.gulvKontroller).toHaveLength(0);
      expect(a.mangler.length).toBeGreaterThan(3);
    }
  });

  it('kravet påvirker utfallet: margin 0,92 m består 0,90 men ikke 0,95', () => {
    const p = { ...tomtProsjekt('x'), navn: 'x', koter: { ...tomtProsjekt('x').koter, itrKum: 10, gulv: [{ navn: 'g', kote: 10.92 }] } };
    expect(analyserProsjekt(p, 0.9).lov2Status).toBe('ok');
    expect(analyserProsjekt(p, 0.95).lov2Status).toBe('brudd');
  });

  it('kontekst-teksten viser «IKKE OPPGITT» i stedet for å gjette', () => {
    const p = hent('solbakken');
    const tekst = prosjektKontekst(p, analyserProsjekt(p, 0.95));
    expect(tekst).toContain('ITR = IKKE OPPGITT');
    expect(tekst).toContain('KAN IKKE UTFØRES');
  });
});

describe('lagring (localStorage)', () => {
  it('tom lagring gir standardtilstand', () => {
    expect(lastTilstand(fakeLager())).toEqual(standardTilstand());
  });

  it('lagrer og laster egne prosjekter og tilstand', () => {
    const lager = fakeLager();
    const p = { ...tomtProsjekt('p-1'), navn: 'Mitt bygg', bra: 1200 };
    const t = { ...standardTilstand(), brukerProsjekter: [p], aktivId: 'p-1', krav: 0.9 };
    t.tilstand['p-1'] = { qa: { 'sp-1': true }, agentSjekk: {}, steg: { '1': true }, aktivtSteg: 3 };
    expect(lagreTilstand(lager, t)).toBe(true);
    const lest = lastTilstand(lager);
    expect(lest.aktivId).toBe('p-1');
    expect(lest.krav).toBe(0.9);
    expect(lest.brukerProsjekter[0].navn).toBe('Mitt bygg');
    expect(lest.tilstand['p-1'].aktivtSteg).toBe(3);
  });

  it('ødelagt eller ufullstendig data krasjer ikke', () => {
    const lager = fakeLager();
    lager.setItem(LAGER_NOKKEL, '{ikke json');
    expect(lastTilstand(lager)).toEqual(standardTilstand());
    lager.setItem(LAGER_NOKKEL, JSON.stringify({ brukerProsjekter: [{ id: 'a', navn: 'A' }, 5, null], aktivId: 'finnes-ikke', krav: -3 }));
    const t = lastTilstand(lager);
    expect(t.brukerProsjekter).toHaveLength(1);
    expect(t.brukerProsjekter[0].koter.gulv).toEqual([]);
    expect(t.aktivId).toBe(standardTilstand().aktivId);
    expect(t.krav).toBe(0.95);
  });

  it('API-nøkkel lagres separat fra prosjektdata', () => {
    const lager = fakeLager();
    lagreInnstillinger(lager, { geminiNokkel: 'abc', modell: 'gemini-x' });
    expect(lager.getItem(LAGER_NOKKEL)).toBeNull();
    expect(lager.getItem(INNSTILLINGER_NOKKEL)).toContain('abc');
    expect(lastInnstillinger(lager)).toEqual({ geminiNokkel: 'abc', modell: 'gemini-x' });
  });

  it('støtter sletting av både egne prosjekter og standard-casene (Case 01–05) samt gjenoppretting', () => {
    let t = standardTilstand();
    expect(hentSynligeProsjekter(t)).toHaveLength(PROSJEKT_PRESETS.length);

    // Slett første standard-case (forus)
    t = slettProsjektFraTilstand(t, 'forus');
    expect(t.skjultePresetIder).toEqual(['forus']);
    expect(t.aktivId).toBe(PROSJEKT_PRESETS[1].id);
    expect(hentSynligeProsjekter(t)).toHaveLength(PROSJEKT_PRESETS.length - 1);

    // Slett alle gjenværende standard-caser -> appen oppretter automatisk et nytt tomt prosjekt
    for (const p of PROSJEKT_PRESETS.slice(1)) {
      t = slettProsjektFraTilstand(t, p.id);
    }
    expect(hentSynligeProsjekter(t)).toHaveLength(1);
    expect(t.brukerProsjekter).toHaveLength(1);

    // Gjenopprett standard-casene (Case 01–05)
    t = gjenopprettPresetsITilstand(t);
    expect(t.skjultePresetIder).toBeUndefined();
    expect(hentSynligeProsjekter(t)).toHaveLength(PROSJEKT_PRESETS.length + 1);
  });
});

describe('Gemini-klient', () => {
  const hist = [
    { rolle: 'bruker' as const, tekst: 'Hei' },
    { rolle: 'agent' as const, tekst: 'Hallo' },
    { rolle: 'bruker' as const, tekst: 'Spørsmål' },
  ];

  it('bygger forespørsel med nøkkel i header og roller user/model', () => {
    const { url, init } = byggGeminiForesporsel('NØKKEL', 'gemini-2.5-flash', 'SYSTEM', hist);
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent');
    expect(url).not.toContain('NØKKEL');
    expect(init.headers['x-goog-api-key']).toBe('NØKKEL');
    const body = JSON.parse(init.body);
    expect(body.systemInstruction.parts[0].text).toBe('SYSTEM');
    expect(body.contents.map((c: { role: string }) => c.role)).toEqual(['user', 'model', 'user']);
  });

  it('leser svar, og gir lesbare feil', () => {
    expect(lesGeminiSvar({ candidates: [{ content: { parts: [{ text: 'A' }, { text: 'B' }] } }] })).toBe('AB');
    expect(() => lesGeminiSvar({ error: { message: 'API key not valid' } })).toThrow('API key not valid');
    expect(() => lesGeminiSvar({ promptFeedback: { blockReason: 'SAFETY' } })).toThrow('SAFETY');
    expect(() => lesGeminiSvar({ candidates: [] })).toThrow('tomt');
  });

  it('sendTilGemini bruker injisert fetch og avviser manglende nøkkel', async () => {
    const fakeFetch = (async () =>
      ({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: 'Svar' }] } }] }) }) as Response) as typeof fetch;
    await expect(sendTilGemini({ nokkel: 'k', modell: 'm', system: 's', historikk: hist }, fakeFetch)).resolves.toBe('Svar');
    await expect(sendTilGemini({ nokkel: ' ', modell: 'm', system: 's', historikk: hist }, fakeFetch)).rejects.toThrow('nøkkel');
    const feilFetch = (async () => {
      throw new TypeError('offline');
    }) as typeof fetch;
    await expect(sendTilGemini({ nokkel: 'k', modell: 'm', system: 's', historikk: hist }, feilFetch)).rejects.toThrow('nettverksfeil');
  });

  it('støtter multimodale vedlegg (inlineData for bilde/PDF og uttrukket tekst)', () => {
    const { init } = byggGeminiForesporsel('NØKKEL', 'gemini-2.5-flash', 'SYSTEM', [
      {
        rolle: 'bruker',
        tekst: 'Les av dette pumpeskiltet',
        vedlegg: [
          { navn: 'pumpeskilt.png', mimeType: 'image/png', base64Data: 'AAAA' },
          { navn: 'kalkyle.xlsx', mimeType: 'application/vnd.ms-excel', uttrukketTekst: 'BRA: 3200 m²' },
        ],
      },
    ]);
    const body = JSON.parse(init.body);
    const parts = body.contents[0].parts;
    expect(parts[0]).toEqual({ inlineData: { mimeType: 'image/png', data: 'AAAA' } });
    expect(parts[1].text).toContain('BRA: 3200 m²');
    expect(parts[2].text).toBe('Les av dette pumpeskiltet');
  });

  it('tolker JSON fra Gemini Vision selv med markdown-kodeblokk', () => {
    const svar = '```json\n{"navn":"Nytt Kvartal","bra":5200,"tekniskeFunn":["Grundfos Magna3"]}\n```';
    const res = tolkGeminiVisionJson(svar);
    expect(res.navn).toBe('Nytt Kvartal');
    expect(res.bra).toBe(5200);
    expect(res.tekniskeFunn).toEqual(['Grundfos Magna3']);
  });
});

describe('Filanalyse, kategorisering og JSON Backup (Eksport/Import)', () => {
  it('detekterer filkategorier og trekker ut prosjektdata lokalt fra tekst', () => {
    expect(detekterFilKategori('Plan_U1_Sanitaer.pdf', 'application/pdf')).toBe('plantegning');
    expect(detekterFilKategori('VA-kart_kommunal_kum.png', 'image/png')).toBe('va_kart');
    expect(detekterFilKategori('Mengdekalkyle.xlsx', 'application/octet-stream')).toBe('kalkyle_excel');
    expect(detekterFilKategori('Bilde_pumpeskilt.jpg', 'image/jpeg')).toBe('typeskilt_bilde');

    const ut = analyserTekstLokalt(
      'Prosjekt: Sjøsiden Kontorbygg\nOppvarmet BRA: 3400 m²\nITR i kum: +12,40\nIBR: +12,10\nKjeller U1: +11,80\nStatisk vanntrykk: 4,2 bar\n16 samtidige dusjer',
      'prospekt.txt'
    );
    expect(ut.navn).toBe('Sjøsiden Kontorbygg');
    expect(ut.bra).toBe(3400);
    expect(ut.koter?.itrKum).toBeCloseTo(12.4, 2);
    expect(ut.koter?.ibrKum).toBeCloseTo(12.1, 2);
    expect(ut.koter?.gulv?.[0].kote).toBeCloseTo(11.8, 2);
    expect(ut.vanntrykk?.statiskBar).toBeCloseTo(4.2, 2);
    expect(ut.belastning?.dusjer).toBe(16);

    const flettet = flettUttrekkInnIProsjekt(tomtProsjekt('p-ny'), ut);
    expect(flettet.navn).toBe('Sjøsiden Kontorbygg');
    expect(flettet.bra).toBe(3400);
    expect(flettet.koter.itrKum).toBeCloseTo(12.4, 2);
  });

  it('eksporterer og importerer prosjektbackup (.json) med filer og chathistorikk', () => {
    const p = { ...tomtProsjekt('p-99'), navn: 'Backup Testbygg', bra: 1850 };
    const json = lagProsjektBackupJson({
      prosjekter: [p],
      tilstand: {
        'p-99': {
          qa: { 'sp-1': true },
          agentSjekk: {},
          steg: { '1': true },
          aktivtSteg: 2,
          samtaler: { hovedchat: [{ rolle: 'bruker', tekst: 'Hei' }] },
        },
      },
      filer: [
        {
          id: 'fil-1',
          prosjektId: 'p-99',
          navn: 'plantegning.png',
          mimeType: 'image/png',
          storrelse: 1024,
          opprettetDato: '2026-11-10T12:00:00Z',
          kategori: 'plantegning',
          base64Data: 'AAAA',
          dataUrl: 'data:image/png;base64,AAAA',
          uttrukketTekst: '',
        },
      ],
      aktivId: 'p-99',
      krav: 0.95,
    });

    const importert = lesProsjektBackupJson(json);
    expect(importert.prosjekter).toHaveLength(1);
    expect(importert.prosjekter[0].navn).toBe('Backup Testbygg');
    expect(importert.filer).toHaveLength(1);
    expect(importert.filer[0].navn).toBe('plantegning.png');
    expect(importert.tilstand['p-99'].samtaler?.hovedchat?.[0].tekst).toBe('Hei');
  });

  it('tolker naturlig chattetekst («Adressen er Kongsgata 10, 4005 Stavanger og laveste sluk er kote 12.5») og oppdaterer prosjektdata', () => {
    const ut = analyserTekstLokalt(
      'Adressen er Kongsgata 10, 4005 Stavanger og laveste sluk er kote 12.5. ITK i kum er 13,90 og IBR er 13,60. Stikkledning er 22 m med fall 1:60.',
      ''
    );
    expect(harUttrekkData(ut)).toBe(true);
    expect(ut.sted).toBe('Kongsgata 10, 4005 Stavanger');
    expect(ut.koter?.gulv?.[0]?.kote).toBeCloseTo(12.5, 2);
    expect(ut.koter?.itrKum).toBeCloseTo(13.9, 2);
    expect(ut.koter?.ibrKum).toBeCloseTo(13.6, 2);
    expect(ut.koter?.stikkLengde).toBe(22);
    expect(ut.koter?.fallNevner).toBe(60);

    const endringer = beskrivUttrekkEndringer(ut);
    expect(endringer.some((e) => e.includes('Kongsgata 10, 4005 Stavanger'))).toBe(true);
    expect(endringer.some((e) => e.includes('+12.5'))).toBe(true);
  });

  it('slår opp i Kartverket (Adresse-API + Høydedata-API) og fletter Gnr/Bnr, kommune og terrengkote inn i prosjektet', async () => {
    const fakeKartverketFetch = (async (url: string | URL | Request) => {
      const u = String(url);
      if (u.includes('ws.geonorge.no/adresser/v1/sok')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            adresser: [
              {
                adressetekst: 'Kongsgata 10',
                postnummer: '4005',
                poststed: 'STAVANGER',
                kommunenavn: 'STAVANGER',
                kommunenummer: '1103',
                gardsnummer: 55,
                bruksnummer: 210,
                festenummer: 0,
                representasjonspunkt: { lat: 58.969, lon: 5.733 },
              },
            ],
          }),
        } as Response;
      }
      if (u.includes('ws.geonorge.no/hoydedata/v1/punkt')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            koordsys: 4258,
            punkter: [{ z: 14.35, datakilde: 'DTM1 2023 (NN2000)' }],
          }),
        } as Response;
      }
      throw new Error('Uventet URL');
    }) as typeof fetch;

    const oppslag = await slaaOppAdresseOgKoteIKartverket(
      'Kongsgata 10, 4005 Stavanger',
      fakeKartverketFetch
    );
    expect(oppslag).not.toBeNull();
    expect(oppslag!.valgt.gardsnummer).toBe(55);
    expect(oppslag!.valgt.bruksnummer).toBe(210);
    expect(oppslag!.terrengkoteNn2000).toBeCloseTo(14.35, 2);

    const { prosjekt: oppdatert, endringer } = flettKartverketInnIProsjekt(
      tomtProsjekt('p-kv'),
      oppslag!
    );
    expect(oppdatert.sted).toBe('Kongsgata 10, 4005 Stavanger');
    expect(oppdatert.matrikkel).toBe('Gnr. 55 / Bnr. 210, Stavanger kommune');
    expect(oppdatert.vaMyndighet).toContain('Stavanger kommune');
    expect(oppdatert.koter.gate).toBeCloseTo(14.35, 2);
    expect(endringer.length).toBeGreaterThanOrEqual(4);
  });

  it('trekker ut strukturert prosjekt_json fra Gemini chat-svar og fjerner kodeblokken fra synlig tekst', () => {
    const svar =
      'Her er avlesningen fra VA-kartet:\n```prosjekt_json\n{"koter":{"itrKum":14.2,"ibrKum":13.95,"gulv":[{"navn":"Laveste sluk","kote":12.8}]}}\n```\nSiden laveste sluk er på +12,80 og ITK er +14,20 kreves pumpestasjon.';
    const { visningsTekst, uttrekk } = trekkUtProsjektJsonFraChatSvar(svar);
    expect(visningsTekst).not.toContain('prosjekt_json');
    expect(visningsTekst).toContain('Her er avlesningen fra VA-kartet:');
    expect(uttrekk?.koter?.itrKum).toBeCloseTo(14.2, 2);
    expect(uttrekk?.koter?.ibrKum).toBeCloseTo(13.95, 2);
    expect(uttrekk?.koter?.gulv?.[0]?.kote).toBeCloseTo(12.8, 2);
  });
});

describe('Gatekeeper – Kvalitets- og Mangelsikring & AI-Kommunikasjonsassistent', () => {
  it('skiller klart mellom 🛑 kritiske mangler (stoppere) og ⚠️ advarsler på et nytt tomt prosjekt', () => {
    const p = {
      ...tomtProsjekt('p-gk'),
      navn: 'Nytt Bygg i Stavanger',
      sted: 'Kongsgata 10, 4005 Stavanger',
      vaMyndighet: 'Stavanger kommune – Vann og avløp',
    };
    const analyse = analyserProsjekt(p, 0.95);
    const rapport = evaluerGatekeeper(p, analyse, {}, 0);

    expect(rapport.kommuneNavn).toBe('Stavanger kommune');
    expect(rapport.vaEtatNavn).toContain('Stavanger kommune – Vann- og avløpsetaten');
    expect(rapport.geodataAvdelingNavn).toContain('Geodata- og oppmålingsavdelingen');

    // Kritiske mangler stopper endelig godkjenning før utfylling eller overstyring
    expect(rapport.kanGodkjenneEndelig).toBe(false);
    expect(rapport.kritiskeMangler.map((m) => m.id)).toEqual(
      expect.arrayContaining(['bra_areal', 'kote_itr_ibr', 'kote_laveste_sluk', 'vanntrykk_qp', 'qa_signatur'])
    );
    // Advarsler (ikke-stoppere)
    expect(rapport.advarsler.map((a) => a.id)).toEqual(
      expect.arrayContaining(['stikkledning_fall', 'overvann_paaslipp', 'teknisk_rom_areal'])
    );
  });

  it('tillater overstyring («Midlertidig estimat / Venter på kommunen») uten å stoppe prosessen', () => {
    const p = tomtProsjekt('p-ov');
    const {
      prosjekt: oppdatertProsjekt,
      overstyringer: nyeOverstyringer,
      endringer,
    } = anvendOverstyringMedEstimat(p, {}, [
      'bra_areal',
      'kote_itr_ibr',
      'kote_laveste_sluk',
      'vanntrykk_qp',
      'qa_signatur',
    ]);

    expect(endringer.length).toBeGreaterThanOrEqual(5);
    expect(oppdatertProsjekt.bra).toBe(1000);
    expect(oppdatertProsjekt.koter.itrKum).not.toBeNull();
    expect(oppdatertProsjekt.koter.gulv.length).toBeGreaterThan(0);
    expect(oppdatertProsjekt.vanntrykk.statiskBar).toBe(4.5);
    expect(nyeOverstyringer['kote_itr_ibr']?.etikett).toBe(OVERSTYRING_ETIKETT);

    const nyAnalyse = analyserProsjekt(oppdatertProsjekt, 0.95);
    const rapport = evaluerGatekeeper(oppdatertProsjekt, nyAnalyse, nyeOverstyringer, 0);

    expect(rapport.kritiskeMangler).toHaveLength(0);
    expect(rapport.overstyrteEstimater.length).toBe(5);
    expect(rapport.kanGodkjenneEndelig).toBe(true);
    expect(rapport.kanGodkjenneUtenForbehold).toBe(false);
  });

  it('genererer ferdig utfylt e-postmal og telefonmanus til kommunens VA-etat og Geodata-avdeling', () => {
    const p = {
      ...tomtProsjekt('p-epost'),
      navn: 'Gausel Næringsbygg',
      sted: 'Forusbeen 50, 4033 Stavanger',
      matrikkel: 'Gnr. 42 / Bnr. 18, Stavanger kommune',
      vaMyndighet: 'Stavanger kommune – Vann og avløp',
      bra: 2500,
    };
    const analyse = analyserProsjekt(p, 0.95);
    const rapport = evaluerGatekeeper(p, analyse, {}, 0);
    const epost = lagKommuneForesporselEpost(p, rapport);

    expect(epost.mottaker).toContain('Stavanger kommune');
    expect(epost.emne).toContain('Gnr. 42 / Bnr. 18');
    expect(epost.epostTekst).toContain('ITK');
    expect(epost.epostTekst).toContain('IBR');
    expect(epost.epostTekst).toContain('1:500');
    expect(epost.telefonSjekkliste).toContain('TELEFON-MANUS');
  });

  it('utfører intelligent mottaker-kontroll: filtrerer bort interne detaljer (TEK17 § 14-4 varmesentral, slukkoter, budsjett) fra kommunen og splitter i 3 skreddersydde utkast', () => {
    const p = {
      ...tomtProsjekt('p-split'),
      navn: 'Kanalpiren Kontorsenter',
      sted: 'Lagårdsveien 80, 4010 Stavanger',
      matrikkel: 'Gnr. 22 / Bnr. 104, Stavanger kommune',
      vaMyndighet: 'Stavanger kommune – Vann og avløp',
      bra: 3500,
      koter: {
        ...tomtProsjekt('p-split').koter,
        gate: 12.5,
      },
    };
    const analyse = analyserProsjekt(p, 0.95);
    const rapport = evaluerGatekeeper(p, analyse, {}, 0);
    const epost = lagKommuneForesporselEpost(p, rapport, undefined, analyse);

    // 1. Mottaker-kontroll: Interne detaljer skal IKKE lekke til det offentlige brevet
    expect(epost.epostTekst).not.toContain('TEK17 § 14-4');
    expect(epost.epostTekst).not.toContain('varmesentral');
    expect(epost.epostTekst).not.toContain('laveste innvendige sluk');

    // 2. Filtreringsrapport: Skal liste opp skjermede punkter
    const mk = epost.mottakerKontroll;
    expect(mk.harInterneFiltreringer).toBe(true);
    expect(mk.filtrertBortFraOffentlig.length).toBeGreaterThanOrEqual(2);
    const filtrerteIder = mk.filtrertBortFraOffentlig.map((f) => f.punktId);
    expect(filtrerteIder).toContain('teknisk_rom_areal');
    expect(filtrerteIder).toContain('kote_laveste_sluk');

    // 3. Utkast 1: Til kommunens VA-etat (Koter, trykk, overvann & stikkledning)
    const utkastVa = mk.utkast.vaEtat;
    expect(utkastVa.erOffentlig).toBe(true);
    expect(utkastVa.mottaker).toContain('Vann- og avløpsetaten');
    expect(utkastVa.epostTekst).toContain('ITK/ITR');
    expect(utkastVa.epostTekst).toContain('IBR');
    expect(utkastVa.epostTekst).toContain('overvannshåndtering (LOD)');
    expect(utkastVa.epostTekst).not.toContain('TEK17 § 14-4');
    expect(utkastVa.epostTekst).not.toContain('varmesentral');

    // 4. Utkast 2: Til Geodata / Oppmålingsavdelingen (Kart og matrikkel)
    const utkastGeo = mk.utkast.geodata;
    expect(utkastGeo.erOffentlig).toBe(true);
    expect(utkastGeo.mottaker).toContain('Geodata- og oppmålingsavdelingen');
    expect(utkastGeo.epostTekst).toContain('1:500');
    expect(utkastGeo.epostTekst).toContain('NN2000');
    expect(utkastGeo.epostTekst).toContain('Gnr. 22 / Bnr. 104');

    // 5. Utkast 3: Internt notat til Arkitekt & Prosjekteringsteam (Arealer, TEK17 § 14-4, slukkoter, sjakter)
    const utkastArk = mk.utkast.arkitektInternt;
    expect(utkastArk.erOffentlig).toBe(false);
    expect(utkastArk.mottaker).toContain('Arkitekt (ARK)');
    expect(utkastArk.epostTekst).toContain('TEK17 § 14-4');
    expect(utkastArk.epostTekst).toContain('varmesentral');
    expect(utkastArk.epostTekst).toContain('Overkant Ferdig Gulv (OK FG)');
    expect(utkastArk.epostTekst).toContain('sjakter');

    // Sjekk at samtlige 3 utkast er inkludert i listen
    expect(mk.alleUtkast).toHaveLength(3);
  });

  it('genererer visuell RIV-rapport og strukturert Markdown iht. Byggforsk 553.102 for NotebookLM', () => {
    const p = {
      ...tomtProsjekt('p-rep'),
      navn: 'Solheim Næringsbygg',
      sted: 'Solheimsveien 12, 5054 Bergen',
      matrikkel: 'Gnr. 15 / Bnr. 44, Bergen kommune',
      bygningstype: 'Kontorbygg',
    };
    const rader = EKSEMPEL_FORDELING.map((r) => ({ ...r }));
    const beregnet = rader.map(beregnStrekk);
    const sum = sumStrekk(beregnet);
    const bud = beregnTrykkbudsjett({ ...EKSEMPEL_BUDSJETT, rorlengde: sum.lengde });
    const margin = bud.dispFriksjon - sum.rxl;
    const ok = margin >= 0;

    const md = genererTrykkfallMarkdown({
      prosjektTittel: 'Solheim Næringsbygg – Sanitær',
      prosjektData: p,
      budsjett: { ...EKSEMPEL_BUDSJETT, rorlengde: sum.lengde },
      bud,
      beregnet,
      sum,
      margin,
      ok,
      dato: '10. november 2026',
    });

    // 1. Toppfelt & RIV info
    expect(md).toContain('SANITÆR TRYKKFALLSBEREGNING – SINTEF Byggforsk 553.102');
    expect(md).toContain('Solheim Næringsbygg – Sanitær');
    expect(md).toContain('Solheimsveien 12, 5054 Bergen');
    expect(md).toContain('Gnr. 15 / Bnr. 44, Bergen kommune');
    expect(md).toContain('Kim Jørgensen | Rørleggermester & Rådgivende Ingeniør VVS (RIV)');

    // 2. Nøkkeltall / forutsetninger (ren Markdown uten rå LaTeX)
    expect(md).toContain('Trykk i hovedledning (p_0):');
    expect(md).toContain('Nødvendig resttrykk før armatur (p_rest):');
    expect(md).toContain('Disponibelt trykk til rørfriksjon (p_disp,frik):');
    expect(md).toContain('Total rørlengde');
    expect(md).toContain('Midlere rørfriksjon');

    // 3. Tabell med kolonner og vannhastighet
    expect(md).toContain('Status v ≤ 2,0 m/s');
    expect(md).toContain('✅ OK');
    expect(md).toContain('SUM LENGDE & TRYKKFALL');

    // 4. Konklusjonsboks (sluttkontroll)
    expect(md).toContain('GODKJENT TRYKKBUDSJETT');
    expect(md).toContain('Kontroll:');
    expect(md).toContain('mot disponibelt');
    expect(md).toContain('OK (margin');
  });
});

describe('Automatisk dokumentlesing & skjemautfylling (Steg 1A & Opprett nytt prosjekt)', () => {
  it('leser Markdown (.md) med Friheim 49, BRA 1200 m² og koter og lager grønn bekreftelsestekst', async () => {
    const mdInnhold = `# Prosjekt: Friheim 49 Ombygging
- **Adresse:** Friheim 49
- **BRA:** 1200 m²
- **Bygningstype:** Kontor
- **Gnr/Bnr:** 58/112
- **Kote ITK i kum:** +14,20
- **Kote IBR:** +13,95
- **Terrengkote:** +15,80
- **Kote laveste sluk:** +12,50
- **Statisk vanntrykk:** 4,8 bar
`;
    const fil = new File([mdInnhold], 'friheim-49-notat.md', { type: 'text/markdown' });
    const filObj = await lesOgAnalyserFilLokalt(fil, 'p-test');
    const uttrekk = analyserTekstLokalt(filObj.uttrukketTekst, filObj.navn);

    expect(filObj.uttrukketTekst).toContain('Friheim 49');
    expect(harUttrekkData(uttrekk)).toBe(true);
    expect(uttrekk.navn).toBe('Friheim 49 Ombygging');
    expect(uttrekk.sted).toBe('Friheim 49');
    expect(uttrekk.bra).toBe(1200);
    expect(uttrekk.bygningstype).toContain('Kontor');
    expect(uttrekk.matrikkel).toBe('Gnr. 58 / Bnr. 112');
    expect(uttrekk.koter?.itrKum).toBeCloseTo(14.2, 2);
    expect(uttrekk.koter?.ibrKum).toBeCloseTo(13.95, 2);
    expect(uttrekk.koter?.gate).toBeCloseTo(15.8, 2);
    expect(uttrekk.koter?.gulv?.[0]?.kote).toBeCloseTo(12.5, 2);
    expect(uttrekk.vanntrykk?.statiskBar).toBeCloseTo(4.8, 2);

    const gronnTekst = lagKortFunnTekst(uttrekk);
    expect(gronnTekst).toContain('adresse: Friheim 49');
    expect(gronnTekst).toContain('BRA: 1200 m²');
    expect(gronnTekst).toContain('fylt ut i skjema');
  });

  it('leser Markdown-tabell og frittstående stedsnavn som Friheim 49 uten etikett', () => {
    const tabellMd = `| Felt | Verdi |
| --- | --- |
| Prosjektnavn | Friheim Kontorsenter |
| Adresse | Friheim 49 |
| BRA | 1 200 m² |
| Laveste sluk | kote 11.80 |
`;
    const u1 = analyserTekstLokalt(tabellMd, 'tabell.md');
    expect(u1.navn).toBe('Friheim Kontorsenter');
    expect(u1.sted).toBe('Friheim 49');
    expect(u1.bra).toBe(1200);
    expect(u1.koter?.gulv?.[0]?.kote).toBeCloseTo(11.8, 2);

    const frittstaende = analyserTekstLokalt(
      'Befaring ved Friheim 49. Bygget har 1200 m² BRA og ITK +13.40.',
      'befaring.txt'
    );
    expect(frittstaende.sted).toBe('Friheim 49');
    expect(frittstaende.bra).toBe(1200);
    expect(frittstaende.koter?.itrKum).toBeCloseTo(13.4, 2);
  });

  it('fyller automatisk ut både ProsjektData (Steg 1A/1B) og Skjema (Opprett nytt prosjekt-modal)', () => {
    const u = analyserTekstLokalt(
      'Prosjekt: Friheim 49\nAdresse: Friheim 49\nBRA: 1200 m²\nITK: +14,10\nLaveste sluk: +12,60',
      'friheim.md'
    );

    // 1. På et standardprosjekt (f.eks. Forus Teknologipark i Steg 1A) skal navnet og feltene oppdateres
    const fraPreset = flettUttrekkInnIProsjekt(hent('forus'), u);
    expect(fraPreset.navn).toBe('Friheim 49');
    expect(fraPreset.sted).toBe('Friheim 49');
    expect(fraPreset.bra).toBe(1200);
    expect(fraPreset.koter.itrKum).toBeCloseTo(14.1, 2);
    expect(fraPreset.koter.gulv[0].kote).toBeCloseTo(12.6, 2);

    // 2. I «Opprett nytt prosjekt»-modalen (der navn i skjema starter tomt '') skal alle input-felt fylles ut
    const tomtSkjema = tilSkjema(tomtProsjekt('ny-1'));
    expect(tomtSkjema.navn).toBe('');
    const utfyltSkjema = flettUttrekkInnISkjema(tomtSkjema, u);
    expect(utfyltSkjema.navn).toBe('Friheim 49');
    expect(utfyltSkjema.sted).toBe('Friheim 49');
    expect(utfyltSkjema.bra).toBe('1200');
    expect(utfyltSkjema.itr).toBe('14,1');
    expect(utfyltSkjema.gulv[0].kote).toBe('12,6');

    // 3. Fletting av lokalt uttrekk og AI-uttrekk
    const kombi = flettUttrekkResultater(u, { vaMyndighet: 'Stavanger kommune' });
    expect(kombi.sted).toBe('Friheim 49');
    expect(kombi.vaMyndighet).toBe('Stavanger kommune');
  });
});

describe('Global prosjekt-state, vanntrykk vs. koter og > 6,0 bar kontroll', () => {
  it('har alle 9 fagmoduler aktivert som status=klar i global arkitektur', () => {
    expect(MODULER).toHaveLength(9);
    expect(MODULER.every((m) => m.status === 'klar')).toBe(true);
  });

  it('beregner hydrostatisk trykktap mellom ITK/vannledning og høyeste tappested fra koter', () => {
    const p = hent('forus');
    const a = analyserProsjekt(p, 0.9);
    // Forus har vannledning C +11.2, gate +12.0, 4 etasjer -> høyeste tappested = 12.0 + (4-1)*3.2 + 2.0 = 23.6
    // Løftehøyde H = 23.6 - 11.2 = 12.4 m -> hydrostatisk tap ≈ 1.22 bar (121.6 kPa)
    expect(a.hydrostatisk.geodetiskLoftehoydeM).toBeCloseTo(12.4, 1);
    expect(a.hydrostatisk.hydrostatiskTapBar).toBeCloseTo(12.4 * 0.0981, 2);
    expect(a.hydrostatisk.kravTrykkreduksjonsventil).toBe(false);
  });

  it('varsler automatisk krav om trykkreduksjonsventil når statisk trykk overstiger 6,0 bar', () => {
    const p = {
      ...hent('forus'),
      vanntrykk: {
        ...hent('forus').vanntrykk,
        statiskBar: 6.5,
      },
    };
    const a = analyserProsjekt(p, 0.9);
    expect(a.hydrostatisk.kravTrykkreduksjonsventil).toBe(true);
    expect(
      a.alarmer.some(
        (al) => al.alvor === 'rod' && al.tekst.includes('TRYKKREDUKSJONSVENTIL')
      )
    ).toBe(true);
  });

  it('varsler automatisk når kjeller ligger lavere enn målepunkt slik at trykket i kjeller overstiger 6,0 bar', () => {
    // Statisk trykk ved kum (+25.0) er 5.6 bar, men kjellergulv ligger på kote +18.0 (7 m lavere -> +0.69 bar -> 6.29 bar)
    const p = {
      ...hent('forus'),
      koter: {
        ...hent('forus').koter,
        vannledning: 25.0,
        gulv: [{ navn: 'Kjeller U2', kote: 18.0 }],
      },
      vanntrykk: {
        ...hent('forus').vanntrykk,
        statiskBar: 5.6,
      },
    };
    const a = analyserProsjekt(p, 0.9);
    expect(a.hydrostatisk.maksStatiskTrykkBar).toBeGreaterThan(6.0);
    expect(a.hydrostatisk.kravTrykkreduksjonsventil).toBe(true);
  });

  it('analyserer kontinuerlig møteopptak, oppdaterer global prosjekt-state, arkivfil (.md) og agenter', () => {
    expect(STANDARD_MOTE_STEG).toHaveLength(5);
    expect(STANDARD_MOTE_STEG[4].prosent).toBe(100);
    expect(formaterOpptaksTid(3665)).toBe('01:01:05');

    const startProsjekt = tomtProsjekt('mote-1');
    const res = analyserMoteTranskripsjonLokalt(
      startProsjekt,
      EKSEMPEL_BEFARINGS_TRANSKRIPSJON,
      845
    );

    expect(res.oppdatertProsjekt.navn).toContain('Friheim 49');
    expect(res.oppdatertProsjekt.sted).toContain('Friheim 49');
    expect(res.oppdatertProsjekt.bra).toBe(2450);
    expect(res.oppdatertProsjekt.koter.itrKum).toBeCloseTo(14.2, 2);
    expect(res.oppdatertProsjekt.koter.ibrKum).toBeCloseTo(13.85, 2);
    expect(res.oppdatertProsjekt.vanntrykk.statiskBar).toBeCloseTo(6.4, 2);

    // Sjekk at 6,4 bar fra møteopptaket også utløser krav om trykkreduksjonsventil i global analyse
    const a = analyserProsjekt(res.oppdatertProsjekt, 0.9);
    expect(a.hydrostatisk.kravTrykkreduksjonsventil).toBe(true);

    // Sjekk at møtereferatet genereres som arkivfil for IndexedDB og synkroniserer relevante agenter
    expect(res.referatFil.mimeType).toBe('text/markdown');
    expect(res.referatFil.uttrukketTekst).toContain('00:14:05');
    expect(res.berorteAgenter.some((ag) => ag.agentId === 'agent-01')).toBe(true);
    expect(res.berorteAgenter.some((ag) => ag.agentId === 'agent-03')).toBe(true);
    expect(res.berorteAgenter.some((ag) => ag.agentId === 'agent-19')).toBe(true);
    expect(res.berorteAgenter.some((ag) => ag.agentId === 'agent-16')).toBe(true);
  });

  it('detekterer lydfiler (.mp3, .m4a, .mp4, .wav) som kategorien lydopptak', () => {
    expect(detekterFilKategori('Møteopptak.mp4', 'video/mp4')).toBe('lydopptak');
    expect(detekterFilKategori('Befaring-Friheim.m4a', 'audio/mp4')).toBe('lydopptak');
    expect(detekterFilKategori('Diktafon.mp3', 'audio/mpeg')).toBe('lydopptak');
    expect(detekterFilKategori('Byggeplass.wav', 'audio/wav')).toBe('lydopptak');
  });

  describe('QA og Sanity Sjekkliste (Agent 16 & Steg 5)', () => {
    it('starter med tomme/uavkryssede sjekkbokser som standard (false) og kan nullstilles', () => {
      const tomTilstand: Record<string, boolean> = {};
      const status = beregnSignaturStatus(tomTilstand);

      expect(status.totaltAntall).toBe(13); // 7 sanity + 6 QA
      expect(status.totaltFullfort).toBe(0);
      expect(status.erKlarForSignatur).toBe(false);
      expect(status.badgeTekst).toBe('⏳ UNDER KONTROLL (0 av 13 fullført)');
    });

    it('beregner krav til teknisk rom / varmesentral etter TEK17 § 14-4 (10 m² + 1 % BRA)', () => {
      // Eksempel fra bruker: 17 600 m² BRA -> 10 + 0,01 * 17600 = 186 m²
      expect(beregnKravVarmesentralM2(17600)).toBe(186);
      expect(beregnKravVarmesentralM2(1000)).toBe(20);
      expect(beregnKravVarmesentralM2(4500)).toBe(55);
      expect(beregnKravVarmesentralM2(0)).toBeNull();
      expect(beregnKravVarmesentralM2(null)).toBeNull();
    });

    it('vurderer kotekontroll mot tilbakeslag (sp-1) basert på reelle prosjektdata', () => {
      // 1. Mangler ITK / ITR -> advarsel «⚠️ Mangler kotedata / Ikke oppfylt»
      const pUtenItk = {
        ...tomtProsjekt('p-uten-itk'),
        koter: {
          ...tomtProsjekt('p-uten-itk').koter,
          itrKum: null,
          gulv: [{ navn: 'Kjeller', kote: 10.0 }],
        },
      };
      const an1 = analyserProsjekt(pUtenItk, 0.95);
      const st1 = vurderKotekontrollStatus(pUtenItk, an1, {});
      expect(st1.ok).toBe(false);
      expect(st1.status).toBe('mangler_data');
      expect(st1.advarsel).toContain('⚠️ Mangler kotedata / Ikke oppfylt');

      // 2. Har koter, men laveste sluk har negativ margin uten pumpestasjon -> Ikke oppfylt
      const pNegativMargin = {
        ...tomtProsjekt('p-neg-margin'),
        koter: {
          ...tomtProsjekt('p-neg-margin').koter,
          itrKum: 14.0,
          gulv: [{ navn: 'Laveste sluk kjeller', kote: 13.0 }], // 13.0 - 14.0 = -1.0 m margin
        },
      };
      const an2 = analyserProsjekt(pNegativMargin, 0.95);
      const st2 = vurderKotekontrollStatus(pNegativMargin, an2, {});
      expect(st2.ok).toBe(false);
      expect(st2.status).toBe('ikke_oppfylt');
      expect(st2.advarsel).toContain('🔴 AVVIK: Krever pumpestasjon/tilbakeslagssikring');

      // 3. Negativ margin, men med registrert pumpestasjon (sp-2 er bekreftet) -> Oppfylt
      const st3 = vurderKotekontrollStatus(pNegativMargin, an2, { 'sp-2': true });
      expect(st3.ok).toBe(true);
      expect(st3.advarsel).toBeNull();

      // 4. Positiv margin på alle gulv -> Oppfylt
      const pOkKoter = {
        ...tomtProsjekt('p-ok-koter'),
        koter: {
          ...tomtProsjekt('p-ok-koter').koter,
          itrKum: 10.0,
          gulv: [{ navn: '1. etasje', kote: 12.0 }], // margin 2.0 m >= 0.95 m
        },
      };
      const an4 = analyserProsjekt(pOkKoter, 0.95);
      const st4 = vurderKotekontrollStatus(pOkKoter, an4, {});
      expect(st4.ok).toBe(true);
      expect(st4.advarsel).toBeNull();
    });

    it('krever at samtlige 7 sanity-punkter og samtlige 6 QA-punkter (13 av 13) er fullført før signatur-badge låses opp', () => {
      const qa: Record<string, boolean> = {};

      // Kryss av alle 7 sanity-punkter
      for (const p of SANITY_PUNKTER) {
        qa[p.id] = true;
      }
      let status = beregnSignaturStatus(qa);
      expect(status.sanitySjekket).toBe(7);
      expect(status.qaSjekket).toBe(0);
      expect(status.totaltFullfort).toBe(7);
      expect(status.erKlarForSignatur).toBe(false);
      expect(status.badgeTekst).toBe('⏳ UNDER KONTROLL (7 av 13 fullført)');

      // Kryss av 5 av 6 QA-punkter (totalt 12 av 13)
      for (let i = 0; i < QA_PUNKTER.length - 1; i++) {
        qa[QA_PUNKTER[i].id] = true;
      }
      status = beregnSignaturStatus(qa);
      expect(status.totaltFullfort).toBe(12);
      expect(status.erKlarForSignatur).toBe(false);
      expect(status.badgeTekst).toBe('⏳ UNDER KONTROLL (12 av 13 fullført)');

      // Kryss av det siste QA-punktet (13 av 13 fullført)
      qa[QA_PUNKTER[QA_PUNKTER.length - 1].id] = true;
      status = beregnSignaturStatus(qa);
      expect(status.totaltFullfort).toBe(13);
      expect(status.erKlarForSignatur).toBe(true);
      expect(status.badgeTekst).toBe('✅ KLAR FOR SIGNATUR');
    });

    it('skriver aldri «(ingen registrerte mangler)» under ⚠️ HINT FOR 100 % SIKKERHET hvis Gnr/Bnr, kote vannledning eller IVF-varighet er 0 eller IKKE OPPGITT', () => {
      // 1. Prosjekt med matrikkel 'IKKE OPPGITT', kote vannledning = 0 og intensitet = 0
      const p = {
        ...tomtProsjekt('p-mangler-sjekk'),
        navn: 'Testbygg Mangler',
        sted: 'Storgata 1, Oslo',
        matrikkel: 'IKKE OPPGITT',
        koter: {
          ...tomtProsjekt('p-mangler-sjekk').koter,
          vannledning: 0,
        },
        overvann: {
          ...tomtProsjekt('p-mangler-sjekk').overvann,
          intensitet: 0,
        },
      };
      const a = analyserProsjekt(p, 0.95);
      const kontekst = prosjektKontekst(p, a);

      expect(kontekst).toContain('⚠️ HINT: MANGLENDE DATA FOR 100 % SIKKERHET:');
      expect(kontekst).not.toContain('- (ingen registrerte mangler)');
      expect(kontekst).toMatch(/Gnr\/Bnr|matrikkel/i);
      expect(kontekst).toMatch(/vannledning/i);
      expect(kontekst).toMatch(/IVF|intensitet/i);
    });

    it('genererer 3 separate e-postutkast med mottakerfilter for Kommune, Prosjektgruppe og Byggherre', () => {
      const p = {
        ...tomtProsjekt('p-3-faner'),
        navn: 'Nordic Business Hub',
        sted: 'Haakon VIIs gate 8, Stavanger',
        matrikkel: 'Gnr. 12 / Bnr. 45',
        bra: 4500,
        tekniskRomM2: 30,
        koter: {
          ...tomtProsjekt('p-3-faner').koter,
          itrKum: 15.0,
          gulv: [{ navn: 'Kjeller U1', kote: 14.2 }], // 14.2 - 15.0 = -0.8 m margin (under 0.95 m)
        },
      };
      const a = analyserProsjekt(p, 0.95);
      const gk = evaluerGatekeeper(p, a, {}, 0);
      const epost = lagKommuneForesporselEpost(p, gk, undefined, a);

      const mk = epost.mottakerKontroll;
      expect(mk.alleUtkast).toHaveLength(3);

      // Fane 1: Til Kommunen (VA & Geodata) – Kun offentlig, ingen TEK17 § 14-4
      const fane1 = mk.utkast.kommune;
      expect(fane1.tittel).toContain('Fane 1: Til Kommunen (VA & Geodata)');
      expect(fane1.erOffentlig).toBe(true);
      expect(fane1.epostTekst).toContain('ITK/IBR');
      expect(fane1.epostTekst).not.toContain('TEK17 § 14-4');
      expect(fane1.epostTekst).not.toContain('varmesentral');

      // Fane 2: Til Prosjektgruppe (ARK / RIBr / RIAku)
      const fane2 = mk.utkast.prosjektgruppe;
      expect(fane2.tittel).toContain('Fane 2: Til Prosjektgruppe (ARK / RIBr / RIAku)');
      expect(fane2.erOffentlig).toBe(false);
      expect(fane2.epostTekst).toContain('TEK17 § 14-4');
      expect(fane2.epostTekst).toContain('varmesentral');
      expect(fane2.epostTekst).toContain('sjakter');
      expect(fane2.epostTekst).toContain('akustikk');

      // Fane 3: Til Byggherre (Økonomi & Risiko)
      const fane3 = mk.utkast.byggherre;
      expect(fane3.tittel).toContain('Fane 3: Til Byggherre (Økonomi & Risiko)');
      expect(fane3.erOffentlig).toBe(false);
      expect(fane3.epostTekst).toContain('NS-EN 12050');
      expect(fane3.epostTekst).toContain('NS-EN 1717');
      expect(fane3.epostTekst).toContain('WWBooster');
      expect(fane3.epostTekst).toContain('VDI 2035');
    });
  });

  describe('rensLatexFormler (Ren formelvisning i AI-chat og agenter)', () => {
    it('renser doble dollartegn ($$...$$) og \\text{} til ren, lesbar Markdown', () => {
      const input = '$$P_{\\text{romoppvarming}} = 3\\,200 \\text{ m}^2 \\times 35 \\text{ W/m}^2 = 112 \\text{ kW}$$';
      const output = rensLatexFormler(input);
      expect(output).toBe('P_romoppvarming = 3 200 m² × 35 W/m² = 112 kW');
      expect(output).not.toContain('$$');
      expect(output).not.toContain('\\text');
    });

    it('renser enkle dollartegn og matematiske operatorer (\\cdot, \\sum, \\sqrt)', () => {
      const input = 'Formel: $q_S = q_{N1} + 0,015 \\cdot (\\sum q_N - q_{N1}) + 0,17 \\cdot \\sqrt{\\sum q_N - q_{N1}}$';
      const output = rensLatexFormler(input);
      expect(output).toBe('Formel: q_S = q_N1 + 0,015 · (Σ q_N - q_N1) + 0,17 · √(Σ q_N - q_N1)');
      expect(output).not.toContain('$');
      expect(output).not.toContain('\\cdot');
      expect(output).not.toContain('\\sum');
      expect(output).not.toContain('\\sqrt');
    });

    it('renser brøker (\\frac), ulikheter (\\le, \\ge) og greske bokstaver (\\Delta, \\Phi)', () => {
      const input = '$\\Delta p = \\frac{F}{A} \\le 2,0 \\text{ bar}$ og $\\Phi = 45 \\text{ kW}$';
      const output = rensLatexFormler(input);
      expect(output).toBe('Δp = (F) / (A) ≤ 2,0 bar og Φ = 45 kW');
      expect(output).not.toContain('\\frac');
      expect(output).not.toContain('\\le');
      expect(output).not.toContain('\\Delta');
      expect(output).not.toContain('\\Phi');
    });
  });

  describe('Prosjektoversikt, Fremdrift & Tidssporing', () => {
    it('beregner helhetlig fremdrift (0-100 %) og sporer mangler og signaturstatus', () => {
      expect(FAG_FASER).toHaveLength(6);
      const p = tomtProsjekt('test-fremdrift');
      p.navn = 'Fremdrift Testbygg';
      p.bra = 2500;
      p.sted = 'Storgata 1, Oslo';
      p.matrikkel = 'Gnr. 1 / Bnr. 2';
      p.koter.itrKum = 10.0;
      p.koter.ibrKum = 9.8;
      p.koter.vannledning = 10.5;
      p.koter.gulv = [{ navn: '1. etasje', kote: 12.0 }]; // margin 2.0 m -> OK

      // Uten QA-sjekkpunkter eller veiviser-steg
      const res1 = beregnProsjektFremdrift(p, null, 0.95);
      expect(res1.fremdriftProsent).toBeGreaterThan(0);
      expect(res1.fremdriftProsent).toBeLessThan(100);
      expect(res1.koteStatus).toBe('ok');
      expect(res1.erKlarForSignatur).toBe(false);

      // Med alle 13 QA-punkter og 5 veivisersteg fullført
      const alleQa: Record<string, boolean> = {};
      for (const sp of SANITY_PUNKTER) alleQa[sp.id] = true;
      for (const qp of QA_PUNKTER) alleQa[qp.id] = true;
      const alleSteg = { '1': true, '2': true, '3': true, '4': true, '5': true };

      const res2 = beregnProsjektFremdrift(p, { qa: alleQa, steg: alleSteg }, 0.95);
      expect(res2.qaProsent).toBe(100);
      expect(res2.veiviserProsent).toBe(100);
      expect(res2.erKlarForSignatur).toBe(true);
      expect(res2.fremdriftProsent).toBeGreaterThanOrEqual(85);
    });

    it('identifiserer koteavvik (Lov 2 brudd) og setter kritisk status', () => {
      const p = tomtProsjekt('kote-brudd');
      p.navn = 'Kjellerbygg med tilbakeslagsfare';
      p.koter.itrKum = 15.0;
      p.koter.gulv = [{ navn: 'Kjeller U1', kote: 14.5 }]; // 14.5 - 15.0 = -0.5 m margin (under 0.95 m)

      const res = beregnProsjektFremdrift(p, null, 0.95);
      expect(res.koteStatus).toBe('brudd');
      expect(res.antallRodeAlarmer).toBeGreaterThan(0);
      expect(res.statusFarge).toBe('rose');
      expect(res.erKlarForSignatur).toBe(false);
    });

    it('genererer profesjonell fremdrifts- og tidsrapport i Markdown for PDF og NotebookLM', () => {
      const p = PROSJEKT_PRESETS[0]; // Case 01 Forus
      const analyse = analyserProsjekt(p, 0.95);
      const tidssporing: TidssporingTilstand = {
        manuelleTimer: [
          {
            id: 't-1',
            dato: '2026-11-11',
            fase: 'fase1_skisse_konsept',
            timer: 6.5,
            beskrivelse: 'Innhentet VA-kart og koter ITR',
            utforende: 'Kim Jørgensen | RIV',
          },
          {
            id: 't-2',
            dato: '2026-11-11',
            fase: 'fase3_detalj',
            timer: 14.0,
            beskrivelse: 'Trykkfallsberegning Byggforsk 553.102',
            utforende: 'Kim Jørgensen | RIV',
          },
        ],
        aiLogger: [
          {
            id: 'ai-1',
            tidspunkt: '2026-11-11T12:00:00Z',
            agentId: 'agent-16',
            agentNavn: 'Agent 16: QA-port',
            operasjon: 'Reversert kote- og trykkontroll',
            kjoretidMs: 1850,
            innspartTidMinutter: 45,
            status: 'fullfort',
          },
        ],
      };

      const fremdrift = beregnProsjektFremdrift(p, { tidssporing }, 0.95, analyse);
      const md = genererFremdriftOgTidMarkdown({
        prosjekt: p,
        fremdrift,
        analyse,
        tidssporing,
        dato: '11. november 2026',
      });

      expect(md).toContain('# PROSJEKTOVERSIKT, FREMDRIFT & TIDSSPORING');
      expect(md).toContain('Kim Jørgensen | Rørleggermester & Rådgivende Ingeniør VVS (RIV)');
      expect(md).toContain('Forus Teknologipark');
      expect(md).toContain('20,5 t'); // 6.5 + 14.0 = 20.5 timer
      expect(md).toContain('140 t'); // Sum av budsjettTimerStandard i FAG_FASER
      expect(md).toContain('Agent 16: QA-port');
      expect(md).toContain('1,85 s');
      expect(md).toContain('ca. 45 min');
      expect(md).not.toContain('$$');
      expect(md).not.toContain('\\text');
    });

    it('produserer tre distinkte mottakerutkast i Gatekeeper mottakerKontroll.alleUtkast', () => {
      const p = tomtProsjekt('tre-utkast');
      p.navn = 'Test Prosjekt AS';
      const a = analyserProsjekt(p, 0.95);
      const r = evaluerGatekeeper(p, a, {}, 0);
      const epost = lagKommuneForesporselEpost(p, r, undefined, a);
      const ider = epost.mottakerKontroll.alleUtkast.map((u) => u.id);
      expect(ider).toEqual(['kommune', 'prosjektgruppe', 'byggherre']);
      expect(new Set(epost.mottakerKontroll.alleUtkast.map((u) => u.epostTekst)).size).toBe(3);
    });

    describe('flyttIArray (rekkefølgestyring)', () => {
      it('flytter et element nedover i arrayet (retning 1)', () => {
        const input = ['A', 'B', 'C'];
        const res = flyttIArray(input, 0, 1);
        expect(res).toEqual(['B', 'A', 'C']);
        expect(input).toEqual(['A', 'B', 'C']); // Ingen mutasjon
      });

      it('flytter et element oppover i arrayet (retning -1)', () => {
        const input = ['A', 'B', 'C'];
        const res = flyttIArray(input, 2, -1);
        expect(res).toEqual(['A', 'C', 'B']);
      });

      it('håndterer grensetilfelle: kan ikke flytte indeks 0 oppover', () => {
        const input = ['A', 'B', 'C'];
        const res = flyttIArray(input, 0, -1);
        expect(res).toEqual(['A', 'B', 'C']);
      });

      it('håndterer grensetilfelle: kan ikke flytte siste indeks nedover', () => {
        const input = ['A', 'B', 'C'];
        const res = flyttIArray(input, 2, 1);
        expect(res).toEqual(['A', 'B', 'C']);
      });

      it('håndterer ugyldige indekser uten å kaste feil', () => {
        const input = ['A', 'B'];
        expect(flyttIArray(input, -1, 1)).toEqual(['A', 'B']);
        expect(flyttIArray(input, 5, -1)).toEqual(['A', 'B']);
      });
    });
  });
});
