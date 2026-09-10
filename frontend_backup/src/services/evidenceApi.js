import api from "./api";

export async function searchEvidence(params = {}) {
  const response = await api.get("/evidence/search/", {
    params,
  });

  return response.data;
}

export async function getEvidence(evidenceId) {
  const response = await api.get(`/evidence/${evidenceId}`);
  return response.data;
}

export async function uploadEvidence(formData) {
  const response = await api.post("/evidence/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    timeout: 120000,
  });

  return response.data;
}