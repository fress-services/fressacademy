import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ButtonLink } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { TextField } from '../../components/fields';
import { Page } from '../../components/Page';
import { Tabs } from '../../components/Tabs';
import { debtSummary } from '../../domain/debts';
import { toLocalDate } from '../../domain/dates';
import { matchesQuery } from '../../domain/search';
import type { DebtDirection } from '../../domain/types';
import { useI18n } from '../../i18n/context';
import { useFormat } from '../../i18n/format';
import { FlashNotice } from '../shared/FlashNotice';
import { Loaded } from '../shared/Loaded';
import { useLedger, type Ledger } from '../shared/useLedger';
import styles from '../shared/list.module.css';
import { DebtBadges } from './DebtBadges';

export function DebtsPage() {
  const { t } = useI18n();
  const [params] = useSearchParams();
  const [direction, setDirection] = useState<DebtDirection>(
    params.get('direction') === 'payable' ? 'payable' : 'receivable',
  );
  const [query, setQuery] = useState('');
  const ledger = useLedger();

  return (
    <Page title={t('debts.title')}>
      <FlashNotice />
      <Loaded state={ledger}>
        {(data) => (
          <>
            {data.debts.length > 0 && (
              <TextField
                type="search"
                label={t('debts.search')}
                hint={t('debts.searchHint')}
                value={query}
                onChange={setQuery}
                maxLength={100}
                autoComplete="off"
              />
            )}
            <Tabs<DebtDirection>
              label={t('debts.tabsLabel')}
              selected={direction}
              onSelect={setDirection}
              items={(['receivable', 'payable'] as const).map((key) => ({
                key,
                label: t(`debts.${key}`),
                content: <DebtList ledger={data} direction={key} query={query} />,
              }))}
            />
          </>
        )}
      </Loaded>
    </Page>
  );
}

function DebtList({
  ledger,
  direction,
  query,
}: {
  ledger: Ledger;
  direction: DebtDirection;
  query: string;
}) {
  const { t } = useI18n();
  const format = useFormat();
  const today = toLocalDate(new Date());
  const ofDirection = ledger.debts.filter((debt) => debt.direction === direction);
  const rows = ofDirection
    .filter((debt) => matchesQuery(query, [debt.contactLabel, debt.note]))
    .map((debt) => ({ debt, summary: debtSummary(debt, ledger.debtRepayments, today) }))
    .sort(
      (a, b) =>
        (a.debt.dueDate ?? '9999').localeCompare(b.debt.dueDate ?? '9999') ||
        a.debt.contactLabel.localeCompare(b.debt.contactLabel),
    );
  const open = rows.filter((row) => row.summary.status !== 'settled');
  const settled = rows.filter((row) => row.summary.status === 'settled');
  const add = (
    <ButtonLink to={`/debts/new?direction=${direction}`} block>
      {t('debts.add')}
    </ButtonLink>
  );

  const list = (items: typeof rows) => (
    <ul className={styles.list}>
      {items.map(({ debt, summary }) => (
        <li key={debt.id}>
          <Link to={`/debts/${debt.id}`} className={styles.item}>
            <span className={styles.main}>
              <span className={styles.name}>{debt.contactLabel}</span>
              <span className={styles.meta}>
                <DebtBadges summary={summary} />
                {debt.dueDate && (
                  <span>{t('debts.due', { date: format.date(debt.dueDate, 'medium') })}</span>
                )}
              </span>
            </span>
            <span className={styles.amount}>
              {format.money(summary.remainingMinor, debt.currencyCode)}
              <span className={styles.amountNote}>
                {format.money(debt.originalAmountMinor, debt.currencyCode)}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );

  if (ofDirection.length === 0) {
    return (
      <EmptyState
        title={t(
          direction === 'receivable' ? 'debts.emptyReceivableTitle' : 'debts.emptyPayableTitle',
        )}
        action={add}
      >
        {t(direction === 'receivable' ? 'debts.emptyReceivableBody' : 'debts.emptyPayableBody')}
      </EmptyState>
    );
  }

  if (rows.length === 0) {
    return (
      <div className={styles.section}>
        <p className={styles.muted}>{t('debts.noResults')}</p>
        {add}
      </div>
    );
  }

  return (
    <div className={styles.section}>
      {open.length > 0 && list(open)}
      {add}
      {settled.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('debts.settledSection')}</h2>
          {list(settled)}
        </section>
      )}
    </div>
  );
}
