import type { CurrencyCode } from './currencies';
import { addMonths, monthOf, type LocalMonth } from './dates';
import { sumMinor, type MinorAmount } from './money';
import type { Transaction, Uuid } from './types';

export interface CategorySpending {
  /** null : dépense sans catégorie. */
  categoryId: Uuid | null;
  amountMinor: MinorAmount;
  /** Part des dépenses du mois, en pourcentage arrondi (0 à 100). */
  sharePercent: number;
}

export interface MonthComparison {
  incomeMinor: MinorAmount;
  expenseMinor: MinorAmount;
}

export interface CurrencyReport {
  currencyCode: CurrencyCode;
  incomeMinor: MinorAmount;
  expenseMinor: MinorAmount;
  /** Revenus moins dépenses : peut être négatif. */
  differenceMinor: MinorAmount;
  byCategory: CategorySpending[];
  /** Mois précédent dans la même devise ; null s'il n'y a rien à comparer. */
  previous: MonthComparison | null;
}

function incomeAndExpenses(
  transactions: readonly Transaction[],
  month: LocalMonth,
): Map<CurrencyCode, Transaction[]> {
  const byCurrency = new Map<CurrencyCode, Transaction[]>();
  for (const transaction of transactions) {
    if (transaction.type !== 'income' && transaction.type !== 'expense') continue;
    if (monthOf(transaction.date) !== month) continue;
    const list = byCurrency.get(transaction.currencyCode) ?? [];
    list.push(transaction);
    byCurrency.set(transaction.currencyCode, list);
  }
  return byCurrency;
}

function total(transactions: readonly Transaction[], type: 'income' | 'expense'): MinorAmount {
  return sumMinor(transactions.filter((t) => t.type === type).map((t) => t.amountMinor));
}

/**
 * Rapport mensuel (cahier des charges §5.9) : une section par devise, jamais additionnées.
 * Seuls les revenus et dépenses réels comptent : transferts, ajustements et règlements de
 * dette sont exclus. La comparaison ne se fait qu'avec le mois précédent de la même devise.
 */
export function monthlyReport(
  transactions: readonly Transaction[],
  month: LocalMonth,
): CurrencyReport[] {
  const current = incomeAndExpenses(transactions, month);
  const previous = incomeAndExpenses(transactions, addMonths(month, -1));

  return [...current.entries()]
    .map(([currencyCode, list]) => {
      const incomeMinor = total(list, 'income');
      const expenseMinor = total(list, 'expense');

      const byCategoryMap = new Map<Uuid | null, MinorAmount[]>();
      for (const transaction of list) {
        if (transaction.type !== 'expense') continue;
        const amounts = byCategoryMap.get(transaction.categoryId) ?? [];
        amounts.push(transaction.amountMinor);
        byCategoryMap.set(transaction.categoryId, amounts);
      }
      const byCategory = [...byCategoryMap.entries()]
        .map(([categoryId, amounts]) => {
          const amountMinor = sumMinor(amounts);
          return {
            categoryId,
            amountMinor,
            sharePercent: expenseMinor > 0 ? Math.round((amountMinor / expenseMinor) * 100) : 0,
          };
        })
        .sort((a, b) => b.amountMinor - a.amountMinor);

      const before = previous.get(currencyCode);
      return {
        currencyCode,
        incomeMinor,
        expenseMinor,
        differenceMinor: incomeMinor - expenseMinor,
        byCategory,
        previous: before
          ? { incomeMinor: total(before, 'income'), expenseMinor: total(before, 'expense') }
          : null,
      };
    })
    .sort((a, b) => a.currencyCode.localeCompare(b.currencyCode));
}
