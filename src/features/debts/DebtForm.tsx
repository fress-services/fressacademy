import { useState, type FormEvent } from 'react';
import { describeError } from '../../app/describeError';
import { Button } from '../../components/Button';
import { cardClassName } from '../../components/Card';
import {
  AmountField,
  Segmented,
  SelectField,
  TextAreaField,
  TextField,
} from '../../components/fields';
import { Notice } from '../../components/Notice';
import { isCurrencyCode, type CurrencyCode } from '../../domain/currencies';
import type { DebtInput } from '../../domain/debts';
import { toLocalDate } from '../../domain/dates';
import { parseAmount } from '../../domain/money';
import type { Account, Debt, DebtDirection } from '../../domain/types';
import { LIMITS } from '../../domain/validation';
import { useI18n } from '../../i18n/context';
import { amountToInput, useFormat } from '../../i18n/format';
import { fieldMessages } from '../shared/fieldErrors';
import { useCurrencyOptions } from '../shared/useCurrencyOptions';
import styles from '../shared/list.module.css';
import { RecordInAccount } from './RecordInAccount';

interface Props {
  initial?: Debt;
  initialDirection: DebtDirection;
  defaultCurrency: CurrencyCode | null;
  accounts: Account[];
  /** Vrai si des mouvements existent : la devise ne change plus. */
  currencyLocked?: boolean;
  onSubmit: (input: DebtInput & { accountId: string | null }) => Promise<void>;
}

export function DebtForm({
  initial,
  initialDirection,
  defaultCurrency,
  accounts,
  currencyLocked,
  onSubmit,
}: Props) {
  const { t } = useI18n();
  const format = useFormat();
  const currencyOptions = useCurrencyOptions();
  const [direction, setDirection] = useState<DebtDirection>(initial?.direction ?? initialDirection);
  const [contact, setContact] = useState(initial?.contactLabel ?? '');
  const [currency, setCurrency] = useState<string>(initial?.currencyCode ?? defaultCurrency ?? '');
  const [amount, setAmount] = useState(
    initial
      ? amountToInput(initial.originalAmountMinor, initial.currencyCode, format.decimalSeparator)
      : '',
  );
  const [createdDate, setCreatedDate] = useState(initial?.createdDate ?? toLocalDate(new Date()));
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [record, setRecord] = useState(false);
  const [accountId, setAccountId] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const currencyCode = isCurrencyCode(currency) ? currency : null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    const next: Record<string, string> = {};
    let amountMinor = 0;
    if (!currencyCode) next.currencyCode = t('validation.required');
    else {
      const parsed = parseAmount(amount, currencyCode);
      if (parsed.ok) amountMinor = parsed.amountMinor;
      else
        next.originalAmountMinor = t(`amountErrors.${parsed.error}`, {
          digits: format.minorUnits(currencyCode),
        });
    }
    if (record && !accountId) next.accountId = t('validation.required');
    if (contact.trim() === '') next.contactLabel = t('validation.required');
    setErrors(next);
    if (Object.keys(next).length > 0 || !currencyCode) {
      setFormError(t('validation.formHasErrors'));
      return;
    }
    setBusy(true);
    try {
      await onSubmit({
        direction,
        contactLabel: contact,
        originalAmountMinor: amountMinor,
        currencyCode,
        createdDate,
        dueDate: dueDate === '' ? null : dueDate,
        note,
        accountId: record ? accountId : null,
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
      {!initial && (
        <Segmented<DebtDirection>
          legend={t('debts.direction')}
          name="debt-direction"
          value={direction}
          options={[
            { value: 'receivable', label: t('debts.receivableLong') },
            { value: 'payable', label: t('debts.payableLong') },
          ]}
          onChange={setDirection}
        />
      )}
      <TextField
        label={t('debts.contact')}
        value={contact}
        onChange={setContact}
        error={errors.contactLabel}
        hint={t('debts.contactHint')}
        maxLength={LIMITS.contactLabel}
        autoComplete="off"
      />
      <AmountField
        label={t('debts.amount')}
        value={amount}
        onChange={setAmount}
        error={errors.originalAmountMinor}
      />
      <SelectField
        label={t('accounts.currency')}
        value={currency}
        onChange={(value) => {
          setCurrency(value);
          setAccountId('');
        }}
        options={currencyOptions}
        placeholder={t('accounts.currencyPlaceholder')}
        error={errors.currencyCode}
        hint={currencyLocked ? t('debts.currencyLocked') : undefined}
        disabled={currencyLocked ?? false}
      />
      <TextField
        type="date"
        label={t('debts.createdDate')}
        value={createdDate}
        onChange={setCreatedDate}
        error={errors.createdDate}
      />
      <TextField
        type="date"
        label={t('debts.dueDate')}
        value={dueDate}
        onChange={setDueDate}
        error={errors.dueDate}
        hint={t('debts.dueDateHint')}
      />
      <TextAreaField
        label={t('transaction.note')}
        value={note}
        onChange={setNote}
        error={errors.note}
        maxLength={LIMITS.note}
      />
      {!initial && (
        <RecordInAccount
          label={t('debts.recordOpening')}
          explanation={t(
            direction === 'receivable'
              ? 'debts.recordOpeningReceivable'
              : 'debts.recordOpeningPayable',
          )}
          accounts={accounts}
          currency={currencyCode}
          enabled={record}
          onEnabledChange={setRecord}
          accountId={accountId}
          onAccountChange={setAccountId}
          error={errors.accountId}
        />
      )}
      <div className={styles.actions}>
        <Button type="submit" disabled={busy}>
          {t('common.save')}
        </Button>
      </div>
    </form>
  );
}
