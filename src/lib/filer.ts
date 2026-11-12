import type {
  ProsjektData,
  KlimaData,
  UVerdierData,
  SanitaerUtstyrData,
  VentilasjonKravData,
  RorSystemPost,
  RorSystemerData,
  VarmeanleggData,
} from '../data/prosjekter';
import { beregnQs } from '../engine/sanitaer';

export type FilKategori =
  | 'plantegning'
  | 'systemskjema'
  | 'typeskilt_bilde'
  | 'va_kart'
  | 'kalkyle_excel'
  | 'rapport_pdf'
  | 'lydopptak'
  | 'annet';

export const FIL_KATEGORI_ETIKETTER: Record<FilKategori, { navn: string; ikon: string }> = {
  plantegning: { navn: 'Plantegning / DAK', ikon: '📐' },
  systemskjema: { navn: 'Systemskjema / P&ID', ikon: '🔀' },
  typeskilt_bilde: { navn: 'Bilde / Typeskilt / Byggeplass', ikon: '📷' },
  va_kart: { navn: 'VA-kart / Situasjonsplan', ikon: '🗺️' },
  kalkyle_excel: { navn: 'Kalkyle / Regneark (Excel/CSV)', ikon: '📊' },
  rapport_pdf: { navn: 'Rapport / Beskrivelse (PDF/Word)', ikon: '📄' },
  lydopptak: { navn: 'Lydopptak / Befaring / Møte (.mp3, .m4a, .mp4, .wav)', ikon: '🎙️' },
  annet: { navn: 'Annet vedlegg', ikon: '📎' },
};

export interface ProsjektFil {
  id: string;
  prosjektId: string;
  navn: string;
  mimeType: string;
  storrelse: number;
  opprettetDato: string;
  kategori: FilKategori;
  /** Base64 uten data:...;base64,-prefiks (brukes direkte i Gemini inlineData) */
  base64Data: string;
  /** Komplett data-URL for visning i <img> eller <iframe> */
  dataUrl: string;
  /** Tekst trukket ut lokalt fra filen (TXT, CSV, XLSX, DOCX, PDF) */
  uttrukketTekst: string;
  /** AI-generert eller lokal oppsummering av innholdet */
  aiOppsummering?: string;
  /** Konkrete tekniske funn (f.eks. pumpeskiltdata, rørdimensjoner, koter) */
  tekniskeFunn?: string[];
}

export interface UttrekkResultat {
  navn?: string;
  /** Sant dersom prosjektnavnet ble funnet eksplisitt inne i dokumentteksten (ikke kun gjettet fra filnavn) */
  eksaktNavnFraTekst?: boolean;
  bygningstype?: string;
  bra?: number;
  etasjer?: string;
  sted?: string;
  matrikkel?: string;
  vaMyndighet?: string;
  byggherre?: string;
  miljoambisjon?: string;
  klima?: KlimaData;
  uVerdier?: UVerdierData;
  klimaskjerm?: UVerdierData;
  sanitaerUtstyr?: SanitaerUtstyrData;
  /** Rørsystemer (kaldtvann, varmtvann, avløp, varme) */
  rorSystemer?: RorSystemerData;
  /** Varmeanlegg (varmekilde, radiatorer, gulvvarme, tur/retur, effekt) */
  varmeanlegg?: VarmeanleggData;
  ventilasjon?: VentilasjonKravData;
  transmisjonstapWPerK?: number;
  koter?: {
    gate?: number;
    ibrKum?: number;
    itrKum?: number;
    vannledning?: number;
    stikkLengde?: number;
    fallNevner?: number;
    gulv?: { navn: string; kote: number }[];
  };
  vanntrykk?: {
    statiskBar?: number;
    dynamiskBar?: number;
    uttakLmin?: number;
    antatt?: boolean;
  };
  overvann?: {
    flater?: { navn: string; areal: number; phi: number }[];
    intensitet?: number;
    maksPaaslippLs?: number;
  };
  belastning?: {
    dusjer?: number;
    dusjMinutter?: number;
    dusjLs?: number;
  };
  tekniskRomM2?: number;
  oppsummering?: string;
  tekniskeFunn?: string[];
  foreslatteFeller?: string[];
}

