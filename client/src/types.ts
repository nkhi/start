export interface Habit {
  id: string;
  name: string;
  order: number;
  defaultTime: 'morning' | 'night' | 'neither' | 'health' | 'exercise' | 'weekdays';
  active: boolean;
  createdDate: string;
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
