import type { CurrencyCode } from './currencies';
import type { IsoTimestamp, LocalDate, LocalMonth } from './dates';
import type { MinorAmount } from './money';

/**
 * Modèle de données de Kolo (cahier des charges §7, décisions A1 à A13 du plan).
 * Chaque entité durable a un identifiant UUID créé sur l'appareil et des horodatages,
 * pour permettre plus tard une synchronisation sans changer les identifiants.
 */
export type Uuid = string;

export interface EntityBase {
  id: Uuid;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

export const ACCOUNT_TYPES = ['cash', 'checking', 'savings', 'mobile_wallet', 'other'] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

/** Endroit où l'utilisateur suit de l'argent (pas un compte bancaire connecté). */
export interface Account extends EntityBase {
  name: string;
  type: AccountType;
  currencyCode: CurrencyCode;
  /** Solde initial, jamais négatif en V1 (décision A2). Le solde actuel est toujours calculé. */
  openingBalanceMinor: MinorAmount;
  openingDate: LocalDate;
  archivedAt: IsoTimestamp | null;
}

export type CategoryKind = 'income' | 'expense';

export interface Category extends EntityBase {
  kind: CategoryKind;
  /** Clé de traduction pour une catégorie système (ex. "food"), sinon null. */
  systemKey: string | null;
  /** Nom choisi par l'utilisateur pour une catégorie personnelle, sinon null. */
  customName: string | null;
  icon: string | null;
  color: string | null;
  archivedAt: IsoTimestamp | null;
}

/**
 * Types d'opération réelle. « adjustment » est l'ajustement de solde explicite (décision A1).
 * « debt_settlement » et « adjustment » changent le solde sans compter comme revenu ou dépense.
 */
export const TRANSACTION_TYPES = [
  'income',
  'expense',
  'transfer',
  'debt_settlement',
  'adjustment',
] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

/** Sens d'un mouvement qui n'est ni revenu, ni dépense, ni transfert. */
export type Flow = 'in' | 'out';

export interface Transaction extends EntityBase {
  type: TransactionType;
  /** Toujours strictement positif ; le sens est porté par le type (et flow). */
  amountMinor: MinorAmount;
  currencyCode: CurrencyCode;
  /** Compte concerné (revenu, dépense, règlement de dette, ajustement). */
  accountId: Uuid | null;
  /** Comptes source et destination d'un transfert (même devise en V1). */
  fromAccountId: Uuid | null;
  toAccountId: Uuid | null;
  /** Sens pour debt_settlement et adjustment ; null pour les autres types. */
  flow: Flow | null;
  categoryId: Uuid | null;
  /** Liens d'origine, pour empêcher les doublons (cahier des charges §6.4). */
  linkedDebtId: Uuid | null;
  linkedDebtRepaymentId: Uuid | null;
  linkedPlannedExpenseId: Uuid | null;
  date: LocalDate;
  title: string;
  note: string;
}

/** Limite mensuelle reconduite chaque mois à partir de startMonth (décisions A4 à A6). */
export interface Budget extends EntityBase {
  periodType: 'month';
  startMonth: LocalMonth;
  currencyCode: CurrencyCode;
  limitMinor: MinorAmount;
  /** null = toutes les catégories de dépense (décision A5). */
  includedCategoryIds: Uuid[] | null;
}

export type DebtDirection = 'receivable' | 'payable';

export interface Debt extends EntityBase {
  direction: DebtDirection;
  contactLabel: string;
  originalAmountMinor: MinorAmount;
  currencyCode: CurrencyCode;
  createdDate: LocalDate;
  dueDate: LocalDate | null;
  note: string;
  /** Mouvement d'argent enregistré à la création de la dette, s'il y en a un (décision A3). */
  openingTransactionId: Uuid | null;
  archivedAt: IsoTimestamp | null;
}

export interface DebtRepayment extends EntityBase {
  debtId: Uuid;
  amountMinor: MinorAmount;
  date: LocalDate;
  note: string;
  linkedTransactionId: Uuid | null;
}

export type PlannedExpenseStatus = 'planned' | 'paid' | 'cancelled';

export interface PlannedExpense extends EntityBase {
  title: string;
  amountMinor: MinorAmount;
  currencyCode: CurrencyCode;
  dueDate: LocalDate;
  categoryId: Uuid | null;
  accountId: Uuid | null;
  note: string;
  status: PlannedExpenseStatus;
  linkedTransactionId: Uuid | null;
}

/** Objectif d'épargne suivi à la main : n'influence jamais un solde ni le budget. */
export interface SavingsGoal extends EntityBase {
  title: string;
  targetAmountMinor: MinorAmount;
  currentAmountMinor: MinorAmount;
  currencyCode: CurrencyCode;
  targetDate: LocalDate | null;
  note: string;
  archivedAt: IsoTimestamp | null;
}

export type ThemePreference = 'dark' | 'light' | 'system';

/** Préférences non financières. null = réglage automatique (appareil ou langue). */
export interface Preferences {
  id: 'preferences';
  language: 'fr' | 'en' | null;
  defaultCurrency: CurrencyCode | null;
  locale: string | null;
  firstDayOfWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7 | null;
  theme: ThemePreference;
  onboardingCompletedAt: IsoTimestamp | null;
  /** Dernière sauvegarde JSON téléchargée, pour un rappel discret (cahier des charges §9.3). */
  lastBackupAt: IsoTimestamp | null;
  updatedAt: IsoTimestamp | null;
}

export const DEFAULT_PREFERENCES: Preferences = {
  id: 'preferences',
  language: null,
  defaultCurrency: null,
  locale: null,
  firstDayOfWeek: null,
  theme: 'dark',
  onboardingCompletedAt: null,
  lastBackupAt: null,
  updatedAt: null,
};
