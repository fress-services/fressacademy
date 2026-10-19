import { describe, expect, it } from 'vitest';
import type { Account, Category } from './types';
import { validateAccount, validateTransactionDraft, type TransactionDraft } from './validation';

const base = { createdAt: 'x', updatedAt: 'x' };
const eur: Account = {
  ...base,
  id: 'eur',
  name: 'Courant',
  type: 'checking',
  currencyCode: 'EUR',
  openingBalanceMinor: 0,
  openingDate: '2026-10-01',
  archivedAt: null,
};
const eur2: Account = { ...eur, id: 'eur2', name: 'Épargne' };
const usd: Account = { ...eur, id: 'usd', currencyCode: 'USD' };
const old: Account = { ...eur, id: 'old', archivedAt: '2026-10-02T00:00:00.000Z' };
const food: Category = {
  ...base,
  id: 'food',
  kind: 'expense',
  systemKey: 'food',
  customName: null,
  icon: null,
  color: null,
  archivedAt: null,
};
const salary: Category = { ...food, id: 'salary', kind: 'income', systemKey: 'salary' };

const context = {
  accounts: new Map([eur, eur2, usd, old].map((a) => [a.id, a])),
  categories: new Map([food, salary].map((c) => [c.id, c])),
};

const expense: TransactionDraft = {
  type: 'expense',
  amountMinor: 2500,
  accountId: 'eur',
  fromAccountId: null,
  toAccountId: null,
  categoryId: 'food',
  date: '2026-10-19',
  title: 'Marché',
  note: '',
};

describe('validateAccount', () => {
  it('accepte un compte valide et refuse un solde initial négatif (A2)', () => {
    expect(validateAccount(eur)).toEqual({});
    expect(validateAccount({ ...eur, openingBalanceMinor: -1 })).toEqual({
      openingBalanceMinor: 'negative',
    });
  });

  it('exige un nom, une devise ISO et une date valide', () => {
    expect(
      validateAccount({
        ...eur,
        name: '  ',
        currencyCode: '$' as never,
        openingDate: '2026-02-30',
      }),
    ).toEqual({ name: 'required', currencyCode: 'required', openingDate: 'invalid' });
    expect(validateAccount({ ...eur, name: 'x'.repeat(61) })).toEqual({ name: 'tooLong' });
  });
});

describe('validateTransactionDraft', () => {
  it('accepte une dépense valide', () => {
    expect(validateTransactionDraft(expense, context)).toEqual({});
  });

  it('refuse un montant nul, une date invalide et une catégorie du mauvais type', () => {
    expect(
      validateTransactionDraft(
        { ...expense, amountMinor: 0, date: '19/10/2026', categoryId: 'salary' },
        context,
      ),
    ).toEqual({ amountMinor: 'notPositive', date: 'invalid', categoryId: 'wrongKind' });
  });

  it('refuse un compte archivé pour une nouvelle opération, mais pas pour une opération existante', () => {
    expect(validateTransactionDraft({ ...expense, accountId: 'old' }, context)).toEqual({
      accountId: 'archived',
    });
    const existing = {
      ...base,
      id: 't',
      ...expense,
      accountId: 'old',
      currencyCode: 'EUR',
      flow: null,
      linkedDebtId: null,
      linkedDebtRepaymentId: null,
      linkedPlannedExpenseId: null,
    } as const;
    expect(
      validateTransactionDraft({ ...expense, accountId: 'old' }, { ...context, existing }),
    ).toEqual({});
  });

  it('exige deux comptes différents de même devise pour un transfert', () => {
    const transfer: TransactionDraft = {
      ...expense,
      type: 'transfer',
      accountId: null,
      categoryId: null,
      fromAccountId: 'eur',
      toAccountId: 'eur2',
    };
    expect(validateTransactionDraft(transfer, context)).toEqual({});
    expect(validateTransactionDraft({ ...transfer, toAccountId: 'eur' }, context)).toEqual({
      toAccountId: 'sameAccount',
    });
    expect(validateTransactionDraft({ ...transfer, toAccountId: 'usd' }, context)).toEqual({
      toAccountId: 'currencyMismatch',
    });
    expect(validateTransactionDraft({ ...transfer, fromAccountId: null }, context)).toEqual({
      fromAccountId: 'required',
    });
  });

  it('limite la longueur du libellé et de la note', () => {
    expect(
      validateTransactionDraft(
        { ...expense, title: 'x'.repeat(81), note: 'y'.repeat(501) },
        context,
      ),
    ).toEqual({
      title: 'tooLong',
      note: 'tooLong',
    });
  });
});
