import { DEFAULT_CATEGORY_KEY } from '../domain/categories';
import { validatePlanned, type PlannedInput } from '../domain/planned';
import { isLocalDate, type LocalDate } from '../domain/dates';
import type { PlannedExpense, Transaction } from '../domain/types';
import { hasErrors } from '../domain/validation';
import type { KoloRepositories } from '../data/repositories/types';
import { requireCompatibleAccount } from './debts';
import { BusinessError, ValidationError } from './errors';

function clean(input: PlannedInput): PlannedInput {
  return { ...input, title: input.title.trim(), note: input.note.trim() };
}

async function checkReferences(repos: KoloRepositories, input: PlannedInput): Promise<void> {
  if (input.accountId) await requireCompatibleAccount(repos, input.accountId, input.currencyCode);
  if (input.categoryId) {
    const category = await repos.categories.getById(input.categoryId);
    if (!category) throw new ValidationError({ categoryId: 'notFound' });
    if (category.kind !== 'expense') throw new ValidationError({ categoryId: 'wrongKind' });
  }
}

/** Une dépense prévue ne change ni les soldes ni les statistiques avant d'être payée (§5.7). */
export async function createPlanned(
  repos: KoloRepositories,
  input: PlannedInput,
): Promise<PlannedExpense> {
  const errors = validatePlanned(input);
  if (hasErrors(errors)) throw new ValidationError(errors);
  return repos.runAtomic(async () => {
    await checkReferences(repos, input);
    return repos.plannedExpenses.create({
      ...clean(input),
      status: 'planned',
      linkedTransactionId: null,
    });
  });
}

/** Seule une dépense encore prévue se modifie ; une dépense payée se corrige via son opération. */
export async function updatePlanned(
  repos: KoloRepositories,
  id: string,
  input: PlannedInput,
): Promise<PlannedExpense> {
  const errors = validatePlanned(input);
  if (hasErrors(errors)) throw new ValidationError(errors);
  return repos.runAtomic(async () => {
    const current = await repos.plannedExpenses.getById(id);
    if (!current) throw new BusinessError('notFound');
    if (current.status === 'paid') throw new BusinessError('managedElsewhere');
    await checkReferences(repos, input);
    return repos.plannedExpenses.update(id, clean(input));
  });
}

export async function setPlannedCancelled(
  repos: KoloRepositories,
  id: string,
  cancelled: boolean,
): Promise<PlannedExpense> {
  return repos.runAtomic(async () => {
    const current = await repos.plannedExpenses.getById(id);
    if (!current) throw new BusinessError('notFound');
    if (current.status === 'paid') throw new BusinessError('managedElsewhere');
    return repos.plannedExpenses.update(id, { status: cancelled ? 'cancelled' : 'planned' });
  });
}

/** Supprime la dépense prévue ; une opération déjà créée reste dans l'historique. */
export async function deletePlanned(repos: KoloRepositories, id: string): Promise<void> {
  await repos.runAtomic(async () => {
    const current = await repos.plannedExpenses.getById(id);
    if (!current) throw new BusinessError('notFound');
    if (current.linkedTransactionId) {
      const transaction = await repos.transactions.getById(current.linkedTransactionId);
      if (transaction) {
        await repos.transactions.update(transaction.id, { linkedPlannedExpenseId: null });
      }
    }
    await repos.plannedExpenses.remove(id);
  });
}

/**
 * « Marquer comme payée » : crée UNE dépense réelle liée et passe la dépense prévue à « payée ».
 * Idempotent (§5.7) : relu dans la même transaction, un second appel renvoie l'opération déjà
 * créée au lieu d'en créer une autre (double clic, rafraîchissement).
 * Le compte est demandé à ce moment s'il n'était pas prévu (décision A9).
 */
export async function markPlannedPaid(
  repos: KoloRepositories,
  id: string,
  input: { accountId: string; date: LocalDate },
): Promise<Transaction> {
  if (!isLocalDate(input.date)) throw new ValidationError({ date: 'invalid' });
  return repos.runAtomic(async () => {
    const planned = await repos.plannedExpenses.getById(id);
    if (!planned) throw new BusinessError('notFound');
    if (planned.status === 'paid' && planned.linkedTransactionId) {
      const existing = await repos.transactions.getById(planned.linkedTransactionId);
      if (existing) return existing;
    }
    if (planned.status === 'cancelled') throw new BusinessError('managedElsewhere');
    if (!input.accountId) throw new ValidationError({ accountId: 'required' });
    await requireCompatibleAccount(repos, input.accountId, planned.currencyCode);
    let categoryId = planned.categoryId;
    if (!categoryId) {
      const categories = await repos.categories.list();
      categoryId =
        categories.find((category) => category.systemKey === DEFAULT_CATEGORY_KEY.expense)?.id ??
        null;
    }
    const transaction = await repos.transactions.create({
      type: 'expense',
      amountMinor: planned.amountMinor,
      currencyCode: planned.currencyCode,
      accountId: input.accountId,
      fromAccountId: null,
      toAccountId: null,
      flow: null,
      categoryId,
      linkedDebtId: null,
      linkedDebtRepaymentId: null,
      linkedPlannedExpenseId: planned.id,
      date: input.date,
      title: planned.title,
      note: planned.note,
    });
    await repos.plannedExpenses.update(id, { status: 'paid', linkedTransactionId: transaction.id });
    return transaction;
  });
}
