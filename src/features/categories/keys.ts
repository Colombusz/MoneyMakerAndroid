/** Query-key factory for the categories feature. Never inline arrays. */
export const categoryKeys = {
  all: ['categories'] as const,
  list: (userId: string) => [...categoryKeys.all, 'list', userId] as const,
};
