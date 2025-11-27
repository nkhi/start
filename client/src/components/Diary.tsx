import { useEffect, useState, useRef } from 'react';
import { HabitAPI } from '../api';
import type { DiaryEntry, Question } from '../types';
import { generateId } from '../utils';
import { DayWeek, type DayWeekColumnData } from './DayWeek';

interface DiaryProps {
  apiBaseUrl: string;
}

export function Diary({ apiBaseUrl }: DiaryProps) {
  const [diary, setDiary] = useState<Record<string, DiaryEntry[]>>({});
  const [questions, setQuestions] = useState<Question[]>([]);
  const [newQuestionTexts, setNewQuestionTexts] = useState<Record<string, string>>({});
  const api = useRef(new HabitAPI(apiBaseUrl)).current;
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [questionsData, diaryData] = await Promise.all([
        api.getQuestions(),
        api.getDiary()
      ]);
      setQuestions(questionsData);
      setDiary(diaryData || {});
    } catch (error) {
      console.error('Failed to load diary data:', error);
    }
  }

  function handleAnswerChange(dateStr: string, questionId: string, answer: string) {
    const currentDayEntries = diary[dateStr] || [];
    const existingEntryIndex = currentDayEntries.findIndex(e => e.questionId === questionId);
    
    let updatedDayEntries;
    if (existingEntryIndex >= 0) {
      updatedDayEntries = [...currentDayEntries];
      updatedDayEntries[existingEntryIndex] = {
        ...updatedDayEntries[existingEntryIndex],
        answer
      };
    } else {
      const newEntry: DiaryEntry = {
        id: generateId(),
        date: dateStr,
        questionId,
        answer,
        createdAt: new Date().toISOString()
      };
      updatedDayEntries = [...currentDayEntries, newEntry];
    }

    const updatedDiary = { ...diary, [dateStr]: updatedDayEntries };
    setDiary(updatedDiary);
    debouncedSave(updatedDiary);
  }

  function debouncedSave(newDiary: Record<string, DiaryEntry[]>) {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      api.saveDiary(newDiary).catch(err => console.error('Failed to save diary:', err));
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
      await api.saveQuestion(newQuestion);
      setNewQuestionTexts({ ...newQuestionTexts, [dateStr]: '' });
      // Reload questions to see the new one
      const updatedQuestions = await api.getQuestions();
      setQuestions(updatedQuestions);
    } catch (error) {
      console.error('Failed to add question:', error);
    }
  }

  const renderDiaryColumn = ({ date, dateStr, isToday }: DayWeekColumnData) => {
    const dayEntries = diary[dateStr] || [];
    
    // Filter questions: Global (no date) OR Ad-hoc for this date
    const dayQuestions = questions.filter(q => !q.date || q.date === dateStr);
    
    return (
      <>
        <div className="diary-column-header">
          <span className={`diary-date ${isToday ? 'today' : ''}`}>
            {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
          <span className="diary-day-name">
            {date.toLocaleDateString('en-US', { weekday: 'short' })}
          </span>
        </div>
        
        <div className="diary-content">
          {dayQuestions.map(question => {
            const entry = dayEntries.find(e => e.questionId === question.id);
            const answer = entry ? entry.answer : '';
            
            return (
              <div key={question.id} className="diary-card">
                <div className="diary-question">{question.text}</div>
                <textarea
                  className="diary-answer-area"
                  placeholder="Write your answer here..."
                  value={answer}
                  onChange={(e) => handleAnswerChange(dateStr, question.id, e.target.value)}
                />
              </div>
            );
          })}
          
          {/* Ad-hoc question input */}
          <form onSubmit={(e) => addQuestion(e, dateStr)} className="todo-input-form-small" style={{ marginTop: 'auto' }}>
             <input
              type="text"
              value={newQuestionTexts[dateStr] || ''}
              onChange={(e) => setNewQuestionTexts({ ...newQuestionTexts, [dateStr]: e.target.value })}
              placeholder="Ask a question for today..."
              className="todo-input-small"
            />
          </form>
        </div>
      </>
    );
  };

  return (
    <DayWeek
      renderColumn={renderDiaryColumn}
      className="diary-scroll-container"
      columnClassName="diary-column"
    />
  );
}
