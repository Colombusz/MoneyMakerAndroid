import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { MobileProjectedOccurrence } from '../../db/recurringRepo';
import { formatCentavos } from '../../shared/utils/currency';
import { spacing, radii, typography } from '../../shared/theme/tokens';
import { Pill } from '../../shared/components/ui';

export interface OccurrenceCardProps {
  occurrence: MobileProjectedOccurrence;
  currency?: string;
  onPay: (occ: MobileProjectedOccurrence) => void;
  onSkip: (occ: MobileProjectedOccurrence) => void;
}

export const OccurrenceCard: React.FC<OccurrenceCardProps> = ({
  occurrence,
  currency,
  onPay,
  onSkip,
}) => {
  const { colors } = useTheme();
  const isPaid = occurrence.status === 'paid';
  const isSkipped = occurrence.status === 'skipped';

  return (
    <View
      style={[
        styles.occCard,
        { backgroundColor: colors.card, borderColor: colors.border },
        (isPaid || isSkipped) && { opacity: 0.6 },
      ]}
    >
      <View style={styles.occLeft}>
        <View
          style={[
            styles.occIcon,
            { backgroundColor: isPaid ? colors.incomeLight : colors.primaryLight },
          ]}
        >
          <Ionicons
            name={isPaid ? 'checkmark-circle' : isSkipped ? 'close-circle' : 'repeat'}
            size={20}
            color={isPaid ? colors.income : isSkipped ? colors.textMuted : colors.primary}
          />
        </View>
        <View style={styles.occDetails}>
          <Text style={[styles.occTitle, { color: colors.text }]} numberOfLines={1}>
            {occurrence.notes || 'Recurring Bill'}
          </Text>
          <Text style={[styles.occDate, { color: colors.textMuted }]}>
            Due: {occurrence.date} &bull; {occurrence.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.occRight}>
        <Text style={[styles.occAmount, { color: colors.text }]}>
          {formatCentavos(occurrence.amountCentavos, currency)}
        </Text>
        {occurrence.status === 'pending' && (
          <View style={styles.actionRow}>
            <Pill variant="success" size="sm" onPress={() => onPay(occurrence)}>
              Pay
            </Pill>
            <Pill variant="outline" size="sm" onPress={() => onSkip(occurrence)}>
              Skip
            </Pill>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  occCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: radii.xl,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  occLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
    marginRight: spacing.sm,
  },
  occIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  occDetails: {
    flex: 1,
  },
  occTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
  },
  occDate: {
    fontSize: typography.fontSizes.xs,
    marginTop: 2,
  },
  occRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  occAmount: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
});
