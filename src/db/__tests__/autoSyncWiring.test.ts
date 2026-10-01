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
import { contributeToGoal, createGoal } from '../goalRepo';
import { getPendingChanges } from '../outboxRepo';
import { setSyncRunner, resetSyncTrigger, isSyncPending } from '../../services/sync/syncTrigger';

const USER = 'user-1';

beforeEach(async () => {
  setDatabaseForTesting(createNodeSqliteDatabase());
  await initDatabase();
  resetSyncTrigger();
});

describe('local writes schedule a sync', () => {
  // The phone writes to SQLite and queues the outbox; the web reads the server.
  // Without this scheduling, the two never agree.
  it('schedules a sync when a transaction is recorded', async () => {
    const runner = vi.fn().mockResolvedValue(undefined);
    setSyncRunner(runner);

    const account = await createAccount(USER, 'Cash', 'cash', 0);
    expect(isSyncPending()).toBe(true); // account creation already queued one
    resetSyncTrigger();

    await createTransaction(USER, {
      accountId: account.id,
      type: 'income',
      amountCentavos: 100_000,
      categoryId: 'cat-salary',
      date: Date.now(),
    });

    expect(isSyncPending()).toBe(true);
    expect((await getPendingChanges()).some((c) => c.entityType === 'transactions')).toBe(true);
  });

  it('schedules a sync when a goal contribution is recorded', async () => {
    setSyncRunner(vi.fn().mockResolvedValue(undefined));
    const account = await createAccount(USER, 'Cash', 'cash', 100_000);
    resetSyncTrigger();

    const goal = await createGoal(USER, { name: 'Trip', targetAmountCentavos: 500_000 });
    resetSyncTrigger();

    await contributeToGoal(USER, goal.id, 20_000, account.id);

    const entities = (await getPendingChanges()).map((c) => c.entityType);
    expect(entities).toContain('goalContributions');
    // A contribution also writes the expense transaction, which is what makes
    // it show up on the calendar everywhere.
    expect(entities).toContain('transactions');
    expect(isSyncPending()).toBe(true);
  });

  it('the contribution transaction lands with the amount and goal id', async () => {
    setSyncRunner(vi.fn().mockResolvedValue(undefined));
    const account = await createAccount(USER, 'Cash', 'cash', 100_000);
    const goal = await createGoal(USER, { name: 'Trip', targetAmountCentavos: 500_000 });

    await contributeToGoal(USER, goal.id, 20_000, account.id);

    const txs = await getTransactions(USER);
    const tx = txs.find((t) => t.goalId === goal.id);
    expect(tx).toBeTruthy();
    expect(tx!.type).toBe('expense');
    expect(tx!.amountCentavos).toBe(20_000);
  });
});
