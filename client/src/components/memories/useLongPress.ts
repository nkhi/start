import { useRef, useState, useEffect } from 'react';

interface UseLongPressOptions {
    onLongPress: () => void;
    onClick?: () => void;
    duration?: number;
}

export function useLongPress({ onLongPress, onClick, duration = 500 }: UseLongPressOptions) {
    const holdTimer = useRef<number | null>(null);
    const [isHolding, setIsHolding] = useState(false);
    const didHold = useRef(false);

    const handlePointerDown = () => {
        didHold.current = false;
        holdTimer.current = window.setTimeout(() => {
            setIsHolding(true);
            didHold.current = true;
            onLongPress();
        }, duration);
    };

    const handlePointerUp = () => {
        if (holdTimer.current) {
            clearTimeout(holdTimer.current);
            holdTimer.current = null;
        }
        setIsHolding(false);
    };

    // If we leave the element, cancel the hold
    const handlePointerLeave = () => {
        handlePointerUp();
    };

    const handleClick = (e: React.MouseEvent) => {
        if (didHold.current) {
            // Prevent default click if we held
            e.preventDefault();
            e.stopPropagation();
        } else if (onClick) {
            onClick();
        }
        didHold.current = false;
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (holdTimer.current) clearTimeout(holdTimer.current);
        };
    }, []);

    return {
        isHolding,
        handlers: {
            onPointerDown: handlePointerDown,
            onPointerUp: handlePointerUp,
            onPointerLeave: handlePointerLeave,
            onClick: handleClick
        }
    };
}
