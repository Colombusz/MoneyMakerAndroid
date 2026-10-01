import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import { radii } from '../../theme/tokens';

export interface ProgressBarProps {
  percentage: number; // 0 - 100
  color?: string;
  height?: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ percentage, color, height = 8 }) => {
  const { colors } = useTheme();
  const clamped = Math.min(100, Math.max(0, percentage));
  const fillColor = color || colors.primary;

  return (
    <View
      style={[
        styles.track,
        {
          height,
          backgroundColor: colors.border,
          borderRadius: radii.full,
        },
      ]}
    >
      <View
        style={[
          styles.fill,
          {
            width: `${clamped}%`,
            height,
            backgroundColor: fillColor,
            borderRadius: radii.full,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {},
});
