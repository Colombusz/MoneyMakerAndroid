import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { preferencesStorage } from './storage';

export type ThemePreference = 'light' | 'dark' | 'system';

/**
 * Preferences store — small, device-level client-only state. Persisted through
 * a SQLite-backed adapter and hydrated before the splash screen hides so the
 * theme never flashes.
 */
export interface PreferencesState {
  theme: ThemePreference;
  currency: string;
  setTheme: (theme: ThemePreference) => void;
  setCurrency: (currency: string) => void;
  reset: () => void;
}

const createInitialState = (): Pick<PreferencesState, 'theme' | 'currency'> => ({
  theme: 'system',
  currency: 'PHP',
});

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      ...createInitialState(),
      setTheme: (theme) => set({ theme }),
      setCurrency: (currency) => set({ currency }),
      reset: () => set(createInitialState()),
    }),
    {
      name: 'moneysaver-preferences',
      storage: createJSONStorage(() => preferencesStorage),
      partialize: (state) => ({ theme: state.theme, currency: state.currency }),
    }
  )
);

/** Await before hiding the splash screen so the persisted theme is applied. */
export const hydratePreferences = async (): Promise<void> => {
  await usePreferencesStore.persist.rehydrate();
};
