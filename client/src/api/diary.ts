import type { Question, DiaryEntry, DiaryByQuestion } from '../types';
import { fetchWithErrorReporting } from './errorReporter';
import { API_BASE_URL } from '../config';

export async function getQuestions(): Promise<Question[]> {
  const response = await fetchWithErrorReporting(`${API_BASE_URL}/questions`);
  if (!response.ok) throw new Error('Failed to fetch questions');
  return response.json();
}

export async function saveQuestion(question: Question): Promise<void> {
  const response = await fetchWithErrorReporting(`${API_BASE_URL}/questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(question)
  });
  if (!response.ok) throw new Error('Failed to save question');
}

export async function getDiary(): Promise<Record<string, DiaryEntry[]>> {
  const response = await fetchWithErrorReporting(`${API_BASE_URL}/diary`);
  if (!response.ok) throw new Error('Failed to fetch diary');
  return response.json();
}

export async function createDiaryEntry(entry: DiaryEntry): Promise<void> {
  const response = await fetchWithErrorReporting(`${API_BASE_URL}/diary-entries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry)
  });
  if (!response.ok) throw new Error('Failed to create diary entry');
}

export async function saveDiaryEntry(entry: DiaryEntry): Promise<void> {
  const response = await fetchWithErrorReporting(`${API_BASE_URL}/diary-entries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry)
  });
  if (!response.ok) throw new Error('Failed to save diary entry');
}

export async function updateDiaryEntry(id: string, updates: Partial<DiaryEntry>): Promise<DiaryEntry> {
  const response = await fetchWithErrorReporting(`${API_BASE_URL}/diary-entries/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  if (!response.ok) throw new Error('Failed to update diary entry');
  return response.json();
}

export async function deleteDiaryEntry(id: string): Promise<void> {
  const response = await fetchWithErrorReporting(`${API_BASE_URL}/diary-entries/${id}`, {
    method: 'DELETE'
  });
  if (!response.ok) throw new Error('Failed to delete diary entry');
}

export async function getDiaryByQuestion(): Promise<DiaryByQuestion[]> {
  const [questions, diary] = await Promise.all([
    getQuestions(),
    getDiary()
  ]);

  const allEntries = Object.values(diary).flat();

  return questions.map(question => ({
    question,
    entries: allEntries
      .filter(e => e.questionId === question.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }));
}
