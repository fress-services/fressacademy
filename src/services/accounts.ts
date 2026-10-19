import { accountBalance, involvesAccount } from '../domain/balances';
import type { LocalDate } from '../domain/dates';
import type { MinorAmount } from '../domain/money';
import type { Account, Transaction } from '../domain/types';
import { hasErrors, validateAccount, type AccountField } from '../domain/validation';
import type { KoloRepositories } from '../data/repositories/types';
import { BusinessError, ValidationError } from './errors';

export type AccountInput = Pick<Account, AccountField>;

function clean(input: AccountInput): AccountInput {
  return { ...input, name: input.name.trim() };
}

export async function createAccount(
  repos: KoloRepositories,
  input: AccountInput,
): Promise<Account> {
  const errors = validateAccount(input);
  if (hasErrors(errors)) throw new ValidationError(errors);
  return repos.accounts.create({ ...clean(input), archivedAt: null });
}

async function transactionsOf(repos: KoloRepositories, accountId: string): Promise<Transaction[]> {
  return (await repos.transactions.list()).filter((transaction) =>
    involvesAccount(transaction, accountId),
  );
}

/** La devise ne peut plus changer dès qu'une opération utilise le compte (pas de conversion). */
export async function updateAccount(
  repos: KoloRepositories,
  id: string,
  input: AccountInput,
): Promise<Account> {
  const errors = validateAccount(input);
  if (hasErrors(errors)) throw new ValidationError(errors);
  return repos.runAtomic(async () => {
    const account = await repos.accounts.getById(id);
    if (!account) throw new BusinessError('notFound');
    if (
      account.currencyCode !== input.currencyCode &&
      (await transactionsOf(repos, id)).length > 0
    ) {
      throw new BusinessError('currencyLocked');
    }
    return repos.accounts.update(id, clean(input));
  });
}

export async function setAccountArchived(
  repos: KoloRepositories,
  id: string,
  archived: boolean,
  now: Date = new Date(),
): Promise<Account> {
  return repos.accounts.update(id, { archivedAt: archived ? now.toISOString() : null });
}

/** Vrai si le compte peut être supprimé définitivement (aucune donnée ne dépend de lui). */
export async function canDeleteAccount(repos: KoloRepositories, id: string): Promise<boolean> {
  if ((await transactionsOf(repos, id)).length > 0) return false;
  const planned = await repos.plannedExpenses.list();
  return !planned.some((expense) => expense.accountId === id);
}

/** Suppression définitive, refusée si des opérations utilisent le compte (décision A11). */
export async function deleteAccount(repos: KoloRepositories, id: string): Promise<void> {
  await repos.runAtomic(async () => {
    if (!(await canDeleteAccount(repos, id))) throw new BusinessError('accountInUse');
    await repos.accounts.remove(id);
  });
}

/**
 * Aligne le solde suivi sur le montant réellement constaté, en créant une opération
 * d'ajustement explicite et datée (décision A1), jamais en modifiant le solde initial.
 * Renvoie null si le solde est déjà juste.
 */
export async function adjustBalance(
  repos: KoloRepositories,
  input: { accountId: string; actualBalanceMinor: MinorAmount; date: LocalDate; title: string },
): Promise<Transaction | null> {
  if (!Number.isSafeInteger(input.actualBalanceMinor)) {
    throw new ValidationError({ actualBalanceMinor: 'invalid' });
  }
  return repos.runAtomic(async () => {
    const account = await repos.accounts.getById(input.accountId);
    if (!account) throw new BusinessError('notFound');
    const current = accountBalance(account, await repos.transactions.list());
    const difference = input.actualBalanceMinor - current;
    if (difference === 0) return null;
    return repos.transactions.create({
      type: 'adjustment',
      amountMinor: Math.abs(difference),
      currencyCode: account.currencyCode,
      accountId: account.id,
      fromAccountId: null,
      toAccountId: null,
      flow: difference > 0 ? 'in' : 'out',
      categoryId: null,
      linkedDebtId: null,
      linkedDebtRepaymentId: null,
      linkedPlannedExpenseId: null,
      date: input.date,
      title: input.title.trim(),
      note: '',
    });
  });
}
