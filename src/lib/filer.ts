import type { ProsjektData } from '../data/prosjekter';

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
 * Lokal tekstuttrekker fra PDF-filer som også dekomprimerer FlateDecode-strømmer
 * via nettleserens innebygde DecompressionStream slik at vanlig PDF-tekst leses direkte.
 */
async function trekkUtLesbarTekstFraPdfBuffer(buffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buffer);
  const rå = new TextDecoder('latin1').decode(bytes);
  const biter: string[] = [];

  // Dekomprimer FlateDecode-strømmer hvis DecompressionStream støttes
  if (typeof DecompressionStream !== 'undefined') {
    const streamRegex = /stream\r?\n/g;
    let sm: RegExpExecArray | null;
    let antallStrommer = 0;
    while ((sm = streamRegex.exec(rå)) !== null && antallStrommer < 45) {
      const start = sm.index + sm[0].length;
      const slutt = rå.indexOf('endstream', start);
      if (slutt <= start) continue;
      let sluttIdx = slutt;
      if (rå[sluttIdx - 1] === '\n') sluttIdx--;
      if (rå[sluttIdx - 1] === '\r') sluttIdx--;
      const lengde = sluttIdx - start;
      if (lengde < 4 || lengde > 500000) continue;

      antallStrommer++;
      const kompBytes = bytes.subarray(start, sluttIdx);
      for (const format of ['deflate', 'deflate-raw'] as const) {
        try {
          const ds = new DecompressionStream(format);
          const writer = ds.writable.getWriter();
          await writer.write(kompBytes);
          await writer.close();
          const utBuf = await new Response(ds.readable).arrayBuffer();
          const tekstStrom = new TextDecoder('latin1').decode(new Uint8Array(utBuf));
          if (tekstStrom.includes('BT') || tekstStrom.includes('Tj') || tekstStrom.includes('TJ')) {
            trekkUtPdfTekstOperatorer(tekstStrom, biter);
          }
          break;
        } catch {
          // Prøv neste format eller hopp over strømmen
        }
      }
      if (biter.length >= 800) break;
    }
  }

  // Suppler alltid med ukomprimerte strenger fra råbufferen
  trekkUtPdfTekstOperatorer(rå, biter);

  return biter.join('\n').slice(0, 20000);
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
  const ren = verdi.replace(/\s+/g, '').replace(',', '.');
  const n = Number(ren);
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
      // Konverter Markdown-tabellrader (| Adresse | Friheim 49 |) til "Adresse: Friheim 49"
      if (trimmet.startsWith('|') && trimmet.endsWith('|')) {
        const celler = trimmet
          .slice(1, -1)
          .split('|')
          .map((c) => c.replace(/\*\*|__|`/g, '').trim())
          .filter(Boolean);
        if (celler.length === 2) {
          return `${celler[0]}: ${celler[1]}`;
        }
        return celler.join(' · ');
      }
      // Fjern Markdown fet/kursiv/kode (**Tekst**, __Tekst__, `Tekst`) og liste-punkter (- / * / •)
      return trimmet
        .replace(/\*\*|__|`/g, '')
        .replace(/^\s*[-*•+]\s+/, '');
    })
    .filter(Boolean)
    .join('\n');
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
 * Deterministisk lokal regex-/NLP-analyse som trekker ut prosjektnavn, adresse, Gnr/Bnr,
 * m², koter (ITK/ITR, IBR, terrengkote, laveste sluk), stikkledning, vanntrykk og dusjer
 * fra både chattemeldinger, VA-kart og dokumenter (Markdown, TXT, PDF, Word, Excel) – selv uten API-nøkkel.
 */
