import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  TouchableOpacityProps,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import { spacing, radii, typography } from '../../theme/tokens';

export interface ButtonProps extends TouchableOpacityProps {
  label?: string;
  title?: string;
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  title,
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled,
  style,
  ...props
}) => {
  const { colors } = useTheme();

  // Shared palette so the container and the label always agree on the colours.
  const getPalette = (): { bg: string; border: string; textColor: string } => {
    let bg = colors.primary;
    let border = 'transparent';
    let textColor = '#FFFFFF';

    if (variant === 'secondary') {
      bg = colors.surface;
      border = colors.border;
      textColor = colors.text;
    } else if (variant === 'outline') {
      bg = 'transparent';
      border = colors.primary;
      textColor = colors.primary;
    } else if (variant === 'ghost') {
      bg = 'transparent';
      border = 'transparent';
      textColor = colors.textSecondary;
    } else if (variant === 'danger') {
      bg = colors.expense;
      border = 'transparent';
      textColor = '#FFFFFF';
    }

    return { bg, border, textColor };
  };

  const getContainerStyle = (): ViewStyle => {
    const { bg, border } = getPalette();

    const paddingV = size === 'sm' ? spacing.xs + 2 : size === 'lg' ? spacing.md : spacing.sm + 2;
    const paddingH = size === 'sm' ? spacing.sm : size === 'lg' ? spacing.xl : spacing.base;

    return {
      backgroundColor: bg,
      borderColor: border,
      borderWidth: variant === 'outline' || variant === 'secondary' ? 1 : 0,
      paddingVertical: paddingV,
      paddingHorizontal: paddingH,
      minHeight: 44,
      borderRadius: radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      opacity: disabled || loading ? 0.6 : 1,
      width: fullWidth ? '100%' : undefined,
    };
  };

  const getTextStyle = (): TextStyle => {
    const { textColor } = getPalette();
    const fontSize =
      size === 'sm'
        ? typography.fontSizes.sm
        : size === 'lg'
          ? typography.fontSizes.lg
          : typography.fontSizes.base;

    return {
      color: textColor,
      fontSize,
      fontWeight: typography.fontWeights.semibold,
    };
  };

  return (
    <TouchableOpacity
      disabled={disabled || loading}
      style={[getContainerStyle(), style]}
      activeOpacity={0.8}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'secondary' || variant === 'outline' || variant === 'ghost' ? colors.primary : '#FFFFFF'}
          size="small"
        />
      ) : children ? (
        children
      ) : (
        <Text style={getTextStyle()}>{label || title}</Text>
      )}
    </TouchableOpacity>
  );
};
