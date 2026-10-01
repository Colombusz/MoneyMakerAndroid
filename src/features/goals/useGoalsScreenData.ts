import { Alert } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Goal } from '../../types';
import { getGoals, createGoal, contributeToGoal, deleteGoal } from '../../db/goalRepo';
import { getAccounts } from '../../db/accountRepo';
import { formatCentavos } from '../../shared/utils/currency';
import { invalidateForChange } from '../../query';
import { goalKeys } from './keys';
import { accountKeys } from '../accounts/keys';

export function useGoalsScreenData(userId?: string, currency = 'PHP') {
  const queryClient = useQueryClient();
  const enabled = Boolean(userId);

  const goalsQuery = useQuery({
    queryKey: goalKeys.list(userId ?? ''),
    queryFn: () => getGoals(userId as string),
    enabled,
  });

  const accountsQuery = useQuery({
    queryKey: accountKeys.list(userId ?? ''),
    queryFn: () => getAccounts(userId as string),
    enabled,
  });

  const loadData = async () => {
    await Promise.all([goalsQuery.refetch(), accountsQuery.refetch()]);
  };

  const handleCreateGoal = async (data: {
    name: string;
    targetAmountCentavos: number;
    linkedAccountId?: string;
  }) => {
    if (!userId) return;
    try {
      await createGoal(userId, data);
      invalidateForChange(queryClient, { entityTypes: ['goals'] });
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create goal');
    }
  };

  const handleContribute = async (
    goalId: string,
    goalName: string,
    amountCentavos: number,
    fromAccountId: string,
    notes?: string
  ) => {
    if (!userId) return;
    try {
      await contributeToGoal(userId, goalId, amountCentavos, fromAccountId, notes);
      // Debited the funding account and wrote an expense transaction.
      invalidateForChange(queryClient, { entityTypes: ['goalContributions'] });
      Alert.alert(
        'Goal Updated',
        `Successfully contributed ${formatCentavos(amountCentavos, currency)} to ${goalName}!`
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to record contribution');
    }
  };

  const handleDeleteGoal = (goal: Goal) => {
    Alert.alert('Delete Goal', `Are you sure you want to delete ${goal.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteGoal(goal.id);
          invalidateForChange(queryClient, { entityTypes: ['goals'] });
        },
      },
    ]);
  };

  return {
    goals: goalsQuery.data ?? [],
    accounts: accountsQuery.data?.accounts ?? [],
    loading: goalsQuery.isFetching || accountsQuery.isFetching,
    loadData,
    handleCreateGoal,
    handleContribute,
    handleDeleteGoal,
  };
}
