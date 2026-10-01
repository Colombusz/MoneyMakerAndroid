import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { RecurringRule } from '../../types';
import { formatCentavos } from '../../shared/utils/currency';
import { spacing, radii, typography } from '../../shared/theme/tokens';

export interface RuleCardProps {
  rule: RecurringRule;
  currency?: string;
  onLongPress: (id: string) => void;
}

export const RuleCard: React.FC<RuleCardProps> = ({ rule, currency, onLongPress }) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      onLongPress={() => onLongPress(rule.id)}
      activeOpacity={0.7}
      style={[styles.ruleCard, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={styles.ruleInfo}>
        <Text style={[styles.ruleTitle, { color: colors.text }]}>
          {rule.notes || 'Recurring Expense'}
        </Text>
        <Text style={[styles.ruleSub, { color: colors.textMuted }]}>
          {rule.frequency.toUpperCase()} {rule.intervalDays ? `(${rule.intervalDays}d)` : ''}
        </Text>
      </View>
      <Text style={[styles.ruleAmount, { color: colors.text }]}>
        {formatCentavos(rule.amountCentavos, currency)}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  ruleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: radii.xl,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  ruleInfo: {
    flex: 1,
  },
  ruleTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
  },
  ruleSub: {
    fontSize: typography.fontSizes.xs,
    marginTop: 2,
  },
  ruleAmount: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
  },
});
