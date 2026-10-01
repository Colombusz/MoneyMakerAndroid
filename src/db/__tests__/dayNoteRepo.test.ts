import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('expo-sqlite', () => ({
  openDatabaseSync: () => {
    throw new Error('expo-sqlite must not be used inside tests');
  },
}));

import { initDatabase, setDatabaseForTesting } from '../sqlite';
import { createNodeSqliteDatabase } from '../../test/nodeSqliteDatabase';
import { getDayNotes, getDayNoteByDate, saveDayNote } from '../dayNoteRepo';
import { getPendingChanges } from '../outboxRepo';
import { dateKeyToUtcMs } from '../../shared/utils/date';

const USER = 'user-1';
const dayKeyOf = (ms: number) => new Date(ms).toISOString().split('T')[0];

beforeEach(async () => {
  setDatabaseForTesting(createNodeSqliteDatabase());
  await initDatabase();
});

describe('dayNoteRepo against a real SQLite database', () => {
  it('stores a note against the tapped calendar day', async () => {
    await saveDayNote(USER, dateKeyToUtcMs('2026-10-05'), 'Checked the brakes');

    const note = await getDayNoteByDate(USER, dateKeyToUtcMs('2026-10-05'));
    expect(note?.notes).toBe('Checked the brakes');
    // Round-trips through the same day key the calendar groups by.
    expect(dayKeyOf(note!.date)).toBe('2026-10-05');
  });

  it('keeps notes for different days separate', async () => {
    await saveDayNote(USER, dateKeyToUtcMs('2026-10-05'), 'Day five');
    await saveDayNote(USER, dateKeyToUtcMs('2026-10-06'), 'Day six');

    const notes = await getDayNotes(USER);
    expect(notes).toHaveLength(2);
    expect((await getDayNoteByDate(USER, dateKeyToUtcMs('2026-10-06')))?.notes).toBe('Day six');
  });

  it('updates in place rather than creating a duplicate for the same day', async () => {
    await saveDayNote(USER, dateKeyToUtcMs('2026-10-05'), 'First draft');
    await saveDayNote(USER, dateKeyToUtcMs('2026-10-05'), 'Second draft');

    const notes = await getDayNotes(USER);
    expect(notes).toHaveLength(1);
    expect(notes[0].notes).toBe('Second draft');
  });

  it('clearing a note removes it instead of storing empty text', async () => {
    await saveDayNote(USER, dateKeyToUtcMs('2026-10-05'), 'Temporary');
    await saveDayNote(USER, dateKeyToUtcMs('2026-10-05'), '   ');

    expect(await getDayNotes(USER)).toHaveLength(0);
    expect(await getDayNoteByDate(USER, dateKeyToUtcMs('2026-10-05'))).toBeNull();
  });

  it('can re-add a note for a day that was previously cleared', async () => {
    await saveDayNote(USER, dateKeyToUtcMs('2026-10-05'), 'First');
    await saveDayNote(USER, dateKeyToUtcMs('2026-10-05'), '');
    await saveDayNote(USER, dateKeyToUtcMs('2026-10-05'), 'Again');

    const notes = await getDayNotes(USER);
    expect(notes).toHaveLength(1);
    expect(notes[0].notes).toBe('Again');
  });

  it('only returns notes inside the requested range', async () => {
    await saveDayNote(USER, dateKeyToUtcMs('2026-10-01'), 'Early');
    await saveDayNote(USER, dateKeyToUtcMs('2026-10-15'), 'Mid');
    await saveDayNote(USER, dateKeyToUtcMs('2026-11-02'), 'Next month');

    const october = await getDayNotes(USER, {
      startMs: dateKeyToUtcMs('2026-10-01'),
      endMs: dateKeyToUtcMs('2026-10-31'),
    });
    expect(october).toHaveLength(2);
  });

  it('does not leak notes belonging to another user', async () => {
    await saveDayNote('user-1', dateKeyToUtcMs('2026-10-05'), 'Mine');
    expect(await getDayNotes('user-2')).toHaveLength(0);
  });

  it('queues a sync change so the note reaches the other clients', async () => {
    await saveDayNote(USER, dateKeyToUtcMs('2026-10-05'), 'Synced note');

    const pending = await getPendingChanges();
    const entry = pending.find((p) => p.entityType === 'dayNotes');
    expect(entry).toBeTruthy();
    expect(entry!.action).toBe('upsert');
    expect(JSON.parse(entry!.payloadJson).notes).toBe('Synced note');
    // Dates cross the wire as ISO, matching every other synced entity.
    expect(JSON.parse(entry!.payloadJson).date).toBe('2026-10-05T00:00:00.000Z');
  });
});
