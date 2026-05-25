/**
 * useInsightsData
 *
 * Fetches pre-aggregated data from the two insights endpoints and derives
 * all per-habit and per-category metrics needed by the dashboard sub-components.
 * Heavy computation stays in Postgres; this hook does lightweight arithmetic only.
 */

import { useMemo } from 'react';
import { useInsightsSummary, useInsightsTrend } from '../../../../api/habits';
import type { HabitInsightSummary, InsightTrendBucket } from '../../../../types';
import { HABIT_TIME_CONFIG, type HabitDefaultTime } from '../constants';

// ─── State weights ─────────────────────────────────────────────────────────────
const STATE_WEIGHT: Record<number, number> = { 1: 1.0, 3: 0.75, 4: 0.25, 2: 0.0, 5: 0.0 };

export type InsightTag =
  | 'on_fire' | 'solid' | 'exception_creep'
  | 'slipping' | 'struggling' | 'dormant'
  | 'essential_at_risk' | 'new_habit';

export interface HabitMetrics {
  habitId: string;
  name: string;
  category: HabitDefaultTime;
  isEssential: boolean;
  isNewHabit: boolean;
  // Rates (0–1)
  weightedConsistency: number;
  priorWeightedConsistency: number;
  cleanRate: number;        // state-1 only / logged
  exceptionRatio: number;   // state-3 / (state-1 + state-3)
  trendDelta: number;       // cur - prior (–1 to +1)
  // State distribution (proportions, sum ≈ 1 if logged > 0)
  stateProps: { s1: number; s3: number; s4: number; s2: number; s0: number };
  // Day of week: weighted rate per day (undefined = no data)
  dowRates: (number | null)[];  // index 0=Sun..6=Sat
  insightTag: InsightTag;
}

export interface CategoryMetrics {
  category: HabitDefaultTime;
  label: string;
  color: string;
  score: number;           // avg weighted consistency across habits
  priorScore: number;
  delta: number;
  habitCount: number;
  essentialCount: number;
  habits: HabitMetrics[];
}

export interface InsightFeedItem {
  id: string;
  icon: string;
  headline: string;
  detail: string;
  type: 'achievement' | 'warning' | 'pattern' | 'info';
}

// ─── Computation helpers ──────────────────────────────────────────────────────

function weightedRate(s: HabitInsightSummary['cur'], isEssential: boolean, totalDays: number): number {
  const logged = s.s1 + s.s2 + s.s3 + s.s4 + s.s5;
  const numerator = s.s1 * 1.0 + s.s3 * 0.75 + s.s4 * 0.25;
  if (isEssential) {
    // Unlogged days count as misses for essentials
    const denom = Math.max(totalDays, logged);
    return denom === 0 ? 0 : numerator / denom;
  }
  return logged === 0 ? 0 : numerator / logged;
}

function deriveTag(h: HabitMetrics, isNewHabit: boolean): InsightTag {
  const { weightedConsistency, priorWeightedConsistency, exceptionRatio, isEssential } = h;
  if (isNewHabit) return 'new_habit';
  if (isEssential && weightedConsistency < 0.85) return 'essential_at_risk';
  if (weightedConsistency >= 0.9 && weightedConsistency > priorWeightedConsistency) return 'on_fire';
  if (weightedConsistency >= 0.7 && exceptionRatio > 0.5) return 'exception_creep';
  if (weightedConsistency >= 0.7) return 'solid';
  if (priorWeightedConsistency >= 0.7 && weightedConsistency < 0.7) return 'slipping';
  if (weightedConsistency < 0.5 && weightedConsistency > 0.3) return 'struggling';
  if (weightedConsistency <= 0.3) return 'dormant';
  return 'solid';
}

