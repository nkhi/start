import { useEffect, useState, useRef, type ReactNode } from 'react';
import { DateUtility } from '../../utils';
import { ArrowCircleLeft, StrategyIcon } from '@phosphor-icons/react';

export interface DayWeekColumnData {
  date: Date;
  dateStr: string;
  isToday: boolean;
  isFocused: boolean;
}

interface DayWeekProps {
  /**
   * Function to render the content of each day column.
   * Receives data about the current date/column.
   */
  renderColumn: (data: DayWeekColumnData) => ReactNode;

  /**
   * Optional: Custom start date. Defaults to Nov 9, 2025.
   */
  startDate?: Date;

  /**
   * Optional: Number of future days to show beyond today. Defaults to 14.
   */
  futureDays?: number;

  /**
   * Optional: Custom class name for the scroll container
   */
  className?: string;

  /**
   * Optional: Custom class name for each column
   */
  columnClassName?: string;

  /**
   * Optional: Callback when the "More" button is clicked.
   */
  onMoreClick?: () => void;
}

/**
 * DayWeek - A reusable horizontal scrolling day-by-day view component.
 * 
 * This component provides:
 * - Horizontal scrolling through days
 * - Automatic scroll to today on mount
 * - Focus tracking via intersection observer
 * - "Back to Today" floating button
 * - Customizable column rendering via render prop
 * 
 * Future enhancement: Will support zoom out to weekly view.
 */
export function DayWeek({
  renderColumn,
  startDate = new Date('2025-11-09T00:00:00'),
  futureDays = 14,
  className = 'dayweek-scroll-container',
  columnClassName = 'dayweek-column',
  onMoreClick
}: DayWeekProps) {
  const [dates, setDates] = useState<Date[]>([]);
  const [focusedDateStr, setFocusedDateStr] = useState<string>('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    initializeDates();
  }, []);

  function initializeDates() {
    const allDates = DateUtility.getAllDatesFromStart(startDate);

    // Add future days from "today" (or the last date in the range)
    const lastDate = allDates.length > 0 ? allDates[allDates.length - 1] : new Date();
    const futureDatesList = [];
    for (let i = 1; i <= futureDays; i++) {
      const d = new Date(lastDate);
      d.setDate(d.getDate() + i);
      futureDatesList.push(d);
    }

    setDates([...allDates, ...futureDatesList]);

    // Scroll to today after dates are set
    setTimeout(() => scrollToToday(), 100);
  }

  // Set up intersection observer
  useEffect(() => {
    const options = {
      root: scrollContainerRef.current,
      threshold: 0.6 // 60% visibility required to be "focused"
    };

    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const dateStr = entry.target.getAttribute('data-date');
          if (dateStr) {
            setFocusedDateStr(dateStr);
          }
        }
      });
    }, options);
  }, []);

  // Observe columns when dates change
  useEffect(() => {
    if (!observerRef.current || !scrollContainerRef.current) return;

    // Disconnect previous observations
    observerRef.current.disconnect();

    const columns = scrollContainerRef.current.querySelectorAll(`.${columnClassName}`);
    columns.forEach(col => observerRef.current?.observe(col));

    return () => observerRef.current?.disconnect();
  }, [dates, columnClassName]);

  function scrollToToday() {
    if (scrollContainerRef.current) {
      const todayEl = scrollContainerRef.current.querySelector(`.${columnClassName}.today`);
      if (todayEl) {
        todayEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }

  return (
    <div className={className} ref={scrollContainerRef}>
      {dates.map(date => {
        const dateStr = DateUtility.formatDate(date);
        const isToday = DateUtility.isToday(date);
        const isFocused = dateStr === focusedDateStr;

        return (
          <div
            key={dateStr}
            className={`${columnClassName} ${isToday ? 'today' : ''} ${isFocused ? 'focused' : ''}`}
            data-date={dateStr}
          >
            {renderColumn({ date, dateStr, isToday, isFocused })}
          </div>
        );
      })}

      {/* Floating "Zoom Out" button */}
      <button
        className={`zoom-floating-btn`}
        onClick={() => onMoreClick ? onMoreClick() : scrollToToday()}
        title="Zoom Out, See More"
      >
        <StrategyIcon
          weight="fill"
          size={20}
        />
        <span>More</span>
      </button>

      {/* Floating "Back to Today" button */}
      {(() => {
        const todayStr = DateUtility.formatDate(new Date());
        const isToday = focusedDateStr === todayStr;
        const isPast = focusedDateStr < todayStr;

        let rotationClass = '';
        if (isToday) rotationClass = 'point-up';
        else if (isPast) rotationClass = 'point-right';

        return (
          <button
            className={`today-floating-btn ${isToday ? 'is-today' : ''}`}
            onClick={() => scrollToToday()}
            title="Back to Today"
          >
            <ArrowCircleLeft
              weight="duotone"
              size={20}
              className={`today-icon ${rotationClass}`}
            />
            <span>Today</span>
          </button>
        );
      })()}
    </div>
  );
}