export function nyFilId(): string {
  return `fil-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Gjetter riktig kategori ut fra filnavn og MIME-type. */
export function detekterFilKategori(navn: string, mimeType: string): FilKategori {
  const lav = navn.toLowerCase();
  if (lav.includes('va-kart') || lav.includes('vakart') || lav.includes('situasjon') || lav.includes('kum')) {
    return 'va_kart';
  }
  if (lav.includes('skjema') || lav.includes('system') || lav.includes('flyt') || lav.includes('pid')) {
    return 'systemskjema';
  }
  if (lav.includes('plan') || lav.includes('etg') || lav.includes('etasje') || lav.includes('snitt') || lav.includes('tegning') || lav.includes('bunnledning')) {
    return 'plantegning';
  }
  if (
    lav.endsWith('.xlsx') ||
    lav.endsWith('.xls') ||
    lav.endsWith('.csv') ||
    lav.endsWith('.tsv') ||
    mimeType.includes('spreadsheet') ||
    mimeType.includes('csv')
  ) {
    return 'kalkyle_excel';
  }
  if (mimeType.startsWith('image/')) {
    return 'typeskilt_bilde';
  }
  if (
    lav.endsWith('.mp3') ||
    lav.endsWith('.m4a') ||
    lav.endsWith('.wav') ||
    lav.endsWith('.mp4') ||
    lav.endsWith('.webm') ||
    lav.endsWith('.ogg') ||
    lav.endsWith('.aac') ||
    mimeType.startsWith('audio/') ||
    mimeType === 'video/mp4' ||
    mimeType === 'video/webm'
  ) {
    return 'lydopptak';
  }
  if (
    lav.endsWith('.pdf') ||
    lav.endsWith('.docx') ||
    lav.endsWith('.doc') ||
    lav.endsWith('.txt') ||
    lav.endsWith('.md') ||
    mimeType.includes('pdf') ||
    mimeType.includes('word') ||
    mimeType.startsWith('text/')
  ) {
    return 'rapport_pdf';
  }
  return 'annet';
}

export function arrayBufferTilBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let bin = '';
  const steg = 0x8000;
  for (let i = 0; i < bytes.length; i += steg) {
    bin += String.fromCharCode(...bytes.subarray(i, i + steg));
  }
  return typeof btoa === 'function' ? btoa(bin) : '';
}

export function base64TilUint8Array(base64: string): Uint8Array {
  const ren = base64.includes(',') ? base64.split(',')[1] : base64;
  const bin = typeof atob === 'function' ? atob(ren) : '';
  const ut = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    ut[i] = bin.charCodeAt(i);
  }
  return ut;
}

/** Konverterer CSV/TSV-tekst til en ryddig tabellstreng. */
function formaterCsvTekst(tekst: string): string {
  const linjer = tekst
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (linjer.length === 0) return '';
  const skilletegn = linjer[0].includes(';') ? ';' : linjer[0].includes('\t') ? '\t' : ',';
  return linjer
    .slice(0, 120)
    .map((rad) =>
      rad
        .split(skilletegn)
        .map((c) => c.trim())
        .join(' | ')
    )
    .join('\n');
}

/**
 * Leser ukomprimerte eller deflate-komprimerte XML-filer fra en ZIP-buffer (.docx / .xlsx)
 * ved hjelp av nettleserens innebygde DecompressionStream hvis tilgjengelig.
 */
async function pakkUtZipXmlTekster(buffer: ArrayBuffer): Promise<string> {
  const visning = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  const dekoder = new TextDecoder('utf-8', { fatal: false });
  const funn: string[] = [];

  let offset = 0;
  while (offset + 30 <= bytes.length) {
    const signatur = visning.getUint32(offset, true);
    if (signatur !== 0x04034b50) break; // Local file header

    const metode = visning.getUint16(offset + 8, true);
    const kompStorrelse = visning.getUint32(offset + 18, true);
    const filnavnLengde = visning.getUint16(offset + 26, true);
    const ekstraLengde = visning.getUint16(offset + 28, true);

    const navnStart = offset + 30;
    const navnSlutt = navnStart + filnavnLengde;
    if (navnSlutt > bytes.length) break;

    const filnavn = dekoder.decode(bytes.subarray(navnStart, navnSlutt));
    const dataStart = navnSlutt + ekstraLengde;
    const dataSlutt = dataStart + kompStorrelse;
    if (dataSlutt > bytes.length) break;

    const erRelevanteXml =
      filnavn === 'word/document.xml' ||
      filnavn === 'xl/sharedStrings.xml' ||
      (filnavn.startsWith('xl/worksheets/sheet') && filnavn.endsWith('.xml'));

    if (erRelevanteXml && kompStorrelse > 0) {
      const råData = bytes.subarray(dataStart, dataSlutt);
      try {
        let xmlTekst = '';
        if (metode === 0) {
          xmlTekst = dekoder.decode(råData);
        } else if (metode === 8 && typeof DecompressionStream !== 'undefined') {
          const ds = new DecompressionStream('deflate-raw');
          const writer = ds.writable.getWriter();
          await writer.write(råData);
          await writer.close();
          const utBuffer = await new Response(ds.readable).arrayBuffer();
          xmlTekst = dekoder.decode(new Uint8Array(utBuffer));
        }
        if (xmlTekst) {
          const renTekst = xmlTekst
            .replace(/<\/w:p>|<\/row>|<\/si>/g, '\n')
            .replace(/<\/w:tc>|<\/c>/g, '\t')
            .replace(/<[^>]+>/g, ' ')
            .replace(/[ \t]+/g, ' ')
            .replace(/\n\s+/g, '\n')
            .trim();
          if (renTekst) {
            funn.push(`[${filnavn}]\n${renTekst}`);
          }
        }
      } catch {
        // Ignorer enkeltfeil ved dekomprimering
      }
    }

    offset = dataSlutt;
  }

  return funn.join('\n\n').slice(0, 25000);
}

function dekodPdfLiteralStreng(s: string): string {
  return s
    .replace(/\\(\d{3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, ' ')
    .replace(/\\t/g, ' ')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\');
}

function trekkUtPdfTekstOperatorer(innhold: string, ut: string[]): void {
  // 1. TJ-arrays: [(Fri)-15(heim 49)] TJ
  const tjArrayRegex = /\[((?:[^[\]]|\([^()]*\))*)\]\s*TJ/g;
  let m: RegExpExecArray | null;
  while ((m = tjArrayRegex.exec(innhold)) !== null) {
    const innside = m[1];
    const delStrenger: string[] = [];
    const litRegex = /\(((?:\\.|[^()\\])*)\)/g;
    let lm: RegExpExecArray | null;
    while ((lm = litRegex.exec(innside)) !== null) {
      delStrenger.push(dekodPdfLiteralStreng(lm[1]));
    }
    const samlet = delStrenger.join('').trim();
    if (samlet.length >= 2 && /[A-Za-zÆØÅæøå0-9]/.test(samlet)) {
      ut.push(samlet);
    }
    if (ut.length >= 800) return;
  }

  // 2. Enkle (...) Tj / (...) ' eller generelle lesbare (...) strenger
  const parantesRegex = /\(((?:\\.|[^()\\]){2,200})\)/g;
  while ((m = parantesRegex.exec(innhold)) !== null) {
    const s = dekodPdfLiteralStreng(m[1]).trim();
    if (
      /[a-zA-ZæøåÆØÅ0-9]{2,}/.test(s) &&
      !/^[0-9\s.+-]+$/.test(s) &&
      !/^(?:Identity-H|Adobe|MacRomanEncoding|WinAnsiEncoding|Type1|TrueType|Font)$/i.test(s)
    ) {
      ut.push(s);
    }
    if (ut.length >= 800) return;
  }
}

/**
 * Robust lokal tekstuttrekker fra PDF-filer ved hjelp av pdfjs-dist.
 * Rekonstruerer linjer og tabeller etter vertikal (y) og horisontal (x) plassering,
 * med automatisk fallback til rå tekst-/operatorparsing ved eventuelle feil.
 */
export async function trekkUtLesbarTekstFraPdfBuffer(buffer: ArrayBuffer): Promise<string> {
  try {
    const [_, pdfjsLib] = await Promise.all([
      import('pdfjs-dist/legacy/build/pdf.worker.mjs'),
      import('pdfjs-dist/legacy/build/pdf.mjs'),
    ]);

    const u8 = new Uint8Array(buffer);
    const loadingTask = pdfjsLib.getDocument({
      data: u8,
      useSystemFonts: true,
    });
    const doc = await loadingTask.promise;
    const antallSider = Math.min(doc.numPages, 100);
    const sideTekster: string[] = [];

    for (let p = 1; p <= antallSider; p++) {
      const page = await doc.getPage(p);
      const tc = await page.getTextContent();
      const items = (tc.items as Array<{ str?: string; transform?: number[] }>).filter(
        (it) => typeof it.str === 'string' && it.str.trim().length > 0 && Array.isArray(it.transform)
      );

      // Sorter ovenfra og ned (y fallende), deretter venstre mot høyre (x stigende)
      items.sort((a, b) => {
        const yDiff = b.transform![5] - a.transform![5];
        if (Math.abs(yDiff) > 3) return yDiff;
        return a.transform![4] - b.transform![4];
      });

      const linjer: string[] = [];
      let gjeldendeLinje: string[] = [];
      let gjeldendeY: number | null = null;

      for (const it of items) {
        const y = it.transform![5];
        if (gjeldendeY === null || Math.abs(gjeldendeY - y) <= 3) {
          gjeldendeLinje.push(it.str!);
          if (gjeldendeY === null) gjeldendeY = y;
        } else {
          if (gjeldendeLinje.length > 0) {
            linjer.push(gjeldendeLinje.join(' '));
          }
          gjeldendeLinje = [it.str!];
          gjeldendeY = y;
        }
      }
      if (gjeldendeLinje.length > 0) {
        linjer.push(gjeldendeLinje.join(' '));
      }

      if (linjer.length > 0) {
        sideTekster.push(linjer.join('\n'));
      }
    }

    const samlet = sideTekster.join('\n\n').trim();
    if (samlet.length > 0) {
      return samlet.slice(0, 50000);
    }
  } catch (err) {
    console.warn('pdfjs-dist feilet under uthenting av PDF, prøver rå-tekst fallback:', err);
  }

  // Robust fallback: Dekoder rå latin1-tekst og henter ukomprimerte strenger hvis pdfjs feiler
  try {
    const bytes = new Uint8Array(buffer);
    const rå = new TextDecoder('latin1').decode(bytes);
    const biter: string[] = [];
    trekkUtPdfTekstOperatorer(rå, biter);
    return biter.join('\n').slice(0, 20000);
  } catch {
    return '';
  }
}

/**
 * Leser en fil lokalt i nettleseren og returnerer et ProsjektFil-objekt
 * med base64Data, dataUrl, uttrukketTekst og foreløpig lokal analyse.
 */
export async function lesOgAnalyserFilLokalt(
  fil: { name: string; type: string; size: number; arrayBuffer: () => Promise<ArrayBuffer> },
  prosjektId: string
): Promise<ProsjektFil> {
  const buffer = await fil.arrayBuffer();
  const lav = fil.name.toLowerCase();
  const mimeType =
    fil.type ||
    (lav.endsWith('.pdf')
      ? 'application/pdf'
      : lav.endsWith('.png')
      ? 'image/png'
      : lav.endsWith('.jpg') || lav.endsWith('.jpeg')
      ? 'image/jpeg'
      : lav.endsWith('.webp')
      ? 'image/webp'
      : lav.endsWith('.csv')
      ? 'text/csv'
      : lav.endsWith('.mp3')
      ? 'audio/mpeg'
      : lav.endsWith('.m4a')
      ? 'audio/mp4'
      : lav.endsWith('.wav')
      ? 'audio/wav'
      : lav.endsWith('.mp4')
      ? 'video/mp4'
      : lav.endsWith('.webm')
      ? 'audio/webm'
      : lav.endsWith('.md') || lav.endsWith('.markdown')
      ? 'text/markdown'
      : lav.endsWith('.txt')
      ? 'text/plain'
      : 'application/octet-stream');

  const base64Data = arrayBufferTilBase64(buffer);
  const dataUrl = `data:${mimeType};base64,${base64Data}`;
  const kategori = detekterFilKategori(fil.name, mimeType);

  let uttrukketTekst = '';
  if (
    mimeType.startsWith('text/') ||
    lav.endsWith('.txt') ||
    lav.endsWith('.md') ||
    lav.endsWith('.markdown') ||
    lav.endsWith('.json') ||
    lav.endsWith('.csv') ||
    lav.endsWith('.tsv')
  ) {
    const råTekst = new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(buffer));
    uttrukketTekst =
      lav.endsWith('.csv') || lav.endsWith('.tsv') ? formaterCsvTekst(råTekst) : råTekst.slice(0, 30000);
  } else if (lav.endsWith('.docx') || lav.endsWith('.xlsx')) {
    uttrukketTekst = await pakkUtZipXmlTekster(buffer);
  } else if (lav.endsWith('.pdf') || mimeType === 'application/pdf') {
    uttrukketTekst = await trekkUtLesbarTekstFraPdfBuffer(buffer);
  } else if (!mimeType.startsWith('image/')) {
    // Fallback for tekst-/markdown-filer uten kjent filendelse
    const kandidat = new TextDecoder('utf-8', { fatal: false }).decode(
      new Uint8Array(buffer.slice(0, 30000))
    );
    if (kandidat && !kandidat.includes('\u0000')) {
      uttrukketTekst = kandidat;
    }
  }

  const lokaltUttrekk = analyserTekstLokalt(uttrukketTekst, fil.name);

  return {
    id: nyFilId(),
    prosjektId,
    navn: fil.name,
    mimeType,
    storrelse: fil.size,
    opprettetDato: new Date().toISOString(),
    kategori,
    base64Data,
    dataUrl,
    uttrukketTekst,
    aiOppsummering: lokaltUttrekk.oppsummering,
    tekniskeFunn: lokaltUttrekk.tekniskeFunn,
  };
}

function parseNorskTall(verdi: string | undefined): number | undefined {
  if (!verdi) return undefined;
  const ren = String(verdi).replace(/\s+/g, '').replace(',', '.');
  const match = ren.match(/^-?\d+(?:\.\d+)?/);
  if (!match) return undefined;
  const n = parseFloat(match[0]);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Normaliserer Markdown-formatering, tabeller og lister til ren, linjebasert nøkkel/verdi-tekst
 * slik at både .md, .txt, .docx, .xlsx og PDF-uttrekk tolkes likt.
 */
function normaliserDokumentTekst(råTekst: string): string {
  return råTekst
    .split(/\r?\n/)
    .map((linje) => {
      const trimmet = linje.trim();
      // Hopp over rene Markdown-tabell-skillelinjer (|---|---|)
      if (/^\|?[\s:-]+\|[\s|:-]*$/.test(trimmet)) return '';
      // Konverter Markdown-tabellrader og tabellinjer (| Adresse | Friheim 49 | eller BRA | 3 × 800 = 2 400 m²)
      if (trimmet.includes('|')) {
        const celler = trimmet
          .replace(/^\|/, '')
          .replace(/\|$/, '')
          .split('|')
          .map((c) => c.replace(/\*\*|__|`/g, '').trim())
          .filter(Boolean);
        if (celler.length === 2) {
          return `${celler[0]}: ${celler[1]}`;
        }
        if (celler.length > 2) {
          return celler.join(' · ');
        }
      }
      // Fjern Markdown fet/kursiv/kode (**Tekst**, __Tekst__, `Tekst`) og liste-punkter (- / * / •)
      return trimmet
        .replace(/\*\*|__|`/g, '')
        .replace(/^\s*[-*•+]\s+/, '');
    })
    .filter(Boolean)
    .join('\n');
}

/**
 * Trekker ut BRA (bruksareal / oppvarmet areal) og eventuelt etasjeantall fra tekst,
 * inkludert regnestykker som «BRA | 3 × 800 = 2 400 m²», tabellrader, og standardformater.
 * Støtter synonymer som 'arealM2', 'areal_m2' og velger den største verdien som hovedareal
 * slik at det ikke forveksles med f.eks. 'gulvvarmeM2 = 25'.
 */
export function trekkUtBra(tekst: string): { bra?: number; etasjer?: string } {
  const kandidater: number[] = [];
  let funnetEtasjer: string | undefined;

  // 1. Prioritert sjekk for eksakte linjer / tabellrader med arealM2 / areal_m2 / areal / BRA
  //    (f.eks. "arealM2 | 240", "| arealM2 | 240 |", "arealM2: 240")
  //    Strengt skille mot gulvvarme (f.eks. "gulvvarmeM2 | 25" skal ALDRI tas som BRA).
  const linjer = tekst.split(/\r?\n/);
  for (const linje of linjer) {
    const trim = linje.trim();
    if (!trim) continue;

    // Streng eksklusjon av gulvvarme, bad og delarealer
    const erGulvvarme = /gulv(?:varme)?|bad|rom|del|tak|vegg|leilighet|kontor(?:\s+areal)?/i.test(trim);
    if (erGulvvarme && !/oppvarmet\s+bra|totalt?\s+areal/i.test(trim)) {
      continue;
    }

    // Matcher rader som starter med (valgfri pipe) arealM2 / areal_m2 / areal / BRA / BTA
    const matchArealRad = trim.match(
      /^\|?\s*(?:totalt?\s+)?(?:areal(?:[\s_]?(?:m2|m²))?|\bBRA\b|\bBTA\b|oppvarmet\s+(?:BRA|areal)|bruksareal)\s*(?:\([^)]*\))?\s*[:|=|\-–]+\s*([^\n\r|]+)/i
    );
    if (matchArealRad) {
      const bit = matchArealRad[1].trim();
      // Hvis regnestykke, f.eks. "3 x 800 = 2 400"
      if (/[×x*]/.test(bit)) {
        const mult = bit.match(/(\d+)\s*[×x*]\s*(\d+)(?:\s*=\s*(\d[\d\s]*))?/);
        if (mult) {
          const tot = mult[3]
            ? parseNorskTall(mult[3])
            : (parseNorskTall(mult[1]) || 0) * (parseNorskTall(mult[2]) || 0);
          if (tot && tot >= 15 && tot <= 500000) {
            kandidater.push(tot);
            if (mult[1]) funnetEtasjer = String(parseNorskTall(mult[1]));
          }
        }
      } else {
        const tall = parseNorskTall(bit);
        if (tall !== undefined && tall >= 15 && tall <= 500000) {
          kandidater.push(tall);
        }
      }
    }
  }

  // 2. Multiplikasjonsuttrykk: f.eks. "BRA | 3 x 800 = 2 400 m²", "3 etasjer á 800 m² = 2400 m²" eller "3 x 800 m²"
  const multMatch =
    tekst.match(
      /(?:(?:oppvarmet\s+)?(?:BRA|BTA|areal|bruksareal))\s*[:|=|\-–]?\s*(\d{1,2})\s*(?:etg\.?|etasjer?|plan)?\s*(?:[×x*]|á|à)\s*(\d[\d\s]*)\s*(?:m²|m2|kvm)?\s*(?:=\s*(\d[\d\s]*))?(?:\s*(?:m²|m2|kvm))?/i
    ) ||
    tekst.match(
      /\b(\d{1,2})\s*(?:etg\.?|etasjer?|plan)?\s*(?:[×x*]|á|à)\s*(\d[\d\s]*)\s*(?:m²|m2|kvm)?\s*=\s*(\d[\d\s]*)\s*(?:m²|m2|kvm)?/i
    );

  if (multMatch) {
    const etg = parseNorskTall(multMatch[1]);
    const prFlate = parseNorskTall(multMatch[2]);
    const tot = parseNorskTall(multMatch[3]);
    const b = tot || (etg && prFlate ? etg * prFlate : undefined);
    if (b && b >= 15 && b <= 500000) {
      kandidater.push(b);
      if (etg && !funnetEtasjer) funnetEtasjer = String(etg);
    }
  }

  // 3. Eksplisitt BRA / BTA / oppvarmet areal / bruksareal med skilletegn (inkludert kolon, likhetstegn og pipe |)
  const braMatches = tekst.matchAll(
    /(?:oppvarmet\s+BRA|totalt?\s+areal\s+BRA|totalt?\s+BRA|bruksareal(?:\s*\(BRA\))?|oppvarmet\s+(?:bruks)?areal|\bBRA\b|\bBTA\b|bruttoareal|byggareal|bygget\s+er(?:\s+på)?)\s*(?:\([^)]*\))?\s*(?:er|på|ca\.?|[:=|\-–])+\s*(\d[\d\s]*(?:[,.]\d+)?)(?:\s*(?:m²|m2|kvm|kvadratmeter))?/gi
  );
  for (const m of braMatches) {
    const b = parseNorskTall(m[1]);
    if (b && b >= 15 && b <= 500000) {
      kandidater.push(b);
    }
  }

  // 4. arealM2 / areal_m2 / areal m2 / totalareal (men ikke gulvvarmeM2, badAreal etc.)
  const arealM2Matches = tekst.matchAll(
    /(?<![a-zA-Z0-9_])(?<!gulv(?:varme)?|bad|rom|del|tak|vegg|leilighet|kontor|tomt|asfalt|ute)(?:totalt?\s+)?(?:areal(?:[\s_]?(?:m2|m²))?)(?![a-zA-Z0-9_])\s*(?:\([^)]*\))?\s*(?:er|på|ca\.?|[:=|\-–])+\s*(\d[\d\s]*(?:[,.]\d+)?)/gi
  );
  for (const m of arealM2Matches) {
    const b = parseNorskTall(m[1]);
    if (b && b >= 15 && b <= 500000) {
      kandidater.push(b);
    }
  }

  // 5. Fallback: Tall med m² og eksplisitt enhetsangivelse dersom ingen kandidater funnet, men unngå gulvvarme
  if (kandidater.length === 0) {
    for (const l of linjer) {
      if (/gulv(?:varme)?/i.test(l)) continue;
      const m2Match = l.match(
        /(\d{1,3}(?:[ \t]\d{3})*|\d{2,6})\s*(?:m²|m2|kvm|kvadratmeter)\s*(?:BRA|BTA|oppvarmet|bruksareal)?/i
      );
      if (m2Match) {
        const b = parseNorskTall(m2Match[1]);
        if (b && b >= 15 && b <= 500000) {
          kandidater.push(b);
        }
      }
    }
  }

  if (kandidater.length === 0) {
    return {};
  }

  // Velg den største verdien som hovedareal (slik at den ikke forveksles med mindre rom/gulvvarme-arealer)
  const maksBra = Math.max(...kandidater);
  return { bra: Math.round(maksBra), etasjer: funnetEtasjer };
}

/**
 * Trekker ut U-verdier for bygningskropp (yttervegg, tak, gulv på grunn, vinduer/dører)
 * samt totalt eller spesifikt transmisjonsvarmetap (W/K) fra tekniske beskrivelser og tabeller.
 */
export function trekkUtUVerdierOgTransmisjonstap(tekst: string): {
  uVerdier?: { yttervegg?: number; tak?: number; gulv?: number; vinduDor?: number };
  transmisjonstapWPerK?: number;
} {
  const uVerdier: { yttervegg?: number; tak?: number; gulv?: number; vinduDor?: number } = {};

  const yv =
    tekst.match(/(?:u-verdi(?:er)?\s+(?:for\s+)?(?:yttervegg[^\n\r:=-]*|fasade[^\n\r:=-]*)|(?:yttervegg|fasade)[^\n\r:=-]*\(?u(?:-verdi)?\)?|u-yttervegg)\s*[:=|\-–]?\s*(\d+(?:[,.]\d+)?)/i) ||
    tekst.match(/(?:^|\n)\s*(?:yttervegg(?:er)?|fasade)\s*[:=|\-–]\s*(0[,.]\d{1,3})\b/i);
  if (yv) {
    const v = parseNorskTall(yv[1]);
    if (v !== undefined && v > 0 && v < 2) uVerdier.yttervegg = v;
  }

  const tak =
    tekst.match(/(?:u-verdi(?:er)?\s+(?:for\s+)?(?:tak[^\n\r:=-]*|yttertak[^\n\r:=-]*)|(?:tak|yttertak)[^\n\r:=-]*\(?u(?:-verdi)?\)?|u-tak)\s*[:=|\-–]?\s*(\d+(?:[,.]\d+)?)/i) ||
    tekst.match(/(?:^|\n)\s*(?:tak|yttertak)\s*[:=|\-–]\s*(0[,.]\d{1,3})\b/i);
  if (tak) {
    const v = parseNorskTall(tak[1]);
    if (v !== undefined && v > 0 && v < 2) uVerdier.tak = v;
  }

  const gulv =
    tekst.match(/(?:u-verdi(?:er)?\s+(?:for\s+)?(?:gulv[^\n\r:=-]*|såle[^\n\r:=-]*|dekke[^\n\r:=-]*)|(?:gulv|såle)[^\n\r:=-]*\(?u(?:-verdi)?\)?|u-gulv)\s*[:=|\-–]?\s*(\d+(?:[,.]\d+)?)/i) ||
    tekst.match(/(?:^|\n)\s*(?:gulv(?:\s+på\s+grunn)?|såle)\s*[:=|\-–]\s*(0[,.]\d{1,3})\b/i);
  if (gulv) {
    const v = parseNorskTall(gulv[1]);
    if (v !== undefined && v > 0 && v < 2) uVerdier.gulv = v;
  }

  const vd =
    tekst.match(/(?:u-verdi(?:er)?\s+(?:for\s+)?(?:vindu[^\n\r:=-]*|dør[^\n\r:=-]*|glass[^\n\r:=-]*)|(?:vindu|dør)[^\n\r:=-]*\(?u(?:-verdi)?\)?|u-vindu)\s*[:=|\-–]?\s*(\d+(?:[,.]\d+)?)/i) ||
    tekst.match(/(?:^|\n)\s*(?:vindu(?:er)?|dør(?:er)?|glass)\s*[:=|\-–]\s*(0[,.]\d{1,3}|1[,.]\d{1,2})\b/i);
  if (vd) {
    const v = parseNorskTall(vd[1]);
    if (v !== undefined && v > 0 && v < 3) uVerdier.vinduDor = v;
  }

  let transmisjonstapWPerK: number | undefined;
  const trans = tekst.match(
    /(?:transmisjons(?:varme)?tap(?:stall)?|spesifikt\s+transmisjonstap|transmisjonstap\s+h_t|\bh_t\b|totalt\s+transmisjonstap|(?:Σ|sum)\s*\(?\s*u\s*·?\s*a\s*\)?)\s*[:=|\-–]?\s*(\d+(?:[,.]\d+)?)\s*(?:w\s*\/\s*k)?/i
  );
  if (trans) {
    const v = parseNorskTall(trans[1]);
    if (v !== undefined && v > 0 && v < 50000) {
      transmisjonstapWPerK = v;
    }
  }

  return {
    uVerdier: Object.keys(uVerdier).length > 0 ? uVerdier : undefined,
    transmisjonstapWPerK,
  };
}

function gjenkjennBygningstype(tekst: string): string | undefined {
  const lav = tekst.toLowerCase();
  if (/sykehus|helsebygg|sykehjem|omsorgsbolig|klinikk/.test(lav)) {
    return 'Sykehus / helsebygg';
  }
  if (/hotell|overnatting|gjestehus/.test(lav)) {
    return 'Hotell / overnatting';
  }
  if (/skole|barnehage|universitet|undervisning/.test(lav)) {
    return 'Skole / undervisning';
  }
  if (/idrettshall|svømmehall|flerbrukshall|garderobeanlegg/.test(lav)) {
    return 'Idrettshall / garderobeanlegg';
  }
  if (/lager|industri|verksted|produksjon|logistik/.test(lav)) {
    return 'Lager / industri / kombinasjonsbygg';
  }
  if (/leilighetsbygg|boligblokk|borettslag|sameie|flermannsbolig/.test(lav)) {
    return 'Leilighetsbygg (boligblokk)';
  }
  if (/enebolig|rekkehus|tomannsbolig|småhus|villa/.test(lav)) {
    return 'Enebolig / rekkehus';
  }
  if (/kontor|næringsbygg|forretningsbygg|administrasjon/.test(lav)) {
    return 'Kontor / næring';
  }
  return undefined;
}

/**
 * Tolker et tall eller summerer talluttrykk i parenteser:
 * F.eks. "20 (8 + 6 + 6)" -> 20, "(8 + 6 + 6)" -> 20, "4 (2 + 2 + 0)" -> 4, "18" -> 18.
 */
export function parseAntallMedParenteser(verdi: string | undefined): number {
  if (!verdi) return 0;
  const ren = String(verdi).trim();
  if (!ren) return 0;
  const leadMatch = ren.match(/^(\d+)\s*\(/);
  if (leadMatch) {
    const num = parseInt(leadMatch[1], 10);
    if (!Number.isNaN(num)) return num;
  }
  if (ren.includes('+')) {
    const tall = ren.match(/\d+/g);
    if (tall && tall.length > 0) {
      return tall.reduce((acc, t) => acc + parseInt(t, 10), 0);
    }
  }
  const enkelMatch = ren.match(/^(\d+)/);
  if (enkelMatch) {
    const num = parseInt(enkelMatch[1], 10);
    if (!Number.isNaN(num)) return num;
  }
  return 0;
}

/**
 * Tolker Markdown-tabeller (|...|...|) og returnerer en matrise av tabeller,
 * der hver tabell består av rader med trimmede cellestrenger.
 */
export function parseMarkdownTabeller(tekst: string): string[][][] {
  const linjer = tekst.split(/\r?\n/);
  const tabeller: string[][][] = [];
  let gjeldendeTabell: string[][] = [];

  for (const linje of linjer) {
    const trimmet = linje.trim();
    if (trimmet.includes('|')) {
      if (/^\|?[\s:-]+\|[\s|:-]*$/.test(trimmet)) {
        continue;
      }
      const celler = trimmet
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((c) => c.replace(/\*\*|__|`/g, '').trim());
      if (celler.length > 0 && celler.some((c) => c.length > 0)) {
        gjeldendeTabell.push(celler);
      }
    } else {
      if (gjeldendeTabell.length > 0) {
        tabeller.push(gjeldendeTabell);
        gjeldendeTabell = [];
      }
    }
  }

  if (gjeldendeTabell.length > 0) {
    tabeller.push(gjeldendeTabell);
  }

  return tabeller;
}

