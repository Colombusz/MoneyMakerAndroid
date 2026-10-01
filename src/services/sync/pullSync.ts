import { apiFetch } from '../apiClient';
import { getMetadata, setMetadata } from '../../db/outboxRepo';
import { getDB } from '../../db/sqlite';
import { calculateAccountBalanceSync } from '../../db/accountRepo';
import { mergeDuplicateCategories } from '../../db/categoryRepo';

export const pullServerChanges = async (userId: string): Promise<number> => {
  const db = getDB();
  const cursor = await getMetadata('last_sync_cursor');
  const pullUrl = cursor ? `/api/sync/pull?since=${encodeURIComponent(cursor)}` : '/api/sync/pull';
  const pullData = await apiFetch<any>(pullUrl);

  let pulledCount = 0;
  if (!pullData || !pullData.cursor) return 0;

  db.execSync('BEGIN TRANSACTION;');
  try {
    // Accounts
    if (Array.isArray(pullData.accounts)) {
      for (const acc of pullData.accounts) {
        pulledCount++;
        const updatedAtMs = new Date(acc.updatedAt).getTime();
        const deletedAtMs = acc.deletedAt ? new Date(acc.deletedAt).getTime() : null;

        const isCash = acc.type === 'cash' || (acc.name && acc.name.toLowerCase() === 'cash');
        if (isCash) {
          // Every local copy has to go, not just the first: the app seeds its own
          // Cash and the backend seeds another, and one pass can leave both behind.
          const localCashRows = db.getAllSync<{ id: string }>(
            `SELECT id FROM accounts WHERE user_id = ? AND (LOWER(name) = 'cash' OR type = 'cash') AND id != ? AND deleted_at IS NULL`,
            [acc.userId, acc._id]
          );
          for (const localCash of localCashRows) {
            db.runSync(`UPDATE transactions SET account_id = ? WHERE account_id = ?`, [acc._id, localCash.id]);
            db.runSync(`UPDATE transactions SET destination_account_id = ? WHERE destination_account_id = ?`, [acc._id, localCash.id]);
            db.runSync(`UPDATE sync_outbox SET entity_id = ? WHERE entity_type = 'accounts' AND entity_id = ?`, [acc._id, localCash.id]);
            db.runSync(`DELETE FROM accounts WHERE id = ?`, [localCash.id]);
          }
        }

        db.runSync(
          `INSERT INTO accounts (id, user_id, name, type, starting_balance_centavos, current_balance_centavos, is_archived, updated_at, deleted_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             name = excluded.name,
             type = excluded.type,
             starting_balance_centavos = excluded.starting_balance_centavos,
             is_archived = excluded.is_archived,
             updated_at = excluded.updated_at,
             deleted_at = excluded.deleted_at
           WHERE excluded.updated_at >= accounts.updated_at`,
          [
            acc._id,
            acc.userId,
            acc.name,
            acc.type,
            acc.startingBalanceCentavos,
            acc.currentBalanceCentavos,
            acc.isArchived ? 1 : 0,
            updatedAtMs,
            deletedAtMs,
          ]
        );
      }
    }

    // Categories
    if (Array.isArray(pullData.categories)) {
      for (const cat of pullData.categories) {
        pulledCount++;
        const updatedAtMs = new Date(cat.updatedAt).getTime();
        const deletedAtMs = cat.deletedAt ? new Date(cat.deletedAt).getTime() : null;

        db.runSync(
          `INSERT INTO categories (id, user_id, name, type, icon, color, is_default, updated_at, deleted_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             name = excluded.name,
             type = excluded.type,
             icon = excluded.icon,
             color = excluded.color,
             is_default = excluded.is_default,
             updated_at = excluded.updated_at,
             deleted_at = excluded.deleted_at
           WHERE excluded.updated_at >= categories.updated_at`,
          [
            cat._id,
            cat.userId,
            cat.name,
            cat.type,
            cat.icon,
            cat.color,
            cat.isDefault ? 1 : 0,
            updatedAtMs,
            deletedAtMs,
          ]
        );
      }
    }

    // Transactions
    if (Array.isArray(pullData.transactions)) {
      for (const tx of pullData.transactions) {
        pulledCount++;
        const updatedAtMs = new Date(tx.updatedAt).getTime();
        const deletedAtMs = tx.deletedAt ? new Date(tx.deletedAt).getTime() : null;
        const dateMs = new Date(tx.date).getTime();
        const recOccMs = tx.recurringOccurrenceDate
          ? new Date(tx.recurringOccurrenceDate).getTime()
          : null;

        db.runSync(
          `INSERT INTO transactions (
            id, user_id, account_id, type, amount_centavos, category_id,
            source, destination_account_id, date, notes, receipt_image_url,
            receipt_public_id, recurring_rule_id, recurring_occurrence_date, goal_id,
            updated_at, deleted_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            account_id = excluded.account_id,
            type = excluded.type,
            amount_centavos = excluded.amount_centavos,
            category_id = excluded.category_id,
            source = excluded.source,
            destination_account_id = excluded.destination_account_id,
            date = excluded.date,
            notes = excluded.notes,
            receipt_image_url = excluded.receipt_image_url,
            receipt_public_id = excluded.receipt_public_id,
            recurring_rule_id = excluded.recurring_rule_id,
            recurring_occurrence_date = excluded.recurring_occurrence_date,
            goal_id = excluded.goal_id,
            shared_account_id = excluded.shared_account_id,
            updated_at = excluded.updated_at,
            deleted_at = excluded.deleted_at
          WHERE excluded.updated_at >= transactions.updated_at`,
          [
            tx._id,
            tx.userId,
            tx.accountId,
            tx.type,
            tx.amountCentavos,
            tx.categoryId || null,
            tx.source || null,
            tx.destinationAccountId || null,
            dateMs,
            tx.notes || '',
            tx.receiptImageUrl || null,
            tx.receiptPublicId || null,
            tx.recurringRuleId || null,
            recOccMs,
            tx.goalId || null,
            tx.sharedAccountId || null,
            updatedAtMs,
            deletedAtMs,
          ]
        );
      }
    }

    // Recurring Rules & Overrides
    if (Array.isArray(pullData.recurringRules)) {
      for (const rule of pullData.recurringRules) {
        pulledCount++;
        const updatedAtMs = new Date(rule.updatedAt).getTime();
        const deletedAtMs = rule.deletedAt ? new Date(rule.deletedAt).getTime() : null;
        const startMs = new Date(rule.startDate).getTime();
        const endMs = rule.endDate ? new Date(rule.endDate).getTime() : null;

        db.runSync(
          `INSERT INTO recurring_rules (
            id, user_id, account_id, category_id, type, amount_centavos,
            frequency, interval_days, start_date, end_date, max_occurrences,
            notes, updated_at, deleted_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            account_id = excluded.account_id,
            category_id = excluded.category_id,
            type = excluded.type,
            amount_centavos = excluded.amount_centavos,
            frequency = excluded.frequency,
            interval_days = excluded.interval_days,
            start_date = excluded.start_date,
            end_date = excluded.end_date,
            max_occurrences = excluded.max_occurrences,
            notes = excluded.notes,
            updated_at = excluded.updated_at,
            deleted_at = excluded.deleted_at
          WHERE excluded.updated_at >= recurring_rules.updated_at`,
          [
            rule._id,
            rule.userId,
            rule.accountId,
            rule.categoryId,
            rule.type || 'expense',
            rule.amountCentavos,
            rule.frequency,
            rule.intervalDays || null,
            startMs,
            endMs,
            rule.maxOccurrences || null,
            rule.notes || '',
            updatedAtMs,
            deletedAtMs,
          ]
        );
      }
    }

    if (Array.isArray(pullData.recurringOverrides)) {
      for (const ov of pullData.recurringOverrides) {
        pulledCount++;
        const updatedAtMs = new Date(ov.updatedAt).getTime();
        const deletedAtMs = ov.deletedAt ? new Date(ov.deletedAt).getTime() : null;
        const occMs = new Date(ov.occurrenceDate).getTime();

        db.runSync(
          `INSERT INTO recurring_overrides (
            id, user_id, recurring_rule_id, occurrence_date, status,
            override_amount_centavos, transaction_id, updated_at, deleted_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            status = excluded.status,
            override_amount_centavos = excluded.override_amount_centavos,
            transaction_id = excluded.transaction_id,
            updated_at = excluded.updated_at,
            deleted_at = excluded.deleted_at
          WHERE excluded.updated_at >= recurring_overrides.updated_at`,
          [
            ov._id,
            ov.userId,
            ov.recurringRuleId,
            occMs,
            ov.status,
            ov.overrideAmountCentavos || null,
            ov.transactionId || null,
            updatedAtMs,
            deletedAtMs,
          ]
        );
      }
    }

    // Goals & Goal Contributions
    if (Array.isArray(pullData.goals)) {
      for (const g of pullData.goals) {
        pulledCount++;
        const updatedAtMs = new Date(g.updatedAt).getTime();
        const deletedAtMs = g.deletedAt ? new Date(g.deletedAt).getTime() : null;
        const targetDateMs = g.targetDate ? new Date(g.targetDate).getTime() : null;

        db.runSync(
          `INSERT INTO goals (
            id, user_id, name, target_amount_centavos, target_date,
            image_url, image_public_id, linked_account_id, is_shared, shared_goal_id,
            updated_at, deleted_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            target_amount_centavos = excluded.target_amount_centavos,
            target_date = excluded.target_date,
            image_url = excluded.image_url,
            image_public_id = excluded.image_public_id,
            linked_account_id = excluded.linked_account_id,
            is_shared = excluded.is_shared,
            shared_goal_id = excluded.shared_goal_id,
            updated_at = excluded.updated_at,
            deleted_at = excluded.deleted_at
          WHERE excluded.updated_at >= goals.updated_at`,
          [
            g._id,
            g.userId,
            g.name,
            g.targetAmountCentavos,
            targetDateMs,
            g.imageUrl || null,
            g.imagePublicId || null,
            g.linkedAccountId || null,
            g.isShared ? 1 : 0,
            g.sharedGoalId || null,
            updatedAtMs,
            deletedAtMs,
          ]
        );
      }
    }

    if (Array.isArray(pullData.goalContributions)) {
      for (const gc of pullData.goalContributions) {
        pulledCount++;
        const updatedAtMs = new Date(gc.updatedAt).getTime();
        const deletedAtMs = gc.deletedAt ? new Date(gc.deletedAt).getTime() : null;
        const dateMs = new Date(gc.date).getTime();

        db.runSync(
          `INSERT INTO goal_contributions (
            id, user_id, goal_id, shared_goal_id, amount_centavos,
            transaction_id, date, notes, updated_at, deleted_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            amount_centavos = excluded.amount_centavos,
            date = excluded.date,
            notes = excluded.notes,
            updated_at = excluded.updated_at,
            deleted_at = excluded.deleted_at
          WHERE excluded.updated_at >= goal_contributions.updated_at`,
          [
            gc._id,
            gc.userId,
            gc.goalId || null,
            gc.sharedGoalId || null,
            gc.amountCentavos,
            gc.transactionId || null,
            dateMs,
            gc.notes || '',
            updatedAtMs,
            deletedAtMs,
          ]
        );
      }
    }

    if (Array.isArray(pullData.dayNotes)) {
      for (const dn of pullData.dayNotes) {
        pulledCount++;
        const updatedAtMs = new Date(dn.updatedAt).getTime();
        const deletedAtMs = dn.deletedAt ? new Date(dn.deletedAt).getTime() : null;
        // The server normalises day notes to UTC midnight; keep that so the
        // calendar's day-key bucketing matches on every device.
        const dateMs = new Date(dn.date).getTime();

        db.runSync(
          `INSERT INTO day_notes (id, user_id, date, notes, updated_at, deleted_at)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             date = excluded.date,
             notes = excluded.notes,
             updated_at = excluded.updated_at,
             deleted_at = excluded.deleted_at
           WHERE excluded.updated_at >= day_notes.updated_at`,
          [dn._id, dn.userId, dateMs, dn.notes || '', updatedAtMs, deletedAtMs]
        );
      }
    }

    // Fold together defaults that were seeded twice (once by the app, once by
    // the backend) now that every entity has landed, so transactions are counted
    // when deciding which copy survives.
    await mergeDuplicateCategories(userId);

    // Reconcile account balances
    const accounts = db.getAllSync<any>(
      `SELECT id, starting_balance_centavos FROM accounts WHERE user_id = ?`,
      [userId]
    );
    for (const a of accounts) {
      const bal = calculateAccountBalanceSync(a.id, a.starting_balance_centavos);
      db.runSync(`UPDATE accounts SET current_balance_centavos = ? WHERE id = ?`, [bal, a.id]);
    }

    db.execSync('COMMIT;');
    await setMetadata('last_sync_cursor', pullData.cursor);
  } catch (err) {
    db.execSync('ROLLBACK;');
    throw err;
  }

  return pulledCount;
};
