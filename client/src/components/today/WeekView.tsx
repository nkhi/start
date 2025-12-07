import React, { useEffect, useState } from 'react';
import { DateUtility } from '../../utils';
import { CaretLeft, CaretRight, ArrowBendUpLeft } from '@phosphor-icons/react';
import type { DayWeekColumnData } from '../shared/DayWeek';

interface WeekViewProps {
    renderColumn: (data: DayWeekColumnData) => React.ReactNode;
    currentDate: Date;
    onClose: () => void;
    onWeekChange: (start: Date, end: Date) => void;
    headerControls?: React.ReactNode;
}

export function WeekView({ renderColumn, currentDate, onClose, onWeekChange, headerControls }: WeekViewProps) {
    const [weekStart, setWeekStart] = useState<Date>(() => {
        // Calculate start of week (Sunday)
        const d = new Date(currentDate);
        const day = d.getDay(); // 0 is Sunday
        d.setDate(d.getDate() - day);
        d.setHours(0, 0, 0, 0);
        return d;
    });

    const [weekDates, setWeekDates] = useState<Date[]>([]);

    useEffect(() => {
        const dates = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(weekStart);
            d.setDate(d.getDate() + i);
            dates.push(d);
        }
        setWeekDates(dates);

        // Notify parent of range change
        const start = dates[0];
        const end = dates[6];
        onWeekChange(start, end);
    }, [weekStart]);

    const handlePrevWeek = () => {
        const newStart = new Date(weekStart);
        newStart.setDate(newStart.getDate() - 7);
        setWeekStart(newStart);
    };

    const handleNextWeek = () => {
        const newStart = new Date(weekStart);
        newStart.setDate(newStart.getDate() + 7);
        setWeekStart(newStart);
    };

    const handleCurrentWeek = () => {
        const d = new Date();
        const day = d.getDay();
        d.setDate(d.getDate() - day);
        d.setHours(0, 0, 0, 0);
        setWeekStart(d);
    };

    return (
        <div className="week-view-container">
            <div className="week-columns">
                {weekDates.map(date => {
                    const dateStr = DateUtility.formatDate(date);
                    const isToday = DateUtility.isToday(date);
                    return (
                        <div key={dateStr} className={`week-column ${isToday ? 'today' : ''}`}>
                            {renderColumn({ date, dateStr, isToday, isFocused: false })}
                        </div>
                    );
                })}
            </div>

            <div className="week-controls-center">
                <button className="week-back-btn" onClick={onClose} title="Back to Day View">
                    <ArrowBendUpLeft size={20} weight="bold" />
                </button>

                {headerControls}

                <div className="week-nav-group">
                    <button className="week-nav-btn" onClick={handlePrevWeek}>
                        <CaretLeft size={20} weight="bold" />
                    </button>
                    <button
                        className="week-label"
                        onClick={handleCurrentWeek}
                        title="Go to Current Week"
                    >
                        {DateUtility.formatDateRange(weekDates)}
                    </button>
                    <button className="week-nav-btn" onClick={handleNextWeek}>
                        <CaretRight size={20} weight="bold" />
                    </button>
                </div>
            </div>
        </div>
    );
}
