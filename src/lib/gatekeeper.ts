import type { ProsjektData } from '../data/prosjekter';
import type { ProsjektAnalyse } from './analyse';
import { fmt } from './format';
import type { OverstyringInfo } from './lagring';

export type GatekeeperAlvor = 'kritisk' | 'advarsel';

export type GatekeeperStatus =
  | 'ok'
  | 'overstyrt_estimat'
  | 'kritisk_mangel'
  | 'advarsel';

export type MottakerKategori = 'va_etat' | 'geodata' | 'arkitekt_internt';

export interface InnhentingsVeileder {
  /** Eksakt etat, avdeling eller fagrolle som sitter på opplysningen */
  hvemKontakte: string;
  /** Eksakte fagbegreper, målestokk, karttyper og koder man skal be om */
  hvaSporreEtter: string;
  /** Konkret kulepunkt som legges inn i e-postmalen til kommunen/etat */
  epostKulepunkt: string;
  /** Beskrivelse av hvilket midlertidig estimat som legges inn ved overstyring */
  standardEstimatBeskrivelse: string;
  /** Hvilken mottakerkategori punktet primært tilhører */
  mottakerKategori?: MottakerKategori;
  /** Angir om dette er et internt prosjekteringsgrensesnitt som aldri skal sendes til offentlige etater */
  erInterntPunkt?: boolean;
  /** Begrunnelse for hvorfor punktet skjermes mot offentlige henvendelser */
  skjermingsBegrunnelse?: string;
}

export interface GatekeeperPunkt {
  id: string;
  steg: 1 | 2 | 3 | 4 | 5;
  tittel: string;
  alvor: GatekeeperAlvor;
  status: GatekeeperStatus;
  verdiTekst: string;
  detalj: string;
  overstyring?: OverstyringInfo;
  veileder: InnhentingsVeileder;
}

export interface GatekeeperRapport {
  allePunkter: GatekeeperPunkt[];
  kritiskeMangler: GatekeeperPunkt[];
  overstyrteEstimater: GatekeeperPunkt[];
  advarsler: GatekeeperPunkt[];
  okPunkter: GatekeeperPunkt[];
  /** Sant dersom det er 0 uavklarte kritiske mangler (enten utfylt eller overstyrt med estimat) */
  kanGodkjenneEndelig: boolean;
  /** Sant dersom det er 0 kritiske mangler OG 0 midlertidige overstyringer */
  kanGodkjenneUtenForbehold: boolean;
  kommuneNavn: string;
  vaEtatNavn: string;
  geodataAvdelingNavn: string;
}

export const OVERSTYRING_ETIKETT = 'Midlertidig estimat / Venter på kommunen';

function utledKommuneInfo(prosjekt: ProsjektData): {
  kommuneNavn: string;
  vaEtatNavn: string;
  geodataAvdelingNavn: string;
} {
  let kommune = 'Kommunen';
  const kilde = `${prosjekt.vaMyndighet} ${prosjekt.matrikkel} ${prosjekt.sted}`;
  const m = kilde.match(/([A-ZÆØÅ][a-zæøåA-ZÆØÅ-]+)\s+kommune/i);
  if (m) {
    kommune = `${m[1].charAt(0).toUpperCase()}${m[1].slice(1).toLowerCase()} kommune`;
  } else if (prosjekt.sted.trim()) {
    const deler = prosjekt.sted.split(',').map((s) => s.trim());
    const siste = deler[deler.length - 1] ?? '';
    const postMatch = siste.match(/^(?:\d{4}\s+)?([A-ZÆØÅa-zæøå-]+)$/);
    if (postMatch) {
      const stedsnavn = postMatch[1];
      kommune = `${stedsnavn.charAt(0).toUpperCase()}${stedsnavn.slice(1).toLowerCase()} kommune`;
    }
  }

  return {
    kommuneNavn: kommune,
    vaEtatNavn: `${kommune} – Vann- og avløpsetaten (VA-forvaltning / Kundeservice VA)`,
    geodataAvdelingNavn: `${kommune} – Geodata- og oppmålingsavdelingen (Kart og matrikkel)`,
  };
}

/**
 * Evaluerer alle påkrevde og anbefalte datapunkter på tvers av Steg 1–5
 * og klassifiserer dem i:
 * - 🛑 Kritiske mangler (stoppere før endelig låsing i Steg 5)
 * - 🟡 Overstyrte estimater («Midlertidig estimat / Venter på kommunen»)
 * - ⚠️ Advarsler / Anbefalt info (stopper aldri fremdrift)
 * - ✅ OK (verifiserte data)
 */
