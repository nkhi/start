/**
 * Shared Types - Single source of truth for client and server
 * 
 * These are the API contract types - what gets sent over the wire.
 * DB row types (snake_case) live in server/db-types.ts
 */

// ============================================
// Core Domain Types
// ============================================

export interface Habit {
  id: string;
  name: string;
  order: number;
  defaultTime: 'morning' | 'night' | 'neither' | 'health' | 'exercise' | 'weekdays' | 'quitting' | 'growth' | 'routine';
  active: boolean;
  createdDate: string;
  comment?: string | null;
  deadlineTime?: string | null;
}

export interface HabitEntry {
  entryId: string;
  date: string;
  habitId: string;
  state: number;
  time?: string;
  timestamp: string;
  comment?: string | null;
}

export interface Vlog {
  weekStartDate: string;
  videoUrl: string;
  embedHtml: string;
}

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  date: string | null; // null = graveyarded (not on any day)
  createdAt: string;
  category: string; // 'life' | 'work' - relaxed for server compatibility
  state: string;    // 'active' | 'completed' | 'failed' - relaxed for server
  order?: string | null;
  puntDays?: number; // Days between activeDate and createdAt (calculated server-side)
}

export interface Question {
  id: string;
  text: string;
  order: number;
  active: boolean;
  date?: string;
}

export interface DiaryEntry {
  id: string;
  date: string;
  questionId: string;
  answer: string | null;
  createdAt: string | null;
}

// Note = NextItem in the server
export interface Note {
  id: string;
  title: string;
  content: string | null;
  color: string | null;
  size: string | null; // 'small' | 'medium' | 'large' | 'wide' | 'tall'
  createdAt: string | null;
  deletedAt: string | null;
  startedAt: string | null;
}

export interface ListItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string | null;
  listId?: string;
  position?: number;
}

export interface List {
  id: string;
  title: string;
  createdAt: string | null;
  items: ListItem[];
  color?: string | null;
  order?: string | null;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  description: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  status: string;
  html_link: string;
}

// ============================================
// Aggregate/Collection Types
// ============================================

export interface TasksByDate {
  [date: string]: Task[];
}

export interface GroupedTasks {
  [date: string]: {
    active: Task[];
    completed: Task[];
    failed: Task[];
  };
}

export interface TaskCounts {
  [date: string]: {
    active: number;
    completed: number;
    failed: number;
  };
}

export interface DiaryByDate {
  [date: string]: DiaryEntry[];
}

export interface VlogsByWeek {
  [weekStartDate: string]: Vlog;
}

// ============================================
// API Request Types
// ============================================

export interface CreateTaskRequest {
  id: string;
  text?: string;
  completed?: boolean;
  date: string | null; // null = create directly in graveyard
  createdAt?: string;
  category?: string;
  state?: string;
  order?: string;
}

export interface UpdateTaskRequest {
  text?: string;
  completed?: boolean;
  date?: string;
  category?: string;
  state?: string;
  order?: string;
}

export interface ReorderRequest {
  order: string;
  date?: string;
  category?: string;
  state?: string;
}

export interface BatchPuntRequest {
  taskIds: string[];
  sourceDate: string;
  targetDate: string;
}

export interface BatchFailRequest {
  taskIds: string[];
}

export interface BatchReorderRequest {
  moves: Array<{
    id: string;
    order: string;
    date?: string;
    category?: string;
    state?: string;
  }>;
}

export interface BatchVlogsRequest {
  weekStartDates: string[];
}

export interface CreateHabitEntryRequest {
  entryId: string;
  date: string;
  habitId: string;
  state?: number;
  timestamp?: string;
}

export interface CreateVlogRequest {
  weekStartDate: string;
  videoUrl: string;
  embedHtml: string;
}

export interface CreateQuestionRequest {
  id: string;
  text: string;
  order?: number;
  active?: boolean;
  date?: string;
}

export interface CreateDiaryEntryRequest {
  id: string;
  date: string;
  questionId: string;
  answer?: string;
  createdAt?: string;
}

export interface UpdateDiaryEntryRequest {
  answer?: string;
  date?: string;
  questionId?: string;
}

export interface CreateNoteRequest {
  id: string;
  title: string;
  content?: string;
  color?: string;
  size?: string;
}

export interface UpdateNoteRequest {
  title?: string;
  content?: string;
  color?: string;
  size?: string;
  deletedAt?: string;
  startedAt?: string;
}

export interface CreateListRequest {
  id: string;
  title: string;
  color?: string;
  order?: string;
}

export interface UpdateListRequest {
  title?: string;
  color?: string;
  order?: string;
  items?: ListItem[];
}

// ============================================
// Helper Functions
// ============================================

export function formatDate(date: Date | string): string {
  if (typeof date === 'string') return date;
  return date.toISOString().split('T')[0];
}
