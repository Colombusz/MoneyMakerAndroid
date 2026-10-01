import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { formatCentavos } from '../../shared/utils/currency';
import { formatDisplayDate } from '../../shared/utils/date';
import { getTransactionLabel } from '../../shared/utils/transactionLabel';
import { spacing, radii, typography } from '../../shared/theme/tokens';
import { Category, Transaction } from '../../types';

export interface TransactionCardProps {
  transaction: Transaction;
  category?: Category;
  currency?: string;
  onLongPress: (tx: Transaction) => void;
}

export const TransactionCard: React.FC<TransactionCardProps> = ({
  transaction,
  category,
  currency,
  onLongPress,
}) => {
  const { colors } = useTheme();

  const isIncome = transaction.type === 'income';
  const isTransfer = transaction.type === 'transfer';
  const sign = isIncome ? '+' : isTransfer ? '' : '-';
  const amountColor = isIncome ? colors.income : isTransfer ? colors.transfer : colors.expense;

  // Shares the resolver with the dashboard and the web, so the same record is
  // named identically everywhere.
  const { title, detail } = isTransfer
    ? { title: 'Transfer', detail: null }
    : getTransactionLabel(transaction, category);

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onLongPress={() => onLongPress(transaction)}
      style={[styles.txCard, { backgroundColor: colors.card, borderColor: colors.border }]}
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

      <View style={styles.cardInfo}>
        <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[styles.cardDate, { color: colors.textMuted }]} numberOfLines={1}>
          {formatDisplayDate(transaction.date)}
          {detail ? ` • ${detail}` : ''}
        </Text>
      </View>

      <View style={styles.amountCol}>
        <Text style={[styles.cardAmount, { color: amountColor }]}>
          {sign}
          {formatCentavos(transaction.amountCentavos, currency)}
        </Text>
        <Text style={[styles.typeBadge, { color: colors.textMuted }]}>
          {transaction.type.toUpperCase()}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radii.xl,
    borderWidth: 1,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
  },
  cardDate: {
    fontSize: typography.fontSizes.xs,
    marginTop: 2,
  },
  amountCol: {
    alignItems: 'flex-end',
  },
  cardAmount: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
  },
  typeBadge: {
    fontSize: typography.fontSizes.xs,
    marginTop: 2,
  },
});
