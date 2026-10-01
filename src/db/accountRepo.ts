import { getDB } from './sqlite';
import { Account, AccountType } from '../types';
import { generateUUID } from '../utils/uuid';
import { enqueueChange } from './outboxRepo';

export const calculateAccountBalanceSync = (accountId: string, startingBalance: number): number => {
  const db = getDB();

  // Income
  const incomeRow = db.getFirstSync<{ total: number | null }>(
    `SELECT SUM(amount_centavos) as total FROM transactions WHERE account_id = ? AND type = 'income' AND deleted_at IS NULL`,
    [accountId]
  );
  const incomeTotal = incomeRow?.total || 0;

  // Expense
  const expenseRow = db.getFirstSync<{ total: number | null }>(
    `SELECT SUM(amount_centavos) as total FROM transactions WHERE account_id = ? AND type = 'expense' AND deleted_at IS NULL`,
    [accountId]
  );
  const expenseTotal = expenseRow?.total || 0;

  // Transfer out
  const transferOutRow = db.getFirstSync<{ total: number | null }>(
    `SELECT SUM(amount_centavos) as total FROM transactions WHERE account_id = ? AND type = 'transfer' AND deleted_at IS NULL`,
    [accountId]
  );
  const transferOutTotal = transferOutRow?.total || 0;

  // Transfer in
  const transferInRow = db.getFirstSync<{ total: number | null }>(
    `SELECT SUM(amount_centavos) as total FROM transactions WHERE destination_account_id = ? AND type = 'transfer' AND deleted_at IS NULL`,
    [accountId]
  );
  const transferInTotal = transferInRow?.total || 0;

  return startingBalance + incomeTotal - expenseTotal - transferOutTotal + transferInTotal;
};

export const ensureDefaultAccounts = async (userId: string): Promise<void> => {
  const db = getDB();
  const cashRowsSql = `SELECT id FROM accounts WHERE user_id = ? AND (LOWER(name) = 'cash' OR type = 'cash') AND deleted_at IS NULL ORDER BY updated_at ASC`;

  const existingRows = await db.getAllAsync<{ id: string }>(cashRowsSql, [userId]);

  if (!existingRows || existingRows.length === 0) {
    const id = generateUUID();
    const now = Date.now();
    // Single-statement guard: bootstrap and a screen read can race, and a
    // check-then-insert would let both see "no cash account" and insert two.
    const result = await db.runAsync<{ changes: number }>(
      `INSERT INTO accounts (id, user_id, name, type, starting_balance_centavos, current_balance_centavos, is_archived, updated_at)
       SELECT ?, ?, 'Cash', 'cash', 0, 0, 0, ?
       WHERE NOT EXISTS (
         SELECT 1 FROM accounts
         WHERE user_id = ? AND (LOWER(name) = 'cash' OR type = 'cash') AND deleted_at IS NULL
       )`,
      [id, userId, now, userId]
    );
    if ((result?.changes ?? 0) > 0) {
      await enqueueChange('accounts', id, 'upsert', {
        name: 'Cash',
        type: 'cash',
        startingBalanceCentavos: 0,
      });
    }
  }

  // Always re-check: a local seed and the backend's registration seed mint their
  // own ids, so the first sync can leave two Cash accounts behind. Collapsing
  // here means a read can never hand a duplicate card to the UI.
  const cashRows = await db.getAllAsync<{ id: string }>(cashRowsSql, [userId]);
  if (cashRows.length > 1) {
    const primaryId = cashRows[0].id;
    const now = Date.now();
    for (let i = 1; i < cashRows.length; i++) {
      const dupId = cashRows[i].id;
      await db.runAsync(`UPDATE transactions SET account_id = ? WHERE account_id = ?`, [
        primaryId,
        dupId,
      ]);
      await db.runAsync(
        `UPDATE transactions SET destination_account_id = ? WHERE destination_account_id = ?`,
        [primaryId, dupId]
      );
      // Re-point queued writes so the next push does not recreate the copy we
      // just retired (which is exactly how the duplicate came back before).
      await db.runAsync(
        `UPDATE sync_outbox SET entity_id = ? WHERE entity_type = 'accounts' AND entity_id = ?`,
        [primaryId, dupId]
      );
      await db.runAsync(`UPDATE accounts SET deleted_at = ?, updated_at = ? WHERE id = ?`, [
        now,
        now,
        dupId,
      ]);
      await enqueueChange('accounts', dupId, 'delete', {});
    }
  }
};

