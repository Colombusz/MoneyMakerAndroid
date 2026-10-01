import type { AppDatabase } from '../dbTypes';
import { Migration } from './types';

export const migration002: Migration = {
  version: 2,
  name: '002_day_notes',
  up: (db: AppDatabase) => {
    db.execSync(`
      -- One free-text note per calendar day, independent of transactions.
      -- 'date' is the UTC midnight the calendar buckets on, so a note written on
      -- the 5th always shows on the 5th regardless of the device timezone.
      CREATE TABLE IF NOT EXISTS day_notes (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        date INTEGER NOT NULL,
        notes TEXT DEFAULT '',
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER DEFAULT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_day_notes_user_date
        ON day_notes (user_id, date);
      CREATE INDEX IF NOT EXISTS idx_day_notes_updated ON day_notes (updated_at);
    `);
  }
};