import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import { radii, spacing } from '../../theme/tokens';

export interface LoadingSkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = radii.md,
  style,
}) => {
  const { colors } = useTheme();

  return (
    <View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: colors.border,
          opacity: 0.6,
          marginVertical: spacing.xs,
        },
        style,
      ]}
    />
  );
};
