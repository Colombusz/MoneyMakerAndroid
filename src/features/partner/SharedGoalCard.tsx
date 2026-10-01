import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { SharedGoal } from '../../types';
import { Card, ProgressBar, Button, Pill } from '../../shared/components/ui';
import { spacing, radii, typography } from '../../shared/theme/tokens';
import { formatCentavos } from '../../shared/utils/currency';
import { formatDisplayDate } from '../../shared/utils/date';

export interface SharedGoalCardProps {
  goal: SharedGoal;
  userId?: string;
  currency?: string;
  onContribute: (goal: SharedGoal) => void;
  hideContribute?: boolean;
}

export const SharedGoalCard: React.FC<SharedGoalCardProps> = ({
  goal,
  userId,
  currency = 'PHP',
  onContribute,
  hideContribute = false,
}) => {
  const { colors } = useTheme();

  const totalSaved = goal.totalSavedCentavos || 0;
  const target = goal.targetAmountCentavos;
  const percentage = Math.min(100, Math.round((totalSaved / target) * 100)) || 0;
  const isComplete =
    (goal.percentage ?? percentage) >= 100 || (goal as unknown as { isArchived?: boolean }).isArchived === true;

  return (
    <Card variant="primary" style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.goalName, { color: colors.text }]}>{goal.name}</Text>
          <Text style={[styles.targetText, { color: colors.textSecondary }]}>
            Target: {formatCentavos(target, currency)}
            {goal.targetDate ? ` • Due ${formatDisplayDate(goal.targetDate)}` : ''}
          </Text>
        </View>
        <Text style={[styles.percentage, { color: colors.primary }]}>{percentage}%</Text>
      </View>

      <View style={styles.progressWrap}>
        <ProgressBar percentage={percentage} color={colors.primary} height={10} />
        <View style={styles.progressLabels}>
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            Saved: {formatCentavos(totalSaved, currency)}
          </Text>
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            Remaining:{' '}
            {formatCentavos(goal.remainingCentavos || Math.max(0, target - totalSaved), currency)}
          </Text>
        </View>
      </View>

      {/* Member Breakdown */}
      {goal.members && goal.members.length > 0 && (
        <View
          style={[
            styles.membersContainer,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.membersTitle, { color: colors.textMuted }]}>
            CONTRIBUTION BREAKDOWN
          </Text>
          <View style={styles.memberGrid}>
            {goal.members.map((m) => {
              const isSelf = m.userId === userId;
              return (
                <View key={m.userId} style={styles.memberItem}>
                  <Text
                    style={[styles.memberName, { color: colors.textSecondary }]}
                    numberOfLines={1}
                  >
                    {isSelf ? 'You' : m.name}
                  </Text>
                  <Text style={[styles.memberAmount, { color: colors.text }]}>
                    {formatCentavos(m.totalContributedCentavos, currency)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {isComplete ? (
        <View style={styles.completedRow}>
          <Pill variant="success" size="sm">Completed</Pill>
        </View>
      ) : hideContribute ? null : (
        <Button
          label="Contribute"
          size="sm"
          onPress={() => onContribute(goal)}
          style={styles.contributeBtn}
        />
      )}
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
    marginBottom: spacing.sm,
  },
  headerLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  goalName: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
  },
  targetText: {
    fontSize: typography.fontSizes.xs,
    marginTop: 2,
  },
  percentage: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.heavy,
  },
  progressWrap: {
    marginVertical: spacing.xs,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  metaText: {
    fontSize: typography.fontSizes.xs,
  },
  membersContainer: {
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  membersTitle: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  memberGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  memberItem: {
    flex: 1,
  },
  memberName: {
    fontSize: typography.fontSizes.xs,
  },
  memberAmount: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    marginTop: 1,
  },
  contributeBtn: {
    marginTop: spacing.sm,
  },
  completedRow: {
    marginTop: spacing.sm,
    alignItems: 'flex-start',
  },
});
