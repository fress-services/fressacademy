import type { Transaction } from '../domain/types';
import {
  hasErrors,
  validateTransactionDraft,
  type TransactionDraft,
  type TransactionField,
} from '../domain/validation';
import type { NewEntity, KoloRepositories } from '../data/repositories/types';
import { BusinessError, ValidationError } from './errors';

/**
 * Enregistre un revenu, une dépense ou un transfert (création ou modification).
 * La devise vient toujours du compte : elle n'est jamais saisie (§5.3).
 */
export async function saveTransaction(
  repos: KoloRepositories,
  draft: TransactionDraft,
  existingId?: string,
): Promise<Transaction> {
  return repos.runAtomic(async () => {
    const [accounts, categories] = await Promise.all([
      repos.accounts.list(),
      repos.categories.list(),
    ]);
    const existing = existingId ? await repos.transactions.getById(existingId) : undefined;
    if (existingId && !existing) throw new BusinessError('notFound');
    if (existing && !isEditableHere(existing)) throw new BusinessError('managedElsewhere');

    const context = {
      accounts: new Map(accounts.map((account) => [account.id, account])),
      categories: new Map(categories.map((category) => [category.id, category])),
      ...(existing ? { existing } : {}),
    };
    const errors = validateTransactionDraft(draft, context);
    if (hasErrors(errors)) throw new ValidationError<TransactionField>(errors);

    const isTransfer = draft.type === 'transfer';
    const accountId = isTransfer ? draft.fromAccountId : draft.accountId;
    const account = context.accounts.get(accountId ?? '');
    if (!account) throw new BusinessError('notFound');

    const data: NewEntity<Transaction> = {
      type: draft.type,
      amountMinor: draft.amountMinor,
      currencyCode: account.currencyCode,
      accountId: isTransfer ? null : draft.accountId,
      fromAccountId: isTransfer ? draft.fromAccountId : null,
      toAccountId: isTransfer ? draft.toAccountId : null,
      flow: null,
      categoryId: isTransfer ? null : draft.categoryId,
      linkedDebtId: existing?.linkedDebtId ?? null,
      linkedDebtRepaymentId: existing?.linkedDebtRepaymentId ?? null,
      linkedPlannedExpenseId: existing?.linkedPlannedExpenseId ?? null,
      date: draft.date,
      title: draft.title.trim(),
      note: draft.note.trim(),
    };
    return existing
      ? repos.transactions.update(existing.id, data)
      : repos.transactions.create(data);
  });
}

/**
 * Les règlements de dette se gèrent depuis la dette (décision A8) ; les ajustements se
 * suppriment mais ne se modifient pas.
 */
export function isEditableHere(transaction: Transaction): boolean {
  return (
    transaction.type === 'income' ||
    transaction.type === 'expense' ||
    transaction.type === 'transfer'
  );
}

export function isDeletableHere(transaction: Transaction): boolean {
  return transaction.type !== 'debt_settlement';
}

export async function deleteTransaction(repos: KoloRepositories, id: string): Promise<void> {
  await repos.runAtomic(async () => {
    const transaction = await repos.transactions.getById(id);
    if (!transaction) throw new BusinessError('notFound');
    if (!isDeletableHere(transaction)) throw new BusinessError('managedElsewhere');
    await repos.transactions.remove(id);
  });
}

/** Ordre de l'activité : date la plus récente d'abord, puis saisie la plus récente. */
export function sortTransactions(transactions: readonly Transaction[]): Transaction[] {
  return [...transactions].sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
  );
}
