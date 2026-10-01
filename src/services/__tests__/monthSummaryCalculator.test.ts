import { describe, it, expect } from 'vitest';
import { calculateMonthSummary } from '../monthSummaryCalculator';
import { Transaction } from '../../types';

describe('monthSummaryCalculator (Android)', () => {
  const transactions: Transaction[] = [
    {
      id: 'tx-1',
      userId: 'user-1',
      accountId: 'acc-1',
      categoryId: 'cat-food',
      type: 'expense',
      amountCentavos: 15000,
      date: new Date('2026-09-05T12:00:00Z').getTime(),
      notes: 'Groceries',
      updatedAt: Date.now(),
      deletedAt: null,
    },
    {
      id: 'tx-2',
      userId: 'user-1',
      accountId: 'acc-1',
      categoryId: 'cat-food',
      type: 'expense',
      amountCentavos: 5000,
      date: new Date('2026-09-10T12:00:00Z').getTime(),
      notes: 'Snacks',
      updatedAt: Date.now(),
      deletedAt: null,
    },
    {
      id: 'tx-3',
      userId: 'user-1',
      accountId: 'acc-1',
      categoryId: null,
      type: 'income',
      amountCentavos: 100000,
      source: 'Salary',
      date: new Date('2026-09-15T12:00:00Z').getTime(),
      updatedAt: Date.now(),
      deletedAt: null,
    },
    {
      id: 'tx-4',
      userId: 'user-1',
      accountId: 'acc-1',
      destinationAccountId: 'acc-2',
      categoryId: null,
      type: 'transfer',
      amountCentavos: 20000,
      date: new Date('2026-09-20T12:00:00Z').getTime(),
      updatedAt: Date.now(),
      deletedAt: null,
    },
  ];

  it('aggregates income, expenses, and net savings correctly', () => {
    const summary = calculateMonthSummary(transactions, 2026, 9);
    expect(summary.totalIncomeCentavos).toBe(100000);
    expect(summary.totalExpenseCentavos).toBe(20000);
    expect(summary.netCentavos).toBe(80000);
  });

  it('omits transfers from income and expenses', () => {
    const summary = calculateMonthSummary(transactions, 2026, 9);
    expect(summary.totalIncomeCentavos).toBe(100000);
    expect(summary.totalExpenseCentavos).toBe(20000);
  });

  it('calculates category totals', () => {
    const summary = calculateMonthSummary(transactions, 2026, 9);
    expect(summary.categoryTotals['cat-food']).toBe(20000);
  });

  it('produces accurate daily breakdown', () => {
    const summary = calculateMonthSummary(transactions, 2026, 9);
    expect(summary.dailyBreakdown['2026-09-05'].expenseCentavos).toBe(15000);
    expect(summary.dailyBreakdown['2026-09-15'].incomeCentavos).toBe(100000);
  });

  it('groups shared goal contributions under virtual category', () => {
    const sharedGoalTx: Transaction = {
      ...transactions[0],
      id: 'tx-sg',
      categoryId: null,
      goalId: 'goal-123',
      amountCentavos: 25000,
      date: new Date('2026-09-12T12:00:00Z').getTime(),
    };
    const allTx = [...transactions, sharedGoalTx];
    const summary = calculateMonthSummary(allTx, 2026, 9);
    expect(summary.totalExpenseCentavos).toBe(45000); // 20000 + 25000
    expect(summary.categoryTotals['__shared_goal__']).toBe(25000);
  });

  it('groups shared account deposits under virtual category', () => {
    const sharedAccTx: Transaction = {
      ...transactions[0],
      id: 'tx-sa',
      categoryId: null,
      sharedAccountId: 'shared-acc-456',
      amountCentavos: 30000,
      date: new Date('2026-09-18T12:00:00Z').getTime(),
    };
    const allTx = [...transactions, sharedAccTx];
    const summary = calculateMonthSummary(allTx, 2026, 9);
    expect(summary.totalExpenseCentavos).toBe(50000); // 20000 + 30000
    expect(summary.categoryTotals['__shared_account__']).toBe(30000);
  });

  it('groups truly uncategorized expenses under __uncategorized__', () => {
    const uncategorizedTx: Transaction = {
      ...transactions[0],
      id: 'tx-uncat',
      categoryId: null,
      goalId: null,
      sharedAccountId: null,
      amountCentavos: 7000,
      date: new Date('2026-09-22T12:00:00Z').getTime(),
    };
    const allTx = [...transactions, uncategorizedTx];
    const summary = calculateMonthSummary(allTx, 2026, 9);
    expect(summary.totalExpenseCentavos).toBe(27000); // 20000 + 7000
    expect(summary.categoryTotals['__uncategorized__']).toBe(7000);
  });

  it('prefers goalId over sharedAccountId when both present', () => {
    const bothTx: Transaction = {
      ...transactions[0],
      id: 'tx-both',
      categoryId: null,
      goalId: 'goal-123',
      sharedAccountId: 'shared-acc-456',
      amountCentavos: 10000,
      date: new Date('2026-09-25T12:00:00Z').getTime(),
    };
    const allTx = [...transactions, bothTx];
    const summary = calculateMonthSummary(allTx, 2026, 9);
    expect(summary.categoryTotals['__shared_goal__']).toBe(10000);
    expect(summary.categoryTotals['__shared_account__']).toBeUndefined();
  });
});
