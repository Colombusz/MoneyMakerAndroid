import { beforeEach, describe, expect, it, vi } from 'vitest';

// Repositories import expo-sqlite at module load; block it so the test only
// exercises the injected Node-backed database.
vi.mock('expo-sqlite', () => ({
  openDatabaseSync: () => {
    throw new Error('expo-sqlite must not be used inside tests');
  },
}));

import { initDatabase, setDatabaseForTesting } from '../sqlite';
import { createNodeSqliteDatabase } from '../../test/nodeSqliteDatabase';
import { createAccount, getAccounts } from '../accountRepo';
import { createRecurringRule, getRecurringRules, generateOccurrences, payOccurrence, skipOccurrence } from '../recurringRepo';

const USER = 'user-1';

const newRule = (accountId: string, amountCentavos: number, startDate: number) =>
  createRecurringRule(USER, {
    accountId,
    categoryId: 'cat-housing',
    type: 'expense',
    amountCentavos,
    frequency: 'monthly',
    intervalDays: null,
    startDate,
    notes: 'Rent',
  });

beforeEach(async () => {
  setDatabaseForTesting(createNodeSqliteDatabase());
  await initDatabase();
});

describe('recurringRepo against a real SQLite database', () => {
  it('persists a rule and reads it back', async () => {
    const account = await createAccount(USER, 'Cash', 'cash', 100_000);
    const rule = await newRule(account.id, 5_000, Date.now());

    expect(rule.id).toBeTruthy();

    const rules = await getRecurringRules(USER);
    expect(rules).toHaveLength(1);
    expect(rules[0].notes).toBe('Rent');
    expect(rules[0].amountCentavos).toBe(5_000);
  });

  it('paying an occurrence debits the account balance', async () => {
    const account = await createAccount(USER, 'Cash', 'cash', 100_000);
    const rule = await newRule(account.id, 30_000, Date.now());

    const now = Date.now();
    const occurrences = await generateOccurrences(USER, now - 86_400_000, now + 86_400_000 * 60);
    expect(occurrences.length).toBeGreaterThan(0);

    await payOccurrence(USER, rule.id, occurrences[0].dateTime, occurrences[0].amountCentavos);

    const { totalBalanceCentavos } = await getAccounts(USER);
    expect(totalBalanceCentavos).toBe(70_000);
  });

  it('marks the paid occurrence so it cannot be paid twice', async () => {
    const account = await createAccount(USER, 'Cash', 'cash', 100_000);
    const rule = await newRule(account.id, 30_000, Date.now());

    const now = Date.now();
    const occurrences = await generateOccurrences(USER, now - 86_400_000, now + 86_400_000 * 60);
    await payOccurrence(USER, rule.id, occurrences[0].dateTime, occurrences[0].amountCentavos);

    const after = await generateOccurrences(USER, now - 86_400_000, now + 86_400_000 * 60);
    const first = after.find((o) => o.date === occurrences[0].date);
    expect(first?.status).toBe('paid');
  });

  it('debits the account chosen at payment time, not the rule account', async () => {
    const ruleAccount = await createAccount(USER, 'Rule Account', 'cash', 100_000);
    const chosen = await createAccount(USER, 'Chosen Account', 'savings', 100_000);

    const rule = await newRule(ruleAccount.id, 30_000, Date.now());

    const now = Date.now();
    const occurrences = await generateOccurrences(USER, now - 86_400_000, now + 86_400_000 * 60);
    await payOccurrence(
      USER,
      rule.id,
      occurrences[0].dateTime,
      occurrences[0].amountCentavos,
      undefined,
      chosen.id
    );

    const { accounts } = await getAccounts(USER);
    const byId = new Map(accounts.map((a) => [a.id, a.currentBalanceCentavos]));

    // The payment leaves the account the user picked...
    expect(byId.get(chosen.id)).toBe(70_000);
    // ...and leaves the rule's own account untouched.
    expect(byId.get(ruleAccount.id)).toBe(100_000);
  });

  it('falls back to the rule account when no account is specified', async () => {
    const ruleAccount = await createAccount(USER, 'Rule Account', 'cash', 100_000);
    const rule = await newRule(ruleAccount.id, 30_000, Date.now());

    const now = Date.now();
    const occurrences = await generateOccurrences(USER, now - 86_400_000, now + 86_400_000 * 60);
    await payOccurrence(USER, rule.id, occurrences[0].dateTime, occurrences[0].amountCentavos);

    const { accounts } = await getAccounts(USER);
    expect(accounts[0].currentBalanceCentavos).toBe(70_000);
  });

  it('refuses to pay from an account the user does not own', async () => {
    const ruleAccount = await createAccount(USER, 'Rule Account', 'cash', 100_000);
    const rule = await newRule(ruleAccount.id, 30_000, Date.now());

    const now = Date.now();
    const occurrences = await generateOccurrences(USER, now - 86_400_000, now + 86_400_000 * 60);

    await expect(
      payOccurrence(
        USER,
        rule.id,
        occurrences[0].dateTime,
        occurrences[0].amountCentavos,
        undefined,
        'someone-elses-account'
      )
    ).rejects.toThrow('Payment account not found');

    // Nothing was debited.
    const { accounts } = await getAccounts(USER);
    expect(accounts[0].currentBalanceCentavos).toBe(100_000);
  });

  it('skipping an occurrence leaves the balance untouched', async () => {
    const account = await createAccount(USER, 'Cash', 'cash', 100_000);
    const rule = await newRule(account.id, 30_000, Date.now());

    const now = Date.now();
    const occurrences = await generateOccurrences(USER, now - 86_400_000, now + 86_400_000 * 60);
    await skipOccurrence(USER, rule.id, occurrences[0].dateTime);

    const { totalBalanceCentavos } = await getAccounts(USER);
    expect(totalBalanceCentavos).toBe(100_000);

    const after = await generateOccurrences(USER, now - 86_400_000, now + 86_400_000 * 60);
    expect(after.find((o) => o.date === occurrences[0].date)?.status).toBe('skipped');
  });
});
