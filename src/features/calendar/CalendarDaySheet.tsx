import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { spacing, radii, typography } from '../../shared/theme/tokens';
import { formatCentavos } from '../../shared/utils/currency';
import { getTransactionLabel } from '../../shared/utils/transactionLabel';
import { Transaction, Category } from '../../types';
import { MobileProjectedOccurrence } from '../../services/recurringGenerator';
import { BottomSheet, Button } from '../../shared/components/ui';

export interface CalendarDaySheetProps {
  isOpen: boolean;
  dateKey: string | null;
  transactions: Transaction[];
  occurrences: MobileProjectedOccurrence[];
  categories: Category[];
  /** Existing free-text note for this day, if any. */
  dayNote?: string;
  currency?: string;
  onClose: () => void;
  /** Opens the add form pre-set to this day and the given type. */
  onAddTransaction: (type: 'expense' | 'income') => void;
  /** Persists the note text for this day. */
  onSaveDayNote: (notes: string) => void;
}

export const CalendarDaySheet: React.FC<CalendarDaySheetProps> = ({
  isOpen,
  dateKey,
  transactions,
  occurrences,
  categories,
  dayNote,
  currency = 'PHP',
  onClose,
  onAddTransaction,
  onSaveDayNote,
}) => {
  const { colors } = useTheme();
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  // Local draft so typing does not round-trip to the database on every keystroke;
  // it is re-seeded whenever a different day is opened.
  const [noteDraft, setNoteDraft] = useState('');
  useEffect(() => {
    if (isOpen) setNoteDraft(dayNote ?? '');
  }, [isOpen, dayNote, dateKey]);

  const displayDate = dateKey
    ? new Date(dateKey).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    : '';

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={`Breakdown: ${displayDate}`}>
      <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
        {transactions.length === 0 && occurrences.length === 0 ? (
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No activity recorded or scheduled for this date.
            </Text>
          </View>
        ) : null}

        {/* Add entry for the selected day */}
        <View style={styles.addRow}>
          <TouchableOpacity
            onPress={() => onAddTransaction('expense')}
            style={[styles.addBtn, { backgroundColor: colors.expenseLight }]}
            accessibilityRole="button"
            accessibilityLabel="Add expense on this day"
          >
            <Ionicons name="arrow-up-circle" size={18} color={colors.expense} />
            <Text style={[styles.addBtnText, { color: colors.expense }]}>Add Expense</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onAddTransaction('income')}
            style={[styles.addBtn, { backgroundColor: colors.incomeLight }]}
            accessibilityRole="button"
            accessibilityLabel="Add income on this day"
          >
            <Ionicons name="arrow-down-circle" size={18} color={colors.income} />
            <Text style={[styles.addBtnText, { color: colors.income }]}>Add Income</Text>
          </TouchableOpacity>
        </View>

        {/* Free-text note for the day, independent of any transaction */}
        <View style={styles.noteBlock}>
          <View style={styles.noteHeader}>
            <Ionicons name="document-text-outline" size={15} color={colors.textSecondary} />
            <Text style={[styles.noteLabel, { color: colors.textSecondary }]}>
              Day Note
            </Text>
          </View>

          <TextInput
            style={[
              styles.noteInput,
              {
                borderColor: colors.border,
                backgroundColor: colors.background,
                color: colors.text,
              },
            ]}
            placeholder="e.g. Paid the electric bill, cashed the payday advance"
            placeholderTextColor={colors.textMuted}
            value={noteDraft}
            onChangeText={setNoteDraft}
            multiline
            textAlignVertical="top"
          />

          <View style={styles.noteActions}>
            <Button
              variant="outline"
              size="sm"
              label="Clear"
              onPress={() => {
                setNoteDraft('');
                onSaveDayNote('');
              }}
              style={styles.noteBtn}
            />
            <Button
              size="sm"
              label="Save Note"
              onPress={() => onSaveDayNote(noteDraft)}
              style={styles.noteBtn}
            />
          </View>
        </View>

        {/* Transactions */}
        {transactions.map((tx) => {
          const isIncome = tx.type === 'income';
          const isTransfer = tx.type === 'transfer';
          const cat = tx.categoryId ? categoryMap.get(tx.categoryId) : null;
          const { title: txTitle, detail } = getTransactionLabel(tx, cat ?? undefined);
          const sign = isIncome ? '+' : isTransfer ? '' : '-';
          const amountColor = isIncome
            ? colors.income
            : isTransfer
              ? colors.transfer
              : colors.expense;

          return (
            <View
              key={tx.id}
              style={[styles.itemRow, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={styles.itemLeft}>
                <Ionicons
                  name={
                    isIncome
                      ? 'arrow-down-circle'
                      : isTransfer
                        ? 'swap-horizontal'
                        : 'arrow-up-circle'
                  }
                  size={24}
                  color={amountColor}
                />
                <View style={styles.itemText}>
                  <Text style={[styles.itemTitle, { color: colors.text }]}>
                    {txTitle}
                  </Text>
                  {detail ? (
                    <Text style={[styles.itemNotes, { color: colors.textSecondary }]}>
                      {detail}
                    </Text>
                  ) : null}
                </View>
              </View>
              <Text style={[styles.itemAmount, { color: amountColor }]}>
                {sign}
                {formatCentavos(tx.amountCentavos, currency)}
              </Text>
            </View>
          );
        })}

        {/* Projected bills */}
        {occurrences.map((occ, idx) => (
          <View
            key={`${occ.ruleId}-${idx}`}
            style={[
              styles.itemRow,
              { backgroundColor: colors.primaryLight, borderColor: colors.primary },
            ]}
          >
            <View style={styles.itemLeft}>
              <Ionicons name="repeat-outline" size={24} color={colors.primary} />
              <View style={styles.itemText}>
                <Text style={[styles.itemTitle, { color: colors.text }]}>
                  {occ.notes || 'Recurring Bill'}
                </Text>
                <Text style={[styles.itemNotes, { color: colors.textSecondary }]}>
                  {occ.status.toUpperCase()}
                </Text>
              </View>
            </View>
            <Text style={[styles.itemAmount, { color: colors.primary }]}>
              {formatCentavos(occ.amountCentavos, currency)}
            </Text>
          </View>
        ))}
      </ScrollView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  content: {
    maxHeight: 400,
    paddingVertical: spacing.xs,
  },
  empty: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.fontSizes.sm,
  },
  addRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  addBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.lg,
  },
  addBtnText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
  },
  noteBlock: {
    marginBottom: spacing.md,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  noteLabel: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    textTransform: 'uppercase',
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.fontSizes.sm,
    minHeight: 72,
  },
  noteActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  noteBtn: {
    paddingHorizontal: spacing.md,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.md,
  },
  itemText: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  itemTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
  },
  itemNotes: {
    fontSize: typography.fontSizes.xs,
    marginTop: 2,
  },
  itemAmount: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
  },
});
