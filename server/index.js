const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const HABITS_FILE = path.join(__dirname, '../data/habits.csv');
const ENTRIES_FILE = path.join(__dirname, '../data/entries.csv');
const VLOGS_FILE = path.join(__dirname, '../data/vlogs.csv');
const TASKS_FILE = path.join(__dirname, '../data/tasks.json');

// --- Helper Functions ---

function readCsv(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  if (lines.length < 2) return []; // Only header or empty

  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const obj = {};
    headers.forEach((h, i) => {
      let val = values[i] ? values[i].trim() : '';
      // Basic type inference
      if (val === 'true') val = true;
      if (val === 'false') val = false;
      // Don't convert numbers automatically as IDs might be strings, but state and order are int
      if (h === 'state' || h === 'order') val = parseInt(val);
      obj[h] = val;
    });
    return obj;
  });
}

function writeCsv(filePath, data) {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const headerLine = headers.join(',');
  const lines = data.map(row => {
    return headers.map(h => row[h]).join(',');
  });
  fs.writeFileSync(filePath, [headerLine, ...lines].join('\n'));
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return [];
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (e) {
    console.error('Error reading JSON:', e);
    return [];
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// --- API Endpoints ---

// Get all active habits (ordered)
app.get('/habits', (req, res) => {
  try {
    const habits = readCsv(HABITS_FILE);
    const activeHabits = habits
      .filter(h => h.active === true)
      .sort((a, b) => {
          const orderA = parseInt(a.order, 10);
          const orderB = parseInt(b.order, 10);
          // If both have valid order values, sort by order
          if (!isNaN(orderA) && !isNaN(orderB)) {
              return orderA - orderB;
          }
          // Fallback to ID-based sorting if order is missing
          const numA = parseInt(a.id, 10);
          const numB = parseInt(b.id, 10);
          if (!isNaN(numA) && !isNaN(numB)) {
              return numA - numB;
          }
          return a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' });
      });
    res.json(activeHabits);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get entries in a date range
app.get('/habit-entries', (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ error: 'Missing from/to' });
  try {
    const entries = readCsv(ENTRIES_FILE);
    const filtered = entries.filter(e => e.date >= from && e.date <= to);
    res.json(filtered);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Upsert a habit entry
app.post('/habit-entry', (req, res) => {
  const { entryId, date, habitId, state, timestamp } = req.body;
  if (!entryId || !date || !habitId)
    return res.status(400).json({ error: 'Missing key fields' });
  
  try {
    let entries = readCsv(ENTRIES_FILE);
    const existingIndex = entries.findIndex(e => e.entryId === entryId);
    
    const newEntry = { entryId, date, habitId, state, timestamp };

    if (existingIndex >= 0) {
      // Update
      entries[existingIndex] = { ...entries[existingIndex], state, timestamp };
    } else {
      // Insert
      entries.push(newEntry);
    }
    
    writeCsv(ENTRIES_FILE, entries);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Seed/replace HabitConfig
app.post('/seed-habits', (req, res) => {
  const seed = [
    { id: 'habit1', name: 'Exercise', defaultTime: 'morning', active: true, createdDate: '2025-11-09' },
    { id: 'habit2', name: 'Meditation', defaultTime: 'morning', active: true, createdDate: '2025-11-09' },
    { id: 'habit3', name: 'Read', defaultTime: 'night', active: true, createdDate: '2025-11-09' },
    { id: 'habit4', name: 'Journal', defaultTime: 'night', active: true, createdDate: '2025-11-09' },
    { id: 'habit5', name: 'Hydration', defaultTime: 'morning', active: true, createdDate: '2025-11-09' },
    { id: 'habit6', name: 'Yoga', defaultTime: 'morning', active: true, createdDate: '2025-11-09' },
    { id: 'habit7', name: 'Deep Work', defaultTime: 'morning', active: true, createdDate: '2025-11-09' },
    { id: 'habit8', name: 'Sleep Early', defaultTime: 'night', active: true, createdDate: '2025-11-09' },
    { id: 'habit9', name: 'Gratitude', defaultTime: 'night', active: true, createdDate: '2025-11-09' },
    { id: 'habit10', name: 'No Social Media', defaultTime: 'neither', active: true, createdDate: '2025-11-09' },
  ];
  try {
    writeCsv(HABITS_FILE, seed);
    res.json({ ok: true, seeded: seed.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get vlog for a specific week
app.get('/vlogs/:weekStartDate', (req, res) => {
  const { weekStartDate } = req.params;
  try {
    const vlogs = readCsv(VLOGS_FILE);
    const vlog = vlogs.find(v => v.weekStartDate === weekStartDate);
    res.json(vlog || null);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Save a vlog for a specific week
app.post('/vlogs', (req, res) => {
  const { weekStartDate, videoUrl, embedHtml } = req.body;
  if (!weekStartDate || !videoUrl || !embedHtml) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  try {
    let vlogs = readCsv(VLOGS_FILE);
    const existingIndex = vlogs.findIndex(v => v.weekStartDate === weekStartDate);
    
    if (existingIndex >= 0) {
      vlogs[existingIndex] = { weekStartDate, videoUrl, embedHtml };
    } else {
      vlogs.push({ weekStartDate, videoUrl, embedHtml });
    }
    
    writeCsv(VLOGS_FILE, vlogs);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get all tasks
app.get('/tasks', (req, res) => {
  try {
    const tasks = readJson(TASKS_FILE);
    res.json(tasks);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Save all tasks (replace)
app.post('/tasks', (req, res) => {
  const tasks = req.body;
  // Allow object or array
  if (!tasks || typeof tasks !== 'object') {
    return res.status(400).json({ error: 'Body must be an object or array of tasks' });
  }
  
  try {
    writeJson(TASKS_FILE, tasks);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Diary Endpoints ---

const QUESTIONS_FILE = path.join(__dirname, '../data/questions.csv');
const DIARY_FILE = path.join(__dirname, '../data/diary.json');

// Get all active questions
app.get('/questions', (req, res) => {
  try {
    const questions = readCsv(QUESTIONS_FILE);
    const activeQuestions = questions
      .filter(q => q.active === true)
      .sort((a, b) => parseInt(a.order) - parseInt(b.order));
    res.json(activeQuestions);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Add a new question
app.post('/questions', (req, res) => {
  const { id, text, order, active, date } = req.body;
  if (!id || !text) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  try {
    const questions = readCsv(QUESTIONS_FILE);
    questions.push({ 
      id, 
      text, 
      order: order || 999, 
      active: active !== undefined ? active : true,
      date: date || ''
    });
    writeCsv(QUESTIONS_FILE, questions);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get all diary entries
app.get('/diary', (req, res) => {
  try {
    const diary = readJson(DIARY_FILE);
    res.json(diary);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Save diary entries
app.post('/diary', (req, res) => {
  const diary = req.body;
  if (!diary || typeof diary !== 'object') {
    return res.status(400).json({ error: 'Body must be an object' });
  }
  
  try {
    writeJson(DIARY_FILE, diary);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Next Endpoints ---

const NEXT_FILE = path.join(__dirname, '../data/next.json');

// Get all active next items
app.get('/next', (req, res) => {
  try {
    const items = readJson(NEXT_FILE);
    // Filter out deleted and started items by default
    const activeItems = items.filter(item => !item.deletedAt && !item.startedAt);
    res.json(activeItems);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Add a new next item
app.post('/next', (req, res) => {
  const { id, title, content, color, size } = req.body;
  if (!id || !title) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const items = readJson(NEXT_FILE);
    const newItem = {
      id,
      title,
      content: content || '',
      color: color || '#2D2D2D',
      size: size || 'medium',
      createdAt: new Date().toISOString(),
      deletedAt: null,
      startedAt: null
    };
    items.push(newItem);
    writeJson(NEXT_FILE, items);
    res.json(newItem);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update a next item (e.g. delete, start, or edit)
app.patch('/next/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const items = readJson(NEXT_FILE);
    const index = items.findIndex(item => item.id === id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Item not found' });
    }

    items[index] = { ...items[index], ...updates };
    writeJson(NEXT_FILE, items);
    res.json(items[index]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Lists Endpoints ---

const LISTS_FILE = path.join(__dirname, '../data/lists.json');

// Get all lists
app.get('/lists', (req, res) => {
  try {
    const lists = readJson(LISTS_FILE);
    res.json(lists);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Create a new list
app.post('/lists', (req, res) => {
  const { id, title, color } = req.body;
  if (!id || !title) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const lists = readJson(LISTS_FILE);
    const newList = {
      id,
      title,
      color: color || '#2D2D2D',
      createdAt: new Date().toISOString(),
      items: []
    };
    lists.push(newList);
    writeJson(LISTS_FILE, lists);
    res.json(newList);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update a list (title or items)
app.patch('/lists/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const lists = readJson(LISTS_FILE);
    const index = lists.findIndex(l => l.id === id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'List not found' });
    }

    lists[index] = { ...lists[index], ...updates };
    writeJson(LISTS_FILE, lists);
    res.json(lists[index]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete a list
app.delete('/lists/:id', (req, res) => {
  const { id } = req.params;

  try {
    let lists = readJson(LISTS_FILE);
    lists = lists.filter(l => l.id !== id);
    writeJson(LISTS_FILE, lists);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
  console.log('Using local CSV files for storage');
});

