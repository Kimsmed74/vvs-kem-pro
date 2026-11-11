import { useState } from 'react';
import { AGENTER } from './agentData';
import type { ProsjektData } from '../data/prosjekter';
import type { ProsjektAnalyse } from '../lib/analyse';
import type { ProsjektFil, UttrekkResultat } from '../lib/filer';
import type { Innstillinger } from '../lib/lagring';
import FilOpplaster from '../components/FilOpplaster';
import { Knapp } from '../components/common/ui';

interface Props {
  prosjekt: ProsjektData;
  analyse: ProsjektAnalyse;
  filer: readonly ProsjektFil[];
  innstillinger: Innstillinger;
  qaFullfort: number;
  onFilerLastetOpp: (nye: ProsjektFil[]) => void;
  onOppdaterFil: (oppdatert: ProsjektFil) => void;
  onBrukUttrekk: (uttrekk: UttrekkResultat, modus: 'oppdater' | 'nytt') => void;
  onApneGalleri: () => void;
  onApneInnstillinger: () => void;
  melding: (tekst: string) => void;
  onVelgAgent: (agentId: string) => void;
  onApneChat: (agentId: string) => void;
  onVelgSuperKommando: () => void;
  onVelgQAPort: () => void;
  onStartVeiviser: () => void;
  onSlettProsjekt: () => void;
  onGaaTilModul: (modulId: string) => void;
}

