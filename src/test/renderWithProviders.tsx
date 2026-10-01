import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { createAppQueryClient } from '../query/queryClient';

/**
 * Fresh QueryClient per test with retries off (local defaults already do this).
 */
export const createTestQueryClient = (): QueryClient => createAppQueryClient();

/** Provider wrapper used by tests. */
export const QueryClientTestProvider: React.FC<{
  client?: QueryClient;
  children: React.ReactNode;
}> = ({ client, children }) => (
  <QueryClientProvider client={client ?? createTestQueryClient()}>
    {children}
  </QueryClientProvider>
);

/**
 * Wraps a component tree in a fresh QueryClientProvider for a test. Pair with
 * whatever renderer the test uses (this repo renders with plain React trees).
 */
export const renderWithProviders = (
  ui: React.ReactElement,
  client: QueryClient = createTestQueryClient()
): React.ReactElement => <QueryClientProvider client={client}>{ui}</QueryClientProvider>;
