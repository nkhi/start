const CONFIG = {
  startDate: new Date('2025-11-09'),
  spreadsheetId: '1p4H7KDQdr4nOcMR3RlRmmXLawC6m7V7livx4ql4fTrU',
  apiKey: 'YOUR_API_KEY_HERE', // Get from Google Cloud Console
  stateIcons: ['✕', '✓', '✕', ':)', ':/'],
  stateClasses: ['state-0', 'state-1', 'state-2', 'state-3', 'state-4']
};

class GoogleSheetsAPI {
  async getSheetData(range) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.spreadsheetId}/values/${range}?key=${CONFIG.apiKey}`;
    console.log(`📡 Fetching data from: ${range}`);
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`API Error: ${error.error.message}`);
      }
      
      const data = await response.json();
      console.log(`✅ Fetched ${data.values?.length || 0} rows from ${range}`);
      return data.values || [];
    } catch (error) {
      console.error(`❌ Error fetching ${range}:`, error);
      throw error;
    }
  }

  async updateRow(sheetName, row, values) {
    const range = `${sheetName}!A${row}:Z${row}`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED&key=${CONFIG.apiKey}`;
    
    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [values],
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`API Error: ${error.error.message}`);
      }
      
      console.log(`✅ Updated row ${row} in ${sheetName}`);
      return await response.json();
    } catch (error) {
      console.error('❌ Error updating row:', error);
      throw error;
    }
  }

  async appendRow(sheetName, values) {
    const range = `${sheetName}!A:Z`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&key=${CONFIG.apiKey}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [values],
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`API Error: ${error.error.message}`);
      }
      
      console.log(`✅ Appended row to ${sheetName}`);
      return await response.json();
    } catch (error) {
      console.error('❌ Error appending row:', error);
      throw error;
    }
  }
}

class DataService {
  constructor() {
    this.api = new GoogleSheetsAPI();
    this.entriesCache = new Map();
    this.habitsCache = null;
    this.pendingWrites = [];
    this.rowIndexMap = new Map();
  }

  async initialize() {
    await this.loadInitialData();
  }

  async loadInitialData() {
    await Promise.all([
      this.loadHabitConfig(),
      this.loadEntries(),
    ]);
  }

  async loadHabitConfig() {
    const rows = await this.api.getSheetData('HabitConfig!A2:F');
    
    if (!rows || rows.length === 0) {
      throw new Error('HabitConfig sheet is empty! Add your habits first.');
    }
    
    this.habitsCache = rows
      .filter(row => row && row.length >= 6)
      .map((row, index) => ({
        id: row[0],
        name: row[1],
        order: parseInt(row[2]),
        defaultTime: row[3],
        active: row[4] === 'TRUE',
        createdDate: row[5],
        rowIndex: index + 2,
      }))
      .filter(h => h.active);
    
    if (this.habitsCache.length === 0) {
      throw new Error('No active habits found in HabitConfig!');
    }
    
    CONFIG.startDate = new Date(
      Math.min(...this.habitsCache.map(h => new Date(h.createdDate).getTime()))
    );
    
    console.log(`✅ Loaded ${this.habitsCache.length} habits`);
    return this.habitsCache;
  }

  async loadEntries() {
    const rows = await this.api.getSheetData('HabitEntries!A2:F');
    this.entriesCache.clear();
    this.rowIndexMap.clear();
    
    if (!rows || rows.length === 0) {
      console.log('📝 No entries yet (sheet is empty)');
      return this.entriesCache;
    }
    
    rows.forEach((row, index) => {
      if (!row || row.length < 6) return;
      
      const entry = {
        entryId: row[0],
        date: row[1],
        habitId: row[2],
        state: parseInt(row[3]),
        time: row[4],
        timestamp: row[5],
      };
      
      const key = `${entry.date}_${entry.habitId}`;
      this.entriesCache.set(key, entry);
      this.rowIndexMap.set(key, index + 2);
    });
    
    console.log(`✅ Loaded ${this.entriesCache.size} entries`);
    return this.entriesCache;
  }

  getHabits() {
    return this.habitsCache || [];
  }

