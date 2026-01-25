import { memo } from 'react';
import type { Memory } from '../../types';
import styles from './TimelineCard.module.css';

interface TimelineCardProps {
    memory: Memory;
    color: string;
    alignDate?: 'left' | 'right';
    className?: string;
}

export const TimelineCard = memo(({ memory, color, alignDate = 'left', className }: TimelineCardProps) => {
    // Format date nicely
    const formattedDate = new Date(memory.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
    });

    return (
        <div
            className={`${styles.card} ${className || ''}`}
            style={{ backgroundColor: color }}
        >
            <div className={`${styles.cardHeader} ${alignDate === 'right' ? styles.cardHeaderRight : ''}`}>
                <span className={styles.cardDate}>{formattedDate}</span>
            </div>
            <hr className={styles.cardDivider} />
            <p className={styles.memoryText}>{memory.text}</p>
        </div>
    );
});

TimelineCard.displayName = 'TimelineCard';
