/**
 * VVS KEM PRO - Autentisering, Rollestyring & Multi-Tenant Bedriftsprofil
 * Støtter 'mester_admin' (full kommandosentral) og 'rorlegger_kunde' (strømlinjeformet Express-visning).
 * Lagrer tilstand i localStorage og er klargjort for Supabase/Firebase backend.
 */

export type UserRole = 'mester_admin' | 'rorlegger_kunde';

export interface CompanyProfile {
  id: string;
  firmanavn: string;
  orgNr: string;
  kontaktperson: string;
  epost: string;
  telefon?: string;
  adresse?: string;
  postnrSted?: string;
  timeprisUt: number; // standard f.eks. 1150 kr/t
  timeSelvkost: number; // standard f.eks. 550 kr/t
  ahlsellKundenummer?: string;
  logoBase64?: string; // Data URL e.g. "data:image/png;base64,..."
  opprettetDato: string;
  sistOppdatert: string;
}

export interface UserAccount {
  id: string;
  epost: string;
  passordHash: string; // Forenklet passordlagring for lokal prototype
  navn: string;
  rolle: UserRole;
  companyId: string;
  sistInnlogget?: string;
}

export interface AuthSession {
  user: UserAccount;
  company: CompanyProfile;
}

export interface RegistrerBedriftPayload {
  bedriftsnavn: string;
  orgNr: string;
  kontaktperson: string;
  epost: string;
  passord: string;
  telefon?: string;
  adresse?: string;
  postnrSted?: string;
  timeprisUt?: number;
  timeSelvkost?: number;
  ahlsellKundenummer?: string;
}

// LocalStorage-nøkler
export const AUTH_SESSION_KEY = 'vvs-kem-pro:auth:session';
export const AUTH_USERS_KEY = 'vvs-kem-pro:auth:users';
export const AUTH_COMPANIES_KEY = 'vvs-kem-pro:auth:companies';

// Standard demo-bedrifter og kontoer
export const DEMO_MESTER_COMPANY: CompanyProfile = {
  id: 'comp-mester-01',
  firmanavn: 'VVS KEM PRO Rådgivning & Mesterbedrift',
  orgNr: '987 654 321 MVA',
  kontaktperson: 'Kim Jørgensen (Rørleggermester & RIV)',
  epost: 'mester@vvskempro.no',
  telefon: '+47 900 12 345',
  adresse: 'Ingeniørveien 12',
  postnrSted: '0150 Oslo',
  timeprisUt: 1250,
  timeSelvkost: 550,
  ahlsellKundenummer: 'AHL-998877',
  opprettetDato: '2026-01-01T00:00:00.000Z',
  sistOppdatert: '2026-01-01T00:00:00.000Z',
};

export const DEMO_MESTER_USER: UserAccount = {
  id: 'user-mester-01',
  epost: 'mester@vvskempro.no',
  passordHash: 'mester2026',
  navn: 'Kim Jørgensen',
  rolle: 'mester_admin',
  companyId: 'comp-mester-01',
};

export const DEMO_RORLEGGER_COMPANY: CompanyProfile = {
  id: 'comp-rorlegger-01',
  firmanavn: 'Rørleggermester Hansen AS',
  orgNr: '912 345 678 MVA',
  kontaktperson: 'Ola Hansen',
  epost: 'post@rorlegger-hansen.no',
  telefon: '+47 912 34 567',
  adresse: 'Rørgata 18',
  postnrSted: '3015 Drammen',
  timeprisUt: 1150,
  timeSelvkost: 550,
  ahlsellKundenummer: 'AHL-445566',
  opprettetDato: '2026-01-01T00:00:00.000Z',
  sistOppdatert: '2026-01-01T00:00:00.000Z',
};

export const DEMO_RORLEGGER_USER: UserAccount = {
  id: 'user-rorlegger-01',
  epost: 'post@rorlegger-hansen.no',
  passordHash: 'rorlegger2026',
  navn: 'Ola Hansen',
  rolle: 'rorlegger_kunde',
  companyId: 'comp-rorlegger-01',
};

/**
 * Henter alle registrerte bedrifter fra localStorage, eller initialiserer med standard demodata
 */
