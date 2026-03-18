/**
 * useViewNavigation Hook
 *
 * Generates the correct array of `dates` for the Todos view based on the active mode
 * ('day', 'two-day', or 'week'). 
 * 
 * It acts as the single source of truth for time, driving both the UI and data fetching:
 * 1. UI: The output array powers `MultiWeekView` (for fixed week/2-day grids) 
 *    and `DayWeek` (for the smooth infinite scroll in day mode).
 * 2. Data Fetching: These dates dictate exactly which tasks to fetch from the backend.
 * 
 * Handles work mode filtering (stripping weekends) and exposing the navigation handlers 
 * (prev/next) that paginated views rely on.
 */

import { useState, useEffect, useCallback } from 'react';
import { DateUtility } from '../utils';


export interface UseViewNavigationOptions {
    workMode: boolean;
    viewMode: 'day' | 'two-day' | 'week';
}

export interface UseViewNavigationReturn {
    dates: Date[];
    handlePrev: () => void;
    handleNext: () => void;
    handleCurrent: () => void;
}

function getWeekStart(): Date {
    const d = new Date();
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
}

function getToday(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
}

export function useViewNavigation({ workMode, viewMode }: UseViewNavigationOptions): UseViewNavigationReturn {
    const [weekStart, setWeekStart] = useState<Date>(getWeekStart);
    const [cursorDate, setCursorDate] = useState<Date>(getToday);
    const [dates, setDates] = useState<Date[]>([]);

    useEffect(() => {
        let newDates: Date[] = [];

        if (viewMode === 'week') {
            for (let i = 0; i < 7; i++) {
                const d = new Date(weekStart);
                d.setDate(d.getDate() + i);
                newDates.push(d);
            }
        } else if (viewMode === 'two-day') {
            for (let i = 0; i < 2; i++) {
                const d = new Date(cursorDate);
                d.setDate(d.getDate() + i);
                newDates.push(d);
            }
        } else {
            // "day" mode - generate all dates for standard horizontal scrolling
            const allDates = DateUtility.getAllDatesFromStart(new Date('2025-11-09T00:00:00'));
            const lastDate = allDates.length > 0 ? allDates[allDates.length - 1] : new Date();
            const futureDatesList: Date[] = [];
            for (let i = 1; i <= 14; i++) {
                const d = new Date(lastDate);
                d.setDate(d.getDate() + i);
                futureDatesList.push(d);
            }
            newDates = [...allDates, ...futureDatesList];
        }

        // Filter out weekends for work mode (Monday-Friday only)
        if (workMode) {
            newDates = newDates.filter(d => {
                const day = d.getDay();
                return day !== 0 && day !== 6;
            });
        }

        setDates(newDates);
    }, [weekStart, cursorDate, viewMode, workMode]);

    const handlePrev = useCallback(() => {
        if (viewMode === 'week') {
            setWeekStart(prev => {
                const newStart = new Date(prev);
                newStart.setDate(newStart.getDate() - 7);
                return newStart;
            });
        } else {
            setCursorDate(prev => {
                const newDate = new Date(prev);
                newDate.setDate(newDate.getDate() - 1);
                // In work mode, if shifting lands on a weekend, skip to Friday
                if (workMode) {
                    const day = newDate.getDay();
                    if (day === 0) newDate.setDate(newDate.getDate() - 2); // Sun -> Fri
                    if (day === 6) newDate.setDate(newDate.getDate() - 1); // Sat -> Fri
                }
                return newDate;
            });
        }
    }, [viewMode, workMode]);

    const handleNext = useCallback(() => {
        if (viewMode === 'week') {
            setWeekStart(prev => {
                const newStart = new Date(prev);
                newStart.setDate(newStart.getDate() + 7);
                return newStart;
            });
        } else {
            setCursorDate(prev => {
                const newDate = new Date(prev);
                newDate.setDate(newDate.getDate() + 1);
                // In work mode, if shifting lands on a weekend, skip to Monday
                if (workMode) {
                    const day = newDate.getDay();
                    if (day === 6) newDate.setDate(newDate.getDate() + 2); // Sat -> Mon
                    if (day === 0) newDate.setDate(newDate.getDate() + 1); // Sun -> Mon
                }
                return newDate;
            });
        }
    }, [viewMode, workMode]);

    const handleCurrent = useCallback(() => {
        setWeekStart(getWeekStart());
        setCursorDate(getToday());
    }, []);

    return {
        dates,
        handlePrev,
        handleNext,
        handleCurrent,
    };
}
