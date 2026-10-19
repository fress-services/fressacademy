import { isCurrencyCode } from './currencies';
import { isLocalDate } from './dates';
import type { MinorAmount } from './money';
import type { SavingsGoal } from './types';
import { LIMITS, textError, type FieldErrors } from './validation';

export interface GoalProgress {
  /** Pourcentage entier borné de 0 à 100 (§5.8). */
  percent: number;
  remainingMinor: MinorAmount;
  reached: boolean;
}

export function goalProgress(goal: SavingsGoal): GoalProgress {
  const ratio = goal.targetAmountMinor > 0 ? goal.currentAmountMinor / goal.targetAmountMinor : 0;
  return {
    percent: Math.min(100, Math.max(0, Math.floor(ratio * 100))),
    remainingMinor: Math.max(0, goal.targetAmountMinor - goal.currentAmountMinor),
    reached: goal.currentAmountMinor >= goal.targetAmountMinor,
  };
}

export type GoalField =
  'title' | 'targetAmountMinor' | 'currentAmountMinor' | 'currencyCode' | 'targetDate' | 'note';

export type GoalInput = Pick<SavingsGoal, GoalField>;

export function validateGoal(input: GoalInput): FieldErrors<GoalField> {
  const errors: FieldErrors<GoalField> = {};
  const title = textError(input.title, LIMITS.goalName, true);
  if (title) errors.title = title;
  if (!Number.isSafeInteger(input.targetAmountMinor)) errors.targetAmountMinor = 'invalid';
  else if (input.targetAmountMinor <= 0) errors.targetAmountMinor = 'notPositive';
  if (!Number.isSafeInteger(input.currentAmountMinor)) errors.currentAmountMinor = 'invalid';
  else if (input.currentAmountMinor < 0) errors.currentAmountMinor = 'negative';
  if (!isCurrencyCode(input.currencyCode)) errors.currencyCode = 'required';
  if (input.targetDate !== null && !isLocalDate(input.targetDate)) errors.targetDate = 'invalid';
  const note = textError(input.note, LIMITS.note, false);
  if (note) errors.note = note;
  return errors;
}
