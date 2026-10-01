/**
 * Query-key factory for the recurring-bills feature.
 * Occurrences are keyed by calendar month so a month edit invalidates only
 * the affected months.
 */
export const recurringKeys = {
  all: ['recurring'] as const,
  rules: (userId: string) => [...recurringKeys.all, 'rules', userId] as const,
  occurrences: (monthKey: string, userId: string) =>
    [...recurringKeys.all, 'occurrences', monthKey, userId] as const,
};
