import { useState, useRef, useEffect } from 'react';
import { CalendarBlank, ArrowsClockwise, WarningCircle } from '@phosphor-icons/react';
import styles from './CalendarPopover.module.css';
import { AllDayEventCard } from './AllDayEventCard';
import { TimedEventCard } from './TimedEventCard';
import { useCalendarEvents } from '../../../hooks/useCalendarEvents';

interface CalendarPopoverProps {
    date: Date;
}

export function CalendarPopover({ date }: CalendarPopoverProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);

    const wrapperRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const {
        events,
        allDayEvents,
        timedEvents,
        loading,
        syncing,
        error,
        sync,
    } = useCalendarEvents(date, isOpen);

    const handleMouseEnter = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsOpen(true);
    };

    const handleMouseLeave = () => {
        timeoutRef.current = setTimeout(() => setIsOpen(false), 300);
    };

    const handleSync = (e: React.MouseEvent) => {
        e.stopPropagation();
        sync();
    };

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    return (
        <div
            ref={wrapperRef}
            className={styles.calendarPopoverWrapper}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <button
                type="button"
                className={styles.calendarBtn}
                aria-label="View calendar events"
                aria-expanded={isOpen}
            >
                <CalendarBlank size={18} weight="duotone" />
            </button>

            {isOpen && (
                <div className={styles.popoverPanel}>
                    <div className={styles.popoverHeader}>
                        {/* <span className={styles.popoverTitle}>Calendar</span> */}
                        <button
                            className={`${styles.syncButton} ${syncing ? styles.spinning : ''}`}
                            onClick={handleSync}
                            title="Sync with Google Calendar"
                        >
                            <ArrowsClockwise size={14} weight="bold" />
                        </button>
                    </div>

                    <div className={styles.popoverContent}>
                        {loading && events.length === 0 ? (
                            <div className={styles.loadingState}>
                                <div className={`${styles.syncButton} ${styles.spinning}`}>
                                    <ArrowsClockwise size={20} />
                                </div>
                                <span className={styles.emptyText}>Loading events...</span>
                            </div>
                        ) : error ? (
                            <div className={styles.errorState}>
                                <WarningCircle size={24} className={styles.emptyIcon} />
                                <span className={styles.emptyText}>{error}</span>
                            </div>
                        ) : events.length === 0 ? (
                            <div className={styles.emptyState}>
                                <CalendarBlank size={32} weight="duotone" className={styles.emptyIcon} />
                                <span className={styles.emptyText}>No events for this day</span>
                            </div>
                        ) : (
                            <>
                                {allDayEvents.length > 0 && (
                                    <div className={styles.allDayList}>
                                        {allDayEvents.map((event, i) => (
                                            <AllDayEventCard
                                                key={event.id}
                                                event={event}
                                                index={i}
                                                isHovered={hoveredEventId === event.id}
                                                onMouseEnter={() => setHoveredEventId(event.id)}
                                                onMouseLeave={() => setHoveredEventId(null)}
                                            />
                                        ))}
                                    </div>
                                )}

                                {timedEvents.length > 0 && (
                                    <div className={styles.timeList}>
                                        {timedEvents.map((event, i) => (
                                            <TimedEventCard
                                                key={event.id}
                                                event={event}
                                                index={i}
                                                isHovered={hoveredEventId === event.id}
                                                onMouseEnter={() => setHoveredEventId(event.id)}
                                                onMouseLeave={() => setHoveredEventId(null)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
