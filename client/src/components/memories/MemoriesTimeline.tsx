import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Tray } from '@phosphor-icons/react';
import { getMemories } from '../../api/memories';
import { CARD_COLORS } from '../../constants/colors';
import type { Memory } from '../../types';
import { TimelineCard } from './TimelineCard';
import styles from './MemoriesTimeline.module.css';

// Toggle this to false when ready to use real data
const USE_MOCK_DATA = false;

// Generate mock memories for development
function generateMockMemories(count: number, year: number): Memory[] {
    const memories: Memory[] = [];
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    const daySpan = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    for (let i = 0; i < count; i++) {
        const randomDayOffset = Math.floor(Math.random() * daySpan);
        const memoryDate = new Date(startDate);
        memoryDate.setDate(memoryDate.getDate() + randomDayOffset);

        memories.push({
            id: `mock-memory-${i}`,
            text: `This is a placeholder memory #${i + 1}. It represents a good moment from the year.`,
            date: memoryDate.toISOString().split('T')[0],
            createdAt: memoryDate.toISOString(),
        });
    }

    // Sort by date ascending
    return memories.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

interface MemoriesTimelineProps {
    onExit: () => void;
}

export const MemoriesTimeline: React.FC<MemoriesTimelineProps> = ({ onExit }) => {
    const [memories, setMemories] = useState<Memory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [focusedIndex, setFocusedIndex] = useState(-1); // -1 = header, 0+ = memory cards
    const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const headerRef = useRef<HTMLDivElement>(null);
    const footerRef = useRef<HTMLDivElement>(null);

    // Function to scroll an element to center of viewport
    const scrollToCenter = useCallback((element: HTMLElement | null) => {
        if (!element) return;
        element.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
        });
    }, []);

    // Navigate to a specific index
    const navigateToIndex = useCallback((newIndex: number) => {
        const totalItems = memories.length;

        // Clamp index: -1 (header) to totalItems (footer)
        const clampedIndex = Math.max(-1, Math.min(newIndex, totalItems));
        setFocusedIndex(clampedIndex);

        // Scroll to appropriate element
        if (clampedIndex === -1) {
            // Scroll to header
            scrollToCenter(headerRef.current);
        } else if (clampedIndex === totalItems) {
            // Scroll to footer
            scrollToCenter(footerRef.current);
        } else {
            // Scroll to memory card
            const memory = memories[clampedIndex];
            if (memory) {
                const element = cardRefs.current.get(memory.id);
                scrollToCenter(element || null);
            }
        }
    }, [memories, scrollToCenter]);

    // Handle keyboard navigation (Escape, Up, Down)
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Ignore if user is typing in an input
            const target = event.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
                return;
            }

            switch (event.key) {
                case 'Escape':
                    event.preventDefault();
                    onExit();
                    break;
                case 'ArrowDown':
                case 'j': // vim-style
                    event.preventDefault();
                    navigateToIndex(focusedIndex + 1);
                    break;
                case 'ArrowUp':
                case 'k': // vim-style
                    event.preventDefault();
                    navigateToIndex(focusedIndex - 1);
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onExit, focusedIndex, navigateToIndex]);

    // Determine date range - current year
    const currentYear = new Date().getFullYear();
    const fromDate = `${currentYear}-01-01`;
    const toDate = `${currentYear}-12-31`;

    // Fetch memories on mount (or use mock data)
    useEffect(() => {
        const fetchData = async () => {
            try {
                if (USE_MOCK_DATA) {
                    // Use 30 mock memories for development
                    const mockData = generateMockMemories(30, currentYear);
                    setMemories(mockData);
                } else {
                    const data = await getMemories(fromDate, toDate);
                    // Sort by date ascending (oldest first at top)
                    const sorted = [...data].sort((a, b) =>
                        new Date(a.date).getTime() - new Date(b.date).getTime()
                    );
                    setMemories(sorted);
                }
            } catch (error) {
                console.error('Failed to fetch memories:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [fromDate, toDate, currentYear]);

    // Set up Intersection Observer for scroll-based visibility
    useEffect(() => {
        const observerOptions: IntersectionObserverInit = {
            root: null, // viewport
            rootMargin: '-10% 0px -30% 0px', // Trigger in the "sweet spot"
            threshold: [0, 0.25, 0.5, 0.75, 1],
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting && entry.intersectionRatio > 0.25) {
                    entry.target.classList.add(styles.visible);
                }
            });
        }, observerOptions);

        // Observe all card refs
        cardRefs.current.forEach((element) => {
            if (element) observer.observe(element);
        });

        return () => observer.disconnect();
    }, [memories]); // Re-run when memories change

    // Callback ref to store card references
    const setCardRef = useCallback((id: string, element: HTMLDivElement | null) => {
        if (element) {
            cardRefs.current.set(id, element);
        } else {
            cardRefs.current.delete(id);
        }
    }, []);

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
                {memories.map((memory, index) => (
                    <TimelineCard
                        key={memory.id}
                        ref={(el) => setCardRef(memory.id, el)}
                        memory={memory}
                        side={index % 2 === 0 ? 'right' : 'left'}
                        color={getColor(index)}
                    />
                ))}

                {/* Footer - mirrors header */}
                <div ref={footerRef} className={styles.footer}>
                    <h2 className={styles.footerTitle}>It is hard to understand how great your life truly is without taking the time to capture it.</h2>
                    <p className={styles.footerSubtitle}>Being grateful is a choice, and being open is an opportunity.</p>
                </div>
            </div>
        </div>
    );
};
