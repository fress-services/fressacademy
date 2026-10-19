import type { BudgetStatus } from '../../domain/budget';
import { useI18n } from '../../i18n/context';
import { useFormat } from '../../i18n/format';
import styles from './BudgetPage.module.css';

/** Reste, allocation du jour et jauge ; le dépassement est toujours affiché (§5.5). */
export function BudgetSummary({ status, compact }: { status: BudgetStatus; compact?: boolean }) {
  const { t } = useI18n();
  const format = useFormat();
  const money = (amount: number) => format.money(amount, status.currencyCode);
  const ratio = Math.min(1, status.limitMinor > 0 ? status.spentMinor / status.limitMinor : 1);

  return (
    <div className={styles.summary}>
      {status.overBudget ? (
        <p className={styles.over} role="status">
          <strong>{t('budget.over')}</strong>
          <span>{t('budget.overBody', { amount: money(-status.remainingMinor) })}</span>
        </p>
      ) : (
        <p className={styles.perDay}>
          <span className={styles.perDayLabel}>{t('budget.perDay')}</span>
          <span className={styles.perDayAmount}>{money(status.dailyAllowanceMinor)}</span>
        </p>
      )}
      <progress
        className={`${styles.meter} ${status.overBudget ? styles.meterOver : ''}`}
        max={1000}
        value={Math.round(ratio * 1000)}
        aria-label={t('budget.progress')}
      >
        {Math.round(ratio * 100)} %
      </progress>
      <dl className={styles.figures}>
        <div>
          <dt>{t('budget.spent')}</dt>
          <dd>{money(status.spentMinor)}</dd>
        </div>
        <div>
          <dt>{t('budget.remaining')}</dt>
          <dd className={status.overBudget ? styles.negative : ''}>
            {money(status.remainingMinor)}
          </dd>
        </div>
        <div>
          <dt>{t('budget.limit')}</dt>
          <dd>{money(status.limitMinor)}</dd>
        </div>
      </dl>
      {!compact && (
        <>
          {!status.overBudget && (
            <p className={styles.muted}>{t('budget.perDayHint', { days: status.daysRemaining })}</p>
          )}
          <p className={styles.muted}>{t('budget.counted', { currency: status.currencyCode })}</p>
          {status.otherCurrencyCount > 0 && (
            <p className={styles.muted}>
              {t('budget.otherCurrency', { count: status.otherCurrencyCount })}
            </p>
          )}
        </>
      )}
    </div>
  );
}
