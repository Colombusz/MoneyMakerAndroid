import type { AppDatabase } from '../dbTypes';
import { Migration } from './types';
import { migration001 } from './001_initial_schema';
import { migration002 } from './002_day_notes';
import { migration003 } from './003_shared_account_id';

export const migrations: Migration[] = [migration001, migration002, migration003];

export const runMigrations = (db: AppDatabase): void => {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      applied_at INTEGER NOT NULL
    );
  `);

  const appliedRows = db.getAllSync<{ version: number }>(
    'SELECT version FROM _migrations ORDER BY version ASC'
  );
  const appliedVersions = new Set(appliedRows.map((r) => r.version));

  for (const m of migrations) {
    if (!appliedVersions.has(m.version)) {
      m.up(db);
      db.runSync('INSERT INTO _migrations (version, name, applied_at) VALUES (?, ?, ?)', [
        m.version,
        m.name,
        Date.now(),
      ]);
    }
  }
};
