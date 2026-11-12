import { Position, type InternalNode, type Node } from "@xyflow/react";
import {
  CARD_DEFAULT_HEIGHT,
  CARD_DEFAULT_WIDTH,
} from "./gardenPhysics";

export const GARDEN_ARROW_MARKER_PATH =
  "M -13,-5.2 Q -7,-1.6 0,0 Q -7,1.6 -13,5.2 L -9.6,0 Z";

export interface FloatingEdgeParams {
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  sourcePos: Position;
  targetPos: Position;
}

export interface RelationStyleConfig {
  stroke: string;
  focusedStroke: string;
  label: string;
}

const RELATION_STYLE_MAP: Record<string, RelationStyleConfig> = {
  relates_to: {
    stroke: "rgba(202, 194, 182, 0.56)",
    focusedStroke: "#f0e8dc",
    label: "relates to",
  },
  part_of: {
    stroke: "rgba(124, 154, 142, 0.62)",
    focusedStroke: "#8eb5a6",
    label: "part of",
  },
  caused_by: {
    stroke: "rgba(233, 201, 168, 0.62)",
    focusedStroke: "#f2d2b0",
    label: "caused by",
  },
  contradicts: {
    stroke: "rgba(217, 119, 87, 0.66)",
    focusedStroke: "#ea8666",
    label: "contradicts",
  },
  echoes: {
    stroke: "rgba(185, 200, 214, 0.62)",
    focusedStroke: "#c7daea",
    label: "echoes",
  },
};

export function getRelationStyle(relation: string): RelationStyleConfig {
  return (
    RELATION_STYLE_MAP[relation] ?? {
      stroke: "rgba(202, 194, 182, 0.56)",
      focusedStroke: "#f0e8dc",
      label: relation.replace(/_/g, " "),
    }
  );
}

export interface NodeWorldRect {
  x: number;
  y: number;
  width: number;
  height: number;
  cx: number;
  cy: number;
}

export function getNodeRect(node: InternalNode<Node>): NodeWorldRect {
  const width = node.measured?.width ?? CARD_DEFAULT_WIDTH;
  const height = node.measured?.height ?? CARD_DEFAULT_HEIGHT;
  const pos = node.internals.positionAbsolute;
  return {
    x: pos.x,
    y: pos.y,
    width,
    height,
    cx: pos.x + width / 2,
    cy: pos.y + height / 2,
  };
}

/**
 * Finds the point on `rect`'s outer border intersected by the ray from
 * `rect`'s center toward `targetPoint`.
 */
function getPointOnRectIntersection(
  rect: NodeWorldRect,
  targetPoint: { x: number; y: number },
) {
  const w = rect.width / 2;
  const h = rect.height / 2;

  const dx = targetPoint.x - rect.cx;
  const dy = targetPoint.y - rect.cy;

  if (dx === 0 && dy === 0) {
    return { x: rect.cx, y: rect.cy - h };
  }

  const scaleX = dx !== 0 ? w / Math.abs(dx) : Infinity;
  const scaleY = dy !== 0 ? h / Math.abs(dy) : Infinity;
  const t = Math.min(scaleX, scaleY);

  return {
    x: rect.cx + dx * t,
    y: rect.cy + dy * t,
  };
}

function getEdgePosition(
  rect: NodeWorldRect,
  intersectionPoint: { x: number; y: number },
): Position {
  const dx = intersectionPoint.x - rect.cx;
  const dy = intersectionPoint.y - rect.cy;

  if (Math.abs(dx) / Math.max(1, rect.width) >= Math.abs(dy) / Math.max(1, rect.height)) {
    return dx >= 0 ? Position.Right : Position.Left;
  }
  return dy >= 0 ? Position.Bottom : Position.Top;
}

function getOppositePosition(pos: Position): Position {
  switch (pos) {
    case Position.Left:
      return Position.Right;
    case Position.Right:
      return Position.Left;
    case Position.Top:
      return Position.Bottom;
    default:
      return Position.Top;
  }
}

function applyEndpointGap(
  sourcePoint: { x: number; y: number },
  targetPoint: { x: number; y: number },
  sourceGap: number,
  targetGap: number,
) {
  const dx = targetPoint.x - sourcePoint.x;
  const dy = targetPoint.y - sourcePoint.y;
  const dist = Math.hypot(dx, dy);

  if (dist < 28) {
    return { sx: sourcePoint.x, sy: sourcePoint.y, tx: targetPoint.x, ty: targetPoint.y };
  }

  const ux = dx / dist;
  const uy = dy / dist;
  const safeSourceGap = Math.min(sourceGap, dist * 0.08);
  const safeTargetGap = Math.min(targetGap, dist * 0.12);

  return {
    sx: sourcePoint.x + ux * safeSourceGap,
    sy: sourcePoint.y + uy * safeSourceGap,
    tx: targetPoint.x - ux * safeTargetGap,
    ty: targetPoint.y - uy * safeTargetGap,
  };
}

export function getFloatingEdgeParams(
  source: InternalNode<Node>,
  target: InternalNode<Node>,
  edgeGap = 4,
): FloatingEdgeParams {
  const sourceRect = getNodeRect(source);
  const targetRect = getNodeRect(target);

  const rawSource = getPointOnRectIntersection(sourceRect, {
    x: targetRect.cx,
    y: targetRect.cy,
  });
  const rawTarget = getPointOnRectIntersection(targetRect, {
    x: sourceRect.cx,
    y: sourceRect.cy,
  });

  const { sx, sy, tx, ty } = applyEndpointGap(
    rawSource,
    rawTarget,
    edgeGap * 0.55,
    edgeGap,
  );

  return {
    sx,
    sy,
    tx,
    ty,
    sourcePos: getEdgePosition(sourceRect, rawSource),
    targetPos: getEdgePosition(targetRect, rawTarget),
  };
}

export function getFloatingConnectionPreviewParams(
  source: InternalNode<Node>,
  targetPoint: { x: number; y: number },
  sourceGap = 2.5,
): FloatingEdgeParams {
  const sourceRect = getNodeRect(source);
  const rawSource = getPointOnRectIntersection(sourceRect, targetPoint);
  const sourcePos = getEdgePosition(sourceRect, rawSource);
  const { sx, sy, tx, ty } = applyEndpointGap(
    rawSource,
    targetPoint,
    sourceGap,
    0,
  );

  return {
    sx,
    sy,
    tx,
    ty,
    sourcePos,
    targetPos: getOppositePosition(sourcePos),
  };
}

