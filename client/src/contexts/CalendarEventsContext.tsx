import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';
import type { CalendarEvent } from '../types';
import { getCalendarEventsRange } from '../api/calendar';

interface CalendarEventsCache {
    [dateString: string]: CalendarEvent[];
}

interface CalendarEventsContextValue {
    getEventsForDate: (date: Date) => CalendarEvent[] | null;
    isDateCached: (date: Date) => boolean;
    prefetchDateRange: (startDate: Date, endDate: Date) => Promise<void>;
    isPrefetching: boolean;
}

const CalendarEventsContext = createContext<CalendarEventsContextValue | null>(null);

function formatDateKey(date: Date): string {
    return date.toISOString().split('T')[0];
}

function groupEventsByDate(events: CalendarEvent[], startDate: Date, endDate: Date): CalendarEventsCache {
    const cache: CalendarEventsCache = {};

    const current = new Date(startDate);
    current.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    while (current <= end) {
        const dateKey = formatDateKey(current);
        cache[dateKey] = [];
        current.setDate(current.getDate() + 1);
    }

    for (const event of events) {
        const eventStart = new Date(event.start_time);

        if (event.all_day) {
            const dateKey = formatDateKey(eventStart);
            if (cache[dateKey]) {
                cache[dateKey].push(event);
            }
        } else {
            const dateKey = formatDateKey(eventStart);
            if (cache[dateKey]) {
                cache[dateKey].push(event);
            }
        }
    }

    return cache;
}

interface CalendarEventsProviderProps {
    children: ReactNode;
}

export function CalendarEventsProvider({ children }: CalendarEventsProviderProps) {
    const [cache, setCache] = useState<CalendarEventsCache>({});
    const [isPrefetching, setIsPrefetching] = useState(false);
    const prefetchedRangesRef = useRef<Set<string>>(new Set());

    const getEventsForDate = useCallback((date: Date): CalendarEvent[] | null => {
        const dateKey = formatDateKey(date);
        return cache[dateKey] ?? null;
    }, [cache]);

    const isDateCached = useCallback((date: Date): boolean => {
        const dateKey = formatDateKey(date);
        return dateKey in cache;
    }, [cache]);

    const prefetchDateRange = useCallback(async (startDate: Date, endDate: Date): Promise<void> => {
        const startKey = formatDateKey(startDate);
        const endKey = formatDateKey(endDate);
        const rangeKey = `${startKey}:${endKey}`;

        if (prefetchedRangesRef.current.has(rangeKey)) {
            return;
        }

        prefetchedRangesRef.current.add(rangeKey);
        setIsPrefetching(true);

        try {
            const events = await getCalendarEventsRange(startDate, endDate);
            const grouped = groupEventsByDate(events, startDate, endDate);

            setCache(prev => ({ ...prev, ...grouped }));
        } catch (error) {
            console.error('[CalendarEventsContext] Prefetch failed:', error);
            prefetchedRangesRef.current.delete(rangeKey);
        } finally {
            setIsPrefetching(false);
        }
    }, []);

    return (
        <CalendarEventsContext.Provider
            value={{
                getEventsForDate,
                isDateCached,
                prefetchDateRange,
                isPrefetching,
            }}
        >
            {children}
        </CalendarEventsContext.Provider>
    );
}

export function useCalendarEventsContext(): CalendarEventsContextValue | null {
    return useContext(CalendarEventsContext);
}
