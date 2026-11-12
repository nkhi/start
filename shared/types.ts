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
  /**
   * Habit entry state:
   *   0 = · Empty (not logged)
   *   1 = ✓ Done                (counts as success)
   *   2 = ✕ Failed              (counts as failure)
   *   3 = :) Done with exception (counts as success)
   *   4 = :| Partially done     (neutral)
   *   5 = ?: Forgot / Don't know (neutral)
   */
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

// ============================================
// Journal (Mull) Types
// ============================================

export type StateSource = 'manual' | 'post_session' | 'seed';
export type EdgeOrigin = 'user' | 'suggested';
export type EdgeStatus = 'accepted' | 'pending' | 'rejected';
export type EntryNodeRole = 'primary' | 'mentioned' | 'suggested';

export interface Node {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  archived: boolean;
  created_at: number;
  updated_at: number;
}

export interface NodeState {
  at: number;
  priority: number;
  intensity: number;
  openness: number;
  source: StateSource;
}

export interface NodeWithState {
  node: Node;
  state: NodeState;
  tags: string[];
}

export interface Edge {
  id: string;
  src: string;
  dst: string;
  relation: string;
  directed: boolean;
  weight: number;
  origin: EdgeOrigin;
  status: EdgeStatus;
  created_at: number;
}

export interface GraphSnapshot {
  nodes: NodeWithState[];
  edges: Edge[];
}

export interface Entry {
  id: string;
  doc_json: string;
  plain_text: string;
  started_at: number;
  updated_at: number;
  word_count: number;
  suggestion_id?: string | null;
  rev: number;
  primary_node_id?: string | null;
  mentioned_node_ids?: string[];
}

export interface EntrySummary {
  entry: Entry;
  primary_node: NodeWithState | null;
  mentioned_nodes: NodeWithState[];
}

export interface SeedNode {
  temp_id: string;
  kind: string;
  title: string;
  priority: number;
  intensity: number;
  openness: number;
  tags: string[];
}

export interface SeedEdge {
  src_title: string;
  dst_title: string;
  relation: string;
}

export interface ParsedSeedGraph {
  nodes: SeedNode[];
  edges: SeedEdge[];
}

export interface Breakdown {
  total: number;
  priority_term: number;
  intensity_term: number;
  openness_term: number;
  salience_term: number;
  recurrence_term: number;
  staleness_term: number;
  penalty_term: number;
  why_summary: string;
}

export interface SuggestionResponse {
  node: NodeWithState;
  breakdown: Breakdown;
  bucket: number;
}

// Request Types
export interface CreateJournalNodeRequest {
  kind?: string;
  title: string;
  body?: string;
  priority?: number;
  intensity?: number;
  openness?: number;
  tags?: string[];
}

export interface UpdateJournalNodeRequest {
  title?: string;
  body?: string | null;
  kind?: string;
  tags?: string[];
}

export interface SetJournalNodeStateRequest {
  priority: number;
  intensity: number;
  openness: number;
  source?: StateSource;
}

export interface CreateJournalEdgeRequest {
  src: string;
  dst: string;
  relation?: string;
  directed?: boolean;
  weight?: number;
}

export interface SaveJournalEntryRequest {
  id: string;
  doc_json: string;
  plain_text: string;
  suggestion_id?: string;
  word_count?: number;
  primary_node_id?: string;
  mentioned_node_ids?: string[];
}

export interface BatchJournalNodeInput {
  temp_id?: string;
  kind?: string;
  title: string;
  body?: string;
  priority?: number;
  intensity?: number;
  openness?: number;
  tags?: string[];
  original_title?: string;
}

export interface BatchJournalEdgeInput {
  src_title?: string;
  dst_title?: string;
  src_id?: string;
  dst_id?: string;
  relation?: string;
}

export interface BatchJournalCreateRequest {
  nodes?: BatchJournalNodeInput[];
  edges?: BatchJournalEdgeInput[];
  outline?: string;
}

export interface BatchJournalCreateResponse {
  ok: boolean;
  nodeCount: number;
  edgeCount: number;
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

// ============================================
// Habit Insights API Types
// ============================================

export interface HabitInsightStateCounts {
  s0: number; // not logged
  s1: number; // done
  s2: number; // failed
  s3: number; // done w/ exception
  s4: number; // partial
  s5: number; // forgot
}

export interface HabitInsightDowEntry {
  dow: number; // 0=Sun … 6=Sat
  s1: number;
  s2: number;
  s3: number;
  s4: number;
  s5: number;
  logged: number; // days with any non-0 state
}

export interface HabitInsightSummary {
  habitId: string;
  name: string;
  category: string; // Habit['defaultTime']
  essential: boolean;
  createdDate: string;
  /** Aggregated state counts for the requested range */
  cur: HabitInsightStateCounts;
  /** Aggregated state counts for the prior period of the same length */
  prior: HabitInsightStateCounts;
  /** Per-day-of-week breakdown (only days that have ≥1 entry are included) */
  dow: HabitInsightDowEntry[];
}

export interface HabitInsightsResponse {
  habits: HabitInsightSummary[];
  days: number;
  generatedAt: string;
}

export interface InsightTrendBucket {
  weekStart: string; // YYYY-MM-DD (Monday)
  habitId: string;
  s1: number;
  s2: number;
  s3: number;
  s4: number;
  s5: number;
  logged: number;
}

export interface InsightTrendResponse {
  buckets: InsightTrendBucket[];
  days: number;
}

export interface SpendingBudget {
  id: string;
  month: string;
  name: string;
  amount: number;
  createdAt: string | null;
}

export interface SpendingTransaction {
  id: string;
  date: string;
  name: string;
  note: string | null;
  amount: number;
  budgetId: string | null;
  createdAt: string | null;
}

export interface CreateSpendingTransactionRequest {
  id: string;
  date: string;
  name: string;
  note?: string;
  amount: number;
  budgetId?: string;
}

export interface UpdateSpendingTransactionRequest {
  date?: string;
  name?: string;
  note?: string;
  amount?: number;
  budgetId?: string;
}

export interface SpendingMonth {
  transactions: SpendingTransaction[];
  budgets: SpendingBudget[];
  monthTotal: number;
}

// ============================================
// Helper Functions
// ============================================

export function formatDate(date: Date | string): string {
  if (typeof date === 'string') return date;
  return date.toISOString().split('T')[0];
}
