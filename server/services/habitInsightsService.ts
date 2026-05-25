/**
 * Habit Insights Service
 *
 * Runs two SQL aggregation queries to power the insights dashboard:
 *   1. getInsightsSummary — per-habit state counts for current + prior period,
 *      plus day-of-week breakdown. No raw entry rows sent to client.
 *   2. getInsightsTrend — weekly bucketed state counts per habit for sparklines.
 */

import * as db from '../db.ts';
import type {
  HabitInsightSummary,
  HabitInsightsResponse,
  InsightTrendBucket,
  InsightTrendResponse,
} from '../../shared/types.ts';

// ─── helpers ─────────────────────────────────────────────────────────────────

function toNum(v: unknown): number {
  return Number(v) || 0;
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function daysAgoStr(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

// ─── Summary ─────────────────────────────────────────────────────────────────

interface DbSummaryRow {
  habit_id: string;
  name: string;
  default_time: string;
  essential: boolean;
  created_date: string;
  cur_s0: string; cur_s1: string; cur_s2: string;
  cur_s3: string; cur_s4: string; cur_s5: string;
  prior_s0: string; prior_s1: string; prior_s2: string;
  prior_s3: string; prior_s4: string; prior_s5: string;
}

interface DbDowRow {
  habit_id: string;
  dow: string;
  s1: string; s2: string; s3: string; s4: string; s5: string;
  logged: string;
}

export async function getInsightsSummary(days: number): Promise<HabitInsightsResponse> {
  const today = todayStr();
  const curStart = daysAgoStr(days);
  const priorStart = daysAgoStr(days * 2);

  // ── Query 1: state counts per habit (current + prior period) ──────────────
  const summaryResult = await db.query<DbSummaryRow>(`
    SELECT
      h.id              AS habit_id,
      h.name,
      COALESCE(h.default_time, 'neither') AS default_time,
      COALESCE(h.essential, false)        AS essential,
      TO_CHAR(h.created_date, 'YYYY-MM-DD') AS created_date,

      COUNT(*) FILTER (WHERE e.date >= $2 AND e.state = 0) AS cur_s0,
      COUNT(*) FILTER (WHERE e.date >= $2 AND e.state = 1) AS cur_s1,
      COUNT(*) FILTER (WHERE e.date >= $2 AND e.state = 2) AS cur_s2,
      COUNT(*) FILTER (WHERE e.date >= $2 AND e.state = 3) AS cur_s3,
      COUNT(*) FILTER (WHERE e.date >= $2 AND e.state = 4) AS cur_s4,
      COUNT(*) FILTER (WHERE e.date >= $2 AND e.state = 5) AS cur_s5,

      COUNT(*) FILTER (WHERE e.date <  $2 AND e.state = 0) AS prior_s0,
      COUNT(*) FILTER (WHERE e.date <  $2 AND e.state = 1) AS prior_s1,
      COUNT(*) FILTER (WHERE e.date <  $2 AND e.state = 2) AS prior_s2,
      COUNT(*) FILTER (WHERE e.date <  $2 AND e.state = 3) AS prior_s3,
      COUNT(*) FILTER (WHERE e.date <  $2 AND e.state = 4) AS prior_s4,
      COUNT(*) FILTER (WHERE e.date <  $2 AND e.state = 5) AS prior_s5

    FROM habits h
    LEFT JOIN entries e
      ON  e.habit_id = h.id
      AND e.date >= $3
      AND e.date <= $1

    WHERE h.active = true
    GROUP BY h.id, h.name, h.default_time, h.essential, h.created_date
    ORDER BY h.order ASC, h.id ASC
  `, [today, curStart, priorStart]);

  // ── Query 2: day-of-week breakdown (current period only) ─────────────────
  const dowResult = await db.query<DbDowRow>(`
    SELECT
      e.habit_id,
      EXTRACT(DOW FROM e.date::date)::int AS dow,
      COUNT(*) FILTER (WHERE e.state = 1) AS s1,
      COUNT(*) FILTER (WHERE e.state = 2) AS s2,
      COUNT(*) FILTER (WHERE e.state = 3) AS s3,
      COUNT(*) FILTER (WHERE e.state = 4) AS s4,
      COUNT(*) FILTER (WHERE e.state = 5) AS s5,
      COUNT(*) FILTER (WHERE e.state IN (1,2,3,4,5)) AS logged
    FROM entries e
    WHERE e.date >= $1 AND e.date <= $2
      AND e.habit_id IN (SELECT id FROM habits WHERE active = true)
    GROUP BY e.habit_id, dow
    ORDER BY e.habit_id, dow
  `, [curStart, today]);

  // ── Group DOW rows by habit ───────────────────────────────────────────────
  const dowByHabit = new Map<string, DbDowRow[]>();
  for (const row of dowResult.rows) {
    const arr = dowByHabit.get(row.habit_id) ?? [];
    arr.push(row);
    dowByHabit.set(row.habit_id, arr);
  }

  // ── Assemble response ─────────────────────────────────────────────────────
  const habits: HabitInsightSummary[] = summaryResult.rows.map(r => ({
    habitId: r.habit_id,
    name: r.name,
    category: r.default_time,
    essential: Boolean(r.essential),
    createdDate: r.created_date ?? '',
    cur: {
      s0: toNum(r.cur_s0), s1: toNum(r.cur_s1), s2: toNum(r.cur_s2),
      s3: toNum(r.cur_s3), s4: toNum(r.cur_s4), s5: toNum(r.cur_s5),
    },
    prior: {
      s0: toNum(r.prior_s0), s1: toNum(r.prior_s1), s2: toNum(r.prior_s2),
      s3: toNum(r.prior_s3), s4: toNum(r.prior_s4), s5: toNum(r.prior_s5),
    },
    dow: (dowByHabit.get(r.habit_id) ?? []).map(d => ({
      dow: toNum(d.dow),
      s1: toNum(d.s1), s2: toNum(d.s2), s3: toNum(d.s3),
      s4: toNum(d.s4), s5: toNum(d.s5), logged: toNum(d.logged),
    })),
  }));

  return { habits, days, generatedAt: new Date().toISOString() };
}

// ─── Trend ────────────────────────────────────────────────────────────────────

interface DbTrendRow {
  week_start: string;
  habit_id: string;
  s1: string; s2: string; s3: string; s4: string; s5: string;
  logged: string;
}

export async function getInsightsTrend(days: number): Promise<InsightTrendResponse> {
  const today = todayStr();
  const from = daysAgoStr(days);

  const result = await db.query<DbTrendRow>(`
    SELECT
      DATE_TRUNC('week', e.date::date)::date AS week_start,
      e.habit_id,
      COUNT(*) FILTER (WHERE e.state = 1) AS s1,
      COUNT(*) FILTER (WHERE e.state = 2) AS s2,
      COUNT(*) FILTER (WHERE e.state = 3) AS s3,
      COUNT(*) FILTER (WHERE e.state = 4) AS s4,
      COUNT(*) FILTER (WHERE e.state = 5) AS s5,
      COUNT(*) FILTER (WHERE e.state IN (1,2,3,4,5)) AS logged
    FROM entries e
    WHERE e.date >= $1 AND e.date <= $2
      AND e.habit_id IN (SELECT id FROM habits WHERE active = true)
    GROUP BY week_start, e.habit_id
    ORDER BY week_start ASC, e.habit_id
  `, [from, today]);

  const buckets: InsightTrendBucket[] = result.rows.map(r => ({
    weekStart: typeof r.week_start === 'string'
      ? r.week_start.split('T')[0]
      : (r.week_start as unknown as Date).toISOString().split('T')[0],
    habitId: r.habit_id,
    s1: toNum(r.s1), s2: toNum(r.s2), s3: toNum(r.s3),
    s4: toNum(r.s4), s5: toNum(r.s5), logged: toNum(r.logged),
  }));

  return { buckets, days };
}
