import { Link } from 'react-router-dom';
import { ButtonLink } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { Page } from '../../components/Page';
import { goalProgress } from '../../domain/goals';
import { useI18n } from '../../i18n/context';
import { useFormat } from '../../i18n/format';
import { FlashNotice } from '../shared/FlashNotice';
import { Loaded } from '../shared/Loaded';
import { useLedger } from '../shared/useLedger';
import styles from '../shared/list.module.css';

export function GoalsPage() {
  const { t } = useI18n();
  const format = useFormat();
  const ledger = useLedger();
  return (
    <Page title={t('goals.title')} backTo="/more">
      <FlashNotice />
      <Loaded state={ledger}>
        {({ goals }) => (
          <>
            {goals.length === 0 ? (
              <EmptyState title={t('goals.emptyTitle')}>{t('goals.emptyBody')}</EmptyState>
            ) : (
              <ul className={styles.list}>
                {[...goals]
                  .sort((a, b) => a.title.localeCompare(b.title))
                  .map((goal) => {
                    const progress = goalProgress(goal);
                    const money = (amount: number) => format.money(amount, goal.currencyCode);
                    return (
                      <li key={goal.id}>
                        <Link
                          to={`/more/goals/${goal.id}`}
                          className={`${styles.item} ${styles.goal}`}
                        >
                          <span className={styles.main}>
                            <span className={styles.name}>{goal.title}</span>
                            <span className={styles.meta}>
                              {progress.reached ? (
                                <span className={`${styles.badge} ${styles.badgeDone}`}>
                                  {t('goals.reached')}
                                </span>
                              ) : (
                                <span>
                                  {t('goals.remaining', { amount: money(progress.remainingMinor) })}
                                </span>
                              )}
                              {goal.targetDate && (
                                <span>
                                  {t('goals.by', { date: format.date(goal.targetDate, 'medium') })}
                                </span>
                              )}
                            </span>
                            <progress
                              className={styles.meter}
                              max={100}
                              value={progress.percent}
                              aria-label={t('goals.progressLabel')}
                            />
                          </span>
                          <span className={styles.amount}>
                            {t('goals.percent', { percent: progress.percent })}
                            <span className={styles.amountNote}>
                              {money(goal.currentAmountMinor)} / {money(goal.targetAmountMinor)}
                            </span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
              </ul>
            )}
            <ButtonLink to="/more/goals/new" block>
              {t('goals.add')}
            </ButtonLink>
          </>
        )}
      </Loaded>
    </Page>
  );
}
