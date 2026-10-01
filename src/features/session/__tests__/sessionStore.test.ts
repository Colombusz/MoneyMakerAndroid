import { beforeEach, describe, expect, it } from 'vitest';
import { useSessionStore } from '../sessionStore';
import type { UserProfile } from '../../../types';

const USER: UserProfile = { id: 'u1', email: 'a@b.c', name: 'A', currency: 'PHP' };

describe('sessionStore', () => {
  beforeEach(() => useSessionStore.getState().reset());

  it('starts with no user after reset', () => {
    expect(useSessionStore.getState().user).toBeNull();
    expect(useSessionStore.getState().status).toBe('loading');
  });

  it('marks the session authenticated when a user is set', () => {
    useSessionStore.getState().setUser(USER);
    expect(useSessionStore.getState().status).toBe('authenticated');
    expect(useSessionStore.getState().user?.id).toBe('u1');
  });

  it('marks the session unauthenticated when the user is cleared', () => {
    useSessionStore.getState().setUser(USER);
    useSessionStore.getState().setUser(null);
    expect(useSessionStore.getState().status).toBe('unauthenticated');
  });

  it('reset() (used by logout) drops the user and the status', () => {
    useSessionStore.getState().setUser(USER);
    useSessionStore.getState().reset();
    expect(useSessionStore.getState().user).toBeNull();
    expect(useSessionStore.getState().status).toBe('loading');
  });
});