function buildFeed(categories: CategoryMetrics[], habits: HabitMetrics[], days: number): InsightFeedItem[] {
  const items: InsightFeedItem[] = [];
  let id = 0;
  const next = () => String(id++);

  // Best category
  const sorted = [...categories].sort((a, b) => b.score - a.score);
  if (sorted.length > 0 && sorted[0].score > 0) {
    const best = sorted[0];
    items.push({
      id: next(), icon: '🏆', type: 'achievement',
      headline: `${best.label} is your strongest category at ${Math.round(best.score * 100)}%`,
      detail: `${best.habitCount} habits averaging ${Math.round(best.score * 100)}% completion this period.`,
    });
  }

  // Most improved category
  const improved = [...categories].filter(c => c.delta > 0.05).sort((a, b) => b.delta - a.delta);
  if (improved.length > 0) {
    const cat = improved[0];
    items.push({
      id: next(), icon: '📈', type: 'achievement',
      headline: `${cat.label} improved ${Math.round(cat.delta * 100)}pts vs. prior ${days}d`,
      detail: `Up from ${Math.round(cat.priorScore * 100)}% to ${Math.round(cat.score * 100)}%.`,
    });
  }

  // Exception creep habits
  const creep = habits.filter(h => h.insightTag === 'exception_creep');
  for (const h of creep.slice(0, 2)) {
    items.push({
      id: next(), icon: '⚠️', type: 'warning',
      headline: `Exception creep detected on "${h.name}"`,
      detail: `${Math.round(h.exceptionRatio * 100)}% of logged days are exception entries. Is the standard achievable?`,
    });
  }

  // Essential at risk
  const atRisk = habits.filter(h => h.insightTag === 'essential_at_risk');
  for (const h of atRisk.slice(0, 2)) {
    items.push({
      id: next(), icon: '⚡', type: 'warning',
      headline: `Essential habit "${h.name}" below 85%`,
      detail: `Currently at ${Math.round(h.weightedConsistency * 100)}%. Essential habits need consistent completion.`,
    });
  }

  // Slipping habits
  const slipping = habits.filter(h => h.insightTag === 'slipping');
  for (const h of slipping.slice(0, 2)) {
    items.push({
      id: next(), icon: '📉', type: 'warning',
      headline: `"${h.name}" is slipping`,
      detail: `Down ${Math.round(Math.abs(h.trendDelta) * 100)}pts from last period (${Math.round(h.priorWeightedConsistency * 100)}% → ${Math.round(h.weightedConsistency * 100)}%).`,
    });
  }

  // On fire habits
  const onFire = habits.filter(h => h.insightTag === 'on_fire');
  for (const h of onFire.slice(0, 2)) {
    items.push({
      id: next(), icon: '🔥', type: 'achievement',
      headline: `"${h.name}" is on fire at ${Math.round(h.weightedConsistency * 100)}%`,
      detail: `Up ${Math.round(h.trendDelta * 100)}pts from prior period. Keep it up.`,
    });
  }

  // Weakest category
  const worst = sorted[sorted.length - 1];
  if (worst && sorted.length > 1 && worst.score < sorted[0].score - 0.15) {
    items.push({
      id: next(), icon: '💡', type: 'info',
      headline: `${worst.label} is your lowest category at ${Math.round(worst.score * 100)}%`,
      detail: `${Math.round((sorted[0].score - worst.score) * 100)}pts below your top category. Worth revisiting habit sizing.`,
    });
  }

  return items;
}

// ─── Main hook ────────────────────────────────────────────────────────────────

