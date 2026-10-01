import { create } from 'zustand';
import type { TransactionType } from '../../types';
import { toMonthKey } from '../../shared/utils/monthKey';

export type TransactionTypeFilter = TransactionType | 'all';

/**
 * UI store — client-only, ephemeral view state shared across screens:
 * the selected month and list filters. Never holds server/database data, and
 * never calls the network or SQLite.
 */
export interface UiState {
  /** Selected month as 'YYYY-MM'. */
  selectedMonth: string;
  transactionTypeFilter: TransactionTypeFilter;
  categoryFilter: string | null;
  /** Incremented to request a scroll-to-top / refresh of a list. */
  selectMonth: (monthKey: string) => void;
  setTransactionTypeFilter: (filter: TransactionTypeFilter) => void;
  setCategoryFilter: (categoryId: string | null) => void;
  reset: () => void;
}

const createInitialState = (): Pick<
  UiState,
  'selectedMonth' | 'transactionTypeFilter' | 'categoryFilter'
> => ({
  selectedMonth: toMonthKey(),
  transactionTypeFilter: 'all',
  categoryFilter: null,
});

export const useUiStore = create<UiState>((set) => ({
  ...createInitialState(),
  selectMonth: (selectedMonth) => set({ selectedMonth }),
  setTransactionTypeFilter: (transactionTypeFilter) => set({ transactionTypeFilter }),
  setCategoryFilter: (categoryFilter) => set({ categoryFilter }),
  reset: () => set(createInitialState()),
}));
