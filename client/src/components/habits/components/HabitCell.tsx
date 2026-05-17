import styles from '../HabitTracker.module.css';
import { STATE_ICONS } from './constants';
import type { Habit, HabitEntry } from '../../../types';

interface HabitCellProps {
    date: Date;
    habit: Habit;
    entry?: HabitEntry;
    onCycleState: (date: Date, habitId: string) => void;
    handlers: any; // Mouse handlers from useEntryComment
    wasLongPress: () => boolean;
}



export function HabitCell({
    date,
    habit,
    entry,
    onCycleState,
    handlers,
    wasLongPress
}: HabitCellProps) {
    const state = entry?.state || 0;
    const isSaturday = date.getDay() === 6;
    const isWeekend = isSaturday || date.getDay() === 0;
    const isWeekdaysHabit = habit.defaultTime === 'weekdays';
    const isDisabled = isWeekdaysHabit && isWeekend;

    // We strictly use the styles from the module, assuming they are available.
    // We map state to class names manually here to avoid passing CONFIG object.
    const stateClassMap = [styles.state0, styles.state1, styles.state2, styles.state3, styles.state4, styles.state5];
    const stateClass = stateClassMap[state];

    const handleClick = () => {
        if (wasLongPress()) return;
        if (isDisabled) return;
        onCycleState(date, habit.id);
    };

    return (
        <div
            className={`${styles.cell} ${stateClass} ${isDisabled ? styles.disabled : ''} ${entry?.comment ? styles.hasComment : ''}`}
            onClick={handleClick}
            onMouseDown={handlers.onMouseDown}
            onMouseUp={handlers.onMouseUp}
            onMouseLeave={handlers.onMouseLeave}
            onMouseEnter={handlers.onMouseEnter}
        >
            {isDisabled ? (
                <span style={{ color: '#333', fontSize: '12px' }}>-</span>
            ) : (
                STATE_ICONS[state]
            )}
        </div>
    );
}
