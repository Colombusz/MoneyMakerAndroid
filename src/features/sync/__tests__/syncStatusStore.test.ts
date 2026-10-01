import { beforeEach, describe, expect, it } from 'vitest';
import { useSyncStatusStore } from '../syncStatusStore';

describe('syncStatusStore', () => {
  beforeEach(() => useSyncStatusStore.getState().reset());

  it('starts synced with no pending work', () => {
    const state = useSyncStatusStore.getState();
    expect(state.status).toBe('synced');
    expect(state.pendingCount).toBe(0);
    expect(state.lastSyncedAt).toBeNull();
    expect(state.lastError).toBeNull();
  });

  it('records status, pending count and errors', () => {
    const store = useSyncStatusStore.getState();
    store.setStatus('syncing');
    store.setPendingCount(3);
    store.setLastError('network down');
    const state = useSyncStatusStore.getState();
    expect(state.status).toBe('syncing');
    expect(state.pendingCount).toBe(3);
    expect(state.lastError).toBe('network down');
  });

  it('reset() clears all sync state', () => {
    const store = useSyncStatusStore.getState();
    store.setStatus('error');
    store.setPendingCount(5);
    store.setLastError('boom');
    store.setLastSyncedAt(Date.now());
    store.reset();
    const state = useSyncStatusStore.getState();
    expect(state.status).toBe('synced');
    expect(state.pendingCount).toBe(0);
    expect(state.lastError).toBeNull();
    expect(state.lastSyncedAt).toBeNull();
  });
});
