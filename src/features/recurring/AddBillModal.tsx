import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Modal } from '../../shared/components/ui/Modal';
import { Button } from '../../shared/components/ui/Button';
import { RecurringFrequency, Account, Category } from '../../types';
import { parseToCentavos } from '../../shared/utils/currency';
import { spacing, radii, typography } from '../../shared/theme/tokens';

const FREQUENCIES: RecurringFrequency[] = ['monthly', 'weekly', 'yearly', 'daily', 'custom'];

export interface AddBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  categories: Category[];
  currency?: string;
  onSave: (data: {
    accountId: string;
    categoryId: string;
    amountCentavos: number;
    frequency: RecurringFrequency;
    intervalDays: number | null;
    notes: string;
  }) => Promise<void>;
}

export const AddBillModal: React.FC<AddBillModalProps> = ({
  isOpen,
  onClose,
  accounts,
  categories,
  currency = 'PHP',
  onSave,
}) => {
  const { colors } = useTheme();

  const [notes, setNotes] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly');
  const [customDays, setCustomDays] = useState('14');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

  useEffect(() => {
    if (categories.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories, selectedCategoryId]);

  const handleClose = () => {
    setNotes('');
    setAmountStr('');
    setFrequency('monthly');
    setCustomDays('14');
    onClose();
  };

  const handleSave = async () => {
    const amount = parseToCentavos(amountStr);
    if (amount <= 0) {
      Alert.alert('Amount Required', 'Please enter a valid recurring amount.');
      return;
    }
    if (!selectedAccountId && accounts.length > 0) {
      setSelectedAccountId(accounts[0].id);
    }
    const accId = selectedAccountId || accounts[0]?.id;
    if (!accId) {
      Alert.alert('Account Required', 'Please create an account first.');
      return;
    }

    const catId = selectedCategoryId || categories[0]?.id || '';

    setSubmitting(true);
    try {
      await onSave({
        accountId: accId,
        categoryId: catId,
        amountCentavos: amount,
        frequency,
        intervalDays: frequency === 'custom' ? parseInt(customDays, 10) || 1 : null,
        notes: notes.trim(),
      });
      handleClose();
    } catch {
      // Error handled by caller
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="New Recurring Bill">
      <ScrollView showsVerticalScrollIndicator={false} style={styles.form}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Bill Name / Description</Text>
        <TextInput
          style={[
            styles.input,
            { borderColor: colors.border, backgroundColor: colors.background, color: colors.text },
          ]}
          placeholder="e.g. Fiber Internet, Netflix, Gym"
          placeholderTextColor={colors.textMuted}
          value={notes}
          onChangeText={setNotes}
        />

        <Text style={[styles.label, { color: colors.textSecondary, marginTop: spacing.md }]}>
          Amount ({currency})
        </Text>
        <TextInput
          style={[
            styles.input,
            { borderColor: colors.border, backgroundColor: colors.background, color: colors.text },
          ]}
          placeholder="0.00"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
          value={amountStr}
          onChangeText={(t) => setAmountStr(t.replace(/[^0-9.]/g, ''))}
        />

        <Text style={[styles.label, { color: colors.textSecondary, marginTop: spacing.md }]}>
          Frequency
        </Text>
        <View style={styles.freqRow}>
          {FREQUENCIES.map((f) => {
            const isSelected = frequency === f;
            return (
              <TouchableOpacity
                key={f}
                onPress={() => setFrequency(f)}
                style={[
                  styles.freqChip,
                  { borderColor: colors.border, backgroundColor: colors.background },
                  isSelected && {
                    borderColor: colors.primary,
                    backgroundColor: colors.primaryLight,
                  },
                ]}
              >
                <Text
                  style={[styles.freqText, { color: isSelected ? colors.primary : colors.text }]}
                >
                  {f.toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {frequency === 'custom' && (
          <>
            <Text style={[styles.label, { color: colors.textSecondary, marginTop: spacing.md }]}>
              Interval Days
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                  color: colors.text,
                },
              ]}
              placeholder="14"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              value={customDays}
              onChangeText={setCustomDays}
            />
          </>
        )}

        <View style={styles.buttonContainer}>
          <Button
            title="Save Rule"
            onPress={handleSave}
            loading={submitting}
            variant="primary"
            fullWidth
          />
        </View>
      </ScrollView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  form: {
    paddingVertical: spacing.xs,
  },
  label: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.fontSizes.sm,
  },
  freqRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  freqChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  freqText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
  },
  buttonContainer: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
});
