/**
 * Database row types for the Start app.
 * These match the PostgreSQL schema (snake_case).
 * For API types, use shared/types.ts
 */

export interface DbVlog {
  week_start_date: Date;
  video_url: string;
  embed_html: string;
}

export interface DbHabit {
  id: string;
  name: string;
  order: number | null;
  default_time: string | null;
  active: boolean | null;
  created_date: Date | null;
  comment: string | null;
  deadline_time: string | null;
  essential: boolean | null;
}

export interface DbEntry {
  entry_id: string;
  date: Date;
  habit_id: string;
  state: number | null;
  timestamp: Date | null;
  comment: string | null;
}

export interface DbQuestion {
  id: string;
  text: string;
  order: number | null;
  active: boolean | null;
  date: string | null;
}

export interface DbTask {
  id: string;
  text: string;
  completed: boolean | null;
  date: Date | null;
  created_at: Date | null;
  category: string | null;
  state: string | null;
  order: string | null;
}

export interface DbNextItem {
  id: string;
  title: string;
  content: string | null;
  color: string | null;
  size: string | null;
  created_at: Date | null;
  deleted_at: Date | null;
  started_at: Date | null;
}

export interface DbList {
  id: string;
  title: string;
  color: string | null;
  created_at: Date | null;
  order: string | null;
}

export interface DbListItem {
  id: string;
  list_id: string;
  text: string;
  completed: boolean | null;
  created_at: Date | null;
  position: number | null;
}


export interface DbDiaryEntry {
  id: string;
  date: Date;
  question_id: string;
  answer: string | null;
  created_at: Date | null;
}

export interface DbCalendarEvent {
  id: string;
  summary: string | null;
  description: string | null;
  start_time: Date | null;
  end_time: Date | null;
  all_day: boolean | null;
  status: string | null;
  html_link: string | null;
  created_at: Date | null;
  updated_at: Date | null;
}

export interface DbMemory {
  id: string;
  text: string;
  date: Date;
  created_at: Date | null;
}

export interface DbLandmark {
  id: string;
  category: string;
  text: string;
  date: Date | null;
  position: number | null;
  created_at: Date | null;
}

export interface DbSpendingBudget {
  id: string;
  month: string;
  name: string;
  amount: string;
  created_at: Date | null;
}

export interface DbSpendingTransaction {
  id: string;
  date: Date;
  name: string;
  note: string | null;
  amount: string;
  budget_id: string | null;
  created_at: Date | null;
}

export interface DbJournalNode {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  pos_x: number | null;
  pos_y: number | null;
  priority: number;
  intensity: number;
  openness: number;
  tags: string[];
  score_history: Array<{
    at: string;
    priority: number;
    intensity: number;
    openness: number;
    source: string;
  }>;
  archived: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface DbJournalEdge {
  id: string;
  src: string;
  dst: string;
  relation: string;
  directed: boolean;
  weight: number;
  origin: string;
  status: string;
  created_at: Date;
}

export interface DbJournalEntry {
  id: string;
  primary_node_id: string | null;
  mentioned_node_ids: string[];
  doc_json: string;
  plain_text: string;
  word_count: number;
  suggestion_id: string | null;
  rev: number;
  started_at: Date;
  updated_at: Date;
}
