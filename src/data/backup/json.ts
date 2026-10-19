import { isCurrencyCode } from '../../domain/currencies';
import { isLocalDate, isLocalMonth } from '../../domain/dates';
import {
  ACCOUNT_TYPES,
  DEFAULT_PREFERENCES,
  TRANSACTION_TYPES,
  type Account,
  type Preferences,
} from '../../domain/types';
import type { DataSnapshot } from '../repositories/types';

/**
 * Sauvegarde JSON complète et versionnée (cahier des charges §5.11 et §9.3).
 *
 * Le fichier est entièrement lu et vérifié avant toute écriture : format, version, type de
 * chaque champ et liens entre les objets. Un fichier refusé n'écrase jamais rien. Les messages
 * d'erreur ne citent aucun contenu du fichier.
 */

export const BACKUP_FORMAT = 'kolo-backup';
export const BACKUP_FORMAT_VERSION = 1;
/** Taille maximale acceptée à la restauration (20 Mo, bien au-delà d'un usage personnel). */
export const MAX_BACKUP_BYTES = 20 * 1024 * 1024;

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  formatVersion: number;
  schemaVersion: number;
  appVersion: string;
  createdAt: string;
  data: DataSnapshot;
}

export type BackupErrorCode = 'tooLarge' | 'malformed' | 'notKolo' | 'newerVersion' | 'invalid';

export type BackupCounts = Record<Exclude<keyof DataSnapshot, 'preferences'>, number>;

export type ParsedBackup =
  | { ok: true; createdAt: string; data: DataSnapshot; counts: BackupCounts }
  | { ok: false; error: BackupErrorCode };

export function createBackup(
  data: DataSnapshot,
  meta: { schemaVersion: number; appVersion: string; createdAt: string },
): BackupFile {
  return { format: BACKUP_FORMAT, formatVersion: BACKUP_FORMAT_VERSION, ...meta, data };
}

export function serializeBackup(backup: BackupFile): string {
  return JSON.stringify(backup, null, 2);
}

export function backupFileName(createdAt: string): string {
  return `kolo-sauvegarde-${createdAt.slice(0, 10)}.json`;
}

export function countRecords(data: DataSnapshot): BackupCounts {
  return {
    accounts: data.accounts.length,
    categories: data.categories.length,
    transactions: data.transactions.length,
    budgets: data.budgets.length,
    debts: data.debts.length,
    debtRepayments: data.debtRepayments.length,
    plannedExpenses: data.plannedExpenses.length,
    goals: data.goals.length,
  };
}

// --- Vérification des champs -------------------------------------------------------------

class InvalidBackup extends Error {}

type Check = (value: unknown) => boolean;

const isString: Check = (value) => typeof value === 'string';
const isId: Check = (value) => typeof value === 'string' && value.length > 0;
const isTimestamp: Check = (value) => typeof value === 'string' && !Number.isNaN(Date.parse(value));
const isDate: Check = (value) => typeof value === 'string' && isLocalDate(value);
const isCurrency: Check = (value) => typeof value === 'string' && isCurrencyCode(value);
const isPositive: Check = (value) => Number.isSafeInteger(value) && (value as number) > 0;
const isNonNegative: Check = (value) => Number.isSafeInteger(value) && (value as number) >= 0;
const oneOf =
  (values: readonly unknown[]): Check =>
  (value) =>
    values.includes(value);
const orNull =
  (check: Check): Check =>
  (value) =>
    value === null || check(value);

type Shape = Record<string, Check>;

const BASE: Shape = { id: isId, createdAt: isTimestamp, updatedAt: isTimestamp };

