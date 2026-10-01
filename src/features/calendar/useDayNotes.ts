import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import { DayNote } from '../../types';
import { getDayNotes, saveDayNote } from '../../db/dayNoteRepo';
import { invalidateForChange } from '../../query';
import { dayNoteKeys } from './keys';
import { dateKeyToUtcMs } from '../../shared/utils/date';

/**
 * Day notes live in their own table so a free-form note can be attached to a
 * calendar day without inventing a transaction to hang it off.
 */
export function useDayNotes(userId: string | undefined, startMs: number, endMs: number) {
  const queryClient = useQueryClient();

  const notesQuery = useQuery({
    queryKey: dayNoteKeys.month(
      new Date(startMs).toISOString().slice(0, 7),
      userId ?? ''
    ),
    queryFn: () => getDayNotes(userId as string, { startMs, endMs }),
    enabled: Boolean(userId),
  });

  /** 'YYYY-MM-DD' → the note for that day, if any. */
  const getNoteForDay = (dateKey: string): DayNote | undefined =>
    notesQuery.data?.find((n) => new Date(n.date).toISOString().split('T')[0] === dateKey);

  /** Lets the month grid mark which days carry a diary entry. */
  const hasNoteForDay = (dateKey: string | null): boolean =>
    Boolean(dateKey && getNoteForDay(dateKey));

  const upsertNote = async (dateKey: string, notes: string) => {
    if (!userId) {
      Alert.alert('Sign in required', 'Please sign in to save a note for this day.');
      return;
    }
    try {
      await saveDayNote(userId, dateKeyToUtcMs(dateKey), notes);
      invalidateForChange(queryClient, { entityTypes: ['dayNotes'] });
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save the note');
    }
  };

  return { notes: notesQuery.data ?? [], getNoteForDay, hasNoteForDay, upsertNote };
}