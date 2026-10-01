import { usePreferencesStore, type PreferencesState } from './preferencesStore';

export const selectTheme = (state: PreferencesState) => state.theme;
export const selectCurrency = (state: PreferencesState) => state.currency;

// Named selector hooks — components read through these, never inline selectors.
export const useThemePreference = () => usePreferencesStore(selectTheme);
export const useCurrency = () => usePreferencesStore(selectCurrency);
