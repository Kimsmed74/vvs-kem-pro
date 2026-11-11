import type { AgentDefinisjon } from '../agents/types';
import type { SUPER_KOMMANDOER } from '../agents/agentData';
import type { ProsjektData } from '../data/prosjekter';
import { BEREDER_ANTAGELSER, type ProsjektAnalyse } from './analyse';
import type { ProsjektFil } from './filer';
import { FIL_KATEGORI_ETIKETTER } from './filer';
import { fmt } from './format';

export type Kommando = (typeof SUPER_KOMMANDOER)[number];

const IKKE_OPPGITT = 'IKKE OPPGITT';

export function kote(n: number | null): string {
  if (n === null) return IKKE_OPPGITT;
  return `C ${n >= 0 ? '+' : '−'}${fmt(Math.abs(n))}`;
}

const tekst = (s: string): string => (s.trim() === '' ? IKKE_OPPGITT : s);

/** Prosjektdata og tall fra appens beregninger, som ren tekst til prompt og rapporter. */
export function prosjektKontekst(p: ProsjektData, a: ProsjektAnalyse): string {
  const k = p.koter;
  const L: string[] = [];
  L.push(`PROSJEKT: ${p.navn} (${p.bygningstype})`);
  L.push(`Sted: ${tekst(p.sted)} | Matrikkel: ${tekst(p.matrikkel)} | VA-myndighet: ${tekst(p.vaMyndighet)}`);
  L.push(`Byggherre: ${tekst(p.byggherre)} | Miljøambisjon: ${tekst(p.miljoambisjon)}`);
  L.push(`Oppvarmet BRA: ${p.bra === null ? IKKE_OPPGITT : `${fmt(p.bra, 0)} m²`} | Etasjer: ${tekst(p.etasjer)}`);
  L.push('');
  L.push('KOTER (NN2000):');
  L.push(`- Terreng / gatelokk: ${kote(k.gate)}`);
  L.push(`- Kommunal kum: IBR = ${kote(k.ibrKum)}, ITR = ${kote(k.itrKum)}`);
  L.push(`- Kommunal vannledning: ${kote(k.vannledning)}`);
  L.push(
    `- Stikkledning: lengde ${k.stikkLengde === null ? IKKE_OPPGITT : `${fmt(k.stikkLengde, 1)} m`}, fall ${k.fallNevner === null ? IKKE_OPPGITT : `1:${k.fallNevner}`}`,
  );
  if (k.gulv.length === 0) L.push(`- Laveste sluk / gulv (OK FG): ${IKKE_OPPGITT}`);
  for (const g of k.gulv) L.push(`- ${g.navn} (OK FG): ${kote(g.kote)}`);
  L.push('');
  const v = p.vanntrykk;
  L.push('VANNTRYKK:');
  L.push(
    `- Statisk: ${v.statiskBar === null ? IKKE_OPPGITT : `${fmt(v.statiskBar, 1)} bar${v.antatt ? ' (ANTATT, ikke målt)' : ''}`}`,
  );
  L.push(
    `- Dynamisk (Q/p): ${v.dynamiskBar === null ? IKKE_OPPGITT : `${fmt(v.dynamiskBar, 1)} bar ved ${v.uttakLmin === null ? '?' : fmt(v.uttakLmin, 0)} l/min`}`,
  );
  L.push('');
  L.push(`BEREGNET AV APPEN (krav til overhøyde mot tilbakeslag: ${fmt(a.krav)} m):`);
  if (a.gulvKontroller.length === 0) {
    L.push('- Tilbakeslagskontroll (Lov 2): KAN IKKE UTFØRES – ITR og/eller gulvkote mangler.');
  } else {
    for (const g of a.gulvKontroller) {
      L.push(`- ${g.navn}: margin mot ITR ${g.margin >= 0 ? '+' : ''}${fmt(g.margin)} m → ${g.ok ? 'OK (selvfall)' : `BRUDD, mangler ${fmt(g.mangel)} m – krever pumpestasjon/tilbakeslagssikring`}`);
    }
  }
  if (a.minKoteUtgang !== null && a.hoydeIGroft !== null) {
    L.push(`- Høydetap i grøft ${fmt(a.hoydeIGroft)} m → minste kote bunnledning ved grunnmur ${kote(a.minKoteUtgang)}`);
  }
  if (a.overvann) {
    L.push(
      `- Overvann: A_red = ${fmt(a.overvann.aRed, 0)} m², q = ${fmt(a.overvann.q, 1)} l/s${a.overvann.tilbakehold !== null ? `, må holdes tilbake ${fmt(a.overvann.tilbakehold, 1)} l/s (påslippskrav ${fmt(p.overvann.maksPaaslippLs, 0)} l/s)` : ''}`,
    );
  }
  if (a.bereder) {
    L.push(
      `- Varmtvann til dusjer: ${fmt(a.bereder.blandetLiter, 0)} l blandet vann (${BEREDER_ANTAGELSER.blandetTemp} °C) ≈ ${fmt(a.bereder.varmLiter, 0)} l ved ${BEREDER_ANTAGELSER.berederTemp} °C (kaldtvann ${BEREDER_ANTAGELSER.kaldtTemp} °C; kun dusjene, uten tap/sirkulasjon/øvrig last)`,
    );
  }
  if (a.varmesentral.kravM2 !== null) {
    L.push(
      `- Varmesentral (TEK17 § 14-4(2)): krav ${fmt(a.varmesentral.kravM2, 0)} m², avsatt ${a.varmesentral.avsattM2 === null ? IKKE_OPPGITT : `${fmt(a.varmesentral.avsattM2, 0)} m²`} → ${a.varmesentral.ok === null ? 'ikke vurdert' : a.varmesentral.ok ? 'OK' : 'FOR LITE'}`,
    );
  }
  if (a.trykk.fallBar !== null) {
    L.push(`- Trykkfall i nettet ved uttak: ${fmt(a.trykk.fallBar, 1)} bar`);
  }
  L.push(
    `- Hydrostatisk løftehøyde (H_geo): ${fmt(a.hydrostatisk.geodetiskLoftehoydeM, 1)} m → hydrostatisk trykktap −${fmt(a.hydrostatisk.hydrostatiskTapBar, 2)} bar (−${fmt(a.hydrostatisk.hydrostatiskTapKpa, 0)} kPa)`,
  );
  if (a.hydrostatisk.kravTrykkreduksjonsventil) {
    L.push(
      `- 🚨 6,0 BAR-KONTROLL (TEK17 § 15-5 / NS-EN 806-2): Statisk trykk overstiger 6,0 bar (${fmt(a.hydrostatisk.maksStatiskTrykkBar ?? 0, 2)} bar) → KRAV OM TRYKKREDUKSJONSVENTIL på hovedinntak (3,5–4,5 bar).`,
    );
  }
  if (p.feller.length > 0) {
    L.push('');
    L.push('FELLER/AVVIK PROSJEKTUNDERLAGET SELV PEKER PÅ:');
    p.feller.forEach((f, i) => L.push(`${i + 1}. ${f}`));
  }
  L.push('');
  L.push('⚠️ HINT: MANGLENDE DATA FOR 100 % SIKKERHET:');
  const alleMangler = [...a.mangler];
  if (!p.matrikkel?.trim() || /ikke\s*oppgitt/i.test(p.matrikkel.trim())) {
    if (!alleMangler.some((m) => m.toLowerCase().includes('matrikkel') || m.toLowerCase().includes('gnr'))) {
      alleMangler.push('Gnr/Bnr (matrikkel) er ikke oppgitt (står som «IKKE OPPGITT»).');
    }
  }
  if (!p.koter?.vannledning || p.koter.vannledning === 0) {
    if (!alleMangler.some((m) => m.toLowerCase().includes('vannledning'))) {
      alleMangler.push('Kote for kommunal vannledning er ikke oppgitt (eller 0).');
    }
  }
  if (!p.overvann?.intensitet || p.overvann.intensitet === 0) {
    if (!alleMangler.some((m) => m.toLowerCase().includes('ivf') || m.toLowerCase().includes('intensitet'))) {
      alleMangler.push('Dimensjonerende IVF-varighet og regnintensitet er ikke oppgitt (eller 0).');
    }
  }

  if (alleMangler.length === 0) {
    L.push('- (ingen registrerte mangler)');
  } else {
    alleMangler.forEach((m) => L.push(`- ${m}`));
  }
  if (p.notater.trim()) {
    L.push('');
    L.push(`NOTATER: ${p.notater.trim()}`);
  }
  return L.join('\n');
}

