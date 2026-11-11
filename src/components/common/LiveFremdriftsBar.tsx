import type { ProsjektFremdriftInfo } from '../../lib/fremdrift';

interface Props {
  fremdrift: ProsjektFremdriftInfo;
  onApneDashbord: () => void;
  onApneMangler: () => void;
  onApneQa: () => void;
}

export default function LiveFremdriftsBar({
  fremdrift,
  onApneDashbord,
  onApneMangler,
  onApneQa,
}: Props) {
  const {
    fremdriftProsent,
    antallRodeAlarmer,
    antallManglerTotalt,
    erKlarForSignatur,
    erLaast,
    statusTekst,
    statusFarge,
    koteStatus,
  } = fremdrift;

  // Fargekoding på fremdriftsbaren
  const barFargeKlasse =
    statusFarge === 'emerald'
      ? 'bg-emerald-500 shadow-emerald-500/50'
      : statusFarge === 'rose'
      ? 'bg-rose-500 shadow-rose-500/50'
      : statusFarge === 'amber'
      ? 'bg-amber-500 shadow-amber-500/50'
      : 'bg-cyan-500 shadow-cyan-500/50';

  const badgeFargeKlasse =
    statusFarge === 'emerald'
      ? 'border-emerald-600/70 bg-emerald-950/60 text-emerald-300'
      : statusFarge === 'rose'
      ? 'border-rose-600/70 bg-rose-950/70 text-rose-300'
      : statusFarge === 'amber'
      ? 'border-amber-600/70 bg-amber-950/60 text-amber-300'
      : 'border-cyan-600/70 bg-cyan-950/60 text-cyan-300';

  return (
    <div
      role="region"
      aria-label="Prosjekt fremdriftsindikator"
      className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-700/80 bg-slate-950/80 px-2.5 py-1.5 shadow-inner"
    >
      {/* Klikkbar hoveddel som åpner dashbordet */}
      <button
        type="button"
        onClick={onApneDashbord}
        title="Klikk for å åpne Prosjektoversikt, Fremdrift & Tidssporing"
        className="group flex min-h-[36px] items-center gap-2 text-left transition hover:opacity-95"
      >
        <span className="text-xs font-bold text-slate-300 group-hover:text-emerald-300">
          📊 Fremdrift:
        </span>
        <span className="font-mono text-xs font-extrabold text-white">
          {fremdriftProsent} %
        </span>

        {/* Visuell mini-framdriftsbar */}
        <div className="hidden h-2.5 w-20 overflow-hidden rounded-full bg-slate-800 ring-1 ring-slate-700/50 sm:block sm:w-28">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barFargeKlasse}`}
            style={{ width: `${Math.max(4, fremdriftProsent)}%` }}
          />
        </div>
      </button>

      {/* Status-badge og mangel-varsel */}
      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        {antallRodeAlarmer > 0 ? (
          <button
            type="button"
            onClick={onApneMangler}
            title={`${antallRodeAlarmer} kritiske avvik (klikk for mangelliste)`}
            className="inline-flex min-h-[36px] items-center gap-1 rounded-md border border-rose-700/80 bg-rose-950/80 px-2.5 py-1 font-bold text-rose-200 transition hover:bg-rose-900"
          >
            <span>🚨</span>
            <span>{antallRodeAlarmer} avvik</span>
          </button>
        ) : antallManglerTotalt > 0 ? (
          <button
            type="button"
            onClick={onApneMangler}
            title={`${antallManglerTotalt} åpne mangler / HINTs (klikk for liste)`}
            className="inline-flex min-h-[36px] items-center gap-1 rounded-md border border-amber-700/80 bg-amber-950/70 px-2.5 py-1 font-semibold text-amber-200 transition hover:bg-amber-900"
          >
            <span>⚠️</span>
            <span>{antallManglerTotalt} mangler</span>
          </button>
        ) : null}

        {erLaast ? (
          <span className="inline-flex min-h-[36px] items-center gap-1 rounded-md border border-emerald-600 bg-emerald-950/80 px-2.5 py-1 font-bold text-emerald-300">
            🔒 Låst & Godkjent
          </span>
        ) : erKlarForSignatur ? (
          <button
            type="button"
            onClick={onApneQa}
            className="inline-flex min-h-[36px] items-center gap-1 rounded-md border border-emerald-600 bg-emerald-950/80 px-2.5 py-1 font-bold text-emerald-300 transition hover:bg-emerald-900"
          >
            ✅ Klar for signatur
          </button>
        ) : (
          <span
            className={`hidden sm:inline-flex items-center rounded-md border px-2 py-0.5 font-medium ${badgeFargeKlasse}`}
          >
            {statusTekst}
          </span>
        )}

        {/* Kotestatus-indikator hvis brudd */}
        {koteStatus === 'brudd' && (
          <span
            title="Kotekontroll: Tilbakeslagsmargin under 950 mm / TEK17 min. 0,90 m!"
            className="hidden md:inline-flex items-center gap-1 rounded-md border border-rose-700 bg-rose-950 px-1.5 py-0.5 font-bold text-rose-300"
          >
            Svanehals/Pumpe kreves
          </span>
        )}
      </div>
    </div>
  );
}
