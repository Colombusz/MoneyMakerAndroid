import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Account } from '../../types';
import { Card, Button } from '../../shared/components/ui';
import { spacing, radii, typography } from '../../shared/theme/tokens';
import { formatCentavos } from '../../shared/utils/currency';
import { formatDisplayDate } from '../../shared/utils/date';
import { SharedAccount } from './sharedAccounts';

export interface SharedAccountCardProps {
  account: SharedAccount;
  currency?: string;
  onDeposit: (account: SharedAccount) => void;
  onExpense: (account: SharedAccount) => void;
}

export const SharedAccountCard: React.FC<SharedAccountCardProps> = ({
  account,
  currency = 'PHP',
  onDeposit,
  onExpense,
}) => {
  const { colors } = useTheme();
  const deposits = (account.recentMovements ?? []).filter((m) => m.type === 'deposit');

  return (
    <Card variant="elevated" style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.name, { color: colors.text }]}>{account.name}</Text>
          <Text style={[styles.sub, { color: colors.textSecondary }]}>Shared balance</Text>
        </View>
        <Text style={[styles.balance, { color: colors.income }]}>
          {formatCentavos(account.balanceCentavos, currency)}
        </Text>
      </View>

      {account.members.length > 0 && (
        <View style={styles.memberGrid}>
          {account.members.map((m) => (
            <View
              key={m.userId || m.name}
              style={[
                styles.memberTile,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text
                style={[styles.memberName, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {m.name}
              </Text>
              <Text style={[styles.memberAmount, { color: colors.text }]}>
                {formatCentavos(m.totalDepositedCentavos, currency)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {deposits.length > 0 && (
        <View style={styles.movementsWrap}>
          <Text style={[styles.movementsTitle, { color: colors.textMuted }]}>
            RECENT MOVEMENTS
          </Text>
          {deposits.slice(0, 5).map((m) => (
            <View
              key={m.id}
              style={[
                styles.movementRow,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={styles.movementLeft}>
                <Text style={[styles.movementUser, { color: colors.text }]}>
                  {m.userName ?? 'Partner'}
                  {m.notes ? ` (${m.notes})` : ''}
                </Text>
                {m.fundingAccountName ? (
                  <Text style={[styles.movementSub, { color: colors.textMuted }]}>
                    Funded from {m.fundingAccountName} (-
                    {formatCentavos(m.amountCentavos, currency)})
                  </Text>
                ) : null}
                <Text style={[styles.movementSub, { color: colors.textMuted }]}>
                  {formatDisplayDate(m.date)}
                </Text>
              </View>
              <Text style={[styles.movementAmount, { color: colors.income }]}>
                +{formatCentavos(m.amountCentavos, currency)}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.btnRow}>
        <Button label="Deposit" size="sm" onPress={() => onDeposit(account)} style={styles.btn} />
        <Button
          label="Record expense"
          size="sm"
          variant="outline"
          onPress={() => onExpense(account)}
          style={styles.btn}
        />
      </View>
    </Card>
  );
};

export type { Account };

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
  name: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
  },
  sub: {
    fontSize: typography.fontSizes.xs,
    marginTop: 2,
  },
  balance: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.heavy,
  },
  memberGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  memberTile: {
    flex: 1,
    minWidth: '45%',
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.sm,
  },
  memberName: {
    fontSize: typography.fontSizes.xs,
  },
  memberAmount: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    marginTop: 1,
  },
  movementsWrap: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  movementsTitle: {
    fontSize: 10,
    fontWeight: '700',
  },
  movementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.sm,
  },
  movementLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  movementUser: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
  },
  movementSub: {
    fontSize: 11,
    marginTop: 1,
  },
  movementAmount: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
  },
  btnRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  btn: {
    flex: 1,
  },
});
