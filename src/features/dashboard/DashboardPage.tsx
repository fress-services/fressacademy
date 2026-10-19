import { ButtonLink } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { Page } from '../../components/Page';
import { totalsByCurrency } from '../../domain/balances';
import { useI18n } from '../../i18n/context';
import { useFormat } from '../../i18n/format';
import { Loaded } from '../shared/Loaded';
import { useLedger } from '../shared/useLedger';
import styles from './DashboardPage.module.css';

export function DashboardPage() {
  const { t } = useI18n();
  const format = useFormat();
  const ledger = useLedger();
  return (
    <Page title={t('home.title')}>
      <Loaded state={ledger}>
        {({ accounts, transactions }) => {
          const totals = totalsByCurrency(accounts, transactions);
          if (totals.length === 0) {
            return (
              <EmptyState
                title={t('home.noAccountTitle')}
                action={<ButtonLink to="/more/accounts/new">{t('accounts.add')}</ButtonLink>}
              >
                {t('home.noAccountBody')}
              </EmptyState>
            );
          }
          return (
            <>
              <section className={styles.hero} aria-labelledby="balances-title">
                <h2 id="balances-title" className={styles.heroLabel}>
                  {t('home.balancesTitle')}
                </h2>
                <ul className={styles.totals}>
                  {totals.map((total) => (
                    <li key={total.currencyCode} className={styles.total}>
                      <span className={styles.amount}>
                        {format.money(total.totalMinor, total.currencyCode)}
                      </span>
                      <span className={styles.heroNote}>
                        {t('home.accountsCount', { count: total.accountCount })}
                      </span>
                    </li>
                  ))}
                </ul>
                {totals.length > 1 && <p className={styles.heroNote}>{t('home.currencyNote')}</p>}
              </section>
              <section className={styles.quick} aria-labelledby="quick-title">
                <h2 id="quick-title" className={styles.quickTitle}>
                  {t('home.quickTitle')}
                </h2>
                <div className={styles.quickActions}>
                  <ButtonLink to="/activity/new?type=expense">{t('home.quickExpense')}</ButtonLink>
                  <ButtonLink to="/activity/new?type=income" variant="secondary">
                    {t('home.quickIncome')}
                  </ButtonLink>
                  <ButtonLink to="/activity/new?type=transfer" variant="secondary">
                    {t('home.quickTransfer')}
                  </ButtonLink>
                </div>
              </section>
              <ButtonLink to="/more/accounts" variant="ghost">
                {t('home.seeAccounts')}
              </ButtonLink>
            </>
          );
        }}
      </Loaded>
      <p className={styles.notice}>{t('home.notice')}</p>
    </Page>
  );
}
