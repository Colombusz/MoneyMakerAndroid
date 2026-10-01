import * as SQLite from 'expo-sqlite';
import { runMigrations } from './migrations';
import type { AppDatabase } from './dbTypes';

export type { AppDatabase } from './dbTypes';

let dbInstance: AppDatabase | null = null;
let overriddenDatabase: AppDatabase | null = null;

/**
 * Test-only seam: inject a database implementation (e.g. node:sqlite) so that
 * repositories and migrations can be exercised against a real SQLite engine
 * without a React Native runtime. Never used by app code.
 */
export const setDatabaseForTesting = (db: AppDatabase | null): void => {
  overriddenDatabase = db;
  dbInstance = db;
};

export const getDB = (): AppDatabase => {
  if (overriddenDatabase) {
    return overriddenDatabase;
  }
  if (!dbInstance) {
    dbInstance = SQLite.openDatabaseSync('moneysaver.db') as unknown as AppDatabase;
  }
  return dbInstance;
};

export const initDatabase = async (): Promise<void> => {
  const db = getDB();
  runMigrations(db);
};
