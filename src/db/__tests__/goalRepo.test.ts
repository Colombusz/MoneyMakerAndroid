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
import { createAccount } from '../accountRepo';
import { createTransaction } from '../transactionRepo';
import { createGoal, getGoals, contributeToGoal } from '../goalRepo';

const USER = 'user-1';

beforeEach(async () => {
  setDatabaseForTesting(createNodeSqliteDatabase());
  await initDatabase();
});

describe('goalRepo progress against a real SQLite database', () => {
  it("counts a linked account's balance as progress even with no contributions", async () => {
    const account = await createAccount(USER, 'Maribank', 'savings', 1_000_000);
    await createGoal(USER, {
      name: 'Emergency Fund',
      targetAmountCentavos: 2_000_000,
      linkedAccountId: account.id,
    });

    const [goal] = await getGoals(USER);
    expect(goal.totalSavedCentavos).toBe(1_000_000);
    expect(goal.remainingCentavos).toBe(1_000_000);
    expect(goal.percentage).toBe(50);
  });

  it('tracks the linked account balance as it moves', async () => {
    const account = await createAccount(USER, 'Maribank', 'savings', 1_000_000);
    await createGoal(USER, {
      name: 'Emergency Fund',
      targetAmountCentavos: 2_000_000,
      linkedAccountId: account.id,
    });

    await createTransaction(USER, {
      accountId: account.id,
      type: 'income',
      amountCentavos: 500_000,
      date: Date.now(),
    });

    const [goal] = await getGoals(USER);
    expect(goal.totalSavedCentavos).toBe(1_500_000);
    expect(goal.percentage).toBe(75);
  });

  it('ignores linked balances for an unlinked goal (contributions only)', async () => {
    await createAccount(USER, 'Maribank', 'savings', 1_000_000);
    await createGoal(USER, { name: 'Travel', targetAmountCentavos: 500_000 });

    const [goal] = await getGoals(USER);
    expect(goal.totalSavedCentavos).toBe(0);
    expect(goal.percentage).toBe(0);
  });

  it('does not change progress when a contribution comes from the linked account itself', async () => {
    const account = await createAccount(USER, 'Maribank', 'savings', 1_000_000);
    const goal = await createGoal(USER, {
      name: 'Emergency Fund',
      targetAmountCentavos: 2_000_000,
      linkedAccountId: account.id,
    });

    // Debits the linked account (balance -200k) but records a 200k contribution.
    await contributeToGoal(USER, goal.id, 200_000, account.id);

    const [stored] = await getGoals(USER);
    expect(stored.totalSavedCentavos).toBe(1_000_000);
  });

  it('adds contributions funded from another account on top of the linked balance', async () => {
    const linked = await createAccount(USER, 'Maribank', 'savings', 1_000_000);
    const payroll = await createAccount(USER, 'Payroll', 'payroll', 0);
    const goal = await createGoal(USER, {
      name: 'Emergency Fund',
      targetAmountCentavos: 2_000_000,
      linkedAccountId: linked.id,
    });

    await contributeToGoal(USER, goal.id, 100_000, payroll.id);

    const [stored] = await getGoals(USER);
    expect(stored.totalSavedCentavos).toBe(1_100_000);
    expect(stored.percentage).toBe(55);
  });

  it('never lets an overdrawn linked account subtract from progress', async () => {
    const account = await createAccount(USER, 'Maribank', 'savings', 100_000);
    await createGoal(USER, {
      name: 'Emergency Fund',
      targetAmountCentavos: 500_000,
      linkedAccountId: account.id,
    });

    await createTransaction(USER, {
      accountId: account.id,
      type: 'expense',
      amountCentavos: 300_000,
      date: Date.now(),
    });

    const [goal] = await getGoals(USER);
    expect(goal.totalSavedCentavos).toBe(0);
    expect(goal.percentage).toBe(0);
  });
});
