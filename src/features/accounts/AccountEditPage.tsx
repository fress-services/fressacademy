import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useData } from '../../app/data';
import { describeError } from '../../app/describeError';
import { useRepositoryQuery } from '../../app/useRepositoryQuery';
import { Button } from '../../components/Button';
import { Card, cardClassName, cardTitleClassName } from '../../components/Card';
import { AmountField, CheckboxField, TextField } from '../../components/fields';
import { ConfirmAction } from '../../components/ConfirmAction';
import { Notice } from '../../components/Notice';
import { Page } from '../../components/Page';
import { accountBalance, involvesAccount } from '../../domain/balances';
import { isLocalDate, toLocalDate } from '../../domain/dates';
import { parseAmount } from '../../domain/money';
import type { Account } from '../../domain/types';
import { useI18n } from '../../i18n/context';
import { useFormat } from '../../i18n/format';
import {
  adjustBalance,
  canDeleteAccount,
  createAccount,
  deleteAccount,
  setAccountArchived,
  updateAccount,
} from '../../services/accounts';
import { flash } from '../shared/useFlash';
import { Loaded } from '../shared/Loaded';
import { useLedger } from '../shared/useLedger';
import { AccountForm } from './AccountForm';
import styles from './AccountForm.module.css';

/** Création (/more/accounts/new) ou modification (/more/accounts/:id) d'un compte. */
export function AccountEditPage() {
  const { id } = useParams();
  return id ? <EditAccount id={id} /> : <NewAccount />;
}

function NewAccount() {
  const { t } = useI18n();
  const { repositories, preferences } = useData();
  const navigate = useNavigate();
  return (
    <Page title={t('accounts.newTitle')} backTo="/more/accounts">
      <AccountForm
        defaultCurrency={preferences.defaultCurrency}
        submitLabel={t('common.save')}
        onSubmit={async (input) => {
          await createAccount(repositories, input);
          navigate('/more/accounts', flash('accounts.saved'));
        }}
      />
    </Page>
  );
}

function EditAccount({ id }: { id: string }) {
  const { t } = useI18n();
  const ledger = useLedger();
  return (
    <Page title={t('accounts.editTitle')} backTo="/more/accounts">
      <Loaded state={ledger}>
        {({ accounts, transactions }) => {
          const account = accounts.find((candidate) => candidate.id === id);
          if (!account) return <Notice tone="error">{t('accounts.notFound')}</Notice>;
          const used = transactions.some((transaction) => involvesAccount(transaction, id));
          return (
            <AccountDetails
              key={account.id}
              account={account}
              used={used}
              balanceMinor={accountBalance(account, transactions)}
            />
          );
        }}
      </Loaded>
    </Page>
  );
}

function AccountDetails({
  account,
  used,
  balanceMinor,
}: {
  account: Account;
  used: boolean;
  balanceMinor: number;
}) {
  const { t } = useI18n();
  const { repositories } = useData();
  const navigate = useNavigate();
  const [status, setStatus] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const deletable = useRepositoryQuery(
    (repos) => canDeleteAccount(repos, account.id),
    [account.id],
  );

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
      {status && <Notice tone={status.tone}>{status.text}</Notice>}
      <AccountForm
        initial={account}
        defaultCurrency={account.currencyCode}
        currencyLocked={used}
        submitLabel={t('common.save')}
        onSubmit={async (input) => {
          await updateAccount(repositories, account.id, input);
          navigate('/more/accounts', flash('accounts.saved'));
        }}
      />
      <AdjustBalance account={account} balanceMinor={balanceMinor} onResult={setStatus} />
      <Card>
        <p>{t('accounts.archiveHint')}</p>
        <div className={styles.actions}>
          <Button
            variant="secondary"
            onClick={() =>
              run(async () => {
                const archive = !account.archivedAt;
                await setAccountArchived(repositories, account.id, archive);
                setStatus({
                  tone: 'success',
                  text: t(archive ? 'accounts.archived' : 'accounts.unarchived'),
                });
              })
            }
          >
            {t(account.archivedAt ? 'accounts.unarchive' : 'accounts.archive')}
          </Button>
        </div>
        {deletable.status === 'ready' &&
          (deletable.data ? (
            <ConfirmAction
              label={t('accounts.delete')}
              question={t('accounts.deleteConfirm')}
              onConfirm={() =>
                run(async () => {
                  await deleteAccount(repositories, account.id);
                  navigate('/more/accounts', flash('accounts.deleted'));
                })
              }
            />
          ) : (
            <Notice tone="info">{t('accounts.deleteBlocked')}</Notice>
          ))}
      </Card>
    </>
  );
}

function AdjustBalance({
  account,
  balanceMinor,
  onResult,
}: {
  account: Account;
  balanceMinor: number;
  onResult: (status: { tone: 'success' | 'error'; text: string }) => void;
}) {
  const { t } = useI18n();
  const format = useFormat();
  const { repositories } = useData();
  const [actual, setActual] = useState('');
  const [negative, setNegative] = useState(false);
  const [date, setDate] = useState(toLocalDate(new Date()));
  const [errors, setErrors] = useState<{ actual?: string; date?: string }>({});
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = parseAmount(actual, account.currencyCode);
    let amount = 0;
    const next: { actual?: string; date?: string } = {};
    if (parsed.ok) amount = parsed.amountMinor;
    else if (parsed.error !== 'notPositive') {
      next.actual = t(`amountErrors.${parsed.error}`, {
        digits: format.minorUnits(account.currencyCode),
      });
    }
    if (!isLocalDate(date)) next.date = t('validation.invalid');
    setErrors(next);
    if (next.actual || next.date) return;
    setBusy(true);
    try {
      const result = await adjustBalance(repositories, {
        accountId: account.id,
        actualBalanceMinor: negative ? -amount : amount,
        date,
        title: t('accounts.adjustTitleDefault'),
      });
      setActual('');
      setNegative(false);
      onResult({ tone: 'success', text: t(result ? 'accounts.adjusted' : 'accounts.adjustNone') });
    } catch (error) {
      onResult({
        tone: 'error',
        text: t('errors.saveFailed', { reason: describeError(error, t) }),
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={cardClassName} onSubmit={submit} noValidate aria-labelledby="adjust-title">
      <h2 id="adjust-title" className={cardTitleClassName}>
        {t('accounts.adjustTitle')}
      </h2>
      <div>
        <p className={styles.balanceLabel}>{t('accounts.balance')}</p>
        <p className={styles.balance}>{format.money(balanceMinor, account.currencyCode)}</p>
      </div>
      <p>{t('accounts.adjustIntro')}</p>
      <AmountField
        label={t('accounts.adjustActual')}
        value={actual}
        onChange={setActual}
        error={errors.actual}
      />
      <CheckboxField
        label={t('accounts.adjustNegative')}
        checked={negative}
        onChange={setNegative}
      />
      <TextField
        type="date"
        label={t('transaction.date')}
        value={date}
        onChange={setDate}
        error={errors.date}
      />
      <div className={styles.actions}>
        <Button type="submit" variant="secondary" disabled={busy}>
          {t('accounts.adjustButton')}
        </Button>
      </div>
    </form>
  );
}
