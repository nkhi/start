import { getEventColor } from './CalendarColors';
import sharedStyles from './EventCard.module.css';
import styles from './TimedEventCard.module.css';

interface TimedEventCardProps {
    event: {
        id: string;
        summary: string;
        start_time: string;
        end_time: string;
        html_link: string;
    };
    index: number;
    isHovered: boolean;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
}

function formatTime(timeStr: string): string {
    return new Date(timeStr).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit'
    });
}

export function TimedEventCard({
    event,
    index,
    isHovered,
    onMouseEnter,
    onMouseLeave
}: TimedEventCardProps) {
    const color = getEventColor(event.id, index);

    return (
        <a
            href={event.html_link}
            target="_blank"
            rel="noopener noreferrer"
            className={`${sharedStyles.eventCard} ${styles.card}`}
            style={{
                background: isHovered ? color.hover : color.bg,
                borderLeft: `3px solid ${color.border}`,
            }}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <span className={styles.time} style={{ color: color.fade }}>
                {formatTime(event.start_time)} – {formatTime(event.end_time)}
            </span>
            <span className={styles.summary} style={{ color: color.text }}>
                {event.summary}
            </span>
        </a>
    );
}
