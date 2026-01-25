import { forwardRef } from 'react';
import type { Memory } from '../../types';
import styles from './MemoriesTimeline.module.css';

interface TimelineCardProps {
    memory: Memory;
    side: 'left' | 'right';
    color: string;
}

export const TimelineCard = forwardRef<HTMLDivElement, TimelineCardProps>(
    ({ memory, side, color }, ref) => {
        // Format date nicely
        const formattedDate = new Date(memory.date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
        });

        return (
            <div
                ref={ref}
                className={`${styles.memoryItem} ${styles[side]}`}
            >
                {/* Timeline connector dot */}
                <div className={styles.timelineDot} />

                {/* The memory card */}
                <div
                    className={styles.card}
                    style={{ backgroundColor: color }}
                >
                    <div className={styles.cardHeader}>
                        <span className={styles.cardDate}>{formattedDate}</span>
                    </div>
                    <hr className={styles.cardDivider} />
                    <p className={styles.memoryText}>{memory.text}</p>
                </div>
            </div>
        );
    }
);

TimelineCard.displayName = 'TimelineCard';
