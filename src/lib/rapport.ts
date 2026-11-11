import type { ProsjektData } from '../data/prosjekter';
import type { ProsjektAnalyse } from './analyse';
import { fmt } from './format';
import { evaluerGatekeeper } from './gatekeeper';
import type { OverstyringInfo } from './lagring';
import { prosjektKontekst, type Kommando } from './prompt';
import { QA_PUNKTER, SANITY_PUNKTER } from './qa';

const linje = '='.repeat(60);

/**
 * Arbeidsrapport for en super-kommando. Inneholder KUN det appen faktisk kan beregne fra
 * prosjektdata. Alt som krever fagvurdering eller kostnadsdata merkes tydelig og henvises til
 * agent-prompt/AI-chat – ingenting dikter opp.
 */
export function lagArbeidsrapport(kommando: Kommando, p: ProsjektData, a: ProsjektAnalyse): string {
  const L: string[] = [linje, `ARBEIDSRAPPORT – SUPER-KOMMANDO ${kommando.nummer}: ${kommando.navn}`, `Prosjekt: ${p.navn}`, linje, ''];
  const hint = (): void => {
    L.push('⚠️ HINT (Lov 1) – manglende underlag:');
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
    if (alleMangler.length === 0) L.push('  (ingen registrerte mangler)');
    else alleMangler.forEach((m) => L.push(`  • ${m}`));
    L.push('');
  };
  const feller = (): void => {
    if (p.feller.length === 0) return;
    L.push('Feller/avvik prosjektunderlaget peker på:');
    p.feller.forEach((f, i) => L.push(`  ${i + 1}. ${f}`));
    L.push('');
  };

  if (kommando.id === 'kommando-1') {
    L.push('AGENT 01 – Orkestrator: prosjektregistrering');
    L.push(prosjektKontekst(p, a).split('\n').slice(0, 4).map((x) => `  ${x}`).join('\n'));
    L.push('');
    hint();
    L.push('AGENT 09 – Energi: varmesentral (TEK17 § 14-4(2))');
    L.push(
      a.varmesentral.kravM2 === null
        ? '  Kan ikke vurderes: BRA mangler eller er ≤ 1 000 m².'
        : `  Krav ${fmt(a.varmesentral.kravM2, 0)} m² (10 m² + 1 % av BRA). Avsatt: ${a.varmesentral.avsattM2 === null ? 'IKKE OPPGITT' : `${fmt(a.varmesentral.avsattM2, 0)} m² → ${a.varmesentral.ok ? 'OK' : 'FOR LITE'}`}.`,
    );
    L.push('');
    L.push('AGENT 17 / 13 / 12 – 3 alternativer, LCC og BREEAM:');
    L.push('  Ikke beregnet i appen: krever kostnads- og energidata som ikke ligger i prosjektet.');
    L.push('  → Bruk «Kopier kjede-prompt» eller AI-chat, og legg ved dine kostnadstall.');
    L.push('');
    feller();
  } else if (kommando.id === 'kommando-2') {
    L.push('AGENT 19 – Utvendig VA: koter og tilbakeslagskontroll');
    if (a.gulvKontroller.length === 0) L.push('  Kan ikke utføres: ITR og/eller laveste gulv/sluk mangler (Lov 1).');
    for (const g of a.gulvKontroller) {
      L.push(`  ${g.navn}: ${kote(g.kote)} − ITR = ${g.margin >= 0 ? '+' : ''}${fmt(g.margin)} m (krav ${fmt(g.krav)} m) → ${g.ok ? 'OK' : `🚨 RØD ALARM, mangler ${fmt(g.mangel)} m: pumpestasjon (NS-EN 12050) eller godkjent tilbakeslagssikring`}`);
    }
    if (a.minKoteUtgang !== null && a.hoydeIGroft !== null) {
      L.push(`  Grøft: høydetap ${fmt(a.hoydeIGroft)} m → minste kote bunnledning ved grunnmur C +${fmt(a.minKoteUtgang)}`);
    }
    if (a.overvann) {
      L.push(`  Overvann: A_red ${fmt(a.overvann.aRed, 0)} m², q ${fmt(a.overvann.q, 1)} l/s${a.overvann.tilbakehold !== null ? `, tilbakehold ${fmt(a.overvann.tilbakehold, 1)} l/s` : ''} (volum krever IVF-kurve).`);
    } else L.push('  Overvann: kan ikke beregnes (flater med φ, intensitet mangler).');
    L.push('');
    L.push('AGENT 03 – Innvendig sanitær: vanntrykk vs. koter og varmtvann');
    if (p.vanntrykk.statiskBar !== null) {
      L.push(
        `  Statisk trykk: ${fmt(p.vanntrykk.statiskBar, 1)} bar (maks i bygg: ${fmt(a.hydrostatisk.maksStatiskTrykkBar, 2)} bar) → ${
          a.hydrostatisk.kravTrykkreduksjonsventil
            ? '🚨 OVER 6,0 BAR: KRAV OM TRYKKREDUKSJONSVENTIL (TEK17 § 15-5 / NS-EN 806-2)'
            : 'OK (≤ 6,0 bar)'
        }`
      );
      if (a.hydrostatisk.geodetiskLoftehoydeM !== null && a.hydrostatisk.hydrostatiskTapBar !== null) {
        L.push(
          `  Hydrostatisk trykktap til øverste tappested: Δh = ${fmt(a.hydrostatisk.geodetiskLoftehoydeM, 1)} m → ${fmt(a.hydrostatisk.hydrostatiskTapBar, 2)} bar (${fmt(a.hydrostatisk.hydrostatiskTapKpa, 0)} kPa). Disponibelt ved topp: ${fmt(a.hydrostatisk.disponibeltToppBar, 2)} bar.`
        );
      }
    }
    L.push(
      a.bereder
        ? `  ${fmt(a.bereder.blandetLiter, 0)} l blandet vann ≈ ${fmt(a.bereder.varmLiter, 0)} l ved 70 °C (kun dusjene; legg til kjøkken, tap og sirkulasjon).`
        : '  Kan ikke beregnes: antall dusjer, varighet og l/s per dusj mangler.',
    );
    L.push('  Rørdelsregler: kun 45° Y-gren i liggende bunnledning, stake-/spylegren ved stammer og før grunnmur.');
    L.push('');
    hint();
    L.push('AGENT 07 / 16: bruk Agent 07-prompten for tegneinstruks og Agent 16 QA-port for baklengs kontroll.');
    L.push('');
    feller();
  } else {
    L.push('AGENT 04 / 05 / 06 / 08 – varme, sprinkler, ventilasjon, ITB (alle 9 moduler aktive)');
    L.push('  Automatisk kontrollert fra prosjektets globale state:');
    L.push(
      a.varmesentral.kravM2 === null
        ? '  • Varmesentral: kan ikke vurderes (BRA mangler eller ≤ 1 000 m²).'
        : `  • Varmesentral: krav ${fmt(a.varmesentral.kravM2, 0)} m², avsatt ${a.varmesentral.avsattM2 === null ? 'IKKE OPPGITT' : `${fmt(a.varmesentral.avsattM2, 0)} m² → ${a.varmesentral.ok ? 'OK' : 'FOR LITE'}`}`,
    );
    if (p.vanntrykk.statiskBar !== null) {
      L.push(
        `  • Trykksjekk (> 6,0 bar): Statisk ${fmt(p.vanntrykk.statiskBar, 1)} bar → ${
          a.hydrostatisk.kravTrykkreduksjonsventil
            ? '🚨 KRAV OM TRYKKREDUKSJONSVENTIL (TEK17 § 15-5)'
            : 'OK (≤ 6,0 bar)'
        }`
      );
    }
    if (a.trykk.fallBar !== null) {
      L.push(`  • Sprinkler/brannvann: statisk ${fmt(a.trykk.statiskBar, 1)} bar, dynamisk ${fmt(a.trykk.dynamiskBar, 1)} bar ved ${fmt(a.trykk.uttakLmin, 0)} l/min (fall ${fmt(a.trykk.fallBar, 1)} bar).`);
    } else L.push('  • Sprinkler/brannvann: Q/p-måling mangler – sprinklerkrav kan ikke kontrolleres.');
    L.push('');
    hint();
    L.push('→ Bruk «Kopier kjede-prompt» eller AI-chat for selve dimensjoneringen.');
    L.push('');
    feller();
  }
  return L.join('\n');
}

