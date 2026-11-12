import {
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";
import { quadtree } from "d3-quadtree";

export const CARD_DEFAULT_WIDTH = 250;
export const CARD_DEFAULT_HEIGHT = 148;
export const CARD_COMPACT_WIDTH = 172;
export const CARD_COMPACT_HEIGHT = 56;
export const CARD_COLLISION_PADDING = 22;

export interface Point2D {
  x: number;
  y: number;
}

export type PositionMap = Record<string, Point2D>;

export interface LayoutNodeInput {
  id: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  hasSavedPosition?: boolean;
}

export interface LayoutEdgeInput {
  src: string;
  dst: string;
  weight?: number;
}

export interface WorldRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface SimNode extends SimulationNodeDatum {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  priorityWeight: number;
  index?: number;
}

interface SimLink extends SimulationLinkDatum<SimNode> {
  weight: number;
}

interface QuadBoundsMeta {
  maxHalfW: number;
  maxHalfH: number;
}

function toSimNode(node: LayoutNodeInput, priorityWeight = 1): SimNode {
  const width = node.width && node.width > 0 ? node.width : CARD_DEFAULT_WIDTH;
  const height = node.height && node.height > 0 ? node.height : CARD_DEFAULT_HEIGHT;
  return {
    id: node.id,
    x: node.x + width / 2,
    y: node.y + height / 2,
    vx: 0,
    vy: 0,
    width,
    height,
    priorityWeight,
  };
}

function toTopLeftPositions(simNodes: SimNode[]): PositionMap {
  const out: PositionMap = {};
  for (const n of simNodes) {
    out[n.id] = {
      x: Math.round(n.x - n.width / 2),
      y: Math.round(n.y - n.height / 2),
    };
  }
  return out;
}

function ensureNodeIndices(nodes: SimNode[]) {
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].index == null) {
      nodes[i].index = i;
    }
  }
}

function buildValidLinks(
  edges: LayoutEdgeInput[],
  nodeIds: Set<string>,
): SimLink[] {
  const links: SimLink[] = [];
  for (const e of edges) {
    if (e.src !== e.dst && nodeIds.has(e.src) && nodeIds.has(e.dst)) {
      links.push({
        source: e.src,
        target: e.dst,
        weight: e.weight ?? 1,
      });
    }
  }
  return links;
}

function resolvePairOverlap(
  a: SimNode,
  b: SimNode,
  triggerPadding: number,
  clearPadding: number,
  damping: number,
): boolean {
  let dx = b.x - a.x;
  let dy = b.y - a.y;

  if (dx === 0 && dy === 0) {
    const idxA = a.index ?? 0;
    const idxB = b.index ?? 1;
    dx = idxA < idxB ? -0.5 : 0.5;
    dy = idxA < idxB ? -0.5 : 0.5;
  }

  const touchX = (a.width + b.width) / 2 + triggerPadding;
  const touchY = (a.height + b.height) / 2 + triggerPadding;
  const touchOverlapX = touchX - Math.abs(dx);
  const touchOverlapY = touchY - Math.abs(dy);

  if (touchOverlapX <= 0 || touchOverlapY <= 0) return false;

  const clearX = (a.width + b.width) / 2 + clearPadding;
  const clearY = (a.height + b.height) / 2 + clearPadding;
  const overlapX = clearX - Math.abs(dx);
  const overlapY = clearY - Math.abs(dy);

  const aFixed = a.fx != null || !Number.isFinite(a.priorityWeight);
  const bFixed = b.fx != null || !Number.isFinite(b.priorityWeight);
  if (aFixed && bFixed) return false;

  let wa = 0.5;
  let wb = 0.5;
  if (aFixed) {
    wa = 0;
    wb = 1;
  } else if (bFixed) {
    wa = 1;
    wb = 0;
  } else {
    const invA = 1 / Math.max(0.1, a.priorityWeight);
    const invB = 1 / Math.max(0.1, b.priorityWeight);
    const sum = invA + invB;
    wa = invA / sum;
    wb = invB / sum;
  }

  if (touchOverlapX < touchOverlapY) {
    const sign = dx >= 0 ? 1 : -1;
    const shift = Math.max(0, overlapX) * damping;
    a.x -= sign * shift * wa;
    b.x += sign * shift * wb;
  } else {
    const sign = dy >= 0 ? 1 : -1;
    const shift = Math.max(0, overlapY) * damping;
    a.y -= sign * shift * wa;
    b.y += sign * shift * wb;
  }

  return true;
}

