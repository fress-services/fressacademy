import { isCurrencyCode, type CurrencyCode } from '../domain/currencies';
import { isLocalMonth, type LocalMonth } from '../domain/dates';
import type { MinorAmount } from '../domain/money';
import type { Budget } from '../domain/types';
import type { KoloRepositories } from '../data/repositories/types';
import { ValidationError } from './errors';

export interface BudgetInput {
  limitMinor: MinorAmount;
  currencyCode: CurrencyCode;
}

export function validateBudget(input: BudgetInput): void {
  const errors: Partial<Record<keyof BudgetInput, 'invalid' | 'notPositive' | 'required'>> = {};
  if (!Number.isSafeInteger(input.limitMinor)) errors.limitMinor = 'invalid';
  else if (input.limitMinor <= 0) errors.limitMinor = 'notPositive';
  if (!isCurrencyCode(input.currencyCode)) errors.currencyCode = 'required';
  if (Object.keys(errors).length > 0) throw new ValidationError(errors);
}

/**
 * Définit la limite mensuelle à partir de `month` (le mois en cours) : les mois passés gardent
 * leur limite, les suivants reprennent celle-ci jusqu'à la prochaine modification (décision A4).
 */
export async function setMonthlyBudget(
  repos: KoloRepositories,
  input: BudgetInput,
  month: LocalMonth,
): Promise<Budget> {
  validateBudget(input);
  if (!isLocalMonth(month)) throw new ValidationError({ startMonth: 'invalid' });
  return repos.runAtomic(async () => {
    const budgets = await repos.budgets.list();
    for (const later of budgets.filter((budget) => budget.startMonth > month)) {
      await repos.budgets.remove(later.id);
    }
    const current = budgets.find((budget) => budget.startMonth === month);
    const data = { limitMinor: input.limitMinor, currencyCode: input.currencyCode };
    return current
      ? repos.budgets.update(current.id, data)
      : repos.budgets.create({
          ...data,
          periodType: 'month',
          startMonth: month,
          includedCategoryIds: null,
        });
  });
}

/** Retire la limite : plus aucun budget, ni pour ce mois ni pour les mois passés. */
export async function removeBudget(repos: KoloRepositories): Promise<void> {
  await repos.runAtomic(async () => {
    for (const budget of await repos.budgets.list()) await repos.budgets.remove(budget.id);
  });
}