export const getAccounts = async (
  userId: string
): Promise<{ accounts: Account[]; totalBalanceCentavos: number }> => {
  await ensureDefaultAccounts(userId);

  const db = getDB();
  const rows = await db
    .getAllAsync<any>(
      `SELECT id, user_id as userId, name, type, starting_balance_centavos as startingBalanceCentavos,
            current_balance_centavos as currentBalanceCentavos, is_archived as isArchived,
            updated_at as updatedAt, deleted_at as deletedAt
     FROM accounts
     WHERE user_id = ? AND deleted_at IS NULL
     ORDER BY created_at ASC`,
      [userId]
    )
    .catch(async () => {
      // In case created_at column is not present, order by updated_at
      return await db.getAllAsync<any>(
        `SELECT id, user_id as userId, name, type, starting_balance_centavos as startingBalanceCentavos,
              current_balance_centavos as currentBalanceCentavos, is_archived as isArchived,
              updated_at as updatedAt, deleted_at as deletedAt
       FROM accounts
       WHERE user_id = ? AND deleted_at IS NULL
       ORDER BY updated_at ASC`,
        [userId]
      );
    });

  const accounts: Account[] = rows.map((r) => {
    const computed = calculateAccountBalanceSync(r.id, r.startingBalanceCentavos);
    return {
      ...r,
      isArchived: Boolean(r.isArchived),
      currentBalanceCentavos: computed,
    };
  });

  const totalBalanceCentavos = accounts.reduce((sum, a) => sum + a.currentBalanceCentavos, 0);

  return { accounts, totalBalanceCentavos };
};

export const createAccount = async (
  userId: string,
  name: string,
  type: AccountType,
  startingBalanceCentavos: number
): Promise<Account> => {
  const db = getDB();
  const trimmedName = name.trim();

  if (trimmedName.toLowerCase() === 'cash' || type === 'cash') {
    const existing = await db.getFirstAsync<{ id: string }>(
      `SELECT id FROM accounts WHERE user_id = ? AND (LOWER(name) = 'cash' OR type = 'cash') AND deleted_at IS NULL`,
      [userId]
    );
    if (existing) {
      throw new Error('A Cash account already exists');
    }
  }

  const id = generateUUID();
  const now = Date.now();
  const balance = Math.round(startingBalanceCentavos);

  await db.runAsync(
    `INSERT INTO accounts (id, user_id, name, type, starting_balance_centavos, current_balance_centavos, is_archived, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
    [id, userId, trimmedName, type, balance, balance, now]
  );

  const account: Account = {
    id,
    userId,
    name: trimmedName,
    type,
    startingBalanceCentavos: balance,
    currentBalanceCentavos: balance,
    isArchived: false,
    updatedAt: now,
  };

  await enqueueChange('accounts', id, 'upsert', {
    name: account.name,
    type: account.type,
    startingBalanceCentavos: account.startingBalanceCentavos,
  });

  return account;
};

export const updateAccount = async (
  id: string,
  name: string,
  type: AccountType,
  startingBalanceCentavos: number
): Promise<void> => {
  const db = getDB();
  const existing = await db.getFirstAsync<{ id: string; name: string; type: string }>(
    `SELECT id, name, type FROM accounts WHERE id = ?`,
    [id]
  );
  if (existing && (existing.name.toLowerCase() === 'cash' || existing.type === 'cash')) {
    if (name.trim().toLowerCase() !== 'cash' || type !== 'cash') {
      throw new Error('Cannot rename or change type of the default Cash account');
    }
  }

  const now = Date.now();
  const balance = Math.round(startingBalanceCentavos);

  await db.runAsync(
    `UPDATE accounts
     SET name = ?, type = ?, starting_balance_centavos = ?, updated_at = ?
     WHERE id = ?`,
    [name.trim(), type, balance, now, id]
  );

  const updatedBalance = calculateAccountBalanceSync(id, balance);
  await db.runAsync(`UPDATE accounts SET current_balance_centavos = ? WHERE id = ?`, [
    updatedBalance,
    id,
  ]);

  await enqueueChange('accounts', id, 'upsert', {
    name: name.trim(),
    type,
    startingBalanceCentavos: balance,
  });
};

export const deleteAccount = async (id: string): Promise<void> => {
  const db = getDB();
  const existing = await db.getFirstAsync<{ id: string; name: string; type: string }>(
    `SELECT id, name, type FROM accounts WHERE id = ?`,
    [id]
  );
  if (existing && (existing.name.toLowerCase() === 'cash' || existing.type === 'cash')) {
    throw new Error('Cannot delete the default Cash account');
  }

  const now = Date.now();
  await db.runAsync(`UPDATE accounts SET deleted_at = ?, updated_at = ? WHERE id = ?`, [
    now,
    now,
    id,
  ]);
  await enqueueChange('accounts', id, 'delete', {});
};