export function filerKontekst(filer?: readonly ProsjektFil[]): string {
  if (!filer || filer.length === 0) return '';
  const L: string[] = ['', `OPPLASTEDE PROSJEKTFILER, TEGNINGER OG BILDER (${filer.length} stk):`];
  for (const f of filer) {
    const kat = FIL_KATEGORI_ETIKETTER[f.kategori]?.navn ?? f.kategori;
    L.push(`- ${f.navn} (${kat}, ${(f.storrelse / 1024).toFixed(1)} kB)`);
    if (f.aiOppsummering) L.push(`  Oppsummering: ${f.aiOppsummering}`);
    if (f.tekniskeFunn && f.tekniskeFunn.length > 0) {
      L.push(`  Tekniske funn: ${f.tekniskeFunn.join(' | ')}`);
    }
    if (f.uttrukketTekst && f.uttrukketTekst.trim()) {
      L.push(`  Utdrag: ${f.uttrukketTekst.slice(0, 1200).replace(/\n+/g, ' ')}`);
    }
  }
  return L.join('\n');
}

export const SYSTEMLOVER = `GLOBALE SYSTEMLOVER:
Lov 1 – Ingen gjetting: Mangler inndata (koter, Q/p-trykk, takhøyde, brannkonsept), skal du lage seksjonen «⚠️ HINT: MANGLENDE DATA FOR 100 % SIKKERHET» med konkrete spørsmål. Verdier merket «IKKE OPPGITT» skal aldri erstattes med antagelser uten å si det tydelig.
Lov 2 – Tilbakeslag: Laveste sluk/gulv skal ligge minst 950 mm (manualen/kommunal VA-norm) over ITR i kommunal kum. TEK17 § 15-6(3)/§ 15-8(3) angir preakseptert 0,90 m. Ved brudd: avløpspumpestasjon (NS-EN 12050) eller godkjent tilbakeslagssikring (NS-EN 13564).
Lov 3 – Norsk bransjeutstyr og QA: Kun gjennomprøvd utstyr med norsk serviceapparat, og alle tall kontrolleres baklengs (Agent 16) før signatur.
Lov 4 – Ren formelvisning (INGEN RÅ LaTeX): ALDRI bruk rå LaTeX som doble dollartegn ($$...$$), enkle dollartegn ($...$), \\text{...}, \\frac{...}{...}, \\cdot eller lignende i chat, svar og tekstfelt. Formler og regnestykker SKAL ALLTID skrives i ren, lesbar Markdown med vanlige tegn (f.eks. P_romoppvarming = 3 200 m² × 35 W/m² = 112 kW, q_S = 1,45 l/s, Δp = 45 kPa, H = 4,5 mVS).`;

