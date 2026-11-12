import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Edge as FlowEdge,
  type Node as FlowNode,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { GraphSnapshot, NodeWithState } from "../../../types";
import { createJournalEdge } from "../../../api/journal";
import { IdeaNodeCard, type IdeaNodeData } from "../components/IdeaNodeCard";
import { NodePopover } from "../components/NodePopover";
import { NewNodeModal } from "../components/NewNodeModal";
import styles from "./Garden.module.css";

interface GardenProps {
  snapshot: GraphSnapshot | null;
  viewMode: "map" | "list";
  searchQuery?: string;
  onRefresh: () => void;
  isNewNodeOpen: boolean;
  onOpenNewNode: () => void;
  onCloseNewNode: () => void;
}

export function Garden({
  snapshot,
  viewMode,
  searchQuery = "",
  onRefresh,
  isNewNodeOpen,
  onOpenNewNode,
  onCloseNewNode,
}: GardenProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode<IdeaNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>([]);
  const [selectedNode, setSelectedNode] = useState<NodeWithState | null>(null);

  const nodeTypes = useMemo(() => ({ ideaNode: IdeaNodeCard }), []);

  // Sync snapshot nodes and edges to React Flow, with search-dimming
  useEffect(() => {
    if (!snapshot || !Array.isArray(snapshot.nodes)) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const q = searchQuery.trim().toLowerCase();

    // Layout nodes organically around a center grid
    const total = snapshot.nodes.length;
    const cols = Math.max(1, Math.ceil(Math.sqrt(total * 1.5)));
    const colSpacing = 280;
    const rowSpacing = 200;

    const flowNodes: FlowNode<IdeaNodeData>[] = snapshot.nodes.map((n, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);

      // Add gentle jitter so it looks hand-placed rather than rigid
      const jitterX = ((idx * 37) % 40) - 20;
      const jitterY = ((idx * 53) % 40) - 20;

      const isMatch =
        !q ||
        n.node.title.toLowerCase().includes(q) ||
        (n.tags && n.tags.some((t) => t.toLowerCase().includes(q)));

      return {
        id: n.node.id,
        type: "ideaNode",
        position: {
          x: 100 + col * colSpacing + jitterX,
          y: 80 + row * rowSpacing + jitterY,
        },
        data: {
          item: n,
          isDimmed: !isMatch,
        },
      };
    });

    const flowEdges: FlowEdge[] = (snapshot.edges || []).map((e) => ({
      id: e.id,
      source: e.src,
      target: e.dst,
      label: e.relation !== "part_of" ? e.relation : undefined,
      animated: e.status === "pending",
      style: {
        stroke: e.status === "pending" ? "#d97757" : "rgba(138, 134, 127, 0.45)",
        strokeWidth: 1.5,
      },
    }));

    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [snapshot, searchQuery, setNodes, setEdges]);

  // Handle user linking two nodes in the graph
  const onConnect = useCallback(
    async (params: Connection) => {
      if (params.source && params.target && params.source !== params.target) {
        setEdges((eds) => addEdge(params, eds));
        try {
          await createJournalEdge({
            src: params.source,
            dst: params.target,
            relation: "relates_to",
          });
          onRefresh();
        } catch (err) {
          console.error("Failed to persist edge:", err);
        }
      }
    },
    [setEdges, onRefresh],
  );

  // When a node card is clicked in the Garden, open the inspector popover
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: FlowNode) => {
      const nodeData = node.data as unknown as IdeaNodeData;
      if (nodeData?.item) {
        setSelectedNode(nodeData.item);
      }
    },
    [],
  );

  // Filtered nodes for list view
  const q = searchQuery.trim().toLowerCase();
  const filteredItems = (snapshot?.nodes || []).filter((n) =>
    q
      ? n.node.title.toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q))
      : true,
  );

  return (
    <div className={styles.gardenRoot}>
      {/* Main Content: Map or List */}
      <div className={styles.gardenContent}>
        {viewMode === "map" ? (
          <div className={styles.gardenFlowWrapper}>
            {!snapshot || snapshot.nodes.length === 0 ? (
              <div className={styles.emptyGardenPrompt}>
                <h3>Your garden is waiting.</h3>
                <p>Plant your first questions and open thoughts to begin.</p>
                <div className={styles.emptyActions}>
                  <button
                    className={styles.btnPrimary}
                    onClick={onOpenNewNode}
                  >
                    + Plant Thoughts into Garden
                  </button>
                </div>
              </div>
            ) : (
              <ReactFlow<FlowNode<IdeaNodeData>, FlowEdge>
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={onNodeClick}
                nodeTypes={nodeTypes}
                proOptions={{ hideAttribution: true }}
                fitView
                fitViewOptions={{ padding: 0.3 }}
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
            )}
          </div>
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
                  <button
                    className={styles.btnPrimary}
                    onClick={onOpenNewNode}
                  >
                    + Plant Thoughts into Garden
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.gardenList}>
                {filteredItems.map((item) => (
                  <div
                    key={item.node.id}
                    className={styles.gardenListRow}
                    onClick={() => setSelectedNode(item)}
                  >
                    <div className={styles.listRowMain}>
                      <span className={styles.nodeKindBadge}>{item.node.kind}</span>
                      <span className={styles.listRowTitle}>{item.node.title}</span>
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
                      <span className={styles.scorePill} title="Priority">
                        P{item.state.priority}
                      </span>
                      <span className={styles.scorePill} title="Intensity">
                        I{item.state.intensity}
                      </span>
                      <span className={styles.scorePill} title="Openness">
                        O{item.state.openness}
                      </span>
                    </div>
                  </div>
                ))}
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
