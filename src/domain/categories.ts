import type { CategoryKind } from './types';

/**
 * Catégories fournies par Kolo (cahier des charges §5.4). Leur nom est traduit à l'affichage
 * à partir de la clé ; l'utilisateur peut les archiver mais pas les renommer.
 */
export const SYSTEM_CATEGORIES: readonly { key: string; kind: CategoryKind }[] = [
  { key: 'housing', kind: 'expense' },
  { key: 'food', kind: 'expense' },
  { key: 'transport', kind: 'expense' },
  { key: 'health', kind: 'expense' },
  { key: 'education', kind: 'expense' },
  { key: 'bills', kind: 'expense' },
  { key: 'leisure', kind: 'expense' },
  { key: 'shopping', kind: 'expense' },
  { key: 'work', kind: 'expense' },
  { key: 'family', kind: 'expense' },
  { key: 'otherExpense', kind: 'expense' },
  { key: 'salary', kind: 'income' },
  { key: 'selfEmployment', kind: 'income' },
  { key: 'refund', kind: 'income' },
  { key: 'gift', kind: 'income' },
  { key: 'otherIncome', kind: 'income' },
];

/** Catégorie proposée par défaut pour une saisie rapide. */
export const DEFAULT_CATEGORY_KEY: Record<CategoryKind, string> = {
  expense: 'otherExpense',
  income: 'otherIncome',
};
