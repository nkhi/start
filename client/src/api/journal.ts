/**
 * Journal API Client
 *
 * Direct REST wrappers for Journal (Mull) endpoints.
 * Standard Start API client architecture.
 */

import type {
  GraphSnapshot,
  NodeWithState,
  NodeState,
  Edge,
  Entry,
  EntrySummary,
  SuggestionResponse,
  ParsedSeedGraph,
  StateSource,
  EdgeStatus,
  CreateJournalNodeRequest,
  UpdateJournalNodeRequest,
  JournalNodePositionUpdate,
  CreateJournalEdgeRequest,
  SaveJournalEntryRequest,
  BatchJournalCreateRequest,
  BatchJournalCreateResponse,
} from '../types';
import { fetchWithErrorReporting } from './errorReporter';
import { API_BASE_URL } from '../config';

const JOURNAL_API = `${API_BASE_URL}/api/journal`;

// ============ REST API Functions ============

export async function getJournalGraph(): Promise<GraphSnapshot> {
  try {
    const response = await fetchWithErrorReporting(`${JOURNAL_API}/graph`);
    if (!response.ok) return { nodes: [], edges: [] };
    const data = await response.json();
    return {
      nodes: Array.isArray(data?.nodes) ? data.nodes : [],
      edges: Array.isArray(data?.edges) ? data.edges : [],
    };
  } catch (err) {
    console.warn('Failed to fetch journal graph snapshot:', err);
    return { nodes: [], edges: [] };
  }
}

export async function createJournalNode(payload: CreateJournalNodeRequest): Promise<NodeWithState> {
  const response = await fetchWithErrorReporting(`${JOURNAL_API}/nodes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Failed to create journal node');
  return response.json();
}

export async function updateJournalNode(id: string, payload: UpdateJournalNodeRequest): Promise<void> {
  const response = await fetchWithErrorReporting(`${JOURNAL_API}/nodes/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Failed to update journal node');
}

export async function updateJournalNodePositions(
  positions: JournalNodePositionUpdate[]
): Promise<void> {
  if (positions.length === 0) return;
  const response = await fetchWithErrorReporting(`${JOURNAL_API}/nodes/positions`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ positions }),
  });
  if (!response.ok) throw new Error('Failed to persist journal node positions');
}

export async function resetJournalNodePositions(): Promise<void> {
  const response = await fetchWithErrorReporting(`${JOURNAL_API}/nodes/positions`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to reset journal node positions');
}

export async function archiveJournalNode(id: string, archived: boolean): Promise<void> {
  const response = await fetchWithErrorReporting(`${JOURNAL_API}/nodes/${id}/archive`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ archived }),
  });
  if (!response.ok) throw new Error('Failed to archive journal node');
}

export async function deleteJournalNode(id: string): Promise<void> {
  const response = await fetchWithErrorReporting(`${JOURNAL_API}/nodes/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete journal node');
}

export async function setJournalNodeState(
  nodeId: string,
  priority: number,
  intensity: number,
  openness: number,
  source?: StateSource
): Promise<NodeState> {
  const response = await fetchWithErrorReporting(`${JOURNAL_API}/nodes/${nodeId}/state`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ priority, intensity, openness, source }),
  });
  if (!response.ok) throw new Error('Failed to set journal node state');
  return response.json();
}

export async function getJournalNodeHistory(nodeId: string): Promise<NodeState[]> {
  try {
    const response = await fetchWithErrorReporting(`${JOURNAL_API}/nodes/${nodeId}/history`);
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('Failed to get journal node history:', err);
    return [];
  }
}

export async function createJournalEdge(payload: CreateJournalEdgeRequest): Promise<Edge> {
  const response = await fetchWithErrorReporting(`${JOURNAL_API}/edges`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Failed to create journal edge');
  return response.json();
}

export async function updateJournalEdgeStatus(id: string, status: EdgeStatus): Promise<void> {
  const response = await fetchWithErrorReporting(`${JOURNAL_API}/edges/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) throw new Error('Failed to update journal edge status');
}

