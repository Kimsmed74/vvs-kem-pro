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
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 sm:p-8"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onLukk();
      }}
    >
      <div role="dialog" aria-modal="true" aria-label={tittel} className={`w-full ${bredde} rounded-xl border border-slate-700 bg-slate-900 shadow-2xl`}>
        <div className="flex items-center justify-between border-b border-slate-700 px-5 py-3">
          <h2 className="text-base font-bold text-slate-100">{tittel}</h2>
          <button type="button" onClick={onLukk} aria-label="Lukk" className="rounded px-2 py-1 text-slate-400 hover:bg-slate-800 hover:text-white">
            ✕
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
