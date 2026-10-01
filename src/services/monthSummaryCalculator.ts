import { Transaction } from '../types';

export interface MonthSummary {
  year: number;
  month: number;
  totalIncomeCentavos: number;
  totalExpenseCentavos: number;
  netCentavos: number;
  categoryTotals: Record<string, number>;
  dailyBreakdown: Record<
    string,
    { incomeCentavos: number; expenseCentavos: number; count: number }
  >;
}

export function calculateMonthSummary(
  transactions: Transaction[],
  year: number,
  month: number
): MonthSummary {
  let totalIncomeCentavos = 0;
  let totalExpenseCentavos = 0;
  const categoryTotals: Record<string, number> = {};
  const dailyBreakdown: Record<
    string,
    { incomeCentavos: number; expenseCentavos: number; count: number }
  > = {};

  for (const t of transactions) {
    const dateObj = new Date(t.date);
    const dayKey = dateObj.toISOString().split('T')[0];

    if (!dailyBreakdown[dayKey]) {
      dailyBreakdown[dayKey] = { incomeCentavos: 0, expenseCentavos: 0, count: 0 };
    }
    dailyBreakdown[dayKey].count += 1;

    if (t.type === 'income') {
      totalIncomeCentavos += t.amountCentavos;
      dailyBreakdown[dayKey].incomeCentavos += t.amountCentavos;
    } else if (t.type === 'expense') {
      totalExpenseCentavos += t.amountCentavos;
      dailyBreakdown[dayKey].expenseCentavos += t.amountCentavos;
      // Shared goal contributions and shared account deposits have no categoryId
      // but carry goalId/sharedAccountId — group them under virtual categories
      // so the pie chart / legend shows "Shared Goal Contribution" etc.
      // instead of leaving them as "Uncategorized".
      const catKey = t.categoryId
        ? t.categoryId
        : t.goalId
          ? '__shared_goal__'
          : t.sharedAccountId
            ? '__shared_account__'
            : '__uncategorized__';
      categoryTotals[catKey] = (categoryTotals[catKey] || 0) + t.amountCentavos;
    }
    // Note: transfers are strictly omitted from income & expense totals
  }

  return {
    year,
    month,
    totalIncomeCentavos,
    totalExpenseCentavos,
    netCentavos: totalIncomeCentavos - totalExpenseCentavos,
    categoryTotals,
    dailyBreakdown,
  };
}
