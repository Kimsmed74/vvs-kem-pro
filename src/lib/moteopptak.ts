import type { ProsjektData } from '../data/prosjekter';
import {
  analyserTekstLokalt,
  beskrivUttrekkEndringer,
  flettUttrekkInnIProsjekt,
  flettUttrekkResultater,
  lagKortFunnTekst,
  type ProsjektFil,
  type UttrekkResultat,
} from './filer';
import { fmt } from './format';

export interface MoteAnalyseSteg {
  stegNr: 1 | 2 | 3 | 4 | 5;
  prosent: number;
  tittel: string;
  detalj: string;
  status: 'venter' | 'aktiv' | 'ferdig' | 'feil';
}

export interface BerortAgentFunn {
  agentId: string;
  agentNummer: string;
  agentNavn: string;
  relevans: string;
}

export interface MoteAnalyseResultat {
  uttrekk: UttrekkResultat;
  oppdatertProsjekt: ProsjektData;
  endringer: string[];
  kortFunnTekst: string;
  berorteAgenter: BerortAgentFunn[];
  referatFil: ProsjektFil;
  transkripsjon: string;
  varighetSekunder: number;
}

export const STANDARD_MOTE_STEG: MoteAnalyseSteg[] = [
  {
    stegNr: 1,
    prosent: 20,
    tittel: '1. Klargjør lydopptak og transkripsjon',
    detalj: 'Sammenstiller kontinuerlige talegjenkjenningssegmenter og tidsstempler...',
    status: 'venter',
  },
  {
    stegNr: 2,
    prosent: 45,
    tittel: '2. AI- og VVS-faglig tekstanalyse',
    detalj: 'Trekker ut adresse, Gnr/Bnr, BRA, koter (ITK/IBR/sluk) og vanntrykk...',
    status: 'venter',
  },
  {
    stegNr: 3,
    prosent: 70,
    tittel: '3. Oppslag mot Kartverkets åpne API',
    detalj: 'Verifiserer gateadresse, Gnr/Bnr, kommune og terrengkote (NN2000)...',
    status: 'venter',
  },
  {
    stegNr: 4,
    prosent: 90,
    tittel: '4. Synkroniserer Global Prosjekt-State (19 agenter & 9 moduler)',
    detalj: 'Oppdaterer skjemafelt, trykk/kote-kontroll (> 6,0 bar) og fagmoduler...',
    status: 'venter',
  },
  {
    stegNr: 5,
    prosent: 100,
    tittel: '5. Lagrer møtereferat og opptak i Prosjektgalleriet (IndexedDB)',
    detalj: 'Arkiverer strukturert møtereferat (.md) og oppdaterer agent-kontekst.',
    status: 'venter',
  },
];

/**
 * Identifiserer hvilke av de 19 agentene som får nyttig faglig underlag
 * fra møtetranskripsjonen og det uttrukne datasettet.
 */
