import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Goal, Account } from '../../types';
import { Modal, AmountInput, Select, TextInput, Button } from '../../shared/components/ui';
import { spacing } from '../../shared/theme/tokens';
import { parseToCentavos } from '../../shared/utils/currency';

export interface ContributeGoalModalProps {
  isOpen: boolean;
  goal: Goal | null;
  accounts: Account[];
  onClose: () => void;
  onSubmit: (amountCentavos: number, accountId: string, notes?: string) => Promise<void>;
}

export const ContributeGoalModal: React.FC<ContributeGoalModalProps> = ({
  isOpen,
  goal,
  accounts,
  onClose,
  onSubmit,
}) => {
  const [amountStr, setAmountStr] = useState('');
  const [fromAccountId, setFromAccountId] = useState(accounts[0]?.id || '');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (accounts.length > 0 && !fromAccountId) {
      setFromAccountId(accounts[0].id);
    }
  }, [accounts]);

  const handleSubmit = async () => {
    const amount = parseToCentavos(amountStr);
    if (amount <= 0 || !fromAccountId) return;

    setLoading(true);
    await onSubmit(amount, fromAccountId, notes.trim() || undefined);
    setLoading(false);
    setAmountStr('');
    setNotes('');
    onClose();
  };

  const accountOptions = accounts.map((a) => ({
    label: `${a.name} (${a.type})`,
    value: a.id,
  }));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Contribute: ${goal?.name || ''}`}>
      <AmountInput
        label="Contribution Amount"
        value={amountStr}
        onChangeText={setAmountStr}
        placeholder="0.00"
      />
      <Select
        label="From Account"
        value={fromAccountId}
        options={accountOptions}
        onSelect={setFromAccountId}
      />
      <TextInput
        label="Notes (Optional)"
        value={notes}
        onChangeText={setNotes}
        placeholder="e.g. Savings deposit"
      />

      <View style={styles.btnRow}>
        <Button variant="outline" label="Cancel" onPress={onClose} style={styles.btn} />
        <Button
          label="Record Contribution"
          onPress={handleSubmit}
          loading={loading}
          style={styles.btn}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  btnRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  btn: {
    flex: 1,
  },
});
