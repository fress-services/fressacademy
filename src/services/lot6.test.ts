import { describe, expect, it } from 'vitest';
import { protectFormula, toCsv } from '../data/backup/csv';
import { MAX_BACKUP_BYTES, parseBackup } from '../data/backup/json';
import { createLocalRepositories } from '../data/local/repositories';
import type { KoloRepositories } from '../data/repositories/types';
import { newTestDatabase } from '../test/database';
import { APP_VERSION } from '../version';
import { createAccount } from './accounts';
import { clearAllData, exportBackup, markBackupDone, readBackup, restoreBackup } from './backup';
import { setMonthlyBudget } from './budget';
import { ensureSystemCategories } from './categories';
import { addRepayment, createDebt } from './debts';
import { createGoal } from './goals';
import { createPlanned, markPlannedPaid } from './planned';
import { saveTransaction } from './transactions';

/** Base remplie avec un exemple de chaque type d'objet (données fictives). */
async function populated(): Promise<KoloRepositories> {
  let tick = Date.UTC(2026, 9, 19);
  const repos = createLocalRepositories(newTestDatabase(), {
    now: () => new Date((tick += 1000)),
    newId: () => crypto.randomUUID(),
  });
  await ensureSystemCategories(repos);
  await repos.preferences.update({
    language: 'fr',
    defaultCurrency: 'EUR',
    onboardingCompletedAt: '2026-10-01T00:00:00.000Z',
  });
  const base = { type: 'cash' as const, openingDate: '2026-10-01', openingBalanceMinor: 10000 };
  const cash = await createAccount(repos, { ...base, name: 'Caisse', currencyCode: 'EUR' });
  const bank = await createAccount(repos, { ...base, name: 'Banque', currencyCode: 'EUR' });
  const food = (await repos.categories.list()).find((c) => c.systemKey === 'food')!;
  const draft = {
    accountId: cash.id,
    fromAccountId: null,
    toAccountId: null,
    categoryId: food.id,
    date: '2026-10-05',
    note: 'note, avec "guillemets"',
  };
  await saveTransaction(repos, { ...draft, type: 'expense', amountMinor: 1250, title: 'Marché' });
  await saveTransaction(repos, {
    ...draft,
    type: 'transfer',
    amountMinor: 500,
    accountId: null,
    fromAccountId: cash.id,
    toAccountId: bank.id,
    categoryId: null,
    title: '',
  });
  await setMonthlyBudget(repos, { limitMinor: 50000, currencyCode: 'EUR' }, '2026-10');
  const debt = await createDebt(repos, {
    direction: 'receivable',
    contactLabel: 'Awa',
    originalAmountMinor: 3000,
    currencyCode: 'EUR',
    createdDate: '2026-10-02',
    dueDate: null,
    note: '',
    accountId: cash.id,
  });
  await addRepayment(repos, debt.id, {
    amountMinor: 1000,
    date: '2026-10-06',
    note: '',
    accountId: cash.id,
  });
  const planned = await createPlanned(repos, {
    title: 'Facture',
    amountMinor: 2000,
    currencyCode: 'EUR',
    dueDate: '2026-10-20',
    categoryId: null,
    accountId: null,
    note: '',
  });
  await markPlannedPaid(repos, planned.id, { accountId: bank.id, date: '2026-10-19' });
  await createGoal(repos, {
    title: 'Vacances',
    targetAmountMinor: 100000,
    currentAmountMinor: 2000,
    currencyCode: 'EUR',
    targetDate: null,
    note: '',
  });
  return repos;
}

const sortById = <T extends { id: string }>(list: T[]) =>
  [...list].sort((a, b) => a.id.localeCompare(b.id));

function normalized(snapshot: Awaited<ReturnType<KoloRepositories['readAll']>>) {
  return Object.fromEntries(
    Object.entries(snapshot).map(([key, value]) => [
      key,
      Array.isArray(value) ? sortById(value as { id: string }[]) : value,
    ]),
  );
}

