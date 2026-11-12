import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useInternalNode,
  type EdgeProps,
} from "@xyflow/react";
import {
  GARDEN_ARROW_MARKER_PATH,
  getFloatingEdgeParams,
  getRelationStyle,
} from "./edgeGeometry";
import styles from "./FloatingEdge.module.css";

export interface FloatingEdgeData extends Record<string, unknown> {
  relation?: string;
  status?: string;
  isFocused?: boolean;
  isDimmed?: boolean;
  isHovered?: boolean;
  onEdgeHoverChange?: (edgeId: string, hovered: boolean) => void;
  onDeleteEdge?: (edgeId: string) => void;
}

export interface GardenArrowMarkerProps {
  id: string;
  color: string;
  size?: number;
  opacity?: number;
}

export function GardenArrowMarker({
  id,
  color,
  size = 12,
  opacity = 1,
}: GardenArrowMarkerProps) {
  return (
    <defs>
      <marker
        id={id}
        viewBox="-14 -8 16 16"
        markerWidth={size}
        markerHeight={size}
        refX="0"
        refY="0"
        orient="auto"
        markerUnits="userSpaceOnUse"
      >
        <path
          d={GARDEN_ARROW_MARKER_PATH}
          fill={color}
          fillOpacity={opacity}
          stroke={color}
          strokeOpacity={opacity}
          strokeWidth="0.9"
          strokeLinejoin="round"
        />
      </marker>
    </defs>
  );
}

export function FloatingEdge({
  id,
  source,
  target,
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
  const isSelected = Boolean(selected);
  const isHovered = Boolean(edgeData.isHovered);
  const isHighlighted = Boolean(edgeData.isFocused || isSelected || isHovered);
  const isDimmed = Boolean(edgeData.isDimmed) && !isHighlighted;

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
    : isHighlighted
      ? relStyle.focusedStroke
      : relStyle.stroke;

  const markerId = `garden-edge-arrow-${id.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
  const markerSize = isSelected ? 15 : isHighlighted ? 14 : 12;
  const effectiveOpacity = isDimmed ? 0.14 : 1;
  const showLabel = isHighlighted || isPending;
  const canDelete = Boolean(edgeData.onDeleteEdge) && (isSelected || isHovered);

  return (
    <>
      <GardenArrowMarker
        id={markerId}
        color={strokeColor}
        size={markerSize}
        opacity={effectiveOpacity}
      />

      {isHighlighted && (
        <path
          d={edgePath}
          fill="none"
          stroke={strokeColor}
          strokeWidth={isSelected ? 8 : 6.5}
          strokeOpacity={isSelected ? 0.24 : 0.16}
          strokeLinecap="round"
          pointerEvents="none"
        />
      )}

      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={`url(#${markerId})`}
        interactionWidth={28}
        style={{
          stroke: strokeColor,
          strokeWidth: isSelected ? 2.8 : isHighlighted ? 2.5 : 1.9,
          strokeLinecap: "round",
          strokeDasharray: isPending ? "5 4" : undefined,
          opacity: effectiveOpacity,
          transition:
            "opacity 180ms ease, stroke 180ms ease, stroke-width 180ms ease",
        }}
      />

      {showLabel && (
        <EdgeLabelRenderer>
          <div
            className={`nodrag nopan ${styles.edgePill} ${
              isSelected ? styles.edgePillSelected : ""
            }`}
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: "all",
              borderColor: strokeColor,
              color: isPending ? "#f2a488" : "rgba(255, 255, 255, 0.9)",
              zIndex: isSelected || isHovered ? 45 : 22,
            }}
            onMouseEnter={() => edgeData.onEdgeHoverChange?.(id, true)}
            onMouseLeave={() => edgeData.onEdgeHoverChange?.(id, false)}
            onClick={(e) => e.stopPropagation()}
          >
            <span className={styles.edgePillLabel}>{relStyle.label}</span>
            {canDelete && (
              <button
                type="button"
                className={styles.deleteEdgeBtn}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  edgeData.onDeleteEdge?.(id);
                }}
                title="Delete connection (Backspace)"
                aria-label="Delete connection"
              >
                ×
              </button>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
