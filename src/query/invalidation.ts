import type { QueryClient, QueryKey } from '@tanstack/react-query';
import {
  accountKeys,
  categoryKeys,
  transactionKeys,
  goalKeys,
  recurringKeys,
  dayNoteKeys,
  partnerKeys,
  sharedGoalKeys,
} from './keys';

/** Entity types the sync engine and local writes can report as changed. */
export type EntityType =
  | 'accounts'
  | 'categories'
  | 'transactions'
  | 'recurringRules'
  | 'recurringOverrides'
  | 'goals'
  | 'goalContributions'
  | 'dayNotes'
  | 'sharedGoals'
  | 'partner';

export interface DataChange {
  entityTypes: readonly EntityType[];
  /** Affected 'YYYY-MM' month keys (e.g. an edit that moves a txn between months sends both). */
  months?: readonly string[];
}

const dedupe = (keys: QueryKey[]): QueryKey[] => {
  const seen = new Set<string>();
  const result: QueryKey[] = [];
  for (const key of keys) {
    const signature = JSON.stringify(key);
    if (seen.has(signature)) continue;
    seen.add(signature);
    result.push(key);
  }
  return result;
};

/**
 * Pure mapping from "what changed" to the query keys that must be invalidated.
 * Kept pure so it can be unit-tested without a QueryClient.
 */
export const buildInvalidationKeys = (change: DataChange): QueryKey[] => {
  const keys: QueryKey[] = [];
  const months = change.months ?? [];

  for (const entity of change.entityTypes) {
    switch (entity) {
      case 'accounts':
        keys.push(accountKeys.all);
        // Goal progress is derived from linked-account balances.
        keys.push(goalKeys.all);
        break;

      case 'categories':
        keys.push(categoryKeys.all);
        break;

      case 'transactions':
        // Account balances are SQL aggregates over transactions, so they move too.
        keys.push(accountKeys.all);
        // Transaction data is read through several differently-shaped views
        // (dashboard feed, windowed history, month summaries, calendar). Invalidate
        // the whole namespace so every mounted view refreshes immediately.
        keys.push(transactionKeys.all);
        // Goal progress follows linked-account balances, which transactions move.
        keys.push(goalKeys.all);
        break;

      case 'recurringRules':
      case 'recurringOverrides':
        keys.push(recurringKeys.all);
        for (const monthKey of months) {
          keys.push([...recurringKeys.all, 'occurrences', monthKey]);
        }
        break;

      case 'dayNotes':
        // Day notes are read per calendar month by the calendar screen.
        keys.push(dayNoteKeys.all);
        break;

      case 'goals':
        keys.push(goalKeys.all);
        break;

      case 'goalContributions':
        // A contribution also debits an account and writes a transaction.
        keys.push(goalKeys.all);
        keys.push(accountKeys.all);
        keys.push(transactionKeys.all);
        break;

      case 'sharedGoals':
        keys.push(sharedGoalKeys.all);
        break;

      case 'partner':
        keys.push(partnerKeys.all);
        break;
    }
  }

  return dedupe(keys);
};

/**
 * The ONE place allowed to call `invalidateQueries`. The mutation hooks and the
 * sync engine both route through here; nothing else invalidates.
 */
export const invalidateForChange = (client: QueryClient, change: DataChange): void => {
  for (const queryKey of buildInvalidationKeys(change)) {
    client.invalidateQueries({ queryKey });
  }
};
