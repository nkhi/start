import { useEffect, useRef, useState, useCallback } from "react";
import { CheckIcon, CircleNotchIcon, FileDashedIcon } from "@phosphor-icons/react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type {
  Breakdown,
  Entry,
  EntrySummary,
  NodeWithState,
} from "../../../types";
import {
  listJournalEntrySummaries,
  saveJournalEntry,
} from "../../../api/journal";
import { DocumentLibrary } from "./DocumentLibrary";
import styles from "./Slate.module.css";

export interface SlateActions {
  toggleLibrary: () => void;
  startNewReflection: () => void;
  backToLibrary: () => void;
}

interface SlateProps {
  activeNode: NodeWithState | null;
  breakdown: Breakdown | null;
  sessionKey?: number;
  searchQuery?: string;
  onFinishWriting: (entry: Entry) => void;
  actionsRef?: React.MutableRefObject<SlateActions | null>;
  onViewModeChange?: (mode: "editor" | "library") => void;
  onViewingArchivedChange?: (isArchived: boolean) => void;
  onVisibleTopicChange?: (nodeId: string | null) => void;
}

export function Slate({
  activeNode,
  breakdown,
  sessionKey,
  searchQuery = "",
  onFinishWriting,
  actionsRef,
  onViewModeChange,
  onViewingArchivedChange,
  onVisibleTopicChange,
}: SlateProps) {
  const [viewMode, setViewMode] = useState<"editor" | "library">("editor");
  const [summaries, setSummaries] = useState<EntrySummary[]>([]);
  const [editingSummary, setEditingSummary] = useState<EntrySummary | null>(null);

  useEffect(() => {
    onViewModeChange?.(viewMode);
  }, [viewMode, onViewModeChange]);

  useEffect(() => {
    onViewingArchivedChange?.(Boolean(editingSummary));
  }, [editingSummary, onViewingArchivedChange]);

  const visibleTopicId =
    viewMode === "editor"
      ? editingSummary
        ? (editingSummary.primary_node?.node.id ?? null)
        : (activeNode?.node.id ?? null)
      : null;

  useEffect(() => {
    onVisibleTopicChange?.(visibleTopicId);
  }, [visibleTopicId, onVisibleTopicChange]);

  const [entryId, setEntryId] = useState<string>(() => "entry-" + crypto.randomUUID());
  const [wordCount, setWordCount] = useState(0);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">(
    "saved",
  );

  const entryIdRef = useRef(entryId);
  entryIdRef.current = entryId;

  const editingSummaryRef = useRef(editingSummary);
  editingSummaryRef.current = editingSummary;

  const activeNodeRef = useRef(activeNode);
  activeNodeRef.current = activeNode;

  const autosaveTimeout = useRef<number | null>(null);
  const isProgrammaticRef = useRef(false);

  // Fetch summaries from DB
  const refreshSummaries = useCallback(async () => {
    try {
      const list = await listJournalEntrySummaries(100);
      setSummaries(Array.isArray(list) ? list : []);
    } catch (err) {
      console.warn("Could not load entry summaries:", err);
      setSummaries([]);
    }
  }, []);

  useEffect(() => {
    refreshSummaries();
  }, [refreshSummaries]);

  const editor = useEditor({
    extensions: [StarterKit],
    content: "<p></p>",
    editorProps: {
      attributes: {
        class: "slate-editor-content",
        placeholder: "Start reflecting here...",
      },
    },
    onUpdate: ({ editor }) => {
      // Programmatic clear or setContent must never trigger autosave
      if (isProgrammaticRef.current) return;

      const text = editor.getText();
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      setWordCount(words);

      // Do not autosave empty draft for a new reflection session
      if (!editingSummaryRef.current && !text.trim()) {
        setSaveStatus("saved");
        if (autosaveTimeout.current) {
          window.clearTimeout(autosaveTimeout.current);
          autosaveTimeout.current = null;
        }
        return;
      }

      setSaveStatus("unsaved");

      if (autosaveTimeout.current) {
        window.clearTimeout(autosaveTimeout.current);
      }

      const targetEntryId = editingSummaryRef.current
        ? editingSummaryRef.current.entry.id
        : entryIdRef.current;
      const targetPrimaryId = editingSummaryRef.current
        ? editingSummaryRef.current.primary_node?.node.id
        : activeNodeRef.current?.node.id;

      autosaveTimeout.current = window.setTimeout(async () => {
        // Guard against race conditions if session or document changed while debouncing
        const currentTargetId = editingSummaryRef.current
          ? editingSummaryRef.current.entry.id
          : entryIdRef.current;
        if (currentTargetId !== targetEntryId) {
          return;
        }

        setSaveStatus("saving");
        try {
          await saveJournalEntry({
            id: targetEntryId,
            doc_json: JSON.stringify(editor.getJSON()),
            plain_text: text,
            primary_node_id: targetPrimaryId,
            word_count: words,
          });
          setSaveStatus("saved");
          refreshSummaries();
        } catch (e) {
          console.error("Autosave failed:", e);
          setSaveStatus("unsaved");
        }
      }, 2000);
    },
  });

  // When active topic changes or sessionKey advances, start a fresh reflection session
  useEffect(() => {
    if (!editor) return;
    // If user is currently viewing an archived entry from the library, do not interrupt unless sessionKey changed
    if (editingSummaryRef.current && sessionKey === undefined) return;

    if (autosaveTimeout.current) {
      window.clearTimeout(autosaveTimeout.current);
      autosaveTimeout.current = null;
    }

    setEditingSummary(null);
    editingSummaryRef.current = null;

    const newId = "entry-" + crypto.randomUUID();
    setEntryId(newId);
    entryIdRef.current = newId;

    isProgrammaticRef.current = true;
    editor.commands.clearContent(false);
    isProgrammaticRef.current = false;

    setWordCount(0);
    setSaveStatus("saved");
    refreshSummaries();
  }, [activeNode?.node.id, sessionKey, editor, refreshSummaries]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (autosaveTimeout.current) {
        window.clearTimeout(autosaveTimeout.current);
        autosaveTimeout.current = null;
      }
    };
  }, []);

  // When user clicks a sheet of paper from the library
  const handleSelectEntry = (summary: EntrySummary) => {
    if (autosaveTimeout.current) {
      window.clearTimeout(autosaveTimeout.current);
      autosaveTimeout.current = null;
    }

    setEditingSummary(summary);
    editingSummaryRef.current = summary;
    setViewMode("editor");

    if (editor) {
      isProgrammaticRef.current = true;
      try {
        const json =
          typeof summary.entry.doc_json === "string"
            ? JSON.parse(summary.entry.doc_json)
            : summary.entry.doc_json;
        editor.commands.setContent(json, { emitUpdate: false });
      } catch {
        editor.commands.setContent(`<p>${summary.entry.plain_text || ""}</p>`, {
          emitUpdate: false,
        });
      }
      isProgrammaticRef.current = false;

      setWordCount(summary.entry.word_count || 0);
      setSaveStatus("saved");
    }
  };

  // Start a fresh reflection session on current algorithmic suggestion
  const handleStartNewReflection = () => {
    if (autosaveTimeout.current) {
      window.clearTimeout(autosaveTimeout.current);
      autosaveTimeout.current = null;
    }

    setEditingSummary(null);
    editingSummaryRef.current = null;
    setViewMode("editor");

    const newId = "entry-" + crypto.randomUUID();
    setEntryId(newId);
    entryIdRef.current = newId;

    if (editor) {
      isProgrammaticRef.current = true;
      editor.commands.clearContent(false);
      isProgrammaticRef.current = false;

      setWordCount(0);
      setSaveStatus("saved");
    }
  };

  // Returning to library from viewing an archived document
  const handleBackToLibrary = () => {
    if (autosaveTimeout.current) {
      window.clearTimeout(autosaveTimeout.current);
      autosaveTimeout.current = null;
    }
    setEditingSummary(null);
    editingSummaryRef.current = null;
    refreshSummaries();
    setViewMode("library");
  };

  // Toggle between Library and Editor
  const handleToggleLibrary = () => {
    if (viewMode === "editor") {
      refreshSummaries();
      setViewMode("library");
    } else {
      setViewMode("editor");
    }
  };

  // Done reflecting on the active topic OR Save & Close archived document
  const handleDone = async () => {
    if (!editor) return;
    const text = editor.getText();
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;

    if (autosaveTimeout.current) {
      window.clearTimeout(autosaveTimeout.current);
      autosaveTimeout.current = null;
    }

    if (editingSummaryRef.current) {
      try {
        setSaveStatus("saving");
        await saveJournalEntry({
          id: editingSummaryRef.current.entry.id,
          doc_json: JSON.stringify(editor.getJSON()),
          plain_text: text,
          primary_node_id: editingSummaryRef.current.primary_node?.node.id,
          word_count: words,
        });
        setSaveStatus("saved");
        await refreshSummaries();
        setEditingSummary(null);
        editingSummaryRef.current = null;
        setViewMode("library");
      } catch (e) {
        console.error("Failed to save edited entry:", e);
        setSaveStatus("unsaved");
      }
      return;
    }

    try {
      setSaveStatus("saving");
      const saved = await saveJournalEntry({
        id: entryIdRef.current,
        doc_json: JSON.stringify(editor.getJSON()),
        plain_text: text,
        primary_node_id: activeNodeRef.current?.node.id,
        word_count: words,
      });
      setSaveStatus("saved");
      await refreshSummaries();
      onFinishWriting(saved);
    } catch (e) {
      console.error("Failed to save entry on done:", e);
      setSaveStatus("unsaved");
    }
  };

  const whisper = editingSummary
    ? `ARCHIVED REFLECTION · BACKLINKED TO GARDEN`
    : breakdown?.why_summary
      ? `SUGGESTED TOPIC · ${breakdown.why_summary}`
      : "TODAY'S SOUNDING BOARD";

  const displayTitle = editingSummary
    ? editingSummary.primary_node?.node.title || "Reflective Journal"
    : activeNode
      ? activeNode.node.title
      : "What's still open for you?";

  const displayTags = editingSummary
    ? editingSummary.primary_node?.tags || []
    : activeNode?.tags || [];

  // Exclude the document currently open/working on in the Slate from the past documents library
  const currentDocId = editingSummary ? editingSummary.entry.id : entryId;
  const pastSummaries = (summaries || []).filter(
    (item) => item?.entry?.id && item.entry.id !== currentDocId,
  );

  useEffect(() => {
    if (actionsRef) {
      actionsRef.current = {
        toggleLibrary: handleToggleLibrary,
        startNewReflection: handleStartNewReflection,
        backToLibrary: handleBackToLibrary,
      };
    }
  });

  return (
    <div className={styles.slateRoot}>
      {/* Main View: Either Document Library or TipTap Editor */}
      {viewMode === "library" ? (
        <DocumentLibrary
          summaries={pastSummaries}
          searchQuery={searchQuery}
          onSelectEntry={handleSelectEntry}
          onNewReflection={handleStartNewReflection}
        />
      ) : (
        <div className={styles.slateEditorView}>
          {/* Header Section */}
          <div className={styles.slateTopHeader}>
            <div className={styles.slateWhisperRow}>
              <span className={styles.whisperHeader}>{whisper}</span>
              {editingSummary && (
                <button
                  className={styles.btnSkipTopic}
                  onClick={handleBackToLibrary}
                  title="Back to library grid"
                >
                  ← All Documents
                </button>
              )}
            </div>

            {/* Topic Title Prompt */}
            <h1 className={styles.slateTopicTitle}>{displayTitle}</h1>

            {displayTags.length > 0 && (
              <div className={styles.slateTags}>
                {displayTags.map((t) => (
                  <span key={t} className={styles.slateTag}>
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Scrollable TipTap Editor Area */}
          <div className={styles.slateEditorContainer}>
            <EditorContent editor={editor} />
          </div>

          {/* Permanently Pinned Bottom Slate Bar */}
          <footer className={styles.slateFooterBar}>
            <div className={styles.slateMeta}>
              <span className={styles.wordCountLabel}>{wordCount} words</span>
              <span
                className={styles.saveStatusIcon}
                data-status={saveStatus}
                title={
                  saveStatus === "saving"
                    ? "Saving..."
                    : saveStatus === "saved"
                      ? "Saved"
                      : "Draft"
                }
                aria-label={
                  saveStatus === "saving"
                    ? "Saving"
                    : saveStatus === "saved"
                      ? "Saved"
                      : "Draft"
                }
              >
                {saveStatus === "saving" ? (
                  <CircleNotchIcon size={14} weight="bold" className={styles.spinIcon} />
                ) : saveStatus === "saved" ? (
                  <CheckIcon size={14} weight="bold" />
                ) : (
                  <FileDashedIcon size={14} />
                )}
              </span>
            </div>

            <button
              className={styles.btnDone}
              onClick={handleDone}
              title="Complete this session and reflect on your feelings"
            >
              {editingSummary ? "Save & Close →" : "Done →"}
            </button>
          </footer>
        </div>
      )}
    </div>
  );
}
