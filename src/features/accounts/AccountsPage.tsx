import { Link } from 'react-router-dom';
import { ButtonLink } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { Page } from '../../components/Page';
import { accountBalances } from '../../domain/balances';
import type { Account } from '../../domain/types';
import { useI18n } from '../../i18n/context';
import { useFormat } from '../../i18n/format';
import { FlashNotice } from '../shared/FlashNotice';
import { Loaded } from '../shared/Loaded';
import { useLedger } from '../shared/useLedger';
import styles from './AccountsPage.module.css';

export function AccountsPage() {
  const { t } = useI18n();
  const format = useFormat();
  const ledger = useLedger();

  return (
    <Page title={t('accounts.title')} backTo="/more">
      <FlashNotice />
      <Loaded state={ledger}>
        {({ accounts, transactions }) => {
          const balances = accountBalances(accounts, transactions);
          const active = accounts.filter((account) => !account.archivedAt);
          const archived = accounts.filter((account) => account.archivedAt);
          const list = (items: Account[]) => (
            <ul className={styles.list}>
              {items.map((account) => (
                <li key={account.id}>
                  <Link to={`/more/accounts/${account.id}`} className={styles.item}>
                    <span className={styles.main}>
                      <span className={styles.name}>{account.name}</span>
                      <span className={styles.meta}>
                        {t(`accountTypes.${account.type}`)} · {account.currencyCode}
                      </span>
                    </span>
                    <span className={styles.amount}>
                      {format.money(balances.get(account.id) ?? 0, account.currencyCode)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          );
          return (
            <>
              {active.length === 0 ? (
                <EmptyState title={t('accounts.emptyTitle')}>{t('accounts.emptyBody')}</EmptyState>
              ) : (
                list(active)
              )}
              <ButtonLink to="/more/accounts/new" block>
                {t('accounts.add')}
              </ButtonLink>
              {archived.length > 0 && (
                <section className={styles.section}>
                  <h2 className={styles.sectionTitle}>{t('accounts.archivedSection')}</h2>
                  {list(archived)}
                </section>
              )}
            </>
          );
        }}
      </Loaded>
    </Page>
  );
}
