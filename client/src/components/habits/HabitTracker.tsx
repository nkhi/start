import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { getHabits, getEntries, saveEntry } from '../../api/habits';
import { getVlogsBatch, saveVlog } from '../../api/vlogs';
import type { Habit, HabitEntry, Vlog } from '../../types';
import { DateUtility, getGrade, generateId } from '../../utils';
import { useEntryComment } from '../../hooks/useEntryComment';
import VlogModal from './VlogModal';
// import ChartModal from './ChartModal';
import { TimeFilterButtons } from './TimeFilterButtons';
import { HabitTimeIcon } from './habitTimeConfig';
import { VideoCameraIcon } from '@phosphor-icons/react';
import styles from './HabitTracker.module.css';
import { HabitNameCell } from './HabitNameCell';
import { CommentPanel } from './CommentPanel';

const CONFIG = {
  startDate: new Date('2025-11-09T00:00:00'),
  stateIcons: ['·', '✓', '✕', ':)', ':|'],
  stateClasses: [styles.state0, styles.state1, styles.state2, styles.state3, styles.state4]
};

// const DAILY_STATUS_CONFIG = [
//   { min: 0, max: 33, className: styles.dailyStatusRed },
//   { min: 34, max: 66, className: styles.dailyStatusOrange },
//   { min: 67, max: 100, className: styles.dailyStatusGreen }
// ];

