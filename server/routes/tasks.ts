import express, { Request, Response } from 'express';
import * as db from '../db.ts';
import { logToFile } from '../logger.ts';
import type { DbTask } from '../db-types.ts';
import type { 
  Task, TasksByDate, GroupedTasks, TaskCounts,
  CreateTaskRequest, UpdateTaskRequest, ReorderRequest,
  BatchPuntRequest, BatchFailRequest, BatchReorderRequest
} from '../../shared/types.ts';
import { formatDate } from '../../shared/types.ts';

const router = express.Router();

// Helper to transform DB row to API response
function dbTaskToTask(t: DbTask): Task {
  const createdAtStr = t.created_at?.toISOString() || new Date().toISOString();
  
  // Handle null dates (graveyard tasks)
  if (!t.date) {
    return {
      id: t.id,
      text: t.text,
      completed: t.completed ?? false,
      date: null,
      createdAt: createdAtStr,
      category: t.category || 'life',
      state: t.state || 'active',
      order: t.order,
      puntDays: 0
    };
  }
  
  const dateStr = formatDate(t.date);
  
  // Calculate punt days: difference between active date and created date
  const activeDate = new Date(dateStr + 'T00:00:00Z');
  const createdDate = new Date(createdAtStr);
  const createdDateOnly = new Date(createdDate.toISOString().split('T')[0] + 'T00:00:00Z');
  const puntDays = Math.max(0, Math.floor((activeDate.getTime() - createdDateOnly.getTime()) / (1000 * 60 * 60 * 24)));
  
  return {
    id: t.id,
    text: t.text,
    completed: t.completed ?? false,
    date: dateStr,
    createdAt: createdAtStr,
    category: t.category || 'life',
    state: t.state || 'active',
    order: t.order,
    puntDays
  };
}

// Get tasks for a specific week/range
router.get('/tasks/week', async (req: Request, res: Response) => {
  const { start, end } = req.query as { start?: string; end?: string };
  if (!start || !end) {
    return res.status(400).json({ error: 'Missing start/end date parameters' });
  }

  try {
    const result = await db.query<DbTask>(`
      SELECT * FROM tasks 
      WHERE date >= $1 AND date <= $2
    `, [start, end]);

    const tasksByDate: TasksByDate = {};
    result.rows.forEach(t => {
      const dateStr = formatDate(t.date!);
      if (!tasksByDate[dateStr]) tasksByDate[dateStr] = [];
      tasksByDate[dateStr].push(dbTaskToTask(t));
    });
    res.json(tasksByDate);
  } catch (e) {
    const error = e as Error;
    res.status(500).json({ error: error.message });
  }
});

// Get only work tasks (for work mode - privacy on work laptops)
router.get('/tasks/work', async (_req: Request, res: Response) => {
  try {
    const result = await db.query<DbTask>(`SELECT * FROM tasks WHERE category = 'work' AND date IS NOT NULL`);

    const tasksByDate: TasksByDate = {};
    result.rows.forEach(t => {
      const dateStr = formatDate(t.date!);
      if (!tasksByDate[dateStr]) tasksByDate[dateStr] = [];
      tasksByDate[dateStr].push(dbTaskToTask(t));
    });
    res.json(tasksByDate);
  } catch (e) {
    const error = e as Error;
    res.status(500).json({ error: error.message });
  }
});

// Get all tasks (bulk fetch for initial load)
router.get('/tasks', async (_req: Request, res: Response) => {
  try {
    const result = await db.query<DbTask>('SELECT * FROM tasks WHERE date IS NOT NULL');

    const tasksByDate: TasksByDate = {};
    result.rows.forEach(t => {
      const dateStr = formatDate(t.date!);
      if (!tasksByDate[dateStr]) tasksByDate[dateStr] = [];
      tasksByDate[dateStr].push(dbTaskToTask(t));
    });
    res.json(tasksByDate);
  } catch (e) {
    const error = e as Error;
    res.status(500).json({ error: error.message });
  }
});

