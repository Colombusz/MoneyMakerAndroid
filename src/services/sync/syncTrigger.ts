/**
 * Debounced auto-sync trigger.
 *
 * Every local write goes through `enqueueChange`, which calls `scheduleSync()`.
 * Writes burst (a contribution writes both a transaction and a contribution
 * record), so requests are debounced into a single sync. The actual sync is
 * injected via `setSyncRunner` to keep this module dependency-free — that also
 * avoids a circular import, since the runner itself needs the outbox.
 */

const DEBOUNCE_MS = 2500;

let timer: ReturnType<typeof setTimeout> | null = null;
let inFlight = false;
let runner: (() => Promise<unknown>) | null = null;

export const setSyncRunner = (fn: () => Promise<unknown>): void => {
  runner = fn;
};

/** True while a sync is queued or running — used by tests and the status badge. */
export const isSyncPending = (): boolean => timer !== null || inFlight;

export const scheduleSync = (): void => {
  if (!runner) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void flush();
  }, DEBOUNCE_MS);
};

const flush = async (): Promise<void> => {
  // Never stack syncs; a long-running one is left to finish.
  if (inFlight || !runner) return;
  inFlight = true;
  try {
    await runner();
  } catch {
    // Offline or failed. The outbox keeps the changes queued and the next write
    // (or a manual sync) retries them — nothing is lost.
  } finally {
    inFlight = false;
  }
};

/** Test seam: drop any queued timer and in-flight flag. */
export const resetSyncTrigger = (): void => {
  if (timer) clearTimeout(timer);
  timer = null;
  inFlight = false;
};