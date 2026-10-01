import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { SharedGoal } from '../types';
import { ScreenContainer, Button, EmptyState, Tabs, TextInput } from '../shared/components/ui';
import { spacing, typography } from '../shared/theme/tokens';
import { usePartnerScreenData } from '../features/partner/usePartnerScreenData';
import { PartnerStatusCard } from '../features/partner/PartnerStatusCard';
import { SharedGoalCard } from '../features/partner/SharedGoalCard';
import { CreateSharedGoalModal } from '../features/partner/CreateSharedGoalModal';
import { ContributeSharedGoalModal } from '../features/partner/ContributeSharedGoalModal';
import { SharedAccountCard } from '../features/partner/SharedAccountCard';
import {
  DepositSharedAccountModal,
  SharedAccountMovementMode,
} from '../features/partner/DepositSharedAccountModal';
import { SharedCalendarView } from '../features/partner/SharedCalendarView';
import { SharedAccount } from '../features/partner/sharedAccounts';

type PartnerTab = 'accounts' | 'goals' | 'finished' | 'calendar';

export const PartnerScreen: React.FC = () => {
  const { colors } = useTheme();
  const { user, syncNow, syncStatus } = useAuth();
  const [syncing, setSyncing] = useState(false);

  const {
    partnerConnected,
    partnerName,
    inviteCode,
    inputCode,
    setInputCode,
    sharedGoals,
    sharedAccounts,
    sharedAccountsError,
    isSharedAccountsPending,
    accounts,
    loading,
    loadPartnerData,
    loadSharedAccounts,
    handleGenerateInvite,
    handleAcceptInvite,
    handleUnlink,
    handleCreateSharedGoal,
    handleCreateSharedAccount,
    handleContribute,
    handleDepositToSharedAccount,
    handleSharedAccountExpense,
  } = usePartnerScreenData(user?.id);

  const [createGoalOpen, setCreateGoalOpen] = useState(false);
  const [activeGoal, setActiveGoal] = useState<SharedGoal | null>(null);
  const [tab, setTab] = useState<PartnerTab>('accounts');
  const [newAcctName, setNewAcctName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [activeSharedAccount, setActiveSharedAccount] = useState<SharedAccount | null>(null);
  const [movementMode, setMovementMode] = useState<SharedAccountMovementMode>('deposit');

  const activeGoals = useMemo(
    () =>
      sharedGoals.filter(
        (g) => (g.percentage ?? 0) < 100 && !(g as unknown as { isArchived?: boolean }).isArchived
      ),
    [sharedGoals]
  );
  const finishedGoals = useMemo(
    () =>
      sharedGoals.filter(
        (g) => (g.percentage ?? 0) >= 100 || (g as unknown as { isArchived?: boolean }).isArchived
      ),
    [sharedGoals]
  );

  const handleCreateAccount = async () => {
    setIsCreating(true);
    const ok = await handleCreateSharedAccount(newAcctName);
    setIsCreating(false);
    if (ok) setNewAcctName('');
  };

  const openMovement = (account: SharedAccount, mode: SharedAccountMovementMode) => {
    setActiveSharedAccount(account);
    setMovementMode(mode);
  };

  const handleSyncPress = async () => {
    setSyncing(true);
    try {
      await syncNow();
      await loadPartnerData();
    } finally {
      setSyncing(false);
    }
  };

  return (
    <ScreenContainer refreshing={loading} onRefresh={loadPartnerData}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Partner</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Shared goals & collaboration
          </Text>
        </View>
        <Button
          variant="outline"
          size="sm"
          loading={syncing || syncStatus === 'syncing'}
          onPress={handleSyncPress}
          style={styles.syncBtn}
        >
          <View style={styles.syncBtnContent}>
            <Ionicons name="sync-outline" size={16} color={colors.primary} />
            <Text style={[styles.syncBtnText, { color: colors.primary }]}>Sync</Text>
          </View>
        </Button>
      </View>

      {/* Partner Status Card */}
      <PartnerStatusCard
        isConnected={partnerConnected}
        partnerName={partnerName}
        inviteCode={inviteCode}
        inputCode={inputCode}
        loading={loading}
        onInputChange={setInputCode}
        onGenerateInvite={handleGenerateInvite}
        onAcceptInvite={handleAcceptInvite}
        onUnlink={handleUnlink}
      />

      {/* Shared Goals Header */}
      {partnerConnected && (
        <Tabs<PartnerTab>
          tabs={[
            { id: 'accounts', label: 'Accounts' },
            { id: 'goals', label: 'Goals' },
            { id: 'finished', label: 'Finished' },
            { id: 'calendar', label: 'Calendar' },
          ]}
          activeTab={tab}
          onChange={setTab}
        />
      )}

      {/* Tab Content */}
      {!partnerConnected ? (
        <EmptyState
          title="Connect with a Partner"
          description="Link accounts to collaborate on shared savings targets."
          iconName="people-outline"
        />
      ) : tab === 'accounts' ? (
        <View>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Shared Accounts
            </Text>
          </View>
          <View style={styles.createRow}>
            <View style={styles.createInput}>
              <TextInput
                value={newAcctName}
                onChangeText={setNewAcctName}
                placeholder="New shared account name"
              />
            </View>
            <Button
              size="sm"
              label="Create"
              onPress={handleCreateAccount}
              loading={isCreating}
              style={styles.createBtn}
            />
          </View>
          {isSharedAccountsPending ? (
            <EmptyState
              title="Shared accounts coming soon"
              description="The shared-accounts backend is not deployed yet (parallel task). Your shared goals keep working — please check back after the backend lands."
              iconName="wallet-outline"
            />
          ) : sharedAccountsError ? (
            <EmptyState
              title="Could not load shared accounts"
              description={sharedAccountsError}
              actionLabel="Retry"
              onAction={() => loadSharedAccounts()}
              iconName="alert-circle-outline"
            />
          ) : sharedAccounts.length === 0 ? (
            <EmptyState
              title="No shared accounts yet"
              description="Create a shared account to pool money with your partner for bills, groceries and more."
              iconName="wallet-outline"
            />
          ) : (
            sharedAccounts.map((a) => (
              <SharedAccountCard
                key={a.id}
                account={a}
                onDeposit={(acct) => openMovement(acct, 'deposit')}
                onExpense={(acct) => openMovement(acct, 'expense')}
              />
            ))
          )}
        </View>
      ) : tab === 'goals' ? (
        <View>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Shared Savings Goals
            </Text>
            <Button size="sm" label="+ New Goal" onPress={() => setCreateGoalOpen(true)} />
          </View>
          {activeGoals.length === 0 ? (
            <EmptyState
              title="No active shared goals"
              description="Create a shared savings goal to begin tracking your financial journey together."
              actionLabel="Create Goal"
              onAction={() => setCreateGoalOpen(true)}
              iconName="flag-outline"
            />
          ) : (
            activeGoals.map((goal) => (
              <SharedGoalCard
                key={goal.id}
                goal={goal}
                userId={user?.id}
                onContribute={(g) => setActiveGoal(g)}
              />
            ))
          )}
        </View>
      ) : tab === 'finished' ? (
        <View>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Finished Goals</Text>
          </View>
          {finishedGoals.length === 0 ? (
            <EmptyState
              title="Nothing finished yet"
              description="Goals at 100% or archived will appear here with a Completed badge."
              iconName="checkmark-circle-outline"
            />
          ) : (
            finishedGoals.map((goal) => (
              <SharedGoalCard
                key={goal.id}
                goal={goal}
                userId={user?.id}
                onContribute={(g) => setActiveGoal(g)}
                hideContribute
              />
            ))
          )}
        </View>
      ) : (
        <View>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Shared Calendar</Text>
          </View>
          <SharedCalendarView sharedGoals={sharedGoals} sharedAccounts={sharedAccounts} />
        </View>
      )}

      {/* Modals */}
      <CreateSharedGoalModal
        isOpen={createGoalOpen}
        onClose={() => setCreateGoalOpen(false)}
        onSubmit={handleCreateSharedGoal}
      />

      <ContributeSharedGoalModal
        isOpen={!!activeGoal}
        goal={activeGoal}
        accounts={accounts}
        onClose={() => setActiveGoal(null)}
        onSubmit={handleContribute}
      />

      <DepositSharedAccountModal
        isOpen={!!activeSharedAccount}
        account={activeSharedAccount}
        mode={movementMode}
        accounts={accounts}
        onClose={() => setActiveSharedAccount(null)}
        onSubmit={handleDepositToSharedAccount}
        onSubmitExpense={handleSharedAccountExpense}
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
  headerSubtitle: {
    fontSize: typography.fontSizes.xs,
    marginTop: 2,
  },
  syncBtn: {
    paddingHorizontal: spacing.md,
    minHeight: 38,
  },
  syncBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  syncBtnText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
  },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  createInput: {
    flex: 1,
  },
  createBtn: {
    minWidth: 92,
  },
});
