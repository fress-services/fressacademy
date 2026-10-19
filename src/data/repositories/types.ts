import type {
  Account,
  Budget,
  Category,
  Debt,
  DebtRepayment,
  EntityBase,
  PlannedExpense,
  Preferences,
  SavingsGoal,
  Transaction,
  Uuid,
} from '../../domain/types';

/**
 * Contrats de lecture/écriture. Les écrans passent par ces interfaces et ne touchent jamais
 * IndexedDB directement (cahier des charges §8.3). Toutes les erreurs sont des StorageError.
 */

/** Données à fournir pour créer une entité : l'identifiant et les dates sont ajoutés. */
export type NewEntity<T extends EntityBase> = Omit<T, keyof EntityBase>;
export type EntityPatch<T extends EntityBase> = Partial<NewEntity<T>>;

export interface EntityRepository<T extends EntityBase> {
  getById(id: Uuid): Promise<T | undefined>;
  list(): Promise<T[]>;
  create(data: NewEntity<T>): Promise<T>;
  /** Modifie une entité existante ; StorageError « notFound » si elle n'existe pas. */
  update(id: Uuid, patch: EntityPatch<T>): Promise<T>;
  remove(id: Uuid): Promise<void>;
}

export interface PreferencesRepository {
  /** Préférences enregistrées, complétées par les valeurs par défaut. */
  get(): Promise<Preferences>;
  update(patch: Partial<Omit<Preferences, 'id' | 'updatedAt'>>): Promise<Preferences>;
}

export interface KoloRepositories {
  accounts: EntityRepository<Account>;
  categories: EntityRepository<Category>;
  transactions: EntityRepository<Transaction>;
  budgets: EntityRepository<Budget>;
  debts: EntityRepository<Debt>;
  debtRepayments: EntityRepository<DebtRepayment>;
  plannedExpenses: EntityRepository<PlannedExpense>;
  goals: EntityRepository<SavingsGoal>;
  preferences: PreferencesRepository;
  /**
   * Exécute plusieurs écritures comme une seule : soit tout est enregistré, soit rien
   * (paiement d'une dépense planifiée, remboursement lié à un compte, restauration…).
   */
  runAtomic<R>(work: () => Promise<R>): Promise<R>;
  /** Version du schéma de la base locale (pour les sauvegardes et migrations). */
  schemaVersion(): number;
}
