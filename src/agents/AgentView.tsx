import { useState } from 'react';
import type { AgentDefinisjon } from './types';
import type { ProsjektData } from '../data/prosjekter';
import type { ProsjektAnalyse } from '../lib/analyse';
import type { ProsjektFil, UttrekkResultat } from '../lib/filer';
import type { Innstillinger, OverstyringInfo } from '../lib/lagring';
import { lagSuperPrompt } from '../lib/prompt';
import FilOpplaster from '../components/FilOpplaster';
import GatekeeperPanel from '../components/GatekeeperPanel';
import MoteOpptaker from '../components/MoteOpptaker';
import TrykkOgKoteVeileder from '../components/TrykkOgKoteVeileder';
import { Kort, Knapp } from '../components/common/ui';

interface Props {
  agent: AgentDefinisjon;
  prosjekt: ProsjektData;
  analyse: ProsjektAnalyse;
  sjekk: Record<string, boolean>;
  qa?: Record<string, boolean>;
  overstyringer?: Record<string, OverstyringInfo>;
  qaFullfort?: number;
  innstillinger?: Innstillinger;
  onToggleSjekk: (punktId: string) => void;
  onToggleQa?: (id: string) => void;
  onOppdaterProsjekt?: (prosjekt: ProsjektData, endringer?: string[]) => void;
  onOppdaterProsjektOgOverstyringer?: (
    prosjekt: ProsjektData,
    overstyringer: Record<string, OverstyringInfo>,
    endringer: string[]
  ) => void;
  onFilerLastetOpp?: (nye: ProsjektFil[]) => void;
  onOppdaterFil?: (oppdatert: ProsjektFil) => void;
  onBrukUttrekk?: (uttrekk: UttrekkResultat, modus: 'oppdater' | 'nytt') => void;
  onApneInnstillinger?: () => void;
  onVelgAgent?: (agentId: string) => void;
  melding: (tekst: string) => void;
  onGaaTilModul?: (modulId: string) => void;
  onGaaTilQAPort?: () => void;
  onApneChat: (agentId: string, sporsmal?: string) => void;
}

type TabType = 'fagnotat' | 'sjekkliste' | 'prompt' | 'kilder';

