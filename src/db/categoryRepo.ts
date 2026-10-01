import { getDB } from './sqlite';
import { Category } from '../types';
import { generateUUID } from '../utils/uuid';
import { enqueueChange } from './outboxRepo';

export const DEFAULT_MOBILE_CATEGORIES = [
  { name: 'Food & Dining', type: 'expense' as const, icon: 'restaurant', color: '#EF4444' },
  { name: 'Groceries', type: 'expense' as const, icon: 'cart', color: '#F59E0B' },
  { name: 'Transportation', type: 'expense' as const, icon: 'car', color: '#3B82F6' },
  { name: 'Housing & Utilities', type: 'expense' as const, icon: 'home', color: '#8B5CF6' },
  { name: 'Entertainment', type: 'expense' as const, icon: 'film', color: '#EC4899' },
  { name: 'Healthcare', type: 'expense' as const, icon: 'medkit', color: '#10B981' },
  { name: 'Personal & Shopping', type: 'expense' as const, icon: 'bag-handle', color: '#6366F1' },
  { name: 'Quick Spend', type: 'expense' as const, icon: 'flash', color: '#F97316' },
  {
    name: 'Miscellaneous',
    type: 'expense' as const,
    icon: 'ellipsis-horizontal',
    color: '#6B7280',
  },
  { name: 'Salary', type: 'income' as const, icon: 'briefcase', color: '#10B981' },
  { name: 'Freelance & Business', type: 'income' as const, icon: 'laptop', color: '#059669' },
  { name: 'Investments', type: 'income' as const, icon: 'trending-up', color: '#047857' },
  { name: 'Gifts & Other', type: 'income' as const, icon: 'gift', color: '#34D399' },
];

export const getCategories = async (userId: string): Promise<Category[]> => {
  // Same contract as `getAccounts`: a read always passes through the seeder so a
  // device that already holds duplicate defaults is cleaned before anything renders.
  await ensureDefaultCategories(userId);

  const db = getDB();
  const rows = await db.getAllAsync<any>(
    `SELECT id, user_id as userId, name, type, icon, color, is_default as isDefault, updated_at as updatedAt, deleted_at as deletedAt
     FROM categories
     WHERE user_id = ? AND deleted_at IS NULL
     ORDER BY is_default DESC, name ASC`,
    [userId]
  );
  return rows.map((r) => ({ ...r, isDefault: Boolean(r.isDefault) }));
};

/**
 * Defaults are seeded twice on purpose: once locally by the app and once by the
 * backend at registration, each side generating its own id. Sync upserts by id,
 * so both copies can end up in the database and a default such as "Quick Spend"
 * (or the calendar chart's legend) shows up twice.
 *
 * Collapses duplicate *default* rows — same name + type — back into one, moving
 * their transactions and queued sync writes onto the surviving row first.
 * User-created categories (is_default = 0) are never touched: two categories the
 * user deliberately made with the same name are theirs to keep.
 */
export const mergeDuplicateCategories = async (userId: string): Promise<void> => {
  const db = getDB();
  const rows = await db.getAllAsync<{ id: string; name: string; type: string }>(
    `SELECT id, name, type FROM categories
     WHERE user_id = ? AND is_default = 1 AND deleted_at IS NULL`,
    [userId]
  );

  const groups = new Map<string, string[]>();
  for (const row of rows) {
    const key = `${row.type}|${row.name.trim().toLowerCase()}`;
    const ids = groups.get(key);
    if (ids) ids.push(row.id);
    else groups.set(key, [row.id]);
  }

  for (const ids of groups.values()) {
    if (ids.length < 2) continue;

    // The row that already carries history wins, so no transaction loses its label.
    const placeholders = ids.map(() => '?').join(',');
    const usage = await db.getAllAsync<{ id: string; used: number }>(
      `SELECT c.id as id, COUNT(t.id) as used
       FROM categories c
       LEFT JOIN transactions t ON t.category_id = c.id AND t.deleted_at IS NULL
       WHERE c.id IN (${placeholders})
       GROUP BY c.id`,
      ids
    );
    const keeper =
      [...usage].sort((a, b) => b.used - a.used || String(a.id).localeCompare(String(b.id)))[0]
        ?.id ?? ids[0];

    const now = Date.now();
    for (const dupId of ids) {
      if (dupId === keeper) continue;

      await db.runAsync(`UPDATE transactions SET category_id = ? WHERE category_id = ?`, [
        keeper,
        dupId,
      ]);
      // Re-point queued writes too, otherwise the next push recreates the copy
      // we just retired and the duplicate comes back on the following pull.
      await db.runAsync(
        `UPDATE sync_outbox SET entity_id = ? WHERE entity_type = 'categories' AND entity_id = ?`,
        [keeper, dupId]
      );
      await db.runAsync(`UPDATE categories SET deleted_at = ?, updated_at = ? WHERE id = ?`, [
        now,
        now,
        dupId,
      ]);
      await enqueueChange('categories', dupId, 'delete', {});
    }
  }
};

