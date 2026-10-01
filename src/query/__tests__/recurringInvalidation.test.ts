import { describe, expect, it } from 'vitest';
import { buildInvalidationKeys } from '../invalidation';
import { accountKeys, transactionKeys, recurringKeys, goalKeys } from '../keys';

/**
 * Paying a recurring bill writes a real expense transaction. If the screens that
 * render net worth / balances / the transaction feed are not invalidated, they
 * keep serving stale cached data and the payment looks like it never happened.
 */
describe('paying a recurring bill invalidates everything that shows money', () => {
  const keys = buildInvalidationKeys({
    entityTypes: ['transactions', 'recurringOverrides'],
  });

  it('invalidates account balances (net worth)', () => {
    expect(keys).toContainEqual(accountKeys.all);
  });

  it('invalidates the transaction feed and month summaries', () => {
    expect(keys).toContainEqual(transactionKeys.all);
  });

  it('invalidates goal progress, which follows linked-account balances', () => {
    expect(keys).toContainEqual(goalKeys.all);
  });

  it('invalidates projected occurrences', () => {
    expect(keys).toContainEqual(recurringKeys.all);
  });
});

describe('editing a recurring rule invalidates occurrences', () => {
  it('invalidates the recurring namespace when a rule is added or deleted', () => {
    expect(buildInvalidationKeys({ entityTypes: ['recurringRules'] })).toContainEqual(
      recurringKeys.all
    );
  });

  it('invalidates only the affected months when overrides change', () => {
    const keys = buildInvalidationKeys({
      entityTypes: ['recurringOverrides'],
      months: ['2026-10'],
    });
    expect(keys).toContainEqual(['recurring', 'occurrences', '2026-10']);
  });
});
