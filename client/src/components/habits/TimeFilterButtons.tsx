import { PresentationChartIcon, SelectionAll, X } from '@phosphor-icons/react';
import { HABIT_TIME_CONFIG, FILTER_TIME_TYPES, type HabitDefaultTime } from './habitTimeConfig';
import styles from './HabitTracker.module.css';
import { useState } from 'react';
import ChartModal from './ChartModal';

interface TimeFilterButtonsProps {
    selectedTimeFilter: string | null;
    onFilterChange: (filter: string | null) => void;
    chartData: any;
    habits: any;
}

export function TimeFilterButtons({ selectedTimeFilter, onFilterChange, chartData, habits }: TimeFilterButtonsProps) {
    const [showChart, setShowChart] = useState(false);

    const handleFilterClick = (timeType: HabitDefaultTime) => {
        // Toggle: if already selected, clear filter; otherwise set filter
        onFilterChange(selectedTimeFilter === timeType ? null : timeType);
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
                        <button
                            key={timeType}
                            className={`${styles.timeFilterBtn} ${isActive ? styles.active : ''}`}
                            onClick={() => handleFilterClick(timeType)}
                            title={config.label}
                            data-color={config.color}
                        >
                            <IconComponent size={18} weight="duotone" />
                        </button>
                    );
                })}

                {/* Show All / Clear Filter Button */}
                {/* <button
                    className={`${styles.timeFilterBtn} ${!selectedTimeFilter ? styles.inactive : ''}`}
                    onClick={() => onFilterChange(null)}
                    title="Show all habits"
                    data-color="white"
                    disabled={!selectedTimeFilter}
                >
                    <X size={18} color={selectedTimeFilter ? '#ffffff' : '#ffffff00'} />
                </button> */}

                {/* Separator */}
                <span className={styles.filterSeparator} />

                {/* Trends Button */}
                {/* <button
                    className={styles.timeFilterBtn}
                    onClick={() => setShowChart(true)}
                    title="View Trends"
                    data-color="#6366f1"
                >
                    <PresentationChartIcon size={18} weight="duotone" />
                </button> */}
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
