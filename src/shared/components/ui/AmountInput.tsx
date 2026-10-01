import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import { spacing, radii, typography } from '../../theme/tokens';
import { parseToCentavos } from '../../utils/currency';

export interface AmountInputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  onCentavosChange?: (centavos: number) => void;
  currencySymbol?: string;
  error?: string | null;
  placeholder?: string;
}

export const AmountInput: React.FC<AmountInputProps> = ({
  label = 'Amount',
  value,
  onChangeText,
  onCentavosChange,
  currencySymbol = '₱',
  error,
  placeholder = '0.00',
}) => {
  const { colors } = useTheme();

  const handleChange = (text: string) => {
    // Only allow digits and a single decimal point
    const cleaned = text.replace(/[^0-9.]/g, '');
    onChangeText(cleaned);
    if (onCentavosChange) {
      onCentavosChange(parseToCentavos(cleaned));
    }
  };

  return (
    <View style={styles.container}>
      {label && <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>}
      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: colors.card,
            borderColor: error ? colors.expense : colors.border,
          },
        ]}
      >
        <Text style={[styles.currencyPrefix, { color: colors.primary }]}>{currencySymbol}</Text>
        <TextInput
          value={value}
          onChangeText={handleChange}
          keyboardType="decimal-pad"
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { color: colors.text }]}
        />
      </View>
      {error && <Text style={[styles.error, { color: colors.expense }]}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    minHeight: 52,
  },
  currencyPrefix: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    paddingVertical: spacing.sm,
  },
  error: {
    fontSize: typography.fontSizes.xs,
    marginTop: spacing.xs,
  },
});
