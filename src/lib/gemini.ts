import type { ProsjektFil, UttrekkResultat } from './filer';
import { rensLatexFormler } from './format';

export interface GeminiVedlegg {
  id?: string;
  navn: string;
  mimeType: string;
  base64Data?: string;
  uttrukketTekst?: string;
}

export interface ChatMelding {
  rolle: 'bruker' | 'agent';
  tekst: string;
  /** Kun i UI: ferdig prompt, feilmelding eller bekreftelse på automatisk prosjektoppdatering. Slike meldinger sendes aldri som vanlig historikk. */
  type?: 'prompt' | 'feil' | 'oppdatering';
  /** Valgfrie multimodale vedlegg (plantegninger, bilder, PDF-er, Excel/Word-uttrekk) */
  vedlegg?: GeminiVedlegg[];
}

export interface GeminiForesporsel {
  url: string;
  init: { method: 'POST'; headers: Record<string, string>; body: string };
}

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

const stotterInlineVision = (mimeType: string): boolean =>
  mimeType.startsWith('image/') ||
  mimeType === 'application/pdf' ||
  mimeType.startsWith('audio/') ||
  mimeType === 'video/mp4' ||
  mimeType === 'video/webm';

type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

function byggPartsForMelding(m: ChatMelding): GeminiPart[] {
  const parts: GeminiPart[] = [];
  if (m.vedlegg && m.vedlegg.length > 0) {
    for (const v of m.vedlegg) {
      if (v.base64Data && stotterInlineVision(v.mimeType)) {
        parts.push({
          inlineData: {
            mimeType: v.mimeType,
            data: v.base64Data,
          },
        });
      }
      if (v.uttrukketTekst && v.uttrukketTekst.trim()) {
        parts.push({
          text: `[VEDLAGT DOKUMENT: ${v.navn}]\n${v.uttrukketTekst.slice(0, 20000)}`,
        });
      }
    }
  }
  parts.push({ text: m.tekst });
  return parts;
}

/**
 * Bygger kallet mot Gemini REST-API (generateContent). Støtter både vanlig tekst
 * og multimodal bilde-/tegning-/PDF-analyse via `inlineData`.
 */
export function byggGeminiForesporsel(
  nokkel: string,
  modell: string,
  systemTekst: string,
  historikk: readonly ChatMelding[],
): GeminiForesporsel {
  return {
    url: `${BASE}/${encodeURIComponent(modell)}:generateContent`,
    init: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': nokkel },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemTekst }] },
        contents: historikk.map((m) => ({
          role: m.rolle === 'bruker' ? 'user' : 'model',
          parts: byggPartsForMelding(m),
        })),
        generationConfig: { temperature: 0.2 },
      }),
    },
  };
}

interface GeminiSvar {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
  error?: { message?: string; code?: number };
}

/** Plukker ut svarteksten, eller kaster en lesbar feil. */
export function lesGeminiSvar(svar: GeminiSvar): string {
  if (svar.error) throw new Error(svar.error.message ?? 'Ukjent feil fra Gemini-API.');
  if (svar.promptFeedback?.blockReason) throw new Error(`Gemini blokkerte forespørselen (${svar.promptFeedback.blockReason}).`);
  const tekst = svar.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  if (!tekst.trim()) throw new Error('Gemini returnerte et tomt svar.');
  return tekst;
}

export async function sendTilGemini(
  opts: { nokkel: string; modell: string; system: string; historikk: readonly ChatMelding[] },
  fetchFn: typeof fetch = fetch,
): Promise<string> {
  if (!opts.nokkel.trim()) throw new Error('Mangler Gemini API-nøkkel. Legg den inn under ⚙️ Innstillinger.');
  const { url, init } = byggGeminiForesporsel(opts.nokkel.trim(), opts.modell, opts.system, opts.historikk);
  let respons: Response;
  try {
    respons = await fetchFn(url, init);
  } catch {
    throw new Error('Fikk ikke kontakt med Gemini (nettverksfeil). Sjekk internettforbindelsen.');
  }
  let data: GeminiSvar;
  try {
    data = (await respons.json()) as GeminiSvar;
  } catch {
    throw new Error(`Uventet svar fra Gemini (HTTP ${respons.status}).`);
  }
  if (!respons.ok && !data.error) throw new Error(`Gemini svarte med HTTP ${respons.status}.`);
  return lesGeminiSvar(data);
}

