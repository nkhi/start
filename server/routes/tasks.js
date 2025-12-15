const express = require('express');
const router = express.Router();
const db = require('../db');
const { logToFile } = require('../logger');

// Get tasks for a specific week/range
router.get('/tasks/week', async (req, res) => {
  const { start, end } = req.query;
  if (!start || !end) {
    return res.status(400).json({ error: 'Missing start/end date parameters' });
  }

  try {
    const result = await db.query(`
      SELECT * FROM tasks 
      WHERE date >= $1 AND date <= $2
    `, [start, end]);

    // Convert flat DB rows back to date-keyed object
    const tasksByDate = {};
    result.rows.forEach(t => {
      const dateStr = typeof t.date === 'string' ? t.date : t.date.toISOString().split('T')[0];

      if (!tasksByDate[dateStr]) tasksByDate[dateStr] = [];

      tasksByDate[dateStr].push({
        id: t.id,
        text: t.text,
        completed: t.completed,
        date: dateStr,
        createdAt: t.created_at,
        category: t.category,
        state: t.state
      });
    });
    res.json(tasksByDate);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get only work tasks (for work mode - privacy on work laptops)
router.get('/tasks/work', async (req, res) => {
  try {
    const result = await db.query(`SELECT * FROM tasks WHERE category = 'work'`);

    const tasksByDate = {};
    result.rows.forEach(t => {
      const dateStr = typeof t.date === 'string' ? t.date : t.date.toISOString().split('T')[0];
      if (!tasksByDate[dateStr]) tasksByDate[dateStr] = [];
      tasksByDate[dateStr].push({
        id: t.id,
        text: t.text,
        completed: t.completed,
        date: dateStr,
        createdAt: t.created_at,
        category: t.category,
        state: t.state
      });
    });
    res.json(tasksByDate);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get all tasks (bulk fetch for initial load)
router.get('/tasks', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM tasks');

    // Convert flat DB rows back to date-keyed object
    const tasksByDate = {};
    result.rows.forEach(t => {
      // Format date to YYYY-MM-DD string if it's a Date object
      const dateStr = typeof t.date === 'string' ? t.date : t.date.toISOString().split('T')[0];

      if (!tasksByDate[dateStr]) tasksByDate[dateStr] = [];

      tasksByDate[dateStr].push({
        id: t.id,
        text: t.text,
        completed: t.completed,
        date: dateStr,
        createdAt: t.created_at,
        category: t.category,
        state: t.state
      });
    });
    res.json(tasksByDate);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Create a single task
router.post('/tasks', async (req, res) => {
  const { id, text, completed, date, createdAt, category, state } = req.body;
  if (!id || !date) {
    return res.status(400).json({ error: 'Missing required fields: id, date' });
  }

  try {
    await db.query(`
      INSERT INTO tasks (id, text, completed, date, created_at, category, state)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      id,
      text || '',
      completed || false,
      date,
      createdAt || new Date().toISOString(),
      category || 'life',
      state || 'active'
    ]);

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update a single task
router.patch('/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  // Build dynamic update query
  const fields = [];
  const values = [id];
  let idx = 2;

  if (updates.text !== undefined) {
    fields.push(`text = $${idx++}`);
    values.push(updates.text);
  }
  if (updates.completed !== undefined) {
    fields.push(`completed = $${idx++}`);
    values.push(updates.completed);
  }
  if (updates.date !== undefined) {
    fields.push(`date = $${idx++}`);
    values.push(updates.date);
  }
  if (updates.category !== undefined) {
    fields.push(`category = $${idx++}`);
    values.push(updates.category);
  }
  if (updates.state !== undefined) {
    fields.push(`state = $${idx++}`);
    values.push(updates.state);
  }

  if (fields.length === 0) {
    return res.json({ ok: true }); // Nothing to update
  }

  try {
    const result = await db.query(`
      UPDATE tasks 
      SET ${fields.join(', ')}
      WHERE id = $1
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      const msg = `[SERVER] ⚠️ Task not found for update: ${id}`;
      console.log(msg);
      logToFile(msg);
      return res.status(404).json({ error: `Task with ID ${id} not found` });
    }

    const t = result.rows[0];
    const dateStr = typeof t.date === 'string' ? t.date : t.date.toISOString().split('T')[0];

    res.json({
      id: t.id,
      text: t.text,
      completed: t.completed,
      date: dateStr,
      createdAt: t.created_at,
      category: t.category,
      state: t.state
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete a single task
router.delete('/tasks/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query('DELETE FROM tasks WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update a single task by ID (PUT)
router.put('/tasks/:id', async (req, res) => {
  const taskId = req.params.id;
  const task = req.body;

  if (!task || typeof task !== 'object') {
    return res.status(400).json({ error: 'Body must be a task object' });
  }

  const client = await db.pool.connect();
  try {
    await client.query(`
      UPDATE tasks 
      SET text = $1,
          completed = $2,
          date = $3,
          category = $4,
          state = $5
      WHERE id = $6
    `, [
      task.text || '',
      task.completed || false,
      task.date || '',
      task.category || 'life',
      task.state || 'active',
      taskId
    ]);

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

module.exports = router;
