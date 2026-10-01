import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { spacing, radii, typography } from '../../theme/tokens';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
}) => {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.expenseLight, borderColor: colors.expense },
      ]}
    >
      <Ionicons name="alert-circle-outline" size={32} color={colors.expense} />
      <Text style={[styles.title, { color: colors.expense }]}>{title}</Text>
      <Text style={[styles.message, { color: colors.text }]}>{message}</Text>
      {onRetry && (
        <Button
          label="Try Again"
          onPress={onRetry}
          size="sm"
          variant="danger"
          style={styles.retryBtn}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: radii.xl,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.md,
  },
  title: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
    marginTop: spacing.sm,
  },
  message: {
    fontSize: typography.fontSizes.sm,
    textAlign: 'center',
    marginTop: spacing.xs,
    maxWidth: 280,
  },
  retryBtn: {
    marginTop: spacing.base,
  },
});
