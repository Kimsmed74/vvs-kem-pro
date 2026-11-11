import { useEffect, useRef, useState } from 'react';
import { AGENTER } from '../agents/agentData';
import type { ProsjektData } from '../data/prosjekter';
import { analyserProsjekt, type ProsjektAnalyse } from '../lib/analyse';
import {
  FIL_KATEGORI_ETIKETTER,
  analyserTekstLokalt,
  beskrivUttrekkEndringer,
  flettUttrekkInnIProsjekt,
  harUttrekkData,
  lesOgAnalyserFilLokalt,
  type ProsjektFil,
} from '../lib/filer';
import { kopierTilUtklippstavle, rensLatexFormler } from '../lib/format';
import {
  anvendOverstyringMedEstimat,
  evaluerGatekeeper,
  lagKommuneForesporselEpost,
} from '../lib/gatekeeper';
import {
  sendTilGemini,
  trekkUtProsjektJsonFraChatSvar,
  type ChatMelding,
  type GeminiVedlegg,
} from '../lib/gemini';
import {
  flettKartverketInnIProsjekt,
  slaaOppAdresseOgKoteIKartverket,
} from '../lib/kartverket';
import type { Innstillinger, OverstyringInfo } from '../lib/lagring';
import { agentSystemInstruksjon, lagSuperPrompt } from '../lib/prompt';
import { useBekreftSlett } from './common/BekreftSlettModal';

interface Props {
  agentId: string;
  onByttAgent: (id: string) => void;
  prosjekt: ProsjektData;
  analyse: ProsjektAnalyse;
  prosjektFiler: readonly ProsjektFil[];
  overstyringer?: Record<string, OverstyringInfo>;
  qaFullfort?: number;
  forhandsvalgtFilId?: string | null;
  forhandsvalgtSporsmal?: string | null;
  onNullstillForhandsvalg?: () => void;
  onFilerLastetOpp: (nye: ProsjektFil[]) => void;
  onOppdaterProsjekt: (oppdatert: ProsjektData, endringer?: string[]) => void;
  onOppdaterProsjektOgOverstyringer?: (
    oppdatertProsjekt: ProsjektData,
    nyeOverstyringer: Record<string, OverstyringInfo>,
    endringer: string[]
  ) => void;
  innstillinger: Innstillinger;
  samtaler: Record<string, ChatMelding[]>;
  onSamtaler: (
    fn: (forrige: Record<string, ChatMelding[]>) => Record<string, ChatMelding[]>
  ) => void;
  onRedigerProsjekt: () => void;
  onApneInnstillinger: () => void;
  onLukk: () => void;
  melding: (tekst: string) => void;
}

const FORSLAG_VANLIG = [
  'Adressen er Kongsgata 10, 4005 Stavanger og laveste sluk er kote 12.5',
  'Hvem i kommunen skal jeg kontakte for manglende koter/trykk, og hva skal jeg spørre etter?',
  'Hva mangler for 100 % sikkerhet (Lov 1) i dette prosjektet?',
  'Gå gjennom alarmene og foreslå tiltak.',
];

const FORSLAG_MED_FIL = [
  'Les av kumhøyder (ITK / IBR / OK / UK) fra dette VA-kartet og oppdater prosjektet.',
  'Analyser denne plantegningen for sanitær, sluk og koter.',
  'Les av dette pumpeskiltet / aggregatskiltet og sjekk kapasiteten.',
];

