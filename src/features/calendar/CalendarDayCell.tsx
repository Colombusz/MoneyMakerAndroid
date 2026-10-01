import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { spacing, radii, typography } from '../../shared/theme/tokens';

export interface CalendarDayCellProps {
  dayNumber: number | null;
  dateKey: string | null;
  isToday: boolean;
  hasIncome: boolean;
  hasExpense: boolean;
  hasBill: boolean;
  /** This day has a diary note, so the month grid can be scanned at a glance. */
  hasNote: boolean;
  onPress: (dateKey: string | null) => void;
}

export const CalendarDayCell: React.FC<CalendarDayCellProps> = ({
  dayNumber,
  dateKey,
  isToday,
  hasIncome,
  hasExpense,
  hasBill,
  hasNote,
  onPress,
}) => {
  const { colors } = useTheme();

  if (!dayNumber) {
    return <View style={styles.emptyCell} />;
  }

  return (
    <TouchableOpacity
      style={[
        styles.cell,
        { backgroundColor: colors.card, borderColor: colors.border },
        isToday && { borderColor: colors.primary, borderWidth: 2 },
      ]}
      onPress={() => onPress(dateKey)}
      activeOpacity={0.7}
      accessibilityLabel={`Day ${dayNumber}${hasNote ? ', has a note' : ''}`}
    >
      <View style={styles.headerRow}>
        <Text
          style={[
            styles.dayNumber,
            { color: isToday ? colors.primary : colors.text },
            isToday && { fontWeight: '800' },
          ]}
        >
          {dayNumber}
        </Text>

        {/* Diary note marker, kept apart from the money dots below */}
        {hasNote && (
          <Ionicons name="document-text" size={11} color={NOTE_COLOR} />
        )}
      </View>

      {/* Indicator dots */}
      <View style={styles.dotsRow}>
        {hasIncome && <View style={[styles.dot, { backgroundColor: colors.income }]} />}
        {hasExpense && <View style={[styles.dot, { backgroundColor: colors.expense }]} />}
        {hasBill && <View style={[styles.dot, { backgroundColor: colors.primary }]} />}
      </View>
    </TouchableOpacity>
  );
};

// Matches the amber used for the day-note editor on the web, so the same entry
// reads the same way on both clients. Exported so the calendar legend matches.
export const NOTE_COLOR = '#D97706';

const styles = StyleSheet.create({
  emptyCell: {
    flex: 1,
    height: 48,
    margin: 2,
  },
  cell: {
    flex: 1,
    height: 48,
    margin: 2,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  dayNumber: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 2,
    alignItems: 'center',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: radii.full,
  },
});
