import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Account } from '../../types';
import { Modal, TextInput, AmountInput, Select, Button } from '../../shared/components/ui';
import { spacing } from '../../shared/theme/tokens';
import { parseToCentavos } from '../../shared/utils/currency';

export interface AddGoalModalProps {
  isOpen: boolean;
  accounts: Account[];
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    targetAmountCentavos: number;
    linkedAccountId?: string;
  }) => Promise<void>;
}

export const AddGoalModal: React.FC<AddGoalModalProps> = ({
  isOpen,
  accounts,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [targetStr, setTargetStr] = useState('');
  const [linkedAccountId, setLinkedAccountId] = useState(accounts[0]?.id || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const target = parseToCentavos(targetStr);
    if (!name.trim() || target <= 0) return;

    setLoading(true);
    await onSubmit({
      name: name.trim(),
      targetAmountCentavos: target,
      linkedAccountId: linkedAccountId || undefined,
    });
    setLoading(false);
    setName('');
    setTargetStr('');
    onClose();
  };

  const accountOptions = [
    { label: 'None (Unlinked)', value: '' },
    ...accounts.map((a) => ({ label: `${a.name} (${a.type})`, value: a.id })),
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Savings Goal">
      <TextInput
        label="Goal Title"
        value={name}
        onChangeText={setName}
        placeholder="e.g. Emergency Fund, Travel"
      />
      <AmountInput
        label="Target Amount"
        value={targetStr}
        onChangeText={setTargetStr}
        placeholder="0.00"
      />
      <Select
        label="Linked Account (Optional)"
        value={linkedAccountId}
        options={accountOptions}
        onSelect={setLinkedAccountId}
      />

      <View style={styles.btnRow}>
        <Button variant="outline" label="Cancel" onPress={onClose} style={styles.btn} />
        <Button label="Create Goal" onPress={handleSubmit} loading={loading} style={styles.btn} />
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
