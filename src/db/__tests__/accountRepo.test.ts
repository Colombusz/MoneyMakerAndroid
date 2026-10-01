import { beforeEach, describe, expect, it, vi } from 'vitest';

// Repositories import expo-sqlite at module load; block it so the test only
// exercises the injected Node-backed database.
vi.mock('expo-sqlite', () => ({
  openDatabaseSync: () => {
    throw new Error('expo-sqlite must not be used inside tests');
  },
}));

import { initDatabase, setDatabaseForTesting } from '../sqlite';
import { createNodeSqliteDatabase } from '../../test/nodeSqliteDatabase';
import { createAccount, getAccounts, deleteAccount } from '../accountRepo';
import { createTransaction } from '../transactionRepo';
import { getPendingChanges } from '../outboxRepo';

const USER = 'user-1';

beforeEach(async () => {
  setDatabaseForTesting(createNodeSqliteDatabase());
  await initDatabase();
});

describe('accountRepo against a real SQLite database', () => {
  it('runs the migrations and creates an account', async () => {
    const account = await createAccount(USER, 'Payroll', 'payroll', 500_000);
    expect(account.id).toBeTruthy();
    expect(account.startingBalanceCentavos).toBe(500_000);
  });

  it('computes account balances as a read-time aggregate', async () => {
    const account = await createAccount(USER, 'Payroll', 'payroll', 500_000);
    await createTransaction(USER, {
      accountId: account.id,
      type: 'income',
      amountCentavos: 100_000,
      date: Date.now(),
    });
    await createTransaction(USER, {
      accountId: account.id,
      type: 'expense',
      amountCentavos: 25_000,
      date: Date.now(),
    });

    const { accounts, totalBalanceCentavos } = await getAccounts(USER);
    // Accounts include Payroll and automatically seeded Cash account
    const payroll = accounts.find((a) => a.name === 'Payroll');
    const cash = accounts.find((a) => a.name.toLowerCase() === 'cash');

    expect(payroll).toBeTruthy();
    expect(payroll!.currentBalanceCentavos).toBe(575_000);
    expect(cash).toBeTruthy();
    expect(cash!.currentBalanceCentavos).toBe(0);
    expect(totalBalanceCentavos).toBe(575_000);
  });

  it('omits soft-deleted accounts', async () => {
    const account = await createAccount(USER, 'Emergency Fund', 'savings', 10_000);
    await deleteAccount(account.id);
    const { accounts } = await getAccounts(USER);
    expect(accounts.some((a) => a.id === account.id)).toBe(false);
  });

  it('protects default Cash account from deletion, rename, and duplication', async () => {
    const { accounts } = await getAccounts(USER);
    const cash = accounts.find((a) => a.name.toLowerCase() === 'cash')!;
    expect(cash).toBeDefined();

    // Cannot delete Cash
    await expect(deleteAccount(cash.id)).rejects.toThrow('Cannot delete the default Cash account');

    // Cannot create duplicate Cash
    await expect(createAccount(USER, 'Cash', 'cash', 0)).rejects.toThrow('A Cash account already exists');
  });

  it('records an outbox entry alongside the write', async () => {
    await createAccount(USER, 'Maribank', 'savings', 1_000);
    const pending = await getPendingChanges();
    expect(pending.some((item) => item.entityType === 'accounts')).toBe(true);
  });
});
