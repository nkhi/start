import { Position, type InternalNode, type Node } from "@xyflow/react";
import {
  CARD_DEFAULT_HEIGHT,
  CARD_DEFAULT_WIDTH,
} from "../layout/gardenPhysics";

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
    stroke: "rgba(164, 158, 148, 0.45)",
    focusedStroke: "rgba(232, 224, 212, 0.88)",
    label: "relates to",
  },
  part_of: {
    stroke: "rgba(124, 154, 142, 0.5)",
    focusedStroke: "#7c9a8e",
    label: "part of",
  },
  caused_by: {
    stroke: "rgba(233, 201, 168, 0.52)",
    focusedStroke: "#e9c9a8",
    label: "caused by",
  },
  contradicts: {
    stroke: "rgba(217, 119, 87, 0.56)",
    focusedStroke: "#d97757",
    label: "contradicts",
  },
  echoes: {
    stroke: "rgba(185, 200, 214, 0.52)",
    focusedStroke: "#b9c8d6",
    label: "echoes",
  },
};

export function getRelationStyle(relation: string): RelationStyleConfig {
  return (
    RELATION_STYLE_MAP[relation] ?? {
      stroke: "rgba(164, 158, 148, 0.45)",
      focusedStroke: "rgba(232, 224, 212, 0.88)",
      label: relation.replace(/_/g, " "),
    }
  );
}

function getNodeRect(node: InternalNode<Node>) {
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
 * Finds the point on `intersectionNode`'s outer rectangle intersected by the
 * ray from `intersectionNode`'s center toward `targetNode`'s center.
 */
function getNodeIntersection(
  intersectionNode: InternalNode<Node>,
  targetNode: InternalNode<Node>,
) {
  const a = getNodeRect(intersectionNode);
  const b = getNodeRect(targetNode);

  const w = a.width / 2;
  const h = a.height / 2;

  const dx = b.cx - a.cx;
  const dy = b.cy - a.cy;

  if (dx === 0 && dy === 0) {
    return { x: a.cx, y: a.cy - h };
  }

  // Scale the ray (dx, dy) so it hits either horizontal or vertical border first
  const scaleX = dx !== 0 ? w / Math.abs(dx) : Infinity;
  const scaleY = dy !== 0 ? h / Math.abs(dy) : Infinity;
  const t = Math.min(scaleX, scaleY);

  return {
    x: a.cx + dx * t,
    y: a.cy + dy * t,
  };
}

function getEdgePosition(
  node: InternalNode<Node>,
  intersectionPoint: { x: number; y: number },
): Position {
  const rect = getNodeRect(node);
  const dx = intersectionPoint.x - rect.cx;
  const dy = intersectionPoint.y - rect.cy;

  if (Math.abs(dx) / Math.max(1, rect.width) >= Math.abs(dy) / Math.max(1, rect.height)) {
    return dx >= 0 ? Position.Right : Position.Left;
  }
  return dy >= 0 ? Position.Bottom : Position.Top;
}

export function getFloatingEdgeParams(
  source: InternalNode<Node>,
  target: InternalNode<Node>,
): FloatingEdgeParams {
  const sourcePoint = getNodeIntersection(source, target);
  const targetPoint = getNodeIntersection(target, source);

  return {
    sx: sourcePoint.x,
    sy: sourcePoint.y,
    tx: targetPoint.x,
    ty: targetPoint.y,
    sourcePos: getEdgePosition(source, sourcePoint),
    targetPos: getEdgePosition(target, targetPoint),
  };
}

