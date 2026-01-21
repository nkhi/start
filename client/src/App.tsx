import { useState, useEffect } from 'react';
import './App.css';
import { HabitTracker } from './components/habits/HabitTracker';
import { Todos } from './components/todos/Todos';
// import { JournalV2 } from './components/journalV2';
import { Diary } from './components/journal/Diary';
import { Next } from './components/grow/Next';
import { Lists } from './components/lists/Lists';
import { Landmarks } from './components/landmarks/Landmarks';
import { Memos } from './components/memos/Memos';
import { Navigation, type TabType } from './components/shared/Navigation';
import { Daylight } from './components/daylight/Daylight';
import { DaylightProvider } from './components/daylight/DaylightContext';
import { CalendarEventsProvider } from './contexts/CalendarEventsContext';
import { ApiErrorProvider, useApiError } from './components/shared/ApiErrorContext';
import { ApiErrorToast } from './components/shared/ApiErrorToast';
import { setGlobalErrorReporter, clearGlobalErrorReporter } from './api/errorReporter';
import { Immich } from './components/immich/Immich';
import { Cap } from './components/cap/Cap';

// Detect work mode from URL query params (?mode=work)
const urlParams = new URLSearchParams(window.location.search);
const WORK_MODE = urlParams.get('mode') === 'work' || urlParams.has('w');

// Component to wire up error reporting
function ErrorReporterSetup() {
  const { addError } = useApiError();

  useEffect(() => {
    setGlobalErrorReporter(addError);
    return () => clearGlobalErrorReporter();
  }, [addError]);

  return null;
}

function AppContent() {
  const [activeTab, setActiveTab] = useState<TabType>(WORK_MODE ? 'todos' : 'habits');
  const [lastTab, setLastTab] = useState<TabType>(WORK_MODE ? 'todos' : 'habits');

  const handleTabChange = (newTab: TabType) => {
    if (newTab === 'daylight') {
      setLastTab(activeTab);
    }
    setActiveTab(newTab);
  };

  return (
    <>
      <ErrorReporterSetup />
      <div id="app">
        <Navigation
          activeTab={activeTab}
          lastTab={lastTab}
          onTabChange={handleTabChange}
          workMode={WORK_MODE}
        />
        <main id="habit-container" className={activeTab}>
          {activeTab === 'todos' && <Todos workMode={WORK_MODE} />}
          {activeTab === 'daylight' && <Daylight workMode={WORK_MODE} />}
          {!WORK_MODE && activeTab === 'habits' && <HabitTracker />}
          {!WORK_MODE && activeTab === 'memos' && <Memos />}
          {!WORK_MODE && activeTab === 'journal' && <Diary />}
          {!WORK_MODE && activeTab === 'next' && <Next />}
          {!WORK_MODE && activeTab === 'lists' && <Lists />}
          {!WORK_MODE && activeTab === 'landmarks' && <Landmarks />}
          {!WORK_MODE && activeTab === 'immich' && <Immich />}
          {!WORK_MODE && activeTab === 'cap' && <Cap />}
        </main>
      </div>
      <ApiErrorToast />
    </>
  );
}

function App() {
  return (
    <DaylightProvider>
      <CalendarEventsProvider>
        <ApiErrorProvider>
          <AppContent />
        </ApiErrorProvider>
      </CalendarEventsProvider>
    </DaylightProvider>
  );
}

export default App;
