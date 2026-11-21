import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { ProsjektData } from '../data/prosjekter';
import type { ProsjektTilstand } from '../lib/lagring';
import type { CompanyProfile } from '../lib/auth';
import type { ProsjektAnalyse } from '../lib/analyse';
import {
  type OrderItem,
  type KalkyleProsjektType,
  detekterProsjektType,
  genererVarelisteForProsjekt,
  beregnUtpris,
} from '../lib/kalkyleKatalog';

export interface TimeverkData {
  antallTimer: number;
  timeprisUt: number;
  timeSelvkost: number;
  inkluderTimer: boolean;
}

export interface MangelPunkt {
  id: string;
  kategori: 'lov1_underlag' | 'lov2_kote' | 'lov3_utstyr' | 'teknisk_felle';
  tittel: string;
  beskrivelse: string;
  alvorlighetsgrad: 'kritisk' | 'advarsel' | 'info';
  avklart: boolean;
}

export interface KalkyleTotals {
  materiellInnkjop: number;
  materiellUtprisRaa: number;
  rabattBelop: number;
  materiellNetto: number;
  timerSum: number;
  timerKost: number;
  totalEksMva: number;
  totalKost: number;
  totalDGBelop: number;
  totalDGProsent: string;
  mva: number;
  totalInklMva: number;
  enovaTilskudd: number;
  nettoInvestering: number;
}

export interface ProjectContextType {
  prosjekt: ProsjektData;
  prosjektNavn: string;
  prosjektType: KalkyleProsjektType;
  arealM2: number | null;
  etasjer: string;
  vareliste: OrderItem[];
  timeverk: TimeverkData;
  systemRabattAktiv: boolean;
  mangelSjekkliste: MangelPunkt[];
  kalkyleTotals: KalkyleTotals;

