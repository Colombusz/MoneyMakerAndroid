import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Account } from '../../types';
import { formatCentavos } from '../../shared/utils/currency';
import { spacing, radii, typography } from '../../shared/theme/tokens';
import { MobileProjectedOccurrence } from '../../db/recurringRepo';
import { Button, Modal, Select } from '../../shared/components/ui';

export interface PayBillModalProps {
  isOpen: boolean;
  occurrence: MobileProjectedOccurrence | null;
  accounts: Account[];
  currency?: string;
  onClose: () => void;
  onConfirm: (accountId: string) => Promise<void>;
}

/**
 * Asks which account a recurring payment is drawn from before recording it.
 * The rule's own account is preselected, so the common case stays one tap.
 */
export const PayBillModal: React.FC<PayBillModalProps> = ({
  isOpen,
  occurrence,
  accounts,
  currency = 'PHP',
  onClose,
  onConfirm,
}) => {
  const { colors } = useTheme();
  const [accountId, setAccountId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Preselect the rule's account each time the sheet opens.
  useEffect(() => {
    if (isOpen && occurrence) setAccountId(occurrence.accountId);
  }, [isOpen, occurrence]);

  const handleConfirm = async () => {
    if (!accountId) return;
    setSubmitting(true);
    try {
      await onConfirm(accountId);
      onClose();
    } catch {
      // The caller surfaces the error; keep the sheet open so it can be retried.
    } finally {
      setSubmitting(false);
    }
  };

  const accountOptions = accounts.map((a) => ({ label: a.name, value: a.id }));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Pay Recurring Bill">
      <ScrollView showsVerticalScrollIndicator={false} style={styles.form}>
        {occurrence && (
          <View
            style={[
              styles.summary,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
              {occurrence.notes || 'Recurring Bill'}
            </Text>
            <Text style={[styles.summaryAmount, { color: colors.text }]}>
              {formatCentavos(occurrence.amountCentavos, currency)}
            </Text>
            <Text style={[styles.summaryMeta, { color: colors.textMuted }]}>
              Due {occurrence.date}
            </Text>
          </View>
        )}

        <Select
          label="Pay From"
          value={accountId}
          options={accountOptions}
          onSelect={setAccountId}
          placeholder="Select an account"
        />

        <View style={styles.buttonRow}>
          <Button
            variant="outline"
            label="Cancel"
            onPress={onClose}
            style={styles.flexBtn}
            disabled={submitting}
          />
          <Button
            label={submitting ? 'Recording...' : 'Confirm Payment'}
            onPress={handleConfirm}
            loading={submitting}
            disabled={!accountId}
            style={styles.flexBtn}
          />
        </View>
      </ScrollView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  form: {
    paddingVertical: spacing.sm,
  },
  summary: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  summaryLabel: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
  },
  summaryAmount: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    marginTop: spacing.xs,
  },
  summaryMeta: {
    fontSize: typography.fontSizes.xs,
    marginTop: spacing.xs,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  flexBtn: {
    flex: 1,
  },
});