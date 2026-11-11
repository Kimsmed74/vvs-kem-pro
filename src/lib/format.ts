/** Norsk tallformatering (komma som desimaltegn). */
export function fmt(tall: number | null | undefined, desimaler = 2): string {
  if (tall === null || tall === undefined || Number.isNaN(tall)) return '–';
  return tall.toFixed(desimaler).replace('.', ',');
}

/** Tolker tekstinput som tall; tillater både komma og punktum. */
export function tilTall(verdi: string): number {
  const n = parseFloat(verdi.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

/** Kopierer tekst til utklippstavlen, med reservemetode. Returnerer true ved suksess. */
export async function kopierTilUtklippstavle(tekst: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(tekst);
    return true;
  } catch {
    return false;
  }
}

export function lastNedTekst(filnavn: string, tekst: string): void {
  const blob = new Blob([tekst], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filnavn;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Renser rå LaTeX-formler og matematikknotasjon til ren, lesbar Markdown / UTF-8 tekst.
 * F.eks.:
 *   "$$P_{\text{romoppvarming}} = 3\,200 \text{ m}^2 \times 35 \text{ W/m}^2 = 112 \text{ kW}$$"
 *   -> "P_romoppvarming = 3 200 m² × 35 W/m² = 112 kW"
 */
export function rensLatexFormler(tekst: string): string {
  if (!tekst || typeof tekst !== 'string') return tekst;

  let s = tekst;

  // 1. Fjern doble dollartegn ($$...$$)
  s = s.replace(/\$\$([\s\S]*?)\$\$/g, (_, innhold) => innhold.trim());

  // 2. Håndter \text{...}, \mathrm{...}, \mathbf{...}, \mathit{...} (opptil 3 nøstinger)
  for (let i = 0; i < 3; i++) {
    s = s.replace(/\\(?:text|mathrm|mathbf|mathit|textbf|textrm)\{([^{}]*)\}/g, '$1');
  }

  // 3. Senket skrift: _{...} -> _... (utføres før \frac og \sqrt for å unngå nøstede klammeproblemer)
  s = s.replace(/_\{([^{}]+)\}/g, '_$1');

  // 4. Hevet skrift / eksponenter: ^2 -> ², ^3 -> ³, ^{2} -> ²
  s = s.replace(/\^\{2\}|\^2(?![0-9])/g, '²');
  s = s.replace(/\^\{3\}|\^3(?![0-9])/g, '³');
  s = s.replace(/\^\{([^{}]+)\}/g, '^$1');

  // 5. Håndter \frac{teller}{nevner} -> (teller) / (nevner)
  for (let i = 0; i < 3; i++) {
    s = s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1) / ($2)');
  }

  // 6. Håndter \sqrt{innhold} -> √(innhold)
  for (let i = 0; i < 3; i++) {
    s = s.replace(/\\sqrt\{([^{}]+)\}/g, '√($1)');
  }

  // 7. Matematiske symboler og operatorer
  s = s.replace(/\\Delta\s*(?=[a-zA-Z0-9])/g, 'Δ');
  s = s.replace(/\\Delta/g, 'Δ');
  s = s.replace(/\\Phi\s*(?=[a-zA-Z0-9])/g, 'Φ');
  s = s.replace(/\\Phi/g, 'Φ');
  s = s.replace(/\\cdot/g, '·');
  s = s.replace(/\\times/g, '×');
  s = s.replace(/\\leq?/g, '≤');
  s = s.replace(/\\geq?/g, '≥');
  s = s.replace(/\\neq/g, '≠');
  s = s.replace(/\\approx/g, '≈');
  s = s.replace(/\\pm/g, '±');
  s = s.replace(/\\sum/g, 'Σ');
  s = s.replace(/\\Omega/g, 'Ω');
  s = s.replace(/\\mu/g, 'µ');
  s = s.replace(/\\pi/g, 'π');
  s = s.replace(/\\rightarrow|\\to/g, '→');
  s = s.replace(/\\leftarrow/g, '←');
  s = s.replace(/\\infty/g, '∞');

  // 8. LaTeX mellomrom: \, \; \: \quad \qquad \!
  s = s.replace(/\\(?:,|;|:|quad|qquad)/g, ' ');
  s = s.replace(/\\!/g, '');

  // 9. Fjern enkle dollartegn ($...$) rundt matematiske formler
  s = s.replace(/\$([^\$\n]+?)\$/g, '$1');

  // 10. Normaliser multiple påfølgende mellomrom
  s = s.replace(/[ \t]{2,}/g, ' ');

  return s.trim();
}
