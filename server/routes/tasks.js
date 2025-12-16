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
        state: t.state,
        order: t.order
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
        state: t.state,
        order: t.order
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
        state: t.state,
        order: t.order
      });
    });
    res.json(tasksByDate);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get task counts by state for each date
router.get('/tasks/counts', async (req, res) => {
  const { category } = req.query; // Optional: filter by category (life/work)
  
  try {
    let query = 'SELECT date, state, completed, COUNT(*) as count FROM tasks';
    const params = [];
    
    if (category) {
      query += ' WHERE category = $1';
      params.push(category);
    }
    
    query += ' GROUP BY date, state, completed';
    
    const result = await db.query(query, params);

    // Build counts by date
    const countsByDate = {};
    
    result.rows.forEach(row => {
      const dateStr = typeof row.date === 'string' ? row.date : row.date.toISOString().split('T')[0];
      
      if (!countsByDate[dateStr]) {
        countsByDate[dateStr] = { active: 0, completed: 0, failed: 0 };
      }
      
      // Determine state (handle legacy tasks without state field)
      const state = row.state || (row.completed ? 'completed' : 'active');
      const count = parseInt(row.count, 10);
      
      if (state === 'completed') {
        countsByDate[dateStr].completed += count;
      } else if (state === 'failed') {
        countsByDate[dateStr].failed += count;
      } else {
        countsByDate[dateStr].active += count;
      }
    });
    
    res.json(countsByDate);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get tasks grouped by state (active, completed, failed) for each date
router.get('/tasks/grouped', async (req, res) => {
  const { category } = req.query; // Optional: filter by category (life/work)
  
  try {
    let query = 'SELECT * FROM tasks';
    const params = [];
    
    if (category) {
      query += ' WHERE category = $1';
      params.push(category);
    }
    
    const result = await db.query(query, params);

    // Group tasks by date, then by state
    const groupedByDate = {};
    
    result.rows.forEach(t => {
      const dateStr = typeof t.date === 'string' ? t.date : t.date.toISOString().split('T')[0];
      
      if (!groupedByDate[dateStr]) {
        groupedByDate[dateStr] = {
          active: [],
          completed: [],
          failed: []
        };
      }
      
      const task = {
        id: t.id,
        text: t.text,
        completed: t.completed,
        date: dateStr,
        createdAt: t.created_at,
        category: t.category,
        state: t.state || 'active',
        order: t.order
      };
      
      // Determine state (handle legacy tasks without state field)
      const state = t.state || (t.completed ? 'completed' : 'active');
      
      if (state === 'completed') {
        groupedByDate[dateStr].completed.push(task);
      } else if (state === 'failed') {
        groupedByDate[dateStr].failed.push(task);
      } else {
        groupedByDate[dateStr].active.push(task);
      }
    });
    
    res.json(groupedByDate);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Create a single task
router.post('/tasks', async (req, res) => {
  const { id, text, completed, date, createdAt, category, state, order } = req.body;
  if (!id || !date) {
    return res.status(400).json({ error: 'Missing required fields: id, date' });
  }

  try {
    await db.query(`
      INSERT INTO tasks (id, text, completed, date, created_at, category, state, "order")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      id,
      text || '',
      completed || false,
      date,
      createdAt || new Date().toISOString(),
      category || 'life',
      state || 'active',
      order || null
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
  if (updates.order !== undefined) {
    fields.push(`"order" = $${idx++}`);
    values.push(updates.order);
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
      state: t.state,
      order: t.order
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

// Batch punt tasks (mark as failed + create new tasks for next day)
router.post('/tasks/batch/punt', async (req, res) => {
  const { taskIds, sourceDate, targetDate } = req.body;
  
  if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
    return res.status(400).json({ error: 'taskIds must be a non-empty array' });
  }
  if (!sourceDate || !targetDate) {
    return res.status(400).json({ error: 'sourceDate and targetDate are required' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    
    // Get all tasks to punt
    const tasksResult = await client.query(
      'SELECT * FROM tasks WHERE id = ANY($1)',
      [taskIds]
    );
    
    const newTasks = [];
    
    for (const task of tasksResult.rows) {
      // Mark original as failed
      await client.query(
        'UPDATE tasks SET state = $1, completed = $2 WHERE id = $3',
        ['failed', false, task.id]
      );
      
      // Create new task for target date
      const newId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await client.query(
        'INSERT INTO tasks (id, text, completed, date, created_at, category, state) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [newId, task.text, false, targetDate, new Date().toISOString(), task.category, 'active']
      );
      
      newTasks.push({
        id: newId,
        text: task.text,
        completed: false,
        date: targetDate,
        createdAt: new Date().toISOString(),
        category: task.category,
        state: 'active'
      });
    }
    
    await client.query('COMMIT');
    res.json({ ok: true, newTasks });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

// Batch fail tasks
router.post('/tasks/batch/fail', async (req, res) => {
  const { taskIds } = req.body;
  
  if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
    return res.status(400).json({ error: 'taskIds must be a non-empty array' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    
    await client.query(
      'UPDATE tasks SET state = $1, completed = $2 WHERE id = ANY($3)',
      ['failed', false, taskIds]
    );
    
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

// Reorder a task (update order, optionally move to new date/category)
router.patch('/tasks/:id/reorder', async (req, res) => {
  const { id } = req.params;
  const { order, date, category, state } = req.body;

  if (!order) {
    return res.status(400).json({ error: 'order is required' });
  }

  const fields = ['"order" = $2'];
  const values = [id, order];
  let idx = 3;

  if (date !== undefined) {
    fields.push(`date = $${idx++}`);
    values.push(date);
  }
  if (category !== undefined) {
    fields.push(`category = $${idx++}`);
    values.push(category);
  }
  if (state !== undefined) {
    fields.push(`state = $${idx++}`);
    values.push(state);
  }

  try {
    const result = await db.query(`
      UPDATE tasks 
      SET ${fields.join(', ')}
      WHERE id = $1
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
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
      state: t.state,
      order: t.order
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Batch reorder tasks (for future multi-selection drag)
router.post('/tasks/batch/reorder', async (req, res) => {
  const { moves } = req.body;
  
  if (!moves || !Array.isArray(moves) || moves.length === 0) {
    return res.status(400).json({ error: 'moves must be a non-empty array' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    
    for (const move of moves) {
      const { id, order, date, category, state } = move;
      if (!id || !order) continue;
      
      const fields = ['"order" = $2'];
      const values = [id, order];
      let idx = 3;

      if (date !== undefined) {
        fields.push(`date = $${idx++}`);
        values.push(date);
      }
      if (category !== undefined) {
        fields.push(`category = $${idx++}`);
        values.push(category);
      }
      if (state !== undefined) {
        fields.push(`state = $${idx++}`);
        values.push(state);
      }

      await client.query(`
        UPDATE tasks SET ${fields.join(', ')} WHERE id = $1
      `, values);
    }
    
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

module.exports = router;
