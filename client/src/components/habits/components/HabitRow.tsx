import React from 'react';
import type { Habit, HabitEntry } from '../../../types';
import { DateUtility } from '../../../utils';
import { HabitNameCell, type ReorderPosition } from './HabitNameCell';
import { WeekSparkline } from './WeekSparkline';
import { HabitCell } from './HabitCell';
import styles from '../HabitTracker.module.css';

interface HabitRowProps {
    habit: Habit;
    weeks: { key: string; start: Date; end: Date; days: Date[] }[];
    expandedWeeks: Set<string>;
    getEntry: (date: Date, habitId: string) => HabitEntry | undefined;
    cycleState: (date: Date, habitId: string) => void;
    getHabitStats: (habitId: string, start: Date, end: Date) => any;
    getCurrentStreak: (habitId: string) => number;
    getFailedStreak: (habitId: string) => number;
    onToggleWeek: (key: string) => void;
    getCellHandlers: (date: Date, habit: Habit, entry: HabitEntry | undefined) => any;
    wasLongPress: () => boolean;

    // Name Cell Headers
    onHabitNameMouseEnter: (e: React.MouseEvent, habitId: string, comment?: string | null) => void;
    onHabitNameMouseLeave: () => void;
    onReorderStart: (habit: Habit, position: ReorderPosition) => void;
    onDeadlineMouseEnter: (e: React.MouseEvent, deadlineTime: string) => void;
    onDeadlineMouseLeave: () => void;

    dynamicRowHeight: number | null;
}

export function HabitRow({
    habit,
    weeks,
    expandedWeeks,
    getEntry,
    cycleState,
    getHabitStats,
    getCurrentStreak,
    getFailedStreak,
    onToggleWeek,
    getCellHandlers,
    wasLongPress,
    onHabitNameMouseEnter,
    onHabitNameMouseLeave,
    onReorderStart,
    onDeadlineMouseEnter,
    onDeadlineMouseLeave,
    dynamicRowHeight
}: HabitRowProps) {

    const currentFailedStreak = getFailedStreak(habit.id);

    return (
        <tr
            className={dynamicRowHeight ? styles.dynamicRow : ''}
            style={dynamicRowHeight ? { height: `${dynamicRowHeight}px` } : undefined}
        >
            <td className={`
                ${currentFailedStreak > 2 ? styles.criticalStreak : ''} 
                ${habit.essential ? styles.essentialHabit : ''}
            `.trim() || undefined}>
                <HabitNameCell
                    habit={habit}
                    streak={getCurrentStreak(habit.id)}
                    failedStreak={currentFailedStreak}
                    onMouseEnter={(e: React.MouseEvent, id: string, comment?: string | null) => onHabitNameMouseEnter(e, id, comment)}
                    onMouseLeave={onHabitNameMouseLeave}
                    onReorderStart={onReorderStart}
                    onDeadlineMouseEnter={onDeadlineMouseEnter}
                    onDeadlineMouseLeave={onDeadlineMouseLeave}
                />
            </td>
            {weeks.map((week, weekIndex) => {
                const isExpanded = expandedWeeks.has(week.key);

                if (!isExpanded) {
                    return (
                        <WeekSparkline
                            key={week.key}
                            habit={habit}
                            week={week}
                            prevWeek={weeks[weekIndex - 1]}
                            nextWeek={weeks[weekIndex + 1]}
                            expandedWeeks={expandedWeeks}
                            getHabitStats={getHabitStats}
                            onToggleWeek={onToggleWeek}
                        />
                    );
                }

                return week.days.map((date, idx) => {
                    const entry = getEntry(date, habit.id);
                    const isSunday = date.getDay() === 0; // Changed from Saturday since array is reversed

                    return (
                        <React.Fragment key={`${week.key}-${idx}`}>
                            <td style={DateUtility.isToday(date) ? { minWidth: '120px' } : undefined}>
                                {(() => {
                                    const handlers = getCellHandlers(date, habit, entry);
                                    return (
                                        <HabitCell
                                            date={date}
                                            habit={habit}
                                            entry={entry}
                                            onCycleState={cycleState}
                                            handlers={handlers}
                                            wasLongPress={wasLongPress}
                                        />
                                    );
                                })()}
                            </td>
                            {isSunday && (() => {
                                const weekStartDate = new Date(date.getTime() - 6 * 24 * 60 * 60 * 1000);
                                const stats = getHabitStats(habit.id, weekStartDate, date);
                                return (
                                    <td className={styles.scoreCell}>
                                        <div className={`${styles.scoreContent} ${styles.hasTooltip}`} data-tooltip={`${stats.grade.letter} (${Math.round(stats.percentage)}%)`}>
                                            <span className={`${styles.scoreGrade} ${styles[stats.grade.class]}`}>
                                                {stats.successCount}/{stats.totalCount}
                                            </span>
                                        </div>
                                    </td>
                                );
                            })()}
                        </React.Fragment>
                    );
                });
            })}
        </tr>
    );
}
