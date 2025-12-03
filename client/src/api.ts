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

  async createTask(task: import('./types').Task): Promise<void> {
    const response = await fetch(`${this.baseUrl}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task)
    });
    if (!response.ok) throw new Error('Failed to create task');
  }

  async updateTask(id: string, updates: Partial<import('./types').Task>): Promise<import('./types').Task> {
    const response = await fetch(`${this.baseUrl}/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!response.ok) throw new Error('Failed to update task');
    return response.json();
  }

  async deleteTask(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/tasks/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete task');
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

  async createDiaryEntry(entry: import('./types').DiaryEntry): Promise<void> {
    const response = await fetch(`${this.baseUrl}/diary-entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry)
    });
    if (!response.ok) throw new Error('Failed to create diary entry');
  }

  async saveDiaryEntry(entry: import('./types').DiaryEntry): Promise<void> {
    const response = await fetch(`${this.baseUrl}/diary-entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry)
    });
    if (!response.ok) throw new Error('Failed to save diary entry');
  }

  async updateDiaryEntry(id: string, updates: Partial<import('./types').DiaryEntry>): Promise<import('./types').DiaryEntry> {
    const response = await fetch(`${this.baseUrl}/diary-entries/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!response.ok) throw new Error('Failed to update diary entry');
    return response.json();
  }

  async deleteDiaryEntry(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/diary-entries/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete diary entry');
  }
}
