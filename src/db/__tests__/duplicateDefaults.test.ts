import { beforeEach, describe, expect, it, vi } from 'vitest';

// Repositories import expo-sqlite at module load; block it so the test only
// exercises the injected Node-backed database.
vi.mock('expo-sqlite', () => ({
  openDatabaseSync: () => {
    throw new Error('expo-sqlite must not be used inside tests');
  },
}));

import { initDatabase, setDatabaseForTesting, getDB } from '../sqlite';
import { createNodeSqliteDatabase } from '../../test/nodeSqliteDatabase';
import { createAccount, ensureDefaultAccounts, getAccounts } from '../accountRepo';
import { createCategory, ensureDefaultCategories, getCategories } from '../categoryRepo';
import { createTransaction, getTransactions } from '../transactionRepo';

const USER = 'user-1';

beforeEach(async () => {
  setDatabaseForTesting(createNodeSqliteDatabase());
  await initDatabase();
});

const cashCards = (accounts: Awaited<ReturnType<typeof getAccounts>>['accounts']) =>
  accounts.filter((a) => a.type === 'cash' || a.name.toLowerCase() === 'cash');

/** Mimics the backend registration seed: same defaults, server-minted ids. */
const insertServerDefault = async (name: string, type: 'income' | 'expense') => {
  await getDB().runAsync(
    `INSERT INTO categories (id, user_id, name, type, icon, color, is_default, updated_at)
     VALUES (?, ?, ?, ?, 'tag', '#3B82F6', 1, ?)`,
    [`server-${name}`, USER, name, type, Date.now()]
  );
};

describe('duplicate Cash accounts', () => {
  it('collapses two local cash rows into one card', async () => {
    const db = getDB();
    const now = Date.now();
    // A locally seeded Cash plus the copy the backend registered, different ids.
    await db.runAsync(
      `INSERT INTO accounts (id, user_id, name, type, starting_balance_centavos, current_balance_centavos, is_archived, updated_at)
       VALUES (?, ?, 'Cash', 'cash', 0, 0, 0, ?)`,
      ['local-cash', USER, now]
    );
    await db.runAsync(
      `INSERT INTO accounts (id, user_id, name, type, starting_balance_centavos, current_balance_centavos, is_archived, updated_at)
       VALUES (?, ?, 'Cash', 'cash', 0, 0, 0, ?)`,
      ['server-cash', USER, now + 1000]
    );

    const { accounts } = await getAccounts(USER);
    expect(cashCards(accounts)).toHaveLength(1);
  });

  it('seeds exactly one Cash account however often the seeder runs', async () => {
    await ensureDefaultAccounts(USER);
    await ensureDefaultAccounts(USER);
    await ensureDefaultAccounts(USER);

    const { accounts } = await getAccounts(USER);
    expect(cashCards(accounts)).toHaveLength(1);
  });

  it('moves history onto the surviving cash account', async () => {
    const db = getDB();
    const now = Date.now();
    await db.runAsync(
      `INSERT INTO accounts (id, user_id, name, type, starting_balance_centavos, current_balance_centavos, is_archived, updated_at)
       VALUES (?, ?, 'Cash', 'cash', 0, 0, 0, ?)`,
      ['local-cash', USER, now]
    );
    await db.runAsync(
      `INSERT INTO accounts (id, user_id, name, type, starting_balance_centavos, current_balance_centavos, is_archived, updated_at)
       VALUES (?, ?, 'Cash', 'cash', 0, 0, 0, ?)`,
      ['server-cash', USER, now + 1000]
    );
    await createTransaction(USER, {
      accountId: 'server-cash',
      type: 'expense',
      amountCentavos: 1_000,
      date: now,
    });

    const { accounts } = await getAccounts(USER);
    const survivor = cashCards(accounts)[0];
    expect(survivor.id).toBe('local-cash');

    const txs = await getTransactions(USER, {});
    expect(txs).toHaveLength(1);
    expect(txs[0].accountId).toBe('local-cash');
  });
});

describe('duplicate default categories', () => {
  it('keeps a single Quick Spend after a local and a server seed', async () => {
    await ensureDefaultCategories(USER); // app-side seed, app-minted ids
    await insertServerDefault('Quick Spend', 'expense'); // backend seed, other id

    const categories = await getCategories(USER);
    expect(categories.filter((c) => c.name === 'Quick Spend')).toHaveLength(1);
  });

  it('keeps transactions attached to the surviving copy', async () => {
    await ensureDefaultCategories(USER);
    await insertServerDefault('Quick Spend', 'expense');

    const account = await createAccount(USER, 'Payroll', 'payroll', 0);
    await createTransaction(USER, {
      accountId: account.id,
      type: 'expense',
      amountCentavos: 500,
      categoryId: 'server-Quick Spend',
      date: Date.now(),
    });

    const categories = await getCategories(USER);
    const survivors = categories.filter((c) => c.name === 'Quick Spend');
    expect(survivors).toHaveLength(1);

    const txs = await getTransactions(USER, {});
    expect(txs[0].categoryId).toBe(survivors[0].id);
  });

  it('never merges categories the user created themselves', async () => {
    await createCategory(USER, 'Coffee', 'expense');
    await createCategory(USER, 'Coffee', 'expense');

    const categories = await getCategories(USER);
    expect(categories.filter((c) => c.name === 'Coffee')).toHaveLength(2);
  });
});
