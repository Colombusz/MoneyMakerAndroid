import { RecurringRule, RecurringOverride } from '../types';

export interface MobileProjectedOccurrence {
  ruleId: string;
  date: string; // YYYY-MM-DD
  dateTime: number; // epoch ms
  amountCentavos: number;
  accountId: string;
  categoryId: string;
  type: 'expense' | 'income';
  notes: string;
  status: 'pending' | 'skipped' | 'paid' | 'modified';
  transactionId?: string | null;
}

export function computeNextOccurrenceDate(
  date: Date,
  frequency: string,
  intervalDays?: number | null
): Date {
  const next = new Date(date);
  switch (frequency) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'yearly':
      next.setFullYear(next.getFullYear() + 1);
      break;
    case 'custom':
      next.setDate(next.getDate() + (intervalDays || 1));
      break;
    default:
      next.setMonth(next.getMonth() + 1);
      break;
  }
  return next;
}

export function generateOccurrencesFromRules(
  rules: RecurringRule[],
  overrides: (RecurringOverride & {
    overrideAmountCentavos?: number | null;
    transactionId?: string | null;
  })[],
  rangeStartMs: number,
  rangeEndMs: number
): MobileProjectedOccurrence[] {
  const overrideMap = new Map<string, any>();
  for (const ov of overrides) {
    const dateKey = new Date(ov.occurrenceDate).toISOString().split('T')[0];
    overrideMap.set(`${ov.recurringRuleId}_${dateKey}`, ov);
  }

  const occurrences: MobileProjectedOccurrence[] = [];
  const rangeEnd = new Date(rangeEndMs);

  for (const rule of rules) {
    let current = new Date(rule.startDate);
    const ruleEnd = rule.endDate ? new Date(rule.endDate) : null;
    let count = 0;
    let iterations = 0;

    while (iterations++ < 2000) {
      if (ruleEnd && current > ruleEnd) break;
      if (rule.maxOccurrences && count >= rule.maxOccurrences) break;
      if (current > rangeEnd) break;

      const dateKey = current.toISOString().split('T')[0];
      const curTime = current.getTime();

      if (curTime >= rangeStartMs && curTime <= rangeEndMs) {
        const override = overrideMap.get(`${rule.id}_${dateKey}`);
        if (override) {
          occurrences.push({
            ruleId: rule.id,
            date: dateKey,
            dateTime: curTime,
            amountCentavos: override.overrideAmountCentavos ?? rule.amountCentavos,
            accountId: rule.accountId,
            categoryId: rule.categoryId,
            type: rule.type,
            notes: rule.notes || '',
            status: override.status,
            transactionId: override.transactionId,
          });
        } else {
          occurrences.push({
            ruleId: rule.id,
            date: dateKey,
            dateTime: curTime,
            amountCentavos: rule.amountCentavos,
            accountId: rule.accountId,
            categoryId: rule.categoryId,
            type: rule.type,
            notes: rule.notes || '',
            status: 'pending',
          });
        }
      }

      count++;
      current = computeNextOccurrenceDate(current, rule.frequency, rule.intervalDays);
    }
  }

  occurrences.sort((a, b) => a.dateTime - b.dateTime);
  return occurrences;
}
