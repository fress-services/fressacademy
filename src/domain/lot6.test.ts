import { describe, expect, it } from 'vitest';
import { monthlyReport } from './reports';
import {
  countActiveFilters,
  filterTransactions,
  matchesQuery,
  NO_FILTERS,
  normalizeText,
} from './search';
import type { Transaction } from './types';

let counter = 0;
function tx(partial: Partial<Transaction>): Transaction {
  counter += 1;
  return {
    id: `t${counter}`,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    type: 'expense',
    amountMinor: 1000,
    currencyCode: 'EUR',
    accountId: 'a1',
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

describe('recherche (§5.9)', () => {
  it('ignore la casse et les accents', () => {
    expect(normalizeText('  Café CRÈME ')).toBe('cafe creme');
    expect(matchesQuery('cafe', ['Café du coin'])).toBe(true);
    expect(matchesQuery('ÉCOLE', ['frais d’ecole'])).toBe(true);
  });

  it('exige chaque mot, dans n’importe quel texte', () => {
    expect(matchesQuery('loyer octobre', ['Loyer', 'payé en octobre'])).toBe(true);
    expect(matchesQuery('loyer novembre', ['Loyer', 'payé en octobre'])).toBe(false);
    expect(matchesQuery('   ', ['quoi que ce soit'])).toBe(true);
  });
});

describe('filtres des opérations (§5.9)', () => {
  const market = tx({ title: 'Marché', note: 'légumes', date: '2026-10-03' });
  const salary = tx({ type: 'income', categoryId: 'salary', title: 'Salaire', date: '2026-10-28' });
  const transfer = tx({
    type: 'transfer',
    accountId: null,
    fromAccountId: 'a1',
    toAccountId: 'a2',
    categoryId: null,
    date: '2026-09-30',
  });
  const xaf = tx({ currencyCode: 'XAF', accountId: 'a3', date: '2026-10-15' });
  const all = [market, salary, transfer, xaf];

  it('sans filtre, garde tout', () => {
    expect(filterTransactions(all, NO_FILTERS)).toEqual(all);
    expect(countActiveFilters(NO_FILTERS)).toBe(0);
  });

  it('filtre par type, catégorie et devise', () => {
    expect(filterTransactions(all, { ...NO_FILTERS, type: 'income' })).toEqual([salary]);
    expect(filterTransactions(all, { ...NO_FILTERS, categoryId: 'food' })).toEqual([market, xaf]);
    expect(filterTransactions(all, { ...NO_FILTERS, currencyCode: 'XAF' })).toEqual([xaf]);
  });

  it('un compte trouve aussi les transferts dont il est la source ou la destination', () => {
    expect(filterTransactions(all, { ...NO_FILTERS, accountId: 'a2' })).toEqual([transfer]);
    expect(filterTransactions(all, { ...NO_FILTERS, accountId: 'a1' })).toEqual([
      market,
      salary,
      transfer,
    ]);
  });

  it('filtre par période, bornes comprises', () => {
    const october = { ...NO_FILTERS, from: '2026-10-01', to: '2026-10-15' };
    expect(filterTransactions(all, october)).toEqual([market, xaf]);
    expect(countActiveFilters(october)).toBe(2);
  });

  it('cherche dans le libellé, la note et les textes affichés', () => {
    expect(filterTransactions(all, { ...NO_FILTERS, query: 'legumes' })).toEqual([market]);
    const labels = (t: Transaction) => (t.categoryId === 'salary' ? ['Salaire mensuel'] : []);
    expect(filterTransactions(all, { ...NO_FILTERS, query: 'mensuel' }, labels)).toEqual([salary]);
  });
});

describe('rapport mensuel (§5.9)', () => {
  it('sépare les devises et exclut transferts, ajustements et règlements de dette', () => {
    const report = monthlyReport(
      [
        tx({ amountMinor: 3000, categoryId: 'food' }),
        tx({ amountMinor: 1000, categoryId: 'transport' }),
        tx({ amountMinor: 1000, categoryId: 'food' }),
        tx({ type: 'income', amountMinor: 20000, categoryId: 'salary' }),
        tx({ type: 'transfer', amountMinor: 5000, accountId: null, categoryId: null }),
        tx({ type: 'adjustment', amountMinor: 700, flow: 'out', categoryId: null }),
        tx({ type: 'debt_settlement', amountMinor: 900, flow: 'out', categoryId: null }),
        tx({ currencyCode: 'XAF', amountMinor: 5000, categoryId: null }),
      ],
      '2026-10',
    );
    expect(report).toEqual([
      {
        currencyCode: 'EUR',
        incomeMinor: 20000,
        expenseMinor: 5000,
        differenceMinor: 15000,
        byCategory: [
          { categoryId: 'food', amountMinor: 4000, sharePercent: 80 },
          { categoryId: 'transport', amountMinor: 1000, sharePercent: 20 },
        ],
        previous: null,
      },
      {
        currencyCode: 'XAF',
        incomeMinor: 0,
        expenseMinor: 5000,
        differenceMinor: -5000,
        byCategory: [{ categoryId: null, amountMinor: 5000, sharePercent: 100 }],
        previous: null,
      },
    ]);
  });

  it('compare avec le mois précédent seulement dans la même devise', () => {
    const report = monthlyReport(
      [
        tx({ amountMinor: 3000, date: '2026-10-05' }),
        tx({ amountMinor: 2000, date: '2026-09-20' }),
        tx({ type: 'income', amountMinor: 9000, date: '2026-09-01' }),
        tx({ currencyCode: 'XAF', amountMinor: 500, date: '2026-09-02' }),
      ],
      '2026-10',
    );
    expect(report).toHaveLength(1);
    expect(report[0]?.previous).toEqual({ incomeMinor: 9000, expenseMinor: 2000 });
  });

  it('gère le passage d’année et un mois sans activité', () => {
    const report = monthlyReport(
      [tx({ date: '2027-01-02' }), tx({ amountMinor: 400, date: '2026-12-31' })],
      '2027-01',
    );
    expect(report[0]?.previous).toEqual({ incomeMinor: 0, expenseMinor: 400 });
    expect(monthlyReport([], '2026-10')).toEqual([]);
  });

  it('un mois avec seulement des revenus n’a pas de répartition des dépenses', () => {
    const [eur] = monthlyReport([tx({ type: 'income', amountMinor: 100 })], '2026-10');
    expect(eur?.byCategory).toEqual([]);
    expect(eur?.differenceMinor).toBe(100);
  });
});
