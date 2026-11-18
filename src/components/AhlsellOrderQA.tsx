import { useState, useMemo, useEffect } from 'react';
import {
  CheckCircle,
  Download,
  FileSpreadsheet,
  ShieldAlert,
  Sparkles,
  Edit3,
  Clock,
  Wrench,
  Plus,
  Trash2,
  ArrowUpDown,
  Coins,
} from 'lucide-react';
import type { ProsjektData } from '../data/prosjekter';

export interface OrderItem {
  id: number;
  nrf: string;
  beskrivelse: string;
  antall: number;
  enhet: string;
  innpris: number;
  kategori: 'Lokkeand' | 'Mester-tillegg';
}

export interface QAProps {
  prosjekt?: ProsjektData;
  initialItems?: OrderItem[];
  onApproveToPdf?: (items: OrderItem[], sum: number) => void;
  melding?: (tekst: string) => void;
  onLukk?: () => void;
}

const INITIAL_ORDER_DATA: OrderItem[] = [
  { id: 1, nrf: '6190013', beskrivelse: 'Geberit Duofix Vegghengt WC-sisterne komplett', antall: 3, enhet: 'stk', innpris: 3800, kategori: 'Lokkeand' },
  { id: 2, nrf: '4290154', beskrivelse: 'Porsgrund Glow Servant med underskap', antall: 2, enhet: 'stk', innpris: 4200, kategori: 'Lokkeand' },
  { id: 3, nrf: '5083703', beskrivelse: 'Roth MultiPex rør-i-rør 16mm', antall: 75, enhet: 'm', innpris: 38, kategori: 'Mester-tillegg' },
  { id: 4, nrf: '5118805', beskrivelse: 'Roth QuickBox veggboks 16mm x 1/2"', antall: 8, enhet: 'stk', innpris: 295, kategori: 'Mester-tillegg' },
  { id: 5, nrf: '2213316', beskrivelse: 'Wavin AS+ Støydempet avløpsrør 110x1000mm', antall: 8, enhet: 'stk', innpris: 410, kategori: 'Mester-tillegg' },
  { id: 6, nrf: '8361001', beskrivelse: 'Luft-vann varmepumpe 8kW systempakke', antall: 1, enhet: 'stk', innpris: 62000, kategori: 'Lokkeand' },
  { id: 7, nrf: '8370781', beskrivelse: 'Roth Touchline SL 8-kanals sentral', antall: 1, enhet: 'stk', innpris: 4950, kategori: 'Mester-tillegg' },
  { id: 8, nrf: '5648184', beskrivelse: 'Waterguard+ sentral med trådløse sensorer', antall: 1, enhet: 'stk', innpris: 5400, kategori: 'Mester-tillegg' }
];

/**
 * Beregner utpris basert på faglig kalkulasjon:
 * - Lokkeand: 20,0 % dekningsgrad (25 % påslag, faktor 1.25)
 * - Mester-tillegg: 52,4 % dekningsgrad (110 % påslag, faktor 2.10)
 */
export function beregnUtpris(innpris: number, kategori: 'Lokkeand' | 'Mester-tillegg'): number {
  const base = Number.isFinite(innpris) ? Math.max(0, innpris) : 0;
  return kategori === 'Lokkeand' ? Math.round(base * 1.25) : Math.round(base * 2.10);
}

/**
 * Hjelpefunksjon for å unnslippe semikolon og anførselstegn i CSV-felter
 */
