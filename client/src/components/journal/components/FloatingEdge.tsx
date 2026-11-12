import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useInternalNode,
  type EdgeProps,
} from "@xyflow/react";
import { getFloatingEdgeParams, getRelationStyle } from "./edgeGeometry";

export interface FloatingEdgeData extends Record<string, unknown> {
  relation?: string;
  status?: string;
  isFocused?: boolean;
  isDimmed?: boolean;
}

export function FloatingEdge({
  id,
  source,
  target,
  markerEnd,
  data,
  selected,
}: EdgeProps) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  if (!sourceNode || !targetNode) {
    return null;
  }

  const edgeData = (data ?? {}) as FloatingEdgeData;
  const relation = edgeData.relation || "relates_to";
  const status = edgeData.status || "accepted";
  const isPending = status === "pending";
  const isFocused = Boolean(edgeData.isFocused || selected);
  const isDimmed = Boolean(edgeData.isDimmed) && !isFocused;

  const { sx, sy, tx, ty, sourcePos, targetPos } = getFloatingEdgeParams(
    sourceNode,
    targetNode,
  );

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX: sx,
    sourceY: sy,
    sourcePosition: sourcePos,
    targetX: tx,
    targetY: ty,
    targetPosition: targetPos,
    curvature: 0.28,
  });

  const relStyle = getRelationStyle(relation);
  const strokeColor = isPending
    ? "#d97757"
    : isFocused
      ? relStyle.focusedStroke
      : relStyle.stroke;

  const showLabel = isFocused || isPending;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: strokeColor,
          strokeWidth: isFocused ? 2.2 : 1.5,
          strokeDasharray: isPending ? "5 4" : undefined,
          opacity: isDimmed ? 0.1 : 1,
          transition: "opacity 180ms ease, stroke 180ms ease, stroke-width 180ms ease",
        }}
      />
      {showLabel && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan"
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: "none",
              padding: "2px 7px",
              borderRadius: "999px",
              background: "rgba(22, 17, 14, 0.9)",
              border: `1px solid ${strokeColor}`,
              color: isPending ? "#f2a488" : "rgba(255, 255, 255, 0.85)",
              fontSize: "10px",
              fontFamily: "var(--font-ui, system-ui, sans-serif)",
              letterSpacing: "0.02em",
              whiteSpace: "nowrap",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.45)",
              zIndex: isFocused ? 12 : 4,
            }}
          >
            {relStyle.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

