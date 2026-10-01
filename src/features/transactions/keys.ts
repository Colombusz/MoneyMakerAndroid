/**
 * Query-key factory for the transactions feature.
 * `monthKey` is always 'YYYY-MM'; keys are windowed so we never load the whole
 * transactions table, and every parameter that affects the result is included.
 */
export const transactionKeys = {
  all: ['transactions'] as const,
  month: (monthKey: string, userId: string) =>
    [...transactionKeys.all, 'month', monthKey, userId] as const,
  monthSummary: (monthKey: string, userId: string) =>
    [...transactionKeys.all, 'summary', monthKey, userId] as const,
  /** Dashboard "recent activity" feed (latest N, all types). */
  recent: (userId: string) => [...transactionKeys.all, 'recent', userId] as const,
  /** Full history list for one type filter ('all' | 'income' | 'expense' | 'transfer'). */
  list: (userId: string, filter: string) =>
    [...transactionKeys.all, 'list', userId, filter] as const,
  infinite: (filters: Record<string, unknown>) =>
    [...transactionKeys.all, 'infinite', filters] as const,
};
