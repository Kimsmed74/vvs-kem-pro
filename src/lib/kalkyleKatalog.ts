import type { ProsjektData } from '../data/prosjekter';

export type KalkyleProsjektType = 'bolig' | 'naering' | 'sprinkler' | 'kombi';

export interface OrderItem {
  id: number;
  nrf: string;
  beskrivelse: string;
  antall: number;
  enhet: string;
  innpris: number;
  kategori: 'Lokkeand' | 'Mester-tillegg';
}

/**
 * Offisielt NRF Vareoppslagsverk for VVS KEM PRO
 * Dekker enebolig, næringsbygg, kombinasjonsbygg og sprinkleranlegg
 */
export const NRF_VAREKATALOG: Record<
  string,
  { beskrivelse: string; enhet: string; innpris: number; kategori: 'Lokkeand' | 'Mester-tillegg' }
> = {
  // --- Bolig / Sanitær standard ---
  '6190013': {
    beskrivelse: 'Geberit Duofix Vegghengt WC-sisterne komplett',
    enhet: 'stk',
    innpris: 3800,
    kategori: 'Lokkeand',
  },
  '4290154': {
    beskrivelse: 'Porsgrund Glow Servant med underskap',
    enhet: 'stk',
    innpris: 4200,
    kategori: 'Lokkeand',
  },
  '8361001': {
    beskrivelse: 'Luft-vann varmepumpe 8kW systempakke',
    enhet: 'stk',
    innpris: 62000,
    kategori: 'Lokkeand',
  },
  '5083705': {
    beskrivelse: 'Roth MultiPex rør-i-rør 20mm (Hovedledning inntak/fordeler)',
    enhet: 'm',
    innpris: 54,
    kategori: 'Mester-tillegg',
  },
  '5083703': {
    beskrivelse: 'Roth MultiPex rør-i-rør 16mm (Tappevannskurser)',
    enhet: 'm',
    innpris: 38,
    kategori: 'Mester-tillegg',
  },
  '8370003': {
    beskrivelse: 'Roth X-PERT S5 gulvvarmerør 16x2.0mm diffusjonstett',
    enhet: 'm',
    innpris: 24,
    kategori: 'Mester-tillegg',
  },
  '5118712': {
    beskrivelse: 'Roth fordelerskap universal 550mm komplett m/ramme og dør',
    enhet: 'stk',
    innpris: 3450,
    kategori: 'Mester-tillegg',
  },
  '5118805': {
    beskrivelse: 'Roth QuickBox veggboks 16mm x 1/2"',
    enhet: 'stk',
    innpris: 295,
    kategori: 'Mester-tillegg',
  },
  '5621414': {
    beskrivelse: 'Cimberio kuleventil 3/4" m/hendel (Hovedavstengning)',
    enhet: 'stk',
    innpris: 320,
    kategori: 'Mester-tillegg',
  },
  '5621404': {
    beskrivelse: 'Cimberio kuleventil 1/2" m/hendel (Avstengningsventil kurser)',
    enhet: 'stk',
    innpris: 195,
    kategori: 'Mester-tillegg',
  },
  '2213316': {
    beskrivelse: 'Wavin AS+ Støydempet avløpsrør 110x1000mm',
    enhet: 'stk',
    innpris: 410,
    kategori: 'Mester-tillegg',
  },
  '2213233': {
    beskrivelse: 'Wavin AS+ Støydempet avløpsrør 75x1000mm',
    enhet: 'stk',
    innpris: 310,
    kategori: 'Mester-tillegg',
  },
  '2213133': {
    beskrivelse: 'Wavin AS+ Støydempet avløpsrør 50x1000mm',
    enhet: 'stk',
    innpris: 220,
    kategori: 'Mester-tillegg',
  },
  '2213346': {
    beskrivelse: 'Wavin AS+ Avløpsbend 110mm 45°',
    enhet: 'stk',
    innpris: 185,
    kategori: 'Mester-tillegg',
  },
  '2213253': {
    beskrivelse: 'Wavin AS+ Avløpsbend 75mm 45°',
    enhet: 'stk',
    innpris: 145,
    kategori: 'Mester-tillegg',
  },
  '2213166': {
    beskrivelse: 'Wavin AS+ Avløpsbend 50mm 87.5°',
    enhet: 'stk',
    innpris: 115,
    kategori: 'Mester-tillegg',
  },
  '2213153': {
    beskrivelse: 'Wavin AS+ Avløpsbend 50mm 45°',
    enhet: 'stk',
    innpris: 110,
    kategori: 'Mester-tillegg',
  },
  '5083812': {
    beskrivelse: 'Rørklammer med gummiinnlegg (RSK) 16-20mm M8',
    enhet: 'stk',
    innpris: 42,
    kategori: 'Mester-tillegg',
  },
  '2213914': {
    beskrivelse: 'Avløpsklammer med gummiinnlegg 110mm M8/M10',
    enhet: 'stk',
    innpris: 78,
    kategori: 'Mester-tillegg',
  },
  '8370781': {
    beskrivelse: 'Roth Touchline SL 8-kanals trådløs romtermostatsentral',
    enhet: 'stk',
    innpris: 4950,
    kategori: 'Mester-tillegg',
  },
  '5648184': {
    beskrivelse: 'Waterguard+ sentral med trådløse sensorer & magnetventil',
    enhet: 'stk',
    innpris: 5400,
    kategori: 'Mester-tillegg',
  },

  // --- Næringsbygg & Større installasjoner ---
  '5083707': {
    beskrivelse: 'Roth MultiPex rør-i-rør 25mm (Stigerør etasjefordeling)',
    enhet: 'm',
    innpris: 98,
    kategori: 'Mester-tillegg',
  },
  '5083711': {
    beskrivelse: 'Roth MultiPex rør-i-rør 32mm (Hovedfordeling inntak/teknisk rom)',
    enhet: 'm',
    innpris: 165,
    kategori: 'Mester-tillegg',
  },
  '5061214': {
    beskrivelse: 'Rustfri samlestokk DN 50 4-kurs m/avstengningsventiler',
    enhet: 'stk',
    innpris: 5800,
    kategori: 'Mester-tillegg',
  },
  '5621424': {
    beskrivelse: 'Cimberio kuleventil 2" fullt løp DN 50 m/hendel',
    enhet: 'stk',
    innpris: 1250,
    kategori: 'Mester-tillegg',
  },
  '5621418': {
    beskrivelse: 'Cimberio kuleventil 1 1/4" m/hendel DN 32',
    enhet: 'stk',
    innpris: 680,
    kategori: 'Mester-tillegg',
  },
  '5648192': {
    beskrivelse: 'Danfoss tilbakeslagssikring kategori 4 (BA-ventil) DN 40 NS-EN 1717',
    enhet: 'stk',
    innpris: 8900,
    kategori: 'Lokkeand',
  },
  '4290162': {
    beskrivelse: 'Oras Electra berøringsfri servantkran 230V næring',
    enhet: 'stk',
    innpris: 3400,
    kategori: 'Lokkeand',
  },
  '6190025': {
    beskrivelse: 'Geberit urinal komplett med radar-/infrarødstyring',
    enhet: 'stk',
    innpris: 7200,
    kategori: 'Lokkeand',
  },
  '8001254': {
    beskrivelse: 'OSO Maxi næringsbereder 300L 10kW 400V',
    enhet: 'stk',
    innpris: 28500,
    kategori: 'Lokkeand',
  },
  '9041235': {
    beskrivelse: 'Grundfos Magna3 32-100 F sirkulasjonspumpe',
    enhet: 'stk',
    innpris: 14500,
    kategori: 'Lokkeand',
  },
  '2213388': {
    beskrivelse: 'Wavin AS+ Støydempet avløpsrør 160x1000mm',
    enhet: 'stk',
    innpris: 680,
    kategori: 'Mester-tillegg',
  },
  '5083824': {
    beskrivelse: 'Rørklammer med gummiinnlegg (RSK) 32-40mm M10',
    enhet: 'stk',
    innpris: 68,
    kategori: 'Mester-tillegg',
  },
  '5083832': {
    beskrivelse: 'Rørklammer med gummiinnlegg (RSK) 50-65mm M10',
    enhet: 'stk',
    innpris: 92,
    kategori: 'Mester-tillegg',
  },

  // --- Sprinkleranlegg (NS-EN 12845 / FG-reglene) ---
  '9210010': {
    beskrivelse: 'Sprinkler alarmventil DN 100 komplett med trimsats og vannklokke',
    enhet: 'stk',
    innpris: 34500,
    kategori: 'Lokkeand',
  },
  '9210020': {
    beskrivelse: 'Sprinklerhode hengende K-80 68°C 1/2" forniklet m/rosett',
    enhet: 'stk',
    innpris: 145,
    kategori: 'Lokkeand',
  },
  '9210030': {
    beskrivelse: 'Sprinklerhode stående K-80 68°C 1/2" messing',
    enhet: 'stk',
    innpris: 145,
    kategori: 'Lokkeand',
  },
  '9210040': {
    beskrivelse: 'Galvanisert rillet stålrør DN 65 (2 1/2") L=6m',
    enhet: 'm',
    innpris: 320,
    kategori: 'Mester-tillegg',
  },
  '9210045': {
    beskrivelse: 'Galvanisert rillet stålrør DN 50 (2") L=6m',
    enhet: 'm',
    innpris: 240,
    kategori: 'Mester-tillegg',
  },
  '9210050': {
    beskrivelse: 'Galvanisert rillet stålrør DN 32 (1 1/4") L=6m',
    enhet: 'm',
    innpris: 180,
    kategori: 'Mester-tillegg',
  },
  '9210060': {
    beskrivelse: 'Rillekobling stiv DN 65 (2 1/2") m/pakning',
    enhet: 'stk',
    innpris: 210,
    kategori: 'Mester-tillegg',
  },
  '9210065': {
    beskrivelse: 'Rillekobling stiv DN 50 (2") m/pakning',
    enhet: 'stk',
    innpris: 175,
    kategori: 'Mester-tillegg',
  },
  '9210070': {
    beskrivelse: 'Rille T-rør / sadelkobling DN 65 x 1/2" for sprinklerhode',
    enhet: 'stk',
    innpris: 165,
    kategori: 'Mester-tillegg',
  },
  '9210080': {
    beskrivelse: 'Strømningsvakt (Flow switch) DN 65 med tidsforsinkelse',
    enhet: 'stk',
    innpris: 4600,
    kategori: 'Mester-tillegg',
  },
  '9210090': {
    beskrivelse: 'Test- og avtappingsventil (Inspector Test Connection) 1" m/siktglass',
    enhet: 'stk',
    innpris: 3800,
    kategori: 'Mester-tillegg',
  },
  '9210100': {
    beskrivelse: 'Sprinkler pæreklammer FM/VdS-godkjent DN 65 M10',
    enhet: 'stk',
    innpris: 58,
    kategori: 'Mester-tillegg',
  },
  '9210110': {
    beskrivelse: 'Sprinkler pæreklammer FM/VdS-godkjent DN 50 M10',
    enhet: 'stk',
    innpris: 46,
    kategori: 'Mester-tillegg',
  },
  '9210120': {
    beskrivelse: 'Flenset tilbakeslagsklaff DN 100 for sprinkleranlegg',
    enhet: 'stk',
    innpris: 9200,
    kategori: 'Mester-tillegg',
  },
};

