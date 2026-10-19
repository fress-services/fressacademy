import { useState, type FormEvent } from 'react';
import { useData } from '../../app/data';
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
import { DEFAULT_CATEGORY_KEY } from '../../domain/categories';
import { toLocalDate } from '../../domain/dates';
import { parseAmount } from '../../domain/money';
import type { Account, Category, Transaction } from '../../domain/types';
import {
  LIMITS,
  type TransactionDraft,
  type TransactionField,
  type ValidationCode,
} from '../../domain/validation';
import { useI18n } from '../../i18n/context';
import { amountToInput, useFormat } from '../../i18n/format';
import { ValidationError } from '../../services/errors';
import { saveTransaction } from '../../services/transactions';
import { accountLabel, categoryLabel } from '../shared/labels';
import styles from './TransactionForm.module.css';

export type EditableType = TransactionDraft['type'];
export const EDITABLE_TYPES: readonly EditableType[] = ['expense', 'income', 'transfer'];

interface Props {
  accounts: Account[];
  categories: Category[];
  initial?: Transaction;
  initialType: EditableType;
  onSaved: (transaction: Transaction) => void;
}

type Errors = Partial<Record<TransactionField, string>>;

function defaultCategoryId(categories: Category[], kind: 'income' | 'expense'): string {
  return categories.find((category) => category.systemKey === DEFAULT_CATEGORY_KEY[kind])?.id ?? '';
}

