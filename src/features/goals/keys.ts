/** Query-key factory for the (personal) goals feature. Never inline arrays. */
export const goalKeys = {
  all: ['goals'] as const,
  list: (userId: string) => [...goalKeys.all, 'list', userId] as const,
  progress: (goalId: string) => [...goalKeys.all, 'progress', goalId] as const,
};
