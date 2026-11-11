import { useEffect, useState, type ReactNode } from 'react';

export function Kort({ tittel, ikon, children, className = '' }: { tittel?: string; ikon?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-slate-700 bg-slate-800 p-5 shadow-lg ${className}`}>
      {tittel && (
        <h2 className="mb-4 flex items-center gap-2 border-b border-slate-700 pb-2 text-base font-bold text-slate-200">
          {ikon && <span>{ikon}</span>}
          {tittel}
        </h2>
      )}
      {children}
    </section>
  );
}

/**
 * Tallfelt som tillater komma og punktum. Holder egen tekststate mens brukeren skriver,
 * og synkroniserer når verdien endres utenfra.
 */
export function TallFelt({
  verdi,
  onChange,
  enhet,
  className = '',
  ariaLabel,
}: {
  verdi: number;
  onChange: (n: number) => void;
  enhet?: string;
  className?: string;
  ariaLabel?: string;
}) {
  const [tekst, setTekst] = useState(String(verdi).replace('.', ','));
  useEffect(() => {
    setTekst((forrige) => {
      const forrigeNum = parseFloat(forrige.replace(',', '.'));
      return forrigeNum === verdi ? forrige : String(verdi).replace('.', ',');
    });
  }, [verdi]);

  return (
    <span className={`relative inline-block ${className}`}>
      <input
        type="text"
        inputMode="decimal"
        aria-label={ariaLabel}
        value={tekst}
        onChange={(e) => {
          setTekst(e.target.value);
          const n = parseFloat(e.target.value.replace(',', '.'));
          onChange(Number.isFinite(n) ? n : 0);
        }}
        className={`min-h-[44px] w-full rounded-lg border border-slate-600 bg-slate-900 py-2 pl-2.5 text-right font-mono text-base sm:text-sm text-slate-100 outline-none focus:border-emerald-500 ${enhet ? 'pr-10' : 'pr-2.5'}`}
      />
      {enhet && <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500">{enhet}</span>}
    </span>
  );
}

export function Merkelapp({ type, children }: { type: 'ok' | 'advarsel' | 'feil' | 'info'; children: ReactNode }) {
  const stil = {
    ok: 'border-emerald-700 bg-emerald-950 text-emerald-300',
    advarsel: 'border-amber-700 bg-amber-950 text-amber-300',
    feil: 'border-rose-700 bg-rose-950 text-rose-300',
    info: 'border-sky-700 bg-sky-950 text-sky-300',
  }[type];
  return <span className={`inline-block rounded border px-2 py-0.5 text-[11px] font-semibold ${stil}`}>{children}</span>;
}

export function Knapp({
  onClick,
  children,
  variant = 'primar',
  disabled = false,
  title,
}: {
  onClick: () => void;
  children: ReactNode;
  variant?: 'primar' | 'sekundar' | 'advarsel' | 'fare';
  disabled?: boolean;
  title?: string;
}) {
  const stil = {
    primar: 'bg-emerald-600 hover:bg-emerald-500 text-white',
    sekundar: 'bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600',
    advarsel: 'bg-amber-500 hover:bg-amber-400 text-slate-950',
    fare: 'bg-rose-900/70 hover:bg-rose-800 text-rose-200 border border-rose-700/80',
  }[variant];
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={title}
      className={`inline-flex min-h-[44px] items-center justify-center rounded-lg px-3.5 py-2.5 text-xs font-bold shadow transition disabled:cursor-not-allowed disabled:opacity-50 ${stil}`}
    >
      {children}
    </button>
  );
}

export function Resultat({
  etikett,
  verdi,
  enhet,
  tone = 'normal',
}: {
  etikett: string;
  verdi: string;
  enhet?: string;
  tone?: 'normal' | 'ok' | 'feil' | 'advarsel';
}) {
  const farge =
    tone === 'ok'
      ? 'text-emerald-400'
      : tone === 'feil'
      ? 'text-rose-400'
      : tone === 'advarsel'
      ? 'text-amber-400'
      : 'text-slate-100';
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 p-3">
      <div className="text-[11px] font-semibold text-slate-400">{etikett}</div>
      <div className={`mt-1 font-mono text-lg font-extrabold ${farge}`}>
        {verdi}
        {enhet && <span className="ml-1 text-xs font-medium text-slate-500">{enhet}</span>}
      </div>
    </div>
  );
}
