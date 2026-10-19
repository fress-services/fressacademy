import { useRepositoryQuery, type QueryState } from '../../app/useRepositoryQuery';
import type { Account, Category, Transaction } from '../../domain/types';
import { sortCategories } from '../../services/categories';

export interface Ledger {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
}

/** Comptes, catégories et opérations, relus après chaque écriture. */
export function useLedger(): QueryState<Ledger> {
  return useRepositoryQuery(async (repos) => {
    const [accounts, categories, transactions] = await Promise.all([
      repos.accounts.list(),
      repos.categories.list(),
      repos.transactions.list(),
    ]);
    accounts.sort((a, b) => a.name.localeCompare(b.name));
    return { accounts, categories: sortCategories(categories), transactions };
  }, []);
}
