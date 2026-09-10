import api from "./api";

export async function getGraphHealth() {
  const response = await api.get("/graph/health");
  return response.data;
}

export async function getGraphStats() {
  const response = await api.get("/graph/stats");
  return response.data;
}

export async function getEntityRelationships(
  entityType,
  entityValue,
) {
  const response = await api.get(
    "/graph/relationships",
    {
      params: {
        entity_type: entityType?.trim(),
        entity_value: entityValue?.trim(),
      },
    },
  );

  return response.data;
}

export async function getShortestPath({
  sourceType,
  sourceValue,
  targetType,
  targetValue,
  maxDepth = 6,
}) {
  const response = await api.get("/graph/shortest-path", {
    params: {
      source_type: sourceType,
      source_value: sourceValue,
      target_type: targetType,
      target_value: targetValue,
      max_depth: maxDepth,
    },
  });

  return response.data;
}

export async function getNeighborhood({
  entityType,
  entityValue,
  depth = 1,
  limit = 100,
}) {
  const response = await api.post("/graph/neighborhood", {
    entity_type: entityType,
    entity_value: entityValue,
    depth,
    limit,
  });

  return response.data;
}