import { useUiStore, type UiState } from './uiStore';

export const selectSelectedMonth = (state: UiState) => state.selectedMonth;
export const selectTransactionTypeFilter = (state: UiState) => state.transactionTypeFilter;
export const selectCategoryFilter = (state: UiState) => state.categoryFilter;

// Named selector hooks — components read through these, never inline selectors.
export const useSelectedMonth = () => useUiStore(selectSelectedMonth);
export const useTransactionTypeFilter = () => useUiStore(selectTransactionTypeFilter);
export const useCategoryFilter = () => useUiStore(selectCategoryFilter);
