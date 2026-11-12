import express, { Request, Response } from 'express';
import crypto from 'crypto';
import * as db from '../db.ts';
import type {
  GraphSnapshot,
  NodeWithState,
  Edge,
  Entry,
  EntrySummary,
  SuggestionResponse,
  ParsedSeedGraph,
  CreateJournalNodeRequest,
  UpdateJournalNodeRequest,
  SetJournalNodeStateRequest,
  CreateJournalEdgeRequest,
  SaveJournalEntryRequest,
} from '../../shared/types.ts';
import type { DbJournalNode } from '../db-types.ts';

const router = express.Router();

function formatNodeWithState(row: Record<string, any>) {
  const createdAt = Math.floor(new Date(row.created_at).getTime() / 1000);
  const updatedAt = Math.floor(new Date(row.updated_at).getTime() / 1000);
  return {
    node: {
      id: row.id,
      kind: row.kind,
      title: row.title,
      body: row.body,
      pos_x: row.pos_x ?? null,
      pos_y: row.pos_y ?? null,
      archived: row.archived,
      created_at: createdAt,
      updated_at: updatedAt,
    },
    state: {
      at: updatedAt,
      priority: row.priority,
      intensity: row.intensity,
      openness: row.openness,
      source: 'manual',
    },
    tags: row.tags || [],
  };
}

// 1. GET /api/journal/graph - Full garden snapshot
router.get('/graph', async (_req: Request, res: Response) => {
  try {
    const nodesRes = await db.query(`
      SELECT id, kind, title, body, pos_x, pos_y, priority, intensity, openness, tags, score_history, archived, created_at, updated_at
      FROM journal_nodes
      WHERE archived = false
      ORDER BY updated_at DESC;
    `);

    const edgesRes = await db.query(`
      SELECT id, src, dst, relation, directed, weight, origin, status, created_at
      FROM journal_edges
      WHERE status != 'rejected'
      ORDER BY created_at ASC;
    `);

    // Format nodes to match UI expectations (NodeWithState shape)
    const nodes = nodesRes.rows.map(formatNodeWithState);

    const edges = edgesRes.rows.map(row => ({
      id: row.id,
      src: row.src,
      dst: row.dst,
      relation: row.relation,
      directed: row.directed,
      weight: row.weight,
      origin: row.origin,
      status: row.status,
      created_at: Math.floor(new Date(row.created_at).getTime() / 1000),
    }));

    res.json({ nodes, edges });
  } catch (err: any) {
    console.error('Error fetching journal graph snapshot:', err);
    res.json({ nodes: [], edges: [] });
  }
});

