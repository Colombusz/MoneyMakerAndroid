import { apiFetch } from '../apiClient';
import { getPendingChanges, removeChanges } from '../../db/outboxRepo';

export const pushOutboxChanges = async (): Promise<number> => {
  const pending = await getPendingChanges();
  if (pending.length === 0) return 0;

  const payload = {
    changes: pending.map((item) => ({
      id: item.entityId,
      entityType: item.entityType,
      action: item.action,
      payload: JSON.parse(item.payloadJson),
      updatedAt: item.createdAt,
    })),
  };

  const pushRes = await apiFetch<{ appliedIds: string[]; conflicts: any[] }>('/api/sync/push', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (pushRes && Array.isArray(pushRes.appliedIds)) {
    const outboxIdsToRemove = pending
      .filter((p) => pushRes.appliedIds.includes(p.entityId))
      .map((p) => p.id);

    await removeChanges(outboxIdsToRemove);
    return pushRes.appliedIds.length;
  }

  return 0;
};
