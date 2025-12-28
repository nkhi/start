
import { google } from 'googleapis';
import path from 'path';
import dotenv from 'dotenv';
import { query } from '../db.js'; // Note .js extension for direct node execution if needed, but usually we use ts-node
import { DbCalendarEvent } from '../db-types.js';

// Setup environment
dotenv.config();

const googleKeyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const calendarId = process.env.GOOGLE_CALENDAR_ID;

// Initialize Google Auth
const auth = new google.auth.GoogleAuth({
    keyFile: googleKeyFile,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
});

const calendar = google.calendar({ version: 'v3', auth });

/**
 * Fetches events from Google Calendar for a given date range.
 */
async function fetchGoogleEvents(timeMin: Date, timeMax: Date) {
    const timestamp = new Date().toISOString();
    console.log(`[CAL] ${timestamp} | Fetching events: ${timeMin.toISOString()} → ${timeMax.toISOString()}`);
    if (!calendarId) {
        console.log(`[CAL] ${new Date().toISOString()} | ❌ GOOGLE_CALENDAR_ID not set`);
        throw new Error('GOOGLE_CALENDAR_ID is not set');
    }

    try {
        const res = await calendar.events.list({
            calendarId,
            timeMin: timeMin.toISOString(),
            timeMax: timeMax.toISOString(),
            singleEvents: true,
            orderBy: 'startTime',
        });

        console.log(`[CAL] ${new Date().toISOString()} | ✅ Google API ${res.status} | ${res.data.items?.length ?? 0} events`);
        return res.data.items || [];
    } catch (error: any) {
        console.log(`[CAL] ${new Date().toISOString()} | ❌ Google API Error: ${error.message}`);
        if (error.response) {
            console.log(`[CAL] ${new Date().toISOString()} |    Details: ${JSON.stringify(error.response.data)}`);
        }
        throw error;
    }
}

/**
 * Syncs events from Google Calendar to the local database.
 * Default range: 2 weeks back, 4 weeks forward.
 */
export async function syncCalendarEvents(
    daysBack = 14,
    daysForward = 28
): Promise<{ added: number; updated: number; deleted: number; total: number }> {
    try {
        const now = new Date();
        const timeMin = new Date(now);
        timeMin.setDate(now.getDate() - daysBack);

        // Set time to start of day to ensure we catch everything
        timeMin.setHours(0, 0, 0, 0);

        const timeMax = new Date(now);
        timeMax.setDate(now.getDate() + daysForward);
        timeMax.setHours(23, 59, 59, 999);

        console.log(`[CAL] ${new Date().toISOString()} | 🔄 Starting sync...`);

        const events = await fetchGoogleEvents(timeMin, timeMax);

        // Collect all Google event IDs for reconciliation
        const googleEventIds = new Set<string>();
        for (const event of events) {
            if (event.id) {
                googleEventIds.add(event.id);
            }
        }

        // Delete events that exist locally but were removed from Google Calendar
        // We use the same time window (with 24h lookback for all-day events) to scope the deletion
        const lookbackTimeMin = new Date(timeMin.getTime() - 24 * 60 * 60 * 1000);
        const localEventsResult = await query<{ id: string }>(
            `SELECT id FROM public.calendar_events WHERE start_time >= $1 AND start_time <= $2`,
            [lookbackTimeMin, timeMax]
        );

        const localEventIds = localEventsResult.rows.map(row => row.id);
        const idsToDelete = localEventIds.filter(id => !googleEventIds.has(id));

        let deleted = 0;
        if (idsToDelete.length > 0) {
            console.log(`[CAL] ${new Date().toISOString()} | 🗑️  Removing ${idsToDelete.length} stale events`);
            const deleteResult = await query(
                `DELETE FROM public.calendar_events WHERE id = ANY($1)`,
                [idsToDelete]
            );
            deleted = deleteResult.rowCount ?? 0;
        }

        let added = 0;

        for (const event of events) {
            if (!event.id) continue;

            const start = event.start?.dateTime || event.start?.date;
            const end = event.end?.dateTime || event.end?.date;
            const allDay = !event.start?.dateTime; // if no dateTime, it's an all-day event (YYYY-MM-DD)

            const upsertQuery = `
        INSERT INTO public.calendar_events (
          id, summary, description, start_time, end_time, all_day, status, html_link, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, now()
        )
        ON CONFLICT (id) DO UPDATE SET
          summary = EXCLUDED.summary,
          description = EXCLUDED.description,
          start_time = EXCLUDED.start_time,
          end_time = EXCLUDED.end_time,
          all_day = EXCLUDED.all_day,
          status = EXCLUDED.status,
          html_link = EXCLUDED.html_link,
          updated_at = now();
      `;

            const values = [
                event.id,
                event.summary || 'No Title',
                event.description || '',
                start ? new Date(start) : null,
                end ? new Date(end) : null,
                allDay,
                event.status || 'confirmed',
                event.htmlLink || ''
            ];

            await query(upsertQuery, values);
            added++;
        }
        console.log(`[CAL] ${new Date().toISOString()} | ✅ Sync complete | +${added} −${deleted}`);
        return { added, updated: 0, deleted, total: events.length };
    } catch (err: any) {
        console.log(`[CAL] ${new Date().toISOString()} | ❌ Sync failed: ${err.message}`);
        throw err;
    }
}

/**
 * Retrieves events from the local database for a given date range.
 */
export async function getCalendarEvents(startTime: Date, endTime: Date): Promise<DbCalendarEvent[]> {
    const timestamp = new Date().toISOString();

    // Hack: ALL DAY events are often stored at 00:00 UTC (or simpler YYYY-MM-DD).
    // If we are in the Western Hemisphere (negative offset), 00:00 UTC is 'yesterday' evening local time.
    // Standard queries like "Today 00:00 Local" -> "Today 05:00 UTC" will miss "Today 00:00 UTC".
    // So we explicitly look back 24 hours for the start boundary to catch any all-day events.
    const lookbackStart = new Date(startTime.getTime() - 24 * 60 * 60 * 1000);

    const sql = `
    SELECT * FROM public.calendar_events
    WHERE start_time >= $1 AND start_time <= $2
    ORDER BY start_time ASC
  `;

    const result = await query<DbCalendarEvent>(sql, [lookbackStart, endTime]);
    console.log(`[CAL] ${timestamp} | Query: ${startTime.toISOString()} → ${endTime.toISOString()} | Found ${result.rows.length} events`);

    return result.rows;
}
