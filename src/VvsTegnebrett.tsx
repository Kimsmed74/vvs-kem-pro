/**
 * VVS KEM PRO – Interaktivt VVS-Tegnebrett & Digital Rørskisse
 * Gjør det mulig å tegne rørstrekk (kaldt-, varmt-, varme- og avløpsvann),
 * plassere VVS-symboler, kalibrere målestokk, beregne rørmeter m/15 % svinn
 * og overføre oppmålte mengder direkte til prosjektets QA- og kalkylemotor.
 */

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Pencil,
  Ruler,
  Undo2,
  Trash2,
  Download,
  UploadCloud,
  CheckCircle,
  Grid,
  Send,
  Wrench,
} from 'lucide-react';
import type { ProsjektData } from './data/prosjekter';
import { useProject } from './context/ProjectContext';
import {
  type OrderItem,
  NRF_VAREKATALOG,
  beregnUtpris,
} from './lib/kalkyleKatalog';

// ============================================================================
// TYPER & DEFINISJONER
// ============================================================================

export type RorType = 'kaldtvann' | 'varmtvann' | 'varme' | 'avlop';

export interface RorStil {
  farge: string;
  stroke: string;
  navn: string;
  dimensjon: string;
  tykkelse: number;
  nrf: string;
  tek17Krav: string;
}

export const ROR_STILER: Record<RorType, RorStil> = {
  kaldtvann: {
    farge: '#38bdf8', // sky-400
    stroke: '#0284c7',
    navn: 'Kaldtvann (KV)',
    dimensjon: '16x2.0 mm PEX-a rør-i-rør',
    tykkelse: 4,
    nrf: '5083703',
    tek17Krav: 'TEK17 § 15-5: Rør-i-rør med utskiftbarhet og overløp til sluk',
  },
  varmtvann: {
    farge: '#f87171', // red-400
    stroke: '#dc2626',
    navn: 'Varmtvann (VV)',
    dimensjon: '16x2.0 mm PEX-a rør-i-rør',
    tykkelse: 4,
    nrf: '5083703',
    tek17Krav: 'TEK17 § 15-5: Legionellasikring min. 60 °C ved tappepunkt',
  },
  varme: {
    farge: '#fb923c', // orange-400
    stroke: '#ea580c',
    navn: 'Varme / Gulvvarme',
    dimensjon: '16x2.0 mm diffusjonstett PEX',
    tykkelse: 4,
    nrf: '8370003',
    tek17Krav: 'TEK17 § 14-4 & NS-EN 1264: Senteravstand 150–200 mm i oppholdsrom',
  },
  avlop: {
    farge: '#c084fc', // purple-400
    stroke: '#9333ea',
    navn: 'Avløp (Spillvann)',
    dimensjon: 'PP 110/75/50 mm lyddempet',
    tykkelse: 6,
    nrf: '2213133',
    tek17Krav: 'TEK17 § 15-7: Min. 1:50 (20 ‰) fall på stikkledninger',
  },
};

export type SymbolType =
  | 'wc'
  | 'servant'
  | 'sluk'
  | 'fordelerskap'
  | 'varmepumpe'
  | 'radiator'
  | 'ventil';

export interface VvsSymbolDef {
  type: SymbolType;
  tittel: string;
  kort: string;
  ikon: string;
  farge: string;
  bgFarge: string;
  borderFarge: string;
  nrf: string;
  beskrivelse: string;
}

export const VVS_SYMBOLER: Record<SymbolType, VvsSymbolDef> = {
  wc: {
    type: 'wc',
    tittel: 'WC / Toalett',
    kort: 'WC',
    ikon: '🚽',
    farge: '#38bdf8',
    bgFarge: 'bg-sky-950/80',
    borderFarge: 'border-sky-500',
    nrf: '6190013',
    beskrivelse: 'Geberit Duofix Vegghengt WC-sisterne',
  },
  servant: {
    type: 'servant',
    tittel: 'Servant / Håndvask',
    kort: 'SERV',
    ikon: '🚰',
    farge: '#2dd4bf',
    bgFarge: 'bg-teal-950/80',
    borderFarge: 'border-teal-500',
    nrf: '4290154',
    beskrivelse: 'Porsgrund Glow servant m/underskap',
  },
  sluk: {
    type: 'sluk',
    tittel: 'Sluk (Gulvsluk)',
    kort: 'SLUK',
    ikon: '🛡️',
    farge: '#60a5fa',
    bgFarge: 'bg-blue-950/80',
    borderFarge: 'border-blue-500',
    nrf: '3401202',
    beskrivelse: 'Joti K-sluk med klemring og vannlås',
  },
  fordelerskap: {
    type: 'fordelerskap',
    tittel: 'Fordelerskap',
    kort: 'FSKAP',
    ikon: '📦',
    farge: '#f59e0b',
    bgFarge: 'bg-amber-950/80',
    borderFarge: 'border-amber-500',
    nrf: '5118712',
    beskrivelse: 'Roth fordelerskap universal 550mm m/ramme',
  },
  varmepumpe: {
    type: 'varmepumpe',
    tittel: 'Varmepumpe',
    kort: 'VP',
    ikon: '♨️',
    farge: '#ef4444',
    bgFarge: 'bg-rose-950/80',
    borderFarge: 'border-rose-500',
    nrf: '8361001',
    beskrivelse: 'Luft-vann varmepumpe systempakke 8 kW',
  },
  radiator: {
    type: 'radiator',
    tittel: 'Radiator',
    kort: 'RAD',
    ikon: '🔲',
    farge: '#fb923c',
    bgFarge: 'bg-orange-950/80',
    borderFarge: 'border-orange-500',
    nrf: '8370781',
    beskrivelse: 'Radiator med termostatventil',
  },
  ventil: {
    type: 'ventil',
    tittel: 'Kuleventil / Stoppekran',
    kort: 'VENT',
    ikon: '🛑',
    farge: '#eab308',
    bgFarge: 'bg-yellow-950/80',
    borderFarge: 'border-yellow-500',
    nrf: '5621414',
    beskrivelse: 'Cimberio kuleventil 3/4" m/hendel',
  },
};

export interface Punkt {
  x: number;
  y: number;
}

export interface TegnetRor {
  id: string;
  type: RorType;
  punkter: Punkt[];
  lengdeMeter: number;
  lengdeMedSvinn: number;
}

export interface PlassertSymbol {
  id: string;
  type: SymbolType;
  x: number;
  y: number;
  merknad?: string;
}

export interface TegneTekst {
  id: string;
  x: number;
  y: number;
  tekst: string;
}

export interface TegningState {
  ror: TegnetRor[];
  symboler: PlassertSymbol[];
  tekster: TegneTekst[];
}