function runOverlapSweep(
  nodes: SimNode[],
  triggerPadding: number,
  clearPadding: number,
  damping: number,
): boolean {
  ensureNodeIndices(nodes);
  const tree = quadtree<SimNode>(
    nodes,
    (d) => d.x,
    (d) => d.y,
  );
  const metaMap = new WeakMap<object, QuadBoundsMeta>();

  tree.visitAfter((quad) => {
    if (!quad.length) {
      let maxHalfW = 0;
      let maxHalfH = 0;
      let leaf: typeof quad | undefined = quad;
      while (leaf) {
        maxHalfW = Math.max(maxHalfW, leaf.data.width / 2);
        maxHalfH = Math.max(maxHalfH, leaf.data.height / 2);
        leaf = leaf.next;
      }
      metaMap.set(quad, { maxHalfW, maxHalfH });
      return;
    }

    let maxHalfW = 0;
    let maxHalfH = 0;
    for (let i = 0; i < 4; i++) {
      const child = quad[i];
      if (child) {
        const m = metaMap.get(child);
        if (m) {
          maxHalfW = Math.max(maxHalfW, m.maxHalfW);
          maxHalfH = Math.max(maxHalfH, m.maxHalfH);
        }
      }
    }
    metaMap.set(quad, { maxHalfW, maxHalfH });
  });

  const queryPad = Math.max(triggerPadding, clearPadding);
  let anyOverlap = false;
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i];
    const aHalfW = a.width / 2 + queryPad;
    const aHalfH = a.height / 2 + queryPad;

    tree.visit((quad, x0, y0, x1, y1) => {
      if (!quad.length) {
        let leaf: typeof quad | undefined = quad;
        while (leaf) {
          const b = leaf.data;
          if ((b.index ?? 0) > (a.index ?? 0)) {
            if (resolvePairOverlap(a, b, triggerPadding, clearPadding, damping)) {
              anyOverlap = true;
            }
          }
          leaf = leaf.next;
        }
        return false;
      }

      const meta = metaMap.get(quad);
      const padW = aHalfW + (meta?.maxHalfW ?? CARD_DEFAULT_WIDTH / 2);
      const padH = aHalfH + (meta?.maxHalfH ?? CARD_DEFAULT_HEIGHT / 2);

      return (
        x0 > a.x + padW ||
        x1 < a.x - padW ||
        y0 > a.y + padH ||
        y1 < a.y - padH
      );
    });
  }

  return anyOverlap;
}

/**
 * Iterative minimum-translation-vector AABB projection pass. Runs until
 * zero overlaps remain or `maxSweeps` is reached.
 */
function projectZeroOverlaps(
  nodes: SimNode[],
  triggerPadding = 0,
  clearPadding = 12,
  maxSweeps = 28,
) {
  for (let sweep = 0; sweep < maxSweeps; sweep++) {
    const hadOverlap = runOverlapSweep(nodes, triggerPadding, clearPadding, 1.0);
    if (!hadOverlap) break;
  }
}

/**
 * Custom Axis-Aligned Bounding Box (AABB) rectangular collision force
 * accelerated with d3-quadtree for use inside d3-force simulations.
 */
export function forceRectCollide(padding = CARD_COLLISION_PADDING, iterations = 3) {
  let nodes: SimNode[] = [];

  function force() {
    for (let iter = 0; iter < iterations; iter++) {
      runOverlapSweep(nodes, padding, padding, 0.85);
    }
  }

  force.initialize = (initNodes: SimNode[]) => {
    nodes = initNodes;
    ensureNodeIndices(nodes);
  };

  return force;
}

/**
 * Detects only cards that physically overlap (`triggerPadding`, default 0) and
 * pushes them clear (`clearPadding`, default 12px) along the axis of minimum
 * overlap. Non-overlapping cards nearby are never disturbed.
 */
