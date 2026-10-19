import type { CurrencyCode } from './currencies';
import { sumMinor, type MinorAmount } from './money';
import type { Account, Transaction, Uuid } from './types';

/**
 * Effet d'une opération sur le solde d'un compte (cahier des charges §6.2) :
 * revenu +, dépense −, transfert sortant −, entrant +, règlement de dette et ajustement selon flow.
 * Une opération d'une autre devise que le compte n'a jamais d'effet (pas de conversion en V1).
 */
export function balanceEffect(transaction: Transaction, account: Account): MinorAmount {
  if (transaction.currencyCode !== account.currencyCode) return 0;
  const amount = transaction.amountMinor;
  switch (transaction.type) {
    case 'income':
      return transaction.accountId === account.id ? amount : 0;
    case 'expense':
      return transaction.accountId === account.id ? -amount : 0;
    case 'transfer':
      if (transaction.fromAccountId === transaction.toAccountId) return 0;
      if (transaction.fromAccountId === account.id) return -amount;
      if (transaction.toAccountId === account.id) return amount;
      return 0;
    case 'debt_settlement':
    case 'adjustment':
      if (transaction.accountId !== account.id) return 0;
      return transaction.flow === 'in' ? amount : transaction.flow === 'out' ? -amount : 0;
  }
}

/** Solde actuel = solde initial + effets de toutes les opérations réelles liées au compte. */
export function accountBalance(
  account: Account,
  transactions: readonly Transaction[],
): MinorAmount {
  return sumMinor([
    account.openingBalanceMinor,
    ...transactions.map((transaction) => balanceEffect(transaction, account)),
  ]);
}

/** Soldes de chaque compte, indexés par identifiant. */
export function accountBalances(
  accounts: readonly Account[],
  transactions: readonly Transaction[],
): Map<Uuid, MinorAmount> {
  return new Map(accounts.map((account) => [account.id, accountBalance(account, transactions)]));
}

export interface CurrencyTotal {
  currencyCode: CurrencyCode;
  totalMinor: MinorAmount;
  accountCount: number;
}

/**
 * Totaux par devise des comptes actifs. Les devises ne sont jamais additionnées entre elles
 * (cahier des charges §5.1) ; résultat trié par code de devise.
 */
export function totalsByCurrency(
  accounts: readonly Account[],
  transactions: readonly Transaction[],
): CurrencyTotal[] {
  const balances = accountBalances(accounts, transactions);
  const totals = new Map<CurrencyCode, CurrencyTotal>();
  for (const account of accounts) {
    if (account.archivedAt) continue;
    const current = totals.get(account.currencyCode) ?? {
      currencyCode: account.currencyCode,
      totalMinor: 0,
      accountCount: 0,
    };
    totals.set(account.currencyCode, {
      currencyCode: account.currencyCode,
      totalMinor: sumMinor([current.totalMinor, balances.get(account.id) ?? 0]),
      accountCount: current.accountCount + 1,
    });
  }
  return [...totals.values()].sort((a, b) => a.currencyCode.localeCompare(b.currencyCode));
}

/** Vrai si une opération concerne ce compte (compte principal, source ou destination). */
export function involvesAccount(transaction: Transaction, accountId: Uuid): boolean {
  return (
    transaction.accountId === accountId ||
    transaction.fromAccountId === accountId ||
    transaction.toAccountId === accountId
  );
}
