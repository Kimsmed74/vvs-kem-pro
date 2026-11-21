import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  UploadCloud,
  CheckCircle,
  FileText,
  Wrench,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Download,
  Copy,
  Mail,
  Send,
  AlertTriangle,
  Building,
  Clock,
  FileSpreadsheet,
  Edit3,
  ArrowUpDown,
  Trash2,
  Plus,
  Sparkles,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import type { ProsjektData } from './data/prosjekter';
import {
  lesOgAnalyserFilLokalt,
  analyserTekstLokalt,
  flettUttrekkInnIProsjekt,
  lagKortFunnTekst,
} from './lib/filer';
import {
  beregnUtpris,
  INITIAL_ORDER_DATA,
  NRF_VAREKATALOG,
  synkroniserOrdreMedProsjekt,
  genererAhlsellM3CSV,
  genererTripletexCSV,
  genererHolteSmartKalkCSV,
  type OrderItem,
} from './components/AhlsellOrderQA';
import { lastNedTekst } from './lib/format';
import type { CompanyProfile, UserRole } from './lib/auth';
import TilbudsPdfModal from './components/TilbudsPdfModal';
import { useProject } from './context/ProjectContext';
import VvsTegnebrett from './VvsTegnebrett';

interface RorleggerExpressProps {
  prosjekt: ProsjektData;
  companyProfile?: CompanyProfile;
  userRole?: UserRole;
  initialItems?: OrderItem[];
  onOppdaterOrdreItems?: (items: OrderItem[]) => void;
  onOppdaterProsjekt: (prosjekt: ProsjektData, endringer?: string[]) => void;
  onByttModus: (modus: 'full' | 'express') => void;
  onApneFullQA?: () => void;
  melding: (tekst: string) => void;
}

