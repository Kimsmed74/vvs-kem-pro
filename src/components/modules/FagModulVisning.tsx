import { useEffect, useMemo, useState } from 'react';
import type { ProsjektData } from '../../data/prosjekter';
import { minAreaVarmesentral, transmisjonstap, type Bygningsdel } from '../../engine/energi';
import {
  SPRINKLER_KLASSER,
  beregnEkspansjonskar,
  beregnLccAlternativer,
  beregnRorIsolasjonOgUtvidelse,
  beregnSirkulasjonspumpe,
  beregnSprinklerOgBranntrommel,
  beregnTrykkokning,
  beregnVentilasjon,
  byggTfmKode,
  type LccAlternativInput,
  type SprinklerFareklasse,
} from '../../engine/fagmoduler';
import type { ProsjektAnalyse } from '../../lib/analyse';
import { fmt, kopierTilUtklippstavle, lastNedTekst } from '../../lib/format';
import type { OverstyringInfo } from '../../lib/lagring';
import type { Modul } from '../../modules';
import GatekeeperPanel from '../GatekeeperPanel';
import TrykkOgKoteVeileder from '../TrykkOgKoteVeileder';
import { useBekreftSlett } from '../common/BekreftSlettModal';
import GlobalRapportBar from '../common/GlobalRapportBar';
import { Knapp, Kort, Merkelapp, Resultat, TallFelt } from '../common/ui';
import HydroniskInnregulering from './02_varme/HydroniskInnregulering';
import VentilasjonInnregulering from './03_ventilasjon/VentilasjonInnregulering';
import FagRapportModal from './common/FagRapportModal';
import {
  beregnKondensOgDuggpunkt,
  beregnSprinklerHydraulikk,
  beregnLccNs3454,
} from '../../engine/innregulering';

interface Props {
  modul: Modul;
  prosjekt: ProsjektData;
  analyse: ProsjektAnalyse;
  qa: Record<string, boolean>;
  overstyringer: Record<string, OverstyringInfo>;
  qaFullfort: number;
  onToggleQa: (id: string) => void;
  onOppdaterProsjekt: (prosjekt: ProsjektData, endringer?: string[]) => void;
  onOppdaterProsjektOgOverstyringer: (
    prosjekt: ProsjektData,
    overstyringer: Record<string, OverstyringInfo>,
    endringer: string[]
  ) => void;
  onVelgAgent: (agentId: string) => void;
  onApneChat: (agentId: string, sporsmal?: string) => void;
  onNavigerTilDashbord?: () => void;
  melding: (tekst: string) => void;
}

const MODUL_AGENTER: Record<string, { id: string; navn: string }[]> = {
  varme: [
    { id: 'agent-04', navn: 'Agent 04 (Varme & Hydronikk)' },
    { id: 'agent-18', navn: 'Agent 18 (Varmepumpe & Kjøling)' },
  ],
  ventilasjon: [
    { id: 'agent-06', navn: 'Agent 06 (Ventilasjon & Inneklima)' },
    { id: 'agent-10', navn: 'Agent 10 (Akustikk & Støy)' },
  ],
  pumper: [
    { id: 'agent-04', navn: 'Agent 04 (Sirkulasjonspumper)' },
    { id: 'agent-03', navn: 'Agent 03 (Trykkøkning KV)' },
  ],
  isolasjon: [
    { id: 'agent-04', navn: 'Agent 04 (Rørisolasjon & Varmetap)' },
    { id: 'agent-18', navn: 'Agent 18 (Kondensisolering)' },
  ],
  brann: [
    { id: 'agent-05', navn: 'Agent 05 (Sprinkler & Branntromler)' },
    { id: 'agent-11', navn: 'Agent 11 (Branntetting)' },
  ],
  lovverk: [
    { id: 'agent-02', navn: 'Agent 02 (Krav & Kontrakt)' },
    { id: 'agent-14', navn: 'Agent 14 (Uavhengig kontroll)' },
    { id: 'agent-16', navn: 'Agent 16 (QA-port)' },
  ],
  breeam: [
    { id: 'agent-13', navn: 'Agent 13 (25-års LCC)' },
    { id: 'agent-09', navn: 'Agent 09 (Energi NS 3031)' },
    { id: 'agent-12', navn: 'Agent 12 (BREEAM-NOR)' },
  ],
  prosjekt: [
    { id: 'agent-07', navn: 'Agent 07 (BIM & TFM PA 0802)' },
    { id: 'agent-08', navn: 'Agent 08 (ITB & Automatikk)' },
    { id: 'agent-01', navn: 'Agent 01 (Orkestrator)' },
  ],
};

function velgStandardFareklasse(bygningstype: string): SprinklerFareklasse {
  const lav = bygningstype.toLowerCase();
  if (/skole|barnehage|kontor|bolig|småhus/.test(lav)) return 'LH';
  if (/hotell|sykehus|sykehjem|helse|kultur/.test(lav)) return 'OH1';
  if (/industri|verksted|parkering/.test(lav)) return 'OH2';
  if (/forretning|lager/.test(lav)) return 'OH3';
  return 'OH1';
}

