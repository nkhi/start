import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { NodeWithState } from "../../../types";
import styles from "./IdeaNodeCard.module.css";

export interface IdeaNodeData extends Record<string, unknown> {
  item: NodeWithState;
  isSelected?: boolean;
  isDimmed?: boolean;
}

// Map openness (1..10) to a subtle card background and border tint:
// 1 = cool sage, 10 = warm terracotta
function getOpennessColors(openness: number) {
  const norm = Math.max(0, Math.min(1, (openness - 1) / 9));
  // Cool sage: (124, 154, 142) -> Warm terracotta: (217, 119, 87)
  const r = Math.round(124 + norm * (217 - 124));
  const g = Math.round(154 - norm * (154 - 119));
  const b = Math.round(142 - norm * (142 - 87));

  return {
    bg: `rgba(${r}, ${g}, ${b}, ${0.08 + norm * 0.08})`,
    border: `rgba(${r}, ${g}, ${b}, ${0.35 + norm * 0.25})`,
    accent: `rgb(${r}, ${g}, ${b})`,
  };
}

export const IdeaNodeCard = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as unknown as IdeaNodeData;
  const item = nodeData.item;
  const { priority, intensity, openness } = item.state;
  const colors = getOpennessColors(openness);

  // Intensity (1..10) subtly scales font size and padding
  const titleSize = 13 + Math.min(intensity, 10) * 0.35;
  const isHighPriority = priority >= 8;

  return (
    <div
      className={`${styles.ideaNodeCard} ${selected ? styles.selected : ""} ${
        isHighPriority ? styles.highPriority : ""
      } ${nodeData.isDimmed ? styles.dimmed : ""}`}
      style={{
        backgroundColor: colors.bg,
        borderColor: selected ? colors.accent : colors.border,
        opacity: nodeData.isDimmed ? 0.22 : 1,
        transition: "opacity 160ms ease, border-color 160ms ease",
      }}
    >
      <Handle type="target" position={Position.Top} className={styles.cardHandle} />

      {/* Top kind & tags */}
      <div className={styles.cardTopline}>
        <span className={styles.cardKind} style={{ color: colors.accent }}>
          {item.node.kind}
        </span>
        {item.tags.length > 0 && (
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
      </div>

      {/* Full node text cleanly wrapped */}
      <div
        className={styles.cardTitle}
        style={{ fontSize: `${titleSize}px` }}
      >
        {item.node.title}
      </div>

      {/* Optional snippet of body notes */}
      {item.node.body && (
        <div className={styles.cardSnippet}>{item.node.body}</div>
      )}

      {/* Bottom P / I / O rating pills */}
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

      <Handle type="source" position={Position.Bottom} className={styles.cardHandle} />
    </div>
  );
});

IdeaNodeCard.displayName = "IdeaNodeCard";