export function finnBerorteAgenterFraTranskripsjon(
  tekst: string,
  uttrekk: UttrekkResultat
): BerortAgentFunn[] {
  const lav = tekst.toLowerCase();
  const funn: BerortAgentFunn[] = [];

  // Agent 01 får alltid oppdatert prosjektkontekst
  funn.push({
    agentId: 'agent-01',
    agentNummer: '01',
    agentNavn: 'Orkestrator (Master-Koordinator)',
    relevans:
      uttrekk.navn || uttrekk.sted || uttrekk.bra
        ? `Prosjektdata synkronisert (${[
            uttrekk.navn,
            uttrekk.sted,
            uttrekk.bra ? `${uttrekk.bra} m²` : null,
          ]
            .filter(Boolean)
            .join(', ')})`
        : 'Oppdatert med møtereferat og prosjektstatus',
  });

  if (
    uttrekk.koter?.itrKum !== undefined ||
    uttrekk.koter?.ibrKum !== undefined ||
    uttrekk.koter?.stikkLengde !== undefined ||
    /itk|itr|ibr|kum|stikkledning|overvann|selvfall|tilbakeslag|pumpestasjon/i.test(lav)
  ) {
    funn.push({
      agentId: 'agent-19',
      agentNummer: '19',
      agentNavn: 'Utvendig VA, Koter & Overvann',
      relevans: 'Koter (ITK/IBR/sluk), tilbakeslagssikring (Lov 2) og utvendig VA-grøft oppdatert',
    });
  }

  if (
    uttrekk.vanntrykk?.statiskBar !== undefined ||
    uttrekk.vanntrykk?.dynamiskBar !== undefined ||
    uttrekk.koter?.gulv?.length ||
    /vanntrykk|trykkreduksjon|bar|tappested|dusj|bereder|sanitær|sluk/i.test(lav)
  ) {
    funn.push({
      agentId: 'agent-03',
      agentNummer: '03',
      agentNavn: 'Innvendig Sanitær & Trykkbudsjett',
      relevans:
        uttrekk.vanntrykk?.statiskBar && uttrekk.vanntrykk.statiskBar > 6.0
          ? `🚨 Statisk trykk ${fmt(uttrekk.vanntrykk.statiskBar, 1)} bar > 6,0 bar: Krav om trykkreduksjonsventil registrert`
          : 'Vanntrykk vs. koter og sanitærdata synkronisert til Modul 1',
    });
  }

  if (
    uttrekk.tekniskRomM2 !== undefined ||
    uttrekk.bra !== undefined ||
    /varme|gulvvarme|varmepumpe|fjernvarme|ekspansjonskar|pneumatex|varmesentral|radiator/i.test(lav)
  ) {
    funn.push({
      agentId: 'agent-04',
      agentNummer: '04',
      agentNavn: 'Varme, Kjøling & Hydronikk',
      relevans: 'Energibehov, varmesentral (TEK17 § 14-4) og ekspansjonskar oppdatert i Modul 2',
    });
  }

  if (/sprinkler|brann|branntrommel|fg-930|oh1|oh2|oh3|noha/i.test(lav)) {
    funn.push({
      agentId: 'agent-05',
      agentNummer: '05',
      agentNavn: 'Sprinkler & Brannsikkerhet',
      relevans: 'Brannvannskapasitet og sprinklerforutsetninger synkronisert til Modul 6',
    });
  }

  if (/ventilasjon|luftmengde|sfp|aggregat|avtrekk|tilluft|co2|vav|cav|lyd/i.test(lav)) {
    funn.push({
      agentId: 'agent-06',
      agentNummer: '06',
      agentNavn: 'Ventilasjon & Inneklima',
      relevans: 'Luftmengder (TEK17 kap. 13), SFP og lydkrav synkronisert til Modul 3',
    });
  }

  if (/breeam|lcc|energi|solcelle|gråvann|miljø|levetid/i.test(lav)) {
    funn.push({
      agentId: 'agent-12',
      agentNummer: '12',
      agentNavn: 'BREEAM-NOR & Taksonomi',
      relevans: 'Miljø- og LCC-forutsetninger synkronisert til Modul 8',
    });
  }

  // Agent 16 QA-port er alltid koblet på som sluttport
  funn.push({
    agentId: 'agent-16',
    agentNummer: '16',
    agentNavn: 'QA-Port (Djevelens Advokat)',
    relevans: 'Alle uttrukne verdier og eventuelle mangler kontrollert mot Lov 1, 2 og 3',
  });

  return funn;
}

/**
 * Formaterer varighet i sekunder til HH:MM:SS.
 */
export function formaterOpptaksTid(sekunder: number): string {
  const s = Math.max(0, Math.floor(sekunder));
  const timer = Math.floor(s / 3600);
  const min = Math.floor((s % 3600) / 60);
  const sek = s % 60;
  return [timer, min, sek].map((v) => String(v).padStart(2, '0')).join(':');
}

/**
 * Genererer et strukturert møte- og befaringsreferat i Markdown (.md)
 * som lagres direkte i prosjektets dokumentarkiv (IndexedDB).
 */
