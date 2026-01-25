import { Tray } from '@phosphor-icons/react';
import { MemoryPanel } from './MemoryPanel';
import { useLongPress } from './useLongPress';

interface MemoryButtonProps {
    isPanelOpen: boolean;
    onToggle: () => void;
    onTimelineOpen?: () => void;
    className?: string;
}

export function MemoryButton({ isPanelOpen, onToggle, onTimelineOpen, className }: MemoryButtonProps) {
    const { isHolding, handlers } = useLongPress({
        onLongPress: () => {
            if (onTimelineOpen) onTimelineOpen();
        },
        onClick: onToggle,
        duration: 500
    });

    // Only attach handlers if onTimelineOpen is present, otherwise just click
    const buttonHandlers = onTimelineOpen
        ? handlers
        : { onClick: onToggle };

    return (
        <>
            <button
                className={className}
                {...buttonHandlers}
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
