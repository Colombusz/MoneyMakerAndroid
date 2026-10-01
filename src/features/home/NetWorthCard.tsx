import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { spacing, radii, typography } from '../../shared/theme/tokens';
import { formatCentavos } from '../../shared/utils/currency';

export interface NetWorthCardProps {
  totalBalanceCentavos: number;
  monthIncomeCentavos: number;
  monthExpenseCentavos: number;
  currency?: string;
}

export const NetWorthCard: React.FC<NetWorthCardProps> = ({
  totalBalanceCentavos,
  monthIncomeCentavos,
  monthExpenseCentavos,
  currency = 'PHP',
}) => {
  const { colors, isDark } = useTheme();

  return (
    <View
      style={[
        styles.totalCard,
        { backgroundColor: colors.primary, shadowOpacity: isDark ? 0.3 : 0.15 },
      ]}
    >
      <View style={styles.totalHeader}>
        <Text style={styles.totalLabel}>Total Net Worth</Text>
        <Ionicons name="shield-checkmark" size={18} color="rgba(255,255,255,0.8)" />
      </View>
      <Text style={styles.totalAmount}>{formatCentavos(totalBalanceCentavos, currency)}</Text>

      {/* Month Cash Flow Mini Breakdown */}
      <View style={styles.cashFlowRow}>
        <View style={styles.cashFlowItem}>
          <View style={styles.cashFlowIconGreen}>
            <Ionicons name="arrow-down" size={12} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.cashFlowLabel}>This Month In</Text>
            <Text style={styles.cashFlowValue}>
              {formatCentavos(monthIncomeCentavos, currency)}
            </Text>
          </View>
        </View>

        <View style={styles.dividerVertical} />

        <View style={styles.cashFlowItem}>
          <View style={styles.cashFlowIconRed}>
            <Ionicons name="arrow-up" size={12} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.cashFlowLabel}>This Month Out</Text>
            <Text style={styles.cashFlowValue}>
              {formatCentavos(monthExpenseCentavos, currency)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  totalCard: {
    borderRadius: radii.xl,
    padding: spacing.xl,
    marginBottom: spacing.base,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  totalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  totalLabel: {
    fontSize: typography.fontSizes.xs,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: typography.fontWeights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalAmount: {
    fontSize: typography.fontSizes.display,
    fontWeight: typography.fontWeights.heavy,
    color: '#FFFFFF',
    marginVertical: spacing.xs,
  },
  cashFlowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  cashFlowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cashFlowIconGreen: {
    width: 24,
    height: 24,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  cashFlowIconRed: {
    width: 24,
    height: 24,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  cashFlowLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: typography.fontWeights.medium,
  },
  cashFlowValue: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: '#FFFFFF',
  },
  dividerVertical: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: spacing.sm,
  },
});
