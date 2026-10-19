import type { Account, Category } from '../../domain/types';
import type { MessageKey, MessageParams } from '../../i18n/translate';

type T = (key: MessageKey, params?: MessageParams) => string;

/** Nom affiché d'une catégorie : traduction pour une catégorie système, nom choisi sinon. */
export function categoryLabel(category: Category | undefined, t: T): string {
  if (!category) return '';
  if (category.systemKey) return t(`categoryNames.${category.systemKey}` as MessageKey);
  return category.customName ?? '';
}

export function accountLabel(account: Account | undefined): string {
  return account ? `${account.name} (${account.currencyCode})` : '';
}
