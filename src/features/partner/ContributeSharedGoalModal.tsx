import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { SharedGoal, Account } from '../../types';
import { Modal, AmountInput, Select, TextInput, Button } from '../../shared/components/ui';
import { spacing } from '../../shared/theme/tokens';

export interface ContributeSharedGoalModalProps {
  isOpen: boolean;
  goal: SharedGoal | null;
  accounts: Account[];
  onClose: () => void;
  onSubmit: (
    goalId: string,
    amountStr: string,
    accountId: string,
    notes?: string
  ) => Promise<boolean>;
}

export const ContributeSharedGoalModal: React.FC<ContributeSharedGoalModalProps> = ({
  isOpen,
  goal,
  accounts,
  onClose,
  onSubmit,
}) => {
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (accounts.length > 0 && !accountId) {
      setAccountId(accounts[0].id);
    }
  }, [accounts]);

  const handleSubmit = async () => {
    if (!goal) return;
    setLoading(true);
    const success = await onSubmit(goal.id, amount, accountId, notes);
    setLoading(false);
    if (success) {
      setAmount('');
      setNotes('');
      onClose();
    }
  };

  const accountOptions = accounts.map((a) => ({
    label: `${a.name} (${a.type})`,
    value: a.id,
  }));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Contribute: ${goal?.name || ''}`}>
      <AmountInput
        label="Contribution Amount"
        value={amount}
        onChangeText={setAmount}
        placeholder="0.00"
      />
      <Select
        label="Funding Account"
        value={accountId}
        options={accountOptions}
        onSelect={setAccountId}
      />
      <TextInput
        label="Notes (Optional)"
        value={notes}
        onChangeText={setNotes}
        placeholder="e.g. Monthly contribution"
      />

      <View style={styles.btnRow}>
        <Button variant="outline" label="Cancel" onPress={onClose} style={styles.btn} />
        <Button label="Submit" onPress={handleSubmit} loading={loading} style={styles.btn} />
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
