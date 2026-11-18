import React, { useState, useRef } from 'react';
import {
  X,
  Building,
  User,
  Mail,
  Phone,
  MapPin,
  Coins,
  FileSpreadsheet,
  Upload,
  Trash2,
  CheckCircle,
  Image as ImageIcon,
} from 'lucide-react';
import {
  oppdaterBedriftsprofil,
  type CompanyProfile,
} from './lib/auth';

interface CompanyProfileModalProps {
  company: CompanyProfile;
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdated: (updatedCompany: CompanyProfile) => void;
  melding: (tekst: string) => void;
}

export default function CompanyProfileModal({
  company,
  isOpen,
  onClose,
  onProfileUpdated,
  melding,
}: CompanyProfileModalProps) {
  const [formData, setFormData] = useState<CompanyProfile>({ ...company });
  const [logoPreview, setLogoPreview] = useState<string | undefined>(company.logoBase64);
  const [lagrer, setLagrer] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      melding('⚠️ Vennligst velg en bildefil (PNG, JPG, SVG eller WebP).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      melding('⚠️ Logofilen er for stor (maks 2 MB).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setLogoPreview(base64);
      setFormData((prev) => ({ ...prev, logoBase64: base64 }));
      melding('🖼️ Logo lastet opp! Klikk «Lagre bedriftsprofil» for å bekrefte.');
    };
    reader.readAsDataURL(file);
  };

  const fjernLogo = () => {
    setLogoPreview(undefined);
    setFormData((prev) => ({ ...prev, logoBase64: undefined }));
    if (fileInputRef.current) fileInputRef.current.value = '';
    melding('🗑️ Logo fjernet. Husk å lagre endringene.');
  };

  const handleLagre = (e: React.FormEvent) => {
    e.preventDefault();
    setLagrer(true);

    const oppdatert = oppdaterBedriftsprofil(company.id, {
      firmanavn: formData.firmanavn.trim() || 'Bedrift',
      orgNr: formData.orgNr.trim(),
      kontaktperson: formData.kontaktperson.trim(),
      epost: formData.epost.trim(),
      telefon: formData.telefon?.trim() || '',
      adresse: formData.adresse?.trim() || '',
      postnrSted: formData.postnrSted?.trim() || '',
      timeprisUt: Math.max(0, formData.timeprisUt || 1150),
      timeSelvkost: Math.max(0, formData.timeSelvkost || 550),
      ahlsellKundenummer: formData.ahlsellKundenummer?.trim() || '',
      logoBase64: logoPreview,
    });

    setLagrer(false);
    onProfileUpdated(oppdatert);
    melding('✅ Bedriftsprofil, logo og standardpriser ble lagret!');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-900/95 px-6 py-4 backdrop-blur">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Building className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Bedriftsprofil &amp; Standardpriser</h3>
              <p className="text-xs text-slate-400">
                Dataene benyttes automatisk i tilbudsbrev, A4-PDF og timekalkulatorer
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Skjema */}
        <form onSubmit={handleLagre} className="p-6 space-y-6">
          {/* Logo-seksjon */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-blue-400" /> Firmalogo (Tilbudsbrev &amp; PDF-topptekst)
            </label>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex h-24 w-40 items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-900 p-2 overflow-hidden shrink-0">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Firmalogo forhåndsvisning"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <div className="text-center text-slate-500 text-xs">
                    <Building className="h-8 w-8 mx-auto opacity-30 mb-1" />
                    <span>Ingen logo</span>
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2 text-center sm:text-left">
                <p className="text-xs text-slate-300">
                  Last opp firmalogo for profesjonell branding på alle utskrifter og tilbud.
                </p>
                <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleLogoUpload}
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 transition"
                  >
                    <Upload className="h-3.5 w-3.5 text-blue-400" />
                    {logoPreview ? 'Bytt logo' : 'Last opp logo'}
                  </button>

                  {logoPreview && (
                    <button
                      type="button"
                      onClick={fjernLogo}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-900/60 bg-rose-950/40 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-900/60 transition"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-rose-400" /> Fjern
                    </button>
                  )}
                </div>
                <span className="text-[10px] text-slate-500 block">PNG, JPG eller SVG (maks 2 MB).</span>
              </div>
            </div>
          </div>

          {/* Firmanavn og Organisasjon */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5 text-slate-400" /> Offisielt Firmanavn
              </label>
              <input
                type="text"
                required
                value={formData.firmanavn}
                onChange={(e) => setFormData({ ...formData, firmanavn: e.target.value })}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Organisasjonsnummer</label>
              <input
                type="text"
                value={formData.orgNr}
                onChange={(e) => setFormData({ ...formData, orgNr: e.target.value })}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-slate-400" /> Daglig leder / Kontaktperson
              </label>
              <input
                type="text"
                value={formData.kontaktperson}
                onChange={(e) => setFormData({ ...formData, kontaktperson: e.target.value })}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-slate-400" /> Offisiell E-postadresse
              </label>
              <input
                type="email"
                value={formData.epost}
                onChange={(e) => setFormData({ ...formData, epost: e.target.value })}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-slate-400" /> Telefonnummer
              </label>
              <input
                type="tel"
                value={formData.telefon || ''}
                onChange={(e) => setFormData({ ...formData, telefon: e.target.value })}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-slate-400" /> Besøksadresse
              </label>
              <input
                type="text"
                placeholder="Gateadresse 1"
                value={formData.adresse || ''}
                onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Postnr &amp; Sted</label>
              <input
                type="text"
                placeholder="f.eks. 0150 Oslo"
                value={formData.postnrSted || ''}
                onChange={(e) => setFormData({ ...formData, postnrSted: e.target.value })}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              />
            </div>
          </div>

          {/* Standard timepriser & Grossistavtaler */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Coins className="h-4 w-4 text-amber-400" /> Standard Timepriser &amp; Grossistavtale
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Standard Timepris Ut (kr/t)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.timeprisUt}
                  onChange={(e) =>
                    setFormData({ ...formData, timeprisUt: parseInt(e.target.value, 10) || 1150 })
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm font-bold text-amber-400"
                />
                <span className="text-[10px] text-slate-500 block mt-0.5">Utsalgspris til sluttkunde</span>
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">Selvkost per Time (kr/t)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.timeSelvkost}
                  onChange={(e) =>
                    setFormData({ ...formData, timeSelvkost: parseInt(e.target.value, 10) || 550 })
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm font-bold text-slate-300"
                />
                <span className="text-[10px] text-slate-500 block mt-0.5">Lønn, sosiale kostnader &amp; bil</span>
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1 flex items-center gap-1">
                  <FileSpreadsheet className="h-3.5 w-3.5 text-blue-400" /> Ahlsell Kundenr.
                </label>
                <input
                  type="text"
                  placeholder="f.eks. AHL-998877"
                  value={formData.ahlsellKundenummer || ''}
                  onChange={(e) => setFormData({ ...formData, ahlsellKundenummer: e.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm font-mono text-white"
                />
                <span className="text-[10px] text-slate-500 block mt-0.5">For M3 Hurtigordre</span>
              </div>
            </div>
          </div>

          {/* Knapper */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
            >
              Avbryt
            </button>
            <button
              type="submit"
              disabled={lagrer}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-lg hover:bg-blue-500 transition disabled:opacity-50"
            >
              <CheckCircle className="h-4 w-4" />
              {lagrer ? 'Lagrer…' : 'Lagre bedriftsprofil'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
