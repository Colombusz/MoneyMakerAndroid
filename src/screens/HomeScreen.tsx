import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { TransactionType, Account } from '../types';
import { ScreenContainer, Button } from '../shared/components/ui';
import { spacing, radii, typography } from '../shared/theme/tokens';
import { SyncStatusBadge } from '../components/SyncStatusBadge';
import { AddTransactionModal } from '../components/AddTransactionModal';
import { AddAccountModal } from '../components/AddAccountModal';
import { CashQuickSpendModal } from '../features/accounts';
import { AuthModal } from '../components/AuthModal';
import { ProfileModal } from '../components/ProfileModal';
import { useHomeScreenData } from '../features/home/useHomeScreenData';
import { deleteAccount } from '../db/accountRepo';
import { invalidateForChange } from '../query';
import { useQueryClient } from '@tanstack/react-query';
import { NetWorthCard } from '../features/home/NetWorthCard';
import { QuickActionRow } from '../features/home/QuickActionRow';
import { AccountsCarousel } from '../features/home/AccountsCarousel';
import { RecentTransactionsList } from '../features/home/RecentTransactionsList';

export const HomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors, isDark, toggleTheme } = useTheme();
  const { user, syncNow } = useAuth();
  const queryClient = useQueryClient();

  const {
    accounts,
    totalBalance,
    recentTransactions,
    categories,
    monthNet,
    refreshing,
    loadDashboardData,
    onRefresh,
  } = useHomeScreenData(user?.id, syncNow);

  const [txModalVisible, setTxModalVisible] = useState(false);
  const [txModalType, setTxModalType] = useState<TransactionType>('expense');
  const [accModalVisible, setAccModalVisible] = useState(false);
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [cashQuickSpendAccount, setCashQuickSpendAccount] = useState<Account | null>(null);

  const openTxModal = (type: TransactionType) => {
    setTxModalType(type);
    setTxModalVisible(true);
  };

  const handleDeleteAccount = (acc: Account) => {
    Alert.alert(
      'Delete Account',
      `Delete "${acc.name}"? This cannot be undone. Existing transactions stay in your history.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount(acc.id);
              // Account balances are derived from transactions, and goal progress
              // is derived from linked balances, so both namespaces refresh.
              invalidateForChange(queryClient, { entityTypes: ['accounts'] });
              await loadDashboardData();
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to delete account');
            }
          },
        },
      ]
    );
  };

  return (
    <ScreenContainer refreshing={refreshing} onRefresh={onRefresh}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Top Header */}
      <View style={styles.topBar}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setProfileModalVisible(true)}
          style={styles.avatarButton}
        >
          <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {user?.name ? user.name.charAt(0).toUpperCase() : 'M'}
            </Text>
          </View>
          <View>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>Hello,</Text>
            <Text style={[styles.userName, { color: colors.text }]}>
              {user?.name || 'My Wallet'}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.topActions}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Stocks')}
            style={[
              styles.stocksHeaderBtn,
              {
                backgroundColor: 'rgba(16,185,129,0.15)',
                borderColor: 'rgba(16,185,129,0.3)',
              }
            ]}
          >
            <Ionicons name="trending-up" size={14} color={colors.income} />
            <Text style={[styles.stocksHeaderBtnText, { color: colors.income }]}>Stocks</Text>
          </TouchableOpacity>
          <SyncStatusBadge />
          <TouchableOpacity
            onPress={toggleTheme}
            style={[styles.iconBtn, { borderColor: colors.border }]}
          >
            <Ionicons name={isDark ? 'sunny' : 'moon'} size={18} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Net Worth Card */}
      <NetWorthCard
        totalBalanceCentavos={totalBalance}
        monthIncomeCentavos={monthNet.income}
        monthExpenseCentavos={monthNet.expense}
        currency={user?.currency}
      />

      {/* Quick Action Floating Bar */}
      <QuickActionRow
        onOpenAddTx={openTxModal}
        onNavigateCalendar={() => navigation.navigate('Calendar')}
      />

      {/* US Stocks Monitoring & Prediction Highlight Card */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => navigation.navigate('Stocks')}
        style={[
          styles.stocksHighlightCard,
          {
            backgroundColor: colors.card,
            borderColor: 'rgba(16,185,129,0.35)',
          }
        ]}
      >
        <View style={styles.stocksCardTop}>
          <View style={styles.stocksIconTitleRow}>
            <View style={[styles.stocksIconBox, { backgroundColor: colors.income }]}>
              <Ionicons name="trending-up" size={20} color="#ffffff" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.stocksBadgeRow}>
                <Text style={[styles.stocksCardTitle, { color: colors.text }]}>
                  US Stocks & Predictions
                </Text>
                <View style={[styles.stocksLivePill, { backgroundColor: 'rgba(16,185,129,0.15)' }]}>
                  <Text style={[styles.stocksLivePillText, { color: colors.income }]}>LIVE AI</Text>
                </View>
              </View>
              <Text style={[styles.stocksCardSub, { color: colors.textSecondary }]}>
                Alpha Vantage Telemetry • Multi-Factor Forecasting
              </Text>
            </View>
          </View>
        </View>

        {/* Ticker Snapshot Chips */}
        <View style={styles.stocksTickerRow}>
          <View style={[styles.tickerPill, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.tickerSymbol, { color: colors.text }]}>AAPL</Text>
            <Text style={[styles.tickerPrice, { color: colors.income }]}>$333.69 (+1.0%)</Text>
          </View>
          <View style={[styles.tickerPill, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.tickerSymbol, { color: colors.text }]}>NVDA</Text>
            <Text style={[styles.tickerPrice, { color: colors.income }]}>$137.45 (+1.9%)</Text>
          </View>
          <View style={[styles.tickerPill, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.tickerSymbol, { color: colors.text }]}>TSLA</Text>
            <Text style={[styles.tickerPrice, { color: colors.income }]}>$265.12 (+2.4%)</Text>
          </View>
        </View>

        {/* Action Footer */}
        <View style={[styles.stocksActionRow, { borderTopColor: colors.border }]}>
          <Text style={[styles.stocksActionHint, { color: colors.textMuted }]}>
            Tap to view live quotes & predictions
          </Text>
          <View style={[styles.stocksActionBtn, { backgroundColor: colors.income }]}>
            <Text style={styles.stocksActionBtnText}>Explore</Text>
            <Ionicons name="arrow-forward" size={12} color="#ffffff" />
          </View>
        </View>
      </TouchableOpacity>

      {/* Accounts Section */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Accounts</Text>
        <Button
          size="sm"
          variant="outline"
          label="+ Add"
          onPress={() => setAccModalVisible(true)}
        />
      </View>
      <AccountsCarousel
        accounts={accounts}
        currency={user?.currency}
        onPressCashAccount={(acc) => setCashQuickSpendAccount(acc)}
        onDeleteAccount={handleDeleteAccount}
      />

      {/* Recent Activity Section */}
      <View style={[styles.sectionHeader, { marginTop: spacing.xl }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Activity</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Transactions')}>
          <Text style={[styles.seeAllText, { color: colors.primary }]}>View All</Text>
        </TouchableOpacity>
      </View>

      <RecentTransactionsList
        transactions={recentTransactions}
        categories={categories}
        currency={user?.currency}
        onOpenAddTx={() => openTxModal('expense')}
      />

      {/* Modals */}
      <CashQuickSpendModal
        isOpen={Boolean(cashQuickSpendAccount)}
        onClose={() => setCashQuickSpendAccount(null)}
        onSuccess={loadDashboardData}
        account={cashQuickSpendAccount}
        categories={categories}
        currency={user?.currency}
      />

      <AddTransactionModal
        visible={txModalVisible}
        onClose={() => setTxModalVisible(false)}
        onSuccess={loadDashboardData}
        defaultType={txModalType}
      />

      <AddAccountModal
        visible={accModalVisible}
        onClose={() => setAccModalVisible(false)}
        onSuccess={loadDashboardData}
      />

      <ProfileModal
        visible={profileModalVisible}
        onClose={() => setProfileModalVisible(false)}
        onOpenAuth={() => setAuthModalVisible(true)}
      />

      <AuthModal
        visible={authModalVisible}
        onClose={() => {
          setAuthModalVisible(false);
          loadDashboardData();
        }}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  userInfo: {},
  avatarButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  avatarText: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
  },
  greeting: {
    fontSize: typography.fontSizes.xs,
  },
  userName: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
  },
  seeAllText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
  },
  stocksHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  stocksHeaderBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  stocksHighlightCard: {
    borderRadius: radii.xl,
    borderWidth: 1.5,
    padding: spacing.base,
    marginBottom: spacing.xl,
  },
  stocksCardTop: {
    marginBottom: spacing.md,
  },
  stocksIconTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stocksIconBox: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stocksBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  stocksCardTitle: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
  },
  stocksLivePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  stocksLivePillText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  stocksCardSub: {
    fontSize: 11,
    marginTop: 2,
  },
  stocksTickerRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  tickerPill: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  tickerSymbol: {
    fontSize: 10,
    fontWeight: '700',
  },
  tickerPrice: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 1,
  },
  stocksActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
  },
  stocksActionHint: {
    fontSize: 11,
  },
  stocksActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.full,
  },
  stocksActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
});
