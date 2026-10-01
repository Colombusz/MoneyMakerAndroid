import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { AccountType } from '../../types';
import { spacing, radii, typography } from '../../shared/theme/tokens';

export interface AccountTypeOption {
  type: AccountType;
  label: string;
  icon: string;
  desc: string;
}

export const ACCOUNT_TYPES: AccountTypeOption[] = [
  { type: 'payroll', label: 'Payroll', icon: 'card', desc: 'Income is received here' },
  { type: 'savings', label: 'Savings', icon: 'wallet', desc: 'Personal spending / stash' },
  { type: 'goals', label: 'Maribank / Goals', icon: 'trending-up', desc: 'Dedicated to goals' },
  { type: 'cash', label: 'Cash / Wallet', icon: 'cash', desc: 'Physical cash' },
  { type: 'other', label: 'Other', icon: 'cube', desc: 'Custom account' },
];

export interface AccountTypeCardProps {
  option: AccountTypeOption;
  isSelected: boolean;
  onSelect: (type: AccountType) => void;
}

export const AccountTypeCard: React.FC<AccountTypeCardProps> = ({
  option,
  isSelected,
  onSelect,
}) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      onPress={() => onSelect(option.type)}
      style={[
        styles.typeCard,
        { borderColor: colors.border, backgroundColor: colors.background },
        isSelected && { borderColor: colors.primary, backgroundColor: colors.primaryLight },
      ]}
    >
      <Ionicons
        name={option.icon as any}
        size={20}
        color={isSelected ? colors.primary : colors.textSecondary}
      />
      <View style={styles.typeTextCol}>
        <Text style={[styles.typeTitle, { color: isSelected ? colors.primary : colors.text }]}>
          {option.label}
        </Text>
        <Text style={[styles.typeDesc, { color: colors.textMuted }]}>{option.desc}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
  },
  typeTextCol: {
    flex: 1,
  },
  typeTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
  },
  typeDesc: {
    fontSize: typography.fontSizes.xs,
    marginTop: 2,
  },
});