function kote(n: number): string {
  return `C ${n >= 0 ? '+' : '−'}${fmt(Math.abs(n))}`;
}

/** QA-rapport (Agent 16) basert på beregnede tall, Gatekeeper-status og brukerens avkryssinger. */
export function lagQaRapport(
  p: ProsjektData,
  a: ProsjektAnalyse,
  qa: Record<string, boolean>,
  sanity: Record<string, boolean> = qa,
  overstyringer: Record<string, OverstyringInfo> = {},
): string {
  const ferdig = QA_PUNKTER.filter((s) => qa[s.id]).length;
  const gk = evaluerGatekeeper(p, a, overstyringer, ferdig);
  const L: string[] = [
    linje,
    'AGENT 16 – QA-RAPPORT & GATEKEEPER SLUTTKONTROLL (DJEVELENS ADVOKAT)',
    `Prosjekt: ${p.navn} | ${new Date().toLocaleDateString('no-NO')}`,
    `Gatekeeper-status: ${
      gk.kanGodkjenneUtenForbehold
        ? '✅ GODKJENT UTEN FORBEHOLD (Alle kritiske data bekreftet)'
        : gk.kanGodkjenneEndelig
        ? `🟡 GODKJENT MED FORBEHOLD (${gk.overstyrteEstimater.length} midlertidige estimater / venter på kommunen)`
        : `🛑 IKKE KLAR FOR ENDELIG LÅSING (${gk.kritiskeMangler.length} kritiske mangler uavklart)`
    }`,
    linje,
    '',
  ];
  if (gk.overstyrteEstimater.length > 0) {
    L.push('0. 🟡 MIDLERTIDIGE ESTIMATER & FORBEHOLD (VENTER PÅ KOMMUNEN / ETAT)');
    gk.overstyrteEstimater.forEach((ov) =>
      L.push(`  • ${ov.tittel}: ${ov.overstyring?.etikett} (${ov.overstyring?.estimatVerdi ?? ov.verdiTekst})`)
    );
    L.push('');
  }
  L.push('1. REVERSERT KONTROLL AV TALL FRA APPEN (GLOBAL PROSJEKT-STATE)');
  L.push(`  Adresse/Sted: ${p.sted || 'IKKE OPPGITT'} | Gnr/Bnr: ${p.matrikkel || 'IKKE OPPGITT'} | BRA: ${p.bra !== null ? `${fmt(p.bra, 0)} m²` : 'IKKE OPPGITT'}`);
  if (p.vanntrykk.statiskBar !== null) {
    L.push(
      `  Statisk vanntrykk vs. koter: ${fmt(p.vanntrykk.statiskBar, 1)} bar (maks i bygget: ${fmt(a.hydrostatisk.maksStatiskTrykkBar, 2)} bar) → ${
        a.hydrostatisk.kravTrykkreduksjonsventil
          ? '🚨 OVER 6,0 BAR: KRAV OM TRYKKREDUKSJONSVENTIL (TEK17 § 15-5 / NS-EN 806-2)'
          : 'OK (≤ 6,0 bar)'
      }`
    );
    if (a.hydrostatisk.geodetiskLoftehoydeM !== null && a.hydrostatisk.hydrostatiskTapBar !== null) {
      L.push(
        `  Hydrostatisk trykktap (ITK -> høyeste tappested): Δh = ${fmt(a.hydrostatisk.geodetiskLoftehoydeM, 1)} m → ${fmt(a.hydrostatisk.hydrostatiskTapBar, 2)} bar (${fmt(a.hydrostatisk.hydrostatiskTapKpa, 0)} kPa)`
      );
    }
  }
  if (a.minKoteUtgang !== null) L.push(`  Kote bunnledning ved grunnmur: IBR + L·fall = C +${fmt(a.minKoteUtgang)}`);
  if (a.overvann) L.push(`  Overvann: q = i·A_red = ${fmt(a.overvann.q, 1)} l/s`);
  if (a.bereder) L.push(`  Varmtvann dusjer: ${fmt(a.bereder.varmLiter, 0)} l ved 70 °C (kun dusjene)`);
  if (a.minKoteUtgang === null && !a.overvann && !a.bereder && p.vanntrykk.statiskBar === null) L.push('  Ingen beregnbare størrelser – data mangler.');
  L.push('');
  L.push(`2. KOTE- OG TILBAKESLAGSKONTROLL (krav ${fmt(a.krav)} m)`);
  if (a.gulvKontroller.length === 0) L.push('  Kan ikke utføres: ITR og/eller gulvkote mangler.');
  for (const g of a.gulvKontroller) {
    L.push(`  ${g.ok ? 'OK ' : '🚨 BRUDD'} ${g.navn}: margin ${g.margin >= 0 ? '+' : ''}${fmt(g.margin)} m`);
  }
  L.push('');
  L.push('3. ⚠️ HINT – MANGLENDE UNDERLAG');
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
  if (alleMangler.length === 0) L.push('  (ingen)');
  else alleMangler.forEach((m) => L.push(`  • ${m}`));
  L.push('');
  L.push('4. SANITY CHECK (avkrysset av bruker)');
  SANITY_PUNKTER.forEach((s) => L.push(`  [${sanity[s.id] ? 'x' : ' '}] ${s.tekst}`));
  L.push('');
  L.push('5. KONTROLL FØR SIGNATUR (avkrysset av bruker)');
  QA_PUNKTER.forEach((s) => L.push(`  [${qa[s.id] ? 'x' : ' '}] ${s.tekst}`));
  L.push('');
  L.push(`Status: ${ferdig} av ${QA_PUNKTER.length} kontrollpunkter bekreftet.${a.alarmer.some((x) => x.alvor === 'rod') ? ' RØDE ALARMER er åpne.' : ''}`);
  return L.join('\n');
}
