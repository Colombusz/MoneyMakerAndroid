import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Modal, TextInput, AmountInput, Button } from '../../shared/components/ui';
import { spacing } from '../../shared/theme/tokens';

export interface CreateSharedGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, targetStr: string, targetDate?: string) => Promise<boolean>;
}

export const CreateSharedGoalModal: React.FC<CreateSharedGoalModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    const success = await onSubmit(name, target, targetDate);
    setLoading(false);
    if (success) {
      setName('');
      setTarget('');
      setTargetDate('');
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Shared Goal">
      <TextInput
        label="Goal Title"
        value={name}
        onChangeText={setName}
        placeholder="e.g. Vacation, Wedding, House Fund"
      />
      <AmountInput
        label="Target Amount"
        value={target}
        onChangeText={setTarget}
        placeholder="0.00"
      />
      <TextInput
        label="Target Date (Optional)"
        value={targetDate}
        onChangeText={setTargetDate}
        placeholder="YYYY-MM-DD"
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
