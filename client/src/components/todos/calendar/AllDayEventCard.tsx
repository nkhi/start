import { getEventColor } from './CalendarColors';
import sharedStyles from './EventCard.module.css';
import styles from './AllDayEventCard.module.css';

interface AllDayEventCardProps {
    event: {
        id: string;
        summary: string;
        html_link: string;
    };
    index: number;
    isHovered: boolean;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
}

export function AllDayEventCard({
    event,
    index,
    isHovered,
    onMouseEnter,
    onMouseLeave
}: AllDayEventCardProps) {
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
            <span className={styles.text} style={{ color: color.text }}>
                {event.summary}
            </span>
        </a>
    );
}
