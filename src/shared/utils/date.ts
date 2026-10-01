export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export const formatDateToISO = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

/**
 * Parse anything the local store can hand us into a Date. Timestamps are epoch
 * ms here; bare `YYYY-MM-DD` strings are treated as *local* dates, because
 * `new Date('2026-09-30')` parses as UTC midnight and renders as the previous
 * day for anyone west of Greenwich.
 */
export const parseDateValue = (value: string | number | Date): Date => {
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(value);
};

export const formatDisplayDate = (dateStr: string | number | Date): string => {
  const d = parseDateValue(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month, 0).getDate();
};

export const getMonthBounds = (year: number, month: number) => {
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  return { start, end };
};

/**
 * Convert a calendar 'YYYY-MM-DD' key to the epoch-ms timestamp that the day
 * grid actually buckets on.
 *
 * The calendar derives a transaction's day with
 * `new Date(tx.date).toISOString().split('T')[0]`, i.e. it buckets by the **UTC**
 * calendar date. So a transaction recorded "on the 5th" has to be stored at UTC
 * midnight of the 5th — storing local midnight would file it under the previous
 * day for anyone east of Greenwich (and shift it back a day in the other
 * direction). `new Date('2026-10-05')` already means UTC midnight, but being
 * explicit here keeps the intent readable at the call site.
 */
export const dateKeyToUtcMs = (dateKey: string): number => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
};
