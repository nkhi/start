import express, { Request, Response } from 'express';
import * as db from '../db.ts';
import type { DbList, DbListItem } from '../db-types.ts';
import type { List, ListItem, CreateListRequest, UpdateListRequest } from '../../shared/types.ts';

const router = express.Router();

// Get all lists
router.get('/lists', async (_req: Request, res: Response) => {
  try {
    // Fetch lists and items in parallel
    const [listsRes, itemsRes] = await Promise.all([
      db.query<DbList>('SELECT * FROM lists'),
      db.query<DbListItem>('SELECT * FROM list_items ORDER BY position ASC')
    ]);
    
    const lists = listsRes.rows.map(l => ({
      id: l.id,
      title: l.title,
      color: l.color,
      createdAt: l.created_at?.toISOString() || null,
      order: l.order
    }));
    
    const items: ListItem[] = itemsRes.rows.map(i => ({
      id: i.id,
      listId: i.list_id,
      text: i.text,
      completed: i.completed ?? false,
      createdAt: i.created_at?.toISOString() || null,
      position: i.position ?? undefined
    }));
    
    // Join them
    const listsWithItems: List[] = lists.map(list => {
      const listItems = items.filter(i => i.listId === list.id);
      return { ...list, items: listItems };
    });
    
    res.json(listsWithItems);
  } catch (e) {
    const error = e as Error;
    res.status(500).json({ error: error.message });
  }
});

// Create a new list
router.post('/lists', async (req: Request<object, object, CreateListRequest>, res: Response) => {
  const { id, title, color, order } = req.body;
  if (!id || !title) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const createdAt = new Date().toISOString();
    await db.query(`
      INSERT INTO lists (id, title, color, created_at, "order")
      VALUES ($1, $2, $3, $4, $5)
    `, [id, title, color || '#2D2D2D', createdAt, order || null]);
    
    const list: List = {
      id, title, color: color || '#2D2D2D', createdAt, items: [], order: order || null
    };
    res.json(list);
  } catch (e) {
    const error = e as Error;
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// IMPORTANT: Static routes like /lists/reorder MUST be defined BEFORE 
// parameterized routes like /lists/:id, otherwise Express will match 
// "reorder" as an :id parameter!
// ============================================================================

// Reorder lists (batch update all list orders - uses numeric ordering)
router.patch('/lists/reorder', async (req: Request<object, object, { listOrder: string[] }>, res: Response) => {
  const { listOrder } = req.body;

  if (!listOrder || !Array.isArray(listOrder)) {
    return res.status(400).json({ error: 'listOrder array is required' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    
    // Update order for each list based on its index in the listOrder array
    for (let i = 0; i < listOrder.length; i++) {
      await client.query(
        'UPDATE lists SET "order" = $1 WHERE id = $2',
        [String(i), listOrder[i]]
      );
    }
    
    await client.query('COMMIT');
    res.json({ ok: true, listOrder });
  } catch (e) {
    await client.query('ROLLBACK');
    const error = e as Error;
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Update a list (title or items)
router.patch('/lists/:id', async (req: Request<{ id: string }, object, UpdateListRequest>, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    
    // 1. Update List Metadata
    if (updates.title || updates.color || updates.order !== undefined) {
      const fields: string[] = [];
      const values: unknown[] = [id];
      let idx = 2;
      
      if (updates.title) { fields.push(`title = $${idx++}`); values.push(updates.title); }
      if (updates.color) { fields.push(`color = $${idx++}`); values.push(updates.color); }
      if (updates.order !== undefined) { fields.push(`"order" = $${idx++}`); values.push(updates.order); }
      
      if (fields.length > 0) {
        await client.query(`
          UPDATE lists SET ${fields.join(', ')} WHERE id = $1
        `, values);
      }
    }

    // 2. Update List Items (Full Replace Strategy for simplicity/correctness with UI)
    if (updates.items && Array.isArray(updates.items)) {
      // Delete old items
      await client.query('DELETE FROM list_items WHERE list_id = $1', [id]);
      
      // Insert new items
      for (let i = 0; i < updates.items.length; i++) {
        const item = updates.items[i];
        await client.query(`
          INSERT INTO list_items (id, list_id, text, completed, created_at, position)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          item.id, 
          id, 
          item.text || '', 
          item.completed || false, 
          item.createdAt || new Date().toISOString(), 
          i // position
        ]);
      }
    }

    await client.query('COMMIT');
    
    res.json({ ...updates, id }); 
  } catch (e) {
    await client.query('ROLLBACK');
    const error = e as Error;
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Delete a list
router.delete('/lists/:id', async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM list_items WHERE list_id = $1', [id]);
    await client.query('DELETE FROM lists WHERE id = $1', [id]);
    await client.query('COMMIT');
    
    res.json({ ok: true });
  } catch (e) {
    await client.query('ROLLBACK');
    const error = e as Error;
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Reorder a single list (update order only) - for individual list order change
router.patch('/lists/:id/reorder', async (req: Request<{ id: string }, object, { order: string }>, res: Response) => {
  const { id } = req.params;
  const { order } = req.body;

  if (!order) {
    return res.status(400).json({ error: 'order is required' });
  }

  try {
    const result = await db.query<DbList>(`
      UPDATE lists SET "order" = $2 WHERE id = $1 RETURNING *
    `, [id, order]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: `List with ID ${id} not found` });
    }

    const l = result.rows[0];
    res.json({
      id: l.id,
      title: l.title,
      color: l.color,
      createdAt: l.created_at?.toISOString() || null,
      order: l.order
    });
  } catch (e) {
    const error = e as Error;
    res.status(500).json({ error: error.message });
  }
});

// Reorder list items (position update only - optimized)
router.patch('/lists/:id/reorder-items', async (req: Request<{ id: string }, object, { itemOrder: string[] }>, res: Response) => {
  const { id } = req.params;
  const { itemOrder } = req.body;

  if (!itemOrder || !Array.isArray(itemOrder)) {
    return res.status(400).json({ error: 'itemOrder array is required' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    
    // Update position for each item based on its index in the itemOrder array
    for (let i = 0; i < itemOrder.length; i++) {
      await client.query(
        'UPDATE list_items SET position = $1 WHERE id = $2 AND list_id = $3',
        [i, itemOrder[i], id]
      );
    }
    
    await client.query('COMMIT');
    res.json({ ok: true, itemOrder });
  } catch (e) {
    await client.query('ROLLBACK');
    const error = e as Error;
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

export default router;