export async function deleteJournalEdge(id: string): Promise<void> {
  const response = await fetchWithErrorReporting(`${JOURNAL_API}/edges/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete journal edge');
}

export async function saveJournalEntry(payload: SaveJournalEntryRequest): Promise<Entry> {
  const response = await fetchWithErrorReporting(`${JOURNAL_API}/entries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Failed to save journal entry');
  return response.json();
}

export async function getJournalEntry(id: string): Promise<Entry | null> {
  try {
    const response = await fetchWithErrorReporting(`${JOURNAL_API}/entries/${id}`);
    if (!response.ok) return null;
    const data = await response.json();
    return data || null;
  } catch (err) {
    console.warn('Failed to get journal entry:', err);
    return null;
  }
}

export async function listJournalEntries(limit = 50): Promise<Entry[]> {
  try {
    const response = await fetchWithErrorReporting(`${JOURNAL_API}/entries?limit=${limit}`);
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('Failed to list journal entries:', err);
    return [];
  }
}

export async function listJournalEntrySummaries(limit = 100): Promise<EntrySummary[]> {
  try {
    const response = await fetchWithErrorReporting(`${JOURNAL_API}/entries/summaries?limit=${limit}`);
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('Failed to list journal entry summaries:', err);
    return [];
  }
}

export async function getJournalSuggestion(excludeNodeId?: string): Promise<SuggestionResponse | null> {
  try {
    const url = excludeNodeId
      ? `${JOURNAL_API}/suggest?excludeId=${encodeURIComponent(excludeNodeId)}`
      : `${JOURNAL_API}/suggest`;
    const response = await fetchWithErrorReporting(url);
    if (!response.ok) return null;
    const data = await response.json();
    return data || null;
  } catch (err) {
    console.warn('Failed to get journal suggestion:', err);
    return null;
  }
}

export async function parseJournalSeed(outline: string): Promise<ParsedSeedGraph> {
  const response = await fetchWithErrorReporting(`${JOURNAL_API}/seed/parse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ outline }),
  });
  if (!response.ok) throw new Error('Failed to parse journal seed outline');
  return response.json();
}

export async function commitJournalSeed(outline: string): Promise<BatchJournalCreateResponse> {
  const response = await fetchWithErrorReporting(`${JOURNAL_API}/seed/commit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ outline }),
  });
  if (!response.ok) throw new Error('Failed to commit journal seed outline');
  return response.json();
}

export async function commitJournalBatch(payload: BatchJournalCreateRequest): Promise<BatchJournalCreateResponse> {
  // 1. Attempt server-side atomic batch insert via /seed/commit or /batch
  try {
    const response = await fetch(`${JOURNAL_API}/seed/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    console.warn('Batch endpoint attempt failed, trying fallback:', err);
  }

  // 2. Fallback: if server process hasn't reloaded the batch route yet, insert sequentially
  const titleToIdMap: Record<string, string> = {};
  let nodeCount = 0;
  let edgeCount = 0;

  for (const n of payload.nodes || []) {
    if (!n.title?.trim()) continue;
    const res = await createJournalNode({
      title: n.title.trim(),
      body: n.body,
      kind: n.kind,
      priority: n.priority,
      intensity: n.intensity,
      openness: n.openness,
      tags: n.tags,
    });
    titleToIdMap[n.title.trim().toLowerCase()] = res.node.id;
    if (n.original_title) {
      titleToIdMap[n.original_title.trim().toLowerCase()] = res.node.id;
    }
    if (n.temp_id) {
      titleToIdMap[n.temp_id] = res.node.id;
    }
    nodeCount++;
  }

  for (const e of payload.edges || []) {
    let srcId = e.src_id;
    let dstId = e.dst_id;
    if (!srcId && e.src_title) {
      srcId = titleToIdMap[e.src_title.trim().toLowerCase()] || titleToIdMap[e.src_title.trim()];
    }
    if (!dstId && e.dst_title) {
      dstId = titleToIdMap[e.dst_title.trim().toLowerCase()] || titleToIdMap[e.dst_title.trim()];
    }
    if (srcId && dstId && srcId !== dstId) {
      try {
        await createJournalEdge({
          src: srcId,
          dst: dstId,
          relation: e.relation || 'relates_to',
        });
        edgeCount++;
      } catch (err) {
        console.warn('Failed to insert edge in fallback:', err);
      }
    }
  }

  return { ok: true, nodeCount, edgeCount };
}
