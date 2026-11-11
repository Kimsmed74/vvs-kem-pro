import type { ProsjektData } from '../data/prosjekter';
import type { ProsjektFil } from './filer';
import {
  normaliserProsjekt,
  tomProsjektTilstand,
  type AppTilstand,
  type ProsjektTilstand,
} from './lagring';

const DB_NAVN = 'vvs-kem-pro-idb';
const DB_VERSJON = 1;
const STORE_FILER = 'filer';
const STORE_TILSTAND = 'app_tilstand';
const TILSTAND_KEY = 'hoved';

// In-memory fallback for testmiljø uten window.indexedDB
const minneFiler = new Map<string, ProsjektFil>();
let minneTilstand: AppTilstand | null = null;

function harIndexedDB(): boolean {
  return typeof indexedDB !== 'undefined' && indexedDB !== null;
}

function apneDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAVN, DB_VERSJON);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_FILER)) {
        const filStore = db.createObjectStore(STORE_FILER, { keyPath: 'id' });
        filStore.createIndex('prosjektId', 'prosjektId', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_TILSTAND)) {
        db.createObjectStore(STORE_TILSTAND);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Kunne ikke åpne IndexedDB'));
  });
}

/** Lagrer hele AppTilstand permanent i IndexedDB. */
export async function lagreTilstandIDB(tilstand: AppTilstand): Promise<void> {
  minneTilstand = tilstand;
  if (!harIndexedDB()) return;
  try {
    const db = await apneDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_TILSTAND, 'readwrite');
      tx.objectStore(STORE_TILSTAND).put(tilstand, TILSTAND_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Fallback til minne/localStorage håndteres av kaller
  }
}

