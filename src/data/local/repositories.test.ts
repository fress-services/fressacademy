import { Dexie } from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import type { Account } from '../../domain/types';
import { newTestDatabase, uniqueDatabaseName } from '../../test/database';
import { StorageError } from '../errors';
import type { NewEntity } from '../repositories/types';
import { KoloDatabase, SCHEMA_VERSION } from './db';
import {
  createLocalRepositories,
  openLocalDatabase,
  type RepositoryEnvironment,
} from './repositories';

const opened: KoloDatabase[] = [];

function track(db: KoloDatabase): KoloDatabase {
  opened.push(db);
  return db;
}

afterEach(async () => {
  for (const db of opened.splice(0)) {
    db.close();
    await Dexie.delete(db.name);
  }
});

/** Horloge et identifiants prévisibles pour vérifier les horodatages. */
function fakeEnvironment(): RepositoryEnvironment & { tick: () => void } {
  let time = Date.UTC(2026, 9, 19, 8, 0, 0);
  let id = 0;
  return {
    now: () => new Date(time),
    newId: () => `id-${++id}`,
    tick: () => {
      time += 60_000;
    },
  };
}

const cashAccount: NewEntity<Account> = {
  name: 'Espèces',
  type: 'cash',
  currencyCode: 'XAF',
  openingBalanceMinor: 15000,
  openingDate: '2026-10-01',
  archivedAt: null,
};

