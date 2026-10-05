import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Clipboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getAccounts } from '../db/accountRepo';
import { accountKeys } from '../features/accounts/keys';
import { spacing, radii, typography } from '../shared/theme/tokens';
import {
  Vacation,
  VacationChipIn,
  VacationTransactionLog,
  PastVacationSummary,
} from '../types';
import { formatCentavos } from '../shared/utils/currency';
import { vacationApi, VacationDetailResponse } from '../services/api/vacationApi';
import {
  ScreenContainer,
  Button,
  Card,
  Tabs,
  EmptyState,
} from '../shared/components/ui';
import {
  CreateVacationModal,
  JoinVacationModal,
  DepositVacationModal,
  CreateExpenseModal,
  LogExpenseModal,
  CreateChipInModal,
  ContributeChipInModal,
  RefundModal,
  ReverseLogModal,
  PastVacationSummaryModal,
} from '../features/vacation/VacationModals';

type VacationMainTab = 'active' | 'past';

export const VacationScreen: React.FC = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const currency = user?.currency || 'PHP';

  const [activeTab, setActiveTab] = useState<VacationMainTab>('active');
  const [activeVacations, setActiveVacations] = useState<Vacation[]>([]);
  const [pastVacations, setPastVacations] = useState<Vacation[]>([]);
  const [selectedVacationId, setSelectedVacationId] = useState<string | null>(null);
  const [vacationDetails, setVacationDetails] = useState<VacationDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPastSummary, setSelectedPastSummary] = useState<PastVacationSummary | null>(null);

  // Modals state
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [logExpenseOpen, setLogExpenseOpen] = useState(false);
  const [createChipInOpen, setCreateChipInOpen] = useState(false);
  const [activeChipIn, setActiveChipIn] = useState<VacationChipIn | null>(null);
  const [refundOpen, setRefundOpen] = useState(false);
  const [activeLogToReverse, setActiveLogToReverse] = useState<VacationTransactionLog | null>(null);

  // Local accounts
  const accountsQuery = useQuery({
    queryKey: accountKeys.list(user?.id ?? ''),
    queryFn: () => getAccounts(user?.id as string),
    enabled: Boolean(user?.id),
  });
  const accounts = accountsQuery.data?.accounts || [];

  const isMaster = useMemo(() => {
    if (!vacationDetails || !user) return false;
    const m = vacationDetails.vacation.members.find((member) => member.userId === user.id);
    return m?.role === 'master';
  }, [vacationDetails, user]);

  const loadVacationDetails = useCallback(async (id: string) => {
    try {
      const details = await vacationApi.getVacationById(id);
      setVacationDetails(details);
    } catch (err: any) {
      console.log('Failed to load vacation details:', err.message);
    }
  }, []);

  const loadAllVacations = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [activeList, pastList] = await Promise.all([
        vacationApi.getActiveVacations().catch(() => []),
        vacationApi.getPastVacations().catch(() => []),
      ]);
      setActiveVacations(activeList);
      setPastVacations(pastList);

      if (activeList.length > 0) {
        const targetId =
          selectedVacationId && activeList.some((v) => v._id === selectedVacationId)
            ? selectedVacationId
            : activeList[0]._id;
        setSelectedVacationId(targetId);
        await loadVacationDetails(targetId);
      } else {
        setSelectedVacationId(null);
        setVacationDetails(null);
      }
    } finally {
      setLoading(false);
    }
  }, [user, selectedVacationId, loadVacationDetails]);

  useEffect(() => {
    loadAllVacations();
  }, [user, loadAllVacations]);

  const handleCopyCode = (code: string) => {
    Clipboard.setString(code);
    Alert.alert('Code Copied', `Vacation join code ${code} copied to clipboard!`);
  };

  const handleCreateVacation = async (name: string, description?: string) => {
    try {
      const v = await vacationApi.createVacation(name, description);
      await loadAllVacations();
      setSelectedVacationId(v._id);
      await loadVacationDetails(v._id);
      return true;
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create vacation');
      return false;
    }
  };

  const handleJoinVacation = async (code: string) => {
    try {
      const v = await vacationApi.joinVacation(code);
      await loadAllVacations();
      setSelectedVacationId(v._id);
      await loadVacationDetails(v._id);
      return true;
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to join vacation');
      return false;
    }
  };

  const handleDeposit = async (amountCentavos: number, fromAccountId: string, notes?: string) => {
    if (!selectedVacationId) return false;
    try {
      await vacationApi.deposit(selectedVacationId, amountCentavos, fromAccountId, notes);
      await loadVacationDetails(selectedVacationId);
      accountsQuery.refetch();
      return true;
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to deposit');
      return false;
    }
  };

  const handleCreateExpense = async (
    title: string,
    amountCentavos: number,
    category?: string,
    notes?: string,
    deductionSource?: 'pool' | 'chip_in',
    chipInId?: string
  ) => {
    if (!selectedVacationId) return false;
    try {
      await vacationApi.createExpenseItem(
        selectedVacationId,
        title,
        amountCentavos,
        category,
        notes,
        deductionSource,
        chipInId
      );
      await loadVacationDetails(selectedVacationId);
      return true;
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to record expense');
      return false;
    }
  };

  const handleLogExpense = async (
    title: string,
    amountCentavos: number,
    fromAccountId: string,
    category?: string,
    notes?: string
  ) => {
    if (!selectedVacationId) return false;
    try {
      await vacationApi.logPersonalExpense(selectedVacationId, title, amountCentavos, fromAccountId, category, notes);
      await loadVacationDetails(selectedVacationId);
      queryClient.invalidateQueries({ queryKey: accountKeys.all });
      return true;
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to log personal expense');
      return false;
    }
  };

  const handleCreateChipIn = async (
    title: string,
    targetAmountCentavos?: number,
    description?: string
  ) => {
    if (!selectedVacationId) return false;
    try {
      await vacationApi.createChipIn(selectedVacationId, title, targetAmountCentavos, description);
      await loadVacationDetails(selectedVacationId);
      return true;
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create chip-in');
      return false;
    }
  };

  const handleContributeChipIn = async (
    chipInId: string,
    amountCentavos: number,
    fromAccountId: string,
    notes?: string
  ) => {
    if (!selectedVacationId) return false;
    try {
      await vacationApi.contributeChipIn(
        selectedVacationId,
        chipInId,
        amountCentavos,
        fromAccountId,
        notes
      );
      await loadVacationDetails(selectedVacationId);
      accountsQuery.refetch();
      return true;
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to contribute to chip-in');
      return false;
    }
  };

  const handleRefund = async (
    memberUserId: string,
    amountCentavos: number,
    notes?: string,
    refundSource?: 'pool' | 'chip_in',
    chipInId?: string | null
  ) => {
    if (!selectedVacationId) return false;
    try {
      await vacationApi.refund(
        selectedVacationId,
        memberUserId,
        amountCentavos,
        undefined,
        notes,
        refundSource,
        chipInId
      );
      await loadVacationDetails(selectedVacationId);
      accountsQuery.refetch();
      return true;
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to refund');
      return false;
    }
  };

  const handleReverseLog = async (logId: string, reason: string) => {
    if (!selectedVacationId) return false;
    try {
      await vacationApi.reverseLog(selectedVacationId, logId, reason);
      await loadVacationDetails(selectedVacationId);
      accountsQuery.refetch();
      return true;
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to reverse entry');
      return false;
    }
  };

  const handleConclude = async () => {
    if (!selectedVacationId || !vacationDetails) return;
    const hasUnrefundedChipIn = vacationDetails.chipIns?.some((c) => {
      const remaining =
        c.totalCollectedCentavos - (c.totalSpentCentavos || 0) - (c.totalRefundedCentavos || 0);
      return remaining > 0;
    });

    if (vacationDetails.vacation.balanceCentavos !== 0 || hasUnrefundedChipIn) {
      Alert.alert(
        'Non-Zero Balance',
        `Cannot conclude vacation while pool balance (${formatCentavos(
          vacationDetails.vacation.balanceCentavos,
          currency
        )}) or chip-in items have remaining funds. Please refund remaining funds or record expenses first.`
      );
      return;
    }

    Alert.alert(
      'Conclude Vacation',
      'Are you sure you want to conclude this vacation? It will become read-only and move to Past Vacations.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Conclude',
          style: 'destructive',
          onPress: async () => {
            try {
              await vacationApi.conclude(selectedVacationId);
              await loadAllVacations();
              setActiveTab('past');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to conclude vacation');
            }
          },
        },
      ]
    );
  };

  const handleOpenPastSummary = async (vacationId: string) => {
    try {
      const summary = await vacationApi.getPastVacationSummary(vacationId);
      setSelectedPastSummary(summary);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load past vacation summary');
    }
  };

  return (
    <ScreenContainer refreshing={loading} onRefresh={loadAllVacations}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Vacation Mode</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Group money pool, real-time balances & fair refunds
          </Text>
        </View>

        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={[styles.headerActionBtn, { borderColor: colors.border }]}
            onPress={() => setJoinOpen(true)}
          >
            <Ionicons name="enter-outline" size={16} color={colors.primary} />
            <Text style={[styles.headerActionText, { color: colors.primary }]}>Join</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerActionBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
            onPress={() => setCreateOpen(true)}
          >
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={[styles.headerActionText, { color: '#fff' }]}>New</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <Tabs<VacationMainTab>
        tabs={[
          { id: 'active', label: `Active (${activeVacations.length})` },
          { id: 'past', label: `Past (${pastVacations.length})` },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Active Vacations Tab */}
      {activeTab === 'active' && (
        <View style={styles.tabContent}>
          {activeVacations.length === 0 ? (
            <View>
              <EmptyState
                title="No Active Vacation"
                description="Start a vacation to pool money with friends or join an existing trip using a 6-character code."
              />
              <View style={styles.emptyActionRow}>
                <Button variant="outline" label="Join with Code" onPress={() => setJoinOpen(true)} style={styles.emptyBtn} />
                <Button variant="primary" label="Start Vacation" onPress={() => setCreateOpen(true)} style={styles.emptyBtn} />
              </View>
            </View>
          ) : vacationDetails ? (
            <View style={styles.vacationContainer}>
              {/* Vacation Pool Banner Card */}
              <Card style={[styles.poolCard, { backgroundColor: colors.primary }]}>
                <View style={styles.poolTopRow}>
                  <View>
                    <View style={styles.roleBadgeRow}>
                      <Text style={styles.roleBadgeText}>
                        {isMaster ? 'Vacation Master' : 'Member'}
                      </Text>
                    </View>
                    <Text style={styles.vacationName}>{vacationDetails.vacation.name}</Text>
                    {vacationDetails.vacation.description ? (
                      <Text style={styles.vacationDesc}>{vacationDetails.vacation.description}</Text>
                    ) : null}
                  </View>

                  <TouchableOpacity
                    style={styles.codePill}
                    onPress={() => handleCopyCode(vacationDetails.vacation.joinCode)}
                  >
                    <Text style={styles.codePillText}>Code: {vacationDetails.vacation.joinCode}</Text>
                    <Ionicons name="copy-outline" size={14} color="#fff" />
                  </TouchableOpacity>
                </View>

                <View style={styles.poolBalanceBlock}>
                  <Text style={styles.poolBalanceLabel}>Vacation Account Balance</Text>
                  <Text style={styles.poolBalanceVal}>
                    {formatCentavos(vacationDetails.vacation.balanceCentavos, currency)}
                  </Text>
                </View>

                {/* Primary Card Actions */}
                <View style={styles.poolActionsRow}>
                  <TouchableOpacity
                    style={styles.depositWhiteBtn}
                    onPress={() => setDepositOpen(true)}
                  >
                    <Ionicons name="arrow-down" size={16} color={colors.primary} />
                    <Text style={[styles.depositWhiteBtnText, { color: colors.primary }]}>
                      Deposit Funds
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.logPersonalBtn}
                    onPress={() => setLogExpenseOpen(true)}
                  >
                    <Ionicons name="receipt-outline" size={16} color="#fff" />
                    <Text style={styles.logPersonalBtnText}>Log Expense</Text>
                  </TouchableOpacity>

                  {isMaster && (
                    <TouchableOpacity style={styles.concludeBtn} onPress={handleConclude}>
                      <Ionicons name="checkmark-done" size={16} color="#fff" />
                      <Text style={styles.concludeBtnText}>Conclude</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </Card>

              {/* Master Controls Section */}
              {isMaster && (
                <View style={[styles.masterSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.sectionSubtitle, { color: colors.primary }]}>
                    Master Controls
                  </Text>
                  <View style={styles.masterActionsRow}>
                    <TouchableOpacity
                      style={[styles.masterBtn, { borderColor: colors.border }]}
                      onPress={() => setExpenseOpen(true)}
                    >
                      <Ionicons name="cart-outline" size={16} color={colors.expense} />
                      <Text style={[styles.masterBtnText, { color: colors.text }]}>Spend Pool</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.masterBtn, { borderColor: colors.border }]}
                      onPress={() => setCreateChipInOpen(true)}
                    >
                      <Ionicons name="gift-outline" size={16} color={colors.primary} />
                      <Text style={[styles.masterBtnText, { color: colors.text }]}>Request Chip-in</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.masterBtn, { borderColor: colors.border }]}
                      onPress={() => setRefundOpen(true)}
                    >
                      <Ionicons name="refresh-outline" size={16} color={colors.income} />
                      <Text style={[styles.masterBtnText, { color: colors.text }]}>Refund Funds</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Members List */}
              <View style={[styles.membersCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Members ({vacationDetails.vacation.members.length})
                  </Text>
                  <Text style={[styles.helperSub, { color: colors.textMuted }]}>
                    Share code to invite
                  </Text>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.membersScroll}>
                  {vacationDetails.vacation.members.map((m) => (
                    <View
                      key={m.userId}
                      style={[styles.memberChip, { backgroundColor: colors.card, borderColor: colors.border }]}
                    >
                      <View style={[styles.memberAvatar, { backgroundColor: colors.primary }]}>
                        <Text style={styles.memberAvatarText}>{m.name.charAt(0).toUpperCase()}</Text>
                      </View>
                      <Text style={[styles.memberName, { color: colors.text }]}>{m.name}</Text>
                      <Text style={[styles.memberRole, { color: m.role === 'master' ? colors.primary : colors.textMuted }]}>
                        {m.role === 'master' ? 'Master' : 'Member'}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              </View>

              {/* Chip-In Items Section */}
              <View style={styles.sectionBox}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Chip-in Items ({vacationDetails.chipIns.length})
                  </Text>
                </View>

                {vacationDetails.chipIns.length === 0 ? (
                  <Text style={[styles.emptyHintText, { color: colors.textMuted }]}>
                    No active chip-in items.
                  </Text>
                ) : (
                  vacationDetails.chipIns.map((ci) => {
                    const spent = ci.totalSpentCentavos || 0;
                    const avail = Math.max(0, ci.totalCollectedCentavos - spent);
                    return (
                      <View
                        key={ci._id}
                        style={[styles.chipInItemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                      >
                        <View style={styles.chipInTop}>
                          <Text style={[styles.chipInTitle, { color: colors.text }]}>{ci.title}</Text>
                          <Text style={[styles.chipInCollected, { color: colors.primary }]}>
                            {formatCentavos(ci.totalCollectedCentavos, currency)}
                            {ci.targetAmountCentavos ? ` / ${formatCentavos(ci.targetAmountCentavos, currency)}` : ''}
                          </Text>
                        </View>
                        {spent > 0 && (
                          <Text style={{ fontSize: 11, color: colors.primary, marginTop: 2, fontWeight: '600' }}>
                            Available: {formatCentavos(avail, currency)}
                          </Text>
                        )}
                        {ci.description ? (
                          <Text style={[styles.chipInDesc, { color: colors.textSecondary }]}>
                            {ci.description}
                          </Text>
                        ) : null}
                        <Button
                          size="sm"
                          variant="primary"
                          onPress={() => setActiveChipIn(ci)}
                          style={{ marginTop: spacing.xs }}
                        >
                          Contribute
                        </Button>
                      </View>
                    );
                  })
                )}
              </View>

              {/* Append-Only Transparent Transaction Log */}
              <View style={styles.sectionBox}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Transparent Transaction Log ({vacationDetails.logs.length})
                  </Text>
                </View>

                <View style={[styles.logList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {vacationDetails.logs.length === 0 ? (
                    <Text style={[styles.emptyHintText, { color: colors.textMuted }]}>
                      No transactions recorded yet.
                    </Text>
                  ) : (
                    vacationDetails.logs.map((log) => {
                      const isExpense = log.type === 'expense';
                      const isDeposit = log.type === 'deposit' || log.type === 'chip_in';
                      const isRefund = log.type === 'refund';

                      return (
                        <View
                          key={log._id}
                          style={[styles.logRow, { borderBottomColor: colors.border }]}
                        >
                          <View style={styles.logLeft}>
                            <Text style={[styles.logDesc, { color: colors.text }]}>{log.description}</Text>
                            <Text style={[styles.logMeta, { color: colors.textMuted }]}>
                              By {log.userName} &bull; {new Date(log.date || log.createdAt).toLocaleDateString()}
                            </Text>
                          </View>

                          <View style={styles.logRight}>
                            <Text
                              style={[
                                styles.logAmount,
                                {
                                  color: isDeposit
                                    ? colors.income
                                    : isExpense
                                    ? colors.expense
                                    : isRefund
                                    ? colors.primary
                                    : colors.text,
                                },
                              ]}
                            >
                              {isExpense && '-'}
                              {isDeposit && '+'}
                              {formatCentavos(log.amountCentavos, currency)}
                            </Text>

                            {/* Reversal trigger for Master */}
                            {isMaster && log.type !== 'reversal' && log.type !== 'concluded' && (
                              <TouchableOpacity
                                onPress={() => setActiveLogToReverse(log)}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              >
                                <Ionicons name="arrow-undo-outline" size={14} color={colors.textMuted} />
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              </View>
            </View>
          ) : null}
        </View>
      )}

      {/* Past Vacations Tab (Strict Privacy Isolation) */}
      {activeTab === 'past' && (
        <View style={styles.tabContent}>
          {/* Privacy Isolation Alert Notice */}
          <View style={[styles.pastPrivacyNotice, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="shield-checkmark" size={18} color={colors.primary} />
            <Text style={[styles.pastPrivacyNoticeText, { color: colors.textSecondary }]}>
              Privacy Mode: Concluded vacations display only your own logged expenses and chip-in records.
            </Text>
          </View>

          {pastVacations.length === 0 ? (
            <EmptyState
              title="No Past Vacations"
              description="Concluded vacations will appear here in read-only mode."
            />
          ) : (
            pastVacations.map((v) => (
              <TouchableOpacity
                key={v._id}
                onPress={() => handleOpenPastSummary(v._id)}
                activeOpacity={0.7}
              >
                <Card style={[styles.pastCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.pastCardTop}>
                    <Text style={[styles.pastCardTitle, { color: colors.text }]}>{v.name}</Text>
                    <View style={styles.concludedBadge}>
                      <Text style={styles.concludedBadgeText}>Concluded</Text>
                    </View>
                  </View>
                  {v.description ? (
                    <Text style={[styles.pastCardDesc, { color: colors.textSecondary }]}>
                      {v.description}
                    </Text>
                  ) : null}
                  <View style={styles.pastCardBottom}>
                    <Text style={[styles.pastCardMembers, { color: colors.textMuted }]}>
                      {v.members.length} members &bull; Code: {v.joinCode}
                    </Text>
                    <View style={styles.viewRecordsBtn}>
                      <Text style={[styles.viewRecordsText, { color: colors.primary }]}>View Records</Text>
                      <Ionicons name="chevron-forward" size={14} color={colors.primary} />
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            ))
          )}
        </View>
      )}

      {/* Modals */}
      <CreateVacationModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreateVacation}
      />

      <JoinVacationModal
        isOpen={joinOpen}
        onClose={() => setJoinOpen(false)}
        onSubmit={handleJoinVacation}
      />

      {vacationDetails && (
        <>
          <DepositVacationModal
            isOpen={depositOpen}
            onClose={() => setDepositOpen(false)}
            accounts={accounts}
            currency={currency}
            onSubmit={handleDeposit}
          />

          <CreateExpenseModal
            isOpen={expenseOpen}
            onClose={() => setExpenseOpen(false)}
            vacationBalanceCentavos={vacationDetails.vacation.balanceCentavos}
            chipIns={vacationDetails.chipIns}
            currency={currency}
            onSubmit={handleCreateExpense}
          />

          <LogExpenseModal
            isOpen={logExpenseOpen}
            onClose={() => setLogExpenseOpen(false)}
            accounts={accounts}
            currency={currency}
            onSubmit={handleLogExpense}
          />

          <CreateChipInModal
            isOpen={createChipInOpen}
            onClose={() => setCreateChipInOpen(false)}
            onSubmit={handleCreateChipIn}
          />

          <ContributeChipInModal
            isOpen={Boolean(activeChipIn)}
            onClose={() => setActiveChipIn(null)}
            chipIn={activeChipIn}
            accounts={accounts}
            currency={currency}
            onSubmit={handleContributeChipIn}
          />

          <RefundModal
            isOpen={refundOpen}
            onClose={() => setRefundOpen(false)}
            vacation={vacationDetails.vacation}
            chipIns={vacationDetails.chipIns}
            currency={currency}
            onSubmit={handleRefund}
          />

          <ReverseLogModal
            isOpen={Boolean(activeLogToReverse)}
            onClose={() => setActiveLogToReverse(null)}
            log={activeLogToReverse}
            currency={currency}
            onSubmit={handleReverseLog}
          />
        </>
      )}

      {/* Past Vacation Summary Modal */}
      <PastVacationSummaryModal
        isOpen={Boolean(selectedPastSummary)}
        onClose={() => setSelectedPastSummary(null)}
        summary={selectedPastSummary}
        currency={currency}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerTitle: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
  },
  headerSubtitle: {
    fontSize: typography.fontSizes.xs,
    marginTop: 2,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  headerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  headerActionText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
  },
  tabContent: {
    marginTop: spacing.md,
    gap: spacing.md,
  },
  emptyActionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  emptyBtn: {
    flex: 1,
  },
  vacationContainer: {
    gap: spacing.md,
  },
  poolCard: {
    padding: spacing.md,
    borderRadius: radii.xl,
  },
  poolTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  roleBadgeRow: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.sm,
    marginBottom: 4,
  },
  roleBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  vacationName: {
    color: '#fff',
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
  },
  vacationDesc: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: typography.fontSizes.xs,
    marginTop: 2,
  },
  codePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.md,
  },
  codePillText: {
    color: '#fff',
    fontSize: typography.fontSizes.xs,
    fontWeight: 'bold',
  },
  poolBalanceBlock: {
    marginTop: spacing.md,
  },
  poolBalanceLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: typography.fontSizes.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  poolBalanceVal: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  poolActionsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    paddingTop: spacing.sm,
  },
  depositWhiteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#fff',
    paddingVertical: 8,
    borderRadius: radii.md,
  },
  depositWhiteBtnText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: 'bold',
  },
  logPersonalBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingVertical: 8,
    borderRadius: radii.md,
  },
  logPersonalBtnText: {
    color: '#fff',
    fontSize: typography.fontSizes.xs,
    fontWeight: 'bold',
  },
  concludeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(244,63,94,0.8)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radii.md,
  },
  concludeBtnText: {
    color: '#fff',
    fontSize: typography.fontSizes.xs,
    fontWeight: 'bold',
  },
  masterSection: {
    padding: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  sectionSubtitle: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  masterActionsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  masterBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  masterBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  membersCard: {
    padding: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: typography.fontSizes.xs,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  helperSub: {
    fontSize: 10,
  },
  membersScroll: {
    flexDirection: 'row',
  },
  memberChip: {
    flexDirection: 'column',
    alignItems: 'center',
    padding: spacing.xs,
    borderRadius: radii.md,
    borderWidth: 1,
    marginRight: spacing.xs,
    minWidth: 64,
  },
  memberAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  memberAvatarText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  memberName: {
    fontSize: 11,
    fontWeight: '600',
  },
  memberRole: {
    fontSize: 9,
    textTransform: 'capitalize',
  },
  sectionBox: {
    gap: spacing.xs,
  },
  emptyHintText: {
    fontSize: typography.fontSizes.xs,
    fontStyle: 'italic',
    paddingVertical: 4,
  },
  chipInItemCard: {
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    marginBottom: spacing.xs,
  },
  chipInTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chipInTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: 'bold',
  },
  chipInCollected: {
    fontSize: typography.fontSizes.xs,
    fontWeight: 'bold',
  },
  chipInDesc: {
    fontSize: typography.fontSizes.xs,
    marginTop: 2,
  },
  logList: {
    borderRadius: radii.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  logRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.sm,
    borderBottomWidth: 1,
  },
  logLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  logDesc: {
    fontSize: typography.fontSizes.xs,
    fontWeight: '600',
  },
  logMeta: {
    fontSize: 10,
    marginTop: 1,
  },
  logRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  logAmount: {
    fontSize: typography.fontSizes.xs,
    fontWeight: 'bold',
  },
  pastPrivacyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    marginBottom: spacing.xs,
  },
  pastPrivacyNoticeText: {
    fontSize: typography.fontSizes.xs,
    flex: 1,
    fontWeight: '500',
  },
  pastCard: {
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  pastCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pastCardTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: 'bold',
  },
  concludedBadge: {
    backgroundColor: 'rgba(16,185,129,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  concludedBadgeText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: 'bold',
  },
  pastCardDesc: {
    fontSize: typography.fontSizes.xs,
    marginTop: 4,
  },
  pastCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
  },
  pastCardMembers: {
    fontSize: 10,
  },
  viewRecordsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewRecordsText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
});
