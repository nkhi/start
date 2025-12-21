/**
 * Database Row Types - Server only
 * 
 * These match the CockroachDB schema (snake_case).
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
