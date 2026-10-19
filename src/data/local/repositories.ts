import type { Table } from 'dexie';
import { DEFAULT_PREFERENCES, type EntityBase, type Preferences } from '../../domain/types';
import { StorageError, toStorageError } from '../errors';
import type {
  EntityPatch,
  EntityRepository,
  KoloRepositories,
  NewEntity,
  PreferencesRepository,
} from '../repositories/types';
import { KoloDatabase, SCHEMA_VERSION } from './db';

export interface RepositoryEnvironment {
  now: () => Date;
  newId: () => string;
}

const defaultEnvironment: RepositoryEnvironment = {
  now: () => new Date(),
  newId: () => crypto.randomUUID(),
};

async function guard<R>(work: () => Promise<R>): Promise<R> {
  try {
    return await work();
  } catch (error) {
    throw toStorageError(error);
  }
}

function entityRepository<T extends EntityBase>(
  table: Table<T, string>,
  env: RepositoryEnvironment,
): EntityRepository<T> {
  return {
    getById: (id) => guard(() => table.get(id)),
    list: () => guard(() => table.toArray()),
    create: (data: NewEntity<T>) =>
      guard(async () => {
        const timestamp = env.now().toISOString();
        const entity = {
          ...data,
          id: env.newId(),
          createdAt: timestamp,
          updatedAt: timestamp,
        } as T;
        await table.add(entity);
        return entity;
      }),
    update: (id, patch: EntityPatch<T>) =>
      guard(async () => {
        const existing = await table.get(id);
        if (!existing) throw new StorageError('notFound');
        // L'identifiant et la date de création ne changent jamais.
        const updated = {
          ...existing,
          ...patch,
          id: existing.id,
          createdAt: existing.createdAt,
          updatedAt: env.now().toISOString(),
        } as T;
        await table.put(updated);
        return updated;
      }),
    remove: (id) => guard(() => table.delete(id)),
  };
}

function preferencesRepository(
  db: KoloDatabase,
  env: RepositoryEnvironment,
): PreferencesRepository {
  async function read(): Promise<Preferences> {
    const stored = await db.preferences.get('preferences');
    // Les champs ajoutés dans une version future reçoivent leur valeur par défaut.
    return { ...DEFAULT_PREFERENCES, ...stored, id: 'preferences' };
  }
  return {
    get: () => guard(read),
    update: (patch) =>
      guard(() =>
        db.transaction('rw', db.preferences, async () => {
          const updated: Preferences = {
            ...(await read()),
            ...patch,
            id: 'preferences',
            updatedAt: env.now().toISOString(),
          };
          await db.preferences.put(updated);
          return updated;
        }),
      ),
  };
}

/** Repositories adossés à IndexedDB (via Dexie). */
export function createLocalRepositories(
  db: KoloDatabase,
  env: RepositoryEnvironment = defaultEnvironment,
): KoloRepositories {
  return {
    accounts: entityRepository(db.accounts, env),
    categories: entityRepository(db.categories, env),
    transactions: entityRepository(db.transactions, env),
    budgets: entityRepository(db.budgets, env),
    debts: entityRepository(db.debts, env),
    debtRepayments: entityRepository(db.debtRepayments, env),
    plannedExpenses: entityRepository(db.plannedExpenses, env),
    goals: entityRepository(db.goals, env),
    preferences: preferencesRepository(db, env),
    runAtomic: (work) => guard(() => db.transaction('rw', db.tables, work)),
    schemaVersion: () => db.verno,
  };
}

/**
 * Ouvre la base ; échoue avec une StorageError lisible si le navigateur la refuse
 * ou si elle a été créée par une version plus récente de Kolo (données à ne pas abîmer).
 */
export async function openLocalDatabase(name?: string): Promise<KoloDatabase> {
  const db = new KoloDatabase(name);
  await guard(() => db.open());
  // Dexie multiplie le numéro de version par 10 dans IndexedDB.
  if (Math.floor(db.backendDB().version / 10) > SCHEMA_VERSION) {
    db.close();
    throw new StorageError('newerVersion');
  }
  return db;
}
