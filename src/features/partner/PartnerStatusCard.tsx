import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { Card, Button, TextInput } from '../../shared/components/ui';
import { spacing, radii, typography } from '../../shared/theme/tokens';

export interface PartnerStatusCardProps {
  isConnected: boolean;
  partnerName: string | null;
  inviteCode: string | null;
  inputCode: string;
  loading: boolean;
  onInputChange: (code: string) => void;
  onGenerateInvite: () => void;
  onAcceptInvite: () => void;
  onUnlink: () => void;
}

export const PartnerStatusCard: React.FC<PartnerStatusCardProps> = ({
  isConnected,
  partnerName,
  inviteCode,
  inputCode,
  loading,
  onInputChange,
  onGenerateInvite,
  onAcceptInvite,
  onUnlink,
}) => {
  const { colors } = useTheme();

  return (
    <Card variant="primary" style={styles.card}>
      {isConnected ? (
        <View style={styles.connectedRow}>
          <View style={styles.connectedLeft}>
            <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="heart" size={24} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.connectedLabel, { color: colors.primary }]}>
                Connected Partner
              </Text>
              <Text style={[styles.partnerName, { color: colors.text }]}>
                {partnerName || 'Partner'}
              </Text>
            </View>
          </View>
          <Button variant="outline" size="sm" label="Unlink" onPress={onUnlink} />
        </View>
      ) : (
        <View style={styles.connectContainer}>
          <Text style={[styles.connectTitle, { color: colors.text }]}>Connect With Partner</Text>
          <Text style={[styles.connectSubtitle, { color: colors.textSecondary }]}>
            Generate an invite code or enter your partner's 6-character code.
          </Text>

          <View style={styles.optionsWrap}>
            <View
              style={[
                styles.optionBox,
                { borderColor: colors.border, backgroundColor: colors.surface },
              ]}
            >
              <Text style={[styles.optionTitle, { color: colors.text }]}>Share Your Code</Text>
              {inviteCode ? (
                <Text style={[styles.codeDisplay, { color: colors.primary }]}>{inviteCode}</Text>
              ) : (
                <Button
                  label="Generate Code"
                  size="sm"
                  onPress={onGenerateInvite}
                  loading={loading}
                  style={styles.btn}
                />
              )}
            </View>

            <View
              style={[
                styles.optionBox,
                { borderColor: colors.border, backgroundColor: colors.surface },
              ]}
            >
              <Text style={[styles.optionTitle, { color: colors.text }]}>Enter Partner's Code</Text>
              <TextInput
                value={inputCode}
                onChangeText={(t) => onInputChange(t.toUpperCase())}
                placeholder="6-CHAR CODE"
                autoCapitalize="characters"
                maxLength={6}
                style={styles.codeInput}
              />
              <Button
                label="Connect"
                size="sm"
                onPress={onAcceptInvite}
                loading={loading}
                style={styles.btn}
              />
            </View>
          </View>
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.base,
  },
  connectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  connectedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  connectedLabel: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    textTransform: 'uppercase',
  },
  partnerName: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
  },
  connectContainer: {},
  connectTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
  },
  connectSubtitle: {
    fontSize: typography.fontSizes.xs,
    marginTop: 2,
    marginBottom: spacing.md,
  },
  optionsWrap: {
    gap: spacing.md,
  },
  optionBox: {
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  optionTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    marginBottom: spacing.xs,
  },
  codeDisplay: {
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.heavy,
    letterSpacing: 4,
    textAlign: 'center',
    marginVertical: spacing.sm,
  },
  codeInput: {
    textAlign: 'center',
    fontWeight: '700',
    letterSpacing: 2,
  },
  btn: {
    marginTop: spacing.xs,
  },
});