export function hentSelskaper(): Record<string, CompanyProfile> {
  try {
    const raw = localStorage.getItem(AUTH_COMPANIES_KEY);
    if (!raw) {
      const init: Record<string, CompanyProfile> = {
        [DEMO_MESTER_COMPANY.id]: DEMO_MESTER_COMPANY,
        [DEMO_RORLEGGER_COMPANY.id]: DEMO_RORLEGGER_COMPANY,
      };
      localStorage.setItem(AUTH_COMPANIES_KEY, JSON.stringify(init));
      return init;
    }
    return JSON.parse(raw);
  } catch {
    return {
      [DEMO_MESTER_COMPANY.id]: DEMO_MESTER_COMPANY,
      [DEMO_RORLEGGER_COMPANY.id]: DEMO_RORLEGGER_COMPANY,
    };
  }
}

/**
 * Henter alle registrerte brukere fra localStorage, eller initialiserer med standard demodata
 */
export function hentBrukere(): UserAccount[] {
  try {
    const raw = localStorage.getItem(AUTH_USERS_KEY);
    if (!raw) {
      const init = [DEMO_MESTER_USER, DEMO_RORLEGGER_USER];
      localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(init));
      return init;
    }
    return JSON.parse(raw);
  } catch {
    return [DEMO_MESTER_USER, DEMO_RORLEGGER_USER];
  }
}

/**
 * Henter gjeldende aktive sesjon fra localStorage
 */
export function hentAktivSesjon(): AuthSession | null {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return null;
    const session: AuthSession = JSON.parse(raw);
    if (!session?.user?.id || !session?.company?.id) return null;

    // Synkroniser selskap med nyeste data fra selskapsbasen
    const selskaper = hentSelskaper();
    if (selskaper[session.company.id]) {
      session.company = selskaper[session.company.id];
    }
    return session;
  } catch {
    return null;
  }
}

/**
 * Lagrer eller sletter aktiv sesjon i localStorage
 */
export function lagreAktivSesjon(session: AuthSession | null): void {
  try {
    if (session) {
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(AUTH_SESSION_KEY);
    }
  } catch (err) {
    console.error('Feil under lagring av sesjon:', err);
  }
}

/**
 * Logger inn en eksisterende bruker med e-post og passord
 */
export function loggInn(
  epost: string,
  passord: string
): { success: boolean; session?: AuthSession; feil?: string } {
  const renEpost = epost.trim().toLowerCase();
  const renPassord = passord.trim();

  if (!renEpost || !renPassord) {
    return { success: false, feil: 'Oppgi både e-post og passord.' };
  }

  const brukere = hentBrukere();
  const bruker = brukere.find((u) => u.epost.toLowerCase() === renEpost);

  if (!bruker || bruker.passordHash !== renPassord) {
    return { success: false, feil: 'Ugyldig e-post eller passord.' };
  }

  const selskaper = hentSelskaper();
  const selskap = selskaper[bruker.companyId] ?? {
    id: bruker.companyId,
    firmanavn: 'Rørleggerbedrift',
    orgNr: '999 999 999 MVA',
    kontaktperson: bruker.navn,
    epost: bruker.epost,
    timeprisUt: 1150,
    timeSelvkost: 550,
    opprettetDato: new Date().toISOString(),
    sistOppdatert: new Date().toISOString(),
  };

  const oppdatertBruker: UserAccount = {
    ...bruker,
    sistInnlogget: new Date().toISOString(),
  };

  // Oppdater sist innlogget i brukerlisten
  const oppdaterteBrukere = brukere.map((u) => (u.id === bruker.id ? oppdatertBruker : u));
  try {
    localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(oppdaterteBrukere));
  } catch {
    // Ignorer
  }

  const session: AuthSession = {
    user: oppdatertBruker,
    company: selskap,
  };

  lagreAktivSesjon(session);
  return { success: true, session };
}

/**
 * Registrerer en ny rørleggerbedrift og oppretter tilhørende bruker og selskapsprofil
 */
