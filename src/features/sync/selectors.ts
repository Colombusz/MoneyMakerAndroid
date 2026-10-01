import { useShallow } from 'zustand/react/shallow';
import { useSyncStatusStore, type SyncStatusState } from './syncStatusStore';

export const selectSyncStatus = (state: SyncStatusState) => state.status;
export const selectLastSyncedAt = (state: SyncStatusState) => state.lastSyncedAt;
export const selectPendingCount = (state: SyncStatusState) => state.pendingCount;
export const selectLastSyncError = (state: SyncStatusState) => state.lastError;

// Narrow single-value hook.
export const useSyncStatusValue = () => useSyncStatusStore(selectSyncStatus);

/**
 * Named selector hook for the whole status object. Uses `useShallow` so the
 * object identity is stable unless one of the fields actually changes.
 */
export const useSyncStatus = () =>
  useSyncStatusStore(
    useShallow((state) => ({
      status: state.status,
      lastSyncedAt: state.lastSyncedAt,
      pendingCount: state.pendingCount,
      lastError: state.lastError,
    }))
  );
