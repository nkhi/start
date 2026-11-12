import { useEffect, useRef, useState } from "react";
import type {
  Breakdown,
  Entry,
  GraphSnapshot,
  NodeWithState,
} from "../../types";
import {
  getJournalGraph,
  getJournalSuggestion,
} from "../../api/journal";
import { SplitLayout, type PaneMode } from "./layouts/SplitLayout";
import { ViewSwitcher } from "./components/ViewSwitcher";
import { Garden } from "./views/Garden";
import {
  Grid3x3Icon,
  PenDocIcon,
  Slate,
  type SlateActions,
} from "./views/Slate";
import { ReviewModal } from "./views/ReviewModal";
import styles from "./Journal.module.css";

export function Journal() {
  const [snapshot, setSnapshot] = useState<GraphSnapshot | null>(null);
  const [activeNode, setActiveNode] = useState<NodeWithState | null>(null);
  const [breakdown, setBreakdown] = useState<Breakdown | null>(null);
  const [sessionKey, setSessionKey] = useState(0);

  const [mode, setMode] = useState<PaneMode>("split");
  const [searchQuery, setSearchQuery] = useState("");
  const [gardenViewMode, setGardenViewMode] = useState<"map" | "list">("map");
  const [isNewNodeOpen, setIsNewNodeOpen] = useState(false);

  const [slateViewMode, setSlateViewMode] = useState<"editor" | "library">("editor");
  const [isViewingArchived, setIsViewingArchived] = useState(false);
  const slateRef = useRef<SlateActions | null>(null);

  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [connectedNodes, setConnectedNodes] = useState<NodeWithState[]>([]);

  // Fetches next suggested topic using the ranking algorithm
  const loadSuggestion = async (excludeId?: string) => {
    try {
      const suggestion = await getJournalSuggestion(excludeId);
      if (suggestion) {
        setActiveNode(suggestion.node);
        setBreakdown(suggestion.breakdown);
      } else {
        setActiveNode(null);
        setBreakdown(null);
      }
    } catch (err) {
      console.warn("Could not load suggestion:", err);
      setActiveNode(null);
      setBreakdown(null);
    }
  };

  // Loads graph snapshot and initial suggestion
  const loadData = async () => {
    try {
      const snap = await getJournalGraph();
      setSnapshot(snap || { nodes: [], edges: [] });
      await loadSuggestion();
    } catch (err) {
      console.warn("Could not load graph from backend:", err);
      setSnapshot({ nodes: [], edges: [] });
      setActiveNode(null);
      setBreakdown(null);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // When writing is finished in the Slate, gather connected nodes and open review
  const handleFinishWriting = (_entry: Entry) => {
    if (!snapshot || !activeNode) {
      handleReviewComplete();
      return;
    }

    // Find 1-hop connected nodes to the active node in the graph
    const neighborIds = new Set<string>();
    for (const edge of snapshot.edges || []) {
      if (edge.src === activeNode.node.id) {
        neighborIds.add(edge.dst);
      } else if (edge.dst === activeNode.node.id) {
        neighborIds.add(edge.src);
      }
    }

    const connected = (snapshot.nodes || []).filter(
      (n) => neighborIds.has(n.node.id) && n.node.id !== activeNode.node.id,
    );

    setConnectedNodes(connected);
    setIsReviewOpen(true);
  };

  // Called when reflection review is saved or skipped
  const handleReviewComplete = async () => {
    const finishedId = activeNode?.node.id;
    const snap = await getJournalGraph();
    setSnapshot(snap || { nodes: [], edges: [] });
    // Immediately rotate to the next high-scoring topic, excluding the one just finished
    await loadSuggestion(finishedId);
    setSessionKey((prev) => prev + 1);
  };

  // Left header section (Garden controls)
  const headerLeft = (
    <>
      <div className={styles.viewModeToggle}>
        <button
          className={gardenViewMode === "map" ? styles.activeMode : ""}
          onClick={() => setGardenViewMode("map")}
          title="Graph Map View"
        >
          Map
        </button>
        <button
          className={gardenViewMode === "list" ? styles.activeMode : ""}
          onClick={() => setGardenViewMode("list")}
          title="List View"
        >
          List
        </button>
      </div>

      <button
        className={`${styles.btnToolbarAction} ${styles.btnAddThought}`}
        onClick={() => setIsNewNodeOpen(true)}
        title="Add thoughts or outline to your garden"
      >
        + Add Thought
      </button>
    </>
  );

  // Center header section (View Switcher + Center Search Input)
  const headerCenter = (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <ViewSwitcher mode={mode} onChange={setMode} />
      <div className={styles.sharedSearchContainer}>
        <span className={styles.sharedSearchIcon}>
          <svg
            width="13"
            height="13"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="7" cy="7" r="5" />
            <path d="M11 11l3.5 3.5" />
          </svg>
        </span>
        <input
          type="text"
          className={styles.sharedSearchInput}
          placeholder="Search thoughts, tags, or documents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery.trim().length > 0 && (
          <button
            className={styles.btnClearSearch}
            onClick={() => setSearchQuery("")}
            title="Clear search"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );

  // Right header section (Slate controls)
  const headerRight = (
    <>
      {slateViewMode === "library" ? (
        <button
          className={styles.btnToolbarAction}
          onClick={() => slateRef.current?.startNewReflection()}
          title="Start a new reflection on today's sounding board"
        >
          <PenDocIcon /> Write Reflection
        </button>
      ) : isViewingArchived ? (
        <>
          <button
            className={styles.btnToolbarAction}
            onClick={() => slateRef.current?.backToLibrary()}
            title="Return to documents library"
          >
            ← Library
          </button>
          <button
            className={styles.btnToolbarAction}
            onClick={() => slateRef.current?.startNewReflection()}
            title="Start a new reflection from today's suggestions"
          >
            + New Reflection
          </button>
        </>
      ) : (
        <button
          className={styles.btnToolbarAction}
          onClick={() => loadSuggestion(activeNode?.node.id)}
          title="Cycle to next suggested question"
        >
          ↻ Next topic
        </button>
      )}

      {/* 3x3 Grid Icon Button to toggle Library */}
      <button
        className={`${styles.btnGridToggle} ${slateViewMode === "library" ? styles.activeGrid : ""}`}
        onClick={() => slateRef.current?.toggleLibrary()}
        title={
          slateViewMode === "library"
            ? "Switch back to Editor"
            : "Open Document Library"
        }
        aria-label="Document Library"
      >
        <Grid3x3Icon />
      </button>
    </>
  );

  return (
    <div className={styles.journalRoot}>
      <SplitLayout
        headerLeft={headerLeft}
        headerCenter={headerCenter}
        headerRight={headerRight}
        mode={mode}
        onModeChange={setMode}
        left={
          <Garden
            snapshot={snapshot}
            viewMode={gardenViewMode}
            searchQuery={searchQuery}
            isNewNodeOpen={isNewNodeOpen}
            onOpenNewNode={() => setIsNewNodeOpen(true)}
            onCloseNewNode={() => setIsNewNodeOpen(false)}
            onRefresh={async () => {
              const snap = await getJournalGraph();
              setSnapshot(snap || { nodes: [], edges: [] });
              await loadSuggestion();
            }}
          />
        }
        right={
          <Slate
            activeNode={activeNode}
            breakdown={breakdown}
            sessionKey={sessionKey}
            searchQuery={searchQuery}
            actionsRef={slateRef}
            onViewModeChange={setSlateViewMode}
            onViewingArchivedChange={setIsViewingArchived}
            onFinishWriting={handleFinishWriting}
          />
        }
      />

      {/* Post-Session Review Modal */}
      <ReviewModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        primaryNode={activeNode}
        connectedNodes={connectedNodes}
        onComplete={handleReviewComplete}
      />
    </div>
  );
}
