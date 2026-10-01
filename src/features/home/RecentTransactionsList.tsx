import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { spacing, radii, typography } from '../../shared/theme/tokens';
import { formatCentavos } from '../../shared/utils/currency';
import { formatDisplayDate } from '../../shared/utils/date';
import { getTransactionLabel } from '../../shared/utils/transactionLabel';
import { Category, Transaction } from '../../types';
import { EmptyState } from '../../shared/components/ui';

export interface RecentTransactionsListProps {
  transactions: Transaction[];
  categories: Category[];
  currency?: string;
  onOpenAddTx: () => void;
}

export const RecentTransactionsList: React.FC<RecentTransactionsListProps> = ({
  transactions,
  categories,
  currency = 'PHP',
  onOpenAddTx,
}) => {
  const { colors } = useTheme();
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  if (transactions.length === 0) {
    return (
      <EmptyState
        title="No Activity Yet"
        description="Record your first income, expense, or transfer."
        actionLabel="Add Transaction"
        onAction={onOpenAddTx}
        iconName="receipt-outline"
      />
    );
  }

  return (
    <View
      style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      {transactions.map((tx, idx) => {
        const isIncome = tx.type === 'income';
        const isTransfer = tx.type === 'transfer';
        const category = tx.categoryId ? categoryMap.get(tx.categoryId) : undefined;
        const { title, detail } = isTransfer
          ? { title: 'Account Transfer', detail: null }
          : getTransactionLabel(tx, category);
        const sign = isIncome ? '+' : isTransfer ? '' : '-';
        const amountColor = isIncome
          ? colors.income
          : isTransfer
            ? colors.transfer
            : colors.expense;

        return (
          <View
            key={tx.id}
            style={[
              styles.item,
              idx < transactions.length - 1 && {
                borderBottomColor: colors.border,
                borderBottomWidth: StyleSheet.hairlineWidth,
              },
            ]}
          >
            <View
              style={[
                styles.iconBox,
                {
                  backgroundColor: isIncome
                    ? colors.incomeLight
                    : isTransfer
                      ? colors.primaryLight
                      : colors.expenseLight,
                },
              ]}
            >
              <Ionicons
                name={isIncome ? 'arrow-down' : isTransfer ? 'swap-horizontal' : 'arrow-up'}
                size={18}
                color={amountColor}
              />
            </View>

            <View style={styles.itemInfo}>
              <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>
                {title}
              </Text>
              <Text style={[styles.itemDate, { color: colors.textMuted }]} numberOfLines={1}>
                {formatDisplayDate(tx.date)}
                {detail ? ` • ${detail}` : ''}
              </Text>
            </View>

            <Text style={[styles.amountText, { color: amountColor }]}>
              {sign}
              {formatCentavos(tx.amountCentavos, currency)}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  listCard: {
    borderWidth: 1,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.base,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  itemInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  itemTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
  },
  itemDate: {
    fontSize: typography.fontSizes.xs,
    marginTop: 2,
  },
  amountText: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
  },
});