export const ensureDefaultCategories = async (userId: string): Promise<void> => {
  const db = getDB();
  const existing = await db.getFirstAsync<{ count: number }>(
    `SELECT count(*) as count FROM categories WHERE user_id = ? AND deleted_at IS NULL`,
    [userId]
  );

  if (!existing || existing.count === 0) {
    const now = Date.now();
    for (const cat of DEFAULT_MOBILE_CATEGORIES) {
      const id = generateUUID();
      await db.runAsync(
        `INSERT INTO categories (id, user_id, name, type, icon, color, is_default, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
        [id, userId, cat.name, cat.type, cat.icon, cat.color, now]
      );
      await enqueueChange('categories', id, 'upsert', {
        name: cat.name,
        type: cat.type,
        icon: cat.icon,
        color: cat.color,
        isDefault: true,
      });
    }
  } else {
    // Ensure "Quick Spend" category exists even if user was previously seeded
    const quickSpend = await db.getFirstAsync<{ id: string }>(
      `SELECT id FROM categories WHERE user_id = ? AND LOWER(name) = 'quick spend' AND deleted_at IS NULL`,
      [userId]
    );
    if (!quickSpend) {
      const id = generateUUID();
      const now = Date.now();
      await db.runAsync(
        `INSERT INTO categories (id, user_id, name, type, icon, color, is_default, updated_at)
         VALUES (?, ?, 'Quick Spend', 'expense', 'flash', '#F97316', 1, ?)`,
        [id, userId, now]
      );
      await enqueueChange('categories', id, 'upsert', {
        name: 'Quick Spend',
        type: 'expense',
        icon: 'flash',
        color: '#F97316',
        isDefault: true,
      });
    }
  }

  // A local seed and the backend's registration seed each mint their own ids, so
  // after the first sync the same default can exist twice (two "Quick Spend"
  // rows, a doubled pie-chart legend). Fold them back into one on every pass.
  await mergeDuplicateCategories(userId);
};

export const createCategory = async (
  userId: string,
  name: string,
  type: 'income' | 'expense',
  icon: string = 'tag',
  color: string = '#3B82F6'
): Promise<Category> => {
  const db = getDB();
  const id = generateUUID();
  const now = Date.now();

  await db.runAsync(
    `INSERT INTO categories (id, user_id, name, type, icon, color, is_default, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
    [id, userId, name.trim(), type, icon, color, now]
  );

  const newCat: Category = {
    id,
    userId,
    name: name.trim(),
    type,
    icon,
    color,
    isDefault: false,
    updatedAt: now,
  };

  await enqueueChange('categories', id, 'upsert', {
    name: newCat.name,
    type: newCat.type,
    icon: newCat.icon,
    color: newCat.color,
    isDefault: false,
  });

  return newCat;
};

export const deleteCategory = async (id: string): Promise<void> => {
  const db = getDB();
  const now = Date.now();
  await db.runAsync(`UPDATE categories SET deleted_at = ?, updated_at = ? WHERE id = ?`, [
    now,
    now,
    id,
  ]);
  await enqueueChange('categories', id, 'delete', {});
};
