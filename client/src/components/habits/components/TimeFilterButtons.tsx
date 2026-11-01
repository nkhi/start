import { WarningIcon, FlagIcon, InfoIcon, ListIcon } from '@phosphor-icons/react';
import { HABIT_TIME_CONFIG, FILTER_TIME_TYPES, type HabitDefaultTime } from './constants';
import styles from '../HabitTracker.module.css';
import { useState } from 'react';
import ChartModal from './ChartModal';
import { useHoldProgress } from '../../../hooks/useHoldProgress';
import { HOLD_DURATIONS } from '../../../constants/holdDurations';


export const CRITICAL_FILTER = 'critical';
export const UNFINISHED_FILTER = 'unfinished';

interface TimeFilterButtonsProps {
    selectedTimeFilter: string | null;
    onFilterChange: (filter: string | null) => void;
    chartData: any;
    habits: any;
    showInsights: boolean;
    onToggleInsights: () => void;
    showSections: boolean;
    onToggleSections: () => void;
}


interface FilterButtonProps {
    isActive: boolean;
    color: string;
    title: string;
    label: string;
    onClick: () => void;
    children: React.ReactNode;
}

function FilterButton({ isActive, color, title, label, onClick, children }: FilterButtonProps) {
    const { holdProps, Ring } = useHoldProgress({
        duration: HOLD_DURATIONS.TIME_FILTER,
        trigger: 'hover',
        color,
        label: isActive ? `Clear` : `Filter ${label}`,
        onComplete: onClick,
    });

    return (
        <>
            <button
                className={`${styles.timeFilterBtn} ${isActive ? styles.active : ''}`}
                title={title}
                data-color={color}
                {...holdProps}
            >
                {children}
            </button>
            <Ring />
        </>
    );
}

export function TimeFilterButtons({ selectedTimeFilter, onFilterChange, chartData, habits, showInsights, onToggleInsights, showSections, onToggleSections }: TimeFilterButtonsProps) {

    const [showChart, setShowChart] = useState(false);

    const handleFilterClick = (timeType: HabitDefaultTime) => {
        onFilterChange(selectedTimeFilter === timeType ? null : timeType);
    };

    const handleCriticalClick = () => {
        onFilterChange(selectedTimeFilter === CRITICAL_FILTER ? null : CRITICAL_FILTER);
    };

    const handleUnfinishedClick = () => {
        onFilterChange(selectedTimeFilter === UNFINISHED_FILTER ? null : UNFINISHED_FILTER);
    };

    return (
        <>
            <div className={styles.timeFilterButtons}>
                {FILTER_TIME_TYPES.map((timeType) => {
                    const config = HABIT_TIME_CONFIG[timeType];
                    const IconComponent = config.icon;
                    const isActive = selectedTimeFilter === timeType;

                    if (!IconComponent) return null;

                    return (
                        <FilterButton
                            key={timeType}
                            isActive={isActive}
                            color={config.color}
                            title={config.label}
                            label={config.label}
                            onClick={() => handleFilterClick(timeType)}
                        >
                            <IconComponent size={18} weight="duotone" />
                        </FilterButton>
                    );
                })}

                {/* Separator between Routine and Critical */}
                <span className={styles.filterSeparator} />

                {/* Critical Streak Filter - Warning Icon */}
                <FilterButton
                    isActive={selectedTimeFilter === CRITICAL_FILTER}
                    color="#ef4444"
                    title="Critical streaks (failed 3+ days)"
                    label="Critical"
                    onClick={handleCriticalClick}
                >
                    <WarningIcon size={18} weight="duotone" />
                </FilterButton>

                <FilterButton
                    isActive={selectedTimeFilter === UNFINISHED_FILTER}
                    color="#facc15"
                    title="Unfinished today"
                    label="Unfinished"
                    onClick={handleUnfinishedClick}
                >
                    <FlagIcon size={18} weight="duotone" />
                </FilterButton>

                {/* Separator */}
                <span className={styles.filterSeparator} />

                {/* Sections toggle */}
                <button
                    className={`${styles.timeFilterBtn} ${showSections ? styles.active : ''}`}
                    title={showSections ? "Hide Sections" : "Show Sections"}
                    data-color="#10b981"
                    onClick={onToggleSections}
                    style={{ marginLeft: 2 }}
                >
                    <ListIcon size={18} weight={showSections ? 'fill' : 'duotone'} />
                </button>

                {/* Insights toggle */}
                <button
                    className={`${styles.timeFilterBtn} ${showInsights ? styles.active : ''}`}
                    title="Habit Insights"
                    data-color="#6366f1"
                    onClick={onToggleInsights}
                    style={{ marginLeft: 2 }}
                >
                    <InfoIcon size={18} weight={showInsights ? 'fill' : 'duotone'} />
                </button>

            </div>


            {showChart && (
                <ChartModal
                    data={chartData}
                    habits={habits}
                    onClose={() => setShowChart(false)}
                />
            )}
        </>
    );
}
