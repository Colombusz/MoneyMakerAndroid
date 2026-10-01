import { create } from 'zustand';
import type { SyncStatus } from '../../types';

/**
 * Sync-status store — client-only view of the sync engine's state.
 * The sync engine itself is a plain-TypeScript module with no React/Zustand
 * imports; it reports changes here through the `reportStatus` callback wired at
 * the app root.
 */
export interface SyncStatusState {
  status: SyncStatus;
  lastSyncedAt: number | null;
  pendingCount: number;
  lastError: string | null;
  setStatus: (status: SyncStatus) => void;
  setLastSyncedAt: (at: number) => void;
  setPendingCount: (count: number) => void;
  setLastError: (message: string | null) => void;
  reset: () => void;
}

const createInitialState = (): Pick<
  SyncStatusState,
  'status' | 'lastSyncedAt' | 'pendingCount' | 'lastError'
> => ({
  status: 'synced',
  lastSyncedAt: null,
  pendingCount: 0,
  lastError: null,
});

export const useSyncStatusStore = create<SyncStatusState>((set) => ({
  ...createInitialState(),
  setStatus: (status) => set({ status }),
  setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),
  setPendingCount: (pendingCount) => set({ pendingCount }),
  setLastError: (lastError) => set({ lastError }),
  reset: () => set(createInitialState()),
}));
