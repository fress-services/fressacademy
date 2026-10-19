import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useData } from '../../app/data';
import { describeError } from '../../app/describeError';
import { ButtonLink } from '../../components/Button';
import { Card } from '../../components/Card';
import { ConfirmAction } from '../../components/ConfirmAction';
import { EmptyState } from '../../components/EmptyState';
import { Notice } from '../../components/Notice';
import { Page } from '../../components/Page';
import type { Transaction } from '../../domain/types';
import { useI18n } from '../../i18n/context';
import { useFormat } from '../../i18n/format';
import { deleteTransaction, isDeletableHere, isEditableHere } from '../../services/transactions';
import { Loaded } from '../shared/Loaded';
import { flash } from '../shared/useFlash';
import { useLedger, type Ledger } from '../shared/useLedger';
import { describeTransaction, direction } from './display';
import { EDITABLE_TYPES, TransactionForm, type EditableType } from './TransactionForm';
import styles from './TransactionPage.module.css';

/** Nouvelle opération (/activity/new?type=…) ou détail et modification (/activity/:id). */
export function TransactionPage() {
  const { id } = useParams();
  const { t } = useI18n();
  const ledger = useLedger();
  const [params] = useSearchParams();
  const requested = params.get('type');
  const initialType = EDITABLE_TYPES.find((type) => type === requested) ?? 'expense';

  return (
    <Page title={t(id ? 'transaction.detailTitle' : 'transaction.newTitle')} backTo="/activity">
      <Loaded state={ledger}>
        {(data) =>
          id ? (
            <Existing id={id} ledger={data} />
          ) : (
            <Create ledger={data} initialType={initialType} />
          )
        }
      </Loaded>
    </Page>
  );
}

function Create({ ledger, initialType }: { ledger: Ledger; initialType: EditableType }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  if (!ledger.accounts.some((account) => !account.archivedAt)) {
    return (
      <EmptyState
        title={t('transaction.noAccountTitle')}
        action={<ButtonLink to="/more/accounts/new">{t('accounts.add')}</ButtonLink>}
      >
        {t('transaction.noAccountBody')}
      </EmptyState>
    );
  }
  return (
    <TransactionForm
      accounts={ledger.accounts}
      categories={ledger.categories}
      initialType={initialType}
      onSaved={() => navigate('/activity', flash('transaction.saved'))}
    />
  );
}

function Existing({ id, ledger }: { id: string; ledger: Ledger }) {
  const { t } = useI18n();
  const { repositories } = useData();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const transaction = ledger.transactions.find((candidate) => candidate.id === id);
  if (!transaction) return <Notice tone="error">{t('transaction.notFound')}</Notice>;

  const remove = async () => {
    setError(null);
    try {
      await deleteTransaction(repositories, transaction.id);
      navigate('/activity', flash('transaction.deleted'));
    } catch (failure) {
      setError(t('errors.saveFailed', { reason: describeError(failure, t) }));
    }
  };

  return (
    <>
      {error && <Notice tone="error">{error}</Notice>}
      {isEditableHere(transaction) ? (
        <TransactionForm
          key={transaction.id}
          accounts={ledger.accounts}
          categories={ledger.categories}
          initial={transaction}
          initialType={transaction.type as EditableType}
          onSaved={() => navigate('/activity', flash('transaction.saved'))}
        />
      ) : (
        <Summary transaction={transaction} ledger={ledger} />
      )}
      {transaction.linkedPlannedExpenseId && (
        <Notice tone="info">{t('transaction.linkedPlanned')}</Notice>
      )}
      {isDeletableHere(transaction) && (
        <ConfirmAction
          label={t('transaction.delete')}
          question={t('transaction.deleteConfirm')}
          onConfirm={remove}
        />
      )}
    </>
  );
}

/** Lecture seule pour un ajustement ou un règlement de dette (gérés autrement). */
function Summary({ transaction, ledger }: { transaction: Transaction; ledger: Ledger }) {
  const { t } = useI18n();
  const format = useFormat();
  const { title, detail } = describeTransaction(
    transaction,
    new Map(ledger.accounts.map((account) => [account.id, account])),
    new Map(ledger.categories.map((category) => [category.id, category])),
    t,
  );
  const sign = direction(transaction);
  const amount = format.money(sign * transaction.amountMinor, transaction.currencyCode);
  return (
    <Card>
      <Notice tone="info">
        {t(
          transaction.type === 'adjustment'
            ? 'transaction.adjustmentInfo'
            : 'transaction.settlementInfo',
        )}
      </Notice>
      <dl className={styles.summary}>
        <dt>{t('transaction.title')}</dt>
        <dd>{title}</dd>
        {detail && (
          <>
            <dt>{t('transaction.account')}</dt>
            <dd>{detail}</dd>
          </>
        )}
        <dt>{t('transaction.amount')}</dt>
        <dd className={styles.amount}>{sign > 0 ? `+${amount}` : amount}</dd>
        <dt>{t('transaction.date')}</dt>
        <dd>{format.date(transaction.date)}</dd>
        {transaction.note && (
          <>
            <dt>{t('transaction.note')}</dt>
            <dd>{transaction.note}</dd>
          </>
        )}
      </dl>
      {transaction.linkedDebtId && (
        <ButtonLink to={`/debts/${transaction.linkedDebtId}`} variant="secondary">
          {t('debts.seeDebt')}
        </ButtonLink>
      )}
    </Card>
  );
}
