import { ButtonLink } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { Page } from '../../components/Page';
import { useI18n } from '../../i18n/context';
import { sortTransactions } from '../../services/transactions';
import { FlashNotice } from '../shared/FlashNotice';
import { Loaded } from '../shared/Loaded';
import { useLedger } from '../shared/useLedger';
import { TransactionList } from './TransactionList';
import styles from './ActivityPage.module.css';

export function ActivityPage() {
  const { t } = useI18n();
  const ledger = useLedger();
  return (
    <Page title={t('activity.title')}>
      <FlashNotice />
      <div className={styles.actions}>
        <ButtonLink to="/activity/new?type=expense">{t('home.quickExpense')}</ButtonLink>
        <ButtonLink to="/activity/new?type=income" variant="secondary">
          {t('home.quickIncome')}
        </ButtonLink>
        <ButtonLink to="/activity/new?type=transfer" variant="secondary">
          {t('home.quickTransfer')}
        </ButtonLink>
      </div>
      <Loaded state={ledger}>
        {({ transactions, accounts, categories }) =>
          transactions.length === 0 ? (
            <EmptyState title={t('activity.emptyTitle')}>{t('activity.emptyBody')}</EmptyState>
          ) : (
            <TransactionList
              transactions={sortTransactions(transactions)}
              accounts={accounts}
              categories={categories}
            />
          )
        }
      </Loaded>
    </Page>
  );
}
