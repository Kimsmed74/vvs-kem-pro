import { useState } from 'react';
import { AGENTER } from '../agents/agentData';
import type { ProsjektData } from '../data/prosjekter';
import { kopierTilUtklippstavle } from '../lib/format';

export type AkademiFane = 'fagkurs' | 'agenter' | 'brukerveiledning' | 'notebooklm';

interface Props {
  prosjekt?: ProsjektData;
  startFane?: AkademiFane;
  onNavigerTilModul: (modulId: string, sanitaerFane?: string) => void;
  onNavigerTilVeiviser: () => void;
  onNavigerTilQaPort: () => void;
  onNavigerTilDashbord: () => void;
  onApneChat: (agentId: string, sporsmal?: string) => void;
  melding: (tekst: string) => void;
}

export default function AkademiModul({
  prosjekt,
  startFane = 'fagkurs',
  onNavigerTilModul,
  onNavigerTilVeiviser,
  onNavigerTilQaPort,
  onNavigerTilDashbord,
  onApneChat,
  melding,
}: Props) {
  const [aktivFane, setAktivFane] = useState<AkademiFane>(startFane);
  const [aktivtFagkurs, setAktivtFagkurs] = useState<string>('sanitaer');
  const [agentFilterFase, setAgentFilterFase] = useState<'alle' | 'A' | 'B' | 'C' | 'D'>('alle');
  const [valgtPromptKategori, setValgtPromptKategori] = useState<string>('audio_overview');

  const kopierPrompt = async (tittel: string, tekst: string) => {
    const ok = await kopierTilUtklippstavle(tekst);
    if (ok) {
      melding(`📋 Kopierte prompt: «${tittel}» til utklippstavlen!`);
    } else {
      melding('Kunne ikke kopiere prompt.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Topp-banner for Akademi & Brukerveiledning */}
      <div className="rounded-2xl border border-indigo-700/60 bg-gradient-to-r from-indigo-950/80 via-slate-900 to-slate-950 p-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎓</span>
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-indigo-400">
                VVS KEM PRO · Kunnskapsportal & Opplæringssenter
              </span>
            </div>
            <h1 className="mt-1 text-xl font-black text-white sm:text-2xl">
              Akademi, Fagkurs & Brukerveiledning
            </h1>
            <p className="mt-1 max-w-2xl text-xs text-slate-300">
              Interaktiv opplæring i rørdimensjonering, koteregnskap, innregulering, ventilasjonsbalanse, de 19 AI-agentene og NotebookLM-integrasjon for Kim Jørgensen | Rørleggermester &amp; RIV.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onNavigerTilVeiviser}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-500"
            >
              🚀 Start Prosjektveiviser
            </button>
            <button
              type="button"
              onClick={onNavigerTilDashbord}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700"
            >
              📊 Prosjektdashbord
            </button>
          </div>
        </div>

        {/* 4 Hovedfaner */}
        <div className="mt-6 flex overflow-x-auto touch-pan-x flex-nowrap sm:flex-wrap gap-2 border-t border-slate-800/80 pt-4 pb-1">
          <button
            type="button"
            onClick={() => setAktivFane('fagkurs')}
            className={`flex shrink-0 min-h-[44px] items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              aktivFane === 'fagkurs'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'border border-slate-700 bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <span>📐</span>
            <span>1. Fagkurs &amp; Dimensjonering (Modul 1–6)</span>
          </button>

          <button
            type="button"
            onClick={() => setAktivFane('agenter')}
            className={`flex shrink-0 min-h-[44px] items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              aktivFane === 'agenter'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'border border-slate-700 bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <span>🤖</span>
            <span>2. Agent-leksikonet (De 19 Agentene)</span>
          </button>

          <button
            type="button"
            onClick={() => setAktivFane('brukerveiledning')}
            className={`flex shrink-0 min-h-[44px] items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              aktivFane === 'brukerveiledning'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'border border-slate-700 bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <span>🚀</span>
            <span>3. Slik bruker du appen (Trinn for trinn)</span>
          </button>

          <button
            type="button"
            onClick={() => setAktivFane('notebooklm')}
            className={`flex shrink-0 min-h-[44px] items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              aktivFane === 'notebooklm'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'border border-slate-700 bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <span>🎙️</span>
            <span>4. NotebookLM &amp; AI Lydkurs (Prompts)</span>
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* FANE 1: FAGKURS & DIMENSJONERING (MODUL 1–6)                         */}
      {/* ==================================================================== */}
      {aktivFane === 'fagkurs' && (
        <div className="space-y-6">
          {/* Fagkursvelger */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
            {[
              { id: 'sanitaer', navn: 'Sanitær Trykkfall', ikon: '💧', std: 'Byggforsk 553.102' },
              { id: 'koter', navn: 'Koter & 950 mm', ikon: '📐', std: 'TEK17 § 15-6 / 12050' },
              { id: 'hydronikk', navn: 'Varme & Ekspansjon', ikon: '🔥', std: 'Pneumatex / 12828' },
              { id: 'innregulering', navn: 'Hydronisk Innregulering', ikon: '⚖️', std: 'STAD / PICV / 14336' },
              { id: 'ventilasjon', navn: 'Ventilasjon & SFP', ikon: '🌬️', std: 'TEK17 kap. 13 / 12599' },
              { id: 'sprinkler', navn: 'Brann & Sprinkler', ikon: '🧯', std: 'FG-930:1 / 12845' },
            ].map((k) => (
              <button
                key={k.id}
                type="button"
                onClick={() => setAktivtFagkurs(k.id)}
                className={`flex flex-col items-start rounded-xl border p-3 text-left transition ${
                  aktivtFagkurs === k.id
                    ? 'border-emerald-500 bg-slate-900 shadow-md ring-1 ring-emerald-500'
                    : 'border-slate-800 bg-slate-950/70 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <span className="text-xl">{k.ikon}</span>
                <span className="mt-1 font-bold text-xs text-white">{k.navn}</span>
                <span className="text-[10px] text-slate-400">{k.std}</span>
              </button>
            ))}
          </div>

          {/* Fagkurs 1: Sanitær Trykkfall */}
          {aktivtFagkurs === 'sanitaer' && (
            <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <span className="text-xs font-bold uppercase text-emerald-400">Fagkurs 1 · Modul 1 Sanitær</span>
                  <h3 className="text-lg font-black text-white">
                    Trykkfallsberegning for Forbruksvann (SINTEF Byggforsk 553.102 &amp; NS-EN 806)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigerTilModul('sanitaer', 'forbruksvann')}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500"
                >
                  Gå til Trykkfallskalkulator →
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 text-xs text-slate-300">
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-100 uppercase tracking-wider text-[11px]">
                    1. Teoretiske Formler &amp; Beregningsmetodikk
                  </h4>
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 space-y-2 font-mono text-[11px]">
                    <div className="text-slate-400">// 1.1 Disponibelt trykk til rørfriksjon (p_disp,frik):</div>
                    <div className="text-emerald-300">
                      p_disp,frik = (p_0 − p_rest − p_geo − p_enkelt) × (1 − 0,20)
                    </div>
                    <div className="text-slate-400 text-[10px]">
                      der p_0 = hovedtrykk, p_rest = min. 100 kPa armaturtrykk, p_geo = h × 9,81 kPa, 0,20 = 20 % avsetning til rørdeler.
                    </div>

                    <div className="pt-2 text-slate-400">// 1.2 Samtidig vannmengde (q_S iht. Byggforsk 553.102):</div>
                    <div className="text-emerald-300">
                      q_S = q_N1 + 0,015 × (Σ q_N − q_N1) + 0,17 × √(Σ q_N − q_N1)
                    </div>

                    <div className="pt-2 text-slate-400">// 1.3 Rørhastighet (v) og friksjonstap pr. meter (R):</div>
                    <div className="text-emerald-300">
                      v = (4000 × q_dim) / (π × d_i²)   [m/s]
                    </div>
                    <div className="text-emerald-300">
                      R = 3,62315 × (q_dim × 3600)^1,70651 × d_i^(−4,64237)   [kPa/m]
                    </div>
                  </div>

                  <h4 className="font-bold text-slate-100 uppercase tracking-wider text-[11px]">
                    2. Inndata og parametere i appen
                  </h4>
                  <ul className="list-disc pl-4 space-y-1">
                    <li><strong>Statisk vanntrykk i hovedledning (p_0):</strong> Hentes fra kommunens VA-kart eller Q/p-måling.</li>
                    <li><strong>Nødvendig resttrykk (p_rest):</strong> Standard 100 kPa (1,0 bar) før armatur ved ugunstigste tappested.</li>
                    <li><strong>Geodetisk løftehøyde (h):</strong> Høydeforskjell i meter mellom vanninntak og øverste armatur.</li>
                    <li><strong>Rørtype:</strong> Kobber (Byggforsk-tabell), PEX eller PP-R med eksakt innvendig diameter (d_i).</li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <h4 className="font-bold text-slate-100 uppercase tracking-wider text-[11px]">
                    3. Hva sjekker Agent 16 (QA-port)?
                  </h4>
                  <div className="rounded-xl border border-amber-900/60 bg-amber-950/20 p-3.5 space-y-2">
                    <div className="font-bold text-amber-300">Seniorrådgiverens QA-krav:</div>
                    <ul className="list-disc pl-4 space-y-1 text-slate-300">
                      <li><strong>Vannhastighet v:</strong> Maks 2,0 m/s på fordelingsledninger og 2,5 m/s på koblingsledninger for å unngå trykkstøt, støy og erosjonskorrosjon.</li>
                      <li><strong>Trykkmargin:</strong> Σ(R · l) må være strengt mindre enn p_disp,frik. Ved negativ margin må rørdimensjon økes eller trykkøkningsstasjon (WWBooster) prosjekteres.</li>
                      <li><strong>Hydrostatisk maks-trykk:</strong> Hvis statisk trykk i kjeller overstiger 6,0 bar, krever TEK17 § 15-5 og NS-EN 806-2 trykkreduksjonsventil på hovedinntaket.</li>
                    </ul>
                  </div>

                  <h4 className="font-bold text-slate-100 uppercase tracking-wider text-[11px]">
                    4. Eksempelberegning (Case 01 Forus)
                  </h4>
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 space-y-1 text-slate-300">
                    <div>• p_0 = 450 kPa, p_rest = 100 kPa, h = 6,8 m (p_geo = 66,7 kPa)</div>
                    <div>• p_disp,frik = (450 − 100 − 66,7 − 30) × 0,80 = <strong>202,6 kPa</strong></div>
                    <div>• Rørlengde trasé Σ l = 42,0 m → Midlere rørfriksjon R_midlere = 4,82 kPa/m</div>
                    <div>• Dimensjonering: DN28 kobber (d_i = 25,0 mm) gir v = 1,42 m/s og R · l = 168,4 kPa → <strong>✅ OK (margin +34,2 kPa)</strong></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Fagkurs 2: Koter & 950 mm */}
          {aktivtFagkurs === 'koter' && (
            <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <span className="text-xs font-bold uppercase text-emerald-400">Fagkurs 2 · Modul 1 &amp; Lov 2</span>
                  <h3 className="text-lg font-black text-white">
                    Utvendig VA, Koteregnskap &amp; 950 mm Tilbakeslagssikring (TEK17 § 15-6 &amp; NS-EN 12050)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigerTilModul('sanitaer', 'koter')}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500"
                >
                  Gå til Kotekalkulator →
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 text-xs text-slate-300">
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-100 uppercase tracking-wider text-[11px]">
                    1. 950 mm-regelen (Lov 2 i VVS KEM PRO)
                  </h4>
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 space-y-2 font-mono text-[11px]">
                    <div className="text-slate-400">// Margin mot tilbakeslag fra kommunalt nett:</div>
                    <div className="text-emerald-300">
                      Margin = Kote_laveste_sluk (OK FG) − Kote_ITR (Innvendig Topp Rør i kum)
                    </div>
                    <div className="text-slate-400 text-[10px]">
                      Krav iht. TEK17 § 15-6: minimum 0,90 m (i VVS KEM PRO er sikkerhetskravet satt til 0,95 m).
                    </div>
                    <div className="pt-2 text-rose-300">
                      Ved Margin &lt; 0,95 m: UTVINGET KRAV OM AVLØPSPUMPESTASJON (NS-EN 12050) MED SVANEHALS OVER GATENIVÅ!
                    </div>
                  </div>

                  <h4 className="font-bold text-slate-100 uppercase tracking-wider text-[11px]">
                    2. Bunnledningsfall &amp; Kote ved grunnmur
                  </h4>
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 space-y-1 font-mono text-[11px]">
                    <div>Kote_grunnmur = Kote_IBR (kum) + (Stikkledningslengde × Fall)</div>
                    <div className="text-slate-400 text-[10px]">
                      Normalt fall 1:60 (1,67 %) eller min. 1:100 (1,0 %). Kun 45° bend og Y-grener i grunnen!
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-bold text-slate-100 uppercase tracking-wider text-[11px]">
                    3. Hva sjekker Agent 16 (Djevelens Advokat)?
                  </h4>
                  <div className="rounded-xl border border-rose-900/60 bg-rose-950/20 p-3.5 space-y-2">
                    <div className="font-bold text-rose-300">Kritiske kotesjekker:</div>
                    <ul className="list-disc pl-4 space-y-1 text-slate-300">
                      <li>Er det sluk, vaskekar, toalett eller slukrenne i kjeller som ligger under gatenivå eller under ITR + 950 mm?</li>
                      <li>Hvis ja: Er det prosjektert lukket pumpestasjon (NS-EN 12050) med kule-tilbakeslagsventil og svanehals løftet min. 100 mm over gatenivå?</li>
                      <li>Ligger stikkledningsgrøften under grunnvannstand eller i frostsonen (min. 1,6–2,0 m dybde eller isolert med Styrofoam)?</li>
                    </ul>
                  </div>

                  <h4 className="font-bold text-slate-100 uppercase tracking-wider text-[11px]">
                    4. Eksempel på Kotebrudd (Case 02 Østensjøveien)
                  </h4>
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 space-y-1 text-slate-300">
                    <div>• Kommunal kum: Kote ITR = 15,00 m | Gatelokk = 16,80 m</div>
                    <div>• Kjeller U1: Kote OK FG = 14,20 m</div>
                    <div>• Margin = 14,20 − 15,00 = <strong>−0,80 m (−800 mm)</strong></div>
                    <div className="text-rose-400 font-bold">• 🚨 KOTEBRUDD: Kjeller vil oversvømmes ved oppstuing i gaten! Krever avløpspumpe.</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Fagkurs 3: Varme & Ekspansjon */}
          {aktivtFagkurs === 'hydronikk' && (
            <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <span className="text-xs font-bold uppercase text-emerald-400">Fagkurs 3 · Modul 2 Varme</span>
                  <h3 className="text-lg font-black text-white">
                    Trykkholding, Ekspansjonskar &amp; Avgassing (Pneumatex Statico/Compresso &amp; NS-EN 12828)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigerTilModul('varme')}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500"
                >
                  Gå til Varme &amp; Hydronikk →
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 text-xs text-slate-300">
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-100 uppercase tracking-wider text-[11px]">
                    1. Dimensjonering av Ekspansjonskar
                  </h4>
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 space-y-2 font-mono text-[11px]">
                    <div className="text-slate-400">// 1.1 Ekspansjonsvolum (V_e):</div>
                    <div className="text-emerald-300">V_e = e × V_a   [liter]</div>
                    <div className="text-slate-400 text-[10px]">
                      e = 0,0287 ved 60/40 °C radiatoranlegg, e = 0,0167 ved 45/35 °C gulvvarme.
                    </div>

                    <div className="pt-2 text-slate-400">// 1.2 Reservevolum (V_wr):</div>
                    <div className="text-emerald-300">V_wr = max(0,005 × V_a, 3 liter)</div>

                    <div className="pt-2 text-slate-400">// 1.3 Trykkregnskap og karvolum (V_N):</div>
                    <div className="text-emerald-300">p_0 = (H_st / 10) + 0,2 bar   (fortrykk)</div>
                    <div className="text-emerald-300">p_e = p_sv − 0,5 bar   (sluttrykk, p_sv = sikkerhetsventil)</div>
                    <div className="text-emerald-300">
                      V_N ≥ (V_e + V_wr) × (p_e + 1) / (p_e − p_0)   [liter]
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-bold text-slate-100 uppercase tracking-wider text-[11px]">
                    2. TEK17 § 14-4(2) Areal til Varmesentral
                  </h4>
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 space-y-2">
                    <div className="font-mono text-emerald-300 font-bold">
                      Areal_krav = 10 m² + (0,01 × Oppvarmet_BRA)
                    </div>
                    <div className="text-slate-400 text-[11px]">
                      Eksempel ved 4 500 m² BRA: 10 + 45 = <strong>55 m² teknisk rom / varmesentral</strong>.
                    </div>
                    <div className="text-slate-300 text-[11px]">
                      Lovkrav for å sikre plass til varmepumper, akkumulatortanker, ekspansjonskar og vedlikeholdssoner.
                    </div>
                  </div>

                  <h4 className="font-bold text-slate-100 uppercase tracking-wider text-[11px]">
                    3. Kvalitetskrav iht. VDI 2035 (Vannbehandling)
                  </h4>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>pH-verdi mellom 8,2 og 9,5 (for aluminium max 8,5).</li>
                    <li>Slam- og magnetittutskiller (Zeparo Cyclone) på retur foran kjel/MAGNA3-pumpe.</li>
                    <li>Mikrobobleutskiller (Zeparo Aero) på anleggets varmeste punkt (tur).</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Fagkurs 4: Innregulering */}
          {aktivtFagkurs === 'innregulering' && (
            <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <span className="text-xs font-bold uppercase text-emerald-400">Fagkurs 4 · Modul 2 &amp; 4</span>
                  <h3 className="text-lg font-black text-white">
                    Hydronisk Innregulering &amp; Ventildimensjonering (STAD / PICV / NS-EN 14336)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigerTilModul('varme')}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500"
                >
                  Gå til Innreguleringsprotokoll →
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 text-xs text-slate-300">
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-100 uppercase tracking-wider text-[11px]">
                    1. Formler for Vannmengde og Kv
                  </h4>
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 space-y-2 font-mono text-[11px]">
                    <div className="text-slate-400">// Vannmengde (q) fra varmeeffekt (Φ):</div>
                    <div className="text-emerald-300">q_ls = Φ_kW / (4,18 × ΔT)   [l/s]</div>
                    <div className="text-emerald-300">q_lh = q_ls × 3600   [l/h]</div>

                    <div className="pt-2 text-slate-400">// Beregnet Kv-verdi:</div>
                    <div className="text-emerald-300">Kv = (3,6 × q_ls) / √(Δp_bar)</div>

                    <div className="pt-2 text-slate-400">// Ventilautoritet (β):</div>
                    <div className="text-emerald-300">β = Δp_ventil / (Δp_krets + Δp_ventil)</div>
                    <div className="text-slate-400 text-[10px]">
                      Krav: β ≥ 0,30 for stabile sløyfer, ideelt β ≥ 0,50 for god reguleringsevne.
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-bold text-slate-100 uppercase tracking-wider text-[11px]">
                    2. IMI STAD vs. Trykkuavhengig PICV (Danfoss AB-QM)
                  </h4>
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 space-y-2">
                    <div>
                      <strong>Statiske ventiler (IMI TA STAD):</strong> Krever manuell forinnstilling av rattomdreininger og differansetrykkmåling (TA-Scope).
                    </div>
                    <div>
                      <strong>Trykkuavhengige reguleringsventiler (PICV):</strong> Danfoss AB-QM 4.0 og Frese OPTIMA har innebygget differansetrykkregulator. Så lenge pumpetrykket holder Δp ≥ 16–20 kPa er autoriteten alltid β = 1,0!
                    </div>
                  </div>

                  <h4 className="font-bold text-slate-100 uppercase tracking-wider text-[11px]">
                    3. Indekskurs &amp; Pumpehøyde
                  </h4>
                  <p className="text-slate-300">
                    Kretsen med høyest samlet trykktap kalles <strong>Indekskurs</strong>. På denne kursen settes innreguleringsventilen nesten helt åpen (Δp_min ≈ 3–10 kPa), og sirkulasjonspumpens løftehøyde dimensjoneres nøyaktig etter denne kursen.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Fagkurs 5: Ventilasjon */}
          {aktivtFagkurs === 'ventilasjon' && (
            <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <span className="text-xs font-bold uppercase text-emerald-400">Fagkurs 5 · Modul 3 Ventilasjon</span>
                  <h3 className="text-lg font-black text-white">
                    Ventilasjon, Luftbalanse, SFP &amp; Behovsstyring (TEK17 kap. 13 &amp; NS-EN 12599)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigerTilModul('ventilasjon')}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500"
                >
                  Gå til Ventilasjon &amp; Inneklima →
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 text-xs text-slate-300">
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-100 uppercase tracking-wider text-[11px]">
                    1. Luftmengdeberegninger iht. TEK17 § 13-1 til § 13-3
                  </h4>
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 space-y-2 font-mono text-[11px]">
                    <div className="text-slate-400">// Personbelastning:</div>
                    <div className="text-emerald-300">V_person = Antall_personer × 26 m³/h  (7 l/s pr pers)</div>

                    <div className="pt-2 text-slate-400">// Materialemisjoner fra bygningsflater:</div>
                    <div className="text-emerald-300">V_bygg = Areal_BRA × 2,5 m³/(h·m²)  (lavt emitterende)</div>

                    <div className="pt-2 text-slate-400">// SFP-faktor (Spesifikk vifteeffekt):</div>
                    <div className="text-emerald-300">SFP = (P_tilluft + P_avtrekk) / V_maks   [kW/(m³/s)]</div>
                    <div className="text-slate-400 text-[10px]">
                      Krav TEK17: SFP ≤ 1,5 for kontor/skole, SFP ≤ 2,0 ved avtrekk.
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-bold text-slate-100 uppercase tracking-wider text-[11px]">
                    2. K-faktor måling på ventiler (NS-EN 12599)
                  </h4>
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 space-y-1 font-mono text-[11px]">
                    <div>q = k × √(Δp_m)   [l/s]</div>
                    <div className="text-slate-400 text-[10px]">
                      Δp_m måles med mikromanometer. k-faktorer hentes fra Trox Auranor, Lindab eller Systemair.
                    </div>
                  </div>

                  <h4 className="font-bold text-slate-100 uppercase tracking-wider text-[11px]">
                    3. Krav om separate aggregater (Agent 06 &amp; 16)
                  </h4>
                  <p className="text-slate-300">
                    Storkjøkken, vaskehall og laboratorier skal <strong>aldri</strong> kobles på roterende gjenvinner sammen med kontor/skole på grunn av lukt- og smitteoverføring. Det må prosjekteres separate avtrekksaggregater eller væskekoblede batterigjenvinnere (Swegon GOLD CX).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Fagkurs 6: Brann & Sprinkler */}
          {aktivtFagkurs === 'sprinkler' && (
            <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <span className="text-xs font-bold uppercase text-emerald-400">Fagkurs 6 · Modul 6 Brann</span>
                  <h3 className="text-lg font-black text-white">
                    Sprinklerdimensjonering &amp; Branntromler (FG-930:1 / NS-EN 12845 &amp; TEK17 § 11-16)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigerTilModul('brann')}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500"
                >
                  Gå til Brann &amp; Sprinkler →
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 text-xs text-slate-300">
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-100 uppercase tracking-wider text-[11px]">
                    1. Sprinklerdimensjonering (FG-930:1 / NS-EN 12845)
                  </h4>
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 space-y-2 font-mono text-[11px]">
                    <div className="text-slate-400">// Dimensjonerende vannmengde (Q_dim):</div>
                    <div className="text-emerald-300">Q_dim = Areal_virke × Tetthet × 1,2   [l/min]</div>
                    <div className="text-slate-400 text-[10px]">
                      LH (bolig/kontor): A = 84 m², 2,25 mm/min → ca. 227 l/min
                    </div>
                    <div className="text-slate-400 text-[10px]">
                      OH1 (hotell/skole): A = 144 m², 5,0 mm/min → ca. 864 l/min
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-bold text-slate-100 uppercase tracking-wider text-[11px]">
                    2. Branntromler iht. TEK17 § 11-16
                  </h4>
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 space-y-2">
                    <div>
                      <strong>Dekningskontroll:</strong> Reell ganglinje må være under 30 meter slange + 5 meter kasteradius. Ganglinjen må aldri måles i luftlinje gjennom vegger eller branndører!
                    </div>
                    <div>
                      <strong>Vanntrykk:</strong> Minst 2,0 bar driftstrykk ved munnstykket under samtidig uttak.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* FANE 2: AGENT-LEKSIKONET (DE 19 AGENTENE)                            */}
      {/* ==================================================================== */}
      {aktivFane === 'agenter' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white">
                  De 19 Spesialist-Agentene i VVS KEM PRO
                </h3>
                <p className="text-xs text-slate-400">
                  Strukturert etter de 4 faglige fasene i prosjekteringsforløpet. Klikk på en agent for å åpne AI-chatten direkte.
                </p>
              </div>

              {/* Fase-filter */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setAgentFilterFase('alle')}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                    agentFilterFase === 'alle' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Alle (19)
                </button>
                <button
                  type="button"
                  onClick={() => setAgentFilterFase('A')}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                    agentFilterFase === 'A' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Fase A: Oppstart &amp; Matrikkel
                </button>
                <button
                  type="button"
                  onClick={() => setAgentFilterFase('B')}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                    agentFilterFase === 'B' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Fase B: VA &amp; Koter
                </button>
                <button
                  type="button"
                  onClick={() => setAgentFilterFase('C')}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                    agentFilterFase === 'C' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Fase C: Varme &amp; Ventilasjon
                </button>
                <button
                  type="button"
                  onClick={() => setAgentFilterFase('D')}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                    agentFilterFase === 'D' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Fase D: QA &amp; Sluttsignatur
                </button>
              </div>
            </div>
          </div>

          {/* Rutenett over agenter */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {AGENTER.filter((a) => {
              if (agentFilterFase === 'A') return [1, 2, 7, 15].includes(a.nummer);
              if (agentFilterFase === 'B') return [19, 3, 14].includes(a.nummer);
              if (agentFilterFase === 'C') return [4, 6, 5, 8, 9].includes(a.nummer);
              if (agentFilterFase === 'D') return [16, 10, 11, 12, 13, 17, 18].includes(a.nummer);
              return true;
            }).map((a) => {
              const faseNavn =
                [1, 2, 7, 15].includes(a.nummer)
                  ? 'Fase A: Oppstart & Matrikkel'
                  : [19, 3, 14].includes(a.nummer)
                  ? 'Fase B: VA, Koter & Bunnledning'
                  : [4, 6, 5, 8, 9].includes(a.nummer)
                  ? 'Fase C: Varme, Vent, Brann & ITB'
                  : 'Fase D: QA, BREEAM & Signatur';

              return (
                <div
                  key={a.id}
                  className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/70 p-4 transition hover:border-slate-700 hover:bg-slate-900"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-extrabold text-indigo-400">
                        AGENT {a.nummer < 10 ? `0${a.nummer}` : a.nummer}
                      </span>
                      <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">
                        {faseNavn.split(':')[0]}
                      </span>
                    </div>

                    <h4 className="mt-1 font-bold text-sm text-white">{a.navn}</h4>
                    <div className="mt-0.5 font-mono text-[11px] text-emerald-400">
                      NS 3451: {a.nsKode || '–'}
                    </div>

                    <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                      {a.rolleBeskrivelse || a.kjernefunksjon}
                    </p>

                    <div className="mt-3 space-y-1.5 border-t border-slate-800/80 pt-2.5 text-[11px] text-slate-400">
                      <div>
                        <strong className="text-slate-300">Kjernefunksjon: </strong>
                        {a.kjernefunksjon}
                      </div>
                      <div>
                        <strong className="text-slate-300">Myndighetskrav: </strong>
                        {Array.isArray(a.standarder) ? a.standarder.join(', ') : (a.standarder || 'TEK17 / NS-standarder')}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-slate-800/80 pt-3">
                    <button
                      type="button"
                      onClick={() => onApneChat(a.id, `Hei ${a.navn}, kan du gå gjennom forutsetningene for ${prosjekt?.navn || 'dette prosjektet'}?`)}
                      className="inline-flex min-h-[36px] w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-950/80 border border-indigo-700/80 px-3 py-1.5 text-xs font-bold text-indigo-200 transition hover:bg-indigo-900"
                    >
                      <span>💬</span>
                      <span>Åpne chat med Agent {a.nummer}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* FANE 3: SLIK BRUKER DU APPEN (KLIKK FOR KLIKK)                       */}
      {/* ==================================================================== */}
      {aktivFane === 'brukerveiledning' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <h3 className="text-sm font-bold text-white">
              Slik bruker du VVS KEM PRO – Fra tomt prosjekt til ferdig signatur
            </h3>
            <p className="text-xs text-slate-400">
              En helhetlig 6-trinns veileder tilpasset både rådgivende ingeniør VVS (RIV) og utførende rørleggermester.
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                steg: 1,
                tittel: 'Trinn 1: Opprett Prosjekt &amp; Hent Grunnlagsdata',
                ikon: '📂',
                tekst:
                  'Klikk «+ Nytt prosjekt» øverst til venstre. Tast inn prosjektnavn og bruk Kartverket-oppslaget for automatisk å hente offisiell gateadresse, Gnr/Bnr og terrengkote. Dra og slipp PDF-rapporter, Excel-kalkyler eller bilder rett inn i feltet.',
                knappTekst: 'Gå til Prosjektdashbord',
                handling: onNavigerTilDashbord,
              },
              {
                steg: 2,
                tittel: 'Trinn 2: Koteregnskap &amp; Lov 2 Tilbakeslagssjekk (950 mm)',
                ikon: '📐',
                tekst:
                  'Gå til Modul 1 (Koter & Utvendig VA). Tast inn kote ITR og IBR i kommunal kum, samt kote laveste sluk / ferdig gulv (OK FG). Hvis marginen er under 950 mm (eller 0,90 m TEK17), krever appen automatisk avløpspumpestasjon (NS-EN 12050).',
                knappTekst: 'Åpne Koteregnskap (Modul 1)',
                handling: () => onNavigerTilModul('sanitaer', 'koter'),
              },
              {
                steg: 3,
                tittel: 'Trinn 3: Sanitær Trykkfall &amp; Beredervolum',
                ikon: '💧',
                tekst:
                  'Regn trykkbudsjett iht. Byggforsk 553.102 for å finne disponibelt trykk til friksjon (p_disp,frik). Dimensjoner fordelingsledninger og sjekk at vannhastigheten aldri overstiger 2,0 m/s. Dimensjoner varmtvannsbereder (VVB) for spissbelastning.',
                knappTekst: 'Åpne Trykkfallskalkulator',
                handling: () => onNavigerTilModul('sanitaer', 'forbruksvann'),
              },
              {
                steg: 4,
                tittel: 'Trinn 4: Varme, Hydronikk, Innregulering &amp; Ventilasjon',
                ikon: '🔥',
                tekst:
                  'Gå til Modul 2 og Modul 3. Kontroller at teknisk rom tilfredsstiller TEK17 § 14-4(2) (10 m² + 1 % BRA). Dimensjoner ekspansjonskar (Pneumatex Statico/Compresso) og fyll ut innreguleringsprotokoll (STAD / PICV) med sjekk av ventilautoritet β ≥ 0,30.',
                knappTekst: 'Åpne Varme & Innregulering',
                handling: () => onNavigerTilModul('varme'),
              },
              {
                steg: 5,
                tittel: 'Trinn 5: Seniorrådgiverens QA-Port (Agent 16)',
                ikon: '🛡️',
                tekst:
                  'Gå til Agent 16 QA-port for reversert formelsjekk. Gå gjennom samtlige 13 kontrollpunkter (7 Sanity check + 6 QA-punkter før signatur). Hvis kommunale data mangler, kan du slå på «Midlertidig estimat / Venter på kommunen» i Gatekeeper.',
                knappTekst: 'Gå til Agent 16 QA-port',
                handling: onNavigerTilQaPort,
              },
              {
                steg: 6,
                tittel: 'Trinn 6: Visuell A4-Rapport, PDF &amp; NotebookLM-Eksport',
                ikon: '📄',
                tekst:
                  'I den globale rapportlinjen (<GlobalRapportBar>) klikker du «📄 Visuell rapport & PDF». Dette åpner en utskriftsoptimalisert A4-rapport med offisielt brevhode for Kim Jørgensen | Rørleggermester & RIV, nøkkeltall og godkjenningsstempel. Du kan også laste ned ren .md for AI-bruk.',
                knappTekst: 'Se Prosjektdashbord & Rapporter',
                handling: onNavigerTilDashbord,
              },
            ].map((t) => (
              <div
                key={t.steg}
                className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/70 p-4 transition sm:flex-row sm:items-center gap-4"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-xl font-bold">
                    {t.ikon}
                  </span>
                  <div>
                    <h4 className="font-bold text-sm text-white">{t.tittel}</h4>
                    <p className="mt-1 text-xs text-slate-300 leading-relaxed max-w-3xl">
                      {t.tekst}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={t.handling}
                  className="inline-flex min-h-[38px] shrink-0 items-center justify-center rounded-lg bg-slate-800 px-3.5 py-1.5 text-xs font-bold text-emerald-300 hover:bg-slate-700 hover:text-white"
                >
                  {t.knappTekst} →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* FANE 4: NOTEBOOKLM & AI LYDKURS (PROMPTS)                            */}
      {/* ==================================================================== */}
      {aktivFane === 'notebooklm' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <h3 className="text-sm font-bold text-white">
              Google NotebookLM &amp; AI-Kommandosentral Integrasjon
            </h3>
            <p className="mt-1 text-xs text-slate-300">
              VVS KEM PRO eksporterer ferdig formaterte <code>.md</code>-rapporter i ren Markdown. Last opp filen som kilde i NotebookLM for å generere lydkurs (Audio Overview podcast), videomanus og anbudsbeskrivelser.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-4 text-xs font-bold">
              {[
                { id: 'audio_overview', tittel: '🎙️ Lydkurs (Audio Overview)', desc: 'Podcast-dialog mellom to faglige verter' },
                { id: 'byggherre_mote', tittel: '💼 Byggherremøte & Presentasjon', desc: '5-minutters tale- og lysarkmanus' },
                { id: 'kommune_notat', tittel: '🏛️ Teknisk Notat til Kommune / ARK', desc: 'Saksutredning for TEK17 § 14-4 & koter' },
                { id: 'byggeplass_ks', tittel: '🛠️ Byggeplasskontroll (Rørlegger)', desc: 'Praktisk sjekkliste for mester i felt' },
              ].map((kat) => (
                <button
                  key={kat.id}
                  type="button"
                  onClick={() => setValgtPromptKategori(kat.id)}
                  className={`flex flex-col items-start rounded-xl border p-3 text-left transition ${
                    valgtPromptKategori === kat.id
                      ? 'border-indigo-500 bg-indigo-950/60 text-white shadow ring-1 ring-indigo-500'
                      : 'border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <span className="font-bold text-xs">{kat.tittel}</span>
                  <span className="mt-0.5 text-[10px] font-normal opacity-80">{kat.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Prompt 1: Audio Overview Podcast */}
          {valgtPromptKategori === 'audio_overview' && (
            <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <span className="text-xs font-bold uppercase text-indigo-400">NotebookLM Prompt 1</span>
                  <h4 className="text-base font-black text-white">
                    Deep Dive Audio Overview (Fagpodcast for RIV &amp; Mester)
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    kopierPrompt(
                      'NotebookLM Lydkurs / Podcast',
                      `Du er en erfaren seniorrådgiver og programleder i en teknisk VVS-podcast. Basert på den opplastede rapporten fra VVS KEM PRO for prosjektet «${prosjekt?.navn || 'Prosjektet'}», generer en levende og faglig dyp podcast-samtale mellom to faglige eksperter (Kim, rørleggermester og RIV, og Maria, bygningsfysiker).

Samtalen skal dekke:
1. Prosjektets rammer (BRA, bygningskategori, sted og forutsetninger).
2. De kritiske koteforholdene: Hvorfor 950 mm-regelen (Lov 2 mot ITR) er livsviktig for å unngå tilbakeslag i kjelleren, og om lukket avløpspumpestasjon (NS-EN 12050) kreves.
3. Trykkbudsjettet for forbruksvann iht. Byggforsk 553.102: Disponibelt trykk, rørhastighet (maks 2,0 m/s) og margin.
4. Varme, hydronikk og TEK17 § 14-4 minsteareal til varmesentral (10 m² + 1 % BRA).
5. Konklusjon og råd til byggherren før signatur.

Hold tonen engasjert, profesjonell, norsk og fri for rå formelkoder. Snakk som to erfarne fagfolk på byggeplassmøte.`
                    )
                  }
                  className="rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-indigo-500"
                >
                  📋 Kopier prompt til NotebookLM
                </button>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                {`Du er en erfaren seniorrådgiver og programleder i en teknisk VVS-podcast. Basert på den opplastede rapporten fra VVS KEM PRO for prosjektet «${prosjekt?.navn || 'Prosjektet'}», generer en levende og faglig dyp podcast-samtale mellom to faglige eksperter (Kim, rørleggermester og RIV, og Maria, bygningsfysiker).

Samtalen skal dekke:
1. Prosjektets rammer (BRA, bygningskategori, sted og forutsetninger).
2. De kritiske koteforholdene: Hvorfor 950 mm-regelen (Lov 2 mot ITR) er livsviktig for å unngå tilbakeslag i kjelleren, og om lukket avløpspumpestasjon (NS-EN 12050) kreves.
3. Trykkbudsjettet for forbruksvann iht. Byggforsk 553.102: Disponibelt trykk, rørhastighet (maks 2,0 m/s) og margin.
4. Varme, hydronikk og TEK17 § 14-4 minsteareal til varmesentral (10 m² + 1 % BRA).
5. Konklusjon og råd til byggherren før signatur.

Hold tonen engasjert, profesjonell, norsk og fri for rå formelkoder. Snakk som to erfarne fagfolk på byggeplassmøte.`}
              </div>
            </div>
          )}

          {/* Prompt 2: Byggherremøte */}
          {valgtPromptKategori === 'byggherre_mote' && (
            <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <span className="text-xs font-bold uppercase text-indigo-400">NotebookLM Prompt 2</span>
                  <h4 className="text-base font-black text-white">
                    Videomanus &amp; Presentasjonsnotat for Byggherre (5 minutter)
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    kopierPrompt(
                      'Byggherremøte / Presentasjon',
                      `Basert på den opplastede rapporten fra VVS KEM PRO, lag et strukturert 5-minutters presentasjonsmanus for Kim Jørgensen (Rørleggermester & RIV) til et prosjekteringsmøte med Byggherre og Prosjektleder.

Strukturer innlegget i 4 klare punkter:
1. Status for prosjektet og hva som er ferdig verifisert (Underlag, trykk og koter).
2. Hvilke lovpålagte tiltak som krever budsjettgodkjenning (f.eks. avløpspumpestasjon NS-EN 12050 eller trykkreduksjonsventil ved > 6,0 bar).
3. 25-års LCC-analyse og energieffektivitet (hvorfor Mesterens valg sparer driftskostnader over tid).
4. Neste skritt fram mot anbudsinnbydelse og utførelsesfase.`
                    )
                  }
                  className="rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-indigo-500"
                >
                  📋 Kopier prompt til NotebookLM
                </button>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                {`Basert på den opplastede rapporten fra VVS KEM PRO, lag et strukturert 5-minutters presentasjonsmanus for Kim Jørgensen (Rørleggermester & RIV) til et prosjekteringsmøte med Byggherre og Prosjektleder.

Strukturer innlegget i 4 klare punkter:
1. Status for prosjektet og hva som er ferdig verifisert (Underlag, trykk og koter).
2. Hvilke lovpålagte tiltak som krever budsjettgodkjenning (f.eks. avløpspumpestasjon NS-EN 12050 eller trykkreduksjonsventil ved > 6,0 bar).
3. 25-års LCC-analyse og energieffektivitet (hvorfor Mesterens valg sparer driftskostnader over tid).
4. Neste skritt fram mot anbudsinnbydelse og utførelsesfase.`}
              </div>
            </div>
          )}

          {/* Prompt 3: Kommune / ARK */}
          {valgtPromptKategori === 'kommune_notat' && (
            <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <span className="text-xs font-bold uppercase text-indigo-400">NotebookLM Prompt 3</span>
                  <h4 className="text-base font-black text-white">
                    Teknisk Notat til Kommune (VA-etat) &amp; Arkitekt (TEK17 § 14-4)
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    kopierPrompt(
                      'Teknisk Notat til Kommune / ARK',
                      `Bruk dataene fra den opplastede rapporten fra VVS KEM PRO til å forfatte to separate profesjonelle notater:

NOTAT 1 (Til Kommunens VA-avdeling):
- Offisiell henvendelse vedrørende Gnr/Bnr og ledningskart.
- Forespørsel om koter (ITR/IBR) og kapasitet på overvannsnettet (IVF-kurve og maks tillatt påslipp i l/s).
- Skjerm interne arkitektdetaljer (aldri nevn TEK17 § 14-4 eller interne budsjetter her).

NOTAT 2 (Til Arkitekt og Byggesaksrådgiver):
- Krav til teknisk rom / varmesentral iht. TEK17 § 14-4(2) basert på oppvarmet BRA.
- Føringsveier for sjakter og nødvendig takhøyde for ventilasjonsaggregat og rørfordelere.`
                    )
                  }
                  className="rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-indigo-500"
                >
                  📋 Kopier prompt til NotebookLM
                </button>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                {`Bruk dataene fra den opplastede rapporten fra VVS KEM PRO til å forfatte to separate profesjonelle notater:

NOTAT 1 (Til Kommunens VA-avdeling):
- Offisiell henvendelse vedrørende Gnr/Bnr og ledningskart.
- Forespørsel om koter (ITR/IBR) og kapasitet på overvannsnettet (IVF-kurve og maks tillatt påslipp i l/s).
- Skjerm interne arkitektdetaljer (aldri nevn TEK17 § 14-4 eller interne budsjetter her).

NOTAT 2 (Til Arkitekt og Byggesaksrådgiver):
- Krav til teknisk rom / varmesentral iht. TEK17 § 14-4(2) basert på oppvarmet BRA.
- Føringsveier for sjakter og nødvendig takhøyde for ventilasjonsaggregat og rørfordelere.`}
              </div>
            </div>
          )}

          {/* Prompt 4: Byggeplasskontroll */}
          {valgtPromptKategori === 'byggeplass_ks' && (
            <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <span className="text-xs font-bold uppercase text-indigo-400">NotebookLM Prompt 4</span>
                  <h4 className="text-base font-black text-white">
                    Byggeplasskontroll &amp; Uavhengig Kontroll (Rørleggermester KS)
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    kopierPrompt(
                      'Byggeplasskontroll KS',
                      `Fra den opplastede rapporten, generer en praktisk sjekkliste i punktform for rørleggermester og formann på byggeplassen:

1. Bunnledninger: Kontroll av fall (min. 1:60), bruk av kun 45° Y-grener og stake-/spylegren ved utgang grunnmur.
2. Gjennomføringer: Branntetting (EI60/EI90) og mansjetter for rør-i-rør fordelerskap.
3. Rørfordeling: Trykkprøving med vann (1,5 × driftstrykk i 2 timer) iht. NS-EN 806-4.
4. Innregulering: Nullstilling og avlesning av STAD/PICV ventiler iht. dimensjoneringstabellen.
5. Sluttkontroll: Uavhengig kontrollskjema for fuktsikring (SAK10).`
                    )
                  }
                  className="rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-indigo-500"
                >
                  📋 Kopier prompt til NotebookLM
                </button>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                {`Fra den opplastede rapporten, generer en praktisk sjekkliste i punktform for rørleggermester og formann på byggeplassen:

1. Bunnledninger: Kontroll av fall (min. 1:60), bruk av kun 45° Y-grener og stake-/spylegren ved utgang grunnmur.
2. Gjennomføringer: Branntetting (EI60/EI90) og mansjetter for rør-i-rør fordelerskap.
3. Rørfordeling: Trykkprøving med vann (1,5 × driftstrykk i 2 timer) iht. NS-EN 806-4.
4. Innregulering: Nullstilling og avlesning av STAD/PICV ventiler iht. dimensjoneringstabellen.
5. Sluttkontroll: Uavhengig kontrollskjema for fuktsikring (SAK10).`}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