export function resolveCardOverlaps(params: {
  nodes: LayoutNodeInput[];
  pinnedIds?: Set<string>;
  priorityIds?: Set<string>;
  triggerPadding?: number;
  clearPadding?: number;
  maxSweeps?: number;
}): { positions: PositionMap; changedIds: string[] } {
  const {
    nodes,
    pinnedIds = new Set<string>(),
    priorityIds = new Set<string>(),
    triggerPadding = 0,
    clearPadding = 12,
    maxSweeps = 32,
  } = params;

  if (nodes.length === 0) {
    return { positions: {}, changedIds: [] };
  }

  const simNodes: SimNode[] = nodes.map((n, idx) => {
    const isPinned = pinnedIds.has(n.id);
    const weight = isPinned ? Infinity : priorityIds.has(n.id) ? 3 : 1;
    const sim = toSimNode(n, weight);
    sim.index = idx;
    if (isPinned) {
      sim.fx = sim.x;
      sim.fy = sim.y;
    }
    return sim;
  });

  projectZeroOverlaps(simNodes, triggerPadding, clearPadding, maxSweeps);

  const positions = toTopLeftPositions(simNodes);
  const changedIds: string[] = [];
  for (const n of nodes) {
    const next = positions[n.id];
    if (
      next &&
      (Math.abs(next.x - Math.round(n.x)) >= 1 ||
        Math.abs(next.y - Math.round(n.y)) >= 1)
    ) {
      changedIds.push(n.id);
    }
  }

  return { positions, changedIds };
}

/**
 * Generates an initial edge-clustered, aspect-ratio-balanced corkboard layout.
 * Used when clicking "Tidy Web" or when no nodes have saved positions.
 */
export function solveTidyWebLayout(params: {
  nodes: LayoutNodeInput[];
  edges: LayoutEdgeInput[];
  containerWidth: number;
  containerHeight: number;
  center?: Point2D;
  padding?: number;
}): PositionMap {
  const {
    nodes,
    edges,
    containerWidth,
    containerHeight,
    center = { x: 0, y: 0 },
    padding = CARD_COLLISION_PADDING,
  } = params;

  if (nodes.length === 0) return {};

  const aspect = Math.max(0.55, Math.min(2.6, containerWidth / Math.max(containerHeight, 1)));
  const cols = Math.max(1, Math.ceil(Math.sqrt(nodes.length * aspect)));
  const simNodes: SimNode[] = nodes.map((n, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const totalRows = Math.ceil(nodes.length / cols);
    const jitterX = ((idx * 37) % 36) - 18;
    const jitterY = ((idx * 53) % 36) - 18;
    const startX =
      center.x + (col - (cols - 1) / 2) * (CARD_DEFAULT_WIDTH + 60) + jitterX;
    const startY =
      center.y + (row - (totalRows - 1) / 2) * (CARD_DEFAULT_HEIGHT + 55) + jitterY;

    return toSimNode({
      ...n,
      x: startX - (n.width ?? CARD_DEFAULT_WIDTH) / 2,
      y: startY - (n.height ?? CARD_DEFAULT_HEIGHT) / 2,
    });
  });

  const idSet = new Set(simNodes.map((n) => n.id));
  const simLinks = buildValidLinks(edges, idSet);

  // Higher forceY strength + lower forceX strength spreads wide on wide monitors
  const basePull = 0.14;
  const strengthX = basePull / Math.sqrt(aspect);
  const strengthY = basePull * Math.sqrt(aspect);

  const sim = forceSimulation<SimNode>(simNodes)
    .force(
      "link",
      forceLink<SimNode, SimLink>(simLinks)
        .id((d) => d.id)
        .distance(280)
        .strength(0.55),
    )
    .force("charge", forceManyBody<SimNode>().strength(-380))
    .force("x", forceX<SimNode>(center.x).strength(strengthX))
    .force("y", forceY<SimNode>(center.y).strength(strengthY))
    .force("rectCollide", forceRectCollide(padding, 4))
    .stop();

  for (let i = 0; i < 220; i++) {
    sim.tick();
  }

  projectZeroOverlaps(simNodes, 0, padding, 24);
  return toTopLeftPositions(simNodes);
}

/**
 * Resolves resting board layout while respecting cards that already have
 * saved corkboard coordinates. Newly planted / unpositioned cards are placed
 * near their connected neighbors (or open canvas space) and any overlaps are
 * pushed clear automatically.
 */
