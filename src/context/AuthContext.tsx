import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, SyncStatus } from '../types';
import { initDatabase } from '../db/sqlite';
import { ensureDefaultCategories } from '../db/categoryRepo';
import { ensureDefaultAccounts } from '../db/accountRepo';
import { getMetadata, setMetadata, getPendingChanges } from '../db/outboxRepo';
import { saveTokens, getAccessToken, clearTokens } from '../services/secureStorage';
import { apiFetch } from '../services/apiClient';
import { syncWithBackend, subscribeSyncStatus } from '../services/syncEngine';
import { setSyncRunner } from '../services/sync/syncTrigger';
import { generateUUID } from '../utils/uuid';

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  syncStatus: SyncStatus;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  syncNow: () => Promise<void>;
  updateUserCurrency: (currency: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  syncStatus: 'offline',
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  syncNow: async () => {},
  updateUserCurrency: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('offline');

  useEffect(() => {
    const unsub = subscribeSyncStatus(setSyncStatus);
    bootstrap();
    return () => unsub();
  }, []);

  const bootstrap = async () => {
    try {
      // 1. Initialize SQLite database
      await initDatabase();

      // 2. Check for local stored user or active session
      let storedUserId = await getMetadata('current_user_id');
      let storedUserEmail = await getMetadata('current_user_email');
      let storedUserName = await getMetadata('current_user_name');
      let storedUserCurrency = (await getMetadata('current_user_currency')) || 'PHP';

      if (!storedUserId) {
        // Create initial local offline identity
        storedUserId = generateUUID();
        storedUserEmail = 'offline@moneysaver.local';
        storedUserName = 'My Wallet';
        await setMetadata('current_user_id', storedUserId);
        await setMetadata('current_user_email', storedUserEmail);
        await setMetadata('current_user_name', storedUserName);
        await setMetadata('current_user_currency', storedUserCurrency);
      }

      await ensureDefaultCategories(storedUserId);
      await ensureDefaultAccounts(storedUserId);

      setUser({
        id: storedUserId,
        email: storedUserEmail || 'offline@moneysaver.local',
        name: storedUserName || 'My Wallet',
        currency: storedUserCurrency,
      });

      // 3. If access token exists, verify with server and sync
      const token = await getAccessToken();
      if (token) {
        try {
          const profile = await apiFetch<{ user: any }>('/api/auth/me');
          if (profile?.user) {
            setUser({
              id: profile.user.id,
              email: profile.user.email,
              name: profile.user.name,
              currency: profile.user.currency,
              partner: profile.user.partner,
            });
            await setMetadata('current_user_id', profile.user.id);
            await setMetadata('current_user_email', profile.user.email);
            await setMetadata('current_user_name', profile.user.name);
            await setMetadata('current_user_currency', profile.user.currency);

            // Sync with backend
            syncWithBackend(profile.user.id);
          }
        } catch (_e) {
          // Token invalid or offline, stay in local offline mode
          console.log('Working in offline mode');
        }
      }
    } catch (err) {
      console.error('Auth bootstrap failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const data = await apiFetch<{ user: any; accessToken: string; refreshToken: string }>(
        '/api/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ email, password }),
          skipAuth: true,
        }
      );

      await saveTokens(data.accessToken, data.refreshToken);
      const loggedInUser: UserProfile = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        currency: data.user.currency,
        partner: data.user.partner,
      };

      setUser(loggedInUser);
      await setMetadata('current_user_id', loggedInUser.id);
      await setMetadata('current_user_email', loggedInUser.email);
      await setMetadata('current_user_name', loggedInUser.name);
      await setMetadata('current_user_currency', loggedInUser.currency);

      await ensureDefaultCategories(loggedInUser.id);
      await ensureDefaultAccounts(loggedInUser.id);
      await syncWithBackend(loggedInUser.id);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string) => {
    setIsLoading(true);
    try {
      const data = await apiFetch<{ user: any; accessToken: string; refreshToken: string }>(
        '/api/auth/register',
        {
          method: 'POST',
          body: JSON.stringify({ email, password, name }),
          skipAuth: true,
        }
      );

      await saveTokens(data.accessToken, data.refreshToken);
      const newUser: UserProfile = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        currency: data.user.currency,
      };

      setUser(newUser);
      await setMetadata('current_user_id', newUser.id);
      await setMetadata('current_user_email', newUser.email);
      await setMetadata('current_user_name', newUser.name);
      await setMetadata('current_user_currency', newUser.currency);

      await ensureDefaultCategories(newUser.id);
      await ensureDefaultAccounts(newUser.id);
      await syncWithBackend(newUser.id);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Flush anything still queued while we still hold the current identity.
      // Switching the local user id first would strand those changes in the
      // outbox, and they would later be pushed stamped with a different account.
      const currentUserId = await getMetadata('current_user_id');
      if (currentUserId) {
        await syncWithBackend(currentUserId);
      }

      await clearTokens();
      // Reset to local offline user
      const guestId = generateUUID();
      await setMetadata('current_user_id', guestId);
      await setMetadata('current_user_email', 'offline@moneysaver.local');
      await setMetadata('current_user_name', 'My Wallet');
      await setMetadata('last_sync_cursor', '');

      setUser({
        id: guestId,
        email: 'offline@moneysaver.local',
        name: 'My Wallet',
        currency: 'PHP',
      });
      await ensureDefaultCategories(guestId);
      await ensureDefaultAccounts(guestId);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const syncNow = async () => {
    if (!user) return;
    await syncWithBackend(user.id);
  };

  /**
   * Register what `scheduleSync()` should actually run. Injected here rather than
   * imported by the trigger module to avoid a circular dependency (the sync
   * engine itself reads the outbox). Nothing is sent unless there is genuinely
   * queued work, so idle writes cost nothing.
   */
  useEffect(() => {
    setSyncRunner(async () => {
      const userId = await getMetadata('current_user_id');
      if (!userId) return;
      const pending = await getPendingChanges();
      if (pending.length === 0) return;
      await syncWithBackend(userId);
    });
  }, []);

  const updateUserCurrency = async (currency: string) => {
    if (!user) return;
    setUser((prev) => (prev ? { ...prev, currency } : null));
    await setMetadata('current_user_currency', currency);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        syncStatus,
        login,
        register,
        logout,
        syncNow,
        updateUserCurrency,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
