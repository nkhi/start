// Re-export shared types (used by both client and server)
export type {
  Habit,
  HabitEntry,
  Vlog,
  Task,
  Note,
  ListItem,
  List,
  LandmarkItem,
  LandmarksByCategory,
  CalendarEvent,
  Memory,
  CreateMemoryRequest,
  TasksByDate,
  GroupedTasks,
  TaskCounts,
  VlogsByWeek,
  HabitInsightStateCounts,
  HabitInsightDowEntry,
  HabitInsightSummary,
  HabitInsightsResponse,
  InsightTrendBucket,
  InsightTrendResponse,
} from '../../shared/types';


// Client-only types
export interface WeeklyStats {
  percentage: number;
  grade: {
    letter: string;
    class: string;
  };
}
