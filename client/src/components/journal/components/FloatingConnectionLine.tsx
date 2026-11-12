import {
  getBezierPath,
  useStore,
  type ConnectionLineComponentProps,
  type InternalNode,
  type Node,
} from "@xyflow/react";
import { GardenArrowMarker } from "./FloatingEdge";
import {
  getFloatingConnectionPreviewParams,
  getFloatingEdgeParams,
  getNodeRect,
} from "../utils/edgeGeometry";

const HIT_MARGIN_PX = 10;
const CONNECTING_MARKER_ID = "garden-connecting-arrow";

function findHoveredTargetNode(
  nodeLookup: Map<string, InternalNode<Node>>,
  fromNodeId: string,
  x: number,
  y: number,
): InternalNode<Node> | null {
  let bestMatch: InternalNode<Node> | null = null;
  let bestZ = -Infinity;

  for (const candidate of nodeLookup.values()) {
    if (candidate.id === fromNodeId || candidate.hidden) continue;
    const rect = getNodeRect(candidate);
    if (
      x >= rect.x - HIT_MARGIN_PX &&
      x <= rect.x + rect.width + HIT_MARGIN_PX &&
      y >= rect.y - HIT_MARGIN_PX &&
      y <= rect.y + rect.height + HIT_MARGIN_PX
    ) {
      const z = candidate.internals.z ?? 0;
      if (z >= bestZ) {
        bestZ = z;
        bestMatch = candidate;
      }
    }
  }

  return bestMatch;
}

export function FloatingConnectionLine({
  fromNode,
  toX,
  toY,
  toNode,
}: ConnectionLineComponentProps) {
  const nodeLookup = useStore((s) => s.nodeLookup);

  const snappedCard =
    (toNode && toNode.id !== fromNode.id ? toNode : null) ??
    findHoveredTargetNode(nodeLookup, fromNode.id, toX, toY);

  const { sx, sy, tx, ty, sourcePos, targetPos } = snappedCard
    ? getFloatingEdgeParams(fromNode, snappedCard, 4)
    : getFloatingConnectionPreviewParams(fromNode, { x: toX, y: toY }, 2.5);

  const [edgePath] = getBezierPath({
    sourceX: sx,
    sourceY: sy,
    sourcePosition: sourcePos,
    targetX: tx,
    targetY: ty,
    targetPosition: targetPos,
    curvature: 0.28,
  });

  const isLocked = Boolean(snappedCard);
  const strokeColor = isLocked ? "#9dc4b5" : "#efe7da";
  const targetRect = snappedCard ? getNodeRect(snappedCard) : null;

  return (
    <g>
      <GardenArrowMarker
        id={CONNECTING_MARKER_ID}
        color={strokeColor}
        size={15}
        opacity={1}
      />

      {targetRect && (
        <rect
          x={targetRect.x - 3}
          y={targetRect.y - 3}
          width={targetRect.width + 6}
          height={targetRect.height + 6}
          rx={12}
          fill="rgba(124, 154, 142, 0.08)"
          stroke="#9dc4b5"
          strokeWidth={1.6}
          strokeDasharray="6 4"
        />
      )}

      <path
        d={edgePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth={isLocked ? 8 : 6}
        strokeOpacity={isLocked ? 0.24 : 0.14}
        strokeLinecap="round"
      />

      <path
        d={edgePath}
        fill="none"
        className={isLocked ? undefined : "animated"}
        stroke={strokeColor}
        strokeWidth={isLocked ? 2.6 : 2.2}
        strokeLinecap="round"
        markerEnd={`url(#${CONNECTING_MARKER_ID})`}
      />

      {!isLocked && (
        <circle
          cx={tx}
          cy={ty}
          r={6}
          fill="rgba(239, 231, 218, 0.14)"
          stroke="rgba(239, 231, 218, 0.55)"
          strokeWidth={1.25}
        />
      )}
    </g>
  );
}
