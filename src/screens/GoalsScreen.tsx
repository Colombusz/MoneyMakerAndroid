import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Goal } from '../types';
import { ScreenContainer, Button, EmptyState, Tabs } from '../shared/components/ui';
import { spacing, typography } from '../shared/theme/tokens';
import { useGoalsScreenData } from '../features/goals/useGoalsScreenData';
import { GoalCard } from '../features/goals/GoalCard';
import { AddGoalModal } from '../features/goals/AddGoalModal';
import { ContributeGoalModal } from '../features/goals/ContributeGoalModal';

type GoalTab = 'ongoing' | 'finished';

export const GoalsScreen: React.FC = () => {
  const { colors } = useTheme();
  const { user } = useAuth();

  const {
    goals,
    accounts,
    loading,
    loadData,
    handleCreateGoal,
    handleContribute,
    handleDeleteGoal,
  } = useGoalsScreenData(user?.id, user?.currency);

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [activeGoal, setActiveGoal] = useState<Goal | null>(null);
  const [activeTab, setActiveTab] = useState<GoalTab>('ongoing');

  const accountMap = new Map(accounts.map((a) => [a.id, a]));

  const totalSaved = (goal: Goal) => goal.totalSavedCentavos || 0;
  const percentage = (goal: Goal) => Math.min(100, Math.round((totalSaved(goal) / goal.targetAmountCentavos) * 100)) || 0;
  const isCompleted = (goal: Goal) => percentage(goal) >= 100;

  const filteredGoals = goals.filter((g) => (activeTab === 'finished') === isCompleted(g));

  return (
    <ScreenContainer refreshing={loading} onRefresh={loadData}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Savings Goals</Text>
        <Button size="sm" label="+ New Goal" onPress={() => setAddModalVisible(true)} />
      </View>

      {/* Tabs */}
      <Tabs<GoalTab>
        tabs={[
          { id: 'ongoing', label: 'Ongoing' },
          { id: 'finished', label: 'Finished' },
        ]}
        activeTab={activeTab}
        onChange={(tab) => setActiveTab(tab)}
      />

      {/* Goals Content */}
      {filteredGoals.length === 0 ? (
        <EmptyState
          title={activeTab === 'ongoing' ? 'No Ongoing Goals' : 'No Finished Goals'}
          description={
            activeTab === 'ongoing'
              ? 'Create savings targets like Emergency Fund, Travel, or New Gadget.'
              : 'Complete a goal to see it here!'
          }
          actionLabel="Create Goal"
          onAction={() => setAddModalVisible(true)}
          iconName={activeTab === 'ongoing' ? 'flag-outline' : 'trophy-outline'}
        />
      ) : (
        filteredGoals.map((goal) => (
          <GoalCard
            key={goal.id}
            goal={goal}
            linkedAccount={goal.linkedAccountId ? accountMap.get(goal.linkedAccountId) : null}
            currency={user?.currency}
            onContribute={(g) => setActiveGoal(g)}
            onDelete={handleDeleteGoal}
          />
        ))
      )}

      {/* Modals */}
      <AddGoalModal
        isOpen={addModalVisible}
        accounts={accounts}
        onClose={() => setAddModalVisible(false)}
        onSubmit={handleCreateGoal}
      />

      <ContributeGoalModal
        isOpen={!!activeGoal}
        goal={activeGoal}
        accounts={accounts}
        onClose={() => setActiveGoal(null)}
        onSubmit={(amount, accountId, notes) =>
          handleContribute(activeGoal!.id, activeGoal!.name, amount, accountId, notes)
        }
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  headerTitle: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
  },
});
