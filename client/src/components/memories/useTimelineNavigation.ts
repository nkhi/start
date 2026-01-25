import { useState, useRef, useCallback, useEffect } from 'react';
import type { Memory } from '../../types';

interface UseTimelineNavigationProps {
    memories: Memory[];
    onExit: () => void;
}

export function useTimelineNavigation({ memories, onExit }: UseTimelineNavigationProps) {
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

    // Callback ref to store card references
    const setCardRef = useCallback((id: string, element: HTMLDivElement | null) => {
        if (element) {
            cardRefs.current.set(id, element);
        } else {
            cardRefs.current.delete(id);
        }
    }, []);

    return {
        focusedIndex,
        setCardRef,
        headerRef,
        footerRef,
        cardRefs // Exported for IntersectionObserver
    };
}
