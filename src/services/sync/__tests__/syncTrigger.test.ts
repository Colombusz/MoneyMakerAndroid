import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  scheduleSync,
  setSyncRunner,
  resetSyncTrigger,
  isSyncPending,
} from '../syncTrigger';

describe('syncTrigger debounced auto-sync', () => {
  let runner: ReturnType<typeof vi.fn<() => Promise<void>>>;

  beforeEach(() => {
    vi.useFakeTimers();
    resetSyncTrigger();
    const mock = vi.fn(async () => {});
    runner = mock as unknown as ReturnType<typeof vi.fn<() => Promise<void>>>;
    setSyncRunner(runner as unknown as () => Promise<unknown>);
  });

  afterEach(() => {
    vi.useRealTimers();
    resetSyncTrigger();
  });

  it('does not sync immediately on write', () => {
    scheduleSync();
    expect(runner).not.toHaveBeenCalled();
  });

  it('flushes after the debounce window', async () => {
    scheduleSync();
    await vi.advanceTimersByTimeAsync(2500);
    expect(runner).toHaveBeenCalledTimes(1);
  });

  // A goal contribution writes a transaction AND a contribution record, so a
  // single user action produces several enqueues.
  it('collapses a burst of writes into one sync', async () => {
    for (let i = 0; i < 5; i++) {
      scheduleSync();
      await vi.advanceTimersByTimeAsync(200);
    }
    await vi.advanceTimersByTimeAsync(2500);
    expect(runner).toHaveBeenCalledTimes(1);
  });

  it('reschedules when a write lands mid-window', async () => {
    scheduleSync();
    await vi.advanceTimersByTimeAsync(2000);
    scheduleSync(); // new write pushes the deadline out
    await vi.advanceTimersByTimeAsync(1000);
    expect(runner).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1500);
    expect(runner).toHaveBeenCalledTimes(1);
  });

  it('reports pending state while a sync is queued', () => {
    scheduleSync();
    expect(isSyncPending()).toBe(true);
    resetSyncTrigger();
    expect(isSyncPending()).toBe(false);
  });

  it('swallows runner errors so a failed sync does not break the write', async () => {
    runner.mockRejectedValue(new Error('offline'));
    scheduleSync();
    await vi.advanceTimersByTimeAsync(2500);
    // No unhandled rejection escaped.
    expect(runner).toHaveBeenCalledTimes(1);
  });

  it('never stacks concurrent syncs', async () => {
    let release: () => void = () => {};
    runner.mockImplementation(
      () => new Promise<void>((resolve) => { release = resolve; })
    );

    scheduleSync();
    await vi.advanceTimersByTimeAsync(2500);
    expect(runner).toHaveBeenCalledTimes(1);

    // A write while the first sync is still running must not start a second.
    scheduleSync();
    await vi.advanceTimersByTimeAsync(2500);
    expect(runner).toHaveBeenCalledTimes(1);

    release();
    await vi.advanceTimersByTimeAsync(0);
  });

  it('does nothing when no runner is registered yet', async () => {
    resetSyncTrigger();
    setSyncRunner(null as unknown as () => Promise<unknown>);
    scheduleSync();
    await vi.advanceTimersByTimeAsync(2500);
    expect(runner).not.toHaveBeenCalled();
  });
});
