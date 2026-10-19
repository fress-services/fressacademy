import type { CurrencyCode } from '../domain/currencies';
import { monthOf, toLocalDate } from '../domain/dates';
import type { MinorAmount } from '../domain/money';
import { hasErrors, validateAccount } from '../domain/validation';
import type { KoloRepositories } from '../data/repositories/types';
import { createAccount, type AccountInput } from './accounts';
import { setMonthlyBudget } from './budget';
import { ValidationError } from './errors';

/**
 * Termine le premier lancement (§4.1) : devise par défaut, premier compte et limite mensuelle
 * facultatifs. Tout est enregistré d'un coup, ou rien en cas d'erreur.
 */
export async function completeOnboarding(
  repos: KoloRepositories,
  input: {
    defaultCurrency: CurrencyCode;
    account: AccountInput | null;
    budgetLimitMinor?: MinorAmount | null;
    now?: Date;
  },
): Promise<void> {
  const now = input.now ?? new Date();
  if (input.account) {
    const errors = validateAccount(input.account);
    if (hasErrors(errors)) throw new ValidationError(errors);
  }
  await repos.runAtomic(async () => {
    if (input.account) await createAccount(repos, input.account);
    if (input.budgetLimitMinor) {
      await setMonthlyBudget(
        repos,
        { limitMinor: input.budgetLimitMinor, currencyCode: input.defaultCurrency },
        monthOf(toLocalDate(now)),
      );
    }
    await repos.preferences.update({
      defaultCurrency: input.defaultCurrency,
      onboardingCompletedAt: now.toISOString(),
    });
  });
}