const VISION_UTTREKK_SYSTEM = `Du er Agent 01 (Prosjekt-Orkestrator), Agent 19 (Utvendig VA) og Agent 16 (QA-Revisor) i VVS KEM PRO.
Analyser vedlagte plantegninger, kommunale VA-kart / situasjonskart, systemskjemaer, bilder av typeskilt (pumper/aggregater) og dokumenter.
SPESIELT VIKTIG FOR VA-KART / SITUASJONSKART: Let nøye etter kotehøyder (NN2000 / moh) ved kummer og ledninger:
- ITK / ITR / OK rør (innvendig topp kum / innvendig topp rør i kommunal kum) -> legges i "koter.itrKum"
- IBR / UK rør / BK (innvendig bunn rør / bunn kum i kommunal kum) -> legges i "koter.ibrKum"
- TK / OK kum / Terreng / Gatelokk (terrengkote / kumlokk) -> legges i "koter.gate"
- VL / Vannledning kote -> legges i "koter.vannledning"
- Laveste sluk / OK FG / Kjeller -> legges i "koter.gulv"
- Gnr/Bnr (gårds- og bruksnummer) -> legges i "matrikkel"
- Gateadresse og kommune -> legges i "sted" og "vaMyndighet"
- BRA / Oppvarmet areal: Hvis dokumentet oppgir "3 × 800 = 2 400 m²", regn ut totalen og sett "bra": 2400 og "etasjer": "3 etasjer"
- U-verdier for bygningskropp (yttervegg, tak, gulv, vinduer) -> legges i "uVerdier"
- Transmisjonsvarmetap Σ(U·A) / H_T [W/K] -> legges i "transmisjonstapWPerK"
VIKTIG (Lov 1): Ikke gjett på tall som ikke finnes i vedleggene! La felt stå som null/utelatt hvis de ikke fremgår.
Returner KUN gyldig JSON (ingen markdown-kodeblokker rundt) med følgende struktur:
{
  "navn": "Prosjektnavn hvis oppgitt",
  "bygningstype": "Næringsbygg / Kontor | Skole / Undervisning | Helsebygg / Sykehjem | Boligblokk / Leiligheter | Enebolig / Småhus | Idrettsbygg / Garderobe | Industri / Verksted",
  "bra": 4500,
  "etasjer": "3 etasjer + kjeller",
  "sted": "Adresse/kommune",
  "matrikkel": "Gnr/Bnr",
  "vaMyndighet": "Kommune VA",
  "byggherre": "Byggherre",
  "uVerdier": { "yttervegg": 0.18, "tak": 0.13, "gulv": 0.10, "vinduDor": 0.80 },
  "transmisjonstapWPerK": 125.5,
  "koter": {
    "gate": 15.4,
    "ibrKum": 13.6,
    "itrKum": 13.9,
    "vannledning": 13.2,
    "stikkLengde": 40,
    "fallNevner": 60,
    "gulv": [{ "navn": "Kjeller U1 (OK FG)", "kote": 13.1 }]
  },
  "vanntrykk": { "statiskBar": 4.5, "dynamiskBar": 3.8, "uttakLmin": 1500, "antatt": false },
  "overvann": {
    "flater": [{ "navn": "Takflate", "areal": 1500, "phi": 0.9 }],
    "intensitet": 280,
    "maksPaaslippLs": 15
  },
  "belastning": { "dusjer": 24, "dusjMinutter": 20, "dusjLs": 0.2 },
  "tekniskRomM2": 28,
  "oppsummering": "Kort faglig oppsummering på norsk av hva som ble funnet i tegningene/bildene/dokumentene",
  "tekniskeFunn": ["Konkret funn 1 (f.eks. pumpeskilt Grundfos Magna3, Q=..., H=...)", "Konkret funn 2"],
  "foreslatteFeller": ["Evt. avdekkede prosjektfeller eller risikoer i tegningen"]
}`;

