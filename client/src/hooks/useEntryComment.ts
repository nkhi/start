/**
 * useEntryComment Hook
 * 
 * Encapsulates all logic for adding/editing comments on habit entries.
 * Handles long-press detection, hover tooltips, and API persistence.
 * 
 * @example
 * const { getCellHandlers, commentPanel, cellTooltip, wasLongPress } = useEntryComment({
 *   entries, habits, onEntriesChange: setEntries
 * });
 * 
 * // On cell div:
 * <div {...getCellHandlers(date, habit, entry)} onClick={() => !wasLongPress() && cycleState(...)} />
 * 
 * // Render panel:
 * {commentPanel && <CommentPanel {...commentPanel} />}
 */

import { useState, useRef, useCallback } from 'react';
import { updateEntryComment, saveEntry } from '../api/habits';
import { DateUtility, generateId } from '../utils';
import type { Habit, HabitEntry } from '../types';

const LONG_PRESS_MS = 400;
const HOVER_TOOLTIP_MS = 500;

interface UseEntryCommentOptions {
    entries: Map<string, HabitEntry>;
    habits: Habit[];
    onEntriesChange: (updater: (prev: Map<string, HabitEntry>) => Map<string, HabitEntry>) => void;
}

interface CommentPanelProps {
    isOpen: boolean;
    habitName: string;
    dateStr: string;
    initialComment: string | null;
    onSave: (comment: string) => void;
    onClose: () => void;
}

interface CellTooltip {
    comment: string;
    x: number;
    y: number;
}

interface CellHandlers {
    onMouseDown: (e: React.MouseEvent) => void;
    onMouseUp: () => void;
    onMouseLeave: () => void;
    onMouseEnter: (e: React.MouseEvent) => void;
}

export function useEntryComment({
    entries,
    habits,
    onEntriesChange
}: UseEntryCommentOptions) {
    // Panel state
    const [panelState, setPanelState] = useState<{
        habitId: string;
        habitName: string;
        dateStr: string;
        entryId: string;
        initialComment: string | null;
    } | null>(null);

    // Tooltip state
    const [cellTooltip, setCellTooltip] = useState<CellTooltip | null>(null);

    // Timer refs
    const longPressTimerRef = useRef<number | null>(null);
    const longPressTriggeredRef = useRef(false);
    const cellHoverTimerRef = useRef<number | null>(null);

    // Clear all timers
    const clearTimers = useCallback(() => {
        if (longPressTimerRef.current) {
            window.clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
        if (cellHoverTimerRef.current) {
            window.clearTimeout(cellHoverTimerRef.current);
            cellHoverTimerRef.current = null;
        }
    }, []);

    // Check if last interaction was a long-press (used to skip cycleState)
    const wasLongPress = useCallback(() => {
        return longPressTriggeredRef.current;
    }, []);

    // Get handlers for a specific cell
    const getCellHandlers = useCallback((
        date: Date,
        habit: Habit,
        entry: HabitEntry | undefined
    ): CellHandlers => {
        const dateStr = DateUtility.formatDate(date);
        const entryId = entry?.entryId || generateId();

        return {
            onMouseDown: (_e: React.MouseEvent) => {
                longPressTriggeredRef.current = false;

                longPressTimerRef.current = window.setTimeout(() => {
                    longPressTriggeredRef.current = true;
                    setPanelState({
                        habitId: habit.id,
                        habitName: habit.name,
                        dateStr,
                        entryId,
                        initialComment: entry?.comment || null
                    });
                }, LONG_PRESS_MS);
            },

            onMouseUp: () => {
                if (longPressTimerRef.current) {
                    window.clearTimeout(longPressTimerRef.current);
                    longPressTimerRef.current = null;
                }
            },

            onMouseLeave: () => {
                clearTimers();
                setCellTooltip(null);
            },

            onMouseEnter: (e: React.MouseEvent) => {
                if (!entry?.comment) return;

                const rect = e.currentTarget.getBoundingClientRect();

                cellHoverTimerRef.current = window.setTimeout(() => {
                    setCellTooltip({
                        comment: entry.comment!,
                        x: rect.left + rect.width / 2,
                        y: rect.top
                    });
                }, HOVER_TOOLTIP_MS);
            }
        };
    }, [clearTimers]);

    // Save comment handler
    const handleSaveComment = useCallback(async (comment: string) => {
        if (!panelState) return;

        const { habitId, dateStr, entryId } = panelState;
        const key = `${dateStr}_${habitId}`;
        const existingEntry = entries.get(key);

        if (!existingEntry) {
            // Create new entry with comment
            const habit = habits.find(h => h.id === habitId);
            const newEntry: HabitEntry = {
                entryId,
                date: dateStr,
                habitId,
                state: 0,
                time: habit?.defaultTime || 'neither',
                timestamp: new Date().toISOString(),
                comment: comment || null
            };

            onEntriesChange(prev => {
                const next = new Map(prev);
                next.set(key, newEntry);
                return next;
            });

            try {
                await saveEntry(newEntry);
            } catch (error) {
                console.error('Failed to save entry:', error);
            }
        } else {
            // Update existing entry
            onEntriesChange(prev => {
                const next = new Map(prev);
                next.set(key, { ...existingEntry, comment: comment || null });
                return next;
            });

            try {
                await updateEntryComment(existingEntry.entryId, comment || null);
            } catch (error) {
                console.error('Failed to update comment:', error);
            }
        }

        setPanelState(null);
    }, [panelState, entries, habits, onEntriesChange]);

    // Close panel handler
    const handleClosePanel = useCallback(() => {
        setPanelState(null);
    }, []);

    // Build panel props if panel is open
    const commentPanel: CommentPanelProps | null = panelState
        ? {
            isOpen: true,
            habitName: panelState.habitName,
            dateStr: panelState.dateStr,
            initialComment: panelState.initialComment,
            onSave: handleSaveComment,
            onClose: handleClosePanel
        }
        : null;

    return {
        getCellHandlers,
        commentPanel,
        cellTooltip,
        wasLongPress
    };
}