export function solveRestingLayout(params: {
  nodes: LayoutNodeInput[];
  edges: LayoutEdgeInput[];
  containerWidth: number;
  containerHeight: number;
}): { positions: PositionMap; newlyPositionedIds: string[] } {
  const { nodes, edges, containerWidth, containerHeight } = params;
  if (nodes.length === 0) return { positions: {}, newlyPositionedIds: [] };

  const placedNodes = nodes.filter((n) => n.hasSavedPosition);
  const unplacedNodes = nodes.filter((n) => !n.hasSavedPosition);

  // If nothing has saved coordinates yet, compute a full edge-aware mosaic layout
  if (placedNodes.length === 0) {
    const positions = solveTidyWebLayout({
      nodes,
      edges,
      containerWidth,
      containerHeight,
    });
    return {
      positions,
      newlyPositionedIds: nodes.map((n) => n.id),
    };
  }

  // If every node already has saved coordinates, only nudge cards that actually overlap
  if (unplacedNodes.length === 0) {
    const { positions, changedIds } = resolveCardOverlaps({
      nodes,
      triggerPadding: 0,
      clearPadding: 12,
    });
    return { positions, newlyPositionedIds: changedIds };
  }

  // Build adjacency for neighbor-aware spawning of newly planted thoughts
  const placedMap = new Map(placedNodes.map((n) => [n.id, n]));
  const neighborMap = new Map<string, string[]>();
  for (const e of edges) {
    if (!neighborMap.has(e.src)) neighborMap.set(e.src, []);
    if (!neighborMap.has(e.dst)) neighborMap.set(e.dst, []);
    neighborMap.get(e.src)!.push(e.dst);
    neighborMap.get(e.dst)!.push(e.src);
  }

  let centroidX = 0;
  let centroidY = 0;
  for (const n of placedNodes) {
    centroidX += n.x + (n.width ?? CARD_DEFAULT_WIDTH) / 2;
    centroidY += n.y + (n.height ?? CARD_DEFAULT_HEIGHT) / 2;
  }
  centroidX /= placedNodes.length;
  centroidY /= placedNodes.length;

  const simNodes: SimNode[] = nodes.map((n, idx) => {
    if (n.hasSavedPosition) {
      const sim = toSimNode(n, Infinity);
      sim.fx = sim.x;
      sim.fy = sim.y;
      return sim;
    }

    const neighbors = (neighborMap.get(n.id) || [])
      .map((id) => placedMap.get(id))
      .filter((p): p is LayoutNodeInput => Boolean(p));

    let spawnX = centroidX;
    let spawnY = centroidY;
    if (neighbors.length > 0) {
      spawnX =
        neighbors.reduce((acc, p) => acc + p.x + (p.width ?? CARD_DEFAULT_WIDTH) / 2, 0) /
        neighbors.length;
      spawnY =
        neighbors.reduce((acc, p) => acc + p.y + (p.height ?? CARD_DEFAULT_HEIGHT) / 2, 0) /
        neighbors.length;
    }

    const angle = idx * 2.39996; // Golden angle spread
    const offsetR = neighbors.length > 0 ? 180 : 240;
    const width = n.width ?? CARD_DEFAULT_WIDTH;
    const height = n.height ?? CARD_DEFAULT_HEIGHT;

    return {
      id: n.id,
      x: spawnX + Math.cos(angle) * offsetR,
      y: spawnY + Math.sin(angle) * offsetR,
      vx: 0,
      vy: 0,
      width,
      height,
      priorityWeight: 1,
    };
  });

  const idSet = new Set(simNodes.map((n) => n.id));
  const simLinks = buildValidLinks(edges, idSet);

  const sim = forceSimulation<SimNode>(simNodes)
    .force(
      "link",
      forceLink<SimNode, SimLink>(simLinks)
        .id((d) => d.id)
        .distance(260)
        .strength(0.45),
    )
    .force("x", forceX<SimNode>(centroidX).strength(0.06))
    .force("y", forceY<SimNode>(centroidY).strength(0.06))
    .force("rectCollide", forceRectCollide(CARD_COLLISION_PADDING, 4))
    .stop();

  for (let i = 0; i < 120; i++) {
    sim.tick();
  }

  // Unpin placed nodes for the final overlap projection so even pre-existing
  // overlapping pairs separate cleanly while prioritizing unmoved cards (weight 3).
  for (const s of simNodes) {
    if (s.fx != null) {
      s.fx = null;
      s.fy = null;
      s.priorityWeight = 3;
    }
  }
  projectZeroOverlaps(simNodes, 0, 12, 24);

  const positions = toTopLeftPositions(simNodes);
  const changedSet = new Set(unplacedNodes.map((n) => n.id));
  for (const n of placedNodes) {
    const next = positions[n.id];
    if (
      next &&
      (Math.abs(next.x - Math.round(n.x)) >= 1 ||
        Math.abs(next.y - Math.round(n.y)) >= 1)
    ) {
      changedSet.add(n.id);
    }
  }

  return {
    positions,
    newlyPositionedIds: Array.from(changedSet),
  };
}