  getEntry(date, habitId) {
    const key = `${date}_${habitId}`;
    return this.entriesCache.get(key);
  }

  async upsertEntry(date, habitId, state, time) {
    const key = `${date}_${habitId}`;
    const timestamp = new Date().toISOString();
    
    if (state === 0) {
      await this.deleteEntry(date, habitId);
      return;
    }
    
    const existingRowIndex = this.rowIndexMap.get(key);
    
    if (existingRowIndex) {
      const entry = this.entriesCache.get(key);
      const values = [entry.entryId, date, habitId, state, time, timestamp];
      await this.api.updateRow('HabitEntries', existingRowIndex, values);
      
      this.entriesCache.set(key, {
        entryId: entry.entryId,
        date,
        habitId,
        state,
        time,
        timestamp,
      });
    } else {
      const entryId = this.generateId();
      const values = [entryId, date, habitId, state, time, timestamp];
      await this.api.appendRow('HabitEntries', values);
      
      const newRowIndex = this.rowIndexMap.size + 2;
      this.rowIndexMap.set(key, newRowIndex);
      this.entriesCache.set(key, {
        entryId,
        date,
        habitId,
        state,
        time,
        timestamp,
      });
    }
  }

  async deleteEntry(date, habitId) {
    const key = `${date}_${habitId}`;
    const rowIndex = this.rowIndexMap.get(key);
    
    if (rowIndex) {
      const values = ['', date, habitId, 0, '', ''];
      await this.api.updateRow('HabitEntries', rowIndex, values);
      this.entriesCache.delete(key);
      this.rowIndexMap.delete(key);
    }
  }

