import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../services/apiClient';
import { SharedGoal } from '../../types';
import { getAccounts } from '../../db/accountRepo';
import { accountKeys } from '../accounts/keys';
import { parseToCentavos } from '../../shared/utils/currency';
import {
  SharedAccount,
  isNotFoundError,
  normSharedAccountList,
} from './sharedAccounts';

export function usePartnerScreenData(userId?: string) {
  const [partnerConnected, setPartnerConnected] = useState(false);
  const [partnerName, setPartnerName] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inputCode, setInputCode] = useState('');
  const [sharedGoals, setSharedGoals] = useState<SharedGoal[]>([]);
  const [sharedAccounts, setSharedAccounts] = useState<SharedAccount[]>([]);
  const [sharedAccountsError, setSharedAccountsError] = useState('');
  const [isSharedAccountsPending, setIsSharedAccountsPending] = useState(false);
  const [loading, setLoading] = useState(false);

  // Account balances come from the shared query cache so they stay in sync with
  // transactions recorded elsewhere in the app.
  const accountsQuery = useQuery({
    queryKey: accountKeys.list(userId ?? ''),
    queryFn: () => getAccounts(userId as string),
    enabled: Boolean(userId),
  });

  const loadSharedAccounts = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await apiFetch<unknown>('/api/partners/shared-accounts');
      setSharedAccounts(normSharedAccountList(data));
      setSharedAccountsError('');
      setIsSharedAccountsPending(false);
    } catch (e: any) {
      // Backend for shared accounts lands in parallel — a 404 means "not yet
      // deployed", so fall back to an empty list instead of surfacing an error.
      setSharedAccounts([]);
      if (isNotFoundError(e)) {
        setIsSharedAccountsPending(true);
        setSharedAccountsError('');
      } else {
        setIsSharedAccountsPending(false);
        setSharedAccountsError(e?.message || 'Failed to load shared accounts');
      }
    }
  }, [userId]);

  const loadPartnerData = useCallback(async () => {
    if (!userId) return;
    try {
      const statusRes = await apiFetch<{
        connected: boolean;
        partner?: { id: string; name: string };
      }>('/api/partners/status');
      setPartnerConnected(Boolean(statusRes?.connected));
      setPartnerName(statusRes?.partner?.name || null);

      if (statusRes?.connected) {
        try {
          const goalsRes = await apiFetch<{ sharedGoals: SharedGoal[] }>(
            '/api/partners/shared-goals'
          );
          setSharedGoals(goalsRes?.sharedGoals || []);
        } catch (e: any) {
          console.log('Shared goals fetch failed:', e.message);
          setSharedGoals([]);
        }
        await loadSharedAccounts();
      } else {
        setSharedGoals([]);
        setSharedAccounts([]);
      }
    } catch (e: any) {
      console.log('Partner data fetch failed (may be offline):', e.message);
    }
  }, [userId, loadSharedAccounts]);

  useEffect(() => {
    loadPartnerData();
  }, [loadPartnerData]);

  const handleGenerateInvite = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ inviteCode: string }>('/api/partners/invite', {
        method: 'POST',
      });
      setInviteCode(res.inviteCode);
      Alert.alert('Invite Generated', `Share this code with your partner: ${res.inviteCode}`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to generate invite');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvite = async () => {
    if (!inputCode.trim()) {
      Alert.alert('Required', 'Please enter a 6-character invite code.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch<{ partner: { name: string } }>('/api/partners/accept', {
        method: 'POST',
        body: JSON.stringify({ inviteCode: inputCode.trim() }),
      });
      Alert.alert('Connected!', `Successfully connected with ${res.partner.name}`);
      setInputCode('');
      loadPartnerData();
    } catch (e: any) {
      Alert.alert('Failed', e.message || 'Invalid or expired invite code');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlink = () => {
    Alert.alert(
      'Unlink Partner',
      'Are you sure you want to unlink? Shared goals will be archived.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlink',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiFetch('/api/partners/unlink', { method: 'POST' });
              setPartnerConnected(false);
              setPartnerName(null);
              setSharedGoals([]);
              Alert.alert(
                'Unlinked',
                'Partner connection severed. Historical records remain intact.'
              );
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to unlink');
            }
          },
        },
      ]
    );
  };

  const handleCreateSharedGoal = async (name: string, targetStr: string, targetDate?: string) => {
    const target = parseToCentavos(targetStr);
    if (!name.trim() || target <= 0) {
      Alert.alert('Required', 'Please enter a goal title and target amount.');
      return false;
    }

    try {
      await apiFetch('/api/partners/shared-goals', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          targetAmountCentavos: target,
          targetDate: targetDate || undefined,
        }),
      });
      await loadPartnerData();
      return true;
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create shared goal');
      return false;
    }
  };

  const handleContribute = async (
    goalId: string,
    amountStr: string,
    accountId: string,
    notes?: string
  ) => {
    const amount = parseToCentavos(amountStr);
    if (amount <= 0 || !accountId) {
      Alert.alert('Required', 'Please enter an amount and choose a funding account.');
      return false;
    }

    try {
      await apiFetch(`/api/partners/shared-goals/${goalId}/contribute`, {
        method: 'POST',
        body: JSON.stringify({
          amountCentavos: amount,
          accountId,
          notes: notes?.trim() || undefined,
        }),
      });
      await loadPartnerData();
      return true;
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to contribute to shared goal');
      return false;
    }
  };

  const handleCreateSharedAccount = async (name: string) => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a name for the shared account.');
      return false;
    }
    try {
      await apiFetch('/api/partners/shared-accounts', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim() }),
      });
      await loadSharedAccounts();
      return true;
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create shared account');
      return false;
    }
  };

  const handleDepositToSharedAccount = async (
    sharedAccountId: string,
    amountStr: string,
    fundingAccountId: string,
    notes?: string
  ) => {
    const amount = parseToCentavos(amountStr);
    if (amount <= 0 || !fundingAccountId) {
      Alert.alert('Required', 'Enter an amount and pick which account funds this deposit.');
      return false;
    }
    try {
      await apiFetch(`/api/partners/shared-accounts/${sharedAccountId}/deposit`, {
        method: 'POST',
        body: JSON.stringify({
          amountCentavos: amount,
          // Backend expects `fromAccountId` (parallel-task API); keep the web
          // client's `fundingAccountId` alias for forwards compatibility.
          fromAccountId: fundingAccountId,
          fundingAccountId,
          notes: notes?.trim() || undefined,
        }),
      });
      await loadSharedAccounts();
      return true;
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to deposit to shared account');
      return false;
    }
  };

  const handleSharedAccountExpense = async (
    sharedAccountId: string,
    amountStr: string,
    notes?: string
  ) => {
    const amount = parseToCentavos(amountStr);
    if (amount <= 0) {
      Alert.alert('Required', 'Please enter an amount greater than zero.');
      return false;
    }
    try {
      await apiFetch(`/api/partners/shared-accounts/${sharedAccountId}/expense`, {
        method: 'POST',
        body: JSON.stringify({
          amountCentavos: amount,
          notes: notes?.trim() || undefined,
        }),
      });
      await loadSharedAccounts();
      return true;
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to record shared expense');
      return false;
    }
  };

  return {
    partnerConnected,
    partnerName,
    inviteCode,
    inputCode,
    setInputCode,
    sharedGoals,
    sharedAccounts,
    sharedAccountsError,
    isSharedAccountsPending,
    accounts: accountsQuery.data?.accounts ?? [],
    loading,
    loadPartnerData,
    loadSharedAccounts,
    handleGenerateInvite,
    handleAcceptInvite,
    handleUnlink,
    handleCreateSharedGoal,
    handleCreateSharedAccount,
    handleContribute,
    handleDepositToSharedAccount,
    handleSharedAccountExpense,
  };
}
