import { create } from 'zustand';
import type { UserProfile } from '../../types';

/** Auth lifecycle status owned by the session store. */
export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

/**
 * Session store — the ONLY client-only source of truth for the signed-in user.
 *
 * The access token is deliberately NOT held here: it lives in memory in the API
 * client only and is never persisted through the state library. The refresh
 * token stays in expo-secure-store.
 */
export interface SessionState {
  user: UserProfile | null;
  status: AuthStatus;
  setUser: (user: UserProfile | null) => void;
  setStatus: (status: AuthStatus) => void;
  reset: () => void;
}

const createInitialState = (): Pick<SessionState, 'user' | 'status'> => ({
  user: null,
  status: 'loading',
});

export const useSessionStore = create<SessionState>((set) => ({
  ...createInitialState(),
  setUser: (user) =>
    set({ user, status: user ? 'authenticated' : 'unauthenticated' }),
  setStatus: (status) => set({ status }),
  reset: () => set(createInitialState()),
}));
