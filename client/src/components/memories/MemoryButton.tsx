import { useRef, useState, useEffect } from 'react';
import { Tray } from '@phosphor-icons/react';
import { MemoryPanel } from './MemoryPanel';

interface MemoryButtonProps {
    isPanelOpen: boolean;
    onToggle: () => void;
    onTimelineOpen?: () => void;
    className?: string;
}

const HOLD_DURATION = 500; // ms to trigger hold action

export function MemoryButton({ isPanelOpen, onToggle, onTimelineOpen, className }: MemoryButtonProps) {
    const holdTimer = useRef<number | null>(null);
    const [isHolding, setIsHolding] = useState(false);
    const didHold = useRef(false);

    const handlePointerDown = () => {
        if (!onTimelineOpen) return;

        didHold.current = false;
        holdTimer.current = window.setTimeout(() => {
            setIsHolding(true);
            didHold.current = true;
            onTimelineOpen();
        }, HOLD_DURATION);
    };

    const handlePointerUp = () => {
        if (holdTimer.current) {
            clearTimeout(holdTimer.current);
            holdTimer.current = null;
        }
        setIsHolding(false);
    };

    const handleClick = () => {
        // Only toggle panel if we didn't just hold
        if (!didHold.current) {
            onToggle();
        }
        didHold.current = false;
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (holdTimer.current) clearTimeout(holdTimer.current);
        };
    }, []);

    return (
        <>
            <button
                className={className}
                onClick={handleClick}
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                title={onTimelineOpen ? "Tap: Add memory | Hold: View timeline" : "Good Moments"}
                style={{
                    transition: 'transform 0.2s ease',
                    transform: isHolding ? 'scale(1.1)' : 'scale(1)'
                }}
            >
                <Tray size={24} weight={isPanelOpen ? 'duotone' : 'regular'} className="navIcon" />
            </button>
            {isPanelOpen && (
                <MemoryPanel onClose={onToggle} />
            )}
        </>
    );
}
