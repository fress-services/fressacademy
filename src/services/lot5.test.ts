import { describe, expect, it } from 'vitest';
import { accountBalance } from '../domain/balances';
import { budgetStatus, monthTotals } from '../domain/budget';
import { createLocalRepositories } from '../data/local/repositories';
import { newTestDatabase } from '../test/database';
import { createAccount } from './accounts';
import { setMonthlyBudget } from './budget';
import { ensureSystemCategories } from './categories';
import { addRepayment, createDebt, deleteDebt, deleteRepayment, updateDebt } from './debts';
import { BusinessError, ValidationError } from './errors';
import { createGoal, updateGoal } from './goals';
import { createPlanned, deletePlanned, markPlannedPaid, setPlannedCancelled } from './planned';
import { deleteTransaction } from './transactions';

async function setup() {
  const repos = createLocalRepositories(newTestDatabase());
  await ensureSystemCategories(repos);
  const account = { type: 'cash' as const, openingDate: '2026-10-01', openingBalanceMinor: 10000 };
  const eur = await createAccount(repos, { ...account, name: 'Caisse', currencyCode: 'EUR' });
  const xaf = await createAccount(repos, { ...account, name: 'Mobile', currencyCode: 'XAF' });
  const balance = async (id: string) =>
    accountBalance((await repos.accounts.getById(id))!, await repos.transactions.list());
  return { repos, eur, xaf, balance };
}

const debtInput = {
  direction: 'receivable' as const,
  contactLabel: 'Awa',
  originalAmountMinor: 3000,
  currencyCode: 'EUR' as const,
  createdDate: '2026-10-02',
  dueDate: null,
  note: '',
};

describe('dettes', () => {
  it('prêt et deux remboursements liés au compte, sans gonfler revenus, dépenses ni budget', async () => {
    const { repos, eur, balance } = await setup();
    await setMonthlyBudget(repos, { limitMinor: 50000, currencyCode: 'EUR' }, '2026-10');
    const debt = await createDebt(repos, { ...debtInput, accountId: eur.id });
    expect(debt.openingTransactionId).not.toBeNull();
    expect(await balance(eur.id)).toBe(7000); // 100 − 30 prêtés

    await addRepayment(repos, debt.id, {
      amountMinor: 1000,
      date: '2026-10-05',
      note: '',
      accountId: eur.id,
    });
    await addRepayment(repos, debt.id, {
      amountMinor: 500,
      date: '2026-10-06',
      note: '',
      accountId: null,
    });
    expect(await balance(eur.id)).toBe(8000); // seul le remboursement lié au compte compte

    const transactions = await repos.transactions.list();
    expect(transactions.filter((t) => t.type === 'debt_settlement')).toHaveLength(2);
    expect(monthTotals(transactions, '2026-10')).toEqual([]);
    const [budget] = await repos.budgets.list();
    expect(budgetStatus(budget!, transactions, '2026-10-19').spentMinor).toBe(0);

    await expect(
      addRepayment(repos, debt.id, {
        amountMinor: 1501,
        date: '2026-10-07',
        note: '',
        accountId: null,
      }),
    ).rejects.toEqual(new ValidationError({ amountMinor: 'exceedsRemaining' }));
  });

  it('emprunt : l’argent entre, puis ressort au remboursement', async () => {
    const { repos, eur, balance } = await setup();
    const debt = await createDebt(repos, { ...debtInput, direction: 'payable', accountId: eur.id });
    expect(await balance(eur.id)).toBe(13000);
    await addRepayment(repos, debt.id, {
      amountMinor: 3000,
      date: '2026-10-05',
      note: '',
      accountId: eur.id,
    });
    expect(await balance(eur.id)).toBe(10000);
  });

  it('refuse un compte d’une autre devise et n’enregistre rien', async () => {
    const { repos, xaf } = await setup();
    await expect(createDebt(repos, { ...debtInput, accountId: xaf.id })).rejects.toEqual(
      new ValidationError({ accountId: 'currencyMismatch' }),
    );
    expect(await repos.debts.list()).toHaveLength(0);
    expect(await repos.transactions.list()).toHaveLength(0);
  });

  it('supprimer un remboursement retire aussi son mouvement de compte', async () => {
    const { repos, eur, balance } = await setup();
    const debt = await createDebt(repos, { ...debtInput, accountId: null });
    const repayment = await addRepayment(repos, debt.id, {
      amountMinor: 1000,
      date: '2026-10-05',
      note: '',
      accountId: eur.id,
    });
    expect(await balance(eur.id)).toBe(11000);
    await deleteRepayment(repos, repayment.id);
    expect(await balance(eur.id)).toBe(10000);
    expect(await repos.debtRepayments.list()).toHaveLength(0);
  });

  it('modifie la dette sans toucher aux remboursements (A12)', async () => {
    const { repos, eur, balance } = await setup();
    const debt = await createDebt(repos, { ...debtInput, accountId: eur.id });
    await addRepayment(repos, debt.id, {
      amountMinor: 1000,
      date: '2026-10-05',
      note: '',
      accountId: null,
    });
    await expect(
      updateDebt(repos, debt.id, { ...debtInput, originalAmountMinor: 900 }),
    ).rejects.toEqual(new ValidationError({ originalAmountMinor: 'belowRepaid' }));
    await expect(updateDebt(repos, debt.id, { ...debtInput, currencyCode: 'XAF' })).rejects.toEqual(
      new BusinessError('currencyLocked'),
    );
    await updateDebt(repos, debt.id, { ...debtInput, originalAmountMinor: 4000 });
    expect(await balance(eur.id)).toBe(6000); // le prêt d'origine suit le nouveau montant
    expect(await repos.debtRepayments.list()).toHaveLength(1);
  });

  it('supprime la dette avec ses remboursements et mouvements', async () => {
    const { repos, eur, balance } = await setup();
    const debt = await createDebt(repos, { ...debtInput, accountId: eur.id });
    await addRepayment(repos, debt.id, {
      amountMinor: 1000,
      date: '2026-10-05',
      note: '',
      accountId: eur.id,
    });
    await deleteDebt(repos, debt.id);
    expect(await balance(eur.id)).toBe(10000);
    expect(await repos.debtRepayments.list()).toHaveLength(0);
    expect(await repos.transactions.list()).toHaveLength(0);
  });
});

