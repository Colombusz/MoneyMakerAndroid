import { getDB } from './sqlite';
import { SyncOutboxItem } from '../types';
import { generateUUID } from '../utils/uuid';
import { scheduleSync } from '../services/sync/syncTrigger';

export const enqueueChange = async (
  entityType: SyncOutboxItem['entityType'],
  entityId: string,
  action: 'upsert' | 'delete',
  payload: any
): Promise<void> => {
  const db = getDB();
  const id = generateUUID();
  const now = Date.now();
  const payloadJson = JSON.stringify(payload);

  await db.runAsync(
    `INSERT INTO sync_outbox (id, entity_type, entity_id, action, payload_json, created_at, attempts)
     VALUES (?, ?, ?, ?, ?, ?, 0)`,
    [id, entityType, entityId, action, payloadJson, now]
  );

  // Every local write funnels through here, so scheduling the flush at this one
  // point means no write path can forget to sync. Debounced, so a burst of
  // writes results in a single request.
  scheduleSync();
};

export const getPendingChanges = async (): Promise<SyncOutboxItem[]> => {
  const db = getDB();
  const rows = await db.getAllAsync<any>(
    `SELECT id, entity_type as entityType, entity_id as entityId, action, payload_json as payloadJson, created_at as createdAt, attempts, last_error as lastError
     FROM sync_outbox
     ORDER BY created_at ASC`
  );
  return rows;
};

export const removeChanges = async (ids: string[]): Promise<void> => {
  if (ids.length === 0) return;
  const db = getDB();
  const placeholders = ids.map(() => '?').join(',');
  await db.runAsync(`DELETE FROM sync_outbox WHERE id IN (${placeholders})`, ids);
};

export const getMetadata = async (key: string): Promise<string | null> => {
  const db = getDB();
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM sync_metadata WHERE key = ?`,
    [key]
  );
  return row ? row.value : null;
};

export const setMetadata = async (key: string, value: string): Promise<void> => {
  const db = getDB();
  await db.runAsync(
    `INSERT INTO sync_metadata (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value]
  );
};
