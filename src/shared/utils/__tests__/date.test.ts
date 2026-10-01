import { describe, it, expect } from 'vitest';
import {
  formatDateToISO,
  formatDisplayDate,
  getDaysInMonth,
  getMonthBounds,
  parseDateValue,
  dateKeyToUtcMs,
  MONTH_NAMES,
} from '../date';

describe('date utils (Android)', () => {
  it('has 12 month names', () => {
    expect(MONTH_NAMES).toHaveLength(12);
    expect(MONTH_NAMES[0]).toBe('January');
  });

  it('formats Date to ISO string (YYYY-MM-DD)', () => {
    const d = new Date(Date.UTC(2026, 8, 15));
    expect(formatDateToISO(d)).toBe('2026-09-15');
  });

  it('formats display date', () => {
    const res = formatDisplayDate('2026-09-15T00:00:00Z');
    expect(res).toContain('Sep');
    expect(res).toContain('2026');
  });

  it('does not shift bare YYYY-MM-DD values by a day', () => {
    // new Date('2026-01-01') is UTC midnight, which is Dec 31 in any negative
    // offset. parseDateValue must keep the calendar day the user entered.
    const parsed = parseDateValue('2026-01-01');
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(0);
    expect(parsed.getDate()).toBe(1);
    expect(formatDisplayDate('2026-01-01')).toBe('Jan 1, 2026');
  });

  it('accepts epoch millisecond timestamps', () => {
    const ms = new Date(2026, 8, 30, 12).getTime();
    expect(formatDisplayDate(ms)).toBe('Sep 30, 2026');
  });

  it('returns an empty string for unparseable dates', () => {
    expect(formatDisplayDate('not-a-date')).toBe('');
  });

  it('calculates days in month accurately', () => {
    expect(getDaysInMonth(2024, 2)).toBe(29); // Leap year
    expect(getDaysInMonth(2023, 2)).toBe(28);
    expect(getDaysInMonth(2026, 9)).toBe(30);
  });

  it('returns valid UTC month bounds', () => {
    const { start, end } = getMonthBounds(2026, 9);
    expect(start.toISOString()).toBe('2026-09-01T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-09-30T23:59:59.999Z');
  });

  describe('dateKeyToUtcMs', () => {
    // The calendar buckets a transaction onto a day with
    // `new Date(t.date).toISOString().split('T')[0]`, i.e. by UTC date. An entry
    // made from the calendar must round-trip back to the day that was tapped.
    it('round-trips through the same day key the calendar groups by', () => {
      expect(new Date(dateKeyToUtcMs('2026-10-05')).toISOString().split('T')[0]).toBe(
        '2026-10-05'
      );
    });

    it('maps to UTC midnight, not local midnight', () => {
      const ms = dateKeyToUtcMs('2026-10-05');
      expect(new Date(ms).toISOString()).toBe('2026-10-05T00:00:00.000Z');
    });

    it('handles month boundaries without rolling over', () => {
      expect(new Date(dateKeyToUtcMs('2026-01-01')).toISOString().split('T')[0]).toBe(
        '2026-01-01'
      );
      expect(new Date(dateKeyToUtcMs('2026-12-31')).toISOString().split('T')[0]).toBe(
        '2026-12-31'
      );
    });
  });
});
