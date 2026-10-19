import { Link } from 'react-router-dom';
import { Card } from '../../components/Card';
import type { CurrencyCode } from '../../domain/currencies';
import { debtSummary } from '../../domain/debts';
import type { LocalDate } from '../../domain/dates';
import { sumMinor } from '../../domain/money';
import { isPlannedOverdue, upcomingPlanned } from '../../domain/planned';
import type { DebtDirection } from '../../domain/types';
import { useI18n } from '../../i18n/context';
import { useFormat } from '../../i18n/format';
import type { Ledger } from '../shared/useLedger';
import list from '../shared/list.module.css';
import styles from './DashboardPage.module.css';

const MAX_PLANNED = 3;

/** Dépenses prévues à venir et dettes ouvertes, avec accès au détail (§5.1). */
export function UpcomingCard({ ledger, today }: { ledger: Ledger; today: LocalDate }) {
  const { t } = useI18n();
  const format = useFormat();
  const planned = upcomingPlanned(ledger.plannedExpenses).slice(0, MAX_PLANNED);

  // Restant dû par sens et par devise, jamais additionné entre devises.
  const open = new Map<
    string,
    { direction: DebtDirection; currency: CurrencyCode; amounts: number[]; overdue: boolean }
  >();
  for (const debt of ledger.debts) {
    const summary = debtSummary(debt, ledger.debtRepayments, today);
    if (summary.remainingMinor === 0) continue;
    const key = `${debt.direction}-${debt.currencyCode}`;
    const entry = open.get(key) ?? {
      direction: debt.direction,
      currency: debt.currencyCode,
      amounts: [],
      overdue: false,
    };
    entry.amounts.push(summary.remainingMinor);
    entry.overdue ||= summary.overdue;
    open.set(key, entry);
  }
  const debts = [...open.values()].sort(
    (a, b) => a.direction.localeCompare(b.direction) || a.currency.localeCompare(b.currency),
  );

  return (
    <Card title={t('home.upcomingTitle')}>
      {planned.length === 0 && debts.length === 0 && (
        <p className={styles.muted}>{t('home.upcomingNone')}</p>
      )}
      {planned.length > 0 && (
        <ul className={styles.rows}>
          {planned.map((expense) => (
            <li key={expense.id}>
              <Link to={`/more/planned/${expense.id}`} className={styles.row}>
                <span className={list.main}>
                  <span className={list.name}>{expense.title}</span>
                  <span className={list.meta}>
                    {isPlannedOverdue(expense, today) && (
                      <span className={`${list.badge} ${list.badgeWarning}`}>
                        {t('planned.overdue')}
                      </span>
                    )}
                    <span>{format.date(expense.dueDate, 'medium')}</span>
                  </span>
                </span>
                <span className={list.amount}>
                  {format.money(expense.amountMinor, expense.currencyCode)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {debts.length > 0 && (
        <ul className={styles.rows} aria-label={t('home.debtsOpen')}>
          {debts.map((entry) => (
            <li key={`${entry.direction}-${entry.currency}`}>
              <Link to={`/debts?direction=${entry.direction}`} className={styles.row}>
                <span className={list.main}>
                  <span className={list.name}>
                    {t(
                      entry.direction === 'receivable'
                        ? 'home.receivableTotal'
                        : 'home.payableTotal',
                    )}
                  </span>
                  {entry.overdue && (
                    <span className={list.meta}>
                      <span className={`${list.badge} ${list.badgeWarning}`}>
                        {t('debts.overdue')}
                      </span>
                    </span>
                  )}
                </span>
                <span className={list.amount}>
                  {format.money(sumMinor(entry.amounts), entry.currency)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <div className={list.actions}>
        <Link to="/more/planned" className={styles.link}>
          {t('home.seePlanned')}
        </Link>
        <Link to="/debts" className={styles.link}>
          {t('home.seeDebts')}
        </Link>
      </div>
    </Card>
  );
}
