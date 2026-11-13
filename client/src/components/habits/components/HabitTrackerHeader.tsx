import React, { forwardRef } from 'react';
import { VideoCameraIcon } from '@phosphor-icons/react';
import { DateUtility } from '../../../utils';
import { TimeFilterButtons } from './TimeFilterButtons';
import { HabitTimeIcon } from './habitTimeConfig';
import type { Habit, Vlog } from '../../../types';
import { useIsMobile } from '../../../hooks/useLayout';
import styles from '../HabitTracker.module.css';

interface HabitTrackerHeaderProps {
    weeks: { key: string; start: Date; end: Date; days: Date[] }[];
    expandedWeeks: Set<string>;
    vlogs: Map<string, Vlog>;
    loomSupported: boolean;
    selectedTimeFilter: string | null;
    onFilterChange: (filter: string | null) => void;
    chartData: any[];
    habits: Habit[];
    onToggleWeek: (weekKey: string) => void;
    onVlogClick: (weekStart: Date, e: React.MouseEvent) => void;
    getDayStats: (date: Date) => { percentage: number; totalCount: number; successCount: number; breakdown: Record<string, { success: number; total: number }> };
    showInsights: boolean;
    onToggleInsights: () => void;
    showSections: boolean;
    onToggleSections: () => void;
}


export const HabitTrackerHeader = forwardRef<HTMLTableSectionElement, HabitTrackerHeaderProps>(({
    weeks,
    expandedWeeks,
    vlogs,
    loomSupported,
    selectedTimeFilter,
    onFilterChange,
    chartData,
    habits,
    onToggleWeek,
    onVlogClick,
    getDayStats,
    showInsights,
    onToggleInsights,
    showSections,
    onToggleSections,
}, ref) => {
    const isMobile = useIsMobile();

    return (
        <thead id="table-head" ref={ref}>
            <tr>
                <th className={styles.trendsHeader} aria-label="Habits">
                    {!isMobile && (
                        <TimeFilterButtons
                            selectedTimeFilter={selectedTimeFilter}
                            onFilterChange={onFilterChange}
                            chartData={chartData}
                            habits={habits}
                            showInsights={showInsights}
                            onToggleInsights={onToggleInsights}
                            showSections={showSections}
                            onToggleSections={onToggleSections}
                        />
                    )}
                </th>
                {!showInsights && weeks.map((week) => {
                    const isExpanded = expandedWeeks.has(week.key);
                    const hasVlog = vlogs.has(week.key);
                    const weekStart = new Date(week.key + 'T00:00:00');

                    if (!isExpanded) {
                        return (
                            <th
                                key={week.key}
                                className={styles.weekSummaryHeader}
                                onClick={() => onToggleWeek(week.key)}
                                style={isMobile ? { cursor: 'pointer' } : { cursor: 'pointer', minWidth: '120px' }}
                            >
                                <div className={styles.dayHeader} style={{ flexDirection: 'column', gap: '3px', alignItems: 'center', justifyContent: 'center' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span className={styles.dayName}>
                                            {DateUtility.getDayName(week.start)} {DateUtility.getDayNumber(week.start)} - {DateUtility.getDayName(week.end)} {DateUtility.getDayNumber(week.end)}
                                        </span>
                                    </div>
                                </div>
                            </th>
                        );
                    }

                    return week.days.map((date, idx) => {
                        const isSunday = date.getDay() === 0; // Changed from Saturday since array is reversed
                        const stats = getDayStats(date);

                        return (
                            <React.Fragment key={`${week.key}-${idx}`}>
                                <th
                                    colSpan={1}
                                    className={DateUtility.isToday(date) ? styles.todayColumn : ''}
                                    style={DateUtility.isToday(date) && !isMobile ? { minWidth: '120px' } : undefined}
                                >
                                    <div className={styles.dayHeader} style={{ position: 'relative' }}>
                                        <span className={`${styles.dayName} ${DateUtility.isToday(date) ? styles.today : ''}`}>
                                            {DateUtility.getDayName(date)}
                                        </span>
                                        <span className={`${styles.dayDate} ${DateUtility.isToday(date) ? styles.today : ''}`}>
                                            {DateUtility.getDayNumber(date)}
                                        </span>

                                        <div className={styles.dayStatsTooltip}>
                                            {Object.entries(stats.breakdown).map(([time, data]) => (
                                                <div key={time} className={styles.tooltipRow}>
                                                    <span className={styles.tooltipLabel}>
                                                        <HabitTimeIcon defaultTime={time as any} size={14} />
                                                        {time}
                                                    </span>
                                                    <span className={styles.tooltipValue}>
                                                        {data.success}/{data.total}
                                                    </span>
                                                </div>
                                            ))}
                                            {Object.keys(stats.breakdown).length === 0 && (
                                                <div className={styles.tooltipRow} style={{ justifyContent: 'center', color: '#666' }}>
                                                    No habits
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </th>
                                {isSunday && loomSupported && (
                                    <th className={styles.scoreHeader}>
                                        <button
                                            className={`${styles.vlogButton} ${hasVlog ? styles.hasVlog : ''}`}
                                            onClick={(e) => onVlogClick(weekStart, e)}
                                            title={hasVlog ? "View weekly vlog" : "Record weekly vlog"}
                                        >
                                            <VideoCameraIcon size={20} weight="duotone" />
                                        </button>
                                        <button
                                            className={styles.collapseBtn}
                                            onClick={() => onToggleWeek(week.key)}
                                            title="Collapse week"
                                            style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', marginLeft: '4px' }}
                                        >
                                            <span style={{ fontSize: '10px' }}>◀</span>
                                        </button>
                                    </th>
                                )}
                                {isSunday && !loomSupported && (
                                    <th className={styles.scoreHeader}></th>
                                )}
                            </React.Fragment>
                        );
                    });
                })}
            </tr>
        </thead>
    );
});


HabitTrackerHeader.displayName = 'HabitTrackerHeader';