export function useInsightsData(days: number) {
  const summaryQuery = useInsightsSummary(days);
  const trendQuery = useInsightsTrend(days);

  const derived = useMemo(() => {
    const raw = summaryQuery.data?.habits ?? [];
    if (raw.length === 0) return null;

    // ── Per-habit metrics ───────────────────────────────────────────────────
    const habitMetrics: HabitMetrics[] = raw.map(r => {
      const curLogged = r.cur.s1 + r.cur.s2 + r.cur.s3 + r.cur.s4 + r.cur.s5;
      const curTotal = curLogged + r.cur.s0;

      const wc = weightedRate(r.cur, r.essential, days);
      const wcPrior = weightedRate(r.prior, r.essential, days);
      const cleanRate = curLogged === 0 ? 0 : r.cur.s1 / curLogged;
      const exceptionRatio = (r.cur.s1 + r.cur.s3) === 0
        ? 0 : r.cur.s3 / (r.cur.s1 + r.cur.s3);

      // State proportions for distribution bar
      const denom = Math.max(curTotal, 1);
      const stateProps = {
        s1: r.cur.s1 / denom, s3: r.cur.s3 / denom,
        s4: r.cur.s4 / denom, s2: r.cur.s2 / denom,
        s0: r.cur.s0 / denom,
      };

      // DOW rates
      const dowRates: (number | null)[] = Array(7).fill(null);
      for (const d of r.dow) {
        const num = d.s1 * 1.0 + d.s3 * 0.75 + d.s4 * 0.25;
        dowRates[d.dow] = d.logged === 0 ? null : num / d.logged;
      }

      const createdMs = r.createdDate ? new Date(r.createdDate).getTime() : 0;
      const isNewHabit = createdMs > 0 && (Date.now() - createdMs) < 30 * 24 * 60 * 60 * 1000;

      const base: Omit<HabitMetrics, 'insightTag'> = {
        habitId: r.habitId, name: r.name,
        category: r.category as HabitDefaultTime,
        isEssential: r.essential, isNewHabit,
        weightedConsistency: wc, priorWeightedConsistency: wcPrior,
        cleanRate, exceptionRatio,
        trendDelta: wc - wcPrior,
        stateProps, dowRates,
      };
      const insightTag = deriveTag(base as HabitMetrics, isNewHabit);
      return { ...base, insightTag };
    });

    // ── Per-category metrics ────────────────────────────────────────────────
    const catMap = new Map<string, HabitMetrics[]>();
    for (const h of habitMetrics) {
      const arr = catMap.get(h.category) ?? [];
      arr.push(h);
      catMap.set(h.category, arr);
    }

    const categoryMetrics: CategoryMetrics[] = [];
    for (const [cat, habits] of catMap.entries()) {
      const cfg = HABIT_TIME_CONFIG[cat as HabitDefaultTime];
      const score = habits.reduce((s, h) => s + h.weightedConsistency, 0) / habits.length;
      const priorScore = habits.reduce((s, h) => s + h.priorWeightedConsistency, 0) / habits.length;
      categoryMetrics.push({
        category: cat as HabitDefaultTime,
        label: cfg?.label ?? cat,
        color: cfg?.color === 'orange' ? '#f97316' : (cfg?.color ?? '#6b7280'),
        score, priorScore,
        delta: score - priorScore,
        habitCount: habits.length,
        essentialCount: habits.filter(h => h.isEssential).length,
        habits,
      });
    }

    // Sort categories by the same order as FILTER_TIME_TYPES
    const ORDER = ['morning','health','exercise','growth','quitting','night','routine','ktlo','weekdays','neither'];
    categoryMetrics.sort((a, b) => ORDER.indexOf(a.category) - ORDER.indexOf(b.category));

    const feed = buildFeed(categoryMetrics, habitMetrics, days);

    return { habitMetrics, categoryMetrics, feed };
  }, [summaryQuery.data, days]);

  // ── Trend data (weekly buckets → per-category series) ─────────────────────
  const trendSeries = useMemo(() => {
    const buckets = trendQuery.data?.buckets ?? [];
    if (buckets.length === 0 || !derived) return null;

    // Map habitId → category
    const catForHabit = new Map<string, HabitDefaultTime>();
    for (const h of derived.habitMetrics) catForHabit.set(h.habitId, h.category);

    // Group buckets by weekStart
    const weekMap = new Map<string, InsightTrendBucket[]>();
    for (const b of buckets) {
      const arr = weekMap.get(b.weekStart) ?? [];
      arr.push(b);
      weekMap.set(b.weekStart, arr);
    }

    const weeks = [...weekMap.keys()].sort();
    // Per week, per category: weighted rate
    const series: Record<string, { weekStart: string; rate: number }[]> = {};
    for (const week of weeks) {
      const weekBuckets = weekMap.get(week)!;
      const catTotals = new Map<string, { num: number; logged: number }>();
      for (const b of weekBuckets) {
        const cat = catForHabit.get(b.habitId);
        if (!cat) continue;
        const prev = catTotals.get(cat) ?? { num: 0, logged: 0 };
        prev.num += b.s1 * 1.0 + b.s3 * 0.75 + b.s4 * 0.25;
        prev.logged += b.logged;
        catTotals.set(cat, prev);
      }
      for (const [cat, { num, logged }] of catTotals.entries()) {
        if (!series[cat]) series[cat] = [];
        series[cat].push({ weekStart: week, rate: logged === 0 ? 0 : num / logged });
      }
    }

    return { weeks, series };
  }, [trendQuery.data, derived]);

  return {
    isLoading: summaryQuery.isLoading || trendQuery.isLoading,
    error: summaryQuery.error || trendQuery.error,
    habitMetrics: derived?.habitMetrics ?? [],
    categoryMetrics: derived?.categoryMetrics ?? [],
    feed: derived?.feed ?? [],
    trendSeries,
    days,
  };
}
