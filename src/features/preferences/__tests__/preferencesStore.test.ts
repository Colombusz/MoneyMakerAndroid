import { beforeEach, describe, expect, it, vi } from 'vitest';

// The persisted store pulls in expo-sqlite's key-value store; stub it with an
// in-memory implementation so the store can be tested under Node.
vi.mock('expo-sqlite/kv-store', () => {
  const store = new Map<string, string>();
  return {
    SQLiteStorage: class {
      getItemSync(key: string): string | null {
        return store.get(key) ?? null;
      }
      setItemSync(key: string, value: string): void {
        store.set(key, value);
      }
      removeItemSync(key: string): boolean {
        return store.delete(key);
      }
    },
  };
});

import { usePreferencesStore } from '../preferencesStore';

describe('preferencesStore', () => {
  beforeEach(() => usePreferencesStore.getState().reset());

  it('defaults to system theme and PHP currency', () => {
    const state = usePreferencesStore.getState();
    expect(state.theme).toBe('system');
    expect(state.currency).toBe('PHP');
  });

  it('updates theme and currency', () => {
    usePreferencesStore.getState().setTheme('dark');
    usePreferencesStore.getState().setCurrency('USD');
    const state = usePreferencesStore.getState();
    expect(state.theme).toBe('dark');
    expect(state.currency).toBe('USD');
  });

  it('reset() restores the defaults', () => {
    usePreferencesStore.getState().setTheme('dark');
    usePreferencesStore.getState().setCurrency('USD');
    usePreferencesStore.getState().reset();
    const state = usePreferencesStore.getState();
    expect(state.theme).toBe('system');
    expect(state.currency).toBe('PHP');
  });
});