describe('sauvegarde JSON (§5.11)', () => {
  it('exporter puis restaurer dans une base vide redonne exactement les mêmes données', async () => {
    const source = await populated();
    const { fileName, content } = await exportBackup(source, new Date('2026-10-19T09:00:00Z'));
    expect(fileName).toBe('kolo-sauvegarde-2026-10-19.json');
    expect(JSON.parse(content)).toMatchObject({
      format: 'kolo-backup',
      formatVersion: 1,
      schemaVersion: 1,
      appVersion: APP_VERSION,
      createdAt: '2026-10-19T09:00:00.000Z',
    });

    const target = createLocalRepositories(newTestDatabase());
    await ensureSystemCategories(target);
    const parsed = readBackup(target, content);
    if (!parsed.ok) throw new Error(parsed.error);
    expect(parsed.counts).toEqual({
      accounts: 2,
      categories: 16,
      transactions: 5,
      budgets: 1,
      debts: 1,
      debtRepayments: 1,
      plannedExpenses: 1,
      goals: 1,
    });
    await restoreBackup(target, parsed.data);

    expect(normalized(await target.readAll())).toEqual(normalized(await source.readAll()));
  });

  it('la restauration remplace les données présentes (pas de fusion, décision A7)', async () => {
    const source = await populated();
    const { content } = await exportBackup(source);
    const target = await populated();
    const parsed = readBackup(target, content);
    if (!parsed.ok) throw new Error(parsed.error);
    await restoreBackup(target, parsed.data);
    expect((await target.accounts.list()).map((a) => a.id).sort()).toEqual(
      (await source.accounts.list()).map((a) => a.id).sort(),
    );
  });

  it('refuse un fichier abîmé, étranger, trop gros ou trop récent', async () => {
    const repos = await populated();
    const { content } = await exportBackup(repos);
    const backup = JSON.parse(content);
    const variant = (change: (value: typeof backup) => void) => {
      const copy = structuredClone(backup);
      change(copy);
      return JSON.stringify(copy);
    };

    expect(parseBackup('{pas du json', 1)).toEqual({ ok: false, error: 'malformed' });
    expect(parseBackup('[]', 1)).toEqual({ ok: false, error: 'notKolo' });
    expect(parseBackup('{"format":"autre"}', 1)).toEqual({ ok: false, error: 'notKolo' });
    expect(parseBackup('x'.repeat(MAX_BACKUP_BYTES + 1), 1)).toEqual({
      ok: false,
      error: 'tooLarge',
    });
    expect(
      parseBackup(
        variant((b) => (b.schemaVersion = 2)),
        1,
      ),
    ).toEqual({
      ok: false,
      error: 'newerVersion',
    });
    expect(
      parseBackup(
        variant((b) => (b.formatVersion = 2)),
        1,
      ),
    ).toEqual({
      ok: false,
      error: 'newerVersion',
    });
  });

  it('refuse des champs invalides et des liens cassés', async () => {
    const repos = await populated();
    const backup = JSON.parse((await exportBackup(repos)).content);
    const invalid = (change: (value: typeof backup) => void) => {
      const copy = structuredClone(backup);
      change(copy);
      return parseBackup(JSON.stringify(copy), 1);
    };
    const refused = { ok: false, error: 'invalid' };

    expect(invalid((b) => (b.data.transactions[0].amountMinor = -5))).toEqual(refused);
    expect(invalid((b) => (b.data.transactions[0].amountMinor = 12.5))).toEqual(refused);
    expect(invalid((b) => (b.data.transactions[0].date = '2026-02-30'))).toEqual(refused);
    expect(invalid((b) => (b.data.accounts[0].currencyCode = 'ZZZ'))).toEqual(refused);
    expect(invalid((b) => delete b.data.goals)).toEqual(refused);
    expect(invalid((b) => (b.data.debtRepayments[0].debtId = 'inconnu'))).toEqual(refused);
    expect(invalid((b) => b.data.accounts.push(b.data.accounts[0]))).toEqual(refused);
    expect(invalid((b) => (b.data.preferences.theme = 'rose'))).toEqual(refused);
    // Une opération dont la devise ne correspond pas à son compte.
    expect(invalid((b) => (b.data.transactions[0].currencyCode = 'XAF'))).toEqual(refused);
  });

  it('ignore les champs inconnus et complète les préférences absentes', async () => {
    const repos = await populated();
    const backup = JSON.parse((await exportBackup(repos)).content);
    backup.data.accounts[0].champInconnu = '<script>';
    delete backup.data.preferences.lastBackupAt;
    const parsed = parseBackup(JSON.stringify(backup), 1);
    if (!parsed.ok) throw new Error(parsed.error);
    expect(parsed.data.accounts[0]).not.toHaveProperty('champInconnu');
    expect(parsed.data.preferences.lastBackupAt).toBeNull();
  });

  it('un fichier refusé ne modifie rien', async () => {
    const repos = await populated();
    const before = normalized(await repos.readAll());
    expect(readBackup(repos, '{"format":"kolo-backup"}').ok).toBe(false);
    expect(normalized(await repos.readAll())).toEqual(before);
  });

  it('retient la date de la dernière sauvegarde', async () => {
    const repos = await populated();
    await markBackupDone(repos, new Date('2026-10-19T10:00:00Z'));
    expect((await repos.preferences.get()).lastBackupAt).toBe('2026-10-19T10:00:00.000Z');
  });

  it('inscrit la version de l’application', () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe('effacement de toutes les données (§9.2)', () => {
  it('vide tout, remet les préférences à zéro sauf la langue, recrée les catégories système', async () => {
    const repos = await populated();
    await clearAllData(repos);
    const data = await repos.readAll();
    expect(data.accounts).toEqual([]);
    expect(data.transactions).toEqual([]);
    expect(data.debts).toEqual([]);
    expect(data.goals).toEqual([]);
    expect(data.categories).toHaveLength(16);
    expect(data.preferences.onboardingCompletedAt).toBeNull();
    expect(data.preferences.defaultCurrency).toBeNull();
    expect(data.preferences.language).toBe('fr');
  });
});

describe('CSV (§5.11)', () => {
  it('échappe virgules, guillemets et retours à la ligne, en UTF-8 avec BOM', () => {
    const csv = toCsv(
      ['a', 'b'],
      [
        ['x,y', 'il a dit "oui"'],
        ['ligne\nsuivante', 'é€'],
      ],
    );
    expect(csv).toBe('﻿a,b\r\n"x,y","il a dit ""oui"""\r\n"ligne\nsuivante",é€\r\n');
  });

  it('neutralise les formules de tableur', () => {
    expect(protectFormula('=SOMME(A1)')).toBe("'=SOMME(A1)");
    expect(protectFormula('+33')).toBe("'+33");
    expect(protectFormula('@cmd')).toBe("'@cmd");
    expect(protectFormula('Marché')).toBe('Marché');
  });
});
