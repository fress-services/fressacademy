import { describe, expect, it } from 'vitest';
import { budgetForMonth, budgetStatus, monthTotals } from './budget';
import type { Budget, Transaction } from './types';

const base = { createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z' };

function budget(partial: Partial<Budget> = {}): Budget {
  return {
    ...base,
    id: Math.random().toString(36),
    periodType: 'month',
    startMonth: '2026-01',
    currencyCode: 'EUR',
    limitMinor: 30000,
    includedCategoryIds: null,
    ...partial,
  };
}

function tx(
  partial: Partial<Transaction> & Pick<Transaction, 'type' | 'amountMinor'>,
): Transaction {
  return {
    ...base,
    id: Math.random().toString(36),
    currencyCode: 'EUR',
    accountId: 'a',
    fromAccountId: null,
    toAccountId: null,
    flow: null,
    categoryId: 'food',
    linkedDebtId: null,
    linkedDebtRepaymentId: null,
    linkedPlannedExpenseId: null,
    date: '2026-10-10',
    title: '',
    note: '',
    ...partial,
  };
}

describe('budgetForMonth (limite reconduite, décision A4)', () => {
  it('prend la limite la plus récente commencée au plus tard ce mois-ci', () => {
    const january = budget({ startMonth: '2026-01', limitMinor: 100 });
    const october = budget({ startMonth: '2026-10', limitMinor: 200 });
    expect(budgetForMonth([october, january], '2026-09')).toBe(january);
    expect(budgetForMonth([january, october], '2026-10')).toBe(october);
    expect(budgetForMonth([january, october], '2027-03')).toBe(october);
    expect(budgetForMonth([october], '2026-09')).toBeNull();
    expect(budgetForMonth([], '2026-10')).toBeNull();
  });
});

describe('budgetStatus (§5.5)', () => {
  it('calcule dépensé, reste et allocation du jour, aujourd’hui inclus', () => {
    const status = budgetStatus(
      budget({ limitMinor: 30000 }),
      [tx({ type: 'expense', amountMinor: 6000 }), tx({ type: 'expense', amountMinor: 1100 })],
      '2026-10-19',
    );
    // 31 − 19 + 1 = 13 jours ; (30000 − 7100) / 13 = 1761,5… → 1761.
    expect(status).toMatchObject({
      spentMinor: 7100,
      remainingMinor: 22900,
      daysRemaining: 13,
      dailyAllowanceMinor: 1761,
      overBudget: false,
    });
  });

  it.each([
    ['2026-02-01', 28],
    ['2028-02-01', 29],
    ['2026-04-01', 30],
    ['2026-10-01', 31],
  ])('premier jour %s : %i jours restants', (today, days) => {
    const status = budgetStatus(budget({ limitMinor: days * 100 }), [], today);
    expect(status.daysRemaining).toBe(days);
    expect(status.dailyAllowanceMinor).toBe(100);
  });

  it.each(['2026-02-28', '2028-02-29', '2026-04-30', '2026-10-31'])(
    'dernier jour %s : un seul jour, tout le reste est disponible',
    (today) => {
      const status = budgetStatus(budget({ limitMinor: 5000 }), [], today);
      expect(status.daysRemaining).toBe(1);
      expect(status.dailyAllowanceMinor).toBe(5000);
    },
  );

  it('budget dépassé : reste négatif visible et allocation à zéro', () => {
    const status = budgetStatus(
      budget({ limitMinor: 10000 }),
      [tx({ type: 'expense', amountMinor: 12500 })],
      '2026-10-19',
    );
    expect(status).toMatchObject({
      remainingMinor: -2500,
      dailyAllowanceMinor: 0,
      overBudget: true,
    });
  });

  it('budget tout juste atteint : allocation à zéro sans dépassement', () => {
    const status = budgetStatus(
      budget({ limitMinor: 10000 }),
      [tx({ type: 'expense', amountMinor: 10000 })],
      '2026-10-19',
    );
    expect(status).toMatchObject({ remainingMinor: 0, dailyAllowanceMinor: 0, overBudget: false });
  });

  it('une dépense antidatée compte dans le mois de sa date, pas celui de la saisie', () => {
    const backdated = tx({
      type: 'expense',
      amountMinor: 4000,
      date: '2026-09-30',
      createdAt: '2026-10-19T08:00:00.000Z',
    });
    expect(budgetStatus(budget(), [backdated], '2026-10-19').spentMinor).toBe(0);
    expect(budgetStatus(budget(), [backdated], '2026-09-30').spentMinor).toBe(4000);
  });

  it('ignore revenus, transferts, ajustements et règlements de dette', () => {
    const status = budgetStatus(
      budget(),
      [
        tx({ type: 'income', amountMinor: 50000 }),
        tx({
          type: 'transfer',
          amountMinor: 7000,
          accountId: null,
          fromAccountId: 'a',
          toAccountId: 'b',
        }),
        tx({ type: 'adjustment', amountMinor: 900, flow: 'out', categoryId: null }),
        tx({ type: 'debt_settlement', amountMinor: 800, flow: 'out', categoryId: null }),
        tx({ type: 'expense', amountMinor: 1000 }),
      ],
      '2026-10-19',
    );
    expect(status.spentMinor).toBe(1000);
  });

  it('ne compte pas les dépenses d’une autre devise mais les signale (décision A6)', () => {
    const status = budgetStatus(
      budget(),
      [
        tx({ type: 'expense', amountMinor: 1000 }),
        tx({ type: 'expense', amountMinor: 500000, currencyCode: 'XAF' }),
      ],
      '2026-10-19',
    );
    expect(status.spentMinor).toBe(1000);
    expect(status.otherCurrencyCount).toBe(1);
  });

  it('respecte la liste de catégories quand elle existe (prévu pour plus tard)', () => {
    const status = budgetStatus(
      budget({ includedCategoryIds: ['food'] }),
      [
        tx({ type: 'expense', amountMinor: 1000 }),
        tx({ type: 'expense', amountMinor: 2000, categoryId: 'leisure' }),
      ],
      '2026-10-19',
    );
    expect(status.spentMinor).toBe(1000);
  });

  it('fonctionne pour une devise sans décimales', () => {
    const status = budgetStatus(
      budget({ currencyCode: 'XAF', limitMinor: 100000 }),
      [tx({ type: 'expense', amountMinor: 35000, currencyCode: 'XAF' })],
      '2026-10-19',
    );
    expect(status.dailyAllowanceMinor).toBe(5000);
  });
});

describe('monthTotals', () => {
  it('additionne revenus et dépenses du mois par devise, sans les transferts', () => {
    const totals = monthTotals(
      [
        tx({ type: 'income', amountMinor: 200000 }),
        tx({ type: 'expense', amountMinor: 3000 }),
        tx({ type: 'expense', amountMinor: 2000, date: '2026-09-30' }),
        tx({
          type: 'transfer',
          amountMinor: 7000,
          accountId: null,
          fromAccountId: 'a',
          toAccountId: 'b',
        }),
        tx({ type: 'adjustment', amountMinor: 900, flow: 'in', categoryId: null }),
        tx({ type: 'expense', amountMinor: 1500, currencyCode: 'XAF' }),
      ],
      '2026-10',
    );
    expect(totals).toEqual([
      { currencyCode: 'EUR', incomeMinor: 200000, expenseMinor: 3000 },
      { currencyCode: 'XAF', incomeMinor: 0, expenseMinor: 1500 },
    ]);
  });
});
