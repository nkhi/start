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
  defaultTime: 'morning' | 'night' | 'neither' | 'health' | 'exercise' | 'weekdays' | 'quitting' | 'growth' | 'routine' | 'ktlo';
  active: boolean;
  createdDate: string;
  comment?: string | null;
  deadlineTime?: string | null;
  essential?: boolean | null;
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

export interface LandmarkItem {
  id: string;
  category: string;
  text: string;
  date?: string | null;  // ISO date string, optional
  position?: number | null;  // Only used for 'orient' category
  createdAt: string | null;
}

export interface LandmarksByCategory {
  orient: LandmarkItem[];
  forward: LandmarkItem[];
  big_things: LandmarkItem[];
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

export interface Memory {
  id: string;
  text: string;
  date: string;
  createdAt: string | null;
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

export interface CreateLandmarkRequest {
  id: string;
  category: string;
  text: string;
  date?: string;  // Optional ISO date string
}

export interface UpdateLandmarkRequest {
  text?: string;
  date?: string | null;
}

export interface ReorderLandmarksRequest {
  category: string;
  itemOrder: string[];  // Array of IDs in new order
}

export interface CreateMemoryRequest {
  id: string;
  text: string;
  date: string;
  createdAt?: string;
}

export interface SpendingTransaction {
  id: string;
  date: string;
  name: string;
  note: string | null;
  amount: number;
  createdAt: string | null;
}

export interface CreateSpendingTransactionRequest {
  id: string;
  date: string;
  name: string;
  note?: string;
  amount: number;
}

export interface UpdateSpendingTransactionRequest {
  date?: string;
  name?: string;
  note?: string;
  amount?: number;
}

export interface SpendingMonth {
  transactions: SpendingTransaction[];
  monthTotal: number;
}

// ============================================
// Helper Functions
// ============================================

export function formatDate(date: Date | string): string {
  if (typeof date === 'string') return date;
  return date.toISOString().split('T')[0];
}
