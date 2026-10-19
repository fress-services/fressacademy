import { useState, type FormEvent } from 'react';
import { describeError } from '../../app/describeError';
import { Button } from '../../components/Button';
import { cardClassName } from '../../components/Card';
import { AmountField, SelectField, TextAreaField, TextField } from '../../components/fields';
import { Notice } from '../../components/Notice';
import { isCurrencyCode, type CurrencyCode } from '../../domain/currencies';
import { toLocalDate } from '../../domain/dates';
import { parseAmount } from '../../domain/money';
import type { PlannedInput } from '../../domain/planned';
import type { Account, Category, PlannedExpense } from '../../domain/types';
import { LIMITS } from '../../domain/validation';
import { useI18n } from '../../i18n/context';
import { amountToInput, useFormat } from '../../i18n/format';
import { fieldMessages } from '../shared/fieldErrors';
import { accountLabel, categoryLabel } from '../shared/labels';
import { useCurrencyOptions } from '../shared/useCurrencyOptions';
import styles from '../shared/list.module.css';

interface Props {
  initial?: PlannedExpense;
  defaultCurrency: CurrencyCode | null;
  accounts: Account[];
  categories: Category[];
  onSubmit: (input: PlannedInput) => Promise<void>;
}

export function PlannedForm({ initial, defaultCurrency, accounts, categories, onSubmit }: Props) {
  const { t } = useI18n();
  const format = useFormat();
  const currencyOptions = useCurrencyOptions();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [currency, setCurrency] = useState<string>(initial?.currencyCode ?? defaultCurrency ?? '');
  const [amount, setAmount] = useState(
    initial
      ? amountToInput(initial.amountMinor, initial.currencyCode, format.decimalSeparator)
      : '',
  );
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? toLocalDate(new Date()));
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? '');
  const [accountId, setAccountId] = useState(initial?.accountId ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const currencyCode = isCurrencyCode(currency) ? currency : null;

  const categoryOptions = [
    { value: '', label: t('planned.categoryNone') },
    ...categories
      .filter(
        (category) =>
          category.kind === 'expense' &&
          (!category.archivedAt || category.id === initial?.categoryId),
      )
      .map((category) => ({ value: category.id, label: categoryLabel(category, t) })),
  ];
  const accountOptions = [
    { value: '', label: t('planned.accountNone') },
    ...accounts
      .filter((account) => !account.archivedAt && account.currencyCode === currencyCode)
      .map((account) => ({ value: account.id, label: accountLabel(account) })),
  ];

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
        next.amountMinor = t(`amountErrors.${parsed.error}`, {
          digits: format.minorUnits(currencyCode),
        });
    }
    if (title.trim() === '') next.title = t('validation.required');
    setErrors(next);
    if (Object.keys(next).length > 0 || !currencyCode) {
      setFormError(t('validation.formHasErrors'));
      return;
    }
    setBusy(true);
    try {
      await onSubmit({
        title,
        amountMinor,
        currencyCode,
        dueDate,
        categoryId: categoryId || null,
        accountId: accountId || null,
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
        label={t('planned.name')}
        value={title}
        onChange={setTitle}
        error={errors.title}
        maxLength={LIMITS.title}
        autoComplete="off"
      />
      <AmountField
        label={t('planned.amount')}
        value={amount}
        onChange={setAmount}
        error={errors.amountMinor}
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
      />
      <TextField
        type="date"
        label={t('planned.dueDate')}
        value={dueDate}
        onChange={setDueDate}
        error={errors.dueDate}
      />
      <SelectField
        label={t('planned.category')}
        value={categoryId}
        onChange={setCategoryId}
        options={categoryOptions}
        error={errors.categoryId}
      />
      <SelectField
        label={t('planned.account')}
        value={accountId}
        onChange={setAccountId}
        options={accountOptions}
        error={errors.accountId}
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