/**
 * 100 % Komplett materiellflyt for Enebolig (TP-01)
 */
export const INITIAL_ORDER_DATA: OrderItem[] = [
  { id: 1, nrf: '6190013', beskrivelse: 'Geberit Duofix Vegghengt WC-sisterne komplett', antall: 3, enhet: 'stk', innpris: 3800, kategori: 'Lokkeand' },
  { id: 2, nrf: '4290154', beskrivelse: 'Porsgrund Glow Servant med underskap', antall: 2, enhet: 'stk', innpris: 4200, kategori: 'Lokkeand' },
  { id: 3, nrf: '8361001', beskrivelse: 'Luft-vann varmepumpe 8kW systempakke', antall: 1, enhet: 'stk', innpris: 62000, kategori: 'Lokkeand' },
  { id: 4, nrf: '5083705', beskrivelse: 'Roth MultiPex rør-i-rør 20mm (Hovedledning inntak/fordeler)', antall: 15, enhet: 'm', innpris: 54, kategori: 'Mester-tillegg' },
  { id: 5, nrf: '5083703', beskrivelse: 'Roth MultiPex rør-i-rør 16mm (Tappevannskurser)', antall: 75, enhet: 'm', innpris: 38, kategori: 'Mester-tillegg' },
  { id: 6, nrf: '8370003', beskrivelse: 'Roth X-PERT S5 gulvvarmerør 16x2.0mm diffusjonstett', antall: 120, enhet: 'm', innpris: 24, kategori: 'Mester-tillegg' },
  { id: 7, nrf: '5118712', beskrivelse: 'Roth fordelerskap universal 550mm komplett m/ramme og dør', antall: 1, enhet: 'stk', innpris: 3450, kategori: 'Mester-tillegg' },
  { id: 8, nrf: '5118805', beskrivelse: 'Roth QuickBox veggboks 16mm x 1/2"', antall: 8, enhet: 'stk', innpris: 295, kategori: 'Mester-tillegg' },
  { id: 9, nrf: '5621414', beskrivelse: 'Cimberio kuleventil 3/4" m/hendel (Hovedavstengning)', antall: 2, enhet: 'stk', innpris: 320, kategori: 'Mester-tillegg' },
  { id: 10, nrf: '5621404', beskrivelse: 'Cimberio kuleventil 1/2" m/hendel (Avstengningsventil kurser)', antall: 4, enhet: 'stk', innpris: 195, kategori: 'Mester-tillegg' },
  { id: 11, nrf: '2213316', beskrivelse: 'Wavin AS+ Støydempet avløpsrør 110x1000mm', antall: 8, enhet: 'stk', innpris: 410, kategori: 'Mester-tillegg' },
  { id: 12, nrf: '2213233', beskrivelse: 'Wavin AS+ Støydempet avløpsrør 75x1000mm', antall: 6, enhet: 'stk', innpris: 310, kategori: 'Mester-tillegg' },
  { id: 13, nrf: '2213133', beskrivelse: 'Wavin AS+ Støydempet avløpsrør 50x1000mm', antall: 5, enhet: 'stk', innpris: 220, kategori: 'Mester-tillegg' },
  { id: 14, nrf: '2213346', beskrivelse: 'Wavin AS+ Avløpsbend 110mm 45°', antall: 4, enhet: 'stk', innpris: 185, kategori: 'Mester-tillegg' },
  { id: 15, nrf: '2213253', beskrivelse: 'Wavin AS+ Avløpsbend 75mm 45°', antall: 4, enhet: 'stk', innpris: 145, kategori: 'Mester-tillegg' },
  { id: 16, nrf: '2213166', beskrivelse: 'Wavin AS+ Avløpsbend 50mm 87.5°', antall: 4, enhet: 'stk', innpris: 115, kategori: 'Mester-tillegg' },
  { id: 17, nrf: '2213153', beskrivelse: 'Wavin AS+ Avløpsbend 50mm 45°', antall: 4, enhet: 'stk', innpris: 110, kategori: 'Mester-tillegg' },
  { id: 18, nrf: '5083812', beskrivelse: 'Rørklammer med gummiinnlegg (RSK) 16-20mm M8', antall: 30, enhet: 'stk', innpris: 42, kategori: 'Mester-tillegg' },
  { id: 19, nrf: '2213914', beskrivelse: 'Avløpsklammer med gummiinnlegg 110mm M8/M10', antall: 8, enhet: 'stk', innpris: 78, kategori: 'Mester-tillegg' },
  { id: 20, nrf: '8370781', beskrivelse: 'Roth Touchline SL 8-kanals trådløs romtermostatsentral', antall: 1, enhet: 'stk', innpris: 4950, kategori: 'Mester-tillegg' },
  { id: 21, nrf: '5648184', beskrivelse: 'Waterguard+ sentral med trådløse sensorer & magnetventil', antall: 1, enhet: 'stk', innpris: 5400, kategori: 'Mester-tillegg' },
];

