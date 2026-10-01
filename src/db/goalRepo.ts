import { getDB } from './sqlite';
import { Goal } from '../types';
import { generateUUID } from '../utils/uuid';
import { enqueueChange } from './outboxRepo';
import { createTransaction } from './transactionRepo';
import { calculateAccountBalanceSync } from './accountRepo';

/**
 * Current balance of a linked account, computed from the same read-time SQL
 * aggregate used by the accounts feature. Returns 0 when the account is missing,
 * soft-deleted, or overdrawn (a negative balance must not subtract from savings).
 */
const getLinkedAccountBalanceCentavos = async (accountId: string): Promise<number> => {
  const db = getDB();
  const account = await db.getFirstAsync<{ starting_balance_centavos: number }>(
    `SELECT starting_balance_centavos FROM accounts WHERE id = ? AND deleted_at IS NULL`,
    [accountId]
  );
  if (!account) return 0;
  return Math.max(0, calculateAccountBalanceSync(accountId, account.starting_balance_centavos));
};

export const getGoals = async (userId: string): Promise<Goal[]> => {
  const db = getDB();
  const rows = await db.getAllAsync<any>(
    `SELECT id, user_id as userId, name, target_amount_centavos as targetAmountCentavos,
            target_date as targetDate, image_url as imageUrl, image_public_id as imagePublicId,
            linked_account_id as linkedAccountId, is_shared as isShared, shared_goal_id as sharedGoalId,
            updated_at as updatedAt, deleted_at as deletedAt
     FROM goals
     WHERE user_id = ? AND deleted_at IS NULL
     ORDER BY updated_at DESC`,
    [userId]
  );

  const goalsWithMetrics: Goal[] = await Promise.all(
    rows.map(async (g) => {
      const contribRows = await db.getAllAsync<any>(
        `SELECT amount_centavos as amountCentavos, date FROM goal_contributions
         WHERE goal_id = ? AND deleted_at IS NULL
         ORDER BY date ASC`,
        [g.id]
      );

      const contributionsTotal = contribRows.reduce((sum, c) => sum + c.amountCentavos, 0);

      // A goal linked to an account treats that account's balance as savings, so
      // its progress reflects the money actually parked in the linked account even
      // with zero contributions. Contributions funded from a different account add
      // to it; contributions funded from the linked account itself are internal
      // (the balance already moved) and therefore net out naturally.
      const linkedBalance = g.linkedAccountId
        ? await getLinkedAccountBalanceCentavos(g.linkedAccountId)
        : 0;
      const totalSavedCentavos = contributionsTotal + linkedBalance;

      const remainingCentavos = Math.max(0, g.targetAmountCentavos - totalSavedCentavos);
      const percentage =
        g.targetAmountCentavos > 0
          ? Math.min(100, Math.round((totalSavedCentavos / g.targetAmountCentavos) * 100))
          : 100;

      let projectedCompletionDate: string | null = null;
      if (remainingCentavos > 0 && contribRows.length >= 2) {
        const first = contribRows[0].date;
        const last = contribRows[contribRows.length - 1].date;
        const days = Math.max(1, (last - first) / (1000 * 60 * 60 * 24));
        const ratePerDay = contributionsTotal / days;
        if (ratePerDay > 0) {
          const daysNeeded = Math.ceil(remainingCentavos / ratePerDay);
          projectedCompletionDate = new Date(Date.now() + daysNeeded * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0];
        }
      }

      return {
        ...g,
        isShared: Boolean(g.isShared),
        totalSavedCentavos,
        remainingCentavos,
        percentage,
        projectedCompletionDate,
      };
    })
  );

  return goalsWithMetrics;
};

export const createGoal = async (
  userId: string,
  data: {
    name: string;
    targetAmountCentavos: number;
    targetDate?: number | null;
    imageUrl?: string | null;
    linkedAccountId?: string | null;
  }
): Promise<Goal> => {
  const db = getDB();
  const id = generateUUID();
  const now = Date.now();
  const target = Math.round(data.targetAmountCentavos);

  await db.runAsync(
    `INSERT INTO goals (
      id, user_id, name, target_amount_centavos, target_date, image_url, linked_account_id, is_shared, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    [
      id,
      userId,
      data.name.trim(),
      target,
      data.targetDate || null,
      data.imageUrl || null,
      data.linkedAccountId || null,
      now,
    ]
  );

  const newGoal: Goal = {
    id,
    userId,
    name: data.name.trim(),
    targetAmountCentavos: target,
    targetDate: data.targetDate,
    imageUrl: data.imageUrl,
    linkedAccountId: data.linkedAccountId,
    isShared: false,
    totalSavedCentavos: 0,
    remainingCentavos: target,
    percentage: 0,
    projectedCompletionDate: null,
    updatedAt: now,
  };

  await enqueueChange('goals', id, 'upsert', {
    ...newGoal,
    targetDate: data.targetDate ? new Date(data.targetDate).toISOString() : null,
  });

  return newGoal;
};

export const deleteGoal = async (id: string): Promise<void> => {
  const db = getDB();
  const now = Date.now();
  await db.runAsync(`UPDATE goals SET deleted_at = ?, updated_at = ? WHERE id = ?`, [now, now, id]);
  await enqueueChange('goals', id, 'delete', {});
};

export const contributeToGoal = async (
  userId: string,
  goalId: string,
  amountCentavos: number,
  fromAccountId?: string,
  notes?: string
): Promise<void> => {
  const db = getDB();
  const goal = await db.getFirstAsync<any>(
    `SELECT * FROM goals WHERE id = ? AND deleted_at IS NULL`,
    [goalId]
  );
  if (!goal) throw new Error('Goal not found');

  const contribId = generateUUID();
  const now = Date.now();
  const amount = Math.round(amountCentavos);
  let transactionId: string | null = null;

  const debitAccount = fromAccountId || goal.linked_account_id;
  if (debitAccount) {
    const tx = await createTransaction(userId, {
      accountId: debitAccount,
      type: 'expense',
      amountCentavos: amount,
      date: now,
      notes: `Goal contribution: ${goal.name}. ${notes || ''}`,
      goalId,
    });
    transactionId = tx.id;
  }

  await db.runAsync(
    `INSERT INTO goal_contributions (id, user_id, goal_id, amount_centavos, transaction_id, date, notes, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [contribId, userId, goalId, amount, transactionId, now, notes || '', now]
  );

  await enqueueChange('goalContributions', contribId, 'upsert', {
    goalId,
    amountCentavos: amount,
    transactionId,
    date: new Date(now).toISOString(),
    notes: notes || '',
  });
};
