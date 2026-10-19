import { describe, expect, it } from 'vitest';
import { accountBalance } from '../domain/balances';
import type { TransactionDraft } from '../domain/validation';
import { createLocalRepositories } from '../data/local/repositories';
import type { KoloRepositories } from '../data/repositories/types';
import { newTestDatabase } from '../test/database';
import {
  adjustBalance,
  canDeleteAccount,
  createAccount,
  deleteAccount,
  setAccountArchived,
  updateAccount,
  type AccountInput,
} from './accounts';
import {
  createCategory,
  ensureSystemCategories,
  renameCategory,
  setCategoryArchived,
  sortCategories,
} from './categories';
import { BusinessError, ValidationError } from './errors';
import { completeOnboarding } from './onboarding';
import { deleteTransaction, saveTransaction, sortTransactions } from './transactions';

const courantInput: AccountInput = {
  name: ' Compte courant ',
  type: 'checking',
  currencyCode: 'EUR',
  openingBalanceMinor: 100000,
  openingDate: '2026-10-01',
};

async function setup() {
  // Horloge qui avance d'une seconde à chaque écriture : l'ordre de saisie est déterministe.
  let tick = Date.UTC(2026, 9, 19);
  const repos = createLocalRepositories(newTestDatabase(), {
    now: () => new Date((tick += 1000)),
    newId: () => crypto.randomUUID(),
  });
  await ensureSystemCategories(repos);
  const categories = await repos.categories.list();
  const byKey = (key: string) => categories.find((category) => category.systemKey === key)!.id;
  const courant = await createAccount(repos, courantInput);
  const epargne = await createAccount(repos, {
    ...courantInput,
    name: 'Épargne',
    type: 'savings',
    openingBalanceMinor: 0,
  });
  return { repos, courant, epargne, food: byKey('food'), salary: byKey('salary') };
}

function expense(accountId: string, categoryId: string, amountMinor: number): TransactionDraft {
  return {
    type: 'expense',
    amountMinor,
    accountId,
    fromAccountId: null,
    toAccountId: null,
    categoryId,
    date: '2026-10-19',
    title: ' Marché ',
    note: '',
  };
}

async function balanceOf(repos: KoloRepositories, id: string) {
  const account = (await repos.accounts.getById(id))!;
  return accountBalance(account, await repos.transactions.list());
}

