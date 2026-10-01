import { getDB } from './sqlite';
import { Transaction, TransactionType } from '../types';
import { generateUUID } from '../utils/uuid';
import { enqueueChange } from './outboxRepo';
import { calculateAccountBalanceSync } from './accountRepo';
import { MonthSummary, calculateMonthSummary } from '../services/monthSummaryCalculator';

export type { MonthSummary };

export const getTransactions = async (
  userId: string,
  options?: {
    startDate?: number;
    endDate?: number;
    accountId?: string;
    categoryId?: string;
    type?: TransactionType;
    limit?: number;
  }
): Promise<Transaction[]> => {
  const db = getDB();
  let sql = `
    SELECT id, user_id as userId, account_id as accountId, type, amount_centavos as amountCentavos,
           category_id as categoryId, source, destination_account_id as destinationAccountId,
           date, notes, receipt_image_url as receiptImageUrl, receipt_public_id as receiptPublicId,
           recurring_rule_id as recurringRuleId, recurring_occurrence_date as recurringOccurrenceDate,
           goal_id as goalId, shared_account_id as sharedAccountId, updated_at as updatedAt, deleted_at as deletedAt
    FROM transactions
    WHERE user_id = ? AND deleted_at IS NULL
  `;
  const params: any[] = [userId];

  if (options?.startDate) {
    sql += ` AND date >= ?`;
    params.push(options.startDate);
  }
  if (options?.endDate) {
    sql += ` AND date <= ?`;
    params.push(options.endDate);
  }
  if (options?.accountId) {
    sql += ` AND (account_id = ? OR destination_account_id = ?)`;
    params.push(options.accountId, options.accountId);
  }
  if (options?.categoryId) {
    sql += ` AND category_id = ?`;
    params.push(options.categoryId);
  }
  if (options?.type) {
    sql += ` AND type = ?`;
    params.push(options.type);
  }

  sql += ` ORDER BY date DESC`;

  if (options?.limit) {
    sql += ` LIMIT ?`;
    params.push(options.limit);
  }

  const rows = await db.getAllAsync<Transaction>(sql, params);
  return rows;
};

export const createTransaction = async (
  userId: string,
  data: {
    id?: string;
    accountId: string;
    type: TransactionType;
    amountCentavos: number;
    categoryId?: string | null;
    source?: string | null;
    destinationAccountId?: string | null;
    date: number;
    notes?: string;
    receiptImageUrl?: string | null;
    receiptPublicId?: string | null;
    recurringRuleId?: string | null;
    recurringOccurrenceDate?: number | null;
    goalId?: string | null;
    sharedAccountId?: string | null;
  }
): Promise<Transaction> => {
  const db = getDB();
  const id = data.id || generateUUID();
  const now = Date.now();
  const amount = Math.round(data.amountCentavos);

  db.execSync('BEGIN TRANSACTION;');
  try {
    db.runSync(
      `INSERT INTO transactions (
        id, user_id, account_id, type, amount_centavos, category_id,
        source, destination_account_id, date, notes, receipt_image_url,
        receipt_public_id, recurring_rule_id, recurring_occurrence_date, goal_id, shared_account_id, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        userId,
        data.accountId,
        data.type,
        amount,
        data.categoryId || null,
        data.source || null,
        data.destinationAccountId || null,
        data.date,
        data.notes || '',
        data.receiptImageUrl || null,
        data.receiptPublicId || null,
        data.recurringRuleId || null,
        data.recurringOccurrenceDate || null,
        data.goalId || null,
        data.sharedAccountId || null,
        now,
      ]
    );

    const sourceAcc = db.getFirstSync<{ starting_balance_centavos: number }>(
      `SELECT starting_balance_centavos FROM accounts WHERE id = ?`,
      [data.accountId]
    );
    if (sourceAcc) {
      const newBal = calculateAccountBalanceSync(
        data.accountId,
        sourceAcc.starting_balance_centavos
      );
      db.runSync(`UPDATE accounts SET current_balance_centavos = ? WHERE id = ?`, [
        newBal,
        data.accountId,
      ]);
    }

    if (data.type === 'transfer' && data.destinationAccountId) {
      const destAcc = db.getFirstSync<{ starting_balance_centavos: number }>(
        `SELECT starting_balance_centavos FROM accounts WHERE id = ?`,
        [data.destinationAccountId]
      );
      if (destAcc) {
        const destBal = calculateAccountBalanceSync(
          data.destinationAccountId,
          destAcc.starting_balance_centavos
        );
        db.runSync(`UPDATE accounts SET current_balance_centavos = ? WHERE id = ?`, [
          destBal,
          data.destinationAccountId,
        ]);
      }
    }

    db.execSync('COMMIT;');
  } catch (err) {
    db.execSync('ROLLBACK;');
    throw err;
  }

  const newTx: Transaction = {
    id,
    userId,
    accountId: data.accountId,
    type: data.type,
    amountCentavos: amount,
    categoryId: data.categoryId,
    source: data.source,
    destinationAccountId: data.destinationAccountId,
    date: data.date,
    notes: data.notes,
    receiptImageUrl: data.receiptImageUrl,
    receiptPublicId: data.receiptPublicId,
    recurringRuleId: data.recurringRuleId,
    recurringOccurrenceDate: data.recurringOccurrenceDate,
    goalId: data.goalId,
    updatedAt: now,
  };

  await enqueueChange('transactions', id, 'upsert', {
    ...newTx,
    date: new Date(newTx.date).toISOString(),
  });

  return newTx;
};

export const deleteTransaction = async (id: string): Promise<void> => {
  const db = getDB();
  const now = Date.now();
  const tx = await db.getFirstAsync<{
    account_id: string;
    destination_account_id?: string;
    type: string;
  }>(`SELECT account_id, destination_account_id, type FROM transactions WHERE id = ?`, [id]);

  await db.runAsync(`UPDATE transactions SET deleted_at = ?, updated_at = ? WHERE id = ?`, [
    now,
    now,
    id,
  ]);

  if (tx) {
    const acc = db.getFirstSync<{ starting_balance_centavos: number }>(
      `SELECT starting_balance_centavos FROM accounts WHERE id = ?`,
      [tx.account_id]
    );
    if (acc) {
      const newBal = calculateAccountBalanceSync(tx.account_id, acc.starting_balance_centavos);
      await db.runAsync(`UPDATE accounts SET current_balance_centavos = ? WHERE id = ?`, [
        newBal,
        tx.account_id,
      ]);
    }
    if (tx.type === 'transfer' && tx.destination_account_id) {
      const destAcc = db.getFirstSync<{ starting_balance_centavos: number }>(
        `SELECT starting_balance_centavos FROM accounts WHERE id = ?`,
        [tx.destination_account_id]
      );
      if (destAcc) {
        const destBal = calculateAccountBalanceSync(
          tx.destination_account_id,
          destAcc.starting_balance_centavos
        );
        await db.runAsync(`UPDATE accounts SET current_balance_centavos = ? WHERE id = ?`, [
          destBal,
          tx.destination_account_id,
        ]);
      }
    }
  }

  await enqueueChange('transactions', id, 'delete', {});
};

export const getMonthSummary = async (
  userId: string,
  year: number,
  month: number
): Promise<MonthSummary> => {
  const startOfMonth = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0)).getTime();
  const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)).getTime();

  const transactions = await getTransactions(userId, {
    startDate: startOfMonth,
    endDate: endOfMonth,
  });

  return calculateMonthSummary(transactions, year, month);
};
