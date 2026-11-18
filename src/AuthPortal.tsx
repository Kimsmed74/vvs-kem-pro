import React, { useState } from 'react';
import {
  ShieldCheck,
  Wrench,
  Sparkles,
  ArrowRight,
  Building,
  User,
  Mail,
  Lock,
  Coins,
  CheckCircle,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import {
  loggInn,
  loggInnDemo,
  registrerBedrift,
  type AuthSession,
  type RegistrerBedriftPayload,
} from './lib/auth';

interface AuthPortalProps {
  onLoginSuccess: (session: AuthSession) => void;
}

export default function AuthPortal({ onLoginSuccess }: AuthPortalProps) {
  const [fane, setFane] = useState<'logg_inn' | 'registrer'>('logg_inn');

  // Logg inn state
  const [epost, setEpost] = useState<string>('');
  const [passord, setPassord] = useState<string>('');
  const [feilmelding, setFeilmelding] = useState<string | null>(null);
  const [laster, setLaster] = useState<boolean>(false);

  // Registrer bedrift state
  const [regData, setRegData] = useState<RegistrerBedriftPayload>({
    bedriftsnavn: '',
    orgNr: '',
    kontaktperson: '',
    epost: '',
    passord: '',
    telefon: '',
    timeprisUt: 1150,
    timeSelvkost: 550,
    ahlsellKundenummer: '',
  });

  const handleLoggInn = (e: React.FormEvent) => {
    e.preventDefault();
    setFeilmelding(null);
    setLaster(true);

    const res = loggInn(epost, passord);
    setLaster(false);

    if (res.success && res.session) {
      onLoginSuccess(res.session);
    } else {
      setFeilmelding(res.feil || 'Innlogging feilet. Sjekk e-post og passord.');
    }
  };

  const handleRegistrer = (e: React.FormEvent) => {
    e.preventDefault();
    setFeilmelding(null);
    setLaster(true);

    const res = registrerBedrift(regData);
    setLaster(false);

    if (res.success && res.session) {
      onLoginSuccess(res.session);
    } else {
      setFeilmelding(res.feil || 'Registrering feilet. Vennligst sjekk feltene.');
    }
  };

  const handleDemo = (type: 'mester' | 'rorlegger') => {
    setFeilmelding(null);
    const session = loggInnDemo(type);
    onLoginSuccess(session);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 py-8 sm:px-6 lg:px-8 selection:bg-blue-600 selection:text-white">
      {/* Bakgrunnsdekorasjon */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-blue-600 filter blur-3xl"></div>
        <div className="absolute top-1/2 -right-40 h-96 w-96 rounded-full bg-indigo-600 filter blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-xl">
        {/* Logo og Toppseksjon */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 rounded-full border border-blue-500/30 bg-blue-950/60 px-4 py-1.5 text-xs font-bold text-blue-300 shadow-inner mb-4">
            <ShieldCheck className="h-4 w-4 text-blue-400" />
            <span>VVS KEM PRO · Multi-Tenant Portal</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            VVS KEM PRO
          </h1>
          <p className="mt-2 text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            Ingeniør- og mesterverktøy for rørleggerbedrifter. Komplett dimensjonering, Mengdeuttak TP-01, og direkte eksport til Ahlsell Infor M3, Tripletex og Holte SmartKalk.
          </p>
        </div>

        {/* Hurtigvalg: 1-klikks Demo-innlogging */}
        <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-2xl backdrop-blur">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" /> 1-Klikks Demo-Innlogging
            </span>
            <span className="text-[11px] text-slate-400">Ingen registrering nødvendig</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Demo Mester */}
            <button
              type="button"
              onClick={() => handleDemo('mester')}
              className="flex flex-col text-left p-3.5 rounded-xl border border-blue-600/40 bg-blue-950/40 hover:bg-blue-900/50 hover:border-blue-500 transition group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-blue-300 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-blue-400" /> Mester &amp; Ingeniør
                </span>
                <span className="rounded bg-blue-600/30 px-1.5 py-0.5 text-[10px] font-bold text-blue-300 border border-blue-500/30">
                  Full Admin
                </span>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-300">
                19 AI-agenter, kote- &amp; trykkberegning, hydronisk innregulering og full kommandosentral.
              </p>
              <span className="mt-2 text-xs font-semibold text-blue-400 group-hover:translate-x-0.5 transition flex items-center gap-1">
                Logg inn som Mester <ArrowRight className="h-3 w-3" />
              </span>
            </button>

            {/* Demo Rørlegger Express */}
            <button
              type="button"
              onClick={() => handleDemo('rorlegger')}
              className="flex flex-col text-left p-3.5 rounded-xl border border-emerald-600/40 bg-emerald-950/40 hover:bg-emerald-900/50 hover:border-emerald-500 transition group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-emerald-300 flex items-center gap-1.5">
                  <Wrench className="h-4 w-4 text-emerald-400" /> Rørlegger Express
                </span>
                <span className="rounded bg-emerald-600/30 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                  Kunde
                </span>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-300">
                Strømlinjeformet 3-stegs tilbud, Enova-kalkyle, Ahlsell M3 og ERP-eksport uten avanserte menyer.
              </p>
              <span className="mt-2 text-xs font-semibold text-emerald-400 group-hover:translate-x-0.5 transition flex items-center gap-1">
                Logg inn som Rørlegger <ArrowRight className="h-3 w-3" />
              </span>
            </button>
          </div>
        </div>

        {/* Hovedkort: Faner Logg inn / Registrer */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl">
          {/* Fanevelger */}
          <div className="grid grid-cols-2 rounded-xl bg-slate-950 p-1 mb-6 border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setFane('logg_inn');
                setFeilmelding(null);
              }}
              className={`py-2 text-xs font-bold rounded-lg transition ${
                fane === 'logg_inn'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Logg inn
            </button>
            <button
              type="button"
              onClick={() => {
                setFane('registrer');
                setFeilmelding(null);
              }}
              className={`py-2 text-xs font-bold rounded-lg transition ${
                fane === 'registrer'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Registrer ny bedrift
            </button>
          </div>

          {feilmelding && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-500/40 bg-rose-950/40 p-3.5 text-xs text-rose-200">
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{feilmelding}</span>
            </div>
          )}

          {/* Fane 1: Logg inn */}
          {fane === 'logg_inn' && (
            <form onSubmit={handleLoggInn} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-slate-400" /> E-postadresse
                </label>
                <input
                  type="email"
                  required
                  placeholder="f.eks. mester@vvskempro.no"
                  value={epost}
                  onChange={(e) => setEpost(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-slate-400" /> Passord
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={passord}
                  onChange={(e) => setPassord(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={laster}
                  className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg transition hover:bg-blue-500 disabled:opacity-50"
                >
                  {laster ? 'Logger inn…' : 'Logg inn'}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 rounded-lg bg-slate-950/60 p-3 border border-slate-800 text-[11px] text-slate-400 text-center">
                Tips: Bruk 1-klikks demobuttons over for umiddelbar tilgang uten passord.
              </div>
            </form>
          )}

          {/* Fane 2: Registrer ny bedrift */}
          {fane === 'registrer' && (
            <form onSubmit={handleRegistrer} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                    <Building className="h-3.5 w-3.5 text-slate-400" /> Bedriftsnavn
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="f.eks. VVS Eksperten AS"
                    value={regData.bedriftsnavn}
                    onChange={(e) => setRegData({ ...regData, bedriftsnavn: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Org.nummer</label>
                  <input
                    type="text"
                    placeholder="9 siffer (MVA)"
                    value={regData.orgNr}
                    onChange={(e) => setRegData({ ...regData, orgNr: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-slate-400" /> Kontaktperson
                  </label>
                  <input
                    type="text"
                    placeholder="Fornavn Etternavn"
                    value={regData.kontaktperson}
                    onChange={(e) => setRegData({ ...regData, kontaktperson: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-slate-400" /> E-post (Innlogging)
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="post@bedrift.no"
                    value={regData.epost}
                    onChange={(e) => setRegData({ ...regData, epost: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-slate-400" /> Passord (min. 6 tegn)
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={regData.passord}
                    onChange={(e) => setRegData({ ...regData, passord: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                    <Coins className="h-3.5 w-3.5 text-amber-400" /> Standard Timepris Ut (kr/t)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={regData.timeprisUt}
                    onChange={(e) =>
                      setRegData({ ...regData, timeprisUt: parseInt(e.target.value, 10) || 1150 })
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                    <Coins className="h-3.5 w-3.5 text-slate-400" /> Selvkost per time (kr/t)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={regData.timeSelvkost}
                    onChange={(e) =>
                      setRegData({ ...regData, timeSelvkost: parseInt(e.target.value, 10) || 550 })
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                    <FileSpreadsheet className="h-3.5 w-3.5 text-blue-400" /> Ahlsell kundenummer (valgfritt)
                  </label>
                  <input
                    type="text"
                    placeholder="f.eks. AHL-123456"
                    value={regData.ahlsellKundenummer}
                    onChange={(e) => setRegData({ ...regData, ahlsellKundenummer: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={laster}
                  className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg transition hover:bg-emerald-500 disabled:opacity-50"
                >
                  <CheckCircle className="h-4 w-4" />
                  {laster ? 'Oppretter bedriftsprofil…' : 'Registrer bedrift & start'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer info */}
        <div className="mt-8 text-center text-xs text-slate-500">
          VVS KEM PRO · Norsk VVS-ingeniørkompetanse iht. TEK17, NS 3420 og Byggforsk 553.102.
        </div>
      </div>
    </div>
  );
}
