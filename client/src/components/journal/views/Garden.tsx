import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BroomIcon, FrameCornersIcon, MagnetIcon } from "@phosphor-icons/react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  ConnectionMode,
  useNodesState,
  useEdgesState,
  useReactFlow,
  useNodesInitialized,
  useOnViewportChange,
  addEdge,
  type Connection,
  type Edge as FlowEdge,
  type EdgeMouseHandler,
  type Node as FlowNode,
  type OnConnectEnd,
  type OnEdgesDelete,
  type OnNodeDrag,
  type Viewport,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { GraphSnapshot, NodeWithState } from "../../../types";
import {
  createJournalEdge,
  deleteJournalEdge,
  updateJournalNodePositions,
} from "../../../api/journal";
import { IdeaNodeCard, type IdeaNodeData } from "../components/IdeaNodeCard";
import { getOpennessColors } from "../components/nodeTheme";
import { FloatingEdge, type FloatingEdgeData } from "../components/FloatingEdge";
import { FloatingConnectionLine } from "../components/FloatingConnectionLine";
import { NodePopover } from "../components/NodePopover";
import { NewNodeModal } from "../components/NewNodeModal";
import {
  CARD_DEFAULT_HEIGHT,
  CARD_DEFAULT_WIDTH,
  resolveCardOverlaps,
  solveFocusConstellation,
  solveRestingLayout,
  solveTidyWebLayout,
  solveViewportContainment,
  type LayoutEdgeInput,
  type LayoutNodeInput,
  type PositionMap,
} from "../layout/gardenPhysics";
import styles from "./Garden.module.css";

interface GardenProps {
  snapshot: GraphSnapshot | null;
  viewMode: "map" | "list";
  searchQuery?: string;
  activeTopicId?: string | null;
  onRefresh: () => void;
  isNewNodeOpen: boolean;
  onOpenNewNode: () => void;
  onCloseNewNode: () => void;
}

interface GardenMapCanvasProps {
  snapshot: GraphSnapshot;
  searchQuery: string;
  activeTopicId: string | null;
  onRefresh: () => void;
  onSelectForEdit: (item: NodeWithState) => void;
}

function getSearchMatchSet(snapshot: GraphSnapshot, searchQuery: string): Set<string> | null {
  const q = searchQuery.trim().toLowerCase();
  if (!q) return null;
  const matched = new Set<string>();
  for (const n of snapshot.nodes) {
    const titleHit = n.node.title.toLowerCase().includes(q);
    const bodyHit = n.node.body?.toLowerCase().includes(q) ?? false;
    const tagHit = Boolean(n.tags?.some((t) => t.toLowerCase().includes(q)));
    if (titleHit || bodyHit || tagHit) {
      matched.add(n.node.id);
    }
  }
  return matched;
}

function buildAdjacencySet(snapshot: GraphSnapshot, anchorId: string | null): Set<string> {
  const neighbors = new Set<string>();
  if (!anchorId) return neighbors;
  for (const e of snapshot.edges || []) {
    if (e.src === anchorId && e.dst !== anchorId) neighbors.add(e.dst);
    else if (e.dst === anchorId && e.src !== anchorId) neighbors.add(e.src);
  }
  return neighbors;
}