export function registrerBedrift(
  payload: RegistrerBedriftPayload
): { success: boolean; session?: AuthSession; feil?: string } {
  const renEpost = payload.epost.trim().toLowerCase();
  const renPassord = payload.passord.trim();
  const renBedriftsnavn = payload.bedriftsnavn.trim();
  const renKontaktperson = payload.kontaktperson.trim();

  if (!renBedriftsnavn) return { success: false, feil: 'Oppgi bedriftsnavn.' };
  if (!renEpost) return { success: false, feil: 'Oppgi en gyldig e-postadresse.' };
  if (!renPassord || renPassord.length < 6) {
    return { success: false, feil: 'Passordet må ha minst 6 tegn.' };
  }

  const brukere = hentBrukere();
  if (brukere.some((u) => u.epost.toLowerCase() === renEpost)) {
    return { success: false, feil: 'Det finnes allerede en konto med denne e-postadressen.' };
  }

  const nowIso = new Date().toISOString();
  const companyId = `comp-${Date.now()}`;
  const userId = `user-${Date.now()}`;

  const nyttSelskap: CompanyProfile = {
    id: companyId,
    firmanavn: renBedriftsnavn,
    orgNr: payload.orgNr.trim() || 'Ikke oppgitt',
    kontaktperson: renKontaktperson || renBedriftsnavn,
    epost: renEpost,
    telefon: payload.telefon?.trim() || '',
    adresse: payload.adresse?.trim() || '',
    postnrSted: payload.postnrSted?.trim() || '',
    timeprisUt: Math.max(0, payload.timeprisUt ?? 1150),
    timeSelvkost: Math.max(0, payload.timeSelvkost ?? 550),
    ahlsellKundenummer: payload.ahlsellKundenummer?.trim() || '',
    opprettetDato: nowIso,
    sistOppdatert: nowIso,
  };

  const nyBruker: UserAccount = {
    id: userId,
    epost: renEpost,
    passordHash: renPassord,
    navn: renKontaktperson || renBedriftsnavn,
    rolle: 'rorlegger_kunde',
    companyId: companyId,
    sistInnlogget: nowIso,
  };

  // Lagre i selskaps- og brukerbase
  const selskaper = hentSelskaper();
  selskaper[companyId] = nyttSelskap;

  try {
    localStorage.setItem(AUTH_COMPANIES_KEY, JSON.stringify(selskaper));
    localStorage.setItem(AUTH_USERS_KEY, JSON.stringify([...brukere, nyBruker]));
  } catch (err) {
    console.error('Feil under lagring av ny bedrift:', err);
  }

  const session: AuthSession = {
    user: nyBruker,
    company: nyttSelskap,
  };

  lagreAktivSesjon(session);
  return { success: true, session };
}

/**
 * 1-klikks demo-innlogging for Mester/Admin eller Rørleggerbedrift (Kunde)
 */
export function loggInnDemo(type: 'mester' | 'rorlegger'): AuthSession {
  const session: AuthSession =
    type === 'mester'
      ? { user: DEMO_MESTER_USER, company: DEMO_MESTER_COMPANY }
      : { user: DEMO_RORLEGGER_USER, company: DEMO_RORLEGGER_COMPANY };

  lagreAktivSesjon(session);
  return session;
}

/**
 * Oppdaterer bedriftsprofilen og oppdaterer aktiv sesjon
 */
export function oppdaterBedriftsprofil(
  companyId: string,
  oppdatering: Partial<CompanyProfile>
): CompanyProfile {
  const selskaper = hentSelskaper();
  const eksisterende = selskaper[companyId] || {
    id: companyId,
    firmanavn: 'Bedrift',
    orgNr: '',
    kontaktperson: '',
    epost: '',
    timeprisUt: 1150,
    timeSelvkost: 550,
    opprettetDato: new Date().toISOString(),
    sistOppdatert: new Date().toISOString(),
  };

  const oppdatert: CompanyProfile = {
    ...eksisterende,
    ...oppdatering,
    sistOppdatert: new Date().toISOString(),
  };

  selskaper[companyId] = oppdatert;
  try {
    localStorage.setItem(AUTH_COMPANIES_KEY, JSON.stringify(selskaper));
  } catch (err) {
    console.error('Feil under lagring av selskapsprofil:', err);
  }

  // Hvis gjeldende sesjon tilhører dette selskapet, oppdater sesjonen også
  const aktiv = hentAktivSesjon();
  if (aktiv && aktiv.company.id === companyId) {
    lagreAktivSesjon({
      ...aktiv,
      company: oppdatert,
    });
  }

  return oppdatert;
}

/**
 * Logger ut gjeldende bruker
 */
export function loggUt(): void {
  lagreAktivSesjon(null);
}
