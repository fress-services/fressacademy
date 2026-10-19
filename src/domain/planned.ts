import { isCurrencyCode } from './currencies';
import { compareLocalDates, isLocalDate, type LocalDate } from './dates';
import type { PlannedExpense } from './types';
import { LIMITS, textError, type FieldErrors } from './validation';

/** Dépenses encore prévues, de la plus proche à la plus lointaine (§5.7). */
export function upcomingPlanned(planned: readonly PlannedExpense[]): PlannedExpense[] {
  return planned
    .filter((expense) => expense.status === 'planned')
    .sort((a, b) => compareLocalDates(a.dueDate, b.dueDate) || a.title.localeCompare(b.title));
}

export function isPlannedOverdue(expense: PlannedExpense, today: LocalDate): boolean {
  return expense.status === 'planned' && compareLocalDates(today, expense.dueDate) > 0;
}

export type PlannedField =
  'title' | 'amountMinor' | 'currencyCode' | 'dueDate' | 'categoryId' | 'accountId' | 'note';

export type PlannedInput = Pick<PlannedExpense, PlannedField>;

export function validatePlanned(input: PlannedInput): FieldErrors<PlannedField> {
  const errors: FieldErrors<PlannedField> = {};
  const title = textError(input.title, LIMITS.title, true);
  if (title) errors.title = title;
  if (!Number.isSafeInteger(input.amountMinor)) errors.amountMinor = 'invalid';
  else if (input.amountMinor <= 0) errors.amountMinor = 'notPositive';
  if (!isCurrencyCode(input.currencyCode)) errors.currencyCode = 'required';
  if (!isLocalDate(input.dueDate)) errors.dueDate = 'invalid';
  const note = textError(input.note, LIMITS.note, false);
  if (note) errors.note = note;
  return errors;
}
