import { useState, type ReactNode } from 'react';
import Modal from './common/Modal';

interface Props {
  onLukk: () => void;
  onStartVeiviser: () => void;
  onApneInnstillinger: () => void;
}

const Eks = ({ children }: { children: ReactNode }) => (
  <div className="my-2 rounded-lg border border-sky-800/60 bg-sky-950/30 p-3 text-xs text-sky-100">
    <span className="font-bold text-sky-300">Eksempel: </span>
    {children}
  </div>
);

const P = ({ children }: { children: ReactNode }) => <p className="my-2 leading-relaxed">{children}</p>;
const H = ({ children }: { children: ReactNode }) => (
  <h3 className="mt-4 text-sm font-bold text-emerald-400 first:mt-0">{children}</h3>
);

export default function HjelpDialog({ onLukk, onStartVeiviser, onApneInnstillinger }: Props) {
  const [fane, setFane] = useState('start');

  const faner: { id: string; navn: string; innhold: ReactNode }[] = [
    {
      id: 'start',
      navn: '🚀 1. Arbeidsflyt (Steg 1–5)',
      innhold: (
        <>
          <H>Slik bruker du VVS KEM PRO fra A til Å</H>
          <P>
            VVS KEM PRO kombinerer <strong>dokument- og tegningsanalyse (AI Vision)</strong>,{' '}
            <strong>tekniske VVS/VA-kalkulatorer</strong> og <strong>19 spesialist-agenter</strong>.
          </P>
          <ol className="my-3 list-decimal space-y-2 pl-5">
            <li>
              <strong>Steg 1 – Dokumenter, Tegninger &amp; Oppstart (Agent 01):</strong> Dra og slipp PDF-rapporter, Excel-kalkyler, VA-kart, plantegninger eller bilder fra byggeplass/typeskilt rett inn i appen. AI-en og den lokale parseren trekker ut m², koter og trykk automatisk.
            </li>
            <li>
              <strong>Steg 2 – Sanitær, VA &amp; Koter (Agent 19 &amp; 03):</strong> Sjekk 950 mm tilbakeslagsregelen (Lov 2) mot kommunal ITR, og regn ut trykkfall, spillvann, overvann og beredervolum.
            </li>
            <li>
              <strong>Steg 3 – Varme, Kjøling &amp; Ventilasjon (Agent 04, 06, 17, 18):</strong> Kontroller varmesentralareal mot TEK17 § 14-4(2), utred 3 alternativer og dimensjoner varme/luft/kjøling.
            </li>
            <li>
              <strong>Steg 4 – Brann, ITB &amp; Energi (Agent 05, 08, 09, 12, 13):</strong> Kontroller sprinklertrykk (Q/p), branntromler (TEK17 § 11-16), ITB-grensesnitt og 25-års LCC.
            </li>
            <li>
              <strong>Steg 5 – Kvalitetssikring (Agent 16) &amp; Rapport:</strong> Reversert formelsjekk, Sanity Check, 6-punkts signatursjekkliste og ferdig nedlastbar rapport.
            </li>
          </ol>
          <button
            type="button"
            onClick={onStartVeiviser}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500"
          >
            🚀 Åpne 5-stegs Prosjektveiviseren nå
          </button>
        </>
      ),
    },
    {
      id: 'vision',
      navn: '📂 2. Tegninger & AI Vision',
      innhold: (
        <>
          <H>Dra og slipp dokumenter, plantegninger og bilder</H>
          <P>
            Du finner opplastingsfeltet <strong>«📂 Dra og slipp filer her»</strong> på dashbordet, i Steg 1 i veiviseren, i prosjektvelgeren (Ny/Rediger) og inne i AI-chatten.
          </P>
          <ul className="my-2 list-disc space-y-1.5 pl-5">
            <li>
              <strong>Dokumenter &amp; kalkyler:</strong> PDF, Excel (<code>.xlsx</code>/<code>.csv</code>), Word (<code>.docx</code>) og tekstfiler leses lokalt og analyseres for prosjektnavn, BRA, koter og vanntrykk.
            </li>
            <li>
              <strong>Tegninger &amp; bilder (PNG, JPG, WEBP, PDF):</strong> Plantegninger, systemskjemaer, VA-kart og bilder av <strong>typeskilt på pumper eller ventilasjonsaggregater</strong> analyseres multimodalt med <strong>Gemini Vision API</strong>.
            </li>
            <li>
              <strong>🖼️ Prosjektgalleri &amp; Dokumentarkiv:</strong> Alle opplastede filer vises med miniatyrbilde, PDF-forhåndsvisning, uttrukket tekst og tekniske funn. Klikk <strong>«💬 Analyser i AI-chat»</strong> på et hvilket som helst bilde for å spørre en agent direkte om tegningen!
            </li>
          </ul>
          <Eks>
            Ta bilde av typeskiltet på en sirkulasjonspumpe i teknisk rom, slipp bildet inn i chatten til Agent 04 og spør: «Les av dette pumpeskiltet og sjekk om pumpen dekker 215 kW ved ΔT = 10 K».
          </Eks>
        </>
      ),
    },
    {
      id: 'lagring',
      navn: '💾 3. Lagring & Backup (.json)',
      innhold: (
        <>
          <H>Permanent lagring med IndexedDB</H>
          <P>
            Appen bruker nettleserens <strong>IndexedDB</strong> (<code>vvs-kem-pro-idb</code>) kombinert med <code>localStorage</code>. Det betyr at både prosjektdata, sjekklister, hele chathistorikken per prosjekt og store bildefiler/tegninger/PDF-er lagres lokalt uten 5 MB-begrensningen i vanlig localStorage.
          </P>
          <H>Eksport og Import av Prosjekt (.json)</H>
          <P>
            Øverst i prosjektlinjen finner du knappene <strong>«📤 Eksporter (.json)»</strong> og <strong>«📥 Importer (.json)»</strong>:
          </P>
          <ul className="my-2 list-disc space-y-1.5 pl-5">
            <li>
              <strong>📤 Eksporter (.json):</strong> Laster ned en komplett sikkerhetskopi av det aktive prosjektet – inkludert alle koter, avkryssede sjekklister, chathistorikk og opplastede tegninger/bilder.
            </li>
            <li>
              <strong>📥 Importer (.json):</strong> Leser inn en tidligere eksportert <code>.json</code>-fil slik at du kan flytte prosjekter mellom PC-er eller dele med kolleger.
            </li>
          </ul>
        </>
      ),
    },
    {
      id: 'chat',
      navn: '💬 4. Multimodal AI-chat',
      innhold: (
        <>
          <H>AI-chat som husker samtalen per prosjekt</H>
          <P>
            Du kan åpne AI-chatten fra <strong>🌟 Hovedchat (Tverrfaglig Prosjekt-AI)</strong> eller direkte på hver av de <strong>19 spesialist-agentene (Agent 01–19)</strong>. Hvert prosjekt har sin egen lagrede samtalelog.
          </P>
          <ol className="my-2 list-decimal space-y-1.5 pl-5">
            <li>
              <strong>Med Gemini API-nøkkel (⚙️ Innstillinger):</strong> Agenten svarer direkte i chatten og ser både prosjektets tall, kalkulatorverdier og vedlagte bilder/tegninger/PDF-er.
            </li>
            <li>
              <strong>Uten nøkkel («📋 Lag Super-Prompt»):</strong> Genererer en 1-klikks ferdig utfylt prompt med alle tall og dokumentutdrag fra prosjektet.
            </li>
          </ol>
          <button
            type="button"
            onClick={onApneInnstillinger}
            className="mt-2 rounded-lg border border-slate-600 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-800"
          >
            ⚙️ Legg inn Gemini API-nøkkel i Innstillinger
          </button>
        </>
      ),
    },
    {
      id: 'lover',
      navn: '⚖️ 5. De 3 Systemlovene',
      innhold: (
        <>
          <H>De 3 Globale Systemlovene i toppbjelken</H>
          <ul className="my-2 list-disc space-y-1.5 pl-5">
            <li>
              <strong>Lov 1 – ⚠️ HINT (100 % sikkerhet):</strong> Appen gjetter aldri på manglende tall (som ITR i kum eller Q/p-trykk). Tomme felt flagges som ⚠️ HINT.
            </li>
            <li>
              <strong>Lov 2 – 950 mm Tilbakeslag:</strong> Laveste sluk/gulv minus ITR i kommunal kum må være minst 0,95 m (systemmanualen) eller 0,90 m (TEK17 § 15-6(3)/§ 15-8(3)). Rød alarm krever avløpspumpestasjon (NS-EN 12050).
            </li>
            <li>
              <strong>Lov 3 – Bransjeutstyr &amp; Agent 16 QA:</strong> Alle tall etterprøves baklengs i Agent 16 QA-porten før signering.
            </li>
          </ul>
          <Eks>
            På Forus Teknologipark ligger kjellergulv på C +13,10 og kommunal ITR på C +13,90 → margin −800 mm (RØD ALARM: pumpekrav). 1. etasje (+15,50) har +1 600 mm margin og kan gå på selvfall.
          </Eks>
        </>
      ),
    },
  ];

  const aktiv = faner.find((f) => f.id === fane) ?? faner[0];

  return (
    <Modal tittel="❓ Slik bruker du appen (Brukerveiledning)" onLukk={onLukk} bredde="max-w-4xl">
      <div className="flex flex-col gap-4 sm:flex-row">
        <nav
          className="flex shrink-0 flex-row gap-1 overflow-x-auto sm:w-56 sm:flex-col"
          aria-label="Hjelpeemner"
        >
          {faner.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFane(f.id)}
              aria-current={f.id === fane ? 'page' : undefined}
              className={`inline-flex min-h-[44px] items-center whitespace-nowrap rounded-lg px-3 py-2 text-left text-xs font-semibold transition ${
                f.id === fane
                  ? 'bg-emerald-950 text-emerald-300'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {f.navn}
            </button>
          ))}
        </nav>
        <div className="min-w-0 flex-1 text-sm text-slate-300">{aktiv.innhold}</div>
      </div>
    </Modal>
  );
}