/**
 * Contracts 1-hop connected neighbors around a pinned anchor card (hovered or
 * clicked) while pushing unrelated nearby cards clear via AABB collision.
 * Preserves each neighbor's existing radial direction from the anchor.
 */
export function solveFocusConstellation(params: {
  anchorId: string;
  nodes: LayoutNodeInput[];
  edges: LayoutEdgeInput[];
  restingPositions: PositionMap;
  padding?: number;
}): { positions: PositionMap; neighborIds: Set<string> } {
  const {
    anchorId,
    nodes,
    edges,
    restingPositions,
    padding = 12,
  } = params;

  const anchorInput = nodes.find((n) => n.id === anchorId);
  if (!anchorInput) {
    return { positions: restingPositions, neighborIds: new Set() };
  }

  const neighborIds = new Set<string>();
  for (const e of edges) {
    if (e.src === anchorId && e.dst !== anchorId) neighborIds.add(e.dst);
    else if (e.dst === anchorId && e.src !== anchorId) neighborIds.add(e.src);
  }

  const anchorRest = restingPositions[anchorId] ?? { x: anchorInput.x, y: anchorInput.y };
  const anchorW = anchorInput.width ?? CARD_DEFAULT_WIDTH;
  const anchorH = anchorInput.height ?? CARD_DEFAULT_HEIGHT;
  const anchorCenterX = anchorRest.x + anchorW / 2;
  const anchorCenterY = anchorRest.y + anchorH / 2;

  const targetPoints = new Map<string, Point2D>();
  let neighborIdx = 0;
  const neighborCount = Math.max(1, neighborIds.size);

  const simNodes: SimNode[] = nodes.map((n) => {
    const rest = restingPositions[n.id] ?? { x: n.x, y: n.y };
    const w = n.width ?? CARD_DEFAULT_WIDTH;
    const h = n.height ?? CARD_DEFAULT_HEIGHT;
    const restCenterX = rest.x + w / 2;
    const restCenterY = rest.y + h / 2;

    if (n.id === anchorId) {
      const sim = toSimNode({ ...n, x: rest.x, y: rest.y }, Infinity);
      sim.fx = anchorCenterX;
      sim.fy = anchorCenterY;
      targetPoints.set(n.id, { x: anchorCenterX, y: anchorCenterY });
      return sim;
    }

    if (neighborIds.has(n.id)) {
      const dx = restCenterX - anchorCenterX;
      const dy = restCenterY - anchorCenterY;
      const dist = Math.hypot(dx, dy);
      const angle =
        dist > 8
          ? Math.atan2(dy, dx)
          : (neighborIdx / neighborCount) * Math.PI * 2 - Math.PI / 2;

      const ringBoost = neighborCount > 6 ? Math.floor(neighborIdx / 6) * 140 : 0;
      const idealDist =
        Math.max(anchorW, anchorH) * 0.52 + Math.max(w, h) * 0.52 + 64 + ringBoost;

      const targetX = anchorCenterX + Math.cos(angle) * idealDist;
      const targetY = anchorCenterY + Math.sin(angle) * idealDist;
      targetPoints.set(n.id, { x: targetX, y: targetY });
      neighborIdx++;

      return {
        id: n.id,
        x: restCenterX,
        y: restCenterY,
        vx: 0,
        vy: 0,
        width: w,
        height: h,
        priorityWeight: 3,
      };
    }

    // Non-neighbors hold resting target softly, yielding smoothly to collisions
    targetPoints.set(n.id, { x: restCenterX, y: restCenterY });
    return {
      id: n.id,
      x: restCenterX,
      y: restCenterY,
      vx: 0,
      vy: 0,
      width: w,
      height: h,
      priorityWeight: 1,
    };
  });

  const sim = forceSimulation<SimNode>(simNodes)
    .force(
      "x",
      forceX<SimNode>((d) => targetPoints.get(d.id)?.x ?? d.x).strength((d) =>
        neighborIds.has(d.id) ? 0.58 : 0.28,
      ),
    )
    .force(
      "y",
      forceY<SimNode>((d) => targetPoints.get(d.id)?.y ?? d.y).strength((d) =>
        neighborIds.has(d.id) ? 0.58 : 0.28,
      ),
    )
    .force("rectCollide", forceRectCollide(padding, 4))
    .stop();

  for (let i = 0; i < 130; i++) {
    sim.tick();
  }

  projectZeroOverlaps(simNodes, 0, padding, 24);

  return {
    positions: toTopLeftPositions(simNodes),
    neighborIds,
  };
}

