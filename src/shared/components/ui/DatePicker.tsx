import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { spacing, radii, typography } from '../../theme/tokens';
import { formatDateToISO } from '../../utils/date';
import { Button } from './Button';

export interface DatePickerProps {
  label?: string;
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  error?: string | null;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  label = 'Date',
  value,
  onChange,
  error,
}) => {
  const { colors } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  // Quick helper to adjust date
  const adjustDays = (days: number) => {
    const cur = new Date(value || Date.now());
    cur.setDate(cur.getDate() + days);
    onChange(formatDateToISO(cur));
  };

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
        <Text style={[styles.valueText, { color: colors.text }]}>{value || 'Select date'}</Text>
        <Ionicons name="calendar-outline" size={20} color={colors.primary} />
      </TouchableOpacity>
      {error && <Text style={[styles.error, { color: colors.expense }]}>{error}</Text>}

      {/* Date Picker Modal */}
      <Modal visible={isOpen} transparent animationType="fade">
        <View style={styles.backdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Date</Text>
            <Text style={[styles.selectedDisplay, { color: colors.primary }]}>{value}</Text>

            <View style={styles.quickRow}>
              <Button
                variant="outline"
                size="sm"
                label="Yesterday"
                onPress={() => {
                  adjustDays(-1);
                  setIsOpen(false);
                }}
              />
              <Button
                variant="outline"
                size="sm"
                label="Today"
                onPress={() => {
                  onChange(formatDateToISO(new Date()));
                  setIsOpen(false);
                }}
              />
              <Button
                variant="outline"
                size="sm"
                label="Tomorrow"
                onPress={() => {
                  adjustDays(1);
                  setIsOpen(false);
                }}
              />
            </View>

            <Button label="Done" onPress={() => setIsOpen(false)} style={styles.doneBtn} />
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
    borderRadius: radii.xl,
    padding: spacing.xl,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
  },
  selectedDisplay: {
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.heavy,
    marginVertical: spacing.md,
  },
  quickRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  doneBtn: {
    width: '100%',
  },
});