function lagLokalAgentOppsummering(
  prosjekt: ProsjektData,
  analyse: ProsjektAnalyse,
  endringer: string[],
  agentNavn: string,
  overstyringer: Record<string, OverstyringInfo> = {},
  qaFullfort = 0
): string {
  const linjer: string[] = [];
  if (endringer.length > 0) {
    linjer.push(
      `Jeg har tolket meldingen din og oppdatert prosjektet **«${prosjekt.navn}»** direkte i databasen (IndexedDB).`
    );
  } else {
    linjer.push(`Statusgjennomgang fra **${agentNavn}** for **«${prosjekt.navn}»**:`);
  }

  // Lov 2 status
  if (analyse.lov2Status === 'brudd') {
    const verste = [...analyse.gulvKontroller].sort((a, b) => a.margin - b.margin)[0];
    linjer.push(
      `\n🚨 **LOV 2 ALARM (Tilbakeslagskontroll):** Laveste sluk **${verste.navn}** (C +${verste.kote.toFixed(2)}) har margin **${(verste.margin * 1000).toFixed(0)} mm** mot kommunal ITK/ITR (C +${prosjekt.koter.itrKum?.toFixed(2)}). Kravet er +${(analyse.krav * 1000).toFixed(0)} mm (mangler ${(verste.mangel * 1000).toFixed(0)} mm) → **PUMPESTASJON KREVES** for kjeller/underetasje, mens overliggende etasjer føres på separat selvfallsledning.`
    );
  } else if (analyse.lov2Status === 'ok') {
    const laveste = [...analyse.gulvKontroller].sort((a, b) => a.margin - b.margin)[0];
    linjer.push(
      `\n✅ **LOV 2 OK (Tilbakeslagskontroll):** Laveste sluk (${laveste.navn}, C +${laveste.kote.toFixed(2)}) ligger **+${(laveste.margin * 1000).toFixed(0)} mm** over ITK/ITR i kum (C +${prosjekt.koter.itrKum?.toFixed(2)}) og oppfyller kravet på +${(analyse.krav * 1000).toFixed(0)} mm.`
    );
  } else {
    const manglerKoter: string[] = [];
    if (prosjekt.koter.itrKum === null) manglerKoter.push('Kote ITK/ITR i kommunal kum');
    if (prosjekt.koter.gulv.length === 0) manglerKoter.push('Kote laveste sluk (OK FG)');
    linjer.push(
      `\n⚠️ **Lov 2 (Tilbakeslagskontroll):** Kan ikke ferdigberegnes ennå – mangler: **${manglerKoter.join(' og ')}**. Skriv f.eks. *«ITK i kum er kote 13.9 og laveste sluk er kote 12.5»* her i chatten, eller lim inn (Ctrl+V) et utklipp av kommunalt VA-kart!`
    );
  }

  // Kartverket / Adresse info
  if (prosjekt.sted) {
    linjer.push(
      `\n📍 **Lokasjon & Kartverket:** ${prosjekt.sted}${prosjekt.matrikkel ? ` · Matrikkel: **${prosjekt.matrikkel}**` : ''}${prosjekt.vaMyndighet ? ` · VA-myndighet: **${prosjekt.vaMyndighet}**` : ''}${prosjekt.koter.gate !== null ? ` · Terrengkote: **C +${prosjekt.koter.gate.toFixed(2)} moh (NN2000)**` : ''}.`
    );
  }

  // Gatekeeper & AI-Kommunikasjonsassistent
  const gk = evaluerGatekeeper(prosjekt, analyse, overstyringer, qaFullfort);
  const manglerPunkter = [...gk.kritiskeMangler, ...gk.advarsler].filter(
    (p) => p.id !== 'qa_signatur'
  );

  if (gk.overstyrteEstimater.length > 0) {
    linjer.push(
      `\n🟡 **Midlertidige estimater aktivert (${gk.overstyrteEstimater.length} stk – venter på kommunen):**\n` +
        gk.overstyrteEstimater.map((p) => `• ${p.tittel}: ${p.detalj}`).join('\n')
    );
  }

  if (manglerPunkter.length > 0) {
    linjer.push(
      `\n📞 **AI-Kommunikasjonsassistent – Veileder for innhenting av manglende data (${gk.kommuneNavn}):**\n` +
        `• **Hvem du skal kontakte:** ${gk.vaEtatNavn} (samt ${gk.geodataAvdelingNavn} for basiskart).\n` +
        `• **Hva du skal spørre etter:**\n` +
        manglerPunkter
          .map(
            (p) =>
              `  - ${p.alvor === 'kritisk' ? '🛑 [KRAV]' : '⚠️ [ANBEFALT]'} **${p.tittel}:** ${p.veileder.hvaSporreEtter}`
          )
          .join('\n') +
        `\n\n💡 *Tips: Klikk **«📧 Kopier forespørsel til kommune»** rett under chatten for ferdig e-postmal, eller klikk **«⚠️ Gå videre med estimat»** for å sette midlertidige verdier slik at du kan regne videre uten stopp!*`
    );
  } else {
    linjer.push(`\n✅ **Lov 1 & Gatekeeper:** Alle påkrevde grunndata er registrert på prosjektet!`);
  }

  return linjer.join('\n');
}

