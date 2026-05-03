import React from 'react';
import styles from './SpendingTooltips.module.css';
import type { SpendingBudget } from '../../../types';

interface SpendingTooltipsProps {
    hoveredDate: string | null;
    tooltipPosition: { x: number; y: number } | null;
    budgets: SpendingBudget[];
    dayTotalsByBudget: Record<string, Record<string, number>> | null;
}

export function SpendingTooltips({
    hoveredDate,
    tooltipPosition,
    budgets,
    dayTotalsByBudget
}: SpendingTooltipsProps) {
    if (!hoveredDate || !tooltipPosition || !dayTotalsByBudget) return null;

    const totalsForDay = dayTotalsByBudget[hoveredDate] || {};
    const hasSpending = Object.keys(totalsForDay).length > 0;

    if (!hasSpending) return null;

    const formatCurrency = (val: number) => {
        return '$' + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    return (
        <div
            className={styles.chartTooltip}
            style={{
                left: tooltipPosition.x,
                top: tooltipPosition.y
            }}
        >
            <div className={styles.tooltipDate}>
                {new Date(hoveredDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </div>
            {budgets.map(b => {
                const amount = totalsForDay[b.id] || 0;
                if (amount === 0) return null;
                return (
                    <div key={b.id} className={styles.tooltipRow}>
                        <span className={styles.tooltipLabel}>{b.name}</span>
                        <span className={styles.tooltipValue}>{formatCurrency(amount)}</span>
                    </div>
                );
            })}
        </div>
    );
}