export default function RorleggerExpressView({
  prosjekt,
  companyProfile,
  userRole,
  initialItems,
  onOppdaterOrdreItems,
  onOppdaterProsjekt,
  onByttModus,
  onApneFullQA,
  melding,
}: RorleggerExpressProps) {
  // Global ProjectContext med sikker fallback for isolerte tester
  let projectCtx: ReturnType<typeof useProject> | null = null;
  try {
    projectCtx = useProject();
  } catch {
    projectCtx = null;
  }

  // 3-stegs arbeidsflyt: 1 = Last opp, 2 = QA & Juster, 3 = Ferdig Tilbud & Bestilling
  const [aktivtSteg, setAktivtSteg] = useState<1 | 2 | 3>(1);

  // Steg 1 inndata
  const [lokalProsjektType, setLokalProsjektType] = useState<'rehab' | 'tek17'>('rehab');
  const prosjektType = lokalProsjektType;
  const setProsjektType = (ny: 'rehab' | 'tek17') => {
    setLokalProsjektType(ny);
    if (projectCtx) projectCtx.settProsjektType('bolig');
  };

  const [bedriftsNavn, setBedriftsNavn] = useState<string>(
    () => companyProfile?.firmanavn ?? 'Rørleggerbedriften AS'
  );

  // Fallback lokal tilstand hvis komponenten kjøres uten ProjectProvider
  const [lokalItems, setLokalItems] = useState<OrderItem[]>(() => {
    if (initialItems && initialItems.length > 0) return initialItems;
    return synkroniserOrdreMedProsjekt(INITIAL_ORDER_DATA, prosjekt);
  });
  const [lokalSystemRabatt, setLokalSystemRabatt] = useState<boolean>(true);
  const [lokalAntallTimer, setLokalAntallTimer] = useState<number>(65);
  const [lokalTimeprisUt, setLokalTimeprisUt] = useState<number>(() => companyProfile?.timeprisUt ?? 1150);
  const [lokalTimeSelvkost, setLokalTimeSelvkost] = useState<number>(() => companyProfile?.timeSelvkost ?? 550);
  const [visTilbudsPdfModal, setVisTilbudsPdfModal] = useState<boolean>(false);
  const [visTegnebrettModal, setVisTegnebrettModal] = useState<boolean>(false);

  // Aktive verdier: henter fra context hvis tilgjengelig, ellers lokal state
  const items = projectCtx ? projectCtx.vareliste : lokalItems;
  const systemRabattAktiv = projectCtx ? projectCtx.systemRabattAktiv : lokalSystemRabatt;
  const antallTimer = projectCtx ? projectCtx.timeverk.antallTimer : lokalAntallTimer;
  const timeprisUt = projectCtx ? projectCtx.timeverk.timeprisUt : lokalTimeprisUt;
  const timeSelvkost = projectCtx ? projectCtx.timeverk.timeSelvkost : lokalTimeSelvkost;
  const mangelSjekkliste = projectCtx ? projectCtx.mangelSjekkliste : [];

  useEffect(() => {
    if (companyProfile?.firmanavn) setBedriftsNavn(companyProfile.firmanavn);
    if (companyProfile?.timeprisUt) {
      if (projectCtx) projectCtx.oppdaterTimeverk({ timeprisUt: companyProfile.timeprisUt });
      else setLokalTimeprisUt(companyProfile.timeprisUt);
    }
    if (companyProfile?.timeSelvkost) {
      if (projectCtx) projectCtx.oppdaterTimeverk({ timeSelvkost: companyProfile.timeSelvkost });
      else setLokalTimeSelvkost(companyProfile.timeSelvkost);
    }
  }, [companyProfile?.firmanavn, companyProfile?.timeprisUt, companyProfile?.timeSelvkost, projectCtx]);

  // Filopplasting & analyse state
  const [drarOver, setDrarOver] = useState<boolean>(false);
  const [analysererFil, setAnalysererFil] = useState<boolean>(false);
  const [filAnalyseFunn, setFilAnalyseFunn] = useState<string | null>(null);
  const filInputRef = useRef<HTMLInputElement>(null);

  // Hvis initialItems oppdateres utenfra i isolert testmiljø
  useEffect(() => {
    if (!projectCtx && initialItems && initialItems.length > 0) {
      setLokalItems(initialItems);
    }
  }, [projectCtx, initialItems]);

  // Synkroniser lokal vareliste hvis prosjektets sanitærutstyr eller varmeanlegg oppdateres via fil (uten context)
  useEffect(() => {
    if (!projectCtx && (prosjekt.sanitaerUtstyr || prosjekt.varmeanlegg)) {
      setLokalItems((prev) => {
        const ny = synkroniserOrdreMedProsjekt(prev, prosjekt);
        onOppdaterOrdreItems?.(ny);
        return ny;
      });
    }
  }, [projectCtx, prosjekt.sanitaerUtstyr, prosjekt.varmeanlegg, onOppdaterOrdreItems]);

  const oppdaterItems = useCallback(
    (oppdater: (prev: OrderItem[]) => OrderItem[]) => {
      if (projectCtx) {
        projectCtx.settVareliste(oppdater);
        const ny = oppdater(projectCtx.vareliste);
        onOppdaterOrdreItems?.(ny);
      } else {
        setLokalItems((prev) => {
          const ny = oppdater(prev);
          onOppdaterOrdreItems?.(ny);
          return ny;
        });
      }
    },
    [projectCtx, onOppdaterOrdreItems]
  );

  // Varehåndtering
  const [visNyVare, setVisNyVare] = useState<boolean>(false);
  const [nyNrf, setNyNrf] = useState<string>('');
  const [nyBeskrivelse, setNyBeskrivelse] = useState<string>('');
  const [nyAntall, setNyAntall] = useState<number>(1);
  const [nyEnhet, setNyEnhet] = useState<string>('stk');
  const [nyInnpris, setNyInnpris] = useState<number>(500);
  const [nyKategori, setNyKategori] = useState<'Lokkeand' | 'Mester-tillegg'>('Mester-tillegg');

  const handleNrfInput = (val: string) => {
    setNyNrf(val);
    const rentNrf = val.trim();
    if (NRF_VAREKATALOG[rentNrf]) {
      const v = NRF_VAREKATALOG[rentNrf];
      setNyBeskrivelse(v.beskrivelse);
      setNyEnhet(v.enhet);
      setNyInnpris(v.innpris);
      setNyKategori(v.kategori);
    }
  };

  // E-post & tilbudstekst modaler/kopiering
  const [visTilbudBrevModal, setVisTilbudBrevModal] = useState<boolean>(false);
  const [kopiertEpostStatus, setKopiertEpostStatus] = useState<boolean>(false);
  const [kopiertTilbudStatus, setKopiertTilbudStatus] = useState<boolean>(false);

  // Beregninger: henter fra context for 100 % numerisk identitet eller beregner lokalt
  const totals = useMemo(() => {
    if (projectCtx) {
      return projectCtx.kalkyleTotals;
    }
    const matInn = items.reduce((sum, item) => sum + Math.max(0, item.innpris) * Math.max(0, item.antall), 0);
    const matUtRaa = items.reduce(
      (sum, item) => sum + beregnUtpris(item.innpris, item.kategori) * Math.max(0, item.antall),
      0
    );
    const rabatt = systemRabattAktiv ? Math.round(matUtRaa * 0.05) : 0;
    const matNetto = matUtRaa - rabatt;
    const tSum = antallTimer * timeprisUt;
    const tKost = antallTimer * timeSelvkost;
    const totEksMva = matNetto + tSum;
    const totKost = matInn + tKost;
    const dgBelop = totEksMva - totKost;
    const dgProsent = totEksMva > 0 ? ((dgBelop / totEksMva) * 100).toFixed(1) : '0.0';
    const mvaVal = Math.round(totEksMva * 0.25);
    const totInklMva = totEksMva + mvaVal;
    const enovaVal = prosjektType === 'rehab' ? 10000 : 0;
    const nettoInv = totInklMva - enovaVal;

    return {
      materiellInnkjop: matInn,
      materiellUtprisRaa: matUtRaa,
      rabattBelop: rabatt,
      materiellNetto: matNetto,
      timerSum: tSum,
      timerKost: tKost,
      totalEksMva: totEksMva,
      totalKost: totKost,
      totalDGBelop: dgBelop,
      totalDGProsent: dgProsent,
      mva: mvaVal,
      totalInklMva: totInklMva,
      enovaTilskudd: enovaVal,
      nettoInvestering: nettoInv,
    };
  }, [projectCtx, items, systemRabattAktiv, antallTimer, timeprisUt, timeSelvkost, prosjektType]);

  const rabattBelop = totals.rabattBelop;
  const materiellNetto = totals.materiellNetto;
  const timerSum = totals.timerSum;
  const totalEksMva = totals.totalEksMva;
  const totalDGProsent = totals.totalDGProsent;
  const mva = totals.mva;
  const totalInklMva = totals.totalInklMva;
  const nettoInvesteringEtterEnova = totals.nettoInvestering;

  // Håndter filopplasting og automatisk dokumentanalyse med dynamisk krysstale
  const behandleFiler = async (filer: FileList | File[]) => {
    const fil = filer[0];
    if (!fil) return;

    setAnalysererFil(true);
    try {
      const pFil = await lesOgAnalyserFilLokalt(fil, prosjekt.id);
      const uttrekk = analyserTekstLokalt(pFil.uttrukketTekst || '', fil.name);
      const funnTekst = lagKortFunnTekst(uttrekk);

      setFilAnalyseFunn(
        funnTekst || `Lest fil «${fil.name}» (${(fil.size / 1024).toFixed(0)} kB). Ingen data funnet.`
      );

      // Flett automatisk inn i prosjekt-state (og la context regenerere varelisten dynamisk!)
      const oppdatert = flettUttrekkInnIProsjekt(prosjekt, uttrekk);
      if (projectCtx) {
        projectCtx.oppdaterProsjekt(oppdatert, [`Automatisk uthenting fra ${fil.name}`]);
      } else {
        onOppdaterProsjekt(oppdatert, [`Automatisk uthenting fra ${fil.name}`]);
      }
      melding(`✅ Analysert «${fil.name}»: Data overført til tilbudet!`);
    } catch (err) {
      console.error(err);
      melding(`⚠️ Kunne ikke analysere filen helt: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setAnalysererFil(false);
    }
  };

  const handleQuantityChange = (id: number, nyttAntall: string) => {
    const parsed = parseInt(nyttAntall, 10);
    const verdi = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
    if (projectCtx) {
      projectCtx.oppdaterVareAntall(id, verdi);
      onOppdaterOrdreItems?.(projectCtx.vareliste.map((i) => (i.id === id ? { ...i, antall: verdi } : i)));
    } else {
      oppdaterItems((prev) => prev.map((item) => (item.id === id ? { ...item, antall: verdi } : item)));
    }
  };

  const toggleKategori = (id: number) => {
    if (projectCtx) {
      projectCtx.toggleVareKategori(id);
      onOppdaterOrdreItems?.(
        projectCtx.vareliste.map((i) =>
          i.id === id ? { ...i, kategori: i.kategori === 'Lokkeand' ? 'Mester-tillegg' : 'Lokkeand' } : i
        )
      );
    } else {
      oppdaterItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                kategori: item.kategori === 'Lokkeand' ? 'Mester-tillegg' : 'Lokkeand',
              }
            : item
        )
      );
    }
  };

  const slettVarepost = (id: number) => {
    if (projectCtx) {
      projectCtx.slettVare(id);
      onOppdaterOrdreItems?.(projectCtx.vareliste.filter((i) => i.id !== id));
    } else {
      oppdaterItems((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const handterFlyttVare = (index: number, retning: 'opp' | 'ned') => {
    if (projectCtx) {
      projectCtx.flyttVare(index, retning);
    } else {
      oppdaterItems((prev) => {
        const ny = [...prev];
        const target = retning === 'opp' ? index - 1 : index + 1;
        if (target < 0 || target >= ny.length) return ny;
        const temp = ny[index];
        ny[index] = ny[target];
        ny[target] = temp;
        return ny;
      });
    }
  };

  const leggTilVarepost = () => {
    if (!nyNrf.trim() || !nyBeskrivelse.trim()) {
      melding('⚠️ Oppgi både NRF-nummer og varebeskrivelse.');
      return;
    }
    const nyPost: OrderItem = {
      id: Date.now(),
      nrf: nyNrf.trim(),
      beskrivelse: nyBeskrivelse.trim(),
      antall: Math.max(1, nyAntall || 1),
      enhet: nyEnhet.trim() || 'stk',
      innpris: Math.max(0, nyInnpris || 0),
      kategori: nyKategori,
    };
    oppdaterItems((prev) => [...prev, nyPost]);
    setNyNrf('');
    setNyBeskrivelse('');
    setNyAntall(1);
    setNyInnpris(500);
    setVisNyVare(false);
    melding(`✅ Ny varepost "${nyPost.beskrivelse}" lagt til!`);
  };

  // Generer avklarings-e-post til byggherre
  const genererAvklaringsEpost = () => {
    return `Emne: Viktig teknisk avklaring før endelig pristilbud - ${prosjekt.navn || 'VVS-prosjekt'}

Hei,

Takk for oversendt underlag for prosjektet "${prosjekt.navn || 'VVS-anlegg'}".

Vi er i gang med mengdeberegning og tilbudsutarbeidelse basert på tegningene. For at vi skal kunne gi deg en forpliktende fastpris og garantere forskriftsmessig utførelse iht. Byggforsk og TEK17, har vi følgende 4 viktige tekniske avklaringer:

1. KOTER OG AVLØPSFALL:
   Foreligger det en godkjent VA-situasjonsplan fra kommunen med IBR/ITR-koter for stikkledningen? Vi må kontrollere at det er tilstrekkelig selvfall og unngå tilbakeslag mot laveste sluk.

2. HOVEDSTOPPEKRAN OG VANNMÅLER:
   Hvor skal hovedstoppekran og vannmålerkonsoll plasseres (teknisk rom, vaskerom eller kjeller)?

3. ELEKTRISK KAPASITET (SIKRINGSSKAP):
   Er det 230V IT eller 400V TN-nett i bygget, og er hovedsikringen tilstrekkelig dimensjonert for varmepumpens spisslastkolbe?

4. OVERVANN OG FORDRØYNING:
   Gjelder det lokale krav til fordrøyning eller infiltrasjon på egen tomt for tak- og overflatevann?

Så snart dette er avklart, oversender vi vårt endelige pristilbud med faste priser på bransjemateriell (låste NRF-numre), rørleggertimer og eventuelt Enova-tilskudd.

Med vennlig hilsen,
${bedriftsNavn}
${prosjekt.sted ? `Gjelder adresse / sted: ${prosjekt.sted}` : ''}`;
  };

  const kopierAvklaringsEpost = () => {
    const tekst = genererAvklaringsEpost();
    navigator.clipboard?.writeText(tekst);
    setKopiertEpostStatus(true);
    melding('📋 Avklarings-e-post kopiert til utklippstavlen!');
    setTimeout(() => setKopiertEpostStatus(false), 3000);
  };

  // Generer tilbudsbrev til sluttkunde
  const genererTilbudsBrev = () => {
    const datoStr = new Date().toLocaleDateString('no-NO');
    return `===============================================================
TILBUD PÅ KOMPLETT VVS-ANLEGG OG INSTALLASJON
===============================================================
Dato: ${datoStr}
Prosjekt: ${prosjekt.navn}
Byggherre / Oppdragsgiver: ${prosjekt.byggherre || 'Sluttkunde'}
Leverandør: ${bedriftsNavn}
${prosjekt.sted ? `Installasjonsadresse / sted: ${prosjekt.sted}` : ''}
Prosjekttype: ${prosjektType === 'rehab' ? 'Rehabilitering / Eksisterende bolig' : 'Nybygg TEK17'}

1. LEVERANSEOMFANG:
Vi har gleden av å tilby komplett levering og fagmessig montering av VVS-anlegg:
- Sanitærutstyr: Vegghengte toaletter, servanter, dusjer og blandebatterier iht. Byggforsk 553.102.
- Rørsystem: Rør-i-rør system med fordelerskap og automatisk lekkasjesikring (Waterguard).
- Varmeanlegg: Varmekilde / varmepumpe med komplett hydronisk innregulering.
- Offisielle bransjenumre: Samtlige varer leveres med låste NRF-numre fra godkjente grossister.

2. PRIS- OG KOSTNADSSAMMENSTILLING:
- Materiell (netto etter 5 % systempakke-rabatt): ${materiellNetto.toLocaleString('no-NO')} kr
- Rørleggertimer / montering (${antallTimer} timer @ ${timeprisUt} kr/t): ${timerSum.toLocaleString('no-NO')} kr
---------------------------------------------------------------
TOTAL TILBUDSSUM EKS. MVA: ${totalEksMva.toLocaleString('no-NO')} kr
Merverdiavgift (25 % mva): ${mva.toLocaleString('no-NO')} kr
TOTAL TILBUDSSUM INKL. MVA: ${totalInklMva.toLocaleString('no-NO')} kr
---------------------------------------------------------------
${
  prosjektType === 'rehab'
    ? `ENOVA-TILSKUDD:
Prosjektet er kvalifisert for inntil 10 000 kr i direkte Enova-tilskudd ved installasjon av godkjent varmesystem.
- Estimert Enova-støtte: -10 000 kr
NETTO INVESTERING ETTER STØTTE: ${nettoInvesteringEtterEnova.toLocaleString('no-NO')} kr inkl. mva`
    : `ENERGIKRAV:
Prosjektet utføres i henhold til gjeldende TEK17-standard for nybygg.`
}

3. VILKÅR OG GARANTIER:
- Arbeidet utføres av autorisert rørlegger iht. gjeldende VVS-forskrifter og våtromsnorm.
- 5 års reklamasjonsrett iht. Håndverkertjenesteloven / Bustadoppføringslova.
- Tilbudet forutsetter fri tilkomst og normal bygningsmessig tilrettelegging.
- Gyldighet: 30 dager fra tilbudsdato.

Vi takker for oppdraget og ser frem til et godt samarbeid!

Med vennlig hilsen,
${bedriftsNavn}`;
  };

  const kopierTilbudsBrev = () => {
    const tekst = genererTilbudsBrev();
    navigator.clipboard?.writeText(tekst);
    setKopiertTilbudStatus(true);
    melding('📄 Tilbudsbrev kopiert til utklippstavlen!');
    setTimeout(() => setKopiertTilbudStatus(false), 3000);
  };

  const lastNedTilbudsBrev = () => {
    const tekst = genererTilbudsBrev();
    const filnavn = `Tilbud-${prosjekt.navn.toLowerCase().replace(/[^a-z0-9]+/gi, '-')}.txt`;
    lastNedTekst(filnavn, tekst);
    melding(`📥 Lastet ned ${filnavn}!`);
  };

  // CSV-eksportfunksjoner
  const eksporterCsvM3 = () => {
    const csv = genererAhlsellM3CSV(items);
    lastNedTekst('Ahlsell_M3_Hurtigordre.csv', '\uFEFF' + csv);
    melding('📦 Ahlsell M3 hurtigordre CSV lastet ned!');
  };

  const eksporterCsvTripletex = () => {
    const csv = genererTripletexCSV(
      items,
      antallTimer,
      timeSelvkost,
      timeprisUt,
      true,
      systemRabattAktiv,
      rabattBelop
    );
    lastNedTekst('Tripletex_Tilbudsimport.csv', '\uFEFF' + csv);
    melding('💻 Tripletex CSV-fil lastet ned!');
  };

  const eksporterCsvHolte = () => {
    const csv = genererHolteSmartKalkCSV(
      items,
      antallTimer,
      timeSelvkost,
      timeprisUt,
      true,
      systemRabattAktiv,
      rabattBelop
    );
    lastNedTekst('Holte_SmartKalk_Import.csv', '\uFEFF' + csv);
    melding('💻 Holte SmartKalk CSV-fil lastet ned!');
  };

  const sendTilMesterForKontroll = () => {
    if (userRole === 'rorlegger_kunde') {
      melding('🚀 Saken og underlaget er overført til Mester & Ingeniør for teknisk kontroll og TEK17-sikring!');
      return;
    }
    onByttModus('full');
    if (onApneFullQA) onApneFullQA();
    melding('🚀 Prosjektet er overført til Mester & Ingeniør for full teknisk kontroll!');
  };

  return (
    <div className="mx-auto max-w-7xl px-3 py-6 sm:px-6 space-y-6">
      {/* Toppseksjon med velkomst og 3-stegs framdriftsindikator */}
      <div className="rounded-2xl border border-blue-900/60 bg-gradient-to-r from-blue-950/50 via-slate-900 to-slate-900 p-6 shadow-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-blue-600 px-2 py-0.5 text-xs font-black uppercase tracking-wider text-white">
                Rørlegger Express
              </span>
              <span className="text-xs font-semibold text-slate-400">
                Strømlinjeformet kundemodus for rørleggerbedrifter
              </span>
            </div>
            <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-white">
              3-Stegs Raskalkyle &amp; Bestilling
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-300">
              Aktivt prosjekt: <strong className="text-emerald-300">{prosjekt.navn}</strong>{' '}
              {prosjekt.bra ? `(${prosjekt.bra} m²)` : ''} · Tilbudssum: {' '}
              <strong className="text-amber-400">{totalInklMva.toLocaleString('no-NO')} kr inkl. mva</strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onByttModus('full')}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-700"
            >
              🎓 Til Mester &amp; Ingeniør (Full)
            </button>
          </div>
        </div>

        {/* 3-stegs fremdriftslinje */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-slate-800 pt-5">
          <button
            type="button"
            onClick={() => setAktivtSteg(1)}
            className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition ${
              aktivtSteg === 1
                ? 'border-blue-500 bg-blue-950/60 text-white shadow-md'
                : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-bold text-sm ${
                aktivtSteg === 1 ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              1
            </div>
            <div>
              <div className="text-xs font-bold text-slate-200">Steg 1: Last opp</div>
              <div className="text-[11px] text-slate-400">PDF-tegning &amp; prosjektvalg</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setAktivtSteg(2)}
            className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition ${
              aktivtSteg === 2
                ? 'border-blue-500 bg-blue-950/60 text-white shadow-md'
                : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-bold text-sm ${
                aktivtSteg === 2 ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              2
            </div>
            <div>
              <div className="text-xs font-bold text-slate-200">Steg 2: Sjekk &amp; Juster</div>
              <div className="text-[11px] text-slate-400">QA-avklaringer &amp; mengdetabell</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setAktivtSteg(3)}
            className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition ${
              aktivtSteg === 3
                ? 'border-blue-500 bg-blue-950/60 text-white shadow-md'
                : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-bold text-sm ${
                aktivtSteg === 3 ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              3
            </div>
            <div>
              <div className="text-xs font-bold text-slate-200">Steg 3: Tilbud &amp; Bestilling</div>
              <div className="text-[11px] text-slate-400">Ahlsell M3, ERP &amp; Tilbudsbrev</div>
            </div>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* STEG 1: LAST OPP UNDERLAG */}
      {/* ============================================================== */}
      {aktivtSteg === 1 && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <UploadCloud className="h-5 w-5 text-blue-400" />
              1. Last opp underlag (Tegning eller anbudsbeskrivelse)
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Slipp PDF-tegning, romskjema eller tekstfil her. Appens dokumentleser henter automatisk ut antall toaletter, servanter, dusjer og arealer.
            </p>

            {/* Dra-og-slipp-felt */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDrarOver(true);
              }}
              onDragLeave={() => setDrarOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrarOver(false);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  void behandleFiler(e.dataTransfer.files);
                }
              }}
              onClick={() => filInputRef.current?.click()}
              className={`mt-4 flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition ${
                drarOver
                  ? 'border-blue-400 bg-blue-950/40 text-blue-200 shadow-lg'
                  : 'border-slate-700 bg-slate-950/50 hover:border-slate-600 hover:bg-slate-950/80 text-slate-400'
              }`}
            >
              <input
                ref={filInputRef}
                type="file"
                accept=".pdf,.txt,.md,.docx,.xlsx,image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    void behandleFiler(e.target.files);
                    e.target.value = '';
                  }
                }}
              />
              <UploadCloud className="h-12 w-12 text-blue-400 mb-2" />
              <span className="text-sm font-bold text-white">
                {analysererFil ? '⏳ Analyserer dokumentet...' : 'Klikk for å velge, eller slipp PDF / fil her'}
              </span>
              <span className="mt-1 text-xs text-slate-400">
                Støtter PDF-tegninger, anbudsdokumenter (.txt/.md) og Excel (.xlsx)
              </span>
            </div>

            {/* Tilbakemelding fra analyse */}
            {filAnalyseFunn && (
              <div className="mt-4 rounded-lg border border-emerald-600/50 bg-emerald-950/30 p-4 text-xs text-emerald-200">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                  Uthentede data fra opplastet underlag:
                </div>
                <div className="mt-1 font-mono text-[11px] text-slate-300 whitespace-pre-wrap">
                  {filAnalyseFunn}
                </div>
              </div>
            )}

            {/* Alternativ: Interaktivt VVS-Tegnebrett for rørskisse og utstyr */}
            <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-purple-800/60 bg-gradient-to-r from-purple-950/40 to-slate-950 p-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🎨</span>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <span>Vil du heller tegne/skisse rør og utstyr direkte?</span>
                    <span className="rounded bg-purple-900/80 px-2 py-0.5 text-[10px] font-bold text-purple-300 border border-purple-700/50">
                      RØRSKISSE
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Bruk tegnebrettet til å streke opp rørstrekk (kaldt, varmt, varme, avløp), plassere toaletter og fordelerskap, og få ferdig beregnede rørmeter (+15 % svinn) rett inn i tilbudet.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setVisTegnebrettModal(true)}
                className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl border border-purple-500/50 bg-purple-600 px-4 py-2 text-xs font-extrabold text-white shadow-lg hover:bg-purple-500 transition active:scale-95"
              >
                <span>🎨 Åpne VVS-Tegnebrett</span>
              </button>
            </div>
          </div>

          {/* Enkle valg: Prosjekttype, Bedrift og Timepris */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl space-y-5">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Building className="h-4 w-4 text-blue-400" />
              Prosjektinnstillinger &amp; Prisprofil
            </h3>

            <div className="grid gap-5 md:grid-cols-2">
              {/* Prosjekttype (koblet mot Enova) */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">
                  Prosjekttype (påvirker Enova-tilskudd)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setProsjektType('rehab')}
                    className={`flex flex-col rounded-xl border p-3.5 text-left transition ${
                      prosjektType === 'rehab'
                        ? 'border-emerald-500 bg-emerald-950/50 text-white shadow'
                        : 'border-slate-700 bg-slate-800/80 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <span className="text-xs font-bold text-emerald-300">
                      🏡 Rehabilitering
                    </span>
                    <span className="mt-1 text-[11px] text-slate-300">
                      Eksisterende bolig. Kvalifiserer for 10 000 kr i Enova-støtte!
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setProsjektType('tek17')}
                    className={`flex flex-col rounded-xl border p-3.5 text-left transition ${
                      prosjektType === 'tek17'
                        ? 'border-blue-500 bg-blue-950/50 text-white shadow'
                        : 'border-slate-700 bg-slate-800/80 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <span className="text-xs font-bold text-blue-300">
                      🏗️ Nybygg TEK17
                    </span>
                    <span className="mt-1 text-[11px] text-slate-300">
                      Følger TEK17 minstekrav (standard energiramme).
                    </span>
                  </button>
                </div>
              </div>

              {/* Bedriftsnavn & Timepris */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Ditt bedriftsnavn
                  </label>
                  <input
                    type="text"
                    value={bedriftsNavn}
                    onChange={(e) => setBedriftsNavn(e.target.value)}
                    className="w-full min-h-[44px] rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-medium text-white focus:border-blue-500 focus:outline-none"
                    placeholder="f.eks. Hansen VVS AS"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Timepris ut (kr/t)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="500"
                      step="50"
                      value={timeprisUt}
                      onChange={(e) => {
                        const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                        if (projectCtx) projectCtx.oppdaterTimeverk({ timeprisUt: val });
                        else setLokalTimeprisUt(val);
                      }}
                      className="w-full min-h-[44px] rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 pr-10 text-xs font-bold text-amber-400 focus:border-blue-500 focus:outline-none"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                      kr/t
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setAktivtSteg(2)}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg transition hover:bg-blue-500"
              >
                Gå til Steg 2: Sjekk &amp; Juster (QA) <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* STEG 2: SJEKK & JUSTER (QA) */}
      {/* ============================================================== */}
      {aktivtSteg === 2 && (
        <div className="space-y-6">
          {/* Kompakt boks øverst: Viktige avklaringer før du gir pris */}
          <div className="rounded-2xl border border-amber-600/60 bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 p-5 shadow-xl">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                  <h3 className="text-base font-bold text-amber-300">
                    Viktige avklaringer før du gir pris (Unngå typiske feller &amp; Lov 1/2/3)
                  </h3>
                </div>
                <p className="mt-1 text-xs text-slate-300">
                  {mangelSjekkliste.length > 0
                    ? `Fant ${mangelSjekkliste.length} avklaringspunkter i prosjektunderlaget. Klikk for å markere som avklart:`
                    : 'Vi fant 4 punkter i tegningen som ofte medfører uforutsette merkostnader hvis de ikke avklares med byggherre på forhånd:'}
                </p>
              </div>

              <button
                type="button"
                onClick={kopierAvklaringsEpost}
                className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold shadow-lg transition ${
                  kopiertEpostStatus
                    ? 'bg-emerald-600 text-white'
                    : 'bg-amber-600 hover:bg-amber-500 text-white'
                }`}
              >
                <Mail className="h-4 w-4" />
                {kopiertEpostStatus ? '✅ E-post kopiert!' : 'Kopier e-post til byggherre'}
              </button>
            </div>

            <div className="mt-4 grid gap-2.5 sm:grid-cols-2 text-xs text-slate-300">
              {mangelSjekkliste.length > 0 ? (
                mangelSjekkliste.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => projectCtx?.toggleMangelAvklart(m.id)}
                    className={`cursor-pointer rounded-lg border p-3 transition ${
                      m.avklart
                        ? 'border-emerald-700/60 bg-emerald-950/30 text-emerald-300 opacity-60'
                        : m.alvorlighetsgrad === 'kritisk'
                        ? 'border-rose-700/80 bg-rose-950/40 text-rose-200'
                        : 'border-amber-700/70 bg-amber-950/30 text-amber-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold">
                        {m.avklart ? '✓ ' : m.alvorlighetsgrad === 'kritisk' ? '🚨 ' : '⚠️ '}
                        {m.tittel}
                      </span>
                      <span
                        className={`text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded ${
                          m.avklart
                            ? 'bg-emerald-900 text-emerald-200'
                            : m.alvorlighetsgrad === 'kritisk'
                            ? 'bg-rose-900 text-rose-200'
                            : 'bg-amber-900 text-amber-200'
                        }`}
                      >
                        {m.avklart ? 'Avklart' : m.alvorlighetsgrad}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] opacity-90 leading-relaxed">{m.beskrivelse}</p>
                  </div>
                ))
              ) : (
                <>
                  <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3">
                    <span className="font-bold text-amber-400">1. Koter &amp; Avløpsfall:</span> Kommunale stikkledningskoter (IBR/ITR) mangler. Nødvendig for å sikre tilstrekkelig selvfall og unngå tilbakeslag.
                  </div>
                  <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3">
                    <span className="font-bold text-amber-400">2. Vannmåler &amp; Tilbakeslag:</span> Plassering av hovedstoppekran og kategori 4 tilbakeslagssikring er ikke angitt.
                  </div>
                  <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3">
                    <span className="font-bold text-amber-400">3. El-kapasitet (Sikringsskap):</span> Byggets spenning og hovedsikring må bekreftes mot varmepumpens spisslast.
                  </div>
                  <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3">
                    <span className="font-bold text-amber-400">4. Overvann &amp; Drenering:</span> Kommunale fordrøyningskrav må avklares før utvendige rør prissettes.
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Redigerbar vare- og timeverkstabell med låste NRF-numre og marginprofil */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-blue-400" />
                  Verifisert Vareuttak &amp; Timeverk
                </h3>
                <span className="text-xs text-slate-400">
                  Låste NRF-numre med 20,0 % dekningsgrad på lokkevarer og 52,4 % på rør og deler.
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setVisNyVare(!visNyVare)}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-700"
                >
                  <Plus className="h-3.5 w-3.5 text-emerald-400" />
                  {visNyVare ? 'Avbryt' : 'Legg til NRF-vare'}
                </button>
              </div>
            </div>

            {/* Ny varepost modal / rad */}
            {visNyVare && (
              <div className="rounded-lg border border-blue-500/50 bg-slate-800/90 p-4 space-y-3">
                <div className="text-xs font-bold text-blue-300 uppercase tracking-wide">
                  Legg til ny post i kalkylen
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">NRF-nummer</label>
                    <input
                      type="text"
                      list="nrf-katalog-forslag-express"
                      placeholder="f.eks. 5083705"
                      value={nyNrf}
                      onChange={(e) => handleNrfInput(e.target.value)}
                      className="w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-white"
                    />
                    <datalist id="nrf-katalog-forslag-express">
                      {Object.entries(NRF_VAREKATALOG).map(([nr, item]) => (
                        <option key={nr} value={nr}>
                          {item.beskrivelse} ({item.innpris} kr, {item.kategori})
                        </option>
                      ))}
                    </datalist>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-slate-400 mb-1">Varebeskrivelse</label>
                    <input
                      type="text"
                      placeholder="f.eks. Rør-i-rør 16mm"
                      value={nyBeskrivelse}
                      onChange={(e) => setNyBeskrivelse(e.target.value)}
                      className="w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Antall &amp; Enhet</label>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        min="1"
                        value={nyAntall}
                        onChange={(e) => setNyAntall(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="w-16 rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-center text-white"
                      />
                      <input
                        type="text"
                        value={nyEnhet}
                        onChange={(e) => setNyEnhet(e.target.value)}
                        className="w-14 rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-center text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Innkjøpspris (kr)</label>
                    <input
                      type="number"
                      min="0"
                      value={nyInnpris}
                      onChange={(e) => setNyInnpris(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Margin-profil</label>
                    <select
                      value={nyKategori}
                      onChange={(e) => setNyKategori(e.target.value as 'Lokkeand' | 'Mester-tillegg')}
                      className="w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-white"
                    >
                      <option value="Mester-tillegg">52,4 % Mester-tillegg</option>
                      <option value="Lokkeand">20,0 % Lokkeand</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setVisNyVare(false)}
                    className="rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300"
                  >
                    Avbryt
                  </button>
                  <button
                    type="button"
                    onClick={leggTilVarepost}
                    className="rounded bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-500"
                  >
                    Lagre post
                  </button>
                </div>
              </div>
            )}

            {/* Tabell */}
            <div className="overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full border-collapse text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-800/80 text-xs uppercase text-slate-400">
                    <th className="py-2.5 px-3">NRF</th>
                    <th className="py-2.5 px-3">Offisiell Varetekst</th>
                    <th className="py-2.5 px-3 text-center">Antall</th>
                    <th className="py-2.5 px-3 text-center">Margin-profil</th>
                    <th className="py-2.5 px-3 text-right">Innpris</th>
                    <th className="py-2.5 px-3 text-right">Utpris</th>
                    <th className="py-2.5 px-3 text-right">Sum Ut</th>
                    <th className="py-2.5 px-2 text-center">Handling</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {items.map((item, idx) => {
                    const ut = beregnUtpris(item.innpris, item.kategori);
                    const sumUt = ut * Math.max(0, item.antall);
                    return (
                      <tr key={item.id} className="hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-mono font-bold text-blue-400">{item.nrf}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-200">{item.beskrivelse}</td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="inline-flex items-center rounded border border-slate-700 bg-slate-950 px-2 py-1">
                            <Edit3 className="mr-1 h-3 w-3 text-slate-400" />
                            <input
                              type="number"
                              min="0"
                              value={item.antall}
                              onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                              className="w-14 bg-transparent text-center font-bold text-white focus:outline-none"
                            />
                            <span className="ml-1 text-[11px] text-slate-400">{item.enhet}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => toggleKategori(item.id)}
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold transition ${
                              item.kategori === 'Lokkeand'
                                ? 'border-amber-500/40 bg-amber-500/20 text-amber-300'
                                : 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
                            }`}
                          >
                            <ArrowUpDown className="h-3 w-3" />
                            {item.kategori === 'Lokkeand' ? '20 % Lokkeand' : '52,4 % Mester'}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-400">
                          {item.innpris.toLocaleString('no-NO')} kr
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-slate-200">
                          {ut.toLocaleString('no-NO')} kr
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-white">
                          {sumUt.toLocaleString('no-NO')} kr
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handterFlyttVare(idx, 'opp')}
                              disabled={idx === 0}
                              title="Flytt varepost opp"
                              className="rounded p-1 text-slate-400 hover:text-white disabled:opacity-20"
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handterFlyttVare(idx, 'ned')}
                              disabled={idx === items.length - 1}
                              title="Flytt varepost ned"
                              className="rounded p-1 text-slate-400 hover:text-white disabled:opacity-20"
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => slettVarepost(item.id)}
                              className="rounded p-1 text-slate-500 hover:text-rose-400"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Timeverk og Kirsebærplukker-skjold kontroller */}
            <div className="grid gap-4 md:grid-cols-2 pt-2">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-400" />
                  <span className="text-xs font-bold text-white">Timer:</span>
                  <input
                    type="number"
                    min="0"
                    value={antallTimer}
                    onChange={(e) => {
                      const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                      if (projectCtx) projectCtx.oppdaterTimeverk({ antallTimer: val });
                      else setLokalAntallTimer(val);
                    }}
                    className="w-16 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-center text-xs font-bold text-white"
                  />
                  <span className="text-xs text-slate-400">t @ {timeprisUt} kr/t</span>
                  <span className="text-[11px] text-slate-500">(selvkost:</span>
                  <input
                    type="number"
                    min="0"
                    value={timeSelvkost}
                    onChange={(e) => {
                      const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                      if (projectCtx) projectCtx.oppdaterTimeverk({ timeSelvkost: val });
                      else setLokalTimeSelvkost(val);
                    }}
                    className="w-14 rounded border border-slate-700 bg-slate-900 px-1 py-0.5 text-center text-xs text-slate-300"
                    title="Selvkost rørlegger kr/t"
                  />
                  <span className="text-[11px] text-slate-500">kr)</span>
                </div>
                <div className="text-xs font-bold text-emerald-400">
                  Sum: {timerSum.toLocaleString('no-NO')} kr
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 flex items-center justify-between">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={systemRabattAktiv}
                    onChange={() => {
                      if (projectCtx) projectCtx.settSystemRabattAktiv(!systemRabattAktiv);
                      else setLokalSystemRabatt(!systemRabattAktiv);
                    }}
                    className="h-4 w-4 rounded text-blue-600"
                  />
                  <div>
                    <span className="text-xs font-bold text-white block">
                      🛡️ Kirsebærplukker-skjold (5 % samlet rabatt)
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      Trekkes kun fra ved samlet bestilling av anlegget.
                    </span>
                  </div>
                </label>
                <span className="text-xs font-bold text-amber-400">
                  {systemRabattAktiv ? `-${rabattBelop.toLocaleString('no-NO')} kr` : '0 kr'}
                </span>
              </div>
            </div>

            {/* Navigasjon frem og tilbake */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setAktivtSteg(1)}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700"
              >
                <ArrowLeft className="h-4 w-4" /> Tilbake til Steg 1
              </button>
              <button
                type="button"
                onClick={() => setAktivtSteg(3)}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg transition hover:bg-blue-500"
              >
                Gå til Steg 3: Ferdig Tilbud &amp; Bestilling <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* STEG 3: FERDIG TILBUD & BESTILLING (4 HANDLINGSKORT) */}
      {/* ============================================================== */}
      {aktivtSteg === 3 && (
        <div className="space-y-6">
          {/* Nøkkeltall for ferdig tilbud */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
            <h3 className="text-base font-bold text-white mb-4">
              Kalkyleresultat &amp; Prissammendrag
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <span className="text-xs text-slate-400 block">Materiell netto</span>
                <span className="text-lg font-bold text-slate-200">
                  {materiellNetto.toLocaleString('no-NO')} kr
                </span>
                <span className="text-[10px] text-slate-500 block">
                  Rabatt inkludert: -{rabattBelop.toLocaleString('no-NO')} kr
                </span>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <span className="text-xs text-slate-400 block">Rørleggertimer</span>
                <span className="text-lg font-bold text-slate-200">
                  {timerSum.toLocaleString('no-NO')} kr
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {antallTimer} timer @ {timeprisUt} kr/t
                </span>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <span className="text-xs text-slate-400 block">Total Tilbudssum</span>
                <span className="text-xl font-extrabold text-amber-400">
                  {totalInklMva.toLocaleString('no-NO')} kr
                </span>
                <span className="text-[10px] text-slate-400 block">
                  {totalEksMva.toLocaleString('no-NO')} kr eks. mva · DG: {totalDGProsent} %
                </span>
              </div>

              <div className="rounded-xl border border-emerald-900/60 bg-emerald-950/30 p-4">
                <span className="text-xs text-emerald-300 block font-semibold">
                  {prosjektType === 'rehab' ? 'Enova-støtte' : 'Prosjektstatus'}
                </span>
                <span className="text-lg font-extrabold text-emerald-400">
                  {prosjektType === 'rehab' ? '-10 000 kr' : 'TEK17'}
                </span>
                <span className="text-[10px] text-emerald-200 block">
                  {prosjektType === 'rehab'
                    ? `Netto for kunde: ${nettoInvesteringEtterEnova.toLocaleString('no-NO')} kr`
                    : 'Standard TEK17 energiramme'}
                </span>
              </div>
            </div>
          </div>

          {/* De 4 Tydelige Handlingskortene */}
          <div className="grid gap-5 md:grid-cols-2">
            {/* Kort 1: Bestill varer hos Ahlsell */}
            <div className="rounded-2xl border border-blue-900/60 bg-slate-900 p-6 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="rounded bg-blue-600 px-2.5 py-0.5 text-xs font-black uppercase text-white">
                    Handling 1
                  </span>
                  <span className="text-xs font-semibold text-blue-300">Infor M3 Hurtigordre</span>
                </div>
                <h4 className="text-lg font-bold text-white flex items-center gap-2">
                  <Download className="h-5 w-5 text-blue-400" />
                  Bestill varer hos Ahlsell
                </h4>
                <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                  Laster ned en ren CSV-fil med formatet <strong>NRF;Antall</strong> klar for direkte opplasting i Ahlsell Infor M3. Eliminerer manuell inntasting og feilbestillinger.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={eksporterCsvM3}
                  className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg transition hover:bg-blue-500"
                >
                  <Download className="h-4 w-4" /> Last ned Ahlsell M3 Hurtigordre (CSV)
                </button>
              </div>
            </div>

            {/* Kort 2: Overfør til eget system (ERP) */}
            <div className="rounded-2xl border border-indigo-900/60 bg-slate-900 p-6 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="rounded bg-indigo-600 px-2.5 py-0.5 text-xs font-black uppercase text-white">
                    Handling 2
                  </span>
                  <span className="text-xs font-semibold text-indigo-300">ERP &amp; Kalkyle</span>
                </div>
                <h4 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-indigo-400" />
                  Overfør til eget system
                </h4>
                <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                  Overfør kalkylen direkte til ditt økonomi- eller kalkyleprogram inkludert monterings- og rørleggertimer og 5 % systempakkerabatt.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-800 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={eksporterCsvTripletex}
                  className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white shadow transition hover:bg-indigo-500"
                >
                  <Download className="h-3.5 w-3.5" /> Tripletex (.csv)
                </button>
                <button
                  type="button"
                  onClick={eksporterCsvHolte}
                  className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-teal-700 px-3 py-2 text-xs font-bold text-white shadow transition hover:bg-teal-600"
                >
                  <Download className="h-3.5 w-3.5" /> Holte SmartKalk
                </button>
              </div>
            </div>

            {/* Kort 3: Tilbudsbrev til sluttkunde */}
            <div className="rounded-2xl border border-emerald-900/60 bg-slate-900 p-6 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="rounded bg-emerald-600 px-2.5 py-0.5 text-xs font-black uppercase text-white">
                    Handling 3
                  </span>
                  <span className="text-xs font-semibold text-emerald-300">
                    Kundetilbud med Enova
                  </span>
                </div>
                <h4 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileText className="h-5 w-5 text-emerald-400" />
                  Tilbudsbrev til sluttkunde
                </h4>
                <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                  Genererer et ferdig formulert, lettfattelig tilbudsbrev til sluttkunden med Enova-fradrag, spesifikasjon av leveranse, forbrukergarantier og fastpris.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-800 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={kopierTilbudsBrev}
                  className={`min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-white shadow transition ${
                    kopiertTilbudStatus
                      ? 'bg-emerald-600'
                      : 'bg-emerald-700 hover:bg-emerald-600'
                  }`}
                >
                  <Copy className="h-3.5 w-3.5" />
                  {kopiertTilbudStatus ? 'Kopiert!' : 'Kopier tekst'}
                </button>
                <button
                  type="button"
                  onClick={() => setVisTilbudBrevModal(true)}
                  className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-700"
                >
                  Forhåndsvis
                </button>
                <button
                  type="button"
                  onClick={() => setVisTilbudsPdfModal(true)}
                  className="col-span-2 min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-2 text-xs font-bold text-white shadow-lg transition hover:from-emerald-500 hover:to-teal-500"
                >
                  <Sparkles className="h-4 w-4" /> Generer A4 Tilbuds-PDF m/Logo
                </button>
              </div>
            </div>

            {/* Kort 4: Send til Mester for teknisk kontroll */}
            <div className="rounded-2xl border border-rose-900/60 bg-slate-900 p-6 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="rounded bg-rose-600 px-2.5 py-0.5 text-xs font-black uppercase text-white">
                    Handling 4
                  </span>
                  <span className="text-xs font-semibold text-rose-300">
                    Ingeniør- &amp; TEK17-sikring
                  </span>
                </div>
                <h4 className="text-lg font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-rose-400" />
                  Send til Mester for kontroll
                </h4>
                <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                  Trenger du kontroll av koter mot 900 mm-kravet, beregning av hydronisk innregulering eller signaturklare rapporter? Send saken rett til full ingeniørvisning.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={sendTilMesterForKontroll}
                  className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-700 to-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg transition hover:from-rose-600 hover:to-rose-500"
                >
                  <Send className="h-4 w-4" /> Send til Mester for teknisk kontroll
                </button>
              </div>
            </div>
          </div>

          {/* Tilbakeknapp */}
          <div className="flex justify-start pt-2">
            <button
              type="button"
              onClick={() => setAktivtSteg(2)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700"
            >
              <ArrowLeft className="h-4 w-4" /> Tilbake til Steg 2: Juster varer og timer
            </button>
          </div>
        </div>
      )}

      {/* Forhåndsvisning av tilbudsbrev modal */}
      {visTilbudBrevModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-emerald-400" />
                Ferdig formulert Tilbudsbrev
              </h3>
              <button
                type="button"
                onClick={() => setVisTilbudBrevModal(false)}
                className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-400 hover:text-white"
              >
                Lukk
              </button>
            </div>

            <pre className="mt-4 max-h-[60vh] overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
              {genererTilbudsBrev()}
            </pre>

            <div className="mt-5 flex flex-wrap items-center justify-end gap-2.5 border-t border-slate-800 pt-3">
              <button
                type="button"
                onClick={lastNedTilbudsBrev}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700"
              >
                <Download className="h-4 w-4" /> Last ned (.txt)
              </button>
              <button
                type="button"
                onClick={kopierTilbudsBrev}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 shadow"
              >
                <Copy className="h-4 w-4" /> {kopiertTilbudStatus ? 'Kopiert!' : 'Kopier tilbudstekst'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setVisTilbudBrevModal(false);
                  setVisTilbudsPdfModal(true);
                }}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-bold text-white hover:from-emerald-500 hover:to-teal-500 shadow"
              >
                <Sparkles className="h-4 w-4" /> Åpne A4 Tilbuds-PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* A4 Tilbuds-PDF Modal */}
      {visTilbudsPdfModal && (
        <TilbudsPdfModal
          prosjekt={prosjekt}
          items={items}
          company={companyProfile}
          antallTimer={antallTimer}
          timeprisUt={timeprisUt}
          systemRabattAktiv={systemRabattAktiv}
          prosjektType={prosjektType}
          isOpen={visTilbudsPdfModal}
          onClose={() => setVisTilbudsPdfModal(false)}
          melding={melding}
        />
      )}

      {/* VVS Tegnebrett Modal */}
      {visTegnebrettModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-3 backdrop-blur-md">
          <div className="relative flex max-h-[95vh] w-full max-w-6xl flex-col overflow-y-auto rounded-3xl border border-purple-500/40 bg-slate-950 p-4 shadow-2xl sm:p-6">
            <VvsTegnebrett
              prosjekt={prosjekt}
              onOppdaterProsjekt={onOppdaterProsjekt}
              onOverforTilKalkyle={(nyeVarer, oppsummering) => {
                if (onOppdaterOrdreItems) {
                  onOppdaterOrdreItems(nyeVarer);
                }
                setVisTegnebrettModal(false);
                setAktivtSteg(2);
                melding(`✅ ${oppsummering} Åpnet Steg 2.`);
              }}
              onLukk={() => setVisTegnebrettModal(false)}
              melding={melding}
            />
          </div>
        </div>
      )}
    </div>
  );
}
