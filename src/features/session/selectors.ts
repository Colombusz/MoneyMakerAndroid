import { useSessionStore, type SessionState } from './sessionStore';

export const selectCurrentUser = (state: SessionState) => state.user;
export const selectAuthStatus = (state: SessionState) => state.status;
export const selectIsAuthenticated = (state: SessionState) => state.status === 'authenticated';
export const selectUserId = (state: SessionState) => state.user?.id ?? null;

// Named selector hooks — components read through these, never inline selectors.
export const useCurrentUser = () => useSessionStore(selectCurrentUser);
export const useAuthStatus = () => useSessionStore(selectAuthStatus);
export const useIsAuthenticated = () => useSessionStore(selectIsAuthenticated);
export const useUserId = () => useSessionStore(selectUserId);