/**
 * Tolker sanitærutstyr fra tabeller (| Type | Antall | ...) og tekstlister.
 * Gjenkjenner alle 8 standardarmaturer (WC, Servant, Urinal, Dusj, Kjøkkenvask, Oppvaskmaskin, Badekar, Vaskemaskin, Utslagsvask)
 * og beregner sum q_n, sum DU og dimensjonerende q_s iht. SINTEF Byggforsk 553.102 / NS-EN 806.
 */
export function parseSanitaerUtstyrTabell(
  innhold: string,
  tabeller: string[][][] = []
): SanitaerUtstyrData | undefined {
  const tabs = tabeller.length > 0 ? tabeller : parseMarkdownTabeller(innhold);
  const poster: SanitaerUtstyrData = {
    wc: { antall: 0, qnLPrS: 0.1, du: 2.0 },
    servant: { antall: 0, qnLPrS: 0.1, du: 0.5 },
    urinal: { antall: 0, qnLPrS: 0.1, du: 0.5 },
    dusj: { antall: 0, qnLPrS: 0.2, du: 0.8 },
    kjokkenvask: { antall: 0, qnLPrS: 0.2, du: 0.8 },
    oppvaskmaskin: { antall: 0, qnLPrS: 0.2, du: 0.8 },
    badekar: { antall: 0, qnLPrS: 0.3, du: 0.8 },
    vaskemaskin: { antall: 0, qnLPrS: 0.2, du: 0.8 },
    utslagsvask: { antall: 0, qnLPrS: 0.2, du: 0.8 },
    sumQn: 0,
    sumDu: 0,
    qsLPrS: 0,
  };

  let funnetNoe = false;

  const matchArmaturType = (tekst: string): keyof typeof poster | null => {
    const t = tekst.trim().toLowerCase();
    if (!t) return null;
    if (/\b(?:badekar|kar)\b/i.test(t)) return 'badekar';
    if (/\b(?:vaskemaskin|tøyvask)\b/i.test(t)) return 'vaskemaskin';
    if (/\b(?:oppvaskmaskin|oppvask)\b/i.test(t)) return 'oppvaskmaskin';
    if (/\b(?:kjøkkenvask|kjokkenvask|kjøkken|kjokken|oppvaskkum)\b/i.test(t)) return 'kjokkenvask';
    if (/\b(?:utslagsvask|utslag|skyllekum)\b/i.test(t)) return 'utslagsvask';
    if (/\b(?:toalett(?:er)?|wc|klosett(?:er)?)\b/i.test(t)) return 'wc';
    if (/\b(?:urinal(?:er)?)\b/i.test(t)) return 'urinal';
    if (/\b(?:dusj(?:er)?|shower)\b/i.test(t)) return 'dusj';
    if (/\b(?:servant(?:er)?|håndvask(?:er)?)\b/i.test(t)) return 'servant';
    if (/\bvask\b/i.test(t) && !/kjøkken|kjokken|oppvask|tøyvask|utslag/i.test(t)) return 'servant';
    return null;
  };

  const setVerdi = (
    type: keyof typeof poster,
    antall: number,
    qn?: number,
    du?: number
  ) => {
    if (antall <= 0) return;
    const post = poster[type];
    if (post && typeof post === 'object' && 'antall' in post) {
      post.antall = antall;
      if (qn !== undefined && qn > 0) post.qnLPrS = qn;
      if (du !== undefined && du > 0) post.du = du;
      funnetNoe = true;
    }
  };

  // 1. Tabell-evaluering kolonne for kolonne og rad for rad
  for (const tab of tabs) {
    if (tab.length === 0) continue;

    // Sjekk om rad 0 er en overskriftsrad (Type, Armatur, Antall) eller en direkte datarad (Toalett | 3)
    const r0Første = tab[0][0] ? tab[0][0].trim() : '';
    const erR0DataRad = Boolean(matchArmaturType(r0Første)) || /^\d+$/.test(r0Første);
    const dataRader = erR0DataRad ? tab : tab.slice(1);

    const h = tab[0].map((c) => c.toLowerCase());
    const antallIdx = h.findIndex((c) => /antall|stk|mengde|\bant\b/.test(c));
    const qnIdx = h.findIndex((c) => /q_?n|normflom|l\/s/.test(c));
    const duIdx = h.findIndex((c) => /\bdu\b|design\s*unit|vekt/.test(c));

    for (const rad of dataRader) {
      if (rad.length < 2) continue;

      let funnetType: keyof typeof poster | null = null;
      let funnetAntall: number | undefined;
      let funnetQn: number | undefined;
      let funnetDu: number | undefined;

      // Let gjennom celler i raden
      for (let i = 0; i < rad.length; i++) {
        const celle = rad[i].trim();
        const typeMatch = matchArmaturType(celle);
        if (typeMatch && !funnetType) {
          funnetType = typeMatch;
        } else {
          const ant = parseAntallMedParenteser(celle);
          if (ant > 0 && funnetAntall === undefined) {
            funnetAntall = ant;
          }
        }
      }

      // Prioriter eksplisitte kolonneindekser fra tabell-header hvis definert
      if (antallIdx >= 0 && rad[antallIdx] !== undefined) {
        const antFraHeader = parseAntallMedParenteser(rad[antallIdx]);
        if (antFraHeader > 0) funnetAntall = antFraHeader;
      }
      if (qnIdx >= 0 && rad[qnIdx] !== undefined) {
        funnetQn = parseNorskTall(rad[qnIdx]);
      }
      if (duIdx >= 0 && rad[duIdx] !== undefined) {
        funnetDu = parseNorskTall(rad[duIdx]);
      }

      if (funnetType && funnetAntall !== undefined && funnetAntall > 0) {
        setVerdi(funnetType, funnetAntall, funnetQn, funnetDu);
      }
    }
  }

  // 2. Linjebasert parsing for rader med pipe eller kolon (f.eks. "Dusj | 1", "Toalett | 3", "Dusj: 1 stk")
  const linjer = innhold.split(/\r?\n/);
  for (const linje of linjer) {
    const trim = linje.trim();
    if (!trim) continue;

    if (trim.includes('|')) {
      const biter = trim.split('|').map((b) => b.trim()).filter(Boolean);
      if (biter.length >= 2) {
        const type0 = matchArmaturType(biter[0]);
        const type1 = matchArmaturType(biter[1]);
        if (type0 && !type1) {
          const ant = parseAntallMedParenteser(biter[1]);
          if (ant > 0) setVerdi(type0, ant);
        } else if (type1 && !type0) {
          const ant = parseAntallMedParenteser(biter[0]);
          if (ant > 0) setVerdi(type1, ant);
        }
      }
    } else {
      const kolonMatch = trim.match(/^[-*•]?\s*([a-zA-ZæøåÆØÅ/\s]+)\s*[:=–-]\s*([^\n\r]+)/);
      if (kolonMatch) {
        const armType = matchArmaturType(kolonMatch[1]);
        if (armType) {
          const ant = parseAntallMedParenteser(kolonMatch[2]);
          if (ant > 0) setVerdi(armType, ant);
        }
      }
    }
  }

  if (!funnetNoe) return undefined;

  const allePoster = [
    poster.wc,
    poster.servant,
    poster.urinal,
    poster.dusj,
    poster.kjokkenvask,
    poster.oppvaskmaskin,
    poster.badekar!,
    poster.vaskemaskin!,
    poster.utslagsvask!,
  ];

  poster.sumQn =
    Math.round(allePoster.reduce((acc, p) => acc + p.antall * p.qnLPrS, 0) * 100) / 100;
  poster.sumDu =
    Math.round(allePoster.reduce((acc, p) => acc + p.antall * p.du, 0) * 10) / 10;

  const qnList = allePoster.map((p) => (p.antall > 0 ? p.qnLPrS : 0));
  const maksQn = Math.max(...qnList, 0);
  poster.qsLPrS = Math.round(beregnQs(poster.sumQn, maksQn) * 100) / 100;

  return poster;
}

/**
 * Tolker tabeller og lister over rørsystemer (Kaldtvann, Varmtvann, Avløp, Varme).
 * Trekker ut dimensjon (f.eks. DN 28, 28 mm), lengde (m) og materiale (Kobber, PP plast, PEX, Stål).
 */
export function parseRorSystemer(
  innhold: string,
  tabeller: string[][][] = []
): RorSystemerData | undefined {
  const tabs = tabeller.length > 0 ? tabeller : parseMarkdownTabeller(innhold);
  const poster: RorSystemPost[] = [];
  const systemer: Record<string, RorSystemPost> = {};

  for (const tab of tabs) {
    if (tab.length < 2) continue;
    const h = tab[0].map((c) => c.toLowerCase());
    const dimIdx = h.findIndex((c) => /dim|dn|diameter|størrelse/.test(c));
    const lenIdx = h.findIndex((c) => /lengde|\bm\b|meter/.test(c));
    const matIdx = h.findIndex((c) => /mat|kvalitet/.test(c));
    const sysIdx = h.findIndex((c) => /system|type|rør|navn/.test(c));

    for (const rad of tab.slice(1)) {
      if (rad.length < 2) continue;
      const sysCelle = sysIdx >= 0 ? rad[sysIdx] : rad[0];
      const lav = sysCelle.toLowerCase();
      let nøkkel: string | undefined;
      let navn = sysCelle;

      if (/kaldtvann|kaldt\s*vann|\bkv\b/.test(lav)) {
        nøkkel = 'kaldtvann';
        navn = 'Kaldtvann';
      } else if (/varmtvann|varmt\s*vann|\bvv\b/.test(lav)) {
        nøkkel = 'varmtvann';
        navn = 'Varmtvann';
      } else if (/avløp|avloep|spillvann|overvann/.test(lav)) {
        nøkkel = 'avlop';
        navn = 'Avløp';
      } else if (/varme|radiator|hydronisk/.test(lav)) {
        nøkkel = 'varme';
        navn = 'Varme';
      }

      if (!nøkkel && !/rør|dn|mm/.test(rad.join(' ').toLowerCase())) continue;
      if (!nøkkel) {
        nøkkel = sysCelle.toLowerCase().replace(/[^a-z0-9]+/g, '_');
      }

      let dim = dimIdx >= 0 && rad[dimIdx] ? rad[dimIdx] : undefined;
      let len = lenIdx >= 0 && rad[lenIdx] ? parseNorskTall(rad[lenIdx]) : undefined;
      let mat = matIdx >= 0 && rad[matIdx] ? rad[matIdx] : undefined;

      if (!dim) {
        const m = rad.join(' ').match(/\b(DN\s*\d+|\d+\s*mm|Ø\s*\d+|Cu\s*\d+|PEX\s*\d+)\b/i);
        if (m) dim = m[1];
      }
      if (len === undefined) {
        const m = rad.join(' ').match(/(\d+(?:[,.]\d+)?)\s*(?:m\b|meter)/i);
        if (m) len = parseNorskTall(m[1]);
      }
      if (!mat) {
        const m = rad
          .join(' ')
          .match(/\b(kobber(?:\s*\(cu\))?|plast(?:\s*\([^)]*\))?|pp\s*plast|pp|pvc|pex|stål|alupux|rør-i-rør)\b/i);
        if (m) mat = m[1];
      }

      const post: RorSystemPost = {
        system: nøkkel,
        navn,
        dimensjon: dim,
        lengdeM: len,
        materiale: mat,
      };
      poster.push(post);
      systemer[nøkkel] = post;
    }
  }

  // Fallback til linjeparsing hvis ingen tabellrader ga uttelling
  if (poster.length === 0) {
    const linjer = innhold.split(/\r?\n/);
    for (const l of linjer) {
      const lav = l.toLowerCase();
      let nøkkel: string | undefined;
      let navn: string | undefined;

      if (/kaldtvann|kaldt\s*vann|\bkv\b/.test(lav)) {
        nøkkel = 'kaldtvann';
        navn = 'Kaldtvann';
      } else if (/varmtvann|varmt\s*vann|\bvv\b/.test(lav)) {
        nøkkel = 'varmtvann';
        navn = 'Varmtvann';
      } else if (/avløp|avloep|spillvann/.test(lav)) {
        nøkkel = 'avlop';
        navn = 'Avløp';
      } else if (/varme|radiator/.test(lav)) {
        nøkkel = 'varme';
        navn = 'Varme';
      }

      if (nøkkel) {
        const dimMatch = l.match(/\b(DN\s*\d+|\d+\s*mm|Ø\s*\d+|Cu\s*\d+|PEX\s*\d+)\b/i);
        const lenMatch = l.match(/(\d+(?:[,.]\d+)?)\s*(?:m\b|meter)/i);
        const matMatch = l.match(
          /\b(kobber(?:\s*\(cu\))?|plast(?:\s*\([^)]*\))?|pp\s*plast|pp|pvc|pex|stål|alupux|rør-i-rør)\b/i
        );
        const post: RorSystemPost = {
          system: nøkkel,
          navn: navn || nøkkel,
          dimensjon: dimMatch ? dimMatch[1] : undefined,
          lengdeM: lenMatch ? parseNorskTall(lenMatch[1]) : undefined,
          materiale: matMatch ? matMatch[1] : undefined,
        };
        poster.push(post);
        systemer[nøkkel] = post;
      }
    }
  }

  if (poster.length === 0) return undefined;
  const totalLengdeM = poster.reduce((acc, p) => acc + (p.lengdeM || 0), 0);
  return {
    kaldtvann: systemer.kaldtvann,
    varmtvann: systemer.varmtvann,
    avlop: systemer.avlop,
    varme: systemer.varme,
    poster,
    totalLengdeM: totalLengdeM > 0 ? totalLengdeM : undefined,
  };
}