export default function AgentView({
  agent,
  prosjekt,
  analyse,
  sjekk,
  qa = {},
  overstyringer = {},
  qaFullfort = 0,
  innstillinger,
  onToggleSjekk,
  onToggleQa,
  onOppdaterProsjekt,
  onOppdaterProsjektOgOverstyringer,
  onFilerLastetOpp,
  onOppdaterFil,
  onBrukUttrekk,
  onApneInnstillinger,
  onVelgAgent,
  melding,
  onGaaTilModul,
  onGaaTilQAPort,
  onApneChat,
}: Props) {
  const [aktivTab, setAktivTab] = useState<TabType>('fagnotat');
  const [visInnhenting, setVisInnhenting] = useState(false);

  const agentNr = agent.nummer < 10 ? `0${agent.nummer}` : String(agent.nummer);
  const fullforteSjekker = agent.sjekkliste.filter((p) => sjekk[`${agent.id}:${p.id}`]).length;
  const totaltSjekker = agent.sjekkliste.length;
  const sjekkProsent =
    totaltSjekker > 0 ? Math.round((fullforteSjekker / totaltSjekker) * 100) : 100;

  const superPrompt = lagSuperPrompt(agent, prosjekt, analyse);

  const kopierPrompt = () => {
    navigator.clipboard?.writeText(superPrompt);
    melding(`📋 Super-Prompt for Agent ${agentNr} m/ tall fra ${prosjekt.navn} kopiert!`);
  };

  return (
    <div className="space-y-6">
      {/* Agent Banner */}
      <div className="rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <span className="text-4xl">{agent.ikon}</span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded border border-emerald-800 bg-emerald-950 px-2 py-0.5 text-xs font-bold text-emerald-300">
                  AGENT {agentNr}
                </span>
                <span className="rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-xs font-semibold text-slate-300">
                  {agent.nsKode}
                </span>
                <span className="text-xs text-slate-400">
                  Standarder: {agent.standarder.join(', ')}
                </span>
              </div>
              <h2 className="mt-1 text-2xl font-black text-slate-100">{agent.navn}</h2>
              <p className="mt-1 max-w-3xl text-xs text-slate-300">{agent.rolleBeskrivelse}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Knapp variant="primar" onClick={() => onApneChat(agent.id)}>
              💬 Spør Agent {agentNr} i AI-chat
            </Knapp>
            {agent.tilknyttetModulId && onGaaTilModul && (
              <Knapp
                variant="sekundar"
                onClick={() => onGaaTilModul(agent.tilknyttetModulId!)}
              >
                🧮 Åpne Beregningsmodul
              </Knapp>
            )}
            <Knapp variant="sekundar" onClick={kopierPrompt}>
              📋 Kopier Super-Prompt
            </Knapp>
          </div>
        </div>

        {/* Hurtigstatus og integrasjon med aktivt prosjekt */}
        <div className="mt-5 grid gap-3 border-t border-slate-800 pt-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
            <div className="text-[11px] font-semibold text-slate-400">Aktivt Prosjekt</div>
            <div className="mt-0.5 truncate text-xs font-bold text-slate-200">{prosjekt.navn}</div>
            <div className="text-[10px] text-slate-500">
              {prosjekt.bra ? `${prosjekt.bra} m²` : 'BRA ikke satt'} | {prosjekt.bygningstype}
            </div>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
            <div className="text-[11px] font-semibold text-slate-400">Tilknyttet Beregning</div>
            <div className="mt-0.5 text-xs font-bold text-emerald-400">
              {agent.tilknyttetBeregningNavn || 'Fagspesifikk Modell'}
            </div>
            <div className="text-[10px] text-slate-500">
              {analyse.mangler.length} åpne ⚠️ HINT i prosjektet
            </div>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
            <div className="text-[11px] font-semibold text-slate-400">KS & Sjekkliste</div>
            <div className="mt-0.5 text-xs font-bold text-sky-400">
              {fullforteSjekker} av {totaltSjekker} sjekket ({sjekkProsent}%)
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full bg-sky-500 transition-all"
                style={{ width: `${sjekkProsent}%` }}
              />
            </div>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
            <div className="text-[11px] font-semibold text-slate-400">QA-Port (Agent 16)</div>
            <div className="mt-0.5 text-xs font-bold text-amber-400">
              {agent.nummer === 16 ? 'Aktiv revisor' : 'Revideres av Agent 16'}
            </div>
            {agent.nummer !== 16 && onGaaTilQAPort && (
              <button
                onClick={onGaaTilQAPort}
                className="mt-0.5 block text-[10px] text-rose-400 underline hover:text-rose-300"
              >
                Gå til QA-port ↗
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Global Prosjekt-State (Single Source of Truth), Kartverket-oppslag, Vanntrykk vs. Koter & > 6,0 bar varsel */}
      <TrykkOgKoteVeileder
        prosjekt={prosjekt}
        analyse={analyse}
        modulNavn={`Agent ${agentNr} (${agent.navn})`}
        overstyringer={overstyringer}
        qa={qa}
        onToggleQa={onToggleQa}
        onOppdaterProsjekt={onOppdaterProsjekt}
        onOppdaterProsjektOgOverstyringer={onOppdaterProsjektOgOverstyringer}
        melding={melding}
        kompakt
      />

      {/* Direkte opplasting av tegninger/dokumenter og kontinuerlig møteopptak inne på agenten */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-bold text-slate-200">
            📂🎙️ Direkte datainnhenting for Agent {agentNr} (Tegninger, PDF/Excel & Kontinuerlig møteopptak)
          </div>
          <button
            type="button"
            onClick={() => setVisInnhenting((v) => !v)}
            className="rounded-lg border border-emerald-600/80 bg-emerald-950/60 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-900/60"
          >
            {visInnhenting
              ? '🔽 Skjul opplasting & møteopptak'
              : '📂 Last opp tegning/dokument eller 🎙️ ta møteopptak her'}
          </button>
        </div>

        {visInnhenting && innstillinger && onFilerLastetOpp && onOppdaterFil && onBrukUttrekk && onOppdaterProsjekt && (
          <div className="mt-3 grid gap-4 lg:grid-cols-2">
            <FilOpplaster
              prosjektId={prosjekt.id}
              prosjektNavn={prosjekt.navn}
              eksisterendeFiler={[]}
              innstillinger={innstillinger}
              onFilerLastetOpp={onFilerLastetOpp}
              onOppdaterFil={onOppdaterFil}
              onBrukUttrekk={onBrukUttrekk}
              onApneInnstillinger={onApneInnstillinger}
              melding={melding}
              kompakt
            />
            <MoteOpptaker
              prosjekt={prosjekt}
              innstillinger={innstillinger}
              onOppdaterProsjekt={onOppdaterProsjekt}
              onFilerLastetOpp={onFilerLastetOpp}
              onVelgAgent={onVelgAgent}
              melding={melding}
              kompakt
            />
          </div>
        )}
      </div>

      {/* Intelligent Gatekeeper & Overstyring (Aldri stopp prosessen) */}
      {onOppdaterProsjektOgOverstyringer && (
        <GatekeeperPanel
          prosjekt={prosjekt}
          analyse={analyse}
          overstyringer={overstyringer}
          qaFullfort={qaFullfort}
          onOppdaterProsjektOgOverstyringer={onOppdaterProsjektOgOverstyringer}
          onApneChatMedTekst={(sporsmal) => onApneChat(agent.id, sporsmal)}
          melding={melding}
        />
      )}

      {/* Faner */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800">
        <FaneKnapp aktiv={aktivTab === 'fagnotat'} onClick={() => setAktivTab('fagnotat')}>
          📋 Fagnotat & Leveranse (6 Seksjoner)
        </FaneKnapp>
        <FaneKnapp aktiv={aktivTab === 'sjekkliste'} onClick={() => setAktivTab('sjekkliste')}>
          ✅ Interaktiv Sjekkliste ({fullforteSjekker}/{totaltSjekker})
        </FaneKnapp>
        <FaneKnapp aktiv={aktivTab === 'prompt'} onClick={() => setAktivTab('prompt')}>
          💬 Super-Prompt m/ Prosjekttall
        </FaneKnapp>
        <FaneKnapp aktiv={aktivTab === 'kilder'} onClick={() => setAktivTab('kilder')}>
          📚 Standarder & Kilder ({agent.kilder.length})
        </FaneKnapp>
      </div>

      {/* Fane 1: Fagnotat */}
      {aktivTab === 'fagnotat' && (
        <div className="space-y-4">
          {agent.seksjoner.map((sek, idx) => (
            <Kort key={idx} tittel={sek.tittel}>
              <div className="whitespace-pre-wrap text-xs leading-relaxed text-slate-300">
                {sek.innhold}
              </div>
            </Kort>
          ))}
        </div>
      )}

      {/* Fane 2: Sjekkliste */}
      {aktivTab === 'sjekkliste' && (
        <Kort tittel={`Kvalitetssikring & KS-rutine for Agent ${agentNr} (${prosjekt.navn})`} ikon="✅">
          <p className="mb-4 text-xs text-slate-400">
            Huk av punktene etter hvert som de prosjekteres. Avkryssingen lagres automatisk på det aktive prosjektet:
          </p>
          <div className="space-y-2">
            {agent.sjekkliste.map((punkt) => {
              const erSjekket = !!sjekk[`${agent.id}:${punkt.id}`];
              return (
                <label
                  key={punkt.id}
                  className={`flex cursor-pointer items-start justify-between rounded-lg border p-3 text-xs transition ${
                    erSjekket
                      ? 'border-emerald-700/60 bg-emerald-950/20 text-emerald-200'
                      : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={erSjekket}
                      onChange={() => onToggleSjekk(punkt.id)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-400"
                    />
                    <div>
                      <div className="font-medium">{punkt.tekst}</div>
                      {punkt.standard && (
                        <div className="mt-0.5 text-[10px] text-slate-500">
                          Referanse: {punkt.standard}
                        </div>
                      )}
                    </div>
                  </div>
                  {punkt.kritisk && (
                    <span className="ml-2 shrink-0 rounded border border-rose-800 bg-rose-950 px-1.5 py-0.5 text-[10px] font-bold text-rose-300">
                      KRITISK
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </Kort>
      )}

      {/* Fane 3: Master-Prompt */}
      {aktivTab === 'prompt' && (
        <Kort tittel="1-klikks Super-Prompt m/ Prosjektdata & Beregnede Verdier" ikon="💬">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
              <p>
                Ferdig utfylt med tallene og beregningene fra <strong>{prosjekt.navn}</strong>. Bruk i AI-chat i appen eller lim inn i NotebookLM / ChatGPT / Claude:
              </p>
              <div className="flex gap-2">
                <Knapp variant="primar" onClick={() => onApneChat(agent.id)}>
                  💬 Åpne i AI-chat
                </Knapp>
                <Knapp variant="sekundar" onClick={kopierPrompt}>
                  📋 Kopier Super-Prompt
                </Knapp>
              </div>
            </div>
            <pre className="max-h-[500px] overflow-y-auto whitespace-pre-wrap rounded-lg border border-slate-800 bg-slate-950 p-4 font-mono text-[11px] leading-relaxed text-slate-200">
              {superPrompt}
            </pre>
          </div>
        </Kort>
      )}

      {/* Fane 4: Kilder */}
      {aktivTab === 'kilder' && (
        <Kort tittel="Påkrevde Regler, Standarder & Tekniske Håndbøker" ikon="📚">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="py-2">Dokument / Regelverk</th>
                  <th className="py-2">Type</th>
                  <th className="py-2">Hvor kilden finnes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {agent.kilder.map((kilde, i) => (
                  <tr key={i}>
                    <td className="py-2.5 font-semibold text-slate-200">{kilde.navn}</td>
                    <td>
                      <span className="rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                        {kilde.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="text-slate-400">{kilde.kilde}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Kort>
      )}

      {/* Mesterens Huskeliste & Fallgruver */}
      <div className="rounded-xl border border-amber-900/60 bg-amber-950/20 p-5 shadow-lg">
        <div className="flex items-center gap-2 text-sm font-bold text-amber-300">
          <span>⚠️</span>
          <h3>Mesterens Huskeliste & Kritiske Fallgruver (Agent {agentNr})</h3>
        </div>
        <ul className="mt-3 list-inside list-disc space-y-1.5 text-xs text-amber-200/90">
          {agent.mesterensHuskeliste.map((tips, idx) => (
            <li key={idx} className="leading-relaxed">
              {tips}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function FaneKnapp({
  aktiv,
  onClick,
  children,
}: {
  aktiv: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[44px] border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
        aktiv
          ? 'border-emerald-400 bg-emerald-950/20 text-emerald-400'
          : 'border-transparent text-slate-400 hover:border-slate-700 hover:text-slate-200'
      }`}
    >
      {children}
    </button>
  );
}
