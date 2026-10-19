import { isCurrencyCode } from './currencies';
import { isLocalDate } from './dates';
import { ACCOUNT_TYPES, type Account, type Category, type Transaction } from './types';

/**
 * Règles de validation du domaine (cahier des charges §7.1) : appliquées par les services,
 * pas seulement par les formulaires. Chaque erreur est un code traduit par l'interface.
 */
export type ValidationCode =
  | 'required'
  | 'tooLong'
  | 'invalid'
  | 'notPositive'
  | 'negative'
  | 'sameAccount'
  | 'currencyMismatch'
  | 'archived'
  | 'wrongKind'
  | 'notFound';

export type FieldErrors<F extends string> = Partial<Record<F, ValidationCode>>;

export const LIMITS = {
  accountName: 60,
  categoryName: 40,
  title: 80,
  note: 500,
} as const;

function textError(value: string, max: number, required: boolean): ValidationCode | undefined {
  const trimmed = value.trim();
  if (required && trimmed === '') return 'required';
  if (trimmed.length > max) return 'tooLong';
  return undefined;
}

function compact<F extends string>(errors: Record<F, ValidationCode | undefined>): FieldErrors<F> {
  return Object.fromEntries(
    Object.entries(errors).filter(([, code]) => code !== undefined),
  ) as FieldErrors<F>;
}

export type AccountField = 'name' | 'type' | 'currencyCode' | 'openingBalanceMinor' | 'openingDate';

export function validateAccount(input: Pick<Account, AccountField>): FieldErrors<AccountField> {
  return compact({
    name: textError(input.name, LIMITS.accountName, true),
    type: (ACCOUNT_TYPES as readonly string[]).includes(input.type) ? undefined : 'invalid',
    currencyCode: isCurrencyCode(input.currencyCode) ? undefined : 'required',
    openingBalanceMinor: !Number.isSafeInteger(input.openingBalanceMinor)
      ? 'invalid'
      : input.openingBalanceMinor < 0
        ? 'negative'
        : undefined,
    openingDate: isLocalDate(input.openingDate) ? undefined : 'invalid',
  });
}

export function validateCategoryName(name: string): ValidationCode | undefined {
  return textError(name, LIMITS.categoryName, true);
}

export type TransactionField =
  | 'amountMinor'
  | 'accountId'
  | 'fromAccountId'
  | 'toAccountId'
  | 'categoryId'
  | 'date'
  | 'title'
  | 'note';

/** Ce que l'utilisateur saisit pour un revenu, une dépense ou un transfert. */
export interface TransactionDraft {
  type: 'income' | 'expense' | 'transfer';
  amountMinor: number;
  accountId: string | null;
  fromAccountId: string | null;
  toAccountId: string | null;
  categoryId: string | null;
  date: string;
  title: string;
  note: string;
}

export interface TransactionContext {
  accounts: ReadonlyMap<string, Account>;
  categories: ReadonlyMap<string, Category>;
  /** Opération en cours de modification : un compte archivé depuis reste alors accepté. */
  existing?: Transaction;
}

function accountError(
  id: string | null,
  context: TransactionContext,
  wasAlreadyUsed: boolean,
): ValidationCode | undefined {
  if (!id) return 'required';
  const account = context.accounts.get(id);
  if (!account) return 'notFound';
  if (account.archivedAt && !wasAlreadyUsed) return 'archived';
  return undefined;
}

export function validateTransactionDraft(
  draft: TransactionDraft,
  context: TransactionContext,
): FieldErrors<TransactionField> {
  const previous = context.existing;
  const amountMinor = !Number.isSafeInteger(draft.amountMinor)
    ? 'invalid'
    : draft.amountMinor <= 0
      ? 'notPositive'
      : undefined;
  const base = {
    amountMinor,
    date: isLocalDate(draft.date) ? undefined : 'invalid',
    title: textError(draft.title, LIMITS.title, false),
    note: textError(draft.note, LIMITS.note, false),
  } as const;

  if (draft.type === 'transfer') {
    const fromError = accountError(
      draft.fromAccountId,
      context,
      previous?.fromAccountId === draft.fromAccountId,
    );
    const toError = accountError(
      draft.toAccountId,
      context,
      previous?.toAccountId === draft.toAccountId,
    );
    let toAccountId = toError;
    if (!fromError && !toError) {
      const from = context.accounts.get(draft.fromAccountId ?? '');
      const to = context.accounts.get(draft.toAccountId ?? '');
      if (draft.fromAccountId === draft.toAccountId) toAccountId = 'sameAccount';
      else if (from && to && from.currencyCode !== to.currencyCode)
        toAccountId = 'currencyMismatch';
    }
    return compact({
      ...base,
      fromAccountId: fromError,
      toAccountId,
      accountId: undefined,
      categoryId: undefined,
    });
  }

  let categoryId: ValidationCode | undefined;
  if (!draft.categoryId) categoryId = 'required';
  else {
    const category = context.categories.get(draft.categoryId);
    if (!category) categoryId = 'notFound';
    else if (category.kind !== draft.type) categoryId = 'wrongKind';
    else if (category.archivedAt && previous?.categoryId !== draft.categoryId)
      categoryId = 'archived';
  }
  return compact({
    ...base,
    accountId: accountError(draft.accountId, context, previous?.accountId === draft.accountId),
    categoryId,
    fromAccountId: undefined,
    toAccountId: undefined,
  });
}

export function hasErrors(errors: object): boolean {
  return Object.keys(errors).length > 0;
}
