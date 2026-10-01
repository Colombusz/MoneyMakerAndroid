import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export const SyncStatusBadge: React.FC = () => {
  const { syncStatus, syncNow } = useAuth();
  const { colors } = useTheme();

  const getStatusConfig = () => {
    switch (syncStatus) {
      case 'synced':
        return {
          label: 'Synced',
          icon: 'cloud-done' as const,
          color: colors.income,
          bg: colors.incomeLight,
        };
      case 'syncing':
        return {
          label: 'Syncing…',
          icon: 'sync' as const,
          color: colors.primary,
          bg: colors.primaryLight,
        };
      case 'offline':
        return {
          label: 'Offline',
          icon: 'cloud-offline' as const,
          color: colors.textMuted,
          bg: colors.border,
        };
      case 'error':
        return {
          label: 'Sync error',
          icon: 'alert-circle' as const,
          color: colors.expense,
          bg: colors.expenseLight,
        };
      default:
        return {
          label: 'Offline',
          icon: 'cloud-offline' as const,
          color: colors.textMuted,
          bg: colors.border,
        };
    }
  };

  const config = getStatusConfig();

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={syncNow}
      style={[styles.badge, { backgroundColor: config.bg, borderColor: colors.border }]}
    >
      <Ionicons name={config.icon} size={14} color={config.color} />
      <Text style={[styles.text, { color: config.color }]}>{config.label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
  },
});