export function evaluerGatekeeper(
  prosjekt: ProsjektData,
  analyse: ProsjektAnalyse,
  overstyringer: Record<string, OverstyringInfo> = {},
  qaFullfort = 0
): GatekeeperRapport {
  const { kommuneNavn, vaEtatNavn, geodataAvdelingNavn } = utledKommuneInfo(prosjekt);

  const finnStatus = (
    id: string,
    erUtfylt: boolean,
    alvor: GatekeeperAlvor
  ): { status: GatekeeperStatus; overstyring?: OverstyringInfo } => {
    const ov = overstyringer[id];
    if (ov?.aktiv) {
      return { status: 'overstyrt_estimat', overstyring: ov };
    }
    if (erUtfylt) {
      return { status: 'ok' };
    }
    return { status: alvor === 'kritisk' ? 'kritisk_mangel' : 'advarsel' };
  };

  const punkter: GatekeeperPunkt[] = [];

  // --------------------------------------------------------------------------
  // STEG 1: GRUNNDATA, ADRESSE, MATRIKKEL & BRA
  // --------------------------------------------------------------------------
  const harBra = prosjekt.bra !== null && prosjekt.bra > 0;
  const sBra = finnStatus('bra_areal', harBra, 'kritisk');
  punkter.push({
    id: 'bra_areal',
    steg: 1,
    tittel: 'Oppvarmet bruksareal (BRA m²)',
    alvor: 'kritisk',
    status: sBra.status,
    overstyring: sBra.overstyring,
    verdiTekst: harBra ? `${prosjekt.bra} m²` : 'Ikke oppgitt',
    detalj:
      sBra.status === 'overstyrt_estimat'
        ? `${sBra.overstyring?.etikett} (${sBra.overstyring?.estimatVerdi ?? `${prosjekt.bra ?? 1000} m²`})`
        : harBra
        ? `Registrert: ${prosjekt.bra} m² (${prosjekt.bygningstype})`
        : 'Påkrevd for dimensjonering av varmesentral (TEK17 § 14-4), energi og LCC.',
    veileder: {
      hvemKontakte: `Arkitekt (ARK) / Byggherre eller ${geodataAvdelingNavn}`,
      hvaSporreEtter:
        'Be om arealoppsett iht. NS 3940 med eksakt oppvarmet bruksareal (BRA i m²) og etasjefordeling.',
      epostKulepunkt:
        'Arealoppsett (NS 3940) / matrikkelrapport med oppvarmet bruksareal (BRA m²) og antall etasjer.',
      standardEstimatBeskrivelse: 'Setter midlertidig estimat BRA = 1 000 m².',
      mottakerKategori: 'geodata',
      erInterntPunkt: false,
    },
  });

  const harStedOgGnr = Boolean(prosjekt.sted.trim() && prosjekt.matrikkel.trim());
  const sSted = finnStatus('sted_matrikkel', harStedOgGnr, 'advarsel');
  punkter.push({
    id: 'sted_matrikkel',
    steg: 1,
    tittel: 'Gateadresse, Gnr/Bnr og Terrengkote (Kartverket)',
    alvor: 'advarsel',
    status: sSted.status,
    overstyring: sSted.overstyring,
    verdiTekst: harStedOgGnr
      ? `${prosjekt.sted} (${prosjekt.matrikkel})`
      : prosjekt.sted || 'Ikke oppgitt',
    detalj:
      sSted.status === 'overstyrt_estimat'
        ? `${sSted.overstyring?.etikett}`
        : harStedOgGnr
        ? `Adresse og matrikkel bekreftet${
            prosjekt.koter.gate !== null ? ` · Terrengkote C +${fmt(prosjekt.koter.gate)} moh` : ''
          }`
        : 'Anbefalt for entydig identifikasjon på sanitæranmeldelse og VA-søknad.',
    veileder: {
      hvemKontakte: `${geodataAvdelingNavn} (eller bruk Kartverket-søket på Steg 1B)`,
      hvaSporreEtter:
        'Be om situasjonsplan i M 1:500 (NN2000 høydereferanse) samt offisielt Gårdsnummer (Gnr) og Bruksnummer (Bnr).',
      epostKulepunkt:
        'Situasjonsplan i målestokk 1:500 med høydereferanse NN2000 og bekreftet Gnr/Bnr.',
      standardEstimatBeskrivelse: 'Merker adresse/matrikkel som midlertidig avklart.',
      mottakerKategori: 'geodata',
      erInterntPunkt: false,
    },
  });

  // --------------------------------------------------------------------------
  // STEG 2: SANITÆR, UTVENDIG VA & KOTER (LOV 2)
  // --------------------------------------------------------------------------
  const harKumKoter = prosjekt.koter.itrKum !== null && prosjekt.koter.ibrKum !== null;
  const sKum = finnStatus('kote_itr_ibr', harKumKoter, 'kritisk');
  punkter.push({
    id: 'kote_itr_ibr',
    steg: 2,
    tittel: 'Kommunale kumhøyder: Kote ITK/ITR og IBR (NN2000)',
    alvor: 'kritisk',
    status: sKum.status,
    overstyring: sKum.overstyring,
    verdiTekst:
      prosjekt.koter.itrKum !== null
        ? `ITK/ITR C +${fmt(prosjekt.koter.itrKum)}${
            prosjekt.koter.ibrKum !== null ? ` / IBR C +${fmt(prosjekt.koter.ibrKum)}` : ' (mangler IBR)'
          }`
        : 'Ikke oppgitt',
    detalj:
      sKum.status === 'overstyrt_estimat'
        ? `${sKum.overstyring?.etikett} (${
            sKum.overstyring?.estimatVerdi ??
            `ITK C +${fmt(prosjekt.koter.itrKum ?? 12.0)} / IBR C +${fmt(prosjekt.koter.ibrKum ?? 11.75)}`
          })`
        : harKumKoter
        ? `Registrert: ITK/ITR C +${fmt(prosjekt.koter.itrKum!)} moh, IBR C +${fmt(prosjekt.koter.ibrKum!)} moh`
        : 'Kritisk for Lov 2 (950 mm tilbakeslagssikring iht. TEK17 § 15-7/8) og fallkontroll på stikkledning.',
    veileder: {
      hvemKontakte: `${vaEtatNavn} og ${geodataAvdelingNavn}`,
      hvaSporreEtter:
        'Be om situasjonsplan i M 1:500 og kommunalt VA-ledningskart (SOSI/PDF) med eksakte kotehøyder i NN2000 på tilknytningskum: Kote Gatelokk (OK kum), Innvendig Topp Kum/Rør (ITK/ITR) på hovedledning og Innvendig Bunn Rør (IBR), samt ledningsdimensjon (DN) og materiale.',
      epostKulepunkt:
        'Situasjonsplan i M 1:500 og kommunalt VA-ledningskart med kotehøyder (NN2000) for ITK/ITR (innvendig topp kum/rør), IBR (innvendig bunn rør) og gatelokk i tilknytningskum, samt dimensjon og kapasitet på kommunal spillvanns- og overvannsledning.',
      standardEstimatBeskrivelse:
        prosjekt.koter.gate !== null
          ? `Estimerer ITK = C +${fmt(prosjekt.koter.gate - 1.6)} (-1,60 m under terreng) og IBR = C +${fmt(prosjekt.koter.gate - 1.85)} (-1,85 m) merket «Venter på kommunen».`
          : 'Setter midlertidig estimat ITK = C +12,00 moh og IBR = C +11,75 moh merket «Venter på kommunen».',
      mottakerKategori: 'va_etat',
      erInterntPunkt: false,
    },
  });

  const harSlukKote = prosjekt.koter.gulv.length > 0;
  const sSluk = finnStatus('kote_laveste_sluk', harSlukKote, 'kritisk');
  punkter.push({
    id: 'kote_laveste_sluk',
    steg: 2,
    tittel: 'Kote laveste innvendige sluk / ferdig gulv (OK FG)',
    alvor: 'kritisk',
    status: sSluk.status,
    overstyring: sSluk.overstyring,
    verdiTekst: harSlukKote
      ? `${prosjekt.koter.gulv[0].navn}: C +${fmt(prosjekt.koter.gulv[0].kote)}`
      : 'Ikke oppgitt',
    detalj:
      sSluk.status === 'overstyrt_estimat'
        ? `${sSluk.overstyring?.etikett} (${
            sSluk.overstyring?.estimatVerdi ??
            (harSlukKote ? `C +${fmt(prosjekt.koter.gulv[0].kote)} moh` : 'Estimat')
          })`
        : harSlukKote
        ? `Laveste sluk registrert på C +${fmt(prosjekt.koter.gulv[0].kote)} moh`
        : 'Kritisk for å avgjøre om bygget kan ha selvfall eller krever pumpestasjon (NS-EN 12050).',
    veileder: {
      hvemKontakte: 'Arkitekt (ARK) / Byggherre (snittegning og plan kjeller/1. etasje)',
      hvaSporreEtter:
        'Be om målsatt snittegning og plantegning for laveste etasje/kjeller med angitt Overkant Ferdig Gulv (OK FG) i høydesystem NN2000.',
      epostKulepunkt:
        'Bekreftet kote for Overkant Ferdig Gulv (OK FG / laveste sluk) i NN2000 fra arkitekt/prosjekt.',
      standardEstimatBeskrivelse:
        prosjekt.koter.gate !== null
          ? `Setter midlertidig estimat for laveste sluk = C +${fmt(prosjekt.koter.gate + 0.2)} moh (terreng + 0,20 m).`
          : 'Setter midlertidig estimat for laveste sluk = C +13,20 moh.',
      mottakerKategori: 'arkitekt_internt',
      erInterntPunkt: true,
      skjermingsBegrunnelse:
        'Kote laveste innvendige sluk / Overkant Ferdig Gulv (OK FG) er en intern arkitekt- og byggtegningavklaring. Kommunen forvalter kun koter i tilknytningskum (ITK/IBR) og skal ikke motta innvendige slukopplysninger.',
    },
  });

  const harStikk =
    prosjekt.koter.stikkLengde !== null &&
    prosjekt.koter.stikkLengde > 0 &&
    prosjekt.koter.fallNevner !== null;
  const sStikk = finnStatus('stikkledning_fall', harStikk, 'advarsel');
  punkter.push({
    id: 'stikkledning_fall',
    steg: 2,
    tittel: 'Stikkledning: Lengde (m) og fall (1:N) til kommunal kum',
    alvor: 'advarsel',
    status: sStikk.status,
    overstyring: sStikk.overstyring,
    verdiTekst: harStikk
      ? `${prosjekt.koter.stikkLengde} m med fall 1:${prosjekt.koter.fallNevner}`
      : 'Ikke oppgitt',
    detalj:
      sStikk.status === 'overstyrt_estimat'
        ? `${sStikk.overstyring?.etikett} (${sStikk.overstyring?.estimatVerdi ?? '18 m, fall 1:60'})`
        : harStikk
        ? `Gir høydeforskjell +${fmt(analyse.hoydeIGroft ?? 0)} m i grøft`
        : 'Trengs for å beregne minste utgangskote ved grunnmur og grøftedybde.',
    veileder: {
      hvemKontakte: `Grunnentreprenør / LARK eller måles på situasjonskart fra ${geodataAvdelingNavn}`,
      hvaSporreEtter:
        'Mål trasélengde for utvendig bunn-/stikkledning fra grunnmur til kommunal tilknytningskum (m) og avklar minste tillatte fall (normalt 1:60 iht. kommunal VA-norm).',
      epostKulepunkt:
        'Krav til minste fall på privat stikkledning (f.eks. 1:60) og tillatt tilkoblingspunkt på kommunal hovedledning.',
      standardEstimatBeskrivelse:
        'Setter midlertidig estimat lengde = 18 m og fall = 1:60.',
      mottakerKategori: 'va_etat',
      erInterntPunkt: false,
    },
  });

  const harOvervann = analyse.overvann !== null && prosjekt.overvann.maksPaaslippLs !== null;
  const sOv = finnStatus('overvann_paaslipp', harOvervann, 'advarsel');
  punkter.push({
    id: 'overvann_paaslipp',
    steg: 2,
    tittel: 'Overvann: Klimajustert regnintensitet (IVF) og maks påslipp (l/s)',
    alvor: 'advarsel',
    status: sOv.status,
    overstyring: sOv.overstyring,
    verdiTekst: harOvervann
      ? `I = ${prosjekt.overvann.intensitet} l/(s·ha), maks påslipp ${prosjekt.overvann.maksPaaslippLs} l/s`
      : 'Ikke komplett',
    detalj:
      sOv.status === 'overstyrt_estimat'
        ? `${sOv.overstyring?.etikett} (${sOv.overstyring?.estimatVerdi ?? 'I=250 l/(s·ha), maks 10 l/s'})`
        : harOvervann
        ? `Q = ${fmt(analyse.overvann!.q, 1)} l/s · Fordrøyningsbehov: ${fmt(analyse.overvann!.tilbakehold ?? 0, 1)} l/s`
        : 'Anbefalt for dimensjonering av fordrøyningsmagasin (LOD) iht. TEK17 § 15-8.',
    veileder: {
      hvemKontakte: vaEtatNavn,
      hvaSporreEtter:
        'Be om kommunens gjeldende overvannsnorm: dimensjonerende regnintensitet inkl. klimafaktor (l/(s·ha) ved 20/25 års gjentaksintervall) samt maksimalt tillatt påslipp av overvann til kommunalt nett (l/s eller l/(s·ha)).',
      epostKulepunkt:
        'Kommunens krav til overvannshåndtering (LOD): maks tillatt påslipp (l/s) til kommunalt overvannsnett og gjeldende IVF-regnintensitet inkl. klimafaktor.',
      standardEstimatBeskrivelse:
        'Setter midlertidig estimat regnintensitet = 250 l/(s·ha), maks påslipp = 10 l/s og standard takflate.',
      mottakerKategori: 'va_etat',
      erInterntPunkt: false,
    },
  });

  // --------------------------------------------------------------------------
  // STEG 3: VARME, KJØLING, VENTILASJON & TEKNISK ROM
  // --------------------------------------------------------------------------
  const harTekRom = prosjekt.tekniskRomM2 !== null && prosjekt.tekniskRomM2 > 0;
  const sTekRom = finnStatus('teknisk_rom_areal', harTekRom, 'advarsel');
  punkter.push({
    id: 'teknisk_rom_areal',
    steg: 3,
    tittel: 'Avsatt areal til teknisk rom / varmesentral (TEK17 § 14-4)',
    alvor: 'advarsel',
    status: sTekRom.status,
    overstyring: sTekRom.overstyring,
    verdiTekst: harTekRom ? `${prosjekt.tekniskRomM2} m²` : 'Ikke oppgitt',
    detalj:
      sTekRom.status === 'overstyrt_estimat'
        ? `${sTekRom.overstyring?.etikett} (${sTekRom.overstyring?.estimatVerdi ?? `${prosjekt.tekniskRomM2 ?? 20} m²`})`
        : harTekRom
        ? analyse.varmesentral.kravM2 !== null
          ? `Avsatt ${prosjekt.tekniskRomM2} m² (krav min. ${fmt(analyse.varmesentral.kravM2, 0)} m²)`
          : `Avsatt ${prosjekt.tekniskRomM2} m²`
        : 'Anbefalt for å kontrollere plasskrav til varmesentral, fordelere og ventilasjonsaggregat.',
    veileder: {
      hvemKontakte: 'Arkitekt (ARK) / Prosjektleder',
      hvaSporreEtter:
        'Be om plantegning av teknisk rom / varmesentral med netto gulvareal (m²), fri takhøyde (min. 2,7–3,2 m) og transportåpning/dørbredde for innbringing av beredere og ventilasjonsaggregat.',
      epostKulepunkt:
        'Avklaring med ARK om avsatt areal til varmesentral iht. TEK17 § 14-4 (10 m² + 1 % av BRA).',
      standardEstimatBeskrivelse:
        'Setter midlertidig estimat for teknisk rom lik TEK17-minstekravet (10 m² + 1 % av BRA).',
      mottakerKategori: 'arkitekt_internt',
      erInterntPunkt: true,
      skjermingsBegrunnelse:
        'Arealavsetning til varmesentral iht. TEK17 § 14-4 og teknisk rom er et internt prosjekterings- og arkitektkrav. Slike interne detaljer skal aldri sendes til offentlige etater.',
    },
  });

  // --------------------------------------------------------------------------
  // STEG 4: VANNTRYKK, Q/p-KURVE (SPRINKLER / TRYKKFALL) & ITB
  // --------------------------------------------------------------------------
  const harVerifisertTrykk =
    prosjekt.vanntrykk.statiskBar !== null && !prosjekt.vanntrykk.antatt;
  const sTrykk = finnStatus('vanntrykk_qp', harVerifisertTrykk, 'kritisk');
  punkter.push({
    id: 'vanntrykk_qp',
    steg: 4,
    tittel: 'Kommunalt vanntrykk (bar) og Q/p-kapasitet ved avtakk',
    alvor: 'kritisk',
    status: sTrykk.status,
    overstyring: sTrykk.overstyring,
    verdiTekst:
      prosjekt.vanntrykk.statiskBar !== null
        ? `${prosjekt.vanntrykk.statiskBar} bar statisk${
            prosjekt.vanntrykk.antatt ? ' (antatt)' : ''
          }${
            prosjekt.vanntrykk.dynamiskBar !== null
              ? ` / ${prosjekt.vanntrykk.dynamiskBar} bar ved ${prosjekt.vanntrykk.uttakLmin ?? '?'} l/min`
              : ''
          }`
        : 'Ikke oppgitt',
    detalj:
      sTrykk.status === 'overstyrt_estimat'
        ? `${sTrykk.overstyring?.etikett} (${
            sTrykk.overstyring?.estimatVerdi ??
            `${prosjekt.vanntrykk.statiskBar ?? 4.5} bar statisk / ${prosjekt.vanntrykk.dynamiskBar ?? 3.5} bar dynamisk`
          })`
        : harVerifisertTrykk
        ? `Verifisert: ${prosjekt.vanntrykk.statiskBar} bar statisk`
        : prosjekt.vanntrykk.statiskBar !== null && prosjekt.vanntrykk.antatt
        ? `Statisk trykk (${prosjekt.vanntrykk.statiskBar} bar) er kun antatt – må bekreftes av vannverket eller overstyres som estimat.`
        : 'Kritisk for trykkfallsberegning (Byggforsk 553.102), sprinkler (NS-EN 12845) og vurdering av trykkøkningspumpe.',
    veileder: {
      hvemKontakte: vaEtatNavn,
      hvaSporreEtter:
        'Be om oppgitt kommunalt frihøyde-trykk (kote trykklinje i NN2000 eller statisk trykk i bar) i anboringspunktet, samt kapasitetsmåling / Q-p-punkt (dynamisk resttrykk i bar ved tapping av f.eks. 1 200 l/min for slokkevann/sprinkler).',
      epostKulepunkt:
        'Oppgitt kommunalt vanntrykk (statisk trykk / frihøyde-kote i NN2000) i tilknytningspunktet, samt tilgjengelig vannmengde og dynamisk resttrykk (Q/p-data i bar ved l/min) for forbruksvann og slokkevann/sprinkler.',
      standardEstimatBeskrivelse:
        'Setter midlertidig estimat statisk trykk = 4,5 bar og dynamisk trykk = 3,5 bar ved 1 200 l/min merket «Venter på kommunen».',
      mottakerKategori: 'va_etat',
      erInterntPunkt: false,
    },
  });

  // --------------------------------------------------------------------------
  // STEG 5: AGENT 16 KVALITETSSIKRING & 6-PUNKTS SIGNATUR
  // --------------------------------------------------------------------------
  const harQa = qaFullfort >= 6;
  const sQa = finnStatus('qa_signatur', harQa, 'kritisk');
  punkter.push({
    id: 'qa_signatur',
    steg: 5,
    tittel: 'Agent 16: Seniorrådgiverens 6-punkts kontroll før signatur',
    alvor: 'kritisk',
    status: sQa.status,
    overstyring: sQa.overstyring,
    verdiTekst: `${qaFullfort}/6 sjekkpunkter bekreftet`,
    detalj:
      sQa.status === 'overstyrt_estimat'
        ? `${sQa.overstyring?.etikett} (Foreløpig rapport utstedt med forbehold)`
        : harQa
        ? 'Alle 6 kontrollpunkter er sjekket ut og signert.'
        : `Mangler ${6 - qaFullfort} av 6 sjekkpunkter i Steg 5 (eller overstyr for foreløpig forprosjektrapport).`,
    veileder: {
      hvemKontakte: 'Intern KS / Oppdragsansvarlig Rådgivende Ingeniør VVS (RIV)',
      hvaSporreEtter:
        'Gjennomfør 6-punkts kontroll i Steg 5 (kotesjekk, reversert regning, bransjeutstyr og grensesnitt) eller marker som foreløpig rapport med forbehold mot manglende kommunale data.',
      epostKulepunkt:
        'Bekreftelse på tilknytningsvilkår (forhåndsuttalelse VA) for endelig KS-lukking.',
      standardEstimatBeskrivelse:
        'Merker QA-sjekklisten som «Foreløpig utgave med dokumenterte forbehold mot kommunale data».',
      mottakerKategori: 'arkitekt_internt',
      erInterntPunkt: true,
      skjermingsBegrunnelse:
        'Intern kvalitetssikring (Agent 16) for RIV/Rørleggermester før offentlig oversendelse.',
    },
  });

  const kritiskeMangler = punkter.filter((p) => p.status === 'kritisk_mangel');
  const overstyrteEstimater = punkter.filter((p) => p.status === 'overstyrt_estimat');
  const advarsler = punkter.filter((p) => p.status === 'advarsel');
  const okPunkter = punkter.filter((p) => p.status === 'ok');

  return {
    allePunkter: punkter,
    kritiskeMangler,
    overstyrteEstimater,
    advarsler,
    okPunkter,
    kanGodkjenneEndelig: kritiskeMangler.length === 0,
    kanGodkjenneUtenForbehold:
      kritiskeMangler.length === 0 && overstyrteEstimater.length === 0,
    kommuneNavn,
    vaEtatNavn,
    geodataAvdelingNavn,
  };
}

