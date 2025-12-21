import { useEffect, useState, useRef, type ReactNode } from 'react';
import { DateUtility } from '../../utils';
import { ArrowCircleLeft, StrategyIcon, Ghost } from '@phosphor-icons/react';
import styles from './DayWeek.module.css';

export interface DayWeekColumnData {
  date: Date;
  dateStr: string;
  isToday: boolean;
  isFocused: boolean;
  isShrunk?: boolean;
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

  /**
   * Optional: Custom text for the "More" button.
   */
  moreOverride?: string;

  /**
   * Optional: Callback when the "Graveyard" button is clicked.
   */
  onGraveyardClick?: () => void;

  /**
   * Optional: Whether the graveyard panel is currently open.
   */
  isGraveyardOpen?: boolean;

  /**
   * Optional: Work mode - filters out Saturday and Sunday when true.
   */
  workMode?: boolean;
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
  className,
  columnClassName,
  onMoreClick,
  moreOverride,
  onGraveyardClick,
  isGraveyardOpen,
  workMode = false
}: DayWeekProps) {
  const [dates, setDates] = useState<Date[]>([]);
  const [focusedDateStr, setFocusedDateStr] = useState<string>('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Use provided classNames or fall back to module styles
  const containerClass = className || styles.dayweekScrollContainer;
  const columnClass = columnClassName || styles.dayweekColumn;

  useEffect(() => {
    initializeDates();
  }, [workMode]);

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

    let finalDates = [...allDates, ...futureDatesList];

    // Filter out weekends in work mode
    if (workMode) {
      finalDates = finalDates.filter(d => {
        const day = d.getDay();
        return day !== 0 && day !== 6; // Exclude Sunday (0) and Saturday (6)
      });
    }

    setDates(finalDates);

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

    const columns = scrollContainerRef.current.querySelectorAll(`.${columnClass.split(' ')[0]}`);
    columns.forEach(col => observerRef.current?.observe(col));

    return () => observerRef.current?.disconnect();
  }, [dates, columnClass]);

  function scrollToToday() {
    if (scrollContainerRef.current) {
      let todayEl = scrollContainerRef.current.querySelector('.today');

      // In work mode, if today is a weekend, find the next Monday
      if (!todayEl && workMode) {
        const today = new Date();
        const dayOfWeek = today.getDay();

        // If today is Sunday (0) or Saturday (6), find next weekday
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          const nextWeekday = new Date(today);
          // Sunday -> Monday (+1), Saturday -> Monday (+2)
          nextWeekday.setDate(today.getDate() + (dayOfWeek === 0 ? 1 : 2));
          const nextWeekdayStr = DateUtility.formatDate(nextWeekday);
          todayEl = scrollContainerRef.current.querySelector(`[data-date="${nextWeekdayStr}"]`);
        }
      }

      if (todayEl) {
        todayEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }

  return (
    <div className={containerClass} ref={scrollContainerRef}>
      {dates.map(date => {
        const dateStr = DateUtility.formatDate(date);
        const isToday = DateUtility.isToday(date);
        const isFocused = dateStr === focusedDateStr;

        return (
          <div
            key={dateStr}
            className={`${columnClass} ${isToday ? 'today' : ''} ${isFocused ? 'focused' : ''}`}
            data-date={dateStr}
          >
            {renderColumn({ date, dateStr, isToday, isFocused })}
          </div>
        );
      })}

      {/* Floating "Zoom Out" button */}
      <button
        className={styles.zoomFloatingBtn}
        onClick={() => onMoreClick ? onMoreClick() : scrollToToday()}
        title="Zoom Out, See More"
      >
        <StrategyIcon
          weight="fill"
          size={20}
        />
        <span>{moreOverride ? moreOverride : 'More'}</span>
      </button>

      {/* Floating "Graveyard" button (optional) */}
      {onGraveyardClick && (
        <button
          className={`${styles.graveyardFloatingBtn} ${isGraveyardOpen ? styles.active : ''}`}
          onClick={onGraveyardClick}
          title="Task Graveyard"
        >
          <Ghost
            weight="duotone"
            size={20}
          />
          <span>Grave</span>
        </button>
      )}

      {/* Floating "Back to Today" button */}
      {(() => {
        const todayStr = DateUtility.formatDate(new Date());
        const isToday = focusedDateStr === todayStr;
        const isPast = focusedDateStr < todayStr;

        let rotationClass = '';
        if (isToday) rotationClass = styles.pointUp;
        else if (isPast) rotationClass = styles.pointRight;

        return (
          <button
            className={`${styles.todayFloatingBtn} ${isToday ? styles.isToday : ''}`}
            onClick={() => scrollToToday()}
            title="Back to Today"
          >
            <ArrowCircleLeft
              weight="duotone"
              size={20}
              className={`${styles.todayIcon} ${rotationClass}`}
            />
            <span>Today</span>
          </button>
        );
      })()}
    </div>
  );
}