export function csvFelt(val: string | number): string {
  const str = String(val ?? '');
  if (str.includes(';') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Pakker alltid tekstfelt i anførselstegn for trygg import i Tripletex og Holte SmartKalk
 */
export function csvTekst(val: string): string {
  const str = String(val ?? '');
  return `"${str.replace(/"/g, '""')}"`;
}

export function AhlsellOrderQA({
  prosjekt,
  initialItems,
  onApproveToPdf,
  melding,
  onLukk,
}: QAProps) {
  const [items, setItems] = useState<OrderItem[]>(() => {
    if (initialItems && initialItems.length > 0) return initialItems;
    // Synkroniser mengder fra prosjekt hvis tilgjengelig (f.eks. sanitærutstyr)
    if (prosjekt?.sanitaerUtstyr) {
      return INITIAL_ORDER_DATA.map((item) => {
        if (item.nrf === '6190013' && prosjekt.sanitaerUtstyr?.wc?.antall !== undefined) {
          return { ...item, antall: prosjekt.sanitaerUtstyr.wc.antall };
        }
        if (item.nrf === '4290154' && prosjekt.sanitaerUtstyr?.servant?.antall !== undefined) {
          return { ...item, antall: prosjekt.sanitaerUtstyr.servant.antall };
        }
        return item;
      });
    }
    return INITIAL_ORDER_DATA;
  });

  // Hvis prosjektet endres utenfra, oppdater relevante mengder
  useEffect(() => {
    if (prosjekt?.sanitaerUtstyr) {
      setItems((prev) =>
        prev.map((item) => {
          if (item.nrf === '6190013' && prosjekt.sanitaerUtstyr?.wc?.antall !== undefined) {
            return { ...item, antall: prosjekt.sanitaerUtstyr.wc.antall };
          }
          if (item.nrf === '4290154' && prosjekt.sanitaerUtstyr?.servant?.antall !== undefined) {
            return { ...item, antall: prosjekt.sanitaerUtstyr.servant.antall };
          }
          return item;
        })
      );
    }
  }, [prosjekt?.sanitaerUtstyr]);

  const [systemRabattAktiv, setSystemRabattAktiv] = useState<boolean>(true);
  const [inkluderTimer, setInkluderTimer] = useState<boolean>(true);
  const [antallTimer, setAntallTimer] = useState<number>(65);
  const [timeprisUt, setTimeprisUt] = useState<number>(1150);
  const [timeSelvkost, setTimeSelvkost] = useState<number>(550);

  // Ny varepost skjema-state
  const [visNyVare, setVisNyVare] = useState<boolean>(false);
  const [nyNrf, setNyNrf] = useState<string>('');
  const [nyBeskrivelse, setNyBeskrivelse] = useState<string>('');
  const [nyAntall, setNyAntall] = useState<number>(1);
  const [nyEnhet, setNyEnhet] = useState<string>('stk');
  const [nyInnpris, setNyInnpris] = useState<number>(500);
  const [nyKategori, setNyKategori] = useState<'Lokkeand' | 'Mester-tillegg'>('Mester-tillegg');

  const handleQuantityChange = (id: number, nyttAntall: string) => {
    const parsed = parseInt(nyttAntall, 10);
    const verdi = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, antall: verdi } : item)));
  };

  const toggleKategori = (id: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              kategori: item.kategori === 'Lokkeand' ? 'Mester-tillegg' : 'Lokkeand',
            }
          : item
      )
    );
  };

  const slettVarepost = (id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const leggTilVarepost = () => {
    if (!nyNrf.trim() || !nyBeskrivelse.trim()) {
      melding?.('⚠️ Oppgi både NRF-nummer og varebeskrivelse.');
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
    setItems((prev) => [...prev, nyPost]);
    setNyNrf('');
    setNyBeskrivelse('');
    setNyAntall(1);
    setNyInnpris(500);
    setVisNyVare(false);
    melding?.(`✅ Ny varepost "${nyPost.beskrivelse}" lagt til!`);
  };

  // Beregninger
  const materiellInnkjop = useMemo(() => {
    return items.reduce((sum, item) => sum + Math.max(0, item.innpris) * Math.max(0, item.antall), 0);
  }, [items]);

  const materiellUtprisRaa = useMemo(() => {
    return items.reduce(
      (sum, item) => sum + beregnUtpris(item.innpris, item.kategori) * Math.max(0, item.antall),
      0
    );
  }, [items]);

  const rabattBelop = useMemo(() => {
    return systemRabattAktiv ? Math.round(materiellUtprisRaa * 0.05) : 0;
  }, [systemRabattAktiv, materiellUtprisRaa]);

  const materiellUtprisNetto = materiellUtprisRaa - rabattBelop;

  const timerKostTotal = useMemo(() => {
    return inkluderTimer ? Math.max(0, antallTimer) * Math.max(0, timeSelvkost) : 0;
  }, [inkluderTimer, antallTimer, timeSelvkost]);

  const timerSalgTotal = useMemo(() => {
    return inkluderTimer ? Math.max(0, antallTimer) * Math.max(0, timeprisUt) : 0;
  }, [inkluderTimer, antallTimer, timeprisUt]);

  const totalInnkjopOgKost = materiellInnkjop + timerKostTotal;
  const totalTilbudssumEksMva = materiellUtprisNetto + timerSalgTotal;
  const totalDGBelop = totalTilbudssumEksMva - totalInnkjopOgKost;
  const totalDGProsent = useMemo(() => {
    if (totalTilbudssumEksMva <= 0) return '0.0';
    return ((totalDGBelop / totalTilbudssumEksMva) * 100).toFixed(1);
  }, [totalDGBelop, totalTilbudssumEksMva]);

  const eksporterCSV = (format: 'm3' | 'tripletex' | 'holte' | 'qa') => {
    let csvInnhold = '';
    let filnavn = 'eksport.csv';

    if (format === 'm3') {
      csvInnhold =
        'NRF;Antall\n' +
        items
          .filter((i) => i.antall > 0)
          .map((i) => `${csvFelt(i.nrf)};${i.antall}`)
          .join('\n');
      filnavn = 'Ahlsell_M3_Hurtigordre.csv';
    } else if (format === 'tripletex') {
      const rader = items
        .filter((i) => i.antall > 0)
        .map((i) => {
          const ut = beregnUtpris(i.innpris, i.kategori);
          return `${csvFelt(i.nrf)};${csvTekst(i.beskrivelse)};${i.antall};${csvFelt(i.enhet)};${i.innpris};${ut};3`;
        });
      if (inkluderTimer && antallTimer > 0) {
        rader.push(
          `TIME-VVS;${csvTekst('Rørleggertimer / Montering')};${antallTimer};timer;${timeSelvkost};${timeprisUt};3`
        );
      }
      if (systemRabattAktiv && rabattBelop > 0) {
        rader.push(
          `RABATT-SYS;${csvTekst('5 % Samlet Systempakke-rabatt (Kirsebærplukker-skjold)')};1;stk;0;-${rabattBelop};3`
        );
      }
      csvInnhold =
        'Produktnummer;Produktnavn;Antall;Enhet;Innkjøpspris;Utsalgspris;Mva-kode\n' +
        rader.join('\n');
      filnavn = 'Tripletex_Tilbudsimport.csv';
    } else if (format === 'holte') {
      const rader = items
        .filter((i) => i.antall > 0)
        .map((i, idx) => {
          const ut = beregnUtpris(i.innpris, i.kategori);
          const postnr = `31.${String(idx + 1).padStart(2, '0')}`;
          return `${postnr};${csvFelt(i.nrf)};${csvTekst(i.beskrivelse)};${i.antall};${csvFelt(i.enhet)};${i.innpris};${ut};${ut * i.antall}`;
        });
      if (inkluderTimer && antallTimer > 0) {
        rader.push(
          `31.90;TIME-VVS;${csvTekst('Rørleggertimer / Montering')};${antallTimer};timer;${timeSelvkost};${timeprisUt};${timerSalgTotal}`
        );
      }
      if (systemRabattAktiv && rabattBelop > 0) {
        rader.push(
          `31.99;RABATT;${csvTekst('5 % Samlet Systempakke-rabatt (Kirsebærplukker-skjold)')};1;stk;0;-${rabattBelop};-${rabattBelop}`
        );
      }
      csvInnhold =
        'Postnr;NRF;Beskrivelse;Mengde;Enhet;Kostpris;Salgspris;Sum_Salg\n' + rader.join('\n');
      filnavn = 'Holte_SmartKalk_Import.csv';
    } else {
      const rader = items.map((i) => {
        const ut = beregnUtpris(i.innpris, i.kategori);
        const dg = ut > 0 ? (((ut - i.innpris) / ut) * 100).toFixed(1) : '0.0';
        return `${csvFelt(i.nrf)};${i.antall};${csvTekst(i.beskrivelse)};${csvFelt(i.kategori)};${i.innpris};${ut};${i.innpris * i.antall};${ut * i.antall};${dg}%`;
      });
      if (inkluderTimer && antallTimer > 0) {
        const timeDG = timeprisUt > 0 ? (((timeprisUt - timeSelvkost) / timeprisUt) * 100).toFixed(1) : '0.0';
        rader.push(
          `TIME-VVS;${antallTimer};${csvTekst('Rørleggertimer / Montering')};Timeverk;${timeSelvkost};${timeprisUt};${timerKostTotal};${timerSalgTotal};${timeDG}%`
        );
      }
      csvInnhold =
        'NRF;Antall;Beskrivelse;Kategori;Enhetspris_Inn;Enhetspris_Ut;Total_Inn;Total_Ut;DG_Prosent\n' +
        rader.join('\n');
      filnavn = 'QA_Kalkyle_Med_Tekst.csv';
    }

    const blob = new Blob(['\uFEFF' + csvInnhold], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filnavn);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    melding?.(`📥 Eksporterte ${filnavn} (${items.filter((i) => i.antall > 0).length} vareposter)!`);
  };

  return (
    <div className="my-6 rounded-xl border border-slate-700 bg-slate-900 p-4 sm:p-6 text-slate-100 shadow-2xl">
      {/* Header med tittel og nøkkeltall */}
      <div className="flex flex-col gap-4 border-b border-slate-700 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-blue-600 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-white">
              Skill 1 &amp; 2 Aktiv
            </span>
            <span className="flex items-center gap-1 rounded border border-emerald-500/40 bg-emerald-600/30 px-2.5 py-1 text-xs font-semibold text-emerald-300">
              <CheckCircle className="h-3.5 w-3.5" /> 100 % Låst NRF-Database
            </span>
            {prosjekt && (
              <span className="rounded border border-slate-600 bg-slate-800 px-2.5 py-1 text-xs text-slate-300">
                Prosjekt: <strong>{prosjekt.navn}</strong>
              </span>
            )}
          </div>
          <h2 className="mt-2 text-xl sm:text-2xl font-bold text-white">
            QA-Vindu: Verifisert Mengdeuttak, Timeverk &amp; ERP-eksport
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Kvalitetssikret for Ahlsell M3, Tripletex og Holte SmartKalk. Sikrer 20 % dekningsgrad på lokkevarer og 52,4 % på rør og deler.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:gap-5 rounded-lg border border-slate-600 bg-slate-800 p-3 sm:text-right">
          <div>
            <span className="block text-xs text-slate-400">Total Tilbudssum</span>
            <span className="text-lg font-bold text-amber-400">
              {totalTilbudssumEksMva.toLocaleString('no-NO')} kr
            </span>
            <span className="block text-[10px] text-slate-400">eks. mva</span>
          </div>
          <div className="border-l border-slate-700 pl-3 sm:pl-4">
            <span className="block text-xs text-slate-400">Total Prosjekt-DG</span>
            <span
              className={`text-xl font-extrabold ${
                Number(totalDGProsent) >= 38 ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {totalDGProsent} %
            </span>
            <span className="block text-[10px] text-slate-400">
              Bidrag: +{totalDGBelop.toLocaleString('no-NO')} kr
            </span>
          </div>
          {onLukk && (
            <button
              type="button"
              onClick={onLukk}
              className="ml-auto rounded-lg border border-slate-600 bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-600"
            >
              Lukk
            </button>
          )}
        </div>
      </div>

      {/* Timeverk og selvkost-bjelke */}
      <div className="my-5 flex flex-col gap-4 rounded-lg border border-slate-700 bg-slate-800/80 p-4 lg:flex-row lg:items-center lg:justify-between">
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={inkluderTimer}
            onChange={() => setInkluderTimer(!inkluderTimer)}
            className="h-5 w-5 rounded text-blue-600 focus:ring-0"
          />
          <span className="flex items-center gap-1.5 text-sm font-bold text-white">
            <Wrench className="h-4 w-4 text-blue-400" /> Inkluder Rørleggertimer i Tilbud &amp; ERP
          </span>
        </label>

        {inkluderTimer && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-700 bg-slate-900 p-2.5">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-400" />
              <span className="text-xs text-slate-300">Timer:</span>
              <input
                type="number"
                min="0"
                value={antallTimer}
                onChange={(e) => setAntallTimer(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-16 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-center text-sm font-bold text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-300">Selvkost:</span>
              <input
                type="number"
                min="0"
                value={timeSelvkost}
                onChange={(e) => setTimeSelvkost(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-20 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-center text-sm font-bold text-slate-300 focus:border-blue-500 focus:outline-none"
                title="Selvkost per rørleggertime (kr)"
              />
              <span className="text-xs text-slate-400">kr</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-300">Timepris ut:</span>
              <input
                type="number"
                min="0"
                value={timeprisUt}
                onChange={(e) => setTimeprisUt(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-20 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-center text-sm font-bold text-amber-400 focus:border-blue-500 focus:outline-none"
                title="Utpris til kunde per time (kr)"
              />
              <span className="text-xs text-slate-400">kr</span>
            </div>
            <div className="border-l border-slate-700 pl-2 text-xs font-semibold text-emerald-400">
              Sum timer: {timerSalgTotal.toLocaleString('no-NO')} kr
            </div>
          </div>
        )}
      </div>

      {/* Handlingslinje over tabellen */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-slate-400">
          Viser {items.length} vareposter. Klikk på margin-profilen for å veksle mellom Lokkeand (20 % DG) og Mester-tillegg (52,4 % DG).
        </div>
        <button
          type="button"
          onClick={() => setVisNyVare(!visNyVare)}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-700"
        >
          <Plus className="h-3.5 w-3.5 text-emerald-400" />
          {visNyVare ? 'Avbryt' : 'Legg til NRF-varepost'}
        </button>
      </div>

      {/* Skjema for å legge til ny varepost */}
      {visNyVare && (
        <div className="mb-4 rounded-lg border border-blue-600/50 bg-slate-800/95 p-4 shadow-lg">
          <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-blue-300">
            Ny NRF-varepost til tilbudslisten
          </h4>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <div>
              <label className="block text-[11px] text-slate-400">NRF-nummer</label>
              <input
                type="text"
                placeholder="f.eks. 5083703"
                value={nyNrf}
                onChange={(e) => setNyNrf(e.target.value)}
                className="mt-1 w-full rounded border border-slate-600 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] text-slate-400">Offisiell varetekst</label>
              <input
                type="text"
                placeholder="f.eks. Rør-i-rør 16mm"
                value={nyBeskrivelse}
                onChange={(e) => setNyBeskrivelse(e.target.value)}
                className="mt-1 w-full rounded border border-slate-600 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400">Mengde &amp; Enhet</label>
              <div className="mt-1 flex gap-1">
                <input
                  type="number"
                  min="1"
                  value={nyAntall}
                  onChange={(e) => setNyAntall(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-16 rounded border border-slate-600 bg-slate-900 px-2 py-1.5 text-center text-xs text-white"
                />
                <input
                  type="text"
                  value={nyEnhet}
                  onChange={(e) => setNyEnhet(e.target.value)}
                  className="w-14 rounded border border-slate-600 bg-slate-900 px-2 py-1.5 text-center text-xs text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] text-slate-400">Innkjøpspris (kr)</label>
              <input
                type="number"
                min="0"
                value={nyInnpris}
                onChange={(e) => setNyInnpris(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="mt-1 w-full rounded border border-slate-600 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400">Margin-profil</label>
              <select
                value={nyKategori}
                onChange={(e) => setNyKategori(e.target.value as 'Lokkeand' | 'Mester-tillegg')}
                className="mt-1 w-full rounded border border-slate-600 bg-slate-900 px-2 py-1.5 text-xs text-white"
              >
                <option value="Mester-tillegg">52,4 % Mester-tillegg</option>
                <option value="Lokkeand">20,0 % Lokkeand</option>
              </select>
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setVisNyVare(false)}
              className="rounded border border-slate-600 bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300"
            >
              Avbryt
            </button>
            <button
              type="button"
              onClick={leggTilVarepost}
              className="rounded border border-emerald-600 bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-500"
            >
              Legg til post
            </button>
          </div>
        </div>
      )}

      {/* Hovedtabell */}
      <div className="mb-6 overflow-x-auto rounded-lg border border-slate-700">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-700 bg-slate-800 text-xs uppercase text-slate-300">
              <th className="py-3 px-3">NRF-Nr.</th>
              <th className="py-3 px-3">Offisiell Varetekst</th>
              <th className="py-3 px-3 text-center">Antall</th>
              <th className="py-3 px-3 text-center">Margin-profil</th>
              <th className="py-3 px-3 text-right">Innpris</th>
              <th className="py-3 px-3 text-right">Utpris/stk</th>
              <th className="py-3 px-3 text-right">Sum Ut</th>
              <th className="py-3 px-2 text-center">Handling</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-xs sm:text-sm">
            {items.map((item) => {
              const utpris = beregnUtpris(item.innpris, item.kategori);
              const sumUt = utpris * Math.max(0, item.antall);
              return (
                <tr key={item.id} className="transition hover:bg-slate-800/60">
                  <td className="py-3 px-3 font-mono font-bold text-blue-400">{item.nrf}</td>
                  <td className="py-3 px-3 font-medium text-white">{item.beskrivelse}</td>
                  <td className="py-3 px-3 text-center">
                    <div className="inline-flex items-center rounded border border-slate-600 bg-slate-950 px-2 py-1">
                      <Edit3 className="mr-1.5 h-3.5 w-3.5 text-slate-400" />
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
                  <td className="py-3 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => toggleKategori(item.id)}
                      title="Klikk for å endre marginprofil (Lokkeand 20 % DG / Mester-tillegg 52,4 % DG)"
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold transition ${
                        item.kategori === 'Lokkeand'
                          ? 'border-amber-500/40 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                          : 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                      }`}
                    >
                      <ArrowUpDown className="h-3 w-3" />
                      {item.kategori === 'Lokkeand' ? '20 % Lokkeand' : '52,4 % Mester'}
                    </button>
                  </td>
                  <td className="py-3 px-3 text-right text-slate-400">
                    {item.innpris.toLocaleString('no-NO')} kr
                  </td>
                  <td className="py-3 px-3 text-right font-medium text-slate-200">
                    {utpris.toLocaleString('no-NO')} kr
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-white">
                    {sumUt.toLocaleString('no-NO')} kr
                  </td>
                  <td className="py-3 px-2 text-center">
                    <button
                      type="button"
                      onClick={() => slettVarepost(item.id)}
                      title="Slett varepost"
                      className="rounded p-1 text-slate-500 transition hover:bg-rose-950 hover:text-rose-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Kirsebærplukker-skjold & Eksport-knapper */}
      <div className="flex flex-col gap-4 rounded-lg border border-slate-700 bg-slate-800/90 p-4 xl:flex-row xl:items-center xl:justify-between">
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={systemRabattAktiv}
            onChange={() => setSystemRabattAktiv(!systemRabattAktiv)}
            className="h-5 w-5 rounded text-blue-600 focus:ring-0"
          />
          <div>
            <span className="flex items-center gap-1.5 text-sm font-bold text-white">
              <ShieldAlert className="h-4 w-4 text-amber-400" />
              Aktiver «Kirsebærplukker-skjold» (5 % Samlet Systemrabatt)
            </span>
            <span className="text-[11px] text-slate-400 block">
              {systemRabattAktiv
                ? `Gir kunden 5 % rabatt (-${rabattBelop.toLocaleString('no-NO')} kr) kun ved samlet ordre.`
                : 'Skjold inaktivt. Ingen samlet rabatt trekkes fra.'}
            </span>
          </div>
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => eksporterCSV('tripletex')}
            title="Eksporter CSV tilpasset Tripletex tilbudsimport"
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow transition hover:bg-indigo-500"
          >
            <FileSpreadsheet className="h-4 w-4" /> Tripletex Import
          </button>
          <button
            type="button"
            onClick={() => eksporterCSV('holte')}
            title="Eksporter CSV tilpasset Holte SmartKalk (NS 3420 post 31)"
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-2 text-xs font-semibold text-white shadow transition hover:bg-teal-600"
          >
            <FileSpreadsheet className="h-4 w-4" /> Holte SmartKalk
          </button>
          <button
            type="button"
            onClick={() => eksporterCSV('qa')}
            title="Eksporter fullstendig intern kalkyle med dekningsgrader og marginer"
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-slate-700 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-slate-600"
          >
            <Coins className="h-4 w-4 text-amber-400" /> Intern QA-kalkyle
          </button>
          <button
            type="button"
            onClick={() => eksporterCSV('m3')}
            title="Hurtigordre CSV for Ahlsell M3"
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-lg transition hover:bg-blue-500"
          >
            <Download className="h-4 w-4" /> Ahlsell M3 Hurtigordre
          </button>
          {onApproveToPdf && (
            <button
              type="button"
              onClick={() => onApproveToPdf(items, totalTilbudssumEksMva)}
              title="Godkjenn og generer A4 Tilbuds-PDF"
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-lg transition hover:bg-emerald-500"
            >
              <Sparkles className="h-4 w-4" /> A4 Tilbuds-PDF
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export { AhlsellOrderQA as SalesPilotDashboard };
export default AhlsellOrderQA;