export const BOLIG_ORDER_DATA: OrderItem[] = [...INITIAL_ORDER_DATA];

/**
 * Standard materiellpakke for Næringsbygg / Kontor
 */
export const NAERING_ORDER_DATA: OrderItem[] = [
  { id: 101, nrf: '5083711', beskrivelse: 'Roth MultiPex rør-i-rør 32mm (Hovedfordeling inntak/teknisk rom)', antall: 25, enhet: 'm', innpris: 165, kategori: 'Mester-tillegg' },
  { id: 102, nrf: '5083707', beskrivelse: 'Roth MultiPex rør-i-rør 25mm (Stigerør etasjefordeling)', antall: 60, enhet: 'm', innpris: 98, kategori: 'Mester-tillegg' },
  { id: 103, nrf: '5061214', beskrivelse: 'Rustfri samlestokk DN 50 4-kurs m/avstengningsventiler', antall: 2, enhet: 'stk', innpris: 5800, kategori: 'Mester-tillegg' },
  { id: 104, nrf: '5621424', beskrivelse: 'Cimberio kuleventil 2" fullt løp DN 50 m/hendel', antall: 4, enhet: 'stk', innpris: 1250, kategori: 'Mester-tillegg' },
  { id: 105, nrf: '5621418', beskrivelse: 'Cimberio kuleventil 1 1/4" m/hendel DN 32', antall: 6, enhet: 'stk', innpris: 680, kategori: 'Mester-tillegg' },
  { id: 106, nrf: '5648192', beskrivelse: 'Danfoss tilbakeslagssikring kategori 4 (BA-ventil) DN 40 NS-EN 1717', antall: 1, enhet: 'stk', innpris: 8900, kategori: 'Lokkeand' },
  { id: 107, nrf: '6190013', beskrivelse: 'Geberit Duofix Vegghengt WC-sisterne komplett', antall: 6, enhet: 'stk', innpris: 3800, kategori: 'Lokkeand' },
  { id: 108, nrf: '4290162', beskrivelse: 'Oras Electra berøringsfri servantkran 230V næring', antall: 6, enhet: 'stk', innpris: 3400, kategori: 'Lokkeand' },
  { id: 109, nrf: '4290154', beskrivelse: 'Porsgrund Glow Servant med underskap', antall: 6, enhet: 'stk', innpris: 4200, kategori: 'Lokkeand' },
  { id: 110, nrf: '6190025', beskrivelse: 'Geberit urinal komplett med radar-/infrarødstyring', antall: 2, enhet: 'stk', innpris: 7200, kategori: 'Lokkeand' },
  { id: 111, nrf: '8001254', beskrivelse: 'OSO Maxi næringsbereder 300L 10kW 400V', antall: 1, enhet: 'stk', innpris: 28500, kategori: 'Lokkeand' },
  { id: 112, nrf: '9041235', beskrivelse: 'Grundfos Magna3 32-100 F sirkulasjonspumpe', antall: 1, enhet: 'stk', innpris: 14500, kategori: 'Lokkeand' },
  { id: 113, nrf: '2213388', beskrivelse: 'Wavin AS+ Støydempet avløpsrør 160x1000mm', antall: 6, enhet: 'stk', innpris: 680, kategori: 'Mester-tillegg' },
  { id: 114, nrf: '2213316', beskrivelse: 'Wavin AS+ Støydempet avløpsrør 110x1000mm', antall: 15, enhet: 'stk', innpris: 410, kategori: 'Mester-tillegg' },
  { id: 115, nrf: '2213233', beskrivelse: 'Wavin AS+ Støydempet avløpsrør 75x1000mm', antall: 10, enhet: 'stk', innpris: 310, kategori: 'Mester-tillegg' },
  { id: 116, nrf: '2213133', beskrivelse: 'Wavin AS+ Støydempet avløpsrør 50x1000mm', antall: 8, enhet: 'stk', innpris: 220, kategori: 'Mester-tillegg' },
  { id: 117, nrf: '2213346', beskrivelse: 'Wavin AS+ Avløpsbend 110mm 45°', antall: 8, enhet: 'stk', innpris: 185, kategori: 'Mester-tillegg' },
  { id: 118, nrf: '2213253', beskrivelse: 'Wavin AS+ Avløpsbend 75mm 45°', antall: 6, enhet: 'stk', innpris: 145, kategori: 'Mester-tillegg' },
  { id: 119, nrf: '5083832', beskrivelse: 'Rørklammer med gummiinnlegg (RSK) 50-65mm M10', antall: 20, enhet: 'stk', innpris: 92, kategori: 'Mester-tillegg' },
  { id: 120, nrf: '5083824', beskrivelse: 'Rørklammer med gummiinnlegg (RSK) 32-40mm M10', antall: 30, enhet: 'stk', innpris: 68, kategori: 'Mester-tillegg' },
  { id: 121, nrf: '2213914', beskrivelse: 'Avløpsklammer med gummiinnlegg 110mm M8/M10', antall: 16, enhet: 'stk', innpris: 78, kategori: 'Mester-tillegg' },
  { id: 122, nrf: '5648184', beskrivelse: 'Waterguard+ sentral med trådløse sensorer & magnetventil', antall: 1, enhet: 'stk', innpris: 5400, kategori: 'Mester-tillegg' },
];