  // Handlinger
  oppdaterProsjekt: (oppdatert: ProsjektData, endringer?: string[]) => void;
  settProsjektType: (nyType: KalkyleProsjektType, regenererVareliste?: boolean) => void;
  settVareliste: (oppdatering: OrderItem[] | ((prev: OrderItem[]) => OrderItem[])) => void;
  oppdaterVareAntall: (id: number, antall: number) => void;
  toggleVareKategori: (id: number) => void;
  leggTilVare: (vare: Omit<OrderItem, 'id'>) => void;
  slettVare: (id: number) => void;
  flyttVare: (index: number, retning: 'opp' | 'ned') => void;
  oppdaterTimeverk: (oppdatering: Partial<TimeverkData>) => void;
  settSystemRabattAktiv: (aktiv: boolean) => void;
  toggleMangelAvklart: (id: string) => void;
  regenererKalkyle: (valgtType?: KalkyleProsjektType) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

function standardTimerForType(type: KalkyleProsjektType, bra?: number | null): number {
  const areal = bra && bra > 0 ? bra : 200;
  switch (type) {
    case 'sprinkler':
      return Math.round(Math.max(120, areal * 0.08 + 150));
    case 'naering':
      return Math.round(Math.max(80, areal * 0.06 + 90));
    case 'kombi':
      return Math.round(Math.max(90, areal * 0.07 + 100));
    case 'bolig':
    default:
      return 65;
  }
}

export function ProjectProvider({
  children,
  aktivtProsjekt,
  onOppdaterProsjekt,
  prosjektTilstand,
  onOppdaterProsjektTilstand,
  companyProfile,
  analyse,
  melding,
}: {
  children: React.ReactNode;
  aktivtProsjekt: ProsjektData;
  onOppdaterProsjekt: (p: ProsjektData, endringer?: string[]) => void;
  prosjektTilstand?: ProsjektTilstand;
  onOppdaterProsjektTilstand?: (oppdater: (prev: ProsjektTilstand) => ProsjektTilstand) => void;
  companyProfile?: CompanyProfile;
  analyse?: ProsjektAnalyse;
  melding?: (tekst: string) => void;
}) {
  // Prosjekttype (auto-detektert eller manuelt valgt)
  const [prosjektType, setProsjektTypeInternal] = useState<KalkyleProsjektType>(() => {
    return detekterProsjektType(aktivtProsjekt);
  });

  // Vareliste for kalkylen
  const [vareliste, setVarelisteInternal] = useState<OrderItem[]>(() => {
    if (prosjektTilstand?.ordreItems && prosjektTilstand.ordreItems.length > 0) {
      return prosjektTilstand.ordreItems;
    }
    return genererVarelisteForProsjekt(aktivtProsjekt, detekterProsjektType(aktivtProsjekt));
  });

  // Timeverk
  const [timeverk, setTimeverkInternal] = useState<TimeverkData>(() => ({
    antallTimer: standardTimerForType(detekterProsjektType(aktivtProsjekt), aktivtProsjekt.bra),
    timeprisUt: companyProfile?.timeprisUt ?? 1150,
    timeSelvkost: companyProfile?.timeSelvkost ?? 550,
    inkluderTimer: true,
  }));

  const [systemRabattAktiv, setSystemRabattAktivInternal] = useState<boolean>(true);
  const [avklartMangler, setAvklartMangler] = useState<Record<string, boolean>>({});

  const forrigeProsjektRef = useRef<ProsjektData>(aktivtProsjekt);

  // Synkroniser når aktivt prosjekt endres (prosjektbytte eller dataoppdatering fra fil/veiviser)
  useEffect(() => {
    const forrige = forrigeProsjektRef.current;
    const erNyttProsjekt = aktivtProsjekt.id !== forrige.id;
    const nyType = detekterProsjektType(aktivtProsjekt);
    const typeEndret = nyType !== prosjektType;
    const braEndret = aktivtProsjekt.bra !== forrige.bra;
    const sanitaerEndret =
      JSON.stringify(aktivtProsjekt.sanitaerUtstyr) !== JSON.stringify(forrige.sanitaerUtstyr);
    const bygningEndret = aktivtProsjekt.bygningstype !== forrige.bygningstype;

    forrigeProsjektRef.current = aktivtProsjekt;

    if (erNyttProsjekt) {
      setProsjektTypeInternal(nyType);

      if (prosjektTilstand?.ordreItems && prosjektTilstand.ordreItems.length > 0) {
        setVarelisteInternal(prosjektTilstand.ordreItems);
      } else {
        const nyVareliste = genererVarelisteForProsjekt(aktivtProsjekt, nyType);
        setVarelisteInternal(nyVareliste);
        onOppdaterProsjektTilstand?.((prev) => ({ ...prev, ordreItems: nyVareliste }));
      }

      setTimeverkInternal((prev) => ({
        ...prev,
        antallTimer: standardTimerForType(nyType, aktivtProsjekt.bra),
        timeprisUt: companyProfile?.timeprisUt ?? prev.timeprisUt,
        timeSelvkost: companyProfile?.timeSelvkost ?? prev.timeSelvkost,
      }));
    } else if (typeEndret || braEndret || sanitaerEndret || bygningEndret) {
      setProsjektTypeInternal(nyType);
      const nyVareliste = genererVarelisteForProsjekt(aktivtProsjekt, nyType);
      setVarelisteInternal(nyVareliste);
      onOppdaterProsjektTilstand?.((prev) => ({ ...prev, ordreItems: nyVareliste }));
      setTimeverkInternal((prev) => ({
        ...prev,
        antallTimer: standardTimerForType(nyType, aktivtProsjekt.bra),
      }));
    }
  }, [
    aktivtProsjekt,
    prosjektTilstand?.ordreItems,
    onOppdaterProsjektTilstand,
    companyProfile?.timeprisUt,
    companyProfile?.timeSelvkost,
    prosjektType,
  ]);

  // Synkroniser selskapets timepriser hvis profil oppdateres
  useEffect(() => {
    if (companyProfile?.timeprisUt || companyProfile?.timeSelvkost) {
      setTimeverkInternal((prev) => ({
        ...prev,
        timeprisUt: companyProfile.timeprisUt ?? prev.timeprisUt,
        timeSelvkost: companyProfile.timeSelvkost ?? prev.timeSelvkost,
      }));
    }
  }, [companyProfile?.timeprisUt, companyProfile?.timeSelvkost]);

  // Hjelpefunksjon for å oppdatere vareliste og synkronisere til prosjekttilstand
  const settVareliste = useCallback(
    (oppdatering: OrderItem[] | ((prev: OrderItem[]) => OrderItem[])) => {
      setVarelisteInternal((prev) => {
        const ny = typeof oppdatering === 'function' ? oppdatering(prev) : oppdatering;
        onOppdaterProsjektTilstand?.((t) => ({ ...t, ordreItems: ny }));
        return ny;
      });
    },
    [onOppdaterProsjektTilstand]
  );

  const oppdaterVareAntall = useCallback(
    (id: number, antall: number) => {
      settVareliste((prev) =>
        prev.map((item) => (item.id === id ? { ...item, antall: Math.max(0, antall) } : item))
      );
    },
    [settVareliste]
  );

  const toggleVareKategori = useCallback(
    (id: number) => {
      settVareliste((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, kategori: item.kategori === 'Lokkeand' ? 'Mester-tillegg' : 'Lokkeand' }
            : item
        )
      );
    },
    [settVareliste]
  );

