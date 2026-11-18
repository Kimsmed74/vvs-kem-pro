import { describe, it, expect, beforeEach } from 'vitest';
import {
  DEMO_MESTER_COMPANY,
  DEMO_MESTER_USER,
  DEMO_RORLEGGER_COMPANY,
  DEMO_RORLEGGER_USER,
  hentSelskaper,
  hentBrukere,
  hentAktivSesjon,
  loggInn,
  loggInnDemo,
  registrerBedrift,
  oppdaterBedriftsprofil,
  loggUt,
  type RegistrerBedriftPayload,
} from './auth';

// Mock localStorage for vitest Node.js-miljø
const mockStore = new Map<string, string>();
const fakeStorage = {
  getItem: (k: string) => mockStore.get(k) ?? null,
  setItem: (k: string, v: string) => { mockStore.set(k, String(v)); },
  removeItem: (k: string) => { mockStore.delete(k); },
  clear: () => { mockStore.clear(); },
  get length() { return mockStore.size; },
  key: (i: number) => Array.from(mockStore.keys())[i] ?? null,
};
Object.defineProperty(globalThis, 'localStorage', {
  value: fakeStorage,
  writable: true,
});

describe('Auth & Multi-Tenant SaaS - Rollestyring og Bedriftsprofil', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Standard initialisering og Demodata', () => {
    it('initialiserer standardbedrifter og brukere i localStorage dersom tomt', () => {
      const selskaper = hentSelskaper();
      expect(selskaper[DEMO_MESTER_COMPANY.id]).toBeDefined();
      expect(selskaper[DEMO_RORLEGGER_COMPANY.id]).toBeDefined();
      expect(selskaper[DEMO_MESTER_COMPANY.id].firmanavn).toBe(DEMO_MESTER_COMPANY.firmanavn);

      const brukere = hentBrukere();
      const mester = brukere.find((u) => u.id === DEMO_MESTER_USER.id);
      const rorlegger = brukere.find((u) => u.id === DEMO_RORLEGGER_USER.id);
      expect(mester).toBeDefined();
      expect(rorlegger).toBeDefined();
      expect(mester?.rolle).toBe('mester_admin');
      expect(rorlegger?.rolle).toBe('rorlegger_kunde');
    });

    it('1-klikks Demo Mester & Ingeniør logger inn med rollen mester_admin', () => {
      const sesjon = loggInnDemo('mester');
      expect(sesjon.user.rolle).toBe('mester_admin');
      expect(sesjon.user.navn).toContain('Kim Jørgensen');
      expect(sesjon.company.firmanavn).toContain('VVS KEM PRO');
      expect(sesjon.company.timeprisUt).toBe(1250);
      expect(sesjon.company.timeSelvkost).toBe(550);

      // Verifiser aktiv sesjon
      const aktiv = hentAktivSesjon();
      expect(aktiv).not.toBeNull();
      expect(aktiv?.user.rolle).toBe('mester_admin');
    });

    it('1-klikks Demo Rørleggerbedrift logger inn med rollen rorlegger_kunde', () => {
      const sesjon = loggInnDemo('rorlegger');
      expect(sesjon.user.rolle).toBe('rorlegger_kunde');
      expect(sesjon.user.navn).toBe('Ola Hansen');
      expect(sesjon.company.firmanavn).toBe('Rørleggermester Hansen AS');
      expect(sesjon.company.timeprisUt).toBe(1150);
      expect(sesjon.company.timeSelvkost).toBe(550);

      // Verifiser aktiv sesjon
      const aktiv = hentAktivSesjon();
      expect(aktiv).not.toBeNull();
      expect(aktiv?.user.rolle).toBe('rorlegger_kunde');
    });
  });

  describe('Innlogging med e-post og passord', () => {
    it('logger inn gyldig bruker og oppdaterer sistInnlogget', () => {
      const res = loggInn('mester@vvskempro.no', 'mester2026');
      expect(res.success).toBe(true);
      expect(res.session).toBeDefined();
      expect(res.session?.user.epost).toBe('mester@vvskempro.no');
      expect(res.session?.user.sistInnlogget).toBeDefined();

      const lagretSesjon = hentAktivSesjon();
      expect(lagretSesjon?.user.id).toBe(res.session?.user.id);
    });

    it('avviser feil passord med informativ feilmelding', () => {
      const res = loggInn('mester@vvskempro.no', 'feilpassord');
      expect(res.success).toBe(false);
      expect(res.feil).toContain('Ugyldig e-post eller passord');
    });

    it('avviser ikke-eksisterende e-postadresse', () => {
      const res = loggInn('ukjent@bedrift.no', 'passord123');
      expect(res.success).toBe(false);
      expect(res.feil).toContain('Ugyldig e-post eller passord');
    });
  });

  describe('Registrering av ny rørleggerbedrift (SaaS Onboarding)', () => {
    it('oppretter ny bedrift og bruker med standardverdier og logger automatisk inn', () => {
      const payload: RegistrerBedriftPayload = {
        bedriftsnavn: 'Fjord VVS AS',
        orgNr: '998 877 665 MVA',
        kontaktperson: 'Per Fjord',
        epost: 'post@fjordvvs.no',
        passord: 'hemmelig123',
        telefon: '98765432',
        adresse: 'Kystveien 10',
        postnrSted: '5003 Bergen',
        timeprisUt: 1200,
        timeSelvkost: 580,
        ahlsellKundenummer: 'AHL-123456',
      };

      const res = registrerBedrift(payload);
      expect(res.success).toBe(true);
      expect(res.session).toBeDefined();

      const sesjon = res.session!;
      expect(sesjon.user.rolle).toBe('rorlegger_kunde');
      expect(sesjon.user.epost).toBe('post@fjordvvs.no');
      expect(sesjon.user.navn).toBe('Per Fjord');
      expect(sesjon.company.firmanavn).toBe('Fjord VVS AS');
      expect(sesjon.company.timeprisUt).toBe(1200);
      expect(sesjon.company.timeSelvkost).toBe(580);
      expect(sesjon.company.ahlsellKundenummer).toBe('AHL-123456');

      // Verifiser at bedriften og brukeren er lagret i storage
      const selskaper = hentSelskaper();
      expect(selskaper[sesjon.company.id]).toBeDefined();
      expect(selskaper[sesjon.company.id].firmanavn).toBe('Fjord VVS AS');

      const aktiv = hentAktivSesjon();
      expect(aktiv?.company.id).toBe(sesjon.company.id);
    });

    it('feiler dersom obligatoriske felter mangler', () => {
      const res = registrerBedrift({
        bedriftsnavn: '',
        orgNr: '998 877 665',
        kontaktperson: 'Per Fjord',
        epost: 'post@fjordvvs.no',
        passord: '1234',
      });
      expect(res.success).toBe(false);
      expect(res.feil).toContain('Oppgi bedriftsnavn');
    });

    it('hindrer registrering med allerede eksisterende e-postadresse', () => {
      const res = registrerBedrift({
        bedriftsnavn: 'Ny Kopi AS',
        orgNr: '999 888 777',
        kontaktperson: 'Kari',
        epost: 'mester@vvskempro.no', // Allerede i bruk
        passord: 'passord123',
      });
      expect(res.success).toBe(false);
      expect(res.feil).toContain('Det finnes allerede en konto');
    });
  });

  describe('Oppdatering av Bedriftsprofil og Firmalogo', () => {
    it('oppdaterer timepriser, kontaktinfo og Base64-logo i både database og aktiv sesjon', () => {
      // Logg først inn som rørlegger
      const sesjon = loggInnDemo('rorlegger');
      expect(sesjon.company.timeprisUt).toBe(1150);

      const fakeLogoBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA...';

      const oppdatert = oppdaterBedriftsprofil(sesjon.company.id, {
        firmanavn: 'Hansen VVS & Varme AS',
        timeprisUt: 1290,
        timeSelvkost: 600,
        logoBase64: fakeLogoBase64,
      });

      expect(oppdatert.firmanavn).toBe('Hansen VVS & Varme AS');
      expect(oppdatert.timeprisUt).toBe(1290);
      expect(oppdatert.timeSelvkost).toBe(600);
      expect(oppdatert.logoBase64).toBe(fakeLogoBase64);

      // Verifiser at aktiv sesjon ble oppdatert
      const aktivSesjon = hentAktivSesjon();
      expect(aktivSesjon?.company.firmanavn).toBe('Hansen VVS & Varme AS');
      expect(aktivSesjon?.company.timeprisUt).toBe(1290);
      expect(aktivSesjon?.company.logoBase64).toBe(fakeLogoBase64);

      // Verifiser at selskapet i selskapsregisteret ble oppdatert
      const selskaper = hentSelskaper();
      expect(selskaper[sesjon.company.id].firmanavn).toBe('Hansen VVS & Varme AS');
      expect(selskaper[sesjon.company.id].logoBase64).toBe(fakeLogoBase64);
    });
  });

  describe('Utlogging og Sesjonshåndtering', () => {
    it('logger ut og sletter aktiv sesjon', () => {
      loggInnDemo('mester');
      expect(hentAktivSesjon()).not.toBeNull();

      loggUt();
      expect(hentAktivSesjon()).toBeNull();
    });
  });
});
