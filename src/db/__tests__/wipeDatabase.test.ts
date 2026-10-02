import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('expo-sqlite', () => ({
  openDatabaseSync: () => {
    throw new Error('expo-sqlite must not be used inside tests');
  },
}));

import { initDatabase, setDatabaseForTesting, wipeDatabase } from '../sqlite';
import { createNodeSqliteDatabase } from '../../test/nodeSqliteDatabase';
import { createAccount, getAccounts } from '../accountRepo';
import { createTransaction, getTransactions } from '../transactionRepo';
import { saveDayNote, getDayNoteByDate } from '../dayNoteRepo';
import { setMetadata, getMetadata } from '../outboxRepo';

const USER = 'user-test-wipe';

beforeEach(async () => {
  setDatabaseForTesting(createNodeSqliteDatabase());
  await initDatabase();
});

describe('wipeDatabase', () => {
  it('completely wipes accounts, transactions, day notes, and metadata', async () => {
    // 1. Seed some data
    const account = await createAccount(USER, 'Test Account', 'savings', 100_000);
    await createTransaction(USER, {
      accountId: account.id,
      type: 'expense',
      amountCentavos: 5_000,
      date: Date.now(),
    });
    await saveDayNote(USER, 1727827200000, 'Spent money on groceries');
    await setMetadata('current_user_email', 'user@test.com');

    // Verify data exists
    const beforeTx = await getTransactions(USER);
    expect(beforeTx.length).toBe(1);
    const beforeNote = await getDayNoteByDate(USER, 1727827200000);
    expect(beforeNote?.notes).toBe('Spent money on groceries');
    const beforeEmail = await getMetadata('current_user_email');
    expect(beforeEmail).toBe('user@test.com');

    // 2. Wipe database
    wipeDatabase();

    // 3. Verify all tables are completely empty
    const db = (await import('../sqlite')).getDB();
    const accountRows = db.getAllSync('SELECT * FROM accounts');
    expect(accountRows.length).toBe(0);

    const txRows = db.getAllSync('SELECT * FROM transactions');
    expect(txRows.length).toBe(0);

    const noteRows = db.getAllSync('SELECT * FROM day_notes');
    expect(noteRows.length).toBe(0);

    const metadataRows = db.getAllSync('SELECT * FROM sync_metadata');
    expect(metadataRows.length).toBe(0);

    const outboxRows = db.getAllSync('SELECT * FROM sync_outbox');
    expect(outboxRows.length).toBe(0);
  });
});