/**
 * Standard materiellpakke for Sprinkleranlegg (NS-EN 12845 / FG-godkjent)
 */
export const SPRINKLER_ORDER_DATA: OrderItem[] = [
  { id: 201, nrf: '9210010', beskrivelse: 'Sprinkler alarmventil DN 100 komplett med trimsats og vannklokke', antall: 1, enhet: 'stk', innpris: 34500, kategori: 'Lokkeand' },
  { id: 202, nrf: '9210120', beskrivelse: 'Flenset tilbakeslagsklaff DN 100 for sprinkleranlegg', antall: 1, enhet: 'stk', innpris: 9200, kategori: 'Mester-tillegg' },
  { id: 203, nrf: '9210080', beskrivelse: 'Strømningsvakt (Flow switch) DN 65 med tidsforsinkelse', antall: 2, enhet: 'stk', innpris: 4600, kategori: 'Mester-tillegg' },
  { id: 204, nrf: '9210090', beskrivelse: 'Test- og avtappingsventil (Inspector Test Connection) 1" m/siktglass', antall: 2, enhet: 'stk', innpris: 3800, kategori: 'Mester-tillegg' },
  { id: 205, nrf: '5648192', beskrivelse: 'Danfoss tilbakeslagssikring kategori 4 (BA-ventil) DN 40 NS-EN 1717', antall: 1, enhet: 'stk', innpris: 8900, kategori: 'Lokkeand' },
  { id: 206, nrf: '9210020', beskrivelse: 'Sprinklerhode hengende K-80 68°C 1/2" forniklet m/rosett', antall: 48, enhet: 'stk', innpris: 145, kategori: 'Lokkeand' },
  { id: 207, nrf: '9210030', beskrivelse: 'Sprinklerhode stående K-80 68°C 1/2" messing', antall: 12, enhet: 'stk', innpris: 145, kategori: 'Lokkeand' },
  { id: 208, nrf: '9210040', beskrivelse: 'Galvanisert rillet stålrør DN 65 (2 1/2") L=6m', antall: 60, enhet: 'm', innpris: 320, kategori: 'Mester-tillegg' },
  { id: 209, nrf: '9210045', beskrivelse: 'Galvanisert rillet stålrør DN 50 (2") L=6m', antall: 90, enhet: 'm', innpris: 240, kategori: 'Mester-tillegg' },
  { id: 210, nrf: '9210050', beskrivelse: 'Galvanisert rillet stålrør DN 32 (1 1/4") L=6m', antall: 120, enhet: 'm', innpris: 180, kategori: 'Mester-tillegg' },
  { id: 211, nrf: '9210060', beskrivelse: 'Rillekobling stiv DN 65 (2 1/2") m/pakning', antall: 24, enhet: 'stk', innpris: 210, kategori: 'Mester-tillegg' },
  { id: 212, nrf: '9210065', beskrivelse: 'Rillekobling stiv DN 50 (2") m/pakning', antall: 36, enhet: 'stk', innpris: 175, kategori: 'Mester-tillegg' },
  { id: 213, nrf: '9210070', beskrivelse: 'Rille T-rør / sadelkobling DN 65 x 1/2" for sprinklerhode', antall: 60, enhet: 'stk', innpris: 165, kategori: 'Mester-tillegg' },
  { id: 214, nrf: '9210100', beskrivelse: 'Sprinkler pæreklammer FM/VdS-godkjent DN 65 M10', antall: 30, enhet: 'stk', innpris: 58, kategori: 'Mester-tillegg' },
  { id: 215, nrf: '9210110', beskrivelse: 'Sprinkler pæreklammer FM/VdS-godkjent DN 50 M10', antall: 45, enhet: 'stk', innpris: 46, kategori: 'Mester-tillegg' },
  { id: 216, nrf: '6190013', beskrivelse: 'Geberit Duofix Vegghengt WC-sisterne komplett', antall: 4, enhet: 'stk', innpris: 3800, kategori: 'Lokkeand' },
  { id: 217, nrf: '4290154', beskrivelse: 'Porsgrund Glow Servant med underskap', antall: 4, enhet: 'stk', innpris: 4200, kategori: 'Lokkeand' },
  { id: 218, nrf: '2213316', beskrivelse: 'Wavin AS+ Støydempet avløpsrør 110x1000mm', antall: 10, enhet: 'stk', innpris: 410, kategori: 'Mester-tillegg' },
];