export type VerktoyType = 'ror' | 'symbol' | 'tekst' | 'viskelaer' | 'linjal';

export interface VvsTegnebrettProps {
  prosjekt?: ProsjektData;
  onOppdaterProsjekt?: (p: ProsjektData, endringer?: string[]) => void;
  onOverforTilKalkyle?: (nyeVarer: OrderItem[], oppsummering: string) => void;
  onLukk?: () => void;
  melding?: (tekst: string) => void;
}

// Lerretets standardstørrelse i SVG-koordinater
const CANVAS_WIDTH = 1400;
const CANVAS_HEIGHT = 850;
const STANDARD_PX_PR_METER = 40; // 40 piksler per meter

// ============================================================================
// HOVEDKOMPONENT
// ============================================================================

export default function VvsTegnebrett({
  prosjekt: propProsjekt,
  onOppdaterProsjekt: propOnOppdaterProsjekt,
  onOverforTilKalkyle,
  onLukk,
  melding: propMelding,
}: VvsTegnebrettProps) {
  // Koble til prosjektkontekst dersom tilgjengelig
  const projectCtx = useProject();
  const aktivtProsjekt = propProsjekt || projectCtx?.prosjekt;

  const melding = useCallback(
    (tekst: string) => {
      if (propMelding) {
        propMelding(tekst);
      }
    },
    [propMelding]
  );

  // Verktøy og moduser
  const [aktivtVerktoy, setAktivtVerktoy] = useState<VerktoyType>('ror');
  const [valgtRorType, setValgtRorType] = useState<RorType>('kaldtvann');
  const [valgtSymbolType, setValgtSymbolType] = useState<SymbolType>('wc');
  const [snap90Grader, setSnap90Grader] = useState<boolean>(true);
  const [visRutenett, setVisRutenett] = useState<boolean>(true);

  // Målestokk
  const [pxPrMeter, setPxPrMeter] = useState<number>(STANDARD_PX_PR_METER);
  const [kalibrerer, setKalibrerer] = useState<boolean>(false);
  const [kalibreringsStart, setKalibreringsStart] = useState<Punkt | null>(null);
  const [kalibreringsSlutt, setKalibreringsSlutt] = useState<Punkt | null>(null);
  const [visKalibrerModal, setVisKalibrerModal] = useState<boolean>(false);
  const [onsketMeterInput, setOnsketMeterInput] = useState<string>('2.5');

  // Bakgrunnsbilde
  const [bakgrunnsBildeUrl, setBakgrunnsBildeUrl] = useState<string | null>(null);
  const [bakgrunnsBildeNavn, setBakgrunnsBildeNavn] = useState<string | null>(null);
  const filInputRef = useRef<HTMLInputElement>(null);

  // Tegningens tilstand og historikk for Undo
  const [tegning, setTegning] = useState<TegningState>({
    ror: [],
    symboler: [],
    tekster: [],
  });
  const [historikk, setHistorikk] = useState<TegningState[]>([]);

  // Aktiv tegning (under drag/klikk)
  const [aktivLinjePunkter, setAktivLinjePunkter] = useState<Punkt[]>([]);
  const [musePosisjon, setMusePosisjon] = useState<Punkt | null>(null);

  // Notat-input modal / dialog
  const [notatPosisjon, setNotatPosisjon] = useState<Punkt | null>(null);
  const [notatTekst, setNotatTekst] = useState<string>('');

  // Suksess-feedback for overføring
  const [overfortSuksess, setOverfortSuksess] = useState<string | null>(null);

  // SVG referanse for koordinatberegning
  const svgRef = useRef<SVGSVGElement>(null);

  // Lagre tilstand i historikk før endring (for Undo)
  const leggTilHistorikk = useCallback((nyTilstand: TegningState) => {
    setHistorikk((prev) => [...prev.slice(-20), tegning]);
    setTegning(nyTilstand);
  }, [tegning]);

  const handleUndo = useCallback(() => {
    if (historikk.length === 0) return;
    const forrige = historikk[historikk.length - 1];
    setHistorikk((prev) => prev.slice(0, -1));
    setTegning(forrige);
    melding('↩️ Angret siste handling');
  }, [historikk, melding]);

  const handleNullstill = useCallback(() => {
    if (tegning.ror.length === 0 && tegning.symboler.length === 0 && tegning.tekster.length === 0) {
      return;
    }
    if (window.confirm('Er du sikker på at du vil tømme hele tegnebrettet?')) {
      leggTilHistorikk({ ror: [], symboler: [], tekster: [] });
      setAktivLinjePunkter([]);
      melding('🗑️ Tegnebrettet er tømt');
    }
  }, [tegning, leggTilHistorikk, melding]);

  // Tastatursnarveier (Undo: Ctrl+Z / Cmd+Z, Escape for å avbryte linje)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      } else if (e.key === 'Escape') {
        setAktivLinjePunkter([]);
        setKalibreringsStart(null);
        setKalibreringsSlutt(null);
        setKalibrerer(false);
        setNotatPosisjon(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo]);

  // Konverter muse-/touchhendelse til SVG-koordinater
  const finnSvgPunkt = useCallback((e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>): Punkt | null => {
    if (!svgRef.current) return null;
    const ctm = svgRef.current.getScreenCTM();
    if (!ctm) return null;

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length === 0 && 'changedTouches' in e && e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
      } else if (e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        return null;
      }
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const svgPoint = svgRef.current.createSVGPoint();
    svgPoint.x = clientX;
    svgPoint.y = clientY;
    const transformert = svgPoint.matrixTransform(ctm.inverse());

    return {
      x: Math.round(transformert.x),
      y: Math.round(transformert.y),
    };
  }, []);

  // Anvend 90 graders vinkel/snap dersom aktivert
  const justerSnapPunkt = useCallback((forrige: Punkt, gjeldende: Punkt): Punkt => {
    if (!snap90Grader) return gjeldende;
    const dx = Math.abs(gjeldende.x - forrige.x);
    const dy = Math.abs(gjeldende.y - forrige.y);

    if (dx >= dy) {
      // Horisontal linje
      return { x: gjeldende.x, y: forrige.y };
    } else {
      // Vertikal linje
      return { x: forrige.x, y: gjeldende.y };
    }
  }, [snap90Grader]);

  // Beregn lengde mellom to punkter
  const beregnAvstand = useCallback((p1: Punkt, p2: Punkt): number => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // Beregn samlet lengde for en serie punkter i meter (inkludert 15 % svinn/oppstikk)
  const beregnPolyLengde = useCallback(
    (punkter: Punkt[]): { rawMeter: number; medSvinnMeter: number } => {
      if (punkter.length < 2) return { rawMeter: 0, medSvinnMeter: 0 };
      let samletPixel = 0;
      for (let i = 1; i < punkter.length; i++) {
        samletPixel += beregnAvstand(punkter[i - 1], punkter[i]);
      }
      const rawMeter = Math.round((samletPixel / pxPrMeter) * 100) / 100;
      const medSvinnMeter = Math.round(rawMeter * 1.15 * 100) / 100;
      return { rawMeter, medSvinnMeter };
    },
    [beregnAvstand, pxPrMeter]
  );

  // Håndter klikk / touch på tegnebrettet
  const handleCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const pt = finnSvgPunkt(e);
    if (!pt) return;

    // 1. Målestokk-kalibrering
    if (aktivtVerktoy === 'linjal' || kalibrerer) {
      if (!kalibreringsStart) {
        setKalibreringsStart(pt);
      } else {
        setKalibreringsSlutt(pt);
        setVisKalibrerModal(true);
      }
      return;
    }

    // 2. Viskelær (slett nærmeste element innen 25 piksler)
    if (aktivtVerktoy === 'viskelaer') {
      // Sjekk symboler
      const slettetSymbolIndex = tegning.symboler.findIndex(
        (s) => beregnAvstand({ x: s.x, y: s.y }, pt) < 30
      );
      if (slettetSymbolIndex !== -1) {
        const nySymboler = [...tegning.symboler];
        nySymboler.splice(slettetSymbolIndex, 1);
        leggTilHistorikk({ ...tegning, symboler: nySymboler });
        melding('🗑️ Slettet symbol');
        return;
      }

      // Sjekk tekster
      const slettetTekstIndex = tegning.tekster.findIndex(
        (t) => beregnAvstand({ x: t.x, y: t.y }, pt) < 35
      );
      if (slettetTekstIndex !== -1) {
        const nyTekster = [...tegning.tekster];
        nyTekster.splice(slettetTekstIndex, 1);
        leggTilHistorikk({ ...tegning, tekster: nyTekster });
        melding('🗑️ Slettet notat');
        return;
      }

      // Sjekk rør
      const slettetRorIndex = tegning.ror.findIndex((r) =>
        r.punkter.some((rp) => beregnAvstand(rp, pt) < 25)
      );
      if (slettetRorIndex !== -1) {
        const nyRor = [...tegning.ror];
        nyRor.splice(slettetRorIndex, 1);
        leggTilHistorikk({ ...tegning, ror: nyRor });
        melding('🗑️ Slettet rørstrekk');
        return;
      }
      return;
    }

    // 3. Plasser symbol
    if (aktivtVerktoy === 'symbol') {
      const nyttSymbol: PlassertSymbol = {
        id: `sym-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: valgtSymbolType,
        x: pt.x,
        y: pt.y,
        merknad: VVS_SYMBOLER[valgtSymbolType].tittel,
      };
      leggTilHistorikk({
        ...tegning,
        symboler: [...tegning.symboler, nyttSymbol],
      });
      melding(`📍 Plassert ${VVS_SYMBOLER[valgtSymbolType].tittel}`);
      return;
    }

    // 4. Legg til tekstmerknad
    if (aktivtVerktoy === 'tekst') {
      setNotatPosisjon(pt);
      setNotatTekst('');
      return;
    }

    // 5. Rørtegning (klikk punkt for punkt)
    if (aktivtVerktoy === 'ror') {
      if (aktivLinjePunkter.length === 0) {
        // Start nytt rørstrekk
        setAktivLinjePunkter([pt]);
      } else {
        const siste = aktivLinjePunkter[aktivLinjePunkter.length - 1];
        const justert = justerSnapPunkt(siste, pt);

        // Dobbelklikk eller klikk svært nær siste punkt fullfører rørstrekket
        if (beregnAvstand(siste, justert) < 15) {
          fullforAktivtRor();
        } else {
          setAktivLinjePunkter((prev) => [...prev, justert]);
        }
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const pt = finnSvgPunkt(e);
    if (!pt) return;
    setMusePosisjon(pt);
  };

  // Fullfør pågående rørstrekk
  const fullforAktivtRor = () => {
    if (aktivLinjePunkter.length < 2) {
      setAktivLinjePunkter([]);
      return;
    }
    const { rawMeter, medSvinnMeter } = beregnPolyLengde(aktivLinjePunkter);
    if (rawMeter <= 0) {
      setAktivLinjePunkter([]);
      return;
    }

    const nyttRor: TegnetRor = {
      id: `ror-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: valgtRorType,
      punkter: aktivLinjePunkter,
      lengdeMeter: rawMeter,
      lengdeMedSvinn: medSvinnMeter,
    };

    leggTilHistorikk({
      ...tegning,
      ror: [...tegning.ror, nyttRor],
    });

    setAktivLinjePunkter([]);
    melding(
      `📏 Fullførte ${ROR_STILER[valgtRorType].navn}: ${rawMeter} m (+15 % svinn: ${medSvinnMeter} m)`
    );
  };

  // Bekreft oppmålt referansemålestokk
  const bekreftKalibrering = () => {
    if (!kalibreringsStart || !kalibreringsSlutt) return;
    const pixelLengde = beregnAvstand(kalibreringsStart, kalibreringsSlutt);
    const onsketM = parseFloat(onsketMeterInput.replace(',', '.'));

    if (isNaN(onsketM) || onsketM <= 0) {
      alert('Vennligst angi en gyldig meter-lengde (større enn 0).');
      return;
    }

    const nyPxPrMeter = Math.round((pixelLengde / onsketM) * 100) / 100;
    setPxPrMeter(nyPxPrMeter);

    // Oppdater alle eksisterende rør med den nye målestokken
    const oppdaterteRor = tegning.ror.map((r) => {
      let samletPixel = 0;
      for (let i = 1; i < r.punkter.length; i++) {
        samletPixel += beregnAvstand(r.punkter[i - 1], r.punkter[i]);
      }
      const rawMeter = Math.round((samletPixel / nyPxPrMeter) * 100) / 100;
      const medSvinnMeter = Math.round(rawMeter * 1.15 * 100) / 100;
      return { ...r, lengdeMeter: rawMeter, lengdeMedSvinn: medSvinnMeter };
    });

    setTegning((prev) => ({ ...prev, ror: oppdaterteRor }));
    setVisKalibrerModal(false);
    setKalibreringsStart(null);
    setKalibreringsSlutt(null);
    setKalibrerer(false);
    setAktivtVerktoy('ror');
    melding(`🎯 Målestokk kalibrert: ${nyPxPrMeter.toFixed(1)} px/meter (${onsketM} m)`);
  };

  // Last opp bakgrunnsbilde (PNG, JPG)
  const handleLastOppBilde = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Vennligst last opp en bildefil (PNG, JPG, SVG eller tegning).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      setBakgrunnsBildeUrl(url);
      setBakgrunnsBildeNavn(file.name);
      melding(`🖼️ Lastet inn plantegning: «${file.name}»`);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Lagre notattekst på brettet
  const lagreNotat = () => {
    if (!notatPosisjon || !notatTekst.trim()) {
      setNotatPosisjon(null);
      return;
    }
    const nyTekst: TegneTekst = {
      id: `txt-${Date.now()}`,
      x: notatPosisjon.x,
      y: notatPosisjon.y,
      tekst: notatTekst.trim(),
    };
    leggTilHistorikk({
      ...tegning,
      tekster: [...tegning.tekster, nyTekst],
    });
    setNotatPosisjon(null);
    setNotatTekst('');
    melding('📝 Notat lagt til på tegningen');
  };

  // Last ned tegningen som PNG
  const handleLastNedPng = () => {
    if (!svgRef.current) return;
    const svgEl = svgRef.current;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgEl);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const URL = window.URL || window.webkitURL || window;
    const blobURL = URL.createObjectURL(svgBlob);

    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = CANVAS_WIDTH;
      canvas.height = CANVAS_HEIGHT;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Bakgrunn
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0);

      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      const safeName = (aktivtProsjekt?.navn || 'prosjekt')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-');
      downloadLink.download = `${safeName}-vvs-skisse.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(blobURL);
      melding('📥 Lastet ned tegning som PNG');
    };
    image.src = blobURL;
  };

  // ==========================================================================
  // OPPSUMMERING & MENGDEBEREGNING
  // ==========================================================================

  // 1. Symbolopptelling
  const symbolOpptelling = useMemo(() => {
    const counts: Record<SymbolType, number> = {
      wc: 0,
      servant: 0,
      sluk: 0,
      fordelerskap: 0,
      varmepumpe: 0,
      radiator: 0,
      ventil: 0,
    };
    for (const s of tegning.symboler) {
      if (counts[s.type] !== undefined) {
        counts[s.type]++;
      }
    }
    return counts;
  }, [tegning.symboler]);

  // 2. Rørmeter per rørtype (rå + 15 % svinn)
  const rorOppsummering = useMemo(() => {
    const summary: Record<RorType, { rawMeter: number; medSvinn: number; antallStrekk: number }> = {
      kaldtvann: { rawMeter: 0, medSvinn: 0, antallStrekk: 0 },
      varmtvann: { rawMeter: 0, medSvinn: 0, antallStrekk: 0 },
      varme: { rawMeter: 0, medSvinn: 0, antallStrekk: 0 },
      avlop: { rawMeter: 0, medSvinn: 0, antallStrekk: 0 },
    };

    for (const r of tegning.ror) {
      summary[r.type].rawMeter += r.lengdeMeter;
      summary[r.type].medSvinn += r.lengdeMedSvinn;
      summary[r.type].antallStrekk++;
    }

    const totalRawMeter = Math.round(
      (summary.kaldtvann.rawMeter +
        summary.varmtvann.rawMeter +
        summary.varme.rawMeter +
        summary.avlop.rawMeter) *
        100
    ) / 100;

    const totalMedSvinn = Math.round(
      (summary.kaldtvann.medSvinn +
        summary.varmtvann.medSvinn +
        summary.varme.medSvinn +
        summary.avlop.medSvinn) *
        100
    ) / 100;

    // Klammerberegning: 1 klammer per 0.6 m PEX (kaldt, varmt, varme), 1 klammer per 0.8 m avløp
    const pexMeter = summary.kaldtvann.medSvinn + summary.varmtvann.medSvinn + summary.varme.medSvinn;
    const avlopMeter = summary.avlop.medSvinn;
    const estimertKlammer =
      pexMeter + avlopMeter > 0
        ? Math.max(8, Math.ceil(pexMeter / 0.6 + avlopMeter / 0.8))
        : 0;

    return {
      summary,
      totalRawMeter,
      totalMedSvinn,
      estimertKlammer,
    };
  }, [tegning.ror]);

  // ==========================================================================
  // SEND TIL QA & KALKYLE
  // ==========================================================================
  const handleSendTilKalkyle = () => {
    const nyeVarer: OrderItem[] = [];
    let nextId = Date.now();

    const leggTil = (
      nrf: string,
      antall: number,
      kategoriOverstyring?: 'Lokkeand' | 'Mester-tillegg'
    ) => {
      if (antall <= 0) return;
      const info = NRF_VAREKATALOG[nrf];
      if (!info) return;

      nyeVarer.push({
        id: nextId++,
        nrf,
        beskrivelse: info.beskrivelse,
        antall: Math.round(antall),
        enhet: info.enhet,
        innpris: info.innpris,
        kategori: kategoriOverstyring || info.kategori,
      });
    };

    // 1. Sanitærutstyr
    if (symbolOpptelling.wc > 0) leggTil('6190013', symbolOpptelling.wc); // Geberit WC
    if (symbolOpptelling.servant > 0) leggTil('4290154', symbolOpptelling.servant); // Servant
    if (symbolOpptelling.sluk > 0) leggTil('3401202', symbolOpptelling.sluk); // Joti sluk
    if (symbolOpptelling.fordelerskap > 0) leggTil('5118712', symbolOpptelling.fordelerskap); // Fordelerskap
    if (symbolOpptelling.varmepumpe > 0) leggTil('8361001', symbolOpptelling.varmepumpe); // Varmepumpe 8kW
    if (symbolOpptelling.radiator > 0) leggTil('8370781', symbolOpptelling.radiator); // Radiator/styring
    if (symbolOpptelling.ventil > 0) leggTil('5621414', symbolOpptelling.ventil); // Kuleventil

    // 2. Veggbokser (QuickBox): 1 per WC, 2 per servant
    const veggbokser = symbolOpptelling.wc * 1 + symbolOpptelling.servant * 2;
    if (veggbokser > 0) {
      leggTil('5118805', veggbokser);
    }

    // 3. Rørmengder (inkl. 15 % svinn/oppstikk)
    const pexTappevannMeter = Math.ceil(
      rorOppsummering.summary.kaldtvann.medSvinn + rorOppsummering.summary.varmtvann.medSvinn
    );
    if (pexTappevannMeter > 0) {
      leggTil('5083703', pexTappevannMeter); // MultiPex 16mm
    }

    const varmeMeter = Math.ceil(rorOppsummering.summary.varme.medSvinn);
    if (varmeMeter > 0) {
      leggTil('8370003', varmeMeter); // Gulvvarmerør 16mm
    }

    const avlopMeter = Math.ceil(rorOppsummering.summary.avlop.medSvinn);
    if (avlopMeter > 0) {
      leggTil('2213133', avlopMeter); // PP Avløpsrør
    }

    // 4. Klammerbehov
    if (rorOppsummering.estimertKlammer > 0) {
      leggTil('5083812', rorOppsummering.estimertKlammer); // Klammer 16-20mm
    }

    if (nyeVarer.length === 0) {
      alert('Ingen rørstrekk eller VVS-symboler er tegnet inn ennå. Tegn rør eller plasser utstyr først.');
      return;
    }

    const totalSum = nyeVarer.reduce(
      (acc, v) => acc + beregnUtpris(v.innpris, v.kategori) * v.antall,
      0
    );

    const meldingTekst = `🎨 Overførte ${nyeVarer.length} poster (${rorOppsummering.totalMedSvinn} m rør inkl. 15 % svinn og ${tegning.symboler.length} symboler) til QA & Kalkyle!`;

    // 1. Kall prop hvis definert
    if (onOverforTilKalkyle) {
      onOverforTilKalkyle(nyeVarer, meldingTekst);
    }

    // 2. Oppdater ProjectContext direkte dersom tilgjengelig
    if (projectCtx) {
      projectCtx.settVareliste((eksisterende: OrderItem[]) => {
        // Flett inn nye varer, oppdater antall for like NRF
        const oppdatert = [...eksisterende];
        for (const ny of nyeVarer) {
          const matchIndex = oppdatert.findIndex((v) => v.nrf === ny.nrf);
          if (matchIndex !== -1) {
            oppdatert[matchIndex] = {
              ...oppdatert[matchIndex],
              antall: oppdatert[matchIndex].antall + ny.antall,
            };
          } else {
            oppdatert.push(ny);
          }
        }
        return oppdatert;
      });

      // Oppdater prosjektets sanitærutstyr-tall slik at q_n og q_s oppdateres
      if (projectCtx.prosjekt) {
        const gjeldende = projectCtx.prosjekt.sanitaerUtstyr;
        const wcAntall = (gjeldende?.wc?.antall || 0) + symbolOpptelling.wc;
        const servantAntall = (gjeldende?.servant?.antall || 0) + symbolOpptelling.servant;
        const sumQn = Math.round(((gjeldende?.sumQn || 0) + symbolOpptelling.wc * 0.1 + symbolOpptelling.servant * 0.1) * 100) / 100;
        const sumDu = Math.round(((gjeldende?.sumDu || 0) + symbolOpptelling.wc * 1.0 + symbolOpptelling.servant * 0.5) * 10) / 10;
        const qsLPrS = Math.round(0.17 * Math.pow(Math.max(0.1, sumQn), 0.45) * 100) / 100;

        const nyttSanitaer = {
          wc: { antall: wcAntall, qnLPrS: 0.1, du: 1.0 },
          servant: { antall: servantAntall, qnLPrS: 0.1, du: 0.5 },
          urinal: gjeldende?.urinal ?? { antall: 0, qnLPrS: 0.1, du: 0.5 },
          dusj: gjeldende?.dusj ?? { antall: 0, qnLPrS: 0.2, du: 0.8 },
          kjokkenvask: gjeldende?.kjokkenvask ?? { antall: 0, qnLPrS: 0.2, du: 0.8 },
          oppvaskmaskin: gjeldende?.oppvaskmaskin ?? { antall: 0, qnLPrS: 0.15, du: 0.8 },
          badekar: gjeldende?.badekar,
          vaskemaskin: gjeldende?.vaskemaskin,
          utslagsvask: gjeldende?.utslagsvask,
          andre: gjeldende?.andre,
          sumQn,
          sumDu,
          qsLPrS,
        };
        projectCtx.oppdaterProsjekt({
          ...projectCtx.prosjekt,
          sanitaerUtstyr: nyttSanitaer,
        }, ['Oppdatert sanitærutstyr fra VVS-tegnebrett']);
      }
    } else if (propOnOppdaterProsjekt && aktivtProsjekt) {
      propOnOppdaterProsjekt(aktivtProsjekt, ['Oppdatert fra VVS Tegnebrett']);
    }

    setOverfortSuksess(
      `✅ Overførte ${nyeVarer.length} vareposter til kalkylen (${totalSum.toLocaleString('no-NO')} kr eks. mva).`
    );
    melding(meldingTekst);
  };

  return (
    <div className="flex flex-col gap-4 text-slate-100">
      {/* ==================================================================== */}
      {/* HEADER & TOPP-HANDLINGER */}
      {/* ==================================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-purple-500/40 bg-purple-950/60 text-xl font-bold text-purple-300 shadow-inner">
            🎨
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black tracking-tight text-white sm:text-lg">
                VVS Tegnebrett & Digital Rørskisse
              </h2>
              <span className="rounded-md border border-purple-600/40 bg-purple-950/80 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-purple-300">
                TEK17 · RØR-I-RØR
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Tegn rørstrekk, plasser utstyr, kalibrer målestokk og overfør ferdig oppmålte mengder (+15 % svinn) rett til QA & Kalkyle.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Målestokk-knapp / Kalibrering */}
          <button
            type="button"
            onClick={() => {
              setAktivtVerktoy('linjal');
              setKalibrerer(true);
              setKalibreringsStart(null);
              setKalibreringsSlutt(null);
              melding('📏 Klikk på start- og sluttpunkt for en kjent vegg eller dør (f.eks. 2,5 m)');
            }}
            className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition shadow ${
              aktivtVerktoy === 'linjal' || kalibrerer
                ? 'border-cyan-400 bg-cyan-950 text-cyan-200 ring-2 ring-cyan-500/50'
                : 'border-slate-700 bg-slate-800 text-slate-200 hover:border-cyan-500 hover:text-white'
            }`}
          >
            <Ruler className="h-4 w-4 text-cyan-400" />
            <span>Målestokk ({pxPrMeter.toFixed(0)} px/m)</span>
          </button>

          {/* Last opp bakgrunnsbilde */}
          <button
            type="button"
            onClick={() => filInputRef.current?.click()}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-bold text-slate-200 hover:border-slate-500 hover:text-white transition"
          >
            <UploadCloud className="h-4 w-4 text-emerald-400" />
            <span>{bakgrunnsBildeNavn ? 'Bytt plantegning' : 'Last opp plantegning'}</span>
          </button>
          <input
            ref={filInputRef}
            type="file"
            accept="image/*,.png,.jpg,.jpeg,.svg"
            className="hidden"
            onChange={handleLastOppBilde}
          />

          {/* Angre (Undo) */}
          <button
            type="button"
            disabled={historikk.length === 0}
            onClick={handleUndo}
            title="Angre siste handling (Ctrl+Z)"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <Undo2 className="h-4 w-4" />
            <span>Angre</span>
          </button>

          {/* Nullstill */}
          <button
            type="button"
            onClick={handleNullstill}
            title="Tøm tegnebrett"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-rose-900/60 bg-rose-950/40 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-900/60 transition"
          >
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">Tøm brett</span>
          </button>

          {/* Last ned PNG */}
          <button
            type="button"
            onClick={handleLastNedPng}
            title="Last ned som PNG-bilde"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 transition"
          >
            <Download className="h-4 w-4 text-sky-400" />
            <span className="hidden sm:inline">Last ned bilde</span>
          </button>

          {/* Hovedhandling: Send til QA & Kalkyle */}
          <button
            type="button"
            onClick={handleSendTilKalkyle}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-extrabold text-white shadow-lg hover:from-emerald-500 hover:to-teal-500 transition ring-1 ring-emerald-400/40 active:scale-95"
          >
            <Send className="h-4 w-4" />
            <span>Send tegning til QA & Kalkyle</span>
          </button>

          {onLukk && (
            <button
              type="button"
              onClick={onLukk}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Suksessbanner dersom nylig overført */}
      {overfortSuksess && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/40 bg-emerald-950/70 p-3.5 text-xs font-bold text-emerald-200 shadow-md">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
            <span>{overfortSuksess}</span>
          </div>
          <button
            type="button"
            onClick={() => setOverfortSuksess(null)}
            className="text-emerald-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* ==================================================================== */}
      {/* VERKTØYLINJE (RØR, SYMBOLER, INNSTILLINGER) */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        {/* Kolonne 1: Rørverktøy (Kaldt, Varmt, Varme, Avløp) */}
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/80 p-3 lg:col-span-6">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-2 flex items-center gap-1.5">
            <Pencil className="h-3.5 w-3.5 text-sky-400" />
            <span>Rørstrekk:</span>
          </div>
          {(['kaldtvann', 'varmtvann', 'varme', 'avlop'] as RorType[]).map((type) => {
            const stil = ROR_STILER[type];
            const erValgt = aktivtVerktoy === 'ror' && valgtRorType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setAktivtVerktoy('ror');
                  setValgtRorType(type);
                }}
                className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                  erValgt
                    ? 'border-white text-white shadow-md ring-2 ring-emerald-500/60'
                    : 'border-slate-800 bg-slate-950/70 text-slate-300 hover:border-slate-600'
                }`}
                style={{
                  backgroundColor: erValgt ? stil.stroke : undefined,
                }}
              >
                <span
                  className="h-3 w-3 rounded-full border border-white/50"
                  style={{ backgroundColor: stil.farge }}
                />
                <span>{stil.navn}</span>
              </button>
            );
          })}
        </div>

        {/* Kolonne 2: Symboler */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/80 p-3 lg:col-span-6">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
            <Wrench className="h-3.5 w-3.5 text-amber-400" />
            <span>Symboler:</span>
          </div>
          {(['wc', 'servant', 'sluk', 'fordelerskap', 'varmepumpe', 'radiator', 'ventil'] as SymbolType[]).map((st) => {
            const sym = VVS_SYMBOLER[st];
            const erValgt = aktivtVerktoy === 'symbol' && valgtSymbolType === st;
            return (
              <button
                key={st}
                type="button"
                onClick={() => {
                  setAktivtVerktoy('symbol');
                  setValgtSymbolType(st);
                }}
                title={sym.beskrivelse}
                className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-bold transition ${
                  erValgt
                    ? `${sym.borderFarge} ${sym.bgFarge} text-white ring-2 ring-emerald-500/50 shadow-md`
                    : 'border-slate-800 bg-slate-950/70 text-slate-300 hover:border-slate-600'
                }`}
              >
                <span>{sym.ikon}</span>
                <span>{sym.kort}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Ekstra kontroller: Snap, Rutenett, Notat, Viskelær */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800/80 bg-slate-950/70 px-4 py-2.5 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Tekstnotat-knapp */}
          <button
            type="button"
            onClick={() => setAktivtVerktoy('tekst')}
            className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border px-3 py-1.5 font-bold transition ${
              aktivtVerktoy === 'tekst'
                ? 'border-indigo-400 bg-indigo-950 text-indigo-200'
                : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500'
            }`}
          >
            <span>📝</span>
            <span>Notat / Tekst</span>
          </button>

          {/* Viskelær-knapp */}
          <button
            type="button"
            onClick={() => setAktivtVerktoy('viskelaer')}
            className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border px-3 py-1.5 font-bold transition ${
              aktivtVerktoy === 'viskelaer'
                ? 'border-rose-400 bg-rose-950 text-rose-200'
                : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500'
            }`}
          >
            <Trash2 className="h-3.5 w-3.5 text-rose-400" />
            <span>Viskelær</span>
          </button>

          {/* 90-graders ortogonal snap */}
          <button
            type="button"
            onClick={() => setSnap90Grader((prev) => !prev)}
            className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border px-3 py-1.5 font-bold transition ${
              snap90Grader
                ? 'border-emerald-500 bg-emerald-950/60 text-emerald-300'
                : 'border-slate-700 bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>📐 Rettvinklet snap (90°): {snap90Grader ? 'PÅ' : 'AV'}</span>
          </button>

          {/* Rutenett visning */}
          <button
            type="button"
            onClick={() => setVisRutenett((prev) => !prev)}
            className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border px-3 py-1.5 font-bold transition ${
              visRutenett
                ? 'border-sky-500 bg-sky-950/60 text-sky-300'
                : 'border-slate-700 bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Grid className="h-3.5 w-3.5" />
            <span>Rutenett: {visRutenett ? 'PÅ' : 'AV'}</span>
          </button>
        </div>

        {/* Info om aktivt rør under tegning */}
        {aktivLinjePunkter.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="animate-pulse text-emerald-400 font-extrabold">
              ● Tegner rør ({aktivLinjePunkter.length} punkter)
            </span>
            <button
              type="button"
              onClick={fullforAktivtRor}
              className="inline-flex min-h-[36px] items-center rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow hover:bg-emerald-500"
            >
              ✓ Fullfør rørstrekk (eller dobbelklikk)
            </button>
            <button
              type="button"
              onClick={() => setAktivLinjePunkter([])}
              className="inline-flex min-h-[36px] items-center rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-300 hover:bg-slate-700"
            >
              Avbryt (Esc)
            </button>
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* TEGNEBRETT LERRET (SVG INTERAKTIV VISNING) */}
      {/* ==================================================================== */}
      <div className="relative w-full overflow-hidden rounded-2xl border-2 border-slate-700 bg-slate-950 shadow-2xl">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
          className="h-auto max-h-[75vh] w-full cursor-crosshair select-none touch-none"
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
        >
          {/* DEFINISJONER FOR RUTENETT OG PILER */}
          <defs>
            {/* Mindre 20px rutenett */}
            <pattern id="smallGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.8" />
            </pattern>
            {/* Større 100px rutenett (100 px = 2.5m ved standard 40 px/m) */}
            <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
              <rect width="100" height="100" fill="url(#smallGrid)" />
              <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#334155" strokeWidth="1.5" />
            </pattern>
          </defs>

          {/* 1. BAKGRUNNSBILDE ELLER RUTENETT */}
          {bakgrunnsBildeUrl ? (
            <image
              href={bakgrunnsBildeUrl}
              x="0"
              y="0"
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              preserveAspectRatio="xMidYMid meet"
              opacity="0.85"
            />
          ) : (
            visRutenett && (
              <rect width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill="url(#grid)" />
            )
          )}

          {/* 2. TEGNEDE RØRSTREKK */}
          {tegning.ror.map((ror) => {
            const stil = ROR_STILER[ror.type];
            const punkterStr = ror.punkter.map((p) => `${p.x},${p.y}`).join(' ');

            // Finn midtpunkt for å plassere lengdemerke
            const midtIndex = Math.floor(ror.punkter.length / 2);
            const midtPunkt = ror.punkter[midtIndex] || ror.punkter[0];

            return (
              <g key={ror.id} className="cursor-pointer group">
                {/* Rørlinje */}
                <polyline
                  points={punkterStr}
                  fill="none"
                  stroke={stil.farge}
                  strokeWidth={stil.tykkelse}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition duration-150 group-hover:stroke-white"
                />

                {/* Rørledningsledd / noder */}
                {ror.punkter.map((p, idx) => (
                  <circle
                    key={idx}
                    cx={p.x}
                    cy={p.y}
                    r={stil.tykkelse / 2 + 2}
                    fill={stil.farge}
                    stroke="#0f172a"
                    strokeWidth="1.5"
                  />
                ))}

                {/* Lengdemerke på røret (m/15 % svinn) */}
                {midtPunkt && (
                  <g transform={`translate(${midtPunkt.x + 8}, ${midtPunkt.y - 12})`}>
                    <rect
                      x="-4"
                      y="-12"
                      width="92"
                      height="20"
                      rx="4"
                      fill="#020617"
                      stroke={stil.farge}
                      strokeWidth="1"
                      opacity="0.9"
                    />
                    <text
                      x="42"
                      y="2"
                      fill="#f8fafc"
                      fontSize="10"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {ror.lengdeMedSvinn.toFixed(1)} m (+15 %)
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* 3. PÅGÅENDE AKTIVT RØRSTREKK (UNDER TEGNING) */}
          {aktivLinjePunkter.length > 0 && (
            <g>
              {/* Eksisterende punkter */}
              <polyline
                points={aktivLinjePunkter.map((p) => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke={ROR_STILER[valgtRorType].farge}
                strokeWidth={ROR_STILER[valgtRorType].tykkelse}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Forhåndsvisningslinje mot museposisjon */}
              {musePosisjon && (
                (() => {
                  const siste = aktivLinjePunkter[aktivLinjePunkter.length - 1];
                  const snapPt = justerSnapPunkt(siste, musePosisjon);
                  const avstand = beregnAvstand(siste, snapPt);
                  const meter = Math.round((avstand / pxPrMeter) * 10) / 10;
                  return (
                    <>
                      <line
                        x1={siste.x}
                        y1={siste.y}
                        x2={snapPt.x}
                        y2={snapPt.y}
                        stroke={ROR_STILER[valgtRorType].farge}
                        strokeWidth={ROR_STILER[valgtRorType].tykkelse}
                        strokeDasharray="6,4"
                        strokeLinecap="round"
                      />
                      <circle
                        cx={snapPt.x}
                        cy={snapPt.y}
                        r="6"
                        fill={ROR_STILER[valgtRorType].farge}
                        stroke="#ffffff"
                        strokeWidth="2"
                      />
                      {/* Live meter-indikator */}
                      <g transform={`translate(${snapPt.x + 12}, ${snapPt.y - 12})`}>
                        <rect
                          x="0"
                          y="-14"
                          width="60"
                          height="20"
                          rx="4"
                          fill="#020617"
                          stroke={ROR_STILER[valgtRorType].farge}
                          strokeWidth="1"
                        />
                        <text
                          x="30"
                          y="0"
                          fill="#ffffff"
                          fontSize="11"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          {meter} m
                        </text>
                      </g>
                    </>
                  );
                })()
              )}
            </g>
          )}

          {/* 4. PLASSERTE VVS-SYMBOLER */}
          {tegning.symboler.map((sym) => {
            const def = VVS_SYMBOLER[sym.type];
            return (
              <g
                key={sym.id}
                transform={`translate(${sym.x}, ${sym.y})`}
                className="cursor-pointer group"
              >
                {/* Ytre sirkel/badge */}
                <circle
                  cx="0"
                  cy="0"
                  r="18"
                  fill="#020617"
                  stroke={def.farge}
                  strokeWidth="2.5"
                  className="transition duration-150 group-hover:scale-110"
                />
                {/* Ikon */}
                <text
                  x="0"
                  y="6"
                  fontSize="16"
                  textAnchor="middle"
                  className="pointer-events-none select-none"
                >
                  {def.ikon}
                </text>
                {/* Tekstetikett under symbolet */}
                <rect
                  x="-28"
                  y="22"
                  width="56"
                  height="16"
                  rx="3"
                  fill="#0f172a"
                  stroke={def.farge}
                  strokeWidth="1"
                  opacity="0.9"
                />
                <text
                  x="0"
                  y="33"
                  fill={def.farge}
                  fontSize="9"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {def.kort}
                </text>
              </g>
            );
          })}

          {/* 5. TEKSTNOTATER */}
          {tegning.tekster.map((txt) => (
            <g
              key={txt.id}
              transform={`translate(${txt.x}, ${txt.y})`}
              className="cursor-pointer group"
            >
              <rect
                x="-4"
                y="-18"
                width={Math.max(60, txt.tekst.length * 8 + 12)}
                height="24"
                rx="5"
                fill="#1e1b4b"
                stroke="#818cf8"
                strokeWidth="1.5"
                opacity="0.95"
              />
              <text
                x="6"
                y="-2"
                fill="#e0e7ff"
                fontSize="11"
                fontWeight="bold"
              >
                📌 {txt.tekst}
              </text>
            </g>
          ))}

          {/* 6. MÅLESTOKK-KALIBRERINGSLINJE */}
          {kalibreringsStart && (
            <g>
              <circle
                cx={kalibreringsStart.x}
                cy={kalibreringsStart.y}
                r="7"
                fill="#06b6d4"
                stroke="#ffffff"
                strokeWidth="2"
              />
              {musePosisjon && (
                <>
                  <line
                    x1={kalibreringsStart.x}
                    y1={kalibreringsStart.y}
                    x2={musePosisjon.x}
                    y2={musePosisjon.y}
                    stroke="#06b6d4"
                    strokeWidth="3"
                    strokeDasharray="6,4"
                  />
                  <circle
                    cx={musePosisjon.x}
                    cy={musePosisjon.y}
                    r="7"
                    fill="#06b6d4"
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                  <g transform={`translate(${musePosisjon.x + 12}, ${musePosisjon.y - 12})`}>
                    <rect
                      x="0"
                      y="-14"
                      width="80"
                      height="20"
                      rx="4"
                      fill="#083344"
                      stroke="#06b6d4"
                      strokeWidth="1.5"
                    />
                    <text
                      x="40"
                      y="0"
                      fill="#ecfeff"
                      fontSize="10"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      Mål opp vegg
                    </text>
                  </g>
                </>
              )}
            </g>
          )}
        </svg>

        {/* Målestokk-angivelse i hjørnet */}
        <div className="absolute bottom-3 right-3 flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-1.5 text-[11px] font-bold text-slate-300 backdrop-blur-sm">
          <span>📐 Målestokk:</span>
          <span className="font-mono text-cyan-300">
            {pxPrMeter.toFixed(0)} px = 1,0 m
          </span>
          <span className="text-slate-500">|</span>
          <span className="text-emerald-400">+15 % svinn/oppstikk</span>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* OPPSUMMERINGSTABELL & BEREGNET MENGDEUTTAK */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Kolonne 1: Rørmengder */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-xl lg:col-span-6">
          <div className="mb-3 flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Pencil className="h-4 w-4 text-sky-400" />
              <span>Oppmålte Rørlengder (TEK17)</span>
            </h3>
            <span className="font-mono text-xs font-extrabold text-emerald-400">
              Totalt: {rorOppsummering.totalMedSvinn} m (inkl. svinn)
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {(['kaldtvann', 'varmtvann', 'varme', 'avlop'] as RorType[]).map((type) => {
              const stil = ROR_STILER[type];
              const data = rorOppsummering.summary[type];
              return (
                <div
                  key={type}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-2.5"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: stil.farge }}
                    />
                    <div>
                      <div className="font-bold text-slate-100">{stil.navn}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {stil.dimensjon} · NRF {stil.nrf}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-xs font-black text-slate-100">
                      {data.medSvinn} m
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Tegnet: {data.rawMeter} m (+15 % svinn)
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Klammerbehov */}
            <div className="mt-3 flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-950/30 p-2.5 text-amber-200">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-amber-400" />
                <div>
                  <div className="font-bold">Estimert klammerbehov</div>
                  <div className="text-[10px] text-amber-300/80">
                    1 klammer pr. 0,6 m PEX / 0,8 m avløp
                  </div>
                </div>
              </div>
              <div className="font-mono text-sm font-black text-amber-300">
                {rorOppsummering.estimertKlammer} stk
              </div>
            </div>
          </div>
        </div>

        {/* Kolonne 2: Opptalte VVS-Symboler & Handling */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-xl lg:col-span-6 flex flex-col justify-between">
          <div>
            <div className="mb-3 flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Wrench className="h-4 w-4 text-amber-400" />
                <span>Opptalte VVS-Komponenter</span>
              </h3>
              <span className="font-mono text-xs font-extrabold text-amber-400">
                Totalt: {tegning.symboler.length} stk
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
              {(['wc', 'servant', 'sluk', 'fordelerskap', 'varmepumpe', 'radiator', 'ventil'] as SymbolType[]).map((st) => {
                const sym = VVS_SYMBOLER[st];
                const antall = symbolOpptelling[st];
                return (
                  <div
                    key={st}
                    className={`flex items-center justify-between rounded-xl border p-2.5 ${
                      antall > 0
                        ? `${sym.borderFarge} ${sym.bgFarge} text-white`
                        : 'border-slate-800 bg-slate-950/50 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-base">{sym.ikon}</span>
                      <span className="truncate font-semibold">{sym.tittel.split(' ')[0]}</span>
                    </div>
                    <span className="font-mono text-xs font-black text-emerald-300 ml-1">
                      {antall}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Handling nederst i kolonnen */}
          <div className="mt-4 pt-3 border-t border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-[11px] text-slate-400">
                <span className="font-bold text-slate-200">Direkteflyt:</span> Overfører disse mengdene til kalkylen og oppdaterer sanitærlastene ($q_n$ og $q_s$).
              </div>
              <button
                type="button"
                onClick={handleSendTilKalkyle}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-xs font-extrabold text-white shadow-lg hover:from-emerald-500 hover:to-teal-500 transition ring-1 ring-emerald-400/50 active:scale-95"
              >
                <Send className="h-4 w-4" />
                <span>Overfør til Vareliste & QA-kalkyle</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* MODAL FOR KALIBRERING AV MÅLESTOKK */}
      {/* ==================================================================== */}
      {visKalibrerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Ruler className="h-5 w-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Kalibrer Målestokk</h3>
              </div>
              <button
                type="button"
                onClick={() => setVisKalibrerModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="mt-3 text-xs text-slate-300">
              Du tegnet en referanselinje. Hvor mange meter tilsvarer denne avstanden i virkeligheten (f.eks. bredden på et rom eller en dør)?
            </p>

            <div className="mt-4">
              <label className="block text-xs font-bold text-slate-400 mb-1">
                Virkelig lengde (meter):
              </label>
              <input
                type="text"
                value={onsketMeterInput}
                onChange={(e) => setOnsketMeterInput(e.target.value)}
                placeholder="f.eks. 2.5"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm font-bold text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setVisKalibrerModal(false)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700"
              >
                Avbryt
              </button>
              <button
                type="button"
                onClick={bekreftKalibrering}
                className="rounded-xl bg-cyan-600 px-5 py-2 text-xs font-bold text-white shadow hover:bg-cyan-500"
              >
                Fastsett målestokk
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL FOR TEKSTNOTAT */}
      {/* ==================================================================== */}
      {notatPosisjon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-2">Legg til notat på tegning</h3>
            <input
              type="text"
              autoFocus
              value={notatTekst}
              onChange={(e) => setNotatTekst(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') lagreNotat();
                else if (e.key === 'Escape') setNotatPosisjon(null);
              }}
              placeholder="f.eks. Inntak 32mm, Kote +12.4m, Sjakt..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs font-bold text-white focus:border-indigo-500 focus:outline-none"
            />
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setNotatPosisjon(null)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700"
              >
                Avbryt
              </button>
              <button
                type="button"
                onClick={lagreNotat}
                className="rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white shadow hover:bg-indigo-500"
              >
                Lagre notat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
