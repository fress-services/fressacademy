import { useState, type FormEvent } from 'react';
import { useData } from '../../app/data';
import { describeError } from '../../app/describeError';
import { Button } from '../../components/Button';
import { cardClassName, cardTitleClassName } from '../../components/Card';
import { AmountField, SelectField } from '../../components/fields';
import { Notice } from '../../components/Notice';
import { isCurrencyCode } from '../../domain/currencies';
import { parseAmount } from '../../domain/money';
import type { Budget } from '../../domain/types';
import { useI18n } from '../../i18n/context';
import { amountToInput, useFormat } from '../../i18n/format';
import { setMonthlyBudget } from '../../services/budget';
import { useCurrencyOptions } from '../shared/useCurrencyOptions';
import styles from './BudgetPage.module.css';

interface Props {
  current: Budget | null;
  month: string;
  onDone: (saved: boolean) => void;
}

/** Saisie de la limite mensuelle (montant et devise). */
export function BudgetForm({ current, month, onDone }: Props) {
  const { t } = useI18n();
  const format = useFormat();
  const { repositories, preferences } = useData();
  const currencyOptions = useCurrencyOptions();
  const [currency, setCurrency] = useState<string>(
    current?.currencyCode ?? preferences.defaultCurrency ?? '',
  );
  const [limit, setLimit] = useState(
    current ? amountToInput(current.limitMinor, current.currencyCode, format.decimalSeparator) : '',
  );
  const [errors, setErrors] = useState<{ limit?: string; currency?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (!isCurrencyCode(currency)) {
      setErrors({ currency: t('validation.required') });
      return;
    }
    const parsed = parseAmount(limit, currency);
    if (!parsed.ok) {
      setErrors({
        limit: t(`amountErrors.${parsed.error}`, { digits: format.minorUnits(currency) }),
      });
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await setMonthlyBudget(
        repositories,
        { limitMinor: parsed.amountMinor, currencyCode: currency },
        month,
      );
      onDone(true);
    } catch (error) {
      setFormError(t('errors.saveFailed', { reason: describeError(error, t) }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className={cardClassName}
      onSubmit={submit}
      noValidate
      aria-labelledby="budget-form-title"
    >
      <h2 id="budget-form-title" className={cardTitleClassName}>
        {t('budget.formTitle')}
      </h2>
      {formError && <Notice tone="error">{formError}</Notice>}
      <p className={styles.muted}>{t('budget.independence')}</p>
      <AmountField
        label={t('budget.limitLabel')}
        value={limit}
        onChange={setLimit}
        error={errors.limit}
        hint={t('budget.limitHint')}
      />
      <SelectField
        label={t('accounts.currency')}
        value={currency}
        onChange={setCurrency}
        options={currencyOptions}
        placeholder={t('accounts.currencyPlaceholder')}
        error={errors.currency}
      />
      <div className={styles.actions}>
        <Button type="submit" disabled={busy}>
          {t('common.save')}
        </Button>
        <Button variant="ghost" onClick={() => onDone(false)}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  );
}