// 2. POST /api/journal/nodes - Create thought
router.post('/nodes', async (req: Request, res: Response) => {
  const { kind, title, body, pos_x, pos_y, priority, intensity, openness, tags } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });

  const id = 'node-' + crypto.randomUUID();
  const p = priority ?? 5;
  const i = intensity ?? 5;
  const o = openness ?? 8;
  const cleanTags = tags || [];
  const posX = typeof pos_x === 'number' && Number.isFinite(pos_x) ? pos_x : null;
  const posY = typeof pos_y === 'number' && Number.isFinite(pos_y) ? pos_y : null;

  try {
    const result = await db.query(`
      INSERT INTO journal_nodes (id, kind, title, body, pos_x, pos_y, priority, intensity, openness, tags)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `, [id, kind || 'thought', title.trim(), body || null, posX, posY, p, i, o, cleanTags]);

    res.json(formatNodeWithState(result.rows[0]));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2b. PATCH /api/journal/nodes/positions - Batch persist node corkboard coordinates
// Registered before /nodes/:id so "positions" is not matched as :id.
router.patch('/nodes/positions', async (req: Request, res: Response) => {
  const rawPositions = req.body?.positions;
  if (!Array.isArray(rawPositions)) {
    return res.status(400).json({ error: 'positions array is required' });
  }

  const ids: string[] = [];
  const xs: number[] = [];
  const ys: number[] = [];

  for (const item of rawPositions) {
    if (
      item &&
      typeof item.id === 'string' &&
      item.id.length > 0 &&
      typeof item.x === 'number' &&
      Number.isFinite(item.x) &&
      typeof item.y === 'number' &&
      Number.isFinite(item.y)
    ) {
      ids.push(item.id);
      xs.push(item.x);
      ys.push(item.y);
    }
  }

  if (ids.length === 0) {
    return res.json({ ok: true, updated: 0 });
  }

  try {
    const result = await db.query(`
      UPDATE journal_nodes AS j
      SET pos_x = v.x,
          pos_y = v.y
      FROM (
        SELECT * FROM UNNEST($1::text[], $2::float8[], $3::float8[]) AS t(id, x, y)
      ) AS v
      WHERE j.id = v.id;
    `, [ids, xs, ys]);

    res.json({ ok: true, updated: result.rowCount ?? ids.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2c. DELETE /api/journal/nodes/positions - Reset persisted positions back to auto-layout
router.delete('/nodes/positions', async (_req: Request, res: Response) => {
  try {
    await db.query(`UPDATE journal_nodes SET pos_x = NULL, pos_y = NULL WHERE archived = false;`);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. PATCH /api/journal/nodes/:id - Update content & kind
router.patch('/nodes/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, body, kind, tags } = req.body;

  try {
    await db.query(`
      UPDATE journal_nodes
      SET title = COALESCE($1, title),
          body = $2,
          kind = COALESCE($3, kind),
          tags = COALESCE($4, tags),
          updated_at = NOW()
      WHERE id = $5;
    `, [title, body, kind, tags, id]);

    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3b. PATCH /api/journal/nodes/:id/archive - Archive / unarchive node
router.patch('/nodes/:id/archive', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { archived } = req.body;

  try {
    await db.query(`
      UPDATE journal_nodes
      SET archived = $1,
          updated_at = NOW()
      WHERE id = $2;
    `, [archived ?? true, id]);

    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. POST /api/journal/nodes/:id/state - Record new 1-10 scores
router.post('/nodes/:id/state', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { priority, intensity, openness, source } = req.body;

  const p = Number(priority);
  const i = Number(intensity);
  const o = Number(openness);
  if (!Number.isFinite(p) || !Number.isFinite(i) || !Number.isFinite(o)) {
    return res.status(400).json({ error: 'Valid numeric scores are required' });
  }

  const cleanPriority = Math.min(10, Math.max(1, Math.round(p)));
  const cleanIntensity = Math.min(10, Math.max(1, Math.round(i)));
  const cleanOpenness = Math.min(10, Math.max(1, Math.round(o)));
  const cleanSource = typeof source === 'string' && source.trim() ? source.trim() : 'manual';

  try {
    const result = await db.query(`
      UPDATE journal_nodes
      SET priority = $1,
          intensity = $2,
          openness = $3,
          updated_at = NOW(),
          score_history = COALESCE(score_history, '[]'::jsonb) || jsonb_build_object(
            'at', NOW(),
            'priority', $1::int2,
            'intensity', $2::int2,
            'openness', $3::int2,
            'source', $4::text
          )::jsonb
      WHERE id = $5
      RETURNING priority, intensity, openness, updated_at;
    `, [cleanPriority, cleanIntensity, cleanOpenness, cleanSource, id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Node not found' });

    const row = result.rows[0];
    res.json({
      at: Math.floor(new Date(row.updated_at).getTime() / 1000),
      priority: row.priority,
      intensity: row.intensity,
      openness: row.openness,
      source: cleanSource,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4b. GET /api/journal/nodes/:id/history - History of node scores
router.get('/nodes/:id/history', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await db.query(`SELECT score_history FROM journal_nodes WHERE id = $1;`, [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Node not found' });
    res.json(result.rows[0].score_history || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. DELETE /api/journal/nodes/:id - Cascade delete node & edges
router.delete('/nodes/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await db.query(`DELETE FROM journal_nodes WHERE id = $1;`, [id]);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. POST /api/journal/edges - Create edge
router.post('/edges', async (req: Request, res: Response) => {
  const { src, dst, relation, directed, weight } = req.body;
  if (!src || !dst || src === dst) return res.status(400).json({ error: 'Valid distinct src and dst required' });

  const id = 'edge-' + crypto.randomUUID();
  try {
    const result = await db.query(`
      INSERT INTO journal_edges (id, src, dst, relation, directed, weight, origin, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'user', 'accepted')
      ON CONFLICT (src, dst, relation) DO UPDATE SET weight = EXCLUDED.weight
      RETURNING *;
    `, [id, src, dst, relation || 'relates_to', directed ?? true, weight ?? 1.0]);

    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6b. PATCH /api/journal/edges/:id/status - Update edge status
router.patch('/edges/:id/status', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    await db.query(`UPDATE journal_edges SET status = $1 WHERE id = $2;`, [status, id]);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. DELETE /api/journal/edges/:id - Delete edge
router.delete('/edges/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await db.query(`DELETE FROM journal_edges WHERE id = $1;`, [id]);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

function formatEntryRow(row: Record<string, any>) {
  return {
    id: row.id,
    doc_json: row.doc_json,
    plain_text: row.plain_text ?? '',
    word_count: row.word_count ?? 0,
    primary_node_id: row.primary_node_id ?? undefined,
    started_at: Math.floor(new Date(row.started_at).getTime() / 1000),
    updated_at: Math.floor(new Date(row.updated_at).getTime() / 1000),
    rev: row.rev,
  };
}

// 8. POST /api/journal/entries - Upsert reflection document
router.post('/entries', async (req: Request, res: Response) => {
  const { id, doc_json, plain_text, primary_node_id, mentioned_node_ids, word_count, suggestion_id } = req.body;
  if (!id || !doc_json) return res.status(400).json({ error: 'Missing entry id or content' });

  const wc = word_count ?? (plain_text?.trim() ? plain_text.trim().split(/\s+/).length : 0);

  try {
    const result = await db.query(`
      INSERT INTO journal_entries (id, primary_node_id, mentioned_node_ids, doc_json, plain_text, word_count, suggestion_id, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (id) DO UPDATE SET
        doc_json = EXCLUDED.doc_json,
        plain_text = EXCLUDED.plain_text,
        primary_node_id = EXCLUDED.primary_node_id,
        mentioned_node_ids = EXCLUDED.mentioned_node_ids,
        word_count = EXCLUDED.word_count,
        suggestion_id = COALESCE(EXCLUDED.suggestion_id, journal_entries.suggestion_id),
        rev = journal_entries.rev + 1,
        updated_at = NOW()
      RETURNING *;
    `, [id, primary_node_id || null, mentioned_node_ids || [], doc_json, plain_text || '', wc, suggestion_id || null]);

    res.json(formatEntryRow(result.rows[0]));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8b. GET /api/journal/entries - List entries
router.get('/entries', async (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');
  const limit = Math.min(parseInt(req.query.limit as string, 10) || 50, 200);
  try {
    const result = await db.query(`
      SELECT id, doc_json, plain_text, word_count, primary_node_id, started_at, updated_at, rev
      FROM journal_entries
      ORDER BY updated_at DESC
      LIMIT $1;
    `, [limit]);
    res.json(result.rows.map(formatEntryRow));
  } catch (err: any) {
    console.error('Error fetching journal entries:', err);
    res.json([]);
  }
});

// 9. GET /api/journal/entries/summaries - Fast document library grid
// Registered before /entries/:id so "summaries" is not matched as :id.
router.get('/entries/summaries', async (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 100, 200);
    const result = await db.query(`
      SELECT 
        e.id AS entry_id,
        e.doc_json,
        e.plain_text,
        e.word_count,
        e.primary_node_id,
        e.started_at,
        e.updated_at,
        e.rev,
        n.id AS node_id,
        n.title AS node_title,
        n.kind AS node_kind,
        n.body AS node_body,
        n.pos_x AS node_pos_x,
        n.pos_y AS node_pos_y,
        n.priority AS node_priority,
        n.intensity AS node_intensity,
        n.openness AS node_openness,
        n.tags AS node_tags,
        n.archived AS node_archived,
        n.created_at AS node_created_at,
        n.updated_at AS node_updated_at
      FROM journal_entries e
      LEFT JOIN journal_nodes n ON n.id = e.primary_node_id
      ORDER BY e.updated_at DESC
      LIMIT $1;
    `, [limit]);

    const summaries = (result.rows || []).map((r) => ({
      entry: formatEntryRow({
        id: r.entry_id,
        doc_json: r.doc_json,
        plain_text: r.plain_text,
        word_count: r.word_count,
        primary_node_id: r.primary_node_id,
        started_at: r.started_at,
        updated_at: r.updated_at,
        rev: r.rev,
      }),
      primary_node: r.node_id
        ? formatNodeWithState({
          id: r.node_id,
          kind: r.node_kind,
          title: r.node_title,
          body: r.node_body,
          pos_x: r.node_pos_x,
          pos_y: r.node_pos_y,
          archived: r.node_archived,
          priority: r.node_priority,
          intensity: r.node_intensity,
          openness: r.node_openness,
          tags: r.node_tags,
          created_at: r.node_created_at,
          updated_at: r.node_updated_at,
        })
        : null,
      mentioned_nodes: [],
    }));

    res.json(summaries);
  } catch (err: any) {
    console.error('Error fetching entry summaries:', err);
    res.json([]);
  }
});

// 8c. GET /api/journal/entries/:id - Get single entry
router.get('/entries/:id', async (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');
  const { id } = req.params;
  try {
    const result = await db.query(`SELECT * FROM journal_entries WHERE id = $1;`, [id]);
    if (result.rows.length === 0) return res.json(null);
    res.json(formatEntryRow(result.rows[0]));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export interface SuggestionCycleState {
  currentId: string | null;
  seenIds: Set<string>;
}

const suggestionCycleState: SuggestionCycleState = {
  currentId: null,
  seenIds: new Set<string>(),
};

/**
 * Selects the current or next unarchived topic from pre-ranked rows so cycling
 * visits every topic once before starting a fresh pass without immediate repeats.
 */
export function selectSuggestionFromRows<T extends { id: string }>(
  rows: T[],
  cycleState: SuggestionCycleState,
  advance: boolean,
  excludedId?: string,
): T | null {
  if (rows.length === 0) {
    cycleState.currentId = null;
    cycleState.seenIds.clear();
    return null;
  }

  const activeIds = new Set(rows.map((row) => row.id));
  for (const id of cycleState.seenIds) {
    if (!activeIds.has(id)) {
      cycleState.seenIds.delete(id);
    }
  }
  if (cycleState.currentId && !activeIds.has(cycleState.currentId)) {
    cycleState.currentId = null;
  }

  const effectiveExcludedId = excludedId && activeIds.has(excludedId) ? excludedId : undefined;
  const shouldAdvance =
    advance || (effectiveExcludedId !== undefined && effectiveExcludedId === cycleState.currentId);

  if (!shouldAdvance && cycleState.currentId) {
    const existing = rows.find((row) => row.id === cycleState.currentId);
    if (existing) {
      cycleState.seenIds.add(existing.id);
      return existing;
    }
  }

  if (cycleState.currentId) {
    cycleState.seenIds.add(cycleState.currentId);
  }
  if (effectiveExcludedId) {
    cycleState.seenIds.add(effectiveExcludedId);
  }

  const unseen = rows.filter((row) => !cycleState.seenIds.has(row.id));
  let chosen: T;

  if (unseen.length > 0) {
    chosen = unseen[0];
  } else {
    // Completed a full pass over all unarchived topics; start the next pass without an immediate repeat.
    const previousId = effectiveExcludedId ?? cycleState.currentId;
    cycleState.seenIds.clear();
    chosen = rows.find((row) => row.id !== previousId) ?? rows[0];
  }

  cycleState.currentId = chosen.id;
  cycleState.seenIds.add(chosen.id);
  return chosen;
}

function buildSuggestionResponse(row: DbJournalNode) {
  return {
    node: formatNodeWithState(row),
    breakdown: {
      total: Number((row.priority * 0.4 + row.openness * 0.4).toFixed(1)),
      priority_term: Number((row.priority * 0.4).toFixed(1)),
      intensity_term: Number((row.intensity * 0.2).toFixed(1)),
      openness_term: Number((row.openness * 0.3).toFixed(1)),
      salience_term: 0,
      recurrence_term: 0,
      staleness_term: 0,
      penalty_term: 0,
      why_summary: row.priority >= 8 ? 'High priority inquiry' : 'Open thread to revisit',
    },
    bucket: Math.floor(Date.now() / (1000 * 21600)),
  };
}

async function handleSuggestionRequest(res: Response, advance: boolean, excludedId?: string) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const result = await db.query(`
      SELECT *
      FROM journal_nodes
      WHERE archived = false
      ORDER BY (priority * 1.5 + openness * 1.2) DESC, updated_at DESC, id ASC;
    `);

    const chosen = selectSuggestionFromRows(
      (result?.rows || []) as DbJournalNode[],
      suggestionCycleState,
      advance,
      excludedId,
    );

    if (!chosen) return res.json(null);
    return res.json(buildSuggestionResponse(chosen));
  } catch (err: any) {
    console.error('Error fetching suggestion:', err);
    return res.json(null);
  }
}

// 10. GET /api/journal/suggest - Current ranked topic suggestion (server-managed cycle)
router.get('/suggest', async (req: Request, res: Response) => {
  const { excludeId } = req.query as { excludeId?: string };
  await handleSuggestionRequest(res, false, excludeId);
});

// 10b. POST /api/journal/suggest/next - Advance server-managed topic cycle
router.post('/suggest/next', async (_req: Request, res: Response) => {
  await handleSuggestionRequest(res, true);
});

// 11. Outline Parser Helper
interface ParsedSeedOutlineResult {
  nodes: {
    temp_id: string;
    kind: string;
    title: string;
    priority: number;
    intensity: number;
    openness: number;
    tags: string[];
    original_title: string;
  }[];
  edges: {
    src_title: string;
    dst_title: string;
    relation: string;
  }[];
}

function parseSeedOutline(outline: string): ParsedSeedOutlineResult {
  const lines = (outline || '').split('\n');
  const nodes: ParsedSeedOutlineResult['nodes'] = [];
  const edges: ParsedSeedOutlineResult['edges'] = [];

  const stack: { indent: number; title: string }[] = [];
  let idx = 0;

  for (const rawLine of lines) {
    if (!rawLine.trim()) continue;
    // Skip Markdown heading / comment lines
    if (rawLine.trim().startsWith('#') && !rawLine.trim().startsWith('# ') && !rawLine.trim().match(/^#[a-zA-Z0-9_\-]+/)) {
      continue;
    }

    // Measure indentation (2 spaces or 1 tab = 1 level)
    const matchIndent = rawLine.match(/^(\s*)/);
    const indentStr = matchIndent ? matchIndent[1] : '';
    const indent = indentStr.replace(/\t/g, '  ').length;

    let text = rawLine.trim();
    // Strip leading list bullet: -, *, •
    text = text.replace(/^[-*•]\s*/, '');
    if (!text) continue;

    // Extract tags: #tag
    const tags: string[] = [];
    const tagMatches = text.match(/#([a-zA-Z0-9_\-]+)/g);
    if (tagMatches) {
      for (const m of tagMatches) {
        const cleanTag = m.replace(/^#/, '').trim();
        if (cleanTag && !tags.includes(cleanTag)) {
          tags.push(cleanTag);
        }
      }
    }

    // Extract dials: {p:9 i:7 o:10}
    let priority = 6;
    let intensity = 5;
    let openness = 8;
    const scoreMatch = text.match(/\{([^}]+)\}/);
    if (scoreMatch) {
      const pM = scoreMatch[1].match(/p:(\d+)/i);
      const iM = scoreMatch[1].match(/i:(\d+)/i);
      const oM = scoreMatch[1].match(/o:(\d+)/i);
      if (pM) priority = Math.min(10, Math.max(1, parseInt(pM[1], 10)));
      if (iM) intensity = Math.min(10, Math.max(1, parseInt(iM[1], 10)));
      if (oM) openness = Math.min(10, Math.max(1, parseInt(oM[1], 10)));
    }

    // Extract wikilinks: [[Target]]
    const wikilinks: string[] = [];
    const wikiMatches = text.match(/\[\[([^\]]+)\]\]/g);
    if (wikiMatches) {
      for (const wm of wikiMatches) {
        const target = wm.replace(/^\[\[/, '').replace(/\]\]$/, '').trim();
        if (target) wikilinks.push(target);
      }
    }

    // Clean title
    let cleanTitle = text
      .replace(/\{[^}]+\}/g, '')
      .replace(/#([a-zA-Z0-9_\-]+)/g, '')
      .replace(/\[\[([^\]]+)\]\]/g, '$1')
      .trim();

    if (!cleanTitle) cleanTitle = text;

    // Detect kind
    let kind = 'thought';
    if (tags.includes('question') || cleanTitle.endsWith('?')) {
      kind = 'question';
    } else if (tags.includes('idea')) {
      kind = 'idea';
    } else if (tags.includes('phrase') || (cleanTitle.startsWith('"') && cleanTitle.endsWith('"'))) {
      kind = 'phrase';
    } else if (tags.includes('person')) {
      kind = 'person';
    } else if (tags.includes('area')) {
      kind = 'area';
    }

    idx++;
    const tempId = `seed-${idx}`;
    nodes.push({
      temp_id: tempId,
      kind,
      title: cleanTitle,
      priority,
      intensity,
      openness,
      tags,
      original_title: cleanTitle,
    });

    // Parent-child hierarchy via indent stack
    while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }
    if (stack.length > 0) {
      const parent = stack[stack.length - 1];
      edges.push({
        src_title: cleanTitle,
        dst_title: parent.title,
        relation: 'part_of',
      });
    }
    stack.push({ indent, title: cleanTitle });

    // Wikilink edges
    for (const wl of wikilinks) {
      edges.push({
        src_title: cleanTitle,
        dst_title: wl,
        relation: 'relates_to',
      });
    }
  }

  return { nodes, edges };
}

// 12. POST /api/journal/seed/parse - Outline preview
router.post('/seed/parse', (req: Request, res: Response) => {
  const { outline } = req.body;
  const parsed = parseSeedOutline(outline || '');
  res.json(parsed);
});

// 13. POST /api/journal/seed/commit & /api/journal/batch - Batch atomic creation of thoughts & edges
const handleBatchCommit = async (req: Request, res: Response) => {
  const { outline, nodes: rawNodes, edges: rawEdges } = req.body;

  let nodesToInsert: any[] = [];
  let edgesToInsert: any[] = [];

  if (outline && typeof outline === 'string') {
    const parsed = parseSeedOutline(outline);
    nodesToInsert = parsed.nodes;
    edgesToInsert = parsed.edges;
  } else if (Array.isArray(rawNodes)) {
    nodesToInsert = rawNodes;
    edgesToInsert = Array.isArray(rawEdges) ? rawEdges : [];
  } else {
    return res.status(400).json({ error: 'Either outline string or nodes array is required' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const titleToId = new Map<string, string>();
    const tempIdToId = new Map<string, string>();

    for (const n of nodesToInsert) {
      if (!n.title?.trim()) continue;
      const title = n.title.trim();
      const id = 'node-' + crypto.randomUUID();
      const kind = n.kind || (title.endsWith('?') ? 'question' : 'thought');
      const body = n.body || null;
      const p = n.priority ?? 6;
      const i = n.intensity ?? 5;
      const o = n.openness ?? 8;
      const tags = n.tags || [];

      await client.query(`
        INSERT INTO journal_nodes (id, kind, title, body, priority, intensity, openness, tags)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
      `, [id, kind, title, body, p, i, o, tags]);

      titleToId.set(title.toLowerCase(), id);
      if (n.original_title) {
        titleToId.set(n.original_title.trim().toLowerCase(), id);
      }
      if (n.temp_id) {
        tempIdToId.set(n.temp_id, id);
      }
    }

    let insertedEdgeCount = 0;
    for (const e of edgesToInsert) {
      let srcId = e.src_id;
      let dstId = e.dst_id;

      if (!srcId && e.src_title) {
        srcId = titleToId.get(e.src_title.trim().toLowerCase()) || tempIdToId.get(e.src_title.trim());
      }
      if (!dstId && e.dst_title) {
        dstId = titleToId.get(e.dst_title.trim().toLowerCase()) || tempIdToId.get(e.dst_title.trim());
      }

      if (srcId && dstId && srcId !== dstId) {
        const edgeId = 'edge-' + crypto.randomUUID();
        await client.query(`
          INSERT INTO journal_edges (id, src, dst, relation, directed, weight, origin, status)
          VALUES ($1, $2, $3, $4, true, 1.0, 'user', 'accepted')
          ON CONFLICT DO NOTHING;
        `, [edgeId, srcId, dstId, e.relation || 'relates_to']);
        insertedEdgeCount++;
      }
    }

    await client.query('COMMIT');
    res.json({
      ok: true,
      nodeCount: titleToId.size,
      edgeCount: insertedEdgeCount,
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Error committing journal batch seed:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

router.post('/seed/commit', handleBatchCommit);
router.post('/batch', handleBatchCommit);

export default router;