export function lagMoteReferatMarkdown(
  prosjektNavn: string,
  transkripsjon: string,
  uttrekk: UttrekkResultat,
  endringer: string[],
  berorteAgenter: BerortAgentFunn[],
  varighetSekunder: number,
  tittel = 'Møte- og befaringsopptak'
): string {
  const dato = new Date().toLocaleString('no-NO');
  const linjer: string[] = [
    `# 🎙️ ${tittel} – ${prosjektNavn}`,
    `- **Dato:** ${dato}`,
    `- **Opptaksvarighet:** ${formaterOpptaksTid(varighetSekunder)} (kontinuerlig opptak)`,
    '',
    '## 1. Automatisk uttrukne prosjektdata (Global Prosjekt-State)',
  ];

  if (endringer.length > 0) {
    endringer.forEach((e) => linjer.push(`- ✅ ${e}`));
  } else {
    linjer.push('- *(Ingen nye numeriske skjemafelt endret – se full transkripsjon under)*');
  }

  linjer.push(
    '',
    '### Gjenkjente nøkkelverdier:',
    `- **Prosjektnavn:** ${uttrekk.navn ?? prosjektNavn}`,
    `- **Adresse / Sted:** ${uttrekk.sted ?? 'Ikke oppgitt i opptak'}`,
    `- **Matrikkel (Gnr/Bnr):** ${uttrekk.matrikkel ?? 'Ikke oppgitt i opptak'}`,
    `- **Areal (BRA):** ${uttrekk.bra !== undefined ? `${fmt(uttrekk.bra, 0)} m²` : 'Ikke oppgitt i opptak'}`,
    `- **Bygningstype:** ${uttrekk.bygningstype ?? 'Ikke oppgitt i opptak'}`,
    `- **Kote ITK/ITR i kum:** ${uttrekk.koter?.itrKum !== undefined ? `C +${fmt(uttrekk.koter.itrKum, 2)}` : 'Ikke oppgitt'}`,
    `- **Kote IBR i kum:** ${uttrekk.koter?.ibrKum !== undefined ? `C +${fmt(uttrekk.koter.ibrKum, 2)}` : 'Ikke oppgitt'}`,
    `- **Terrengkote:** ${uttrekk.koter?.gate !== undefined ? `C +${fmt(uttrekk.koter.gate, 2)}` : 'Ikke oppgitt'}`,
    `- **Laveste sluk/gulv:** ${
      uttrekk.koter?.gulv && uttrekk.koter.gulv.length > 0
        ? `${uttrekk.koter.gulv[0].navn}: C +${fmt(uttrekk.koter.gulv[0].kote, 2)}`
        : 'Ikke oppgitt'
    }`,
    `- **Statisk / dynamisk vanntrykk:** ${
      uttrekk.vanntrykk?.statiskBar !== undefined
        ? `${fmt(uttrekk.vanntrykk.statiskBar, 1)} bar statisk${
            uttrekk.vanntrykk.statiskBar > 6.0 ? ' (🚨 > 6,0 bar: Krever trykkreduksjonsventil!)' : ''
          }`
        : 'Ikke oppgitt'
    }${
      uttrekk.vanntrykk?.dynamiskBar !== undefined
        ? ` / ${fmt(uttrekk.vanntrykk.dynamiskBar, 1)} bar dynamisk`
        : ''
    }`,
    '',
    '## 2. Oppdaterte Agenter og Fagmoduler',
    ...berorteAgenter.map(
      (a) => `- **Agent ${a.agentNummer} – ${a.agentNavn}:** ${a.relevans}`
    ),
    '',
    '## 3. Fullstendig Transkripsjon / Befaringsnotat',
    '```text',
    transkripsjon.trim() || '(Tom transkripsjon)',
    '```',
    ''
  );

  return linjer.join('\n');
}

/**
 * Kjører lokal synkron analyse av en møtetranskripsjon og returnerer oppdatert prosjekt,
 * uttrukne verdier, berørte agenter og arkivfil (.md) klar for IndexedDB.
 */
