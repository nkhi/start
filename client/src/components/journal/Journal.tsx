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
  getNextJournalSuggestion,
} from "../../api/journal";
import { SplitLayout, type PaneMode } from "./layouts/SplitLayout";
import { FloatingIsland } from "./components/FloatingIsland";
import { Garden } from "./views/Garden";
import { Slate, type SlateActions } from "./views/Slate";
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
  const [visibleSlateTopicId, setVisibleSlateTopicId] = useState<string | null>(null);
  const slateRef = useRef<SlateActions | null>(null);

  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [connectedNodes, setConnectedNodes] = useState<NodeWithState[]>([]);

  // Fetches the current or next server-selected topic suggestion
  const loadSuggestion = async (advance = false) => {
    try {
      const suggestion = advance
        ? await getNextJournalSuggestion()
        : await getJournalSuggestion();
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
    const snap = await getJournalGraph();
    setSnapshot(snap || { nodes: [], edges: [] });
    // Advance the server-side suggestion cycle to the next topic
    await loadSuggestion(true);
    setSessionKey((prev) => prev + 1);
  };

  return (
    <div className={styles.journalRoot}>
      <SplitLayout
        mode={mode}
        left={
          <Garden
            snapshot={snapshot}
            viewMode={gardenViewMode}
            searchQuery={searchQuery}
            activeTopicId={visibleSlateTopicId}
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
            onVisibleTopicChange={setVisibleSlateTopicId}
            onFinishWriting={handleFinishWriting}
          />
        }
      />

      <FloatingIsland
        mode={mode}
        onModeChange={setMode}
        gardenViewMode={gardenViewMode}
        onToggleGardenView={() =>
          setGardenViewMode((prev) => (prev === "map" ? "list" : "map"))
        }
        isNewNodeOpen={isNewNodeOpen}
        onOpenNewNode={() => setIsNewNodeOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        slateViewMode={slateViewMode}
        isViewingArchived={isViewingArchived}
        onNextTopic={() => loadSuggestion(true)}
        onToggleLibrary={() => slateRef.current?.toggleLibrary()}
        onStartNewReflection={() => slateRef.current?.startNewReflection()}
        onBackToLibrary={() => slateRef.current?.backToLibrary()}
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
