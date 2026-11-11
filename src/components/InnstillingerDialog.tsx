import { useState } from 'react';
import type { Innstillinger } from '../lib/lagring';
import { STANDARD_MODELL } from '../lib/lagring';
import { useBekreftSlett } from './common/BekreftSlettModal';
import Modal from './common/Modal';

export default function InnstillingerDialog({
  innstillinger,
  krav,
  antallSkjultePresets = 0,
  onGjenopprettPresets,
  onLagre,
  onLukk,
}: {
  innstillinger: Innstillinger;
  krav: number;
  antallSkjultePresets?: number;
  onGjenopprettPresets?: () => void;
  onLagre: (i: Innstillinger, krav: number) => void;
  onLukk: () => void;
}) {
  const [nokkel, setNokkel] = useState(innstillinger.geminiNokkel);
  const [modell, setModell] = useState(innstillinger.modell);
  const [k, setK] = useState(krav);
  const [vis, setVis] = useState(false);
  const bekreftSlett = useBekreftSlett();

  return (
    <Modal tittel="⚙️ Innstillinger" onLukk={onLukk} bredde="max-w-xl">
      <div className="space-y-5 text-sm text-slate-300">
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">Gemini API (AI-chat & Vision)</h3>
          <label className="mt-2 block text-xs font-semibold">
            API-nøkkel
            <div className="mt-1 flex gap-2">
              <input
                type={vis ? 'text' : 'password'}
                autoComplete="off"
                spellCheck={false}
                value={nokkel}
                onChange={(e) => setNokkel(e.target.value)}
                placeholder="Lim inn nøkkelen din fra Google AI Studio"
                className="min-h-[44px] w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 font-mono text-base sm:text-xs outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={() => setVis((v) => !v)}
                className="min-h-[44px] shrink-0 rounded-lg border border-slate-600 px-3.5 text-xs font-semibold hover:bg-slate-800"
              >
                {vis ? 'Skjul' : 'Vis'}
              </button>
            </div>
          </label>
          <label className="mt-3 block text-xs font-semibold">
            Modell
            <input
              value={modell}
              onChange={(e) => setModell(e.target.value)}
              className="mt-1 min-h-[44px] w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 font-mono text-base sm:text-xs outline-none focus:border-emerald-500"
            />
            <span className="mt-0.5 block text-[10px] font-normal text-slate-500">Standard: {STANDARD_MODELL}. Bytt hvis Google har endret modellnavn.</span>
          </label>
          <p className="mt-3 rounded-lg border border-amber-800/70 bg-amber-950/30 p-3 text-xs text-amber-200">
            Nøkkelen lagres kun i denne nettleseren (localStorage) og sendes direkte til Google – aldri til andre. Alle som har tilgang til denne nettleserprofilen kan lese den, så bruk en nøkkel med begrensede kvoter, og ikke lagre den på delt PC. Prosjektdata du sender i chatten går også til Google.
          </p>
          {nokkel && (
            <button
              type="button"
              onClick={() =>
                bekreftSlett({
                  tittel: 'Fjerne Gemini API-nøkkel?',
                  elementNavn: 'Lagret Gemini API-nøkkel',
                  beskrivelse: 'Er du sikker på at du vil tømme feltet for API-nøkkelen? Husk også å klikke «Lagre» etterpå for å slette den fra nettleserens minne.',
                  bekreftTekst: '🗑️ Fjern nøkkel',
                  onBekreft: () => setNokkel(''),
                })
              }
              className="mt-2 inline-flex min-h-[44px] items-center rounded-lg border border-rose-800/70 bg-rose-950/30 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-900/50"
            >
              🗑️ Fjern API-nøkkelen
            </button>
          )}
        </section>

        <section>
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">Krav til overhøyde mot tilbakeslag (Lov 2)</h3>
          <select
            value={k}
            onChange={(e) => setK(Number(e.target.value))}
            className="mt-2 min-h-[44px] w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-base sm:text-xs outline-none focus:border-emerald-500"
          >
            <option value={0.95}>0,95 m – systemmanualen / kommunal VA-norm (strengest, anbefalt)</option>
            <option value={0.9}>0,90 m – TEK17 § 15-6(3) og § 15-8(3), preakseptert ytelse</option>
          </select>
          <p className="mt-1 text-[11px] text-slate-500">Gjelder alle alarmer og kalkulatorer. Sjekk alltid gjeldende krav i kommunens VA-norm.</p>
        </section>

        {onGjenopprettPresets && (
          <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Standard-prosjekter (Case 01–05)
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              {antallSkjultePresets > 0
                ? `Du har slettet ${antallSkjultePresets} av de 5 innebygde referanse-casene (Case 01–05). Du kan gjenopprette dem her når som helst.`
                : 'Alle 5 innebygde referanse-caser (Case 01–05) er synlige i prosjektvelgeren.'}
            </p>
            <button
              type="button"
              onClick={onGjenopprettPresets}
              className="mt-3 inline-flex min-h-[44px] items-center rounded-lg border border-emerald-700 bg-emerald-950/60 px-3.5 py-2 text-xs font-bold text-emerald-200 hover:bg-emerald-900"
            >
              🔄 Gjenopprett standard-casene (Case 01–05)
            </button>
          </section>
        )}

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-800 pt-4">
          <button
            type="button"
            onClick={onLukk}
            className="inline-flex min-h-[44px] items-center rounded-lg border border-slate-600 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800"
          >
            Avbryt
          </button>
          <button
            type="button"
            onClick={() => onLagre({ geminiNokkel: nokkel.trim(), modell: modell.trim() || STANDARD_MODELL }, k)}
            className="inline-flex min-h-[44px] items-center rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500"
          >
            Lagre
          </button>
        </div>
      </div>
    </Modal>
  );
}
