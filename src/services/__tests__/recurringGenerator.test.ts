import { describe, it, expect } from 'vitest';
import { computeNextOccurrenceDate, generateOccurrencesFromRules } from '../recurringGenerator';
import { RecurringRule, RecurringOverride } from '../../types';

describe('recurringGenerator (Android)', () => {
  describe('computeNextOccurrenceDate', () => {
    it('computes next day for daily', () => {
      const d = new Date('2026-09-01T00:00:00Z');
      const next = computeNextOccurrenceDate(d, 'daily');
      expect(next.getDate()).toBe(2);
    });

    it('computes next week for weekly', () => {
      const d = new Date('2026-09-01T00:00:00Z');
      const next = computeNextOccurrenceDate(d, 'weekly');
      expect(next.getDate()).toBe(8);
    });

    it('computes next month for monthly', () => {
      const d = new Date('2026-09-01T00:00:00Z');
      const next = computeNextOccurrenceDate(d, 'monthly');
      expect(next.getMonth()).toBe(9); // October (0-indexed 9)
    });

    it('computes next year for yearly', () => {
      const d = new Date('2026-09-01T00:00:00Z');
      const next = computeNextOccurrenceDate(d, 'yearly');
      expect(next.getFullYear()).toBe(2027);
    });

    it('computes custom interval days', () => {
      const d = new Date('2026-09-01T00:00:00Z');
      const next = computeNextOccurrenceDate(d, 'custom', 14);
      expect(next.getDate()).toBe(15);
    });
  });

  describe('generateOccurrencesFromRules', () => {
    const mockRule: RecurringRule = {
      id: 'rule-1',
      userId: 'user-1',
      accountId: 'acc-1',
      categoryId: 'cat-1',
      type: 'expense',
      amountCentavos: 50000,
      frequency: 'monthly',
      intervalDays: null,
      startDate: new Date('2026-01-01T00:00:00Z').getTime(),
      endDate: null,
      maxOccurrences: null,
      notes: 'Netflix',
      updatedAt: Date.now(),
      deletedAt: null,
    };

    it('generates occurrences within range', () => {
      const rangeStart = new Date('2026-03-01T00:00:00Z').getTime();
      const rangeEnd = new Date('2026-05-01T00:00:00Z').getTime();

      const occs = generateOccurrencesFromRules([mockRule], [], rangeStart, rangeEnd);
      expect(occs.length).toBeGreaterThanOrEqual(2);
      expect(occs[0].notes).toBe('Netflix');
      expect(occs[0].amountCentavos).toBe(50000);
      expect(occs[0].status).toBe('pending');
    });

    it('applies overrides properly (e.g. paid status or modified amount)', () => {
      const rangeStart = new Date('2026-03-01T00:00:00Z').getTime();
      const rangeEnd = new Date('2026-05-01T00:00:00Z').getTime();

      const override: RecurringOverride = {
        id: 'ov-1',
        userId: 'user-1',
        recurringRuleId: 'rule-1',
        occurrenceDate: new Date('2026-03-01T00:00:00Z').getTime(),
        status: 'paid',
        updatedAt: Date.now(),
        deletedAt: null,
      };

      const occs = generateOccurrencesFromRules([mockRule], [override], rangeStart, rangeEnd);
      const marchOcc = occs.find((o) => o.date === '2026-03-01');
      expect(marchOcc?.status).toBe('paid');
    });
  });
});
