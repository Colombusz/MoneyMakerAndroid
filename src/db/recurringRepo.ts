import { getDB } from './sqlite';
import { RecurringRule, RecurringFrequency } from '../types';
import { generateUUID } from '../utils/uuid';
import { enqueueChange } from './outboxRepo';
import { createTransaction } from './transactionRepo';
import {
  MobileProjectedOccurrence,
  generateOccurrencesFromRules,
} from '../services/recurringGenerator';

export type { MobileProjectedOccurrence };

export const getRecurringRules = async (userId: string): Promise<RecurringRule[]> => {
  const db = getDB();
  const rows = await db.getAllAsync<any>(
    `SELECT id, user_id as userId, account_id as accountId, category_id as categoryId,
            type, amount_centavos as amountCentavos, frequency, interval_days as intervalDays,
            start_date as startDate, end_date as endDate, max_occurrences as maxOccurrences,
            notes, updated_at as updatedAt, deleted_at as deletedAt
     FROM recurring_rules
     WHERE user_id = ? AND deleted_at IS NULL
     ORDER BY start_date ASC`,
    [userId]
  );
  return rows;
};

export const createRecurringRule = async (
  userId: string,
  data: {
    accountId: string;
    categoryId: string;
    type: 'expense' | 'income';
    amountCentavos: number;
    frequency: RecurringFrequency;
    intervalDays?: number | null;
    startDate: number;
    endDate?: number | null;
    maxOccurrences?: number | null;
    notes?: string;
  }
): Promise<RecurringRule> => {
  const db = getDB();
  const id = generateUUID();
  const now = Date.now();
  const amount = Math.round(data.amountCentavos);

  await db.runAsync(
    `INSERT INTO recurring_rules (
      id, user_id, account_id, category_id, type, amount_centavos,
      frequency, interval_days, start_date, end_date, max_occurrences, notes, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      userId,
      data.accountId,
      data.categoryId,
      data.type,
      amount,
      data.frequency,
      data.intervalDays || null,
      data.startDate,
      data.endDate || null,
      data.maxOccurrences || null,
      data.notes || '',
      now,
    ]
  );

  const rule: RecurringRule = {
    id,
    userId,
    accountId: data.accountId,
    categoryId: data.categoryId,
    type: data.type,
    amountCentavos: amount,
    frequency: data.frequency,
    intervalDays: data.intervalDays,
    startDate: data.startDate,
    endDate: data.endDate,
    maxOccurrences: data.maxOccurrences,
    notes: data.notes,
    updatedAt: now,
  };

  await enqueueChange('recurringRules', id, 'upsert', {
    ...rule,
    startDate: new Date(rule.startDate).toISOString(),
    endDate: rule.endDate ? new Date(rule.endDate).toISOString() : null,
  });

  return rule;
};

export const deleteRecurringRule = async (id: string): Promise<void> => {
  const db = getDB();
  const now = Date.now();
  await db.runAsync(`UPDATE recurring_rules SET deleted_at = ?, updated_at = ? WHERE id = ?`, [
    now,
    now,
    id,
  ]);
  await enqueueChange('recurringRules', id, 'delete', {});
};

export const generateOccurrences = async (
  userId: string,
  rangeStartMs: number,
  rangeEndMs: number
): Promise<MobileProjectedOccurrence[]> => {
  const db = getDB();
  const rules = await getRecurringRules(userId);
  const overrides = await db.getAllAsync<any>(
    `SELECT id, user_id as userId, recurring_rule_id as recurringRuleId,
            occurrence_date as occurrenceDate, status, override_amount_centavos as overrideAmountCentavos,
            transaction_id as transactionId
     FROM recurring_overrides
     WHERE user_id = ? AND occurrence_date >= ? AND occurrence_date <= ? AND deleted_at IS NULL`,
    [userId, rangeStartMs, rangeEndMs]
  );

  return generateOccurrencesFromRules(rules, overrides, rangeStartMs, rangeEndMs);
};

export const payOccurrence = async (
  userId: string,
  ruleId: string,
  occurrenceDateMs: number,
  overrideAmountCentavos?: number,
  notes?: string,
  /** Account the payment is drawn from. Defaults to the rule's own account. */
  accountId?: string
): Promise<void> => {
  const db = getDB();
  const rule = await db.getFirstAsync<any>(
    `SELECT * FROM recurring_rules WHERE id = ? AND deleted_at IS NULL`,
    [ruleId]
  );
  if (!rule) throw new Error('Rule not found');

  const payAccountId = accountId || rule.account_id;

  // The payment debits this account, so confirm it actually belongs to the user
  // rather than trusting an id that arrived from a stale or tampered client.
  const account = await db.getFirstAsync<any>(
    `SELECT id FROM accounts WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
    [payAccountId, userId]
  );
  if (!account) throw new Error('Payment account not found');

  const finalAmount = overrideAmountCentavos ?? rule.amount_centavos;

  const tx = await createTransaction(userId, {
    accountId: payAccountId,
    type: rule.type,
    amountCentavos: finalAmount,
    categoryId: rule.category_id,
    date: occurrenceDateMs,
    notes: notes || `Paid recurring: ${rule.notes || ''}`,
    recurringRuleId: ruleId,
    recurringOccurrenceDate: occurrenceDateMs,
  });

  const overrideId = generateUUID();
  const now = Date.now();
  await db.runAsync(
    `INSERT INTO recurring_overrides (
      id, user_id, recurring_rule_id, occurrence_date, status,
      override_amount_centavos, transaction_id, updated_at
    ) VALUES (?, ?, ?, ?, 'paid', ?, ?, ?)`,
    [overrideId, userId, ruleId, occurrenceDateMs, finalAmount, tx.id, now]
  );

  await enqueueChange('recurringOverrides', overrideId, 'upsert', {
    recurringRuleId: ruleId,
    occurrenceDate: new Date(occurrenceDateMs).toISOString(),
    status: 'paid',
    overrideAmountCentavos: finalAmount,
    transactionId: tx.id,
  });
};

export const skipOccurrence = async (
  userId: string,
  ruleId: string,
  occurrenceDateMs: number
): Promise<void> => {
  const db = getDB();
  const overrideId = generateUUID();
  const now = Date.now();

  await db.runAsync(
    `INSERT INTO recurring_overrides (
      id, user_id, recurring_rule_id, occurrence_date, status, updated_at
    ) VALUES (?, ?, ?, ?, 'skipped', ?)`,
    [overrideId, userId, ruleId, occurrenceDateMs, now]
  );

  await enqueueChange('recurringOverrides', overrideId, 'upsert', {
    recurringRuleId: ruleId,
    occurrenceDate: new Date(occurrenceDateMs).toISOString(),
    status: 'skipped',
  });
};