  const leggTilVare = useCallback(
    (vare: Omit<OrderItem, 'id'>) => {
      settVareliste((prev) => {
        const maksId = prev.reduce((m, i) => Math.max(m, i.id), 0);
        return [...prev, { ...vare, id: maksId + 1 }];
      });
      melding?.(`➕ La til «${vare.beskrivelse}» i varelisten`);
    },
    [settVareliste, melding]
  );

  const slettVare = useCallback(
    (id: number) => {
      settVareliste((prev) => prev.filter((item) => item.id !== id));
      melding?.('🗑️ Varepost slettet fra kalkylen.');
    },
    [settVareliste, melding]
  );

  const flyttVare = useCallback(
    (index: number, retning: 'opp' | 'ned') => {
      settVareliste((prev) => {
        const ny = [...prev];
        const target = retning === 'opp' ? index - 1 : index + 1;
        if (target < 0 || target >= ny.length) return ny;
        const temp = ny[index];
        ny[index] = ny[target];
        ny[target] = temp;
        return ny;
      });
    },
    [settVareliste]
  );

  const oppdaterTimeverk = useCallback((oppdatering: Partial<TimeverkData>) => {
    setTimeverkInternal((prev) => ({ ...prev, ...oppdatering }));
  }, []);

  const settSystemRabattAktiv = useCallback((aktiv: boolean) => {
    setSystemRabattAktivInternal(aktiv);
  }, []);

  // Regenerer hele kalkylen ved bytte av prosjekttype eller filimport
  const regenererKalkyle = useCallback(
    (valgtType?: KalkyleProsjektType) => {
      const type = valgtType ?? prosjektType;
      const nyVareliste = genererVarelisteForProsjekt(aktivtProsjekt, type);
      settVareliste(nyVareliste);
      const nyeTimer = standardTimerForType(type, aktivtProsjekt.bra);
      oppdaterTimeverk({ antallTimer: nyeTimer });
      melding?.(`🔄 Kalkylen er regenerert for ${type === 'sprinkler' ? 'Sprinkleranlegg' : type === 'naering' ? 'Næringsbygg' : type === 'kombi' ? 'Kombinasjonsbygg' : 'Bolig'}`);
    },
    [aktivtProsjekt, prosjektType, settVareliste, oppdaterTimeverk, melding]
  );

  const settProsjektType = useCallback(
    (nyType: KalkyleProsjektType, regenerer = true) => {
      setProsjektTypeInternal(nyType);
      if (regenerer) {
        regenererKalkyle(nyType);
      }
    },
    [regenererKalkyle]
  );

  // Når prosjektet oppdateres (f.eks. fra filopplasting)
  const oppdaterProsjekt = useCallback(
    (oppdatert: ProsjektData, endringer?: string[]) => {
      onOppdaterProsjekt(oppdatert, endringer);
      // Sjekk om ny type detekteres fra filen
      const detektert = detekterProsjektType(oppdatert);
      if (detektert !== prosjektType) {
        setProsjektTypeInternal(detektert);
        const nyVareliste = genererVarelisteForProsjekt(oppdatert, detektert);
        settVareliste(nyVareliste);
        oppdaterTimeverk({ antallTimer: standardTimerForType(detektert, oppdatert.bra) });
      } else {
        // Samme type, men kanskje endret BRA eller sanitærutstyr
        const nyVareliste = genererVarelisteForProsjekt(oppdatert, prosjektType);
        settVareliste(nyVareliste);
      }
    },
    [onOppdaterProsjekt, prosjektType, settVareliste, oppdaterTimeverk]
  );