/**
 * Aktiverer «⚠️ Gå videre med estimat / Overstyr manglende data» for oppgitte punkt-IDer
 * (eller alle manglende punkter på et steg / hele prosjektet).
 * Fyller inn tydelig merkede midlertidige estimater på prosjektet slik at alle kalkulatorer
 * og moduler kan kjøres videre uten at prosessen stopper opp.
 */
export function anvendOverstyringMedEstimat(
  prosjekt: ProsjektData,
  eksisterendeOverstyringer: Record<string, OverstyringInfo> = {},
  punktIder: readonly string[]
): {
  prosjekt: ProsjektData;
  overstyringer: Record<string, OverstyringInfo>;
  endringer: string[];
} {
  let oppdatert: ProsjektData = {
    ...prosjekt,
    kilde: 'bruker',
    koter: { ...prosjekt.koter, gulv: [...prosjekt.koter.gulv] },
    vanntrykk: { ...prosjekt.vanntrykk },
    overvann: { ...prosjekt.overvann, flater: [...prosjekt.overvann.flater] },
  };
  const nyOverstyringer: Record<string, OverstyringInfo> = {
    ...eksisterendeOverstyringer,
  };
  const endringer: string[] = [];
  const tidspunkt = new Date().toISOString();

  for (const id of punktIder) {
    if (id === 'bra_areal') {
      const estBra = oppdatert.bra ?? 1000;
      oppdatert.bra = estBra;
      nyOverstyringer[id] = {
        aktiv: true,
        etikett: OVERSTYRING_ETIKETT,
        estimatVerdi: `Estimat ${estBra} m² BRA`,
        tidspunkt,
      };
      endringer.push(`BRA overstyrt med midlertidig estimat (${estBra} m²)`);
    } else if (id === 'sted_matrikkel') {
      if (!oppdatert.sted.trim()) oppdatert.sted = 'Avventer eksakt gateadresse';
      if (!oppdatert.matrikkel.trim()) oppdatert.matrikkel = 'Avventer Gnr/Bnr fra kommune';
      nyOverstyringer[id] = {
        aktiv: true,
        etikett: OVERSTYRING_ETIKETT,
        estimatVerdi: `${oppdatert.sted} (${oppdatert.matrikkel})`,
        tidspunkt,
      };
      endringer.push('Adresse/Gnr/Bnr merket som «Venter på kommunen»');
    } else if (id === 'kote_itr_ibr') {
      const refTerreng = oppdatert.koter.gate ?? 13.6;
      const estItk =
        oppdatert.koter.itrKum ?? Math.round((refTerreng - 1.6) * 100) / 100;
      const estIbr =
        oppdatert.koter.ibrKum ?? Math.round((refTerreng - 1.85) * 100) / 100;
      oppdatert.koter.itrKum = estItk;
      oppdatert.koter.ibrKum = estIbr;
      nyOverstyringer[id] = {
        aktiv: true,
        etikett: OVERSTYRING_ETIKETT,
        estimatVerdi: `Estimat ITK C +${fmt(estItk)} / IBR C +${fmt(estIbr)} moh`,
        tidspunkt,
      };
      endringer.push(
        `Kumkoter (ITK/IBR) overstyrt med midlertidig estimat C +${fmt(estItk)} / +${fmt(estIbr)} moh (Venter på kommunen)`
      );
    } else if (id === 'kote_laveste_sluk') {
      const refItk = oppdatert.koter.itrKum ?? 12.0;
      const estSluk =
        oppdatert.koter.gulv[0]?.kote ?? Math.round((refItk + 1.2) * 100) / 100;
      if (oppdatert.koter.gulv.length === 0) {
        oppdatert.koter.gulv = [
          { navn: 'Laveste sluk (Midlertidig estimat)', kote: estSluk },
        ];
      }
      nyOverstyringer[id] = {
        aktiv: true,
        etikett: OVERSTYRING_ETIKETT,
        estimatVerdi: `Estimat laveste sluk C +${fmt(estSluk)} moh`,
        tidspunkt,
      };
      endringer.push(
        `Laveste sluk (OK FG) overstyrt med midlertidig estimat C +${fmt(estSluk)} moh`
      );
    } else if (id === 'stikkledning_fall') {
      const estLengde = oppdatert.koter.stikkLengde ?? 18;
      const estFall = oppdatert.koter.fallNevner ?? 60;
      oppdatert.koter.stikkLengde = estLengde;
      oppdatert.koter.fallNevner = estFall;
      nyOverstyringer[id] = {
        aktiv: true,
        etikett: OVERSTYRING_ETIKETT,
        estimatVerdi: `Estimat ${estLengde} m med fall 1:${estFall}`,
        tidspunkt,
      };
      endringer.push(
        `Stikkledning overstyrt med midlertidig estimat (${estLengde} m, fall 1:${estFall})`
      );
    } else if (id === 'overvann_paaslipp') {
      if (oppdatert.overvann.intensitet === null) oppdatert.overvann.intensitet = 250;
      if (oppdatert.overvann.maksPaaslippLs === null)
        oppdatert.overvann.maksPaaslippLs = 10;
      if (oppdatert.overvann.flater.length === 0) {
        const takAreal = Math.max(200, Math.round((oppdatert.bra ?? 1000) * 0.45));
        oppdatert.overvann.flater = [{ navn: 'Takflate (estimat)', areal: takAreal, phi: 0.9 }];
      }
      nyOverstyringer[id] = {
        aktiv: true,
        etikett: OVERSTYRING_ETIKETT,
        estimatVerdi: `Estimat I=${oppdatert.overvann.intensitet} l/(s·ha), maks ${oppdatert.overvann.maksPaaslippLs} l/s`,
        tidspunkt,
      };
      endringer.push('Overvannsdata overstyrt med midlertidig estimat');
    } else if (id === 'teknisk_rom_areal') {
      const bra = oppdatert.bra ?? 1000;
      const minTekRomKrav = Math.round(10 + 0.01 * bra);
      const estTekRom = Math.max(oppdatert.tekniskRomM2 ?? 0, minTekRomKrav);
      oppdatert.tekniskRomM2 = estTekRom;
      nyOverstyringer[id] = {
        aktiv: true,
        etikett: OVERSTYRING_ETIKETT,
        estimatVerdi: `Estimat ${estTekRom} m² (TEK17 min. ${minTekRomKrav} m²)`,
        tidspunkt,
      };
      endringer.push(`Teknisk rom overstyrt med midlertidig estimat (${estTekRom} m² iht. TEK17 § 14-4)`);
    } else if (id === 'vanntrykk_qp') {
      const estStatisk = oppdatert.vanntrykk.statiskBar ?? 4.5;
      const estDyn = oppdatert.vanntrykk.dynamiskBar ?? 3.5;
      const estUttak = oppdatert.vanntrykk.uttakLmin ?? 1200;
      oppdatert.vanntrykk = {
        statiskBar: estStatisk,
        antatt: true,
        dynamiskBar: estDyn,
        uttakLmin: estUttak,
      };
      nyOverstyringer[id] = {
        aktiv: true,
        etikett: OVERSTYRING_ETIKETT,
        estimatVerdi: `Estimat ${estStatisk} bar statisk / ${estDyn} bar ved ${estUttak} l/min`,
        tidspunkt,
      };
      endringer.push(
        `Vanntrykk overstyrt med midlertidig estimat (${estStatisk} bar / ${estDyn} bar ved ${estUttak} l/min – Venter på kommunen)`
      );
    } else if (id === 'qa_signatur') {
      nyOverstyringer[id] = {
        aktiv: true,
        etikett: OVERSTYRING_ETIKETT,
        estimatVerdi: 'Foreløpig rapport med forbehold om kommunale data',
        tidspunkt,
      };
      endringer.push('QA-signatur overstyrt for foreløpig utgivelse med forbehold');
    }
  }

  return { prosjekt: oppdatert, overstyringer: nyOverstyringer, endringer };
}

