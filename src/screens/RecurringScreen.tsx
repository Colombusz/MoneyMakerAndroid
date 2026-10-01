import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import {
  useRecurringScreenData,
  OccurrenceCard,
  RuleCard,
  AddBillModal,
  PayBillModal,
} from '../features/recurring';
import { MobileProjectedOccurrence } from '../db/recurringRepo';
import { spacing, radii, typography } from '../shared/theme/tokens';

export const RecurringScreen: React.FC = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const {
    rules,
    projected,
    accounts,
    categories,
    handleCreateRule,
    handlePay,
    handleSkip,
    handleDeleteRule,
  } = useRecurringScreenData(user?.id);

  const [modalVisible, setModalVisible] = useState(false);
  const [payingOccurrence, setPayingOccurrence] = useState<MobileProjectedOccurrence | null>(null);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.text }]}>Recurring Bills</Text>
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          style={[styles.addBtn, { backgroundColor: colors.primaryLight }]}
        >
          <Ionicons name="add" size={20} color={colors.primary} />
          <Text style={[styles.addBtnText, { color: colors.primary }]}>New Bill</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Upcoming Occurrences */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Upcoming Occurrences</Text>
        {projected.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Ionicons name="calendar-outline" size={32} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No upcoming bills projected. Add a recurring rule below.
            </Text>
          </View>
        ) : (
          projected.map((occ) => (
            <OccurrenceCard
              key={`${occ.ruleId}_${occ.date}`}
              occurrence={occ}
              currency={user?.currency}
              onPay={(occ) => setPayingOccurrence(occ)}
              onSkip={handleSkip}
            />
          ))
        )}

        {/* Configured Rules */}
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: spacing.xl }]}>
          Configured Rules
        </Text>
        {rules.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textMuted, fontStyle: 'italic' }]}>
            No recurring rules configured yet.
          </Text>
        ) : (
          rules.map((r) => (
            <RuleCard
              key={r.id}
              rule={r}
              currency={user?.currency}
              onLongPress={handleDeleteRule}
            />
          ))
        )}
      </ScrollView>

      {/* Add Bill Modal */}
      <AddBillModal
        isOpen={modalVisible}
        onClose={() => setModalVisible(false)}
        accounts={accounts}
        categories={categories}
        currency={user?.currency}
        onSave={handleCreateRule}
      />

      {/* Pay Bill Modal — choose which account the payment is drawn from */}
      <PayBillModal
        isOpen={payingOccurrence !== null}
        occurrence={payingOccurrence}
        accounts={accounts}
        currency={user?.currency}
        onClose={() => setPayingOccurrence(null)}
        onConfirm={async (accountId) => {
          if (!payingOccurrence) return;
          await handlePay(payingOccurrence, accountId);
        }}
      />
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    gap: spacing.xs,
  },
  addBtnText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  sectionTitle: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
    marginBottom: spacing.md,
  },
  emptyCard: {
    alignItems: 'center',
    padding: spacing.xl,
    borderRadius: radii.xl,
    borderWidth: 1,
  },
  emptyText: {
    fontSize: typography.fontSizes.sm,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});
