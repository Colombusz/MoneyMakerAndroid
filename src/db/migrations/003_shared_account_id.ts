import type { AppDatabase } from '../dbTypes';
import { Migration } from './types';

export const migration003: Migration = {
  version: 3,
  name: '003_shared_account_id',
  up: (db: AppDatabase) => {
    db.execSync(`
      -- Add shared_account_id to transactions for shared account deposits
      ALTER TABLE transactions ADD COLUMN shared_account_id TEXT DEFAULT NULL;
      CREATE INDEX IF NOT EXISTS idx_transactions_shared_account ON transactions (shared_account_id);
    `);
  },
};