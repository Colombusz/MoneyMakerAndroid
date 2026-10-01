import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Account, Category, TransactionType } from '../../types';
import { Tabs, AmountInput, TextInput, Select, Button } from '../../shared/components/ui';
import { spacing } from '../../shared/theme/tokens';
import { parseToCentavos } from '../../shared/utils/currency';

export interface TransactionFormData {
  type: TransactionType;
  accountId: string;
  destinationAccountId?: string;
  categoryId?: string;
  source?: string;
  notes?: string;
  amountCentavos: number;
}

export interface TransactionFormProps {
  accounts: Account[];
  categories: Category[];
  initialType?: TransactionType;
  onSubmit: (data: TransactionFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({
  accounts,
  categories,
  initialType = 'expense',
  onSubmit,
  onCancel,
  isSubmitting = false,
}) => {
  const [type, setType] = useState<TransactionType>(initialType);
  const [amountStr, setAmountStr] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || '');
  const [selectedDestAccountId, setSelectedDestAccountId] = useState(accounts[1]?.id || '');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [source, setSource] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id);
    }
    if (accounts.length > 1 && !selectedDestAccountId) {
      setSelectedDestAccountId(accounts[1].id);
    }
  }, [accounts]);

  const filteredCategories = categories.filter((c) =>
    type === 'income' ? c.type === 'income' : c.type === 'expense'
  );

  useEffect(() => {
    if (
      filteredCategories.length > 0 &&
      !filteredCategories.some((c) => c.id === selectedCategoryId)
    ) {
      setSelectedCategoryId(filteredCategories[0].id);
    }
  }, [type, filteredCategories]);

  const handleSubmit = async () => {
    setError(null);
    const amountCentavos = parseToCentavos(amountStr);

    if (amountCentavos <= 0) {
      setError('Please enter an amount greater than zero.');
      return;
    }

    if (!selectedAccountId) {
      setError('Please select an account.');
      return;
    }

    if (type === 'transfer') {
      if (!selectedDestAccountId) {
        setError('Please select a destination account.');
        return;
      }
      if (selectedAccountId === selectedDestAccountId) {
        setError('Source and destination accounts must be different.');
        return;
      }
    }

    await onSubmit({
      type,
      accountId: selectedAccountId,
      destinationAccountId: type === 'transfer' ? selectedDestAccountId : undefined,
      categoryId: type === 'transfer' ? undefined : selectedCategoryId,
      source: type === 'income' ? source : undefined,
      notes: notes.trim(),
      amountCentavos,
    });
  };

  const accountOptions = accounts.map((a) => ({
    label: `${a.name} (${a.type})`,
    value: a.id,
  }));

  const categoryOptions = filteredCategories.map((c) => ({
    label: c.name,
    value: c.id,
  }));

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
      <Tabs<TransactionType>
        tabs={[
          { id: 'expense', label: 'Expense' },
          { id: 'income', label: 'Income' },
          { id: 'transfer', label: 'Transfer' },
        ]}
        activeTab={type}
        onChange={(t) => setType(t)}
      />

      <AmountInput
        label="Amount"
        value={amountStr}
        onChangeText={setAmountStr}
        error={error}
        placeholder="0.00"
      />

      <Select
        label={type === 'transfer' ? 'From Account' : 'Account'}
        value={selectedAccountId}
        options={accountOptions}
        onSelect={setSelectedAccountId}
      />

      {type === 'transfer' ? (
        <Select
          label="To Account"
          value={selectedDestAccountId}
          options={accountOptions}
          onSelect={setSelectedDestAccountId}
        />
      ) : (
        <Select
          label="Category"
          value={selectedCategoryId}
          options={categoryOptions}
          onSelect={setSelectedCategoryId}
        />
      )}

      {type === 'income' && (
        <TextInput
          label="Source / Payer"
          value={source}
          onChangeText={setSource}
          placeholder="e.g. Employer, Client, Refund"
        />
      )}

      <TextInput
        label="Notes (Optional)"
        value={notes}
        onChangeText={setNotes}
        placeholder="Add context or details"
      />

      <View style={styles.btnRow}>
        <Button
          variant="outline"
          label="Cancel"
          onPress={onCancel}
          style={styles.flexBtn}
          disabled={isSubmitting}
        />
        <Button
          label={isSubmitting ? 'Saving...' : 'Save Transaction'}
          onPress={handleSubmit}
          loading={isSubmitting}
          style={styles.flexBtn}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
  },
  btnRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  flexBtn: {
    flex: 1,
  },
});
