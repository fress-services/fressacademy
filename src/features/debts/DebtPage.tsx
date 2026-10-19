import { useState, type FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useData } from '../../app/data';
import { describeError } from '../../app/describeError';
import { Button, ButtonLink } from '../../components/Button';
import { Card, cardClassName, cardTitleClassName } from '../../components/Card';
import { ConfirmAction } from '../../components/ConfirmAction';
import { AmountField, TextField } from '../../components/fields';
import { Notice } from '../../components/Notice';
import { Page } from '../../components/Page';
import { debtSummary, type DebtSummary } from '../../domain/debts';
import { toLocalDate } from '../../domain/dates';
import { parseAmount } from '../../domain/money';
import type { Debt } from '../../domain/types';
import { LIMITS } from '../../domain/validation';
import { useI18n } from '../../i18n/context';
import { useFormat } from '../../i18n/format';
import {
  addRepayment,
  createDebt,
  deleteDebt,
  deleteRepayment,
  updateDebt,
} from '../../services/debts';
import { fieldMessages } from '../shared/fieldErrors';
import { FlashNotice } from '../shared/FlashNotice';
import { Loaded } from '../shared/Loaded';
import { flash } from '../shared/useFlash';
import { useLedger, type Ledger } from '../shared/useLedger';
import styles from '../shared/list.module.css';
import { DebtBadges } from './DebtBadges';
import { DebtForm } from './DebtForm';
import { RecordInAccount } from './RecordInAccount';

/** /debts/new, /debts/:id (détail et remboursements) et /debts/:id/edit. */
export function DebtPage({ mode }: { mode: 'new' | 'detail' | 'edit' }) {
  const { t } = useI18n();
  const { id } = useParams();
  const ledger = useLedger();
  const title =
    mode === 'new' ? 'debts.newTitle' : mode === 'edit' ? 'debts.editTitle' : 'debts.detailTitle';
  const back = mode === 'edit' && id ? `/debts/${id}` : '/debts';

  return (
    <Page title={t(title)} backTo={back}>
      <Loaded state={ledger}>
        {(data) => {
          if (mode === 'new') return <NewDebt ledger={data} />;
          const debt = data.debts.find((candidate) => candidate.id === id);
          if (!debt) return <Notice tone="error">{t('debts.notFound')}</Notice>;
          return mode === 'edit' ? (
            <EditDebt key={debt.id} debt={debt} ledger={data} />
          ) : (
            <DebtDetail debt={debt} ledger={data} />
          );
        }}
      </Loaded>
    </Page>
  );
}

function NewDebt({ ledger }: { ledger: Ledger }) {
  const { repositories, preferences } = useData();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  return (
    <DebtForm
      initialDirection={params.get('direction') === 'payable' ? 'payable' : 'receivable'}
      defaultCurrency={preferences.defaultCurrency}
      accounts={ledger.accounts}
      onSubmit={async (input) => {
        const debt = await createDebt(repositories, input);
        navigate(`/debts/${debt.id}`, flash('debts.saved'));
      }}
    />
  );
}

function EditDebt({ debt, ledger }: { debt: Debt; ledger: Ledger }) {
  const { repositories } = useData();
  const navigate = useNavigate();
  const hasMovements =
    debt.openingTransactionId !== null ||
    ledger.debtRepayments.some((repayment) => repayment.debtId === debt.id);
  return (
    <DebtForm
      initial={debt}
      initialDirection={debt.direction}
      defaultCurrency={debt.currencyCode}
      accounts={ledger.accounts}
      currencyLocked={hasMovements}
      onSubmit={async (input) => {
        await updateDebt(repositories, debt.id, {
          contactLabel: input.contactLabel,
          originalAmountMinor: input.originalAmountMinor,
          currencyCode: input.currencyCode,
          createdDate: input.createdDate,
          dueDate: input.dueDate,
          note: input.note,
        });
        navigate(`/debts/${debt.id}`, flash('debts.saved'));
      }}
    />
  );
}

