import type { ProsjektData } from '../data/prosjekter';
import GatekeeperPanel from '../components/GatekeeperPanel';
import { Kort, Knapp } from '../components/common/ui';
import type { ProsjektAnalyse } from '../lib/analyse';
import { BEREDER_ANTAGELSER } from '../lib/analyse';
import { lastNedTekst } from '../lib/format';
import type { OverstyringInfo } from '../lib/lagring';
import { QA_PUNKTER, SANITY_PUNKTER, beregnKravVarmesentralM2, vurderKotekontrollStatus, beregnSignaturStatus } from '../lib/qa';
import { lagQaRapport } from '../lib/rapport';

interface Props {
  prosjekt: ProsjektData;
  analyse: ProsjektAnalyse;
  qa: Record<string, boolean>;
  overstyringer?: Record<string, OverstyringInfo>;
  godkjent?: {
    laast: boolean;
    tidspunkt: string;
    medForbehold: boolean;
  };
  onToggleQa: (id: string) => void;
  onNullstillQa?: () => void;
  onOppdaterProsjektOgOverstyringer?: (
    oppdatertProsjekt: ProsjektData,
    nyeOverstyringer: Record<string, OverstyringInfo>,
    endringer: string[]
  ) => void;
  onGodkjennOgLaasProsjekt?: (medForbehold: boolean) => void;
  melding: (tekst: string) => void;
  onGaaTilAgent?: (agentId: string) => void;
  onApneChat?: (agentId: string) => void;
}

