import React from 'react';
import { Tray } from '@phosphor-icons/react';
import { CARD_COLORS } from '../../constants/colors';
import { TimelineCard } from './TimelineCard';
import { useMemories } from './useMemories';
import { useTimelineNavigation } from './useTimelineNavigation';
import { useScrollVisibility } from './useScrollVisibility';
import styles from './MemoriesTimeline.module.css';

interface MemoriesTimelineProps {
    onExit: () => void;
}

export const MemoriesTimeline: React.FC<MemoriesTimelineProps> = ({ onExit }) => {
    const { memories, isLoading, currentYear } = useMemories();
    const { setCardRef, cardRefs, headerRef, footerRef } = useTimelineNavigation({
        memories,
        onExit
    });

    // Apply visibility class on scroll
    useScrollVisibility(cardRefs, styles.visible, [memories]);

    // Assign consistent colors based on memory index
    const getColor = (index: number) => {
        return CARD_COLORS[index % CARD_COLORS.length];
    };

    if (isLoading) {
        return <div className={styles.loading}>Loading memories...</div>;
    }

    if (memories.length === 0) {
        return (
            <div className={styles.empty}>
                <Tray size={64} weight="duotone" className={styles.emptyIcon} />
                <p className={styles.emptyText}>
                    No memories yet for {currentYear}.<br />
                    Start capturing good moments!
                </p>
            </div>
        );
    }

    return (
        <div className={styles.timelineContainer}>
            {/* Fade overlays */}
            <div className={styles.fadeOverlayTop} />
            <div className={styles.fadeOverlayBottom} />

            <div className={styles.timelineContent}>
                {/* The vertical spine */}
                <div className={styles.timelineSpine} />

                {/* Header */}
                <div ref={headerRef} className={styles.header}>
                    <h1 className={styles.title}>{currentYear}</h1>
                    <p className={styles.subtitle}>A Year of Good Moments</p>
                </div>

                {/* Memory cards */}
                {memories.map((memory, index) => {
                    const side = index % 2 === 0 ? 'right' : 'left';
                    return (
                        <div
                            key={memory.id}
                            ref={(el) => setCardRef(memory.id, el)}
                            className={`${styles.memoryItem} ${styles[side]}`}
                        >
                            {/* Timeline connector dot */}
                            <div className={styles.timelineDot} />

                            {/* The memory card - wrapped for positioning */}
                            <TimelineCard
                                className={styles.cardWrapper}
                                memory={memory}
                                color={getColor(index)}
                                alignDate={side === 'left' ? 'right' : 'left'}
                            />
                        </div>
                    );
                })}

                {/* Footer - mirrors header */}
                <div ref={footerRef} className={styles.footer}>
                    <h2 className={styles.footerTitle}>It is hard to understand how great your life truly is without taking the time to capture it.</h2>
                    <p className={styles.footerSubtitle}>Being grateful is a choice, and being open is an opportunity.</p>
                </div>
            </div>
        </div>
    );
};
