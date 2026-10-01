import { QueryClient } from '@tanstack/react-query';

/**
 * Defaults for LOCAL (SQLite-backed) queries and mutations.
 *
 * - `networkMode: 'always'` — a local read must never pause just because the
 *   device is offline; it only touches SQLite.
 * - `staleTime: Infinity` — SQLite only changes through our own writes and
 *   sync, so we invalidate explicitly instead of refetching on a timer.
 * - `retry: false` — local reads/writes don't fail transiently.
 *
 * The few API-backed queries (shared goals, partner status) override these via
 * `apiQueryDefaults`.
 */
const defaultOptions = {
  queries: {
    networkMode: 'always',
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  },
  mutations: {
    networkMode: 'always',
    retry: false,
  },
} as const;

/** The single app-wide QueryClient instance. */
export const queryClient = new QueryClient({ defaultOptions });

/** Fresh client for tests (and any isolated runtime). */
export const createAppQueryClient = (): QueryClient => new QueryClient({ defaultOptions });
