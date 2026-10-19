import { useState } from 'react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Page } from '../../components/Page';
import { addMonths, monthOf, toLocalDate } from '../../domain/dates';
import type { MinorAmount } from '../../domain/money';
import { monthlyReport, type CurrencyReport } from '../../domain/reports';
import type { Category } from '../../domain/types';
import { useI18n } from '../../i18n/context';
import { useFormat } from '../../i18n/format';
import { categoryLabel } from '../shared/labels';
import { Loaded } from '../shared/Loaded';
import { useLedger } from '../shared/useLedger';
import list from '../shared/list.module.css';
import styles from './ReportsPage.module.css';

/** Rapport mensuel informatif (§5.9) : des chiffres, jamais de jugement. */
export function ReportsPage() {
  const { t } = useI18n();
  const format = useFormat();
  const ledger = useLedger();
  const currentMonth = monthOf(toLocalDate(new Date()));
  const [month, setMonth] = useState(currentMonth);
  const monthName = format.month(month);

  return (
    <Page title={t('reports.title')} backTo="/more">
      <div className={styles.monthHeader}>
        <Button
          variant="ghost"
          aria-label={t('home.previousMonth')}
          onClick={() => setMonth(addMonths(month, -1))}
        >
          ‹
        </Button>
        <h2 className={styles.monthTitle} aria-live="polite">
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
      <Loaded state={ledger}>
        {({ transactions, categories }) => {
          const report = monthlyReport(transactions, month);
          if (report.length === 0) {
            return <p className={list.muted}>{t('reports.empty', { month: monthName })}</p>;
          }
          return (
            <>
              {report.map((entry) => (
                <CurrencySection
                  key={entry.currencyCode}
                  report={entry}
                  categories={categories}
                  previousMonthName={format.month(addMonths(month, -1))}
                />
              ))}
              {report.length > 1 && <p className={list.muted}>{t('reports.currencyNote')}</p>}
            </>
          );
        }}
      </Loaded>
      <p className={list.muted}>{t('reports.excluded')}</p>
    </Page>
  );
}

function CurrencySection({
  report,
  categories,
  previousMonthName,
}: {
  report: CurrencyReport;
  categories: Category[];
  previousMonthName: string;
}) {
  const { t } = useI18n();
  const format = useFormat();
  const money = (amount: MinorAmount) => format.money(amount, report.currencyCode);
  const categoryById = new Map(categories.map((category) => [category.id, category]));

  // Écart avec le mois précédent, dit simplement (« 12,00 € de plus »), sans couleur de jugement.
  const change = (current: MinorAmount, before: MinorAmount) => {
    const delta = current - before;
    if (delta === 0) return t('reports.same');
    return t(delta > 0 ? 'reports.more' : 'reports.less', { amount: money(Math.abs(delta)) });
  };

  return (
    <Card title={report.currencyCode}>
      <dl className={list.figures}>
        <div>
          <dt>{t('reports.income')}</dt>
          <dd>{money(report.incomeMinor)}</dd>
        </div>
        <div>
          <dt>{t('reports.expenses')}</dt>
          <dd>{money(report.expenseMinor)}</dd>
        </div>
        <div>
          <dt>{t('reports.difference')}</dt>
          <dd>{money(report.differenceMinor)}</dd>
        </div>
      </dl>
      <p className={list.muted}>{t('reports.differenceHint')}</p>

      {report.byCategory.length > 0 && (
        <section className={styles.block} aria-label={t('reports.byCategory')}>
          <h3 className={styles.subtitle}>{t('reports.byCategory')}</h3>
          <ul className={styles.categories}>
            {report.byCategory.map((entry) => {
              const name =
                categoryLabel(categoryById.get(entry.categoryId ?? ''), t) ||
                t('reports.uncategorized');
              return (
                <li key={entry.categoryId ?? 'none'} className={styles.category}>
                  <span className={styles.categoryLine}>
                    <span>{name}</span>
                    <span className={styles.figure}>
                      {money(entry.amountMinor)} ·{' '}
                      {t('reports.share', { percent: entry.sharePercent })}
                    </span>
                  </span>
                  <progress
                    className={list.meter}
                    max={100}
                    value={entry.sharePercent}
                    aria-label={name}
                  />
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section
        className={styles.block}
        aria-label={t('reports.comparisonTitle', { month: previousMonthName })}
      >
        <h3 className={styles.subtitle}>
          {t('reports.comparisonTitle', { month: previousMonthName })}
        </h3>
        {report.previous ? (
          <dl className={styles.comparison}>
            <div>
              <dt>{t('reports.income')}</dt>
              <dd>{change(report.incomeMinor, report.previous.incomeMinor)}</dd>
            </div>
            <div>
              <dt>{t('reports.expenses')}</dt>
              <dd>{change(report.expenseMinor, report.previous.expenseMinor)}</dd>
            </div>
          </dl>
        ) : (
          <p className={list.muted}>{t('reports.notEnoughData', { month: previousMonthName })}</p>
        )}
      </section>
    </Card>
  );
}
