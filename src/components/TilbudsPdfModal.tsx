import { useState } from 'react';
import {
  X,
  Printer,
  Download,
  Building,
  CheckCircle,
  FileText,
} from 'lucide-react';
import type { ProsjektData } from '../data/prosjekter';
import { beregnUtpris, type OrderItem } from './AhlsellOrderQA';
import type { CompanyProfile } from '../lib/auth';
import { lastNedTekst } from '../lib/format';

interface TilbudsPdfModalProps {
  prosjekt: ProsjektData;
  items: OrderItem[];
  company?: CompanyProfile;
  antallTimer?: number;
  timeprisUt?: number;
  systemRabattAktiv?: boolean;
  prosjektType?: 'rehab' | 'tek17';
  isOpen: boolean;
  onClose: () => void;
  melding: (tekst: string) => void;
}

export default function TilbudsPdfModal({
  prosjekt,
  items,
  company,
  antallTimer = 65,
  timeprisUt = 1150,
  systemRabattAktiv = true,
  prosjektType = 'rehab',
  isOpen,
  onClose,
  melding,
}: TilbudsPdfModalProps) {
  const [forbehold, setForbehold] = useState<string>(
    'Tilbudet forutsetter normal bygningsmessig tilrettelegging og fri adkomst til installasjonssted. ' +
      'Arbeidet utføres fagmessig iht. Byggforskserien 553.102, våtromsnormen og gjeldende TEK17-krav. ' +
      'Gyldighet: 30 dager fra tilbudsdato.'
  );

  if (!isOpen) return null;

  const datoStr = new Date().toLocaleDateString('no-NO');
  const tilbudsNr = `TB-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  // Beregninger
  const aktiveItems = items.filter((i) => i.antall > 0);
  const materiellRaa = aktiveItems.reduce(
    (sum, i) => sum + beregnUtpris(i.innpris, i.kategori) * i.antall,
    0
  );
  const rabattBelop = systemRabattAktiv ? Math.round(materiellRaa * 0.05) : 0;
  const materiellNetto = materiellRaa - rabattBelop;
  const timerSum = antallTimer * timeprisUt;
  const sumEksMva = materiellNetto + timerSum;
  const mva = Math.round(sumEksMva * 0.25);
  const sumInklMva = sumEksMva + mva;
  const enovaTilskudd = prosjektType === 'rehab' ? 10000 : 0;
  const nettoInvestering = sumInklMva - enovaTilskudd;

  const handlePrint = () => {
    window.print();
    melding('🖨️ Klargjort for utskrift / Lagre som PDF!');
  };

  const handleLastNedTekst = () => {
    const tekst = `===============================================================
TILBUD PÅ VVS-ANLEGG OG INSTALLASJON (${tilbudsNr})
===============================================================
Dato: ${datoStr}
Leverandør: ${company?.firmanavn || 'Rørleggerbedriften AS'} (Org.nr: ${company?.orgNr || 'MVA'})
Oppdragsgiver: ${prosjekt.byggherre || 'Privat kunde'}
Prosjekt: ${prosjekt.navn}
Adresse: ${prosjekt.sted || 'Byggeplass'}

VARESAMMENSTILLING:
${aktiveItems.map((i) => `- NRF ${i.nrf}: ${i.beskrivelse} | ${i.antall} ${i.enhet} @ ${beregnUtpris(i.innpris, i.kategori)} kr = ${beregnUtpris(i.innpris, i.kategori) * i.antall} kr`).join('\n')}

Materiell (netto): ${materiellNetto.toLocaleString('no-NO')} kr
Rørleggertimer (${antallTimer} t @ ${timeprisUt} kr/t): ${timerSum.toLocaleString('no-NO')} kr
---------------------------------------------------------------
Totalsum eks. mva: ${sumEksMva.toLocaleString('no-NO')} kr
MVA (25 %): ${mva.toLocaleString('no-NO')} kr
TOTALPRIS INKL. MVA: ${sumInklMva.toLocaleString('no-NO')} kr
${enovaTilskudd > 0 ? `Enova-støtte: -${enovaTilskudd.toLocaleString('no-NO')} kr\nNetto investering etter støtte: ${nettoInvestering.toLocaleString('no-NO')} kr inkl. mva` : ''}

VILKÅR:
${forbehold}
===============================================================`;

    lastNedTekst(`Tilbud-${tilbudsNr}.txt`, tekst);
    melding(`📥 Lastet ned tilbudstekst for ${tilbudsNr}!`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[95vh] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl flex flex-col">
        {/* Handlingslinje øverst (skjules ved utskrift) */}
        <div className="print:hidden sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/95 px-6 py-3 backdrop-blur">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
              <FileText className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-white">Forhåndsvisning: A4 Tilbuds-PDF</h3>
              <p className="text-[11px] text-slate-400">
                Klar for utskrift og signering. Firmalogo og bedriftsprofil er inkludert.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleLastNedTekst}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
            >
              <Download className="h-3.5 w-3.5" /> Tekstfil
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-500 transition"
            >
              <Printer className="h-3.5 w-3.5" /> Skriv ut / Lagre som PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Selve A4-arket (Hvit bakgrunn for profesjonell utskrift) */}
        <div className="p-4 sm:p-8 flex justify-center bg-slate-950 overflow-y-auto">
          <div
            id="print-tilbud-a4"
            className="w-full max-w-[210mm] bg-white text-slate-900 p-8 sm:p-12 shadow-2xl rounded-sm font-sans text-xs sm:text-sm print:m-0 print:p-6 print:shadow-none print:max-w-none"
          >
            {/* Toppseksjon med Logo og Bedriftsinfo */}
            <div className="flex flex-col sm:flex-row justify-between items-start border-b-2 border-slate-900 pb-6 mb-6 gap-4">
              <div className="space-y-1">
                {company?.logoBase64 ? (
                  <img
                    src={company.logoBase64}
                    alt={company.firmanavn}
                    className="h-16 max-w-[200px] object-contain mb-2"
                  />
                ) : (
                  <div className="flex items-center gap-2 text-blue-900 font-extrabold text-lg sm:text-xl tracking-tight mb-1">
                    <Building className="h-6 w-6 text-blue-700" />
                    <span>{company?.firmanavn || 'RØRLEGGERBEDRIFTEN AS'}</span>
                  </div>
                )}
                <div className="text-xs text-slate-600 leading-tight">
                  <div className="font-bold text-slate-900">{company?.firmanavn}</div>
                  {company?.orgNr && <div>Org.nr: {company.orgNr}</div>}
                  {company?.adresse && <div>{company.adresse}, {company.postnrSted}</div>}
                  {company?.telefon && <div>Tlf: {company.telefon} · E-post: {company.epost}</div>}
                  {company?.ahlsellKundenummer && (
                    <div className="text-[10px] text-slate-500">Grossistref: {company.ahlsellKundenummer}</div>
                  )}
                </div>
              </div>

              <div className="sm:text-right space-y-1">
                <span className="inline-block rounded bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-900 uppercase">
                  Pristilbud VVS
                </span>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">{tilbudsNr}</h2>
                <div className="text-xs text-slate-600">
                  <span className="font-semibold text-slate-800">Dato:</span> {datoStr}
                </div>
                <div className="text-xs text-slate-600">
                  <span className="font-semibold text-slate-800">Gyldig til:</span> 30 dager fra dato
                </div>
              </div>
            </div>

            {/* Prosjekt- og Oppdragsgiver-detaljer */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Oppdragsgiver / Byggherre
                </span>
                <div className="font-bold text-slate-900 text-sm">{prosjekt.byggherre || 'Privatkunde'}</div>
                <div className="text-slate-600 mt-0.5">Prosjekt: <strong>{prosjekt.navn}</strong></div>
                {prosjekt.sted && <div className="text-slate-600">Byggeadresse: {prosjekt.sted}</div>}
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Prosjektspesifikasjon
                </span>
                <div className="text-slate-700">
                  Type: <strong>{prosjektType === 'rehab' ? 'Rehabilitering / Utskifting' : 'Nybygg iht. TEK17'}</strong>
                </div>
                {prosjekt.bra && <div className="text-slate-700">Areal: {prosjekt.bra} m² BRA</div>}
                <div className="text-slate-700">Fagstandard: Byggforsk 553.102 &amp; NS 3420</div>
              </div>
            </div>

            {/* Varetilbudstabell */}
            <div className="mb-6 overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-3">NRF-Nr.</th>
                    <th className="py-2.5 px-3">Offisiell Varebeskrivelse</th>
                    <th className="py-2.5 px-2 text-center">Antall</th>
                    <th className="py-2.5 px-3 text-right">Pris/enh.</th>
                    <th className="py-2.5 px-3 text-right">Beløp eks. mva</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800">
                  {aktiveItems.map((item) => {
                    const utpris = beregnUtpris(item.innpris, item.kategori);
                    const sum = utpris * item.antall;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono text-[11px] font-semibold text-blue-900">{item.nrf}</td>
                        <td className="py-2 px-3 font-medium text-slate-900">{item.beskrivelse}</td>
                        <td className="py-2 px-2 text-center">{item.antall} {item.enhet}</td>
                        <td className="py-2 px-3 text-right text-slate-600">{utpris.toLocaleString('no-NO')} kr</td>
                        <td className="py-2 px-3 text-right font-semibold text-slate-900">{sum.toLocaleString('no-NO')} kr</td>
                      </tr>
                    );
                  })}

                  {/* Arbeid og montering */}
                  {antallTimer > 0 && (
                    <tr className="bg-blue-50/50 font-medium">
                      <td className="py-2 px-3 font-mono text-[11px] text-blue-800">TIME-VVS</td>
                      <td className="py-2 px-3 text-slate-900">
                        Fagmessig rørleggermontering, rørstrekk og innregulering
                      </td>
                      <td className="py-2 px-2 text-center">{antallTimer} timer</td>
                      <td className="py-2 px-3 text-right text-slate-600">{timeprisUt.toLocaleString('no-NO')} kr</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">{timerSum.toLocaleString('no-NO')} kr</td>
                    </tr>
                  )}

                  {/* Kirsebærplukker-skjold rabatt */}
                  {systemRabattAktiv && rabattBelop > 0 && (
                    <tr className="bg-emerald-50/60 text-emerald-900 font-semibold">
                      <td className="py-2 px-3 font-mono text-[11px]">RABATT-05</td>
                      <td className="py-2 px-3">5 % Samlet Systempakke-rabatt (forutsetter komplett bestilling)</td>
                      <td className="py-2 px-2 text-center">1 pakke</td>
                      <td className="py-2 px-3 text-right">-{rabattBelop.toLocaleString('no-NO')} kr</td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-800">-{rabattBelop.toLocaleString('no-NO')} kr</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Sammendrag og Totaler */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-t border-slate-200 pt-4 mb-6">
              <div className="w-full sm:w-1/2 space-y-2 text-xs">
                <span className="font-bold text-slate-900 block uppercase tracking-wider text-[11px]">
                  Garanti og Forbehold
                </span>
                <textarea
                  value={forbehold}
                  onChange={(e) => setForbehold(e.target.value)}
                  rows={3}
                  className="w-full rounded border border-slate-300 bg-white p-1.5 text-slate-700 text-[11px] leading-relaxed focus:border-emerald-600 focus:outline-none print:border-none print:p-0 print:resize-none"
                />
                <div className="flex items-center gap-1.5 text-emerald-700 font-semibold text-[11px] pt-1">
                  <CheckCircle className="h-3.5 w-3.5" /> Leveres iht. Norsk VVS-bransjestandard og 5 års reklamasjonsrett.
                </div>
              </div>

              <div className="w-full sm:w-5/12 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Materiell netto:</span>
                  <span className="font-semibold text-slate-900">{materiellNetto.toLocaleString('no-NO')} kr</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Montering &amp; rørleggertimer:</span>
                  <span className="font-semibold text-slate-900">{timerSum.toLocaleString('no-NO')} kr</span>
                </div>
                <div className="flex justify-between text-slate-700 border-t border-slate-200 pt-2 font-bold">
                  <span>Sum eks. mva:</span>
                  <span>{sumEksMva.toLocaleString('no-NO')} kr</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Merverdiavgift (25 % MVA):</span>
                  <span>{mva.toLocaleString('no-NO')} kr</span>
                </div>
                <div className="flex justify-between text-slate-900 border-t-2 border-slate-900 pt-2 text-base font-extrabold">
                  <span>TOTALPRIS INKL. MVA:</span>
                  <span className="text-blue-900">{sumInklMva.toLocaleString('no-NO')} kr</span>
                </div>

                {enovaTilskudd > 0 && (
                  <div className="mt-2 rounded-lg bg-emerald-100/70 p-2.5 text-emerald-950 border border-emerald-300/60 space-y-1">
                    <div className="flex justify-between font-bold text-xs">
                      <span>Estimert Enova-støtte:</span>
                      <span>-{enovaTilskudd.toLocaleString('no-NO')} kr</span>
                    </div>
                    <div className="flex justify-between font-extrabold text-xs text-emerald-900 border-t border-emerald-300 pt-1">
                      <span>Netto investering etter støtte:</span>
                      <span>{nettoInvestering.toLocaleString('no-NO')} kr</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Signaturfelter */}
            <div className="grid grid-cols-2 gap-8 border-t border-slate-300 pt-8 mt-8 text-xs">
              <div>
                <div className="border-b border-slate-400 pb-8 mb-2"></div>
                <div className="font-bold text-slate-900">For leverandør: {company?.firmanavn || 'Rørleggerbedriften AS'}</div>
                <div className="text-slate-500 text-[11px]">Dato / Autorisert signatur</div>
              </div>
              <div>
                <div className="border-b border-slate-400 pb-8 mb-2"></div>
                <div className="font-bold text-slate-900">For oppdragsgiver / Byggherre</div>
                <div className="text-slate-500 text-[11px]">Aksept av tilbud / Dato og signatur</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
