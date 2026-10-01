import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { Goal, Account } from '../../types';
import { Card, ProgressBar, Pill, IconButton } from '../../shared/components/ui';
import { spacing, radii, typography } from '../../shared/theme/tokens';
import { formatCentavos } from '../../shared/utils/currency';

export interface GoalCardProps {
  goal: Goal;
  linkedAccount?: Account | null;
  currency?: string;
  onContribute: (goal: Goal) => void;
  onDelete: (goal: Goal) => void;
}

export const GoalCard: React.FC<GoalCardProps> = ({
  goal,
  linkedAccount,
  currency = 'PHP',
  onContribute,
  onDelete,
}) => {
  const { colors } = useTheme();

  const totalSaved = goal.totalSavedCentavos || 0;
  const target = goal.targetAmountCentavos;
  const percentage = Math.min(100, Math.round((totalSaved / target) * 100)) || 0;
  const remaining = Math.max(0, target - totalSaved);
  const isCompleted = percentage >= 100;

  return (
    <Card variant="primary" style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.name, { color: colors.text }]}>{goal.name}</Text>
          {linkedAccount ? (
            <View style={styles.linkedRow}>
              <Ionicons name="link-outline" size={14} color={colors.textMuted} />
              <Text style={[styles.linkedText, { color: colors.textMuted }]}>
                {linkedAccount.name}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.headerRight}>
          <Text
            style={[styles.percentage, { color: isCompleted ? colors.income : colors.primary }]}
          >
            {percentage}%
          </Text>
          <IconButton
            name="trash-outline"
            size={18}
            color={colors.expense}
            variant="ghost"
            onPress={() => onDelete(goal)}
          />
        </View>
      </View>

      <View style={styles.progressWrap}>
        <ProgressBar
          percentage={percentage}
          color={isCompleted ? colors.income : colors.primary}
          height={10}
        />
        <View style={styles.labelsRow}>
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            Saved: {formatCentavos(totalSaved, currency)}
          </Text>
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            Target: {formatCentavos(target, currency)}
          </Text>
        </View>
      </View>

      <View
        style={[styles.statsBox, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={styles.statRow}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Remaining</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {formatCentavos(remaining, currency)}
          </Text>
        </View>

        {goal.targetDate ? (
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Target Date</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {new Date(goal.targetDate).toLocaleDateString()}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.actionsRow}>
        <Pill
          variant={isCompleted ? 'success' : 'primary'}
          onPress={() => onContribute(goal)}
          disabled={isCompleted}
          style={styles.actionPill}
        >
          {isCompleted ? 'Goal Completed 🎉' : 'Record Contribution'}
        </Pill>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  name: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
  },
  linkedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  linkedText: {
    fontSize: typography.fontSizes.xs,
  },
  percentage: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.heavy,
  },
  progressWrap: {
    marginVertical: spacing.sm,
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  metaText: {
    fontSize: typography.fontSizes.xs,
  },
  statsBox: {
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.sm,
    marginVertical: spacing.xs,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  statLabel: {
    fontSize: typography.fontSizes.xs,
  },
  statValue: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
  },
  actionsRow: {
    marginTop: spacing.sm,
  },
  actionPill: {
    width: '100%',
  },
});
