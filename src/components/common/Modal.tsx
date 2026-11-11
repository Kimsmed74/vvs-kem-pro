import { useEffect, type ReactNode } from 'react';

export default function Modal({
  tittel,
  onLukk,
  children,
  bredde = 'max-w-3xl',
}: {
  tittel: string;
  onLukk: () => void;
  children: ReactNode;
  bredde?: string;
}) {
  useEffect(() => {
    const lytt = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onLukk();
    };
    window.addEventListener('keydown', lytt);
    return () => window.removeEventListener('keydown', lytt);
  }, [onLukk]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-2 sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onLukk();
      }}
    >
      <div role="dialog" aria-modal="true" aria-label={tittel} className={`w-full ${bredde} my-auto rounded-xl border border-slate-700 bg-slate-900 shadow-2xl`}>
        <div className="flex items-center justify-between border-b border-slate-700 px-4 py-2.5 sm:px-5 sm:py-3">
          <h2 className="text-sm font-bold text-slate-100 sm:text-base">{tittel}</h2>
          <button
            type="button"
            onClick={onLukk}
            aria-label="Lukk"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            ✕
          </button>
        </div>
        <div className="p-3 sm:p-5">{children}</div>
      </div>
    </div>
  );
}
