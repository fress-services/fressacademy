import type { CurrencyCode } from './currencies';
import { daysRemainingInMonth, monthOf, type LocalDate, type LocalMonth } from './dates';
import { sumMinor, type MinorAmount } from './money';
import type { Budget, Transaction } from './types';

/**
 * Budget applicable à un mois : la limite la plus récente qui a commencé ce mois-ci ou avant.
 * Une limite est reconduite chaque mois jusqu'à ce qu'une nouvelle la remplace (décision A4).
 */
export function budgetForMonth(budgets: readonly Budget[], month: LocalMonth): Budget | null {
  let found: Budget | null = null;
  for (const budget of budgets) {
    if (budget.startMonth > month) continue;
    if (!found || budget.startMonth > found.startMonth) found = budget;
  }
  return found;
}

/** Une dépense compte dans le budget si sa catégorie est incluse (null = toutes, décision A5). */
function countsInBudget(transaction: Transaction, budget: Budget): boolean {
  if (budget.includedCategoryIds === null) return true;
  return (
    transaction.categoryId !== null && budget.includedCategoryIds.includes(transaction.categoryId)
  );
}

export interface BudgetStatus {
  limitMinor: MinorAmount;
  currencyCode: CurrencyCode;
  /** Dépenses du mois, dans la devise du budget, des catégories incluses (§5.5). */
  spentMinor: MinorAmount;
  /** Négatif si le budget est dépassé : le dépassement n'est jamais caché. */
  remainingMinor: MinorAmount;
  /** Jours calendaires jusqu'à la fin du mois, aujourd'hui inclus. */
  daysRemaining: number;
  /** Montant par jour, arrondi vers le bas à l'unité mineure ; zéro si le budget est dépassé. */
  dailyAllowanceMinor: MinorAmount;
  overBudget: boolean;
  /** Dépenses du mois dans une autre devise : non comptées et signalées (décision A6). */
  otherCurrencyCount: number;
}

/**
 * État du budget pour le mois de `today` (date locale de l'appareil).
 * Seules les opérations de type « expense » comptent : revenus, transferts, ajustements et
 * règlements de dette ne sont jamais ajoutés ni soustraits (§5.5).
 */
export function budgetStatus(
  budget: Budget,
  transactions: readonly Transaction[],
  today: LocalDate,
): BudgetStatus {
  const month = monthOf(today);
  const expenses = transactions.filter(
    (transaction) => transaction.type === 'expense' && monthOf(transaction.date) === month,
  );
  const counted = expenses.filter(
    (transaction) =>
      transaction.currencyCode === budget.currencyCode && countsInBudget(transaction, budget),
  );
  const spentMinor = sumMinor(counted.map((transaction) => transaction.amountMinor));
  const remainingMinor = budget.limitMinor - spentMinor;
  const daysRemaining = daysRemainingInMonth(today);
  return {
    limitMinor: budget.limitMinor,
    currencyCode: budget.currencyCode,
    spentMinor,
    remainingMinor,
    daysRemaining,
    dailyAllowanceMinor: remainingMinor > 0 ? Math.floor(remainingMinor / daysRemaining) : 0,
    overBudget: remainingMinor < 0,
    otherCurrencyCount: expenses.filter(
      (transaction) => transaction.currencyCode !== budget.currencyCode,
    ).length,
  };
}

export interface MonthTotals {
  currencyCode: CurrencyCode;
  incomeMinor: MinorAmount;
  expenseMinor: MinorAmount;
}

/**
 * Revenus et dépenses réels d'un mois, par devise (jamais additionnés entre devises).
 * Les transferts, ajustements et règlements de dette ne sont ni des revenus ni des dépenses.
 */
export function monthTotals(
  transactions: readonly Transaction[],
  month: LocalMonth,
): MonthTotals[] {
  const totals = new Map<CurrencyCode, { income: MinorAmount[]; expense: MinorAmount[] }>();
  for (const transaction of transactions) {
    if (transaction.type !== 'income' && transaction.type !== 'expense') continue;
    if (monthOf(transaction.date) !== month) continue;
    const entry = totals.get(transaction.currencyCode) ?? { income: [], expense: [] };
    entry[transaction.type].push(transaction.amountMinor);
    totals.set(transaction.currencyCode, entry);
  }
  return [...totals.entries()]
    .map(([currencyCode, entry]) => ({
      currencyCode,
      incomeMinor: sumMinor(entry.income),
      expenseMinor: sumMinor(entry.expense),
    }))
    .sort((a, b) => a.currencyCode.localeCompare(b.currencyCode));
}
