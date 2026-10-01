import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMonthSummary, MonthSummary, getTransactions } from '../../db/transactionRepo';
import { generateOccurrences } from '../../db/recurringRepo';
import { getCategories } from '../../db/categoryRepo';
import { transactionKeys } from '../transactions/keys';
import { recurringKeys } from '../recurring/keys';
import { categoryKeys } from '../categories/keys';
import { toMonthKey } from '../../shared/utils/monthKey';

/**
 * Calendar reads are keyed against the same `accounts` / `transactions` /
 * `recurring` namespaces used by the rest of the app, so a new transaction, a
 * contribution or a sync immediately updates the KPIs, grid and day sheet.
 */
export function useCalendarScreenData(userId?: string) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const enabled = Boolean(userId);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const monthKey = toMonthKey(currentDate);

  const startMs = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0)).getTime();
  const endMs = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)).getTime();

  const summaryQuery = useQuery({
    queryKey: transactionKeys.monthSummary(monthKey, userId ?? ''),
    queryFn: () => getMonthSummary(userId as string, year, month),
    enabled,
  });

  const monthTransactionsQuery = useQuery({
    queryKey: transactionKeys.month(monthKey, userId ?? ''),
    queryFn: () => getTransactions(userId as string, { startDate: startMs, endDate: endMs }),
    enabled,
  });

  const occurrencesQuery = useQuery({
    queryKey: recurringKeys.occurrences(monthKey, userId ?? ''),
    queryFn: () => generateOccurrences(userId as string, startMs, endMs),
    enabled,
  });

  const categoriesQuery = useQuery({
    queryKey: categoryKeys.list(userId ?? ''),
    queryFn: () => getCategories(userId as string),
    enabled,
  });

  const loadMonthData = async () => {
    await Promise.all([
      summaryQuery.refetch(),
      monthTransactionsQuery.refetch(),
      occurrencesQuery.refetch(),
      categoriesQuery.refetch(),
    ]);
  };

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 2, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month, 1));
  const handleToday = () => setCurrentDate(new Date());

  // Grid calculation
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  const daysGrid: Array<{ dayNumber: number | null; dateKey: string | null }> = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    daysGrid.push({ dayNumber: null, dateKey: null });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${month.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
    daysGrid.push({ dayNumber: d, dateKey: key });
  }

  const summary: MonthSummary | null = summaryQuery.data ?? null;

  return {
    currentDate,
    summary,
    occurrences: occurrencesQuery.data ?? [],
    categories: categoriesQuery.data ?? [],
    monthTransactions: monthTransactionsQuery.data ?? [],
    loading:
      summaryQuery.isFetching ||
      monthTransactionsQuery.isFetching ||
      occurrencesQuery.isFetching ||
      categoriesQuery.isFetching,
    daysGrid,
    loadMonthData,
    handlePrevMonth,
    handleNextMonth,
    handleToday,
  };
}