export function lagSuperPrompt(
  agent: AgentDefinisjon,
  p: ProsjektData,
  a: ProsjektAnalyse,
  sporsmal?: string,
  filer?: readonly ProsjektFil[],
): string {
  const deler = [
    agent.masterPrompt,
    '',
    '--- PROSJEKTKONTEKST FRA VVS KEM PRO ---',
    prosjektKontekst(p, a) + filerKontekst(filer),
    '',
    SYSTEMLOVER,
    '',
    'FORMELFORMATERING: Skriv alle matematiske formler og beregninger i ren, lesbar Markdown (f.eks. P_romoppvarming = 3 200 m² × 35 W/m² = 112 kW). Bruk aldri rå LaTeX ($$...$$, $...$, \\text{...}).',
  ];
  if (sporsmal && sporsmal.trim()) deler.push('', 'SPØRSMÅL / OPPGAVE:', sporsmal.trim());
  else deler.push('', 'Utfør oppdraget etter agentens seksjoner, med mellomregninger og kildehenvisninger.');
  return deler.join('\n');
}

export function lagKommandoPrompt(
  kommando: Kommando,
  p: ProsjektData,
  a: ProsjektAnalyse,
  filer?: readonly ProsjektFil[],
): string {
  return [
    `[SUPER-KOMMANDO ${kommando.nummer}: ${kommando.navn.toUpperCase()}]`,
    kommando.tekstPrompt,
    '',
    '--- PROSJEKTKONTEKST FRA VVS KEM PRO ---',
    prosjektKontekst(p, a) + filerKontekst(filer),
    '',
    SYSTEMLOVER,
    '',
    'FORMELFORMATERING: Skriv alle matematiske formler og beregninger i ren, lesbar Markdown (f.eks. P_romoppvarming = 3 200 m² × 35 W/m² = 112 kW). Bruk aldri rå LaTeX ($$...$$, $...$, \\text{...}).',
  ].join('\n');
}

