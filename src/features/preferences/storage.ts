import { SQLiteStorage } from 'expo-sqlite/kv-store';
import type { StateStorage } from 'zustand/middleware';

const PREFERENCES_DB = 'moneysaver_prefs.db';

let storageInstance: SQLiteStorage | null = null;

const getStorage = (): SQLiteStorage => {
  if (!storageInstance) {
    storageInstance = new SQLiteStorage(PREFERENCES_DB);
  }
  return storageInstance;
};

/**
 * Zustand persistence adapter backed by expo-sqlite's key-value store.
 *
 * Only small, device-level preferences (theme, currency) are stored through it.
 * Session tokens and any domain/financial data are NEVER persisted here.
 */
export const preferencesStorage: StateStorage = {
  getItem: (name) => getStorage().getItemSync(name),
  setItem: (name, value) => {
    getStorage().setItemSync(name, value);
  },
  removeItem: (name) => {
    getStorage().removeItemSync(name);
  },
};
