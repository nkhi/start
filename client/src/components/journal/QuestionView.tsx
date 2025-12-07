import { useEffect, useState, useRef } from 'react';
import { HabitAPI } from '../../api';
import type { DiaryByQuestion } from '../../types';
import { ArrowCircleLeft } from '@phosphor-icons/react';

interface QuestionViewProps {
    apiBaseUrl: string;
    onBack: () => void;
}

export function QuestionView({ apiBaseUrl, onBack }: QuestionViewProps) {
    const [data, setData] = useState<DiaryByQuestion[]>([]);
    // const [focusedId, setFocusedId] = useState<string>('');
    const api = useRef(new HabitAPI(apiBaseUrl)).current;
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    // // Set up intersection observer
    // useEffect(() => {
    //     const options = {
    //         root: scrollContainerRef.current,
    //         threshold: 0.6 // 60% visibility required to be "focused"
    //     };

    //     observerRef.current = new IntersectionObserver((entries) => {
    //         entries.forEach(entry => {
    //             if (entry.isIntersecting) {
    //                 const id = entry.target.getAttribute('data-id');
    //                 if (id) {
    //                     setFocusedId(id);
    //                 }
    //             }
    //         });
    //     }, options);

    //     return () => observerRef.current?.disconnect();
    // }, []);

    // Observe columns when data changes
    useEffect(() => {
        if (!observerRef.current || !scrollContainerRef.current) return;

        // Disconnect previous observations
        observerRef.current.disconnect();

        const columns = scrollContainerRef.current.querySelectorAll('.dayweek-column');
        columns.forEach(col => observerRef.current?.observe(col));

        return () => observerRef.current?.disconnect();
    }, [data]);

    async function loadData() {
        try {
            const result = await api.getDiaryByQuestion();
            setData(result);
            // Set initial focus to first item if exists
            // if (result.length > 0) {
            //     setFocusedId(result[0].question.id);
            // }
        } catch (error) {
            console.error('Failed to load diary by question:', error);
        }
    }

    return (
        <div className="dayweek-scroll-container" ref={scrollContainerRef}>
            {data.map(item => (
                <div
                    key={item.question.id}
                    className={`dayweek-column question-view-column`}
                    data-id={item.question.id}
                    style={{ minWidth: '400px' }}
                >
                    <div className="diary-column-header" style={{ height: 'auto', paddingBottom: '16px', marginBottom: '0' }}>
                        <span className="diary-day-name" style={{ fontSize: '1.2rem', fontWeight: 600, whiteSpace: 'normal', lineHeight: '1.4', color: 'rgba(255,255,255,0.9)' }}>
                            {item.question.text}
                        </span>
                    </div>

                    <div className="diary-content">
                        {item.entries.map((entry: any) => (
                            <div key={entry.id} className="diary-card">
                                <div className="diary-question" style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>
                                    {new Date(entry.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                                </div>
                                <div className="diary-answer-text" style={{ fontSize: '0.95rem', lineHeight: '1.5', whiteSpace: 'pre-wrap', color: 'rgba(255,255,255,0.9)' }}>
                                    {entry.answer}
                                </div>
                            </div>
                        ))}
                        {item.entries.length === 0 && (
                            <div className="diary-card" style={{ opacity: 0.5, textAlign: 'center', padding: '20px' }}>
                                No entries yet
                            </div>
                        )}
                    </div>
                </div>
            ))}

            {/* Back Button */}
            <button
                className="today-floating-btn"
                onClick={onBack}
                title="Back to Day View"
            >
                <ArrowCircleLeft weight="duotone" size={20} className="today-icon" />
                <span>Day View</span>
            </button>
        </div>
    );
}