const LIVE_SYNK_INSTRUKS = `AUTOMATISK OPPDATERING AV PROSJEKTDATA (LIVE DATA-SYNK):
Hvis brukeren oppgir nye prosjektdata i meldingen sin ELLER legger ved et bilde/VA-kart/tegning med konkrete verdier (f.eks. adresse, Gnr/Bnr, BRA m², etasjer, terrengkote, kommunale kumkoter ITK/ITR/IBR/OK/UK, kote laveste sluk, stikkledningslengde, fall, vanntrykk eller antall dusjer), SKAL du helt til slutt i svaret ditt legge ved en kodeblokk merket \`\`\`prosjekt_json med KUN de nye/oppdaterte feltene i dette JSON-formatet:
\`\`\`prosjekt_json
{
  "navn": "Prosjektnavn (kun hvis oppgitt)",
  "sted": "Gateadresse, postnr poststed (kun hvis oppgitt)",
  "matrikkel": "Gnr. X / Bnr. Y (kun hvis oppgitt)",
  "vaMyndighet": "Kommune VA (kun hvis oppgitt)",
  "bra": 4500,
  "etasjer": "3 etasjer + kjeller",
  "koter": {
    "gate": 15.4,
    "itrKum": 13.9,
    "ibrKum": 13.6,
    "vannledning": 13.8,
    "stikkLengde": 40,
    "fallNevner": 60,
    "gulv": [{ "navn": "Laveste sluk (OK FG)", "kote": 12.5 }]
  },
  "vanntrykk": { "statiskBar": 4.5, "dynamiskBar": 3.8, "uttakLmin": 1200 }
}
\`\`\`
Utelat felt som ikke ble nevnt eller funnet i vedlegget, og ikke legg ved blokken hvis ingen prosjektverdier ble oppgitt.

AI-KOMMUNIKASJONSASSISTENT (VED MANGLENDE DATA):
Når viktige prosjektdata mangler (f.eks. kote ITK/IBR i kum, vanntrykk/Q-p, overvannspåslipp eller situasjonskart), skal du inkludere en tydelig seksjon kalt «📞 Veileder for innhenting av manglende data» med:
1. Hvem du skal kontakte: Eksakt avdeling i kommunen/etaten (f.eks. Kommunen – Vann- og avløpsetaten, Geodata- og oppmålingsavdelingen, eller ARK/RIBr).
2. Hva du skal spørre etter: Eksakte fagbegreper, målestokk og koder (f.eks. Situasjonsplan M 1:500, VA-ledningskart med kotehøyder i NN2000 på ITK/IBR i tilknytningskum, samt oppgitt kommunalt frihøyde-trykk i bar og Q/p-kapasitet).
3. Kort e-post-/telefonmal tilpasset prosjektets navn, adresse og Gnr/Bnr.`;

