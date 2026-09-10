import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
} from "reactflow";

import "reactflow/dist/style.css";

function buildPositions(nodes) {
  const centerX = 450;
  const centerY = 280;

  if (nodes.length === 0) {
    return [];
  }

  return nodes.map((node, index) => {
    if (index === 0) {
      return {
        ...node,
        position: {
          x: centerX,
          y: centerY,
        },
      };
    }

    const remaining = nodes.length - 1;

    const angle =
      (index / Math.max(remaining, 1)) * Math.PI * 2;

    const radius =
      remaining <= 4
        ? 220
        : Math.min(330, 150 + remaining * 12);

    return {
      ...node,
      position: {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
      },
    };
  });
}

function GraphNode({ data }) {
  return (
    <div className="tn-react-flow-node">
      <div className="tn-react-flow-node-pulse" />

      <div className="tn-react-flow-node-type">
        {data.type}
      </div>

      <div className="tn-react-flow-node-name">
        {data.value}
      </div>
    </div>
  );
}

const nodeTypes = {
  intelligence: GraphNode,
};

function InvestigationGraph({
  nodes,
  edges,
  selectedEntity,
  onNodeClick,
}) {
  const positionedNodes = buildPositions(
    nodes.map((node) => ({
      id: node.id,
      type: "intelligence",
      data: {
        type: node.type,
        value: node.value,
      },
    })),
  );

  const flowEdges = edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.relationshipType,
    animated: true,
    data: {
      confidence: edge.confidence,
      evidenceText: edge.evidenceText,
      sourceField: edge.sourceField,
    },
  }));

  return (
    <div className="tn-investigation-graph">
      {nodes.length === 0 ? (
        <div className="tn-graph-empty">
          <div className="tn-graph-empty-orbit">
            <div className="tn-graph-empty-core" />
          </div>

          <div className="tn-graph-empty-title">
            GRAPH READY
          </div>

          <div className="tn-graph-empty-description">
            Search for an entity to load connected
            intelligence from Neo4j.
          </div>
        </div>
      ) : (
        <ReactFlow
          nodes={positionedNodes}
          edges={flowEdges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{
            padding: 0.25,
          }}
          minZoom={0.25}
          maxZoom={2}
          onNodeClick={(_, node) => {
            const originalNode = nodes.find(
              (item) => item.id === node.id,
            );

            if (originalNode) {
              onNodeClick?.(originalNode);
            }
          }}
        >
          <Background
            gap={28}
            size={1}
            color="rgba(100, 116, 139, 0.10)"
          />

          <Controls />

          <MiniMap
            pannable
            zoomable
            nodeColor="rgba(34, 211, 238, 0.7)"
          />
        </ReactFlow>
      )}

      {selectedEntity && (
        <div className="tn-graph-selection">
          <span className="tn-status-dot" />

          <span>
            FOCUSED:{" "}
            <strong>{selectedEntity.value}</strong>
          </span>
        </div>
      )}
    </div>
  );
}

export default InvestigationGraph;