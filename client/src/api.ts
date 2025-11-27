import type { Habit, HabitEntry, Vlog } from './types';

export class HabitAPI {
  private baseUrl: string;
  
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async getHabits(): Promise<Habit[]> {
    const response = await fetch(`${this.baseUrl}/habits`);
    if (!response.ok) throw new Error('Failed to fetch habits');
    return response.json();
  }

  async getEntries(from: string, to: string): Promise<HabitEntry[]> {
    const response = await fetch(`${this.baseUrl}/habit-entries?from=${from}&to=${to}`);
    if (!response.ok) throw new Error('Failed to fetch entries');
    return response.json();
  }

  async saveEntry(entry: Partial<HabitEntry>): Promise<void> {
    const response = await fetch(`${this.baseUrl}/habit-entry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry)
    });
    if (!response.ok) throw new Error('Failed to save entry');
  }

  async getVlog(weekStartDate: string): Promise<Vlog | null> {
    const response = await fetch(`${this.baseUrl}/vlogs/${weekStartDate}`);
    if (!response.ok) throw new Error('Failed to fetch vlog');
    return response.json();
  }

  async saveVlog(vlog: Vlog): Promise<void> {
    const response = await fetch(`${this.baseUrl}/vlogs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(vlog)
    });
    if (!response.ok) throw new Error('Failed to save vlog');
  }

  async getTasks(): Promise<Record<string, import('./types').Task[]>> {
    const response = await fetch(`${this.baseUrl}/tasks`);
    if (!response.ok) throw new Error('Failed to fetch tasks');
    return response.json();
  }

  async saveTasks(tasks: Record<string, import('./types').Task[]>): Promise<void> {
    const response = await fetch(`${this.baseUrl}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tasks)
    });
    if (!response.ok) throw new Error('Failed to save tasks');
  }

  async getQuestions(): Promise<import('./types').Question[]> {
    const response = await fetch(`${this.baseUrl}/questions`);
    if (!response.ok) throw new Error('Failed to fetch questions');
    return response.json();
  }

  async saveQuestion(question: import('./types').Question): Promise<void> {
    const response = await fetch(`${this.baseUrl}/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(question)
    });
    if (!response.ok) throw new Error('Failed to save question');
  }

  async getDiary(): Promise<Record<string, import('./types').DiaryEntry[]>> {
    const response = await fetch(`${this.baseUrl}/diary`);
    if (!response.ok) throw new Error('Failed to fetch diary');
    return response.json();
  }

  async saveDiary(diary: Record<string, import('./types').DiaryEntry[]>): Promise<void> {
    const response = await fetch(`${this.baseUrl}/diary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(diary)
    });
    if (!response.ok) throw new Error('Failed to save diary');
  }
}