/** Henter lagret AppTilstand fra IndexedDB (returnerer null hvis ingen finnes ennå). */
export async function hentTilstandIDB(): Promise<AppTilstand | null> {
  if (!harIndexedDB()) return minneTilstand;
  try {
    const db = await apneDatabase();
    const res = await new Promise<AppTilstand | null>((resolve, reject) => {
      const tx = db.transaction(STORE_TILSTAND, 'readonly');
      const req = tx.objectStore(STORE_TILSTAND).get(TILSTAND_KEY);
      req.onsuccess = () => resolve((req.result as AppTilstand | undefined) ?? null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return res;
  } catch {
    return minneTilstand;
  }
}

/** Lagrer én eller flere prosjektfiler (tegninger, bilder, PDF, Excel) i IndexedDB. */
export async function lagreFilerIDB(filer: readonly ProsjektFil[]): Promise<void> {
  for (const f of filer) {
    minneFiler.set(f.id, f);
  }
  if (!harIndexedDB() || filer.length === 0) return;
  try {
    const db = await apneDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_FILER, 'readwrite');
      const store = tx.objectStore(STORE_FILER);
      for (const f of filer) {
        store.put(f);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Beholdes i minneFiler ved feil
  }
}

/** Henter alle opplastede filer/tegninger/bilder tilhørende et gitt prosjekt. */
export async function hentFilerForProsjektIDB(prosjektId: string): Promise<ProsjektFil[]> {
  if (!harIndexedDB()) {
    return [...minneFiler.values()].filter((f) => f.prosjektId === prosjektId);
  }
  try {
    const db = await apneDatabase();
    const filer = await new Promise<ProsjektFil[]>((resolve, reject) => {
      const tx = db.transaction(STORE_FILER, 'readonly');
      const index = tx.objectStore(STORE_FILER).index('prosjektId');
      const req = index.getAll(prosjektId);
      req.onsuccess = () => resolve((req.result as ProsjektFil[]) ?? []);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return filer.sort((a, b) => b.opprettetDato.localeCompare(a.opprettetDato));
  } catch {
    return [...minneFiler.values()].filter((f) => f.prosjektId === prosjektId);
  }
}

/** Henter absolutt alle lagrede prosjektfiler på tvers av prosjekter. */
export async function hentAlleFilerIDB(): Promise<ProsjektFil[]> {
  if (!harIndexedDB()) {
    return [...minneFiler.values()];
  }
  try {
    const db = await apneDatabase();
    const filer = await new Promise<ProsjektFil[]>((resolve, reject) => {
      const tx = db.transaction(STORE_FILER, 'readonly');
      const req = tx.objectStore(STORE_FILER).getAll();
      req.onsuccess = () => resolve((req.result as ProsjektFil[]) ?? []);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return filer;
  } catch {
    return [...minneFiler.values()];
  }
}

/** Sletter én enkelt fil fra IndexedDB. */
export async function slettFilIDB(filId: string): Promise<void> {
  minneFiler.delete(filId);
  if (!harIndexedDB()) return;
  try {
    const db = await apneDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_FILER, 'readwrite');
      tx.objectStore(STORE_FILER).delete(filId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Ignorer
  }
}

/** Sletter alle filer tilknyttet et prosjekt når prosjektet slettes. */
export async function slettFilerForProsjektIDB(prosjektId: string): Promise<void> {
  const eksisterende = await hentFilerForProsjektIDB(prosjektId);
  for (const f of eksisterende) {
    await slettFilIDB(f.id);
  }
}

export interface ProsjektBackupPakke {
  format: 'vvs-kem-pro-backup-v1';
  eksportertDato: string;
  prosjekter: ProsjektData[];
  tilstand: Record<string, ProsjektTilstand>;
  filer: ProsjektFil[];
  aktivId?: string;
  krav?: number;
}

/**
 * Lager en komplett JSON-streng for backup/eksport av enten ett enkelt prosjekt
 * (inkl. kalkulatortall, sjekklister, chathistorikk og opplastede tegninger/bilder/PDF-er)
 * eller alle prosjekter.
 */
export function lagProsjektBackupJson(opts: {
  prosjekter: ProsjektData[];
  tilstand: Record<string, ProsjektTilstand>;
  filer: ProsjektFil[];
  aktivId?: string;
  krav?: number;
}): string {
  const pakke: ProsjektBackupPakke = {
    format: 'vvs-kem-pro-backup-v1',
    eksportertDato: new Date().toISOString(),
    prosjekter: opts.prosjekter.map((p) => ({ ...p, kilde: 'bruker' })),
    tilstand: opts.tilstand,
    filer: opts.filer,
    aktivId: opts.aktivId,
    krav: opts.krav,
  };
  return JSON.stringify(pakke, null, 2);
}

/**
 * Leser og validerer en importert JSON-fil (enten en komplett ProsjektBackupPakke
 * eller et enkelt ProsjektData-objekt).
 */
export function lesProsjektBackupJson(jsonTekst: string): {
  prosjekter: ProsjektData[];
  tilstand: Record<string, ProsjektTilstand>;
  filer: ProsjektFil[];
  aktivId?: string;
  krav?: number;
} {
  let rå: unknown;
  try {
    rå = JSON.parse(jsonTekst);
  } catch {
    throw new Error('Filen er ikke gyldig JSON.');
  }
  if (typeof rå !== 'object' || rå === null) {
    throw new Error('Ugyldig backup-format.');
  }

  const obj = rå as Partial<ProsjektBackupPakke> & Partial<ProsjektData>;

  // Tilfelle 1: Komplett backup-pakke
  if (Array.isArray(obj.prosjekter)) {
    const prosjekter = obj.prosjekter
      .map(normaliserProsjekt)
      .filter((p): p is ProsjektData => p !== null);
    if (prosjekter.length === 0) {
      throw new Error('Fant ingen gyldige prosjekter i backup-filen.');
    }
    const tilstand: Record<string, ProsjektTilstand> = {};
    for (const [id, v] of Object.entries(obj.tilstand ?? {})) {
      tilstand[id] = { ...tomProsjektTilstand(), ...(v as Partial<ProsjektTilstand>) };
    }
    const filer: ProsjektFil[] = Array.isArray(obj.filer)
      ? obj.filer.filter(
          (f): f is ProsjektFil =>
            typeof f === 'object' &&
            f !== null &&
            typeof f.id === 'string' &&
            typeof f.prosjektId === 'string' &&
            typeof f.navn === 'string'
        )
      : [];
    return {
      prosjekter,
      tilstand,
      filer,
      aktivId: obj.aktivId ?? prosjekter[0].id,
      krav: obj.krav,
    };
  }

  // Tilfelle 2: Enkelt prosjekt-JSON
  const enkelt = normaliserProsjekt(obj);
  if (!enkelt) {
    throw new Error('JSON-filen mangler påkrevde prosjektfelt (id og navn).');
  }
  return {
    prosjekter: [enkelt],
    tilstand: {},
    filer: [],
    aktivId: enkelt.id,
  };
}