describe('catégories', () => {
  it('crée les catégories système une seule fois', async () => {
    const repos = createLocalRepositories(newTestDatabase());
    await ensureSystemCategories(repos);
    await ensureSystemCategories(repos);
    const categories = await repos.categories.list();
    expect(categories).toHaveLength(16);
    expect(categories.filter((c) => c.kind === 'income')).toHaveLength(5);
  });

  it('crée, renomme et archive une catégorie personnelle sans toucher l’historique', async () => {
    const { repos, courant } = await setup();
    const custom = await createCategory(repos, { kind: 'expense', name: ' Tontine ' });
    expect(custom.customName).toBe('Tontine');
    const tx = await saveTransaction(repos, expense(courant.id, custom.id, 500));
    await renameCategory(repos, custom.id, 'Tontine du quartier');
    await setCategoryArchived(repos, custom.id, true);
    expect((await repos.transactions.getById(tx.id))?.categoryId).toBe(custom.id);
    await expect(createCategory(repos, { kind: 'expense', name: '  ' })).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it('refuse de renommer une catégorie système', async () => {
    const { repos, food } = await setup();
    await expect(renameCategory(repos, food, 'Bouffe')).rejects.toEqual(
      new BusinessError('systemCategory'),
    );
  });

  it('trie les catégories système avant les personnelles', async () => {
    const { repos } = await setup();
    await createCategory(repos, { kind: 'expense', name: 'Animaux' });
    const sorted = sortCategories(await repos.categories.list());
    expect(sorted[0]?.systemKey).toBe('housing');
    expect(sorted.at(-1)?.customName).toBe('Animaux');
  });
});

describe('comptes', () => {
  it('nettoie le nom et refuse un compte invalide', async () => {
    const { courant, repos } = await setup();
    expect(courant.name).toBe('Compte courant');
    await expect(
      createAccount(repos, { ...courantInput, openingBalanceMinor: -5 }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('bloque le changement de devise dès qu’une opération existe', async () => {
    const { repos, courant, epargne, food } = await setup();
    await updateAccount(repos, epargne.id, {
      ...courantInput,
      name: 'Épargne',
      currencyCode: 'USD',
    });
    await saveTransaction(repos, expense(courant.id, food, 100));
    await expect(
      updateAccount(repos, courant.id, { ...courantInput, currencyCode: 'USD' }),
    ).rejects.toEqual(new BusinessError('currencyLocked'));
  });

  it('supprime un compte inutilisé, refuse un compte utilisé (A11)', async () => {
    const { repos, courant, epargne, food } = await setup();
    await saveTransaction(repos, expense(courant.id, food, 100));
    expect(await canDeleteAccount(repos, courant.id)).toBe(false);
    await expect(deleteAccount(repos, courant.id)).rejects.toEqual(
      new BusinessError('accountInUse'),
    );
    await deleteAccount(repos, epargne.id);
    expect(await repos.accounts.getById(epargne.id)).toBeUndefined();
  });

  it('crée un ajustement explicite pour aligner le solde (A1)', async () => {
    const { repos, courant } = await setup();
    const down = await adjustBalance(repos, {
      accountId: courant.id,
      actualBalanceMinor: 95050,
      date: '2026-10-19',
      title: '',
    });
    expect(down).toMatchObject({
      type: 'adjustment',
      amountMinor: 4950,
      flow: 'out',
      currencyCode: 'EUR',
    });
    expect(await balanceOf(repos, courant.id)).toBe(95050);
    const up = await adjustBalance(repos, {
      accountId: courant.id,
      actualBalanceMinor: 100000,
      date: '2026-10-19',
      title: '',
    });
    expect(up).toMatchObject({ amountMinor: 4950, flow: 'in' });
    expect(
      await adjustBalance(repos, {
        accountId: courant.id,
        actualBalanceMinor: 100000,
        date: '2026-10-19',
        title: '',
      }),
    ).toBeNull();
    // Le solde initial n'a jamais été modifié.
    expect((await repos.accounts.getById(courant.id))?.openingBalanceMinor).toBe(100000);
  });

  it('refuse une nouvelle opération sur un compte archivé', async () => {
    const { repos, courant, food } = await setup();
    await setAccountArchived(repos, courant.id, true);
    await expect(saveTransaction(repos, expense(courant.id, food, 100))).rejects.toBeInstanceOf(
      ValidationError,
    );
  });
});

describe('opérations (§6.5)', () => {
  it('une dépense de 25 EUR diminue le solde de 25 EUR', async () => {
    const { repos, courant, food } = await setup();
    const tx = await saveTransaction(repos, expense(courant.id, food, 2500));
    expect(tx).toMatchObject({
      currencyCode: 'EUR',
      title: 'Marché',
      categoryId: food,
      fromAccountId: null,
    });
    expect(await balanceOf(repos, courant.id)).toBe(97500);
  });

  it('un transfert de 40 EUR déplace l’argent sans catégorie', async () => {
    const { repos, courant, epargne } = await setup();
    const tx = await saveTransaction(repos, {
      ...expense(courant.id, 'ignored', 4000),
      type: 'transfer',
      accountId: null,
      fromAccountId: courant.id,
      toAccountId: epargne.id,
    });
    expect(tx).toMatchObject({ accountId: null, categoryId: null });
    expect(await balanceOf(repos, courant.id)).toBe(96000);
    expect(await balanceOf(repos, epargne.id)).toBe(4000);
  });

  it('modifier une opération remplace l’ancien montant dans le solde', async () => {
    const { repos, courant, epargne, food } = await setup();
    const tx = await saveTransaction(repos, expense(courant.id, food, 2500));
    const edited = await saveTransaction(repos, expense(epargne.id, food, 1000), tx.id);
    expect(edited.id).toBe(tx.id);
    expect(await balanceOf(repos, courant.id)).toBe(100000);
    expect(await balanceOf(repos, epargne.id)).toBe(-1000);
  });

  it('supprimer une opération la retire du solde', async () => {
    const { repos, courant, salary } = await setup();
    const tx = await saveTransaction(repos, {
      ...expense(courant.id, salary, 300000),
      type: 'income',
    });
    expect(await balanceOf(repos, courant.id)).toBe(400000);
    await deleteTransaction(repos, tx.id);
    expect(await balanceOf(repos, courant.id)).toBe(100000);
  });

  it('refuse de modifier un ajustement et de supprimer un règlement de dette ici', async () => {
    const { repos, courant, food } = await setup();
    const adjustment = await adjustBalance(repos, {
      accountId: courant.id,
      actualBalanceMinor: 1,
      date: '2026-10-19',
      title: '',
    });
    await expect(
      saveTransaction(repos, expense(courant.id, food, 1), adjustment!.id),
    ).rejects.toEqual(new BusinessError('managedElsewhere'));
    const settlement = await repos.transactions.create({ ...adjustment!, type: 'debt_settlement' });
    await expect(deleteTransaction(repos, settlement.id)).rejects.toEqual(
      new BusinessError('managedElsewhere'),
    );
    await deleteTransaction(repos, adjustment!.id);
  });

  it('trie l’activité par date puis par saisie', async () => {
    const { repos, courant, food } = await setup();
    const a = await saveTransaction(repos, { ...expense(courant.id, food, 1), date: '2026-10-01' });
    const b = await saveTransaction(repos, expense(courant.id, food, 2));
    const c = await saveTransaction(repos, expense(courant.id, food, 3));
    expect(sortTransactions(await repos.transactions.list()).map((t) => t.id)).toEqual([
      c.id,
      b.id,
      a.id,
    ]);
  });
});

describe('premier lancement', () => {
  it('enregistre la devise, le premier compte et la fin du parcours', async () => {
    const repos = createLocalRepositories(newTestDatabase());
    await completeOnboarding(repos, {
      defaultCurrency: 'XAF',
      account: { ...courantInput, currencyCode: 'XAF', name: 'Espèces' },
      now: new Date('2026-10-19T08:00:00Z'),
    });
    const prefs = await repos.preferences.get();
    expect(prefs.defaultCurrency).toBe('XAF');
    expect(prefs.onboardingCompletedAt).toBe('2026-10-19T08:00:00.000Z');
    expect((await repos.accounts.list()).map((a) => a.name)).toEqual(['Espèces']);
  });

  it('n’enregistre rien si le compte est invalide', async () => {
    const repos = createLocalRepositories(newTestDatabase());
    await expect(
      completeOnboarding(repos, { defaultCurrency: 'EUR', account: { ...courantInput, name: '' } }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect((await repos.preferences.get()).onboardingCompletedAt).toBeNull();
  });
});
