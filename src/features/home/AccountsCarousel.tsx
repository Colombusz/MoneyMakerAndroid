import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { spacing, radii, typography } from '../../shared/theme/tokens';
import { formatCentavos } from '../../shared/utils/currency';
import { IconButton } from '../../shared/components/ui';
import { Account } from '../../types';

export interface AccountsCarouselProps {
  accounts: Account[];
  currency?: string;
  onPressCashAccount?: (account: Account) => void;
  /**
   * Offers a delete control on the card. Never offered for the Cash account —
   * it is the reserved Quick Spend wallet and cannot be removed.
   */
  onDeleteAccount?: (account: Account) => void;
}

export const AccountsCarousel: React.FC<AccountsCarouselProps> = ({
  accounts,
  currency = 'PHP',
  onPressCashAccount,
  onDeleteAccount,
}) => {
  const { colors, isDark } = useTheme();

  const getAccountIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'payroll':
        return 'card-outline';
      case 'goals':
        return 'trending-up-outline';
      case 'cash':
        return 'cash-outline';
      default:
        return 'wallet-outline';
    }
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {accounts.map((acc) => {
        const isCash = acc.type === 'cash' || acc.name.toLowerCase() === 'cash';

        const cardContent = (
          <>
            <View style={styles.cardHeader}>
              <View
                style={[
                  styles.iconBox,
                  {
                    backgroundColor: isCash
                      ? colors.expenseLight
                      : colors.primaryLight,
                  },
                ]}
              >
                <Ionicons
                  name={getAccountIcon(acc.type)}
                  size={18}
                  color={isCash ? colors.expense : colors.primary}
                />
              </View>
              <View style={styles.headerRight}>
                {isCash ? (
                  <View
                    style={[styles.quickSpendBadge, { backgroundColor: colors.expenseLight }]}
                  >
                    <Ionicons name="flash" size={10} color={colors.expense} />
                    <Text style={[styles.quickSpendBadgeText, { color: colors.expense }]}>
                      QUICK SPEND
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.badge, { color: colors.textMuted }]}>
                    {acc.type.toUpperCase()}
                  </Text>
                )}
                {!isCash && onDeleteAccount ? (
                  <IconButton
                    name="trash-outline"
                    size={24}
                    iconSize={14}
                    color={colors.textMuted}
                    onPress={() => onDeleteAccount(acc)}
                    accessibilityLabel={`Delete ${acc.name}`}
                  />
                ) : null}
              </View>
            </View>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
              {acc.name}
            </Text>
            <Text style={[styles.balance, { color: colors.text }]}>
              {formatCentavos(acc.currentBalanceCentavos, currency)}
            </Text>
            {isCash && (
              <Text style={[styles.cashHintText, { color: colors.expense }]}>
                Tap to spend ⚡
              </Text>
            )}
          </>
        );

        if (isCash && onPressCashAccount) {
          return (
            <TouchableOpacity
              key={acc.id}
              activeOpacity={0.7}
              onPress={() => onPressCashAccount(acc)}
              style={[
                styles.card,
                {
                  backgroundColor: colors.card,
                  borderColor: isDark ? colors.expense : colors.expenseLight,
                  borderWidth: 1.5,
                },
              ]}
            >
              {cardContent}
            </TouchableOpacity>
          );
        }

        return (
          <View
            key={acc.id}
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            {cardContent}
          </View>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  row: {
    paddingRight: spacing.base,
    gap: spacing.md,
  },
  card: {
    width: 160,
    borderWidth: 1,
    borderRadius: radii.xl,
    padding: spacing.base,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    fontSize: 10,
    fontWeight: '700',
  },
  quickSpendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  quickSpendBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  cashHintText: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  name: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    marginBottom: spacing.xs,
  },
  balance: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.heavy,
  },
});
