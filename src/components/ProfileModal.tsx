import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { spacing, radii, typography } from '../shared/theme/tokens';

export interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenAuth: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  visible,
  onClose,
  onOpenAuth,
}) => {
  const { colors } = useTheme();
  const { user, isAuthenticated, syncStatus, logout, syncNow } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await syncNow();
      Alert.alert('Sync Complete', 'Your financial data is up to date.');
    } catch (err: any) {
      Alert.alert('Sync Failed', err?.message || 'Could not sync with the cloud.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Log Out & Wipe Local Data',
      'Logging out will completely wipe all local accounts, transactions, and cached records from this device. Are you sure you want to proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out & Wipe',
          style: 'destructive',
          onPress: async () => {
            setIsLoggingOut(true);
            try {
              await logout();
              onClose();
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to log out cleanly.');
            } finally {
              setIsLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  const initial = user?.name ? user.name.charAt(0).toUpperCase() : 'M';
  const displayName = user?.name || (isAuthenticated ? 'Cloud User' : 'Local Wallet');
  const displayEmail = user?.email || 'offline@moneysaver.local';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Profile & Account</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Avatar & Header Identity */}
            <View style={styles.avatarSection}>
              <View style={[styles.avatarCircle, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.avatarInitial, { color: colors.primaryDark }]}>
                  {initial}
                </Text>
              </View>

              <Text style={[styles.userName, { color: colors.text }]}>{displayName}</Text>
              <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{displayEmail}</Text>

              {/* Status Badge */}
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: isAuthenticated
                      ? 'rgba(22, 101, 52, 0.15)'
                      : 'rgba(240, 211, 90, 0.18)',
                  },
                ]}
              >
                <Ionicons
                  name={isAuthenticated ? 'cloud-done' : 'phone-portrait-outline'}
                  size={14}
                  color={isAuthenticated ? colors.success : colors.warning}
                />
                <Text
                  style={[
                    styles.badgeText,
                    { color: isAuthenticated ? colors.success : colors.warning },
                  ]}
                >
                  {isAuthenticated ? 'Cloud Account Active' : 'Offline Guest Wallet'}
                </Text>
              </View>
            </View>

            {/* Information Section */}
            <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {/* Currency */}
              <View style={styles.infoRow}>
                <View style={styles.infoLabelGroup}>
                  <Ionicons name="cash-outline" size={18} color={colors.primary} />
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                    Default Currency
                  </Text>
                </View>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {user?.currency || 'PHP'}
                </Text>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* Sync Status */}
              <View style={styles.infoRow}>
                <View style={styles.infoLabelGroup}>
                  <Ionicons name="sync-outline" size={18} color={colors.primary} />
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                    Sync Status
                  </Text>
                </View>
                <View style={styles.syncStatusGroup}>
                  <Text style={[styles.infoValue, { color: colors.text, textTransform: 'capitalize' }]}>
                    {syncStatus}
                  </Text>
                  {isAuthenticated && (
                    <TouchableOpacity
                      onPress={handleSync}
                      disabled={isSyncing}
                      style={[styles.syncButton, { backgroundColor: colors.primaryLight }]}
                      activeOpacity={0.7}
                    >
                      {isSyncing ? (
                        <ActivityIndicator size="small" color={colors.primaryDark} />
                      ) : (
                        <Text style={[styles.syncButtonText, { color: colors.primaryDark }]}>
                          Sync Now
                        </Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* Partner Sharing */}
              <View style={styles.infoRow}>
                <View style={styles.infoLabelGroup}>
                  <Ionicons name="heart-outline" size={18} color={colors.expense} />
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                    Partner
                  </Text>
                </View>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {user?.partner?.name ? `${user.partner.name}` : 'Not linked'}
                </Text>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* User ID */}
              <View style={styles.infoRow}>
                <View style={styles.infoLabelGroup}>
                  <Ionicons name="finger-print-outline" size={18} color={colors.textMuted} />
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                    Account ID
                  </Text>
                </View>
                <Text
                  style={[styles.infoValue, { color: colors.textMuted, fontSize: typography.fontSizes.xs }]}
                  numberOfLines={1}
                >
                  {user?.id ? `${user.id.slice(0, 10)}...` : 'Local'}
                </Text>
              </View>
            </View>

            {/* Offline Prompt if guest */}
            {!isAuthenticated && (
              <View
                style={[
                  styles.guestBanner,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Ionicons name="cloud-upload-outline" size={24} color={colors.primary} />
                <View style={styles.guestBannerText}>
                  <Text style={[styles.guestBannerTitle, { color: colors.text }]}>
                    Connect Cloud Account
                  </Text>
                  <Text style={[styles.guestBannerSubtitle, { color: colors.textSecondary }]}>
                    Sign in to back up your transactions to MongoDB Atlas and access shared goals.
                  </Text>
                </View>
              </View>
            )}

            {/* Actions */}
            <View style={styles.actionSection}>
              {!isAuthenticated ? (
                <>
                  <TouchableOpacity
                    style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                    onPress={() => {
                      onClose();
                      onOpenAuth();
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="log-in-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.primaryButtonText}>Sign In / Register</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.destructiveOutlineButton, { borderColor: colors.expense }]}
                    onPress={handleLogout}
                    disabled={isLoggingOut}
                    activeOpacity={0.7}
                  >
                    {isLoggingOut ? (
                      <ActivityIndicator size="small" color={colors.expense} />
                    ) : (
                      <>
                        <Ionicons name="trash-outline" size={18} color={colors.expense} />
                        <Text style={[styles.destructiveOutlineText, { color: colors.expense }]}>
                          Wipe All Local Data
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={[styles.destructiveButton, { backgroundColor: colors.expense }]}
                  onPress={handleLogout}
                  disabled={isLoggingOut}
                  activeOpacity={0.8}
                >
                  {isLoggingOut ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
                      <Text style={styles.destructiveButtonText}>Log Out & Wipe Local Data</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: spacing.base,
  },
  card: {
    borderRadius: radii['2xl'],
    maxHeight: '85%',
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  headerTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  scrollContent: {
    paddingBottom: spacing.sm,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatarInitial: {
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.heavy,
  },
  userName: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: typography.fontSizes.sm,
    marginBottom: spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
  },
  badgeText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
  },
  infoCard: {
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: spacing.base,
    marginBottom: spacing.base,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  infoLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoLabel: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
  },
  infoValue: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
  },
  syncStatusGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  syncButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.md,
  },
  syncButtonText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.sm,
  },
  guestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.base,
  },
  guestBannerText: {
    flex: 1,
  },
  guestBannerTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    marginBottom: 2,
  },
  guestBannerSubtitle: {
    fontSize: typography.fontSizes.xs,
    lineHeight: 16,
  },
  actionSection: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 48,
    borderRadius: radii.lg,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
  },
  destructiveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 48,
    borderRadius: radii.lg,
  },
  destructiveButtonText: {
    color: '#FFFFFF',
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
  },
  destructiveOutlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 46,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  destructiveOutlineText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
  },
});
