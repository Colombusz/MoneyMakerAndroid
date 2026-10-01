/**
 * Overrides for the handful of API-backed queries (shared goals, partner
 * status). Unlike local SQLite reads, these depend on the network, so they
 * pause while offline (`networkMode: 'online'`), hold a finite `staleTime`, and
 * retry like a normal network request.
 */
export const API_QUERY_STALE_TIME_MS = 30_000;

export const apiQueryDefaults = {
  networkMode: 'online',
  staleTime: API_QUERY_STALE_TIME_MS,
  retry: 2,
} as const;
