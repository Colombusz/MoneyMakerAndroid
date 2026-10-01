import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { AccountType } from '../../types';
import { createAccount } from '../../db/accountRepo';
import { invalidateForChange } from '../../query';
import { parseToCentavos } from '../../shared/utils/currency';
import { spacing, radii, typography } from '../../shared/theme/tokens';
import { ACCOUNT_TYPES, AccountTypeCard } from './AccountTypeCard';

export interface AddAccountModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddAccountModal: React.FC<AddAccountModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [selectedType, setSelectedType] = useState<AccountType>('savings');
  const [startingBalanceStr, setStartingBalanceStr] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) return;
    if (!name.trim()) {
      Alert.alert('Name Required', 'Please enter an account name (e.g. Payroll, Maribank, GCash).');
      return;
    }

    if (name.trim().toLowerCase() === 'cash' || selectedType === 'cash') {
      Alert.alert(
        'Reserved Account',
        'A default "Cash" account is already active to track physical hard cash. You cannot create a duplicate Cash account.'
      );
      return;
    }

    const startCentavos = parseToCentavos(startingBalanceStr);

    setIsSubmitting(true);
    try {
      await createAccount(user.id, name.trim(), selectedType, startCentavos);
      // The new account and its starting balance appear on the dashboard instantly.
      invalidateForChange(queryClient, { entityTypes: ['accounts'] });
      setName('');
      setStartingBalanceStr('');
      onSuccess();
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create account');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={[styles.sheetContainer, { backgroundColor: colors.surface }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>New Account</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <View style={styles.group}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Account Name</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                    color: colors.text,
                  },
                ]}
                placeholder="e.g. Savings, Payroll, Maribank"
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
                autoFocus
              />
            </View>

            <View style={styles.group}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Starting Balance ({user?.currency || 'PHP'})
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                    color: colors.text,
                  },
                ]}
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                value={startingBalanceStr}
                onChangeText={(text) => setStartingBalanceStr(text.replace(/[^0-9.]/g, ''))}
              />
            </View>

            <View style={styles.group}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Account Type</Text>
              <View style={styles.typeList}>
                {ACCOUNT_TYPES.map((t) => (
                  <AccountTypeCard
                    key={t.type}
                    option={t}
                    isSelected={selectedType === t.type}
                    onSelect={setSelectedType}
                  />
                ))}
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleSubmit}
              disabled={isSubmitting}
              style={[styles.submitBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.submitBtnText}>
                {isSubmitting ? 'Creating…' : 'Create Account'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: radii['2xl'],
    borderTopRightRadius: radii['2xl'],
    maxHeight: '85%',
    paddingBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  content: {
    padding: spacing.lg,
  },
  group: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    height: 50,
    fontSize: typography.fontSizes.sm,
  },
  typeList: {
    gap: spacing.xs,
  },
  submitBtn: {
    height: 52,
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
  },
});