export interface FiltrertPunktInfo {
  punktId: string;
  tittel: string;
  begrunnelse: string;
  overfortTil: string;
}

export interface EpostUtkast {
  id:
    | 'kommune'
    | 'prosjektgruppe'
    | 'byggherre'
    | 'va_etat'
    | 'geodata'
    | 'arkitekt_internt';
  kortTittel: string;
  tittel: string;
  mottaker: string;
  kopi?: string;
  emne: string;
  epostTekst: string;
  erOffentlig: boolean;
  punkterInkludert: string[];
}

export interface MottakerKontrollData {
  filtrertBortFraOffentlig: FiltrertPunktInfo[];
  harInterneFiltreringer: boolean;
  utkast: {
    kommune: EpostUtkast;
    prosjektgruppe: EpostUtkast;
    byggherre: EpostUtkast;
    vaEtat: EpostUtkast;
    geodata: EpostUtkast;
    arkitektInternt: EpostUtkast;
  };
  alleUtkast: EpostUtkast[];
}

export interface KommuneForesporselResultat {
  mottaker: string;
  emne: string;
  epostTekst: string;
  telefonSjekkliste: string;
  mottakerKontroll: MottakerKontrollData;
}

export const INTERNE_NØKKELORD_MØNSTRE: RegExp[] = [
  /TEK17\s*§?\s*14-4/i,
  /varmesentral/i,
  /teknisk(?:e)?\s*rom/i,
  /budsjett(?:kutt|ramme|post)?/i,
  /kostnad(?:skutt|sramme|soverslag)?/i,
  /prisreduksjon/i,
  /internt?\s+notat/i,
  /innvendig(?:e)?\s+sluk/i,
  /OK\s*FG/i,
  /overkant\s+ferdig\s+gulv/i,
  /arkitekt(?:krav|avklaring)?/i,
  /romskjema/i,
  /etasjefordeling/i,
  /timebudsjett/i,
];