const SHAPES: Record<Exclude<keyof DataSnapshot, 'preferences'>, Shape> = {
  accounts: {
    name: isString,
    type: oneOf(ACCOUNT_TYPES),
    currencyCode: isCurrency,
    openingBalanceMinor: isNonNegative,
    openingDate: isDate,
    archivedAt: orNull(isTimestamp),
  },
  categories: {
    kind: oneOf(['income', 'expense']),
    systemKey: orNull(isString),
    customName: orNull(isString),
    icon: orNull(isString),
    color: orNull(isString),
    archivedAt: orNull(isTimestamp),
  },
  transactions: {
    type: oneOf(TRANSACTION_TYPES),
    amountMinor: isPositive,
    currencyCode: isCurrency,
    accountId: orNull(isId),
    fromAccountId: orNull(isId),
    toAccountId: orNull(isId),
    flow: oneOf([null, 'in', 'out']),
    categoryId: orNull(isId),
    linkedDebtId: orNull(isId),
    linkedDebtRepaymentId: orNull(isId),
    linkedPlannedExpenseId: orNull(isId),
    date: isDate,
    title: isString,
    note: isString,
  },
  budgets: {
    periodType: oneOf(['month']),
    startMonth: (value) => typeof value === 'string' && isLocalMonth(value),
    currencyCode: isCurrency,
    limitMinor: isPositive,
    includedCategoryIds: (value) =>
      value === null || (Array.isArray(value) && value.every((id) => isId(id))),
  },
  debts: {
    direction: oneOf(['receivable', 'payable']),
    contactLabel: isString,
    originalAmountMinor: isPositive,
    currencyCode: isCurrency,
    createdDate: isDate,
    dueDate: orNull(isDate),
    note: isString,
    openingTransactionId: orNull(isId),
    archivedAt: orNull(isTimestamp),
  },
  debtRepayments: {
    debtId: isId,
    amountMinor: isPositive,
    date: isDate,
    note: isString,
    linkedTransactionId: orNull(isId),
  },
  plannedExpenses: {
    title: isString,
    amountMinor: isPositive,
    currencyCode: isCurrency,
    dueDate: isDate,
    categoryId: orNull(isId),
    accountId: orNull(isId),
    note: isString,
    status: oneOf(['planned', 'paid', 'cancelled']),
    linkedTransactionId: orNull(isId),
  },
  goals: {
    title: isString,
    targetAmountMinor: isPositive,
    currentAmountMinor: isNonNegative,
    currencyCode: isCurrency,
    targetDate: orNull(isDate),
    note: isString,
    archivedAt: orNull(isTimestamp),
  },
};