export default function Agent16QAPort({
  prosjekt,
  analyse,
  qa,
  overstyringer = {},
  godkjent,
  onToggleQa,
  onNullstillQa,
  onOppdaterProsjektOgOverstyringer,
  onGodkjennOgLaasProsjekt,
  melding,
  onGaaTilAgent,
  onApneChat,
}: Props) {
  const fullfortAntall = QA_PUNKTER.filter((p) => qa[p.id]).length;
  const signaturStatus = beregnSignaturStatus(qa);
  const kravMm = (analyse.krav * 1000).toFixed(0);
  const koteStatus = vurderKotekontrollStatus(prosjekt, analyse, qa);

  const kopierQARapport = () => {
    const tekst = lagQaRapport(prosjekt, analyse, qa, qa, overstyringer);
    navigator.clipboard?.writeText(tekst);
    melding('📋 Komplett QA-revisjonsrapport kopiert til utklippstavlen!');
  };

  const lastNedQARapport = () => {
    const tekst = lagQaRapport(prosjekt, analyse, qa, qa, overstyringer);
    const filnavn = `${prosjekt.navn.toLowerCase().replace(/[^a-z0-9]+/gi, '-')}-qa-rapport.txt`;
    lastNedTekst(filnavn, tekst);
    melding('📥 Endelig QA-rapport lastet ned som .TXT!');
  };

  return (
    <div className="space-y-6">
      {/* Toppbjelke */}
      <div className="rounded-xl border border-rose-900/60 bg-gradient-to-r from-rose-950/40 via-slate-900 to-slate-900 p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🛡️</span>
              <h2 className="text-xl font-bold text-rose-300">
                Agent 16: QA, Kildekritikk & Djevelens Advokat
              </h2>
              <span className="rounded border border-rose-800 bg-rose-950 px-2 py-0.5 text-xs font-bold text-rose-300">
                OVERORDNET QA-PORT
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-300">
              Nådeløs faglig revisjonsport for <strong>{prosjekt.navn}</strong>. Kontrollregner alle formler baklengs, etterprøver koter mot {kravMm} mm-regelen og avdekker skjulte prosjektfeller.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {onApneChat && (
              <Knapp variant="primar" onClick={() => onApneChat('agent-16')}>
                💬 Spør Agent 16 i AI-chat
              </Knapp>
            )}
            {onGaaTilAgent && (
              <Knapp variant="sekundar" onClick={() => onGaaTilAgent('agent-19')}>
                🚜 Koter (Agent 19)
              </Knapp>
            )}
            <Knapp variant="sekundar" onClick={kopierQARapport}>
              📋 Kopier QA-revisjon
            </Knapp>
          </div>
        </div>
      </div>

      {/* Steg 1: Matematisk revisjon & reverserte formler */}
      <Kort tittel="1. Matematisk Revisjon & Reverserte Beregninger" ikon="🧮">
        <p className="mb-4 text-xs text-slate-400">
          Agent 16 aksepterer ingen tall ukritisk. Samtlige sentrale formler regnes her baklengs fra det valgte prosjektets inndata (uten gjetting):
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-3">
            <div className="text-[11px] font-semibold text-slate-400">Grøfteregnskap (Utgang grunnmur)</div>
            {analyse.minKoteUtgang !== null ? (
              <>
                <div className="mt-1 text-base font-bold text-emerald-400">
                  C +{analyse.minKoteUtgang.toFixed(2)} moh
                </div>
                <div className="mt-1 text-[11px] text-slate-400">
                  IBR ({prosjekt.koter.ibrKum}) + ({prosjekt.koter.stikkLengde} m × 1:{prosjekt.koter.fallNevner})
                </div>
              </>
            ) : (
              <div className="mt-1 text-xs text-amber-300">
                ⚠️ HINT: Mangler IBR, lengde eller fall
              </div>
            )}
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-900 p-3">
            <div className="text-[11px] font-semibold text-slate-400">TEK17 § 14-4(2) Varmesentral</div>
            {analyse.varmesentral.kravM2 !== null ? (
              <>
                <div
                  className={`mt-1 text-base font-bold ${
                    analyse.varmesentral.ok === false ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  Krav: {analyse.varmesentral.kravM2.toFixed(0)} m²
                </div>
                <div className="mt-1 text-[11px] text-slate-400">
                  {analyse.varmesentral.avsattM2 !== null
                    ? `Avsatt: ${analyse.varmesentral.avsattM2} m² (${analyse.varmesentral.ok ? 'OK' : 'FOR LITE!'})`
                    : 'Avsatt m² ikke oppgitt'}
                </div>
              </>
            ) : (
              <div className="mt-1 text-xs text-amber-300">⚠️ HINT: BRA ikke oppgitt</div>
            )}
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-900 p-3">
            <div className="text-[11px] font-semibold text-slate-400">Beredervolum (Spisslast)</div>
            {analyse.bereder !== null ? (
              <>
                <div className="mt-1 text-base font-bold text-amber-400">
                  {analyse.bereder.varmLiter.toFixed(0)} l ({BEREDER_ANTAGELSER.berederTemp} °C)
                </div>
                <div className="mt-1 text-[11px] text-slate-400">
                  Fra {analyse.bereder.blandetLiter.toFixed(0)} l ved {BEREDER_ANTAGELSER.blandetTemp} °C ({prosjekt.belastning.dusjer} dusjer)
                </div>
              </>
            ) : (
              <div className="mt-1 text-xs text-slate-400">Ingen dusjspisslast oppgitt</div>
            )}
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-900 p-3">
            <div className="text-[11px] font-semibold text-slate-400">Dim. Overvann (Q = A·i·φ)</div>
            {analyse.overvann !== null ? (
              <>
                <div className="mt-1 text-base font-bold text-sky-400">
                  {analyse.overvann.q.toFixed(1)} l/s
                </div>
                <div className="mt-1 text-[11px] text-slate-400">
                  A_red = {analyse.overvann.aRed.toFixed(0)} m² · i = {prosjekt.overvann.intensitet} l/(s·ha)
                </div>
              </>
            ) : (
              <div className="mt-1 text-xs text-amber-300">⚠️ HINT: Mangler flater/intensitet</div>
            )}
          </div>
        </div>
      </Kort>

      {/* Steg 2: Kote- og tilbakeslagsrevisjon */}
      <Kort tittel={`2. Kote- og ${kravMm} mm-revisjon (Lov 2: Spesialsjekk mot Oppstuvning)`} ikon="🚨">
        {analyse.gulvKontroller.length === 0 ? (
          <div className="rounded-lg border border-amber-800/70 bg-amber-950/30 p-4 text-xs text-amber-200">
            <strong>⚠️ HINT (Lov 1 + Lov 2):</strong> Kote for kommunal rørtopp (ITR) eller laveste sluk/gulv mangler i prosjektdataene for{' '}
            <strong>{prosjekt.navn}</strong>. Ingen avløp kan godkjennes på selvfall før koter er innhentet og kontrollert.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {analyse.gulvKontroller.map((g) => (
              <div
                key={g.navn}
                className={`rounded-lg border p-4 ${
                  g.ok
                    ? 'border-emerald-800/60 bg-emerald-950/20'
                    : 'border-rose-800/80 bg-rose-950/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-bold ${g.ok ? 'text-emerald-400' : 'text-rose-300'}`}>
                    {g.navn} (C +{g.kote.toFixed(2)})
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-bold ${
                      g.ok
                        ? 'bg-emerald-900/60 text-emerald-300'
                        : 'bg-rose-900 text-rose-200'
                    }`}
                  >
                    {g.ok ? 'SELVFALL GODKJENT' : '🚨 RØD ALARM: PUMPEKRAV'}
                  </span>
                </div>
                <div className="mt-2 text-xs text-slate-200">
                  Høydeforskjell til kommunal ITR (C +{prosjekt.koter.itrKum?.toFixed(2)}):{' '}
                  <strong className={g.ok ? 'text-emerald-300' : 'text-rose-300'}>
                    {g.margin >= 0 ? '+' : ''}
                    {g.margin.toFixed(2)} m ({(g.margin * 1000).toFixed(0)} mm)
                  </strong>
                </div>
                {g.ok ? (
                  <p className="mt-2 text-[11px] text-slate-400">
                    Oppfyller kravet på ≥ {kravMm} mm over innvendig topp rør i tilknytningspunktet. Kan føres på selvfall.
                  </p>
                ) : (
                  <div className="mt-3 rounded border border-rose-700/60 bg-slate-900/80 p-2 text-xs text-amber-300">
                    <strong>Ufravikelig tiltak:</strong> Mangler {(g.mangel * 1000).toFixed(0)} mm mot kravet ({kravMm} mm). Må sikres med lukket avløpspumpestasjon (NS-EN 12050) m/ svanehals over gatelokk eller godkjent tilbakeslagssikring.
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Kort>

      {/* Steg 3: Kildekritikk & Prosjektfeller */}
      <Kort tittel="3. Kildekritikk, Manglende Underlag & Prosjektfeller" ikon="⚖️">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="mb-2 text-xs font-bold text-amber-300">
              ⚠️ Manglende underlag / Forbehold (Lov 1):
            </div>
            {analyse.mangler.length === 0 ? (
              <div className="rounded border border-emerald-800/60 bg-emerald-950/20 p-3 text-xs text-emerald-300">
                ✅ Alle obligatoriske grunndata er utfylt i prosjektet.
              </div>
            ) : (
              <ul className="space-y-1.5 text-xs text-amber-200">
                {analyse.mangler.map((m, i) => (
                  <li key={i} className="rounded border border-amber-900/60 bg-amber-950/20 p-2">
                    ⚠️ <strong>HINT {i + 1}:</strong> {m}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <div className="mb-2 text-xs font-bold text-rose-300">
              🚨 Registrerte prosjektfeller / avvik å kontrollere:
            </div>
            {prosjekt.feller.length === 0 ? (
              <div className="rounded border border-slate-800 bg-slate-900 p-3 text-xs text-slate-400">
                Ingen manuelle prosjektfeller lagt inn ennå. Du kan registrere egne feller/observasjoner i «Rediger prosjekt».
              </div>
            ) : (
              <ul className="space-y-1.5 text-xs text-rose-200">
                {prosjekt.feller.map((f, i) => (
                  <li key={i} className="rounded border border-rose-900/60 bg-rose-950/30 p-2">
                    ❌ <strong>Felle {i + 1}:</strong> {f}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Kort>

      {/* Steg 4: Logisk Brist & Sanity Check */}
      <Kort tittel="4. Logisk Brist & Sanity Check (Praksissjekk)" ikon="🔍">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
            <span className="text-xs text-slate-400">
              7 ufravikelige praksissjekker. Alle starter uavkrysset og krever aktiv faglig vurdering.
            </span>
            {onNullstillQa && (
              <button
                type="button"
                onClick={onNullstillQa}
                title="Nullstill alle avkryssinger i både seksjon 4 og 5"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-300 transition hover:border-amber-500 hover:text-amber-200"
              >
                🔄 Nullstill sjekkliste
              </button>
            )}
          </div>
          <div className="grid gap-2 sm:grid-cols-2 text-xs">
            {SANITY_PUNKTER.map((p) => {
              const sjekket = !!qa[p.id];
              return (
                <label
                  key={p.id}
                  className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition ${
                    sjekket
                      ? 'border-emerald-700/60 bg-emerald-950/20 text-emerald-200'
                      : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={sjekket}
                    onChange={() => onToggleQa(p.id)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-800 text-emerald-500"
                  />
                  <span>{p.tekst}</span>
                </label>
              );
            })}
          </div>
        </div>
      </Kort>

      {/* Steg 5: Seniorrådgiverens Sjekkliste Før Signatur */}
      <Kort tittel="5. Seniorrådgiverens 6-punkts Sjekkliste Før Signatur" ikon="✍️">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
            <p className="text-xs text-slate-400">
              Avkryssingen lagres automatisk per prosjekt (<strong>{prosjekt.navn}</strong>). Ingen automatisk forhåndsgodkjenning.
            </p>
            {onNullstillQa && (
              <button
                type="button"
                onClick={onNullstillQa}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-300 transition hover:border-amber-500 hover:text-amber-200"
              >
                🔄 Nullstill sjekkliste
              </button>
            )}
          </div>

          <div className="space-y-2 pt-1">
            {QA_PUNKTER.map((punkt) => {
              const sjekket = !!qa[punkt.id];

              // Dynamisk tekst og prosjektdatavalidering
              let visningsTekst: string = punkt.tekst;
              let erUgyldigKote = false;

              if (punkt.id === 'sp-1') {
                erUgyldigKote = !koteStatus.ok;
              } else if (punkt.id === 'sp-6') {
                const kravM2 = beregnKravVarmesentralM2(prosjekt.bra);
                visningsTekst = `${punkt.tekst} ${kravM2 !== null ? `(Krav: minst ${kravM2} m²)` : '(Krav: oppgi BRA)'}`;
              }

              // Punkt 1 kan ikke stå som OK automatisk hvis kotedata mangler eller margin er under kravet uten pumpe
              const visOkStatus = sjekket && !erUgyldigKote;
              const erAvvik = erUgyldigKote && koteStatus.status === 'ikke_oppfylt';

              return (
                <div
                  key={punkt.id}
                  className={`rounded-lg border p-2.5 text-xs transition ${
                    visOkStatus
                      ? 'border-emerald-700/60 bg-emerald-950/20 text-emerald-200'
                      : erAvvik
                      ? 'border-rose-700/80 bg-rose-950/30 text-rose-200'
                      : erUgyldigKote
                      ? 'border-amber-700/80 bg-amber-950/30 text-amber-200'
                      : 'border-slate-700 bg-slate-900/60 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <label className="flex cursor-pointer items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        checked={sjekket}
                        onChange={() => onToggleQa(punkt.id)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-400"
                      />
                      <div>
                        <span>{visningsTekst}</span>
                        {punkt.id === 'sp-1' && !koteStatus.ok && (
                          <div
                            className={`mt-1 flex items-center gap-1.5 text-[11px] font-bold ${
                              erAvvik ? 'text-rose-300' : 'text-amber-400'
                            }`}
                          >
                            <span>{koteStatus.advarsel}</span>
                            <span className="font-normal opacity-90">({koteStatus.detalj})</span>
                          </div>
                        )}
                        {punkt.id === 'sp-6' && (
                          <div className="mt-0.5 text-[11px] text-slate-400">
                            {prosjekt.tekniskRomM2 !== null
                              ? `Avsatt i prosjekt: ${prosjekt.tekniskRomM2} m² – krever manuell bekreftelse før grønt lys.`
                              : 'Areal ikke registrert ennå – krever manuell kontroll og bekreftelse.'}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center">
                      {erAvvik ? (
                        <span className="rounded border border-rose-500 bg-rose-950 px-2.5 py-0.5 text-[10px] font-black text-rose-200 shadow">
                          {koteStatus.advarsel}
                        </span>
                      ) : erUgyldigKote ? (
                        <span className="rounded border border-amber-600 bg-amber-950 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                          {koteStatus.advarsel}
                        </span>
                      ) : sjekket ? (
                        <span className="rounded border border-emerald-600 bg-emerald-950 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                          OK
                        </span>
                      ) : (
                        <span className="rounded border border-rose-800 bg-rose-950 px-2 py-0.5 text-[10px] font-semibold text-rose-400">
                          Mangler
                        </span>
                      )}
                    </div>
                  </label>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-3">
            <span className="text-xs text-slate-400">
              Fullført totalt: <strong>{signaturStatus.totaltFullfort} av {signaturStatus.totaltAntall}</strong> kontrollpunkter (7 praksissjekk + 6 før signatur)
            </span>
            <span
              className={`rounded-lg px-3 py-1.5 text-xs font-black shadow transition ${signaturStatus.badgeKlasse}`}
            >
              {signaturStatus.badgeTekst}
            </span>
          </div>
        </div>
      </Kort>

      {/* Gatekeeper Sluttkontroll & AI-Kommunikasjonsassistent */}
      {onOppdaterProsjektOgOverstyringer && (
        <GatekeeperPanel
          prosjekt={prosjekt}
          analyse={analyse}
          overstyringer={overstyringer}
          qaFullfort={fullfortAntall}
          godkjent={godkjent}
          visSluttkontroll={true}
          onOppdaterProsjektOgOverstyringer={onOppdaterProsjektOgOverstyringer}
          onGodkjennOgLaasProsjekt={(medForbehold) => {
            if (onGodkjennOgLaasProsjekt) onGodkjennOgLaasProsjekt(medForbehold);
            kopierQARapport();
            lastNedQARapport();
          }}
          onApneChatMedTekst={onApneChat ? () => onApneChat('agent-16') : undefined}
          melding={melding}
        />
      )}
    </div>
  );
}
