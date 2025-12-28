import React, { useRef, useCallback } from 'react';
import { HeartIcon, Warning, Clock } from '@phosphor-icons/react';
import type { Habit } from '../../types';
import { HabitTimeIcon, HABIT_TIME_CONFIG } from './habitTimeConfig';
import styles from './HabitNameCell.module.css';

export interface ReorderPosition {
    x: number;
    y: number;
}

interface HabitNameCellProps {
    habit: Habit;
    streak: number;
    failedStreak: number;
    onMouseEnter: (e: React.MouseEvent, habitId: string, comment?: string | null) => void;
    onMouseLeave: () => void;
    onReorderStart?: (habit: Habit, position: ReorderPosition) => void;
    onDeadlineMouseEnter?: (e: React.MouseEvent, deadlineTime: string) => void;
    onDeadlineMouseLeave?: () => void;
}

const LONG_PRESS_DURATION = 500; // ms

export function HabitNameCell({ habit, streak, failedStreak, onMouseEnter, onMouseLeave, onReorderStart, onDeadlineMouseEnter, onDeadlineMouseLeave }: HabitNameCellProps) {
    const longPressTimerRef = useRef<number | null>(null);
    const isLongPressRef = useRef(false);
    const elementRef = useRef<HTMLDivElement>(null);

    // Parsing Logic
    // Allowed if defaultTime is 'routine' OR id is in range 32-38
    const isRoutine = habit.defaultTime === 'routine';
    const idNum = parseInt(habit.id, 10);
    const isIdInRange = !isNaN(idNum) && idNum >= 32 && idNum <= 38;
    const isParsingAllowed = isRoutine || isIdInRange;

    let displayName = habit.name;
    let timeBadge: string | null = null;

    if (isParsingAllowed) {
        // Check for "Name [Time]"
        let timeMatch = habit.name.match(/^(.*?)\[(.*?)\]$/);
        if (timeMatch) {
            displayName = timeMatch[1].trim();
            timeBadge = timeMatch[2].trim();
        } else {
            // Check for "[Time] Name"
            timeMatch = habit.name.match(/^\[(.*?)\]\s*(.*)$/);
            if (timeMatch) {
                timeBadge = timeMatch[1].trim();
                displayName = timeMatch[2].trim();
            }
        }
    }

    // Determine Badge Color based on config
    // logic: use config color for badge border/text if available
    const timeConfig = HABIT_TIME_CONFIG[habit.defaultTime];
    const badgeStyle = timeBadge && timeConfig ? {
        borderColor: timeConfig.color === 'transparent' ? undefined : timeConfig.color,
        color: timeConfig.color === 'transparent' ? undefined : timeConfig.color,
        background: timeConfig.color === 'transparent' ? undefined : `${timeConfig.color}20` // 20 hex = ~12% opacity
    } : undefined;

    // Long press handlers
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (e.button !== 0) return; // Only left click
        isLongPressRef.current = false;

        longPressTimerRef.current = window.setTimeout(() => {
            isLongPressRef.current = true;
            if (onReorderStart && elementRef.current) {
                const rect = elementRef.current.getBoundingClientRect();
                onReorderStart(habit, {
                    x: rect.right + 8, // Position to the right of the element
                    y: rect.top
                });
            }
        }, LONG_PRESS_DURATION);
    }, [habit, onReorderStart]);

    const handleMouseUp = useCallback(() => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    }, []);

    const handleMouseLeaveInternal = useCallback(() => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
        onMouseLeave();
    }, [onMouseLeave]);

    // Render Logic
    const renderIconArea = () => {
        if (isRoutine && timeBadge) {
            return (
                <span className={`${styles.timeBadge} ${styles.routineBadge}`} style={badgeStyle}>
                    {timeBadge}
                </span>
            );
        }

        return (
            <span className={styles.timeIcon} style={{ color: timeConfig?.color || '#9ca3af' }}>
                <HabitTimeIcon defaultTime={habit.defaultTime} size={20} />
            </span>
        );
    };

    return (
        <div
            ref={elementRef}
            className={styles.habitName}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeaveInternal}
            style={{ cursor: onReorderStart ? 'grab' : undefined }}
        >
            {renderIconArea()}

            <div className={styles.habitNameText}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span
                        className={habit.comment ? styles.habitNameWithComment : undefined}
                        onMouseEnter={(e) => onMouseEnter(e, habit.id, habit.comment)}
                    >
                        {displayName}
                    </span>

                    {/* If not a special routine replacement, show badge here if it exists */}
                    {!(isRoutine && timeBadge) && timeBadge && (
                        <span className={styles.timeBadge} style={badgeStyle}>
                            {timeBadge}
                        </span>
                    )}
                </div>

                <div className={styles.badgesContainer}>

                    {habit.deadlineTime && (
                        <span
                            className={styles.deadlineBadge}
                            onMouseEnter={(e) => onDeadlineMouseEnter?.(e, habit.deadlineTime!)}
                            onMouseLeave={onDeadlineMouseLeave}
                        >
                            <Clock size={14} weight="regular" />
                        </span>
                    )}

                    {streak > 0 && (
                        <span className={styles.streakBadge}>
                            <span className={styles.streakIcon}>
                                <HeartIcon size={12} weight="fill" />
                            </span>
                            <span>{streak}</span>
                        </span>
                    )}

                    {failedStreak > 0 && (
                        <span className={styles.failedStreakBadge}>
                            <span className={styles.failedStreakIcon}>
                                <Warning size={12} weight="fill" />
                            </span>
                            <span>{failedStreak}</span>
                        </span>
                    )}


                </div>
            </div>
        </div>
    );
}