/**
 * Standard materiellpakke for Kombinasjonsbygg / Boligblokk
 */
export const KOMBI_ORDER_DATA: OrderItem[] = [
  ...NAERING_ORDER_DATA.slice(0, 6),
  { id: 301, nrf: '6190013', beskrivelse: 'Geberit Duofix Vegghengt WC-sisterne komplett', antall: 8, enhet: 'stk', innpris: 3800, kategori: 'Lokkeand' },
  { id: 302, nrf: '4290154', beskrivelse: 'Porsgrund Glow Servant med underskap', antall: 8, enhet: 'stk', innpris: 4200, kategori: 'Lokkeand' },
  { id: 303, nrf: '5083703', beskrivelse: 'Roth MultiPex rør-i-rør 16mm (Tappevannskurser)', antall: 200, enhet: 'm', innpris: 38, kategori: 'Mester-tillegg' },
  { id: 304, nrf: '5118712', beskrivelse: 'Roth fordelerskap universal 550mm komplett m/ramme og dør', antall: 4, enhet: 'stk', innpris: 3450, kategori: 'Mester-tillegg' },
  { id: 305, nrf: '5118805', beskrivelse: 'Roth QuickBox veggboks 16mm x 1/2"', antall: 24, enhet: 'stk', innpris: 295, kategori: 'Mester-tillegg' },
  ...NAERING_ORDER_DATA.slice(10),
];

