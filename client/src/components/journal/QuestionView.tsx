import { useEffect, useState, useRef } from 'react';
import { getDiaryByQuestion } from '../../api/diary';
import type { DiaryByQuestion } from '../../types';
import { ArrowCircleLeft } from '@phosphor-icons/react';
import dayWeekStyles from '../shared/DayWeek.module.css';
import diaryStyles from './Diary.module.css';

interface QuestionViewProps {
    apiBaseUrl: string;
    onBack: () => void;
}

export function QuestionView({ apiBaseUrl, onBack }: QuestionViewProps) {
    const [data, setData] = useState<DiaryByQuestion[]>([]);

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    // Observe columns when data changes
    useEffect(() => {
        if (!observerRef.current || !scrollContainerRef.current) return;

        // Disconnect previous observations
        observerRef.current.disconnect();

        const columns = scrollContainerRef.current.querySelectorAll(`.${dayWeekStyles.dayweekColumn}`);
        columns.forEach(col => observerRef.current?.observe(col));

        return () => observerRef.current?.disconnect();
    }, [data]);

    async function loadData() {
        try {
            const result = await getDiaryByQuestion(apiBaseUrl);
            setData(result);
        } catch (error) {
            console.error('Failed to load diary by question:', error);
        }
    }

    return (
        <div className={dayWeekStyles.dayweekScrollContainer} ref={scrollContainerRef}>
            {data.map(item => (
                <div
                    key={item.question.id}
                    className={`${dayWeekStyles.dayweekColumn} ${dayWeekStyles.questionViewColumn}`}
                    data-id={item.question.id}
                    style={{ minWidth: '400px' }}
                >
                    <div className={diaryStyles.diaryColumnHeader} style={{ height: 'auto', paddingBottom: '16px', marginBottom: '0' }}>
                        <span className={diaryStyles.diaryDayName} style={{ fontSize: '1.2rem', fontWeight: 600, whiteSpace: 'normal', lineHeight: '1.4', color: 'rgba(255,255,255,0.9)' }}>
                            {item.question.text}
                        </span>
                    </div>

                    <div className={diaryStyles.diaryContent}>
                        {item.entries.map((entry: any) => (
                            <div key={entry.id} className={diaryStyles.diaryCard}>
                                <div className={diaryStyles.diaryQuestion} style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>
                                    {new Date(entry.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                                </div>
                                <div className={diaryStyles.diaryAnswerArea} style={{ fontSize: '0.95rem', lineHeight: '1.5', whiteSpace: 'pre-wrap', color: 'rgba(255,255,255,0.9)', height: 'auto', resize: 'none', border: 'none', padding: 0 }}>
                                    {entry.answer}
                                </div>
                            </div>
                        ))}
                        {item.entries.length === 0 && (
                            <div className={diaryStyles.diaryCard} style={{ opacity: 0.5, textAlign: 'center', padding: '20px' }}>
                                No entries yet
                            </div>
                        )}
                    </div>
                </div>
            ))}

            {/* Back Button */}
            <button
                className={dayWeekStyles.todayFloatingBtn}
                onClick={onBack}
                title="Back to Day View"
            >
                <ArrowCircleLeft weight="duotone" size={20} className={dayWeekStyles.todayIcon} />
                <span>Day View</span>
            </button>
        </div>
    );
}
