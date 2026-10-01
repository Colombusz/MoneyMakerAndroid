/**
 * Small pure helpers for the 'YYYY-MM' month keys used by the transaction and
 * recurring query keys.
 */
export const toMonthKey = (date: Date | number = new Date()): string => {
  const d = new Date(date);
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
};

export const shiftMonthKey = (monthKey: string, delta: number): string => {
  const [yearStr, monthStr] = monthKey.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  return toMonthKey(new Date(year, month - 1 + delta, 1));
};
