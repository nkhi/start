import { useState } from 'react';
import './App.css';
import { CalendarCheck, NoteBlank, ListChecks, Calendar, Trophy, NotepadIcon, TipJarIcon, LightbulbIcon, BooksIcon, Binoculars, ListMagnifyingGlassIcon } from '@phosphor-icons/react';
import { HabitTracker } from './components/HabitTracker';
import { Todos } from './components/Todos';
import { Diary } from './components/Diary';

const API_BASE_URL = 'http://localhost:3000';

function App() {
  const [activeTab, setActiveTab] = useState<'habits' | 'todos' | 'logs' | 'memos'>('habits');

  return (
    <div id="app">
      <div className="tab-switcher-container">
        <div className="left-links">
          <a href="https://app.monarchmoney.com/accounts?chartType=performance&dateRange=6M&timeframe=month" target="_blank" rel="noreferrer" className="nav-link">
            <TipJarIcon size={20} weight="duotone" className="nav-icon" />
            Money
          </a>

                    <a href="https://www.perplexity.ai/" target="_blank" rel="noreferrer" className="nav-link">
            <ListMagnifyingGlassIcon size={20} weight="duotone" className="nav-icon" />
            Search
          </a>

        </div>

        <div className="tab-switcher">
          <button 
            className={`tab-btn ${activeTab === 'habits' ? 'active' : ''}`}
            onClick={() => setActiveTab('habits')}
          >
            <CalendarCheck size={20} weight={activeTab === 'habits' ? 'duotone' : 'regular'} className="nav-icon" />
            Habits
          </button>
          <button 
            className={`tab-btn ${activeTab === 'todos' ? 'active' : ''}`}
            onClick={() => setActiveTab('todos')}
          >
            <ListChecks size={20} weight={activeTab === 'todos' ? 'bold' : 'regular'} className="nav-icon" />
            Todos
          </button>

          <button 
            className={`tab-btn ${activeTab === 'memos' ? 'active' : ''}`}
            onClick={() => setActiveTab('memos')}
          >
            <LightbulbIcon size={20} weight={activeTab === 'memos' ? 'duotone' : 'regular'} className="nav-icon" />
            Ideas
          </button>
          <button 
            className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
            onClick={() => setActiveTab('logs')}
          >
            <BooksIcon size={20} weight={activeTab === 'logs' ? 'duotone' : 'regular'} className="nav-icon" />
            Diary
          </button>
          <div className={`tab-indicator ${activeTab}`} />
        </div>

        <div className="right-links">
          <a href="https://calendar.google.com" target="_blank" rel="noreferrer" className="nav-link">
            <Calendar size={20} weight="duotone" className="nav-icon" />
            Calendar
          </a>
          <a href="linear://" className="nav-link">
            <Trophy size={20} weight="duotone" className="nav-icon" />
            Goals
          </a>
        </div>
      </div>
      <main id="habit-container" className={activeTab}>
        {activeTab === 'habits' && <HabitTracker apiBaseUrl={API_BASE_URL} />}
        {activeTab === 'todos' && <Todos apiBaseUrl={API_BASE_URL} />}
        {activeTab === 'memos' && (
          <div className="memos-container">
            <div className="memos-loading-overlay" />
            <iframe 
              src="http://localhost:5230/" 
              className="memos-frame"
              title="Memos"
            />
          </div>
        )}
        {activeTab === 'logs' && <Diary apiBaseUrl={API_BASE_URL} />}
      </main>
    </div>
  );
}

export default App;
