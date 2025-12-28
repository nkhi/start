import { useState, useEffect, useMemo, useCallback } from 'react';
import type { CalendarEvent } from '../types';
import { getCalendarEvents, syncCalendarEvents } from '../api/calendar';
import { useCalendarEventsContext } from '../contexts/CalendarEventsContext';

interface UseCalendarEventsReturn {
    events: CalendarEvent[];
    allDayEvents: CalendarEvent[];
    timedEvents: CalendarEvent[];
    loading: boolean;
    syncing: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    sync: () => Promise<void>;
}

export function useCalendarEvents(date: Date, enabled: boolean): UseCalendarEventsReturn {
    const context = useCalendarEventsContext();
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [usedCache, setUsedCache] = useState(false);

    const fetchEvents = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getCalendarEvents(date);
            setEvents(data);
        } catch (err) {
            console.error('[useCalendarEvents] Fetch error:', err);
            setError('Could not load events');
        } finally {
            setLoading(false);
        }
    }, [date]);

    const sync = useCallback(async () => {
        if (syncing) return;
        setSyncing(true);
        try {
            await syncCalendarEvents();
            await fetchEvents();
        } catch (err) {
            console.error('[useCalendarEvents] Sync error:', err);
        } finally {
            setSyncing(false);
        }
    }, [syncing, fetchEvents]);

    useEffect(() => {
        if (!enabled) return;

        if (context) {
            const cachedEvents = context.getEventsForDate(date);
            if (cachedEvents !== null) {
                setEvents(cachedEvents);
                setUsedCache(true);
                return;
            }
        }

        setUsedCache(false);
        fetchEvents();
    }, [enabled, date, context, fetchEvents]);

    const { allDayEvents, timedEvents } = useMemo(() => {
        const allDay: CalendarEvent[] = [];
        const timed: CalendarEvent[] = [];

        events
            .filter(event => event.summary && event.summary.trim() !== '')
            .forEach(event => {
                if (event.all_day) {
                    allDay.push(event);
                } else {
                    timed.push(event);
                }
            });

        timed.sort((a, b) =>
            new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
        );

        return { allDayEvents: allDay, timedEvents: timed };
    }, [events]);

    return {
        events,
        allDayEvents,
        timedEvents,
        loading: loading && !usedCache,
        syncing,
        error,
        refetch: fetchEvents,
        sync,
    };
}
