import { useEffect, useState } from "react";
import type { NodeWithState } from "../../../types";
import { setJournalNodeState } from "../../../api/journal";
import { useJournal } from "../JournalContext";
import { ThoughtScoreSliders, type ThoughtScores } from "./ScoreSlider";
import styles from "./ReviewModal.module.css";

export function ReviewModal() {
  const {
    isReviewOpen: isOpen,
    closeReview: onClose,
    activeNode: primaryNode,
    connectedNodes,
    completeReview,
  } = useJournal();

  const allNodes: NodeWithState[] = [];
  if (primaryNode) {
    allNodes.push(primaryNode);
  }
  for (const cn of connectedNodes) {
    if (!allNodes.some((n) => n.node.id === cn.node.id)) {
      allNodes.push(cn);
    }
  }

  const [scores, setScores] = useState<Record<string, ThoughtScores>>({});

  useEffect(() => {
    if (!isOpen) return;
    const initial: Record<string, ThoughtScores> = {};
    if (primaryNode) {
      initial[primaryNode.node.id] = {
        priority: primaryNode.state.priority,
        intensity: primaryNode.state.intensity,
        openness: primaryNode.state.openness,
      };
    }
    for (const cn of connectedNodes) {
      if (!initial[cn.node.id]) {
        initial[cn.node.id] = {
          priority: cn.state.priority,
          intensity: cn.state.intensity,
          openness: cn.state.openness,
        };
      }
    }
    setScores(initial);
  }, [isOpen, primaryNode, connectedNodes]);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (!isOpen || allNodes.length === 0) return null;

  const handleSkip = () => {
    setSaveError(null);
    void completeReview();
    onClose();
  };

  const updateScore = (
    nodeId: string,
    field: keyof ThoughtScores,
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
      void completeReview();
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
                  <ThoughtScoreSliders
                    scores={sc}
                    onChange={(field, val) => updateScore(item.node.id, field, val)}
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