  // Mangel-sjekkliste generering
  const mangelSjekkliste = useMemo(() => {
    const liste: MangelPunkt[] = [];

    // 1. Lov 1: Datapunkter fra analyse
    if (analyse?.datasjekk) {
      for (const d of analyse.datasjekk) {
        if (!d.ok) {
          liste.push({
            id: `lov1_${d.id}`,
            kategori: 'lov1_underlag',
            tittel: `Mangler: ${d.tekst}`,
            beskrivelse: d.hint,
            alvorlighetsgrad:
              d.id === 'bra' || d.id === 'itr' || d.id === 'gulv' ? 'kritisk' : 'advarsel',
            avklart: Boolean(avklartMangler[`lov1_${d.id}`]),
          });
        }
      }
    }

    // 2. Lov 2: Kotesjekk mot tilbakeslag (950 mm-kravet)
    if (analyse?.lov2Status === 'brudd') {
      const laveste = analyse.gulvKontroller?.find((g) => !g.ok);
      liste.push({
        id: 'lov2_kotebrudd',
        kategori: 'lov2_kote',
        tittel: 'Tilbakeslagsfare: Laveste sluk under 950 mm-kravet',
        beskrivelse: laveste
          ? `${laveste.navn} har kun ${(laveste.margin * 1000).toFixed(0)} mm overhøyde mot ITR i kommunal kum. Krever pumpe/tilbakeslagsventil.`
          : 'Laveste sluk i bygget bryter kravet til overhøyde mot tilbakeslag.',
        alvorlighetsgrad: 'kritisk',
        avklart: Boolean(avklartMangler['lov2_kotebrudd']),
      });
    }

    // 3. Kjente mangler i prosjektunderlaget
    if (aktivtProsjekt.kjenteMangler && aktivtProsjekt.kjenteMangler.length > 0) {
      aktivtProsjekt.kjenteMangler.forEach((m, idx) => {
        liste.push({
          id: `kjent_mangel_${idx}`,
          kategori: 'lov1_underlag',
          tittel: `Dokumentmangel: ${m.slice(0, 45)}...`,
          beskrivelse: m,
          alvorlighetsgrad: 'advarsel',
          avklart: Boolean(avklartMangler[`kjent_mangel_${idx}`]),
        });
      });
    }

    // 4. Tekniske feller og avvik
    if (aktivtProsjekt.feller && aktivtProsjekt.feller.length > 0) {
      aktivtProsjekt.feller.forEach((f, idx) => {
        liste.push({
          id: `felle_${idx}`,
          kategori: 'teknisk_felle',
          tittel: `Faglig felle: ${f.slice(0, 45)}...`,
          beskrivelse: f,
          alvorlighetsgrad: /brann|trykk|sjakt/i.test(f) ? 'kritisk' : 'advarsel',
          avklart: Boolean(avklartMangler[`felle_${idx}`]),
        });
      });
    }

    return liste;
  }, [analyse, aktivtProsjekt, avklartMangler]);

  const toggleMangelAvklart = useCallback((id: string) => {
    setAvklartMangler((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  // Sentral beregning av totaler (Single Source of Truth)
  const kalkyleTotals: KalkyleTotals = useMemo(() => {
    const aktive = vareliste.filter((i) => i.antall > 0);
    const materiellInnkjop = aktive.reduce(
      (sum, i) => sum + Math.max(0, i.innpris) * Math.max(0, i.antall),
      0
    );
    const materiellUtprisRaa = aktive.reduce(
      (sum, i) => sum + beregnUtpris(i.innpris, i.kategori) * Math.max(0, i.antall),
      0
    );
    const rabattBelop = systemRabattAktiv ? Math.round(materiellUtprisRaa * 0.05) : 0;
    const materiellNetto = materiellUtprisRaa - rabattBelop;

    const timer = timeverk.inkluderTimer ? Math.max(0, timeverk.antallTimer) : 0;
    const timerSum = timer * Math.max(0, timeverk.timeprisUt);
    const timerKost = timer * Math.max(0, timeverk.timeSelvkost);

    const totalEksMva = materiellNetto + timerSum;
    const totalKost = materiellInnkjop + timerKost;
    const totalDGBelop = totalEksMva - totalKost;
    const totalDGProsent = totalEksMva > 0 ? ((totalDGBelop / totalEksMva) * 100).toFixed(1) : '0.0';

    const mva = Math.round(totalEksMva * 0.25);
    const totalInklMva = totalEksMva + mva;

    // Enova-støtte: kun for boligrehabilitering (f.eks. varmepumpe/energikonvertering)
    const enovaTilskudd = prosjektType === 'bolig' ? 10000 : 0;
    const nettoInvestering = totalInklMva - enovaTilskudd;

    return {
      materiellInnkjop,
      materiellUtprisRaa,
      rabattBelop,
      materiellNetto,
      timerSum,
      timerKost,
      totalEksMva,
      totalKost,
      totalDGBelop,
      totalDGProsent,
      mva,
      totalInklMva,
      enovaTilskudd,
      nettoInvestering,
    };
  }, [vareliste, timeverk, systemRabattAktiv, prosjektType]);

  const value: ProjectContextType = {
    prosjekt: aktivtProsjekt,
    prosjektNavn: aktivtProsjekt.navn,
    prosjektType,
    arealM2: aktivtProsjekt.bra,
    etasjer: aktivtProsjekt.etasjer,
    vareliste,
    timeverk,
    systemRabattAktiv,
    mangelSjekkliste,
    kalkyleTotals,
    oppdaterProsjekt,
    settProsjektType,
    settVareliste,
    oppdaterVareAntall,
    toggleVareKategori,
    leggTilVare,
    slettVare,
    flyttVare,
    oppdaterTimeverk,
    settSystemRabattAktiv,
    toggleMangelAvklart,
    regenererKalkyle,
  };

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProject(): ProjectContextType {
  const ctx = useContext(ProjectContext);
  if (!ctx) {
    throw new Error('useProject må brukes innenfor en <ProjectProvider>');
  }
  return ctx;
}
