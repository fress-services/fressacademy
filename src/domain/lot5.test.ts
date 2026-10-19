import { describe, expect, it } from 'vitest';
import { debtSummary, settlementFlow, validateDebt, validateRepayment } from './debts';
import { goalProgress, validateGoal } from './goals';
import { isPlannedOverdue, upcomingPlanned, validatePlanned } from './planned';
import type { Debt, DebtRepayment, PlannedExpense, SavingsGoal } from './types';

const base = { createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z' };

function debt(partial: Partial<Debt> = {}): Debt {
  return {
    ...base,
    id: 'd1',
    direction: 'receivable',
    contactLabel: 'Awa',
    originalAmountMinor: 3000,
    currencyCode: 'EUR',
    createdDate: '2026-10-01',
    dueDate: null,
    note: '',
    openingTransactionId: null,
    archivedAt: null,
    ...partial,
  };
}

function repayment(amountMinor: number, debtId = 'd1'): DebtRepayment {
  return {
    ...base,
    id: Math.random().toString(36),
    debtId,
    amountMinor,
    date: '2026-10-05',
    note: '',
    linkedTransactionId: null,
  };
}

describe('dettes (§5.6)', () => {
  it('calcule remboursé, restant et statut', () => {
    expect(debtSummary(debt(), [], '2026-10-19')).toEqual({
      repaidMinor: 0,
      remainingMinor: 3000,
      status: 'open',
      overdue: false,
    });
    // §6.5 : rembourser 10 sur 30 → reste 20, partiellement remboursée.
    expect(
      debtSummary(debt(), [repayment(1000), repayment(500, 'autre')], '2026-10-19'),
    ).toMatchObject({
      repaidMinor: 1000,
      remainingMinor: 2000,
      status: 'partial',
    });
    expect(debtSummary(debt(), [repayment(1000), repayment(2000)], '2026-10-19')).toMatchObject({
      remainingMinor: 0,
      status: 'settled',
    });
  });

  it('dérive « en retard » de l’échéance et du solde restant', () => {
    const due = debt({ dueDate: '2026-10-10' });
    expect(debtSummary(due, [], '2026-10-10').overdue).toBe(false);
    expect(debtSummary(due, [], '2026-10-11').overdue).toBe(true);
    expect(debtSummary(due, [repayment(3000)], '2026-10-11').overdue).toBe(false);
  });

  it('donne le sens du mouvement sur le compte', () => {
    expect(settlementFlow('receivable', 'opening')).toBe('out');
    expect(settlementFlow('receivable', 'repayment')).toBe('in');
    expect(settlementFlow('payable', 'opening')).toBe('in');
    expect(settlementFlow('payable', 'repayment')).toBe('out');
  });

  it('refuse un remboursement supérieur au solde restant', () => {
    const input = { amountMinor: 2001, date: '2026-10-19', note: '' };
    expect(validateRepayment(input, 2000)).toEqual({ amountMinor: 'exceedsRemaining' });
    expect(validateRepayment({ ...input, amountMinor: 2000 }, 2000)).toEqual({});
    expect(validateRepayment({ ...input, amountMinor: 0 }, 2000)).toEqual({
      amountMinor: 'notPositive',
    });
  });

  it('refuse un montant initial inférieur au déjà remboursé (A12)', () => {
    expect(validateDebt(debt({ originalAmountMinor: 900 }), 1000)).toEqual({
      originalAmountMinor: 'belowRepaid',
    });
    expect(validateDebt(debt({ contactLabel: ' ', dueDate: '2026-02-30' }))).toEqual({
      contactLabel: 'required',
      dueDate: 'invalid',
    });
  });
});

function planned(partial: Partial<PlannedExpense>): PlannedExpense {
  return {
    ...base,
    id: Math.random().toString(36),
    title: 'Loyer',
    amountMinor: 6000,
    currencyCode: 'EUR',
    dueDate: '2026-11-01',
    categoryId: null,
    accountId: null,
    note: '',
    status: 'planned',
    linkedTransactionId: null,
    ...partial,
  };
}

describe('dépenses prévues (§5.7)', () => {
  it('liste seulement les dépenses prévues, par échéance', () => {
    const list = [
      planned({ title: 'B', dueDate: '2026-11-05' }),
      planned({ title: 'Payée', status: 'paid' }),
      planned({ title: 'A', dueDate: '2026-10-25' }),
      planned({ title: 'Annulée', status: 'cancelled' }),
    ];
    expect(upcomingPlanned(list).map((p) => p.title)).toEqual(['A', 'B']);
  });

  it('signale une échéance dépassée', () => {
    expect(isPlannedOverdue(planned({ dueDate: '2026-10-18' }), '2026-10-19')).toBe(true);
    expect(isPlannedOverdue(planned({ dueDate: '2026-10-19' }), '2026-10-19')).toBe(false);
    expect(isPlannedOverdue(planned({ dueDate: '2026-10-18', status: 'paid' }), '2026-10-19')).toBe(
      false,
    );
  });

  it('valide libellé, montant et échéance', () => {
    expect(validatePlanned(planned({ title: '', amountMinor: 0, dueDate: 'x' }))).toEqual({
      title: 'required',
      amountMinor: 'notPositive',
      dueDate: 'invalid',
    });
  });
});

function goal(current: number, target = 10000): SavingsGoal {
  return {
    ...base,
    id: 'g',
    title: 'Moto',
    targetAmountMinor: target,
    currentAmountMinor: current,
    currencyCode: 'XAF',
    targetDate: null,
    note: '',
    archivedAt: null,
  };
}

describe('objectifs (§5.8)', () => {
  it('borne la progression entre 0 et 100 %', () => {
    expect(goalProgress(goal(0))).toEqual({ percent: 0, remainingMinor: 10000, reached: false });
    expect(goalProgress(goal(2550))).toEqual({ percent: 25, remainingMinor: 7450, reached: false });
    expect(goalProgress(goal(15000))).toEqual({ percent: 100, remainingMinor: 0, reached: true });
  });

  it('refuse une cible nulle et une progression négative', () => {
    expect(validateGoal({ ...goal(-1, 0) })).toEqual({
      targetAmountMinor: 'notPositive',
      currentAmountMinor: 'negative',
    });
  });
});