export function HabitTracker() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [entries, setEntries] = useState<Map<string, HabitEntry>>(new Map());
  const [dates, setDates] = useState<Date[]>([]);
  const [vlogs, setVlogs] = useState<Map<string, Vlog>>(new Map());
  const [viewingVlog, setViewingVlog] = useState<Vlog | null>(null);
  const [loomSupported, setLoomSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const tableWrapperRef = useRef<HTMLDivElement>(null);

  const loomButtonRef = useRef<HTMLButtonElement | null>(null);
  const sdkButtonRef = useRef<any>(null);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());
  const [selectedTimeFilter, setSelectedTimeFilter] = useState<string | null>(null);
  const [dynamicRowHeight, setDynamicRowHeight] = useState<number | null>(null);
  const theadRef = useRef<HTMLTableSectionElement>(null);
  const recordingWeekRef = useRef<Date | null>(null);

  // Comment tooltip state (for habit name hover)
  const [hoveredHabitId, setHoveredHabitId] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const hoverTimerRef = useRef<number | null>(null);

  // Entry comment hook
  const handleEntriesChange = useCallback((updater: (prev: Map<string, HabitEntry>) => Map<string, HabitEntry>) => {
    setEntries(prev => updater(prev));
  }, []);

  const { getCellHandlers, commentPanel, cellTooltip, wasLongPress } = useEntryComment({
    entries,
    habits,
    onEntriesChange: handleEntriesChange
  });

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
    return weeks.map(week => {
      const weekStart = new Date(week.key + 'T00:00:00');
      const weekEnd = week.end;

      const dataPoint: any = {
        name: `${weekStart.toLocaleDateString('en-US', { month: 'short' })} ${DateUtility.getDayNumber(weekStart)}`,
      };

      habits.forEach(habit => {
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
  }, [weeks, habits, entries]);

  const filteredHabits = useMemo(() => {
    return habits.filter(habit => !selectedTimeFilter || habit.defaultTime === selectedTimeFilter);
  }, [habits, selectedTimeFilter]);

  useEffect(() => {
    if (!selectedTimeFilter) {
      setDynamicRowHeight(null);
      return;
    }

    const calculateRowHeight = () => {
      if (!tableWrapperRef.current || !theadRef.current || filteredHabits.length === 0) {
        return;
      }

      const wrapperHeight = tableWrapperRef.current.clientHeight;
      const theadHeight = theadRef.current.clientHeight;
      const availableHeight = wrapperHeight - theadHeight;

      // Calculate height per row, with only a min 48px bound
      const calculatedHeight = Math.floor(availableHeight / filteredHabits.length);
      const boundedHeight = Math.max(48, calculatedHeight);

      setDynamicRowHeight(boundedHeight);
    };

    const rafId = requestAnimationFrame(() => {
      calculateRowHeight();
    });

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(calculateRowHeight);
    });

    if (tableWrapperRef.current) {
      resizeObserver.observe(tableWrapperRef.current);
    }

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
    };
  }, [selectedTimeFilter, filteredHabits.length]);

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

      const datesCopy = allDates.map(d => new Date(d));

      setDates(datesCopy);
      setIsLoading(false);

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
        getHabits(),
        getEntries(
          DateUtility.formatDate(CONFIG.startDate),
          DateUtility.formatDate(new Date())
        )
      ]);

      setHabits(habitsData);

      const entriesMap = new Map<string, HabitEntry>();
      entriesData.forEach(entry => {
        const normalizedHabitId = entry.habitId || (entry as any).habit_id;
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

    // Single batch API call instead of N individual calls
    const vlogsData = await getVlogsBatch(Array.from(weeks));
    const vlogsMap = new Map<string, Vlog>();
    Object.entries(vlogsData).forEach(([weekStart, vlog]) => {
      vlogsMap.set(weekStart, vlog as Vlog);
    });
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

    const newEntries = new Map(entries);
    newEntries.set(key, newEntry);
    setEntries(newEntries);

    try {
      await saveEntry(newEntry);
    } catch (error) {
      console.error('Failed to save entry:', error);
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
      await saveVlog(vlog);
      const newVlogs = new Map(vlogs);
      newVlogs.set(weekStartStr, vlog);
      setVlogs(newVlogs);
      recordingWeekRef.current = null;
    } catch (error) {
      console.error('Failed to save vlog:', error);
    }
  }

  function handleVlogClick(weekStart: Date, e: React.MouseEvent) {
    e.stopPropagation();
    const weekStartStr = DateUtility.formatDate(weekStart);
    const vlog = vlogs.get(weekStartStr);

    if (vlog) {
      setViewingVlog(vlog);
    } else {
      recordingWeekRef.current = weekStart;
      if (loomButtonRef.current) {
        loomButtonRef.current.click();
      }
    }
  }


  function getDayStats(date: Date) {
    let successCount = 0;
    let totalCount = 0;
    const breakdown: Record<string, { success: number; total: number }> = {};

    habits.forEach(habit => {
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      if (habit.defaultTime === 'weekdays' && isWeekend) {
        return;
      }

      if (!breakdown[habit.defaultTime]) {
        breakdown[habit.defaultTime] = { success: 0, total: 0 };
      }

      const entry = getEntry(date, habit.id);
      const isSuccess = entry && (entry.state === 1 || entry.state === 3);

      if (isSuccess) {
        successCount++;
        breakdown[habit.defaultTime].success++;
      }
      totalCount++;
      breakdown[habit.defaultTime].total++;
    });

    const percentage = totalCount === 0 ? 0 : (successCount / totalCount) * 100;
    return { percentage, totalCount, successCount, breakdown };
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

  // Comment tooltip handlers
  const handleHabitNameMouseEnter = useCallback((habitId: string, comment: string | null | undefined, event: React.MouseEvent) => {
    if (!comment) return;

    const rect = event.currentTarget.getBoundingClientRect();

    if (hoverTimerRef.current) {
      window.clearTimeout(hoverTimerRef.current);
    }

    hoverTimerRef.current = window.setTimeout(() => {
      setHoveredHabitId(habitId);
      setTooltipPosition({
        x: rect.right,
        y: rect.top + rect.height / 2
      });
    }, 1500); // 1.5 second delay
  }, []);

  const handleHabitNameMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setHoveredHabitId(null);
    setTooltipPosition(null);
  }, []);

  if (isLoading || habits.length === 0 || dates.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        {/* <p>Loading habits data...</p> */}
      </div>
    );
  }

  return (
    <>
      <div className={styles.tableWrapper} ref={tableWrapperRef}>
        <table className={styles.habitTable}>
          <thead id="table-head" ref={theadRef}>
            <tr>
              <th className={styles.trendsHeader}>
                <TimeFilterButtons
                  selectedTimeFilter={selectedTimeFilter}
                  onFilterChange={setSelectedTimeFilter}
                  chartData={chartData}
                  habits={habits}
                />
              </th>
              {weeks.map((week) => {
                const isExpanded = expandedWeeks.has(week.key);
                const hasVlog = vlogs.has(week.key);
                const weekStart = new Date(week.key + 'T00:00:00');

                if (!isExpanded) {
                  return (
                    <th
                      key={week.key}
                      className={styles.weekSummaryHeader}
                      onClick={() => toggleWeek(week.key)}
                      style={{ cursor: 'pointer', minWidth: '120px' }}
                    >
                      <div className={styles.dayHeader} style={{ flexDirection: 'column', gap: '3px', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span className={styles.dayName}>
                            {DateUtility.getDayName(week.start)} {DateUtility.getDayNumber(week.start)} - {DateUtility.getDayName(week.end)} {DateUtility.getDayNumber(week.end)}
                          </span>
                        </div>
                        {/* {hasVlog && <VideoCameraIcon size={16} weight="duotone" color="#d5c4fbff" />} */}
                      </div>
                    </th>
                  );
                }

                return week.days.map((date, idx) => {
                  const isSaturday = date.getDay() === 6;
                  const stats = getDayStats(date);
                  // const statusClass = DAILY_STATUS_CONFIG.find(
                  //   c => stats.percentage >= c.min && stats.percentage <= c.max
                  // )?.className || '';

                  return (
                    <React.Fragment key={`${week.key}-${idx}`}>
                      {/* <th colSpan={1} className={statusClass}> */}
                      <th colSpan={1}>
                        <div className={styles.dayHeader} style={{ position: 'relative' }}>
                          <span className={`${styles.dayName} ${DateUtility.isToday(date) ? styles.today : ''}`}>
                            {DateUtility.getDayName(date)}
                          </span>
                          <span className={`${styles.dayDate} ${DateUtility.isToday(date) ? styles.today : ''}`}>
                            {DateUtility.getDayNumber(date)}
                          </span>


                          <div className={styles.dayStatsTooltip}>
                            {Object.entries(stats.breakdown).map(([time, data]) => (
                              <div key={time} className={styles.tooltipRow}>
                                <span className={styles.tooltipLabel}>
                                  <HabitTimeIcon defaultTime={time as any} size={14} />
                                  {time}
                                </span>
                                <span className={styles.tooltipValue}>
                                  {data.success}/{data.total}
                                </span>
                              </div>
                            ))}
                            {Object.keys(stats.breakdown).length === 0 && (
                              <div className={styles.tooltipRow} style={{ justifyContent: 'center', color: '#666' }}>
                                No habits
                              </div>
                            )}
                          </div>
                        </div>
                      </th>
                      {isSaturday && loomSupported && (
                        <th className={styles.scoreHeader}>
                          <button
                            className={`${styles.vlogButton} ${hasVlog ? styles.hasVlog : ''}`}
                            onClick={(e) => handleVlogClick(weekStart, e)}
                            title={hasVlog ? "View weekly vlog" : "Record weekly vlog"}
                          >
                            <VideoCameraIcon size={20} weight="duotone" />
                          </button>
                          <button
                            className={styles.collapseBtn}
                            onClick={() => toggleWeek(week.key)}
                            title="Collapse week"
                            style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', marginLeft: '4px' }}
                          >
                            <span style={{ fontSize: '10px' }}>◀</span>
                          </button>
                        </th>
                      )}
                      {isSaturday && !loomSupported && (
                        <th className={styles.scoreHeader}></th>
                      )}
                    </React.Fragment>
                  );
                });
              })}
            </tr>
          </thead>
          <tbody id="table-body">
            {filteredHabits
              .sort((a, b) => a.order - b.order)
              .map(habit => (
                <tr
                  key={habit.id}
                  className={dynamicRowHeight ? styles.dynamicRow : ''}
                  style={dynamicRowHeight ? { height: `${dynamicRowHeight}px` } : undefined}
                >


                  <td>
                    <HabitNameCell
                      habit={habit}
                      streak={getCurrentStreak(habit.id)}
                      onMouseEnter={(e, id, comment) => handleHabitNameMouseEnter(id, comment, e)}
                      onMouseLeave={handleHabitNameMouseLeave}
                    />
                  </td>
                  {weeks.map((week, weekIndex) => {
                    const isExpanded = expandedWeeks.has(week.key);
                    const weekStart = new Date(week.key + 'T00:00:00');
                    const weekEnd = week.end;

                    const stats = getHabitStats(habit.id, weekStart, weekEnd);

                    const GRADE_COLORS: Record<string, string> = {
                      'gradeAPlus': '#10b981', 'gradeA': '#10b981', 'gradeAMinus': '#10b981',
                      'gradeBPlus': '#0ea5e9', 'gradeB': '#0ea5e9', 'gradeBMinus': '#0ea5e9',
                      'gradeCPlus': '#f59e0b', 'gradeC': '#f59e0b', 'gradeCMinus': '#f59e0b',
                      'gradeDPlus': '#ef4444', 'gradeD': '#ef4444', 'gradeDMinus': '#ef4444',
                      'gradeF': '#ef4444'
                    };
                    const currentColor = GRADE_COLORS[stats.grade.class] || '#4b5563';

                    if (!isExpanded) {
                      const nextWeek = weeks[weekIndex + 1];
                      const prevWeek = weeks[weekIndex - 1];
                      const isNextExpanded = nextWeek ? expandedWeeks.has(nextWeek.key) : true;
                      const isPrevExpanded = prevWeek ? expandedWeeks.has(prevWeek.key) : true;

                      // 1px in CSS = ~1.56 SVG units. Bottom center: 99.22.
                      const getY = (p: number) => 99.22 - (p * 0.86);
                      const yCurr = getY(stats.percentage);

                      let strokeElements: JSX.Element[] = [];
                      let fillElements: JSX.Element[] = [];
                      const maskId = `mask-fade-${habit.id}-${week.key}`;

                      strokeElements.push(
                        <defs key="defs-mask">
                          <linearGradient id={`grad-mask-${habit.id}-${week.key}`} x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="white" stopOpacity="0.5" />
                            <stop offset="100%" stopColor="white" stopOpacity="0" />
                          </linearGradient>
                          <mask id={maskId}>
                            <rect x="-100" y="0" width="300" height="100" fill={`url(#grad-mask-${habit.id}-${week.key})`} />
                          </mask>
                        </defs>
                      );

                      if (prevWeek && !isPrevExpanded) {
                        const prevWeekStart = new Date(prevWeek.key + 'T00:00:00');
                        const prevStats = getHabitStats(habit.id, prevWeekStart, prevWeek.end);
                        const prevColor = GRADE_COLORS[prevStats.grade.class] || '#4b5563';
                        const yPrev = getY(prevStats.percentage);

                        const pathD = `M -50 ${yPrev} C 0 ${yPrev}, 0 ${yCurr}, 50 ${yCurr}`;
                        const fillD = `${pathD} V 100 H -50 Z`;
                        const gradId = `grad-${habit.id}-${week.key}-conn`;

                        strokeElements.push(
                          <defs key="defs-conn">
                            <linearGradient id={gradId} gradientUnits="userSpaceOnUse" x1="-50" y1="0" x2="50" y2="0">
                              <stop offset="0%" stopColor={prevColor} />
                              <stop offset="100%" stopColor={currentColor} />
                            </linearGradient>
                          </defs>
                        );

                        fillElements.push(
                          <path key="conn-fill" d={fillD} fill={`url(#${gradId})`} mask={`url(#${maskId})`} style={{ pointerEvents: 'none' }} />
                        );
                        strokeElements.push(
                          <path key="conn-stroke" d={pathD} className={styles.sparklinePath} style={{ stroke: `url(#${gradId})`, strokeWidth: 1.5625, opacity: 0.55 }} />
                        );
                      } else {
                        const pathD = `M 0 ${yCurr} L 50 ${yCurr}`;
                        const fillD = `${pathD} V 100 H 0 Z`;

                        fillElements.push(
                          <path key="start-fill" d={fillD} fill={currentColor} mask={`url(#${maskId})`} style={{ pointerEvents: 'none' }} />
                        );
                        strokeElements.push(
                          <path key="start-stroke" d={pathD} className={styles.sparklinePath} style={{ stroke: currentColor, strokeWidth: 1.5625, opacity: 0.55 }} />
                        );
                      }

                      if (!nextWeek || isNextExpanded) {
                        const pathD = `M 50 ${yCurr} L 100 ${yCurr}`;
                        const fillD = `${pathD} V 100 H 50 Z`;

                        fillElements.push(
                          <path key="end-fill" d={fillD} fill={currentColor} mask={`url(#${maskId})`} style={{ pointerEvents: 'none' }} />
                        );
                        strokeElements.push(
                          <path key="end-stroke" d={pathD} className={styles.sparklinePath} style={{ stroke: currentColor, strokeWidth: 1.5625, opacity: 0.55 }} />
                        );
                      }

                      return (
                        <td
                          key={week.key}
                          onClick={() => toggleWeek(week.key)}
                          style={{ cursor: 'pointer' }}
                          className={styles.weekSummaryCell}
                        >
                          <svg className={styles.sparklineSvg} viewBox="0 0 100 100" preserveAspectRatio="none">
                            {fillElements}
                            {strokeElements}
                          </svg>
                          <div className={`${styles.scoreContent} ${styles.hasTooltip}`} data-tooltip={`${stats.grade.letter} (${Math.round(stats.percentage)}%)`}>
                            <span className={`${styles.scoreGrade} ${styles[stats.grade.class]}`}>
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
                            {(() => {
                              const handlers = getCellHandlers(date, habit, entry);
                              return (
                                <div
                                  className={`${styles.cell} ${CONFIG.stateClasses[state]} ${habit.defaultTime === 'weekdays' && (isSaturday || date.getDay() === 0) ? styles.disabled : ''} ${entry?.comment ? styles.hasComment : ''}`}
                                  onClick={() => {
                                    if (wasLongPress()) return;
                                    if (habit.defaultTime === 'weekdays' && (isSaturday || date.getDay() === 0)) return;
                                    cycleState(date, habit.id);
                                  }}
                                  onMouseDown={handlers.onMouseDown}
                                  onMouseUp={handlers.onMouseUp}
                                  onMouseLeave={handlers.onMouseLeave}
                                  onMouseEnter={handlers.onMouseEnter}
                                >
                                  {habit.defaultTime === 'weekdays' && (isSaturday || date.getDay() === 0) ? (
                                    <span style={{ color: '#333', fontSize: '12px' }}>-</span>
                                  ) : (
                                    CONFIG.stateIcons[state]
                                  )}
                                </div>
                              );
                            })()}
                          </td>
                          {isSaturday && (() => {
                            const weekStartDate = new Date(date.getTime() - 6 * 24 * 60 * 60 * 1000);
                            const stats = getHabitStats(habit.id, weekStartDate, date);
                            return (
                              <td className={styles.scoreCell}>
                                <div className={`${styles.scoreContent} ${styles.hasTooltip}`} data-tooltip={`${stats.grade.letter} (${Math.round(stats.percentage)}%)`}>
                                  <span className={`${styles.scoreGrade} ${styles[stats.grade.class]}`}>
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
        </table >
      </div >

      {viewingVlog && (
        <VlogModal
          vlog={viewingVlog}
          onClose={() => setViewingVlog(null)}
        />
      )}

      {/* Habit Name Comment Tooltip */}
      {hoveredHabitId && tooltipPosition && (
        <div
          className={styles.habitCommentTooltip}
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y
          }}
        >
          {habits.find(h => h.id === hoveredHabitId)?.comment}
        </div>
      )}

      {/* Cell Comment Tooltip */}
      {cellTooltip && (
        <div
          className={styles.cellCommentTooltip}
          style={{
            left: cellTooltip.x,
            top: cellTooltip.y
          }}
        >
          {cellTooltip.comment}
        </div>
      )}

      {/* Comment Panel */}
      {commentPanel && <CommentPanel {...commentPanel} />}
    </>
  );
}
