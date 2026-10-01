import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { MonthSummary } from '../../db/transactionRepo';
import { formatCentavos } from '../../shared/utils/currency';
import { spacing, radii, typography } from '../../shared/theme/tokens';

export interface MonthKpiBarProps {
  summary: MonthSummary | null;
  currency?: string;
}

export const MonthKpiBar: React.FC<MonthKpiBarProps> = ({ summary, currency }) => {
  const { colors } = useTheme();

  return (
    <View
      style={[styles.kpiContainer, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={styles.kpiItem}>
        <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>Income</Text>
        <Text style={[styles.kpiValue, { color: colors.income }]}>
          +{formatCentavos(summary?.totalIncomeCentavos || 0, currency)}
        </Text>
      </View>
      <View style={[styles.kpiDivider, { backgroundColor: colors.border }]} />
      <View style={styles.kpiItem}>
        <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>Expenses</Text>
        <Text style={[styles.kpiValue, { color: colors.expense }]}>
          -{formatCentavos(summary?.totalExpenseCentavos || 0, currency)}
        </Text>
      </View>
      <View style={[styles.kpiDivider, { backgroundColor: colors.border }]} />
      <View style={styles.kpiItem}>
        <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>Net Savings</Text>
        <Text
          style={[
            styles.kpiValue,
            { color: (summary?.netCentavos || 0) >= 0 ? colors.income : colors.expense },
          ]}
        >
          {formatCentavos(summary?.netCentavos || 0, currency)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  kpiContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: spacing.md,
    borderRadius: radii.xl,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  kpiItem: {
    alignItems: 'center',
    flex: 1,
  },
  kpiLabel: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    marginBottom: spacing.xs,
  },
  kpiValue: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
  },
  kpiDivider: {
    width: 1,
    height: 30,
  },
});
