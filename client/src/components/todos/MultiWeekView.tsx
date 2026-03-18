/**
 * MultiWeekView
 * 
 * A stateless grid component used in the Todos app for the "week" and "two-day" views.
 * 
 * Why it exists over DayWeek:
 * `DayWeek` is built for an infinite, smooth horizontal scrolling experience. 
 * `MultiWeekView` uses CSS Grid to create fixed columns where you cycle left/right 
 * as discrete "pages" (e.g. prev/next week). 
 * 
 * It strictly renders the array of dates passed to it (`useViewNavigation` drives this)
 * and uses an optional grid template string to shrink irrelevant columns (like past days).
 */

import React from 'react';
import { DateUtility } from '../../utils';
import type { DayWeekColumnData } from '../shared/DayWeek';
import styles from './MultiWeekView.module.css';

interface MultiWeekViewProps {
    renderColumn: (data: DayWeekColumnData) => React.ReactNode;
    dates: Date[];
    customGridTemplate?: string;
}

export function MultiWeekView({
    renderColumn,
    dates,
    customGridTemplate
}: MultiWeekViewProps) {

    // Default template if customGridTemplate is not provided: distribute columns equally
    const gridTemplate = customGridTemplate || `repeat(${dates.length}, 1fr)`;

    return (
        <div className={styles.weekViewContainer}>
            <div
                className={styles.weekColumns}
                style={{ gridTemplateColumns: gridTemplate }}
            >
                {dates.map((date, index) => {
                    const dateStr = DateUtility.formatDate(date);
                    const isToday = DateUtility.isToday(date);

                    // Determine if shrunk based on grid template string matching 0.4fr
                    const isShrunk = customGridTemplate ? customGridTemplate.split(' ')[index] === '0.4fr' : false;

                    return (
                        <div key={dateStr} className={`${styles.weekColumn} ${isToday ? 'today' : ''}`}>
                            {renderColumn({
                                date,
                                dateStr,
                                isToday,
                                isFocused: false,
                                isShrunk
                            })}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
