import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Modal as RNModal,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Account, Category } from '../../types';
import { formatCentavos, parseToCentavos } from '../../shared/utils/currency';
import { createTransaction } from '../../db/transactionRepo';
import { invalidateForChange } from '../../query';
import { spacing, radii, typography } from '../../shared/theme/tokens';
import { Button } from '../../shared/components/ui';

export interface CashQuickSpendModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  account: Account | null;
  categories: Category[];
  currency?: string;
}

const QUICK_AMOUNTS = [
  { label: '₱15 (Jeepney)', amount: 15 },
  { label: '₱20 (Fare)', amount: 20 },
  { label: '₱50 (Snack)', amount: 50 },
  { label: '₱100 (Meal)', amount: 100 },
];

export const CashQuickSpendModal: React.FC<CashQuickSpendModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  account,
  categories,
  currency = 'PHP',
}) => {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [spentInput, setSpentInput] = useState('');
  const [remainingInput, setRemainingInput] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentBalanceCentavos = account?.currentBalanceCentavos || 0;

  const quickSpendCategory =
    categories.find((c) => c.name.toLowerCase() === 'quick spend') ||
    categories.find((c) => c.isDefault) ||
    categories[0];

  useEffect(() => {
    if (isOpen) {
      setSpentInput('');
      const initialRemaining = (currentBalanceCentavos / 100).toFixed(2);
      setRemainingInput(initialRemaining);
      setNote('');
      setIsSubmitting(false);
    }
  }, [isOpen, currentBalanceCentavos]);

  const handleSpentChange = (val: string) => {
    const cleaned = val.replace(/[^0-9.]/g, '');
    setSpentInput(cleaned);
    const parsedCentavos = parseToCentavos(cleaned);
    const newRemaining = Math.max(0, currentBalanceCentavos - parsedCentavos);
    setRemainingInput((newRemaining / 100).toFixed(2));
  };

  const handleRemainingChange = (val: string) => {
    const cleaned = val.replace(/[^0-9.]/g, '');
    setRemainingInput(cleaned);
    const parsedCentavos = parseToCentavos(cleaned);
    const diff = currentBalanceCentavos - parsedCentavos;
    if (diff >= 0) {
      setSpentInput((diff / 100).toFixed(2));
    } else {
      setSpentInput('0.00');
    }
  };

  const handleAddQuickAmount = (amountPhp: number) => {
    const currentSpentCentavos = parseToCentavos(spentInput);
    const nextSpentCentavos = currentSpentCentavos + amountPhp * 100;
    const nextSpentVal = (nextSpentCentavos / 100).toFixed(2);
    setSpentInput(nextSpentVal);
    const nextRemaining = Math.max(0, currentBalanceCentavos - nextSpentCentavos);
    setRemainingInput((nextRemaining / 100).toFixed(2));
  };

  const handleSubmit = async () => {
    if (!user || !account) return;

    const spentCentavos = parseToCentavos(spentInput);
    if (spentCentavos <= 0) {
      Alert.alert('Amount Required', 'Please enter how much cash you spent.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createTransaction(user.id, {
        accountId: account.id,
        type: 'expense',
        amountCentavos: spentCentavos,
        categoryId: quickSpendCategory?.id || null,
        source: null,
        destinationAccountId: null,
        date: Date.now(),
        notes: note.trim() || 'Quick spend',
      });

      invalidateForChange(queryClient, { entityTypes: ['transactions', 'accounts'] });
      onSuccess?.();
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to record quick spend');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!account) return null;

  const spentCentavos = parseToCentavos(spentInput);

  return (
    <RNModal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <View style={styles.dialogContainer}>
          <View
            style={[styles.dialog, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerTitleRow}>
                <Ionicons name="flash" size={20} color="#F97316" />
                <Text style={[styles.title, { color: colors.text }]}>Cash Quick Spend</Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
              {/* Cash Balance Info Card */}
              <View
                style={[
                  styles.balanceCard,
                  {
                    backgroundColor: isDark ? 'rgba(249, 115, 22, 0.12)' : '#FFF7ED',
                    borderColor: isDark ? 'rgba(249, 115, 22, 0.3)' : '#FED7AA',
                  },
                ]}
              >
                <View style={styles.balanceCardLeft}>
                  <View style={[styles.walletIconBox, { backgroundColor: isDark ? '#431407' : '#FFEDD5' }]}>
                    <Ionicons name="cash-outline" size={20} color="#F97316" />
                  </View>
                  <View>
                    <Text style={[styles.balanceSubLabel, { color: isDark ? '#FDBA74' : '#C2410C' }]}>
                      Current Cash Balance
                    </Text>
                    <Text style={[styles.balanceAmountText, { color: colors.text }]}>
                      {formatCentavos(currentBalanceCentavos, currency)}
                    </Text>
                  </View>
                </View>

                <View style={[styles.categoryBadge, { backgroundColor: isDark ? '#431407' : '#FFEDD5' }]}>
                  <Ionicons name="flash" size={12} color="#F97316" />
                  <Text style={[styles.categoryBadgeText, { color: '#F97316' }]}>Quick Spend</Text>
                </View>
              </View>

              {/* Dual Linked Inputs: Spent vs Remaining */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                  How much did you spend?
                </Text>
                <View
                  style={[
                    styles.amountRow,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <Text style={[styles.currencyPrefix, { color: '#F97316' }]}>₱</Text>
                  <TextInput
                    value={spentInput}
                    onChangeText={handleSpentChange}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={colors.textMuted}
                    style={[styles.amountTextInput, { color: colors.text }]}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                  Or New Remaining Balance
                </Text>
                <View
                  style={[
                    styles.amountRow,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <Text style={[styles.currencyPrefix, { color: colors.textSecondary }]}>₱</Text>
                  <TextInput
                    value={remainingInput}
                    onChangeText={handleRemainingChange}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={colors.textMuted}
                    style={[styles.amountTextInput, { color: colors.text }]}
                  />
                </View>
              </View>

              {/* Quick Suggestion Chips */}
              <View style={styles.chipsSection}>
                <Text style={[styles.chipsLabel, { color: colors.textMuted }]}>Quick Add</Text>
                <View style={styles.chipsRow}>
                  {QUICK_AMOUNTS.map((item) => (
                    <TouchableOpacity
                      key={item.label}
                      onPress={() => handleAddQuickAmount(item.amount)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: isDark ? colors.card : '#F1F5F9',
                          borderColor: colors.border,
                        },
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.chipText, { color: colors.text }]}>+{item.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Optional Note */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                  Note (Optional)
                </Text>
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder="e.g. Jeepney fare, snack, coffee"
                  placeholderTextColor={colors.textMuted}
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                />
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <Button
                  variant="secondary"
                  label="Cancel"
                  onPress={onClose}
                  disabled={isSubmitting}
                  style={{ flex: 1 }}
                />
                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={isSubmitting || spentCentavos <= 0}
                  style={[
                    styles.submitButton,
                    {
                      backgroundColor: spentCentavos > 0 ? '#F97316' : colors.card,
                      opacity: isSubmitting || spentCentavos <= 0 ? 0.6 : 1,
                    },
                  ]}
                  activeOpacity={0.8}
                >
                  <Ionicons name="flash" size={16} color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>
                    {isSubmitting
                      ? 'Logging...'
                      : `Log ${formatCentavos(spentCentavos, currency)}`}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  dialogContainer: {
    width: '92%',
    maxWidth: 420,
    maxHeight: '85%',
  },
  dialog: {
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: spacing.base,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
    marginBottom: spacing.md,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
  },
  content: {
    gap: spacing.md,
  },
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  balanceCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  walletIconBox: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceSubLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  balanceAmountText: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.heavy,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  inputGroup: {
    gap: spacing.xs,
  },
  inputLabel: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  currencyPrefix: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    marginRight: spacing.xs,
  },
  amountTextInput: {
    flex: 1,
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
    height: '100%',
  },
  chipsSection: {
    gap: spacing.xs,
  },
  chipsLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  chipText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.fontSizes.sm,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  submitButton: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radii.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: typography.fontSizes.sm,
  },
});
