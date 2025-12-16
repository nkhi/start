const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all lists
router.get('/lists', async (req, res) => {
  try {
    // Fetch lists and items in parallel
    const [listsRes, itemsRes] = await Promise.all([
      db.query('SELECT * FROM lists'),
      db.query('SELECT * FROM list_items ORDER BY position ASC')
    ]);
    
    const lists = listsRes.rows.map(l => ({
      ...l,
      createdAt: l.created_at,
      order: l.order
    }));
    
    const items = itemsRes.rows.map(i => ({
      ...i,
      listId: i.list_id,
      createdAt: i.created_at
    }));
    
    // Join them
    const listsWithItems = lists.map(list => {
      const listItems = items.filter(i => i.listId === list.id);
      return { ...list, items: listItems };
    });
    
    res.json(listsWithItems);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Create a new list
router.post('/lists', async (req, res) => {
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
    
    res.json({
      id, title, color, createdAt, items: [], order
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update a list (title or items)
router.patch('/lists/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    
    // 1. Update List Metadata
    if (updates.title || updates.color || updates.order !== undefined) {
      const fields = [];
      const values = [id];
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
    
    // Fetch updated list to return
    // (Simplification: just return what we have, or do a fresh fetch if needed. 
    // For now, let's just return success/updates as the UI usually updates optimistically)
    res.json({ ...updates, id }); 
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

// Delete a list
router.delete('/lists/:id', async (req, res) => {
  const { id } = req.params;

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    // Delete items first (foreign key constraint usually handles this if CASCADE, but being safe)
    await client.query('DELETE FROM list_items WHERE list_id = $1', [id]);
    await client.query('DELETE FROM lists WHERE id = $1', [id]);
    await client.query('COMMIT');
    
    res.json({ ok: true });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

// Reorder a list (update order only)
router.patch('/lists/:id/reorder', async (req, res) => {
  const { id } = req.params;
  const { order } = req.body;

  if (!order) {
    return res.status(400).json({ error: 'order is required' });
  }

  try {
    const result = await db.query(`
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
      createdAt: l.created_at,
      order: l.order
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