function DebtDetail({ debt, ledger }: { debt: Debt; ledger: Ledger }) {
  const { t } = useI18n();
  const format = useFormat();
  const { repositories } = useData();
  const navigate = useNavigate();
  const [status, setStatus] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const summary = debtSummary(debt, ledger.debtRepayments, toLocalDate(new Date()));
  const repayments = ledger.debtRepayments
    .filter((repayment) => repayment.debtId === debt.id)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const accountName = (transactionId: string | null) => {
    const transaction = ledger.transactions.find((candidate) => candidate.id === transactionId);
    return ledger.accounts.find((account) => account.id === transaction?.accountId)?.name ?? '';
  };
  const money = (amount: number) => format.money(amount, debt.currencyCode);

  async function run(work: () => Promise<void>) {
    setStatus(null);
    try {
      await work();
    } catch (error) {
      setStatus({
        tone: 'error',
        text: t('errors.saveFailed', { reason: describeError(error, t) }),
      });
    }
  }

  return (
    <>
      {status ? <Notice tone={status.tone}>{status.text}</Notice> : <FlashNotice />}
      <Card title={debt.contactLabel}>
        <p className={styles.meta}>
          <span>
            {t(debt.direction === 'receivable' ? 'debts.receivableLong' : 'debts.payableLong')}
          </span>
          <DebtBadges summary={summary} />
        </p>
        <dl className={styles.figures}>
          <div>
            <dt>{t('debts.original')}</dt>
            <dd>{money(debt.originalAmountMinor)}</dd>
          </div>
          <div>
            <dt>{t('debts.repaid')}</dt>
            <dd>{money(summary.repaidMinor)}</dd>
          </div>
          <div>
            <dt>{t('debts.remaining')}</dt>
            <dd>{money(summary.remainingMinor)}</dd>
          </div>
        </dl>
        <p className={styles.muted}>
          {format.date(debt.createdDate)}
          {debt.dueDate && ` · ${t('debts.due', { date: format.date(debt.dueDate) })}`}
        </p>
        {debt.note && <p>{debt.note}</p>}
        {debt.openingTransactionId && (
          <p className={styles.muted}>
            {t('debts.linkedTo', { account: accountName(debt.openingTransactionId) })}
          </p>
        )}
        <div className={styles.actions}>
          <ButtonLink to={`/debts/${debt.id}/edit`} variant="secondary">
            {t('common.edit')}
          </ButtonLink>
        </div>
      </Card>

      {summary.remainingMinor > 0 ? (
        <RepaymentForm
          debt={debt}
          ledger={ledger}
          summary={summary}
          onSaved={() => setStatus({ tone: 'success', text: t('debts.repaymentSaved') })}
        />
      ) : (
        <Notice tone="success">{t('debts.fullyRepaid')}</Notice>
      )}

      <section className={styles.section} aria-labelledby="repayments-title">
        <h2 id="repayments-title" className={styles.sectionTitle}>
          {t('debts.repaymentsTitle')}
        </h2>
        {repayments.length === 0 ? (
          <p className={styles.muted}>{t('debts.noRepayments')}</p>
        ) : (
          <ul className={styles.list}>
            {repayments.map((repayment) => (
              <li key={repayment.id} className={styles.item}>
                <span className={styles.main}>
                  <span className={styles.name}>{money(repayment.amountMinor)}</span>
                  <span className={styles.meta}>
                    <span>{format.date(repayment.date, 'medium')}</span>
                    <span>
                      {repayment.linkedTransactionId
                        ? t('debts.linkedTo', {
                            account: accountName(repayment.linkedTransactionId),
                          })
                        : t('debts.notLinked')}
                    </span>
                  </span>
                  {repayment.note && <span className={styles.muted}>{repayment.note}</span>}
                  <ConfirmAction
                    label={t('debts.repaymentDelete')}
                    question={t('debts.repaymentDeleteConfirm')}
                    onConfirm={() =>
                      run(async () => {
                        await deleteRepayment(repositories, repayment.id);
                        setStatus({ tone: 'success', text: t('debts.repaymentDeleted') });
                      })
                    }
                  />
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmAction
        label={t('debts.delete')}
        question={t('debts.deleteConfirm')}
        onConfirm={() =>
          run(async () => {
            await deleteDebt(repositories, debt.id);
            navigate('/debts', flash('debts.deleted'));
          })
        }
      />
    </>
  );
}

function RepaymentForm({
  debt,
  ledger,
  summary,
  onSaved,
}: {
  debt: Debt;
  ledger: Ledger;
  summary: DebtSummary;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const format = useFormat();
  const { repositories } = useData();
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(toLocalDate(new Date()));
  const [note, setNote] = useState('');
  const [record, setRecord] = useState(false);
  const [accountId, setAccountId] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    const parsed = parseAmount(amount, debt.currencyCode);
    const next: Record<string, string> = {};
    if (!parsed.ok) {
      next.amountMinor = t(`amountErrors.${parsed.error}`, {
        digits: format.minorUnits(debt.currencyCode),
      });
    }
    if (record && !accountId) next.accountId = t('validation.required');
    setErrors(next);
    if (!parsed.ok || Object.keys(next).length > 0) return;
    setBusy(true);
    try {
      await addRepayment(repositories, debt.id, {
        amountMinor: parsed.amountMinor,
        date,
        note,
        accountId: record ? accountId : null,
      });
      // Le choix « enregistrer dans un compte » est refait à chaque remboursement (§5.6).
      setAmount('');
      setNote('');
      setRecord(false);
      setAccountId('');
      setErrors({});
      onSaved();
    } catch (error) {
      setErrors(fieldMessages(error, t));
      setFormError(describeError(error, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={cardClassName} onSubmit={submit} noValidate aria-labelledby="repayment-title">
      <h2 id="repayment-title" className={cardTitleClassName}>
        {t('debts.addRepayment')}
      </h2>
      {formError && <Notice tone="error">{formError}</Notice>}
      <AmountField
        label={t('debts.repaymentAmount')}
        value={amount}
        onChange={setAmount}
        error={errors.amountMinor}
        hint={t('debts.repaymentAmountHint', {
          amount: format.money(summary.remainingMinor, debt.currencyCode),
        })}
      />
      <TextField
        type="date"
        label={t('transaction.date')}
        value={date}
        onChange={setDate}
        error={errors.date}
      />
      <TextField
        label={t('transaction.note')}
        value={note}
        onChange={setNote}
        error={errors.note}
        maxLength={LIMITS.note}
        autoComplete="off"
      />
      <RecordInAccount
        label={t('debts.recordRepayment')}
        explanation={t(
          debt.direction === 'receivable'
            ? 'debts.recordRepaymentReceivable'
            : 'debts.recordRepaymentPayable',
        )}
        accounts={ledger.accounts}
        currency={debt.currencyCode}
        enabled={record}
        onEnabledChange={setRecord}
        accountId={accountId}
        onAccountChange={setAccountId}
        error={errors.accountId}
      />
      <div className={styles.actions}>
        <Button type="submit" disabled={busy}>
          {t('common.save')}
        </Button>
      </div>
    </form>
  );
}