/**
 * Nudges cards that fell outside the visible world viewport back into view
 * without overlapping, provided total card area fits comfortably inside the
 * visible bounds. Returns whether non-focused cards should compact to fit.
 */
export function solveViewportContainment(params: {
  nodes: LayoutNodeInput[];
  visibleBounds: WorldRect;
  focusedIds?: Set<string>;
  padding?: number;
}): { positions: PositionMap; shouldCompactPeripheral: boolean } {
  const {
    nodes,
    visibleBounds,
    focusedIds = new Set(),
    padding = 18,
  } = params;

  if (nodes.length === 0) {
    return { positions: {}, shouldCompactPeripheral: false };
  }

  const viewW = Math.max(1, visibleBounds.right - visibleBounds.left);
  const viewH = Math.max(1, visibleBounds.bottom - visibleBounds.top);
  const viewArea = viewW * viewH;

  const fullArea = nodes.reduce((sum, n) => {
    const w = (n.width ?? CARD_DEFAULT_WIDTH) + padding;
    const h = (n.height ?? CARD_DEFAULT_HEIGHT) + padding;
    return sum + w * h;
  }, 0);

  const shouldCompactPeripheral = fullArea > viewArea * 0.72;

  const effectiveNodes = nodes.map((n) => {
    const keepFull = !shouldCompactPeripheral || focusedIds.has(n.id);
    return {
      ...n,
      width: keepFull ? (n.width ?? CARD_DEFAULT_WIDTH) : CARD_COMPACT_WIDTH,
      height: keepFull ? (n.height ?? CARD_DEFAULT_HEIGHT) : CARD_COMPACT_HEIGHT,
    };
  });

  const effectiveArea = effectiveNodes.reduce(
    (sum, n) => sum + (n.width + padding) * (n.height + padding),
    0,
  );

  // If even compact cards exceed visible viewport capacity, resolve any overlaps
  // cleanly in place rather than crushing cards inside the viewport.
  const canContainAll = effectiveArea <= viewArea * 0.85;
  const targetSubset =
    !canContainAll && focusedIds.size > 0 ? focusedIds : null;

  if (!canContainAll && !targetSubset) {
    const { positions } = resolveCardOverlaps({
      nodes: effectiveNodes,
      priorityIds: focusedIds,
      triggerPadding: 0,
      clearPadding: 12,
    });
    return { positions, shouldCompactPeripheral };
  }

  const margin = 20;
  const clampNodeToBounds = (s: SimNode) => {
    if (targetSubset && !targetSubset.has(s.id)) return;
    const minX = visibleBounds.left + margin + s.width / 2;
    const maxX = Math.max(minX, visibleBounds.right - margin - s.width / 2);
    const minY = visibleBounds.top + margin + s.height / 2;
    const maxY = Math.max(minY, visibleBounds.bottom - margin - s.height / 2);

    if (s.x < minX) s.x = minX;
    if (s.x > maxX) s.x = maxX;
    if (s.y < minY) s.y = minY;
    if (s.y > maxY) s.y = maxY;
  };

  const simNodes: SimNode[] = effectiveNodes.map((n) => {
    const sim = toSimNode(n, focusedIds.has(n.id) ? 3 : 1);
    clampNodeToBounds(sim);
    return sim;
  });

  const restCenters = new Map(
    effectiveNodes.map((n) => [
      n.id,
      { x: n.x + n.width / 2, y: n.y + n.height / 2 },
    ]),
  );

  const sim = forceSimulation<SimNode>(simNodes)
    .force(
      "x",
      forceX<SimNode>((d) => restCenters.get(d.id)?.x ?? d.x).strength(0.18),
    )
    .force(
      "y",
      forceY<SimNode>((d) => restCenters.get(d.id)?.y ?? d.y).strength(0.18),
    )
    .force("rectCollide", forceRectCollide(12, 4))
    .stop();

  for (let i = 0; i < 90; i++) {
    sim.tick();
    for (const s of simNodes) clampNodeToBounds(s);
  }

  // Final overlap projection runs last so cards never remain overlapped
  projectZeroOverlaps(simNodes, 0, 12, 24);

  return {
    positions: toTopLeftPositions(simNodes),
    shouldCompactPeripheral,
  };
}
