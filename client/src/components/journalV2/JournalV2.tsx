import { useEffect, useState, useRef, useMemo } from 'react';
import { getQuestions, getDiary, saveDiaryEntry } from '../../api/diary';
import type { DiaryEntry, Question } from '../../types';
import { generateId, DateUtility } from '../../utils';
import { DayWeek, type DayWeekColumnData } from '../shared/DayWeek';
import { QuestionStack } from './QuestionStack';
import { CompletedStack } from './CompletedStack';
import styles from './JournalV2.module.css';

// Question IDs for special time input cards
const TIME_QUESTION_IDS = {
    WAKE: 'q13',
    SLEEP: 'q14'
};

export function JournalV2() {
    const [diary, setDiary] = useState<Record<string, DiaryEntry[]>>({});
    const [questions, setQuestions] = useState<Question[]>([]);
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const renderedDates = useMemo(() => {
        const allDates = DateUtility.getAllDatesFromStart(new Date('2025-11-09T00:00:00'));
        const lastDate = allDates.length > 0 ? allDates[allDates.length - 1] : new Date();
        const futureDatesList = [];
        for (let i = 1; i <= 14; i++) {
            const d = new Date(lastDate);
            d.setDate(d.getDate() + i);
            futureDatesList.push(d);
        }
        return [...allDates, ...futureDatesList];
    }, []);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const [questionsData, diaryData] = await Promise.all([
                getQuestions(),
                getDiary()
            ]);
            setQuestions(questionsData);
            setDiary(diaryData || {});
        } catch (error) {
            console.error('Failed to load diary data:', error);
        }
    }

    function handleAnswerChange(dateStr: string, questionId: string, answer: string) {
        const currentDayEntries = diary[dateStr] || [];
        const existingEntry = currentDayEntries.find(e => e.questionId === questionId);

        let updatedDayEntries;
        let entryId: string;

        if (existingEntry) {
            entryId = existingEntry.id;
            updatedDayEntries = currentDayEntries.map(e =>
                e.id === entryId ? { ...e, answer } : e
            );
        } else {
            entryId = generateId();
            const newEntry: DiaryEntry = {
                id: entryId,
                date: dateStr,
                questionId,
                answer,
                createdAt: new Date().toISOString()
            };
            updatedDayEntries = [...currentDayEntries, newEntry];
        }

        const previousDiary = diary;
        const updatedDiary = { ...diary, [dateStr]: updatedDayEntries };
        setDiary(updatedDiary);

        debouncedSaveEntry(entryId, existingEntry, dateStr, questionId, answer, previousDiary);
    }

    function debouncedSaveEntry(
        entryId: string,
        existingEntry: DiaryEntry | undefined,
        dateStr: string,
        questionId: string,
        answer: string,
        previousDiary: Record<string, DiaryEntry[]>
    ) {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(async () => {
            try {
                const entryToSave: DiaryEntry = {
                    id: entryId,
                    date: dateStr,
                    questionId,
                    answer,
                    createdAt: existingEntry ? existingEntry.createdAt : new Date().toISOString()
                };
                await saveDiaryEntry(entryToSave);
            } catch (err) {
                console.error('Failed to save diary entry:', err);
                setDiary(previousDiary);
            }
        }, 1000);
    }

    // Helper to check if a question is a time input type
    const isTimeQuestion = (questionId: string) =>
        questionId === TIME_QUESTION_IDS.WAKE || questionId === TIME_QUESTION_IDS.SLEEP;

    const renderDiaryColumn = ({ date, dateStr, isToday }: DayWeekColumnData) => {
        const dayEntries = diary[dateStr] || [];

        // Filter questions: Global (no date) OR Ad-hoc for this date
        const dayQuestions = questions.filter(q => !q.date || q.date === dateStr);

        // Separate time questions from regular questions
        const regularQuestions = dayQuestions.filter(q => !isTimeQuestion(q.id));

        // Separate answered vs unanswered
        const answeredQuestions = regularQuestions.filter(q => {
            const entry = dayEntries.find(e => e.questionId === q.id);
            return entry && entry.answer && entry.answer.trim().length > 0;
        });

        const unansweredQuestions = regularQuestions.filter(q => {
            const entry = dayEntries.find(e => e.questionId === q.id);
            return !entry || !entry.answer || entry.answer.trim().length === 0;
        });

        const getAnswerForQuestion = (questionId: string) => {
            const entry = dayEntries.find(e => e.questionId === questionId);
            return entry?.answer || '';
        };

        return (
            <>
                <div className={styles.columnHeader}>
                    <span className={`${styles.date} ${isToday ? styles.today : ''}`}>
                        {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <span className={styles.dayName}>
                        {date.toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                </div>

                <div className={styles.columnContent}>
                    {/* Center: Unanswered questions stack */}
                    {unansweredQuestions.length > 0 && (
                        <QuestionStack
                            questions={unansweredQuestions}
                            onAnswerSubmit={(questionId: string, answer: string) => handleAnswerChange(dateStr, questionId, answer)}
                            getAnswer={getAnswerForQuestion}
                        />
                    )}

                    {/* All done message */}
                    {unansweredQuestions.length === 0 && answeredQuestions.length > 0 && (
                        <div className={styles.allDoneMessage}>
                            <span className={styles.allDoneIcon}>✓</span>
                            <span>All questions answered</span>
                        </div>
                    )}

                    {/* Empty state */}
                    {regularQuestions.length === 0 && (
                        <div className={styles.emptyState}>No questions for today</div>
                    )}

                    {/* Bottom: Completed answers stack */}
                    {answeredQuestions.length > 0 && (
                        <CompletedStack
                            questions={answeredQuestions}
                            getAnswer={getAnswerForQuestion}
                        />
                    )}
                </div>
            </>
        );
    };

    return (
        <DayWeek
            dates={renderedDates}
            renderColumn={renderDiaryColumn}
            className={styles.scrollContainer}
            columnClassName={styles.column}
        />
    );
}