/** Systeminstruksjon til Gemini: agentens rolle (eller tverrfaglig hovedchat), regler, prosjektdata og opplastede filer. */
export function agentSystemInstruksjon(
  agent: AgentDefinisjon | null,
  p: ProsjektData,
  a: ProsjektAnalyse,
  filer?: readonly ProsjektFil[],
): string {
  if (!agent) {
    return [
      'Du er Hovedchat-assistenten (Tverrfaglig Senior RIV & Rørleggermester-team med alle 19 agenter) i VVS KEM PRO.',
      'Du kan analysere plantegninger, kommunale VA-kart/situasjonskart, systemskjemaer, bilder av pumpeskilt/aggregatskilt, PDF-rapporter, Excel-kalkyler og prosjektets beregningstall.',
      'Svar på norsk, faglig presist og strukturert. Vis alltid mellomregninger.',
      '',
      'FORMELVISNING (STRENGT FORBUD MOT RÅ LaTeX):',
      'Unngå strengt rå LaTeX som $$...$$, $...$, \\text{...}, \\frac{...}{...} eller \\cdot. Alle formler, dimensjoneringer og mellomregninger skal skrives i ren, lesbar Markdown med vanlige tegn (f.eks. P_romoppvarming = 3 200 m² × 35 W/m² = 112 kW, q_S = 1,45 l/s, Δp = 45 kPa).',
      '',
      SYSTEMLOVER,
      '',
      LIVE_SYNK_INSTRUKS,
      '',
      'PROSJEKTDATA:',
      prosjektKontekst(p, a) + filerKontekst(filer),
    ].join('\n');
  }
  return [
    `Du er Agent ${String(agent.nummer).padStart(2, '0')}: ${agent.navn} (${agent.nsKode}) i VVS KEM PRO, en kommandosentral for norske VVS-rådgivere (RIV/rørleggermester).`,
    `Rolle: ${agent.rolleBeskrivelse}`,
    `Standarder du skal forholde deg til: ${agent.standarder.join(', ')}.`,
    '',
    'Svar på norsk, faglig presist og kort nok til å bruke. Vis mellomregninger. Du kan også analysere vedlagte plantegninger, VA-kart, bilder (f.eks. pumpeskilt/teknisk rom) og PDF-dokumenter. Skill tydelig mellom det som er oppgitt i prosjektdataene/vedleggene, det appen har beregnet, og dine egne antagelser.',
    '',
    'FORMELVISNING (STRENGT FORBUD MOT RÅ LaTeX):',
    'Unngå strengt rå LaTeX som $$...$$, $...$, \\text{...}, \\frac{...}{...} eller \\cdot. Alle formler, dimensjoneringer og mellomregninger skal skrives i ren, lesbar Markdown med vanlige tegn (f.eks. P_romoppvarming = 3 200 m² × 35 W/m² = 112 kW, q_S = 1,45 l/s, Δp = 45 kPa).',
    '',
    'AGENTENS ARBEIDSMÅTE (fra systemmanualen):',
    agent.masterPrompt,
    '',
    SYSTEMLOVER,
    '',
    LIVE_SYNK_INSTRUKS,
    '',
    'PROSJEKTDATA:',
    prosjektKontekst(p, a) + filerKontekst(filer),
  ].join('\n');
}