/** Saisie d'un revenu, d'une dépense ou d'un transfert (création ou modification). */
export function TransactionForm({ accounts, categories, initial, initialType, onSaved }: Props) {
  const { t } = useI18n();
  const format = useFormat();
  const { repositories } = useData();
  const active = accounts.filter((account) => !account.archivedAt);
  const [type, setType] = useState<EditableType>(initialType);
  const [accountId, setAccountId] = useState(initial?.accountId ?? active[0]?.id ?? '');
  const [fromAccountId, setFromAccountId] = useState(initial?.fromAccountId ?? active[0]?.id ?? '');
  const [toAccountId, setToAccountId] = useState(
    initial?.toAccountId ??
      active.find(
        (account) =>
          account.id !== active[0]?.id && account.currencyCode === active[0]?.currencyCode,
      )?.id ??
      '',
  );
  const [categoryId, setCategoryId] = useState(
    initial?.categoryId ??
      (initialType === 'transfer' ? '' : defaultCategoryId(categories, initialType)),
  );
  const [amount, setAmount] = useState(
    initial
      ? amountToInput(initial.amountMinor, initial.currencyCode, format.decimalSeparator)
      : '',
  );
  const [date, setDate] = useState(initial?.date ?? toLocalDate(new Date()));
  const [title, setTitle] = useState(initial?.title ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isTransfer = type === 'transfer';
  const byId = new Map(accounts.map((account) => [account.id, account]));
  const mainAccount = byId.get(isTransfer ? fromAccountId : accountId);

  // Un compte archivé reste proposé s'il est déjà utilisé par l'opération modifiée.
  const accountOptions = (selected: string) =>
    accounts
      .filter((account) => !account.archivedAt || account.id === selected)
      .map((account) => ({ value: account.id, label: accountLabel(account) }));
  const categoryOptions = isTransfer
    ? []
    : categories
        .filter(
          (category) =>
            category.kind === type && (!category.archivedAt || category.id === initial?.categoryId),
        )
        .map((category) => ({ value: category.id, label: categoryLabel(category, t) }));

  function changeType(next: EditableType) {
    setType(next);
    if (next !== 'transfer') {
      const current = categories.find((category) => category.id === categoryId);
      if (current?.kind !== next) setCategoryId(defaultCategoryId(categories, next));
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    const next: Errors = {};
    let amountMinor = 0;
    if (mainAccount) {
      const parsed = parseAmount(amount, mainAccount.currencyCode);
      if (parsed.ok) amountMinor = parsed.amountMinor;
      else
        next.amountMinor = t(`amountErrors.${parsed.error}`, {
          digits: format.minorUnits(mainAccount.currencyCode),
        });
    }
    const draft: TransactionDraft = {
      type,
      amountMinor,
      accountId: isTransfer ? null : accountId || null,
      fromAccountId: isTransfer ? fromAccountId || null : null,
      toAccountId: isTransfer ? toAccountId || null : null,
      categoryId: isTransfer ? null : categoryId || null,
      date,
      title,
      note,
    };
    if (next.amountMinor) {
      setErrors(next);
      setFormError(t('validation.formHasErrors'));
      return;
    }
    setBusy(true);
    try {
      onSaved(await saveTransaction(repositories, draft, initial?.id));
    } catch (error) {
      if (error instanceof ValidationError) {
        const fieldErrors = error.fieldErrors as Partial<Record<TransactionField, ValidationCode>>;
        setErrors(
          Object.fromEntries(
            Object.entries(fieldErrors).map(([field, code]) => [
              field,
              t(`validation.${code as ValidationCode}`),
            ]),
          ),
        );
      } else setErrors({});
      setFormError(describeError(error, t));
    } finally {
      setBusy(false);
    }
  }

  const sameCurrencyCount = active.filter(
    (account) => account.currencyCode === (mainAccount?.currencyCode ?? active[0]?.currencyCode),
  ).length;

  return (
    <form className={cardClassName} onSubmit={submit} noValidate>
      {formError && <Notice tone="error">{formError}</Notice>}
      {initial?.linkedPlannedExpenseId ? (
        <Notice tone="info">{t('business.plannedStaysExpense')}</Notice>
      ) : (
        <Segmented<EditableType>
          legend={t('transaction.type')}
          name="transaction-type"
          value={type}
          options={EDITABLE_TYPES.map((value) => ({
            value,
            label: t(`transactionTypes.${value}`),
          }))}
          onChange={changeType}
        />
      )}
      {isTransfer && sameCurrencyCount < 2 && (
        <Notice tone="info">{t('transaction.transferNeedsTwo')}</Notice>
      )}
      <AmountField
        label={t('transaction.amount')}
        value={amount}
        onChange={setAmount}
        error={errors.amountMinor}
        hint={
          mainAccount
            ? t('transaction.amountHint', { currency: mainAccount.currencyCode })
            : undefined
        }
      />
      {isTransfer ? (
        <>
          <SelectField
            label={t('transaction.from')}
            value={fromAccountId}
            onChange={setFromAccountId}
            options={accountOptions(initial?.fromAccountId ?? '')}
            placeholder={t('transaction.chooseAccount')}
            error={errors.fromAccountId}
          />
          <SelectField
            label={t('transaction.to')}
            value={toAccountId}
            onChange={setToAccountId}
            options={accountOptions(initial?.toAccountId ?? '')}
            placeholder={t('transaction.chooseAccount')}
            error={errors.toAccountId}
          />
        </>
      ) : (
        <>
          <SelectField
            label={t('transaction.account')}
            value={accountId}
            onChange={setAccountId}
            options={accountOptions(initial?.accountId ?? '')}
            placeholder={t('transaction.chooseAccount')}
            error={errors.accountId}
          />
          <SelectField
            label={t('transaction.category')}
            value={categoryId}
            onChange={setCategoryId}
            options={categoryOptions}
            error={errors.categoryId}
          />
        </>
      )}
      <TextField
        type="date"
        label={t('transaction.date')}
        value={date}
        onChange={setDate}
        error={errors.date}
      />
      <TextField
        label={t('transaction.title')}
        value={title}
        onChange={setTitle}
        error={errors.title}
        hint={t('transaction.titleHint')}
        maxLength={LIMITS.title}
        autoComplete="off"
      />
      <TextAreaField
        label={t('transaction.note')}
        value={note}
        onChange={setNote}
        error={errors.note}
        hint={t('transaction.noteHint')}
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
