import { useEffect, useState, useRef } from 'react';
import { Square, CheckSquare } from '@phosphor-icons/react';
import { getQuestions, getDiary, saveDiaryEntry, saveQuestion } from '../../api/diary';
import type { DiaryEntry, Question } from '../../types';
import { generateId } from '../../utils';
import { DayWeek, type DayWeekColumnData } from '../shared/DayWeek';
import { QuestionView } from './QuestionView';
import { TimeInputCard } from './TimeInputCard';
import styles from './Diary.module.css';

// Question IDs for special time input cards
const TIME_QUESTION_IDS = {
  WAKE: 'q13',
  SLEEP: 'q14'
};

export function Diary() {
  const [viewMode, setViewMode] = useState<'day' | 'question'>('day');
  const [diary, setDiary] = useState<Record<string, DiaryEntry[]>>({});
  const [questions, setQuestions] = useState<Question[]>([]);
  const [newQuestionTexts, setNewQuestionTexts] = useState<Record<string, string>>({});

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      // Update existing entry
      entryId = existingEntry.id;
      updatedDayEntries = currentDayEntries.map(e =>
        e.id === entryId ? { ...e, answer } : e
      );
    } else {
      // Create new entry
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

    // Store previous state for error rollback
    const previousDiary = diary;

    // Optimistic update
    const updatedDiary = { ...diary, [dateStr]: updatedDayEntries };
    setDiary(updatedDiary);

    // Debounced save of individual entry
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
        // Always use saveDiaryEntry (upsert) to handle race conditions and ensure
        // we don't try to patch a non-existent entry.
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
        // Revert optimistic update on error
        setDiary(previousDiary);
      }
    }, 1000);
  }

  async function addQuestion(e: React.FormEvent, dateStr: string) {
    e.preventDefault();
    const text = newQuestionTexts[dateStr];
    if (!text?.trim()) return;

    const newQuestion: Question = {
      id: `ad-hoc-q-${Date.now()}`,
      text: text,
      order: 999, // Put at the end
      active: true,
      date: dateStr
    };

    try {
      await saveQuestion(newQuestion);
      setNewQuestionTexts({ ...newQuestionTexts, [dateStr]: '' });
      // Reload questions to see the new one
      const updatedQuestions = await getQuestions();
      setQuestions(updatedQuestions);
    } catch (error) {
      console.error('Failed to add question:', error);
    }
  }

  // Helper to check if a question is a time input type
  const isTimeQuestion = (questionId: string) =>
    questionId === TIME_QUESTION_IDS.WAKE || questionId === TIME_QUESTION_IDS.SLEEP;



  const renderDiaryColumn = ({ date, dateStr, isToday }: DayWeekColumnData) => {
    const dayEntries = diary[dateStr] || [];

    // Filter questions: Global (no date) OR Ad-hoc for this date
    const dayQuestions = questions.filter(q => !q.date || q.date === dateStr);

    // Separate time questions from regular questions
    const wakeQuestion = dayQuestions.find(q => q.id === TIME_QUESTION_IDS.WAKE);
    const sleepQuestion = dayQuestions.find(q => q.id === TIME_QUESTION_IDS.SLEEP);
    const regularQuestions = dayQuestions.filter(q => !isTimeQuestion(q.id));

    // Get entries for time questions
    const wakeEntry = dayEntries.find(e => e.questionId === TIME_QUESTION_IDS.WAKE);
    const sleepEntry = dayEntries.find(e => e.questionId === TIME_QUESTION_IDS.SLEEP);


    return (
      <>
        <div className={styles.diaryColumnHeader}>
          <span className={`${styles.diaryDate} ${isToday ? 'today' : ''}`}>
            {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
          <span className={styles.diaryDayName}>
            {date.toLocaleDateString('en-US', { weekday: 'short' })}
          </span>
        </div>

        <div className={styles.diaryContent}>
          {/* Time Input Cards Row - Wake & Sleep */}
          {(wakeQuestion || sleepQuestion) && (
            <div className={styles.timeInputRow}>
              {wakeQuestion && (
                <TimeInputCard
                  questionText={wakeQuestion.text}
                  value={wakeEntry?.answer || ''}
                  onChange={(isoDateTime) => handleAnswerChange(dateStr, TIME_QUESTION_IDS.WAKE, isoDateTime)}
                  type="wake"
                />
              )}
              {sleepQuestion && (
                <TimeInputCard
                  questionText={sleepQuestion.text}
                  value={sleepEntry?.answer || ''}
                  onChange={(isoDateTime) => handleAnswerChange(dateStr, TIME_QUESTION_IDS.SLEEP, isoDateTime)}
                  type="sleep"
                />
              )}
            </div>
          )}

          {/* Regular Questions */}
          {regularQuestions.map(question => {
            const entry = dayEntries.find(e => e.questionId === question.id);
            const answer = entry ? entry.answer : '';

            return (
              <div key={question.id} className={styles.diaryCard}>
                <div className={styles.diaryQuestion}>
                  {answer ? (
                    <CheckSquare size={20} weight="duotone" color="#158e66ff" />
                    // <CheckSquare size={20} weight="fill" color="#158e66ff" />
                  ) : (
                    <Square size={20} color="rgba(255, 255, 255, 0.4)" />
                  )}
                  {question.text}
                </div>
                <textarea
                  // oninput='this.style.height = "";this.style.height = this.scrollHeight + "px"'
                  className={styles.diaryAnswerArea}
                  placeholder="Write your answer here..."
                  value={answer || ''}
                  onChange={(e) => handleAnswerChange(dateStr, question.id, e.target.value)}
                />
              </div>
            );
          })}

          {/* Ad-hoc question input */}
          <form onSubmit={(e) => addQuestion(e, dateStr)} className={styles.diaryInputFormSmall} style={{ marginTop: 'auto' }}>
            <input
              type="text"
              value={newQuestionTexts[dateStr] || ''}
              onChange={(e) => setNewQuestionTexts({ ...newQuestionTexts, [dateStr]: e.target.value })}
              placeholder="Ask a question for today..."
              className={styles.diaryInputSmall}
            />
          </form>
        </div>
      </>
    );
  };


  if (viewMode === 'question') {
    return <QuestionView onBack={() => setViewMode('day')} />;
  }

  return (
    <DayWeek
      renderColumn={renderDiaryColumn}
      className={styles.diaryScrollContainer}
      columnClassName={styles.diaryColumn}
      onMoreClick={() => setViewMode('question')}
    />
  );
}