export default function AgentChat({
  agentId,
  onByttAgent,
  prosjekt,
  analyse,
  prosjektFiler,
  overstyringer = {},
  qaFullfort = 0,
  forhandsvalgtFilId,
  forhandsvalgtSporsmal,
  onNullstillForhandsvalg,
  onFilerLastetOpp,
  onOppdaterProsjekt,
  onOppdaterProsjektOgOverstyringer,
  innstillinger,
  samtaler,
  onSamtaler,
  onRedigerProsjekt,
  onApneInnstillinger,
  onLukk,
  melding,
}: Props) {
  const erHovedchat = agentId === 'hovedchat';
  const agent = erHovedchat ? null : AGENTER.find((a) => a.id === agentId) ?? AGENTER[0];
  const aktivNokkel = erHovedchat ? 'hovedchat' : agent!.id;
  const historikk = samtaler[aktivNokkel] ?? [];

  const [tekst, setTekst] = useState('');
  const [valgteFilIder, setValgteFilIder] = useState<string[]>([]);
  const [sender, setSender] = useState(false);
  const [drarFilOver, setDrarFilOver] = useState(false);

  const bunn = useRef<HTMLDivElement>(null);
  const filInputRef = useRef<HTMLInputElement>(null);
  const kameraInputRef = useRef<HTMLInputElement>(null);
  const bekreftSlett = useBekreftSlett();
  const harNokkel = innstillinger.geminiNokkel.trim() !== '';

  // Håndter forhåndsvalgt fil/spørsmål fra Prosjektgalleri
  useEffect(() => {
    if (forhandsvalgtFilId) {
      setValgteFilIder((prev) =>
        prev.includes(forhandsvalgtFilId) ? prev : [...prev, forhandsvalgtFilId]
      );
    }
    if (forhandsvalgtSporsmal) {
      setTekst(forhandsvalgtSporsmal);
    }
    if ((forhandsvalgtFilId || forhandsvalgtSporsmal) && onNullstillForhandsvalg) {
      onNullstillForhandsvalg();
    }
  }, [forhandsvalgtFilId, forhandsvalgtSporsmal, onNullstillForhandsvalg]);

  useEffect(() => {
    bunn.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [historikk.length, sender]);

  const leggTil = (id: string, m: ChatMelding) =>
    onSamtaler((s) => ({ ...s, [id]: [...(s[id] ?? []), m] }));

  const toggleValgtFil = (filId: string) => {
    setValgteFilIder((prev) =>
      prev.includes(filId) ? prev.filter((x) => x !== filId) : [...prev, filId]
    );
  };

  const lastOppFilFraChat = async (fileList: FileList | File[]) => {
    const arr = Array.from(fileList);
    if (arr.length === 0) return;
    const nye: ProsjektFil[] = [];
    for (const f of arr) {
      const pf = await lesOgAnalyserFilLokalt(f, prosjekt.id);
      nye.push(pf);
    }
    onFilerLastetOpp(nye);
    setValgteFilIder((prev) => [...new Set([...prev, ...nye.map((n) => n.id)])]);
    melding(
      `📎 La ved ${nye.length} fil${nye.length === 1 ? '' : 'er'} (VA-kart/tegning/bilde) i samtalen!`
    );
  };

  const valgteFiler = prosjektFiler.filter((f) => valgteFilIder.includes(f.id));

  const send = async (spm?: string) => {
    const råSporsmal = (spm ?? tekst).trim();
    const sporsmal =
      råSporsmal ||
      (valgteFiler.length > 0
        ? 'Analyser vedlagt VA-kart / tegning og oppdater prosjektdataene (koter, ITK, IBR, adresse, BRA).'
        : '');
    if (!sporsmal || sender) return;
    const id = aktivNokkel;

    const vedlegg: GeminiVedlegg[] = valgteFiler.map((f) => ({
      id: f.id,
      navn: f.navn,
      mimeType: f.mimeType,
      base64Data: f.base64Data,
      uttrukketTekst: f.uttrukketTekst,
    }));

    const ny: ChatMelding = {
      rolle: 'bruker',
      tekst: sporsmal,
      ...(vedlegg.length > 0 ? { vedlegg } : {}),
    };
    const medNy = [...historikk, ny];
    leggTil(id, ny);
    setTekst('');
    setSender(true);

    try {
      // 1. Lokal NLP/Regex-parsing av chattemeldingen + eventuell uttrukket tekst fra vedlagte filer
      const vedleggTekst = valgteFiler
        .map((f) => f.uttrukketTekst)
        .filter(Boolean)
        .join('\n\n');
      const samletTekstForParser = [sporsmal, vedleggTekst].filter(Boolean).join('\n\n');
      const lokaltUttrekk = analyserTekstLokalt(
        samletTekstForParser,
        valgteFiler[0]?.navn ?? ''
      );

      let oppdatertProsjekt: ProsjektData = { ...prosjekt, kilde: 'bruker' };
      const alleEndringer: string[] = [];

      if (harUttrekkData(lokaltUttrekk)) {
        const lokaleEndringer = beskrivUttrekkEndringer(lokaltUttrekk);
        oppdatertProsjekt = flettUttrekkInnIProsjekt(oppdatertProsjekt, lokaltUttrekk, false);
        alleEndringer.push(...lokaleEndringer);
      }

      // 2. Automatisk oppslag mot Kartverkets åpne API hvis brukeren oppga en adresse (eller ba om Kartverket-søk)
      const berOmKartverket =
        /kartverk|geonorge|gnr|bnr|gårdsnummer|terrengkote/i.test(sporsmal) &&
        Boolean(oppdatertProsjekt.sted);
      const adresseForOppslag =
        lokaltUttrekk.sted ?? (berOmKartverket ? oppdatertProsjekt.sted : null);

      let kartverketSjekketAdresse: string | null = null;
      if (adresseForOppslag && adresseForOppslag.trim().length >= 3) {
        kartverketSjekketAdresse = adresseForOppslag.trim();
        try {
          const kv = await slaaOppAdresseOgKoteIKartverket(kartverketSjekketAdresse);
          if (kv) {
            const flettetKv = flettKartverketInnIProsjekt(oppdatertProsjekt, kv);
            oppdatertProsjekt = flettetKv.prosjekt;
            // Unngå duplikat adresse-linje hvis lokaltUttrekk allerede meldte adresse
            for (const endring of flettetKv.endringer) {
              if (!alleEndringer.some((e) => e.startsWith('Adresse satt til') && endring.startsWith('Adresse satt til'))) {
                alleEndringer.push(endring);
              } else if (endring.startsWith('Adresse satt til')) {
                const idx = alleEndringer.findIndex((e) => e.startsWith('Adresse satt til'));
                if (idx >= 0) alleEndringer[idx] = endring;
              }
            }
          }
        } catch {
          // Stille fallback hvis offline eller Kartverket ikke svarer
        }
      }

      // Oppdater prosjektet umiddelbart hvis lokal parser + Kartverket fant data
      if (alleEndringer.length > 0) {
        onOppdaterProsjekt(oppdatertProsjekt, alleEndringer);
        leggTil(id, {
          rolle: 'agent',
          type: 'oppdatering',
          tekst:
            `✅ Oppdaterte prosjektet «${oppdatertProsjekt.navn}»:\n` +
            alleEndringer.map((e) => `• ${e}`).join('\n'),
        });
      }

      // 3. Hvis Gemini API-nøkkel er satt: Send til Gemini (med ferdig oppdatert prosjektkontekst + bildevedlegg)
      if (harNokkel) {
        const oppdatertAnalyse = analyserProsjekt(oppdatertProsjekt, analyse.krav);
        const råSvar = await sendTilGemini({
          nokkel: innstillinger.geminiNokkel,
          modell: innstillinger.modell,
          system: agentSystemInstruksjon(
            agent,
            oppdatertProsjekt,
            oppdatertAnalyse,
            prosjektFiler
          ),
          historikk: medNy.filter((m) => !m.type),
        });

        const { visningsTekst: rensetTekst, uttrekk: aiUttrekk } =
          trekkUtProsjektJsonFraChatSvar(råSvar);

        if (aiUttrekk && harUttrekkData(aiUttrekk)) {
          const aiEndringer: string[] = [];
          const forSteg = oppdatertProsjekt;
          oppdatertProsjekt = flettUttrekkInnIProsjekt(oppdatertProsjekt, aiUttrekk, false);

          // Sjekk hvilke nye felt Gemini Vision / AI fant utover lokal parser
          for (const beskrivelse of beskrivUttrekkEndringer(aiUttrekk)) {
            if (!alleEndringer.includes(beskrivelse)) {
              aiEndringer.push(beskrivelse);
            }
          }

          // Hvis AI fant en adresse som ikke ble slått opp i Kartverket ennå, slå opp nå
          if (
            aiUttrekk.sted &&
            aiUttrekk.sted.trim() !== kartverketSjekketAdresse &&
            aiUttrekk.sted.trim().length >= 3
          ) {
            try {
              const kv = await slaaOppAdresseOgKoteIKartverket(aiUttrekk.sted);
              if (kv) {
                const flettetKv = flettKartverketInnIProsjekt(oppdatertProsjekt, kv);
                oppdatertProsjekt = flettetKv.prosjekt;
                for (const e of flettetKv.endringer) {
                  if (!alleEndringer.includes(e) && !aiEndringer.includes(e)) {
                    aiEndringer.push(e);
                  }
                }
              }
            } catch {
              // Stille fallback
            }
          }

          if (aiEndringer.length > 0 && JSON.stringify(forSteg) !== JSON.stringify(oppdatertProsjekt)) {
            onOppdaterProsjekt(oppdatertProsjekt, aiEndringer);
            leggTil(id, {
              rolle: 'agent',
              type: 'oppdatering',
              tekst:
                `✅ AI oppdaterte prosjektet «${oppdatertProsjekt.navn}»:\n` +
                aiEndringer.map((e) => `• ${e}`).join('\n'),
            });
          }
        }

        leggTil(id, {
          rolle: 'agent',
          tekst: rensetTekst || 'Prosjektdataene er oppdatert.',
        });
      } else {
        // 4. Uten Gemini API-nøkkel: Gi et faglig svar basert på den lokale tekstparseren, Kartverket-oppslaget og Lov 1/2-motoren
        const nyAnalyse = analyserProsjekt(oppdatertProsjekt, analyse.krav);
        const agentTittel = agent
          ? `Agent ${String(agent.nummer).padStart(2, '0')} – ${agent.navn}`
          : 'Prosjekt-AI (Kommandosentral)';
        const lokalRespons = lagLokalAgentOppsummering(
          oppdatertProsjekt,
          nyAnalyse,
          alleEndringer,
          agentTittel,
          overstyringer,
          qaFullfort
        );
        leggTil(id, {
          rolle: 'agent',
          tekst: lokalRespons,
        });
      }
    } catch (e) {
      leggTil(id, {
        rolle: 'agent',
        tekst: e instanceof Error ? e.message : 'Ukjent feil.',
        type: 'feil',
      });
    } finally {
      setSender(false);
    }
  };

  const lagPrompt = async () => {
    const valgtAgent = agent ?? AGENTER[0];
    const prompt = lagSuperPrompt(
      valgtAgent,
      prosjekt,
      analyse,
      tekst,
      valgteFiler.length > 0 ? valgteFiler : prosjektFiler
    );
    const ok = await kopierTilUtklippstavle(prompt);
    leggTil(aktivNokkel, { rolle: 'agent', tekst: prompt, type: 'prompt' });
    melding(
      ok
        ? '📋 Super-Prompt kopiert til utklippstavlen'
        : 'Kunne ikke kopiere automatisk – merk teksten i chatten og kopier manuelt'
    );
  };

  const gkRapport = evaluerGatekeeper(prosjekt, analyse, overstyringer, qaFullfort);
  const antallKommuneMangler = [...gkRapport.kritiskeMangler, ...gkRapport.advarsler].filter(
    (p) => p.id !== 'qa_signatur'
  ).length;

  const kopierKommuneForesporselFraChat = async (
    utkastFane: 'va_etat' | 'geodata' | 'arkitekt_internt' | 'alle' = 'va_etat'
  ) => {
    const epost = lagKommuneForesporselEpost(prosjekt, gkRapport, undefined, analyse);
    const mk = epost.mottakerKontroll;

    let kopiertTekst = epost.epostTekst;
    let tittel = `🚰 Forespørsel til ${gkRapport.vaEtatNavn}`;
    if (utkastFane === 'geodata') {
      kopiertTekst = mk.utkast.byggherre.epostTekst;
      tittel = `💼 Orientering til Byggherre (Økonomi & Risiko)`;
    } else if (utkastFane === 'arkitekt_internt') {
      kopiertTekst = mk.utkast.prosjektgruppe.epostTekst;
      tittel = `📐 Internt notat til Prosjektgruppe (ARK / RIBr / RIAku)`;
    } else if (utkastFane === 'alle') {
      kopiertTekst = mk.alleUtkast
        .flatMap((u, idx) => [
          ...(idx > 0 ? [''] : []),
          '====================================================================',
          u.tittel.toUpperCase(),
          '====================================================================',
          u.epostTekst,
        ])
        .join('\n');
      tittel = '📑 Alle 3 oppdelte utkast (Kommune, Prosjektgruppe og Byggherre)';
    }

    const ok = await kopierTilUtklippstavle(kopiertTekst);

    const filterInfo =
      mk.filtrertBortFraOffentlig.length > 0
        ? `🛡️ **Mottaker-kontroll (Forvaltningsfilter aktivt):**\n` +
          `Følgende ${mk.filtrertBortFraOffentlig.length} interne punkter ble automatisk skjermet fra offentlige brev og overført til Utkast 3 (Arkitekt):\n` +
          mk.filtrertBortFraOffentlig
            .map((f) => `• ❌ *${f.tittel}*: ${f.begrunnelse}`)
            .join('\n') +
          `\n\n`
        : `🛡️ **Mottaker-kontroll:** Ingen interne punkter funnet – offentlig brev er rent.\n\n`;

    leggTil(aktivNokkel, {
      rolle: 'agent',
      tekst:
        `📧 **${tittel} (kopiert til utklippstavlen):**\n\n` +
        filterInfo +
        `**3 oppdelte utkast er klare i systemet:**\n` +
        mk.alleUtkast
          .map((u, idx) => `${idx + 1}. **${u.kortTittel}:** ${u.mottaker}`)
          .join('\n') +
        `\n\n` +
        `---\n${kopiertTekst}\n---\n\n` +
        `${epost.telefonSjekkliste}`,
    });
    melding(
      ok
        ? `📧 ${tittel} kopiert til utklippstavlen!`
        : 'Kunne ikke kopiere automatisk – e-postmalen er lagt inn i chatten'
    );
  };

  const overstyrManglerFraChat = () => {
    if (!onOppdaterProsjektOgOverstyringer) return;
    const manglerIder = [...gkRapport.kritiskeMangler, ...gkRapport.advarsler]
      .filter((p) => p.id !== 'qa_signatur')
      .map((p) => p.id);
    if (manglerIder.length === 0) return;
    const res = anvendOverstyringMedEstimat(prosjekt, overstyringer, manglerIder);
    onOppdaterProsjektOgOverstyringer(
      res.prosjekt,
      res.overstyringer,
      res.endringer
    );
    leggTil(aktivNokkel, {
      rolle: 'agent',
      type: 'oppdatering',
      tekst:
        `🟡 **Midlertidige estimater aktivert (Venter på ${gkRapport.kommuneNavn}):**\n` +
        res.endringer.map((e) => `• ${e}`).join('\n') +
        `\n\nDu kan nå jobbe videre med alle kalkulatorer og steg uten at prosessen stoppes.`,
    });
  };

  const forslagListe = valgteFiler.length > 0 ? FORSLAG_MED_FIL : FORSLAG_VANLIG;

  return (
    <aside
      role="complementary"
      aria-label="AI-chat"
      onDragOver={(e) => {
        e.preventDefault();
        setDrarFilOver(true);
      }}
      onDragLeave={() => setDrarFilOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrarFilOver(false);
        if (e.dataTransfer?.files?.length) {
          void lastOppFilFraChat(e.dataTransfer.files);
        }
      }}
      onPaste={(e) => {
        const files = e.clipboardData?.files;
        if (files && files.length > 0) {
          e.preventDefault();
          void lastOppFilFraChat(files);
        }
      }}
      className={`fixed inset-y-0 right-0 z-40 flex w-full flex-col border-l bg-slate-950 shadow-2xl sm:w-[32rem] ${
        drarFilOver ? 'border-emerald-400 ring-2 ring-emerald-500' : 'border-slate-700'
      }`}
    >
      {/* Toppseksjon */}
      <div className="border-b border-slate-800 p-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-slate-100">
            💬 Multimodal AI-chat & Live Prosjektsynk
          </h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onApneInnstillinger}
              title="Innstillinger for Gemini API-nøkkel"
              className="min-h-[44px] rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              ⚙️ API
            </button>
            <button
              type="button"
              onClick={onLukk}
              aria-label="Lukk chat"
              className="min-h-[44px] min-w-[44px] rounded-lg px-2.5 py-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>

        <select
          aria-label="Velg agent"
          value={aktivNokkel}
          onChange={(e) => onByttAgent(e.target.value)}
          className="mt-2 min-h-[44px] w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-100 outline-none focus:border-emerald-500"
        >
          <option value="hovedchat">
            🌟 Hovedchat – Tverrfaglig Prosjekt-AI (Alle 19 fag)
          </option>
          {AGENTER.map((a) => (
            <option key={a.id} value={a.id}>
              Agent {String(a.nummer).padStart(2, '0')} – {a.navn}
            </option>
          ))}
        </select>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
          <span>
            Prosjekt: <strong className="text-emerald-300">{prosjekt.navn}</strong>
          </span>
          <button
            type="button"
            onClick={onRedigerProsjekt}
            className="min-h-[38px] rounded-lg border border-slate-600 px-2.5 py-1 font-semibold hover:bg-slate-800"
          >
            ✏️ Fyll ut / rediger
          </button>
          {historikk.length > 0 && (
            <button
              type="button"
              onClick={() =>
                bekreftSlett({
                  tittel: 'Tømme chathistorikk?',
                  elementNavn: `${agent ? `Agent ${String(agent.nummer).padStart(2, '0')} – ${agent.navn}` : 'Hovedchat'} (${historikk.length} meldinger)`,
                  beskrivelse: `Er du sikker på at du vil slette hele chathistorikken (${historikk.length} meldinger) for denne agenten på prosjektet «${prosjekt.navn}»?`,
                  bekreftTekst: '🗑️ Tøm samtale',
                  onBekreft: () => onSamtaler((s) => ({ ...s, [aktivNokkel]: [] })),
                })
              }
              className="min-h-[38px] rounded-lg border border-rose-800/70 bg-rose-950/30 px-2.5 py-1 font-semibold text-rose-300 hover:bg-rose-900/50"
            >
              🗑 Tøm samtale
            </button>
          )}
        </div>

        <div
          className={`mt-2 rounded-lg border px-2.5 py-1.5 text-[11px] ${
            harNokkel
              ? 'border-emerald-800 bg-emerald-950/30 text-emerald-200'
              : 'border-sky-800 bg-sky-950/30 text-sky-200'
          }`}
        >
          {harNokkel ? (
            <>
              ⚡ <strong>Live Prosjektsynk + Kartverket API + Gemini Vision ({innstillinger.modell})</strong> er aktiv. Skriv inn adresse/koter/BRA eller lim inn (Ctrl+V) VA-kart for å oppdatere «{prosjekt.navn}» automatisk.
            </>
          ) : (
            <>
              ⚡ <strong>Live Prosjektsynk + Kartverket API er aktiv!</strong> Skriv adresse, koter, BRA eller vanntrykk i chatten for å oppdatere prosjektet automatisk (fungerer uten nøkkel).{' '}
              <button
                type="button"
                onClick={onApneInnstillinger}
                className="font-semibold text-emerald-300 underline"
              >
                Legg inn Gemini-nøkkel for AI Vision
              </button>
            </>
          )}
        </div>

        {/* Gatekeeper & AI-Kommunikasjonsassistent hurtiglinje */}
        {(antallKommuneMangler > 0 || gkRapport.overstyrteEstimater.length > 0) && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 rounded-lg border border-amber-800/70 bg-amber-950/30 p-2 text-[11px]">
            <span className="font-bold text-amber-200">
              🛡️ Gatekeeper ({gkRapport.kommuneNavn}):
            </span>
            {gkRapport.kritiskeMangler.length > 0 && (
              <span className="rounded bg-rose-950/80 px-1.5 py-0.5 text-[10px] font-bold text-rose-300">
                🛑 {gkRapport.kritiskeMangler.length} krav
              </span>
            )}
            {gkRapport.overstyrteEstimater.length > 0 && (
              <span className="rounded bg-amber-950/80 px-1.5 py-0.5 text-[10px] font-bold text-amber-200">
                🟡 {gkRapport.overstyrteEstimater.length} estimat
              </span>
            )}
            <div className="flex flex-wrap gap-1.5 pt-1 sm:pt-0">
              <button
                type="button"
                onClick={() => void kopierKommuneForesporselFraChat('va_etat')}
                title="Kopier rensket forespørsel til kommunens VA-etat (koter/trykk/overvann)"
                className="min-h-[36px] rounded-md border border-sky-700 bg-sky-950/70 px-2 py-1 text-[10px] font-bold text-sky-200 hover:bg-sky-900"
              >
                🚰 VA-etat
              </button>
              <button
                type="button"
                onClick={() => void kopierKommuneForesporselFraChat('geodata')}
                title="Kopier kart- og matrikkelbestilling til Geodata/Oppmåling"
                className="min-h-[36px] rounded-md border border-indigo-700 bg-indigo-950/70 px-2 py-1 text-[10px] font-bold text-indigo-200 hover:bg-indigo-900"
              >
                🗺️ Geodata
              </button>
              <button
                type="button"
                onClick={() => void kopierKommuneForesporselFraChat('arkitekt_internt')}
                title="Kopier internt notat til Arkitekt & Prosjektering (TEK17 § 14-4 varmesentral, slukkoter, sjakter)"
                className="min-h-[36px] rounded-md border border-emerald-700 bg-emerald-950/70 px-2 py-1 text-[10px] font-bold text-emerald-200 hover:bg-emerald-900"
              >
                📐 Arkitekt (Internt)
              </button>
              {antallKommuneMangler > 0 && onOppdaterProsjektOgOverstyringer && (
                <button
                  type="button"
                  onClick={overstyrManglerFraChat}
                  className="min-h-[36px] rounded-md border border-amber-500/80 bg-amber-500/20 px-2 py-1 text-[10px] font-bold text-amber-100 hover:bg-amber-500/30"
                >
                  ⚠️ Gå videre med estimat
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Meldingshistorikk */}
      <div className="flex-1 space-y-3 overflow-y-auto p-3 text-xs">
        {historikk.length === 0 && (
          <div className="space-y-2 text-slate-400">
            <p>
              <strong className="text-slate-200">
                {agent ? agent.navn : 'Tverrfaglig Hovedchat'}
              </strong>
              :{' '}
              {agent
                ? agent.kjernefunksjon
                : 'Skriv inn prosjektdata (adresse, koter, BRA, vanntrykk) for automatisk oppslag mot Kartverket og oppdatering av prosjektet, eller lim inn (Ctrl+V) et utklipp av VA-kart / plantegning.'}
            </p>
            <p>Prøv et hurtigvalg eller skriv direkte i feltet under:</p>
            <div className="flex flex-col gap-1.5">
              {forslagListe.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => void send(f)}
                  className="rounded-lg border border-slate-700 px-2.5 py-2 text-left text-slate-300 hover:border-emerald-600 hover:text-white"
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        )}

        {historikk.map((m, i) => (
          <div key={i} className={m.rolle === 'bruker' ? 'ml-8' : 'mr-4'}>
            <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {m.rolle === 'bruker'
                ? 'Du'
                : m.type === 'oppdatering'
                ? 'Live Prosjektsynk & Kartverket'
                : m.type === 'prompt'
                ? 'Super-Prompt (kopiert)'
                : m.type === 'feil'
                ? 'Feil'
                : agent
                ? `Agent ${String(agent.nummer).padStart(2, '0')}`
                : 'Prosjekt-AI'}
            </div>
            <div
              className={`whitespace-pre-wrap rounded-lg border p-2.5 leading-relaxed ${
                m.rolle === 'bruker'
                  ? 'border-emerald-800 bg-emerald-950/40 text-emerald-50'
                  : m.type === 'oppdatering'
                  ? 'border-emerald-500/80 bg-emerald-950/60 font-medium text-emerald-100 shadow-md'
                  : m.type === 'feil'
                  ? 'border-rose-700 bg-rose-950/50 text-rose-200'
                  : m.type === 'prompt'
                  ? 'max-h-64 select-all overflow-y-auto border-sky-800 bg-slate-900 font-mono text-[11px] text-slate-300'
                  : 'border-slate-700 bg-slate-900 text-slate-200'
              }`}
            >
              {m.vedlegg && m.vedlegg.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5 border-b border-emerald-800/50 pb-1.5">
                  {m.vedlegg.map((v, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 rounded bg-slate-900/80 px-2 py-0.5 text-[10px] font-semibold text-emerald-300"
                    >
                      📎 {v.navn}
                    </span>
                  ))}
                </div>
              )}
              {m.tekst ? rensLatexFormler(m.tekst) : m.tekst}
            </div>
          </div>
        ))}
        {sender && (
          <div className="text-slate-400">
            Tolker data, slår opp mot Kartverket og oppdaterer prosjektet …
          </div>
        )}
        <div ref={bunn} />
      </div>

      {/* Bunnseksjon: Velg tegning/bilde + tekstfelt */}
      <div className="border-t border-slate-800 p-3">
        {/* Velg eller last opp vedlegg (tegning/bilde/PDF/VA-kart) */}
        <div className="mb-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
            <span className="font-semibold">
              📎 Vedlegg / VA-kart ({valgteFiler.length} valgt – eller lim inn utklipp med Ctrl+V):
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => filInputRef.current?.click()}
                className="min-h-[38px] rounded-lg border border-emerald-700 bg-emerald-950/50 px-2.5 py-1 text-[11px] font-bold text-emerald-300 hover:bg-emerald-900"
              >
                + Last opp VA-kart / fil
              </button>
              <button
                type="button"
                onClick={() => kameraInputRef.current?.click()}
                title="Ta bilde direkte med kamera på mobil eller nettbrett"
                className="min-h-[38px] rounded-lg border border-emerald-600 bg-emerald-900/40 px-2.5 py-1 text-[11px] font-bold text-emerald-200 hover:bg-emerald-800"
              >
                📸 Kamera
              </button>
            </div>
            <input
              ref={filInputRef}
              type="file"
              multiple
              accept=".pdf,.xlsx,.xls,.csv,.docx,.txt,.png,.jpg,.jpeg,.webp,image/*,application/pdf"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) {
                  void lastOppFilFraChat(e.target.files);
                  e.target.value = '';
                }
              }}
            />
            <input
              ref={kameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) {
                  void lastOppFilFraChat(e.target.files);
                  e.target.value = '';
                }
              }}
            />
          </div>

          {prosjektFiler.length > 0 && (
            <div className="mt-1.5 flex max-h-20 flex-wrap gap-1 overflow-y-auto">
              {prosjektFiler.map((f) => {
                const erValgt = valgteFilIder.includes(f.id);
                const ikon = FIL_KATEGORI_ETIKETTER[f.kategori]?.ikon ?? '📎';
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => toggleValgtFil(f.id)}
                    className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] transition ${
                      erValgt
                        ? 'border-emerald-500 bg-emerald-950 font-bold text-emerald-200'
                        : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                    }`}
                  >
                    <span>{erValgt ? '✅' : ikon}</span>
                    <span className="max-w-[140px] truncate">{f.navn}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <textarea
          aria-label="Spørsmål til agenten"
          value={tekst}
          onChange={(e) => setTekst(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey || !e.shiftKey)) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder="Skriv f.eks. «Adressen er Kongsgata 10, 4005 Stavanger og laveste sluk er kote 12.5» eller lim inn (Ctrl+V) et VA-kart …"
          className="h-20 w-full resize-none rounded-lg border border-slate-600 bg-slate-900 p-2 text-xs text-slate-100 outline-none focus:border-emerald-500"
        />
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => void send()}
            disabled={sender || (tekst.trim() === '' && valgteFiler.length === 0)}
            className="min-h-[44px] flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500"
          >
            {sender
              ? 'Oppdaterer & sender …'
              : valgteFiler.length > 0
              ? `➤ Send & analyser (${valgteFiler.length} vedlegg)`
              : harNokkel
              ? '➤ Send & oppdater prosjekt'
              : '➤ Oppdater prosjekt & sjekk data'}
          </button>
          <button
            type="button"
            onClick={() => void lagPrompt()}
            className="min-h-[44px] flex-1 rounded-lg border border-sky-700 bg-sky-950/50 px-3 py-2 text-xs font-bold text-sky-200 hover:bg-sky-900"
          >
            📋 Lag Super-Prompt
          </button>
        </div>
      </div>
    </aside>
  );
}
