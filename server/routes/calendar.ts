
import express from 'express';
import { syncCalendarEvents, getCalendarEvents } from '../services/calendarService.js';

const router = express.Router();

// POST /api/calendar/sync
router.post('/sync', async (req, res) => {
    try {
        const { daysBack, daysForward } = req.body;
        // Defaults are handled in service if undefined
        const result = await syncCalendarEvents(daysBack, daysForward);
        res.json({ success: true, ...result });
    } catch (error: any) {
        console.error('Error syncing calendar:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/calendar
// Query params: start (ISO date), end (ISO date)
// Default: Today
router.get('/', async (req, res) => {
    try {
        const startParam = req.query.start as string;
        const endParam = req.query.end as string;

        let start = startParam ? new Date(startParam) : new Date();
        let end = endParam ? new Date(endParam) : new Date();

        // If no params, default to today's range (start of day to end of day)
        if (!startParam && !endParam) {
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
        }

        const events = await getCalendarEvents(start, end);
        res.json({ success: true, data: events });
    } catch (error: any) {
        console.error('Error fetching calendar events:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
