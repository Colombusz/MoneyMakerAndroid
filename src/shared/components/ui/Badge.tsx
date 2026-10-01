import React from 'react';
import { View, Text, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import { spacing, radii, typography } from '../../theme/tokens';

export interface BadgeProps {
  label: string;
  variant?: 'income' | 'expense' | 'transfer' | 'neutral' | 'primary';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'neutral', size = 'sm' }) => {
  const { colors } = useTheme();

  const getContainerStyle = (): ViewStyle => {
    let bg = colors.border;
    if (variant === 'income') bg = colors.incomeLight;
    if (variant === 'expense') bg = colors.expenseLight;
    if (variant === 'transfer') bg = '#EDE9FE';
    if (variant === 'primary') bg = colors.primaryLight;

    return {
      backgroundColor: bg,
      paddingHorizontal: size === 'sm' ? spacing.sm : spacing.md,
      paddingVertical: size === 'sm' ? 2 : spacing.xs,
      borderRadius: radii.full,
      alignSelf: 'flex-start',
    };
  };

  const getTextStyle = (): TextStyle => {
    let textColor = colors.textSecondary;
    if (variant === 'income') textColor = colors.income;
    if (variant === 'expense') textColor = colors.expense;
    if (variant === 'transfer') textColor = colors.transfer;
    if (variant === 'primary') textColor = colors.primary;

    return {
      color: textColor,
      fontSize: size === 'sm' ? typography.fontSizes.xs : typography.fontSizes.sm,
      fontWeight: typography.fontWeights.semibold,
      textTransform: 'capitalize',
    };
  };

  return (
    <View style={getContainerStyle()}>
      <Text style={getTextStyle()}>{label}</Text>
    </View>
  );
};
