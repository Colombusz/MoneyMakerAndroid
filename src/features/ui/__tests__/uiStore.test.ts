import { beforeEach, describe, expect, it } from 'vitest';
import { useUiStore } from '../uiStore';
import { toMonthKey } from '../../../shared/utils/monthKey';

describe('uiStore', () => {
  beforeEach(() => useUiStore.getState().reset());

  it('defaults to the current month and no filters', () => {
    const state = useUiStore.getState();
    expect(state.selectedMonth).toMatch(/^\d{4}-\d{2}$/);
    expect(state.transactionTypeFilter).toBe('all');
    expect(state.categoryFilter).toBeNull();
  });

  it('holds the selected month as a serializable string', () => {
    useUiStore.getState().selectMonth('2025-11');
    expect(useUiStore.getState().selectedMonth).toBe('2025-11');
  });

  it('reset() restores the current-month default and clears filters', () => {
    useUiStore.getState().selectMonth('2020-01');
    useUiStore.getState().setTransactionTypeFilter('expense');
    useUiStore.getState().setCategoryFilter('cat-1');
    useUiStore.getState().reset();
    const state = useUiStore.getState();
    expect(state.selectedMonth).toBe(toMonthKey());
    expect(state.transactionTypeFilter).toBe('all');
    expect(state.categoryFilter).toBeNull();
  });
});
