import { useState } from 'react';
import type { ProsjektData } from '../data/prosjekter';
import type { ProsjektAnalyse } from '../lib/analyse';
import { lagKommandoPrompt } from '../lib/prompt';
import { lagArbeidsrapport } from '../lib/rapport';
import { SUPER_KOMMANDOER, AGENTER } from './agentData';
import { Kort, Knapp } from '../components/common/ui';

interface Props {
  prosjekt: ProsjektData;
  analyse: ProsjektAnalyse;
  melding: (tekst: string) => void;
  onVelgAgent: (agentId: string) => void;
  onApneChat: (agentId: string) => void;
}

export default function SuperKommandoer({
  prosjekt,
  analyse,
  melding,
  onVelgAgent,
  onApneChat,
}: Props) {
  const [aktivKommandoId, setAktivKommandoId] = useState<string>('kommando-2');
  const [kjortRapport, setKjortRapport] = useState<string | null>(null);

  const aktiv = SUPER_KOMMANDOER.find((k) => k.id === aktivKommandoId) || SUPER_KOMMANDOER[0];
  const kjedePrompt = lagKommandoPrompt(aktiv, prosjekt, analyse);

  const kopierPrompt = () => {
    navigator.clipboard?.writeText(kjedePrompt);
    melding(`📋 Super-Kommando ${aktiv.nummer} prompt kopiert til utklippstavlen!`);
  };

  const kjorLokalKommando = () => {
    const rapport = lagArbeidsrapport(aktiv, prosjekt, analyse);
    setKjortRapport(rapport);
    melding(`⚡ Super-Kommando ${aktiv.nummer} kjørt på tallene i ${prosjekt.navn}!`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-sky-900/60 bg-gradient-to-r from-sky-950/40 via-slate-900 to-slate-900 p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">⚡</span>
              <h2 className="text-xl font-bold text-sky-300">
                Super-Kommandoer (Multi-Agent Arbeidsflyt)
              </h2>
              <span className="rounded border border-sky-800 bg-sky-950 px-2 py-0.5 text-xs font-bold text-sky-300">
                {prosjekt.navn}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-300">
              Kjør hele kjeder av spesialist-agenter i serie på det aktive prosjektet – enten som lokal arbeidsrapport i appen eller som ferdig utfylt kjede-prompt.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Knapp variant="sekundar" onClick={kopierPrompt}>
              📋 Kopier Kjede-Prompt
            </Knapp>
            <Knapp variant="primar" onClick={kjorLokalKommando}>
              ⚡ Kjør Kjede i Appen
            </Knapp>
          </div>
        </div>

        {/* Kommando-velger knapper */}
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {SUPER_KOMMANDOER.map((k) => {
            const erAktiv = k.id === aktivKommandoId;
            return (
              <button
                key={k.id}
                onClick={() => {
                  setAktivKommandoId(k.id);
                  setKjortRapport(null);
                }}
                className={`rounded-lg border p-3 text-left transition ${
                  erAktiv
                    ? 'border-sky-500 bg-sky-950/50 text-white shadow-md'
                    : 'border-slate-700 bg-slate-900/60 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-lg">{k.ikon}</span>
                  <span
                    className={`text-[11px] font-bold ${
                      erAktiv ? 'text-sky-300' : 'text-slate-500'
                    }`}
                  >
                    KOMMANDO {k.nummer}
                  </span>
                </div>
                <div className="mt-1 text-xs font-bold text-slate-200">{k.navn}</div>
                <div className="mt-1 line-clamp-2 text-[11px] text-slate-400">
                  {k.kortBeskrivelse}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Visning av aktiv kommando */}
      <Kort tittel={`Kommando ${aktiv.nummer}: ${aktiv.navn}`} ikon={aktiv.ikon}>
        <div className="space-y-4">
          <p className="text-xs text-slate-300">{aktiv.kortBeskrivelse}</p>

          {/* Agenter i kjeden */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Deltakende Agenter i Rekkefølge:
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {aktiv.agenter.map((aId, index) => {
                const agent = AGENTER.find((a) => a.id === aId);
                if (!agent) return null;
                return (
                  <div key={aId} className="flex items-center gap-1.5">
                    <div className="flex items-center rounded-lg border border-slate-700 bg-slate-900 text-xs">
                      <button
                        onClick={() => onVelgAgent(aId)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-slate-300 hover:text-white"
                      >
                        <span>{agent.ikon}</span>
                        <span className="font-semibold">
                          Agent {agent.nummer < 10 ? `0${agent.nummer}` : agent.nummer}:
                        </span>
                        <span>{agent.kortNavn}</span>
                      </button>
                      <button
                        onClick={() => onApneChat(aId)}
                        title="Spør agenten i AI-chat"
                        className="border-l border-slate-700 px-2 py-1.5 text-emerald-400 hover:bg-slate-800"
                      >
                        💬
                      </button>
                    </div>
                    {index < aktiv.agenter.length - 1 && (
                      <span className="font-bold text-slate-600">→</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Kjørt rapport resultat */}
          {kjortRapport && (
            <div className="rounded-lg border border-emerald-800/80 bg-slate-950 p-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-emerald-900/50 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400">✅</span>
                  <span className="text-xs font-bold text-emerald-300">
                    Syntetisert Multi-Agent Arbeidsrapport ({prosjekt.navn})
                  </span>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(kjortRapport);
                    melding('📋 Resultatnotat kopiert!');
                  }}
                  className="text-xs font-semibold text-emerald-400 hover:text-emerald-300"
                >
                  📋 Kopier notat
                </button>
              </div>
              <pre className="mt-3 overflow-x-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-slate-200">
                {kjortRapport}
              </pre>
            </div>
          )}

          {/* Prompt Preview */}
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-semibold text-slate-400">
                1-klikks Super-Prompt m/ tallene fra {prosjekt.navn}
              </span>
              <button
                onClick={kopierPrompt}
                className="text-xs font-semibold text-sky-400 hover:text-sky-300"
              >
                📋 Kopier prompt
              </button>
            </div>
            <pre className="mt-3 max-h-96 overflow-y-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-slate-300">
              {kjedePrompt}
            </pre>
          </div>
        </div>
      </Kort>
    </div>
  );
}