export default function AgentHub({
  prosjekt,
  analyse,
  filer,
  innstillinger,
  qaFullfort,
  onFilerLastetOpp,
  onOppdaterFil,
  onBrukUttrekk,
  onApneGalleri,
  onApneInnstillinger,
  melding,
  onVelgAgent,
  onApneChat,
  onVelgSuperKommando,
  onVelgQAPort,
  onStartVeiviser,
  onSlettProsjekt,
  onGaaTilModul,
}: Props) {
  const [filterKategori, setFilterKategori] = useState<string>('alle');
  const [soketekst, setSoketekst] = useState<string>('');

  const filtrerteAgenter = AGENTER.filter((a) => {
    const matcherKategori = filterKategori === 'alle' || a.kategori === filterKategori;
    const matcherSok =
      a.navn.toLowerCase().includes(soketekst.toLowerCase()) ||
      a.nsKode.toLowerCase().includes(soketekst.toLowerCase()) ||
      a.kjernefunksjon.toLowerCase().includes(soketekst.toLowerCase());
    return matcherKategori && matcherSok;
  });

  const kravMm = (analyse.krav * 1000).toFixed(0);
  const lavesteKontroll =
    analyse.gulvKontroller.length > 0
      ? [...analyse.gulvKontroller].sort((a, b) => a.margin - b.margin)[0]
      : null;

  return (
    <div className="space-y-6">
      {/* 3 Globale Systemlover Bjelke */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Lov 1 */}
        <div className="rounded-xl border border-amber-900/60 bg-gradient-to-br from-amber-950/40 to-slate-900 p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400">LOV 1: 100 % SIKKERHET</span>
            <span className="rounded border border-amber-800 bg-amber-950 px-2 py-0.5 text-[10px] font-bold text-amber-300">
              ⚠️ HINT-KONTROLL
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-300">
            Ingen agent gjetter på koter, vanntrykk eller brannkonsept.
          </p>
          <div className="mt-2 text-[11px] font-semibold text-amber-300">
            {analyse.mangler.length} aktive forbehold flagget i {prosjekt.navn}.
          </div>
        </div>

        {/* Lov 2 */}
        <div className="rounded-xl border border-rose-900/60 bg-gradient-to-br from-rose-950/40 to-slate-900 p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-400">
              LOV 2: {kravMm} MM TILBAKESLAG
            </span>
            <span className="rounded border border-rose-800 bg-rose-950 px-2 py-0.5 text-[10px] font-bold text-rose-300">
              KOTEKONTROLL
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-300">
            Laveste sluk SKAL ligge ≥ {kravMm} mm over ITR i kommunal kum.
          </p>
          <div className="mt-2 text-[11px] font-bold">
            {analyse.lov2Status === 'mangler_data' ? (
              <span className="text-amber-300">
                ⚠️ HINT: Mangler koter (ITR / laveste sluk)
              </span>
            ) : analyse.lov2Status === 'brudd' && lavesteKontroll ? (
              <span className="text-rose-400">
                🚨 {lavesteKontroll.navn}: {(lavesteKontroll.margin * 1000).toFixed(0)} mm (Pumpekrav!)
              </span>
            ) : (
              <span className="text-emerald-400">
                ✅ Godkjent selvfall (laveste +
                {lavesteKontroll ? (lavesteKontroll.margin * 1000).toFixed(0) : kravMm} mm)
              </span>
            )}
          </div>
        </div>

        {/* Lov 3 */}
        <div className="rounded-xl border border-emerald-900/60 bg-gradient-to-br from-emerald-950/40 to-slate-900 p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400">LOV 3: BRANSJEUTSTYR & QA</span>
            <span className="rounded border border-emerald-800 bg-emerald-950 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
              AGENT 16 PORT ({qaFullfort}/6)
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-300">
            Kun utprøvd norsk bransjeutstyr. Alle tall revideres av Agent 16.
          </p>
          <div className="mt-2">
            <button
              onClick={onVelgQAPort}
              className="text-[11px] font-bold text-emerald-400 underline hover:text-emerald-300"
            >
              Åpne Agent 16 QA-port ({qaFullfort}/6 sjekket) ↗
            </button>
          </div>
        </div>
      </div>

      {/* Hurtigaksjoner: Veiviser + Super-Kommandoer + Drag-and-drop opplasting */}
      <div className="rounded-xl border border-sky-900/60 bg-gradient-to-r from-sky-950/40 via-slate-900 to-slate-900 p-5 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🚀</span>
              <h3 className="text-base font-bold text-sky-300">
                Arbeidsflyt & Dokument-/Tegningsanalyse for {prosjekt.navn}
              </h3>
            </div>
            <p className="mt-1 text-xs text-slate-300">
              Start 5-stegs prosjektveiviseren, slipp inn tegninger/bilder/PDF-er under, eller kjør Super-Kommandoene (1, 2, 3).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Knapp variant="primar" onClick={onStartVeiviser}>
              🚀 Prosjektveiviser (Steg-for-steg)
            </Knapp>
            <Knapp variant="sekundar" onClick={onApneGalleri}>
              🖼️ Prosjektgalleri & Arkiv ({filer.length})
            </Knapp>
            <Knapp variant="sekundar" onClick={onVelgSuperKommando}>
              ⚡ Super-Kommandoer (1, 2, 3)
            </Knapp>
            <Knapp variant="sekundar" onClick={onVelgQAPort}>
              🛡️ Djevelens Advokat (QA)
            </Knapp>
            <Knapp variant="fare" onClick={onSlettProsjekt}>
              🗑️ Slett prosjekt
            </Knapp>
          </div>
        </div>

        <FilOpplaster
          prosjektId={prosjekt.id}
          prosjektNavn={prosjekt.navn}
          eksisterendeFiler={filer}
          innstillinger={innstillinger}
          onFilerLastetOpp={onFilerLastetOpp}
          onOppdaterFil={onOppdaterFil}
          onBrukUttrekk={onBrukUttrekk}
          onApneInnstillinger={onApneInnstillinger}
          melding={melding}
          kompakt
        />
      </div>

      {/* Filter og Søkebjelke */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'alle', navn: 'Alle 19 Agenter' },
            { id: 'fag', navn: 'VVS & VA Fag (3, 4, 5, 6, 14, 17, 18, 19)' },
            { id: 'tverrfaglig', navn: 'BIM, ITB & Miljø (7, 8, 9, 12)' },
            { id: 'prosjekt', navn: 'Prosjekt & Fremdrift (1, 2)' },
            { id: 'kontrakt_qa', navn: 'Anbud, Tilbud & QA (10, 11, 13, 15, 16)' },
          ].map((kat) => (
            <button
              key={kat.id}
              onClick={() => setFilterKategori(kat.id)}
              className={`min-h-[44px] rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                filterKategori === kat.id
                  ? 'border border-emerald-700 bg-emerald-950 text-emerald-300'
                  : 'border border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {kat.navn}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-64">
          <input
            type="text"
            placeholder="Søk agent, NS-kode, fag..."
            value={soketekst}
            onChange={(e) => setSoketekst(e.target.value)}
            className="min-h-[44px] w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Agent Rutenett (19 Agenter) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtrerteAgenter.map((agent) => (
          <div
            key={agent.id}
            className="group flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg transition hover:border-emerald-600 hover:bg-slate-900"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-3xl">{agent.ikon}</span>
                <div className="flex flex-col items-end gap-1">
                  <span className="rounded border border-emerald-800 bg-emerald-950/80 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                    AGENT {agent.nummer < 10 ? `0${agent.nummer}` : agent.nummer}
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">
                    {agent.nsKode}
                  </span>
                </div>
              </div>

              <h4
                onClick={() => onVelgAgent(agent.id)}
                className="mt-3 cursor-pointer text-sm font-bold text-slate-100 transition group-hover:text-emerald-300"
              >
                {agent.navn}
              </h4>
              <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-slate-400">
                {agent.kjernefunksjon}
              </p>
            </div>

            <div className="mt-4 border-t border-slate-800/80 pt-3">
              <div className="flex items-center justify-between gap-2">
                <div className="max-w-[140px] truncate text-[10px] text-slate-500">
                  {agent.tilknyttetBeregningNavn ? (
                    <span className="font-medium text-emerald-400/90">
                      ⚡ {agent.tilknyttetBeregningNavn}
                    </span>
                  ) : (
                    <span>{agent.standarder[0] || 'Standard'}</span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {agent.tilknyttetModulId && (
                    <button
                      onClick={() => onGaaTilModul(agent.tilknyttetModulId!)}
                      title="Gå til beregning"
                      className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 text-xs text-slate-400 hover:bg-slate-800 hover:text-emerald-400"
                    >
                      🧮
                    </button>
                  )}
                  <button
                    onClick={() => onApneChat(agent.id)}
                    className="inline-flex min-h-[44px] items-center rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-600"
                  >
                    💬 Chat
                  </button>
                  <button
                    onClick={() => onVelgAgent(agent.id)}
                    className="inline-flex min-h-[44px] items-center rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-700 hover:text-white"
                  >
                    Åpne ↗
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
