import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { RecurringRule, RecurringFrequency, Account, Category } from '../../types';
import {
  getRecurringRules,
  createRecurringRule,
  deleteRecurringRule,
  generateOccurrences,
  payOccurrence,
  skipOccurrence,
  MobileProjectedOccurrence,
} from '../../db/recurringRepo';
import { getAccounts } from '../../db/accountRepo';
import { getCategories } from '../../db/categoryRepo';
import { invalidateForChange } from '../../query';

export function useRecurringScreenData(userId?: string) {
  const queryClient = useQueryClient();
  const [rules, setRules] = useState<RecurringRule[]>([]);
  const [projected, setProjected] = useState<MobileProjectedOccurrence[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const rList = await getRecurringRules(userId);
      setRules(rList);

      // Project next 60 days
      const now = Date.now();
      const next60Days = now + 60 * 24 * 60 * 60 * 1000;
      const occs = await generateOccurrences(userId, now - 7 * 24 * 60 * 60 * 1000, next60Days);
      setProjected(occs);

      const { accounts: accs } = await getAccounts(userId);
      setAccounts(accs);

      const cats = await getCategories(userId);
      setCategories(cats);
    } catch (e) {
      console.error('Failed to load recurring data:', e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateRule = async (data: {
    accountId: string;
    categoryId: string;
    amountCentavos: number;
    frequency: RecurringFrequency;
    intervalDays: number | null;
    notes: string;
  }) => {
    // Previously this returned silently, so tapping Save with no signed-in user
    // closed the modal and appeared to do nothing at all.
    if (!userId) {
      Alert.alert('Sign in required', 'Please sign in before adding a recurring bill.');
      throw new Error('No signed-in user');
    }
    try {
      await createRecurringRule(userId, {
        accountId: data.accountId,
        categoryId: data.categoryId,
        type: 'expense',
        amountCentavos: data.amountCentavos,
        frequency: data.frequency,
        intervalDays: data.intervalDays,
        startDate: Date.now(),
        notes: data.notes.trim(),
      });
      // Keep the calendar's projected occurrences and this screen in step.
      invalidateForChange(queryClient, { entityTypes: ['recurringRules'] });
      await loadData();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save recurring rule');
      // Reload regardless: a partially-applied write (e.g. the row landed but the
      // outbox enqueue failed) must not leave the list showing stale state.
      await loadData();
      throw e;
    }
  };

  const handlePay = async (occ: MobileProjectedOccurrence, accountId?: string) => {
    if (!userId) {
      Alert.alert('Sign in required', 'Please sign in before recording a payment.');
      return;
    }
    try {
      await payOccurrence(
        userId,
        occ.ruleId,
        occ.dateTime,
        occ.amountCentavos,
        occ.notes,
        accountId
      );
      // Paying writes a real expense transaction and debits the chosen account.
      // Without this the dashboard's net worth, the transaction feed and the
      // month summary all keep serving stale cached data.
      invalidateForChange(queryClient, {
        entityTypes: ['transactions', 'recurringOverrides'],
      });
      await loadData();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to record payment');
      throw e;
    }
  };

  const handleSkip = (occ: MobileProjectedOccurrence) => {
    if (!userId) return;
    Alert.alert('Skip Bill', 'Skip this occurrence without logging an expense?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Skip',
        style: 'destructive',
        onPress: async () => {
          try {
            await skipOccurrence(userId, occ.ruleId, occ.dateTime);
            invalidateForChange(queryClient, { entityTypes: ['recurringOverrides'] });
            await loadData();
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to skip occurrence');
          }
        },
      },
    ]);
  };

  const handleDeleteRule = (id: string) => {
    Alert.alert('Delete Recurring Rule', 'Stop future recurring projections for this item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteRecurringRule(id);
            invalidateForChange(queryClient, { entityTypes: ['recurringRules'] });
            await loadData();
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to delete recurring rule');
          }
        },
      },
    ]);
  };

  return {
    rules,
    projected,
    accounts,
    categories,
    loading,
    loadData,
    handleCreateRule,
    handlePay,
    handleSkip,
    handleDeleteRule,
  };
}
