import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, ButtonLink } from '../../components/Button';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { Page } from '../../components/Page';
import { accountBalances, totalsByCurrency } from '../../domain/balances';
import { budgetForMonth, budgetStatus, monthTotals } from '../../domain/budget';
import { addMonths, monthOf, toLocalDate } from '../../domain/dates';
import { useI18n } from '../../i18n/context';
import { useFormat } from '../../i18n/format';
import { BudgetSummary } from '../budget/BudgetSummary';
import { Loaded } from '../shared/Loaded';
import { useLedger, type Ledger } from '../shared/useLedger';
import styles from './DashboardPage.module.css';

/** Résumé calculé à partir des données enregistrées, jamais une seconde source (§5.1). */
export function DashboardPage() {
  const { t } = useI18n();
  const ledger = useLedger();
  return (
    <Page title={t('home.title')}>
      <Loaded state={ledger}>{(data) => <Dashboard ledger={data} />}</Loaded>
      <p className={styles.notice}>{t('home.notice')}</p>
    </Page>
  );
}

function Dashboard({ ledger }: { ledger: Ledger }) {
  const { t } = useI18n();
  const format = useFormat();
  const today = toLocalDate(new Date());
  const currentMonth = monthOf(today);
  const [month, setMonth] = useState(currentMonth);
  const { accounts, transactions, budgets } = ledger;
  const totals = totalsByCurrency(accounts, transactions);

  const balances = accountBalances(accounts, transactions);
  const active = accounts.filter((account) => !account.archivedAt);
  const budget = budgetForMonth(budgets, currentMonth);
  const monthSummary = monthTotals(transactions, month);
  const monthName = format.month(month);

  return (
    <>
      {totals.length === 0 ? (
        <EmptyState
          title={t('home.noAccountTitle')}
          action={<ButtonLink to="/more/accounts/new">{t('accounts.add')}</ButtonLink>}
        >
          {t('home.noAccountBody')}
        </EmptyState>
      ) : (
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
                <ul className={styles.accounts}>
                  {active
                    .filter((account) => account.currencyCode === total.currencyCode)
                    .map((account) => (
                      <li key={account.id}>
                        <span>{account.name}</span>
                        <span>
                          {format.money(balances.get(account.id) ?? 0, account.currencyCode)}
                        </span>
                      </li>
                    ))}
                </ul>
              </li>
            ))}
          </ul>
          {totals.length > 1 && <p className={styles.heroNote}>{t('home.currencyNote')}</p>}
        </section>
      )}

      <section className={styles.quick} aria-labelledby="quick-title">
        <h2 id="quick-title" className={styles.sectionTitle}>
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

      <Card title={t('home.budgetTitle')}>
        {budget ? (
          <BudgetSummary status={budgetStatus(budget, transactions, today)} compact />
        ) : (
          <p className={styles.muted}>{t('home.budgetNone')}</p>
        )}
        <Link to="/budget" className={styles.link}>
          {budget ? t('home.seeBudget') : t('budget.setLimit')}
        </Link>
      </Card>

      <section className={styles.month} aria-labelledby="month-title">
        <div className={styles.monthHeader}>
          <Button
            variant="ghost"
            aria-label={t('home.previousMonth')}
            onClick={() => setMonth(addMonths(month, -1))}
          >
            ‹
          </Button>
          <h2 id="month-title" className={styles.monthTitle} aria-live="polite">
            {monthName}
          </h2>
          <Button
            variant="ghost"
            aria-label={t('home.nextMonth')}
            disabled={month >= currentMonth}
            onClick={() => setMonth(addMonths(month, 1))}
          >
            ›
          </Button>
        </div>
        {monthSummary.length === 0 ? (
          <p className={styles.muted}>{t('home.noActivityMonth', { month: monthName })}</p>
        ) : (
          <ul className={styles.monthTotals}>
            {monthSummary.map((total) => (
              <li key={total.currencyCode} className={styles.monthRow}>
                <span className={styles.monthCurrency}>{total.currencyCode}</span>
                <span>
                  <span className={styles.muted}>{t('home.income')}</span>
                  <span className={styles.in}>
                    {format.money(total.incomeMinor, total.currencyCode)}
                  </span>
                </span>
                <span>
                  <span className={styles.muted}>{t('home.expenses')}</span>
                  <span className={styles.out}>
                    {format.money(total.expenseMinor, total.currencyCode)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ButtonLink to="/more/accounts" variant="ghost">
        {t('home.seeAccounts')}
      </ButtonLink>
    </>
  );
}
