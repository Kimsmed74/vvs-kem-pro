import type { ProsjektData } from '../data/prosjekter';
import type {
  StrekkResultat,
  Trykkbudsjett,
  TrykkbudsjettResultat,
} from '../engine/sanitaer';
import { fmt } from './format';

export type StrekkSum = { lengde: number; rxl: number };
export type BeregnetStrekk = StrekkResultat;
export type ProsjektBudsjett = TrykkbudsjettResultat;

export interface TrykkfallMarkdownOpsjoner {
  prosjektTittel: string;
  prosjektData?: ProsjektData | null;
  budsjett: Trykkbudsjett | {
    hovedtrykk: number;
    resttrykk: number;
    loftehoyde: number;
    enkeltmotstand: number;
    rordelerProsent: number;
    rorlengde?: number;
  };
  bud: TrykkbudsjettResultat;
  beregnet: StrekkResultat[];
  sum: StrekkSum;
  margin: number;
  ok: boolean;
  dato?: string;
}

/**
 * Genererer en profesjonell, ferdig formatert teknisk rapport i ren Markdown.
 * Tilpasset NotebookLM, prosjektdokumentasjon og eksport til PDF/Word.
 * Alle formler skrives i ren, lesbar Markdown uten rå LaTeX-koder.
 */
export function genererTrykkfallMarkdown(ops: TrykkfallMarkdownOpsjoner): string {
  const { prosjektTittel, prosjektData, budsjett, bud, beregnet, sum, margin, ok } = ops;
  const dato =
    ops.dato ??
    new Date().toLocaleDateString('no-NO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  const adresse = prosjektData?.sted || 'Ikke oppgitt';
  const matrikkel = prosjektData?.matrikkel || 'Ikke oppgitt';
  const bygningstype = prosjektData?.bygningstype || 'Ikke oppgitt';

  const utnyttelse =
    bud.dispFriksjon > 0 ? ((sum.rxl / bud.dispFriksjon) * 100).toFixed(1) : '0.0';

  const linjer: string[] = [
    `# SANITÆR TRYKKFALLSBEREGNING – SINTEF Byggforsk 553.102`,
    `**Standarder:** SINTEF Byggforsk Kunnskapssystem 553.102 · TEK17 § 15-5 · NS-EN 806`,
    ``,
    `## Prosjektopplysninger`,
    `- **Prosjekt:** ${prosjektTittel}`,
    `- **Adresse:** ${adresse}`,
    `- **Matrikkel:** ${matrikkel}`,
    `- **Bygningskategori:** ${bygningstype}`,
    `- **Dato:** ${dato}`,
    `- **Utførende RIV:** Kim Jørgensen | Rørleggermester & Rådgivende Ingeniør VVS (RIV)`,
    `- **Beregnet system:** Fordelingsledninger for forbruksvann (Kaldtvann KV / Varmtvann VV)`,
    ``,
    `## 1. Forutsetninger & Trykkbudsjett`,
    `- **Trykk i hovedledning (p_0):** ${fmt(budsjett.hovedtrykk, 0)} kPa (${fmt(budsjett.hovedtrykk / 100, 2)} bar)`,
    `- **Nødvendig resttrykk før armatur (p_rest):** ${fmt(budsjett.resttrykk, 0)} kPa (${fmt(budsjett.resttrykk / 100, 2)} bar)`,
    `- **Løftehøyde (h):** ${fmt(budsjett.loftehoyde, 1)} m`,
    `- **Løftetrykk / geodetisk (p_geo = h × 9,81):** ${fmt(bud.loftetrykk)} kPa`,
    `- **Større enkeltmotstander (vannmåler, filter, tilbakeslag):** ${fmt(budsjett.enkeltmotstand, 1)} kPa`,
    `- **Disponibelt til friksjon + enkeltmotstander:** ${fmt(bud.dispFriksjonOgEnkelt)} kPa`,
    `- **Avsatt til rørdeler (${fmt(budsjett.rordelerProsent, 0)} %):** ${fmt(bud.rordeler)} kPa`,
    `- **Disponibelt trykk til rørfriksjon (p_disp,frik):** ${fmt(bud.dispFriksjon)} kPa`,
    `- **Total rørlengde (ugunstigste trasé Σ l):** ${fmt(sum.lengde, 1)} m`,
    `- **Midlere rørfriksjon (R_midlere = p_disp,frik / Σ l):** ${bud.midlereR !== null ? `${fmt(bud.midlereR, 3)} kPa/m` : '0,000 kPa/m'}`,
    ...(prosjektData?.sanitaerUtstyr
      ? [
          ``,
          `### Registrert Sanitærutstyr & Normflommer (Byggforsk 553.102 / NS-EN 806)`,
          `| Armatur / Utstyr | Antall | q_n per enhet (l/s) | DU | Sum q_n (l/s) | Sum DU |`,
          `| :--- | :---: | :---: | :---: | :---: | :---: |`,
          `| Toalett / WC | ${prosjektData.sanitaerUtstyr.wc.antall} | ${prosjektData.sanitaerUtstyr.wc.qnLPrS} | ${prosjektData.sanitaerUtstyr.wc.du} | ${(prosjektData.sanitaerUtstyr.wc.antall * prosjektData.sanitaerUtstyr.wc.qnLPrS).toFixed(2)} | ${(prosjektData.sanitaerUtstyr.wc.antall * prosjektData.sanitaerUtstyr.wc.du).toFixed(1)} |`,
          `| Servant / Håndvask | ${prosjektData.sanitaerUtstyr.servant.antall} | ${prosjektData.sanitaerUtstyr.servant.qnLPrS} | ${prosjektData.sanitaerUtstyr.servant.du} | ${(prosjektData.sanitaerUtstyr.servant.antall * prosjektData.sanitaerUtstyr.servant.qnLPrS).toFixed(2)} | ${(prosjektData.sanitaerUtstyr.servant.antall * prosjektData.sanitaerUtstyr.servant.du).toFixed(1)} |`,
          ...(prosjektData.sanitaerUtstyr.urinal.antall > 0
            ? [`| Urinal | ${prosjektData.sanitaerUtstyr.urinal.antall} | ${prosjektData.sanitaerUtstyr.urinal.qnLPrS} | ${prosjektData.sanitaerUtstyr.urinal.du} | ${(prosjektData.sanitaerUtstyr.urinal.antall * prosjektData.sanitaerUtstyr.urinal.qnLPrS).toFixed(2)} | ${(prosjektData.sanitaerUtstyr.urinal.antall * prosjektData.sanitaerUtstyr.urinal.du).toFixed(1)} |`]
            : []),
          `| Dusj | ${prosjektData.sanitaerUtstyr.dusj.antall} | ${prosjektData.sanitaerUtstyr.dusj.qnLPrS} | ${prosjektData.sanitaerUtstyr.dusj.du} | ${(prosjektData.sanitaerUtstyr.dusj.antall * prosjektData.sanitaerUtstyr.dusj.qnLPrS).toFixed(2)} | ${(prosjektData.sanitaerUtstyr.dusj.antall * prosjektData.sanitaerUtstyr.dusj.du).toFixed(1)} |`,
          `| Kjøkkenvask | ${prosjektData.sanitaerUtstyr.kjokkenvask.antall} | ${prosjektData.sanitaerUtstyr.kjokkenvask.qnLPrS} | ${prosjektData.sanitaerUtstyr.kjokkenvask.du} | ${(prosjektData.sanitaerUtstyr.kjokkenvask.antall * prosjektData.sanitaerUtstyr.kjokkenvask.qnLPrS).toFixed(2)} | ${(prosjektData.sanitaerUtstyr.kjokkenvask.antall * prosjektData.sanitaerUtstyr.kjokkenvask.du).toFixed(1)} |`,
          `| Oppvaskmaskin | ${prosjektData.sanitaerUtstyr.oppvaskmaskin.antall} | ${prosjektData.sanitaerUtstyr.oppvaskmaskin.qnLPrS} | ${prosjektData.sanitaerUtstyr.oppvaskmaskin.du} | ${(prosjektData.sanitaerUtstyr.oppvaskmaskin.antall * prosjektData.sanitaerUtstyr.oppvaskmaskin.qnLPrS).toFixed(2)} | ${(prosjektData.sanitaerUtstyr.oppvaskmaskin.antall * prosjektData.sanitaerUtstyr.oppvaskmaskin.du).toFixed(1)} |`,
          ...(prosjektData.sanitaerUtstyr.badekar?.antall
            ? [`| Badekar | ${prosjektData.sanitaerUtstyr.badekar.antall} | ${prosjektData.sanitaerUtstyr.badekar.qnLPrS} | ${prosjektData.sanitaerUtstyr.badekar.du} | ${(prosjektData.sanitaerUtstyr.badekar.antall * prosjektData.sanitaerUtstyr.badekar.qnLPrS).toFixed(2)} | ${(prosjektData.sanitaerUtstyr.badekar.antall * prosjektData.sanitaerUtstyr.badekar.du).toFixed(1)} |`]
            : []),
          ...(prosjektData.sanitaerUtstyr.vaskemaskin?.antall
            ? [`| Vaskemaskin (tøy) | ${prosjektData.sanitaerUtstyr.vaskemaskin.antall} | ${prosjektData.sanitaerUtstyr.vaskemaskin.qnLPrS} | ${prosjektData.sanitaerUtstyr.vaskemaskin.du} | ${(prosjektData.sanitaerUtstyr.vaskemaskin.antall * prosjektData.sanitaerUtstyr.vaskemaskin.qnLPrS).toFixed(2)} | ${(prosjektData.sanitaerUtstyr.vaskemaskin.antall * prosjektData.sanitaerUtstyr.vaskemaskin.du).toFixed(1)} |`]
            : []),
          ...(prosjektData.sanitaerUtstyr.utslagsvask?.antall
            ? [`| Utslagsvask | ${prosjektData.sanitaerUtstyr.utslagsvask.antall} | ${prosjektData.sanitaerUtstyr.utslagsvask.qnLPrS} | ${prosjektData.sanitaerUtstyr.utslagsvask.du} | ${(prosjektData.sanitaerUtstyr.utslagsvask.antall * prosjektData.sanitaerUtstyr.utslagsvask.qnLPrS).toFixed(2)} | ${(prosjektData.sanitaerUtstyr.utslagsvask.antall * prosjektData.sanitaerUtstyr.utslagsvask.du).toFixed(1)} |`]
            : []),
          `| **SUMMER** | - | - | - | **${prosjektData.sanitaerUtstyr.sumQn.toFixed(2)} l/s** | **${prosjektData.sanitaerUtstyr.sumDu.toFixed(1)}** |`,
          ``,
          `- **Dimensjonerende samtidig vannmengde q_s:** **${prosjektData.sanitaerUtstyr.qsLPrS.toFixed(2)} l/s**`,
        ]
      : []),
    ...(prosjektData?.rorSystemer?.poster && prosjektData.rorSystemer.poster.length > 0
      ? [
          ``,
          `### Registrerte Rørsystemer i bygget`,
          `| System | Dimensjon | Lengde (m) | Materiale |`,
          `| :--- | :---: | :---: | :--- |`,
          ...prosjektData.rorSystemer.poster.map(
            (p) => `| ${p.navn} | ${p.dimensjon || '-'} | ${p.lengdeM !== undefined ? `${p.lengdeM} m` : '-'} | ${p.materiale || '-'} |`
          ),
        ]
      : []),
    ``,
    `## 2. Dimensjoneringstabell for rørstrekk (Byggforsk 553.102)`,
    `Formel for samtidig vannmengde: q_S = q_N1 + 0,015 × (Σ q_N − q_N1) + 0,17 × √(Σ q_N − q_N1)`,
    ``,
    `| Strekk | Σ q_N (l/s) | q_N1 (l/s) | q_S (l/s) | q_kont (l/s) | q_dim (l/s) | Dim (mm) | d_i (mm) | v (m/s) | R (kPa/m) | l (m) | R · l (kPa) | Status v ≤ 2,0 m/s |`,
    `| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |`,
    ...beregnet.map((b) => {
      const vOk = b.hastighet <= 2.0;
      return `| ${b.navn} | ${fmt(b.sumQn, 1)} | ${fmt(b.qn1, 1)} | ${fmt(b.qS, 3)} | ${fmt(b.qkont, 1)} | ${fmt(b.qdim, 3)} | ${b.dim} | ${fmt(b.di, 1)} | ${fmt(b.hastighet)} | ${fmt(b.R, 3)} | ${fmt(b.l, 1)} | ${fmt(b.rxl)} | ${vOk ? '✅ OK' : '⚠️ For høy'} |`;
    }),
    `| **SUM LENGDE & TRYKKFALL** | - | - | - | - | - | - | - | - | - | **${fmt(sum.lengde, 1)} m** | **${fmt(sum.rxl)} kPa** | **${ok ? '✅ GODKJENT' : '🛑 AVVIK'}** |`,
    ``,
    `## 3. Sluttkontroll & Dimensjoneringskonklusjon`,
    `- **Beregnet totalt friksjonstap (Σ R · l):** ${fmt(sum.rxl)} kPa`,
    `- **Disponibelt trykktap til rørfriksjon (p_disp,frik):** ${fmt(bud.dispFriksjon)} kPa`,
    `- **Trykkmargin:** ${margin >= 0 ? '+' : ''}${fmt(margin)} kPa (${utnyttelse} % utnyttelse av tilgjengelig trykk)`,
    `- **Status:** **${ok ? '✅ GODKJENT TRYKKBUDSJETT' : '🛑 IKKE GODKJENT – FOR STORT TRYKKFALL'}**`,
    ``,
    ok
      ? `> **Konklusjon:** Kontroll: Σ(R · l) = ${fmt(sum.rxl)} kPa mot disponibelt ${fmt(bud.dispFriksjon)} kPa → **OK (margin ${fmt(margin)} kPa)**.\n` +
        `> Det prosjekterte røranlegget tilfredsstiller kravene til maksimalt trykktap og vannhastighet (v ≤ 2,0 m/s) i henhold til SINTEF Byggforsk Kunnskapssystem 553.102 og TEK17 § 15-5. Nødvendig resttrykk opprettholdes ved ugunstigste tappested.`
      : `> **Avvik:** Kontroll: Σ(R · l) = ${fmt(sum.rxl)} kPa mot disponibelt ${fmt(bud.dispFriksjon)} kPa → **IKKE OK (mangler ${fmt(Math.abs(margin))} kPa)**.\n` +
        `> Det samlede trykktapet overskrider tilgjengelig trykk. Det må velges større rørdimensjoner på hovedstrekkene, eller prosjekteres trykkøkningspumpe.`,
    ``,
    `---`,
    `*Rapport generert av VVS KEM PRO · Kim Jørgensen | Rørleggermester & RIV*`,
  ];

  return linjer.join('\n');
}

// Bakoverkompatibel alias
export const lagRapportMarkdown = (
  meta: { prosjektTittel: string; adresse: string; matrikkel: string; bygningstype: string; dato?: string },
  budsjett: { hovedtrykk: number; resttrykk: number; loftehoyde: number; enkeltmotstand: number; rordelerProsent: number },
  bud: ProsjektBudsjett,
  beregnet: BeregnetStrekk[],
  sum: StrekkSum,
  ok: boolean,
  margin: number
) =>
  genererTrykkfallMarkdown({
    prosjektTittel: meta.prosjektTittel,
    prosjektData: {
      sted: meta.adresse,
      matrikkel: meta.matrikkel,
      bygningstype: meta.bygningstype,
    } as any,
    budsjett,
    bud,
    beregnet,
    sum,
    margin,
    ok,
    dato: meta.dato,
  });