  generateId() {
    return 'e_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
}

const DateUtility = {
  getAllDatesFromStart(startDate) {
    const dates = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    let currentDate = new Date(start);
    while (currentDate <= today) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates;
  },
  
  formatDate(date) {
    return date.toISOString().split('T')[0];
  },
  
  formatDateRange(dates) {
    if (dates.length === 0) return '';
    const start = dates[0];
    const end = dates[dates.length - 1];
    const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${startStr} - ${endStr}`;
  },
  
  getDayName(date) {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  },
  
  getDayNumber(date) {
    return date.getDate();
  },
  
  isToday(date) {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  },
  
  getDaysSince(startDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const diffTime = today - start;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1;
  }
};

class StateManager {
  constructor(dataService) {
    this.dataService = dataService;
    this.observers = [];
  }
  
  getKey(date, habitId) {
    return `${DateUtility.formatDate(date)}_${habitId}`;
  }
  
  getEntry(date, habitId) {
    const dateStr = DateUtility.formatDate(date);
    const entry = this.dataService.getEntry(dateStr, habitId);
    return entry ? { state: entry.state, time: entry.time } : { state: 0, time: 'neither' };
  }
  
  async setEntry(dateStr, habitId, state, time) {
    await this.dataService.upsertEntry(dateStr, habitId, state, time);
    const date = new Date(dateStr);
    this.notify({ date, habitId, state, time });
  }
  
  async cycleState(date, habitId) {
    const current = this.getEntry(date, habitId);
    const nextState = (current.state + 1) % 5;
    const habits = this.dataService.getHabits();
    const habit = habits.find(h => h.id === habitId);
    const time = habit ? habit.defaultTime : 'neither';
    
    await this.setEntry(DateUtility.formatDate(date), habitId, nextState, time);
    return nextState;
  }
  
  getCurrentStreak(habitId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let streak = 0;
    let currentDate = new Date(today);
    
    while (currentDate >= CONFIG.startDate) {
      const entry = this.getEntry(currentDate, habitId);
      if (entry.state === 1 || entry.state === 3) {
        streak++;
      } else {
        break;
      }
      currentDate.setDate(currentDate.getDate() - 1);
    }
    
    return streak;
  }
  
  subscribe(observer) {
    this.observers.push(observer);
  }
  
  notify(change) {
    this.observers.forEach(observer => observer(change));
  }
}

class UIController {
  constructor(stateManager, dataService) {
    this.stateManager = stateManager;
    this.dataService = dataService;
    
    this.elements = {
      tableHead: document.getElementById('table-head'),
      tableBody: document.getElementById('table-body'),
      tableWrapper: document.querySelector('.table-wrapper')
    };
    
    this.stateManager.subscribe(this.handleStateChange.bind(this));
  }
  
  initialize() {
    this.render();
  }
  
  render() {
    const dates = DateUtility.getAllDatesFromStart(CONFIG.startDate);
    this.renderTableHeader(dates);
    this.renderTableBody(dates);
    
    setTimeout(() => {
      this.scrollToToday();
    }, 50);
  }
  
  scrollToToday() {
    const todayCells = document.querySelectorAll('.day-date.today');
    if (todayCells.length > 0) {
      const todayHeader = todayCells[0].closest('th');
      if (todayHeader) {
        const scrollContainer = this.elements.tableWrapper;
        const containerWidth = scrollContainer.clientWidth;
        const todayLeft = todayHeader.offsetLeft;
        const todayWidth = todayHeader.offsetWidth;
        
        const scrollPosition = todayLeft - containerWidth + todayWidth + 200;
        scrollContainer.scrollLeft = Math.max(0, scrollPosition);
      }
    }
  }
  
  renderTableHeader(dates) {
    const headerRow = document.createElement('tr');
    
    const habitHeader = document.createElement('th');
    habitHeader.textContent = '';
    headerRow.appendChild(habitHeader);
    
    dates.forEach(date => {
      const th = document.createElement('th');
      th.setAttribute('colspan', '1');
      
      const dayHeader = document.createElement('div');
      dayHeader.className = 'day-header';
      
      const dayName = document.createElement('span');
      dayName.className = `day-name ${DateUtility.isToday(date) ? 'today' : ''}`;
      dayName.textContent = DateUtility.getDayName(date);
      
      const dayDate = document.createElement('span');
      dayDate.className = `day-date ${DateUtility.isToday(date) ? 'today' : ''}`;
      dayDate.textContent = DateUtility.getDayNumber(date);
      
      dayHeader.appendChild(dayName);
      dayHeader.appendChild(dayDate);
      th.appendChild(dayHeader);
      headerRow.appendChild(th);
    });
    
    this.elements.tableHead.innerHTML = '';
    this.elements.tableHead.appendChild(headerRow);
  }
  
  renderTableBody(dates) {
    const habits = [...this.dataService.getHabits()].sort((a, b) => a.order - b.order);
    
    this.elements.tableBody.innerHTML = '';
    
    habits.forEach(habit => {
      const row = document.createElement('tr');
      
      const habitCell = document.createElement('td');
      const habitName = document.createElement('div');
      habitName.className = 'habit-name';
      
      const icon = document.createElement('span');
      icon.className = `time-icon ${habit.defaultTime}`;
      
      if (habit.defaultTime === 'morning') {
        icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><path d="M248,160a8,8,0,0,1-8,8H16a8,8,0,0,1,0-16H56.45a73.54,73.54,0,0,1-.45-8,72,72,0,0,1,144,0,73.54,73.54,0,0,1-.45,8H240A8,8,0,0,1,248,160Zm-40,32H48a8,8,0,0,0,0,16H208a8,8,0,0,0,0-16ZM80.84,59.58a8,8,0,0,0,14.32-7.16l-8-16a8,8,0,0,0-14.32,7.16ZM20.42,103.16l16,8a8,8,0,1,0,7.16-14.31l-16-8a8,8,0,1,0-7.16,14.31ZM216,112a8,8,0,0,0,3.57-.84l16-8a8,8,0,1,0-7.16-14.31l-16,8A8,8,0,0,0,216,112ZM164.42,63.16a8,8,0,0,0,10.74-3.58l8-16a8,8,0,0,0-14.32-7.16l-8,16A8,8,0,0,0,164.42,63.16Z" fill="currentColor"/></svg>';
      } else if (habit.defaultTime === 'night') {
        icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><path d="M235.54,150.21a104.84,104.84,0,0,1-37,52.91A104,104,0,0,1,32,120,103.09,103.09,0,0,1,52.88,57.48a104.84,104.84,0,0,1,52.91-37,8,8,0,0,1,10,10,88.08,88.08,0,0,0,109.8,109.8,8,8,0,0,1,10,10Z" fill="currentColor"/></svg>';
      } else {
        icon.innerHTML = '';
      }
      
      const nameContainer = document.createElement('div');
      nameContainer.className = 'habit-name-text';
      
      const name = document.createElement('span');
      name.textContent = habit.name;
      nameContainer.appendChild(name);
      
      const streak = this.stateManager.getCurrentStreak(habit.id);
      if (streak > 0) {
        const streakBadge = document.createElement('span');
        streakBadge.className = 'streak-badge';
        
        const heartIcon = document.createElement('span');
        heartIcon.className = 'streak-icon';
        heartIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><path d="M240,102c0,70-103.79,126.66-108.21,129a8,8,0,0,1-7.58,0C119.79,228.66,16,172,16,102A62.07,62.07,0,0,1,78,40c20.65,0,38.73,8.88,50,23.89C139.27,48.88,157.35,40,178,40A62.07,62.07,0,0,1,240,102Z" fill="currentColor"/></svg>';
        
        const streakCount = document.createElement('span');
        streakCount.textContent = streak;
        
        streakBadge.appendChild(heartIcon);
        streakBadge.appendChild(streakCount);
        nameContainer.appendChild(streakBadge);
      }
      
      habitName.appendChild(icon);
      habitName.appendChild(nameContainer);
      habitCell.appendChild(habitName);
      row.appendChild(habitCell);
      
      dates.forEach(date => {
        const td = document.createElement('td');
        const cell = this.createCell(date, habit.id);
        td.appendChild(cell);
        row.appendChild(td);
      });
      
      this.elements.tableBody.appendChild(row);
    });
  }
  
  createCell(date, habitId) {
    const entry = this.stateManager.getEntry(date, habitId);
    const cell = document.createElement('div');
    cell.className = `cell ${CONFIG.stateClasses[entry.state]}`;
    cell.textContent = CONFIG.stateIcons[entry.state];
    cell.dataset.date = DateUtility.formatDate(date);
    cell.dataset.habitId = habitId;
    
    cell.addEventListener('click', () => {
      this.stateManager.cycleState(date, habitId);
    });
    
    return cell;
  }
  
  handleStateChange({ date, habitId, state }) {
    const dateStr = DateUtility.formatDate(date);
    const cell = document.querySelector(
      `.cell[data-date="${dateStr}"][data-habit-id="${habitId}"]`
    );
    
    if (cell) {
      CONFIG.stateClasses.forEach(cls => cell.classList.remove(cls));
      cell.classList.add(CONFIG.stateClasses[state]);
      cell.textContent = CONFIG.stateIcons[state];
    }
    
    this.render();
  }
}

function checkForNewDay() {
  const now = new Date();
  if (now.getHours() === 0 && now.getMinutes() <= 1) {
    uiController.render();
  }
}

async function initializeApp() {
  console.log('🚀 Starting Habit Tracker...');
  console.log('Config:', CONFIG);
  
  const dataService = new DataService();
  const stateManager = new StateManager(dataService);
  const uiController = new UIController(stateManager, dataService);
  
  try {
    console.log('📊 Loading data from Google Sheets...');
    await dataService.initialize();
    console.log('✅ Data loaded successfully!');
    console.log('Habits:', dataService.getHabits());
    
    console.log('🎨 Initializing UI...');
    uiController.initialize();
    console.log('✅ App ready!');
  } catch (error) {
    console.error('❌ Failed to initialize app:', error);
    console.error('Error details:', error.stack);
    
    document.body.innerHTML = `
      <div style="padding: 40px; font-family: system-ui; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #ef4444;">⚠️ Failed to Load</h1>
        <p><strong>Error:</strong> ${error.message}</p>
        <h3>Troubleshooting:</h3>
        <ol>
          <li>Open <code>debug.html</code> to test your setup</li>
          <li>Make sure your Google Sheet is public (Share → Anyone with link)</li>
          <li>Check that you have "HabitConfig" and "HabitEntries" sheets</li>
          <li>Open browser console (F12) to see detailed errors</li>
        </ol>
        <p><a href="debug.html" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px;">Open Debugger</a></p>
      </div>
    `;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

