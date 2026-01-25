import express, { Request, Response } from 'express';
import * as db from '../db.ts';
import { logToFile } from '../logger.ts';
import type { DbLandmark } from '../db-types.ts';
import type { LandmarkItem, LandmarksByCategory, CreateLandmarkRequest, UpdateLandmarkRequest, ReorderLandmarksRequest } from '../../shared/types.ts';

const router = express.Router();

// Get all landmarks grouped by category
router.get('/landmarks', async (_req: Request, res: Response) => {
    try {
        // Orient items are sorted by position, forward items don't need position sorting
        // (they're sorted by date on the frontend)
        const result = await db.query<DbLandmark>('SELECT * FROM landmarks ORDER BY category, position ASC NULLS LAST, created_at ASC');

        // Group by category
        const grouped: LandmarksByCategory = {
            orient: [],
            forward: [],
            big_things: []
        };

        result.rows.forEach(row => {
            const item: LandmarkItem = {
                id: row.id,
                category: row.category,
                text: row.text,
                date: row.date?.toISOString().split('T')[0] || null,
                position: row.position ?? undefined,
                createdAt: row.created_at?.toISOString() || null
            };

            if (row.category === 'orient') {
                grouped.orient.push(item);
            } else if (row.category === 'forward') {
                grouped.forward.push(item);
            } else if (row.category === 'big_things') {
                grouped.big_things.push(item);
            }
        });

        res.json(grouped);
    } catch (e) {
        const error = e as Error;
        const errorMsg = `[LANDMARKS] Error fetching landmarks: ${error.message}`;
        console.log(errorMsg);
        logToFile(errorMsg);
        res.status(500).json({ error: error.message });
    }
});

// Create a new landmark
router.post('/landmarks', async (req: Request<object, object, CreateLandmarkRequest>, res: Response) => {
    const { id, category, text, date } = req.body;

    if (!id || !category || !text) {
        return res.status(400).json({ error: 'Missing required fields: id, category, text' });
    }

    try {
        let nextPosition: number | null = null;

        // Only calculate position for 'orient' and 'big_things' category (user-defined ordering)
        // 'forward' items are sorted by date on the frontend, so no position needed
        if (category === 'orient' || category === 'big_things') {
            const posResult = await db.query<{ max_position: number | null }>(
                'SELECT MAX(position) as max_position FROM landmarks WHERE category = $1',
                [category]
            );
            nextPosition = (posResult.rows[0]?.max_position ?? -1) + 1;
        }

        const createdAt = new Date().toISOString();
        await db.query(`
      INSERT INTO landmarks (id, category, text, date, position, created_at)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [id, category, text, date || null, nextPosition, createdAt]);

        const landmark: LandmarkItem = {
            id,
            category,
            text,
            date: date || null,
            position: nextPosition ?? undefined,
            createdAt
        };

        res.json(landmark);
    } catch (e) {
        const error = e as Error;
        const errorMsg = `[LANDMARKS] Error creating landmark: ${error.message}`;
        console.log(errorMsg);
        logToFile(errorMsg);
        res.status(500).json({ error: error.message });
    }
});

// ============================================================================
// IMPORTANT: Static routes like /landmarks/reorder MUST be defined BEFORE 
// parameterized routes like /landmarks/:id, otherwise Express will match 
// "reorder" as an :id parameter!
// ============================================================================

// Reorder landmarks within a category
router.patch('/landmarks/reorder', async (req: Request<object, object, ReorderLandmarksRequest>, res: Response) => {
    const { category, itemOrder } = req.body;

    if (!category || !itemOrder || !Array.isArray(itemOrder)) {
        return res.status(400).json({ error: 'category and itemOrder array are required' });
    }

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        // Update position for each item based on its index in the itemOrder array
        for (let i = 0; i < itemOrder.length; i++) {
            await client.query(
                'UPDATE landmarks SET position = $1 WHERE id = $2 AND category = $3',
                [i, itemOrder[i], category]
            );
        }

        await client.query('COMMIT');
        res.json({ ok: true, category, itemOrder });
    } catch (e) {
        await client.query('ROLLBACK');
        const error = e as Error;
        const errorMsg = `[LANDMARKS] Error reordering landmarks: ${error.message}`;
        console.log(errorMsg);
        logToFile(errorMsg);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// Update a landmark
router.patch('/landmarks/:id', async (req: Request<{ id: string }, object, UpdateLandmarkRequest>, res: Response) => {
    const { id } = req.params;
    const { text, date } = req.body;

    try {
        const fields: string[] = [];
        const values: unknown[] = [id];
        let idx = 2;

        if (text !== undefined) {
            fields.push(`text = $${idx++}`);
            values.push(text);
        }
        if (date !== undefined) {
            fields.push(`date = $${idx++}`);
            values.push(date);
        }

        if (fields.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        const result = await db.query<DbLandmark>(`
      UPDATE landmarks SET ${fields.join(', ')} WHERE id = $1 RETURNING *
    `, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: `Landmark with ID ${id} not found` });
        }

        const row = result.rows[0];
        const landmark: LandmarkItem = {
            id: row.id,
            category: row.category,
            text: row.text,
            date: row.date?.toISOString().split('T')[0] || null,
            position: row.position ?? undefined,
            createdAt: row.created_at?.toISOString() || null
        };

        res.json(landmark);
    } catch (e) {
        const error = e as Error;
        const errorMsg = `[LANDMARKS] Error updating landmark ${id}: ${error.message}`;
        console.log(errorMsg);
        logToFile(errorMsg);
        res.status(500).json({ error: error.message });
    }
});

// Delete a landmark
router.delete('/landmarks/:id', async (req: Request<{ id: string }>, res: Response) => {
    const { id } = req.params;

    try {
        const result = await db.query('DELETE FROM landmarks WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: `Landmark with ID ${id} not found` });
        }
        res.json({ ok: true });
    } catch (e) {
        const error = e as Error;
        const errorMsg = `[LANDMARKS] Error deleting landmark ${id}: ${error.message}`;
        console.log(errorMsg);
        logToFile(errorMsg);
        res.status(500).json({ error: error.message });
    }
});

export default router;
