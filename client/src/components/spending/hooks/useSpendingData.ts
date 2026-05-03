import { useMemo } from 'react';
import type { SpendingTransaction, SpendingBudget } from '../../../types';

export function useSpendingData(
  currentDate: Date,
  transactions: SpendingTransaction[],
  budgets: SpendingBudget[]
) {
  /**
   * We generate an array of all days in the currently viewed month (e.g. 'YYYY-MM-DD').
   * This is used to map out the DayColumns in the UI layout and ensure that
   * every single day is rendered, even if it has no transactions.
   */
  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const days = new Date(year, month + 1, 0).getDate();

    const result = [];
    for (let i = 1; i <= days; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      result.push(dateStr);
    }
    return result;
  }, [currentDate]);

  /**
   * The daily limit assumes an equal distribution of all budget amounts
   * across all the days in the currently viewed month.
   */
  const dailyLimit = daysInMonth.length > 0
    ? budgets.reduce((sum, b) => sum + b.amount, 0) / daysInMonth.length
    : 0;

  /**
   * Group all transactions by their date string so that the DayColumn components
   * can quickly look up their respective data without iterating the full list.
   */
  const groupedTransactions = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => {
      // Primary sort: date
      if (a.date !== b.date) {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      // Secondary sort: createdAt
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return aTime - bTime;
    });
    const groups: Record<string, SpendingTransaction[]> = {};
    for (const t of sorted) {
      if (!groups[t.date]) groups[t.date] = [];
      groups[t.date].push(t);
    }
    return groups;
  }, [transactions]);

  /**
   * We calculate exactly how much was spent on each day, and exactly
   * how that daily total is broken down by budget ID. 
   * This data is specifically structured for the stacked bar chart.
   */
  const { dayTotals, dayTotalsByBudget } = useMemo(() => {
    const totals: Record<string, number> = {};
    const byBudget: Record<string, Record<string, number>> = {};
    let max = 0;

    for (const dateStr of daysInMonth) {
      const dayTransactions = groupedTransactions[dateStr] || [];
      const dayTotal = dayTransactions.reduce((sum, t) => sum + t.amount, 0);
      totals[dateStr] = dayTotal;
      if (dayTotal > max) max = dayTotal;

      byBudget[dateStr] = {};
      for (const t of dayTransactions) {
        const bId = t.budgetId || 'unassigned';
        if (!byBudget[dateStr][bId]) byBudget[dateStr][bId] = 0;
        byBudget[dateStr][bId] += t.amount;
      }
    }
    
    return { 
      dayTotals: { totals, max }, 
      dayTotalsByBudget: byBudget 
    };
  }, [daysInMonth, groupedTransactions]);

  const totalBudget = useMemo(() => budgets.reduce((sum, b) => sum + b.amount, 0), [budgets]);
  const totalSpent = useMemo(() => transactions.reduce((sum, t) => sum + t.amount, 0), [transactions]);
  
  const spentByBudget = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of transactions) {
      const bId = t.budgetId || 'unassigned';
      map[bId] = (map[bId] || 0) + t.amount;
    }
    return map;
  }, [transactions]);

  return {
    daysInMonth,
    dailyLimit,
    groupedTransactions,
    dayTotals,
    dayTotalsByBudget,
    totalBudget,
    totalSpent,
    spentByBudget
  };
}
