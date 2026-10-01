/**
 * Query-key factories for partner status and shared goals.
 *
 * Shared goals get their OWN namespace (`['shared-goals']`) and are fetched only
 * from the dedicated shared-goal endpoints; they are never merged into personal
 * accounts, transactions or goals.
 */
export const partnerKeys = {
  all: ['partner'] as const,
  status: () => [...partnerKeys.all, 'status'] as const,
};

export const sharedGoalKeys = {
  all: ['shared-goals'] as const,
  list: () => [...sharedGoalKeys.all, 'list'] as const,
  detail: (sharedGoalId: string) => [...sharedGoalKeys.all, 'detail', sharedGoalId] as const,
};
