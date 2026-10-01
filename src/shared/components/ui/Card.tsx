import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import { spacing, radii } from '../../theme/tokens';

export interface CardProps extends ViewProps {
  variant?: 'primary' | 'secondary' | 'outlined' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'primary',
  padding = 'md',
  style,
  ...props
}) => {
  const { colors, isDark } = useTheme();

  const paddingStyle = {
    none: 0,
    sm: spacing.sm,
    md: spacing.base,
    lg: spacing.xl,
  }[padding];

  const variantStyle = {
    primary: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderWidth: 1,
    },
    secondary: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
    },
    outlined: {
      backgroundColor: 'transparent',
      borderColor: colors.border,
      borderWidth: 1,
    },
    elevated: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderWidth: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.4 : 0.12,
      shadowRadius: 8,
      elevation: 3,
    },
  }[variant];

  return (
    <View
      style={[
        styles.card,
        variantStyle,
        { padding: paddingStyle, borderRadius: radii.xl },
        style
      ]}
      {...props}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
});
