import type { ProsjektData } from '../data/prosjekter';
import { varmtvannsVolum } from '../engine/bereder';
import { minAreaVarmesentral } from '../engine/energi';
import { koteRegnskap, reduserAreal, regnavrenning, tilbakeslagMargin } from '../engine/va';

/** Antagelser for varmtvannsberegningen. Vises i UI og i rapporter. */
export const BEREDER_ANTAGELSER = { blandetTemp: 38, berederTemp: 70, kaldtTemp: 7 } as const;

export interface DataPunkt {
  id: string;
  tekst: string;
  ok: boolean;
  /** Formulering av hva som mangler (Lov 1, «⚠️ HINT») */
  hint: string;
}

export interface GulvKontroll {
  navn: string;
  kote: number;
  margin: number;
  krav: number;
  ok: boolean;
  mangel: number;
}

export type Alvor = 'rod' | 'gul';

export interface Alarm {
  alvor: Alvor;
  tekst: string;
}

export interface HydrostatiskKontroll {
  /** Referansekote for kommunalt vanntrykk (vannledning, IBR/ITR eller terreng - 1.6 m) */
  koteMaalepunkt: number | null;
  koteMaalepunktKilde: string;
  /** Laveste registrerte sluk-/gulvkote i bygget */
  lavesteGulvKote: number | null;
  /** Høyeste estimerte/registrerte tappestedskote i bygget */
  hoyesteTapKote: number | null;
  /** Geodetisk løftehøyde fra målepunkt/inntak til øverste tappested [m] */
  geodetiskLoftehoydeM: number;
  /** Hydrostatisk trykktap til øverste tappested [bar] (0.0981 bar/m) */
  hydrostatiskTapBar: number;
  /** Hydrostatisk trykktap til øverste tappested [kPa] (9.81 kPa/m) */
  hydrostatiskTapKpa: number;
  /** Maks statisk trykk i laveste punkt i systemet [bar] (inkl. evt. fall fra målepunkt ned til kjeller) */
  maksStatiskTrykkBar: number | null;
  /** Estimert disponibelt trykk ved øverste tappested før rørfriksjon [bar] */
  disponibeltToppBar: number | null;
  /** True dersom statisk trykk i noen del av systemet overstiger 6.0 bar (TEK17 § 15-5 / NS-EN 806-2) */
  kravTrykkreduksjonsventil: boolean;
  /** True dersom tilgjengelig trykk ved øverste tappested etter rør- og armaturtap blir < 2.5 bar */
  trengerTrykkokning: boolean;
}

export interface ProsjektAnalyse {
  krav: number;
  datasjekk: DataPunkt[];
  /** Lov 1: alt som mangler (fra datasjekk + dokumentets egne kjente mangler) */
  mangler: string[];
  /** Lov 2: kontroll per laveste sluk/gulv. Tom når ITR eller gulvkoter mangler. */
  gulvKontroller: GulvKontroll[];
  lov2Status: 'mangler_data' | 'ok' | 'brudd';
  /** Minste kote på bunnledning ved grunnmur = IBR + L · fall */
  minKoteUtgang: number | null;
  hoydeIGroft: number | null;
  overvann: { aRed: number; q: number; tilbakehold: number | null } | null;
  bereder: { blandetLiter: number; varmLiter: number } | null;
  varmesentral: { kravM2: number | null; avsattM2: number | null; ok: boolean | null };
  trykk: { statiskBar: number | null; dynamiskBar: number | null; uttakLmin: number | null; fallBar: number | null; antatt: boolean };
  /** Globalt regnskap for Vanntrykk vs. Koter, Hydrostatisk trykktap og 6,0 bar-regelen */
  hydrostatisk: HydrostatiskKontroll;
  alarmer: Alarm[];
  fullforing: number;
}

const harTall = (n: number | null | undefined): n is number => typeof n === 'number' && Number.isFinite(n);

