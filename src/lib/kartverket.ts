import type { ProsjektData } from '../data/prosjekter';
import { fmt } from './format';

export interface KartverketAdresseTreff {
  adressetekst: string;
  postnummer: string;
  poststed: string;
  kommunenavn: string;
  kommunenummer: string;
  gardsnummer: number;
  bruksnummer: number;
  festenummer?: number;
  lat: number | null;
  lon: number | null;
  fullAdresse: string;
  matrikkelTekst: string;
  vaMyndighetTekst: string;
}

export interface KartverketOppslagResultat {
  valgt: KartverketAdresseTreff;
  alleTreff: KartverketAdresseTreff[];
  terrengkoteNn2000: number | null;
  datakilde?: string;
  terrengType?: string;
}

interface GeonorgeAdresseRaa {
  adressetekst?: string;
  postnummer?: string;
  poststed?: string;
  kommunenavn?: string;
  kommunenummer?: string;
  gardsnummer?: number;
  bruksnummer?: number;
  festenummer?: number;
  representasjonspunkt?: {
    epsg?: string;
    lat?: number;
    lon?: number;
  };
}

interface GeonorgeAdresseRespons {
  adresser?: GeonorgeAdresseRaa[];
}

interface GeonorgeHoydeRespons {
  koordsysResultat?: {
    hoyderefsys?: string;
  };
  punkter?: {
    z?: number | null;
    terreng?: string;
    datakilde?: string;
  }[];
}

function penKommuneNavn(raa: string): string {
  const trimmet = raa.trim();
  if (!trimmet) return '';
  return trimmet
    .toLowerCase()
    .replace(/(^|[\s-])([a-zæøå])/g, (_, sep: string, bokstav: string) => `${sep}${bokstav.toUpperCase()}`);
}

/**
 * Søker i Kartverkets åpne Adresse-API (Geonorge):
 * https://ws.geonorge.no/adresser/v1/sok?sok=...
 */
