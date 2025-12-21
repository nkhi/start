import express, { Request, Response } from 'express';
import * as db from '../db.ts';
import type { DbHabit, DbEntry } from '../db-types.ts';
import type { Habit, HabitEntry, CreateHabitEntryRequest } from '../../shared/types.ts';

const router = express.Router();

// Get all active habits (ordered)
router.get('/habits', async (_req: Request, res: Response) => {
  try {
    const result = await db.query<DbHabit>(`
      SELECT * FROM habits 
      WHERE active = true 
      ORDER BY "order" ASC, id ASC
    `);

    // Convert types to match frontend expectations
    const habits: Habit[] = result.rows.map(h => ({
      id: h.id,
      name: h.name,
      order: h.order,
      defaultTime: h.default_time,
      active: h.active,
      createdDate: h.created_date,
      comment: h.comment || null
    }));

    res.json(habits);
  } catch (e) {
    const error = e as Error;
    res.status(500).json({ error: error.message });
  }
});

// Get entries in a date range
router.get('/habit-entries', async (req: Request, res: Response) => {
  const { from, to } = req.query as { from?: string; to?: string };
  if (!from || !to) return res.status(400).json({ error: 'Missing from/to' });

  try {
    const result = await db.query<DbEntry>(`
      SELECT * FROM entries 
      WHERE date >= $1 AND date <= $2
    `, [from, to]);

    const entries: HabitEntry[] = result.rows.map(e => ({
      entryId: e.entry_id,
      date: e.date,
      habitId: e.habit_id,
      state: e.state,
      timestamp: e.timestamp,
      comment: e.comment || null
    }));

    res.json(entries);
  } catch (e) {
    const error = e as Error;
    res.status(500).json({ error: error.message });
  }
});

// Upsert a habit entry
router.post('/habit-entry', async (req: Request<object, object, CreateHabitEntryRequest>, res: Response) => {
  const { entryId, date, habitId, state, timestamp } = req.body;
  if (!entryId || !date || !habitId)
    return res.status(400).json({ error: 'Missing key fields' });

  try {
    await db.query(`
      INSERT INTO entries (entry_id, date, habit_id, state, timestamp)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (entry_id) 
      DO UPDATE SET state = EXCLUDED.state, timestamp = EXCLUDED.timestamp
    `, [entryId, date, habitId, state, timestamp]);

    res.json({ ok: true });
  } catch (e) {
    const error = e as Error;
    res.status(500).json({ error: error.message });
  }
});

// Update entry comment
router.patch('/habit-entry/:entryId/comment', async (req: Request, res: Response) => {
  const { entryId } = req.params;
  const { comment } = req.body;

  if (!entryId) {
    return res.status(400).json({ error: 'Missing entryId' });
  }

  try {
    const result = await db.query(`
      UPDATE entries 
      SET comment = $1 
      WHERE entry_id = $2
      RETURNING *
    `, [comment, entryId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    res.json({ ok: true });
  } catch (e) {
    const error = e as Error;
    res.status(500).json({ error: error.message });
  }
});

// Seed/replace HabitConfig (Not typically used in prod, but kept for compatibility)
router.post('/seed-habits', async (_req: Request, res: Response) => {
  // Skipping implementation as it's destructive and we have real data now
  res.status(501).json({ error: 'Seeding disabled in DB mode' });
});

export default router;
