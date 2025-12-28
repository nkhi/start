import { useState, useEffect } from 'react';
import './App.css';
import { HabitTracker } from './components/habits/HabitTracker';
import { Todos } from './components/todos/Todos';
import { JournalV2 } from './components/journalV2';
import { Next } from './components/grow/Next';
import { Lists } from './components/lists/Lists';
import { Memos } from './components/memos/Memos';
import { Navigation } from './components/shared/Navigation';
import type { TabType } from './components/shared/Navigation';
import { Daylight } from './components/daylight/Daylight';
import { DaylightProvider } from './components/daylight/DaylightContext';
import { CalendarEventsProvider } from './contexts/CalendarEventsContext';
import { ApiErrorProvider, useApiError } from './components/shared/ApiErrorContext';
import { ApiErrorToast } from './components/shared/ApiErrorToast';
import { setGlobalErrorReporter, clearGlobalErrorReporter } from './api/errorReporter';

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
          {!WORK_MODE && activeTab === 'journal' && <JournalV2 />}
          {!WORK_MODE && activeTab === 'next' && <Next />}
          {!WORK_MODE && activeTab === 'lists' && <Lists />}
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
