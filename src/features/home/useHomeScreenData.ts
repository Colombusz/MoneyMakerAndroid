import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Account, Category, Transaction } from '../../types';
import { getAccounts } from '../../db/accountRepo';
import { getCategories } from '../../db/categoryRepo';
import { getTransactions, getMonthSummary } from '../../db/transactionRepo';
import { accountKeys } from '../accounts/keys';
import { categoryKeys } from '../categories/keys';
import { transactionKeys } from '../transactions/keys';
import { toMonthKey } from '../../shared/utils/monthKey';

/**
 * Dashboard data lives in the shared React Query cache, so any write that
 * invalidates `accounts` / `transactions` (see `invalidateForChange`) makes the
 * net worth, cash-flow and recent-activity sections update with no manual refresh.
 */
export function useHomeScreenData(userId?: string, syncNow?: () => Promise<any>) {
  const [refreshing, setRefreshing] = useState(false);
  const enabled = Boolean(userId);

  const accountsQuery = useQuery({
    queryKey: accountKeys.list(userId ?? ''),
    queryFn: () => getAccounts(userId as string),
    enabled,
  });

  const recentQuery = useQuery({
    queryKey: transactionKeys.recent(userId ?? ''),
    queryFn: () => getTransactions(userId as string, { limit: 10 }),
    enabled,
  });

  // Recent activity is labelled by category, so the dashboard needs the
  // category list too. It shares the `categories` namespace with every other
  // screen, so this is served from the same cached entry.
  const categoriesQuery = useQuery({
    queryKey: categoryKeys.list(userId ?? ''),
    queryFn: () => getCategories(userId as string),
    enabled,
  });

  const now = new Date();
  const summaryQuery = useQuery({
    queryKey: transactionKeys.monthSummary(toMonthKey(now), userId ?? ''),
    queryFn: () => getMonthSummary(userId as string, now.getFullYear(), now.getMonth() + 1),
    enabled,
  });

  const accounts: Account[] = accountsQuery.data?.accounts ?? [];
  const totalBalance = accountsQuery.data?.totalBalanceCentavos ?? 0;
  const recentTransactions: Transaction[] = recentQuery.data ?? [];
  const categories: Category[] = categoriesQuery.data ?? [];
  const summary = summaryQuery.data;
  const monthNet = {
    income: summary?.totalIncomeCentavos ?? 0,
    expense: summary?.totalExpenseCentavos ?? 0,
    net: summary?.netCentavos ?? 0,
  };

  const loadDashboardData = async () => {
    await Promise.all([
      accountsQuery.refetch(),
      recentQuery.refetch(),
      summaryQuery.refetch(),
      categoriesQuery.refetch(),
    ]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (syncNow) {
      await syncNow();
    }
    await loadDashboardData();
    setRefreshing(false);
  };

  return {
    accounts,
    totalBalance,
    recentTransactions,
    categories,
    monthNet,
    refreshing,
    loadDashboardData,
    onRefresh,
  };
}