/**
 * Tolker varmeanleggsparametere fra tabeller og nøkkel-verdi linjer:
 * - Varmekilde (f.eks. Væske-vann varmepumpe, Bergvarme, Fjernvarme)
 * - Antall radiatorer
 * - Gulvvarme (m²)
 * - Tur- og returtemperaturer (°C)
 * - Effektbehov (kW)
 */
export function parseVarmeanlegg(
  innhold: string,
  tabeller: string[][][] = []
): VarmeanleggData | undefined {
  const tabs = tabeller.length > 0 ? tabeller : parseMarkdownTabeller(innhold);
  const v: VarmeanleggData = {};

  // Tabell-sjekk
  for (const tab of tabs) {
    for (const rad of tab) {
      if (rad.length < 2) continue;
      const k = rad[0].toLowerCase().trim();
      const val = rad[1].trim();

      if (/varmekilde|energikilde|primærvarme/.test(k)) {
        v.varmekilde = val;
      } else if (/antall\s*radiatorer|radiatorer/.test(k)) {
        const n = parseNorskTall(val);
        if (n !== undefined) v.antallRadiatorer = n;
      } else if (/gulvvarme/.test(k)) {
        const n = parseNorskTall(val);
        if (n !== undefined) v.gulvvarmeM2 = n;
      } else if (/tur\s*\/\s*retur/.test(k)) {
        const m = val.match(/(\d+)\s*\/\s*(\d+)/);
        if (m) {
          v.turTemperaturC = parseNorskTall(m[1]);
          v.returTemperaturC = parseNorskTall(m[2]);
        }
      } else if (/turtemperatur|turtemp|\btur\b/.test(k)) {
        const n = parseNorskTall(val);
        if (n !== undefined) v.turTemperaturC = n;
      } else if (/returtemperatur|returtemp|\bretur\b/.test(k)) {
        const n = parseNorskTall(val);
        if (n !== undefined) v.returTemperaturC = n;
      } else if (/effektbehov|varmeeffekt|effekt/.test(k)) {
        const n = parseNorskTall(val);
        if (n !== undefined) v.effektbehovKw = n;
      }
    }
  }

  // Regex / linje-sjekk for ustrukturerte eller delvis strukturerte felt
  if (!v.varmekilde) {
    const vkMatch = innhold.match(/(?:varmekilde|energikilde|primærvarme)\s*[:=|\-–]\s*([^\n\r|;]{2,60})/i);
    if (vkMatch) v.varmekilde = vkMatch[1].trim();
  }
  if (v.antallRadiatorer === undefined) {
    const radMatch =
      innhold.match(/(?:antall\s*radiatorer|antallRadiatorer|radiatorer)\s*[:=|\-–]?\s*(\d+)/i) ||
      innhold.match(/(\d+)\s*(?:stk\.?\s*)?radiatorer\b/i);
    if (radMatch) v.antallRadiatorer = parseNorskTall(radMatch[1]);
  }
  if (v.gulvvarmeM2 === undefined) {
    const gvMatch =
      innhold.match(/(?:gulvvarme(?:_?m2|m²)?|gulvvarmeareal)\s*[:=|\-–]?\s*(\d+(?:[,.]\d+)?)/i) ||
      innhold.match(/gulvvarme\s*[:=|\-–]?\s*(\d+(?:[,.]\d+)?)\s*(?:m²|m2|kvm)/i);
    if (gvMatch) v.gulvvarmeM2 = parseNorskTall(gvMatch[1]);
  }
  if (v.turTemperaturC === undefined || v.returTemperaturC === undefined) {
    const trMatch = innhold.match(/(?:tur\s*\/\s*retur|tur\/retur(?:-temperatur)?)\s*[:=–-]?\s*(\d+)\s*\/\s*(\d+)/i);
    if (trMatch) {
      if (v.turTemperaturC === undefined) v.turTemperaturC = parseNorskTall(trMatch[1]);
      if (v.returTemperaturC === undefined) v.returTemperaturC = parseNorskTall(trMatch[2]);
    }
  }
  if (v.turTemperaturC === undefined) {
    const turMatch = innhold.match(/(?:turtemperatur|tur-temp)\s*[:=–-]?\s*(\d+(?:[,.]\d+)?)\s*(?:°?c)?/i);
    if (turMatch) v.turTemperaturC = parseNorskTall(turMatch[1]);
  }
  if (v.returTemperaturC === undefined) {
    const returMatch = innhold.match(/(?:returtemperatur|retur-temp)\s*[:=–-]?\s*(\d+(?:[,.]\d+)?)\s*(?:°?c)?/i);
    if (returMatch) v.returTemperaturC = parseNorskTall(returMatch[1]);
  }
  if (v.effektbehovKw === undefined) {
    const effMatch = innhold.match(
      /(?:effektbehov|varmeeffekt|effektbehovKw|varmebehov)\s*[:=–-]?\s*(\d+(?:[,.]\d+)?)\s*(?:kw)?/i
    );
    if (effMatch) v.effektbehovKw = parseNorskTall(effMatch[1]);
  }

  return Object.keys(v).length > 0 ? v : undefined;
}

export interface MarkdownSeksjon {
  tittel: string;
  tekst: string;
}