export function analyserMoteTranskripsjonLokalt(
  prosjekt: ProsjektData,
  transkripsjon: string,
  varighetSekunder: number,
  ekstraUttrekk?: UttrekkResultat
): MoteAnalyseResultat {
  const fraFiler = analyserTekstLokalt(transkripsjon, 'moteopptak.md');
  const kombinertUttrekk = flettUttrekkResultater(fraFiler, ekstraUttrekk ?? {});

  const oppdatertProsjekt = flettUttrekkInnIProsjekt(prosjekt, kombinertUttrekk);
  const kortFunnTekst = lagKortFunnTekst(kombinertUttrekk);
  const berorteAgenter = finnBerorteAgenterFraTranskripsjon(transkripsjon, kombinertUttrekk);

  const beskrevet = beskrivUttrekkEndringer(kombinertUttrekk);
  const endringer =
    beskrevet.length > 0
      ? beskrevet
      : kortFunnTekst
      ? [kortFunnTekst]
      : [];

  const datoKort = new Date().toISOString().slice(0, 10);
  const filNavn = `Motereferat-${(oppdatertProsjekt.navn || 'Prosjekt').replace(/[^a-zA-Z0-9æøåÆØÅ_-]+/g, '_')}-${datoKort}.md`;
  const referatMd = lagMoteReferatMarkdown(
    oppdatertProsjekt.navn,
    transkripsjon,
    kombinertUttrekk,
    endringer,
    berorteAgenter,
    varighetSekunder
  );

  const referatFil: ProsjektFil = {
    id: `mote-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    prosjektId: prosjekt.id,
    navn: filNavn,
    mimeType: 'text/markdown',
    storrelse: referatMd.length,
    kategori: 'rapport_pdf',
    opprettetDato: new Date().toISOString(),
    base64Data: '',
    dataUrl: '',
    uttrukketTekst: referatMd,
    aiOppsummering:
      kortFunnTekst ||
      `Møte- og befaringsreferat (${formaterOpptaksTid(varighetSekunder)}). Synkronisert med ${berorteAgenter.length} agenter.`,
    tekniskeFunn: endringer,
  };

  return {
    uttrekk: kombinertUttrekk,
    oppdatertProsjekt,
    endringer,
    kortFunnTekst,
    berorteAgenter,
    referatFil,
    transkripsjon,
    varighetSekunder,
  };
}

/**
 * Realistisk eksempel på transkripsjon fra prosjekteringsmøte / befaring
 * slik at brukeren kan teste hele opptaks-, framdrifts- og auto-utfyllingskjeden med ett klikk.
 */
export const EKSEMPEL_BEFARINGS_TRANSKRIPSJON = `Prosjekteringsmøte og befaring på byggeplass.
Prosjekt: Friheim 49 Teknologisenter
Adresse: Friheim 49, 4005 Stavanger
Gnr. 58 / Bnr. 112 i Stavanger kommune.
Bygget er et kombinert kontor- og næringsbygg med totalt areal BRA 2 450 m² fordelt på 4 etasjer og 28 ansatte/dusjer.
Fra VA-kart og innmåling i kum:
- Kote ITK i kommunal kum er +14,20 og kote IBR er +13,85.
- Terrengkote ved bygg er +15,80.
- Laveste sluk i kjeller U1 ligger på kote +14,60, mens 1. etasje ligger på kote +16,10.
- Stikkledning lengde er 26 meter med fall 1:60 (16,7 promille).
- Målt statisk vanntrykk ved tilkoblingspunkt er 6,4 bar, og dynamisk vanntrykk er 5,1 bar ved 900 l/min. Merk at 6,4 bar overstiger 6,0 bar, så det må monteres trykkreduksjonsventil!
- Varmesentral i kjeller har avsatt 38 m² areal. Bygget skal ha balansert ventilasjon med SFP under 1,5 og sprinkleranlegg fareklasse OH1.`;
