import { useCallback, useState } from "react";
import { getNeighborhood } from "../services/graphApi";

function useGraph() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [selectedEntity, setSelectedEntity] = useState(null);

  const loadNeighborhood = useCallback(
    async ({
      entityType,
      entityValue,
      depth = 1,
      limit = 100,
    }) => {
      setLoading(true);
      setError(null);

      try {
        const cleanType = entityType.trim();
        const cleanValue = entityValue.trim();

        if (!cleanType || !cleanValue) {
          throw new Error(
            "Enter both an entity type and entity value.",
          );
        }

        console.log("TRINETRA graph request:", {
          entityType: cleanType,
          entityValue: cleanValue,
          depth,
          limit,
        });

        const response = await getNeighborhood({
          entityType: cleanType,
          entityValue: cleanValue,
          depth,
          limit,
        });

        console.log("TRINETRA graph response:", response);

        if (!response?.success) {
          throw new Error(
            response?.error ||
              response?.detail ||
              "Graph request failed.",
          );
        }

        const records = Array.isArray(response.results)
          ? response.results
          : [];

        console.log("TRINETRA graph records:", records);

        if (records.length === 0) {
          setNodes([]);
          setEdges([]);

          setSelectedEntity({
            id: null,
            type: cleanType,
            value: cleanValue,
          });

          setError(
            `No graph relationships found for ${cleanValue}.`,
          );

          return response;
        }

        const nodeMap = new Map();
        const edgeMap = new Map();

        const addNode = (id, type, value) => {
          if (!id) {
            return;
          }

          const nodeId = String(id);

          if (!nodeMap.has(nodeId)) {
            nodeMap.set(nodeId, {
              id: nodeId,
              type: type || "ENTITY",
              value: value || "Unknown",
            });
          }
        };

        records.forEach((record) => {
          const startId = record.start_id;
          const neighborId = record.neighbor_id;

          addNode(
            startId,
            record.start_type,
            record.start_value,
          );

          addNode(
            neighborId,
            record.neighbor_type,
            record.neighbor_value,
          );

          const relationships = Array.isArray(
            record.relationships,
          )
            ? record.relationships
            : [];

          relationships.forEach((relationship, index) => {
            if (!startId || !neighborId) {
              return;
            }

            const relationshipType =
              relationship?.relationship_type ||
              "RELATED_TO";

            const edgeId = [
              String(startId),
              String(neighborId),
              relationshipType,
              index,
            ].join("::");

            if (!edgeMap.has(edgeId)) {
              edgeMap.set(edgeId, {
                id: edgeId,
                source: String(startId),
                target: String(neighborId),
                relationshipType,
                confidence:
                  relationship?.confidence ?? null,
                evidenceText:
                  relationship?.evidence_text ?? null,
                sourceField:
                  relationship?.source_field ?? null,
              });
            }
          });
        });

        const graphNodes = Array.from(nodeMap.values());
        const graphEdges = Array.from(edgeMap.values());

        console.log(
          "TRINETRA graph nodes:",
          graphNodes,
        );

        console.log(
          "TRINETRA graph edges:",
          graphEdges,
        );

        setNodes(graphNodes);
        setEdges(graphEdges);

        const focusedNode = graphNodes.find(
          (node) =>
            node.value?.trim().toLowerCase() ===
            cleanValue.toLowerCase(),
        );

        setSelectedEntity({
          id: focusedNode?.id || graphNodes[0]?.id || null,
          type: focusedNode?.type || cleanType,
          value: focusedNode?.value || cleanValue,
        });

        return response;
      } catch (requestError) {
        console.error(
          "TRINETRA graph error:",
          requestError,
        );

        setNodes([]);
        setEdges([]);
        setSelectedEntity(null);

        setError(
          requestError?.response?.data?.detail ||
            requestError?.response?.data?.error ||
            requestError?.message ||
            "Unable to load investigation graph.",
        );

        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const clearGraph = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setSelectedEntity(null);
    setError(null);
  }, []);

  return {
    nodes,
    edges,
    loading,
    error,
    selectedEntity,
    setSelectedEntity,
    loadNeighborhood,
    clearGraph,
  };
}

export default useGraph;