import { describe, it, expect } from 'vitest';
import { getTransactionLabel, getTransactionTitle } from '../transactionLabel';
import { Category, Transaction } from '../../../types';

const salary: Category = {
  id: 'cat-salary',
  userId: 'u1',
  name: 'Salary',
  type: 'income',
  icon: 'briefcase',
  color: '#10B981',
  isDefault: true,
  updatedAt: 0,
};

const entertainment: Category = {
  ...salary,
  id: 'cat-ent',
  name: 'Entertainment',
  type: 'expense',
};

const tx = (over: Partial<Transaction>): Transaction =>
  ({
    id: 't1',
    userId: 'u1',
    accountId: 'a1',
    type: 'expense',
    amountCentavos: 10000,
    date: 0,
    updatedAt: 0,
    ...over,
  }) as Transaction;

describe('getTransactionLabel', () => {
  it('prefers the category name over free text', () => {
    const t = tx({ type: 'income', categoryId: salary.id, source: 'Employer' });
    expect(getTransactionLabel(t, salary).title).toBe('Salary');
  });

  it('keeps the payer/notes as a subtitle when the category wins', () => {
    const t = tx({ type: 'income', categoryId: salary.id, source: 'Employer', notes: 'August' });
    expect(getTransactionLabel(t, salary)).toEqual({
      title: 'Salary',
      detail: 'Employer',
    });
  });

  it('falls back to the income source when there is no category match', () => {
    const t = tx({ type: 'income', source: 'Employer' });
    expect(getTransactionTitle(t, undefined)).toBe('Employer');
  });

  it('falls back to notes, and never returns null for a nameless record', () => {
    expect(getTransactionTitle(tx({ notes: 'sgabu' }), undefined)).toBe('sgabu');
    expect(getTransactionTitle(tx({ type: 'expense' }), undefined)).toBe('Expense');
    expect(getTransactionTitle(tx({ type: 'income' }), undefined)).toBe('Income');
  });

  it('does not repeat the title in the detail', () => {
    const t = tx({ notes: 'sgabu' });
    expect(getTransactionLabel(t, undefined)).toEqual({ title: 'sgabu', detail: null });
  });

  it('ignores whitespace-only text', () => {
    const t = tx({ notes: '   ', source: '  ' });
    expect(getTransactionTitle(t, undefined)).toBe('Expense');
  });

  it('uses the category name for expenses so app and web agree', () => {
    const t = tx({ categoryId: entertainment.id, notes: 'sgabu' });
    expect(getTransactionLabel(t, entertainment)).toEqual({
      title: 'Entertainment',
      detail: 'sgabu',
    });
  });

  it('labels shared goal contributions with goalId', () => {
    const t = tx({ goalId: 'goal-123', notes: 'Contribution to vacation fund' });
    expect(getTransactionLabel(t, undefined)).toEqual({
      title: 'Shared Goal Contribution',
      detail: 'Contribution to vacation fund',
    });
  });

  it('labels shared account deposits with sharedAccountId', () => {
    const t = tx({ sharedAccountId: 'shared-acc-456', notes: 'Monthly rent share' });
    expect(getTransactionLabel(t, undefined)).toEqual({
      title: 'Shared Account Deposit',
      detail: 'Monthly rent share',
    });
  });

  it('prefers goalId over sharedAccountId when both present', () => {
    const t = tx({ goalId: 'goal-123', sharedAccountId: 'shared-acc-456' });
    expect(getTransactionLabel(t, undefined).title).toBe('Shared Goal Contribution');
  });
});