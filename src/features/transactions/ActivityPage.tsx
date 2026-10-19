import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, ButtonLink } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { SelectField, TextField } from '../../components/fields';
import { Page } from '../../components/Page';
import { isCurrencyCode } from '../../domain/currencies';
import { isLocalDate } from '../../domain/dates';
import {
  countActiveFilters,
  filterTransactions,
  type TransactionFilters,
} from '../../domain/search';
import { TRANSACTION_TYPES, type TransactionType } from '../../domain/types';
import { useI18n } from '../../i18n/context';
import { sortTransactions } from '../../services/transactions';
import { FlashNotice } from '../shared/FlashNotice';
import { categoryLabel } from '../shared/labels';
import { Loaded } from '../shared/Loaded';
import { useLedger, type Ledger } from '../shared/useLedger';
import { TransactionList } from './TransactionList';
import styles from './ActivityPage.module.css';

/** Nom de chaque filtre dans l'adresse : la recherche survit au retour depuis une opération. */
const PARAMS = {
  query: 'q',
  type: 'type',
  accountId: 'account',
  categoryId: 'category',
  currencyCode: 'currency',
  from: 'from',
  to: 'to',
} as const satisfies Record<keyof TransactionFilters, string>;

function readFilters(params: URLSearchParams): TransactionFilters {
  const type = params.get(PARAMS.type);
  const currency = params.get(PARAMS.currencyCode);
  const date = (name: string) => {
    const value = params.get(name);
    return value && isLocalDate(value) ? value : null;
  };
  return {
    query: params.get(PARAMS.query) ?? '',
    type: TRANSACTION_TYPES.includes(type as TransactionType) ? (type as TransactionType) : null,
    accountId: params.get(PARAMS.accountId) || null,
    categoryId: params.get(PARAMS.categoryId) || null,
    currencyCode: currency && isCurrencyCode(currency) ? currency : null,
    from: date(PARAMS.from),
    to: date(PARAMS.to),
  };
}

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
        {(data) =>
          data.transactions.length === 0 ? (
            <EmptyState title={t('activity.emptyTitle')}>{t('activity.emptyBody')}</EmptyState>
          ) : (
            <SearchableList ledger={data} />
          )
        }
      </Loaded>
    </Page>
  );
}

function SearchableList({ ledger }: { ledger: Ledger }) {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const filters = readFilters(params);
  const activeCount = countActiveFilters(filters);
  const searching = activeCount > 0 || filters.query.trim() !== '';
  const [open, setOpen] = useState(activeCount > 0);
  const { transactions, accounts, categories } = ledger;

  function update(key: keyof TransactionFilters, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(PARAMS[key], value);
    else next.delete(PARAMS[key]);
    setParams(next, { replace: true });
  }

  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const results = sortTransactions(
    filterTransactions(transactions, filters, (transaction) => [
      categoryLabel(categoryById.get(transaction.categoryId ?? ''), t),
    ]),
  );
  const currencies = [...new Set(accounts.map((account) => account.currencyCode))].sort();

  return (
    <>
      <div className={styles.search}>
        <TextField
          type="search"
          label={t('activity.search')}
          hint={t('activity.searchHint')}
          value={filters.query}
          onChange={(value) => update('query', value)}
          maxLength={100}
          autoComplete="off"
        />
        <details
          className={styles.filters}
          open={open}
          onToggle={(event) => setOpen(event.currentTarget.open)}
        >
          <summary className={styles.summary}>
            {activeCount > 0
              ? t('activity.filtersActive', { count: activeCount })
              : t('activity.filters')}
          </summary>
          <div className={styles.filterGrid}>
            <SelectField
              label={t('activity.filterType')}
              value={filters.type ?? ''}
              onChange={(value) => update('type', value)}
              options={[
                { value: '', label: t('activity.allTypes') },
                ...TRANSACTION_TYPES.map((type) => ({
                  value: type,
                  label: t(`transactionTypes.${type}`),
                })),
              ]}
            />
            <SelectField
              label={t('activity.filterAccount')}
              value={filters.accountId ?? ''}
              onChange={(value) => update('accountId', value)}
              options={[
                { value: '', label: t('activity.allAccounts') },
                ...accounts.map((account) => ({ value: account.id, label: account.name })),
              ]}
            />
            <SelectField
              label={t('activity.filterCategory')}
              value={filters.categoryId ?? ''}
              onChange={(value) => update('categoryId', value)}
              options={[
                { value: '', label: t('activity.allCategories') },
                ...categories.map((category) => ({
                  value: category.id,
                  label: categoryLabel(category, t),
                })),
              ]}
            />
            {currencies.length > 1 && (
              <SelectField
                label={t('activity.filterCurrency')}
                value={filters.currencyCode ?? ''}
                onChange={(value) => update('currencyCode', value)}
                options={[
                  { value: '', label: t('activity.allCurrencies') },
                  ...currencies.map((code) => ({ value: code, label: code })),
                ]}
              />
            )}
            <TextField
              type="date"
              label={t('activity.from')}
              value={filters.from ?? ''}
              onChange={(value) => update('from', value)}
            />
            <TextField
              type="date"
              label={t('activity.to')}
              value={filters.to ?? ''}
              onChange={(value) => update('to', value)}
            />
          </div>
        </details>
      </div>

      {searching && (
        <div className={styles.resultBar}>
          <p role="status">{t('activity.results', { count: results.length })}</p>
          <Button
            variant="ghost"
            onClick={() => setParams(new URLSearchParams(), { replace: true })}
          >
            {t('activity.clearFilters')}
          </Button>
        </div>
      )}

      {results.length === 0 ? (
        <EmptyState title={t('activity.noResultsTitle')}>{t('activity.noResultsBody')}</EmptyState>
      ) : (
        <TransactionList transactions={results} accounts={accounts} categories={categories} />
      )}
    </>
  );
}