export function delOppIMarkdownSeksjoner(tekst: string): MarkdownSeksjon[] {
  const seksjoner: MarkdownSeksjon[] = [];
  const deler = tekst.split(/(?:^|\n)##\s+/);
  if (deler.length > 0) {
    seksjoner.push({ tittel: '__FORORD__', tekst: deler[0] });
    for (let i = 1; i < deler.length; i++) {
      const bit = deler[i];
      const forsteLinjeSlutt = bit.indexOf('\n');
      if (forsteLinjeSlutt >= 0) {
        const tittel = bit.slice(0, forsteLinjeSlutt).trim();
        const innhold = bit.slice(forsteLinjeSlutt + 1);
        seksjoner.push({ tittel, tekst: innhold });
      } else {
        seksjoner.push({ tittel: bit.trim(), tekst: '' });
      }
    }
  }
  return seksjoner;
}

/**
 * Skreddersydd parser for strukturerte prosjektdokumenter (f.eks. «Fjellveien Kontor»),
 * som deler opp dokumentet på ##-kapitler, tolker tabellene kolonne for kolonne (|...|),
 * og henter ut:
 * - Generelt & Arealer: BRA, etasjer, bygningstype, adresse, byggherre, matrikkel
 * - Klimadata: DUT vinter, innetemperatur, DUT sommer
 * - Klimaskjerm: U-verdier for yttervegg, vindu/dør, tak, gulv, lufttetthet n50 og arealer
 * - Romoppvarming: Transmisjonstap H_T og effektbehov
 * - Ventilasjon: Personbelastning, SFP-krav, luftmengde
 * - Sanitær: Tabell med WC, Servant, Urinal, Dusj, Kjøkkenvask, Oppvaskmaskin,
 *   med utregning av sum q_n, sum DU og dimensjonerende q_s (Byggforsk 553.102 / beregnQs)
 */
export function parseProsjektMarkdown(tekst: string, filNavn = ''): UttrekkResultat {
  const res: UttrekkResultat = { tekniskeFunn: [], foreslatteFeller: [] };
  const seksjoner = delOppIMarkdownSeksjoner(tekst);

  // 1. Prosjektnavn (første #-overskrift ELLER eksplisitt felt)
  const overskriftMatch = tekst.match(/^\s*#\s+([^\n\r#]{3,70})/m);
  const navnEksplisitt = tekst.match(
    /(?:^|[;\n\r|])\s*(?:Prosjekt(?:navn)?|Bygg(?:navn)?|Tiltak(?:snavn)?)\s*[:|=–-]\s*([^\n\r|;]{2,70})/i
  );
  if (navnEksplisitt) {
    res.navn = navnEksplisitt[1].trim();
    res.eksaktNavnFraTekst = true;
    res.tekniskeFunn!.push(`Prosjektnavn: ${res.navn}`);
  } else if (overskriftMatch) {
    const vasket = overskriftMatch[1]
      .replace(/\*\*|__|`/g, '')
      .replace(/^(?:prosjekt(?:beskrivelse|navn)?|vvs-beskrivelse|forprosjekt|rapport|notat)\s*[:–-]\s*/i, '')
      .trim();
    if (vasket.length >= 3) {
      res.navn = vasket;
      res.eksaktNavnFraTekst = true;
      res.tekniskeFunn!.push(`Prosjektnavn: ${res.navn}`);
    }
  } else if (filNavn) {
    const utenExt = filNavn.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
    if (utenExt.length > 2) res.navn = utenExt;
  }

  // 2. Metadata: Adresse, kommune, byggherre, bygningstype, matrikkel
  const adrMatch = tekst.match(/(?:adresse|lokasjon|beliggenhet|sted)\s*[:=–-]\s*([^\n\r|;]{3,70})/i);
  if (adrMatch) {
    res.sted = adrMatch[1].trim();
    res.tekniskeFunn!.push(`Adresse: ${res.sted}`);
  }
  const komMatch = tekst.match(/(?:kommune|va-myndighet)\s*[:=–-]\s*([^\n\r|;]{3,50})/i);
  if (komMatch) {
    const k = komMatch[1].trim();
    res.vaMyndighet = k.toLowerCase().includes('kommune') ? k : `${k} kommune – Vann og avløp`;
    res.tekniskeFunn!.push(`VA-myndighet: ${res.vaMyndighet}`);
  }
  const bhMatch = tekst.match(/(?:byggherre|oppdragsgiver|kunde|tiltakshaver)\s*[:=–-]\s*([^\n\r|;]{2,60})/i);
  if (bhMatch) {
    res.byggherre = bhMatch[1].trim();
    res.tekniskeFunn!.push(`Byggherre: ${res.byggherre}`);
  }
  const btMatch = tekst.match(/(?:bygningstype|byggtype|type\s+bygg|kategorisering)\s*[:=–-]\s*([^\n\r|;]{3,60})/i);
  const funnetByggType = btMatch ? gjenkjennBygningstype(btMatch[1]) : gjenkjennBygningstype(tekst);
  if (funnetByggType) {
    res.bygningstype = funnetByggType;
    res.tekniskeFunn!.push(`Bygningstype: ${funnetByggType}`);
  }
  const gnrBnrMatch =
    tekst.match(/(?:gnr\.?|gårdsnr\.?)\s*[:.]?\s*(\d+)\s*(?:[,/\s-]+|(?:og\s+)?)?(?:bnr\.?|bruksnr\.?)\s*[:.]?\s*(\d+)/i) ||
    tekst.match(/\b(?:matrikkel|gnr\s*\/\s*bnr)\s*[:=-]?\s*(\d+)\s*\/\s*(\d+)\b/i);
  if (gnrBnrMatch) {
    res.matrikkel = `Gnr. ${gnrBnrMatch[1]} / Bnr. ${gnrBnrMatch[2]}`;
    res.tekniskeFunn!.push(`Matrikkel: ${res.matrikkel}`);
  }

  // 3. Iterer over seksjoner
  for (const sek of seksjoner) {
    const tit = sek.tittel.toLowerCase();
    const innhold = sek.tekst;

    // A. Generelt / Arealer
    if (tit.includes('generelt') || tit.includes('areal') || tit === '__forord__') {
      const braFunn = trekkUtBra(innhold);
      if (braFunn.bra !== undefined && res.bra === undefined) {
        res.bra = braFunn.bra;
        res.tekniskeFunn!.push(`BRA: ${braFunn.bra} m²`);
      }
      if (braFunn.etasjer && !res.etasjer) {
        res.etasjer = braFunn.etasjer;
        res.tekniskeFunn!.push(`Etasjer: ${res.etasjer}`);
      }
      const etgMatch = innhold.match(/(\d{1,2})\s*(?:etasjer?|etg\.?)/i);
      if (etgMatch && !res.etasjer) {
        res.etasjer = etgMatch[1];
        res.tekniskeFunn!.push(`Etasjer: ${res.etasjer}`);
      }
    }

    // B. Klimadata
    if (tit.includes('klima') || tit.includes('temperatur')) {
      const dutVMatch = innhold.match(
        /(?:DUT(?:\s+vinter|\s+ute)?|dimensjonerende\s+(?:ute)?temperatur(?:\s*\([^)]*\))?|dimensjonerende\s+vintertemperatur|ute\s*\(DUT\))[^:\n\r=-]*[:=–-]\s*(-?\d+(?:[,.]\d+)?)/i
      );
      const inneTMatch = innhold.match(
        /(?:innetemperatur|romtemperatur|dimensjonerende\s+innetemperatur|t_inne)[^:\n\r=-]*[:=–-]\s*(\d+(?:[,.]\d+)?)/i
      );
      const dutSMatch = innhold.match(
        /(?:DUT\s+sommer|sommertemperatur|sommer)[^:\n\r=-]*[:=–-]\s*(\d+(?:[,.]\d+)?)/i
      );

      const dutV = dutVMatch ? parseNorskTall(dutVMatch[1]) : undefined;
      const inneT = inneTMatch ? parseNorskTall(inneTMatch[1]) : undefined;
      const dutS = dutSMatch ? parseNorskTall(dutSMatch[1]) : undefined;

      if (dutV !== undefined || inneT !== undefined || dutS !== undefined) {
        res.klima = {
          dutVinter: dutV,
          innetemperatur: inneT,
          dutSommer: dutS,
        };
        if (dutV !== undefined) res.tekniskeFunn!.push(`Klimadata DUT vinter: ${dutV} °C`);
        if (inneT !== undefined) res.tekniskeFunn!.push(`Innetemperatur: ${inneT} °C`);
        if (dutS !== undefined) res.tekniskeFunn!.push(`DUT sommer: ${dutS} °C`);
      }
    }

    // C. Klimaskjerm / Bygningsfysikk / U-verdier
    if (tit.includes('klimaskjerm') || tit.includes('u-verdi') || tit.includes('bygningsfysikk')) {
      const tabeller = parseMarkdownTabeller(innhold);
      const uVerdier: UVerdierData = {};
      const arealer: { yttervegg?: number; tak?: number; gulv?: number; vinduDor?: number } = {};

      for (const tab of tabeller) {
        if (tab.length < 2) continue;
        const h = tab[0].map((c) => c.toLowerCase());
        const uIdxHeader = h.findIndex((c) => /u-verdi|\bu\b|w\/\(?m/.test(c));
        const aIdxHeader = h.findIndex((c) => (/areal/.test(c) || (/m²|m2/.test(c) && !/w\//.test(c))) && !/u-verdi|\bu\b/.test(c));

        const dataRader = tab.slice(1);
        for (const rad of dataRader) {
          if (rad.length < 2) continue;
          const radTekst = rad.join(' ').toLowerCase();
          const forste = rad[0].toLowerCase();

          let uKand: number | undefined;
          let aKand: number | undefined;

          if (uIdxHeader >= 0 && rad[uIdxHeader] !== undefined) {
            uKand = parseNorskTall(rad[uIdxHeader]);
          }
          if (aIdxHeader >= 0 && rad[aIdxHeader] !== undefined) {
            aKand = parseNorskTall(rad[aIdxHeader]);
          }

          if (uKand === undefined || aKand === undefined) {
            const tallIRad = rad.slice(1).map((c) => parseNorskTall(c)).filter((n): n is number => n !== undefined);
            if (uKand === undefined) {
              uKand = tallIRad.find((n) => n > 0 && n < 3.0);
            }
            if (aKand === undefined) {
              aKand = tallIRad.find((n) => n >= 10);
            }
          }

          if (/yttervegg|fasade/.test(forste) || /yttervegg|fasade/.test(radTekst)) {
            if (uKand !== undefined) uVerdier.yttervegg = uKand;
            if (aKand !== undefined) arealer.yttervegg = aKand;
          } else if (/vindu|dør|glass/.test(forste) || /vindu|dør|glass/.test(radTekst)) {
            if (uKand !== undefined) uVerdier.vinduDor = uKand;
            if (aKand !== undefined) arealer.vinduDor = aKand;
          } else if (/tak|yttertak/.test(forste) || /tak|yttertak/.test(radTekst)) {
            if (uKand !== undefined) uVerdier.tak = uKand;
            if (aKand !== undefined) arealer.tak = aKand;
          } else if (/gulv|såle|dekke/.test(forste) || /gulv|såle|dekke/.test(radTekst)) {
            if (uKand !== undefined) uVerdier.gulv = uKand;
            if (aKand !== undefined) arealer.gulv = aKand;
          }
        }
      }

      const n50Match = innhold.match(
        /(?:lufttetthet|lekkasjetall|tetthet|n50|n_50)\s*(?:\(n50\))?[^:\n\r=-]*[:=–-]?\s*(\d+(?:[,.]\d+)?)\s*(?:1\/h|ombyttinger?|ombytting)?/i
      );
      if (n50Match) {
        const n50 = parseNorskTall(n50Match[1]);
        if (n50 !== undefined) {
          uVerdier.n50 = n50;
          res.tekniskeFunn!.push(`Luftlekkasjetall n50: ${n50} 1/h`);
        }
      }

      if (Object.keys(arealer).length > 0) {
        uVerdier.arealer = arealer;
      }
      if (Object.keys(uVerdier).length > 0) {
        res.uVerdier = uVerdier;
        res.klimaskjerm = { ...uVerdier };
        if (uVerdier.yttervegg !== undefined) res.tekniskeFunn!.push(`U-verdi yttervegg: ${uVerdier.yttervegg} W/(m²K)`);
        if (uVerdier.tak !== undefined) res.tekniskeFunn!.push(`U-verdi tak: ${uVerdier.tak} W/(m²K)`);
        if (uVerdier.gulv !== undefined) res.tekniskeFunn!.push(`U-verdi gulv: ${uVerdier.gulv} W/(m²K)`);
        if (uVerdier.vinduDor !== undefined) res.tekniskeFunn!.push(`U-verdi vindu/dør: ${uVerdier.vinduDor} W/(m²K)`);
      }
    }

    // D. Romoppvarming, Transmisjonstap & Varmeanlegg
    if (tit.includes('romoppvarming') || tit.includes('varme') || tit.includes('effekt')) {
      const transMatch = innhold.match(
        /(?:transmisjonstap\s+h_t|\bh_t\b|transmisjonstap|spesifikt\s+transmisjonstap)[^:\n\r=-]*[:=–-]?\s*(\d+(?:[,.]\d+)?)\s*(?:w\s*\/\s*k)?/i
      );
      if (transMatch) {
        const ht = parseNorskTall(transMatch[1]);
        if (ht !== undefined) {
          res.transmisjonstapWPerK = ht;
          res.tekniskeFunn!.push(`Transmisjonstap H_T: ${ht} W/K`);
        }
      }
      const v = parseVarmeanlegg(innhold);
      if (v) {
        res.varmeanlegg = { ...res.varmeanlegg, ...v };
        if (v.varmekilde) res.tekniskeFunn!.push(`Varmekilde: ${v.varmekilde}`);
        if (v.antallRadiatorer) res.tekniskeFunn!.push(`Radiatorer: ${v.antallRadiatorer} stk`);
        if (v.gulvvarmeM2) res.tekniskeFunn!.push(`Gulvvarme: ${v.gulvvarmeM2} m²`);
        if (v.turTemperaturC && v.returTemperaturC) res.tekniskeFunn!.push(`Varmeanlegg tur/retur: ${v.turTemperaturC}/${v.returTemperaturC} °C`);
        if (v.effektbehovKw) res.tekniskeFunn!.push(`Varme effektbehov: ${v.effektbehovKw} kW`);
      }
    }

    // E. Ventilasjon
    if (tit.includes('ventilasjon') || tit.includes('luft')) {
      const persMatch = innhold.match(
        /(?:personbelastning|antall\s+personer|personer|arbeidsplasser)[^:\n\r=-]*[:=–-]?\s*(\d+)/i
      );
      const sfpMatch = innhold.match(
        /(?:sfp(?:-krav)?|spesifikk\s+vifteeffekt)[^:\n\r=-]*[:=–-]?\s*(\d+(?:[,.]\d+)?)/i
      );
      const luftMatch = innhold.match(
        /(?:luftmengde|luftmengde\s+totalt?)[^:\n\r=-]*[:=–-]?\s*(\d[\d\s]*)\s*(?:m³\s*\/\s*h|m3\/h)/i
      );

      const personbelastning = persMatch ? parseNorskTall(persMatch[1]) : undefined;
      const sfpKrav = sfpMatch ? parseNorskTall(sfpMatch[1]) : undefined;
      const luftmengdeM3h = luftMatch ? parseNorskTall(luftMatch[1]) : undefined;

      if (personbelastning !== undefined || sfpKrav !== undefined || luftmengdeM3h !== undefined) {
        res.ventilasjon = {
          personbelastning,
          sfpKrav,
          luftmengdeM3h,
        };
        if (personbelastning !== undefined) res.tekniskeFunn!.push(`Ventilasjon personbelastning: ${personbelastning} personer`);
        if (sfpKrav !== undefined) res.tekniskeFunn!.push(`SFP-krav: ${sfpKrav} kW/(m³/s)`);
        if (luftmengdeM3h !== undefined) res.tekniskeFunn!.push(`Prosjektert luftmengde: ${luftmengdeM3h} m³/h`);
      }
    }

    // F. Sanitærutstyr
    if (tit.includes('sanitær') || tit.includes('forbruksvann') || tit.includes('armatur') || tit.includes('sanitaer')) {
      const poster = parseSanitaerUtstyrTabell(innhold);
      if (poster) {
        res.sanitaerUtstyr = poster;
        res.tekniskeFunn!.push(
          `Sanitærutstyr: Σ q_n = ${poster.sumQn} l/s, Σ DU = ${poster.sumDu}, q_s = ${poster.qsLPrS} l/s`
        );
        const dusjerTotalt = (poster.dusj?.antall || 0) + (poster.badekar?.antall || 0);
        if (dusjerTotalt > 0) {
          res.belastning = { dusjer: dusjerTotalt, dusjMinutter: 20, dusjLs: 0.2 };
        }
      }
    }

    // G. Rørsystemer
    if (tit.includes('rør') || tit.includes('ror') || tit.includes('ledningsnett')) {
      const ror = parseRorSystemer(innhold);
      if (ror) {
        res.rorSystemer = ror;
        res.tekniskeFunn!.push(
          `Rørsystemer: ${ror.poster.map((p) => `${p.navn}${p.dimensjon ? ` ${p.dimensjon}` : ''}${p.lengdeM ? ` (${p.lengdeM} m)` : ''}`).join(', ')}`
        );
      }
    }

    // H. Varmeanlegg (egen seksjon hvis til stede)
    if (tit.includes('varmeanlegg') || tit.includes('varmesentral') || tit.includes('radiator')) {
      const v = parseVarmeanlegg(innhold);
      if (v) {
        res.varmeanlegg = { ...res.varmeanlegg, ...v };
        if (v.varmekilde) res.tekniskeFunn!.push(`Varmekilde: ${v.varmekilde}`);
        if (v.antallRadiatorer) res.tekniskeFunn!.push(`Radiatorer: ${v.antallRadiatorer} stk`);
        if (v.gulvvarmeM2) res.tekniskeFunn!.push(`Gulvvarme: ${v.gulvvarmeM2} m²`);
        if (v.turTemperaturC && v.returTemperaturC) res.tekniskeFunn!.push(`Varmeanlegg tur/retur: ${v.turTemperaturC}/${v.returTemperaturC} °C`);
        if (v.effektbehovKw) res.tekniskeFunn!.push(`Varme effektbehov: ${v.effektbehovKw} kW`);
      }
    }
  }

  // Fallback for sanitærutstyr hvis ikke funnet i eksplisitt seksjon
  if (res.sanitaerUtstyr === undefined) {
    const posterGen = parseSanitaerUtstyrTabell(tekst);
    if (posterGen) {
      res.sanitaerUtstyr = posterGen;
      res.tekniskeFunn!.push(
        `Sanitærutstyr: Σ q_n = ${posterGen.sumQn} l/s, Σ DU = ${posterGen.sumDu}, q_s = ${posterGen.qsLPrS} l/s`
      );
      const dusjerTotalt = (posterGen.dusj?.antall || 0) + (posterGen.badekar?.antall || 0);
      if (dusjerTotalt > 0) {
        res.belastning = { dusjer: dusjerTotalt, dusjMinutter: 20, dusjLs: 0.2 };
      }
    }
  }

  // Fallback for rørsystemer hvis ikke funnet i eksplisitt seksjon
  if (res.rorSystemer === undefined) {
    const rorGen = parseRorSystemer(tekst);
    if (rorGen) {
      res.rorSystemer = rorGen;
      res.tekniskeFunn!.push(
        `Rørsystemer: ${rorGen.poster.map((p) => `${p.navn}${p.dimensjon ? ` ${p.dimensjon}` : ''}${p.lengdeM ? ` (${p.lengdeM} m)` : ''}`).join(', ')}`
      );
    }
  }

  // Fallback for varmeanlegg hvis ikke funnet i eksplisitt seksjon
  const varmeGen = parseVarmeanlegg(tekst);
  if (varmeGen) {
    res.varmeanlegg = { ...varmeGen, ...res.varmeanlegg };
  }

  // Fallback for BRA hvis ikke funnet under Arealer-seksjonen
  if (res.bra === undefined) {
    const braGen = trekkUtBra(tekst);
    if (braGen.bra !== undefined) {
      res.bra = braGen.bra;
      res.tekniskeFunn!.push(`BRA: ${braGen.bra} m²`);
    }
    if (braGen.etasjer && !res.etasjer) {
      res.etasjer = braGen.etasjer;
      res.tekniskeFunn!.push(`Etasjer: ${res.etasjer}`);
    }
  }

  res.oppsummering = lagKortFunnTekst(res);
  return res;
}

/**
 * Deterministisk lokal regex-/NLP-analyse som trekker ut prosjektnavn, adresse, Gnr/Bnr,
 * m², koter (ITK/ITR, IBR, terrengkote, laveste sluk), stikkledning, vanntrykk og dusjer
 * fra både chattemeldinger, VA-kart og dokumenter (Markdown, TXT, PDF, Word, Excel) – selv uten API-nøkkel.
 */
export function analyserTekstLokalt(tekst: string, filNavn = ''): UttrekkResultat {
  let mdResultat: UttrekkResultat | undefined;
  if (tekst.includes('##') || /\|[\s:-]+\|/.test(tekst) || (tekst.includes('|') && tekst.includes('\n'))) {
    try {
      mdResultat = parseProsjektMarkdown(tekst, filNavn);
    } catch (err) {
      console.warn('parseProsjektMarkdown feilet under lokal analyse:', err);
    }
  }

  const res: UttrekkResultat = { tekniskeFunn: [], foreslatteFeller: [] };
  const renTekst = normaliserDokumentTekst(tekst);
  const kilde = `${filNavn}\n${renTekst}`;

  // 1. Prosjektnavn (eksplisitt felt ELLER første Markdown #-overskrift ELLER filnavn)
  const navnMatch = renTekst.match(
    /(?:^|[;\n\r|])\s*(?:Prosjekt(?:navn)?|Bygg(?:navn)?|Tiltak(?:snavn)?|Navn\s+på\s+(?:prosjekt|bygg|eiendom))\b\s*(?:er|[:=-])\s*([^\n\r|;]{2,70})/i
  );
  const overskriftMatch = tekst.match(/^\s*#\s+([^\n\r#]{3,70})/m);

  if (navnMatch) {
    const vasketNavn = navnMatch[1]
      .replace(/^(?:prosjekt(?:navn)?|bygg(?:navn)?|tiltak(?:snavn)?)\s*[:–-]\s*/i, '')
      .replace(/[.,;]+$/, '')
      .trim();
    if (vasketNavn.length >= 2) {
      res.navn = vasketNavn;
      res.eksaktNavnFraTekst = true;
      res.tekniskeFunn!.push(`Prosjektnavn: ${res.navn}`);
    }
  } else if (overskriftMatch) {
    const vasketOverskrift = overskriftMatch[1]
      .replace(/\*\*|__|`/g, '')
      .replace(/^(?:prosjekt(?:beskrivelse|navn)?|vvs-beskrivelse|forprosjekt|rapport|notat|bygg(?:navn)?)\s*[:–-]\s*/i, '')
      .trim();
    if (vasketOverskrift.length >= 3) {
      res.navn = vasketOverskrift;
      res.eksaktNavnFraTekst = true;
      res.tekniskeFunn!.push(`Prosjektnavn: ${res.navn}`);
    }
  } else if (filNavn) {
    const utenExt = filNavn.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
    if (utenExt.length > 2) res.navn = utenExt;
  }

  // 2. Adresse / sted (håndterer både «Adresse: Friheim 49», Markdown-tabeller, og gatenavn i løpende tekst)
  const eksplisittAdresseLinjeMatch = renTekst.match(
    /(?:adresse(?:n)?|gateadresse(?:n)?|eiendommens\s+adresse|besøksadresse|beliggenhet(?:en)?|lokasjon|sted(?:et)?|tomt(?:eadresse)?)\s*(?:er|ligger\s+i|ligger\s+på|[:=-])+\s*([A-ZÆØÅa-zæøå0-9\s.,/-]+?)(?=\s+(?:og\s+(?:laveste|kote|itk|itr|ibr|bra|statisk|gnr|bruksareal)|med\s+(?:bra|kote|laveste)|hvor|der)\b|[;\n\r|]|$)/i
  );
  const gateNavnMatch = renTekst.match(
    /\b([A-ZÆØÅ][a-zæøåA-ZÆØÅ-]{1,30}(?:\s+[A-ZÆØÅ][a-zæøåA-ZÆØÅ-]{1,25})?(?:gata|gate|veien|vei|vegen|veg|allé|alleen|plass|plassen|torg|torget|bakken|lia|sletta|brygge|kai|strand|stranda|vik|vika|holmen|tunet|kroken|stien|svingen|ringen|faret|hei|heia|heim|haug|haugen|marka|vollen|åsen|dalen|nes|neset|berget|skogen|flaten|moen|gård|hagen)\s+\d{1,4}\s*[A-Za-z]?(?:,?\s*\d{4}\s+[A-ZÆØÅ][a-zæøåA-ZÆØÅ-]+)?)(?=\s+(?:og|med|hvor|der|laveste|kote|itr|itk|ibr|bra|statisk|gnr)\b|[.;,\n\r]|$)/
  );
  const poststedAdresseMatch = renTekst.match(
    /\b([A-ZÆØÅ][a-zæøåA-ZÆØÅ-]{2,30}\s+\d{1,4}\s*[A-Za-z]?,\s*\d{4}\s+[A-ZÆØÅ][a-zæøåA-ZÆØÅ-]+)\b/
  );

  const råAdresse =
    eksplisittAdresseLinjeMatch?.[1] ?? poststedAdresseMatch?.[1] ?? gateNavnMatch?.[1];
  const funnetAdresse = råAdresse
    ?.trim()
    .replace(/\s+(?:og|med)\s*$/i, '')
    .replace(/[.,;]+$/, '')
    .trim();

  if (
    funnetAdresse &&
    funnetAdresse.length >= 4 &&
    !/^(?:ikke\s+oppgitt|ukjent|mangler|tba)$/i.test(funnetAdresse)
  ) {
    res.sted = funnetAdresse;
    res.tekniskeFunn!.push(`Adresse: ${funnetAdresse}`);
    // Hvis vi kun hadde et generisk eller tomt prosjektnavn, bruk adressen som prosjektnavn
    if (!res.navn) {
      res.navn = funnetAdresse;
    }
  }

  // 3. Bygningstype
  const eksplisittByggtypeMatch = renTekst.match(
    /(?:bygningstype|byggtype|type\s+bygg|kategorisering)\s*(?:er|[:=-])\s*([^\n\r|;]{3,60})/i
  );
  const gjenkjentType =
    gjenkjennBygningstype(eksplisittByggtypeMatch?.[1] ?? '') ??
    gjenkjennBygningstype(renTekst);
  if (gjenkjentType) {
    res.bygningstype = gjenkjentType;
    res.tekniskeFunn!.push(`Bygningstype: ${gjenkjentType}`);
  }

  // 4. Gnr / Bnr (Matrikkel)
  const gnrBnrMatch =
    renTekst.match(
      /(?:gnr\.?|gårdsnr\.?|gårdsnummer)\s*[:.=]?\s*(\d+)\s*(?:[,/\s-]+|(?:og\s+)?)?(?:bnr\.?|bruksnr\.?|bruksnummer)\s*[:.=]?\s*(\d+)/i
    ) ||
    renTekst.match(/\b(?:matrikkel|gnr\s*\/\s*bnr)\s*[:=-]?\s*(\d+)\s*\/\s*(\d+)\b/i);
  if (gnrBnrMatch) {
    res.matrikkel = `Gnr. ${gnrBnrMatch[1]} / Bnr. ${gnrBnrMatch[2]}`;
    res.tekniskeFunn!.push(`Matrikkel: ${res.matrikkel}`);
  }

  // 5. Kommune / VA-myndighet
  const kommuneMatch =
    renTekst.match(/(?:VA-myndighet|kommune)\s*(?:er|[:=-])\s*([A-ZÆØÅ][a-zæøåA-ZÆØÅ\s-]+?)(?=[.,;\n\r|]|$)/i) ||
    renTekst.match(/\b([A-ZÆØÅ][a-zæøåA-ZÆØÅ-]+)\s+kommune\b/);
  if (kommuneMatch) {
    const kNavn = kommuneMatch[1].trim();
    if (kNavn.length >= 3 && !/^(?:vann|avløp|teknisk|etat)$/i.test(kNavn)) {
      res.vaMyndighet = kNavn.toLowerCase().includes('kommune')
        ? kNavn
        : `${kNavn} kommune – Vann og avløp`;
    }
  }

  // 6. Byggherre
  const byggherreMatch = renTekst.match(
    /(?:byggherre|oppdragsgiver|tiltakshaver|kunde)\s*(?:er|[:=-])\s*([^\n\r|.;]{2,60})/i
  );
  if (byggherreMatch) {
    res.byggherre = byggherreMatch[1].trim();
    res.tekniskeFunn!.push(`Byggherre: ${res.byggherre}`);
  }

  // 7. BRA / Areal (m²) – støtter både «BRA | 3 × 800 = 2 400 m²», tabeller, multiplikasjon og standardformer
  const braFunn = trekkUtBra(renTekst);
  if (braFunn.bra !== undefined) {
    res.bra = braFunn.bra;
    res.tekniskeFunn!.push(`BRA: ${braFunn.bra} m²`);
  }

  // 8. Etasjer
  const etasjerMatch =
    renTekst.match(/(?:antall\s+)?etasjer\s*(?:er|[:=|\-–])\s*([^\n\r|.;]{1,35})/i) ||
    renTekst.match(/\b(\d{1,2}\s*(?:etasjer?|etg\.?)(?:\s*\+\s*(?:kjeller|underetasje|u1|loft|sokkel))?)/i);
  if (etasjerMatch) {
    res.etasjer = etasjerMatch[1].trim();
    res.tekniskeFunn!.push(`Etasjer: ${res.etasjer}`);
  } else if (braFunn.etasjer && !res.etasjer) {
    res.etasjer = braFunn.etasjer;
    res.tekniskeFunn!.push(`Etasjer: ${res.etasjer}`);
  }

  // 9. U-verdier og transmisjonstap
  const uFunn = trekkUtUVerdierOgTransmisjonstap(renTekst);
  if (uFunn.uVerdier) {
    res.uVerdier = uFunn.uVerdier;
    if (uFunn.uVerdier.yttervegg !== undefined) {
      res.tekniskeFunn!.push(`U-verdi yttervegg: ${uFunn.uVerdier.yttervegg} W/(m²K)`);
    }
    if (uFunn.uVerdier.tak !== undefined) {
      res.tekniskeFunn!.push(`U-verdi tak: ${uFunn.uVerdier.tak} W/(m²K)`);
    }
    if (uFunn.uVerdier.gulv !== undefined) {
      res.tekniskeFunn!.push(`U-verdi gulv på grunn: ${uFunn.uVerdier.gulv} W/(m²K)`);
    }
    if (uFunn.uVerdier.vinduDor !== undefined) {
      res.tekniskeFunn!.push(`U-verdi vinduer/dører: ${uFunn.uVerdier.vinduDor} W/(m²K)`);
    }
  }
  if (uFunn.transmisjonstapWPerK !== undefined) {
    res.transmisjonstapWPerK = uFunn.transmisjonstapWPerK;
    res.tekniskeFunn!.push(`Transmisjonstap: ${uFunn.transmisjonstapWPerK} W/K`);
  }

  // 10. Koter (ITK/ITR, IBR, Terreng/Gatelokk, Vannledning, Laveste sluk/Kjeller, 1. etg, Stikkledning og Fall)
  const itrMatch = renTekst.match(
    /(?:kote\s+(?:ITK|ITR)(?:\s*\/\s*(?:ITR|ITK))?|\bITR\b|\bITK\b|innvendig\s+topp\s+(?:rør|kum)|topp\s+(?:rør|kum)|\bOK\s+rør\b)(?:[^0-9\n\r+-]{0,30})?(?:kote\s*)?[+C\s]*(-?\d{1,3}(?:[,.]\d{1,2})?)/i
  );
  const ibrMatch = renTekst.match(
    /(?:kote\s+IBR|\bIBR\b|innvendig\s+bunn\s+(?:rør|kum)|bunn\s+(?:rør|kum)|bunnledning(?:\s+i\s+kum)?|\bUK\s+rør\b)(?:[^0-9\n\r+-]{0,30})?(?:kote\s*)?[+C\s]*(-?\d{1,3}(?:[,.]\d{1,2})?)/i
  );
  const gateMatch = renTekst.match(
    /(?:kote\s+terreng|terrengkote|terrengnivå|terreng(?:\s+på\s+tomt(?:a)?)?|gate(?:lokk|kote)?|kumlokk|\bOK\s+kum\b|\bTK\b)(?:[^0-9\n\r+-]{0,25})?(?:kote\s*)?[+C\s]*(-?\d{1,3}(?:[,.]\d{1,2})?)/i
  );
  const vannledMatch = renTekst.match(
    /(?:kommunal\s+vannledning|vannledning(?:skote)?|kote\s+vannledning|\bVL\s+kote\b)(?:[^0-9\n\r+-]{0,25})?(?:kote\s*)?[+C\s]*(-?\d{1,3}(?:[,.]\d{1,2})?)/i
  );
  const kjellerMatch = renTekst.match(
    /(?:kote\s+laveste\s+sluk|laveste\s+sluk(?:\s*\/\s*gulv)?|slukkote|kote\s+sluk|sluk\s+i\s+kjeller|kjeller(?:\s*U\d)?(?:gulv|sluk|kote)?|underetasje|\bU[12]\b|\bOK\s*FG\b|ferdig\s+gulv|gulvkote)(?:[^0-9\n\r+-]{0,25})?(?:kote\s*|[:=]\s*|\b(?:er|på)\s+(?:kote\s*)?|[+C]\s*)[+C\s]*(-?\d{1,3}(?:[,.]\d{1,2})?)/i
  );
  const etg1Match = renTekst.match(
    /(?:1\.\s*et(?:asje|g)|hovedetasje|plan\s+1\s*\(OK\s*FG\))(?:[^0-9\n\r+-]{0,25})?(?:kote\s*)?[+C\s]*(-?\d{1,3}(?:[,.]\d{1,2})?)/i
  );
  const stikkMatch = renTekst.match(
    /(?:grøft(?:elengde)?|stikkledning(?:en|ens\s+lengde)?|avstand\s+til\s+kum|lengde\s+stikkledning)[^0-9\n\r]{0,25}(\d{1,3}(?:[,.]\d)?)\s*(?:m|meter)\b/i
  );
  const fallForholdMatch = renTekst.match(/(?:fall(?:\s+på)?\s*)?1\s*:\s*(\d{2,3})\b/i);
  const fallPromilleMatch = renTekst.match(/(\d{1,2}(?:[,.]\d)?)\s*(?:‰|promille)\b/i);

  const itr = parseNorskTall(itrMatch?.[1]);
  const ibr = parseNorskTall(ibrMatch?.[1]);
  const gate = parseNorskTall(gateMatch?.[1]);
  const vannledning = parseNorskTall(vannledMatch?.[1]);
  const kjeller = parseNorskTall(kjellerMatch?.[1]);
  const etg1 = parseNorskTall(etg1Match?.[1]);
  const stikk = parseNorskTall(stikkMatch?.[1]);
  let fallNevner = parseNorskTall(fallForholdMatch?.[1]);
  if (fallNevner === undefined && fallPromilleMatch) {
    const promille = parseNorskTall(fallPromilleMatch[1]);
    if (promille && promille > 0) {
      fallNevner = Math.round(1000 / promille);
    }
  }

  if (
    itr !== undefined ||
    ibr !== undefined ||
    gate !== undefined ||
    vannledning !== undefined ||
    kjeller !== undefined ||
    etg1 !== undefined ||
    stikk !== undefined ||
    fallNevner !== undefined
  ) {
    res.koter = {};
    if (itr !== undefined) {
      res.koter.itrKum = itr;
      res.tekniskeFunn!.push(`Kote ITK/ITR: C +${itr}`);
    }
    if (ibr !== undefined) {
      res.koter.ibrKum = ibr;
      res.tekniskeFunn!.push(`Kote IBR: C +${ibr}`);
    }
    if (gate !== undefined) {
      res.koter.gate = gate;
      res.tekniskeFunn!.push(`Terrengkote: C +${gate}`);
    }
    if (vannledning !== undefined) {
      res.koter.vannledning = vannledning;
      res.tekniskeFunn!.push(`Kote vannledning: C +${vannledning}`);
    }
    if (stikk !== undefined) {
      res.koter.stikkLengde = stikk;
      res.tekniskeFunn!.push(`Stikkledning: ${stikk} m`);
    }
    if (fallNevner !== undefined && fallNevner >= 10) {
      res.koter.fallNevner = fallNevner;
      res.tekniskeFunn!.push(`Fall: 1:${fallNevner}`);
    }

    const gulv: { navn: string; kote: number }[] = [];
    if (kjeller !== undefined) {
      gulv.push({ navn: 'Laveste sluk / gulv (OK FG)', kote: kjeller });
      res.tekniskeFunn!.push(`Laveste sluk (OK FG): C +${kjeller}`);
    }
    if (etg1 !== undefined) {
      gulv.push({ navn: '1. etasje (OK FG)', kote: etg1 });
      res.tekniskeFunn!.push(`1. etasje (OK FG): C +${etg1}`);
    }
    if (gulv.length > 0) res.koter.gulv = gulv;
  }

  // 10. Vanntrykk
  const statiskMatch = renTekst.match(
    /(?:statisk\s+(?:vann)?trykk|hovedledningstrykk|vanntrykk(?:et)?|kommunalt\s+trykk)[^0-9\n\r]{0,25}(\d{1,2}(?:[,.]\d{1,2})?)\s*bar/i
  );
  const dynMatch = renTekst.match(
    /(?:dynamisk\s+(?:vann)?trykk|resttrykk(?:\s+ved\s+uttak)?|Q\/p(?:-trykk)?)[^0-9\n\r]{0,25}(\d{1,2}(?:[,.]\d{1,2})?)\s*bar/i
  );
  const uttakMatch = renTekst.match(
    /(?:ved\s+uttak(?:\s+på)?|uttak|vannmengde)[^0-9\n\r]{0,20}(\d{2,5})\s*l\/min/i
  );
  const statisk = parseNorskTall(statiskMatch?.[1]);
  const dynamisk = parseNorskTall(dynMatch?.[1]);
  const uttakLmin = parseNorskTall(uttakMatch?.[1]);
  if (statisk !== undefined || dynamisk !== undefined || uttakLmin !== undefined) {
    res.vanntrykk = {
      statiskBar: statisk,
      dynamiskBar: dynamisk,
      uttakLmin,
      antatt: /antatt|anslått/i.test(kilde),
    };
    if (statisk !== undefined) res.tekniskeFunn!.push(`Statisk vanntrykk: ${statisk} bar`);
    if (dynamisk !== undefined) res.tekniskeFunn!.push(`Dynamisk vanntrykk: ${dynamisk} bar`);
    if (uttakLmin !== undefined) res.tekniskeFunn!.push(`Uttak Q/p: ${uttakLmin} l/min`);
  }

  // 11. Overvann (intensitet / påslipp)
  const intensitetMatch = renTekst.match(
    /(?:regnintensitet|intensitet|IVF)[^0-9\n\r]{0,25}(\d{2,4}(?:[,.]\d)?)\s*l\s*\/\s*\(?s/i
  );
  const paaslippMatch = renTekst.match(
    /(?:maks(?:imalt)?\s+påslipp|påslipp(?:skrav)?)[^0-9\n\r]{0,25}(\d{1,3}(?:[,.]\d)?)\s*l\s*\/\s*s/i
  );
  const intensitet = parseNorskTall(intensitetMatch?.[1]);
  const maksPaaslippLs = parseNorskTall(paaslippMatch?.[1]);
  if (intensitet !== undefined || maksPaaslippLs !== undefined) {
    res.overvann = { intensitet, maksPaaslippLs };
    if (intensitet !== undefined) res.tekniskeFunn!.push(`Regnintensitet: ${intensitet} l/(s·ha)`);
    if (maksPaaslippLs !== undefined) res.tekniskeFunn!.push(`Maks påslipp: ${maksPaaslippLs} l/s`);
  }

  // 12. Dusjer
  const dusjMatch =
    renTekst.match(/(?:antall\s+)?dusj(?:er)?\s*(?:er|[:=-])\s*(\d{1,3})\b/i) ||
    renTekst.match(/(\d{1,3})\s*(?:stk\.?\s*)?(?:samtidige\s+)?dusj(?:er)?/i);
  const dusjer = parseNorskTall(dusjMatch?.[1]);
  if (dusjer !== undefined && dusjer > 0) {
    res.belastning = { dusjer, dusjMinutter: 20, dusjLs: 0.2 };
    res.tekniskeFunn!.push(`Dusjbelastning: ${dusjer} samtidige dusjer`);
  }

  // 13. Teknisk rom
  const tekRomMatch = renTekst.match(
    /(?:teknisk\s+rom|varmesentral)[^0-9\n\r]{0,25}(\d{1,4})\s*(?:m²|m2|kvm)/i
  );
  const tekRom = parseNorskTall(tekRomMatch?.[1]);
  if (tekRom !== undefined) {
    res.tekniskRomM2 = tekRom;
    res.tekniskeFunn!.push(`Teknisk rom: ${tekRom} m²`);
  }

  // 14. Varmeanlegg og Rørsystemer i ustrukturert tekst hvis ikke allerede fylt ut
  if (!res.varmeanlegg) {
    const v = parseVarmeanlegg(renTekst);
    if (v) res.varmeanlegg = v;
  }
  if (!res.rorSystemer) {
    const r = parseRorSystemer(renTekst);
    if (r) res.rorSystemer = r;
  }

  const sluttResultat = mdResultat ? flettUttrekkResultater(res, mdResultat) : res;
  if (sluttResultat.tekniskeFunn!.length > 0) {
    sluttResultat.oppsummering = lagKortFunnTekst(sluttResultat);
  } else if (tekst.trim().length > 0) {
    sluttResultat.oppsummering = `Lest inn tekst${filNavn ? ` fra «${filNavn}»` : ''} (${tekst.length} tegn). Klar for AI-analyse.`;
  } else {
    sluttResultat.oppsummering = `Fil «${filNavn || 'vedlegg'}» lastet opp og klar for Gemini Vision bilde-/PDF-analyse.`;
  }

  return sluttResultat;
}

/**
 * Bygger en kort, grønn oppsummeringslinje over gjenkjente verdier
 * (f.eks. «Fant adresse: Friheim 49, BRA: 1200 m² – fylt ut i skjema»).
 */
export function lagKortFunnTekst(u: UttrekkResultat): string {
  const deler: string[] = [];
  if (u.sted) deler.push(`adresse: ${u.sted}`);
  if (u.bra !== undefined) deler.push(`BRA: ${u.bra} m²`);
  if (u.etasjer) deler.push(`etasjer: ${u.etasjer}`);
  if (u.klima?.dutVinter !== undefined) deler.push(`DUT: ${u.klima.dutVinter} °C`);
  if (u.klima?.innetemperatur !== undefined) deler.push(`innetemp: ${u.klima.innetemperatur} °C`);
  if (u.uVerdier?.yttervegg !== undefined) deler.push(`U-yttervegg: ${u.uVerdier.yttervegg}`);
  if (u.uVerdier?.tak !== undefined) deler.push(`U-tak: ${u.uVerdier.tak}`);
  if (u.uVerdier?.gulv !== undefined) deler.push(`U-gulv: ${u.uVerdier.gulv}`);
  if (u.uVerdier?.vinduDor !== undefined) deler.push(`U-vindu: ${u.uVerdier.vinduDor}`);
  if (u.uVerdier?.n50 !== undefined) deler.push(`n50: ${u.uVerdier.n50} 1/h`);
  if (u.transmisjonstapWPerK !== undefined) deler.push(`transmisjonstap: ${u.transmisjonstapWPerK} W/K`);
  if (u.varmeanlegg?.varmekilde) deler.push(`varmekilde: ${u.varmeanlegg.varmekilde}`);
  if (u.varmeanlegg?.antallRadiatorer !== undefined) deler.push(`radiatorer: ${u.varmeanlegg.antallRadiatorer} stk`);
  if (u.varmeanlegg?.gulvvarmeM2 !== undefined) deler.push(`gulvvarme: ${u.varmeanlegg.gulvvarmeM2} m²`);
  if (u.rorSystemer?.poster && u.rorSystemer.poster.length > 0) deler.push(`rørsystemer: ${u.rorSystemer.poster.length} kurser`);
  if (u.sanitaerUtstyr?.qsLPrS !== undefined) deler.push(`sanitær q_s: ${u.sanitaerUtstyr.qsLPrS.toFixed(2)} l/s`);
  if (u.ventilasjon?.personbelastning !== undefined) deler.push(`ventilasjon: ${u.ventilasjon.personbelastning} pers`);
  if (u.eksaktNavnFraTekst && u.navn && u.navn !== u.sted) {
    deler.push(`prosjektnavn: ${u.navn}`);
  }
  if (u.matrikkel) deler.push(`matrikkel: ${u.matrikkel}`);
  if (u.bygningstype) deler.push(`type: ${u.bygningstype}`);
  if (u.koter?.gate !== undefined) deler.push(`terrengkote: +${u.koter.gate}`);
  if (u.koter?.itrKum !== undefined) deler.push(`ITK/ITR: +${u.koter.itrKum}`);
  if (u.koter?.ibrKum !== undefined) deler.push(`IBR: +${u.koter.ibrKum}`);
  if (u.koter?.gulv && u.koter.gulv.length > 0) {
    deler.push(`laveste sluk: +${u.koter.gulv[0].kote}`);
  }
  if (u.koter?.stikkLengde !== undefined) deler.push(`stikkledning: ${u.koter.stikkLengde} m`);
  if (u.koter?.fallNevner !== undefined) deler.push(`fall: 1:${u.koter.fallNevner}`);
  if (u.vanntrykk?.statiskBar !== undefined) deler.push(`vanntrykk: ${u.vanntrykk.statiskBar} bar`);
  if (u.belastning?.dusjer !== undefined) deler.push(`dusjer: ${u.belastning.dusjer} stk`);
  if (u.tekniskRomM2 !== undefined) deler.push(`teknisk rom: ${u.tekniskRomM2} m²`);

  if (deler.length === 0 && u.navn) {
    deler.push(`prosjektnavn: ${u.navn}`);
  }
  if (deler.length === 0) {
    return 'Ingen strukturerte felt gjenkjent automatisk ennå.';
  }
  return `Fant ${deler.join(', ')} – fylt ut i skjema`;
}

/**
 * Kombinerer to UttrekkResultat (f.eks. lokal tekst-parser + Gemini Vision AI)
 * slik at verdier fra overstyrende uttrekk fyller ut eller forbedrer basen.
 */
export function flettUttrekkResultater(
  lokal: UttrekkResultat,
  ai: UttrekkResultat
): UttrekkResultat {
  const kombinert: UttrekkResultat = {
    ...lokal,
    ...ai,
    navn:
      ai.eksaktNavnFraTekst && ai.navn
        ? ai.navn
        : lokal.eksaktNavnFraTekst && lokal.navn
        ? lokal.navn
        : ai.navn || lokal.navn,
    eksaktNavnFraTekst: Boolean(ai.eksaktNavnFraTekst || lokal.eksaktNavnFraTekst),
    bygningstype: ai.bygningstype || lokal.bygningstype,
    bra: ai.bra ?? lokal.bra,
    etasjer: ai.etasjer || lokal.etasjer,
    sted: ai.sted || lokal.sted,
    matrikkel: ai.matrikkel || lokal.matrikkel,
    vaMyndighet: ai.vaMyndighet || lokal.vaMyndighet,
    byggherre: ai.byggherre || lokal.byggherre,
    miljoambisjon: ai.miljoambisjon || lokal.miljoambisjon,
    tekniskRomM2: ai.tekniskRomM2 ?? lokal.tekniskRomM2,
    klima:
      ai.klima || lokal.klima
        ? {
            dutVinter: ai.klima?.dutVinter ?? lokal.klima?.dutVinter,
            innetemperatur: ai.klima?.innetemperatur ?? lokal.klima?.innetemperatur,
            dutSommer: ai.klima?.dutSommer ?? lokal.klima?.dutSommer,
          }
        : undefined,
    uVerdier:
      lokal.uVerdier || ai.uVerdier
        ? {
            yttervegg: ai.uVerdier?.yttervegg ?? lokal.uVerdier?.yttervegg,
            tak: ai.uVerdier?.tak ?? lokal.uVerdier?.tak,
            gulv: ai.uVerdier?.gulv ?? lokal.uVerdier?.gulv,
            vinduDor: ai.uVerdier?.vinduDor ?? lokal.uVerdier?.vinduDor,
            n50: ai.uVerdier?.n50 ?? lokal.uVerdier?.n50,
            arealer:
              ai.uVerdier?.arealer || lokal.uVerdier?.arealer
                ? {
                    yttervegg: ai.uVerdier?.arealer?.yttervegg ?? lokal.uVerdier?.arealer?.yttervegg,
                    tak: ai.uVerdier?.arealer?.tak ?? lokal.uVerdier?.arealer?.tak,
                    gulv: ai.uVerdier?.arealer?.gulv ?? lokal.uVerdier?.arealer?.gulv,
                    vinduDor: ai.uVerdier?.arealer?.vinduDor ?? lokal.uVerdier?.arealer?.vinduDor,
                  }
                : undefined,
          }
        : undefined,
    klimaskjerm: undefined,
    sanitaerUtstyr: ai.sanitaerUtstyr ?? lokal.sanitaerUtstyr,
    rorSystemer: ai.rorSystemer ?? lokal.rorSystemer,
    varmeanlegg:
      ai.varmeanlegg || lokal.varmeanlegg
        ? {
            varmekilde: ai.varmeanlegg?.varmekilde ?? lokal.varmeanlegg?.varmekilde,
            antallRadiatorer: ai.varmeanlegg?.antallRadiatorer ?? lokal.varmeanlegg?.antallRadiatorer,
            gulvvarmeM2: ai.varmeanlegg?.gulvvarmeM2 ?? lokal.varmeanlegg?.gulvvarmeM2,
            turTemperaturC: ai.varmeanlegg?.turTemperaturC ?? lokal.varmeanlegg?.turTemperaturC,
            returTemperaturC: ai.varmeanlegg?.returTemperaturC ?? lokal.varmeanlegg?.returTemperaturC,
            effektbehovKw: ai.varmeanlegg?.effektbehovKw ?? lokal.varmeanlegg?.effektbehovKw,
            systemType: ai.varmeanlegg?.systemType ?? lokal.varmeanlegg?.systemType,
          }
        : undefined,
    ventilasjon:
      ai.ventilasjon || lokal.ventilasjon
        ? {
            personbelastning: ai.ventilasjon?.personbelastning ?? lokal.ventilasjon?.personbelastning,
            sfpKrav: ai.ventilasjon?.sfpKrav ?? lokal.ventilasjon?.sfpKrav,
            luftmengdeM3h: ai.ventilasjon?.luftmengdeM3h ?? lokal.ventilasjon?.luftmengdeM3h,
          }
        : undefined,
    transmisjonstapWPerK: ai.transmisjonstapWPerK ?? lokal.transmisjonstapWPerK,
    koter:
      lokal.koter || ai.koter
        ? {
            gate: ai.koter?.gate ?? lokal.koter?.gate,
            ibrKum: ai.koter?.ibrKum ?? lokal.koter?.ibrKum,
            itrKum: ai.koter?.itrKum ?? lokal.koter?.itrKum,
            vannledning: ai.koter?.vannledning ?? lokal.koter?.vannledning,
            stikkLengde: ai.koter?.stikkLengde ?? lokal.koter?.stikkLengde,
            fallNevner: ai.koter?.fallNevner ?? lokal.koter?.fallNevner,
            gulv:
              ai.koter?.gulv && ai.koter.gulv.length > 0
                ? ai.koter.gulv
                : lokal.koter?.gulv,
          }
        : undefined,
    vanntrykk:
      lokal.vanntrykk || ai.vanntrykk
        ? {
            statiskBar: ai.vanntrykk?.statiskBar ?? lokal.vanntrykk?.statiskBar,
            dynamiskBar: ai.vanntrykk?.dynamiskBar ?? lokal.vanntrykk?.dynamiskBar,
            uttakLmin: ai.vanntrykk?.uttakLmin ?? lokal.vanntrykk?.uttakLmin,
            antatt: ai.vanntrykk?.antatt ?? lokal.vanntrykk?.antatt,
          }
        : undefined,
    overvann:
      lokal.overvann || ai.overvann
        ? {
            flater:
              ai.overvann?.flater && ai.overvann.flater.length > 0
                ? ai.overvann.flater
                : lokal.overvann?.flater,
            intensitet: ai.overvann?.intensitet ?? lokal.overvann?.intensitet,
            maksPaaslippLs: ai.overvann?.maksPaaslippLs ?? lokal.overvann?.maksPaaslippLs,
          }
        : undefined,
    belastning:
      lokal.belastning || ai.belastning
        ? {
            dusjer: ai.belastning?.dusjer ?? lokal.belastning?.dusjer,
            dusjMinutter: ai.belastning?.dusjMinutter ?? lokal.belastning?.dusjMinutter,
            dusjLs: ai.belastning?.dusjLs ?? lokal.belastning?.dusjLs,
          }
        : undefined,
    tekniskeFunn: [
      ...new Set([...(lokal.tekniskeFunn ?? []), ...(ai.tekniskeFunn ?? [])]),
    ],
    foreslatteFeller: [
      ...new Set([...(lokal.foreslatteFeller ?? []), ...(ai.foreslatteFeller ?? [])]),
    ],
  };
  kombinert.klimaskjerm = kombinert.uVerdier;
  kombinert.oppsummering = lagKortFunnTekst(kombinert);
  return kombinert;
}

/** Sjekker om et UttrekkResultat inneholder minst én konkret prosjektoppdatering. */
export function harUttrekkData(u: UttrekkResultat | null | undefined): boolean {
  if (!u) return false;
  return Boolean(
    u.navn ||
      u.bygningstype ||
      u.bra !== undefined ||
      u.etasjer ||
      u.sted ||
      u.matrikkel ||
      u.vaMyndighet ||
      u.byggherre ||
      u.miljoambisjon ||
      u.klima !== undefined ||
      u.uVerdier !== undefined ||
      u.klimaskjerm !== undefined ||
      u.sanitaerUtstyr !== undefined ||
      u.rorSystemer !== undefined ||
      u.varmeanlegg !== undefined ||
      u.ventilasjon !== undefined ||
      u.transmisjonstapWPerK !== undefined ||
      u.tekniskRomM2 !== undefined ||
      (u.koter &&
        (u.koter.gate !== undefined ||
          u.koter.ibrKum !== undefined ||
          u.koter.itrKum !== undefined ||
          u.koter.vannledning !== undefined ||
          u.koter.stikkLengde !== undefined ||
          u.koter.fallNevner !== undefined ||
          (u.koter.gulv && u.koter.gulv.length > 0))) ||
      (u.vanntrykk &&
        (u.vanntrykk.statiskBar !== undefined ||
          u.vanntrykk.dynamiskBar !== undefined ||
          u.vanntrykk.uttakLmin !== undefined)) ||
      (u.belastning && u.belastning.dusjer !== undefined) ||
      (u.overvann &&
        ((u.overvann.flater && u.overvann.flater.length > 0) ||
          u.overvann.intensitet !== undefined ||
          u.overvann.maksPaaslippLs !== undefined))
  );
}

/** Lager en lesbar liste over hvilke felt som ble oppdatert fra et UttrekkResultat. */
export function beskrivUttrekkEndringer(u: UttrekkResultat): string[] {
  const liste: string[] = [];
  if (u.navn) liste.push(`Prosjektnavn satt til «${u.navn}»`);
  if (u.sted) liste.push(`Adresse satt til «${u.sted}»`);
  if (u.matrikkel) liste.push(`Gnr/Bnr satt til «${u.matrikkel}»`);
  if (u.vaMyndighet) liste.push(`VA-myndighet satt til «${u.vaMyndighet}»`);
  if (u.bra !== undefined) liste.push(`Oppvarmet BRA satt til ${u.bra} m²`);
  if (u.etasjer) liste.push(`Etasjer satt til «${u.etasjer}»`);
  if (u.byggherre) liste.push(`Byggherre satt til «${u.byggherre}»`);
  if (u.klima?.dutVinter !== undefined) liste.push(`Klimadata DUT vinter satt til ${u.klima.dutVinter} °C`);
  if (u.klima?.innetemperatur !== undefined) liste.push(`Innetemperatur satt til ${u.klima.innetemperatur} °C`);
  if (u.uVerdier?.yttervegg !== undefined) liste.push(`U-verdi yttervegg satt til ${u.uVerdier.yttervegg} W/(m²K)`);
  if (u.uVerdier?.tak !== undefined) liste.push(`U-verdi tak satt til ${u.uVerdier.tak} W/(m²K)`);
  if (u.uVerdier?.gulv !== undefined) liste.push(`U-verdi gulv på grunn satt til ${u.uVerdier.gulv} W/(m²K)`);
  if (u.uVerdier?.vinduDor !== undefined) liste.push(`U-verdi vinduer/dører satt til ${u.uVerdier.vinduDor} W/(m²K)`);
  if (u.uVerdier?.n50 !== undefined) liste.push(`Luftlekkasjetall n50 satt til ${u.uVerdier.n50} 1/h`);
  if (u.transmisjonstapWPerK !== undefined) liste.push(`Transmisjonstap satt til ${u.transmisjonstapWPerK} W/K`);
  if (u.sanitaerUtstyr) {
    liste.push(`Sanitærutstyr registrert (Σ q_n = ${u.sanitaerUtstyr.sumQn.toFixed(1)} l/s, Σ DU = ${u.sanitaerUtstyr.sumDu.toFixed(1)}, q_s = ${u.sanitaerUtstyr.qsLPrS.toFixed(2)} l/s)`);
  }
  if (u.rorSystemer?.poster && u.rorSystemer.poster.length > 0) {
    liste.push(`Rørsystemer registrert (${u.rorSystemer.poster.length} kurser: ${u.rorSystemer.poster.map((p) => p.navn).join(', ')})`);
  }
  if (u.varmeanlegg?.varmekilde) liste.push(`Varmekilde registrert som «${u.varmeanlegg.varmekilde}»`);
  if (u.varmeanlegg?.antallRadiatorer !== undefined) liste.push(`Antall radiatorer satt til ${u.varmeanlegg.antallRadiatorer} stk`);
  if (u.varmeanlegg?.gulvvarmeM2 !== undefined) liste.push(`Gulvvarme satt til ${u.varmeanlegg.gulvvarmeM2} m²`);
  if (u.varmeanlegg?.effektbehovKw !== undefined) liste.push(`Varme effektbehov satt til ${u.varmeanlegg.effektbehovKw} kW`);
  if (u.ventilasjon?.personbelastning !== undefined) liste.push(`Ventilasjon personbelastning satt til ${u.ventilasjon.personbelastning} personer`);
  if (u.ventilasjon?.sfpKrav !== undefined) liste.push(`Ventilasjon SFP-krav satt til ${u.ventilasjon.sfpKrav} kW/(m³/s)`);
  if (u.koter?.gate !== undefined) liste.push(`Terrengkote satt til C +${u.koter.gate} moh`);
  if (u.koter?.itrKum !== undefined) liste.push(`Kote ITK/ITR i kommunal kum satt til C +${u.koter.itrKum} moh`);
  if (u.koter?.ibrKum !== undefined) liste.push(`Kote IBR i kommunal kum satt til C +${u.koter.ibrKum} moh`);
  if (u.koter?.vannledning !== undefined) liste.push(`Kote vannledning satt til C +${u.koter.vannledning} moh`);
  if (u.koter?.stikkLengde !== undefined) liste.push(`Stikkledning lengde satt til ${u.koter.stikkLengde} m`);
  if (u.koter?.fallNevner !== undefined) liste.push(`Fall på stikkledning satt til 1:${u.koter.fallNevner}`);
  if (u.koter?.gulv && u.koter.gulv.length > 0) {
    for (const g of u.koter.gulv) {
      liste.push(`Kote ${g.navn} satt til C +${g.kote} moh`);
    }
  }
  if (u.vanntrykk?.statiskBar !== undefined) liste.push(`Statisk vanntrykk satt til ${u.vanntrykk.statiskBar} bar`);
  if (u.vanntrykk?.dynamiskBar !== undefined) liste.push(`Dynamisk trykk satt til ${u.vanntrykk.dynamiskBar} bar`);
  if (u.vanntrykk?.uttakLmin !== undefined) liste.push(`Uttak Q/p satt til ${u.vanntrykk.uttakLmin} l/min`);
  if (u.belastning?.dusjer !== undefined) liste.push(`Samtidige dusjer satt til ${u.belastning.dusjer} stk`);
  if (u.tekniskRomM2 !== undefined) liste.push(`Teknisk rom satt til ${u.tekniskRomM2} m²`);
  return liste;
}

/**
 * Fletter et UttrekkResultat (fra Gemini Vision, AI-chat eller lokal filanalyse) inn i et ProsjektData-objekt
 * uten å overskrive eksisterende verdier med udefinerte/tomme felt.
 */
export function flettUttrekkInnIProsjekt(
  base: ProsjektData,
  u: UttrekkResultat,
  leggTilOppsummeringINotat = true,
): ProsjektData {
  // Flett gulvkoter slik at ny kote for laveste sluk oppdaterer eksisterende laveste sluk eller legges til
  let nyeGulv = base.koter.gulv;
  if (u.koter?.gulv && u.koter.gulv.length > 0) {
    if (base.koter.gulv.length === 0) {
      nyeGulv = u.koter.gulv;
    } else {
      const kopi = [...base.koter.gulv];
      for (const nyG of u.koter.gulv) {
        const eksIdx = kopi.findIndex(
          (g) =>
            g.navn.toLowerCase() === nyG.navn.toLowerCase() ||
            (/sluk|kjeller|u1/i.test(g.navn) && /sluk|kjeller|u1/i.test(nyG.navn))
        );
        if (eksIdx >= 0) {
          kopi[eksIdx] = { ...kopi[eksIdx], kote: nyG.kote };
        } else {
          kopi.unshift(nyG);
        }
      }
      nyeGulv = kopi;
    }
  }

  const skalOppdatereNavn =
    Boolean(u.navn) &&
    (Boolean(u.eksaktNavnFraTekst) ||
      base.navn === 'Nytt prosjekt' ||
      base.kilde === 'dokument' ||
      base.navn.endsWith('(Kopi)') ||
      !base.navn.trim());

  const nyttNavn = skalOppdatereNavn
    ? u.navn!
    : (base.navn === 'Nytt prosjekt' || !base.navn.trim()) && u.sted
    ? u.sted
    : base.navn;

  const oppdatert: ProsjektData = {
    ...base,
    kilde: 'bruker',
    navn: nyttNavn,
    bygningstype: u.bygningstype || base.bygningstype,
    bra: u.bra !== undefined && Number.isFinite(u.bra) ? u.bra : base.bra,
    etasjer: u.etasjer || base.etasjer,
    sted: u.sted || base.sted,
    matrikkel: u.matrikkel || base.matrikkel,
    vaMyndighet: u.vaMyndighet || base.vaMyndighet,
    byggherre: u.byggherre || base.byggherre,
    miljoambisjon: u.miljoambisjon || base.miljoambisjon,
    klima:
      u.klima || base.klima
        ? {
            dutVinter: u.klima?.dutVinter ?? base.klima?.dutVinter,
            innetemperatur: u.klima?.innetemperatur ?? base.klima?.innetemperatur,
            dutSommer: u.klima?.dutSommer ?? base.klima?.dutSommer,
          }
        : base.klima,
    uVerdier:
      u.uVerdier || base.uVerdier
        ? {
            yttervegg: u.uVerdier?.yttervegg ?? base.uVerdier?.yttervegg,
            tak: u.uVerdier?.tak ?? base.uVerdier?.tak,
            gulv: u.uVerdier?.gulv ?? base.uVerdier?.gulv,
            vinduDor: u.uVerdier?.vinduDor ?? base.uVerdier?.vinduDor,
            n50: u.uVerdier?.n50 ?? base.uVerdier?.n50,
            arealer:
              u.uVerdier?.arealer || base.uVerdier?.arealer
                ? {
                    yttervegg: u.uVerdier?.arealer?.yttervegg ?? base.uVerdier?.arealer?.yttervegg,
                    tak: u.uVerdier?.arealer?.tak ?? base.uVerdier?.arealer?.tak,
                    gulv: u.uVerdier?.arealer?.gulv ?? base.uVerdier?.arealer?.gulv,
                    vinduDor: u.uVerdier?.arealer?.vinduDor ?? base.uVerdier?.arealer?.vinduDor,
                  }
                : undefined,
          }
        : base.uVerdier,
    klimaskjerm: undefined,
    sanitaerUtstyr: u.sanitaerUtstyr ?? base.sanitaerUtstyr,
    rorSystemer: u.rorSystemer ?? base.rorSystemer,
    varmeanlegg:
      u.varmeanlegg || base.varmeanlegg
        ? {
            varmekilde: u.varmeanlegg?.varmekilde ?? base.varmeanlegg?.varmekilde,
            antallRadiatorer: u.varmeanlegg?.antallRadiatorer ?? base.varmeanlegg?.antallRadiatorer,
            gulvvarmeM2: u.varmeanlegg?.gulvvarmeM2 ?? base.varmeanlegg?.gulvvarmeM2,
            turTemperaturC: u.varmeanlegg?.turTemperaturC ?? base.varmeanlegg?.turTemperaturC,
            returTemperaturC: u.varmeanlegg?.returTemperaturC ?? base.varmeanlegg?.returTemperaturC,
            effektbehovKw: u.varmeanlegg?.effektbehovKw ?? base.varmeanlegg?.effektbehovKw,
            systemType: u.varmeanlegg?.systemType ?? base.varmeanlegg?.systemType,
          }
        : base.varmeanlegg,
    ventilasjon:
      u.ventilasjon || base.ventilasjon
        ? {
            personbelastning: u.ventilasjon?.personbelastning ?? base.ventilasjon?.personbelastning,
            sfpKrav: u.ventilasjon?.sfpKrav ?? base.ventilasjon?.sfpKrav,
            luftmengdeM3h: u.ventilasjon?.luftmengdeM3h ?? base.ventilasjon?.luftmengdeM3h,
          }
        : base.ventilasjon,
    transmisjonstapWPerK: u.transmisjonstapWPerK ?? base.transmisjonstapWPerK ?? null,
    koter: {
      gate: u.koter?.gate ?? base.koter.gate,
      ibrKum: u.koter?.ibrKum ?? base.koter.ibrKum,
      itrKum: u.koter?.itrKum ?? base.koter.itrKum,
      vannledning: u.koter?.vannledning ?? base.koter.vannledning,
      stikkLengde: u.koter?.stikkLengde ?? base.koter.stikkLengde,
      fallNevner: u.koter?.fallNevner ?? base.koter.fallNevner,
      gulv: nyeGulv,
    },
    vanntrykk: {
      statiskBar: u.vanntrykk?.statiskBar ?? base.vanntrykk.statiskBar,
      dynamiskBar: u.vanntrykk?.dynamiskBar ?? base.vanntrykk.dynamiskBar,
      uttakLmin: u.vanntrykk?.uttakLmin ?? base.vanntrykk.uttakLmin,
      antatt: u.vanntrykk?.antatt ?? base.vanntrykk.antatt,
    },
    overvann: {
      flater:
        u.overvann?.flater && u.overvann.flater.length > 0
          ? u.overvann.flater
          : base.overvann.flater,
      intensitet: u.overvann?.intensitet ?? base.overvann.intensitet,
      maksPaaslippLs: u.overvann?.maksPaaslippLs ?? base.overvann.maksPaaslippLs,
    },
    belastning: {
      dusjer:
        u.belastning?.dusjer !== undefined && Number.isFinite(u.belastning.dusjer)
          ? u.belastning.dusjer
          : u.sanitaerUtstyr?.dusj?.antall !== undefined && u.sanitaerUtstyr.dusj.antall > 0
          ? u.sanitaerUtstyr.dusj.antall
          : base.belastning.dusjer,
      dusjMinutter: u.belastning?.dusjMinutter ?? base.belastning.dusjMinutter,
      dusjLs: u.belastning?.dusjLs ?? base.belastning.dusjLs,
    },
    tekniskRomM2: u.tekniskRomM2 ?? base.tekniskRomM2,
    feller: [
      ...new Set([...base.feller, ...(u.foreslatteFeller ?? [])]),
    ],
    notater: leggTilOppsummeringINotat
      ? [
          base.notater,
          u.oppsummering,
          u.klima
            ? `Klimadata: DUT ${u.klima.dutVinter ?? '-'} °C, Innetemperatur ${u.klima.innetemperatur ?? '-'} °C${u.klima.dutSommer !== undefined ? `, Sommer ${u.klima.dutSommer} °C` : ''}`
            : '',
          u.uVerdier
            ? `Bygningsfysikk / U-verdier: yttervegg ${u.uVerdier.yttervegg ?? '-'} W/m²K, tak ${u.uVerdier.tak ?? '-'} W/m²K, gulv ${u.uVerdier.gulv ?? '-'} W/m²K, vindu/dør ${u.uVerdier.vinduDor ?? '-'} W/m²K${u.uVerdier.n50 !== undefined ? `, n50 ${u.uVerdier.n50} 1/h` : ''}`
            : '',
          u.transmisjonstapWPerK ? `Transmisjonstap Σ(U·A): ${u.transmisjonstapWPerK} W/K` : '',
          u.sanitaerUtstyr
            ? `Sanitærutstyr: WC ${u.sanitaerUtstyr.wc.antall}, Servant ${u.sanitaerUtstyr.servant.antall}, Urinal ${u.sanitaerUtstyr.urinal.antall}, Dusj ${u.sanitaerUtstyr.dusj.antall}, Kjøkken ${u.sanitaerUtstyr.kjokkenvask.antall}, Oppvask ${u.sanitaerUtstyr.oppvaskmaskin.antall}${u.sanitaerUtstyr.badekar?.antall ? `, Badekar ${u.sanitaerUtstyr.badekar.antall}` : ''}${u.sanitaerUtstyr.vaskemaskin?.antall ? `, Vaskemaskin ${u.sanitaerUtstyr.vaskemaskin.antall}` : ''}${u.sanitaerUtstyr.utslagsvask?.antall ? `, Utslagsvask ${u.sanitaerUtstyr.utslagsvask.antall}` : ''}. Sum q_n = ${u.sanitaerUtstyr.sumQn} l/s, Sum DU = ${u.sanitaerUtstyr.sumDu}, q_s = ${u.sanitaerUtstyr.qsLPrS} l/s`
            : '',
          u.rorSystemer?.poster && u.rorSystemer.poster.length > 0
            ? `Rørsystemer: ${u.rorSystemer.poster.map((p) => `${p.navn}${p.dimensjon ? ` ${p.dimensjon}` : ''}${p.lengdeM ? ` (${p.lengdeM} m${p.materiale ? `, ${p.materiale}` : ''})` : ''}`).join(' · ')}`
            : '',
          u.varmeanlegg
            ? `Varmeanlegg: Varmekilde ${u.varmeanlegg.varmekilde ?? '-'}${u.varmeanlegg.antallRadiatorer !== undefined ? `, Radiatorer ${u.varmeanlegg.antallRadiatorer} stk` : ''}${u.varmeanlegg.gulvvarmeM2 !== undefined ? `, Gulvvarme ${u.varmeanlegg.gulvvarmeM2} m²` : ''}${u.varmeanlegg.turTemperaturC && u.varmeanlegg.returTemperaturC ? `, Tur/retur ${u.varmeanlegg.turTemperaturC}/${u.varmeanlegg.returTemperaturC} °C` : ''}${u.varmeanlegg.effektbehovKw ? `, Effekt ${u.varmeanlegg.effektbehovKw} kW` : ''}`
            : '',
          u.ventilasjon
            ? `Ventilasjon: Personbelastning ${u.ventilasjon.personbelastning ?? '-'} personer, SFP-krav ${u.ventilasjon.sfpKrav ?? '-'} kW/(m³/s)${u.ventilasjon.luftmengdeM3h ? `, Luftmengde ${u.ventilasjon.luftmengdeM3h} m³/h` : ''}`
            : '',
        ]
          .filter(Boolean)
          .join('\n\n')
      : base.notater,
  };

  oppdatert.klimaskjerm = oppdatert.uVerdier;
  return oppdatert;
}
