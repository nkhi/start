import { useEffect, useState } from "react";
import type { NodeWithState } from "../../../types";
import {
  deleteJournalNode,
  listJournalEntrySummaries,
  setJournalNodeState,
  updateJournalNode,
} from "../../../api/journal";
import { THOUGHT_KINDS } from "../utils/nodeTheme";
import { ThoughtScoreSliders } from "./ScoreSlider";
import styles from "./NodePopover.module.css";

interface NodePopoverProps {
  nodeWithState: NodeWithState | null;
  onClose: () => void;
  onNodeUpdated: () => void;
}

export function NodePopover({
  nodeWithState,
  onClose,
  onNodeUpdated,
}: NodePopoverProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState("question");
  const [tagsInput, setTagsInput] = useState("");
  const [priority, setPriority] = useState(5);
  const [intensity, setIntensity] = useState(5);
  const [openness, setOpenness] = useState(8);
  const [isSaving, setIsSaving] = useState(false);
  const [linkedCount, setLinkedCount] = useState(0);

  useEffect(() => {
    if (!nodeWithState) return;
    setTitle(nodeWithState.node.title);
    setBody(nodeWithState.node.body || "");
    setKind(nodeWithState.node.kind);
    setTagsInput(nodeWithState.tags.join(", "));
    setPriority(nodeWithState.state.priority);
    setIntensity(nodeWithState.state.intensity);
    setOpenness(nodeWithState.state.openness);

    listJournalEntrySummaries()
      .then((summaries) => {
        if (!Array.isArray(summaries)) {
          setLinkedCount(0);
          return;
        }
        const count = summaries.filter(
          (s) =>
            s?.primary_node?.node?.id === nodeWithState.node.id ||
            s?.mentioned_nodes?.some((m) => m?.node?.id === nodeWithState.node.id),
        ).length;
        setLinkedCount(count);
      })
      .catch(() => setLinkedCount(0));
  }, [nodeWithState]);

  if (!nodeWithState) return null;

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const parsedTags = tagsInput
        .split(",")
        .map((t) => t.trim().replace(/^#/, ""))
        .filter(Boolean);

      await updateJournalNode(nodeWithState.node.id, {
        title: title.trim(),
        body: body.trim() ? body.trim() : null,
        kind,
        tags: parsedTags,
      });
      await setJournalNodeState(
        nodeWithState.node.id,
        priority,
        intensity,
        openness,
        "manual",
      );
      onNodeUpdated();
      onClose();
    } catch (err) {
      console.error("Failed to update node:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this question from your garden?")) {
      return;
    }
    try {
      await deleteJournalNode(nodeWithState.node.id);
      onNodeUpdated();
      onClose();
    } catch (err) {
      console.error("Failed to delete node:", err);
    }
  };

  return (
    <div className={styles.nodePopoverOverlay} onClick={onClose}>
      <div
        className={styles.nodePopoverPanel}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.popoverHeader}>
          <div className={styles.popoverHeaderLeft}>
            <span className={styles.popoverKindLabel}>Edit Garden Thought</span>
            {linkedCount > 0 && (
              <span className={styles.popoverEntriesBadge} title="Saved reflections linked to this thought">
                📄 {linkedCount} {linkedCount === 1 ? "reflection" : "reflections"}
              </span>
            )}
          </div>
          <button className={styles.popoverCloseBtn} onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className={styles.popoverField}>
          <label className={styles.popoverLabel}>Prompt / Question</label>
          <textarea
            className={styles.popoverTitleInput}
            rows={2}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What is your question or thought?"
          />
        </div>

        <div className={styles.popoverRow}>
          <div className={`${styles.popoverField} ${styles.flex1}`}>
            <label className={styles.popoverLabel}>Type</label>
            <select
              className={styles.popoverSelect}
              value={kind}
              onChange={(e) => setKind(e.target.value)}
            >
              {THOUGHT_KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>

          <div className={`${styles.popoverField} ${styles.flex2}`}>
            <label className={styles.popoverLabel}>Tags (comma-separated)</label>
            <input
              type="text"
              className={styles.popoverInput}
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="work, health..."
            />
          </div>
        </div>

        <div className={styles.popoverField}>
          <label className={styles.popoverLabel}>Context Notes (optional)</label>
          <textarea
            className={styles.popoverTextarea}
            rows={2}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Add background context or why this matters..."
          />
        </div>

        <div className={styles.popoverSlidersBox}>
          <ThoughtScoreSliders
            scores={{ priority, intensity, openness }}
            onChange={(field, val) => {
              if (field === "priority") setPriority(val);
              else if (field === "intensity") setIntensity(val);
              else setOpenness(val);
            }}
          />
        </div>

        <div className={styles.popoverActions}>
          <button className={styles.popoverBtnDelete} onClick={handleDelete}>
            Delete
          </button>
          <div className={styles.popoverActionsRight}>
            <button className={styles.popoverBtnCancel} onClick={onClose}>
              Cancel
            </button>
            <button
              className={styles.popoverBtnSave}
              onClick={handleSave}
              disabled={isSaving || !title.trim()}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
