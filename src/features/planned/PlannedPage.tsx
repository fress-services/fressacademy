import { Link } from 'react-router-dom';
import { ButtonLink } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { Page } from '../../components/Page';
import { isPlannedOverdue, upcomingPlanned } from '../../domain/planned';
import { toLocalDate } from '../../domain/dates';
import type { PlannedExpense } from '../../domain/types';
import { useI18n } from '../../i18n/context';
import { useFormat } from '../../i18n/format';
import { FlashNotice } from '../shared/FlashNotice';
import { Loaded } from '../shared/Loaded';
import { useLedger } from '../shared/useLedger';
import styles from '../shared/list.module.css';

export const PLANNED_STATUS_KEYS = {
  planned: 'planned.statusPlanned',
  paid: 'planned.statusPaid',
  cancelled: 'planned.statusCancelled',
} as const;

/** Liste des dépenses prévues : à venir d'abord, par échéance (§5.7). */
export function PlannedPage() {
  const { t } = useI18n();
  const format = useFormat();
  const ledger = useLedger();
  const today = toLocalDate(new Date());

  const list = (items: PlannedExpense[]) => (
    <ul className={styles.list}>
      {items.map((expense) => (
        <li key={expense.id}>
          <Link to={`/more/planned/${expense.id}`} className={styles.item}>
            <span className={styles.main}>
              <span className={styles.name}>{expense.title}</span>
              <span className={styles.meta}>
                <span
                  className={`${styles.badge} ${expense.status === 'paid' ? styles.badgeDone : ''}`}
                >
                  {t(PLANNED_STATUS_KEYS[expense.status])}
                </span>
                {isPlannedOverdue(expense, today) && (
                  <span className={`${styles.badge} ${styles.badgeWarning}`}>
                    {t('planned.overdue')}
                  </span>
                )}
                <span>{t('planned.dueOn', { date: format.date(expense.dueDate, 'medium') })}</span>
              </span>
            </span>
            <span className={styles.amount}>
              {format.money(expense.amountMinor, expense.currencyCode)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <Page title={t('planned.title')} backTo="/more">
      <FlashNotice />
      <p className={styles.muted}>{t('planned.intro')}</p>
      <Loaded state={ledger}>
        {({ plannedExpenses }) => {
          const upcoming = upcomingPlanned(plannedExpenses);
          const others = plannedExpenses
            .filter((expense) => expense.status !== 'planned')
            .sort((a, b) => b.dueDate.localeCompare(a.dueDate));
          return (
            <>
              {plannedExpenses.length === 0 ? (
                <EmptyState title={t('planned.emptyTitle')}>{t('planned.emptyBody')}</EmptyState>
              ) : (
                upcoming.length > 0 && (
                  <section className={styles.section} aria-labelledby="planned-upcoming">
                    <h2 id="planned-upcoming" className={styles.sectionTitle}>
                      {t('planned.upcoming')}
                    </h2>
                    {list(upcoming)}
                  </section>
                )
              )}
              <ButtonLink to="/more/planned/new" block>
                {t('planned.add')}
              </ButtonLink>
              {others.length > 0 && (
                <section className={styles.section} aria-labelledby="planned-others">
                  <h2 id="planned-others" className={styles.sectionTitle}>
                    {t('planned.others')}
                  </h2>
                  {list(others)}
                </section>
              )}
            </>
          );
        }}
      </Loaded>
    </Page>
  );
}
