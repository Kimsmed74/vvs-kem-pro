export type ModulStatus = 'klar' | 'planlagt';

export interface Modul {
  id: string;
  nummer: number;
  navn: string;
  ikon: string;
  beskrivelse: string;
  fase: number;
  status: ModulStatus;
}

/** De 9 fagmodulene fra masterplanen – alle koblet til den globale prosjekt-staten (Single Source of Truth). */
export const MODULER: readonly Modul[] = [
  { id: 'sanitaer', nummer: 1, navn: 'Sanitær & Rørdimensjonering', ikon: '💧', beskrivelse: 'Trykkfall KV/VV, spillvann, overvann og varmtvannsbereder.', fase: 1, status: 'klar' },
  { id: 'varme', nummer: 2, navn: 'Varme & Hydronikk', ikon: '🔥', beskrivelse: 'Trykkholding (Pneumatex), avgassing, innregulering (IMI) og varmesentral.', fase: 2, status: 'klar' },
  { id: 'ventilasjon', nummer: 3, navn: 'Ventilasjon & Inneklima', ikon: '🌬️', beskrivelse: 'Luftmengder (TEK17 kap. 13), aggregatvalg, SFP, behovsstyring og lyd.', fase: 3, status: 'klar' },
  { id: 'pumper', nummer: 4, navn: 'Pumper & Regulering', ikon: '⚙️', beskrivelse: 'Sirkulasjonspumper (MAGNA3), trykkøkning (WWBooster) og hydrostatisk kontroll.', fase: 4, status: 'klar' },
  { id: 'isolasjon', nummer: 5, navn: 'Isolasjon & Rørmaterialer', ikon: '🧱', beskrivelse: 'Varmetap (Glava), kondensisolering (Armaflex), PP-R og lengdeutvidelse.', fase: 4, status: 'klar' },
  { id: 'brann', nummer: 6, navn: 'Brann & Sprinkler', ikon: '🧯', beskrivelse: 'Sprinklerdimensjonering (NS-EN 12845), Q/p-kontroll og branntromler.', fase: 4, status: 'klar' },
  { id: 'lovverk', nummer: 7, navn: 'Lover & Forskrifter', ikon: '⚖️', beskrivelse: 'TEK17, SAK10, 6,0 bar-kravet, 950 mm-regelen og uavhengig kontroll.', fase: 5, status: 'klar' },
  { id: 'breeam', nummer: 8, navn: 'BREEAM, LCC & Energi', ikon: '🌱', beskrivelse: '25-års LCC nåverdikalkyle (NS 3454), NS 3031 transmisjonstap og BREEAM-NOR.', fase: 5, status: 'klar' },
  { id: 'prosjekt', nummer: 9, navn: 'Prosjekt, TFM & Stegmodell', ikon: '🗂️', beskrivelse: 'Statsbygg PA 0802 TFM-generator, ITB-matrise (NS 3935) og Stegstandarden.', fase: 6, status: 'klar' },
];
