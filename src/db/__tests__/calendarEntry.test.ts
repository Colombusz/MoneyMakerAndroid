import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('expo-sqlite', () => ({
  openDatabaseSync: () => {
    throw new Error('expo-sqlite must not be used inside tests');
  },
}));

import { initDatabase, setDatabaseForTesting } from '../sqlite';
import { createNodeSqliteDatabase } from '../../test/nodeSqliteDatabase';
import { createAccount } from '../accountRepo';
import { createTransaction, getTransactions } from '../transactionRepo';
import { dateKeyToUtcMs } from '../../shared/utils/date';
import { calculateMonthSummary } from '../../services/monthSummaryCalculator';

const USER = 'user-1';

// Mirrors the bucketing both the day grid and the month summary use.
const dayKeyOf = (epochMs: number) => new Date(epochMs).toISOString().split('T')[0];

beforeEach(async () => {
  setDatabaseForTesting(createNodeSqliteDatabase());
  await initDatabase();
});

describe('adding a transaction from the calendar day sheet', () => {
  it('files the entry under the tapped day, not today', async () => {
    const account = await createAccount(USER, 'Cash', 'cash', 0);
    const tappedDay = '2026-10-05';

    await createTransaction(USER, {
      accountId: account.id,
      type: 'expense',
      amountCentavos: 25_000,
      categoryId: 'cat-food',
      notes: 'Lunch',
      date: dateKeyToUtcMs(tappedDay),
    });

    const [tx] = await getTransactions(USER);
    expect(dayKeyOf(tx.date)).toBe(tappedDay);
    expect(tx.notes).toBe('Lunch');
  });

  it('shows the entry in that day summary and the month totals', async () => {
    const account = await createAccount(USER, 'Cash', 'cash', 0);
    const tappedDay = '2026-10-05';

    await createTransaction(USER, {
      accountId: account.id,
      type: 'expense',
      amountCentavos: 25_000,
      categoryId: 'cat-food',
      notes: 'Lunch',
      date: dateKeyToUtcMs(tappedDay),
    });

    const txs = await getTransactions(USER);
    const summary = calculateMonthSummary(txs, 2026, 10);

    expect(summary.dailyBreakdown[tappedDay].expenseCentavos).toBe(25_000);
    expect(summary.dailyBreakdown[tappedDay].count).toBe(1);
    expect(summary.totalExpenseCentavos).toBe(25_000);
  });

  it('keeps income and expense entries on separate day buckets', async () => {
    const account = await createAccount(USER, 'Cash', 'cash', 0);
    const tappedDay = '2026-10-05';

    await createTransaction(USER, {
      accountId: account.id,
      type: 'expense',
      amountCentavos: 25_000,
      categoryId: 'cat-food',
      date: dateKeyToUtcMs(tappedDay),
    });
    await createTransaction(USER, {
      accountId: account.id,
      type: 'income',
      amountCentavos: 10_000,
      categoryId: 'cat-salary',
      source: 'Employer',
      notes: 'Refund',
      date: dateKeyToUtcMs(tappedDay),
    });

    const txs = await getTransactions(USER);
    const summary = calculateMonthSummary(txs, 2026, 10);

    expect(summary.dailyBreakdown[tappedDay]).toEqual({
      incomeCentavos: 10_000,
      expenseCentavos: 25_000,
      count: 2,
    });
    expect(summary.netCentavos).toBe(-15_000);
  });

  it('debits the account balance immediately', async () => {
    const account = await createAccount(USER, 'Cash', 'cash', 50_000);

    await createTransaction(USER, {
      accountId: account.id,
      type: 'expense',
      amountCentavos: 12_500,
      categoryId: 'cat-food',
      notes: 'Coffee',
      date: dateKeyToUtcMs('2026-10-05'),
    });

    const { getAccounts } = await import('../accountRepo');
    const { totalBalanceCentavos } = await getAccounts(USER);
    expect(totalBalanceCentavos).toBe(37_500);
  });
});
