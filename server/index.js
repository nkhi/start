const express = require('express');
const cors = require('cors');
const db = require('./db');

console.log('[SERVER] 🏁 Starting server process...');

const app = express();
app.use(cors());
app.use(express.json());

// Comprehensive logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`\n[SERVER] ${timestamp}`);
  console.log(`[SERVER] → ${req.method} ${req.path}`);
  
  if (Object.keys(req.query).length > 0) {
    console.log(`[SERVER]   Query:`, req.query);
  }
  
  if (req.body && Object.keys(req.body).length > 0) {
    console.log(`[SERVER]   Body:`, JSON.stringify(req.body, null, 2));
  }

  // Capture the original send and json functions
  const originalSend = res.send;
  const originalJson = res.json;
  
  res.send = function(data) {
    console.log(`[SERVER] ← ${res.statusCode} ${req.method} ${req.path}`);
    if (res.statusCode >= 400) {
      console.log(`[SERVER]   Error Response:`, data);
    }
    return originalSend.call(this, data);
  };
  
  res.json = function(data) {
    console.log(`[SERVER] ← ${res.statusCode} ${req.method} ${req.path}`);
    if (res.statusCode >= 400) {
      console.log(`[SERVER]   Error Response:`, data);
    }
    return originalJson.call(this, data);
  };

  next();
});

// --- API Endpoints ---

