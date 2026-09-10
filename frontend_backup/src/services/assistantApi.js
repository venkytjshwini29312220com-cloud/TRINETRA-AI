import api from "./api";

export async function getAssistantHealth() {
  const response = await api.get("/assistant/health");
  return response.data;
}

export async function askAssistant(question, investigationId = null) {
  if (investigationId !== null) {
    const response = await api.post(
      `/assistant/investigations/${investigationId}/ask`,
      {
        question,
      },
    );

    return response.data;
  }

  const response = await api.post("/assistant/ask", {
    question,
  });

  return response.data;
}

export async function getAssistantContext(investigationId, entityId = null) {
  const response = await api.get("/assistant/context", {
    params: {
      investigation_id: investigationId,
      entity_id: entityId,
    },
  });

  return response.data;
}