const plannedInput = {
  title: 'Loyer',
  amountMinor: 6000,
  currencyCode: 'EUR' as const,
  dueDate: '2026-11-01',
  categoryId: null,
  accountId: null,
  note: '',
};

describe('dépenses prévues', () => {
  it('ne change rien avant d’être payée, puis crée une seule dépense réelle (§6.5)', async () => {
    const { repos, eur, balance } = await setup();
    const planned = await createPlanned(repos, plannedInput);
    expect(await balance(eur.id)).toBe(10000);
    expect(await repos.transactions.list()).toHaveLength(0);

    // Double clic : deux appels simultanés.
    const [first, second] = await Promise.all([
      markPlannedPaid(repos, planned.id, { accountId: eur.id, date: '2026-10-30' }),
      markPlannedPaid(repos, planned.id, { accountId: eur.id, date: '2026-10-30' }),
    ]);
    expect(second.id).toBe(first.id);
    const transactions = await repos.transactions.list();
    expect(transactions).toHaveLength(1);
    expect(transactions[0]).toMatchObject({
      type: 'expense',
      amountMinor: 6000,
      linkedPlannedExpenseId: planned.id,
    });
    expect(await balance(eur.id)).toBe(4000);
    expect(await repos.plannedExpenses.getById(planned.id)).toMatchObject({
      status: 'paid',
      linkedTransactionId: first.id,
    });
  });

  it('demande un compte compatible au paiement (A9)', async () => {
    const { repos, xaf } = await setup();
    const planned = await createPlanned(repos, plannedInput);
    await expect(
      markPlannedPaid(repos, planned.id, { accountId: '', date: '2026-10-30' }),
    ).rejects.toEqual(new ValidationError({ accountId: 'required' }));
    await expect(
      markPlannedPaid(repos, planned.id, { accountId: xaf.id, date: '2026-10-30' }),
    ).rejects.toEqual(new ValidationError({ accountId: 'currencyMismatch' }));
  });

  it('supprimer l’opération remet la dépense « prévue » (A8)', async () => {
    const { repos, eur } = await setup();
    const planned = await createPlanned(repos, plannedInput);
    const paid = await markPlannedPaid(repos, planned.id, {
      accountId: eur.id,
      date: '2026-10-30',
    });
    await deleteTransaction(repos, paid.id);
    expect(await repos.plannedExpenses.getById(planned.id)).toMatchObject({
      status: 'planned',
      linkedTransactionId: null,
    });
  });

  it('annule, réactive et supprime en gardant l’opération déjà créée', async () => {
    const { repos, eur } = await setup();
    const planned = await createPlanned(repos, plannedInput);
    await setPlannedCancelled(repos, planned.id, true);
    await expect(
      markPlannedPaid(repos, planned.id, { accountId: eur.id, date: '2026-10-30' }),
    ).rejects.toEqual(new BusinessError('managedElsewhere'));
    await setPlannedCancelled(repos, planned.id, false);
    const paid = await markPlannedPaid(repos, planned.id, {
      accountId: eur.id,
      date: '2026-10-30',
    });
    await deletePlanned(repos, planned.id);
    expect(await repos.transactions.getById(paid.id)).toMatchObject({
      linkedPlannedExpenseId: null,
    });
  });
});

describe('objectifs', () => {
  it('suit la progression sans toucher aux soldes', async () => {
    const { repos, eur, balance } = await setup();
    const goal = await createGoal(repos, {
      title: ' Moto ',
      targetAmountMinor: 500000,
      currentAmountMinor: 0,
      currencyCode: 'XAF',
      targetDate: null,
      note: '',
    });
    expect(goal.title).toBe('Moto');
    await updateGoal(repos, goal.id, { ...goal, currentAmountMinor: 125000 });
    expect((await repos.goals.getById(goal.id))?.currentAmountMinor).toBe(125000);
    expect(await balance(eur.id)).toBe(10000);
    expect(await repos.transactions.list()).toHaveLength(0);
  });
});