/** Préférences : un champ absent reçoit sa valeur par défaut. */
const PREFERENCE_SHAPE: Record<Exclude<keyof Preferences, 'id'>, Check> = {
  language: oneOf([null, 'fr', 'en']),
  defaultCurrency: orNull(isCurrency),
  locale: orNull(isString),
  firstDayOfWeek: oneOf([null, 1, 2, 3, 4, 5, 6, 7]),
  theme: oneOf(['dark', 'light', 'system']),
  onboardingCompletedAt: orNull(isTimestamp),
  lastBackupAt: orNull(isTimestamp),
  updatedAt: orNull(isTimestamp),
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Copie seulement les champs connus, après vérification : un champ inconnu est ignoré. */
function readEntity(value: unknown, shape: Shape): Record<string, unknown> {
  if (!isRecord(value)) throw new InvalidBackup();
  const entity: Record<string, unknown> = {};
  for (const [field, check] of Object.entries({ ...BASE, ...shape })) {
    if (!check(value[field])) throw new InvalidBackup();
    entity[field] = value[field];
  }
  return entity;
}

function readPreferences(value: unknown): Preferences {
  if (!isRecord(value)) throw new InvalidBackup();
  const preferences: Record<string, unknown> = { ...DEFAULT_PREFERENCES };
  for (const [field, check] of Object.entries(PREFERENCE_SHAPE)) {
    if (!(field in value)) continue;
    if (!check(value[field])) throw new InvalidBackup();
    preferences[field] = value[field];
  }
  return { ...(preferences as unknown as Preferences), id: 'preferences' };
}

function readData(value: unknown): DataSnapshot {
  if (!isRecord(value)) throw new InvalidBackup();
  const data: Record<string, unknown> = { preferences: readPreferences(value.preferences) };
  for (const [collection, shape] of Object.entries(SHAPES)) {
    const list = value[collection];
    if (!Array.isArray(list)) throw new InvalidBackup();
    data[collection] = list.map((item) => readEntity(item, shape));
  }
  const snapshot = data as unknown as DataSnapshot;
  checkLinks(snapshot);
  return snapshot;
}

/** Les identifiants sont uniques et chaque lien pointe vers un objet présent dans le fichier. */
function checkLinks(data: DataSnapshot): void {
  const ids = <T extends { id: string }>(list: readonly T[]) => {
    const set = new Set(list.map((item) => item.id));
    if (set.size !== list.length) throw new InvalidBackup();
    return set;
  };
  const accounts = new Map<string, Account>(data.accounts.map((a) => [a.id, a]));
  ids(data.accounts);
  const categories = ids(data.categories);
  const transactions = ids(data.transactions);
  ids(data.budgets);
  const debts = ids(data.debts);
  const repayments = ids(data.debtRepayments);
  const planned = ids(data.plannedExpenses);
  ids(data.goals);

  const exists = (set: { has(id: string): boolean }, id: string | null) =>
    id === null || set.has(id);
  const require = (condition: boolean) => {
    if (!condition) throw new InvalidBackup();
  };
  const sameCurrency = (accountId: string | null, currency: string) =>
    accountId === null || accounts.get(accountId)?.currencyCode === currency;

  for (const t of data.transactions) {
    require(exists(accounts, t.accountId) && sameCurrency(t.accountId, t.currencyCode));
    require(exists(accounts, t.fromAccountId) && sameCurrency(t.fromAccountId, t.currencyCode));
    require(exists(accounts, t.toAccountId) && sameCurrency(t.toAccountId, t.currencyCode));
    require(exists(categories, t.categoryId));
    require(exists(debts, t.linkedDebtId));
    require(exists(repayments, t.linkedDebtRepaymentId));
    require(exists(planned, t.linkedPlannedExpenseId));
  }
  for (const b of data.budgets) {
    require((b.includedCategoryIds ?? []).every((id) => categories.has(id)));
  }
  for (const d of data.debts) require(exists(transactions, d.openingTransactionId));
  for (const r of data.debtRepayments) {
    require(debts.has(r.debtId));
    require(exists(transactions, r.linkedTransactionId));
  }
  for (const p of data.plannedExpenses) {
    require(exists(categories, p.categoryId));
    require(exists(accounts, p.accountId));
    require(exists(transactions, p.linkedTransactionId));
  }
}

/**
 * Lit et vérifie un fichier de sauvegarde. `schemaVersion` est la version de la base locale :
 * un fichier créé par une version plus récente de Kolo est refusé.
 */
export function parseBackup(text: string, schemaVersion: number): ParsedBackup {
  if (text.length > MAX_BACKUP_BYTES) return { ok: false, error: 'tooLarge' };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'malformed' };
  }
  if (!isRecord(raw) || raw.format !== BACKUP_FORMAT) return { ok: false, error: 'notKolo' };
  if (!Number.isSafeInteger(raw.formatVersion) || !Number.isSafeInteger(raw.schemaVersion)) {
    return { ok: false, error: 'invalid' };
  }
  if (
    (raw.formatVersion as number) > BACKUP_FORMAT_VERSION ||
    (raw.schemaVersion as number) > schemaVersion
  ) {
    return { ok: false, error: 'newerVersion' };
  }
  if ((raw.formatVersion as number) < 1 || (raw.schemaVersion as number) < 1) {
    return { ok: false, error: 'invalid' };
  }
  if (!isTimestamp(raw.createdAt)) return { ok: false, error: 'invalid' };
  try {
    const data = readData(raw.data);
    return { ok: true, createdAt: raw.createdAt as string, data, counts: countRecords(data) };
  } catch (error) {
    if (error instanceof InvalidBackup) return { ok: false, error: 'invalid' };
    throw error;
  }
}
