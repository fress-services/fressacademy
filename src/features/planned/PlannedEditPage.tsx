import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useData } from '../../app/data';
import { describeError } from '../../app/describeError';
import { Button, ButtonLink } from '../../components/Button';
import { Card, cardClassName } from '../../components/Card';
import { ConfirmAction } from '../../components/ConfirmAction';
import { SelectField, TextField } from '../../components/fields';
import { Notice } from '../../components/Notice';
import { Page } from '../../components/Page';
import { toLocalDate } from '../../domain/dates';
import type { PlannedExpense } from '../../domain/types';
import { useI18n } from '../../i18n/context';
import { useFormat } from '../../i18n/format';
import {
  createPlanned,
  deletePlanned,
  markPlannedPaid,
  setPlannedCancelled,
  updatePlanned,
} from '../../services/planned';
import { fieldMessages } from '../shared/fieldErrors';
import { FlashNotice } from '../shared/FlashNotice';
import { accountLabel } from '../shared/labels';
import { Loaded } from '../shared/Loaded';
import { flash } from '../shared/useFlash';
import { useLedger, type Ledger } from '../shared/useLedger';
import styles from '../shared/list.module.css';
import { PlannedForm } from './PlannedForm';
import { PLANNED_STATUS_KEYS } from './PlannedPage';

type Status = { tone: 'success' | 'error'; text: string } | null;

/** /more/planned/new et /more/planned/:id. */
export function PlannedEditPage() {
  const { t } = useI18n();
  const { id } = useParams();
  const ledger = useLedger();
  const { repositories, preferences } = useData();
  const navigate = useNavigate();

  return (
    <Page title={t(id ? 'planned.editTitle' : 'planned.newTitle')} backTo="/more/planned">
      <Loaded state={ledger}>
        {(data) => {
          if (!id) {
            return (
              <PlannedForm
                defaultCurrency={preferences.defaultCurrency}
                accounts={data.accounts}
                categories={data.categories}
                onSubmit={async (input) => {
                  await createPlanned(repositories, input);
                  navigate('/more/planned', flash('planned.saved'));
                }}
              />
            );
          }
          const planned = data.plannedExpenses.find((candidate) => candidate.id === id);
          if (!planned) return <Notice tone="error">{t('planned.notFound')}</Notice>;
          return <PlannedDetail key={planned.id} planned={planned} ledger={data} />;
        }}
      </Loaded>
    </Page>
  );
}

function PlannedDetail({ planned, ledger }: { planned: PlannedExpense; ledger: Ledger }) {
  const { t } = useI18n();
  const { repositories } = useData();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>(null);

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

  const remove = (
    <ConfirmAction
      label={t('planned.delete')}
      question={t('planned.deleteConfirm')}
      onConfirm={() =>
        run(async () => {
          await deletePlanned(repositories, planned.id);
          navigate('/more/planned', flash('planned.deleted'));
        })
      }
    />
  );

  return (
    <>
      {status ? <Notice tone={status.tone}>{status.text}</Notice> : <FlashNotice />}
      <p className={styles.meta}>
        <span className={`${styles.badge} ${planned.status === 'paid' ? styles.badgeDone : ''}`}>
          {t(PLANNED_STATUS_KEYS[planned.status])}
        </span>
      </p>
      {planned.status === 'paid' && (
        <Card>
          <Notice tone="info">{t('planned.paidInfo')}</Notice>
          {planned.linkedTransactionId && (
            <ButtonLink to={`/activity/${planned.linkedTransactionId}`} variant="secondary">
              {t('planned.seeTransaction')}
            </ButtonLink>
          )}
        </Card>
      )}
      {planned.status === 'planned' && (
        <>
          <PayAction
            planned={planned}
            ledger={ledger}
            onPaid={() => navigate('/activity', flash('planned.paid'))}
          />
          <PlannedForm
            initial={planned}
            defaultCurrency={planned.currencyCode}
            accounts={ledger.accounts}
            categories={ledger.categories}
            onSubmit={async (input) => {
              await updatePlanned(repositories, planned.id, input);
              navigate('/more/planned', flash('planned.saved'));
            }}
          />
        </>
      )}
      {planned.status !== 'paid' && (
        <div className={styles.actions}>
          <Button
            variant="secondary"
            onClick={() =>
              run(async () => {
                const cancel = planned.status === 'planned';
                await setPlannedCancelled(repositories, planned.id, cancel);
                setStatus({
                  tone: 'success',
                  text: t(cancel ? 'planned.cancelled' : 'planned.restored'),
                });
              })
            }
          >
            {t(planned.status === 'planned' ? 'planned.cancel' : 'planned.restore')}
          </Button>
        </div>
      )}
      {remove}
    </>
  );
}

/**
 * « Marquer comme payée » en deux temps (confirmation, §5.7). Le bouton est désactivé pendant
 * l'enregistrement et le service est idempotent : un double clic ne crée qu'une dépense.
 */
function PayAction({
  planned,
  ledger,
  onPaid,
}: {
  planned: PlannedExpense;
  ledger: Ledger;
  onPaid: () => void;
}) {
  const { t } = useI18n();
  const format = useFormat();
  const { repositories } = useData();
  const compatible = ledger.accounts.filter(
    (account) => !account.archivedAt && account.currencyCode === planned.currencyCode,
  );
  const [open, setOpen] = useState(false);
  const [accountId, setAccountId] = useState(
    compatible.some((account) => account.id === planned.accountId)
      ? (planned.accountId ?? '')
      : (compatible[0]?.id ?? ''),
  );
  const [date, setDate] = useState(toLocalDate(new Date()));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) {
    return (
      <Button block onClick={() => setOpen(true)}>
        {t('planned.markPaid')}
      </Button>
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setFormError(null);
    if (!accountId) {
      setErrors({ accountId: t('validation.required') });
      return;
    }
    setBusy(true);
    try {
      await markPlannedPaid(repositories, planned.id, { accountId, date });
      onPaid();
    } catch (error) {
      setErrors(fieldMessages(error, t));
      setFormError(describeError(error, t));
      setBusy(false);
    }
  }

  return (
    <form className={cardClassName} onSubmit={submit} noValidate aria-label={t('planned.markPaid')}>
      {formError && <Notice tone="error">{formError}</Notice>}
      <p>
        {t('planned.payIntro', { amount: format.money(planned.amountMinor, planned.currencyCode) })}
      </p>
      {compatible.length === 0 ? (
        <Notice tone="info">{t('debts.noCompatibleAccount')}</Notice>
      ) : (
        <SelectField
          label={t('planned.payAccount')}
          value={accountId}
          onChange={setAccountId}
          options={compatible.map((account) => ({
            value: account.id,
            label: accountLabel(account),
          }))}
          placeholder={t('transaction.chooseAccount')}
          error={errors.accountId}
        />
      )}
      <TextField
        type="date"
        label={t('planned.payDate')}
        value={date}
        onChange={setDate}
        error={errors.date}
      />
      <div className={styles.actions}>
        <Button type="submit" disabled={busy || compatible.length === 0}>
          {t('planned.payConfirm')}
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  );
}
