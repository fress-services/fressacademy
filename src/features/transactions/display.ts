import type { Account, Category, Transaction } from '../../domain/types';
import type { MessageKey, MessageParams } from '../../i18n/translate';
import { categoryLabel } from '../shared/labels';

type T = (key: MessageKey, params?: MessageParams) => string;

/** Sens affiché : +1 entrée d'argent, −1 sortie, 0 pour un transfert (mouvement interne). */
export function direction(transaction: Transaction): 1 | -1 | 0 {
  switch (transaction.type) {
    case 'income':
      return 1;
    case 'expense':
      return -1;
    case 'transfer':
      return 0;
    default:
      return transaction.flow === 'in' ? 1 : transaction.flow === 'out' ? -1 : 0;
  }
}

/** Libellé principal et ligne d'information d'une opération dans les listes. */
export function describeTransaction(
  transaction: Transaction,
  accounts: ReadonlyMap<string, Account>,
  categories: ReadonlyMap<string, Category>,
  t: T,
): { title: string; detail: string } {
  const typeLabel = t(`transactionTypes.${transaction.type}`);
  const category = categoryLabel(categories.get(transaction.categoryId ?? ''), t);
  const name = (id: string | null) => accounts.get(id ?? '')?.name ?? '';
  const where =
    transaction.type === 'transfer'
      ? `${name(transaction.fromAccountId)} → ${name(transaction.toAccountId)}`
      : name(transaction.accountId);
  const title = transaction.title || category || typeLabel;
  const detail = [transaction.type === 'transfer' || !category ? typeLabel : category, where]
    .filter((part, index, parts) => part && parts.indexOf(part) === index && part !== title)
    .join(' · ');
  return { title, detail };
}
