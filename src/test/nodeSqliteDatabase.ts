import { DatabaseSync } from 'node:sqlite';
import type { AppDatabase } from '../db/dbTypes';

/**
 * Creates an in-memory SQLite database backed by Node's built-in `node:sqlite`
 * that satisfies the `AppDatabase` surface our repositories use. Tests inject
 * it via `setDatabaseForTesting()` so migrations, SQL aggregates and writes run
 * against a real SQLite engine.
 */
export const createNodeSqliteDatabase = (): AppDatabase => {
  const raw = new DatabaseSync(':memory:');

  return {
    execSync: (sql: string): void => {
      raw.exec(sql);
    },
    runSync: <T>(sql: string, params: unknown[] = []) =>
      raw.prepare(sql).run(...params) as T,
    getAllSync: <T>(sql: string, params: unknown[] = []) =>
      raw.prepare(sql).all(...params) as T[],
    getFirstSync: <T>(sql: string, params: unknown[] = []) =>
      (raw.prepare(sql).get(...params) ?? null) as T | null,
    runAsync: async <T>(sql: string, params: unknown[] = []) =>
      raw.prepare(sql).run(...params) as T,
    getAllAsync: async <T>(sql: string, params: unknown[] = []) =>
      raw.prepare(sql).all(...params) as T[],
    getFirstAsync: async <T>(sql: string, params: unknown[] = []) =>
      (raw.prepare(sql).get(...params) ?? null) as T | null,
  };
};

