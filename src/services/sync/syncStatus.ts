import { SyncStatus } from '../../types';

let currentSyncStatus: SyncStatus = 'synced';
const listeners = new Set<(status: SyncStatus) => void>();

export const getSyncStatus = (): SyncStatus => currentSyncStatus;

export const subscribeSyncStatus = (fn: (status: SyncStatus) => void) => {
  listeners.add(fn);
  fn(currentSyncStatus);
  return () => {
    listeners.delete(fn);
  };
};

export const notifyStatus = (status: SyncStatus) => {
  currentSyncStatus = status;
  listeners.forEach((fn) => fn(status));
};
