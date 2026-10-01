import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Account } from '../../types';
import {
  Modal,
  AmountInput,
  Select,
  TextInput,
  Button,
} from '../../shared/components/ui';
import { spacing } from '../../shared/theme/tokens';
import { SharedAccount } from './sharedAccounts';

export type SharedAccountMovementMode = 'deposit' | 'expense';

export interface DepositSharedAccountModalProps {
  isOpen: boolean;
  account: SharedAccount | null;
  mode: SharedAccountMovementMode;
  accounts: Account[];
  onClose: () => void;
  onSubmit: (
    sharedAccountId: string,
    amountStr: string,
    fundingAccountId: string,
    notes?: string
  ) => Promise<boolean>;
  onSubmitExpense: (
    sharedAccountId: string,
    amountStr: string,
    notes?: string
  ) => Promise<boolean>;
}

export const DepositSharedAccountModal: React.FC<DepositSharedAccountModalProps> = ({
  isOpen,
  account,
  mode,
  accounts,
  onClose,
  onSubmit,
  onSubmitExpense,
}) => {
  const [amount, setAmount] = useState('');
  const [fundingAccountId, setFundingAccountId] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && accounts.length > 0 && !fundingAccountId) {
      setFundingAccountId(accounts[0].id);
    }
  }, [isOpen, accounts, fundingAccountId]);

  const isDeposit = mode === 'deposit';

  const handleSubmit = async () => {
    if (!account) return;
    setLoading(true);
    const success = isDeposit
      ? await onSubmit(account.id, amount, fundingAccountId, notes)
      : await onSubmitExpense(account.id, amount, notes);
    setLoading(false);
    if (success) {
      setAmount('');
      setNotes('');
      onClose();
    }
  };

  const fundingOptions = accounts
    .filter((a) => !a.isArchived)
    .map((a) => ({ label: a.name, value: a.id }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isDeposit
          ? `Deposit: ${account?.name || ''}`
          : `Expense: ${account?.name || ''}`
      }
    >
      <AmountInput
        label={isDeposit ? 'Deposit Amount' : 'Expense Amount'}
        value={amount}
        onChangeText={setAmount}
        placeholder="0.00"
      />
      {isDeposit && (
        <Select
          label="Funding Account (your private account)"
          value={fundingAccountId}
          options={fundingOptions}
          onSelect={setFundingAccountId}
          placeholder="Select funding account"
        />
      )}
      <TextInput
        label="Notes (Optional)"
        value={notes}
        onChangeText={setNotes}
        placeholder={isDeposit ? 'e.g. monthly share' : 'e.g. groceries'}
      />
      <View style={styles.btnRow}>
        <Button variant="outline" label="Cancel" onPress={onClose} style={styles.btn} />
        <Button
          label={isDeposit ? 'Confirm deposit' : 'Confirm expense'}
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
