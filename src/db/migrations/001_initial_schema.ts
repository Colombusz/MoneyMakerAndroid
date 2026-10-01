import type { AppDatabase } from '../dbTypes';
import { Migration } from './types';

export const migration001: Migration = {
  version: 1,
  name: '001_initial_schema',
  up: (db: AppDatabase) => {
    db.execSync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        starting_balance_centavos INTEGER NOT NULL,
        current_balance_centavos INTEGER NOT NULL,
        is_archived INTEGER DEFAULT 0,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER DEFAULT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_accounts_updated ON accounts (updated_at);
      CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts (user_id);

      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        icon TEXT NOT NULL,
        color TEXT NOT NULL,
        is_default INTEGER DEFAULT 0,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER DEFAULT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_categories_user ON categories (user_id);

      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        account_id TEXT NOT NULL,
        type TEXT NOT NULL,
        amount_centavos INTEGER NOT NULL,
        category_id TEXT DEFAULT NULL,
        source TEXT DEFAULT NULL,
        destination_account_id TEXT DEFAULT NULL,
        date INTEGER NOT NULL,
        notes TEXT DEFAULT '',
        receipt_image_url TEXT DEFAULT NULL,
        receipt_public_id TEXT DEFAULT NULL,
        recurring_rule_id TEXT DEFAULT NULL,
        recurring_occurrence_date INTEGER DEFAULT NULL,
        goal_id TEXT DEFAULT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER DEFAULT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions (date);
      CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions (account_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions (user_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_updated ON transactions (updated_at);

      CREATE TABLE IF NOT EXISTS recurring_rules (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        account_id TEXT NOT NULL,
        category_id TEXT NOT NULL,
        type TEXT DEFAULT 'expense',
        amount_centavos INTEGER NOT NULL,
        frequency TEXT NOT NULL,
        interval_days INTEGER DEFAULT NULL,
        start_date INTEGER NOT NULL,
        end_date INTEGER DEFAULT NULL,
        max_occurrences INTEGER DEFAULT NULL,
        notes TEXT DEFAULT '',
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER DEFAULT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_recurring_user ON recurring_rules (user_id);

      CREATE TABLE IF NOT EXISTS recurring_overrides (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        recurring_rule_id TEXT NOT NULL,
        occurrence_date INTEGER NOT NULL,
        status TEXT NOT NULL,
        override_amount_centavos INTEGER DEFAULT NULL,
        transaction_id TEXT DEFAULT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER DEFAULT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_overrides_rule ON recurring_overrides (recurring_rule_id, occurrence_date);

      CREATE TABLE IF NOT EXISTS goals (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        target_amount_centavos INTEGER NOT NULL,
        target_date INTEGER DEFAULT NULL,
        image_url TEXT DEFAULT NULL,
        image_public_id TEXT DEFAULT NULL,
        linked_account_id TEXT DEFAULT NULL,
        is_shared INTEGER DEFAULT 0,
        shared_goal_id TEXT DEFAULT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER DEFAULT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_goals_user ON goals (user_id);

      CREATE TABLE IF NOT EXISTS goal_contributions (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        goal_id TEXT DEFAULT NULL,
        shared_goal_id TEXT DEFAULT NULL,
        amount_centavos INTEGER NOT NULL,
        transaction_id TEXT DEFAULT NULL,
        date INTEGER NOT NULL,
        notes TEXT DEFAULT '',
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER DEFAULT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_contrib_goal ON goal_contributions (goal_id);

      CREATE TABLE IF NOT EXISTS sync_outbox (
        id TEXT PRIMARY KEY NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        action TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        attempts INTEGER DEFAULT 0,
        last_error TEXT DEFAULT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_outbox_created ON sync_outbox (created_at);

      CREATE TABLE IF NOT EXISTS sync_metadata (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
    `);
  },
};
