import { useEffect, useState } from "react";
import type { SeedEdge } from "../../../types";
import { commitJournalBatch, parseJournalSeed } from "../../../api/journal";
import { ScoreSlider } from "./ScoreSlider";
import styles from "./NewNodeModal.module.css";

interface NewNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  initialMode?: "list" | "outline";
}

export interface DraftThought {
  tempId: string;
  title: string;
  body: string;
  kind: string;
  tags: string[];
  priority: number;
  intensity: number;
  openness: number;
  originalTitle?: string;
}

const KINDS = ["question", "idea", "phrase", "person", "area", "thought"];

const DEFAULT_OUTLINE = `- What do I actually want from my career? {p:9 i:7 o:10} #work
  - Am I staying for money or meaning?
  - Fear of disappointing [[Dad]]
- Relationship with Dad {p:8 i:9 o:8} #family #person
- "I'm always behind" #phrase`;

/**
 * Parses inline tags (#tag) and optional score notation {p:9 i:7 o:8}
 * from a quick single-line thought string.
 */
function parseQuickThought(rawText: string): DraftThought {
  const text = rawText.trim();
  const tags: string[] = [];

  // Extract tags: #tag
  const tagMatches = text.match(/#([a-zA-Z0-9_\-]+)/g);
  if (tagMatches) {
    for (const m of tagMatches) {
      const cleanTag = m.replace(/^#/, "").trim();
      if (cleanTag && !tags.includes(cleanTag)) {
        tags.push(cleanTag);
      }
    }
  }

  // Extract scores: {p:8 i:7 o:9}
  let priority = 6;
  let intensity = 5;
  let openness = 8;
  const scoreMatch = text.match(/\{([^}]+)\}/);
  if (scoreMatch) {
    const pM = scoreMatch[1].match(/p:(\d+)/i);
    const iM = scoreMatch[1].match(/i:(\d+)/i);
    const oM = scoreMatch[1].match(/o:(\d+)/i);
    if (pM) priority = Math.min(10, Math.max(1, parseInt(pM[1], 10)));
    if (iM) intensity = Math.min(10, Math.max(1, parseInt(iM[1], 10)));
    if (oM) openness = Math.min(10, Math.max(1, parseInt(oM[1], 10)));
  }

  // Clean title
  let cleanTitle = text
    .replace(/\{[^}]+\}/g, "")
    .replace(/#([a-zA-Z0-9_\-]+)/g, "")
    .replace(/^-\s*/, "")
    .trim();

  // If empty after stripping, fall back to raw
  if (!cleanTitle) cleanTitle = text;

  const kind = cleanTitle.endsWith("?") ? "question" : "thought";

  return {
    tempId: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: cleanTitle,
    body: "",
    kind,
    tags,
    priority,
    intensity,
    openness,
    originalTitle: cleanTitle,
  };
}

export function NewNodeModal({
  isOpen,
  onClose,
  onCreated,
  initialMode = "list",
}: NewNodeModalProps) {
  // Stage 1: Add Thoughts | Stage 2: Tune Dials
  const [stage, setStage] = useState<1 | 2>(1);
  const [inputMode, setInputMode] = useState<"list" | "outline">(initialMode);

  // Stage 1 states
  const [quickInput, setQuickInput] = useState("");
  const [thoughts, setThoughts] = useState<DraftThought[]>([]);
  const [outlineText, setOutlineText] = useState(DEFAULT_OUTLINE);
  const [parsedEdges, setParsedEdges] = useState<SeedEdge[]>([]);

  // Stage 2 states
  const [activeIndex, setActiveIndex] = useState(0);

  // Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset when opening
  useEffect(() => {
    if (isOpen) {
      setStage(1);
      setInputMode(initialMode);
      setQuickInput("");
      setThoughts([]);
      setError(null);
      setIsSubmitting(false);
      setActiveIndex(0);
      setParsedEdges([]);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  // Add thought in quick list
  const handleAddQuick = () => {
    if (!quickInput.trim()) return;
    const item = parseQuickThought(quickInput);
    setThoughts((prev) => [...prev, item]);
    setQuickInput("");
  };

  const handleRemoveThought = (tempId: string) => {
    setThoughts((prev) => prev.filter((t) => t.tempId !== tempId));
  };

  // Move from Stage 1 to Stage 2
  const handleProceedToStage2 = async () => {
    setError(null);

    if (inputMode === "outline") {
      if (!outlineText.trim()) {
        setError("Please enter or paste an outline to seed.");
        return;
      }
      try {
        setIsSubmitting(true);
        const parsed = await parseJournalSeed(outlineText);
        if (!parsed.nodes || parsed.nodes.length === 0) {
          setError("No thoughts could be detected in this outline.");
          setIsSubmitting(false);
          return;
        }

        const draftItems: DraftThought[] = parsed.nodes.map((sn, idx) => ({
          tempId: sn.temp_id || `draft-seed-${idx}-${Date.now()}`,
          title: sn.title,
          body: "",
          kind: sn.kind || (sn.title.endsWith("?") ? "question" : "thought"),
          tags: sn.tags || [],
          priority: sn.priority ?? 6,
          intensity: sn.intensity ?? 5,
          openness: sn.openness ?? 8,
          originalTitle: sn.title,
        }));

        setThoughts(draftItems);
        setParsedEdges(parsed.edges || []);
        setActiveIndex(0);
        setStage(2);
      } catch (err: any) {
        setError(err?.toString() || "Failed to parse outline");
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // List mode: if user typed something but didn't hit Add, include it
      let finalThoughts = [...thoughts];
      if (quickInput.trim()) {
        const item = parseQuickThought(quickInput);
        finalThoughts.push(item);
        setThoughts(finalThoughts);
        setQuickInput("");
      }

      if (finalThoughts.length === 0) {
        setError("Please add at least one question or thought.");
        return;
      }

      setActiveIndex(0);
      setStage(2);
    }
  };

  // Quick plant directly from Stage 1 with default dials
  const handleQuickPlant = async () => {
    let finalThoughts = [...thoughts];
    if (quickInput.trim()) {
      const item = parseQuickThought(quickInput);
      finalThoughts.push(item);
    }

    if (finalThoughts.length === 0) {
      setError("Please add at least one question or thought.");
      return;
    }

    await commitThoughts(finalThoughts, []);
  };

  // Update current active thought in Stage 2
  const updateActiveThought = (updates: Partial<DraftThought>) => {
    setThoughts((prev) =>
      prev.map((item, idx) => (idx === activeIndex ? { ...item, ...updates } : item)),
    );
  };

  // Commit all thoughts to database atomically via batch endpoint
  const commitThoughts = async (
    itemsToCommit: DraftThought[],
    edgesToCommit: SeedEdge[],
  ) => {
    try {
      setIsSubmitting(true);
      setError(null);

      await commitJournalBatch({
        nodes: itemsToCommit.map((t) => ({
          temp_id: t.tempId,
          title: t.title.trim(),
          body: t.body.trim() ? t.body.trim() : undefined,
          kind: t.kind,
          priority: t.priority,
          intensity: t.intensity,
          openness: t.openness,
          tags: t.tags,
          original_title: t.originalTitle,
        })),
        edges: edgesToCommit.map((e) => ({
          src_title: e.src_title,
          dst_title: e.dst_title,
          relation: e.relation,
        })),
      });

      onCreated();
      onClose();
    } catch (err: any) {
      setError(err?.toString() || "Failed to commit garden thoughts");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePlantFromStage2 = () => {
    commitThoughts(thoughts, parsedEdges);
  };

  const activeThought = thoughts[activeIndex] || null;

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div
        className={`${styles.modalCard} ${styles.addThoughtCard}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={styles.modalHeader}>
          <h2>{stage === 1 ? "Add to Garden" : "Tune Garden Dials"}</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Stepper Navigation */}
        <div className={styles.modalStepper}>
          <div
            className={`${styles.modalStepBadge} ${stage === 1 ? styles.activeStep : styles.completedStep}`}
            onClick={() => stage === 2 && setStage(1)}
            style={{ cursor: stage === 2 ? "pointer" : "default" }}
            title={stage === 2 ? "Click to return to Stage 1" : undefined}
          >
            <span>1</span> Add Thoughts
          </div>
          <span className={styles.modalStepArrow}>→</span>
          <div className={`${styles.modalStepBadge} ${stage === 2 ? styles.activeStep : ""}`}>
            <span>2</span> Tune Dials & Details
          </div>
        </div>

        {/* STAGE 1: Add Thoughts */}
        {stage === 1 && (
          <div className={styles.modalStageBody}>
            <p className={styles.modalSubtitle}>
              Add thoughts individually or paste an outline. In the next step, you can fine-tune
              the dials, tags, and type for each one.
            </p>

            {/* Input Mode Toggle */}
            <div className={styles.modalTabBar}>
              <button
                type="button"
                className={`${styles.modalTabBtn} ${inputMode === "list" ? styles.activeTab : ""}`}
                onClick={() => setInputMode("list")}
              >
                Quick List
              </button>
              <button
                type="button"
                className={`${styles.modalTabBtn} ${inputMode === "outline" ? styles.activeTab : ""}`}
                onClick={() => setInputMode("outline")}
              >
                Outline & Seed
              </button>
            </div>

            {inputMode === "list" ? (
              <div className={styles.stage1ListContainer}>
                <div className={styles.stage1InputRow}>
                  <input
                    type="text"
                    className={styles.stage1Input}
                    value={quickInput}
                    onChange={(e) => setQuickInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddQuick();
                      }
                    }}
                    placeholder="Type a thought (e.g. What do I want from work? #career)..."
                    autoFocus
                  />
                  <button
                    type="button"
                    className={styles.btnAddItem}
                    onClick={handleAddQuick}
                    disabled={!quickInput.trim()}
                  >
                    + Add
                  </button>
                </div>

                <div className={styles.stage1Hint}>
                  Tip: Press <strong>Enter</strong> to quickly add multiple thoughts to your queue.
                  Tags like <code>#work</code> and dials like <code>&#123;p:8&#125;</code> are auto-detected.
                </div>

                {thoughts.length > 0 && (
                  <div className={styles.draftThoughtsList}>
                    {thoughts.map((t, idx) => (
                      <div key={t.tempId} className={styles.draftThoughtItem}>
                        <span className={styles.draftThoughtNum}>{idx + 1}.</span>
                        <span className={styles.draftThoughtTitle}>{t.title}</span>
                        <div className={styles.draftThoughtMeta}>
                          {t.tags.length > 0 && (
                            <span className={styles.draftTagChip}>
                              #{t.tags.join(" #")}
                            </span>
                          )}
                          <span className={styles.draftScoreChip}>
                            P:{t.priority} I:{t.intensity} O:{t.openness}
                          </span>
                          <button
                            type="button"
                            className={styles.btnRemoveThought}
                            onClick={() => handleRemoveThought(t.tempId)}
                            title="Remove thought"
                            aria-label="Remove"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.stage1OutlineContainer}>
                <textarea
                  className={styles.seedTextarea}
                  value={outlineText}
                  onChange={(e) => setOutlineText(e.target.value)}
                  placeholder="- Type or paste your outline here..."
                  rows={8}
                  autoFocus
                />
                <div className={styles.stage1Hint} style={{ marginTop: 8 }}>
                  Indentation connects sub-topics. <code>[[wikilinks]]</code> create relations,
                  and <code>&#123;p:9 i:7 o:10&#125;</code> presets Priority, Intensity, and Openness.
                </div>
              </div>
            )}

            {error && <div className={styles.modalError}>{error}</div>}

            {/* Stage 1 Actions */}
            <div className={styles.modalActions}>
              <button type="button" className={styles.btnSecondary} onClick={onClose}>
                Cancel
              </button>

              {inputMode === "list" && (thoughts.length > 0 || quickInput.trim().length > 0) && (
                <button
                  type="button"
                  className={`${styles.btnSecondary} ${styles.btnQuickPlant}`}
                  onClick={handleQuickPlant}
                  disabled={isSubmitting}
                  title="Plant immediately with standard scores"
                >
                  Quick Plant
                </button>
              )}

              <button
                type="button"
                className={styles.btnPrimary}
                onClick={handleProceedToStage2}
                disabled={
                  isSubmitting ||
                  (inputMode === "list" && thoughts.length === 0 && !quickInput.trim()) ||
                  (inputMode === "outline" && !outlineText.trim())
                }
              >
                {isSubmitting
                  ? "Parsing..."
                  : `Next: Tune Dials (${
                      inputMode === "list"
                        ? thoughts.length + (quickInput.trim() ? 1 : 0)
                        : "Review"
                    }) →`}
              </button>
            </div>
          </div>
        )}

        {/* STAGE 2: Tune Dials for Each Thought */}
        {stage === 2 && activeThought && (
          <div className={styles.modalStageBody}>
            {/* Thought Selector / Stepper */}
            <div className={styles.stage2NavHeader}>
              <div className={styles.stage2PillsBar}>
                {thoughts.map((t, idx) => (
                  <button
                    key={t.tempId}
                    type="button"
                    className={`${styles.stage2Pill} ${idx === activeIndex ? styles.activePill : ""}`}
                    onClick={() => setActiveIndex(idx)}
                    title={t.title}
                  >
                    {idx + 1}. {t.title.length > 20 ? t.title.slice(0, 18) + "…" : t.title}
                  </button>
                ))}
              </div>

              <div className={styles.stage2StepCounter}>
                <span>
                  {activeIndex + 1} of {thoughts.length}
                </span>
                <button
                  type="button"
                  className={styles.stage2ArrowBtn}
                  onClick={() => setActiveIndex((prev) => Math.max(0, prev - 1))}
                  disabled={activeIndex === 0}
                  title="Previous thought"
                  aria-label="Previous"
                >
                  ‹
                </button>
                <button
                  type="button"
                  className={styles.stage2ArrowBtn}
                  onClick={() =>
                    setActiveIndex((prev) => Math.min(thoughts.length - 1, prev + 1))
                  }
                  disabled={activeIndex === thoughts.length - 1}
                  title="Next thought"
                  aria-label="Next"
                >
                  ›
                </button>
              </div>
            </div>

            {/* Active Thought Configuration Fields */}
            <div className={styles.stage2EditorBox}>
              <div className={styles.modalField}>
                <label className={styles.modalLabel}>Question / Thought</label>
                <textarea
                  className={styles.modalTitleInput}
                  rows={2}
                  value={activeThought.title}
                  onChange={(e) => updateActiveThought({ title: e.target.value })}
                  placeholder="e.g. What do I actually want from work?"
                  autoFocus
                />
              </div>

              <div className={styles.modalRow}>
                <div className={`${styles.modalField} ${styles.flex1}`}>
                  <label className={styles.modalLabel}>Type</label>
                  <select
                    className={styles.modalSelect}
                    value={activeThought.kind}
                    onChange={(e) => updateActiveThought({ kind: e.target.value })}
                  >
                    {KINDS.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={`${styles.modalField} ${styles.flex2}`}>
                  <label className={styles.modalLabel}>Tags (comma-separated)</label>
                  <input
                    type="text"
                    className={styles.modalInput}
                    value={activeThought.tags.join(", ")}
                    onChange={(e) =>
                      updateActiveThought({
                        tags: e.target.value
                            .split(",")
                            .map((t) => t.trim().replace(/^#/, ""))
                            .filter((t) => t.length > 0),
                      })
                    }
                    placeholder="career, purpose"
                  />
                </div>
              </div>

              <div className={styles.modalField}>
                <label className={styles.modalLabel}>Context Notes (optional)</label>
                <textarea
                  className={styles.modalTextarea}
                  rows={2}
                  value={activeThought.body}
                  onChange={(e) => updateActiveThought({ body: e.target.value })}
                  placeholder="Any background notes, triggers, or questions to hold..."
                />
              </div>

              <div className={styles.modalSlidersBox}>
                <ScoreSlider
                  label="Priority"
                  value={activeThought.priority}
                  onChange={(val) => updateActiveThought({ priority: val })}
                  minLabel="1 (Backburner)"
                  maxLabel="10 (Urgent)"
                  color="var(--ink)"
                />
                <ScoreSlider
                  label="Intensity"
                  value={activeThought.intensity}
                  onChange={(val) => updateActiveThought({ intensity: val })}
                  minLabel="1 (Quiet)"
                  maxLabel="10 (Heavy)"
                  color="var(--warm)"
                />
                <ScoreSlider
                  label="Openness"
                  value={activeThought.openness}
                  onChange={(val) => updateActiveThought({ openness: val })}
                  minLabel="1 (Resolved)"
                  maxLabel="10 (Wide Open)"
                  color="var(--accent)"
                />
              </div>
            </div>

            {error && <div className={styles.modalError}>{error}</div>}

            {/* Stage 2 Actions */}
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => setStage(1)}
              >
                ← Back to Thoughts
              </button>

              {activeIndex < thoughts.length - 1 ? (
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setActiveIndex((prev) => prev + 1)}
                >
                  Next Thought →
                </button>
              ) : null}

              <button
                type="button"
                className={styles.btnPrimary}
                onClick={handlePlantFromStage2}
                disabled={isSubmitting || thoughts.length === 0}
              >
                {isSubmitting
                  ? "Planting..."
                  : `Plant ${thoughts.length === 1 ? "Thought" : `${thoughts.length} Thoughts`} into Garden`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
