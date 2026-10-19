import { useRepositoryQuery, type QueryState } from '../../app/useRepositoryQuery';
import type {
  Account,
  Budget,
  Category,
  Debt,
  DebtRepayment,
  PlannedExpense,
  SavingsGoal,
  Transaction,
} from '../../domain/types';
import { sortCategories } from '../../services/categories';

export interface Ledger {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  debts: Debt[];
  debtRepayments: DebtRepayment[];
  plannedExpenses: PlannedExpense[];
  goals: SavingsGoal[];
}

/** Toutes les données de l'utilisateur, relues après chaque écriture. */
export function useLedger(): QueryState<Ledger> {
  return useRepositoryQuery(async (repos) => {
    const [
      accounts,
      categories,
      transactions,
      budgets,
      debts,
      debtRepayments,
      plannedExpenses,
      goals,
    ] = await Promise.all([
      repos.accounts.list(),
      repos.categories.list(),
      repos.transactions.list(),
      repos.budgets.list(),
      repos.debts.list(),
      repos.debtRepayments.list(),
      repos.plannedExpenses.list(),
      repos.goals.list(),
    ]);
    accounts.sort((a, b) => a.name.localeCompare(b.name));
    return {
      accounts,
      categories: sortCategories(categories),
      transactions,
      budgets,
      debts,
      debtRepayments,
      plannedExpenses,
      goals,
    };
  }, []);
}
