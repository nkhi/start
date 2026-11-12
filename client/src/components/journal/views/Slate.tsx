import { useEffect, useRef, useState, useCallback } from "react";
import { CheckIcon, CircleNotchIcon, FileDashedIcon } from "@phosphor-icons/react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type { EntrySummary } from "../../../types";
import {
  listJournalEntrySummaries,
  saveJournalEntry,
} from "../../../api/journal";
import { useJournal } from "../JournalContext";
import { DocumentLibrary } from "./DocumentLibrary";
import styles from "./Slate.module.css";

export function Slate() {
  const {
    activeNode,
    breakdown,
    sessionKey,
    searchQuery,
    slateViewMode: viewMode,
    editingSummary,
    selectEntry,
    startNewReflection,
    backToLibrary,
    finishWriting,
  } = useJournal();

  const [summaries, setSummaries] = useState<EntrySummary[]>([]);
  const [entryId, setEntryId] = useState<string>(() => "entry-" + crypto.randomUUID());
  const [wordCount, setWordCount] = useState(0);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">(
    "saved",
  );

  const entryIdRef = useRef(entryId);
  const editingSummaryRef = useRef(editingSummary);
  const activeNodeRef = useRef(activeNode);

  useEffect(() => {
    entryIdRef.current = entryId;
  }, [entryId]);

  useEffect(() => {
    editingSummaryRef.current = editingSummary;
  }, [editingSummary]);

  useEffect(() => {
    activeNodeRef.current = activeNode;
  }, [activeNode]);

  const autosaveTimeout = useRef<number | null>(null);
  const isProgrammaticRef = useRef(false);

  const refreshSummaries = useCallback(async () => {
    try {
      const list = await listJournalEntrySummaries(100);
      setSummaries(Array.isArray(list) ? list : []);
    } catch (err) {
      console.warn("Could not load entry summaries:", err);
      setSummaries([]);
    }
  }, []);

  // Refresh summaries when opening the library view
  useEffect(() => {
    if (viewMode !== "library") return;
    let cancelled = false;
    (async () => {
      try {
        const list = await listJournalEntrySummaries(100);
        if (!cancelled) setSummaries(Array.isArray(list) ? list : []);
      } catch (err) {
        console.warn("Could not load entry summaries:", err);
        if (!cancelled) setSummaries([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [viewMode]);

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
          void refreshSummaries();
        } catch (e) {
          console.error("Autosave failed:", e);
          setSaveStatus("unsaved");
        }
      }, 2000);
    },
  });

  // Synchronize editor content when switching archived documents, topics, or reflection sessions
  useEffect(() => {
    if (!editor) return;

    if (autosaveTimeout.current) {
      window.clearTimeout(autosaveTimeout.current);
      autosaveTimeout.current = null;
    }

    editingSummaryRef.current = editingSummary;

    if (editingSummary) {
      isProgrammaticRef.current = true;
      try {
        const json =
          typeof editingSummary.entry.doc_json === "string"
            ? JSON.parse(editingSummary.entry.doc_json)
            : editingSummary.entry.doc_json;
        editor.commands.setContent(json, { emitUpdate: false });
      } catch {
        editor.commands.setContent(
          `<p>${editingSummary.entry.plain_text || ""}</p>`,
          { emitUpdate: false },
        );
      }
      isProgrammaticRef.current = false;

      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWordCount(editingSummary.entry.word_count || 0);
      setSaveStatus("saved");
      return;
    }

    const newId = "entry-" + crypto.randomUUID();
    setEntryId(newId);
    entryIdRef.current = newId;

    isProgrammaticRef.current = true;
    editor.commands.clearContent(false);
    isProgrammaticRef.current = false;

    setWordCount(0);
    setSaveStatus("saved");
    void refreshSummaries();
  }, [editingSummary, activeNode?.node.id, sessionKey, editor, refreshSummaries]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (autosaveTimeout.current) {
        window.clearTimeout(autosaveTimeout.current);
        autosaveTimeout.current = null;
      }
    };
  }, []);

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
        backToLibrary();
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
      finishWriting(saved);
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

  return (
    <div className={styles.slateRoot}>
      {/* Main View: Either Document Library or TipTap Editor */}
      {viewMode === "library" ? (
        <DocumentLibrary
          summaries={pastSummaries}
          searchQuery={searchQuery}
          onSelectEntry={selectEntry}
          onNewReflection={startNewReflection}
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
                  onClick={backToLibrary}
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
