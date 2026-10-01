import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { spacing, radii, typography } from '../../shared/theme/tokens';
import { TransactionType } from '../../types';

export interface QuickActionRowProps {
  onOpenAddTx: (type: TransactionType) => void;
  onNavigateCalendar: () => void;
}

export const QuickActionRow: React.FC<QuickActionRowProps> = ({
  onOpenAddTx,
  onNavigateCalendar,
}) => {
  const { colors } = useTheme();

  return (
    <View
      style={[styles.actionRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <TouchableOpacity
        style={styles.actionBtn}
        onPress={() => onOpenAddTx('expense')}
        activeOpacity={0.7}
      >
        <View style={[styles.actionCircle, { backgroundColor: colors.expenseLight }]}>
          <Ionicons name="remove" size={20} color={colors.expense} />
        </View>
        <Text style={[styles.actionLabel, { color: colors.text }]}>Expense</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionBtn}
        onPress={() => onOpenAddTx('income')}
        activeOpacity={0.7}
      >
        <View style={[styles.actionCircle, { backgroundColor: colors.incomeLight }]}>
          <Ionicons name="add" size={20} color={colors.income} />
        </View>
        <Text style={[styles.actionLabel, { color: colors.text }]}>Income</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionBtn}
        onPress={() => onOpenAddTx('transfer')}
        activeOpacity={0.7}
      >
        <View style={[styles.actionCircle, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="swap-horizontal" size={20} color={colors.primary} />
        </View>
        <Text style={[styles.actionLabel, { color: colors.text }]}>Transfer</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionBtn} onPress={onNavigateCalendar} activeOpacity={0.7}>
        <View style={[styles.actionCircle, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="calendar-outline" size={20} color={colors.primary} />
        </View>
        <Text style={[styles.actionLabel, { color: colors.text }]}>Calendar</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.md,
    borderRadius: radii.xl,
    borderWidth: 1,
    marginBottom: spacing.xl,
  },
  actionBtn: {
    alignItems: 'center',
    minWidth: 60,
  },
  actionCircle: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  actionLabel: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
  },
});
