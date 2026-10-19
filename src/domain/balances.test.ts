import { describe, expect, it } from 'vitest';
import { accountBalance, totalsByCurrency } from './balances';
import type { Account, Transaction } from './types';

const base = { createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z' };

function account(
  id: string,
  currencyCode: Account['currencyCode'],
  opening = 0,
  archived = false,
): Account {
  return {
    ...base,
    id,
    name: id,
    type: 'cash',
    currencyCode,
    openingBalanceMinor: opening,
    openingDate: '2026-10-01',
    archivedAt: archived ? base.createdAt : null,
  };
}

function tx(
  partial: Partial<Transaction> & Pick<Transaction, 'type' | 'amountMinor'>,
): Transaction {
  return {
    ...base,
    id: Math.random().toString(36),
    currencyCode: 'EUR',
    accountId: null,
    fromAccountId: null,
    toAccountId: null,
    flow: null,
    categoryId: null,
    linkedDebtId: null,
    linkedDebtRepaymentId: null,
    linkedPlannedExpenseId: null,
    date: '2026-10-10',
    title: '',
    note: '',
    ...partial,
  };
}

const courant = account('courant', 'EUR', 100000);
const epargne = account('epargne', 'EUR', 0);

describe('solde d’un compte (§6.2)', () => {
  it('part du solde initial', () => {
    expect(accountBalance(courant, [])).toBe(100000);
  });

  it('ajoute les revenus et retire les dépenses du compte concerné', () => {
    const txs = [
      tx({ type: 'income', amountMinor: 250000, accountId: 'courant' }),
      tx({ type: 'expense', amountMinor: 2500, accountId: 'courant' }),
      tx({ type: 'expense', amountMinor: 999, accountId: 'epargne' }),
    ];
    expect(accountBalance(courant, txs)).toBe(347500);
    expect(accountBalance(epargne, txs)).toBe(-999);
  });

  it('un transfert diminue la source et augmente la destination du même montant', () => {
    const txs = [
      tx({ type: 'transfer', amountMinor: 4000, fromAccountId: 'courant', toAccountId: 'epargne' }),
    ];
    expect(accountBalance(courant, txs)).toBe(96000);
    expect(accountBalance(epargne, txs)).toBe(4000);
  });

  it('applique les ajustements et règlements de dette selon leur sens', () => {
    const txs = [
      tx({ type: 'adjustment', amountMinor: 500, accountId: 'courant', flow: 'out' }),
      tx({ type: 'debt_settlement', amountMinor: 1000, accountId: 'courant', flow: 'in' }),
      tx({ type: 'debt_settlement', amountMinor: 300, accountId: 'courant', flow: 'out' }),
    ];
    expect(accountBalance(courant, txs)).toBe(100200);
  });

  it('ignore une opération d’une autre devise', () => {
    const txs = [
      tx({ type: 'income', amountMinor: 5000, accountId: 'courant', currencyCode: 'USD' }),
    ];
    expect(accountBalance(courant, txs)).toBe(100000);
  });
});

describe('totaux par devise (§5.1)', () => {
  it('n’additionne jamais deux devises et ignore les comptes archivés', () => {
    const accounts = [
      account('a', 'USD', 200000),
      account('b', 'EUR', 150000),
      account('c', 'EUR', 1000),
      account('d', 'EUR', 99999, true),
    ];
    expect(totalsByCurrency(accounts, [])).toEqual([
      { currencyCode: 'EUR', totalMinor: 151000, accountCount: 2 },
      { currencyCode: 'USD', totalMinor: 200000, accountCount: 1 },
    ]);
  });
});
