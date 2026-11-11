import { useState } from 'react';
import Trykkfall from './Trykkfall';
import Koblingsledning from './Koblingsledning';
import Spillvann from './Spillvann';
import Overvann from './Overvann';
import Bereder from './Bereder';
import Koter from './Koter';
import TrykkOgKoteVeileder from '../../TrykkOgKoteVeileder';
import type { ProsjektData } from '../../../data/prosjekter';
import type { ProsjektAnalyse } from '../../../lib/analyse';
import type { KalkulatorTilstand, OverstyringInfo } from '../../../lib/lagring';

const FANER = [
  { id: 'trykkfall', navn: '💧 Trykkfall KV/VV', agentId: 'agent-03', agentNavn: 'Agent 03 (Sanitær)' },
  { id: 'kobling', navn: '🚿 Koblingsledning', agentId: 'agent-03', agentNavn: 'Agent 03 (Sanitær)' },
  { id: 'spillvann', navn: '🚽 Spillvann', agentId: 'agent-03', agentNavn: 'Agent 03 (Bunnledning)' },
  { id: 'koter', navn: '📐 Koter & utvendig VA', agentId: 'agent-19', agentNavn: 'Agent 19 (Utvendig VA)' },
  { id: 'overvann', navn: '🌧️ Overvann', agentId: 'agent-19', agentNavn: 'Agent 19 (Fordrøyning)' },
  { id: 'bereder', navn: '🔥 Bereder (VVB)', agentId: 'agent-03', agentNavn: 'Agent 03 (Berederkapasitet)' },
] as const;

export type FaneId = (typeof FANER)[number]['id'];

interface Props {
  melding: (t: string) => void;
  prosjekt: ProsjektData;
  analyse?: ProsjektAnalyse;
  krav: number;
  startFane?: FaneId;
  kalkulatorer?: KalkulatorTilstand;
  overstyringer?: Record<string, OverstyringInfo>;
  qa?: Record<string, boolean>;
  onToggleQa?: (id: string) => void;
  onOppdaterProsjekt?: (prosjekt: ProsjektData, endringer?: string[]) => void;
  onOppdaterProsjektOgOverstyringer?: (
    prosjekt: ProsjektData,
    overstyringer: Record<string, OverstyringInfo>,
    endringer: string[]
  ) => void;
  onOppdaterKalkulatorer?: (oppdatering: Partial<KalkulatorTilstand>) => void;
  onVelgAgent?: (agentId: string) => void;
}

export default function Sanitaer({
  melding,
  prosjekt,
  analyse,
  krav,
  startFane = 'trykkfall',
  kalkulatorer,
  overstyringer,
  qa,
  onToggleQa,
  onOppdaterProsjekt,
  onOppdaterProsjektOgOverstyringer,
  onOppdaterKalkulatorer,
  onVelgAgent,
}: Props) {
  const [fane, setFane] = useState<FaneId>(startFane);
  const aktivFaneInfo = FANER.find((f) => f.id === fane);

  return (
    <div className="space-y-6">
      {/* Global prosjekt-state, > 6,0 bar varsel, og Vanntrykk vs. Koter veileder & sjekkliste */}
      {analyse && (
        <TrykkOgKoteVeileder
          prosjekt={prosjekt}
          analyse={analyse}
          modulNavn="Modul 1: Sanitær & Rørdimensjonering"
          lokaltTrykkKpa={kalkulatorer?.trykkfall?.budsjett.hovedtrykk}
          overstyringer={overstyringer}
          qa={qa}
          onToggleQa={onToggleQa}
          onOppdaterProsjekt={onOppdaterProsjekt}
          onOppdaterProsjektOgOverstyringer={onOppdaterProsjektOgOverstyringer}
          melding={melding}
        />
      )}

      {/* Fanevelger med integrert agent-kobling */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 pb-2">
        <div role="tablist" className="flex max-w-full overflow-x-auto gap-1.5 pb-1 touch-pan-x">
          {FANER.map((f) => (
            <button
              key={f.id}
              role="tab"
              aria-selected={fane === f.id}
              onClick={() => setFane(f.id)}
              className={`min-h-[44px] shrink-0 whitespace-nowrap border-b-2 px-3.5 py-2.5 text-xs sm:text-sm font-bold transition ${
                fane === f.id ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {f.navn}
            </button>
          ))}
        </div>

        {onVelgAgent && aktivFaneInfo && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onVelgAgent(aktivFaneInfo.agentId)}
              className="flex min-h-[44px] items-center gap-1.5 rounded-lg border border-emerald-700/80 bg-emerald-950/60 px-3.5 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-900 transition shadow"
            >
              <span>🤖</span>
              <span>Kjør {aktivFaneInfo.agentNavn}</span>
              <span className="text-[10px]">↗</span>
            </button>
            <button
              onClick={() => onVelgAgent('agent-16')}
              className="flex min-h-[44px] items-center gap-1.5 rounded-lg border border-rose-800/80 bg-rose-950/60 px-3.5 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-900 transition shadow"
            >
              <span>🛡️</span>
              <span>Agent 16 QA</span>
              <span className="text-[10px]">↗</span>
            </button>
          </div>
        )}
      </div>

      {fane === 'trykkfall' && (
        <Trykkfall
          key={prosjekt.id}
          melding={melding}
          prosjektNavn={prosjekt.navn}
          prosjektData={prosjekt}
          analyse={analyse}
          onOppdaterProsjekt={(p) => onOppdaterProsjekt?.(p)}
          startVerdi={kalkulatorer?.trykkfall}
          onEndring={(trykkfall) => onOppdaterKalkulatorer?.({ trykkfall })}
        />
      )}
      {fane === 'kobling' && (
        <Koblingsledning key={prosjekt.id} prosjekt={prosjekt} melding={melding} />
      )}
      {fane === 'spillvann' && (
        <Spillvann key={prosjekt.id} prosjekt={prosjekt} melding={melding} />
      )}
      {fane === 'koter' && (
        <Koter
          key={`${prosjekt.id}:${krav}`}
          prosjekt={prosjekt}
          krav={krav}
          onOppdaterProsjekt={(p) => onOppdaterProsjekt?.(p)}
          melding={melding}
        />
      )}
      {fane === 'overvann' && (
        <Overvann
          key={prosjekt.id}
          prosjekt={prosjekt}
          startFlater={kalkulatorer?.overvann}
          onEndring={(overvann) => onOppdaterKalkulatorer?.({ overvann })}
          melding={melding}
        />
      )}
      {fane === 'bereder' && (
        <Bereder
          key={prosjekt.id}
          prosjekt={prosjekt}
          startVerdi={kalkulatorer?.bereder}
          onEndring={(bereder) => onOppdaterKalkulatorer?.({ bereder })}
          melding={melding}
        />
      )}
    </div>
  );
}
