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
  StateSource,
  EdgeOrigin,
  EdgeStatus,
  EntryNodeRole,
  Node,
  NodeState,
  NodeWithState,
  Edge,
  GraphSnapshot,
  Entry,
  EntrySummary,
  SeedNode,
  SeedEdge,
  ParsedSeedGraph,
  Breakdown,
  SuggestionResponse,
  CreateJournalNodeRequest,
  UpdateJournalNodeRequest,
  SetJournalNodeStateRequest,
  CreateJournalEdgeRequest,
  SaveJournalEntryRequest,
  BatchJournalNodeInput,
  BatchJournalEdgeInput,
  BatchJournalCreateRequest,
  BatchJournalCreateResponse,
} from '../../shared/types';


// Client-only types
export interface WeeklyStats {
  percentage: number;
  grade: {
    letter: string;
    class: string;
  };
}
