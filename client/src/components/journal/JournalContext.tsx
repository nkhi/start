/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type {
  Breakdown,
  Entry,
  EntrySummary,
  GraphSnapshot,
  NodeWithState,
} from "../../types";
import {
  getJournalGraph,
  getJournalSuggestion,
  getNextJournalSuggestion,
} from "../../api/journal";
import type { PaneMode } from "./layouts/SplitLayout";

interface JournalContextType {
  // Layout & View Modes
  mode: PaneMode;
  setMode: (mode: PaneMode) => void;
  gardenViewMode: "map" | "list";
  toggleGardenView: () => void;
  slateViewMode: "editor" | "library";
  setSlateViewMode: (mode: "editor" | "library") => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isNewNodeOpen: boolean;
  openNewNode: () => void;
  closeNewNode: () => void;

  // Graph & Topic Suggestion State
  snapshot: GraphSnapshot | null;
  activeNode: NodeWithState | null;
  breakdown: Breakdown | null;
  refreshJournalData: () => Promise<void>;
  nextTopic: () => Promise<void>;

  // Slate & Reflection Session State
  editingSummary: EntrySummary | null;
  sessionKey: number;
  isViewingArchived: boolean;
  activeTopicId: string | null;
  selectEntry: (summary: EntrySummary) => void;
  startNewReflection: () => void;
  backToLibrary: () => void;
  toggleLibrary: () => void;

  // Post-Session Review Modal State
  isReviewOpen: boolean;
  closeReview: () => void;
  connectedNodes: NodeWithState[];
  finishWriting: (entry: Entry) => void;
  completeReview: () => Promise<void>;
}

const JournalContext = createContext<JournalContextType | undefined>(undefined);

export function JournalProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<GraphSnapshot | null>(null);
  const [activeNode, setActiveNode] = useState<NodeWithState | null>(null);
  const [breakdown, setBreakdown] = useState<Breakdown | null>(null);
  const [sessionKey, setSessionKey] = useState(0);

  const [mode, setMode] = useState<PaneMode>("split");
  const [searchQuery, setSearchQuery] = useState("");
  const [gardenViewMode, setGardenViewMode] = useState<"map" | "list">("map");
  const [isNewNodeOpen, setIsNewNodeOpen] = useState(false);

  const [slateViewMode, setSlateViewMode] = useState<"editor" | "library">("editor");
  const [editingSummary, setEditingSummary] = useState<EntrySummary | null>(null);

  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [connectedNodes, setConnectedNodes] = useState<NodeWithState[]>([]);

  const loadSuggestion = useCallback(async (advance = false) => {
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
  }, []);

  const refreshJournalData = useCallback(async () => {
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
  }, [loadSuggestion]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [snap, suggestion] = await Promise.all([
          getJournalGraph(),
          getJournalSuggestion(),
        ]);
        if (cancelled) return;
        setSnapshot(snap || { nodes: [], edges: [] });
        if (suggestion) {
          setActiveNode(suggestion.node);
          setBreakdown(suggestion.breakdown);
        } else {
          setActiveNode(null);
          setBreakdown(null);
        }
      } catch (err) {
        if (cancelled) return;
        console.warn("Could not load graph from backend:", err);
        setSnapshot({ nodes: [], edges: [] });
        setActiveNode(null);
        setBreakdown(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const nextTopic = useCallback(async () => {
    await loadSuggestion(true);
  }, [loadSuggestion]);

  const toggleGardenView = useCallback(() => {
    setGardenViewMode((prev) => (prev === "map" ? "list" : "map"));
  }, []);

  const openNewNode = useCallback(() => setIsNewNodeOpen(true), []);
  const closeNewNode = useCallback(() => setIsNewNodeOpen(false), []);

  const selectEntry = useCallback((summary: EntrySummary) => {
    setEditingSummary(summary);
    setSlateViewMode("editor");
  }, []);

  const startNewReflection = useCallback(() => {
    setEditingSummary(null);
    setSlateViewMode("editor");
    setSessionKey((prev) => prev + 1);
  }, []);

  const backToLibrary = useCallback(() => {
    setEditingSummary(null);
    setSlateViewMode("library");
  }, []);

  const toggleLibrary = useCallback(() => {
    setSlateViewMode((prev) => (prev === "editor" ? "library" : "editor"));
  }, []);

  const completeReview = useCallback(async () => {
    const snap = await getJournalGraph();
    setSnapshot(snap || { nodes: [], edges: [] });
    await loadSuggestion(true);
    setSessionKey((prev) => prev + 1);
  }, [loadSuggestion]);

  const finishWriting = useCallback(
    (_entry: Entry) => {
      void _entry;
      if (!snapshot || !activeNode) {
        void completeReview();
        return;
      }

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
    },
    [snapshot, activeNode, completeReview],
  );

  const closeReview = useCallback(() => setIsReviewOpen(false), []);

  const isViewingArchived = Boolean(editingSummary);
  const activeTopicId =
    slateViewMode === "editor"
      ? editingSummary
        ? (editingSummary.primary_node?.node.id ?? null)
        : (activeNode?.node.id ?? null)
      : null;

  return (
    <JournalContext.Provider
      value={{
        mode,
        setMode,
        gardenViewMode,
        toggleGardenView,
        slateViewMode,
        setSlateViewMode,
        searchQuery,
        setSearchQuery,
        isNewNodeOpen,
        openNewNode,
        closeNewNode,
        snapshot,
        activeNode,
        breakdown,
        refreshJournalData,
        nextTopic,
        editingSummary,
        sessionKey,
        isViewingArchived,
        activeTopicId,
        selectEntry,
        startNewReflection,
        backToLibrary,
        toggleLibrary,
        isReviewOpen,
        closeReview,
        connectedNodes,
        finishWriting,
        completeReview,
      }}
    >
      {children}
    </JournalContext.Provider>
  );
}

export function useJournal() {
  const context = useContext(JournalContext);
  if (context === undefined) {
    throw new Error("useJournal must be used within a JournalProvider");
  }
  return context;
}

