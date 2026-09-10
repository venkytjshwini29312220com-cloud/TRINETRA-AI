import api from "./api";

export async function getInvestigationSummary(investigationId) {
  const response = await api.get(
    `/analytics/investigations/${investigationId}/summary`,
  );

  return response.data;
}

export async function getRisk(params = {}) {
  const response = await api.get("/analytics/risk", {
    params,
  });

  return response.data;
}

export async function getPatterns(params = {}) {
  const response = await api.get("/analytics/patterns", {
    params,
  });

  return response.data;
}

export async function getGraphCentrality(params = {}) {
  const response = await api.get("/analytics/graph/centrality", {
    params,
  });

  return response.data;
}

export async function getGraphConnectivity(params = {}) {
  const response = await api.get("/analytics/graph/connectivity", {
    params,
  });

  return response.data;
}