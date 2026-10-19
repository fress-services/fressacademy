import type { CurrencyCode } from './currencies';
import type { LocalDate } from './dates';
import type { Transaction, TransactionType, Uuid } from './types';

/**
 * Recherche et filtres (cahier des charges §5.9). Tout se fait sur l'appareil : le texte
 * recherché n'est jamais envoyé ailleurs.
 */

/** Minuscules et sans accents, pour que « cafe » trouve « Café ». */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('en')
    .trim();
}

/** Vrai si chaque mot de la recherche apparaît dans au moins un des textes. */
export function matchesQuery(query: string, texts: readonly string[]): boolean {
  const words = normalizeText(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = texts.map(normalizeText).join('\n');
  return words.every((word) => haystack.includes(word));
}

export interface TransactionFilters {
  query: string;
  type: TransactionType | null;
  /** Compte concerné, y compris comme source ou destination d'un transfert. */
  accountId: Uuid | null;
  categoryId: Uuid | null;
  currencyCode: CurrencyCode | null;
  from: LocalDate | null;
  to: LocalDate | null;
}

export const NO_FILTERS: TransactionFilters = {
  query: '',
  type: null,
  accountId: null,
  categoryId: null,
  currencyCode: null,
  from: null,
  to: null,
};

export function countActiveFilters(filters: TransactionFilters): number {
  return [
    filters.type,
    filters.accountId,
    filters.categoryId,
    filters.currencyCode,
    filters.from,
    filters.to,
  ].filter((value) => value !== null).length;
}

/**
 * Opérations qui respectent tous les filtres. La recherche porte sur le libellé, la note et
 * les textes affichés en plus (nom de catégorie…) fournis par `extraTexts`.
 */
export function filterTransactions(
  transactions: readonly Transaction[],
  filters: TransactionFilters,
  extraTexts: (transaction: Transaction) => readonly string[] = () => [],
): Transaction[] {
  return transactions.filter((transaction) => {
    if (filters.type && transaction.type !== filters.type) return false;
    if (
      filters.accountId &&
      transaction.accountId !== filters.accountId &&
      transaction.fromAccountId !== filters.accountId &&
      transaction.toAccountId !== filters.accountId
    ) {
      return false;
    }
    if (filters.categoryId && transaction.categoryId !== filters.categoryId) return false;
    if (filters.currencyCode && transaction.currencyCode !== filters.currencyCode) return false;
    // Les dates « AAAA-MM-JJ » se comparent dans l'ordre alphabétique.
    if (filters.from && transaction.date < filters.from) return false;
    if (filters.to && transaction.date > filters.to) return false;
    return matchesQuery(filters.query, [
      transaction.title,
      transaction.note,
      ...extraTexts(transaction),
    ]);
  });
}