export function analyserTekstLokalt(tekst: string, filNavn = ''): UttrekkResultat {
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

  // 7. BRA / Areal (m²) – støtter både «BRA: 1200 m²», «BRA: 1 200», «BRA 2 450 m²», «Areal = 1200 kvm» og «1200 m2 BRA»
  const braEksplisittMatch =
    renTekst.match(
      /(?:oppvarmet\s+BRA|totalt?\s+areal\s+BRA|totalt?\s+BRA|bruksareal(?:\s*\(BRA\))?|oppvarmet\s+(?:bruks)?areal|\bBRA\b|\bBTA\b|bruttoareal|byggareal|areal(?:et)?|bygget\s+er(?:\s+på)?)\s*(?:\([^)]*\))?\s*(?:er|på|ca\.?|[:=-])*\s*(\d[\d\s]*)(?:\s*(?:m²|m2|kvm|kvadratmeter))?/i
    ) ||
    renTekst.match(/\b(\d{2,6})\s*(?:m²|m2|kvm|kvadratmeter)\s*(?:BRA|BTA|oppvarmet|bruksareal)?/i);
  if (braEksplisittMatch) {
    const b = parseNorskTall(braEksplisittMatch[1]);
    if (b && b >= 15 && b <= 500000) {
      res.bra = b;
      res.tekniskeFunn!.push(`BRA: ${b} m²`);
    }
  }

  // 8. Etasjer
  const etasjerMatch =
    renTekst.match(/(?:antall\s+)?etasjer\s*(?:er|[:=-])\s*([^\n\r|.;]{1,35})/i) ||
    renTekst.match(/\b(\d{1,2}\s*etasjer(?:\s*\+\s*(?:kjeller|underetasje|U1|loft|sokkel))?)/i);
  if (etasjerMatch) {
    res.etasjer = etasjerMatch[1].trim();
    res.tekniskeFunn!.push(`Etasjer: ${res.etasjer}`);
  }

  // 9. Koter (ITK/ITR, IBR, Terreng/Gatelokk, Vannledning, Laveste sluk/Kjeller, 1. etg, Stikkledning og Fall)
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

  if (res.tekniskeFunn!.length > 0) {
    res.oppsummering = lagKortFunnTekst(res);
  } else if (tekst.trim().length > 0) {
    res.oppsummering = `Lest inn tekst${filNavn ? ` fra «${filNavn}»` : ''} (${tekst.length} tegn). Klar for AI-analyse.`;
  } else {
    res.oppsummering = `Fil «${filNavn || 'vedlegg'}» lastet opp og klar for Gemini Vision bilde-/PDF-analyse.`;
  }

  return res;
}

/**
 * Bygger en kort, grønn oppsummeringslinje over gjenkjente verdier
 * (f.eks. «Fant adresse: Friheim 49, BRA: 1200 m² – fylt ut i skjema»).
 */
export function lagKortFunnTekst(u: UttrekkResultat): string {
  const deler: string[] = [];
  if (u.sted) deler.push(`adresse: ${u.sted}`);
  if (u.bra !== undefined) deler.push(`BRA: ${u.bra} m²`);
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
    navn: ai.navn || lokal.navn,
    eksaktNavnFraTekst: Boolean(ai.navn || lokal.eksaktNavnFraTekst),
    bygningstype: ai.bygningstype || lokal.bygningstype,
    bra: ai.bra ?? lokal.bra,
    etasjer: ai.etasjer || lokal.etasjer,
    sted: ai.sted || lokal.sted,
    matrikkel: ai.matrikkel || lokal.matrikkel,
    vaMyndighet: ai.vaMyndighet || lokal.vaMyndighet,
    byggherre: ai.byggherre || lokal.byggherre,
    miljoambisjon: ai.miljoambisjon || lokal.miljoambisjon,
    tekniskRomM2: ai.tekniskRomM2 ?? lokal.tekniskRomM2,
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
    bra: u.bra ?? base.bra,
    etasjer: u.etasjer || base.etasjer,
    sted: u.sted || base.sted,
    matrikkel: u.matrikkel || base.matrikkel,
    vaMyndighet: u.vaMyndighet || base.vaMyndighet,
    byggherre: u.byggherre || base.byggherre,
    miljoambisjon: u.miljoambisjon || base.miljoambisjon,
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
      dusjer: u.belastning?.dusjer ?? base.belastning.dusjer,
      dusjMinutter: u.belastning?.dusjMinutter ?? base.belastning.dusjMinutter,
      dusjLs: u.belastning?.dusjLs ?? base.belastning.dusjLs,
    },
    tekniskRomM2: u.tekniskRomM2 ?? base.tekniskRomM2,
    feller: [
      ...new Set([...base.feller, ...(u.foreslatteFeller ?? [])]),
    ],
    notater: leggTilOppsummeringINotat
      ? [base.notater, u.oppsummering].filter(Boolean).join('\n\n')
      : base.notater,
  };

  return oppdatert;
}
