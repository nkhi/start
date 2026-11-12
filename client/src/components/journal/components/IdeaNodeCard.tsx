import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { NodeWithState } from "../../../types";
import { getOpennessColors } from "./nodeTheme";
import styles from "./IdeaNodeCard.module.css";

export interface IdeaNodeData extends Record<string, unknown> {
  item: NodeWithState;
  isSelected?: boolean;
  isDimmed?: boolean;
  isFocused?: boolean;
  isNeighbor?: boolean;
  isCompact?: boolean;
  onEditNode?: (item: NodeWithState) => void;
}

export const IdeaNodeCard = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as unknown as IdeaNodeData;
  const item = nodeData.item;
  const { priority, intensity, openness } = item.state;
  const colors = getOpennessColors(openness);

  const isCompact = Boolean(nodeData.isCompact) && !nodeData.isFocused && !nodeData.isNeighbor;
  const isFocused = Boolean(nodeData.isFocused);
  const isNeighbor = Boolean(nodeData.isNeighbor);
  const isDimmed = Boolean(nodeData.isDimmed) && !isFocused && !isNeighbor;

  // Intensity (1..10) subtly scales font size
  const titleSize = isCompact ? 12 : 13 + Math.min(intensity, 10) * 0.35;
  const isHighPriority = priority >= 8;

  return (
    <div
      className={`${styles.ideaNodeCard} ${selected ? styles.selected : ""} ${
        isHighPriority ? styles.highPriority : ""
      } ${isDimmed ? styles.dimmed : ""} ${isFocused ? styles.focused : ""} ${
        isNeighbor ? styles.neighbor : ""
      } ${isCompact ? styles.compact : ""}`}
      style={{
        backgroundColor: colors.bg,
        borderColor: isFocused || selected ? colors.accent : isNeighbor ? colors.accent : colors.border,
        boxShadow: isFocused
          ? `0 0 0 1px ${colors.accent}, 0 14px 34px rgba(0, 0, 0, 0.65)`
          : isNeighbor
            ? `0 8px 24px rgba(0, 0, 0, 0.55)`
            : undefined,
      }}
    >
      <Handle id="top" type="source" position={Position.Top} className={styles.cardHandle} />
      <Handle id="right" type="source" position={Position.Right} className={styles.cardHandle} />
      <Handle id="bottom" type="source" position={Position.Bottom} className={styles.cardHandle} />
      <Handle id="left" type="source" position={Position.Left} className={styles.cardHandle} />

      {/* Top kind, tags & edit button */}
      <div className={styles.cardTopline}>
        <span className={styles.cardKind} style={{ color: colors.accent }}>
          {item.node.kind}
        </span>
        <div className={styles.cardToplineRight}>
          {!isCompact && item.tags.length > 0 && (
            <div className={styles.cardTags}>
              {item.tags.slice(0, 2).map((t) => (
                <span key={t} className={styles.cardTag}>
                  #{t}
                </span>
              ))}
              {item.tags.length > 2 && (
                <span className={styles.cardTagMore}>+{item.tags.length - 2}</span>
              )}
            </div>
          )}
          {!isCompact && nodeData.onEditNode && (
            <button
              type="button"
              className={`${styles.cardEditBtn} nodrag nopan`}
              onClick={(e) => {
                e.stopPropagation();
                nodeData.onEditNode?.(item);
              }}
              title="Edit thought (or double-click card)"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Node title */}
      <div
        className={`${styles.cardTitle} ${isCompact ? styles.cardTitleCompact : ""}`}
        style={{ fontSize: `${titleSize}px` }}
      >
        {item.node.title}
      </div>

      {/* Optional snippet of body notes */}
      {!isCompact && item.node.body && (
        <div className={styles.cardSnippet}>{item.node.body}</div>
      )}

      {/* Bottom P / I / O rating pills */}
      {!isCompact && (
        <div className={styles.cardFooter}>
          <div className={styles.scoreBadge} title={`Priority: ${priority}/10`}>
            P<strong>{priority}</strong>
          </div>
          <div className={styles.scoreBadge} title={`Intensity: ${intensity}/10`}>
            I<strong>{intensity}</strong>
          </div>
          <div
            className={`${styles.scoreBadge} ${styles.opennessBadge}`}
            style={{ color: colors.accent }}
            title={`Openness: ${openness}/10`}
          >
            O<strong>{openness}</strong>
          </div>
        </div>
      )}
    </div>
  );
});

IdeaNodeCard.displayName = "IdeaNodeCard";
