import { pushOutboxChanges } from './pushSync';
import { pullServerChanges } from './pullSync';
import { getSyncStatus, subscribeSyncStatus, notifyStatus } from './syncStatus';
import { queryClient } from '../../query/queryClient';
import type { EntityType } from '../../query/invalidation';
import { invalidateForChange } from '../../query/invalidation';

export { getSyncStatus, subscribeSyncStatus };

export const syncWithBackend = async (
  userId: string
): Promise<{ success: boolean; pushed: number; pulled: number }> => {
  notifyStatus('syncing');

  try {
    const pushedCount = await pushOutboxChanges();
    const pulledCount = await pullServerChanges(userId);

    // Remote changes were written straight into SQLite — refresh every view so
    // the UI (balances, transactions, goals) reflects them without a manual reload.
    if (pulledCount > 0) {
      const entityTypes: EntityType[] = [
        'accounts',
        'categories',
        'transactions',
        'goals',
        'goalContributions',
      ];
      invalidateForChange(queryClient, { entityTypes });
    }

    notifyStatus('synced');
    return { success: true, pushed: pushedCount, pulled: pulledCount };
  } catch (error: any) {
    console.warn('Sync failed (working offline):', error.message);
    notifyStatus('offline');
    return { success: false, pushed: 0, pulled: 0 };
  }
};