// Get task counts by state for each date
router.get('/tasks/counts', async (req: Request, res: Response) => {
  const { category } = req.query as { category?: string };
  
  try {
    let queryText = 'SELECT date, state, completed, COUNT(*) as count FROM tasks WHERE date IS NOT NULL';
    const params: string[] = [];
    
    if (category) {
      queryText += ' AND category = $1';
      params.push(category);
    }
    
    queryText += ' GROUP BY date, state, completed';
    
    const result = await db.query<{ date: Date; state: string | null; completed: boolean | null; count: string }>(queryText, params);

    const countsByDate: TaskCounts = {};
    
    result.rows.forEach(row => {
      const dateStr = formatDate(row.date);
      
      if (!countsByDate[dateStr]) {
        countsByDate[dateStr] = { active: 0, completed: 0, failed: 0 };
      }
      
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
    const error = e as Error;
    res.status(500).json({ error: error.message });
  }
});

// Get tasks grouped by state (active, completed, failed) for each date
router.get('/tasks/grouped', async (req: Request, res: Response) => {
  const { category } = req.query as { category?: string };
  
  try {
    let queryText = 'SELECT * FROM tasks WHERE date IS NOT NULL';
    const params: string[] = [];
    
    if (category) {
      queryText += ' AND category = $1';
      params.push(category);
    }
    
    const result = await db.query<DbTask>(queryText, params);

    const groupedByDate: GroupedTasks = {};
    
    result.rows.forEach(t => {
      const dateStr = formatDate(t.date!);
      
      if (!groupedByDate[dateStr]) {
        groupedByDate[dateStr] = { active: [], completed: [], failed: [] };
      }
      
      const task = dbTaskToTask(t);
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
    const error = e as Error;
    res.status(500).json({ error: error.message });
  }
});

// Create a single task
router.post('/tasks', async (req: Request<object, object, CreateTaskRequest>, res: Response) => {
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
    const error = e as Error;
    res.status(500).json({ error: error.message });
  }
});

// Update a single task
router.patch('/tasks/:id', async (req: Request<{ id: string }, object, UpdateTaskRequest>, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

  const fields: string[] = [];
  const values: unknown[] = [id];
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
    return res.json({ ok: true });
  }

  try {
    const result = await db.query<DbTask>(`
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

    res.json(dbTaskToTask(result.rows[0]));
  } catch (e) {
    const error = e as Error;
    res.status(500).json({ error: error.message });
  }
});

// Delete a single task
router.delete('/tasks/:id', async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;

  try {
    const result = await db.query<{ id: string }>('DELETE FROM tasks WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ ok: true });
  } catch (e) {
    const error = e as Error;
    res.status(500).json({ error: error.message });
  }
});

// Update a single task by ID (PUT)
router.put('/tasks/:id', async (req: Request<{ id: string }, object, Partial<Task>>, res: Response) => {
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
    const error = e as Error;
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Batch punt tasks (mark as failed + create new tasks for next day)
router.post('/tasks/batch/punt', async (req: Request<object, object, BatchPuntRequest>, res: Response) => {
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
    
    const tasksResult = await client.query<DbTask>(
      'SELECT * FROM tasks WHERE id = ANY($1)',
      [taskIds]
    );
    
    const newTasks: Task[] = [];
    
    for (const task of tasksResult.rows) {
      await client.query(
        'UPDATE tasks SET state = $1, completed = $2 WHERE id = $3',
        ['failed', false, task.id]
      );
      
      const newId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      // Preserve original created_at for puntDays tracking
      const originalCreatedAt = task.created_at?.toISOString() || new Date().toISOString();
      await client.query(
        'INSERT INTO tasks (id, text, completed, date, created_at, category, state) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [newId, task.text, false, targetDate, originalCreatedAt, task.category, 'active']
      );
      
      newTasks.push({
        id: newId,
        text: task.text,
        completed: false,
        date: targetDate,
        createdAt: originalCreatedAt,
        category: task.category || 'life',
        state: 'active',
        order: null
      });
    }
    
    await client.query('COMMIT');
    res.json({ ok: true, newTasks });
  } catch (e) {
    await client.query('ROLLBACK');
    const error = e as Error;
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Batch fail tasks
router.post('/tasks/batch/fail', async (req: Request<object, object, BatchFailRequest>, res: Response) => {
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
    const error = e as Error;
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Batch graveyard tasks (set date = NULL for all)
router.post('/tasks/batch/graveyard', async (req: Request<object, object, { taskIds: string[] }>, res: Response) => {
  const { taskIds } = req.body;
  
  if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
    return res.status(400).json({ error: 'taskIds must be a non-empty array' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    
    await client.query(
      'UPDATE tasks SET date = NULL, state = $1, completed = $2 WHERE id = ANY($3)',
      ['active', false, taskIds]
    );
    
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

// Reorder a task (update order, optionally move to new date/category)
router.patch('/tasks/:id/reorder', async (req: Request<{ id: string }, object, ReorderRequest>, res: Response) => {
  const { id } = req.params;
  const { order, date, category, state } = req.body;

  if (!order) {
    return res.status(400).json({ error: 'order is required' });
  }

  const fields = ['"order" = $2'];
  const values: unknown[] = [id, order];
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
    const result = await db.query<DbTask>(`
      UPDATE tasks 
      SET ${fields.join(', ')}
      WHERE id = $1
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: `Task with ID ${id} not found` });
    }

    res.json(dbTaskToTask(result.rows[0]));
  } catch (e) {
    const error = e as Error;
    res.status(500).json({ error: error.message });
  }
});

// Batch reorder tasks (for future multi-selection drag)
router.post('/tasks/batch/reorder', async (req: Request<object, object, BatchReorderRequest>, res: Response) => {
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
      const values: unknown[] = [id, order];
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
    const error = e as Error;
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// ============================================
// Graveyard Endpoints
// ============================================

// Get all graveyarded tasks (date IS NULL)
router.get('/tasks/graveyard', async (_req: Request, res: Response) => {
  try {
    const result = await db.query<DbTask>('SELECT * FROM tasks WHERE date IS NULL ORDER BY created_at DESC');
    const tasks = result.rows.map(dbTaskToTask);
    res.json(tasks);
  } catch (e) {
    const error = e as Error;
    res.status(500).json({ error: error.message });
  }
});

// Move a task to the graveyard (set date = NULL)
router.patch('/tasks/:id/graveyard', async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;

  try {
    const result = await db.query<DbTask>(`
      UPDATE tasks 
      SET date = NULL, state = 'active', completed = false
      WHERE id = $1
      RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: `Task with ID ${id} not found` });
    }

    res.json(dbTaskToTask(result.rows[0]));
  } catch (e) {
    const error = e as Error;
    res.status(500).json({ error: error.message });
  }
});

// Resurrect a task from the graveyard (set date to target date)
router.patch('/tasks/:id/resurrect', async (req: Request<{ id: string }, object, { date: string }>, res: Response) => {
  const { id } = req.params;
  const { date } = req.body;

  if (!date) {
    return res.status(400).json({ error: 'date is required' });
  }

  try {
    const result = await db.query<DbTask>(`
      UPDATE tasks 
      SET date = $2, state = 'active', completed = false
      WHERE id = $1
      RETURNING *
    `, [id, date]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: `Task with ID ${id} not found` });
    }

    res.json(dbTaskToTask(result.rows[0]));
  } catch (e) {
    const error = e as Error;
    res.status(500).json({ error: error.message });
  }
});

export default router;
