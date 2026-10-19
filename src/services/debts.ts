import type { CurrencyCode } from '../domain/currencies';
import {
  debtSummary,
  settlementFlow,
  validateDebt,
  validateRepayment,
  type DebtInput,
} from '../domain/debts';
import { isLocalDate, toLocalDate, type LocalDate } from '../domain/dates';
import type { MinorAmount } from '../domain/money';
import type { Debt, DebtRepayment, Flow, Transaction } from '../domain/types';
import { hasErrors } from '../domain/validation';
import type { KoloRepositories } from '../data/repositories/types';
import { BusinessError, ValidationError } from './errors';

/** Vérifie qu'un compte peut recevoir un règlement : actif et de la même devise (§5.6). */
export async function requireCompatibleAccount(
  repos: KoloRepositories,
  accountId: string,
  currencyCode: CurrencyCode,
): Promise<void> {
  const account = await repos.accounts.getById(accountId);
  if (!account) throw new ValidationError({ accountId: 'notFound' });
  if (account.archivedAt) throw new ValidationError({ accountId: 'archived' });
  if (account.currencyCode !== currencyCode) {
    throw new ValidationError({ accountId: 'currencyMismatch' });
  }
}

function settlement(
  debt: Debt,
  input: { accountId: string; amountMinor: MinorAmount; date: LocalDate; flow: Flow },
  repaymentId: string | null,
): Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    type: 'debt_settlement',
    amountMinor: input.amountMinor,
    currencyCode: debt.currencyCode,
    accountId: input.accountId,
    fromAccountId: null,
    toAccountId: null,
    flow: input.flow,
    categoryId: null,
    linkedDebtId: debt.id,
    linkedDebtRepaymentId: repaymentId,
    linkedPlannedExpenseId: null,
    date: input.date,
    title: debt.contactLabel,
    note: '',
  };
}

function clean(input: DebtInput): DebtInput {
  return { ...input, contactLabel: input.contactLabel.trim(), note: input.note.trim() };
}

/**
 * Crée une dette. Avec un compte (décision A3), le prêt ou l'emprunt est enregistré comme un
 * règlement de dette : il change le solde sans compter comme revenu, dépense ni budget.
 */
export async function createDebt(
  repos: KoloRepositories,
  input: DebtInput & { accountId: string | null },
): Promise<Debt> {
  const errors = validateDebt(input);
  if (hasErrors(errors)) throw new ValidationError(errors);
  const { accountId, ...data } = input;
  return repos.runAtomic(async () => {
    if (accountId) await requireCompatibleAccount(repos, accountId, input.currencyCode);
    const debt = await repos.debts.create({
      ...clean(data),
      openingTransactionId: null,
      archivedAt: null,
    });
    if (!accountId) return debt;
    const opening = await repos.transactions.create(
      settlement(
        debt,
        {
          accountId,
          amountMinor: debt.originalAmountMinor,
          date: debt.createdDate,
          flow: settlementFlow(debt.direction, 'opening'),
        },
        null,
      ),
    );
    return repos.debts.update(debt.id, { openingTransactionId: opening.id });
  });
}

async function repaymentsOf(repos: KoloRepositories, debtId: string): Promise<DebtRepayment[]> {
  return (await repos.debtRepayments.list()).filter((repayment) => repayment.debtId === debtId);
}

/**
 * Modifie une dette sans toucher à l'historique des remboursements. Le montant ne peut pas
 * descendre sous le total remboursé (décision A12) ; la devise est verrouillée dès qu'un
 * mouvement existe. Le mouvement d'ouverture suit le montant et la date.
 */
export async function updateDebt(
  repos: KoloRepositories,
  id: string,
  input: Omit<DebtInput, 'direction'>,
): Promise<Debt> {
  return repos.runAtomic(async () => {
    const debt = await repos.debts.getById(id);
    if (!debt) throw new BusinessError('notFound');
    const repayments = await repaymentsOf(repos, id);
    const summary = debtSummary(debt, repayments, toLocalDate(new Date()));
    const next = clean({ ...input, direction: debt.direction });
    const errors = validateDebt(next, summary.repaidMinor);
    if (hasErrors(errors)) throw new ValidationError(errors);
    if (
      next.currencyCode !== debt.currencyCode &&
      (repayments.length > 0 || debt.openingTransactionId)
    ) {
      throw new BusinessError('currencyLocked');
    }
    if (debt.openingTransactionId) {
      const opening = await repos.transactions.getById(debt.openingTransactionId);
      if (opening) {
        await repos.transactions.update(opening.id, {
          amountMinor: next.originalAmountMinor,
          date: next.createdDate,
          title: next.contactLabel,
        });
      }
    }
    return repos.debts.update(id, next);
  });
}

/** Supprime la dette, ses remboursements et les mouvements de compte qui leur sont liés. */
export async function deleteDebt(repos: KoloRepositories, id: string): Promise<void> {
  await repos.runAtomic(async () => {
    const debt = await repos.debts.getById(id);
    if (!debt) throw new BusinessError('notFound');
    for (const transaction of await repos.transactions.list()) {
      if (transaction.linkedDebtId === id) await repos.transactions.remove(transaction.id);
    }
    for (const repayment of await repaymentsOf(repos, id)) {
      await repos.debtRepayments.remove(repayment.id);
    }
    await repos.debts.remove(id);
  });
}

/**
 * Enregistre un remboursement, jamais supérieur au solde restant. Avec un compte, une seule
 * opération « règlement de dette » est créée et liée au remboursement.
 */
export async function addRepayment(
  repos: KoloRepositories,
  debtId: string,
  input: { amountMinor: MinorAmount; date: LocalDate; note: string; accountId: string | null },
): Promise<DebtRepayment> {
  return repos.runAtomic(async () => {
    const debt = await repos.debts.getById(debtId);
    if (!debt) throw new BusinessError('notFound');
    // Une date vide ne doit pas faire échouer le calcul du solde avant la vérification du champ.
    const asOf = isLocalDate(input.date) ? input.date : debt.createdDate;
    const summary = debtSummary(debt, await repaymentsOf(repos, debtId), asOf);
    const errors = validateRepayment(input, summary.remainingMinor);
    if (hasErrors(errors)) throw new ValidationError(errors);
    if (input.accountId) await requireCompatibleAccount(repos, input.accountId, debt.currencyCode);
    const repayment = await repos.debtRepayments.create({
      debtId,
      amountMinor: input.amountMinor,
      date: input.date,
      note: input.note.trim(),
      linkedTransactionId: null,
    });
    if (!input.accountId) return repayment;
    const transaction = await repos.transactions.create(
      settlement(
        debt,
        {
          accountId: input.accountId,
          amountMinor: input.amountMinor,
          date: input.date,
          flow: settlementFlow(debt.direction, 'repayment'),
        },
        repayment.id,
      ),
    );
    return repos.debtRepayments.update(repayment.id, { linkedTransactionId: transaction.id });
  });
}

/** Supprime un remboursement et son éventuel mouvement de compte. */
export async function deleteRepayment(repos: KoloRepositories, id: string): Promise<void> {
  await repos.runAtomic(async () => {
    const repayment = await repos.debtRepayments.getById(id);
    if (!repayment) throw new BusinessError('notFound');
    if (repayment.linkedTransactionId) {
      await repos.transactions.remove(repayment.linkedTransactionId);
    }
    await repos.debtRepayments.remove(id);
  });
}
