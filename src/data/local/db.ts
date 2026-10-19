import { Dexie, type Table } from 'dexie';
import type {
  Account,
  Budget,
  Category,
  Debt,
  DebtRepayment,
  PlannedExpense,
  Preferences,
  SavingsGoal,
  Transaction,
} from '../../domain/types';

export interface MetaRecord {
  key: 'install';
  createdAt: string;
  createdWithSchema: number;
}

export const DEFAULT_DATABASE_NAME = 'kolo';

/**
 * Base locale IndexedDB.
 *
 * Migrations : ne jamais modifier une version déjà publiée. Pour changer le schéma, ajouter
 * `this.version(n + 1).stores({...}).upgrade(tx => ...)` sous la dernière version, mettre à jour
 * SCHEMA_VERSION, et ajouter un test qui ouvre une base de la version précédente.
 * En cas d'échec d'une migration, Dexie annule la transaction : les données restent intactes.
 */
export const SCHEMA_VERSION = 1;

export class KoloDatabase extends Dexie {
  accounts!: Table<Account, string>;
  categories!: Table<Category, string>;
  transactions!: Table<Transaction, string>;
  budgets!: Table<Budget, string>;
  debts!: Table<Debt, string>;
  debtRepayments!: Table<DebtRepayment, string>;
  plannedExpenses!: Table<PlannedExpense, string>;
  goals!: Table<SavingsGoal, string>;
  preferences!: Table<Preferences, string>;
  meta!: Table<MetaRecord, string>;

  constructor(name: string = DEFAULT_DATABASE_NAME) {
    super(name);

    // Version 1 : seuls les champs indexés sont listés ; les autres sont stockés tels quels.
    this.version(1).stores({
      accounts: 'id, archivedAt',
      categories: 'id, kind, systemKey',
      transactions:
        'id, date, type, accountId, fromAccountId, toAccountId, categoryId, ' +
        'linkedDebtId, linkedDebtRepaymentId, linkedPlannedExpenseId',
      budgets: 'id, startMonth',
      debts: 'id, direction',
      debtRepayments: 'id, debtId, linkedTransactionId',
      plannedExpenses: 'id, dueDate, status',
      goals: 'id',
      preferences: 'id',
      meta: 'key',
    });

    this.on('populate', (tx) => {
      void tx.table('meta').add({
        key: 'install',
        createdAt: new Date().toISOString(),
        createdWithSchema: SCHEMA_VERSION,
      } satisfies MetaRecord);
    });
  }
}
