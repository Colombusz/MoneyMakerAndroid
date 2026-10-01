import { describe, expect, it } from 'vitest';
import { buildInvalidationKeys } from '../invalidation';

describe('buildInvalidationKeys', () => {
  it('maps a new expense to balances, transactions and linked goal progress', () => {
    const keys = buildInvalidationKeys({ entityTypes: ['transactions'], months: ['2026-01'] });
    expect(keys).toEqual([['accounts'], ['transactions'], ['goals']]);
  });

  it('invalidates every affected month when a recurring change spans two months', () => {
    const keys = buildInvalidationKeys({
      entityTypes: ['recurringRules'],
      months: ['2026-01', '2026-02'],
    });
    expect(keys).toEqual([
      ['recurring'],
      ['recurring', 'occurrences', '2026-01'],
      ['recurring', 'occurrences', '2026-02'],
    ]);
  });

  it('dedupes repeated keys', () => {
    const keys = buildInvalidationKeys({ entityTypes: ['accounts', 'accounts'] });
    expect(keys).toEqual([['accounts'], ['goals']]);
  });

  it('routes shared goals to their own namespace, never personal entities', () => {
    const keys = buildInvalidationKeys({ entityTypes: ['sharedGoals'] });
    expect(keys).toEqual([['shared-goals']]);
    const flat = keys.flat();
    expect(flat).not.toContain('accounts');
    expect(flat).not.toContain('transactions');
    expect(flat).not.toContain('goals');
  });

  it('invalidates goal progress, balances and transactions for a contribution', () => {
    const keys = buildInvalidationKeys({ entityTypes: ['goalContributions'], months: ['2026-03'] });
    expect(keys).toEqual([['goals'], ['accounts'], ['transactions']]);
  });

  it('invalidates the calendar months for a recurring-rule change', () => {
    const keys = buildInvalidationKeys({ entityTypes: ['recurringRules'], months: ['2026-04'] });
    expect(keys).toEqual([['recurring'], ['recurring', 'occurrences', '2026-04']]);
  });
});