function GardenMapCanvas({
  snapshot,
  searchQuery,
  activeTopicId,
  onRefresh,
  onSelectForEdit,
}: GardenMapCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode<IdeaNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge<FloatingEdgeData>>([]);

  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(
    () => activeTopicId ?? null,
  );
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [autoReflow, setAutoReflow] = useState<boolean>(true);
  const [compactPeripheral, setCompactPeripheral] = useState<boolean>(false);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasSizeRef = useRef<{ width: number; height: number }>({
    width: 960,
    height: 680,
  });
  const restingPositionsRef = useRef<PositionMap>({});
  const hasFittedInitialRef = useRef<boolean>(false);
  const isAnimatingViewportRef = useRef<boolean>(false);
  const isDraggingRef = useRef<boolean>(false);
  const isConnectingRef = useRef<boolean>(false);
  const lastZoomRef = useRef<number>(1);
  const hoverTimerRef = useRef<number | null>(null);
  const edgeHoverTimerRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const animTargetRef = useRef<PositionMap | null>(null);
  const viewportTimerRef = useRef<number | null>(null);
  const nodesRef = useRef<FlowNode<IdeaNodeData>[]>([]);
  const prevMeasuredDimsRef = useRef<Record<string, { w: number; h: number }>>({});

  const { fitView, fitBounds, screenToFlowPosition, getViewport } = useReactFlow();
  const nodesInitialized = useNodesInitialized();

  const nodeTypes = useMemo(() => ({ ideaNode: IdeaNodeCard }), []);
  const edgeTypes = useMemo(() => ({ floating: FloatingEdge }), []);

  // Keep latest nodes in ref for non-rendering animation / layout callbacks
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  const handleEdgeHoverChange = useCallback(
    (edgeId: string, hovered: boolean) => {
      if (edgeHoverTimerRef.current !== null) {
        window.clearTimeout(edgeHoverTimerRef.current);
        edgeHoverTimerRef.current = null;
      }
      if (hovered) {
        setHoveredEdgeId(edgeId);
      } else {
        edgeHoverTimerRef.current = window.setTimeout(() => {
          setHoveredEdgeId((prev) => (prev === edgeId ? null : prev));
        }, 110);
      }
    },
    [],
  );

  const handleDeleteEdge = useCallback(
    async (edgeId: string) => {
      if (edgeHoverTimerRef.current !== null) {
        window.clearTimeout(edgeHoverTimerRef.current);
        edgeHoverTimerRef.current = null;
      }
      setHoveredEdgeId((prev) => (prev === edgeId ? null : prev));
      setEdges((eds) => eds.filter((e) => e.id !== edgeId));

      if (edgeId.startsWith("temp-edge-")) return;

      try {
        await deleteJournalEdge(edgeId);
        onRefresh();
      } catch (err) {
        console.error("Failed to delete edge:", err);
        onRefresh();
      }
    },
    [setEdges, onRefresh],
  );

  const commitEdgeConnection = useCallback(
    async (
      sourceId: string,
      targetId: string,
      sourceHandle: string | null = null,
      targetHandle: string | null = null,
    ) => {
      if (!sourceId || !targetId || sourceId === targetId) return;

      const alreadyExists = (snapshot.edges || []).some(
        (e) =>
          e.src === sourceId &&
          e.dst === targetId &&
          e.relation === "relates_to",
      );
      if (alreadyExists) return;

      const tempId = `temp-edge-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setEdges((eds) =>
        addEdge(
          {
            id: tempId,
            source: sourceId,
            target: targetId,
            sourceHandle,
            targetHandle,
            type: "floating",
            data: {
              relation: "relates_to",
              status: "accepted",
              onEdgeHoverChange: handleEdgeHoverChange,
              onDeleteEdge: handleDeleteEdge,
            },
          },
          eds,
        ),
      );

      try {
        const created = await createJournalEdge({
          src: sourceId,
          dst: targetId,
          relation: "relates_to",
        });
        setEdges((eds) =>
          eds.map((edge) =>
            edge.id === tempId ? { ...edge, id: created.id } : edge,
          ),
        );
        onRefresh();
      } catch (err) {
        console.error("Failed to persist edge:", err);
        setEdges((eds) => eds.filter((edge) => edge.id !== tempId));
      }
    },
    [
      snapshot.edges,
      setEdges,
      onRefresh,
      handleEdgeHoverChange,
      handleDeleteEdge,
    ],
  );

  const stopPositionAnimation = useCallback(() => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    animTargetRef.current = null;
  }, []);

  const animateToPositions = useCallback(
    (targetPositions: PositionMap, durationMs = 240) => {
      stopPositionAnimation();
      animTargetRef.current = targetPositions;

      const startPositions: PositionMap = {};
      for (const n of nodesRef.current) {
        startPositions[n.id] = { x: n.position.x, y: n.position.y };
      }

      const startTime = performance.now();
      const step = (now: number) => {
        const rawT = Math.min(1, (now - startTime) / Math.max(1, durationMs));
        const eased = 1 - Math.pow(1 - rawT, 3);

        setNodes((prev) =>
          prev.map((node) => {
            const start = startPositions[node.id] ?? node.position;
            const target = targetPositions[node.id];
            if (!target) return node;
            const x = start.x + (target.x - start.x) * eased;
            const y = start.y + (target.y - start.y) * eased;
            return {
              ...node,
              position: { x, y },
            };
          }),
        );

        if (rawT < 1) {
          animFrameRef.current = requestAnimationFrame(step);
        } else {
          animFrameRef.current = null;
          animTargetRef.current = null;
        }
      };

      animFrameRef.current = requestAnimationFrame(step);
    },
    [setNodes, stopPositionAnimation],
  );

  // Build layout inputs from current React Flow nodes + snapshot
  const getCurrentLayoutInputs = useCallback(
    (positionsOverride?: PositionMap): LayoutNodeInput[] => {
      const measuredMap = new Map(
        nodesRef.current.map((n) => [
          n.id,
          {
            width: n.measured?.width,
            height: n.measured?.height,
            pos: n.position,
          },
        ]),
      );

      return snapshot.nodes.map((item) => {
        const id = item.node.id;
        const m = measuredMap.get(id);
        const pos =
          positionsOverride?.[id] ??
          restingPositionsRef.current[id] ??
          m?.pos ?? {
            x: item.node.pos_x ?? 0,
            y: item.node.pos_y ?? 0,
          };

        return {
          id,
          x: pos.x,
          y: pos.y,
          width: m?.width ?? CARD_DEFAULT_WIDTH,
          height: m?.height ?? CARD_DEFAULT_HEIGHT,
          hasSavedPosition: item.node.pos_x != null && item.node.pos_y != null,
        };
      });
    },
    [snapshot.nodes],
  );

  const layoutEdges: LayoutEdgeInput[] = useMemo(
    () =>
      (snapshot.edges || []).map((e) => ({
        src: e.src,
        dst: e.dst,
        weight: e.weight,
      })),
    [snapshot.edges],
  );

  // Helper to compute visible world bounds for current container & React Flow viewport
  const getVisibleWorldBounds = useCallback(() => {
    const { width, height } = canvasSizeRef.current;
    const topLeft = screenToFlowPosition({ x: 0, y: 0 });
    const bottomRight = screenToFlowPosition({ x: width, y: height });
    return {
      left: topLeft.x,
      top: topLeft.y,
      right: bottomRight.x,
      bottom: bottomRight.y,
    };
  }, [screenToFlowPosition]);

  const isPaneVisibleRef = useRef<boolean>(true);
  const pendingFitClusterRef = useRef<{
    anchorId: string;
    neighborIds: Set<string>;
    targetPositions: PositionMap;
  } | null>(null);

  // Helper to focus camera onto a node + its 1-hop neighbors using target positions
  const fitClusterInView = useCallback(
    (anchorId: string, neighborIds: Set<string>, targetPositions: PositionMap) => {
      if (!isPaneVisibleRef.current) {
        pendingFitClusterRef.current = { anchorId, neighborIds, targetPositions };
        return;
      }
      pendingFitClusterRef.current = null;

      const clusterIds = new Set<string>([anchorId, ...neighborIds]);
      const measuredMap = new Map(
        nodesRef.current.map((n) => [n.id, n.measured]),
      );

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      for (const id of clusterIds) {
        const pos = targetPositions[id];
        if (!pos) continue;
        const measured = measuredMap.get(id);
        const w = measured?.width ?? CARD_DEFAULT_WIDTH;
        const h = measured?.height ?? CARD_DEFAULT_HEIGHT;
        minX = Math.min(minX, pos.x);
        minY = Math.min(minY, pos.y);
        maxX = Math.max(maxX, pos.x + w);
        maxY = Math.max(maxY, pos.y + h);
      }

      if (!Number.isFinite(minX)) return;

      const rawW = maxX - minX;
      const rawH = maxY - minY;
      const targetW = Math.max(420, rawW);
      const targetH = Math.max(280, rawH);

      isAnimatingViewportRef.current = true;
      if (viewportTimerRef.current !== null) {
        window.clearTimeout(viewportTimerRef.current);
      }
      fitBounds(
        {
          x: minX - (targetW - rawW) / 2,
          y: minY - (targetH - rawH) / 2,
          width: targetW,
          height: targetH,
        },
        { padding: 0.24, duration: 420 },
      );
      viewportTimerRef.current = window.setTimeout(() => {
        isAnimatingViewportRef.current = false;
        lastZoomRef.current = getViewport().zoom;
      }, 480);
    },
    [fitBounds, getViewport],
  );

  // 1. Observe Garden pane dimensions (split vs wide monitor vs ResizeHandle)
  const resizeGuardRef = useRef({
    autoReflow: true,
    hasActiveAnchor: false,
  });

  useEffect(() => {
    resizeGuardRef.current = {
      autoReflow,
      hasActiveAnchor: Boolean(focusedNodeId || hoveredNodeId),
    };
  }, [autoReflow, focusedNodeId, hoveredNodeId]);

  const fitClusterInViewRef = useRef(fitClusterInView);
  useEffect(() => {
    fitClusterInViewRef.current = fitClusterInView;
  }, [fitClusterInView]);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const updateRect = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        isPaneVisibleRef.current = true;
        canvasSizeRef.current = { width: rect.width, height: rect.height };
      } else {
        isPaneVisibleRef.current = false;
      }
    };
    updateRect();

    let resizeTimeout: number | null = null;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (width <= 0 || height <= 0) {
        isPaneVisibleRef.current = false;
        return;
      }

      isPaneVisibleRef.current = true;
      const prevW = canvasSizeRef.current.width;
      canvasSizeRef.current = { width, height };

      const pendingCluster = pendingFitClusterRef.current;
      if (pendingCluster) {
        pendingFitClusterRef.current = null;
        window.requestAnimationFrame(() => {
          fitClusterInViewRef.current(
            pendingCluster.anchorId,
            pendingCluster.neighborIds,
            pendingCluster.targetPositions,
          );
        });
        return;
      }

      const guard = resizeGuardRef.current;
      if (!guard.autoReflow || guard.hasActiveAnchor) return;
      if (Math.abs(width - prevW) < 28) return;

      if (resizeTimeout !== null) window.clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(() => {
        isAnimatingViewportRef.current = true;
        fitView({ padding: 0.16, duration: 320 });
        window.setTimeout(() => {
          isAnimatingViewportRef.current = false;
          lastZoomRef.current = getViewport().zoom;
        }, 360);
      }, 180);
    });

    observer.observe(el);
    return () => {
      observer.disconnect();
      if (resizeTimeout !== null) window.clearTimeout(resizeTimeout);
    };
  }, [fitView, getViewport]);

  // 2. Sync snapshot nodes & edges ONLY when snapshot changes (never reset on searchQuery!)
  useEffect(() => {
    const existingPositions = restingPositionsRef.current;
    const measuredMap = new Map(
      nodesRef.current.map((n) => [n.id, n.measured]),
    );

    const rawInputs: LayoutNodeInput[] = snapshot.nodes.map((n) => {
      const id = n.node.id;
      const hasDbPos = n.node.pos_x != null && n.node.pos_y != null;
      const sessionPos = existingPositions[id];
      const measured = measuredMap.get(id);

      return {
        id,
        x: hasDbPos ? (n.node.pos_x as number) : (sessionPos?.x ?? 0),
        y: hasDbPos ? (n.node.pos_y as number) : (sessionPos?.y ?? 0),
        width: measured?.width ?? CARD_DEFAULT_WIDTH,
        height: measured?.height ?? CARD_DEFAULT_HEIGHT,
        hasSavedPosition: hasDbPos || Boolean(sessionPos),
      };
    });

    const { positions, newlyPositionedIds } = solveRestingLayout({
      nodes: rawInputs,
      edges: layoutEdges,
      containerWidth: canvasSizeRef.current.width,
      containerHeight: canvasSizeRef.current.height,
    });

    restingPositionsRef.current = positions;

    // Persist coordinates for newly placed nodes so they keep their mosaic home
    if (newlyPositionedIds.length > 0) {
      const payload = newlyPositionedIds
        .filter((id) => positions[id])
        .map((id) => ({
          id,
          x: positions[id].x,
          y: positions[id].y,
        }));
      updateJournalNodePositions(payload).catch((err) => {
        console.warn("Failed to persist initial node positions:", err);
      });
    }

    const flowNodes: FlowNode<IdeaNodeData>[] = snapshot.nodes.map((item) => {
      const id = item.node.id;
      const pos = positions[id] ?? { x: 0, y: 0 };
      return {
        id,
        type: "ideaNode",
        position: pos,
        zIndex: 1,
        deletable: false,
        data: {
          item,
          isDimmed: false,
          isFocused: false,
          isNeighbor: false,
          isCompact: false,
          onEditNode: onSelectForEdit,
        },
      };
    });

    const flowEdges: FlowEdge<FloatingEdgeData>[] = (snapshot.edges || []).map((e) => ({
      id: e.id,
      source: e.src,
      target: e.dst,
      type: "floating",
      animated: e.status === "pending",
      data: {
        relation: e.relation,
        status: e.status,
        isFocused: false,
        isDimmed: false,
        isHovered: false,
        onEdgeHoverChange: handleEdgeHoverChange,
        onDeleteEdge: handleDeleteEdge,
      },
    }));

    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [
    snapshot,
    layoutEdges,
    onSelectForEdit,
    handleEdgeHoverChange,
    handleDeleteEdge,
    setNodes,
    setEdges,
  ]);

  const effectiveFocusedNodeId = useMemo(() => {
    if (!focusedNodeId) return null;
    return snapshot.nodes.some((n) => n.node.id === focusedNodeId)
      ? focusedNodeId
      : null;
  }, [focusedNodeId, snapshot.nodes]);

  // 3. Initial fitView once React Flow has measured the cards (skip if an active topic will center instead)
  useEffect(() => {
    if (nodesInitialized && !hasFittedInitialRef.current && snapshot.nodes.length > 0) {
      hasFittedInitialRef.current = true;
      if (effectiveFocusedNodeId) return;

      isAnimatingViewportRef.current = true;
      if (viewportTimerRef.current !== null) {
        window.clearTimeout(viewportTimerRef.current);
      }
      fitView({ padding: 0.18, duration: 300 });
      viewportTimerRef.current = window.setTimeout(() => {
        isAnimatingViewportRef.current = false;
        lastZoomRef.current = getViewport().zoom;
      }, 340);
    }
  }, [
    nodesInitialized,
    snapshot.nodes.length,
    effectiveFocusedNodeId,
    fitView,
    getViewport,
  ]);

  // 3b. Automatically push overlapping cards apart whenever real card dimensions
  // are measured or change (initial render, text/body edit, compact expand/collapse).
  const dimsSignature = nodes
    .map(
      (n) =>
        `${n.id}:${Math.round(n.measured?.width ?? 0)}x${Math.round(n.measured?.height ?? 0)}`,
    )
    .join("|");

  useEffect(() => {
    if (!nodesInitialized || isDraggingRef.current || nodesRef.current.length === 0) {
      return;
    }

    let anyDimChanged = false;
    const nextDims: Record<string, { w: number; h: number }> = {};
    for (const n of nodesRef.current) {
      const w = n.measured?.width ?? 0;
      const h = n.measured?.height ?? 0;
      if (w <= 0 || h <= 0) continue;
      nextDims[n.id] = { w, h };
      const prev = prevMeasuredDimsRef.current[n.id];
      if (!prev || Math.abs(prev.w - w) >= 3 || Math.abs(prev.h - h) >= 3) {
        anyDimChanged = true;
      }
    }

    if (!anyDimChanged) return;
    prevMeasuredDimsRef.current = nextDims;

    const anchor = effectiveFocusedNodeId ?? hoveredNodeId;
    const baseTargets = animTargetRef.current;
    const inputs: LayoutNodeInput[] = nodesRef.current.map((n) => {
      const pos = baseTargets?.[n.id] ?? n.position;
      return {
        id: n.id,
        x: pos.x,
        y: pos.y,
        width: n.measured?.width ?? CARD_DEFAULT_WIDTH,
        height: n.measured?.height ?? CARD_DEFAULT_HEIGHT,
      };
    });

    const { positions, changedIds } = resolveCardOverlaps({
      nodes: inputs,
      pinnedIds: anchor ? new Set([anchor]) : undefined,
      priorityIds: anchor ? buildAdjacencySet(snapshot, anchor) : undefined,
      triggerPadding: 0,
      clearPadding: 12,
    });

    if (changedIds.length === 0) return;

    animateToPositions(positions, 180);

    if (!anchor && !compactPeripheral) {
      restingPositionsRef.current = {
        ...restingPositionsRef.current,
        ...positions,
      };
      const payload = changedIds
        .filter((id) => positions[id])
        .map((id) => ({ id, x: positions[id].x, y: positions[id].y }));
      updateJournalNodePositions(payload).catch((err) => {
        console.warn("Failed to persist de-overlapped positions:", err);
      });
    }
  }, [
    dimsSignature,
    nodesInitialized,
    effectiveFocusedNodeId,
    hoveredNodeId,
    compactPeripheral,
    snapshot,
    animateToPositions,
  ]);

  // 4. Sync visual states (search dimming, focus/hover highlighting, semantic compacting)
  // without touching node positions
  const activeAnchorId = effectiveFocusedNodeId ?? hoveredNodeId;

  useEffect(() => {
    const searchMatches = getSearchMatchSet(snapshot, searchQuery);
    const activeNeighbors = buildAdjacencySet(snapshot, activeAnchorId);

    setNodes((prev) =>
      prev.map((node) => {
        const isAnchor = activeAnchorId === node.id;
        const isNeighbor = activeNeighbors.has(node.id);
        const dimmedByFocus = Boolean(activeAnchorId) && !isAnchor && !isNeighbor;
        const dimmedBySearch = Boolean(searchMatches) && !searchMatches!.has(node.id);

        return {
          ...node,
          zIndex: isAnchor ? 30 : isNeighbor ? 20 : 1,
          data: {
            ...node.data,
            isFocused: isAnchor,
            isNeighbor,
            isDimmed: dimmedByFocus || dimmedBySearch,
            isCompact: compactPeripheral,
            onEditNode: onSelectForEdit,
          },
        };
      }),
    );

    setEdges((prev) =>
      prev.map((edge) => {
        const isConnectedToAnchor =
          Boolean(activeAnchorId) &&
          (edge.source === activeAnchorId || edge.target === activeAnchorId);
        const matchesSearch =
          !searchMatches ||
          (searchMatches.has(edge.source) && searchMatches.has(edge.target));
        const isEdgeHovered = hoveredEdgeId === edge.id;

        return {
          ...edge,
          zIndex:
            isEdgeHovered || edge.selected ? 35 : isConnectedToAnchor ? 25 : 0,
          data: {
            ...edge.data,
            isFocused: isConnectedToAnchor,
            isHovered: isEdgeHovered,
            onEdgeHoverChange: handleEdgeHoverChange,
            onDeleteEdge: handleDeleteEdge,
            isDimmed:
              (Boolean(activeAnchorId) && !isConnectedToAnchor) || !matchesSearch,
          },
        };
      }),
    );
  }, [
    snapshot,
    searchQuery,
    activeAnchorId,
    hoveredEdgeId,
    compactPeripheral,
    onSelectForEdit,
    handleEdgeHoverChange,
    handleDeleteEdge,
    setNodes,
    setEdges,
  ]);

  // 4b. Sync focus when the visible topic on the Slate changes
  useEffect(() => {
    if (hoverTimerRef.current !== null) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setHoveredNodeId(null);
    setFocusedNodeId(activeTopicId ?? null);
  }, [activeTopicId]);

  // 5. Run constellation contraction / restoration when activeAnchorId changes
  useEffect(() => {
    if (snapshot.nodes.length === 0 || !nodesInitialized) return;

    if (!activeAnchorId) {
      animateToPositions(restingPositionsRef.current, 240);
      return;
    }

    const inputs = getCurrentLayoutInputs(restingPositionsRef.current);
    const { positions, neighborIds } = solveFocusConstellation({
      anchorId: activeAnchorId,
      nodes: inputs,
      edges: layoutEdges,
      restingPositions: restingPositionsRef.current,
    });

    animateToPositions(positions, 240);

    // If locked via single-click or Slate sync, smoothly center the card + its connections
    if (effectiveFocusedNodeId === activeAnchorId) {
      fitClusterInView(activeAnchorId, neighborIds, positions);
    }
  }, [
    activeAnchorId,
    effectiveFocusedNodeId,
    nodesInitialized,
    snapshot.nodes.length,
    layoutEdges,
    getCurrentLayoutInputs,
    animateToPositions,
    fitClusterInView,
  ]);

  // 6. Track zoom changes for Semantic Zoom + Viewport Containment ("Auto-Reflow")
  const handleViewportEnd = useCallback(
    (viewport: Viewport) => {
      const zoomChanged = Math.abs(viewport.zoom - lastZoomRef.current) > 0.04;
      lastZoomRef.current = viewport.zoom;

      if (isAnimatingViewportRef.current || isDraggingRef.current) return;

      if (!autoReflow) {
        if (compactPeripheral) setCompactPeripheral(false);
        return;
      }

      if (!zoomChanged) return;

      // Compact non-focused cards when zoomed way out or when zoomed in densely
      const visibleBounds = getVisibleWorldBounds();
      const focusedSet = new Set<string>();
      if (activeAnchorId) {
        focusedSet.add(activeAnchorId);
        for (const nid of buildAdjacencySet(snapshot, activeAnchorId)) {
          focusedSet.add(nid);
        }
      }

      const basePositions = activeAnchorId
        ? undefined
        : restingPositionsRef.current;
      const inputs = getCurrentLayoutInputs(basePositions);

      const { positions, shouldCompactPeripheral } = solveViewportContainment({
        nodes: inputs,
        visibleBounds,
        focusedIds: focusedSet,
      });

      setCompactPeripheral(shouldCompactPeripheral || viewport.zoom < 0.65);

      // If user zoomed in (zoom > 1.02), gently pull stray off-screen cards back in
      // when they fit; if zoomed back out, relax toward resting positions.
      if (viewport.zoom > 1.02) {
        animateToPositions(positions, 220);
      } else if (!activeAnchorId) {
        animateToPositions(restingPositionsRef.current, 220);
      }
    },
    [
      autoReflow,
      compactPeripheral,
      activeAnchorId,
      snapshot,
      getVisibleWorldBounds,
      getCurrentLayoutInputs,
      animateToPositions,
    ],
  );

  useOnViewportChange({
    onEnd: handleViewportEnd,
  });

  // 7. Escape key exits Focus Constellation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && effectiveFocusedNodeId) {
        setFocusedNodeId(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [effectiveFocusedNodeId]);

  // Cleanup timers & animations on unmount
  useEffect(() => {
    return () => {
      stopPositionAnimation();
      if (hoverTimerRef.current !== null) window.clearTimeout(hoverTimerRef.current);
      if (edgeHoverTimerRef.current !== null) window.clearTimeout(edgeHoverTimerRef.current);
      if (viewportTimerRef.current !== null) window.clearTimeout(viewportTimerRef.current);
    };
  }, [stopPositionAnimation]);

  // Handlers
  const onConnect = useCallback(
    (params: Connection) => {
      if (params.source && params.target && params.source !== params.target) {
        void commitEdgeConnection(
          params.source,
          params.target,
          params.sourceHandle,
          params.targetHandle,
        );
      }
    },
    [commitEdgeConnection],
  );

  const onConnectStart = useCallback(() => {
    isConnectingRef.current = true;
    setIsConnecting(true);
    if (hoverTimerRef.current !== null) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setHoveredNodeId(null);
  }, []);

  const onConnectEnd: OnConnectEnd = useCallback(
    (event, connectionState) => {
      isConnectingRef.current = false;
      setIsConnecting(false);

      if (connectionState.isValid || !connectionState.fromNode) return;

      let clientX: number | undefined;
      let clientY: number | undefined;
      if ("changedTouches" in event && event.changedTouches.length > 0) {
        clientX = event.changedTouches[0].clientX;
        clientY = event.changedTouches[0].clientY;
      } else if ("clientX" in event) {
        clientX = event.clientX;
        clientY = event.clientY;
      }

      if (clientX == null || clientY == null) return;

      const flowPos = screenToFlowPosition({ x: clientX, y: clientY });
      const margin = 12;
      let bestTarget: FlowNode<IdeaNodeData> | null = null;
      let bestZ = -Infinity;

      for (const candidate of nodesRef.current) {
        if (candidate.id === connectionState.fromNode.id) continue;
        const w = candidate.measured?.width ?? CARD_DEFAULT_WIDTH;
        const h = candidate.measured?.height ?? CARD_DEFAULT_HEIGHT;
        if (
          flowPos.x >= candidate.position.x - margin &&
          flowPos.x <= candidate.position.x + w + margin &&
          flowPos.y >= candidate.position.y - margin &&
          flowPos.y <= candidate.position.y + h + margin
        ) {
          const z = candidate.zIndex ?? 0;
          if (z >= bestZ) {
            bestZ = z;
            bestTarget = candidate;
          }
        }
      }

      if (bestTarget) {
        void commitEdgeConnection(connectionState.fromNode.id, bestTarget.id);
      }
    },
    [screenToFlowPosition, commitEdgeConnection],
  );

  const onEdgesDelete: OnEdgesDelete<FlowEdge<FloatingEdgeData>> = useCallback(
    async (deletedEdges) => {
      const persistedIds = deletedEdges
        .map((e) => e.id)
        .filter((id) => !id.startsWith("temp-edge-"));
      if (persistedIds.length === 0) return;

      setHoveredEdgeId((prev) =>
        prev && persistedIds.includes(prev) ? null : prev,
      );

      try {
        await Promise.all(persistedIds.map((id) => deleteJournalEdge(id)));
      } catch (err) {
        console.error("Failed to delete selected edges:", err);
      } finally {
        onRefresh();
      }
    },
    [onRefresh],
  );

  const onEdgeMouseEnter: EdgeMouseHandler<FlowEdge<FloatingEdgeData>> = useCallback(
    (_, edge) => {
      handleEdgeHoverChange(edge.id, true);
    },
    [handleEdgeHoverChange],
  );

  const onEdgeMouseLeave: EdgeMouseHandler<FlowEdge<FloatingEdgeData>> = useCallback(
    (_, edge) => {
      handleEdgeHoverChange(edge.id, false);
    },
    [handleEdgeHoverChange],
  );

  const onNodeMouseEnter = useCallback(
    (_: React.MouseEvent, node: FlowNode<IdeaNodeData>) => {
      if (effectiveFocusedNodeId || isDraggingRef.current || isConnectingRef.current) {
        return;
      }
      if (hoverTimerRef.current !== null) {
        window.clearTimeout(hoverTimerRef.current);
      }
      hoverTimerRef.current = window.setTimeout(() => {
        setHoveredNodeId(node.id);
      }, 140);
    },
    [effectiveFocusedNodeId],
  );

  const onNodeMouseLeave = useCallback(
    (_: React.MouseEvent, node: FlowNode<IdeaNodeData>) => {
      if (hoverTimerRef.current !== null) {
        window.clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
      setHoveredNodeId((prev) => (prev === node.id ? null : prev));
    },
    [],
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: FlowNode<IdeaNodeData>) => {
    if (hoverTimerRef.current !== null) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setHoveredNodeId(null);
    setFocusedNodeId((prev) => (prev === node.id ? null : node.id));
  }, []);

  const onNodeDoubleClick = useCallback(
    (_: React.MouseEvent, node: FlowNode<IdeaNodeData>) => {
      if (node.data?.item) {
        onSelectForEdit(node.data.item);
      }
    },
    [onSelectForEdit],
  );

  const onNodeDragStart: OnNodeDrag<FlowNode<IdeaNodeData>> = useCallback(
    () => {
      isDraggingRef.current = true;
      stopPositionAnimation();
      if (hoverTimerRef.current !== null) {
        window.clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
    },
    [stopPositionAnimation],
  );

  const onNodeDragStop: OnNodeDrag<FlowNode<IdeaNodeData>> = useCallback(
    (_, node) => {
      isDraggingRef.current = false;

      const inputs: LayoutNodeInput[] = nodesRef.current.map((n) => ({
        id: n.id,
        x: n.id === node.id ? node.position.x : n.position.x,
        y: n.id === node.id ? node.position.y : n.position.y,
        width: n.measured?.width ?? CARD_DEFAULT_WIDTH,
        height: n.measured?.height ?? CARD_DEFAULT_HEIGHT,
      }));

      const { positions, changedIds } = resolveCardOverlaps({
        nodes: inputs,
        pinnedIds: new Set([node.id]),
        triggerPadding: 0,
        clearPadding: 12,
      });

      if (changedIds.length > 0) {
        animateToPositions(positions, 190);
      }

      const nextResting: PositionMap = {
        ...restingPositionsRef.current,
        [node.id]: { x: node.position.x, y: node.position.y },
      };
      const payload: Array<{ id: string; x: number; y: number }> = [
        { id: node.id, x: node.position.x, y: node.position.y },
      ];
      for (const id of changedIds) {
        const p = positions[id];
        if (p) {
          nextResting[id] = { x: p.x, y: p.y };
          payload.push({ id, x: p.x, y: p.y });
        }
      }
      restingPositionsRef.current = nextResting;

      updateJournalNodePositions(payload).catch((err) => {
        console.warn("Failed to save dragged node positions:", err);
      });
    },
    [animateToPositions],
  );

  const onPaneClick = useCallback(() => {
    setFocusedNodeId(null);
    setHoveredNodeId(null);
    setHoveredEdgeId(null);
  }, []);

  // Explicit toolbar actions
  const handleTidyWeb = useCallback(() => {
    setFocusedNodeId(null);
    setHoveredNodeId(null);
    setCompactPeripheral(false);

    const inputs = getCurrentLayoutInputs();
    const positions = solveTidyWebLayout({
      nodes: inputs,
      edges: layoutEdges,
      containerWidth: canvasSizeRef.current.width,
      containerHeight: canvasSizeRef.current.height,
    });

    restingPositionsRef.current = positions;
    animateToPositions(positions, 300);

    const payload = Object.entries(positions).map(([id, p]) => ({
      id,
      x: p.x,
      y: p.y,
    }));
    updateJournalNodePositions(payload).catch((err) => {
      console.warn("Failed to save tidy layout positions:", err);
    });

    isAnimatingViewportRef.current = true;
    window.setTimeout(() => {
      fitView({ padding: 0.16, duration: 360 });
      window.setTimeout(() => {
        isAnimatingViewportRef.current = false;
        lastZoomRef.current = getViewport().zoom;
      }, 400);
    }, 60);
  }, [
    getCurrentLayoutInputs,
    layoutEdges,
    animateToPositions,
    fitView,
    getViewport,
  ]);

  const handleReflowToView = useCallback(() => {
    setCompactPeripheral(false);
    isAnimatingViewportRef.current = true;

    if (effectiveFocusedNodeId) {
      const inputs = getCurrentLayoutInputs(restingPositionsRef.current);
      const { positions, neighborIds } = solveFocusConstellation({
        anchorId: effectiveFocusedNodeId,
        nodes: inputs,
        edges: layoutEdges,
        restingPositions: restingPositionsRef.current,
      });
      animateToPositions(positions, 240);
      fitClusterInView(effectiveFocusedNodeId, neighborIds, positions);
      return;
    }

    animateToPositions(restingPositionsRef.current, 240);
    fitView({ padding: 0.14, duration: 340 });
    window.setTimeout(() => {
      isAnimatingViewportRef.current = false;
      lastZoomRef.current = getViewport().zoom;
    }, 380);
  }, [
    effectiveFocusedNodeId,
    getCurrentLayoutInputs,
    layoutEdges,
    animateToPositions,
    fitClusterInView,
    fitView,
    getViewport,
  ]);

  return (
    <div
      className={`${styles.gardenFlowWrapper} ${
        isConnecting ? styles.gardenConnecting : ""
      }`}
      ref={wrapperRef}
    >
      {/* Vertical Canvas Layout Controls (Top-Left, mirroring React Flow Controls) */}
      <div className={styles.canvasToolbar} role="toolbar" aria-label="Canvas view controls">
        <button
          type="button"
          className={styles.canvasToolBtn}
          onClick={handleTidyWeb}
          data-tooltip="Tidy Web"
          aria-label="Tidy Web — cluster connected thoughts cleanly and save arrangement"
        >
          <BroomIcon size={14} />
        </button>
        <button
          type="button"
          className={styles.canvasToolBtn}
          onClick={handleReflowToView}
          data-tooltip="Fit Screen"
          aria-label="Fit Screen — fit all cards cleanly into the current screen size"
        >
          <FrameCornersIcon size={14} />
        </button>
        <button
          type="button"
          className={`${styles.canvasToolBtn} ${autoReflow ? styles.canvasToolBtnActive : ""}`}
          onClick={() => {
            const next = !autoReflow;
            setAutoReflow(next);
            if (!next) {
              setCompactPeripheral(false);
              if (!effectiveFocusedNodeId) {
                animateToPositions(restingPositionsRef.current, 220);
              }
            }
          }}
          data-tooltip={`Auto-Reflow: ${autoReflow ? "On" : "Off"}`}
          aria-label={`Auto-Reflow: ${autoReflow ? "On" : "Off"}`}
          aria-pressed={autoReflow}
        >
          <MagnetIcon size={14} weight={autoReflow ? "fill" : "regular"} />
        </button>
      </div>

      <ReactFlow<FlowNode<IdeaNodeData>, FlowEdge<FloatingEdgeData>>
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onClickConnectStart={onConnectStart}
        onClickConnectEnd={onConnectEnd}
        onEdgesDelete={onEdgesDelete}
        onEdgeMouseEnter={onEdgeMouseEnter}
        onEdgeMouseLeave={onEdgeMouseLeave}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionLineComponent={FloatingConnectionLine}
        connectionMode={ConnectionMode.Loose}
        connectionRadius={42}
        connectOnClick={true}
        proOptions={{ hideAttribution: true }}
        minZoom={0.2}
        maxZoom={2}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.2}
          color="rgba(255, 255, 255, 0.08)"
        />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}

export function Garden({
  snapshot,
  viewMode,
  searchQuery = "",
  activeTopicId = null,
  onRefresh,
  isNewNodeOpen,
  onOpenNewNode,
  onCloseNewNode,
}: GardenProps) {
  const [selectedNode, setSelectedNode] = useState<NodeWithState | null>(null);

  // Filtered nodes for list view
  const q = searchQuery.trim().toLowerCase();
  const filteredItems = (snapshot?.nodes || []).filter((n) =>
    q
      ? n.node.title.toLowerCase().includes(q) ||
        (n.node.body?.toLowerCase().includes(q) ?? false) ||
        n.tags.some((t) => t.toLowerCase().includes(q))
      : true,
  );

  return (
    <div className={styles.gardenRoot}>
      {/* Main Content: Map or List */}
      <div className={styles.gardenContent}>
        {viewMode === "map" ? (
          !snapshot || snapshot.nodes.length === 0 ? (
            <div className={styles.gardenFlowWrapper}>
              <div className={styles.emptyGardenPrompt}>
                <h3>Your garden is waiting.</h3>
                <p>Plant your first questions and open thoughts to begin.</p>
                <div className={styles.emptyActions}>
                  <button className={styles.btnPrimary} onClick={onOpenNewNode}>
                    + Plant Thoughts into Garden
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <ReactFlowProvider>
              <GardenMapCanvas
                snapshot={snapshot}
                searchQuery={searchQuery}
                activeTopicId={activeTopicId}
                onRefresh={onRefresh}
                onSelectForEdit={setSelectedNode}
              />
            </ReactFlowProvider>
          )
        ) : (
          <div className={styles.gardenListWrapper}>
            {filteredItems.length === 0 ? (
              <div className={styles.emptyGardenPrompt}>
                <h3>
                  {q
                    ? `No thoughts matching "${searchQuery}"`
                    : "Your garden is waiting."}
                </h3>
                <p>
                  {q
                    ? "Try a different search term or add a new thought."
                    : "Plant your first questions and open thoughts to begin."}
                </p>
                <div className={styles.emptyActions}>
                  <button className={styles.btnPrimary} onClick={onOpenNewNode}>
                    + Plant Thoughts into Garden
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.gardenList}>
                {filteredItems.map((item) => {
                  const colors = getOpennessColors(item.state.openness);
                  const isHighPriority = item.state.priority >= 8;
                  const isActiveTopic = item.node.id === activeTopicId;
                  return (
                    <div
                      key={item.node.id}
                      className={`${styles.gardenListRow} ${
                        isHighPriority ? styles.gardenListRowHighPriority : ""
                      } ${isActiveTopic ? styles.gardenListRowActive : ""}`}
                      style={{
                        backgroundColor: colors.bg,
                        borderColor: isActiveTopic ? colors.accent : colors.border,
                        boxShadow: isActiveTopic
                          ? `0 0 0 1px ${colors.accent}, 0 10px 28px rgba(0, 0, 0, 0.55)`
                          : undefined,
                      }}
                      onClick={() => setSelectedNode(item)}
                    >
                      <div className={styles.listRowTop}>
                        <div className={styles.listRowMeta}>
                          <span
                            className={styles.nodeKindBadge}
                            style={{ color: colors.accent }}
                          >
                            {item.node.kind}
                          </span>
                          {item.tags.length > 0 && (
                            <div className={styles.listRowTags}>
                              {item.tags.map((t) => (
                                <span key={t} className={styles.cardTag}>
                                  #{t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className={styles.listRowScores}>
                          <span
                            className={styles.scorePill}
                            title={`Priority: ${item.state.priority}/10`}
                          >
                            P{item.state.priority}
                          </span>
                          <span
                            className={styles.scorePill}
                            title={`Intensity: ${item.state.intensity}/10`}
                          >
                            I{item.state.intensity}
                          </span>
                          <span
                            className={styles.scorePill}
                            style={{ color: colors.accent }}
                            title={`Openness: ${item.state.openness}/10`}
                          >
                            O{item.state.openness}
                          </span>
                        </div>
                      </div>

                      <div className={styles.listRowTitle}>{item.node.title}</div>

                      {item.node.body && (
                        <div className={styles.listRowBody}>{item.node.body}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Node Popover Inspector */}
      {selectedNode && (
        <NodePopover
          nodeWithState={selectedNode}
          onClose={() => setSelectedNode(null)}
          onNodeUpdated={() => {
            onRefresh();
          }}
        />
      )}

      {/* New Node Modal */}
      <NewNodeModal
        isOpen={isNewNodeOpen}
        onClose={onCloseNewNode}
        onCreated={onRefresh}
      />
    </div>
  );
}
