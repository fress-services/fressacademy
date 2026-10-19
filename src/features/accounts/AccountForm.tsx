import { useState, type FormEvent } from 'react';
import { Button } from '../../components/Button';
import { cardClassName } from '../../components/Card';
import { AmountField, SelectField, TextField } from '../../components/fields';
import { Notice } from '../../components/Notice';
import { describeError } from '../../app/describeError';
import { isCurrencyCode, type CurrencyCode } from '../../domain/currencies';
import { isLocalDate, toLocalDate } from '../../domain/dates';
import { parseAmount } from '../../domain/money';
import { ACCOUNT_TYPES, type Account, type AccountType } from '../../domain/types';
import { LIMITS, type AccountField, type ValidationCode } from '../../domain/validation';
import { useI18n } from '../../i18n/context';
import { amountToInput, useFormat } from '../../i18n/format';
import type { AccountInput } from '../../services/accounts';
import { ValidationError } from '../../services/errors';
import { useCurrencyOptions } from '../shared/useCurrencyOptions';
import styles from './AccountForm.module.css';

interface Props {
  initial?: Account;
  defaultCurrency: CurrencyCode | null;
  currencyLocked?: boolean;
  submitLabel: string;
  onSubmit: (input: AccountInput) => Promise<void>;
  secondaryAction?: React.ReactNode;
}

type Errors = Partial<Record<AccountField, string>>;

/** Formulaire de compte, partagé par le premier lancement, la création et la modification. */
export function AccountForm({
  initial,
  defaultCurrency,
  currencyLocked,
  submitLabel,
  onSubmit,
  secondaryAction,
}: Props) {
  const { t } = useI18n();
  const format = useFormat();
  const currencyOptions = useCurrencyOptions();
  const [name, setName] = useState(initial?.name ?? '');
  const [type, setType] = useState<AccountType>(initial?.type ?? 'cash');
  const [currency, setCurrency] = useState<string>(initial?.currencyCode ?? defaultCurrency ?? '');
  const [opening, setOpening] = useState(
    initial
      ? amountToInput(initial.openingBalanceMinor, initial.currencyCode, format.decimalSeparator)
      : '',
  );
  const [openingDate, setOpeningDate] = useState(initial?.openingDate ?? toLocalDate(new Date()));
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const message = (code: ValidationCode) => t(`validation.${code}`);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    const next: Errors = {};
    let openingMinor = 0;
    if (!isCurrencyCode(currency)) next.currencyCode = message('required');
    else if (opening.trim() !== '') {
      const parsed = parseAmount(opening, currency);
      if (parsed.ok) openingMinor = parsed.amountMinor;
      else if (parsed.error !== 'notPositive') {
        next.openingBalanceMinor = t(`amountErrors.${parsed.error}`, {
          digits: format.minorUnits(currency),
        });
      }
    }
    if (!isLocalDate(openingDate)) next.openingDate = message('invalid');
    if (name.trim() === '') next.name = message('required');
    setErrors(next);
    if (Object.keys(next).length > 0 || !isCurrencyCode(currency)) {
      setFormError(t('validation.formHasErrors'));
      return;
    }
    setBusy(true);
    try {
      await onSubmit({
        name,
        type,
        currencyCode: currency,
        openingBalanceMinor: openingMinor,
        openingDate,
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        const fieldErrors = error.fieldErrors as Partial<Record<AccountField, ValidationCode>>;
        setErrors(
          Object.fromEntries(
            Object.entries(fieldErrors).map(([field, code]) => [
              field,
              message(code as ValidationCode),
            ]),
          ),
        );
      }
      setFormError(describeError(error, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={cardClassName} onSubmit={submit} noValidate>
      {formError && <Notice tone="error">{formError}</Notice>}
      <TextField
        label={t('accounts.name')}
        value={name}
        onChange={setName}
        error={errors.name}
        maxLength={LIMITS.accountName}
        autoComplete="off"
      />
      <SelectField
        label={t('accounts.type')}
        value={type}
        onChange={(value) => setType(value as AccountType)}
        options={ACCOUNT_TYPES.map((value) => ({ value, label: t(`accountTypes.${value}`) }))}
      />
      <SelectField
        label={t('accounts.currency')}
        value={currency}
        onChange={setCurrency}
        options={currencyOptions}
        placeholder={t('accounts.currencyPlaceholder')}
        error={errors.currencyCode}
        hint={currencyLocked ? t('accounts.currencyLocked') : undefined}
        disabled={currencyLocked ?? false}
      />
      <AmountField
        label={t('accounts.openingBalance')}
        value={opening}
        onChange={setOpening}
        error={errors.openingBalanceMinor}
        hint={t('accounts.openingBalanceHint')}
      />
      <TextField
        type="date"
        label={t('accounts.openingDate')}
        value={openingDate}
        onChange={setOpeningDate}
        error={errors.openingDate}
      />
      <div className={styles.actions}>
        <Button type="submit" disabled={busy}>
          {submitLabel}
        </Button>
        {secondaryAction}
      </div>
    </form>
  );
}