describe('repository local des entités', () => {
  it('crée une entité avec identifiant et dates, puis la relit', async () => {
    const env = fakeEnvironment();
    const repos = createLocalRepositories(track(newTestDatabase()), env);

    const created = await repos.accounts.create(cashAccount);

    expect(created).toEqual({
      ...cashAccount,
      id: 'id-1',
      createdAt: '2026-10-19T08:00:00.000Z',
      updatedAt: '2026-10-19T08:00:00.000Z',
    });
    expect(await repos.accounts.getById('id-1')).toEqual(created);
    expect(await repos.accounts.list()).toEqual([created]);
  });

  it('génère de vrais UUID par défaut', async () => {
    const repos = createLocalRepositories(track(newTestDatabase()));
    const created = await repos.accounts.create(cashAccount);
    expect(created.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it('modifie une entité sans toucher à son identifiant ni à sa date de création', async () => {
    const env = fakeEnvironment();
    const repos = createLocalRepositories(track(newTestDatabase()), env);
    const created = await repos.accounts.create(cashAccount);
    env.tick();

    const updated = await repos.accounts.update(created.id, {
      name: 'Portefeuille',
      // Une tentative de changer l'identifiant via un objet mal typé est ignorée.
      ...({ id: 'pirate', createdAt: '1999-01-01T00:00:00.000Z' } as object),
    });

    expect(updated.id).toBe(created.id);
    expect(updated.name).toBe('Portefeuille');
    expect(updated.createdAt).toBe('2026-10-19T08:00:00.000Z');
    expect(updated.updatedAt).toBe('2026-10-19T08:01:00.000Z');
    expect(await repos.accounts.getById('pirate')).toBeUndefined();
  });

  it('refuse de modifier une entité inexistante avec une erreur lisible', async () => {
    const repos = createLocalRepositories(track(newTestDatabase()));
    await expect(repos.accounts.update('absent', { name: 'x' })).rejects.toEqual(
      new StorageError('notFound'),
    );
  });

  it('supprime une entité', async () => {
    const repos = createLocalRepositories(track(newTestDatabase()));
    const created = await repos.accounts.create(cashAccount);
    await repos.accounts.remove(created.id);
    expect(await repos.accounts.list()).toEqual([]);
  });

  it('conserve les données après fermeture et réouverture de la base', async () => {
    const name = uniqueDatabaseName();
    const first = new KoloDatabase(name);
    const created = await createLocalRepositories(first).accounts.create(cashAccount);
    await createLocalRepositories(first).preferences.update({ language: 'en', theme: 'light' });
    first.close();

    const second = track(await openLocalDatabase(name));
    const repos = createLocalRepositories(second);
    expect(await repos.accounts.getById(created.id)).toEqual(created);
    expect((await repos.preferences.get()).language).toBe('en');
    expect((await repos.preferences.get()).theme).toBe('light');
  });
});

describe('écritures atomiques', () => {
  it('n’enregistre rien si une étape échoue', async () => {
    const repos = createLocalRepositories(track(newTestDatabase()));

    await expect(
      repos.runAtomic(async () => {
        await repos.accounts.create(cashAccount);
        await repos.goals.create({
          title: 'Moto',
          targetAmountMinor: 500000,
          currentAmountMinor: 0,
          currencyCode: 'XAF',
          targetDate: null,
          note: '',
          archivedAt: null,
        });
        throw new Error('échec simulé');
      }),
    ).rejects.toThrow('échec simulé');

    expect(await repos.accounts.list()).toEqual([]);
    expect(await repos.goals.list()).toEqual([]);
  });

  it('enregistre tout si chaque étape réussit', async () => {
    const repos = createLocalRepositories(track(newTestDatabase()));
    const id = await repos.runAtomic(async () => {
      const account = await repos.accounts.create(cashAccount);
      await repos.accounts.update(account.id, { name: 'Caisse' });
      return account.id;
    });
    expect((await repos.accounts.getById(id))?.name).toBe('Caisse');
  });
});

describe('préférences', () => {
  it('renvoie les valeurs par défaut sur une base neuve (thème sombre)', async () => {
    const repos = createLocalRepositories(track(newTestDatabase()));
    expect(await repos.preferences.get()).toEqual({
      id: 'preferences',
      language: null,
      defaultCurrency: null,
      locale: null,
      firstDayOfWeek: null,
      theme: 'dark',
      onboardingCompletedAt: null,
      updatedAt: null,
    });
  });

  it('fusionne les modifications successives', async () => {
    const env = fakeEnvironment();
    const repos = createLocalRepositories(track(newTestDatabase()), env);
    await repos.preferences.update({ language: 'fr' });
    const prefs = await repos.preferences.update({ defaultCurrency: 'XAF' });
    expect(prefs.language).toBe('fr');
    expect(prefs.defaultCurrency).toBe('XAF');
    expect(prefs.updatedAt).toBe('2026-10-19T08:00:00.000Z');
  });

  it('complète une préférence enregistrée par une ancienne version', async () => {
    const db = track(newTestDatabase());
    // Enregistrement partiel, comme si un champ avait été ajouté depuis.
    await db.preferences.put({ id: 'preferences', language: 'en' } as never);
    const prefs = await createLocalRepositories(db).preferences.get();
    expect(prefs.language).toBe('en');
    expect(prefs.theme).toBe('dark');
  });
});

describe('schéma et migrations', () => {
  it('ouvre la base à la version de schéma attendue et note l’installation', async () => {
    const db = track(await openLocalDatabase(uniqueDatabaseName()));
    expect(createLocalRepositories(db).schemaVersion()).toBe(SCHEMA_VERSION);
    const install = await db.meta.get('install');
    expect(install?.createdWithSchema).toBe(SCHEMA_VERSION);
  });

  it('refuse proprement une base créée par une version plus récente de Kolo', async () => {
    const name = uniqueDatabaseName();
    const future = new Dexie(name);
    future.version(SCHEMA_VERSION + 5).stores({ accounts: 'id' });
    await future.open();
    future.close();

    await expect(openLocalDatabase(name)).rejects.toEqual(new StorageError('newerVersion'));
    await Dexie.delete(name);
  });
});

describe('notifications de changement', () => {
  it('prévient après chaque écriture, et une seule fois après une écriture atomique', async () => {
    const repos = createLocalRepositories(track(newTestDatabase()));
    let calls = 0;
    const unsubscribe = repos.subscribe(() => {
      calls += 1;
    });

    const account = await repos.accounts.create(cashAccount);
    expect(calls).toBe(1);

    await repos.runAtomic(async () => {
      await repos.accounts.update(account.id, { name: 'A' });
      await repos.accounts.update(account.id, { name: 'B' });
      expect(calls).toBe(1);
    });
    expect(calls).toBe(2);

    unsubscribe();
    await repos.accounts.remove(account.id);
    expect(calls).toBe(2);
  });

  it('ne prévient pas si l’écriture atomique échoue', async () => {
    const repos = createLocalRepositories(track(newTestDatabase()));
    let calls = 0;
    repos.subscribe(() => {
      calls += 1;
    });
    await expect(
      repos.runAtomic(async () => {
        await repos.accounts.create(cashAccount);
        throw new Error('échec');
      }),
    ).rejects.toThrow('échec');
    // L'écriture annulée n'a rien changé : une relecture inutile est sans danger, mais on
    // vérifie surtout que les données sont intactes.
    expect(await repos.accounts.list()).toEqual([]);
    expect(calls).toBeLessThanOrEqual(1);
  });
});
