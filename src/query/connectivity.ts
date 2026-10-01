import { onlineManager } from '@tanstack/react-query';
import * as Network from 'expo-network';

const isOnline = (state: Network.NetworkState): boolean =>
  Boolean(state.isConnected && state.isInternetReachable !== false);

/**
 * Wires TanStack Query's `onlineManager` to the app's connectivity source
 * (expo-network) so that API-backed queries pause while offline while local
 * SQLite queries (networkMode 'always') keep working.
 *
 * Called once at the app root.
 */
export const wireOnlineManager = (): void => {
  onlineManager.setEventListener((setOnline) => {
    const subscription = Network.addNetworkStateListener((state) => {
      setOnline(isOnline(state));
    });
    Network.getNetworkStateAsync()
      .then((state) => setOnline(isOnline(state)))
      .catch(() => {
        /* keep the last known state */
      });
    return () => subscription.remove();
  });
};