/**
 * Gjenkjenner prosjekttype fra bygningstype, notater, feller eller dokumenttekst
 */
export function detekterProsjektType(prosjekt?: ProsjektData): KalkyleProsjektType {
  if (!prosjekt) return 'bolig';

  const samletTekst = [
    prosjekt.navn,
    prosjekt.bygningstype,
    prosjekt.beskrivelse,
    prosjekt.notater,
    ...(prosjekt.feller || []),
    ...(prosjekt.kjenteMangler || []),
  ].join(' ').toLowerCase();

  // 1. Sprinkler / slukkeanlegg
  if (/sprinkler|sprinklet|sprinkling|slukkeanlegg|vds|fg-regler/i.test(samletTekst)) {
    return 'sprinkler';
  }

  // 2. Kombinasjonsbygg / leilighetsbygg / boligblokk
  if (/kombinasjonsbygg|blandet bruk|boligblokk|leilighet/i.test(samletTekst)) {
    return 'kombi';
  }

  // 3. Næringsbygg / Kontor / Industri / Helse / Skole
  if (
    /kontor|næring|industri|lager|verksted|helse|skole|barnehage|forus|jatta|solbakken/i.test(
      samletTekst
    ) ||
    (typeof prosjekt.bra === 'number' && prosjekt.bra >= 1000)
  ) {
    return 'naering';
  }

  // 4. Standard: Bolig / Enebolig / Småhus
  return 'bolig';
}

