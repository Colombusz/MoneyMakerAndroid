/** Query-key factory for the accounts feature. Never inline arrays. */
export const accountKeys = {
  all: ['accounts'] as const,
  list: (userId: string) => [...accountKeys.all, 'list', userId] as const,
};
