import { useEffect, useState } from "react";
import type { NodeWithState } from "../../../types";
import { setJournalNodeState } from "../../../api/journal";
import { ScoreSlider } from "../components/ScoreSlider";
import styles from "./ReviewModal.module.css";

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  primaryNode: NodeWithState | null;
  connectedNodes: NodeWithState[];
  onComplete: () => void;
}

interface NodeScores {
  priority: number;
  intensity: number;
  openness: number;
}

export function ReviewModal({
  isOpen,
  onClose,
  primaryNode,
  connectedNodes,
  onComplete,
}: ReviewModalProps) {
  // Collect all nodes to review: primary first, followed by connected
  const allNodes: NodeWithState[] = [];
  if (primaryNode) {
    allNodes.push(primaryNode);
  }
  for (const cn of connectedNodes) {
    if (!allNodes.some((n) => n.node.id === cn.node.id)) {
      allNodes.push(cn);
    }
  }

  const [scores, setScores] = useState<Record<string, NodeScores>>({});

  useEffect(() => {
    if (!isOpen) return;
    const initial: Record<string, NodeScores> = {};
    for (const n of allNodes) {
      initial[n.node.id] = {
        priority: n.state.priority,
        intensity: n.state.intensity,
        openness: n.state.openness,
      };
    }
    setScores(initial);
  }, [isOpen, primaryNode?.node.id]);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (!isOpen || allNodes.length === 0) return null;

  const handleSkip = () => {
    setSaveError(null);
    onComplete();
    onClose();
  };

  const updateScore = (
    nodeId: string,
    field: "priority" | "intensity" | "openness",
    val: number,
  ) => {
    setScores((prev) => ({
      ...prev,
      [nodeId]: {
        ...(prev[nodeId] || { priority: 5, intensity: 5, openness: 8 }),
        [field]: val,
      },
    }));
  };

  const handleSaveAll = async () => {
    try {
      setIsSaving(true);
      setSaveError(null);
      for (const n of allNodes) {
        const sc = scores[n.node.id];
        if (sc) {
          await setJournalNodeState(
            n.node.id,
            sc.priority,
            sc.intensity,
            sc.openness,
            "post_session",
          );
        }
      }
      onComplete();
      onClose();
    } catch (err) {
      console.error("Failed to save post-session scores:", err);
      setSaveError(
        err instanceof Error
          ? err.message
          : "Could not save score updates. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.modalBackdrop} onClick={handleSkip}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Post-Session Reflection</h2>
          <button className={styles.closeBtn} onClick={handleSkip} aria-label="Close">
            ✕
          </button>
        </div>

        <p className={styles.modalSubtitle}>
          How do you feel about these questions now that you've put words to them?
        </p>

        <div className={styles.reviewNodesList}>
          {allNodes.map((item, idx) => {
            const sc = scores[item.node.id] || {
              priority: item.state.priority,
              intensity: item.state.intensity,
              openness: item.state.openness,
            };
            const isPrimary = idx === 0;

            return (
              <div key={item.node.id} className={styles.reviewNodeCard}>
                <div className={styles.reviewNodeHeader}>
                  <span className={styles.nodeKindBadge}>{item.node.kind}</span>
                  {isPrimary && <span className={styles.primaryTag}>Primary Topic</span>}
                  <h3>{item.node.title}</h3>
                </div>

                <div className={styles.reviewSliders}>
                  <ScoreSlider
                    label="Priority"
                    value={sc.priority}
                    onChange={(val) => updateScore(item.node.id, "priority", val)}
                    minLabel="1 (Backburner)"
                    maxLabel="10 (Urgent)"
                    color="var(--ink)"
                  />
                  <ScoreSlider
                    label="Intensity"
                    value={sc.intensity}
                    onChange={(val) => updateScore(item.node.id, "intensity", val)}
                    minLabel="1 (Quiet)"
                    maxLabel="10 (Heavy)"
                    color="var(--warm)"
                  />
                  <ScoreSlider
                    label="Openness"
                    value={sc.openness}
                    onChange={(val) => updateScore(item.node.id, "openness", val)}
                    minLabel="1 (Resolved)"
                    maxLabel="10 (Wide Open)"
                    color="var(--accent)"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {saveError && (
          <p className={styles.saveError} role="alert">
            {saveError}
          </p>
        )}

        <div className={styles.modalActions}>
          <button className={styles.btnSecondary} onClick={handleSkip}>
            Skip Check-In
          </button>
          <button
            className={styles.btnPrimary}
            onClick={handleSaveAll}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save Reflection"}
          </button>
        </div>
      </div>
    </div>
  );
}