export function tolkGeminiVisionJson(tekst: string): UttrekkResultat {
  const renset = tekst
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  const start = renset.indexOf('{');
  const slutt = renset.lastIndexOf('}');
  if (start === -1 || slutt === -1 || slutt <= start) {
    return { oppsummering: tekst.trim(), tekniskeFunn: [] };
  }
  try {
    const parsed = JSON.parse(renset.slice(start, slutt + 1)) as UttrekkResultat;
    return {
      ...parsed,
      tekniskeFunn: Array.isArray(parsed.tekniskeFunn) ? parsed.tekniskeFunn : [],
      foreslatteFeller: Array.isArray(parsed.foreslatteFeller) ? parsed.foreslatteFeller : [],
    };
  } catch {
    return { oppsummering: tekst.trim(), tekniskeFunn: [] };
  }
}

/**
 * Kjører multimodal Gemini Vision-analyse på opplastede bilder, plantegninger, PDF-er og dokumenter,
 * og returnerer strukturerte prosjektdata klar til å opprette eller oppdatere et prosjekt.
 */
export async function analyserFilerMedGeminiVision(
  opts: { nokkel: string; modell: string; filer: readonly ProsjektFil[] },
  fetchFn: typeof fetch = fetch,
): Promise<UttrekkResultat> {
  const vedlegg: GeminiVedlegg[] = opts.filer.map((f) => ({
    id: f.id,
    navn: f.navn,
    mimeType: f.mimeType,
    base64Data: f.base64Data,
    uttrukketTekst: f.uttrukketTekst,
  }));

  const svar = await sendTilGemini(
    {
      nokkel: opts.nokkel,
      modell: opts.modell,
      system: VISION_UTTREKK_SYSTEM,
      historikk: [
        {
          rolle: 'bruker',
          tekst: `Analyser disse ${opts.filer.length} vedleggene (${opts.filer.map((f) => f.navn).join(', ')}) og trekk ut alle verifiserbare prosjektdata, koter, rørstrekk, ventilasjonsdata eller typeskilt-verdier som JSON.`,
          vedlegg,
        },
      ],
    },
    fetchFn,
  );

  return tolkGeminiVisionJson(svar);
}

/**
 * Plukker ut en valgfri ```prosjekt_json ... ```-blokk fra et Gemini-chatsvar
 * slik at AI-chatten kan oppdatere prosjektdata automatisk (structured output)
 * samtidig som brukeren kun ser den lesbare fagteksten i meldingsboblen.
 */
export function trekkUtProsjektJsonFraChatSvar(svarTekst: string): {
  visningsTekst: string;
  uttrekk: UttrekkResultat | null;
} {
  const regex = /```(?:prosjekt_json|prosjekt_oppdatering)\s*([\s\S]*?)```/i;
  const match = svarTekst.match(regex);
  if (!match) {
    return { visningsTekst: rensLatexFormler(svarTekst.trim()), uttrekk: null };
  }
  const jsonInnhold = match[1].trim();
  const rensetVisning = rensLatexFormler(svarTekst.replace(regex, '').trim());
  try {
    const parsed = JSON.parse(jsonInnhold) as UttrekkResultat;
    return { visningsTekst: rensetVisning || 'Prosjektdata er tolket og oppdatert.', uttrekk: parsed };
  } catch {
    return { visningsTekst: rensetVisning || rensLatexFormler(svarTekst.trim()), uttrekk: null };
  }
}
