import React, { useEffect, useState, useRef, useMemo } from 'react';
import { HabitAPI } from '../../api';
import type { Habit, HabitEntry, Vlog } from '../../types';
import { DateUtility, getGrade, generateId } from '../../utils';
import VlogModal from './VlogModal';
import ChartModal from './ChartModal';
import { VideoCameraIcon, SunHorizonIcon, MoonIcon, HeartIcon, TreeIcon, BarbellIcon, ResizeIcon, PresentationChartIcon } from '@phosphor-icons/react';

const CONFIG = {
  startDate: new Date('2025-11-09T00:00:00'),
  stateIcons: ['·', '✓', '✕', ':)', ':|'],
  stateClasses: ['state-0', 'state-1', 'state-2', 'state-3', 'state-4']
};

interface HabitTrackerProps {
  apiBaseUrl: string;
}

export function HabitTracker({ apiBaseUrl }: HabitTrackerProps) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [entries, setEntries] = useState<Map<string, HabitEntry>>(new Map());
  const [dates, setDates] = useState<Date[]>([]);
  const [vlogs, setVlogs] = useState<Map<string, Vlog>>(new Map());
  const [viewingVlog, setViewingVlog] = useState<Vlog | null>(null);
  const [showChart, setShowChart] = useState(false);
  const [loomSupported, setLoomSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const tableWrapperRef = useRef<HTMLDivElement>(null);
  const api = useRef(new HabitAPI(apiBaseUrl)).current;
  const loomButtonRef = useRef<HTMLButtonElement | null>(null);
  const sdkButtonRef = useRef<any>(null);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());
  const recordingWeekRef = useRef<Date | null>(null);

  const weeks = useMemo(() => {
    const weeksMap = new Map<string, Date[]>();
    dates.forEach(date => {
      const start = DateUtility.getWeekStart(date);
      const key = DateUtility.formatDate(start);
      if (!weeksMap.has(key)) weeksMap.set(key, []);
      weeksMap.get(key)!.push(date);
    });
    return Array.from(weeksMap.entries()).map(([key, days]) => ({
      key,
      start: days[0],
      end: days[days.length - 1],
      days
    }));
  }, [dates]);

  const chartData = useMemo(() => {
    if (!showChart) return [];
    return weeks.map(week => {
      const weekStart = new Date(week.key + 'T00:00:00');
      const weekEnd = week.end;

      const dataPoint: any = {
        name: `${weekStart.toLocaleDateString('en-US', { month: 'short' })} ${DateUtility.getDayNumber(weekStart)}`,
      };

      habits.forEach(habit => {
        // Calculate stats logic duplicated here to avoid dependency issues or extract it
        // Actually we can call getHabitStats if we are careful, but getHabitStats uses state.
        // It's safer to inline the logic or ensure getHabitStats is stable/accessible.
        // Since getHabitStats is defined in the component, we can call it.
        // But we need to make sure we don't cause infinite loops if we were to put it in dependencies.
        // Here we are inside useMemo, so calling the function is fine as long as we depend on the state it uses.

        // Re-implementing logic to be safe and clear within useMemo
        const isWeekdays = habit.defaultTime === 'weekdays';
        let successCount = 0;
        let totalCount = 0;
        let curr = new Date(weekStart);
        while (curr <= weekEnd) {
          const isWeekend = curr.getDay() === 0 || curr.getDay() === 6;
          if (isWeekdays && isWeekend) {
            curr.setDate(curr.getDate() + 1);
            continue;
          }

          const dateStr = DateUtility.formatDate(curr);
          const key = `${dateStr}_${habit.id}`;
          const entry = entries.get(key);

          if (entry && (entry.state === 1 || entry.state === 3)) {
            successCount++;
          }
          totalCount++;
          curr.setDate(curr.getDate() + 1);
        }

        const percentage = totalCount === 0 ? 0 : (successCount / totalCount) * 100;
        dataPoint[habit.id] = Math.round(percentage);
      });

      return dataPoint;
    });
  }, [showChart, weeks, habits, entries]);

  useEffect(() => {
    loadData();
    checkLoomSupport();
  }, []);

  useEffect(() => {
    if (habits.length > 0) {
      const earliest = Math.min(...habits.map(h => new Date(h.createdDate + 'T00:00:00').getTime()));
      if (!isNaN(earliest)) {
        CONFIG.startDate = new Date(earliest);
      }
      const allDates = DateUtility.getAllDatesFromStart(CONFIG.startDate);

      // Create a completely new array with new Date objects to ensure React detects the change
      const datesCopy = allDates.map(d => new Date(d));

      // Set dates and loading state
      setDates(datesCopy);
      setIsLoading(false);

      // Expand current week by default
      const today = new Date();
      const currentWeekStart = DateUtility.getWeekStart(today);
      setExpandedWeeks(new Set([DateUtility.formatDate(currentWeekStart)]));

      setTimeout(() => scrollToToday(), 50);
    }
  }, [habits]);

  async function checkLoomSupport() {
    try {
      const { isSupported } = await import('@loomhq/record-sdk/is-supported');
      const { supported } = await isSupported();
      setLoomSupported(supported);

      if (supported) {
        initializeLoom();
      }
    } catch (error) {
      console.error('Failed to check Loom support:', error);
      setLoomSupported(false);
    }
  }

  async function initializeLoom() {
    try {
      const { createInstance } = await import('@loomhq/record-sdk');
      const { oembed } = await import('@loomhq/loom-embed');

      // Create a hidden button for Loom SDK
      const hiddenButton = document.createElement('button');
      hiddenButton.style.display = 'none';
      document.body.appendChild(hiddenButton);
      loomButtonRef.current = hiddenButton;

      const { configureButton } = await createInstance({
        mode: 'standard',
        publicAppId: 'fae3c61b-58d9-47dc-9cc8-c148e8d8dbaf',
      });

      const sdkButton = configureButton({ element: hiddenButton });
      sdkButtonRef.current = sdkButton;

      sdkButton.on('insert-click', async (video) => {
        if (!recordingWeekRef.current) {
          console.error('No recordingWeek set when insert-click fired');
          return;
        }

        try {
          const { html } = await oembed(video.sharedUrl, { width: 600 });
          await handleVlogSaved(recordingWeekRef.current, video.sharedUrl, html);
        } catch (err) {
          console.error('Failed to save vlog:', err);
        }
      });

      sdkButton.on('cancel', () => {
        recordingWeekRef.current = null;
      });

      sdkButton.on('complete', () => {
        recordingWeekRef.current = null;
      });
    } catch (error) {
      console.error('Failed to initialize Loom:', error);
      setLoomSupported(false);
    }
  }

  async function loadData() {
    try {
      setIsLoading(true);
      const [habitsData, entriesData] = await Promise.all([
        api.getHabits(),
        api.getEntries(
          DateUtility.formatDate(CONFIG.startDate),
          DateUtility.formatDate(new Date())
        )
      ]);

      setHabits(habitsData);

      const entriesMap = new Map<string, HabitEntry>();
      entriesData.forEach(entry => {
        // API may return habit_id or habitId, normalize to habitId
        const normalizedHabitId = entry.habitId || (entry as any).habit_id;
        // Normalize date format - entry.date might be ISO string, convert to YYYY-MM-DD format
        const entryDate = new Date(entry.date);
        const normalizedDate = DateUtility.formatDate(entryDate);
        const key = `${normalizedDate}_${normalizedHabitId}`;
        entriesMap.set(key, {
          ...entry,
          date: normalizedDate, // Store normalized date format
          habitId: normalizedHabitId,
          state: parseInt(String(entry.state))
        });
      });
      setEntries(entriesMap);

      // Load vlogs for visible weeks
      await loadVlogs(DateUtility.getAllDatesFromStart(CONFIG.startDate));
    } catch (error) {
      console.error('Failed to load data:', error);
      setIsLoading(false);
    }
  }

  async function loadVlogs(dates: Date[]) {
    const weeks = new Set<string>();
    dates.forEach(date => {
      if (date.getDay() === 6) {
        const weekStart = DateUtility.getWeekStart(date);
        weeks.add(DateUtility.formatDate(weekStart));
      }
    });

    const vlogsMap = new Map<string, Vlog>();
    await Promise.all(
      Array.from(weeks).map(async (weekStart) => {
        const vlog = await api.getVlog(weekStart);
        if (vlog) {
          vlogsMap.set(weekStart, vlog);
        }
      })
    );
    setVlogs(vlogsMap);
  }

  function scrollToToday() {
    const todayCells = document.querySelectorAll('.day-date.today');
    if (todayCells.length > 0 && tableWrapperRef.current) {
      const todayHeader = todayCells[0].closest('th');
      if (todayHeader) {
        const containerWidth = tableWrapperRef.current.clientWidth;
        const todayLeft = (todayHeader as HTMLElement).offsetLeft;
        const todayWidth = (todayHeader as HTMLElement).offsetWidth;

        const scrollPosition = todayLeft - containerWidth + todayWidth + 200;
        tableWrapperRef.current.scrollLeft = Math.max(0, scrollPosition);
      }
    }
  }

  async function cycleState(date: Date, habitId: string) {
    const dateStr = DateUtility.formatDate(date);
    const key = `${dateStr}_${habitId}`;
    const current = entries.get(key);
    const currentState = current?.state || 0;
    const nextState = (currentState + 1) % 5;

    const habit = habits.find(h => h.id === habitId);
    const time = habit?.defaultTime || 'neither';

    const entryId = current?.entryId || generateId();
    const timestamp = new Date().toISOString();

    const newEntry: HabitEntry = {
      entryId,
      date: dateStr,
      habitId,
      state: nextState,
      time,
      timestamp
    };

    // Optimistic update
    const newEntries = new Map(entries);
    newEntries.set(key, newEntry);
    setEntries(newEntries);

    try {
      await api.saveEntry(newEntry);
    } catch (error) {
      console.error('Failed to save entry:', error);
      // Revert on error
      setEntries(entries);
    }
  }

  function getEntry(date: Date, habitId: string): HabitEntry | undefined {
    const dateStr = DateUtility.formatDate(date);
    const key = `${dateStr}_${habitId}`;
    return entries.get(key);
  }

  function getCurrentStreak(habitId: string): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let streak = 0;
    let currentDate = new Date(today);

    while (currentDate >= CONFIG.startDate) {
      const entry = getEntry(currentDate, habitId);
      if (entry && (entry.state === 1 || entry.state === 3)) {
        streak++;
      } else {
        break;
      }
      currentDate.setDate(currentDate.getDate() - 1);
    }

    return streak;
  }

  function getHabitStats(habitId: string, weekStart: Date, weekEnd: Date) {
    const habit = habits.find(h => h.id === habitId);
    const isWeekdays = habit?.defaultTime === 'weekdays';

    let successCount = 0;
    let totalCount = 0;

    let curr = new Date(weekStart);
    while (curr <= weekEnd) {
      // Skip weekends for weekday habits
      const isWeekend = curr.getDay() === 0 || curr.getDay() === 6;
      if (isWeekdays && isWeekend) {
        curr.setDate(curr.getDate() + 1);
        continue;
      }

      const entry = getEntry(curr, habitId);
      if (entry && (entry.state === 1 || entry.state === 3)) {
        successCount++;
      }
      totalCount++;
      curr.setDate(curr.getDate() + 1);
    }

    const percentage = totalCount === 0 ? 0 : (successCount / totalCount) * 100;
    return {
      successCount,
      totalCount,
      percentage,
      grade: getGrade(percentage)
    };
  }

  async function handleVlogSaved(weekStart: Date, videoUrl: string, embedHtml: string) {
    const weekStartStr = DateUtility.formatDate(weekStart);
    const vlog: Vlog = { weekStartDate: weekStartStr, videoUrl, embedHtml };

    try {
      await api.saveVlog(vlog);
      const newVlogs = new Map(vlogs);
      newVlogs.set(weekStartStr, vlog);
      setVlogs(newVlogs);
      recordingWeekRef.current = null;
    } catch (error) {
      console.error('Failed to save vlog:', error);
    }
  }

  function handleVlogClick(weekStart: Date, e: React.MouseEvent) {
    e.stopPropagation(); // Prevent collapsing/expanding when clicking vlog button
    const weekStartStr = DateUtility.formatDate(weekStart);
    const vlog = vlogs.get(weekStartStr);

    if (vlog) {
      // View existing vlog
      setViewingVlog(vlog);
    } else {
      // Start recording
      recordingWeekRef.current = weekStart;
      if (loomButtonRef.current) {
        loomButtonRef.current.click();
      }
    }
  }

  function toggleWeek(weekKey: string) {
    const newExpanded = new Set(expandedWeeks);
    if (newExpanded.has(weekKey)) {
      newExpanded.delete(weekKey);
    } else {
      newExpanded.add(weekKey);
    }
    setExpandedWeeks(newExpanded);
  }

  if (isLoading || habits.length === 0 || dates.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Loading habits data...</p>
      </div>
    );
  }

  return (
    <>
      <div className="table-wrapper" ref={tableWrapperRef}>
        <table id="habit-table">
          <thead id="table-head">
            <tr>
              <th className="trends-header">
                <button
                  className="trends-button"
                  onClick={() => setShowChart(true)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#888',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    gap: '4px'
                  }}
                  title="View Trends"
                >
                  <PresentationChartIcon size={24} weight="duotone" /> <span>Trends</span>
                </button>
              </th>
              {weeks.map((week) => {
                const isExpanded = expandedWeeks.has(week.key);
                const hasVlog = vlogs.has(week.key);
                const weekStart = new Date(week.key + 'T00:00:00'); // Construct date from key

                if (!isExpanded) {
                  // Collapsed view
                  return (
                    <th
                      key={week.key}
                      className="week-summary-header"
                      onClick={() => toggleWeek(week.key)}
                      style={{ cursor: 'pointer', minWidth: '120px' }}
                    >
                      <div className="day-header" style={{ flexDirection: 'column', gap: '3px', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span className="day-name">
                            {DateUtility.getDayName(week.start)} {DateUtility.getDayNumber(week.start)} - {DateUtility.getDayName(week.end)} {DateUtility.getDayNumber(week.end)}
                          </span>
                        </div>
                        {hasVlog && <VideoCameraIcon size={16} weight="duotone" color="#8b5cf6" />}
                      </div>
                    </th>
                  );
                }

                // Expanded view
                return week.days.map((date, idx) => {
                  const isSaturday = date.getDay() === 6;

                  return (
                    <React.Fragment key={`${week.key}-${idx}`}>
                      <th colSpan={1}>
                        <div className="day-header">
                          <span className={`day-name ${DateUtility.isToday(date) ? 'today' : ''}`}>
                            {DateUtility.getDayName(date)}
                          </span>
                          <span className={`day-date ${DateUtility.isToday(date) ? 'today' : ''}`}>
                            {DateUtility.getDayNumber(date)}
                          </span>
                        </div>
                      </th>
                      {isSaturday && loomSupported && (
                        <th className="score-header">
                          <button
                            className={`vlog-button ${hasVlog ? 'has-vlog' : ''}`}
                            onClick={(e) => handleVlogClick(weekStart, e)}
                            title={hasVlog ? "View weekly vlog" : "Record weekly vlog"}
                          >
                            <VideoCameraIcon size={20} weight="duotone" />
                          </button>
                          <button
                            className="collapse-btn"
                            onClick={() => toggleWeek(week.key)}
                            title="Collapse week"
                            style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', marginLeft: '4px' }}
                          >
                            <span style={{ fontSize: '10px' }}>◀</span>
                          </button>
                        </th>
                      )}
                      {isSaturday && !loomSupported && (
                        <th className="score-header"></th>
                      )}
                    </React.Fragment>
                  );
                });
              })}
            </tr>
          </thead>
          <tbody id="table-body">
            {habits.sort((a, b) => a.order - b.order).map(habit => (
              <tr key={habit.id}>
                <td>
                  <div className="habit-name">
                    <span className={`time-icon ${habit.defaultTime}`}>
                      {habit.defaultTime === 'morning' && (
                        <SunHorizonIcon size={20} weight="duotone" color="orange" />
                      )}
                      {habit.defaultTime === 'night' && (
                        <MoonIcon size={20} weight="duotone" color="#3ddde6ff" />
                      )}
                      {habit.defaultTime === 'health' && (
                        <TreeIcon size={20} weight="duotone" color="#1ba841ff" />
                      )}
                      {habit.defaultTime === 'exercise' && (
                        <BarbellIcon size={20} weight="duotone" color="#f4244dff" />
                      )}
                      {habit.defaultTime === 'weekdays' && (
                        <ResizeIcon size={20} weight="duotone" color="#a855f7" />
                      )}
                    </span>
                    <div className="habit-name-text">
                      <span>{habit.name}</span>
                      {getCurrentStreak(habit.id) > 0 && (
                        <span className="streak-badge">
                          <span className="streak-icon">
                            <HeartIcon size={12} weight="fill" />
                          </span>
                          <span>{getCurrentStreak(habit.id)}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                {weeks.map((week) => {
                  const isExpanded = expandedWeeks.has(week.key);
                  const weekStart = new Date(week.key + 'T00:00:00');
                  const weekEnd = week.end;

                  if (!isExpanded) {
                    const stats = getHabitStats(habit.id, weekStart, weekEnd);
                    return (
                      <td
                        key={week.key}
                        onClick={() => toggleWeek(week.key)}
                        style={{ cursor: 'pointer' }}
                        className="week-summary-cell"
                      >
                        <div className="score-content has-tooltip" data-tooltip={`${stats.grade.letter} (${Math.round(stats.percentage)}%)`}>
                          <span className={`score-grade ${stats.grade.class}`}>
                            {stats.successCount}/{stats.totalCount}
                          </span>
                        </div>
                      </td>
                    );
                  }

                  return week.days.map((date, idx) => {
                    const entry = getEntry(date, habit.id);
                    const state = entry?.state || 0;
                    const isSaturday = date.getDay() === 6;

                    return (
                      <React.Fragment key={`${week.key}-${idx}`}>
                        <td>
                          <div
                            className={`cell ${CONFIG.stateClasses[state]} ${habit.defaultTime === 'weekdays' && (isSaturday || date.getDay() === 0) ? 'disabled' : ''}`}
                            onClick={() => {
                              if (habit.defaultTime === 'weekdays' && (isSaturday || date.getDay() === 0)) return;
                              cycleState(date, habit.id);
                            }}
                          >
                            {habit.defaultTime === 'weekdays' && (isSaturday || date.getDay() === 0) ? (
                              <span style={{ color: '#333', fontSize: '12px' }}>-</span>
                            ) : (
                              CONFIG.stateIcons[state]
                            )}
                          </div>
                        </td>
                        {isSaturday && (() => {
                          const weekStartDate = new Date(date.getTime() - 6 * 24 * 60 * 60 * 1000);
                          const stats = getHabitStats(habit.id, weekStartDate, date);
                          return (
                            <td className="score-cell">
                              <div className="score-content has-tooltip" data-tooltip={`${stats.grade.letter} (${Math.round(stats.percentage)}%)`}>
                                <span className={`score-grade ${stats.grade.class}`}>
                                  {stats.successCount}/{stats.totalCount}
                                </span>
                              </div>
                            </td>
                          );
                        })()}
                      </React.Fragment>
                    );
                  });
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {viewingVlog && (
        <VlogModal
          vlog={viewingVlog}
          onClose={() => setViewingVlog(null)}
        />
      )}

      {showChart && (
        <ChartModal
          data={chartData}
          habits={habits}
          onClose={() => setShowChart(false)}
        />
      )}
    </>
  );
}
