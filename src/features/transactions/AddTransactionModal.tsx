import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { Account, Category, TransactionType } from '../../types';
import { getAccounts } from '../../db/accountRepo';
import { getCategories } from '../../db/categoryRepo';
import { createTransaction } from '../../db/transactionRepo';
import { invalidateForChange } from '../../query';
import { accountKeys } from '../accounts/keys';
import { categoryKeys } from '../categories/keys';
import { Modal } from '../../shared/components/ui';
import { TransactionForm, TransactionFormData } from './TransactionForm';

export interface AddTransactionModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultType?: TransactionType;
  /**
   * Epoch-ms timestamp to record the transaction against. Defaults to "now".
   * The calendar passes the tapped day's UTC midnight so the new entry lands on
   * the day the user clicked rather than today.
   */
  initialDate?: number;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  visible,
  onClose,
  onSuccess,
  defaultType = 'expense',
  initialDate,
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Read accounts/categories from the shared cache instead of a private copy, so
  // the form always reflects the latest data and avoids duplicate SQLite reads.
  const enabled = visible && Boolean(user);
  const accountsQuery = useQuery({
    queryKey: accountKeys.list(user?.id ?? ''),
    queryFn: () => getAccounts(user!.id),
    enabled,
  });
  const categoriesQuery = useQuery({
    queryKey: categoryKeys.list(user?.id ?? ''),
    queryFn: () => getCategories(user!.id),
    enabled,
  });

  const accounts: Account[] = accountsQuery.data?.accounts ?? [];
  const categories: Category[] = categoriesQuery.data ?? [];

  const handleSubmit = async (data: TransactionFormData) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      await createTransaction(user.id, {
        accountId: data.accountId,
        type: data.type,
        amountCentavos: data.amountCentavos,
        categoryId: data.categoryId || null,
        source: data.source || null,
        destinationAccountId: data.destinationAccountId || null,
        date: initialDate ?? Date.now(),
        notes: data.notes,
      });

      // Reflect the new income/expense instantly everywhere: net worth, account
      // balances, the dashboard feed, the history list and the calendar.
      invalidateForChange(queryClient, { entityTypes: ['transactions'] });

      onSuccess();
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={visible} onClose={onClose} title="Add Transaction">
      <TransactionForm
        accounts={accounts}
        categories={categories}
        initialType={defaultType}
        onSubmit={handleSubmit}
        onCancel={onClose}
        isSubmitting={isSubmitting}
      />
    </Modal>
  );
};
