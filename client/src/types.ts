export interface Habit {
  id: string;
  name: string;
  order: number;
  defaultTime: 'morning' | 'night' | 'neither' | 'health' | 'exercise' | 'weekdays' | 'quitting' | 'growth'; // weekdays not used in app rn
  active: boolean;
  createdDate: string;
  comment?: string | null;
}

export interface HabitEntry {
  entryId: string;
  date: string;
  habitId: string;
  state: number;
  time?: string;
  timestamp: string;
}

export interface Vlog {
  weekStartDate: string;
  videoUrl: string;
  embedHtml: string;
}

export interface WeeklyStats {
  percentage: number;
  grade: {
    letter: string;
    class: string;
  };
}

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  date: string;
  createdAt: string;
  category?: 'life' | 'work';
  state?: 'active' | 'completed' | 'failed';
  order?: string; // Fractional index for drag-to-reorder
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
  answer: string;
  createdAt: string;
}

export interface DiaryByQuestion {
  question: Question;
  entries: DiaryEntry[];
}

export interface Note {
  id: string;
  title: string;
  content: string;
  color: string;
  size: 'small' | 'medium' | 'large' | 'wide' | 'tall';
  createdAt: string;
  deletedAt: string | null;
  startedAt: string | null;
}

export interface ListItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
}

export interface List {
  id: string;
  title: string;
  createdAt: string;
  items: ListItem[];
  color?: string;
}
