import type { CalendarEvent } from '../types';
import { fetchWithErrorReporting } from './errorReporter';
import { API_BASE_URL } from '../config';

export interface CalendarEventsResponse {
    success: boolean;
    data: CalendarEvent[];
}

export interface CalendarSyncResponse {
    success: boolean;
    added: number;
    updated: number;
    deleted: number;
    total: number;
}

export async function getCalendarEvents(date: Date): Promise<CalendarEvent[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const url = `${API_BASE_URL}/api/calendar?start=${startOfDay.toISOString()}&end=${endOfDay.toISOString()}`;
    const response = await fetchWithErrorReporting(url);

    if (!response.ok) throw new Error('Failed to fetch calendar events');

    const json: CalendarEventsResponse = await response.json();
    return json.data || [];
}

export async function syncCalendarEvents(
    daysBack = 7,
    daysForward = 28
): Promise<CalendarSyncResponse> {
    const response = await fetchWithErrorReporting(`${API_BASE_URL}/api/calendar/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ daysBack, daysForward })
    });

    if (!response.ok) throw new Error('Calendar sync failed');

    return response.json();
}

export async function getCalendarEventsRange(
    startDate: Date,
    endDate: Date
): Promise<CalendarEvent[]> {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const url = `${API_BASE_URL}/api/calendar?start=${start.toISOString()}&end=${end.toISOString()}`;
    const response = await fetchWithErrorReporting(url);

    if (!response.ok) throw new Error('Failed to fetch calendar events');

    const json: CalendarEventsResponse = await response.json();
    return json.data || [];
}