export function analyserProsjekt(p: ProsjektData, krav: number): ProsjektAnalyse {
  const k = p.koter;
  const flaterOk = p.overvann.flater.length > 0 && p.overvann.flater.every((f) => f.areal > 0 && harTall(f.phi));

  const datasjekk: DataPunkt[] = [
    { id: 'bra', tekst: 'Oppvarmet BRA', ok: harTall(p.bra) && p.bra > 0, hint: 'Oppvarmet BRA er ikke oppgitt.' },
    { id: 'sted', tekst: 'Adresse / sted', ok: p.sted.trim() !== '', hint: 'Adresse/sted er ikke oppgitt (trengs for VA-myndighet og tilbud).' },
    {
      id: 'matrikkel',
      tekst: 'Gnr/Bnr (matrikkel)',
      ok: Boolean(p.matrikkel && p.matrikkel.trim() !== '' && !/ikke\s*oppgitt/i.test(p.matrikkel.trim())),
      hint: 'Gnr/Bnr (matrikkel) er ikke oppgitt (står som «IKKE OPPGITT»).',
    },
    { id: 'itr', tekst: 'Kote ITR i kommunal kum', ok: harTall(k.itrKum), hint: 'VA-kart med kote for innvendig topp rør (ITR) i kommunal kum mangler – 950 mm-kontrollen kan ikke utføres.' },
    { id: 'gulv', tekst: 'Kote laveste sluk / gulv', ok: k.gulv.length > 0, hint: 'Kote for laveste sluk/ferdig gulv (OK FG) er ikke oppgitt.' },
    { id: 'ibr', tekst: 'Kote IBR i kommunal kum', ok: harTall(k.ibrKum), hint: 'Kote for innvendig bunn rør (IBR) i kommunal kum mangler – kote ved grunnmur kan ikke beregnes.' },
    {
      id: 'kote_vannledning',
      tekst: 'Kote kommunal vannledning',
      ok: harTall(k.vannledning) && k.vannledning !== 0,
      hint: 'Kote for kommunal vannledning (målepunkt for statisk vanntrykk) er ikke oppgitt (eller 0).',
    },
    { id: 'stikk', tekst: 'Stikkledning: lengde og fall', ok: harTall(k.stikkLengde) && harTall(k.fallNevner), hint: 'Stikkledningens lengde og fall er ikke oppgitt.' },
    {
      id: 'trykk',
      tekst: 'Vanntrykk (statisk + Q/p)',
      ok: harTall(p.vanntrykk.statiskBar) && !p.vanntrykk.antatt && harTall(p.vanntrykk.dynamiskBar) && harTall(p.vanntrykk.uttakLmin),
      hint: p.vanntrykk.antatt
        ? 'Statisk vanntrykk er antatt – Q/p-måling (dynamisk trykk ved uttak) mangler fra vannverket.'
        : 'Vanntrykk (statisk og dynamisk ved uttak, Q/p) er ikke komplett oppgitt.',
    },
    {
      id: 'overvann',
      tekst: 'Overvann: flater (med φ), intensitet og påslippskrav',
      ok: flaterOk && harTall(p.overvann.intensitet) && p.overvann.intensitet > 0 && harTall(p.overvann.maksPaaslippLs),
      hint: 'Overvannsdata er ikke komplett (flater med avrenningsfaktor, dimensjonerende IVF-intensitet og kommunalt påslippskrav).',
    },
    {
      id: 'ivf_varighet',
      tekst: 'IVF-varighet og regnintensitet',
      ok: harTall(p.overvann.intensitet) && p.overvann.intensitet > 0,
      hint: 'Dimensjonerende IVF-varighet og regnintensitet er ikke oppgitt (eller 0).',
    },
  ];

  const mangler = [...datasjekk.filter((d) => !d.ok).map((d) => d.hint), ...p.kjenteMangler];

  // Lov 2 – tilbakeslagskontroll
  const gulvKontroller: GulvKontroll[] = harTall(k.itrKum)
    ? k.gulv.map((g) => {
        const m = tilbakeslagMargin(g.kote, k.itrKum as number, krav);
        return { navn: g.navn, kote: g.kote, margin: m.margin, krav, ok: m.ok, mangel: m.mangel };
      })
    : [];
  const lov2Status = gulvKontroller.length === 0 ? 'mangler_data' : gulvKontroller.some((g) => !g.ok) ? 'brudd' : 'ok';

  // Kote ved grunnmur
  let minKoteUtgang: number | null = null;
  let hoydeIGroft: number | null = null;
  if (harTall(k.ibrKum) && harTall(k.itrKum) && harTall(k.stikkLengde) && harTall(k.fallNevner) && k.fallNevner > 0) {
    const r = koteRegnskap({ ibrKum: k.ibrKum, itrKum: k.itrKum, stikkLengde: k.stikkLengde, fall: 1 / k.fallNevner, laveste: k.itrKum, krav });
    minKoteUtgang = r.minKoteUtgang;
    hoydeIGroft = r.hoydeIGroft;
  }

  // Overvann
  let overvann: ProsjektAnalyse['overvann'] = null;
  if (flaterOk && harTall(p.overvann.intensitet)) {
    const aRed = reduserAreal(p.overvann.flater.map((f) => ({ navn: f.navn, areal: f.areal, phi: f.phi as number })));
    const q = regnavrenning(p.overvann.intensitet, aRed);
    overvann = {
      aRed,
      q,
      tilbakehold: harTall(p.overvann.maksPaaslippLs) ? Math.max(0, q - p.overvann.maksPaaslippLs) : null,
    };
  }

  // Varmtvann til samtidige dusjer
  let bereder: ProsjektAnalyse['bereder'] = null;
  const b = p.belastning;
  if (harTall(b.dusjer) && harTall(b.dusjMinutter) && harTall(b.dusjLs)) {
    const blandetLiter = b.dusjer * b.dusjLs * b.dusjMinutter * 60;
    bereder = {
      blandetLiter,
      varmLiter: varmtvannsVolum(blandetLiter, BEREDER_ANTAGELSER.blandetTemp, BEREDER_ANTAGELSER.berederTemp, BEREDER_ANTAGELSER.kaldtTemp),
    };
  }

  // Varmesentral (TEK17 § 14-4 (2))
  const kravM2 = harTall(p.bra) ? minAreaVarmesentral(p.bra) : null;
  const varmesentral = {
    kravM2,
    avsattM2: p.tekniskRomM2,
    ok: kravM2 !== null && harTall(p.tekniskRomM2) ? p.tekniskRomM2 >= kravM2 : null,
  };

  const v = p.vanntrykk;
  const trykk = {
    statiskBar: v.statiskBar,
    dynamiskBar: v.dynamiskBar,
    uttakLmin: v.uttakLmin,
    fallBar: harTall(v.statiskBar) && harTall(v.dynamiskBar) ? v.statiskBar - v.dynamiskBar : null,
    antatt: v.antatt,
  };

  // Hydrostatisk trykktap vs. koter og 6,0 bar-regelen (TEK17 § 15-5 / NS-EN 806-2)
  const koteMaalepunkt = harTall(k.vannledning)
    ? k.vannledning
    : harTall(k.ibrKum)
    ? k.ibrKum
    : harTall(k.itrKum)
    ? k.itrKum
    : harTall(k.gate)
    ? Math.round((k.gate - 1.6) * 100) / 100
    : null;
  const koteMaalepunktKilde = harTall(k.vannledning)
    ? 'Kote kommunal vannledning'
    : harTall(k.ibrKum)
    ? 'Kote IBR i kum'
    : harTall(k.itrKum)
    ? 'Kote ITK/ITR i kum'
    : harTall(k.gate)
    ? 'Terrengkote − 1,60 m (frostfri dybde)'
    : 'Ikke oppgitt';

  const gulvKoter = k.gulv.map((g) => g.kote).filter(harTall);
  const lavesteGulvKote = gulvKoter.length > 0 ? Math.min(...gulvKoter) : null;
  const hoyesteGulvKote = gulvKoter.length > 0 ? Math.max(...gulvKoter) : null;

  const etasjeTallMatch = p.etasjer.match(/(\d{1,2})\s*(?:etasje|etg|plan)/i);
  const antallEtasjer = etasjeTallMatch
    ? Math.max(1, Number(etasjeTallMatch[1]))
    : harTall(p.bra) && p.bra > 1500
    ? 3
    : harTall(p.bra) && p.bra > 500
    ? 2
    : 1;

  let hoyesteTapKote: number | null = null;
  if (hoyesteGulvKote !== null && lavesteGulvKote !== null) {
    const byggeHoydeFraLaveste = Math.max(
      hoyesteGulvKote - lavesteGulvKote + 2.2,
      Math.max(1, antallEtasjer - 1) * 3.2 + 2.2
    );
    hoyesteTapKote = Math.round((lavesteGulvKote + byggeHoydeFraLaveste) * 100) / 100;
  } else if (harTall(k.gate)) {
    hoyesteTapKote = Math.round((k.gate + Math.max(1, antallEtasjer - 1) * 3.2 + 2.2) * 100) / 100;
  }

  let geodetiskLoftehoydeM = Math.max(3.5, antallEtasjer * 3.0);
  if (hoyesteTapKote !== null && koteMaalepunkt !== null) {
    geodetiskLoftehoydeM = Math.max(2.0, Math.round((hoyesteTapKote - koteMaalepunkt) * 10) / 10);
  } else if (hoyesteTapKote !== null && lavesteGulvKote !== null) {
    geodetiskLoftehoydeM = Math.max(2.0, Math.round((hoyesteTapKote - lavesteGulvKote) * 10) / 10);
  }

  const hydrostatiskTapKpa = Math.round(geodetiskLoftehoydeM * 9.81 * 10) / 10;
  const hydrostatiskTapBar = Math.round((hydrostatiskTapKpa / 100) * 100) / 100;

  // Hvis laveste gulv/kjeller ligger lavere enn målepunktet, øker statisk trykk i bunnen av bygget
  const ekstraFallTilKjellerM =
    koteMaalepunkt !== null && lavesteGulvKote !== null && koteMaalepunkt > lavesteGulvKote
      ? koteMaalepunkt - lavesteGulvKote
      : 0;
  const maksStatiskTrykkBar = harTall(v.statiskBar)
    ? Math.round((v.statiskBar + ekstraFallTilKjellerM * 0.0981) * 100) / 100
    : null;

  const aktivtInntaksTrykkBar = harTall(v.dynamiskBar)
    ? v.dynamiskBar
    : harTall(v.statiskBar)
    ? v.statiskBar
    : null;
  const disponibeltToppBar =
    aktivtInntaksTrykkBar !== null
      ? Math.round((aktivtInntaksTrykkBar - hydrostatiskTapBar) * 100) / 100
      : null;

  const kravTrykkreduksjonsventil =
    (harTall(v.statiskBar) && v.statiskBar > 6.0) ||
    (maksStatiskTrykkBar !== null && maksStatiskTrykkBar > 6.0);

  const trengerTrykkokning = disponibeltToppBar !== null && disponibeltToppBar < 2.2;

  const hydrostatisk: HydrostatiskKontroll = {
    koteMaalepunkt,
    koteMaalepunktKilde,
    lavesteGulvKote,
    hoyesteTapKote,
    geodetiskLoftehoydeM,
    hydrostatiskTapBar,
    hydrostatiskTapKpa,
    maksStatiskTrykkBar,
    disponibeltToppBar,
    kravTrykkreduksjonsventil,
    trengerTrykkokning,
  };

  const alarmer: Alarm[] = [];
  for (const g of gulvKontroller) {
    if (!g.ok) {
      alarmer.push({
        alvor: 'rod',
        tekst: `${g.navn}: margin mot ITR er ${(g.margin * 1000).toFixed(0)} mm, krav ${(g.krav * 1000).toFixed(0)} mm (mangler ${(g.mangel * 1000).toFixed(0)} mm). Krever avløpspumpestasjon (NS-EN 12050) eller godkjent tilbakeslagssikring.`,
      });
    }
  }
  if (kravTrykkreduksjonsventil && maksStatiskTrykkBar !== null) {
    alarmer.push({
      alvor: 'rod',
      tekst: `KRAV OM TRYKKREDUKSJONSVENTIL (TEK17 § 15-5 / NS-EN 806-2): Statisk vanntrykk overstiger 6,0 bar (${maksStatiskTrykkBar.toFixed(2)} bar / ${(maksStatiskTrykkBar * 100).toFixed(0)} kPa). Monter trykkreduksjonsventil på hovedinntak (innstilles på 3,5–4,5 bar).`,
    });
  }
  if (varmesentral.ok === false) {
    alarmer.push({ alvor: 'rod', tekst: `Teknisk rom ${varmesentral.avsattM2} m² er mindre enn TEK17 § 14-4(2): ${varmesentral.kravM2?.toFixed(0)} m².` });
  }
  if (harTall(trykk.fallBar) && trykk.fallBar > 1.5) {
    alarmer.push({ alvor: 'gul', tekst: `Trykket faller ${trykk.fallBar.toFixed(1)} bar ved uttak på ${trykk.uttakLmin} l/min – vurder trykkøkning for sprinkler/brannvann.` });
  }
  if (trengerTrykkokning && disponibeltToppBar !== null) {
    alarmer.push({
      alvor: 'gul',
      tekst: `Hydrostatisk løftehøyde (${geodetiskLoftehoydeM.toFixed(1)} m = −${hydrostatiskTapBar.toFixed(2)} bar) gir kun ${disponibeltToppBar.toFixed(2)} bar ved øverste tappested før rørtap – vurder trykkøkningsanlegg (WWBooster).`,
    });
  }
  if (mangler.length > 0) {
    alarmer.push({ alvor: 'gul', tekst: `${mangler.length} punkt${mangler.length === 1 ? '' : 'er'} mangler i underlaget (se ⚠️ HINT).` });
  }

  return {
    krav,
    datasjekk,
    mangler,
    gulvKontroller,
    lov2Status,
    minKoteUtgang,
    hoydeIGroft,
    overvann,
    bereder,
    varmesentral,
    trykk,
    hydrostatisk,
    alarmer,
    fullforing: datasjekk.filter((d) => d.ok).length / datasjekk.length,
  };
}