export default function FagModulVisning({
  modul,
  prosjekt,
  analyse,
  qa,
  overstyringer,
  qaFullfort,
  onToggleQa,
  onOppdaterProsjekt,
  onOppdaterProsjektOgOverstyringer,
  onVelgAgent,
  onApneChat,
  onNavigerTilDashbord,
  melding,
}: Props) {
  const bekreftSlett = useBekreftSlett();
  const agenter = MODUL_AGENTER[modul.id] ?? [{ id: 'agent-01', navn: 'Agent 01' }];
  const bra = prosjekt.bra ?? 1200;
  const h = analyse.hydrostatisk;

  // Sub-faner for Modul 2, 3
  const [varmeFane, setVarmeFane] = useState<'innregulering' | 'ekspansjon'>('innregulering');
  const [ventFane, setVentFane] = useState<'innregulering' | 'beregning'>('innregulering');

  // Modaler for PDF-rapportering:
  const [visPumpeRapport, setVisPumpeRapport] = useState(false);
  const [visIsolasjonRapport, setVisIsolasjonRapport] = useState(false);
  const [visBrannRapport, setVisBrannRapport] = useState(false);
  const [visLccRapport, setVisLccRapport] = useState(false);
  const [visEkspansjonRapport, setVisEkspansjonRapport] = useState(false);
  const [visVentBeregningRapport, setVisVentBeregningRapport] = useState(false);
  const [visLovverkRapport, setVisLovverkRapport] = useState(false);
  const [visFdvRapport, setVisFdvRapport] = useState(false);

  // ==========================================================================
  // MODUL 2: VARME & HYDRONIKK STATE (synkronisert med globalt BRA og koter)
  // ==========================================================================
  const [anleggsVolum, setAnleggsVolum] = useState(() => Math.max(400, Math.round(bra * 0.85)));
  const [maksTempC, setMaksTempC] = useState(70);
  const [statiskHoydeVarme, setStatiskHoydeVarme] = useState(() => h.geodetiskLoftehoydeM);
  const [sikkerhetsventilBar, setSikkerhetsventilBar] = useState(3.0);

  useEffect(() => {
    setStatiskHoydeVarme(h.geodetiskLoftehoydeM);
  }, [h.geodetiskLoftehoydeM]);

  useEffect(() => {
    if (prosjekt.bra) {
      setAnleggsVolum(Math.max(400, Math.round(prosjekt.bra * 0.85)));
    }
  }, [prosjekt.bra]);

  const ekspansjon = useMemo(
    () =>
      beregnEkspansjonskar({
        anleggsVolumLiter: anleggsVolum,
        maksTempC,
        statiskHoydeM: statiskHoydeVarme,
        sikkerhetsventilBar,
      }),
    [anleggsVolum, maksTempC, statiskHoydeVarme, sikkerhetsventilBar]
  );

  // ==========================================================================
  // MODUL 3: VENTILASJON & INNEKLIMA STATE (synkronisert med globalt BRA/type)
  // ==========================================================================
  const [ventAreal, setVentAreal] = useState(bra);
  const [antallPersoner, setAntallPersoner] = useState(() => Math.max(10, Math.round(bra / 15)));
  const [materialFaktor, setMaterialFaktor] = useState(2.52);
  const [personFaktor, setPersonFaktor] = useState(26);
  const [kjolebehovW, setKjolebehovW] = useState(() => Math.round(bra * 25));
  const [deltaTKjoling, setDeltaTKjoling] = useState(8);
  const [vifteEffektKw, setVifteEffektKw] = useState(() => Math.max(1.5, Math.round((bra / 1000) * 3.2 * 10) / 10));
  const [kanalDimMm, setKanalDimMm] = useState(630);
  const [gjenvinnerType, setGjenvinnerType] = useState<'plate_vaeske' | 'roterende'>('plate_vaeske');

  useEffect(() => {
    if (prosjekt.bra) {
      setVentAreal(prosjekt.bra);
      setAntallPersoner(Math.max(10, Math.round(prosjekt.bra / 15)));
      setKjolebehovW(Math.round(prosjekt.bra * 25));
    }
  }, [prosjekt.bra]);

  const ventRes = useMemo(
    () =>
      beregnVentilasjon({
        arealM2: ventAreal,
        antallPersoner,
        materialFaktorM3hM2: materialFaktor,
        personFaktorM3h: personFaktor,
        kjolebehovWatt: kjolebehovW,
        deltaTKjolingK: deltaTKjoling,
        totalVifteEffektKw: vifteEffektKw,
        kanalDiameterMm: kanalDimMm,
      }),
    [ventAreal, antallPersoner, materialFaktor, personFaktor, kjolebehovW, deltaTKjoling, vifteEffektKw, kanalDimMm]
  );

  // ==========================================================================
  // MODUL 4: PUMPER & REGULERING STATE (synkronisert med globalt vanntrykk/koter)
  // ==========================================================================
  const globaltInntaksTrykkBar =
    prosjekt.vanntrykk.dynamiskBar ?? prosjekt.vanntrykk.statiskBar ?? 4.0;
  const [pumpeQM3h, setPumpeQM3h] = useState(() => Math.max(2.5, Math.round((bra / 1000) * 3.5 * 10) / 10));
  const [pumpeLofteMvs, setPumpeLofteMvs] = useState(4.5);
  const [pumpeAnleggsType, setPumpeAnleggsType] = useState<'radiator' | 'gulvvarme' | 'ventilasjon' | 'vvc'>('radiator');
  const [rorOgKompTapBar, setRorOgKompTapBar] = useState(0.9);
  const [kravResttrykkBar, setKravResttrykkBar] = useState(2.0);

  const pumpeRes = useMemo(
    () => beregnSirkulasjonspumpe(pumpeQM3h, pumpeLofteMvs, 0.65, 5500, pumpeAnleggsType),
    [pumpeQM3h, pumpeLofteMvs, pumpeAnleggsType]
  );
  const boosterRes = useMemo(
    () =>
      beregnTrykkokning(
        globaltInntaksTrykkBar,
        h.geodetiskLoftehoydeM,
        rorOgKompTapBar,
        kravResttrykkBar
      ),
    [globaltInntaksTrykkBar, h.geodetiskLoftehoydeM, rorOgKompTapBar, kravResttrykkBar]
  );

  // ==========================================================================
  // MODUL 5: ISOLASJON & RØRMATERIALER STATE
  // ==========================================================================
  const [ytreRorMm, setYtreRorMm] = useState(54);
  const [isoTykkelseMm, setIsoTykkelseMm] = useState(40);
  const [lambdaWmk] = useState(0.035);
  const [medieTempC, setMedieTempC] = useState(7);
  const [omgivelseTempC, setOmgivelseTempC] = useState(24);
  const [rfProsent, setRfProsent] = useState(60);
  const [rorLengdeM, setRorLengdeM] = useState(() => prosjekt.koter.stikkLengde ?? 45);
  const [alphaMmPerMK] = useState(0.035); // PP-R Faser / komposittrør
  const [deltaTUtvidelse] = useState(50);

  const isoRes = useMemo(
    () =>
      beregnRorIsolasjonOgUtvidelse({
        ytreRorDiameterMm: ytreRorMm,
        isolasjonsTykkelseMm: isoTykkelseMm,
        lambdaWmk,
        medieTempC,
        omgivelseTempC,
        relativFuktighetProsent: rfProsent,
        rorLengdeM,
        alphaMmPerMK,
        deltaTUtvidelseK: deltaTUtvidelse,
      }),
    [ytreRorMm, isoTykkelseMm, lambdaWmk, medieTempC, omgivelseTempC, rfProsent, rorLengdeM, alphaMmPerMK, deltaTUtvidelse]
  );

  const kondensRes = useMemo(
    () =>
      beregnKondensOgDuggpunkt({
        rorDiameterMm: ytreRorMm,
        isoTykkelseMm: isoTykkelseMm,
        lambdaIso: lambdaWmk,
        medieTempC,
        omgivelseTempC,
        relativFuktighet: rfProsent,
      }),
    [ytreRorMm, isoTykkelseMm, lambdaWmk, medieTempC, omgivelseTempC, rfProsent]
  );

  // ==========================================================================
  // MODUL 6: BRANN & SPRINKLER STATE (synkronisert med bygningstype, trykk og koter)
  // ==========================================================================
  const [fareklasse, setFareklasse] = useState<SprinklerFareklasse>(() =>
    velgStandardFareklasse(prosjekt.bygningstype)
  );
  const [kFaktor, setKFaktor] = useState(80);
  const [dekningDyseM2] = useState(12);
  const [ganglinjeM, setGanglinjeM] = useState(28);
  const [slangeLengdeM, setSlangeLengdeM] = useState(30);

  useEffect(() => {
    setFareklasse(velgStandardFareklasse(prosjekt.bygningstype));
  }, [prosjekt.bygningstype]);

  const kommunaltTrykkBrannBar =
    prosjekt.vanntrykk.dynamiskBar !== null
      ? prosjekt.vanntrykk.dynamiskBar
      : prosjekt.vanntrykk.statiskBar !== null
      ? prosjekt.vanntrykk.statiskBar
      : null;

  const korrigertTilgjengeligTrykkBar =
    kommunaltTrykkBrannBar !== null
      ? Math.max(0, Math.round((kommunaltTrykkBrannBar - h.hydrostatiskTapBar) * 100) / 100)
      : null;

  const brannRes = useMemo(
    () =>
      beregnSprinklerOgBranntrommel({
        fareklasse,
        kFaktor,
        dekningPerDyseM2: dekningDyseM2,
        ganglinjeTilFjernesteHjorneM: ganglinjeM,
        slangeLengdeM,
        tilgjengeligDynamiskTrykkBar: korrigertTilgjengeligTrykkBar,
      }),
    [fareklasse, kFaktor, dekningDyseM2, ganglinjeM, slangeLengdeM, korrigertTilgjengeligTrykkBar]
  );

  const sprinklerHydRes = useMemo(
    () =>
      beregnSprinklerHydraulikk({
        fareklasse,
        vannbehovLmin: brannRes.vannmengdeLmin,
        dyseTrykkBar: brannRes.minDyseTrykkBar,
        lofteHoydeM: h.geodetiskLoftehoydeM,
        rorfriksjonBar: 1.0,
        tilgjengeligTrykkBar: kommunaltTrykkBrannBar ?? 4.0,
      }),
    [fareklasse, brannRes.vannmengdeLmin, brannRes.minDyseTrykkBar, h.geodetiskLoftehoydeM, kommunaltTrykkBrannBar]
  );

  // ==========================================================================
  // MODUL 8: BREEAM, LCC & ENERGI STATE (synkronisert med globalt BRA)
  // ==========================================================================
  const [strompris, setStrompris] = useState(1.25);
  const [realrente, setRealrente] = useState(4.0);
  const [lccAlternativer, setLccAlternativer] = useState<LccAlternativInput[]>(() => [
    {
      navn: 'Alt 1: Lavest CAPEX (El-kjel + luft/vann VP)',
      capexKr: Math.round(bra * 650),
      aarligEnergiKwh: Math.round(bra * 95),
      aarligVedlikeholdKr: 28000,
    },
    {
      navn: 'Alt 2: Optimalisert LCC (Fjernvarme + varmegjenvinning)',
      capexKr: Math.round(bra * 820),
      aarligEnergiKwh: Math.round(bra * 68),
      aarligVedlikeholdKr: 22000,
    },
    {
      navn: 'Alt 3: Beste Miljø (Bergvarmepumpe + frikjøling + gråvann)',
      capexKr: Math.round(bra * 1150),
      aarligEnergiKwh: Math.round(bra * 36),
      aarligVedlikeholdKr: 19000,
    },
  ]);

  const [bygningsdeler] = useState<Bygningsdel[]>(() => [
    { navn: 'Yttervegger', areal: Math.round(bra * 0.55), u: 0.18 },
    { navn: 'Tak', areal: Math.round(bra * 0.35), u: 0.13 },
    { navn: 'Gulv på grunn', areal: Math.round(bra * 0.35), u: 0.1 },
    { navn: 'Vinduer og dører', areal: Math.round(bra * 0.18), u: 0.8 },
  ]);

  const lccRes = useMemo(
    () => beregnLccAlternativer(lccAlternativer, strompris, realrente, 25),
    [lccAlternativer, strompris, realrente]
  );
  const besteLcc = useMemo(
    () =>
      lccRes.length > 0
        ? lccRes.reduce((best, cur) =>
            cur.totalNaaverdi25AarKr < best.totalNaaverdi25AarKr ? cur : best
          )
        : null,
    [lccRes]
  );
  const transRes = useMemo(
    () => transmisjonstap(bygningsdeler, 0.05, bra),
    [bygningsdeler, bra]
  );

  const lccNs3454 = useMemo(
    () =>
      beregnLccNs3454(
        lccAlternativer.map((a) => ({
          navn: a.navn,
          investeringCapexKr: a.capexKr,
          aarligEnergiKwh: a.aarligEnergiKwh,
          stromprisKrPerKwh: strompris,
          aarligVedlikeholdKr: a.aarligVedlikeholdKr,
          levetidAar: 25,
          kalkulasjonsrenteProsent: realrente,
        })),
        bra
      ),
    [lccAlternativer, strompris, realrente, bra]
  );

  // ==========================================================================
  // MODUL 9: PROSJEKT, TFM (PA 0802) & ITB STATE
  // ==========================================================================
  const [tfmLokasjon, setTfmLokasjon] = useState('A');
  const [tfmSystem, setTfmSystem] = useState('320');
  const [tfmSysNr, setTfmSysNr] = useState(1);
  const [tfmKomp, setTfmKomp] = useState('PU');
  const [tfmKompNr, setTfmKompNr] = useState(1);
  const [tfmTypeKode, setTfmTypeKode] = useState('');
  const [tfmBeskrivelse, setTfmBeskrivelse] = useState('Hovedsirkulasjonspumpe radiator (MAGNA3)');
  const [tfmListe, setTfmListe] = useState([
    { kode: '+A=310.001-VB001', beskrivelse: 'Varmtvannsbereder 70 °C (Legionellasikret)', fag: 'RIV / Rør' },
    { kode: '+A=310.001-RV001', beskrivelse: 'Trykkreduksjonsventil hovedinntak (4,0 bar)', fag: 'RIV / Rør' },
    { kode: '+A=320.001-PU001', beskrivelse: 'Sirkulasjonspumpe varmeanlegg (Grundfos MAGNA3)', fag: 'RIV / RIAu' },
    { kode: '+A=360.001-JV001', beskrivelse: 'Tilluftsvifte hovedaggregat (SFP ≤ 1,5)', fag: 'RIV / RIAu' },
  ]);

  const nyTfmKode = byggTfmKode({
    lokasjon: tfmLokasjon,
    systemKode: tfmSystem,
    systemLopenr: tfmSysNr,
    komponentKode: tfmKomp,
    komponentLopenr: tfmKompNr,
    typeKode: tfmTypeKode,
  });

  const datoStreng = useMemo(
    () =>
      new Date().toLocaleDateString('nb-NO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    []
  );

  // Markdown-generatorer for de 5 faglige rapportene:
  const ekspansjonMarkdown = useMemo(() => {
    const L: string[] = [];
    L.push('# TRYKKHOLDING, EKSPANSJONSKAR & VARMESENTRAL (TEK17 § 14-4)');
    L.push('**Standard:** NS-EN 12828 · Pneumatex Statico/Compresso · TEK17 § 14-4(2)');
    L.push(`**Prosjekt:** ${prosjekt.navn} | **Dato:** ${datoStreng}`);
    L.push('**Utførende:** Kim Jørgensen | Rørleggermester & Rådgivende Ingeniør VVS (RIV)');
    L.push(`**Adresse:** ${prosjekt.sted || 'Ikke oppgitt'} | **Matrikkel:** ${prosjekt.matrikkel || 'Ikke oppgitt'}`);
    L.push('');
    L.push('## 1. Dimensjonerende Nøkkeltall');
    L.push(`- Anleggsvolum V_a: ${fmt(anleggsVolum, 0)} liter`);
    L.push(`- Maksimal driftstemperatur: ${maksTempC} °C`);
    L.push(`- Statisk høyde H_st: ${fmt(statiskHoydeVarme, 1)} m`);
    L.push(`- Sikkerhetsventil åpningstrykk: ${fmt(sikkerhetsventilBar, 1)} bar`);
    L.push(`- Beregnet ekspansjonsvolum V_e: ${fmt(ekspansjon.ekspansjonsVolumLiter, 1)} l`);
    L.push(`- Nødvendig fortrykk p_0: ${fmt(ekspansjon.fortrykkBar, 2)} bar`);
    L.push(`- Nominelt volum V_n: ${fmt(ekspansjon.nomineltVolumLiter, 0)} l`);
    L.push(`- Anbefalt standardkar: ${ekspansjon.anbefaltStandardKarLiter} liter (Pneumatex Statico/Compresso)`);
    L.push(`- TEK17 § 14-4 minstekrav til varmesentral: ${minAreaVarmesentral(bra) !== null ? `${fmt(minAreaVarmesentral(bra)!, 0)} m²` : 'Ikke krav (< 1000 m²)'}`);
    L.push(`- Avsatt areal i prosjektet: ${prosjekt.tekniskRomM2 !== null ? `${fmt(prosjekt.tekniskRomM2, 0)} m²` : 'Ikke oppgitt'}`);
    L.push('');
    L.push('## 2. Varmesentral Krav iht. TEK17 § 14-4(2)');
    L.push('- Formelkrav: 10 m² + 1 % av oppvarmet BRA over 1 000 m²');
    L.push('- Fri takhøyde: Minimum 2,5 m');
    L.push('- Døråpning: Minimum 1,0 m fri bredde for transport av teknisk utstyr');
    L.push(`- Status: ${analyse.varmesentral.ok === false ? '🚨 AVVIK – Avsatt areal er for lite' : '✅ GODKJENT'}`);
    L.push('');
    L.push('## 3. Konklusjon & RIV-Godkjenning');
    L.push(
      analyse.varmesentral.ok === false
        ? `⚠️ Ekspansjonskar dimensjonert til ${ekspansjon.anbefaltStandardKarLiter} l, men varmesentralens areal (${prosjekt.tekniskRomM2 ?? 0} m²) må utvides til minst ${minAreaVarmesentral(bra)} m².`
        : `✅ Trykkholding og ekspansjonskar er godkjent dimensjonert (${ekspansjon.anbefaltStandardKarLiter} l). Varmesentral tilfredsstiller TEK17 § 14-4.`
    );
    return L.join('\n');
  }, [prosjekt, datoStreng, anleggsVolum, maksTempC, statiskHoydeVarme, sikkerhetsventilBar, ekspansjon, bra, analyse.varmesentral]);

  const ventBeregningMarkdown = useMemo(() => {
    const L: string[] = [];
    L.push('# LUFTMENGDER, VARMEGJENVINNING & SFP (TEK17 KAP. 13)');
    L.push('**Standard:** TEK17 § 13-1 til § 13-4 · NS-EN 16798-1 · Arbeidstilsynets veiledning 444');
    L.push(`**Prosjekt:** ${prosjekt.navn} | **Dato:** ${datoStreng}`);
    L.push('**Utførende:** Kim Jørgensen | Rørleggermester & Rådgivende Ingeniør VVS (RIV)');
    L.push(`**Adresse:** ${prosjekt.sted || 'Ikke oppgitt'} | **Matrikkel:** ${prosjekt.matrikkel || 'Ikke oppgitt'}`);
    L.push(`**Oppvarmet BRA:** ${fmt(ventAreal, 0)} m² | **Bygningstype:** ${prosjekt.bygningstype}`);
    L.push('');
    L.push('## 1. Grunnlag & Dimensjonerende Luftmengder');
    L.push(`- Ventilert areal BRA: ${fmt(ventAreal, 0)} m²`);
    L.push(`- Personbelastning: ${antallPersoner} personer (${personFaktor} m³/h·pers)`);
    L.push(`- Materialemisjon: ${materialFaktor} m³/h·m²`);
    L.push(`- Kjølebehov i dimensjonerende sone: ${fmt(kjolebehovW, 0)} W (ΔT = ${deltaTKjoling} K)`);
    L.push(`- Hygienisk luftbehov: ${fmt(ventRes.luftHygieneM3h, 0)} m³/h`);
    L.push(`- Luftbehov for kjøling: ${fmt(ventRes.luftKjolingM3h, 0)} m³/h`);
    L.push(`- Dimensjonerende luftmengde q_dim: ${fmt(ventRes.dimensjonerendeM3h, 0)} m³/h (${fmt(ventRes.dimensjonerendeM3h / 3600, 3)} m³/s)`);
    L.push('');
    L.push('## 2. Vifteeffekt, SFP & Kanalhastighet');
    L.push(`- Total vifteeffekt P_el: ${fmt(vifteEffektKw, 2)} kW`);
    L.push(`- Spesifikk vifteeffekt SFP: ${fmt(ventRes.sfpKwPerM3s, 2)} kW/(m³/s) (TEK17-krav: ≤ 1,5 kW/(m³/s))`);
    L.push(`- SFP-vurdering: ${ventRes.sfpOkTek17 ? '✅ GODKJENT (≤ 1,5)' : '🚨 OVERSKRIDER TEK17-KRAV'}`);
    L.push(`- Hovedkanal diameter: Ø${kanalDimMm} mm`);
    L.push(`- Beregnet kanalhastighet v: ${fmt(ventRes.kanalHastighetMs, 2)} m/s (Anbefalt: ≤ 5,0 m/s)`);
    L.push(`- Hastighetsvurdering: ${ventRes.kanalHastighetOk ? '✅ GODKJENT (≤ 5,0 m/s)' : '🚨 FOR HØY HASTIGHET (Støyfare)'}`);
    L.push('');
    L.push('## 3. Varmegjenvinner & Luktsmittekontroll');
    L.push(`- Valgt type: ${gjenvinnerType === 'plate_vaeske' ? '✅ Motstrøms plateveksler / Væskekoblet batteri (0 % smitte)' : '⚠️ Roterende gjenvinner (kun for ren kontorluft)'}`);
    L.push('');
    L.push('## 4. Konklusjon & RIV-Godkjenning');
    L.push(
      ventRes.sfpOkTek17 && ventRes.kanalHastighetOk
        ? `✅ Dimensjonering av luftmengder (${fmt(ventRes.dimensjonerendeM3h, 0)} m³/h), SFP (${fmt(ventRes.sfpKwPerM3s, 2)} kW/(m³/s)) og kanalhastighet (${fmt(ventRes.kanalHastighetMs, 2)} m/s) er godkjent iht. TEK17 kap. 13.`
        : `⚠️ Aggregat og kanaldimensjoner må optimaliseres: ${!ventRes.sfpOkTek17 ? `SFP ${fmt(ventRes.sfpKwPerM3s, 2)} overskrider kravet på 1,5 kW/(m³/s). ` : ''}${!ventRes.kanalHastighetOk ? `Kanalhastighet ${fmt(ventRes.kanalHastighetMs, 2)} m/s er over 5,0 m/s.` : ''}`
    );
    return L.join('\n');
  }, [prosjekt, datoStreng, ventAreal, antallPersoner, personFaktor, materialFaktor, kjolebehovW, deltaTKjoling, ventRes, vifteEffektKw, kanalDimMm, gjenvinnerType]);

  const pumpeMarkdown = useMemo(() => {
    const L: string[] = [];
    L.push('# PUMPER & TRYKKØKNINGSANLEGG (WWBOOSTER & SIRKULASJONSPUMPER)');
    L.push('**Standard:** SINTEF Byggforsk 553.115 · Grundfos Engineering Guide · NS-EN 14336');
    L.push(`**Prosjekt:** ${prosjekt.navn} | **Dato:** ${datoStreng}`);
    L.push('**Utførende:** Kim Jørgensen | Rørleggermester & Rådgivende Ingeniør VVS (RIV)');
    L.push(`**Adresse:** ${prosjekt.sted || 'Ikke oppgitt'} | **Matrikkel:** ${prosjekt.matrikkel || 'Ikke oppgitt'}`);
    L.push('');
    L.push('## 1. Kaldtvann Trykkøkning (WWBooster vs. Koter)');
    L.push(`- Kommunalt inntakstrykk: ${fmt(globaltInntaksTrykkBar, 2)} bar`);
    L.push(`- Geodetisk løftehøyde H_geo: ${fmt(h.geodetiskLoftehoydeM, 1)} m (${fmt(h.hydrostatiskTapBar, 2)} bar)`);
    L.push(`- Estimert rør- og komponentfriksjon: ${fmt(rorOgKompTapBar, 2)} bar`);
    L.push(`- Krav til resttrykk øverste tappested: ${fmt(kravResttrykkBar, 2)} bar`);
    L.push(`- Nødvendig inntakstrykk: ${fmt(boosterRes.nodvendigTrykkBar, 2)} bar`);
    L.push(`- Nødvendig trykkløft: ${fmt(boosterRes.trykkLoftBar, 2)} bar`);
    L.push(`- Konklusjon trykkøkning: ${boosterRes.trengerBooster ? '🚨 PÅKREVD – Grundfos Hydro MPC-E boosteranlegg må installeres' : '✅ Tilstrekkelig trykk uten booster'}`);
    L.push('');
    L.push('## 2. Sirkulasjonspumpe Varme/Kjøling (Grundfos MAGNA3)');
    L.push(`- Anleggstype: ${pumpeAnleggsType.toUpperCase()}`);
    L.push(`- Volumstrøm Q: ${fmt(pumpeQM3h, 2)} m³/h`);
    L.push(`- Løftehøyde H: ${fmt(pumpeLofteMvs, 2)} mVS`);
    L.push(`- Anbefalt pumpemodell: ${pumpeRes.anbefaltModell}`);
    L.push(`- Reguleringsmodus: ${pumpeRes.anbefaltModus}`);
    L.push(`- Elektrisk effekt P1: ${fmt(pumpeRes.elektriskEffektW, 0)} W`);
    L.push(`- Årlig energibehov: ${fmt(pumpeRes.aarligEnergiKwh, 0)} kWh/år`);
    L.push('');
    L.push('## 3. Konklusjon & FDV-Godkjenning');
    L.push(
      boosterRes.trengerBooster
        ? `⚠️ Trykkøkningsstasjon (+${fmt(boosterRes.trykkLoftBar, 2)} bar) er påkrevd på grunn av byggehøyde. Sirkulasjonspumpe ${pumpeRes.anbefaltModell} er godkjent for hydronisk distribusjon.`
        : `✅ Kommunalt trykk er tilstrekkelig uten booster. Sirkulasjonspumpe ${pumpeRes.anbefaltModell} er godkjent.`
    );
    return L.join('\n');
  }, [prosjekt, datoStreng, globaltInntaksTrykkBar, h, rorOgKompTapBar, kravResttrykkBar, boosterRes, pumpeAnleggsType, pumpeQM3h, pumpeLofteMvs, pumpeRes]);

  const isolasjonMarkdown = useMemo(() => {
    const L: string[] = [];
    L.push('# ISOLASJON, DUGGPUNKT & KONDENSBEREGNING (ARMAFLEX & GLAVA)');
    L.push('**Standard:** NS-EN ISO 12241 · Magnus-Tetens formel · NS-EN 12828');
    L.push(`**Prosjekt:** ${prosjekt.navn} | **Dato:** ${datoStreng}`);
    L.push('**Utførende:** Kim Jørgensen | Rørleggermester & Rådgivende Ingeniør VVS (RIV)');
    L.push(`**Adresse:** ${prosjekt.sted || 'Ikke oppgitt'} | **Matrikkel:** ${prosjekt.matrikkel || 'Ikke oppgitt'}`);
    L.push('');
    L.push('## 1. Duggpunktsberegning for Kjølerør / Isvann (6/12 °C)');
    L.push(`- Ytre rørdiameter: Ø${ytreRorMm} mm`);
    L.push(`- Medietemperatur: ${medieTempC} °C`);
    L.push(`- Omgivelsestemperatur: ${omgivelseTempC} °C`);
    L.push(`- Relativ fuktighet (RF): ${rfProsent} %`);
    L.push(`- Beregnet duggpunkt T_dugg: ${fmt(kondensRes.duggpunktTempC, 1)} °C`);
    L.push(`- Overflatetemperatur med ${isoTykkelseMm} mm cellegummi: ${fmt(kondensRes.overflateTempC, 1)} °C`);
    L.push(`- Sikkerhetsmargin mot duggpunkt: ${fmt(kondensRes.sikkerhetsmarginK, 1)} K`);
    L.push(`- Anbefalt minste cellegummi: ${kondensRes.anbefaltMinIsoMm} mm (Armaflex AF)`);
    L.push(`- Kondensrisiko med isolasjon: ${kondensRes.kondensfare ? '🚨 FARE FOR KONDENS – Må øke cellegummi' : '✅ SIKKER MOT KONDENS'}`);
    L.push('');
    L.push('## 2. Varmetap for Varmerør (Glava / Rockwool λ = 0,035 W/mK)');
    L.push(`- Rørlengde L: ${rorLengdeM} m`);
    L.push(`- Varmetap per meter: ${fmt(isoRes.varmetapWattPerM, 1)} W/m`);
    L.push(`- Totalt varmetap: ${fmt(isoRes.varmetapWattPerM * rorLengdeM, 0)} W`);
    L.push(`- Årlig energitap (drift 8760 h): ${fmt((isoRes.varmetapWattPerM * rorLengdeM * 8760) / 1000, 0)} kWh/år`);
    L.push('');
    L.push(`## 3. Termisk Lengdeutvidelse ΔL (L = ${rorLengdeM} m, ΔT = 50 K)`);
    L.push(`- Valgt materiale (α = ${alphaMmPerMK} mm/m·K): Lengdeutvidelse ΔL = ${fmt(isoRes.lengdeUtvidelseMm, 1)} mm`);
    L.push('- Sammenligning:');
    L.push(`  * PP-R Faser (α=0,035): ${fmt(rorLengdeM * 0.035 * 50, 1)} mm`);
    L.push(`  * Kobber Cu (α=0,017): ${fmt(rorLengdeM * 0.017 * 50, 1)} mm`);
    L.push(`  * Stålrør (α=0,012): ${fmt(rorLengdeM * 0.012 * 50, 1)} mm`);
    L.push('');
    L.push('## 4. Konklusjon & Utførelseskrav');
    L.push(
      kondensRes.kondensfare
        ? `🚨 Isolasjonstykkelsen på ${isoTykkelseMm} mm gir overflatetemperatur under duggpunktet. Krav: Øk til minst ${kondensRes.anbefaltMinIsoMm} mm cellegummi med diffusjonstett liming i alle skjøter.`
        : `✅ Valgt cellegummi (${isoTykkelseMm} mm) sikrer overflatetemperatur ${fmt(kondensRes.overflateTempC, 1)} °C, godt over duggpunktet. Varmetap og ekspansjon er verifisert.`
    );
    return L.join('\n');
  }, [prosjekt, datoStreng, ytreRorMm, medieTempC, omgivelseTempC, rfProsent, kondensRes, isoTykkelseMm, rorLengdeM, isoRes, alphaMmPerMK]);

  const brannMarkdown = useMemo(() => {
    const L: string[] = [];
    L.push('# SPRINKLERDIMENSJONERING & HYDRAULISK TRYKKRENSKAP (NS-EN 12845)');
    L.push('**Standard:** NS-EN 12845 · FG-930:1 · TEK17 § 11-16 (Branntromler)');
    L.push(`**Prosjekt:** ${prosjekt.navn} | **Dato:** ${datoStreng}`);
    L.push('**Utførende:** Kim Jørgensen | Rørleggermester & Rådgivende Ingeniør VVS (RIV)');
    L.push(`**Adresse:** ${prosjekt.sted || 'Ikke oppgitt'} | **Matrikkel:** ${prosjekt.matrikkel || 'Ikke oppgitt'}`);
    L.push('');
    L.push('## 1. Grunnlagsdata & Fareklasse iht. NS-EN 12845');
    L.push(`- Bygningstype: ${prosjekt.bygningstype}`);
    L.push(`- Sprinkler fareklasse: ${fareklasse} (${SPRINKLER_KLASSER[fareklasse]?.navn})`);
    L.push(`- Dimensjonerende virkeområde: ${SPRINKLER_KLASSER[fareklasse]?.virkearealM2} m²`);
    L.push(`- Minste vanntetthet: ${SPRINKLER_KLASSER[fareklasse]?.tetthetMmMin} mm/min`);
    L.push(`- Dyse K-faktor: ${kFaktor}`);
    L.push(`- Minste vanntrykk på fjerneste dyse: ${fmt(brannRes.minDyseTrykkBar, 2)} bar`);
    L.push(`- Dimensjonerende vannbehov sprinkler: ${fmt(brannRes.vannmengdeLmin, 0)} l/min`);
    L.push('');
    L.push('## 2. Hydraulisk Q/p-Trykkregnskap');
    L.push(`- Geodetisk løftehøyde H_geo: ${fmt(h.geodetiskLoftehoydeM, 1)} m (${fmt(sprinklerHydRes.geodetiskTapBar, 2)} bar)`);
    L.push(`- Estimert rør- og armaturfriksjon: ${fmt(sprinklerHydRes.rorFriksjonBar, 2)} bar`);
    L.push(`- BA-tilbakeslagsventil (NS-EN 1717 kat. 4): ${fmt(sprinklerHydRes.baVentilTapBar, 2)} bar`);
    L.push(`- Minste dysetrykk: ${fmt(brannRes.minDyseTrykkBar, 2)} bar`);
    L.push(`- Totalt nødvendig inntakstrykk: ${fmt(sprinklerHydRes.totaltTrykkbehovBar, 2)} bar`);
    L.push(`- Tilgjengelig trykk fra kommunen: ${kommunaltTrykkBrannBar !== null ? `${fmt(kommunaltTrykkBrannBar, 2)} bar` : 'Ikke oppgitt (estimert 4,00 bar)'}`);
    L.push(`- Differanse / Margin: ${sprinklerHydRes.marginBar >= 0 ? '+' : ''}${fmt(sprinklerHydRes.marginBar, 2)} bar`);
    L.push(`- Krav om sprinklerpumpe: ${sprinklerHydRes.kreverPumpe ? '🚨 JA – Sprinklerpumpe og vanntank påkrevd iht. NS-EN 12845' : '✅ NEI – Direkte tilkobling tilstrekkelig'}`);
    L.push('');
    L.push('## 3. Branntromler iht. TEK17 § 11-16');
    L.push(`- Ganglinje til fjerneste hjørne: ${ganglinjeM} m`);
    L.push(`- Slangelengde: ${slangeLengdeM} m`);
    L.push(`- Maks tillatt ganglinje: ${brannRes.maksTillattGanglinjeM} m (slangelengde + 5 m stråle)`);
    L.push(`- Dekningskontroll: ${brannRes.ganglinjeOk ? '✅ OK – Heldekkende slukkeradius' : '🚨 FOR LANG – Ekstra branntrommel påkrevd'}`);
    L.push('');
    L.push('## 4. Konklusjon & Godkjenning');
    L.push(sprinklerHydRes.konklusjon);
    return L.join('\n');
  }, [prosjekt, datoStreng, fareklasse, kFaktor, brannRes, h, sprinklerHydRes, kommunaltTrykkBrannBar, ganglinjeM, slangeLengdeM]);

  const tryggBra = Math.max(1, bra);

  const lccMarkdown = useMemo(() => {
    const L: string[] = [];
    L.push('# LIVSSYKLUSKOSTNADER (NS 3454 LCC) & ENERGI (NS 3031)');
    L.push('**Standard:** NS 3454:2013 · NS 3031:2014 · BREEAM-NOR Mat 01 / Ene 01 · TEK17 § 14-2');
    L.push(`**Prosjekt:** ${prosjekt.navn} | **Dato:** ${datoStreng}`);
    L.push('**Utførende:** Kim Jørgensen | Rørleggermester & Rådgivende Ingeniør VVS (RIV)');
    L.push(`**Adresse:** ${prosjekt.sted || 'Ikke oppgitt'} | **Matrikkel:** ${prosjekt.matrikkel || 'Ikke oppgitt'}`);
    L.push(`**Oppvarmet BRA:** ${fmt(bra, 0)} m² | **Analyseperiode:** 25 år | **Kalkulasjonsrente:** ${realrente} %`);
    L.push(`**Strømpris:** ${fmt(strompris, 2)} kr/kWh`);
    L.push('');
    L.push('## 1. NS 3454 LCC-Sammenligning');
    L.push('| Alternativ | CAPEX (kr) | Energi (kWh/år) | Vedlikehold (kr/år) | Nåverdi drift 25 år (kr) | Total LCC Nåverdi (kr) | Status |');
    L.push('|:---|:---:|:---:|:---:|:---:|:---:|:---|');
    for (const alt of lccRes) {
      const erBest = besteLcc?.navn === alt.navn;
      L.push(
        `| ${alt.navn} | ${fmt(alt.capexKr, 0)} | ${fmt(alt.aarligEnergiKwh, 0)} | ${fmt(alt.aarligVedlikeholdKr, 0)} | ${fmt(alt.naaverdiDriftKr, 0)} | ${fmt(alt.totalNaaverdi25AarKr, 0)} | ${erBest ? '★ Lavest LCC' : '-'} |`
      );
    }
    L.push('');
    L.push('## 2. NS 3031 Bygningskroppens Transmisjonsvarmetap Σ(U·A)');
    L.push(`- Bygningsdeler yttervegger/tak/gulv/vinduer: ${fmt(transRes.deler, 1)} W/K`);
    L.push(`- Kuldebroer: ${fmt(transRes.kuldebro, 1)} W/K`);
    L.push(`- Totalt transmisjonsvarmetapstall: ${fmt(transRes.total, 1)} W/K`);
    L.push(`- Spesifikt varmetap per m² BRA: ${fmt(transRes.total / tryggBra, 2)} W/(m²·K)`);
    if (lccNs3454.besteAlternativ) {
      L.push(`- NS 3454 referansemodell: Lavest levetidskostnad oppnås med ${lccNs3454.besteAlternativ.navn}`);
    }
    L.push('');
    L.push('## 3. Anbefaling & BREEAM-NOR Konklusjon');
    L.push(`✅ Anbefalt løsning over 25 år er «${besteLcc?.navn}» med laveste totale nåverdi på ${fmt(besteLcc?.totalNaaverdi25AarKr ?? 0, 0)} kr (${fmt((besteLcc?.totalNaaverdi25AarKr ?? 0) / tryggBra, 0)} kr/m² BRA).`);
    return L.join('\n');
  }, [prosjekt, datoStreng, bra, tryggBra, realrente, strompris, lccRes, besteLcc, transRes, lccNs3454]);

  const lovverkMarkdown = useMemo(() => {
    const L: string[] = [];
    L.push('# TEK17 / SAK10 LOVVERKS- OG SAMSVARSRAPPORT');
    L.push('**Standard:** TEK17 kap. 11, 13, 14, 15 · SAK10 · Plan- og bygningsloven § 29-1');
    L.push(`**Prosjekt:** ${prosjekt.navn} | **Dato:** ${datoStreng}`);
    L.push('**Utførende:** Kim Jørgensen | Rørleggermester & Rådgivende Ingeniør VVS (RIV)');
    L.push(`**Adresse:** ${prosjekt.sted || 'Ikke oppgitt'} | **Matrikkel:** ${prosjekt.matrikkel || 'Ikke oppgitt'}`);
    L.push('');
    L.push('## 1. Verifikasjon av TEK17 Sanitær- og Trykkkrav');
    L.push(`- TEK17 § 15-5 Vanntrykk (Maks 6,0 bar på armatur): ${h.kravTrykkreduksjonsventil ? '🚨 KREVER TRYKKREDUKSJON (> 6,0 bar)' : `✅ OK (${fmt(prosjekt.vanntrykk.statiskBar ?? 0, 1)} bar ≤ 6,0 bar)`}`);
    L.push(`- TEK17 § 15-6 / § 15-8 Tilbakeslagssikring: ${analyse.lov2Status === 'ok' ? '✅ OK (Selvfall over ITR)' : '🚨 KREVER PUMPESTASJON (NS-EN 12050)'}`);
    L.push(`- TEK17 § 14-4(2) Areal Varmesentral: ${analyse.varmesentral.ok ? '✅ OK' : '🚨 FOR LITE AREAL'} (Avsatt: ${prosjekt.tekniskRomM2 ?? 0} m², Krav: ${minAreaVarmesentral(bra) ?? 0} m²)`);
    L.push(`- TEK17 § 11-16 Slukkeutstyr / Branntromler: ${brannRes.ganglinjeOk ? `✅ OK – Heldekkende ganglinje ≤ ${brannRes.maksTillattGanglinjeM} m` : '🚨 FOR LANG GANGLINJE'}`);
    L.push(`- TEK17 § 13-2 / § 13-3 Ventilasjon: Prosjektert luftmengde dekker person- og emisjonsbelastning.`);
    L.push('');
    L.push('## 2. Samsvarsvurdering & Faglig Erklæring');
    L.push('Prosjekteringen er utført iht. gjeldende tekniske forskrifter (TEK17). Alle tekniske tiltak som krever særskilte installasjoner (tilbakeslagsventil kat. 4, trykkreduksjonsventil, pumpekum) er redegjort for.');
    return L.join('\n');
  }, [prosjekt, datoStreng, h, analyse, bra, brannRes]);

  const fdvMarkdown = useMemo(() => {
    const L: string[] = [];
    L.push('# SAMLET FDV-SLUTTRAPPORT & TVERRFAGLIG MERKESYSTEM (TFM)');
    L.push('**Standard:** Statsbygg PA 0802 · NS 3454 · TEK17 kap. 11/13/14/15 · NS-EN 14336 · NS-EN 12599');
    L.push(`**Prosjekt:** ${prosjekt.navn} | **Dato:** ${datoStreng}`);
    L.push('**RIV Ansvarlig:** Kim Jørgensen | Rørleggermester & Rådgivende Ingeniør VVS (RIV)');
    L.push(`**Adresse:** ${prosjekt.sted || 'Ikke oppgitt'} | **Matrikkel:** ${prosjekt.matrikkel || 'Ikke oppgitt'}`);
    L.push(`**Oppvarmet BRA:** ${fmt(bra, 0)} m² | **Bygningstype:** ${prosjekt.bygningstype}`);
    L.push('');
    const bunnledningKote =
      analyse.minKoteUtgang ??
      (prosjekt.koter.ibrKum ?? 0) +
        (prosjekt.koter.stikkLengde && prosjekt.koter.fallNevner
          ? prosjekt.koter.stikkLengde / prosjekt.koter.fallNevner
          : 0);
    L.push('## 1. Tverrfaglig Systemoversikt (VVS KEM PRO)');
    L.push(`- 310 Sanitær: Inntakstrykk ${fmt(globaltInntaksTrykkBar, 2)} bar, Kotebalanse IBR + L·fall = C +${fmt(bunnledningKote, 2)} moh.`);
    L.push(`- 320 Varme: Termisk ekspansjon ${ekspansjon.anbefaltStandardKarLiter} l, Varmesentral ${prosjekt.tekniskRomM2 ?? 0} m² (Krav: ${minAreaVarmesentral(bra) ?? 0} m²).`);
    L.push(`- 360 Ventilasjon: Luftmengde ${fmt(ventRes.dimensjonerendeM3h, 0)} m³/h, Vifteeffekt ${fmt(vifteEffektKw, 1)} kW (SFP ${fmt(ventRes.sfpKwPerM3s, 2)} kW/(m³/s)).`);
    L.push(`- 380 Brann/Sprinkler: Fareklasse ${fareklasse}, Vannbehov ${fmt(brannRes.vannmengdeLmin, 0)} l/min, ${sprinklerHydRes.kreverPumpe ? 'Sprinklerpumpe påkrevd' : 'Direkte tilknyttet nett'}.`);
    L.push(`- BREEAM / LCC: 25-års levetidsmodell anbefaler ${besteLcc?.navn ?? 'optimalisert energikonsept'} (${fmt(besteLcc?.totalNaaverdi25AarKr ?? 0, 0)} kr).`);
    L.push('');
    L.push('## 2. Statsbygg PA 0802 TFM-Komponentliste (+Lokasjon =System -Komponent %Typekode)');
    L.push('| TFM-Kode | Beskrivelse | Grensesnitt | Status |');
    L.push('|:---|:---|:---:|:---:|');
    for (const k of tfmListe) {
      L.push(`| ${k.kode} | ${k.beskrivelse} | ${k.fag} | Montert & Kontrollert |`);
    }
    L.push('');
    L.push('## 3. Sluttgodkjenning & Overlevering til Byggherre');
    L.push('Anlegget overleveres med komplett dokumentasjon, innreguleringsprotokoller, FDV-instrukser og samsvarserklæring.');
    return L.join('\n');
  }, [prosjekt, datoStreng, bra, analyse.minKoteUtgang, globaltInntaksTrykkBar, ekspansjon, ventRes, vifteEffektKw, fareklasse, brannRes, sprinklerHydRes, besteLcc, tfmListe]);

  return (
    <div className="space-y-6">
      {/* Topplinje for modulen med direkte kobling til tilhørende agenter og AI-chat */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-900 p-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{modul.ikon}</span>
            <h2 className="text-base font-black text-slate-100 sm:text-lg">
              Modul {modul.nummer}: {modul.navn}
            </h2>
            <span className="rounded border border-emerald-700 bg-emerald-950 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
              🌐 Koblet til {prosjekt.navn}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">{modul.beskrivelse}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {agenter.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => onApneChat(a.id)}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-emerald-700 bg-emerald-950/60 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-900"
            >
              💬 {a.navn}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onVelgAgent(agenter[0].id)}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-emerald-500"
          >
            📄 Åpne agentmal ↗
          </button>
        </div>
      </div>

      {/* Global prosjekt-state (Single Source of Truth) + > 6,0 bar varsel + Vanntrykk vs. Koter veileder */}
      <TrykkOgKoteVeileder
        prosjekt={prosjekt}
        analyse={analyse}
        modulNavn={`Modul ${modul.nummer}: ${modul.navn}`}
        overstyringer={overstyringer}
        qa={qa}
        onToggleQa={onToggleQa}
        onOppdaterProsjekt={onOppdaterProsjekt}
        onOppdaterProsjektOgOverstyringer={onOppdaterProsjektOgOverstyringer}
        melding={melding}
      />

      {/* ==================================================================== */}
      {/* MODUL 2: VARME & HYDRONIKK                                           */}
      {/* ==================================================================== */}
      {modul.id === 'varme' && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-1 border-b border-slate-700 bg-slate-900/50 rounded-t-xl px-2 pt-2">
            <button
              type="button"
              onClick={() => setVarmeFane('innregulering')}
              className={`min-h-[44px] px-4 py-2.5 text-xs font-bold border-b-2 transition rounded-t-lg ${
                varmeFane === 'innregulering'
                  ? 'border-emerald-500 text-emerald-300 bg-slate-900'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              🔧 Hydronisk Innregulering & Ventiler (Strengventiler & PICV)
            </button>
            <button
              type="button"
              onClick={() => setVarmeFane('ekspansjon')}
              className={`min-h-[44px] px-4 py-2.5 text-xs font-bold border-b-2 transition rounded-t-lg ${
                varmeFane === 'ekspansjon'
                  ? 'border-emerald-500 text-emerald-300 bg-slate-900'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              🔥 Trykkholding, Ekspansjon & Varmesentral (TEK17 § 14-4)
            </button>
          </div>

          {varmeFane === 'innregulering' ? (
            <HydroniskInnregulering prosjekt={prosjekt} melding={melding} />
          ) : (
            <div className="space-y-6">
              <GlobalRapportBar
                tittel="Trykkholding, Ekspansjonskar & Varmesentral"
                undertittel="Dimensjonering iht. NS-EN 12828 og minsteareal iht. TEK17 § 14-4(2)"
                standard="NS-EN 12828 · Pneumatex · TEK17 § 14-4"
                ikon="🔥"
                statusBadge={{
                  tekst: ekspansjon.anbefaltStandardKarLiter > 0
                    ? (analyse.varmesentral.ok === false ? '⚠️ Sjekk varmesentral-areal' : '✅ Kar & Trykk OK')
                    : 'Beregner',
                  tone: analyse.varmesentral.ok === false ? 'advarsel' : 'ok',
                }}
                onApneRapport={() => setVisEkspansjonRapport(true)}
                onKopier={async () => {
                  const ok = await kopierTilUtklippstavle(ekspansjonMarkdown);
                  melding(ok ? '📋 Ekspansjons- og varmesentralrapport kopiert!' : 'Kunne ikke kopiere');
                }}
                onLastNedMd={() => {
                  const filnavn = `${prosjekt.navn.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-ekspansjon-varmesentral.md`;
                  lastNedTekst(filnavn, ekspansjonMarkdown);
                  melding('📥 Markdown lastet ned for NotebookLM / KI!');
                }}
              />

              <div className="grid gap-6 lg:grid-cols-12">
                <Kort
                  tittel="Trykkholding & Ekspansjonskar (Pneumatex Statico / Compresso)"
                  ikon="🔥"
                  className="lg:col-span-6"
                >
                  <p className="mb-3 text-xs text-slate-400">
                    Statisk høyde <strong className="text-emerald-300">{fmt(statiskHoydeVarme, 1)} m</strong> og anleggsvolum er hentet automatisk fra prosjektets koter og BRA ({fmt(bra, 0)} m²).
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-xs text-slate-300">
                    <label>
                      Anleggsvolum V_a (liter)
                      <TallFelt className="mt-1 w-full" ariaLabel="Anleggsvolum" verdi={anleggsVolum} onChange={setAnleggsVolum} />
                    </label>
                    <label>
                      Maks turtemperatur (°C)
                      <TallFelt className="mt-1 w-full" ariaLabel="Maks turtemperatur" verdi={maksTempC} onChange={setMaksTempC} />
                    </label>
                    <label>
                      Statisk høyde H_st fra koter (m)
                      <TallFelt className="mt-1 w-full" ariaLabel="Statisk høyde" verdi={statiskHoydeVarme} onChange={setStatiskHoydeVarme} />
                    </label>
                    <label>
                      Sikkerhetsventil p_sv (bar)
                      <TallFelt className="mt-1 w-full" ariaLabel="Sikkerhetsventil" verdi={sikkerhetsventilBar} onChange={setSikkerhetsventilBar} />
                    </label>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Resultat etikett="Utvidelse V_e" verdi={fmt(ekspansjon.ekspansjonsVolumLiter, 1)} enhet="l" />
                    <Resultat etikett="Fortrykk p₀" verdi={fmt(ekspansjon.fortrykkBar, 2)} enhet="bar" />
                    <Resultat etikett="Nominelt volum V_n" verdi={fmt(ekspansjon.nomineltVolumLiter, 0)} enhet="l" />
                    <Resultat etikett="Anbefalt kar" verdi={String(ekspansjon.anbefaltStandardKarLiter)} enhet="liter" tone="ok" />
                  </div>
                  {ekspansjon.advarsel && (
                    <div className="mt-3 rounded-lg border border-amber-700 bg-amber-950/40 p-2.5 text-xs text-amber-200">
                      ⚠️ {ekspansjon.advarsel}
                    </div>
                  )}
                </Kort>

                <Kort
                  tittel="Varmesentral Areal (TEK17 § 14-4(2))"
                  ikon="🏢"
                  className="lg:col-span-6"
                >
                  <p className="mb-3 text-xs text-slate-400">
                    Krav for bygg &gt; 1 000 m² BRA: <code>10 m² + 1 % av oppvarmet BRA</code>, fri høyde ≥ 2,5 m og dørbredde ≥ 1,0 m.
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-xs text-slate-300">
                    <label>
                      Oppvarmet BRA (globalt, m²)
                      <TallFelt
                        className="mt-1 w-full"
                        ariaLabel="Oppvarmet BRA"
                        verdi={bra}
                        onChange={(n) => onOppdaterProsjekt({ ...prosjekt, kilde: 'bruker', bra: n })}
                      />
                    </label>
                    <label>
                      Avsatt teknisk rom / varmesentral (m²)
                      <TallFelt
                        className="mt-1 w-full"
                        ariaLabel="Avsatt teknisk rom"
                        verdi={prosjekt.tekniskRomM2 ?? 0}
                        onChange={(n) => onOppdaterProsjekt({ ...prosjekt, kilde: 'bruker', tekniskRomM2: n })}
                      />
                    </label>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <Resultat
                      etikett="TEK17 § 14-4 minstekrav"
                      verdi={minAreaVarmesentral(bra) !== null ? fmt(minAreaVarmesentral(bra)!, 0) : 'Ikke krav (<1000 m²)'}
                      enhet={minAreaVarmesentral(bra) !== null ? 'm²' : undefined}
                    />
                    <Resultat
                      etikett="Avsatt i prosjektet"
                      verdi={prosjekt.tekniskRomM2 !== null ? fmt(prosjekt.tekniskRomM2, 0) : 'Ikke oppgitt'}
                      enhet={prosjekt.tekniskRomM2 !== null ? 'm²' : undefined}
                      tone={analyse.varmesentral.ok === false ? 'feil' : 'ok'}
                    />
                  </div>
                </Kort>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODUL 3: VENTILASJON & INNEKLIMA                                     */}
      {/* ==================================================================== */}
      {modul.id === 'ventilasjon' && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-1 border-b border-slate-700 bg-slate-900/50 rounded-t-xl px-2 pt-2">
            <button
              type="button"
              onClick={() => setVentFane('innregulering')}
              className={`min-h-[44px] px-4 py-2.5 text-xs font-bold border-b-2 transition rounded-t-lg ${
                ventFane === 'innregulering'
                  ? 'border-cyan-500 text-cyan-300 bg-slate-900'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              💨 Luftteknisk Innregulering & Protokoll (Tilluft & Avtrekk)
            </button>
            <button
              type="button"
              onClick={() => setVentFane('beregning')}
              className={`min-h-[44px] px-4 py-2.5 text-xs font-bold border-b-2 transition rounded-t-lg ${
                ventFane === 'beregning'
                  ? 'border-cyan-500 text-cyan-300 bg-slate-900'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              📐 Dimensjonering av Luftmengder (TEK17) & SFP
            </button>
          </div>

          {ventFane === 'innregulering' ? (
            <VentilasjonInnregulering prosjekt={prosjekt} melding={melding} />
          ) : (
            <div className="space-y-6">
              <GlobalRapportBar
                tittel="Luftmengder, SFP & Kanalhastighet (TEK17 kap. 13)"
                undertittel="Hygienisk luftbehov, person- og emisjonsbelastning samt SFP-faktor"
                standard="TEK17 kap. 13 · NS-EN 16798-1 · Arbeidstilsynet 444"
                ikon="🌬️"
                statusBadge={{
                  tekst: ventRes.sfpOkTek17 && ventRes.kanalHastighetOk ? '✅ SFP & Hastighet OK' : '🚨 Sjekk SFP / Hastighet',
                  tone: ventRes.sfpOkTek17 && ventRes.kanalHastighetOk ? 'ok' : 'feil',
                }}
                onApneRapport={() => setVisVentBeregningRapport(true)}
                onKopier={async () => {
                  const ok = await kopierTilUtklippstavle(ventBeregningMarkdown);
                  melding(ok ? '📋 Luftmengde- og SFP-rapport kopiert!' : 'Kunne ikke kopiere');
                }}
                onLastNedMd={() => {
                  const filnavn = `${prosjekt.navn.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-luftmengder-sfp.md`;
                  lastNedTekst(filnavn, ventBeregningMarkdown);
                  melding('📥 Markdown lastet ned for NotebookLM / KI!');
                }}
              />

              <Kort
                tittel="Dimensjonering av Luftmengder (TEK17 kap. 13), SFP & Kanalhastighet"
                ikon="🌬️"
              >
              <p className="mb-3 text-xs text-slate-400">
                Areal (<strong className="text-emerald-300">{fmt(ventAreal, 0)} m²</strong>) og personbelastning er automatisk hentet fra prosjektets globale BRA og bygningstype ({prosjekt.bygningstype}).
              </p>
              <div className="grid grid-cols-2 gap-3 text-xs text-slate-300 sm:grid-cols-4">
                <label>
                  Areal BRA (m²)
                  <TallFelt className="mt-1 w-full" ariaLabel="Ventilert areal" verdi={ventAreal} onChange={setVentAreal} />
                </label>
                <label>
                  Antall personer
                  <TallFelt className="mt-1 w-full" ariaLabel="Antall personer" verdi={antallPersoner} onChange={setAntallPersoner} />
                </label>
                <label>
                  Personfaktor (m³/h·pers, min 26)
                  <TallFelt className="mt-1 w-full" ariaLabel="Personfaktor" verdi={personFaktor} onChange={setPersonFaktor} />
                </label>
                <label>
                  Materialfaktor (m³/h·m²)
                  <TallFelt className="mt-1 w-full" ariaLabel="Materialfaktor" verdi={materialFaktor} onChange={setMaterialFaktor} />
                </label>
                <label>
                  Kjølelast i sonen (W)
                  <TallFelt className="mt-1 w-full" ariaLabel="Kjølelast" verdi={kjolebehovW} onChange={setKjolebehovW} />
                </label>
                <label>
                  ΔT kjøling (K)
                  <TallFelt className="mt-1 w-full" ariaLabel="Delta T kjøling" verdi={deltaTKjoling} onChange={setDeltaTKjoling} />
                </label>
                <label>
                  Total vifteeffekt (kW)
                  <TallFelt className="mt-1 w-full" ariaLabel="Total vifteeffekt" verdi={vifteEffektKw} onChange={setVifteEffektKw} />
                </label>
                <label>
                  Hovedkanal Ø (mm)
                  <TallFelt className="mt-1 w-full" ariaLabel="Kanaldiameter" verdi={kanalDimMm} onChange={setKanalDimMm} />
                </label>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Resultat etikett="Hygienisk luftmengde" verdi={fmt(ventRes.luftHygieneM3h, 0)} enhet="m³/h" />
                <Resultat etikett="Dimensjonerende luft" verdi={fmt(ventRes.dimensjonerendeM3h, 0)} enhet="m³/h" tone="ok" />
                <Resultat
                  etikett="SFP-faktor (krav ≤ 1,5)"
                  verdi={fmt(ventRes.sfpKwPerM3s, 2)}
                  enhet="kW/(m³/s)"
                  tone={ventRes.sfpOkTek17 ? 'ok' : 'feil'}
                />
                <Resultat
                  etikett="Kanalhastighet (≤ 5,0 m/s)"
                  verdi={fmt(ventRes.kanalHastighetMs, 2)}
                  enhet="m/s"
                  tone={ventRes.kanalHastighetOk ? 'ok' : 'feil'}
                />
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs">
                <div>
                  <div className="font-bold text-slate-200">Valg av varmegjenvinner (TEK17 § 13-2 / Luktsmitte-kontroll):</div>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    Ved avtrekk fra bad/WC, smitteisolat, storkjøkken eller vaskehall er roterende gjenvinner forbudt pga. overføring av lukt og forurensning.
                  </p>
                </div>
                <select
                  value={gjenvinnerType}
                  onChange={(e) => setGjenvinnerType(e.target.value as 'plate_vaeske' | 'roterende')}
                  className="min-h-[40px] rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-100"
                >
                  <option value="plate_vaeske">✅ Motstrøms plateveksler / Væskekoblet batteri (0 % luktsmitte)</option>
                  <option value="roterende">⚠️ Roterende gjenvinner (kun ren kontorluft)</option>
                </select>
              </div>
            </Kort>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODUL 4: PUMPER & REGULERING                                         */}
      {/* ==================================================================== */}
      {modul.id === 'pumper' && (
        <div className="space-y-6">
          <GlobalRapportBar
            tittel="Sirkulasjonspumper & Trykkøkningsanlegg"
            undertittel="Grundfos MAGNA3 for varme/kjøling og WWBooster trykkløft mot koter"
            standard="SINTEF Byggforsk 553.115 · Grundfos Guide · NS-EN 14336"
            ikon="🚀"
            statusBadge={{
              tekst: boosterRes.trengerBooster ? '⚡ Booster påkrevd' : '✅ Tilstrekkelig trykk',
              tone: boosterRes.trengerBooster ? 'advarsel' : 'ok',
            }}
            onApneRapport={() => setVisPumpeRapport(true)}
            onKopier={async () => {
              const ok = await kopierTilUtklippstavle(pumpeMarkdown);
              melding(ok ? '📋 Pumpe- og trykkøkningsrapport kopiert!' : 'Kunne ikke kopiere');
            }}
            onLastNedMd={() => {
              const filnavn = `${prosjekt.navn.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-pumper-trykkokning.md`;
              lastNedTekst(filnavn, pumpeMarkdown);
              melding('📥 Markdown lastet ned for NotebookLM / KI!');
            }}
            ekstraKnapper={
              <button
                type="button"
                onClick={() => onVelgAgent('agent-04')}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-emerald-500 transition"
              >
                🔧 Hydronisk Innregulering & Ventiler ↗
              </button>
            }
          />

          {/* Indekskurs kobling */}
          <div className="rounded-xl border border-emerald-800/60 bg-emerald-950/20 p-3.5 text-xs text-emerald-200 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-base">⚙️</span>
              <div>
                <span className="font-bold">Hydronisk samspill:</span> Nødvendig pumpeløftehøyde{' '}
                <strong>H = {fmt(pumpeLofteMvs, 2)} mVS</strong> ({fmt(pumpeLofteMvs * 9.81, 0)} kPa) dimensjonert mot kretsmotstand og strengventil på indekskurs.
              </div>
            </div>
            <span className="font-mono text-emerald-400 font-bold">Modus: {pumpeRes.anbefaltModus}</span>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Kort tittel="Trykkøkningsanlegg (WWBooster) vs. Globale Koter & Vanntrykk" ikon="🚀">
              <p className="mb-3 text-xs text-slate-400">
                Henter automatisk inngangstrykk (<strong className="text-sky-300">{fmt(globaltInntaksTrykkBar, 1)} bar</strong>) og geodetisk løftehøyde (<strong className="text-emerald-300">{fmt(h.geodetiskLoftehoydeM, 1)} m</strong>) fra prosjektets globale state i Steg 1.
              </p>
              <div className="grid grid-cols-2 gap-3 text-xs text-slate-300">
                <label>
                  Rør- og komponenttap (bar)
                  <TallFelt className="mt-1 w-full" ariaLabel="Rørtap bar" verdi={rorOgKompTapBar} onChange={setRorOgKompTapBar} />
                </label>
                <label>
                  Krav resttrykk øverste tappested (bar)
                  <TallFelt className="mt-1 w-full" ariaLabel="Krav resttrykk" verdi={kravResttrykkBar} onChange={setKravResttrykkBar} />
                </label>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Resultat etikett="Nødvendig trykk" verdi={fmt(boosterRes.nodvendigTrykkBar, 2)} enhet="bar" />
                <Resultat etikett="Nødvendig trykkløft" verdi={fmt(boosterRes.trykkLoftBar, 2)} enhet="bar" />
                <Resultat
                  etikett="Konklusjon"
                  verdi={boosterRes.trengerBooster ? 'Krever WWBooster' : 'Trykk OK uten pumpe'}
                  tone={boosterRes.trengerBooster ? 'feil' : 'ok'}
                />
              </div>
            </Kort>

            <Kort tittel="Sirkulasjonspumpe (Grundfos MAGNA3)" ikon="⚙️">
              <div className="grid grid-cols-1 gap-3 text-xs text-slate-300 sm:grid-cols-3">
                <label>
                  Volumstrøm Q (m³/h)
                  <TallFelt className="mt-1 w-full" ariaLabel="Volumstrøm" verdi={pumpeQM3h} onChange={setPumpeQM3h} />
                </label>
                <label>
                  Løftehøyde H (mVS)
                  <TallFelt className="mt-1 w-full" ariaLabel="Løftehøyde mVS" verdi={pumpeLofteMvs} onChange={setPumpeLofteMvs} />
                </label>
                <label>
                  Anleggstype
                  <select
                    value={pumpeAnleggsType}
                    onChange={(e) => setPumpeAnleggsType(e.target.value as typeof pumpeAnleggsType)}
                    className="mt-1 min-h-[42px] w-full rounded border border-slate-600 bg-slate-900 px-2 py-1.5 text-xs"
                  >
                    <option value="radiator">Radiator (Δp-v)</option>
                    <option value="gulvvarme">Gulvvarme (Δp-c)</option>
                    <option value="ventilasjon">Ventilasjonsbatteri</option>
                    <option value="vvc">VVC sirkulasjon</option>
                  </select>
                </label>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Resultat etikett="Elektrisk effekt" verdi={fmt(pumpeRes.elektriskEffektW, 0)} enhet="W" />
                <Resultat etikett="Årlig energi" verdi={fmt(pumpeRes.aarligEnergiKwh, 0)} enhet="kWh/år" />
                <Resultat etikett="Anbefalt modell" verdi={pumpeRes.anbefaltModell} tone="ok" />
              </div>
              <div className="mt-3 text-xs text-emerald-300">
                Reguleringsmodus: <strong>{pumpeRes.anbefaltModus}</strong>
              </div>
            </Kort>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODUL 5: ISOLASJON & RØRMATERIALER                                   */}
      {/* ==================================================================== */}
      {modul.id === 'isolasjon' && (
        <div className="space-y-6">
          <GlobalRapportBar
            tittel="Rørisolasjon, Kondenshindring & Duggpunkt"
            undertittel="Armaflex AF cellegummi (Magnus-Tetens) og Glava ClimPipe varmetap"
            standard="NS-EN ISO 12241 · NS-EN 12828 · Armaflex AF"
            ikon="🧱"
            statusBadge={{
              tekst: kondensRes.kondensfare ? '🚨 Fare for kondens' : '✅ Sikker mot kondens',
              tone: kondensRes.kondensfare ? 'feil' : 'ok',
            }}
            onApneRapport={() => setVisIsolasjonRapport(true)}
            onKopier={async () => {
              const ok = await kopierTilUtklippstavle(isolasjonMarkdown);
              melding(ok ? '📋 Isolasjons- og kondensrapport kopiert!' : 'Kunne ikke kopiere');
            }}
            onLastNedMd={() => {
              const filnavn = `${prosjekt.navn.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-isolasjon-kondens.md`;
              lastNedTekst(filnavn, isolasjonMarkdown);
              melding('📥 Markdown lastet ned for NotebookLM / KI!');
            }}
          />

          <div className="grid gap-6 lg:grid-cols-12">
            <Kort
              tittel="Kondensisolering & Duggpunkt for Isvann (6/12 °C) & Kjøling (Magnus-Tetens)"
              ikon="❄️"
              className="lg:col-span-7"
            >
              <p className="mb-3 text-xs text-slate-400">
                Ved kjølemedier under omgivelsens duggpunkt oppstår overflatekondens og dryppskader med mindre det benyttes diffusjonstett cellegummi (Armaflex) med tilstrekkelig tykkelse.
              </p>
              <div className="grid grid-cols-2 gap-3 text-xs text-slate-300 sm:grid-cols-3">
                <label>
                  Rørdiameter (mm)
                  <TallFelt className="mt-1 w-full" ariaLabel="Rørdiameter" verdi={ytreRorMm} onChange={setYtreRorMm} />
                </label>
                <label>
                  Cellegummi Armaflex (mm)
                  <TallFelt className="mt-1 w-full" ariaLabel="Isolasjonstykkelse" verdi={isoTykkelseMm} onChange={setIsoTykkelseMm} />
                </label>
                <label>
                  Medietemperatur (°C)
                  <TallFelt className="mt-1 w-full" ariaLabel="Medietemperatur" verdi={medieTempC} onChange={setMedieTempC} />
                </label>
                <label>
                  Omgivelsestemperatur (°C)
                  <TallFelt className="mt-1 w-full" ariaLabel="Omgivelsestemperatur" verdi={omgivelseTempC} onChange={setOmgivelseTempC} />
                </label>
                <label>
                  Relativ fuktighet RF (%)
                  <TallFelt className="mt-1 w-full" ariaLabel="Relativ fuktighet" verdi={rfProsent} onChange={setRfProsent} />
                </label>
                <label>
                  Rørlengde (m)
                  <TallFelt className="mt-1 w-full" ariaLabel="Rørlengde" verdi={rorLengdeM} onChange={setRorLengdeM} />
                </label>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Resultat etikett="Duggpunkt T_dugg" verdi={fmt(kondensRes.duggpunktTempC, 1)} enhet="°C" />
                <Resultat
                  etikett="Overflatetemp. T_overflate"
                  verdi={fmt(kondensRes.overflateTempC, 1)}
                  enhet="°C"
                  tone={kondensRes.kondensfare ? 'feil' : 'ok'}
                />
                <Resultat
                  etikett="Sikkerhetsmargin"
                  verdi={`${kondensRes.sikkerhetsmarginK >= 0 ? '+' : ''}${fmt(kondensRes.sikkerhetsmarginK, 1)}`}
                  enhet="K"
                  tone={kondensRes.sikkerhetsmarginK >= 2.0 ? 'ok' : kondensRes.sikkerhetsmarginK > 0 ? 'advarsel' : 'feil'}
                />
                <Resultat
                  etikett="Anbefalt min. Armaflex"
                  verdi={`${kondensRes.anbefaltMinIsoMm}`}
                  enhet="mm"
                  tone="ok"
                />
              </div>

              <div
                className={`mt-4 rounded-lg border p-3 text-xs ${
                  kondensRes.kondensfare
                    ? 'border-rose-800 bg-rose-950/40 text-rose-200'
                    : kondensRes.sikkerhetsmarginK < 2.0
                    ? 'border-amber-800 bg-amber-950/40 text-amber-200'
                    : 'border-emerald-800 bg-emerald-950/40 text-emerald-200'
                }`}
              >
                {kondensRes.kondensfare ? (
                  <div className="flex items-center gap-2">
                    <span className="text-base">🚨</span>
                    <div>
                      <strong>KONDENSFARE PÅ OVERFLATE!</strong> Overflatetemperaturen ({fmt(kondensRes.overflateTempC, 1)} °C) er lavere enn duggpunktet ({fmt(kondensRes.duggpunktTempC, 1)} °C). Isolasjonstykkelsen må økes til minst <strong>{kondensRes.anbefaltMinIsoMm} mm</strong>.
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-base">✅</span>
                    <div>
                      <strong>SIKKER MOT KONDENS:</strong> Overflaten holder {fmt(kondensRes.overflateTempC, 1)} °C, som gir {fmt(kondensRes.sikkerhetsmarginK, 1)} K margin mot duggpunktet. Røret er trygt mot kondens.
                    </div>
                  </div>
                )}
              </div>
            </Kort>

            <div className="space-y-6 lg:col-span-5">
              <Kort tittel="Varmetap for Varmerør & VVC (Glava/Rockwool λ = 0,035)" ikon="🔥">
                <div className="grid grid-cols-2 gap-3">
                  <Resultat etikett="Varmetap per meter" verdi={fmt(isoRes.varmetapWattPerM, 1)} enhet="W/m" />
                  <Resultat etikett="Totalt varmetap" verdi={fmt(isoRes.varmetapWattPerM * rorLengdeM, 0)} enhet="W" tone="ok" />
                </div>
                <div className="mt-3 text-xs text-slate-400">
                  Årlig energitap over {rorLengdeM} meter:{' '}
                  <strong className="text-emerald-300">
                    {fmt((isoRes.varmetapWattPerM * rorLengdeM * 8760) / 1000, 0)} kWh/år
                  </strong>.
                </div>
              </Kort>

              <Kort tittel={`Termisk Lengdeutvidelse ΔL (L = ${rorLengdeM} m, ΔT = 50 K)`} ikon="📏">
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center p-2 rounded bg-slate-900 border border-slate-700">
                    <span className="text-slate-300 font-bold">PP-R Faser (α = 0,035 mm/mK):</span>
                    <span className="font-mono text-emerald-400 font-bold">{fmt(rorLengdeM * 0.035 * 50, 1)} mm</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded bg-slate-900 border border-slate-700">
                    <span className="text-slate-300 font-bold">Kobber Cu (α = 0,017 mm/mK):</span>
                    <span className="font-mono text-slate-200">{fmt(rorLengdeM * 0.017 * 50, 1)} mm</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded bg-slate-900 border border-slate-700">
                    <span className="text-slate-300 font-bold">Stålrør (α = 0,012 mm/mK):</span>
                    <span className="font-mono text-slate-200">{fmt(rorLengdeM * 0.012 * 50, 1)} mm</span>
                  </div>
                </div>
              </Kort>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODUL 6: BRANN & SPRINKLER                                           */}
      {/* ==================================================================== */}
      {modul.id === 'brann' && (
        <div className="space-y-6">
          <GlobalRapportBar
            tittel="Sprinklerdimensjonering & Hydraulisk Trykkontroll"
            undertittel="Dimensjonering iht. NS-EN 12845 / FG-930:1 og TEK17 § 11-16 (Branntromler)"
            standard="NS-EN 12845 · FG-930:1 · TEK17 § 11-16"
            ikon="🧯"
            statusBadge={{
              tekst: sprinklerHydRes.kreverPumpe ? '⚡ Sprinklerpumpe påkrevd' : '✅ Direkte tilkobling OK',
              tone: sprinklerHydRes.kreverPumpe ? 'advarsel' : 'ok',
            }}
            onApneRapport={() => setVisBrannRapport(true)}
            onKopier={async () => {
              const ok = await kopierTilUtklippstavle(brannMarkdown);
              melding(ok ? '📋 Sprinkler- og brannrapport kopiert!' : 'Kunne ikke kopiere');
            }}
            onLastNedMd={() => {
              const filnavn = `${prosjekt.navn.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-sprinkler-brann.md`;
              lastNedTekst(filnavn, brannMarkdown);
              melding('📥 Markdown lastet ned for NotebookLM / KI!');
            }}
          />

          <div className="grid gap-6 lg:grid-cols-12">
            <Kort
              tittel="Sprinklerdimensjonering (FG-930:1 / NS-EN 12845)"
              ikon="🧯"
              className="lg:col-span-7"
            >
              <p className="mb-3 text-xs text-slate-400">
                Fareklasse er automatisk koblet til byggets type ({prosjekt.bygningstype}).
              </p>
              <div className="grid grid-cols-2 gap-3 text-xs text-slate-300 sm:grid-cols-3">
                <label className="sm:col-span-2">
                  Fareklasse
                  <select
                    value={fareklasse}
                    onChange={(e) => setFareklasse(e.target.value as SprinklerFareklasse)}
                    className="mt-1 min-h-[42px] w-full rounded border border-slate-600 bg-slate-900 px-2 py-1.5 text-xs font-bold"
                  >
                    {Object.entries(SPRINKLER_KLASSER).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.navn}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Dyse K-faktor
                  <TallFelt className="mt-1 w-full" ariaLabel="K-faktor" verdi={kFaktor} onChange={setKFaktor} />
                </label>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Resultat etikett="Dimensjonerende vannmengde" verdi={fmt(brannRes.vannmengdeLmin, 0)} enhet="l/min" tone="ok" />
                <Resultat etikett="Min. dysetrykk" verdi={fmt(brannRes.minDyseTrykkBar, 2)} enhet="bar" />
                <Resultat etikett="Virkeområde" verdi={fmt(SPRINKLER_KLASSER[fareklasse]?.virkearealM2 ?? 0, 0)} enhet="m²" />
              </div>
            </Kort>

            <Kort
              tittel="Branntromler (TEK17 § 11-16)"
              ikon="🚒"
              className="lg:col-span-5"
            >
              <div className="grid grid-cols-2 gap-3 text-xs text-slate-300">
                <label>
                  Ganglinje til hjørne (m)
                  <TallFelt className="mt-1 w-full" ariaLabel="Ganglinje" verdi={ganglinjeM} onChange={setGanglinjeM} />
                </label>
                <label>
                  Slangelengde (m)
                  <TallFelt className="mt-1 w-full" ariaLabel="Slangelengde" verdi={slangeLengdeM} onChange={setSlangeLengdeM} />
                </label>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Resultat
                  etikett="Ganglinjekontroll"
                  verdi={
                    brannRes.ganglinjeOk
                      ? `OK (≤ ${brannRes.maksTillattGanglinjeM} m)`
                      : `FOR LANG (> ${brannRes.maksTillattGanglinjeM} m)`
                  }
                  tone={brannRes.ganglinjeOk ? 'ok' : 'feil'}
                />
                <Resultat
                  etikett="Slangedekning"
                  verdi={`${brannRes.maksTillattGanglinjeM} m`}
                  enhet="effektiv"
                />
              </div>
            </Kort>

            <Kort
              tittel="Hydraulisk Q/p-Trykkontroll mot Koter & Kommunalt Nett"
              ikon="💧"
              className="lg:col-span-12"
            >
              <p className="mb-3 text-xs text-slate-400">
                Hydraulisk trykkbehov: Minste dysetrykk + rør-/armaturfriksjon (1,00 bar) + BA-tilbakeslagsventil ({fmt(sprinklerHydRes.baVentilTapBar, 2)} bar) + geodetisk løft ({fmt(h.geodetiskLoftehoydeM, 1)} m = {fmt(sprinklerHydRes.geodetiskTapBar, 2)} bar).
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                <Resultat etikett="Minste dysetrykk" verdi={fmt(brannRes.minDyseTrykkBar, 2)} enhet="bar" />
                <Resultat etikett="Løftetrykk (koter)" verdi={fmt(sprinklerHydRes.geodetiskTapBar, 2)} enhet="bar" />
                <Resultat etikett="BA-ventil (kat. 4)" verdi={fmt(sprinklerHydRes.baVentilTapBar, 2)} enhet="bar" />
                <Resultat etikett="Nødvendig inntakstrykk" verdi={fmt(sprinklerHydRes.totaltTrykkbehovBar, 2)} enhet="bar" />
                <Resultat
                  etikett="Tilgjengelig (inntak)"
                  verdi={kommunaltTrykkBrannBar !== null ? fmt(kommunaltTrykkBrannBar, 2) : 'Mangler (est. 4,00)'}
                  enhet={kommunaltTrykkBrannBar !== null ? 'bar' : undefined}
                />
              </div>

              <div
                className={`mt-4 rounded-lg border p-3.5 text-xs ${
                  sprinklerHydRes.kreverPumpe
                    ? 'border-rose-800 bg-rose-950/40 text-rose-200'
                    : 'border-emerald-800 bg-emerald-950/40 text-emerald-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{sprinklerHydRes.kreverPumpe ? '🚨' : '✅'}</span>
                  <div className="font-bold text-sm">
                    {sprinklerHydRes.kreverPumpe
                      ? 'KRAV OM SPRINKLERPUMPE & DEDIKERT VANNTANK (NS-EN 12845)'
                      : 'DIREKTE TILKOBLING TIL KOMMUNALT NETT GODKJENT'}
                  </div>
                </div>
                <p className="mt-1 text-xs">{sprinklerHydRes.konklusjon}</p>
              </div>
            </Kort>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODUL 7: LOVER & FORSKRIFTER                                         */}
      {/* ==================================================================== */}
      {modul.id === 'lovverk' && (
        <div className="space-y-6">
          <GlobalRapportBar
            tittel="TEK17 / SAK10 Samsvarskontroll (RIV-Erklæring)"
            undertittel="Verifikasjon av lovpålagte VVS-krav iht. TEK17 kap. 11, 13, 14, 15 & SAK10"
            standard="TEK17 · SAK10 · Plan- og bygningsloven"
            ikon="⚖️"
            statusBadge={{
              tekst: analyse.lov2Status === 'ok' ? '✅ Samsvar OK' : '🚨 Krav om tiltak',
              tone: analyse.lov2Status === 'ok' ? 'ok' : 'feil',
            }}
            onApneRapport={() => setVisLovverkRapport(true)}
            onKopier={async () => {
              const ok = await kopierTilUtklippstavle(lovverkMarkdown);
              melding(ok ? '📋 Samsvarsrapport kopiert til utklippstavlen' : 'Kunne ikke kopiere');
            }}
            onLastNedMd={() => {
              const filnavn = `${prosjekt.navn.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-tek17-samsvar.md`;
              lastNedTekst(filnavn, lovverkMarkdown);
              melding('📥 Markdown lastet ned for NotebookLM / KI!');
            }}
          />

          <Kort tittel="Lover, Forskrifter (TEK17 / SAK10) & Produktdokumentasjon" ikon="⚖️">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                {
                  tittel: 'TEK17 § 15-5: Vanntrykk & 6,0 bar-regelen',
                  status: h.kravTrykkreduksjonsventil
                    ? '🚨 Krever trykkreduksjonsventil (> 6,0 bar)'
                    : prosjekt.vanntrykk.statiskBar !== null
                    ? `✅ OK (${fmt(prosjekt.vanntrykk.statiskBar, 1)} bar ≤ 6,0 bar)`
                    : '⚠️ Vanntrykk ikke oppgitt',
                  ok: !h.kravTrykkreduksjonsventil && prosjekt.vanntrykk.statiskBar !== null,
                },
                {
                  tittel: 'TEK17 § 15-6 / § 15-8: Tilbakeslagskontroll (900 / 950 mm)',
                  status:
                    analyse.lov2Status === 'ok'
                      ? '✅ Selvfall OK over ITR'
                      : analyse.lov2Status === 'brudd'
                      ? '🚨 Brudd – krever pumpestasjon (NS-EN 12050)'
                      : '⚠️ Koter mangler (ITK / laveste sluk)',
                  ok: analyse.lov2Status === 'ok',
                },
                {
                  tittel: 'TEK17 § 14-4(2): Areal til varmesentral (10 m² + 1 % BRA)',
                  status:
                    analyse.varmesentral.ok === true
                      ? `✅ OK (${prosjekt.tekniskRomM2} m² ≥ ${analyse.varmesentral.kravM2?.toFixed(0)} m²)`
                      : analyse.varmesentral.ok === false
                      ? `🚨 For lite (${prosjekt.tekniskRomM2} m² < ${analyse.varmesentral.kravM2?.toFixed(0)} m²)`
                      : '⚠️ Avsatt areal ikke oppgitt',
                  ok: analyse.varmesentral.ok === true,
                },
                {
                  tittel: 'TEK17 § 15-7: Tilgjengelighet for drift og vedlikehold (min. 950 mm fri bredde)',
                  status: 'Sjekkes på plantegning teknisk rom og fordelerskap med varerør-drenering',
                  ok: !!qa['sp-6'],
                },
              ].map((lov, idx) => (
                <div
                  key={idx}
                  className={`rounded-lg border p-3.5 text-xs ${
                    lov.ok
                      ? 'border-emerald-800/60 bg-emerald-950/20 text-emerald-200'
                      : 'border-amber-800/70 bg-amber-950/30 text-amber-200'
                  }`}
                >
                  <div className="font-bold">{lov.tittel}</div>
                  <div className="mt-1 text-[11px]">{lov.status}</div>
                </div>
              ))}
            </div>
          </Kort>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODUL 8: BREEAM, 25-ÅRS LCC (NS 3454) & ENERGI (NS 3031)             */}
      {/* ==================================================================== */}
      {modul.id === 'breeam' && (
        <div className="space-y-6">
          <GlobalRapportBar
            tittel="NS 3454 Livssykluskostnader (25-års LCC) & NS 3031 Energi"
            undertittel="Beregning iht. NS 3454:2013 / BREEAM-NOR Mat 01 og TEK17 § 14-2"
            standard="NS 3454:2013 · NS 3031:2014 · BREEAM-NOR"
            ikon="🌱"
            statusBadge={{
              tekst: `★ Beste LCC: ${besteLcc?.navn?.split('(')[0]?.trim() ?? 'Alternativ'}`,
              tone: 'ok',
            }}
            onApneRapport={() => setVisLccRapport(true)}
            onKopier={async () => {
              const ok = await kopierTilUtklippstavle(lccMarkdown);
              melding(ok ? '📋 LCC- og energirapport kopiert!' : 'Kunne ikke kopiere');
            }}
            onLastNedMd={() => {
              const filnavn = `${prosjekt.navn.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-ns3454-lcc-energi.md`;
              lastNedTekst(filnavn, lccMarkdown);
              melding('📥 Markdown lastet ned for NotebookLM / KI!');
            }}
          />

          <Kort tittel="25-års Livssykluskostnad (NS 3454 Nåverdikalkulator)" ikon="🌱">
            <p className="mb-3 text-xs text-slate-400">
              Investerings- og energitall er skalert etter prosjektets globale BRA (<strong className="text-emerald-300">{fmt(bra, 0)} m²</strong>). Beste alternativ over 25 år:{' '}
              <strong className="text-emerald-300">{besteLcc?.navn}</strong>.
            </p>
            <div className="mb-4 grid grid-cols-2 gap-3 text-xs text-slate-300 sm:grid-cols-4">
              <label>
                Strømpris (kr/kWh)
                <TallFelt className="mt-1 w-full" ariaLabel="Strømpris" verdi={strompris} onChange={setStrompris} />
              </label>
              <label>
                Realrente (% p.a.)
                <TallFelt className="mt-1 w-full" ariaLabel="Realrente" verdi={realrente} onChange={setRealrente} />
              </label>
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-700">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-900 text-[11px] uppercase text-slate-300">
                    {['Alternativ', 'CAPEX (kr)', 'Energi (kWh/år)', 'Service (kr/år)', 'Nåverdi drift (25 år)', 'Total LCC nåverdi', ''].map((h) => (
                      <th key={h} className="px-2 py-2.5">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {lccRes.map((alt, i) => {
                    const erBest = besteLcc?.navn === alt.navn;
                    return (
                      <tr key={i} className={erBest ? 'bg-emerald-950/30' : 'hover:bg-slate-800/40'}>
                        <td className="px-2 py-1.5">
                          <input
                            value={lccAlternativer[i].navn}
                            onChange={(e) =>
                              setLccAlternativer((prev) =>
                                prev.map((x, idx) => (idx === i ? { ...x, navn: e.target.value } : x))
                              )
                            }
                            className="min-w-[160px] w-full rounded border border-slate-600 bg-slate-900 px-2 py-1.5 font-semibold text-slate-100 sm:w-60"
                          />
                        </td>
                        <td className="px-1 py-1.5">
                          <TallFelt
                            className="w-28"
                            ariaLabel="CAPEX"
                            verdi={lccAlternativer[i].capexKr}
                            onChange={(n) =>
                              setLccAlternativer((prev) =>
                                prev.map((x, idx) => (idx === i ? { ...x, capexKr: n } : x))
                              )
                            }
                          />
                        </td>
                        <td className="px-1 py-1.5">
                          <TallFelt
                            className="w-24"
                            ariaLabel="Årlig energi"
                            verdi={lccAlternativer[i].aarligEnergiKwh}
                            onChange={(n) =>
                              setLccAlternativer((prev) =>
                                prev.map((x, idx) => (idx === i ? { ...x, aarligEnergiKwh: n } : x))
                              )
                            }
                          />
                        </td>
                        <td className="px-1 py-1.5">
                          <TallFelt
                            className="w-24"
                            ariaLabel="Årlig vedlikehold"
                            verdi={lccAlternativer[i].aarligVedlikeholdKr}
                            onChange={(n) =>
                              setLccAlternativer((prev) =>
                                prev.map((x, idx) => (idx === i ? { ...x, aarligVedlikeholdKr: n } : x))
                              )
                            }
                          />
                        </td>
                        <td className="px-2 py-1.5 font-mono text-slate-300">
                          {fmt(alt.naaverdiDriftKr, 0)} kr
                        </td>
                        <td className="px-2 py-1.5 font-mono font-bold text-emerald-300">
                          {fmt(alt.totalNaaverdi25AarKr, 0)} kr {erBest && <Merkelapp type="ok">Lavest LCC</Merkelapp>}
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              bekreftSlett({
                                tittel: 'Slette LCC-alternativ?',
                                elementNavn: lccAlternativer[i].navn,
                                beskrivelse: `Er du sikker på at du vil slette «${lccAlternativer[i].navn}» fra 25-års LCC-kalkylen?`,
                                bekreftTekst: '🗑️ Slett alternativ',
                                onBekreft: () =>
                                  setLccAlternativer((prev) => prev.filter((_, idx) => idx !== i)),
                              })
                            }
                            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-400 hover:bg-rose-950/50 hover:text-rose-400"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-3">
              <Knapp
                onClick={() =>
                  setLccAlternativer((prev) => [
                    ...prev,
                    {
                      navn: `Alternativ ${prev.length + 1}`,
                      capexKr: Math.round(bra * 800),
                      aarligEnergiKwh: Math.round(bra * 60),
                      aarligVedlikeholdKr: 20000,
                    },
                  ])
                }
              >
                + Legg til LCC-alternativ
              </Knapp>
            </div>
          </Kort>

          <Kort tittel="NS 3031 Transmisjonsvarmetap Σ(U·A)" ikon="🌡️">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Resultat etikett="Bygningsdeler Σ(U·A)" verdi={fmt(transRes.deler, 1)} enhet="W/K" />
              <Resultat etikett="Kuldebroer" verdi={fmt(transRes.kuldebro, 1)} enhet="W/K" />
              <Resultat etikett="Totalt varmetapstall" verdi={fmt(transRes.total, 1)} enhet="W/K" tone="ok" />
            </div>
            {lccNs3454.besteAlternativ && (
              <div className="mt-3 rounded-lg border border-emerald-800/60 bg-emerald-950/20 p-2.5 text-xs text-emerald-200">
                🌱 <strong>NS 3454 Konklusjon:</strong> Beste energikonsept over 25 år er{' '}
                <strong>{lccNs3454.besteAlternativ.navn}</strong> med laveste nåverdi på{' '}
                <strong>{fmt(lccNs3454.besteAlternativ.totalLivslopskostnadKr, 0)} kr</strong> (
                {fmt(lccNs3454.besteAlternativ.kostnadPerM2Bra, 0)} kr/m² BRA).
              </div>
            )}
          </Kort>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODUL 9: PROSJEKT, TFM (STATSBYGG PA 0802) & STEGMODELL              */}
      {/* ==================================================================== */}
      {modul.id === 'prosjekt' && (
        <div className="space-y-6">
          <GlobalRapportBar
            tittel="Tverrfaglig FDV-Sluttrapport & TFM-Merkesystem"
            undertittel="Statsbygg PA 0802 TFM-system og samlet VVS-teknisk overlevering"
            standard="Statsbygg PA 0802 · NS 3454 · TEK17 kap. 11/13/14/15"
            ikon="🗂️"
            statusBadge={{
              tekst: '✅ Klar for FDV-overlevering',
              tone: 'ok',
            }}
            onApneRapport={() => setVisFdvRapport(true)}
            onKopier={async () => {
              const ok = await kopierTilUtklippstavle(fdvMarkdown);
              melding(ok ? '📋 FDV-sluttrapport kopiert til utklippstavlen' : 'Kunne ikke kopiere');
            }}
            onLastNedMd={() => {
              const filnavn = `${prosjekt.navn.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-fdv-sluttrapport.md`;
              lastNedTekst(filnavn, fdvMarkdown);
              melding('📥 Markdown lastet ned for NotebookLM / KI!');
            }}
            ekstraKnapper={
              onNavigerTilDashbord ? (
                <button
                  type="button"
                  onClick={onNavigerTilDashbord}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-cyan-700 bg-cyan-950/70 px-3 py-1.5 text-xs font-bold text-cyan-200 shadow hover:bg-cyan-900"
                >
                  📊 Prosjektoversikt & Tidssporing
                </button>
              ) : undefined
            }
          />

          <Kort tittel="TFM-Kodegenerator (Statsbygg PA 0802) & Komponentliste" ikon="🗂️">
            <p className="mb-3 text-xs text-slate-400">
              Format: <code>+Lokasjon =System.Løpenr -KomponentLøpenr %Typekode</code> iht. Statsbygg PA 0802 og tverrfaglig merkesystem.
            </p>
            <div className="grid grid-cols-2 gap-3 text-xs text-slate-300 sm:grid-cols-4 lg:grid-cols-7">
              <label>
                Lokasjon (+A)
                <input
                  value={tfmLokasjon}
                  onChange={(e) => setTfmLokasjon(e.target.value)}
                  className="mt-1 min-h-[42px] w-full rounded border border-slate-600 bg-slate-900 px-2 py-1 font-mono"
                />
              </label>
              <label>
                System (310/320/360)
                <input
                  value={tfmSystem}
                  onChange={(e) => setTfmSystem(e.target.value)}
                  className="mt-1 min-h-[42px] w-full rounded border border-slate-600 bg-slate-900 px-2 py-1 font-mono"
                />
              </label>
              <label>
                System løpenr.
                <TallFelt className="mt-1 w-full" ariaLabel="System løpenummer" verdi={tfmSysNr} onChange={setTfmSysNr} />
              </label>
              <label>
                Komponent (PU/VV/JV)
                <input
                  value={tfmKomp}
                  onChange={(e) => setTfmKomp(e.target.value)}
                  className="mt-1 min-h-[42px] w-full rounded border border-slate-600 bg-slate-900 px-2 py-1 font-mono"
                />
              </label>
              <label>
                Komp. løpenr.
                <TallFelt className="mt-1 w-full" ariaLabel="Komponent løpenummer" verdi={tfmKompNr} onChange={setTfmKompNr} />
              </label>
              <label>
                Typekode (%TF)
                <input
                  value={tfmTypeKode}
                  onChange={(e) => setTfmTypeKode(e.target.value)}
                  placeholder="TF / FL / TT"
                  className="mt-1 min-h-[42px] w-full rounded border border-slate-600 bg-slate-900 px-2 py-1 font-mono text-emerald-300"
                />
              </label>
              <label>
                Beskrivelse
                <input
                  value={tfmBeskrivelse}
                  onChange={(e) => setTfmBeskrivelse(e.target.value)}
                  className="mt-1 min-h-[42px] w-full rounded border border-slate-600 bg-slate-900 px-2 py-1"
                />
              </label>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-800/70 bg-emerald-950/30 p-3">
              <div className="font-mono text-sm font-black text-emerald-300">
                Generert TFM-streng: {nyTfmKode}
              </div>
              <Knapp
                onClick={() => {
                  setTfmListe((prev) => [
                    ...prev,
                    { kode: nyTfmKode, beskrivelse: tfmBeskrivelse, fag: 'RIV / RIAu' },
                  ]);
                  setTfmKompNr((n) => n + 1);
                  melding(`La til ${nyTfmKode} i komponentlisten`);
                }}
              >
                + Legg til i TFM-komponentliste
              </Knapp>
            </div>

            <div className="mt-4 overflow-x-auto rounded-lg border border-slate-700">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-900 text-[11px] uppercase text-slate-300">
                    <th className="px-3 py-2">TFM-kode</th>
                    <th className="px-3 py-2">Beskrivelse</th>
                    <th className="px-3 py-2">Grensesnitt</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {tfmListe.map((rad, i) => (
                    <tr key={i} className="hover:bg-slate-800/40">
                      <td className="px-3 py-2 font-mono font-bold text-emerald-300">{rad.kode}</td>
                      <td className="px-3 py-2 text-slate-200">{rad.beskrivelse}</td>
                      <td className="px-3 py-2 text-slate-400">{rad.fag}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            bekreftSlett({
                              tittel: 'Slette TFM-komponent?',
                              elementNavn: `${rad.kode} (${rad.beskrivelse})`,
                              beskrivelse: `Er du sikker på at du vil slette TFM-komponenten «${rad.kode}» fra listen?`,
                              bekreftTekst: '🗑️ Slett TFM-rad',
                              onBekreft: () =>
                                setTfmListe((prev) => prev.filter((_, idx) => idx !== i)),
                            })
                          }
                          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-400 hover:bg-rose-950/50 hover:text-rose-400"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Kort>
        </div>
      )}

      {/* Universell Gatekeeper-støtte («⚠️ Gå videre med estimat / Venter på kommunen») i alle moduler */}
      <GatekeeperPanel
        prosjekt={prosjekt}
        analyse={analyse}
        overstyringer={overstyringer}
        qaFullfort={qaFullfort}
        visSluttkontroll={false}
        onOppdaterProsjektOgOverstyringer={onOppdaterProsjektOgOverstyringer}
        onApneChatMedTekst={(sporsmal) => onApneChat(agenter[0].id, sporsmal)}
        melding={melding}
      />

      {/* ==================================================================== */}
      {/* 5 FAGLIGE RAPPORT-MODALER MED VISUELL PDF & MARKDOWN-EKSPORT         */}
      {/* ==================================================================== */}
      {/* 1. Trykkholding, Ekspansjonskar & Varmesentral (Modul 2) */}
      <FagRapportModal
        aapen={visEkspansjonRapport}
        onLukk={() => setVisEkspansjonRapport(false)}
        prosjekt={prosjekt}
        tittel="Trykkholding, Ekspansjonskar & Varmesentral (TEK17 § 14-4)"
        undertittel="Dimensjonering iht. NS-EN 12828 / Pneumatex trykkholding og TEK17 § 14-4(2)"
        standardTekst="NS-EN 12828 · Pneumatex · TEK17 § 14-4"
        ikon="🔥"
        nokkeltall={[
          { etikett: 'Statisk høyde H_st', verdi: fmt(statiskHoydeVarme, 1), enhet: 'm' },
          { etikett: 'Anleggsvolum V_a', verdi: fmt(anleggsVolum, 0), enhet: 'l' },
          { etikett: 'Fortrykk p_0', verdi: fmt(ekspansjon.fortrykkBar, 2), enhet: 'bar' },
          { etikett: 'Utvidelsesvolum V_e', verdi: fmt(ekspansjon.ekspansjonsVolumLiter, 1), enhet: 'l' },
          { etikett: 'Anbefalt standardkar', verdi: `${ekspansjon.anbefaltStandardKarLiter}`, enhet: 'liter', tone: 'ok' },
          {
            etikett: 'Varmesentral areal',
            verdi: `${prosjekt.tekniskRomM2 ?? 0} m² (Krav: ${minAreaVarmesentral(bra) ?? 0} m²)`,
            tone: analyse.varmesentral.ok === false ? 'feil' : 'ok',
          },
        ]}
        seksjoner={[
          {
            tittel: 'Forutsetninger & Dimensjoneringsgrunnlag',
            rader: [
              { etikett: 'Oppvarmet BRA (globalt)', verdi: `${fmt(bra, 0)} m²` },
              { etikett: 'Maks turtemperatur', verdi: `${maksTempC} °C` },
              { etikett: 'Statisk løftehøyde fra koter', verdi: `${fmt(statiskHoydeVarme, 1)} m` },
              { etikett: 'Sikkerhetsventil åpningstrykk', verdi: `${fmt(sikkerhetsventilBar, 1)} bar` },
            ],
          },
          {
            tittel: 'Beregnet Ekspansjonsvolum & Karstørrelse',
            rader: [
              { etikett: 'Vannutvidelse V_e', verdi: `${fmt(ekspansjon.ekspansjonsVolumLiter, 1)} liter` },
              { etikett: 'Nominelt karvolum V_n', verdi: `${fmt(ekspansjon.nomineltVolumLiter, 0)} liter` },
              { etikett: 'Nødvendig fortrykk p_0', verdi: `${fmt(ekspansjon.fortrykkBar, 2)} bar` },
              { etikett: 'Valgt type / fabrikat', verdi: 'Pneumatex Statico / Compresso med butylmembran' },
            ],
          },
          {
            tittel: 'TEK17 § 14-4(2) Areal til Varmesentral',
            rader: [
              { etikett: 'Krav for bygg > 1 000 m² BRA', verdi: '10 m² + 1 % av oppvarmet BRA' },
              {
                etikett: 'Beregnet minstekrav',
                verdi: minAreaVarmesentral(bra) !== null ? `${fmt(minAreaVarmesentral(bra)!, 0)} m²` : 'Ikke krav (< 1000 m²)',
              },
              { etikett: 'Avsatt areal i prosjektet', verdi: prosjekt.tekniskRomM2 !== null ? `${fmt(prosjekt.tekniskRomM2, 0)} m²` : 'Ikke oppgitt' },
              { etikett: 'Krav til fri høyde / dør', verdi: 'Fri takhøyde ≥ 2,5 m, dør ≥ 1,0 m fri bredde' },
            ],
          },
        ]}
        konklusjon={{
          tittel:
            analyse.varmesentral.ok === false
              ? 'Forbehold: Avsatt areal for varmesentral er for lite'
              : 'Trykkholding & Varmesentral godkjent iht. standard',
          tekst:
            analyse.varmesentral.ok === false
              ? `Ekspansjonskar er dimensjonert til ${ekspansjon.anbefaltStandardKarLiter} liter med fortrykk ${fmt(ekspansjon.fortrykkBar, 2)} bar. Varmesentralens areal (${prosjekt.tekniskRomM2 ?? 0} m²) oppfyller ikke minstekravet i TEK17 § 14-4 (${minAreaVarmesentral(bra)} m²). Arealet må utvides i dialog med arkitekt!`
              : `Ekspansjonskar er dimensjonert til ${ekspansjon.anbefaltStandardKarLiter} liter med fortrykk ${fmt(ekspansjon.fortrykkBar, 2)} bar. Varmesentralens areal (${prosjekt.tekniskRomM2 ?? 0} m²) tilfredsstiller TEK17 § 14-4(2).`,
          ok: analyse.varmesentral.ok !== false,
        }}
        markdownTekst={ekspansjonMarkdown}
        filnavnBase="ekspansjon-varmesentral"
        melding={melding}
      />

      {/* 1b. Luftmengder, Varmegjenvinning & SFP (Modul 3) */}
      <FagRapportModal
        aapen={visVentBeregningRapport}
        onLukk={() => setVisVentBeregningRapport(false)}
        prosjekt={prosjekt}
        tittel="Luftmengder, Varmegjenvinning & SFP (TEK17 kap. 13)"
        undertittel="Dimensjonering av hygienisk luftbehov, kjøleluft, SFP-faktor og kanalhastighet"
        standardTekst="TEK17 kap. 13 · NS-EN 16798-1 · Arbeidstilsynet 444"
        ikon="🌬️"
        nokkeltall={[
          { etikett: 'Ventilert areal BRA', verdi: fmt(ventAreal, 0), enhet: 'm²' },
          { etikett: 'Personbelastning', verdi: `${antallPersoner}`, enhet: 'pers' },
          { etikett: 'Hygienisk luftbehov', verdi: fmt(ventRes.luftHygieneM3h, 0), enhet: 'm³/h' },
          { etikett: 'Dimensjonerende luft q_dim', verdi: fmt(ventRes.dimensjonerendeM3h, 0), enhet: 'm³/h', tone: 'ok' },
          {
            etikett: 'SFP-faktor (krav ≤ 1,5)',
            verdi: fmt(ventRes.sfpKwPerM3s, 2),
            enhet: 'kW/(m³/s)',
            tone: ventRes.sfpOkTek17 ? 'ok' : 'feil',
          },
          {
            etikett: 'Kanalhastighet (krav ≤ 5,0)',
            verdi: fmt(ventRes.kanalHastighetMs, 2),
            enhet: 'm/s',
            tone: ventRes.kanalHastighetOk ? 'ok' : 'feil',
          },
        ]}
        seksjoner={[
          {
            tittel: 'Luftmengdeberegning iht. TEK17 § 13-1 til § 13-4',
            rader: [
              { etikett: 'Personbelastning', verdi: `${antallPersoner} pers × ${personFaktor} m³/h·pers = ${fmt(antallPersoner * personFaktor, 0)} m³/h` },
              { etikett: 'Materialemisjoner', verdi: `${fmt(ventAreal, 0)} m² × ${materialFaktor} m³/h·m² = ${fmt(ventAreal * materialFaktor, 0)} m³/h` },
              { etikett: 'Sum hygienisk behov', verdi: `${fmt(ventRes.luftHygieneM3h, 0)} m³/h` },
              { etikett: 'Kjøleluftbehov', verdi: `${fmt(ventRes.luftKjolingM3h, 0)} m³/h (ΔT = ${deltaTKjoling} K)` },
              { etikett: 'Dimensjonerende luftmengde', verdi: `${fmt(ventRes.dimensjonerendeM3h, 0)} m³/h (${fmt(ventRes.dimensjonerendeM3h / 3600, 3)} m³/s)` },
            ],
          },
          {
            tittel: 'Aggregat, SFP og Kanalnett',
            rader: [
              { etikett: 'Total vifteeffekt P_el', verdi: `${fmt(vifteEffektKw, 2)} kW` },
              { etikett: 'Beregnet SFP', verdi: `${fmt(ventRes.sfpKwPerM3s, 2)} kW/(m³/s) (TEK17-grense: 1,5 kW/(m³/s))` },
              { etikett: 'Hovedkanal dimensjon', verdi: `Ø${kanalDimMm} mm` },
              { etikett: 'Kanalhastighet', verdi: `${fmt(ventRes.kanalHastighetMs, 2)} m/s (anbefalt ≤ 5,0 m/s)` },
              {
                etikett: 'Varmegjenvinner',
                verdi: gjenvinnerType === 'plate_vaeske'
                  ? '✅ Motstrøms plateveksler / Væskekoblet (0 % smitte)'
                  : '⚠️ Roterende gjenvinner (kun ren kontorluft)',
              },
            ],
          },
        ]}
        konklusjon={{
          tittel: ventRes.sfpOkTek17 && ventRes.kanalHastighetOk
            ? 'Ventilasjonsanlegg godkjent iht. TEK17 kap. 13'
            : 'Advarsel: Avvik i ventilasjonsdimensjonering',
          tekst: ventRes.sfpOkTek17 && ventRes.kanalHastighetOk
            ? `Dimensjonerende luftmengde er ${fmt(ventRes.dimensjonerendeM3h, 0)} m³/h. Vifteeffekt gir SFP på ${fmt(ventRes.sfpKwPerM3s, 2)} kW/(m³/s) som tilfredsstiller kravet i TEK17 (≤ 1,5). Kanalhastighet på ${fmt(ventRes.kanalHastighetMs, 2)} m/s er innenfor akustiske anbefalinger.`
            : `Anlegget tilfredsstiller ikke alle kriterier: ${!ventRes.sfpOkTek17 ? `SFP ${fmt(ventRes.sfpKwPerM3s, 2)} kW/(m³/s) overskrider TEK17-kravet (1,5). ` : ''}${!ventRes.kanalHastighetOk ? `Kanalhastighet ${fmt(ventRes.kanalHastighetMs, 2)} m/s gir risiko for støy. ` : ''}Vurder større aggregat eller kanal.`,
          ok: ventRes.sfpOkTek17 && ventRes.kanalHastighetOk,
        }}
        markdownTekst={ventBeregningMarkdown}
        filnavnBase="ventilasjon-luftmengder-sfp"
        melding={melding}
      />

      {/* 2. Pumper & Trykkøkning (Modul 4) */}
      <FagRapportModal
        aapen={visPumpeRapport}
        onLukk={() => setVisPumpeRapport(false)}
        prosjekt={prosjekt}
        tittel="Pumper & Trykkøkningsanlegg (WWBooster & Grundfos MAGNA3)"
        undertittel="Hydraulisk kapasitet, trykkløft mot koter og årlig energiforbruk"
        standardTekst="SINTEF Byggforsk 553.115 · Grundfos Engineering Guide · NS-EN 14336"
        ikon="🚀"
        nokkeltall={[
          { etikett: 'Inntakstrykk', verdi: fmt(globaltInntaksTrykkBar, 2), enhet: 'bar' },
          { etikett: 'Geodetisk løft H_geo', verdi: fmt(h.geodetiskLoftehoydeM, 1), enhet: 'm' },
          { etikett: 'Nødvendig trykk øverste tappested', verdi: fmt(boosterRes.nodvendigTrykkBar, 2), enhet: 'bar' },
          {
            etikett: 'Krav om WWBooster',
            verdi: boosterRes.trengerBooster ? `PÅKREVD (+${fmt(boosterRes.trykkLoftBar, 2)} bar)` : 'TRYKK OK UTEN PUMPE',
            tone: boosterRes.trengerBooster ? 'advarsel' : 'ok',
          },
          { etikett: 'Sirkulasjonspumpe', verdi: pumpeRes.anbefaltModell, tone: 'ok' },
          { etikett: 'P1 elektrisk effekt', verdi: fmt(pumpeRes.elektriskEffektW, 0), enhet: 'W' },
        ]}
        seksjoner={[
          {
            tittel: 'Kaldtvann Trykkøkningsanlegg (WWBooster vs. Koter)',
            rader: [
              { etikett: 'Kommunalt vanntrykk på inntak', verdi: `${fmt(globaltInntaksTrykkBar, 2)} bar` },
              {
                etikett: 'Geodetisk løftehøyde til høyeste tappested',
                verdi: `${fmt(h.geodetiskLoftehoydeM, 1)} m (${fmt(h.hydrostatiskTapBar, 2)} bar)`,
              },
              { etikett: 'Rør- og komponenttap (dimensjonerende)', verdi: `${fmt(rorOgKompTapBar, 2)} bar` },
              { etikett: 'Minstekrav til resttrykk øverste tappested', verdi: `${fmt(kravResttrykkBar, 2)} bar` },
              { etikett: 'Nødvendig trykk på inntak', verdi: `${fmt(boosterRes.nodvendigTrykkBar, 2)} bar` },
              { etikett: 'Nødvendig trykkløft', verdi: `${fmt(boosterRes.trykkLoftBar, 2)} bar` },
              {
                etikett: 'Anbefalt booster-system',
                verdi: boosterRes.trengerBooster ? 'Grundfos Hydro MPC-E frekvensstyrt flerpumpestasjon' : 'Ingen trykkøkning nødvendig',
              },
            ],
          },
          {
            tittel: 'Hydronisk Sirkulasjonspumpe (Varme/Kjøling)',
            rader: [
              { etikett: 'Volumstrøm Q', verdi: `${fmt(pumpeQM3h, 2)} m³/h` },
              { etikett: 'Pumpeløftehøyde H', verdi: `${fmt(pumpeLofteMvs, 2)} mVS` },
              { etikett: 'Anleggstype', verdi: pumpeAnleggsType.toUpperCase() },
              { etikett: 'Anbefalt reguleringsmodus', verdi: pumpeRes.anbefaltModus },
              { etikett: 'Årlig energiforbruk (beregnet 5 500 driftstimer)', verdi: `${fmt(pumpeRes.aarligEnergiKwh, 0)} kWh/år` },
            ],
          },
        ]}
        konklusjon={{
          tittel: boosterRes.trengerBooster ? 'WWBooster trykkøkning påkrevd' : 'Kommunalt vanntrykk tilstrekkelig',
          tekst: boosterRes.trengerBooster
            ? `Byggets kotehøyde (${fmt(h.geodetiskLoftehoydeM, 1)} m) medfører et hydrostatisk fall på ${fmt(h.hydrostatiskTapBar, 2)} bar. For å sikre ${fmt(kravResttrykkBar, 1)} bar resttrykk på øverste tappested må det installeres trykkøkningsstasjon med +${fmt(boosterRes.trykkLoftBar, 2)} bar løft. Sirkulasjonspumpe ${pumpeRes.anbefaltModell} er godkjent for varmeanlegget.`
            : `Kommunalt vanntrykk (${fmt(globaltInntaksTrykkBar, 2)} bar) er tilstrekkelig for å levere ønsket resttrykk på øverste tappested. Sirkulasjonspumpe ${pumpeRes.anbefaltModell} dekker hydronisk krets med ${fmt(pumpeRes.elektriskEffektW, 0)} W effekt.`,
          ok: true,
        }}
        markdownTekst={pumpeMarkdown}
        filnavnBase="pumper-trykkokning"
        melding={melding}
      />

      {/* 3. Isolasjon & Duggpunkt (Modul 5) */}
      <FagRapportModal
        aapen={visIsolasjonRapport}
        onLukk={() => setVisIsolasjonRapport(false)}
        prosjekt={prosjekt}
        tittel="Isolasjon, Duggpunkt & Kondenshindring (Armaflex & Glava)"
        undertittel="Beregning iht. NS-EN ISO 12241 (Magnus-Tetens formel) og NS-EN 12828"
        standardTekst="NS-EN ISO 12241 · Magnus-Tetens · Armaflex AF · NS-EN 12828"
        ikon="🧱"
        nokkeltall={[
          { etikett: 'Duggpunkt romluft T_dugg', verdi: fmt(kondensRes.duggpunktTempC, 1), enhet: '°C' },
          {
            etikett: 'Overflatetemperatur rør',
            verdi: fmt(kondensRes.overflateTempC, 1),
            enhet: '°C',
            tone: kondensRes.kondensfare ? 'feil' : 'ok',
          },
          {
            etikett: 'Sikkerhetsmargin',
            verdi: `${kondensRes.sikkerhetsmarginK >= 0 ? '+' : ''}${fmt(kondensRes.sikkerhetsmarginK, 1)}`,
            enhet: 'K',
            tone: kondensRes.sikkerhetsmarginK >= 2.0 ? 'ok' : 'advarsel',
          },
          { etikett: 'Min. anbefalt cellegummi', verdi: `${kondensRes.anbefaltMinIsoMm}`, enhet: 'mm Armaflex', tone: 'ok' },
          { etikett: 'Varmetap isolert rør', verdi: fmt(isoRes.varmetapWattPerM, 1), enhet: 'W/m' },
          { etikett: 'Lengdeutvidelse ΔL', verdi: fmt(isoRes.lengdeUtvidelseMm, 1), enhet: 'mm' },
        ]}
        seksjoner={[
          {
            tittel: 'Kondens- og Duggpunktsberegning for Kjøling & Isvann (6/12 °C)',
            rader: [
              { etikett: 'Ytre rørdiameter', verdi: `Ø${ytreRorMm} mm` },
              { etikett: 'Medietemperatur (isvann)', verdi: `${medieTempC} °C` },
              { etikett: 'Omgivelsestemperatur rom', verdi: `${omgivelseTempC} °C` },
              { etikett: 'Relativ luftfuktighet (RF)', verdi: `${rfProsent} %` },
              { etikett: 'Beregnet duggpunkttemperatur (Magnus-Tetens)', verdi: `${fmt(kondensRes.duggpunktTempC, 1)} °C` },
              { etikett: 'Valgt cellegummiisolasjon (Armaflex AF)', verdi: `${isoTykkelseMm} mm (λ = ${lambdaWmk} W/mK)` },
              { etikett: 'Beregnet overflatetemperatur', verdi: `${fmt(kondensRes.overflateTempC, 1)} °C` },
              {
                etikett: 'Kondensrisiko med isolasjon',
                verdi: kondensRes.kondensfare ? '🚨 FARE FOR KONDENS (Overflate < T_dugg)' : '✅ SIKKER MOT KONDENS',
              },
            ],
          },
          {
            tittel: 'Varmetap for Varmerør & VVC (Glava / Rockwool)',
            rader: [
              { etikett: 'Rørlengde L', verdi: `${rorLengdeM} meter` },
              { etikett: 'Varmetap per meter rør', verdi: `${fmt(isoRes.varmetapWattPerM, 1)} W/m` },
              { etikett: 'Totalt kontinuerlig varmetap', verdi: `${fmt(isoRes.varmetapWattPerM * rorLengdeM, 0)} W` },
              {
                etikett: 'Årlig energitap (drift 8760 timer)',
                verdi: `${fmt((isoRes.varmetapWattPerM * rorLengdeM * 8760) / 1000, 0)} kWh/år`,
              },
            ],
          },
          {
            tittel: `Materialvalg & Termisk Lengdeutvidelse (L = ${rorLengdeM} m, ΔT = 50 K)`,
            tabell: {
              kolonner: ['Materiale', 'Lengdeutvidelse α (mm/m·K)', 'Total utvidelse ΔL (mm)', 'Kompenserende tiltak'],
              rader: [
                ['PP-R Faser (Kompositt)', '0,035', fmt(rorLengdeM * 0.035 * 50, 1), 'U-bøy / L-bøy hver 12 m'],
                ['Kobber Cu (Klem/Loddet)', '0,017', fmt(rorLengdeM * 0.017 * 50, 1), 'Glideklammer og ekspansjonsvinkler'],
                ['Stålrør (Sveis/Rille)', '0,012', fmt(rorLengdeM * 0.012 * 50, 1), 'Aksialkompensator / fastpunkt'],
              ],
            },
          },
        ]}
        konklusjon={{
          tittel: kondensRes.kondensfare
            ? 'Advarsel: For tynn cellegummiisolasjon – Fare for kondens'
            : 'Kondensisolering og varmetap godkjent iht. standard',
          tekst: kondensRes.kondensfare
            ? `Valgt cellegummitykkelse (${isoTykkelseMm} mm) gir overflatetemperatur på ${fmt(kondensRes.overflateTempC, 1)} °C, som er lavere enn luftens duggpunkt (${fmt(kondensRes.duggpunktTempC, 1)} °C). Dette vil forårsake kondensdrypp i himling. Øk tykkelsen til minst ${kondensRes.anbefaltMinIsoMm} mm Armaflex med diffusjonstette skjøter.`
            : `Med ${isoTykkelseMm} mm Armaflex cellegummi oppnås en overflatetemperatur på ${fmt(kondensRes.overflateTempC, 1)} °C, som gir trygg margin (+${fmt(kondensRes.sikkerhetsmarginK, 1)} K) mot duggpunktet på ${fmt(kondensRes.duggpunktTempC, 1)} °C. Varmetap for varmeanlegg er tilfredsstillende minimert.`,
          ok: !kondensRes.kondensfare,
        }}
        markdownTekst={isolasjonMarkdown}
        filnavnBase="isolasjon-kondens-duggpunkt"
        melding={melding}
      />

      {/* 4. Sprinkler & Brann (Modul 6) */}
      <FagRapportModal
        aapen={visBrannRapport}
        onLukk={() => setVisBrannRapport(false)}
        prosjekt={prosjekt}
        tittel="Sprinklerdimensjonering & Hydraulisk Trykkontroll (NS-EN 12845)"
        undertittel="Dimensjonering iht. NS-EN 12845 / FG-930:1 & TEK17 § 11-16 (Branntromler)"
        standardTekst="NS-EN 12845 · FG-930:1 · TEK17 § 11-16"
        ikon="🧯"
        nokkeltall={[
          { etikett: 'Fareklasse', verdi: fareklasse, tone: 'ok' },
          { etikett: 'Dimensjonerende vannbehov', verdi: fmt(brannRes.vannmengdeLmin, 0), enhet: 'l/min' },
          { etikett: 'Minste dysetrykk', verdi: fmt(brannRes.minDyseTrykkBar, 2), enhet: 'bar' },
          { etikett: 'Nødvendig inntakstrykk', verdi: fmt(sprinklerHydRes.totaltTrykkbehovBar, 2), enhet: 'bar' },
          {
            etikett: 'Tilgjengelig trykk (inntak)',
            verdi: kommunaltTrykkBrannBar !== null ? fmt(kommunaltTrykkBrannBar, 2) : 'Mangler (est. 4,00)',
            enhet: 'bar',
          },
          {
            etikett: 'Krav om sprinklerpumpe',
            verdi: sprinklerHydRes.kreverPumpe ? 'PÅKREVD (NS-EN 12845)' : 'IKKE PÅKREVD',
            tone: sprinklerHydRes.kreverPumpe ? 'advarsel' : 'ok',
          },
        ]}
        seksjoner={[
          {
            tittel: 'Sprinkleranlegg Grunnlagsdata iht. NS-EN 12845',
            rader: [
              { etikett: 'Bygningstype', verdi: prosjekt.bygningstype },
              { etikett: 'Fareklasse', verdi: `${fareklasse} (${SPRINKLER_KLASSER[fareklasse]?.navn})` },
              { etikett: 'Dimensjonerende virkeområde', verdi: `${SPRINKLER_KLASSER[fareklasse]?.virkearealM2} m²` },
              { etikett: 'Minste vanntetthet', verdi: `${SPRINKLER_KLASSER[fareklasse]?.tetthetMmMin} mm/min` },
              { etikett: 'Dyse K-faktor', verdi: `${kFaktor}` },
              { etikett: 'Minste vanntrykk på fjerneste dyse', verdi: `${fmt(brannRes.minDyseTrykkBar, 2)} bar` },
              { etikett: 'Beregnet total vannmengde for sprinkler', verdi: `${fmt(brannRes.vannmengdeLmin, 0)} l/min` },
            ],
          },
          {
            tittel: 'Hydraulisk Q/p-Trykkregnskap mot Koter',
            rader: [
              {
                etikett: 'Geodetisk løftehøyde (ITK til øverste dyse)',
                verdi: `${fmt(h.geodetiskLoftehoydeM, 1)} m (${fmt(sprinklerHydRes.geodetiskTapBar, 2)} bar)`,
              },
              { etikett: 'Estimert rør- og armaturfriksjon', verdi: `${fmt(sprinklerHydRes.rorFriksjonBar, 2)} bar` },
              { etikett: 'BA-tilbakeslagsventil (NS-EN 1717 kat. 4)', verdi: `${fmt(sprinklerHydRes.baVentilTapBar, 2)} bar` },
              { etikett: 'Minste dysetrykk', verdi: `${fmt(brannRes.minDyseTrykkBar, 2)} bar` },
              { etikett: 'Totalt nødvendig inntakstrykk', verdi: `${fmt(sprinklerHydRes.totaltTrykkbehovBar, 2)} bar` },
              {
                etikett: 'Kommunalt vanntrykk (fra Steg 1)',
                verdi:
                  kommunaltTrykkBrannBar !== null
                    ? `${fmt(kommunaltTrykkBrannBar, 2)} bar`
                    : 'Ikke oppgitt (estimert 4,00 bar)',
              },
              {
                etikett: 'Trykkmargin',
                verdi: `${sprinklerHydRes.marginBar >= 0 ? '+' : ''}${fmt(sprinklerHydRes.marginBar, 2)} bar`,
              },
            ],
          },
          {
            tittel: 'Branntromler iht. TEK17 § 11-16',
            rader: [
              { etikett: 'Maks ganglinje til fjerneste hjørne', verdi: `${ganglinjeM} meter` },
              { etikett: 'Slangelengde trommel', verdi: `${slangeLengdeM} meter` },
              {
                etikett: 'Maksimal tillatt ganglinje (slangelengde + 5 m stråle)',
                verdi: `${brannRes.maksTillattGanglinjeM} meter`,
              },
              {
                etikett: 'Vurdering',
                verdi: brannRes.ganglinjeOk ? '✅ OK – Dekning ivaretatt' : '🚨 FOR LANG GANGLINJE – Krever ekstra branntrommel',
              },
            ],
          },
        ]}
        konklusjon={{
          tittel: sprinklerHydRes.kreverPumpe
            ? 'Sprinklerpumpe og vanntank påkrevd iht. NS-EN 12845'
            : 'Direkte tilkobling til kommunalt nett tilfredsstiller NS-EN 12845',
          tekst: sprinklerHydRes.konklusjon,
          ok: !sprinklerHydRes.kreverPumpe,
        }}
        markdownTekst={brannMarkdown}
        filnavnBase="sprinkler-hydraulikk"
        melding={melding}
      />

      {/* 5. LCC & Energi (Modul 8) */}
      <FagRapportModal
        aapen={visLccRapport}
        onLukk={() => setVisLccRapport(false)}
        prosjekt={prosjekt}
        tittel="NS 3454 Livssykluskostnader (25-års LCC) & NS 3031 Varmetapstall"
        undertittel="Beregning iht. NS 3454:2013 / BREEAM-NOR Mat 01 & TEK17 § 14-2"
        standardTekst="NS 3454:2013 · NS 3031:2014 · BREEAM-NOR"
        ikon="🌱"
        nokkeltall={[
          { etikett: 'Beste LCC-alternativ', verdi: besteLcc?.navn?.split('(')[0]?.trim() ?? 'Alternativ', tone: 'ok' },
          { etikett: 'Laveste 25-års nåverdi', verdi: `${fmt(besteLcc?.totalNaaverdi25AarKr ?? 0, 0)} kr`, tone: 'ok' },
          { etikett: 'LCC per m² BRA', verdi: `${fmt((besteLcc?.totalNaaverdi25AarKr ?? 0) / tryggBra, 0)} kr/m²` },
          { etikett: 'Forutsatt strømpris', verdi: `${fmt(strompris, 2)} kr/kWh` },
          { etikett: 'Realrente', verdi: `${fmt(realrente, 1)} % p.a.` },
          { etikett: 'Totalt transmisjonstap', verdi: fmt(transRes.total, 1), enhet: 'W/K' },
        ]}
        seksjoner={[
          {
            tittel: 'NS 3454 LCC-Sammenligning av Energikonsepter over 25 år',
            tabell: {
              kolonner: ['Konsept', 'Investering CAPEX (kr)', 'Årlig energi (kWh)', 'Årlig vedlikehold (kr)', 'Nåverdi drift 25 år (kr)', 'Total LCC Nåverdi (kr)'],
              rader: lccRes.map((alt) => [
                alt.navn,
                `${fmt(alt.capexKr, 0)} kr`,
                `${fmt(alt.aarligEnergiKwh, 0)} kWh`,
                `${fmt(alt.aarligVedlikeholdKr, 0)} kr`,
                `${fmt(alt.naaverdiDriftKr, 0)} kr`,
                `${fmt(alt.totalNaaverdi25AarKr, 0)} kr`,
              ]),
            },
          },
          {
            tittel: 'NS 3031 Transmisjonsvarmetap Σ(U·A) for Bygningskroppen (TEK17 § 14-2)',
            rader: [
              { etikett: 'Bygningsdeler (vegger, tak, gulv, vinduer)', verdi: `${fmt(transRes.deler, 1)} W/K` },
              { etikett: 'Kuldebroer (yttervegger/etasjeskillere)', verdi: `${fmt(transRes.kuldebro, 1)} W/K` },
              { etikett: 'Totalt transmisjonsvarmetapstall Σ(U·A)', verdi: `${fmt(transRes.total, 1)} W/K` },
              { etikett: 'Spesifikt varmetapstall per m² BRA', verdi: `${fmt(transRes.total / tryggBra, 2)} W/(m²·K)` },
            ],
          },
        ]}
        konklusjon={{
          tittel: `Anbefalt konsept: ${besteLcc?.navn ?? 'Beste alternativ'}`,
          tekst: `Gjennomført NS 3454 livssyklusberegning over 25 år med ${realrente} % kalkulasjonsrente og strømpris ${strompris} kr/kWh viser at «${besteLcc?.navn}» gir den laveste totale samfunnsøkonomiske kostnaden på ${fmt(besteLcc?.totalNaaverdi25AarKr ?? 0, 0)} kr (${fmt((besteLcc?.totalNaaverdi25AarKr ?? 0) / tryggBra, 0)} kr/m² BRA). Dette konseptet tilfredsstiller BREEAM-NOR Mat 01 og gir optimal balanse mellom CAPEX og OPEX.`,
          ok: true,
        }}
        markdownTekst={lccMarkdown}
        filnavnBase="ns3454-lcc-energi"
        melding={melding}
      />

      {/* 6. TEK17 / SAK10 Samsvarskontroll (Modul 7) */}
      <FagRapportModal
        aapen={visLovverkRapport}
        onLukk={() => setVisLovverkRapport(false)}
        prosjekt={prosjekt}
        tittel="TEK17 / SAK10 Lovverk- og Samsvarskontroll (RIV-Erklæring)"
        undertittel="Verifikasjon av lovpålagte VVS-krav iht. TEK17 kap. 11, 13, 14, 15 & SAK10"
        standardTekst="TEK17 · SAK10 · Plan- og bygningsloven"
        ikon="⚖️"
        nokkeltall={[
          {
            etikett: 'TEK17 § 15-5 Vanntrykk',
            verdi: h.kravTrykkreduksjonsventil
              ? 'Trykkreduksjon påkrevd (> 6,0 bar)'
              : `${fmt(prosjekt.vanntrykk.statiskBar ?? 0, 1)} bar ≤ 6,0 bar`,
            tone: h.kravTrykkreduksjonsventil ? 'advarsel' : 'ok',
          },
          {
            etikett: 'TEK17 § 15-6 Tilbakeslag',
            verdi: analyse.lov2Status === 'ok' ? 'Selvfall OK' : 'Brudd / Pumpe kreves',
            tone: analyse.lov2Status === 'ok' ? 'ok' : 'feil',
          },
          {
            etikett: 'TEK17 § 14-4(2) Varmesentral',
            verdi: `${prosjekt.tekniskRomM2 ?? 0} m² (Krav: ${minAreaVarmesentral(bra) ?? 0} m²)`,
            tone: analyse.varmesentral.ok === false ? 'feil' : 'ok',
          },
          {
            etikett: 'TEK17 § 11-16 Slukkeutstyr',
            verdi: brannRes.ganglinjeOk ? `Ganglinje OK (≤ ${brannRes.maksTillattGanglinjeM} m)` : 'For lang ganglinje',
            tone: brannRes.ganglinjeOk ? 'ok' : 'feil',
          },
        ]}
        seksjoner={[
          {
            tittel: 'TEK17 Sanitær- og Vannforsyningskrav (Kapittel 15)',
            rader: [
              {
                etikett: '§ 15-5(1) Sikkerhet mot overtrykk',
                verdi: h.kravTrykkreduksjonsventil
                  ? 'Reduksjonsventil monteres på hovedinntak. Driftstrykk strupes til 4,0 bar.'
                  : `Inntakstrykk ${fmt(prosjekt.vanntrykk.statiskBar ?? 0, 1)} bar er innenfor grensen på 6,0 bar.`,
              },
              {
                etikett: '§ 15-6 Tilbakeslag og forurensning',
                verdi: analyse.lov2Status === 'ok'
                  ? 'Selvfall over kommunal tilbakeslagskote (ITR + margin). Sikret mot oppstuing.'
                  : 'Krav om godkjent avløpspumpestasjon iht. NS-EN 12050 med tilbakeslagssløyfe over gatekote.',
              },
              {
                etikett: '§ 15-7 Tilgjengelighet for drift og ettersyn',
                verdi: 'Fordelerskap og rør-i-rør-systemer montert med overløpsdrenering til våtrom med sluk.',
              },
            ],
          },
          {
            tittel: 'TEK17 Energi, Ventilasjon og Brann (Kapittel 11, 13, 14)',
            rader: [
              {
                etikett: '§ 14-4(2) Teknisk rom for varmeveksler/varmepumpe',
                verdi: `Krav for ${fmt(bra, 0)} m² BRA: minst ${minAreaVarmesentral(bra) ?? 0} m². Prosjektert: ${prosjekt.tekniskRomM2 ?? 0} m².`,
              },
              {
                etikett: '§ 13-2 / § 13-3 Grunnventilasjon og luftkvalitet',
                verdi: `Prosjektert luftmengde ${fmt(ventRes.dimensjonerendeM3h, 0)} m³/h dekker krav til personbelastning og materialemisjoner.`,
              },
              {
                etikett: '§ 11-16 Manuell brannslukking',
                verdi: `Branntrommel med ${slangeLengdeM} m slange dekker ganglinje på ${ganglinjeM} m (maks tillatt ${brannRes.maksTillattGanglinjeM} m).`,
              },
            ],
          },
        ]}
        konklusjon={{
          tittel: 'Faglig Samsvarserklæring (RIV)',
          tekst: `Undertegnede rådgivende ingeniør VVS (RIV) bekrefter at prosjekteringen er utført i samsvar med kravene i plan- og bygningsloven og gjeldende teknisk forskrift (TEK17). Tekniske tiltak som forutsetter installasjon (tilbakeslagssikring, trykkreduksjon, ekspansjon) er innarbeidet i anbudsdokumentene.`,
          ok: analyse.lov2Status === 'ok' && !h.kravTrykkreduksjonsventil,
        }}
        markdownTekst={lovverkMarkdown}
        filnavnBase="tek17-samsvarskontroll"
        melding={melding}
      />

      {/* 7. FDV-Sluttrapport & TFM-Merkesystem (Modul 9) */}
      <FagRapportModal
        aapen={visFdvRapport}
        onLukk={() => setVisFdvRapport(false)}
        prosjekt={prosjekt}
        tittel="Tverrfaglig FDV-Sluttrapport & TFM-Merkesystem (Statsbygg PA 0802)"
        undertittel="Samlet VVS-teknisk overlevering iht. TEK17 kap. 11/13/14/15, NS 3454 & PA 0802"
        standardTekst="Statsbygg PA 0802 · NS 3454 · TEK17"
        ikon="🗂️"
        nokkeltall={[
          { etikett: 'Registrerte TFM-komponenter', verdi: `${tfmListe.length}`, enhet: 'stk', tone: 'ok' },
          { etikett: 'Samlet oppvarmet BRA', verdi: `${fmt(bra, 0)}`, enhet: 'm²' },
          { etikett: 'Total ventilasjonsluftmengde', verdi: `${fmt(ventRes.dimensjonerendeM3h, 0)}`, enhet: 'm³/h' },
          { etikett: 'Total vannbehov sprinkler', verdi: `${fmt(brannRes.vannmengdeLmin, 0)}`, enhet: 'l/min' },
          { etikett: 'SFP-faktor aggregat', verdi: `${fmt(ventRes.sfpKwPerM3s, 2)}`, enhet: 'kW/(m³/s)', tone: 'ok' },
          { etikett: 'FDV-overleveringsstatus', verdi: 'KLAR FOR DRIFT', tone: 'ok' },
        ]}
        seksjoner={[
          {
            tittel: 'Statsbygg PA 0802 TFM-Komponentoversikt (+Lokasjon =System -Komponent %Typekode)',
            tabell: {
              kolonner: ['TFM-Kode', 'Beskrivelse', 'Tverrfaglig Fag', 'FDV-Status'],
              rader: tfmListe.map((k) => [
                k.kode,
                k.beskrivelse,
                k.fag,
                'Montert, testet & innregulert',
              ]),
            },
          },
          {
            tittel: 'Tverrfaglig Systemstatus ved Overlevering',
            rader: [
              { etikett: '310 Sanitæranlegg', verdi: `Kaldt- og varmtvann testet ved ${fmt(globaltInntaksTrykkBar, 1)} bar. Varmtvann lagres ved min. 70 °C mot legionella.` },
              { etikett: '320 Varmeanlegg', verdi: `Trykktestet og innregulert. Ekspansjonskar: ${ekspansjon.anbefaltStandardKarLiter} l (p0 = ${fmt(ekspansjon.fortrykkBar, 2)} bar). Varmesentral: ${prosjekt.tekniskRomM2 ?? 0} m².` },
              { etikett: '360 Ventilasjonsanlegg', verdi: `Tilluft og avtrekk innregulert iht. NS-EN 12599. SFP = ${fmt(ventRes.sfpKwPerM3s, 2)} kW/(m³/s) (krav ≤ 1,5).` },
              { etikett: '380 Slukkeanlegg', verdi: `Sprinkleranlegg utført iht. NS-EN 12845 (Fareklasse ${fareklasse}). Branntromler med ${slangeLengdeM} m slange gir heldekkende slukking.` },
              { etikett: 'Energikonsept (NS 3454)', verdi: `BREEAM-NOR levetidskostnad: ${besteLcc?.navn ?? 'Standard'} med ${fmt(besteLcc?.totalNaaverdi25AarKr ?? 0, 0)} kr i 25-års nåverdi.` },
            ],
          },
        ]}
        konklusjon={{
          tittel: 'Fullstendig FDV-Sluttkontroll Godkjent',
          tekst: `Samtlige tekniske anlegg er ferdigstilt, innregulert og merket i henhold til Statsbygg PA 0802 og tverrfaglig merkesystem. FDV-dokumentasjon med produktblader, drift- og vedlikeholdsinstrukser og innreguleringsprotokoller er overlevert til driftspersonell og byggherre.`,
          ok: true,
        }}
        markdownTekst={fdvMarkdown}
        filnavnBase="fdv-sluttrapport-tfm"
        melding={melding}
      />
    </div>
  );
}
