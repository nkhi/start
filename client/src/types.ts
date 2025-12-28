// Re-export shared types (used by both client and server)
export type {
  Habit,
  HabitEntry,
  Vlog,
  Task,
  Question,
  DiaryEntry,
  Note,
  ListItem,
  List,
  CalendarEvent,
  TasksByDate,
  GroupedTasks,
  TaskCounts,
  DiaryByDate,
  VlogsByWeek,
} from '../../shared/types';

// Client-only types
export interface WeeklyStats {
  percentage: number;
  grade: {
    letter: string;
    class: string;
  };
}

export interface DiaryByQuestion {
  question: Question;
  entries: DiaryEntry[];
}

// Re-import Question and DiaryEntry for the interface above
import type { Question, DiaryEntry } from '../../shared/types';
