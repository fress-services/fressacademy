import type { Table } from 'dexie';
import { DEFAULT_PREFERENCES, type EntityBase, type Preferences } from '../../domain/types';
import { isStorageFailure, StorageError, toStorageError } from '../errors';
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

/** Prévient les abonnés après chaque écriture, ou à la fin de l'écriture atomique en cours. */
class ChangeNotifier {
  private listeners = new Set<() => void>();
  private atomicDepth = 0;
  private pending = false;

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  changed(): void {
    if (this.atomicDepth > 0) this.pending = true;
    else this.emit();
  }

  async atomic<R>(work: () => Promise<R>): Promise<R> {
    this.atomicDepth += 1;
    try {
      return await work();
    } finally {
      this.atomicDepth -= 1;
      if (this.atomicDepth === 0 && this.pending) {
        this.pending = false;
        this.emit();
      }
    }
  }

  private emit(): void {
    for (const listener of [...this.listeners]) listener();
  }
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
  notifier: ChangeNotifier,
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
        notifier.changed();
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
        notifier.changed();
        return updated;
      }),
    remove: (id) =>
      guard(async () => {
        await table.delete(id);
        notifier.changed();
      }),
  };
}

function preferencesRepository(
  db: KoloDatabase,
  env: RepositoryEnvironment,
  notifier: ChangeNotifier,
): PreferencesRepository {
  async function read(): Promise<Preferences> {
    const stored = await db.preferences.get('preferences');
    // Les champs ajoutés dans une version future reçoivent leur valeur par défaut.
    return { ...DEFAULT_PREFERENCES, ...stored, id: 'preferences' };
  }
  return {
    get: () => guard(read),
    update: (patch) =>
      guard(async () => {
        const updated = await db.transaction('rw', db.preferences, async () => {
          const merged: Preferences = {
            ...(await read()),
            ...patch,
            id: 'preferences',
            updatedAt: env.now().toISOString(),
          };
          await db.preferences.put(merged);
          return merged;
        });
        notifier.changed();
        return updated;
      }),
  };
}

/** Repositories adossés à IndexedDB (via Dexie). */
export function createLocalRepositories(
  db: KoloDatabase,
  env: RepositoryEnvironment = defaultEnvironment,
): KoloRepositories {
  const notifier = new ChangeNotifier();
  return {
    accounts: entityRepository(db.accounts, env, notifier),
    categories: entityRepository(db.categories, env, notifier),
    transactions: entityRepository(db.transactions, env, notifier),
    budgets: entityRepository(db.budgets, env, notifier),
    debts: entityRepository(db.debts, env, notifier),
    debtRepayments: entityRepository(db.debtRepayments, env, notifier),
    plannedExpenses: entityRepository(db.plannedExpenses, env, notifier),
    goals: entityRepository(db.goals, env, notifier),
    preferences: preferencesRepository(db, env, notifier),
    runAtomic: (work) =>
      notifier.atomic(async () => {
        try {
          return await db.transaction('rw', db.tables, work);
        } catch (error) {
          // Une règle métier refusée (ValidationError…) remonte telle quelle ; tout est annulé.
          throw isStorageFailure(error) ? toStorageError(error) : error;
        }
      }),
    schemaVersion: () => db.verno,
    subscribe: (listener) => notifier.subscribe(listener),
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
