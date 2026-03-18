import { useEffect, useLayoutEffect, useRef, useCallback, type ReactNode, forwardRef, useImperativeHandle, useState } from 'react';
import { DateUtility } from '../../utils';
import { ArrowCircleLeft, StrategyIcon, Ghost } from '@phosphor-icons/react';
import styles from './DayWeek.module.css';

export interface DayWeekHandle {
  scrollToToday: () => void;
}

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
   * Dates array to strictly render.
   */
  dates: Date[];

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

  /**
   * Optional: Hides the floating Zoom Out and Graveyard buttons.
   */
  hideGlobalButtons?: boolean;

  /**
   * Optional: Callback when the user scrolls and the focused date changes
   */
  onFocusedDateChange?: (dateStr: string) => void;
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
export const DayWeek = forwardRef<DayWeekHandle, DayWeekProps>(({
  renderColumn,
  dates,
  className,
  columnClassName,
  onMoreClick,
  moreOverride,
  onGraveyardClick,
  isGraveyardOpen,
  workMode = false,
  hideGlobalButtons = false,
  onFocusedDateChange
}, ref) => {
  const [focusedDateStr, setFocusedDateStr] = useState<string>('');
  const [isReady, setIsReady] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Use provided classNames or fall back to module styles
  const containerClass = className || styles.dayweekScrollContainer;
  const columnClass = columnClassName || styles.dayweekColumn;

  // Set initial scroll position before paint to avoid visual jump
  useLayoutEffect(() => {
    if (dates.length > 0 && scrollContainerRef.current && !isReady) {
      scrollToToday(true);
      setIsReady(true);
    }
  }, [dates]);

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
            if (onFocusedDateChange) {
              onFocusedDateChange(dateStr);
            }
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

  const scrollToToday = useCallback((instant = false) => {
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
        todayEl.scrollIntoView({
          behavior: instant ? 'instant' : 'smooth',
          inline: 'center',
          block: 'nearest'
        });
      }
    }
  }, [workMode]);

  useImperativeHandle(ref, () => ({
    scrollToToday: () => scrollToToday()
  }));

  return (
    <div
      className={containerClass}
      ref={scrollContainerRef}
      style={{ visibility: isReady ? 'visible' : 'hidden' }}
    >
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
      {!hideGlobalButtons && (
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
      )}

      {/* Floating "Graveyard" button (optional) */}
      {!hideGlobalButtons && onGraveyardClick && (
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
      {!hideGlobalButtons && (() => {
        const todayStr = DateUtility.formatDate(new Date());
        const isFocusedToday = focusedDateStr === todayStr;
        const isFutureDate = focusedDateStr > todayStr;

        return (
          <button
            className={`${styles.todayFloatingBtn} ${isFocusedToday ? styles.isToday : ''} ${!onGraveyardClick ? styles.noGraveyard : ''}`}
            onClick={() => scrollToToday()}
            title="Scroll to Today"
          >
            <ArrowCircleLeft
              weight="fill"
              size={20}
              className={`${styles.todayIcon} ${!isFocusedToday ? (isFutureDate ? styles.pointRight : '') : styles.pointUp}`}
            />
            <span>Today</span>
          </button>
        );
      })()}
    </div>
  );
});
