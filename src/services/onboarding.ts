import type { CurrencyCode } from '../domain/currencies';
import type { KoloRepositories } from '../data/repositories/types';
import { createAccount, type AccountInput } from './accounts';

/**
 * Termine le premier lancement : devise par défaut, premier compte facultatif.
 * Tout est enregistré d'un coup, ou rien en cas d'erreur.
 */
export async function completeOnboarding(
  repos: KoloRepositories,
  input: { defaultCurrency: CurrencyCode; account: AccountInput | null; now?: Date },
): Promise<void> {
  await repos.runAtomic(async () => {
    if (input.account) await createAccount(repos, input.account);
    await repos.preferences.update({
      defaultCurrency: input.defaultCurrency,
      onboardingCompletedAt: (input.now ?? new Date()).toISOString(),
    });
  });
}
