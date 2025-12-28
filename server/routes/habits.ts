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
      comment: h.comment || null,
      deadlineTime: h.deadline_time || null
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
      DO UPDATE SET state = EXCLUDED.state, timestamp = EXCLUDED.timestamp, comment = entries.comment
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

// Reorder a habit to a new position (place it directly before targetHabitId, or at end if targetHabitId is null)
router.patch('/habits/:id/reorder', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { targetHabitId } = req.body as { targetHabitId: string | null };

  try {
    // Use a transaction for atomicity
    await db.query('BEGIN');

    // Step 1: Get both habits in a single query (or just the moving habit if moving to end)
    let oldOrder: number | null;
    let newOrder: number;

    if (targetHabitId === null) {
      // Moving to end: get moving habit's order and max order in one query
      const result = await db.query<{ old_order: number | null; max_order: number }>(`
        SELECT 
          (SELECT "order" FROM habits WHERE id = $1) as old_order,
          COALESCE(MAX("order"), 0) as max_order 
        FROM habits WHERE active = true
      `, [id]);
      
      if (result.rows.length === 0) {
        await db.query('ROLLBACK');
        return res.status(404).json({ error: 'Habit not found' });
      }
      
      oldOrder = result.rows[0].old_order;
      newOrder = result.rows[0].max_order + 1;
    } else {
      // Get both habits' orders in a single query
      const result = await db.query<{ id: string; order: number | null }>(`
        SELECT id, "order" FROM habits WHERE id = ANY($1)
      `, [[id, targetHabitId]]);
      
      const movingHabit = result.rows.find(r => r.id === id);
      const targetHabit = result.rows.find(r => r.id === targetHabitId);
      
      if (!movingHabit) {
        await db.query('ROLLBACK');
        return res.status(404).json({ error: 'Habit not found' });
      }
      if (!targetHabit) {
        await db.query('ROLLBACK');
        return res.status(404).json({ error: 'Target habit not found' });
      }
      if (targetHabit.order === null) {
        await db.query('ROLLBACK');
        return res.status(400).json({ error: 'Target habit has no order' });
      }
      
      oldOrder = movingHabit.order;
      newOrder = targetHabit.order;
    }

    // Step 2: Early exit if no change needed
    if (oldOrder === newOrder) {
      await db.query('COMMIT');
      return res.json({ ok: true, message: 'No change needed' });
    }

    // Step 3: Shift other habits and update the moving habit's order
    if (oldOrder === null || oldOrder > newOrder) {
      // Moving up: shift habits in [newOrder, oldOrder) up by 1
      const upperBound = oldOrder ?? 999999;
      await db.query(`
        UPDATE habits 
        SET "order" = "order" + 1 
        WHERE "order" >= $1 AND "order" < $2 AND id != $3
      `, [newOrder, upperBound, id]);
      await db.query(`UPDATE habits SET "order" = $1 WHERE id = $2`, [newOrder, id]);
    } else {
      // Moving down: shift habits in (oldOrder, newOrder] down by 1
      await db.query(`
        UPDATE habits 
        SET "order" = "order" - 1 
        WHERE "order" > $1 AND "order" <= $2 AND id != $3
      `, [oldOrder, newOrder, id]);
      newOrder = newOrder - 1;
      await db.query(`UPDATE habits SET "order" = $1 WHERE id = $2`, [newOrder, id]);
    }

    await db.query('COMMIT');
    res.json({ ok: true, newOrder });
  } catch (e) {
    await db.query('ROLLBACK');
    const error = e as Error;
    console.error('Failed to reorder habit:', error);
    res.status(500).json({ error: error.message });
  }
});

// Seed/replace HabitConfig (Not typically used in prod, but kept for compatibility)
router.post('/seed-habits', async (_req: Request, res: Response) => {
  // Skipping implementation as it's destructive and we have real data now
  res.status(501).json({ error: 'Seeding disabled in DB mode' });
});

export default router;
