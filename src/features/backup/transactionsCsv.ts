import { protectFormula, toCsv } from '../../data/backup/csv';
import { toDecimalString } from '../../domain/money';
import type { Account, Category, Transaction } from '../../domain/types';
import type { MessageKey, MessageParams } from '../../i18n/translate';
import { sortTransactions } from '../../services/transactions';
import { categoryLabel } from '../shared/labels';
import { direction } from '../transactions/display';

type T = (key: MessageKey, params?: MessageParams) => string;

/**
 * Toutes les opérations en CSV (§5.11), de la plus ancienne à la plus récente.
 * Le montant est signé (négatif pour une sortie d'argent, positif pour un transfert) avec un
 * point décimal, pour pouvoir additionner une colonne dans n'importe quel tableur.
 */
export function transactionsCsv(
  transactions: readonly Transaction[],
  accounts: readonly Account[],
  categories: readonly Category[],
  t: T,
): string {
  const accountName = new Map(accounts.map((account) => [account.id, account.name]));
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const name = (id: string | null) => protectFormula(accountName.get(id ?? '') ?? '');

  const rows = sortTransactions(transactions)
    .reverse()
    .map((transaction) => {
      const sign = direction(transaction) === -1 ? -1 : 1;
      return [
        transaction.id,
        transaction.date,
        t(`transactionTypes.${transaction.type}`),
        toDecimalString(sign * transaction.amountMinor, transaction.currencyCode),
        transaction.currencyCode,
        name(transaction.accountId),
        name(transaction.fromAccountId),
        name(transaction.toAccountId),
        protectFormula(categoryLabel(categoryById.get(transaction.categoryId ?? ''), t)),
        protectFormula(transaction.title),
        protectFormula(transaction.note),
      ];
    });

  const header = (
    [
      'id',
      'date',
      'type',
      'amount',
      'currency',
      'account',
      'fromAccount',
      'toAccount',
      'category',
      'title',
      'note',
    ] as const
  ).map((column) => t(`csv.${column}`));
  return toCsv(header, rows);
}
