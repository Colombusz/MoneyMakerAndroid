import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { SharedGoal } from '../../types';
import { Card } from '../../shared/components/ui';
import { spacing, radii, typography } from '../../shared/theme/tokens';
import { formatDisplayDate, parseDateValue } from '../../shared/utils/date';
import { formatCentavos } from '../../shared/utils/currency';
import { SharedAccount } from './sharedAccounts';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface DayItem {
  kind: string;
  label: string;
  amount: number;
  positive: boolean;
}

interface SharedCalendarViewProps {
  sharedGoals: SharedGoal[];
  sharedAccounts: SharedAccount[];
  currency?: string;
}

export const toDayKey = (value: string | number | Date): string => {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = parseDateValue(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
};

export const SharedCalendarView: React.FC<SharedCalendarViewProps> = ({
  sharedGoals,
  sharedAccounts,
  currency = 'PHP',
}) => {
  const { colors } = useTheme();
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const todayKey = toDayKey(new Date());

  const dailyData = useMemo(() => {
    const map: Record<string, DayItem[]> = {};
    const push = (dayKey: string, item: DayItem) => {
      if (!dayKey || !dayKey.startsWith(monthPrefix)) return;
      if (!map[dayKey]) map[dayKey] = [];
      map[dayKey].push(item);
    };
    for (const g of sharedGoals ?? []) {
      for (const c of g.recentContributions ?? []) {
        push(toDayKey(c.date), {
          kind: 'Goal contribution',
          label: `${g.name} - ${c.contributorName}`,
          amount: c.amountCentavos,
          positive: true,
        });
      }
    }
    for (const a of sharedAccounts ?? []) {
      for (const m of a.recentMovements ?? []) {
        push(toDayKey(m.date), {
          kind: m.type === 'deposit' ? 'Account deposit' : 'Account expense',
          label: `${a.name} - ${m.userName ?? 'Partner'}${m.notes ? ` (${m.notes})` : ''}`,
          amount: m.amountCentavos,
          positive: m.type === 'deposit',
        });
      }
    }
    return map;
  }, [sharedGoals, sharedAccounts, monthPrefix]);

  const calendarDays = useMemo(() => {
    const days: Array<{ dateKey: string; dayNum: number } | null> = [];
    const firstDow = new Date(year, month, 1).getDay();
    const dim = new Date(year, month + 1, 0).getDate();
    for (let i = 0; i < firstDow; i++) days.push(null);
    for (let d = 1; d <= dim; d++) {
      days.push({ dateKey: `${monthPrefix}-${String(d).padStart(2, '0')}`, dayNum: d });
    }
    // Pad to full weeks so the grid is always 7 columns
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [year, month, monthPrefix]);

  const weeks = useMemo(() => {
    const result: Array<Array<{ dateKey: string; dayNum: number } | null>> = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      result.push(calendarDays.slice(i, i + 7));
    }
    return result;
  }, [calendarDays]);

  const selectedItems = selectedDay ? dailyData[selectedDay] ?? [] : [];
  return (
    <View style={calStyles.wrap}>
      <View style={calStyles.monthRow}>
        <TouchableOpacity
          accessibilityLabel="Previous month"
          onPress={() => {
            setCurrentDate(new Date(year, month - 1, 1));
            setSelectedDay(null);
          }}
          style={[calStyles.navBtn, { borderColor: colors.border }]}
        >
          <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={[calStyles.monthTitle, { color: colors.text }]}>
          {monthName} {year}
        </Text>
        <TouchableOpacity
          accessibilityLabel="Next month"
          onPress={() => {
            setCurrentDate(new Date(year, month + 1, 1));
            setSelectedDay(null);
          }}
          style={[calStyles.navBtn, { borderColor: colors.border }]}
        >
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
      <Card variant="outlined" padding="sm">
        <View style={calStyles.weekRow}>
          {WEEKDAYS.map((d) => (
            <Text key={d} style={[calStyles.weekLabel, { color: colors.textMuted }]}>
              {d}
            </Text>
          ))}
        </View>
        <View style={calStyles.grid}>
          {weeks.map((week, wIdx) => (
            <View key={`week-${wIdx}`} style={calStyles.weekRow}>
              {week.map((day, dIdx) => {
                if (!day) return <View key={`empty-${wIdx}-${dIdx}`} style={calStyles.cell} />;
                const items = dailyData[day.dateKey];
                const count = items?.length ?? 0;
                const isSel = selectedDay === day.dateKey;
                const isToday = day.dateKey === todayKey;
                return (
                  <TouchableOpacity
                    key={day.dateKey}
                    onPress={() => setSelectedDay(day.dateKey)}
                    style={[
                      calStyles.cell,
                      {
                        borderColor: isSel ? colors.primary : colors.border,
                        backgroundColor: isSel ? colors.primaryLight : colors.card,
                      },
                    ]}
                  >
                    <Text style={[calStyles.dayNum, { color: isToday ? colors.primary : colors.text }]}>
                      {day.dayNum}
                    </Text>
                    {count > 0 && (
                      <View style={[calStyles.countPill, { backgroundColor: colors.primaryLight }]}>
                        <Text style={[calStyles.countText, { color: colors.primary }]}>{count}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </Card>
      {selectedDay ? (
        <Card variant="outlined" style={calStyles.detailCard}>
          <View style={calStyles.detailHeader}>
            <Text style={[calStyles.detailTitle, { color: colors.text }]}>
              {formatDisplayDate(selectedDay)}
            </Text>
            <TouchableOpacity onPress={() => setSelectedDay(null)}>
              <Text style={[calStyles.clearText, { color: colors.textMuted }]}>Clear</Text>
            </TouchableOpacity>
          </View>
          {selectedItems.length === 0 ? (
            <Text style={[calStyles.emptyText, { color: colors.textSecondary }]}>
              No shared activity on this day.
            </Text>
          ) : (
            selectedItems.map((it, i) => (
              <View key={i} style={[calStyles.itemRow, { backgroundColor: colors.surface }]}>
                <View style={calStyles.itemLeft}>
                  <Text style={[calStyles.itemKind, { color: colors.text }]}>{it.kind}</Text>
                  <Text style={[calStyles.itemLabel, { color: colors.textSecondary }]}>
                    {it.label}
                  </Text>
                </View>
                <Text style={[calStyles.itemAmount, { color: it.positive ? colors.income : colors.expense }]}>
                  {it.positive ? '+' : '-'}{formatCentavos(it.amount, currency)}
                </Text>
              </View>
            ))
          )}
        </Card>
      ) : (
        <Card variant="outlined" style={calStyles.hintCard}>
          <Text style={[calStyles.emptyText, { color: colors.textSecondary }]}>
            Select a day to inspect shared activity.
          </Text>
        </Card>
      )}
    </View>
  );
};
const calStyles = StyleSheet.create({
  wrap: { gap: spacing.md },
  monthRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  navBtn: { borderWidth: 1, borderRadius: radii.md, padding: spacing.xs },
  monthTitle: { fontSize: typography.fontSizes.base, fontWeight: typography.fontWeights.bold },
  weekRow: { flexDirection: 'row', marginBottom: 2 },
  weekLabel: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600', paddingVertical: 4 },
  grid: { flexDirection: 'column', gap: 2 },
  cell: { flex: 1, minWidth: 0, minHeight: 52, borderWidth: 1, borderRadius: radii.md, padding: 4, marginHorizontal: 2 },
  dayNum: { fontSize: typography.fontSizes.xs, fontWeight: typography.fontWeights.bold },
  countPill: { marginTop: 2, borderRadius: radii.full, paddingHorizontal: 6, paddingVertical: 1, alignSelf: 'flex-start' },
  countText: { fontSize: 10, fontWeight: '600' },
  detailCard: { gap: spacing.xs },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  detailTitle: { fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.bold },
  clearText: { fontSize: typography.fontSizes.xs },
  emptyText: { fontSize: typography.fontSizes.xs },
  hintCard: { alignItems: 'center' },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: radii.md, padding: spacing.sm, marginTop: spacing.xs },
  itemLeft: { flex: 1, marginRight: spacing.sm },
  itemKind: { fontSize: typography.fontSizes.xs, fontWeight: typography.fontWeights.semibold },
  itemLabel: { fontSize: 11, marginTop: 1 },
  itemAmount: { fontSize: typography.fontSizes.xs, fontWeight: typography.fontWeights.bold },
});
