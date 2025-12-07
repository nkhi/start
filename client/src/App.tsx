import { useState } from 'react';
import './App.css';
import { CalendarCheck, ListChecks, Calendar, TipJarIcon, LightbulbIcon, ChartLineUpIcon, ListDashes, TreeIcon, HeartbeatIcon } from '@phosphor-icons/react';
import { HabitTracker } from './components/habits/HabitTracker';
import { Todos } from './components/today/Todos';
import { Diary } from './components/journal/Diary';
import { Next } from './components/grow/Next';
import { Lists } from './components/lists/Lists';
import { Memos } from './components/memos/Memos';
import { ServerStatus } from './components/shared/ServerStatus';

const API_BASE_URL = 'http://localhost:3000';

function App() {
  const [activeTab, setActiveTab] = useState<'habits' | 'todos' | 'logs' | 'memos' | 'next' | 'lists'>('habits');

  return (
    <div id="app">
      <div className="tab-switcher-container">
        <div className="left-links">
          <a href="https://app.monarchmoney.com/accounts?chartType=performance&dateRange=6M&timeframe=month" target="_blank" rel="noreferrer" className="nav-link">
            <TipJarIcon size={20} weight="duotone" className="nav-icon" />
            {/* <span className="nav-text">Money</span> */}
          </a>

          <a href="https://www.perplexity.ai/" target="_blank" rel="noreferrer" className="nav-link">
            <img src="/icons/perplexity.svg" alt="Perplexity" className="nav-icon" style={{ width: '20px', height: '20px', opacity: 0.5 }} />
            {/* <span className="nav-text">Search</span> */}
          </a>

        </div>

        <div className="tab-switcher">
          <button
            className={`tab-btn ${activeTab === 'habits' ? 'active' : ''}`}
            onClick={() => setActiveTab('habits')}
          >
            <CalendarCheck size={20} weight={activeTab === 'habits' ? 'duotone' : 'regular'} className="nav-icon" />
            <span className="nav-text">Habits</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'todos' ? 'active' : ''}`}
            onClick={() => setActiveTab('todos')}
          >
            <ListChecks size={20} weight={activeTab === 'todos' ? 'bold' : 'regular'} className="nav-icon" />
            <span className="nav-text">Today</span>
          </button>

          <button
            className={`tab-btn ${activeTab === 'memos' ? 'active' : ''}`}
            onClick={() => setActiveTab('memos')}
          >
            <LightbulbIcon size={20} weight={activeTab === 'memos' ? 'duotone' : 'regular'} className="nav-icon" />
            <span className="nav-text">Memos</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
            onClick={() => setActiveTab('logs')}
          >
            <HeartbeatIcon size={20} weight={activeTab === 'logs' ? 'duotone' : 'regular'} className="nav-icon" />
            <span className="nav-text">Journal</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'lists' ? 'active' : ''}`}
            onClick={() => setActiveTab('lists')}
          >
            <ListDashes size={20} weight={activeTab === 'lists' ? 'duotone' : 'regular'} className="nav-icon" />
            <span className="nav-text">Lists</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'next' ? 'active' : ''}`}
            onClick={() => setActiveTab('next')}
          >
            <TreeIcon size={20} weight={activeTab === 'next' ? 'duotone' : 'regular'} className="nav-icon" />
            <span className="nav-text">Grow</span>
          </button>

        </div>



        <div className="right-links">
          <ServerStatus apiBaseUrl={API_BASE_URL} />
          <a href="cron://" className="nav-link">
            <Calendar size={20} weight="duotone" className="nav-icon" />
            {/* <span className="nav-text">Calendar</span> */}
          </a>
          <a href="linear://" className="nav-link">
            <ChartLineUpIcon size={20} weight="bold" className="nav-icon" />

            {/* <img src="/linear-logo-dark.svg" alt="Linear" className="nav-icon" style={{ width: '20px', height: '20px' }} /> */}
            {/* <span className="nav-text">Goals</span> */}
          </a>
        </div>
      </div>
      <main id="habit-container" className={activeTab}>
        {activeTab === 'habits' && <HabitTracker apiBaseUrl={API_BASE_URL} />}
        {activeTab === 'todos' && <Todos apiBaseUrl={API_BASE_URL} />}
        {activeTab === 'memos' && <Memos />}
        {activeTab === 'logs' && <Diary apiBaseUrl={API_BASE_URL} />}
        {activeTab === 'next' && <Next apiBaseUrl={API_BASE_URL} />}
        {activeTab === 'lists' && <Lists apiBaseUrl={API_BASE_URL} />}
      </main>
    </div>
  );
}

export default App;