export async function sokKartverketAdresse(
  soketekst: string,
  fetchFn: typeof fetch = fetch,
): Promise<KartverketAdresseTreff[]> {
  const renset = soketekst.trim();
  if (!renset) return [];

  const url = `https://ws.geonorge.no/adresser/v1/sok?sok=${encodeURIComponent(renset)}&treffPerSide=5&fuzzy=true`;
  let respons: Response;
  try {
    respons = await fetchFn(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
  } catch {
    throw new Error('Fikk ikke kontakt med Kartverkets Adresse-API (ws.geonorge.no). Sjekk internettforbindelsen.');
  }

  if (!respons.ok) {
    throw new Error(`Kartverkets Adresse-API svarte med HTTP ${respons.status}.`);
  }

  const data = (await respons.json()) as GeonorgeAdresseRespons;
  const liste = Array.isArray(data.adresser) ? data.adresser : [];

  return liste.map((a) => {
    const adressetekst = a.adressetekst?.trim() ?? renset;
    const postnummer = a.postnummer?.trim() ?? '';
    const poststed = penKommuneNavn(a.poststed ?? '');
    const kommune = penKommuneNavn(a.kommunenavn ?? poststed);
    const kommunenummer = a.kommunenummer?.trim() ?? '';
    const gnr = typeof a.gardsnummer === 'number' ? a.gardsnummer : 0;
    const bnr = typeof a.bruksnummer === 'number' ? a.bruksnummer : 0;
    const fnr = typeof a.festenummer === 'number' && a.festenummer > 0 ? a.festenummer : undefined;

    const lat = typeof a.representasjonspunkt?.lat === 'number' ? a.representasjonspunkt.lat : null;
    const lon = typeof a.representasjonspunkt?.lon === 'number' ? a.representasjonspunkt.lon : null;

    const postDel = [postnummer, poststed].filter(Boolean).join(' ');
    const fullAdresse = [adressetekst, postDel].filter(Boolean).join(', ');

    const gnrBnrDel =
      gnr > 0 || bnr > 0
        ? `Gnr. ${gnr} / Bnr. ${bnr}${fnr ? ` / Fnr. ${fnr}` : ''}`
        : '';
    const matrikkelTekst = [gnrBnrDel, kommune ? `${kommune} kommune` : '']
      .filter(Boolean)
      .join(', ');

    const vaMyndighetTekst = kommune ? `${kommune} kommune – Vann og avløp (VA-norm)` : '';

    return {
      adressetekst,
      postnummer,
      poststed,
      kommunenavn: kommune,
      kommunenummer,
      gardsnummer: gnr,
      bruksnummer: bnr,
      festenummer: fnr,
      lat,
      lon,
      fullAdresse,
      matrikkelTekst,
      vaMyndighetTekst,
    };
  });
}

/**
 * Henter eksakt terrengkote (NN2000 meter over havet) fra Kartverkets åpne Høydedata-API:
 * https://ws.geonorge.no/hoydedata/v1/punkt?nord=...&ost=...&koordsys=4258
 */
export async function hentKartverketTerrengkote(
  lat: number,
  lon: number,
  fetchFn: typeof fetch = fetch,
): Promise<{ koteNn2000: number | null; datakilde?: string; terreng?: string }> {
  const url = `https://ws.geonorge.no/hoydedata/v1/punkt?nord=${encodeURIComponent(String(lat))}&ost=${encodeURIComponent(String(lon))}&koordsys=4258`;
  try {
    const respons = await fetchFn(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!respons.ok) return { koteNn2000: null };
    const data = (await respons.json()) as GeonorgeHoydeRespons;
    const punkt = data.punkter?.[0];
    const z = typeof punkt?.z === 'number' && Number.isFinite(punkt.z) ? Math.round(punkt.z * 100) / 100 : null;
    return {
      koteNn2000: z,
      datakilde: punkt?.datakilde,
      terreng: punkt?.terreng,
    };
  } catch {
    return { koteNn2000: null };
  }
}

/**
 * Slår opp adresse i Kartverket og henter samtidig terrengkote (NN2000 moh) på koordinatene.
 */
export async function slaaOppAdresseOgKoteIKartverket(
  adresseSok: string,
  fetchFn: typeof fetch = fetch,
): Promise<KartverketOppslagResultat | null> {
  const treff = await sokKartverketAdresse(adresseSok, fetchFn);
  if (treff.length === 0) return null;

  const valgt = treff[0];
  let terrengkoteNn2000: number | null = null;
  let datakilde: string | undefined;
  let terrengType: string | undefined;

  if (valgt.lat !== null && valgt.lon !== null) {
    const hoyde = await hentKartverketTerrengkote(valgt.lat, valgt.lon, fetchFn);
    terrengkoteNn2000 = hoyde.koteNn2000;
    datakilde = hoyde.datakilde;
    terrengType = hoyde.terreng;
  }

  return {
    valgt,
    alleTreff: treff,
    terrengkoteNn2000,
    datakilde,
    terrengType,
  };
}

/**
 * Fletter Kartverket-oppslag (adresse, Gnr/Bnr, kommune og terrengkote NN2000) inn i prosjektet
 * og returnerer både oppdatert prosjekt og en liste over endringer for visning i UI/chat.
 */
export function flettKartverketInnIProsjekt(
  base: ProsjektData,
  oppslag: KartverketOppslagResultat,
): { prosjekt: ProsjektData; endringer: string[] } {
  const endringer: string[] = [];
  const { valgt, terrengkoteNn2000 } = oppslag;

  const nySted = valgt.fullAdresse || base.sted;
  if (valgt.fullAdresse) {
    endringer.push(`Adresse satt til «${valgt.fullAdresse}»`);
  }

  const nyMatrikkel = valgt.matrikkelTekst || base.matrikkel;
  if (valgt.matrikkelTekst) {
    endringer.push(`Matrikkel hentet fra Kartverket: ${valgt.matrikkelTekst}`);
  }

  const nyVaMyndighet = valgt.vaMyndighetTekst || base.vaMyndighet;
  if (valgt.vaMyndighetTekst) {
    endringer.push(`VA-myndighet satt til «${valgt.vaMyndighetTekst}»`);
  }

  const nyGateKote = terrengkoteNn2000 ?? base.koter.gate;
  if (terrengkoteNn2000 !== null) {
    endringer.push(`Terrengkote på tomta (Kartverket NN2000): C +${fmt(terrengkoteNn2000)} moh`);
  }

  const oppdatert: ProsjektData = {
    ...base,
    kilde: 'bruker',
    navn:
      !base.navn.trim() || base.navn === 'Nytt prosjekt'
        ? valgt.adressetekst
        : base.navn,
    sted: nySted,
    matrikkel: nyMatrikkel,
    vaMyndighet: nyVaMyndighet,
    koter: {
      ...base.koter,
      gate: nyGateKote,
    },
  };

  return { prosjekt: oppdatert, endringer };
}
