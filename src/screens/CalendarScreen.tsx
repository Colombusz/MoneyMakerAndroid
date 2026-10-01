import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useCalendarScreenData } from '../features/calendar/useCalendarScreenData';
import { CalendarDayCell, NOTE_COLOR } from '../features/calendar/CalendarDayCell';
import { CalendarDaySheet } from '../features/calendar/CalendarDaySheet';
import { MonthKpiBar } from '../features/calendar/MonthKpiBar';
import { CategoryPieChart } from '../features/calendar/CategoryPieChart';
import { AddTransactionModal } from '../features/transactions';
import { useDayNotes } from '../features/calendar/useDayNotes';
import { dateKeyToUtcMs } from '../shared/utils/date';
import { spacing, radii, typography } from '../shared/theme/tokens';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const CalendarScreen: React.FC = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const {
    currentDate,
    summary,
    occurrences,
    categories,
    monthTransactions,
    daysGrid,
    handlePrevMonth,
    handleNextMonth,
    handleToday,
  } = useCalendarScreenData(user?.id);

  // Day notes are read for the same month window the summary uses.
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const monthStartMs = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0)).getTime();
  const monthEndMs = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)).getTime();
  const { getNoteForDay, hasNoteForDay, upsertNote } = useDayNotes(user?.id, monthStartMs, monthEndMs);

  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  // Non-null while the add form is open for a specific day + type.
  const [addTarget, setAddTarget] = useState<{
    dateKey: string;
    type: 'expense' | 'income';
  } | null>(null);

  const todayKey = useMemo(() => new Date().toISOString().split('T')[0], []);

  const weeks = useMemo(() => {
    const padded = [...daysGrid];
    while (padded.length % 7 !== 0) {
      padded.push({ dayNumber: null, dateKey: null });
    }
    const result: Array<Array<{ dayNumber: number | null; dateKey: string | null }>> = [];
    for (let i = 0; i < padded.length; i += 7) {
      result.push(padded.slice(i, i + 7));
    }
    return result;
  }, [daysGrid]);

  const handleDayPress = (dateKey: string | null) => {
    if (!dateKey) return;
    setSelectedDayKey(dateKey);
    setSheetVisible(true);
  };

  const dayTransactions = useMemo(
    () =>
      selectedDayKey
        ? monthTransactions.filter(
            (t) => new Date(t.date).toISOString().split('T')[0] === selectedDayKey
          )
        : [],
    [selectedDayKey, monthTransactions]
  );

  const dayOccurrences = useMemo(
    () => (selectedDayKey ? occurrences.filter((o) => o.date === selectedDayKey) : []),
    [selectedDayKey, occurrences]
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      {/* Month Navigation Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity onPress={handlePrevMonth} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity onPress={handleToday} style={styles.monthHeader}>
          <Text style={[styles.monthTitle, { color: colors.text }]}>
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleNextMonth} style={styles.navBtn}>
          <Ionicons name="chevron-forward" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <MonthKpiBar summary={summary} currency={user?.currency} />

        {/* Weekday Row */}
        <View style={styles.weekRow}>
          {WEEKDAYS.map((day) => (
            <Text key={day} style={[styles.weekDayText, { color: colors.textMuted }]}>
              {day}
            </Text>
          ))}
        </View>

        {/* Calendar Grid */}
        <View
          style={[
            styles.calendarGrid,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          {weeks.map((week, wIdx) => (
            <View key={`week-${wIdx}`} style={styles.gridRow}>
              {week.map((item, dIdx) => {
                const dayStats = item.dateKey ? summary?.dailyBreakdown[item.dateKey] : undefined;
                const hasIncome = (dayStats?.incomeCentavos || 0) > 0;
                const hasExpense = (dayStats?.expenseCentavos || 0) > 0;
                const hasBill = occurrences.some(
                  (o) => o.date === item.dateKey && o.status === 'pending'
                );
                const isToday = item.dateKey === todayKey;

                return (
                  <CalendarDayCell
                    key={item.dateKey || `empty-${wIdx}-${dIdx}`}
                    dayNumber={item.dayNumber}
                    dateKey={item.dateKey}
                    isToday={isToday}
                    hasIncome={hasIncome}
                    hasExpense={hasExpense}
                    hasBill={hasBill}
                    hasNote={hasNoteForDay(item.dateKey)}
                    onPress={handleDayPress}
                  />
                );
              })}
            </View>
          ))}
        </View>

        {/* Expense insight lives in the pie chart; the old category list was a
            duplicate of its legend, so it is no longer rendered. */}
        <CategoryPieChart summary={summary} categories={categories} currency={user?.currency} />

        {/* Legend so the grid markers are self-explanatory */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.income }]} />
            <Text style={[styles.legendText, { color: colors.textMuted }]}>Income</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.expense }]} />
            <Text style={[styles.legendText, { color: colors.textMuted }]}>Expense</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.legendText, { color: colors.textMuted }]}>Bill</Text>
          </View>
          <View style={styles.legendItem}>
            <Ionicons name="document-text" size={12} color={NOTE_COLOR} />
            <Text style={[styles.legendText, { color: colors.textMuted }]}>Note</Text>
          </View>
        </View>
      </ScrollView>

      <CalendarDaySheet
        isOpen={sheetVisible}
        dateKey={selectedDayKey}
        transactions={dayTransactions}
        occurrences={dayOccurrences}
        categories={categories}
        dayNote={selectedDayKey ? getNoteForDay(selectedDayKey)?.notes : undefined}
        currency={user?.currency}
        onClose={() => setSheetVisible(false)}
        onSaveDayNote={(notes) => {
          if (selectedDayKey) upsertNote(selectedDayKey, notes);
        }}
        onAddTransaction={(type) => {
          if (!selectedDayKey) return;
          setSheetVisible(false);
          setAddTarget({ dateKey: selectedDayKey, type });
        }}
      />

      {/*
        Mounted only while a day + type is chosen, and keyed on both, so the form
        always opens with fresh state for that exact day instead of inheriting
        whatever the previous entry left behind.
      */}
      {addTarget && (
        <AddTransactionModal
          key={`${addTarget.dateKey}-${addTarget.type}`}
          visible
          defaultType={addTarget.type}
          initialDate={dateKeyToUtcMs(addTarget.dateKey)}
          onClose={() => setAddTarget(null)}
          // The modal already invalidates the transaction namespace on save,
          // which refreshes this month's summary, the grid and the day sheet.
          onSuccess={() => setAddTarget(null)}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  navBtn: {
    padding: spacing.xs,
  },
  monthHeader: {
    paddingVertical: spacing.xs,
  },
  monthTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
  },
  scroll: {
    padding: spacing.md,
    paddingBottom: spacing['2xl'],
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: radii.full,
  },
  legendText: {
    fontSize: typography.fontSizes.xs,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
  },
  calendarGrid: {
    borderRadius: radii.xl,
    borderWidth: 1,
    overflow: 'hidden',
    padding: spacing.xs,
    marginBottom: spacing.lg,
  },
  gridRow: {
    flexDirection: 'row',
  },
});
