import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { spacing, radii, typography } from '../../theme/tokens';
import { Button } from './Button';

export interface SelectOption {
  label: string;
  value: string;
}

export interface SelectProps {
  label?: string;
  value: string;
  options: SelectOption[];
  onSelect: (value: string) => void;
  error?: string | null;
  placeholder?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  value,
  options,
  onSelect,
  error,
  placeholder = 'Select option',
}) => {
  const { colors } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = options.find((o) => o.value === value);

  return (
    <View style={styles.container}>
      {label && <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>}
      <TouchableOpacity
        style={[
          styles.trigger,
          {
            backgroundColor: colors.card,
            borderColor: error ? colors.expense : colors.border,
          },
        ]}
        onPress={() => setIsOpen(true)}
        activeOpacity={0.8}
      >
        <Text
          style={[styles.valueText, { color: selectedOption ? colors.text : colors.textMuted }]}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
      </TouchableOpacity>
      {error && <Text style={[styles.error, { color: colors.expense }]}>{error}</Text>}

      {/* Select Modal */}
      <Modal visible={isOpen} transparent animationType="fade">
        <View style={styles.backdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{label || 'Select'}</Text>

            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              style={styles.list}
              renderItem={({ item }) => {
                const isSelected = item.value === value;
                return (
                  <TouchableOpacity
                    style={[
                      styles.optionItem,
                      {
                        backgroundColor: isSelected ? colors.primaryLight : 'transparent',
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={() => {
                      onSelect(item.value);
                      setIsOpen(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        {
                          color: isSelected ? colors.primaryDark : colors.text,
                          fontWeight: isSelected ? '700' : '400',
                        },
                      ]}
                    >
                      {item.label}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark" size={18} color={colors.primaryDark} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />

            <Button
              variant="outline"
              label="Cancel"
              onPress={() => setIsOpen(false)}
              style={styles.cancelBtn}
            />
          </View>
        </View>
      </Modal>
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
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  valueText: {
    fontSize: typography.fontSizes.base,
  },
  error: {
    fontSize: typography.fontSizes.xs,
    marginTop: spacing.xs,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.base,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    maxHeight: '70%',
    borderRadius: radii.xl,
    padding: spacing.lg,
  },
  modalTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    marginBottom: spacing.md,
  },
  list: {
    marginVertical: spacing.sm,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.sm,
  },
  optionText: {
    fontSize: typography.fontSizes.base,
  },
  cancelBtn: {
    marginTop: spacing.md,
  },
});
