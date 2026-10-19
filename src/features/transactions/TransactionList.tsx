import { Link } from 'react-router-dom';
import type { Account, Category, Transaction } from '../../domain/types';
import { useI18n } from '../../i18n/context';
import { useFormat } from '../../i18n/format';
import { describeTransaction, direction } from './display';
import styles from './TransactionList.module.css';

interface Props {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
}

/** Opérations regroupées par date, déjà triées de la plus récente à la plus ancienne. */
export function TransactionList({ transactions, accounts, categories }: Props) {
  const { t } = useI18n();
  const format = useFormat();
  const accountMap = new Map(accounts.map((account) => [account.id, account]));
  const categoryMap = new Map(categories.map((category) => [category.id, category]));

  const groups: { date: string; items: Transaction[] }[] = [];
  for (const transaction of transactions) {
    const last = groups.at(-1);
    if (last?.date === transaction.date) last.items.push(transaction);
    else groups.push({ date: transaction.date, items: [transaction] });
  }

  return (
    <div className={styles.groups}>
      {groups.map((group) => (
        <section key={group.date} className={styles.group} aria-label={format.date(group.date)}>
          <h2 className={styles.date}>{format.date(group.date)}</h2>
          <ul className={styles.list}>
            {group.items.map((transaction) => {
              const { title, detail } = describeTransaction(
                transaction,
                accountMap,
                categoryMap,
                t,
              );
              const sign = direction(transaction);
              const amount = format.money(
                sign === 0 ? transaction.amountMinor : sign * transaction.amountMinor,
                transaction.currencyCode,
              );
              return (
                <li key={transaction.id}>
                  <Link to={`/activity/${transaction.id}`} className={styles.item}>
                    <span className={styles.text}>
                      <span className={styles.title}>{title}</span>
                      {detail && <span className={styles.detail}>{detail}</span>}
                    </span>
                    <span
                      className={`${styles.amount} ${sign > 0 ? styles.in : sign < 0 ? styles.out : ''}`}
                    >
                      {sign > 0 ? `+${amount}` : amount}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
