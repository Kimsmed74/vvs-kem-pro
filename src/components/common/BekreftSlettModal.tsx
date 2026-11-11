import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import Modal from './Modal';

export interface SlettForesporsel {
  tittel: string;
  elementNavn?: string;
  beskrivelse: string;
  detaljer?: string;
  bekreftTekst?: string;
  onBekreft: () => void;
}

interface BekreftKontekstVerdi {
  beOmSletting: (foresporsel: SlettForesporsel) => void;
}

const BekreftSlettContext = createContext<BekreftKontekstVerdi | null>(null);

/**
 * 2-stegs bekreftelsesmodal som forhindrer utilsiktet sletting av prosjekter,
 * filer, chathistorikk eller rader/beregninger (spesielt viktig på touch-skjerm).
 */
export function BekreftSlettModal({
  foresporsel,
  onAvbryt,
}: {
  foresporsel: SlettForesporsel;
  onAvbryt: () => void;
}) {
  return (
    <Modal tittel={`⚠️ ${foresporsel.tittel}`} onLukk={onAvbryt} bredde="max-w-md">
      <div className="space-y-4 text-sm text-slate-200">
        <div className="rounded-xl border border-rose-800/80 bg-rose-950/40 p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🗑️</span>
            <div>
              <div className="font-bold text-rose-200">Er du sikker? (2-stegs bekreftelse)</div>
              {foresporsel.elementNavn && (
                <div className="mt-1 rounded border border-rose-800/60 bg-slate-950/70 px-2.5 py-1 text-xs font-bold text-rose-300">
                  {foresporsel.elementNavn}
                </div>
              )}
              <p className="mt-1.5 text-xs leading-relaxed text-slate-200">
                {foresporsel.beskrivelse}
              </p>
              {foresporsel.detaljer && (
                <p className="mt-2 rounded bg-slate-950/70 p-2 font-mono text-[11px] text-rose-300">
                  {foresporsel.detaljer}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onAvbryt}
            className="min-h-[44px] rounded-xl border border-slate-600 bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-200 transition hover:bg-slate-700"
          >
            Avbryt (Behold data)
          </button>
          <button
            type="button"
            onClick={() => {
              foresporsel.onBekreft();
              onAvbryt();
            }}
            className="min-h-[44px] rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-lg transition hover:bg-rose-500"
          >
            {foresporsel.bekreftTekst ?? '🗑️ Bekreft sletting'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function BekreftSlettProvider({ children }: { children: ReactNode }) {
  const [aktiv, setAktiv] = useState<SlettForesporsel | null>(null);
  const beOmSletting = useCallback((f: SlettForesporsel) => {
    setAktiv(f);
  }, []);

  return (
    <BekreftSlettContext.Provider value={{ beOmSletting }}>
      {children}
      {aktiv && <BekreftSlettModal foresporsel={aktiv} onAvbryt={() => setAktiv(null)} />}
    </BekreftSlettContext.Provider>
  );
}

export function useBekreftSlett(): (foresporsel: SlettForesporsel) => void {
  const ctx = useContext(BekreftSlettContext);
  return useCallback(
    (foresporsel: SlettForesporsel) => {
      if (ctx) {
        ctx.beOmSletting(foresporsel);
      } else {
        foresporsel.onBekreft();
      }
    },
    [ctx]
  );
}
