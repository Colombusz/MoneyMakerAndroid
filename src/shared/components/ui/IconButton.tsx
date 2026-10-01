import React from 'react';
import { TouchableOpacity, TouchableOpacityProps, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';

export interface IconButtonProps extends TouchableOpacityProps {
  name: keyof typeof Ionicons.glyphMap;
  size?: number;
  color?: string;
  variant?: 'ghost' | 'surface' | 'primary';
  iconSize?: number;
}

export const IconButton: React.FC<IconButtonProps> = ({
  name,
  size = 40,
  color,
  variant = 'ghost',
  iconSize = 22,
  style,
  ...props
}) => {
  const { colors } = useTheme();

  const getStyle = (): ViewStyle => {
    let bg = 'transparent';
    if (variant === 'surface') bg = colors.card;
    if (variant === 'primary') bg = colors.primary;

    return {
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: bg,
      alignItems: 'center',
      justifyContent: 'center',
    };
  };

  const iconColor = color || (variant === 'primary' ? '#FFFFFF' : colors.text);

  return (
    <TouchableOpacity
      accessibilityRole="button"
      style={[getStyle(), style]}
      activeOpacity={0.7}
      {...props}
    >
      <Ionicons name={name} size={iconSize} color={iconColor} />
    </TouchableOpacity>
  );
};
