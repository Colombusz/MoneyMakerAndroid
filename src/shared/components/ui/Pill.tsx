import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewProps,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import { spacing, typography } from '../../theme/tokens';

export interface PillProps extends ViewProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'success' | 'warning' | 'expense';
  size?: 'sm' | 'md';
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
}

export const Pill: React.FC<PillProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  selected = false,
  disabled = false,
  onPress,
  style,
  ...props
}) => {
  const { colors, isDark } = useTheme();

  // Shared palette so the container and the label always agree on the colours.
  const getPalette = (): { bg: string; border: string; textColor: string } => {
    let bg = colors.surface;
    let border = colors.border;
    let textColor = colors.text;

    switch (variant) {
      case 'primary':
        bg = selected ? colors.primary : colors.primaryLight;
        border = 'transparent';
        textColor = selected ? '#FFFFFF' : colors.primaryDark;
        break;
      case 'secondary':
        bg = selected ? colors.primary : colors.surface;
        border = selected ? 'transparent' : colors.border;
        textColor = selected ? '#FFFFFF' : colors.text;
        break;
      case 'outline':
        bg = 'transparent';
        border = selected ? colors.primary : colors.border;
        textColor = selected ? colors.primary : colors.textSecondary;
        break;
      case 'success':
        bg = selected ? colors.success : `${colors.success}20`;
        border = 'transparent';
        textColor = selected ? '#FFFFFF' : isDark ? '#FFFFFF' : '#232323';
        break;
      case 'warning':
        bg = selected ? colors.warning : `${colors.warning}20`;
        border = 'transparent';
        textColor = '#232323';
        break;
      case 'expense':
        bg = selected ? colors.expense : colors.expenseLight;
        border = 'transparent';
        textColor = selected ? '#FFFFFF' : colors.expense;
        break;
    }

    return { bg, border, textColor };
  };

  const getContainerStyle = (): ViewStyle => {
    const { bg, border } = getPalette();

    const paddingH = size === 'sm' ? spacing.sm : spacing.md;
    const paddingV = size === 'sm' ? spacing.xs : spacing.sm;

    return {
      backgroundColor: bg,
      borderColor: border,
      borderWidth: 1,
      paddingHorizontal: paddingH,
      paddingVertical: paddingV,
      borderRadius: 9999,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: size === 'sm' ? 28 : 36,
      opacity: disabled ? 0.6 : 1,
    };
  };

  const getTextStyle = (): TextStyle => {
    const { textColor } = getPalette();
    const fontSize = size === 'sm' ? typography.fontSizes.xs : typography.fontSizes.sm;
    return {
      color: textColor,
      fontSize,
      fontWeight: typography.fontWeights.semibold,
    };
  };

  const containerStyle = [styles.pill, getContainerStyle(), style];
  const content = <Text style={getTextStyle()}>{children}</Text>;

  // Two explicit branches: a conditional `Component` variable makes the element
  // type a union, which React Native's typings (and the runtime) handle poorly.
  if (onPress && !disabled) {
    return (
      <TouchableOpacity
        {...(props as any)}
        activeOpacity={0.8}
        onPress={onPress}
        style={containerStyle}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View {...(props as any)} style={containerStyle}>
      {content}
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});