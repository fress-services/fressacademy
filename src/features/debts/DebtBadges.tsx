import type { DebtSummary } from '../../domain/debts';
import { useI18n } from '../../i18n/context';
import styles from '../shared/list.module.css';

const STATUS_KEYS = {
  open: 'debts.statusOpen',
  partial: 'debts.statusPartial',
  settled: 'debts.statusSettled',
} as const;

/** Statut calculé et étiquette « en retard » d'une dette. */
export function DebtBadges({ summary }: { summary: DebtSummary }) {
  const { t } = useI18n();
  return (
    <>
      <span className={`${styles.badge} ${summary.status === 'settled' ? styles.badgeDone : ''}`}>
        {t(STATUS_KEYS[summary.status])}
      </span>
      {summary.overdue && (
        <span className={`${styles.badge} ${styles.badgeWarning}`}>{t('debts.overdue')}</span>
      )}
    </>
  );
}
