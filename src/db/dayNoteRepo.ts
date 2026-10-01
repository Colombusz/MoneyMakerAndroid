import { getDB } from './sqlite';
import { DayNote } from '../types';
import { generateUUID } from '../utils/uuid';
import { enqueueChange } from './outboxRepo';

export const getDayNotes = async (
  userId: string,
  range?: { startMs: number; endMs: number }
): Promise<DayNote[]> => {
  const db = getDB();
  let sql = `
    SELECT id, user_id as userId, date, notes, updated_at as updatedAt, deleted_at as deletedAt
    FROM day_notes
    WHERE user_id = ? AND deleted_at IS NULL
  `;
  const params: any[] = [userId];

  if (range) {
    sql += ' AND date >= ? AND date <= ?';
    params.push(range.startMs, range.endMs);
  }

  sql += ' ORDER BY date ASC';
  const rows = await db.getAllAsync<DayNote>(sql, params);
  return rows;
};

export const getDayNoteByDate = async (
  userId: string,
  dateMs: number
): Promise<DayNote | null> => {
  const db = getDB();
  const row = await db.getFirstAsync<DayNote>(
    `SELECT id, user_id as userId, date, notes, updated_at as updatedAt, deleted_at as deletedAt
     FROM day_notes
     WHERE user_id = ? AND date = ? AND deleted_at IS NULL`,
    [userId, dateMs]
  );
  return row ?? null;
};

/**
 * Save (or clear) the note for one calendar day. There is at most one note per
 * user per day, so this upserts on (user_id, date) rather than taking an id.
 *
 * Clearing the text soft-deletes the row instead of storing an empty note, so the
 * calendar never shows a meaningless empty note marker.
 */
export const saveDayNote = async (
  userId: string,
  dateMs: number,
  notes: string
): Promise<DayNote | null> => {
  const db = getDB();
  const now = Date.now();
  const trimmed = (notes ?? '').trim();

  if (!trimmed) {
    const existing = await getDayNoteByDate(userId, dateMs);
    if (!existing) return null;

    await db.runAsync(
      `UPDATE day_notes SET deleted_at = ?, updated_at = ? WHERE id = ?`,
      [now, now, existing.id]
    );
    await enqueueChange('dayNotes', existing.id, 'delete', {});
    return null;
  }

  // Look the row up *including* soft-deleted ones: a cleared note must be revived
  // rather than replaced, otherwise the new row collides with the (user_id, date)
  // unique index that the soft-deleted row still occupies.
  const existing = await db.getFirstAsync<{ id: string }>(
    `SELECT id FROM day_notes WHERE user_id = ? AND date = ?`,
    [userId, dateMs]
  );
  const id = existing?.id ?? generateUUID();

  await db.runAsync(
    `INSERT INTO day_notes (id, user_id, date, notes, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, NULL)
     ON CONFLICT(user_id, date) DO UPDATE SET
       notes = excluded.notes,
       updated_at = excluded.updated_at,
       deleted_at = NULL`,
    [id, userId, dateMs, trimmed, now]
  );

  // Read the id back: on a conflict the pre-existing row's id wins, and that is
  // the id the server knows this note by.
  const stored = await db.getFirstAsync<{ id: string }>(
    `SELECT id FROM day_notes WHERE user_id = ? AND date = ? AND deleted_at IS NULL`,
    [userId, dateMs]
  );
  const storedId = stored?.id ?? id;

  const note: DayNote = { id: storedId, userId, date: dateMs, notes: trimmed, updatedAt: now };

  await enqueueChange('dayNotes', storedId, 'upsert', {
    date: new Date(dateMs).toISOString(),
    notes: trimmed,
  });

  return note;
};