/**
 * Beregner utpris basert på faglig kalkulasjon:
 * - Lokkeand: 20,0 % dekningsgrad (25 % påslag, faktor 1.25)
 * - Mester-tillegg: 52,4 % dekningsgrad (110 % påslag, faktor 2.10)
 */
export function beregnUtpris(innpris: number, kategori: 'Lokkeand' | 'Mester-tillegg'): number {
  const base = Number.isFinite(innpris) ? Math.max(0, innpris) : 0;
  return kategori === 'Lokkeand' ? Math.round(base * 1.25) : Math.round(base * 2.10);
}

/**
 * Genererer dynamisk materiellflyt skalert etter prosjekttype, BRA og sanitærbelastning
 */
export function genererVarelisteForProsjekt(
  prosjekt: ProsjektData,
  valgtType?: KalkyleProsjektType
): OrderItem[] {
  const type = valgtType ?? detekterProsjektType(prosjekt);
  let baseItems: OrderItem[];

  switch (type) {
    case 'sprinkler':
      baseItems = SPRINKLER_ORDER_DATA.map((i) => ({ ...i }));
      break;
    case 'naering':
      baseItems = NAERING_ORDER_DATA.map((i) => ({ ...i }));
      break;
    case 'kombi':
      baseItems = KOMBI_ORDER_DATA.map((i) => ({ ...i }));
      break;
    case 'bolig':
    default:
      baseItems = BOLIG_ORDER_DATA.map((i) => ({ ...i }));
      break;
  }

  return synkroniserOrdreMedProsjekt(baseItems, prosjekt);
}

