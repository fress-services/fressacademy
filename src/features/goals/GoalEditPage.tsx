import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useData } from '../../app/data';
import { describeError } from '../../app/describeError';
import { Button } from '../../components/Button';
import { cardClassName } from '../../components/Card';
import { ConfirmAction } from '../../components/ConfirmAction';
import { AmountField, SelectField, TextAreaField, TextField } from '../../components/fields';
import { Notice } from '../../components/Notice';
import { Page } from '../../components/Page';
import { isCurrencyCode } from '../../domain/currencies';
import type { GoalInput } from '../../domain/goals';
import { parseAmount } from '../../domain/money';
import type { SavingsGoal } from '../../domain/types';
import { LIMITS } from '../../domain/validation';
import { useI18n } from '../../i18n/context';
import { amountToInput, useFormat } from '../../i18n/format';
import { createGoal, deleteGoal, updateGoal } from '../../services/goals';
import { fieldMessages } from '../shared/fieldErrors';
import { Loaded } from '../shared/Loaded';
import { flash } from '../shared/useFlash';
import { useCurrencyOptions } from '../shared/useCurrencyOptions';
import { useLedger } from '../shared/useLedger';
import styles from '../shared/list.module.css';

/** /more/goals/new et /more/goals/:id. */
export function GoalEditPage() {
  const { t } = useI18n();
  const { id } = useParams();
  const ledger = useLedger();
  const { repositories } = useData();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  return (
    <Page title={t(id ? 'goals.editTitle' : 'goals.newTitle')} backTo="/more/goals">
      {error && <Notice tone="error">{error}</Notice>}
      <Loaded state={ledger}>
        {({ goals }) => {
          if (!id) {
            return (
              <GoalForm
                onSubmit={async (input) => {
                  await createGoal(repositories, input);
                  navigate('/more/goals', flash('goals.saved'));
                }}
              />
            );
          }
          const goal = goals.find((candidate) => candidate.id === id);
          if (!goal) return <Notice tone="error">{t('goals.notFound')}</Notice>;
          return (
            <>
              <GoalForm
                key={goal.id}
                initial={goal}
                onSubmit={async (input) => {
                  await updateGoal(repositories, goal.id, input);
                  navigate('/more/goals', flash('goals.saved'));
                }}
              />
              <ConfirmAction
                label={t('goals.delete')}
                question={t('goals.deleteConfirm')}
                onConfirm={async () => {
                  try {
                    await deleteGoal(repositories, goal.id);
                    navigate('/more/goals', flash('goals.deleted'));
                  } catch (failure) {
                    setError(t('errors.saveFailed', { reason: describeError(failure, t) }));
                  }
                }}
              />
            </>
          );
        }}
      </Loaded>
    </Page>
  );
}

function GoalForm({
  initial,
  onSubmit,
}: {
  initial?: SavingsGoal;
  onSubmit: (input: GoalInput) => Promise<void>;
}) {
  const { t } = useI18n();
  const format = useFormat();
  const { preferences } = useData();
  const currencyOptions = useCurrencyOptions();
  const toInput = (amount: number, currency: SavingsGoal['currencyCode']) =>
    amountToInput(amount, currency, format.decimalSeparator);
  const [title, setTitle] = useState(initial?.title ?? '');
  const [currency, setCurrency] = useState<string>(
    initial?.currencyCode ?? preferences.defaultCurrency ?? '',
  );
  const [target, setTarget] = useState(
    initial ? toInput(initial.targetAmountMinor, initial.currencyCode) : '',
  );
  const [current, setCurrent] = useState(
    initial ? toInput(initial.currentAmountMinor, initial.currencyCode) : '',
  );
  const [targetDate, setTargetDate] = useState(initial?.targetDate ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    const next: Record<string, string> = {};
    let targetMinor = 0;
    let currentMinor = 0;
    if (!isCurrencyCode(currency)) next.currencyCode = t('validation.required');
    else {
      const digits = format.minorUnits(currency);
      const parsedTarget = parseAmount(target, currency);
      if (parsedTarget.ok) targetMinor = parsedTarget.amountMinor;
      else next.targetAmountMinor = t(`amountErrors.${parsedTarget.error}`, { digits });
      if (current.trim() !== '') {
        const parsedCurrent = parseAmount(current, currency);
        if (parsedCurrent.ok) currentMinor = parsedCurrent.amountMinor;
        else if (parsedCurrent.error !== 'notPositive') {
          next.currentAmountMinor = t(`amountErrors.${parsedCurrent.error}`, { digits });
        }
      }
    }
    if (title.trim() === '') next.title = t('validation.required');
    setErrors(next);
    if (Object.keys(next).length > 0 || !isCurrencyCode(currency)) {
      setFormError(t('validation.formHasErrors'));
      return;
    }
    setBusy(true);
    try {
      await onSubmit({
        title,
        targetAmountMinor: targetMinor,
        currentAmountMinor: currentMinor,
        currencyCode: currency,
        targetDate: targetDate === '' ? null : targetDate,
        note,
      });
    } catch (error) {
      setErrors(fieldMessages(error, t));
      setFormError(describeError(error, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={cardClassName} onSubmit={submit} noValidate>
      {formError && <Notice tone="error">{formError}</Notice>}
      <TextField
        label={t('goals.name')}
        value={title}
        onChange={setTitle}
        error={errors.title}
        maxLength={LIMITS.goalName}
        autoComplete="off"
      />
      <SelectField
        label={t('accounts.currency')}
        value={currency}
        onChange={setCurrency}
        options={currencyOptions}
        placeholder={t('accounts.currencyPlaceholder')}
        error={errors.currencyCode}
      />
      <AmountField
        label={t('goals.target')}
        value={target}
        onChange={setTarget}
        error={errors.targetAmountMinor}
      />
      <AmountField
        label={t('goals.current')}
        value={current}
        onChange={setCurrent}
        error={errors.currentAmountMinor}
        hint={t('goals.currentHint')}
      />
      <TextField
        type="date"
        label={t('goals.targetDate')}
        value={targetDate}
        onChange={setTargetDate}
        error={errors.targetDate}
        hint={t('goals.targetDateHint')}
      />
      <TextAreaField
        label={t('transaction.note')}
        value={note}
        onChange={setNote}
        error={errors.note}
        maxLength={LIMITS.note}
      />
      <div className={styles.actions}>
        <Button type="submit" disabled={busy}>
          {t('common.save')}
        </Button>
      </div>
    </form>
  );
}
