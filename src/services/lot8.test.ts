import { describe, expect, it } from 'vitest';
import { parseBackup } from '../data/backup/json';
import { createLocalRepositories } from '../data/local/repositories';
import { newTestDatabase } from '../test/database';
import { adjustBalance, createAccount } from './accounts';
import { exportBackup } from './backup';
import { ensureSystemCategories } from './categories';
import { addRepayment, createDebt } from './debts';
import { BusinessError, ValidationError } from './errors';
import { createPlanned, markPlannedPaid } from './planned';
import { saveTransaction } from './transactions';

/** Corrections issues de la revue finale (lot 8). Données fictives. */
async function setup() {
  const repos = createLocalRepositories(newTestDatabase());
  await ensureSystemCategories(repos);
  const base = {
    type: 'cash' as const,
    openingDate: '2026-10-01',
    currencyCode: 'EUR' as const,
  };
  const cash = await createAccount(repos, { ...base, name: 'Caisse', openingBalanceMinor: 10000 });
  const bank = await createAccount(repos, { ...base, name: 'Banque', openingBalanceMinor: 0 });
  return { repos, cash, bank };
}

describe('revue finale : cohérence des données', () => {
  it('l’opération qui paie une dépense prévue reste une dépense', async () => {
    const { repos, cash, bank } = await setup();
    const planned = await createPlanned(repos, {
      title: 'Loyer',
      amountMinor: 5000,
      currencyCode: 'EUR',
      dueDate: '2026-10-20',
      categoryId: null,
      accountId: null,
      note: '',
    });
    await markPlannedPaid(repos, planned.id, { accountId: cash.id, date: '2026-10-19' });
    const paid = (await repos.transactions.list()).find((t) => t.linkedPlannedExpenseId)!;
    const draft = {
      type: 'transfer' as const,
      amountMinor: 5000,
      accountId: null,
      fromAccountId: cash.id,
      toAccountId: bank.id,
      categoryId: null,
      date: '2026-10-19',
      title: 'Loyer',
      note: '',
    };
    await expect(saveTransaction(repos, draft, paid.id)).rejects.toEqual(
      new BusinessError('plannedStaysExpense'),
    );
    expect((await repos.transactions.getById(paid.id))?.type).toBe('expense');
    // Modifier le montant ou la date reste possible.
    await saveTransaction(
      repos,
      {
        ...draft,
        type: 'expense',
        accountId: cash.id,
        fromAccountId: null,
        toAccountId: null,
        categoryId: (await repos.categories.list()).find((c) => c.systemKey === 'housing')!.id,
        amountMinor: 5200,
      },
      paid.id,
    );
    expect((await repos.transactions.getById(paid.id))?.amountMinor).toBe(5200);
  });

  it('un ajustement qui ferait déborder le solde est refusé', async () => {
    const { repos, cash } = await setup();
    await adjustBalance(repos, {
      accountId: cash.id,
      actualBalanceMinor: -(10 ** 15),
      date: '2026-10-19',
      title: '',
    });
    await expect(
      adjustBalance(repos, {
        accountId: cash.id,
        actualBalanceMinor: Number.MAX_SAFE_INTEGER,
        date: '2026-10-19',
        title: '',
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('un remboursement sans date donne une erreur sur le champ date', async () => {
    const { repos } = await setup();
    const debt = await createDebt(repos, {
      direction: 'payable',
      contactLabel: 'Awa',
      originalAmountMinor: 3000,
      currencyCode: 'EUR',
      createdDate: '2026-10-02',
      dueDate: '2026-10-10',
      note: '',
      accountId: null,
    });
    const error = await addRepayment(repos, debt.id, {
      amountMinor: 1000,
      date: '',
      note: '',
      accountId: null,
    }).catch((failure: unknown) => failure);
    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).fieldErrors).toEqual({ date: 'invalid' });
  });
});

describe('revue finale : sauvegarde', () => {
  async function backup() {
    const { repos, cash, bank } = await setup();
    const food = (await repos.categories.list()).find((c) => c.systemKey === 'food')!;
    const common = { date: '2026-10-05', title: '', note: '', amountMinor: 100 };
    await saveTransaction(repos, {
      ...common,
      type: 'expense',
      accountId: cash.id,
      fromAccountId: null,
      toAccountId: null,
      categoryId: food.id,
    });
    await saveTransaction(repos, {
      ...common,
      type: 'transfer',
      accountId: null,
      fromAccountId: cash.id,
      toAccountId: bank.id,
      categoryId: null,
    });
    return JSON.parse((await exportBackup(repos)).content);
  }
  const check = (value: unknown) => parseBackup(JSON.stringify(value), 1);
  const refused = { ok: false, error: 'invalid' };

  it('accepte la sauvegarde faite par Kolo', async () => {
    expect(check(await backup()).ok).toBe(true);
  });

  it('refuse une opération qui ne respecte pas les règles de son type', async () => {
    const original = await backup();
    const expenseIndex = original.data.transactions.findIndex(
      (t: { type: string }) => t.type === 'expense',
    );
    const transferIndex = original.data.transactions.findIndex(
      (t: { type: string }) => t.type === 'transfer',
    );
    const variant = (change: (b: typeof original) => void) => {
      const copy = structuredClone(original);
      change(copy);
      return check(copy);
    };
    expect(variant((b) => (b.data.transactions[expenseIndex].accountId = null))).toEqual(refused);
    expect(variant((b) => (b.data.transactions[expenseIndex].flow = 'in'))).toEqual(refused);
    expect(
      variant((b) => {
        const t = b.data.transactions[transferIndex];
        t.toAccountId = t.fromAccountId;
      }),
    ).toEqual(refused);
    expect(variant((b) => (b.data.transactions[transferIndex].fromAccountId = null))).toEqual(
      refused,
    );
  });

  it('refuse un fichier dont les totaux déborderaient', async () => {
    const original = await backup();
    for (const t of original.data.transactions) t.amountMinor = Number.MAX_SAFE_INTEGER;
    expect(check(original)).toEqual(refused);
  });
});