export function inneholderInterneDetaljer(tekst: string): boolean {
  return INTERNE_NØKKELORD_MØNSTRE.some((m) => m.test(tekst));
}

/**
 * Genererer komplett, intelligent mottaker-kontrollert e-post og telefonmanus.
 * Utfører automatisk skanning for interne detaljer (varmesentral TEK17 § 14-4,
 * budsjettkutt, arkitektavklaringer) og filtrerer disse bort fra brevene som går
 * til offentlige etater. Splitter forespørslene i tre skreddersydde utkast:
 * 1. Kommunens VA-etat (koter ITK/IBR, trykk, overvann, stikkledning)
 * 2. Geodata / Oppmåling (kartgrunnlag 1:500, matrikkel, Gnr/Bnr)
 * 3. Arkitekt & Prosjektering (internt notat: arealer, varmesentral, slukkoter, sjakter)
 */
export function lagKommuneForesporselEpost(
  prosjekt: ProsjektData,
  rapport: GatekeeperRapport,
  kunSteg?: number,
  analyse?: ProsjektAnalyse
): KommuneForesporselResultat {
  const aktuellePunkter = rapport.allePunkter.filter(
    (p) =>
      (kunSteg === undefined || p.steg === kunSteg) &&
      (p.status === 'kritisk_mangel' ||
        p.status === 'overstyrt_estimat' ||
        p.status === 'advarsel')
  );

  const punkterForMal =
    aktuellePunkter.length > 0 ? aktuellePunkter : rapport.allePunkter;

  const adresseDel = prosjekt.sted.trim() || prosjektnavnFallback(prosjekt);
  const matrikkelDel = prosjekt.matrikkel.trim()
    ? ` (${prosjekt.matrikkel.trim()})`
    : '';

  const terrengLinje =
    prosjekt.koter.gate !== null
      ? `\n• Terrengkote på tomta (fra Kartverket NN2000): C +${fmt(prosjekt.koter.gate)} moh`
      : '';

  // --------------------------------------------------------------------------
  // 1. INTELLIGENT MOTTAKER-KONTROLL (FILTRERING AV INTERNE DETALJER)
  // --------------------------------------------------------------------------
  const filtrertBortFraOffentlig: FiltrertPunktInfo[] = [];

  for (const p of punkterForMal) {
    const erInternt =
      p.veileder.erInterntPunkt === true ||
      p.veileder.mottakerKategori === 'arkitekt_internt' ||
      inneholderInterneDetaljer(p.veileder.epostKulepunkt) ||
      inneholderInterneDetaljer(p.tittel);

    if (erInternt) {
      filtrertBortFraOffentlig.push({
        punktId: p.id,
        tittel: p.tittel,
        begrunnelse:
          p.veileder.skjermingsBegrunnelse ||
          'Inneholder interne prosjekteringsdetaljer (arkitektkrav/budsjett) som er skjermet fra offentlige etater.',
        overfortTil: 'Utkast 3 (Arkitekt / Internt notat)',
      });
    }
  }

  // --------------------------------------------------------------------------
  // FANE 1: TIL KOMMUNEN (VA & GEODATA) – KUN OFFENTLIGE DATA
  // --------------------------------------------------------------------------
  const kommuneKulepunkterRaw = punkterForMal
    .filter(
      (p) =>
        p.veileder.mottakerKategori === 'va_etat' &&
        !p.veileder.erInterntPunkt &&
        !inneholderInterneDetaljer(p.veileder.epostKulepunkt)
    )
    .map((p) => p.veileder.epostKulepunkt);

  const kommuneKulepunkter = [...new Set(kommuneKulepunkterRaw)];

  if (kommuneKulepunkter.length === 0) {
    kommuneKulepunkter.push(
      'Situasjonsplan i M 1:500 og kommunalt VA-ledningskart (NN2000) med kotehøyder for ITK/ITR (innvendig topp kum/rør), IBR (innvendig bunn rør) og gatelokk i tilknytningskum for kontroll av 950 mm tilbakeslagskrav iht. TEK17 § 15-7.',
      'Oppgitt kommunalt frihøyde-trykk (statisk trykk i bar) i tilknytningspunktet og Q/p-kapasitet (dynamisk resttrykk ved uttak til sprinkler/slokkevann).',
      'Krav til overvannshåndtering (LOD): maksimalt tillatt påslipp (l/s) til kommunalt overvannsnett og gjeldende IVF-regnintensitet inkl. klimafaktor.',
      'Påslippskrav og tilknytningsvilkår for eventuell fettutskiller, sandfang/oljeutskiller, prosessavløp og tilbakeslagssikring.',
      'Bekreftelse av offisielt Gnr/Bnr og eventuelle tinglyste ledningsretter/servitutter over tomta.'
    );
  }

  const kommuneEmne = `Forespørsel om VA-grunnlagsdata, ledningskart (ITK/IBR/ITR) og vanntrykk – ${adresseDel}${matrikkelDel}`;
  const kommuneEpostTekst = [
    `Til: ${rapport.vaEtatNavn} / ${rapport.geodataAvdelingNavn}`,
    `Kopi: Ansvarlig søker / Prosjektleder`,
    `Emne: ${kommuneEmne}`,
    ``,
    `Hei,`,
    ``,
    `I forbindelse med VVS- og VA-prosjektering for «${prosjekt.navn}» ber vi om oversendelse av tekniske grunnlagsdata, trykkforhold og ledningskart for eiendommen:`,
    ``,
    `• Prosjekt / tiltak: ${prosjekt.navn} (${prosjekt.bygningstype})`,
    `• Adresse: ${prosjekt.sted || 'Se prosjektets plassering'}`,
    `• Matrikkel (Gnr/Bnr): ${prosjekt.matrikkel || 'Ikke oppgitt ennå'}`,
    `• Oppvarmet areal (BRA): ${prosjekt.bra ? `${prosjekt.bra} m²` : 'Under avklaring'}${terrengLinje}`,
    ``,
    `Vi ber spesifikt om følgende VA-opplysninger og ledningsdata (i høydesystem NN2000):`,
    ...kommuneKulepunkter.map((k, idx) => `${idx + 1}. ${k}`),
    ``,
    `Dersom det foreligger spesielle tilknytningsvilkår i lokal VA-norm (f.eks. krav til tilbakeslagssikring, olje-/fettutskiller, fordrøyning eller anboringsmetode), ber vi om at dette opplyses.`,
    ``,
    `På forhånd takk for rask tilbakemelding!`,
    ``,
    `Med vennlig hilsen`,
    `Kim Jørgensen`,
    `Rørleggermester & Rådgivende Ingeniør VVS (RIV)`,
  ].join('\n');

  const utkastKommune: EpostUtkast = {
    id: 'kommune',
    kortTittel: 'Til Kommunen (VA & Geodata)',
    tittel: `🏛️ Fane 1: Til Kommunen (VA & Geodata)`,
    mottaker: `${rapport.vaEtatNavn} / ${rapport.geodataAvdelingNavn}`,
    kopi: 'Ansvarlig søker / Prosjektleder',
    emne: kommuneEmne,
    epostTekst: kommuneEpostTekst,
    erOffentlig: true,
    punkterInkludert: kommuneKulepunkter,
  };

  // --------------------------------------------------------------------------
  // FANE 2: TIL PROSJEKTGRUPPE (ARK / RIBr / RIAku) – INTERNT NOTAT
  // --------------------------------------------------------------------------
  const estTekRom =
    prosjekt.tekniskRomM2 ??
    (analyse?.varmesentral.kravM2
      ? Math.round(analyse.varmesentral.kravM2)
      : Math.round(10 + 0.01 * (prosjekt.bra ?? 1000)));

  const prosjektgruppeKulepunkter = [
    `Areal varmesentral iht. TEK17 § 14-4: Minstekrav 10 m² + 1 % av oppvarmet BRA over 1 000 m² (beregnet til minst ${estTekRom} m² for dette prosjektet). Fri takhøyde min. 2,8–3,2 m, tilstrekkelig sluk i gulv og transportåpning (dørbredde min. 1,0–1,2 m) for beredere og vekslere.`,
    'Vertikale sjakter og føringsveier: Eget sjaktareal for separate ventilasjonsaggregater (kjøkken/storkjøkken, vaskehall, helse og kontor iht. TEK17 kap. 13), samt overvannsstammer og varmerør.',
    'Akustikk og vibrasjonsdemping (BREEAM-NOR Hea 05 / NS 8175): Lydkrav mot oppholds- og arbeidsrom fra vifter og sirkulasjonspumper (maks 30 dBA), avstemmes med RIAku.',
    'Målsatte snitthøyder og kote for Overkant Ferdig Gulv (OK FG) / laveste sluk i høydesystem NN2000 (avgjør selvfall mot kommunal kum vs. krav om pumpekum iht. NS-EN 12050 for å unngå tilbakeslag).',
    'Vernetekniske føringer og hensyn til Byantikvar / verneverdige bygningsdeler: Plassering av utvendige inntaks- og avkastrister samt synlige rørføringer i fasade/tak.',
  ];

  const prosjektgruppeEmne = `Tverrfaglig koordinering VVS: Varmesentral (TEK17 § 14-4), sjakter, akustikk og snitthøyder – ${adresseDel}`;
  const prosjektgruppeEpostTekst = [
    `Til: Arkitekt (ARK) / RIBr / RIAku / Prosjekteringsgruppe`,
    `Kopi: Prosjektleder VVS & Bygg`,
    `Emne: ${prosjektgruppeEmne}`,
    ``,
    `Hei team,`,
    ``,
    `I forbindelse med VVS-prosjekteringen for «${prosjekt.navn}» ber vi om avklaring av følgende kritiske tverrfaglige grensesnitt:`,
    ``,
    `• Prosjekt: ${prosjekt.navn} (${prosjekt.bygningstype})`,
    `• Oppvarmet bruksareal (BRA): ${prosjekt.bra ? `${prosjekt.bra} m²` : 'Venter på endelig arealoppsett'}`,
    `• Adresse: ${prosjekt.sted || 'Ikke registrert'}`,
    ``,
    `Vi ber om snarlig tverrfaglig avklaring på følgende punkter:`,
    ...prosjektgruppeKulepunkter.map((k, idx) => `${idx + 1}. ${k}`),
    ``,
    `Vennligst oversend oppdaterte snittegninger og BIM/DAK-underlag (IFC / DWG / PDF).`,
    ``,
    `Med vennlig hilsen`,
    `Kim Jørgensen`,
    `Rørleggermester & Rådgivende Ingeniør VVS (RIV)`,
  ].join('\n');

  const utkastProsjektgruppe: EpostUtkast = {
    id: 'prosjektgruppe',
    kortTittel: 'Til Prosjektgruppe (ARK / RIBr / RIAku)',
    tittel: `📐 Fane 2: Til Prosjektgruppe (ARK / RIBr / RIAku)`,
    mottaker: 'Arkitekt (ARK) / RIBr / RIAku / Prosjekteringsgruppe',
    kopi: 'Prosjektleder VVS & Bygg',
    emne: prosjektgruppeEmne,
    epostTekst: prosjektgruppeEpostTekst,
    erOffentlig: false,
    punkterInkludert: prosjektgruppeKulepunkter,
  };

  // --------------------------------------------------------------------------
  // FANE 3: TIL BYGGHERRE (ØKONOMI & RISIKO) – BESLUTNINGSGRUNNLAG
  // --------------------------------------------------------------------------
  const byggherreKulepunkter = [
    'Avløpspumpestasjon (NS-EN 12050): Lovpålagt tiltak ved kjellergulv/sluk med margin under 0,95 m over kommunal ITR (TEK17 § 15-6/§ 15-8). Beskytter mot tilbakeslag, oversvømmelse og erstatningsansvar med svanehals over gatenivå.',
    'BA-tilbakeslagsventil iht. NS-EN 1717 (væskekategori 4): Påkrevd sikring av drikkevann ved verksted, kjemikalier eller prosessanlegg for å hindre forurensning av offentlig nett.',
    'Trykkøkningsanlegg (WWBooster): Behov for investering i trykkøkning for å sikre nødvendig resttrykk til øverste etasjer og dimensjonerende slokkevann/sprinkler dersom kommunalt trykk er utilstrekkelig.',
    'CO2-sikkerhet og gassvarsling: Sikkerhetsopplegg iht. Arbeidstilsynets forskrifter for kuldeanlegg med naturlige kuldemedier (R744 / R290).',
    'Vannbehandling og korrosjonssikring iht. VDI 2035 / Kompa: Krav til fyllingsvann, slamutskiller (syklon/magnetitt) og avgassing for å opprettholde garantier på kjel, varmepumpe og vekslere.',
  ];

  const byggherreEmne = `Beslutningsunderlag VVS: Lovpålagte tekniske tiltak, investeringsbehov og risikostyring – ${adresseDel}`;
  const byggherreEpostTekst = [
    `Til: Byggherre / Prosjekteier / Styringsgruppe`,
    `Kopi: Prosjektleder & Rådgivende Ingeniør VVS (RIV)`,
    `Emne: ${byggherreEmne}`,
    ``,
    `Hei,`,
    ``,
    `I forbindelse med VVS-prosjekteringen for «${prosjekt.navn}» oversendes herved beslutningsunderlag for lovpålagte tekniske tiltak, investeringsbehov og risikostyring:`,
    ``,
    `• Prosjekt: ${prosjekt.navn} (${prosjekt.bygningstype})`,
    `• Byggherre: ${prosjekt.byggherre || 'Byggherre'}`,
    `• Adresse: ${prosjekt.sted || 'Ikke registrert'}`,
    ``,
    `Følgende tiltak krever prinsippavklaring og forankring i prosjektbudsjettet:`,
    ...byggherreKulepunkter.map((k, idx) => `${idx + 1}. ${k}`),
    ``,
    `Tiltakene er nødvendige for å oppfylle offentlige forskriftskrav (TEK17 / NS-EN standarder) samt sikre bygget mot store driftstap og garantibortfall.`,
    ``,
    `Med vennlig hilsen`,
    `Kim Jørgensen`,
    `Rørleggermester & Rådgivende Ingeniør VVS (RIV)`,
  ].join('\n');

  const utkastByggherre: EpostUtkast = {
    id: 'byggherre',
    kortTittel: 'Til Byggherre (Økonomi & Risiko)',
    tittel: `💼 Fane 3: Til Byggherre (Økonomi & Risiko)`,
    mottaker: 'Byggherre / Prosjekteier / Styringsgruppe',
    kopi: 'Prosjektleder & RIV',
    emne: byggherreEmne,
    epostTekst: byggherreEpostTekst,
    erOffentlig: false,
    punkterInkludert: byggherreKulepunkter,
  };

  const telefonSjekkliste = [
    `📞 TELEFON-MANUS MOT ${rapport.kommuneNavn.toUpperCase()} (Sentralbord -> be om «VA-forvaltning / saksbehandler tilknytning» eller «Geodata»):`,
    `1. Oppgi adresse «${prosjekt.sted || prosjekt.navn}» og ${prosjekt.matrikkel || 'spør etter Gnr/Bnr'}.`,
    `2. Spør etter tilknytningskum for spillvann og overvann: «Hva er kote gatelokk, kote ITK/ITR (innvendig topp rør) og kote IBR (innvendig bunn rør) i NN2000?»`,
    `3. Spør etter vanntrykk: «Hva er kommunalt frihøyde-trykk (statisk trykk i bar) i avtakket, og har dere Q/p-måling (resttrykk ved slokkevannsuttak)?»`,
    `4. Spør etter overvann: «Hva er maks tillatt påslipp (l/s) til kommunalt overvannsnett på denne ledningen?»`,
  ].join('\n');

  return {
    mottaker: `${rapport.vaEtatNavn} / ${rapport.geodataAvdelingNavn}`,
    emne: kommuneEmne,
    epostTekst: kommuneEpostTekst,
    telefonSjekkliste,
    mottakerKontroll: {
      filtrertBortFraOffentlig,
      harInterneFiltreringer: filtrertBortFraOffentlig.length > 0,
      utkast: {
        kommune: utkastKommune,
        prosjektgruppe: utkastProsjektgruppe,
        byggherre: utkastByggherre,
        vaEtat: utkastKommune,
        geodata: utkastKommune,
        arkitektInternt: utkastProsjektgruppe,
      },
      alleUtkast: [utkastKommune, utkastProsjektgruppe, utkastByggherre],
    },
  };
}

function prosjektnavnFallback(p: ProsjektData): string {
  return p.navn || 'Nytt byggeprosjekt';
}
