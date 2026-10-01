import { useState } from 'react';
import { Alert } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Category, Transaction, TransactionType } from '../../types';
import { getCategories } from '../../db/categoryRepo';
import { getTransactions, deleteTransaction } from '../../db/transactionRepo';
import { invalidateForChange } from '../../query';
import { transactionKeys } from './keys';
import { categoryKeys } from '../categories/keys';

export function useTransactionsScreenData(userId?: string) {
  const queryClient = useQueryClient();
  const [filterType, setFilterType] = useState<TransactionType | 'all'>('all');
  const [refreshing, setRefreshing] = useState(false);

  const transactionsQuery = useQuery({
    queryKey: transactionKeys.list(userId ?? '', filterType),
    queryFn: () =>
      getTransactions(userId as string, {
        type: filterType === 'all' ? undefined : filterType,
        limit: 200,
      }),
    enabled: Boolean(userId),
  });

  // Cards are labelled by category, so pull the shared cached category list.
  const categoriesQuery = useQuery({
    queryKey: categoryKeys.list(userId ?? ''),
    queryFn: () => getCategories(userId as string),
    enabled: Boolean(userId),
  });

  const loadTransactions = async () => {
    await transactionsQuery.refetch();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await transactionsQuery.refetch();
    setRefreshing(false);
  };

  const handleDelete = (tx: Transaction) => {
    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to remove this record? Balances will be restored.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteTransaction(tx.id);
            // Restores account balances and refreshes every transaction view.
            invalidateForChange(queryClient, { entityTypes: ['transactions'] });
          },
        },
      ]
    );
  };

  return {
    transactions: transactionsQuery.data ?? [],
    categories: categoriesQuery.data ?? ([] as Category[]),
    filterType,
    setFilterType,
    refreshing,
    loading: transactionsQuery.isFetching,
    loadTransactions,
    onRefresh,
    handleDelete,
  };
}
