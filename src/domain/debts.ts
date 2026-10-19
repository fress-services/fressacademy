import { isCurrencyCode } from './currencies';
import { compareLocalDates, isLocalDate, type LocalDate } from './dates';
import { sumMinor, type MinorAmount } from './money';
import type { Debt, DebtDirection, DebtRepayment, Flow } from './types';
import { LIMITS, textError, type FieldErrors } from './validation';

/** Statut calculé (§5.6) : jamais saisi à la main. */
export type DebtStatus = 'open' | 'partial' | 'settled';

export interface DebtSummary {
  repaidMinor: MinorAmount;
  remainingMinor: MinorAmount;
  status: DebtStatus;
  /** Étiquette dérivée : échéance passée et solde restant non nul. */
  overdue: boolean;
}

export function debtSummary(
  debt: Debt,
  repayments: readonly DebtRepayment[],
  today: LocalDate,
): DebtSummary {
  const repaidMinor = sumMinor(
    repayments.filter((repayment) => repayment.debtId === debt.id).map((r) => r.amountMinor),
  );
  const remainingMinor = Math.max(0, debt.originalAmountMinor - repaidMinor);
  const status: DebtStatus =
    remainingMinor === 0 ? 'settled' : repaidMinor > 0 ? 'partial' : 'open';
  const overdue =
    remainingMinor > 0 && debt.dueDate !== null && compareLocalDates(today, debt.dueDate) > 0;
  return { repaidMinor, remainingMinor, status, overdue };
}

/**
 * Sens du mouvement d'argent sur le compte choisi :
 * je prête (à récupérer) → l'argent sort, puis revient à chaque remboursement ;
 * j'emprunte (à rembourser) → l'argent entre, puis sort à chaque remboursement.
 */
export function settlementFlow(direction: DebtDirection, kind: 'opening' | 'repayment'): Flow {
  const out = (direction === 'receivable') === (kind === 'opening');
  return out ? 'out' : 'in';
}

export type DebtField =
  'contactLabel' | 'originalAmountMinor' | 'currencyCode' | 'createdDate' | 'dueDate' | 'note';

export type DebtInput = Pick<Debt, 'direction' | DebtField>;

export function validateDebt(input: DebtInput, repaidMinor = 0): FieldErrors<DebtField> {
  const errors: FieldErrors<DebtField> = {};
  const contact = textError(input.contactLabel, LIMITS.contactLabel, true);
  if (contact) errors.contactLabel = contact;
  if (!Number.isSafeInteger(input.originalAmountMinor)) errors.originalAmountMinor = 'invalid';
  else if (input.originalAmountMinor <= 0) errors.originalAmountMinor = 'notPositive';
  else if (input.originalAmountMinor < repaidMinor) errors.originalAmountMinor = 'belowRepaid';
  if (!isCurrencyCode(input.currencyCode)) errors.currencyCode = 'required';
  if (!isLocalDate(input.createdDate)) errors.createdDate = 'invalid';
  if (input.dueDate !== null && !isLocalDate(input.dueDate)) errors.dueDate = 'invalid';
  const note = textError(input.note, LIMITS.note, false);
  if (note) errors.note = note;
  return errors;
}

export type RepaymentField = 'amountMinor' | 'date' | 'note';

/** Un remboursement est strictement positif et ne dépasse jamais le solde restant (§5.6). */
export function validateRepayment(
  input: Pick<DebtRepayment, RepaymentField>,
  remainingMinor: MinorAmount,
): FieldErrors<RepaymentField> {
  const errors: FieldErrors<RepaymentField> = {};
  if (!Number.isSafeInteger(input.amountMinor)) errors.amountMinor = 'invalid';
  else if (input.amountMinor <= 0) errors.amountMinor = 'notPositive';
  else if (input.amountMinor > remainingMinor) errors.amountMinor = 'exceedsRemaining';
  if (!isLocalDate(input.date)) errors.date = 'invalid';
  const note = textError(input.note, LIMITS.note, false);
  if (note) errors.note = note;
  return errors;
}