/**
 * Synkroniserer og skalerer vareuttaket med prosjektdata (f.eks. sanitærutstyr, BRA og gulvvarmeareal)
 */
export function synkroniserOrdreMedProsjekt(
  baseItems: OrderItem[] = INITIAL_ORDER_DATA,
  prosjekt?: ProsjektData
): OrderItem[] {
  if (!prosjekt) return baseItems;

  const bra = typeof prosjekt.bra === 'number' && prosjekt.bra > 0 ? prosjekt.bra : null;

  return baseItems.map((item) => {
    // 1. Sanitærutstyr: WC
    if (item.nrf === '6190013' && prosjekt.sanitaerUtstyr?.wc?.antall !== undefined) {
      return { ...item, antall: Math.max(0, prosjekt.sanitaerUtstyr.wc.antall) };
    }

    // 2. Sanitærutstyr: Servant
    if (
      (item.nrf === '4290154' || item.nrf === '4290162') &&
      prosjekt.sanitaerUtstyr?.servant?.antall !== undefined
    ) {
      return { ...item, antall: Math.max(0, prosjekt.sanitaerUtstyr.servant.antall) };
    }

    // 3. Sanitærutstyr: Urinal
    if (item.nrf === '6190025' && prosjekt.sanitaerUtstyr?.urinal?.antall !== undefined) {
      return { ...item, antall: Math.max(0, prosjekt.sanitaerUtstyr.urinal.antall) };
    }

    // 4. QuickBox Veggbokser: Dynamisk oppdatering hvis sanitærutstyr finnes
    if (item.nrf === '5118805' && prosjekt.sanitaerUtstyr) {
      const wc = prosjekt.sanitaerUtstyr.wc?.antall ?? 3;
      const servant = prosjekt.sanitaerUtstyr.servant?.antall ?? 2;
      const dusj = prosjekt.sanitaerUtstyr.dusj?.antall ?? 1;
      const sumBokser = wc * 1 + servant * 2 + dusj * 2;
      if (sumBokser > 0) {
        return { ...item, antall: sumBokser };
      }
    }

    // 5. Gulvvarmerør: 5 m rør per m² gulvvarme hvis definert
    if (
      item.nrf === '8370003' &&
      prosjekt.varmeanlegg?.gulvvarmeM2 &&
      prosjekt.varmeanlegg.gulvvarmeM2 > 0
    ) {
      return { ...item, antall: Math.round(prosjekt.varmeanlegg.gulvvarmeM2 * 5) };
    }

    // 6. Sprinklerhoder: Skaler iht. NS-EN 12845 (~1 hode per 12 m² BRA)
    if (item.nrf === '9210020' && bra) {
      const estimatHoder = Math.max(12, Math.round((bra * 0.8) / 12));
      return { ...item, antall: estimatHoder };
    }

    // 7. Sprinklerrør DN 65 & DN 50: Skaler lengder dersom bygget er stort (BRA > 1000)
    if (bra && bra > 1000) {
      const skalerFaktor = Math.min(4, Math.max(1, bra / 1000));
      if (item.nrf === '9210040' || item.nrf === '9210045') {
        return { ...item, antall: Math.round(item.antall * skalerFaktor) };
      }
      if (item.nrf === '5083711' || item.nrf === '5083707') {
        return { ...item, antall: Math.round(item.antall * skalerFaktor) };
      }
    }

    return item;
  });
}