// Get all active habits (ordered)
app.get('/habits', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT * FROM habits 
      WHERE active = true 
      ORDER BY "order" ASC, id ASC
    `);
    
    // Convert types to match frontend expectations
    const habits = result.rows.map(h => ({
      ...h,
      defaultTime: h.default_time, // map snake_case to camelCase
      createdDate: h.created_date
    }));
    
    res.json(habits);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get entries in a date range
app.get('/habit-entries', async (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ error: 'Missing from/to' });
  
  try {
    const result = await db.query(`
      SELECT * FROM entries 
      WHERE date >= $1 AND date <= $2
    `, [from, to]);
    
    const entries = result.rows.map(e => ({
      ...e,
      entryId: e.entry_id,
      habitId: e.habit_id
    }));
    
    res.json(entries);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Upsert a habit entry
app.post('/habit-entry', async (req, res) => {
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
    res.status(500).json({ error: e.message });
  }
});

// Seed/replace HabitConfig (Not typically used in prod, but kept for compatibility)
app.post('/seed-habits', async (req, res) => {
  // Skipping implementation as it's destructive and we have real data now
  res.status(501).json({ error: 'Seeding disabled in DB mode' });
});

// Get vlog for a specific week
app.get('/vlogs/:weekStartDate', async (req, res) => {
  const { weekStartDate } = req.params;
  try {
    const result = await db.query(`
      SELECT * FROM vlogs WHERE week_start_date = $1
    `, [weekStartDate]);
    
    if (result.rows.length === 0) return res.json(null);
    
    const v = result.rows[0];
    res.json({
      weekStartDate: v.week_start_date, // Date object might need formatting? Postgres returns Date object
      videoUrl: v.video_url,
      embedHtml: v.embed_html
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Save a vlog for a specific week
app.post('/vlogs', async (req, res) => {
  const { weekStartDate, videoUrl, embedHtml } = req.body;
  if (!weekStartDate || !videoUrl || !embedHtml) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  try {
    await db.query(`
      INSERT INTO vlogs (week_start_date, video_url, embed_html)
      VALUES ($1, $2, $3)
      ON CONFLICT (week_start_date)
      DO UPDATE SET video_url = EXCLUDED.video_url, embed_html = EXCLUDED.embed_html
    `, [weekStartDate, videoUrl, embedHtml]);
    
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get all tasks (bulk fetch for initial load)
app.get('/tasks', async (req, res) => {
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
app.post('/tasks', async (req, res) => {
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
app.patch('/tasks/:id', async (req, res) => {
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
      return res.status(404).json({ error: 'Task not found' });
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
app.delete('/tasks/:id', async (req, res) => {
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

// --- Diary Endpoints ---

// Get all active questions
app.get('/questions', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT * FROM questions 
      WHERE active = true 
      ORDER BY "order" ASC
    `);
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Add a new question
app.post('/questions', async (req, res) => {
  const { id, text, order, active, date } = req.body;
  if (!id || !text) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  try {
    await db.query(`
      INSERT INTO questions (id, text, "order", active, date)
      VALUES ($1, $2, $3, $4, $5)
    `, [id, text, order || 999, active !== undefined ? active : true, date || '']);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get all diary entries (bulk fetch for initial load)
app.get('/diary', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM diary_entries');
    
    const diaryByDate = {};
    result.rows.forEach(e => {
      const dateStr = typeof e.date === 'string' ? e.date : e.date.toISOString().split('T')[0];
      
      if (!diaryByDate[dateStr]) diaryByDate[dateStr] = [];
      
      diaryByDate[dateStr].push({
        id: e.id,
        date: dateStr,
        questionId: e.question_id,
        answer: e.answer,
        createdAt: e.created_at
      });
    });
    res.json(diaryByDate);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Create a single diary entry
app.post('/diary-entries', async (req, res) => {
  const { id, date, questionId, answer, createdAt } = req.body;
  if (!id || !date || !questionId) {
    return res.status(400).json({ error: 'Missing required fields: id, date, questionId' });
  }
  
  try {
    await db.query(`
      INSERT INTO diary_entries (id, date, question_id, answer, created_at)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id)
      DO UPDATE SET 
        answer = EXCLUDED.answer,
        date = EXCLUDED.date,
        question_id = EXCLUDED.question_id
    `, [id, date, questionId, answer || '', createdAt || new Date().toISOString()]);
    
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update a single diary entry
app.patch('/diary-entries/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  // Build dynamic update query
  const fields = [];
  const values = [id];
  let idx = 2;
  
  if (updates.answer !== undefined) {
    fields.push(`answer = $${idx++}`);
    values.push(updates.answer);
  }
  if (updates.date !== undefined) {
    fields.push(`date = $${idx++}`);
    values.push(updates.date);
  }
  if (updates.questionId !== undefined) {
    fields.push(`question_id = $${idx++}`);
    values.push(updates.questionId);
  }
  
  if (fields.length === 0) {
    return res.json({ ok: true }); // Nothing to update
  }
  
  try {
    const result = await db.query(`
      UPDATE diary_entries 
      SET ${fields.join(', ')}
      WHERE id = $1
      RETURNING *
    `, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Diary entry not found' });
    }
    
    const e = result.rows[0];
    const dateStr = typeof e.date === 'string' ? e.date : e.date.toISOString().split('T')[0];
    
    res.json({
      id: e.id,
      date: dateStr,
      questionId: e.question_id,
      answer: e.answer,
      createdAt: e.created_at
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete a single diary entry
app.delete('/diary-entries/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await db.query('DELETE FROM diary_entries WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Diary entry not found' });
    }
    
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Next Endpoints ---

// Get all active next items
app.get('/next', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT * FROM next_items 
      WHERE deleted_at IS NULL AND started_at IS NULL
    `);
    
    const items = result.rows.map(item => ({
      ...item,
      createdAt: item.created_at,
      deletedAt: item.deleted_at,
      startedAt: item.started_at
    }));
    
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Add a new next item
app.post('/next', async (req, res) => {
  const { id, title, content, color, size } = req.body;
  if (!id || !title) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const createdAt = new Date().toISOString();
    await db.query(`
      INSERT INTO next_items (id, title, content, color, size, created_at)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [id, title, content || '', color || '#2D2D2D', size || 'medium', createdAt]);
    
    res.json({
      id, title, content, color, size, createdAt, deletedAt: null, startedAt: null
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update a next item
app.patch('/next/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  // Map camelCase to snake_case for DB
  const dbUpdates = {};
  if (updates.title) dbUpdates.title = updates.title;
  if (updates.content) dbUpdates.content = updates.content;
  if (updates.color) dbUpdates.color = updates.color;
  if (updates.size) dbUpdates.size = updates.size;
  if (updates.deletedAt) dbUpdates.deleted_at = updates.deletedAt;
  if (updates.startedAt) dbUpdates.started_at = updates.startedAt;
  
  if (Object.keys(dbUpdates).length === 0) return res.json({ ok: true }); // Nothing to update

  try {
    const setClause = Object.keys(dbUpdates).map((key, i) => `${key} = $${i + 2}`).join(', ');
    const values = Object.values(dbUpdates);
    
    const result = await db.query(`
      UPDATE next_items 
      SET ${setClause}
      WHERE id = $1
      RETURNING *
    `, [id, ...values]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    const item = result.rows[0];
    res.json({
      ...item,
      createdAt: item.created_at,
      deletedAt: item.deleted_at,
      startedAt: item.started_at
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Lists Endpoints ---

// Get all lists
app.get('/lists', async (req, res) => {
  try {
    // Fetch lists and items in parallel
    const [listsRes, itemsRes] = await Promise.all([
      db.query('SELECT * FROM lists'),
      db.query('SELECT * FROM list_items ORDER BY position ASC')
    ]);
    
    const lists = listsRes.rows.map(l => ({
      ...l,
      createdAt: l.created_at
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
app.post('/lists', async (req, res) => {
  const { id, title, color } = req.body;
  if (!id || !title) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const createdAt = new Date().toISOString();
    await db.query(`
      INSERT INTO lists (id, title, color, created_at)
      VALUES ($1, $2, $3, $4)
    `, [id, title, color || '#2D2D2D', createdAt]);
    
    res.json({
      id, title, color, createdAt, items: []
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update a list (title or items)
app.patch('/lists/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    
    // 1. Update List Metadata
    if (updates.title || updates.color) {
      const fields = [];
      const values = [id];
      let idx = 2;
      
      if (updates.title) { fields.push(`title = $${idx++}`); values.push(updates.title); }
      if (updates.color) { fields.push(`color = $${idx++}`); values.push(updates.color); }
      
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
app.delete('/lists/:id', async (req, res) => {
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log(`[SERVER] 🚀 API running on http://0.0.0.0:${PORT}`);
  console.log(`[SERVER] 🐘 Connected to CockroachDB`);
  console.log(`[SERVER] 📝 Verbose logging enabled`);
  console.log('='.repeat(60) + '\n');
});
