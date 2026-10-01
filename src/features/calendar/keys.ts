/** Query-key factory for calendar day notes. */
export const dayNoteKeys = {
  all: ['dayNotes'] as const,
  month: (monthKey: string, userId: string) => [...dayNoteKeys.all, 'month', monthKey, userId] as const,
};