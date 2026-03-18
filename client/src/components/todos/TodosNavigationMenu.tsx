/**
 * TodosNavigationMenu
 * 
 * The floating action menu in the bottom-left of the Todos canvas. 
 * It aggregates global controls: view toggling (day/2-day/week), graveyard, work/life mode, 
 * and time navigation.
 * 
 * It handles its own hover expansion state via CSS but relies on the parent (`Todos.tsx`) 
 * for all behavioral logic. 
 * 
 * UX Note on time navigation:
 * - In paginated views ('week' or 'two-day'), it shows discrete `<` `>` pill buttons.
 * - In 'day' view, it replaces the pill with a "Today" button. Clicking it triggers
 *   a smooth scroll jump to the current date inside the underlying `DayWeek` component.
 */

import { useState } from 'react';
import {
    List,
    StrategyIcon,
    Ghost,
    Briefcase,
    LadderIcon,
    CaretLeft,
    CaretRight,
    Circle,
    ArrowCircleLeft
} from '@phosphor-icons/react';
import styles from './TodosNavigationMenu.module.css';

interface TodosNavigationMenuProps {
    // View Mode
    viewMode: 'day' | 'two-day' | 'week';
    onCycleViewMode: () => void;
    // Graveyard
    isGraveyardOpen: boolean;
    onToggleGraveyard: () => void;
    // Category Mode
    workMode: boolean;
    weekCategory: 'life' | 'work';
    onToggleCategory: () => void;
    // Navigation
    onPrev: () => void;
    onCurrent: () => void;
    onNext: () => void;
    // Day-mode Today button
    onScrollToToday: () => void;
    isFocusedToday: boolean;
    isFutureDate: boolean;
}

export function TodosNavigationMenu({
    viewMode,
    onCycleViewMode,
    isGraveyardOpen,
    onToggleGraveyard,
    workMode,
    weekCategory,
    onToggleCategory,
    onPrev,
    onCurrent,
    onNext,
    onScrollToToday,
    isFocusedToday,
    isFutureDate
}: TodosNavigationMenuProps) {
    const [isHovered, setIsHovered] = useState(false);
    const isExpanded = isHovered || isGraveyardOpen;

    return (
        <div
            className={`${styles.navMenuContainer} ${isExpanded ? styles.expanded : ''}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Trigger Icon - Visible only when collapsed */}
            <div className={styles.triggerWrapper}>
                <List size={22} weight="bold" />
            </div>

            {/* Expanded Contents */}
            <div className={styles.menuContents}>

                {/* 1. TOP ROW: Navigation Pill (Hidden when day mode uses its own Today button) */}
                <div className={styles.navRow}>
                    {viewMode !== 'day' ? (
                        <div className={styles.navPillFull}>
                            <button className={styles.navArrowBtn} onClick={onPrev} title="Previous">
                                <CaretLeft size={16} weight="bold" />
                            </button>
                            <button className={styles.navLabelBtn} onClick={onCurrent} title="Go to Today">
                                <Circle weight="fill" size={8} className={styles.navDotIcon} />
                            </button>
                            <button className={styles.navArrowBtn} onClick={onNext} title="Next">
                                <CaretRight size={16} weight="bold" />
                            </button>
                        </div>
                    ) : (
                        <button
                            className={`${styles.navLabelBtn} ${styles.todayFullBtn} ${isFocusedToday ? styles.isToday : ''}`}
                            onClick={onScrollToToday}
                            title="Scroll to Today"
                        >
                            <ArrowCircleLeft
                                size={20}
                                weight="fill"
                                className={`${styles.todayIcon} ${!isFocusedToday ? (isFutureDate ? '' : styles.pointRight) : styles.pointUp}`}
                            />
                            <span>Today</span>
                        </button>
                    )}
                </div>

                {/* 2. BOTTOM ROW: Action Toggles */}
                <div className={styles.actionRow}>
                    <button
                        className={styles.menuBtn}
                        onClick={onCycleViewMode}
                        title="Cycle View Mode"
                    >
                        <StrategyIcon weight="fill" size={18} />
                        <span>{viewMode === 'day' ? '2-Day' : viewMode === 'two-day' ? 'Week' : 'Day'}</span>
                    </button>

                    <button
                        className={`${styles.menuBtn} ${isGraveyardOpen ? styles.graveActive : ''}`}
                        onClick={onToggleGraveyard}
                        title="Task Graveyard"
                    >
                        <Ghost weight="duotone" size={18} />
                        <span>Grave</span>
                    </button>

                    {/* Category Toggle (Hidden in forced work mode or non-week views) */}
                    {!workMode && viewMode === 'week' && (
                        <button
                            className={`${styles.menuBtn} ${weekCategory === 'work' ? styles.workActive : styles.lifeActive
                                }`}
                            onClick={onToggleCategory}
                            title={`Switch to ${weekCategory === 'life' ? 'Work' : 'Life'} Mode`}
                        >
                            {weekCategory === 'life' ? (
                                <LadderIcon weight="duotone" size={18} />
                            ) : (
                                <Briefcase weight="fill" size={18} />
                            )}
                            <span>{weekCategory === 'life' ? 'Life' : 'Work'}</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
