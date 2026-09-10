import { useCallback, useEffect, useState } from "react";

import {
  listEvidence,
  searchEvidence,
  uploadEvidence,
  ingestEvidence,
  normalizeEvidence,
  normalizeExtraction,
  normalizeIngestion,
} from "../services/evidenceApi";

export function useEvidence(caseId = 1) {
  const [evidence, setEvidence] = useState([]);
  const [selectedEvidence, setSelectedEvidence] =
    useState(null);

  const [extraction, setExtraction] = useState(null);
  const [ingestion, setIngestion] = useState(null);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [error, setError] = useState(null);

  /**
   * Load evidence records.
   */
  const loadEvidence = useCallback(
    async (params = {}) => {
      setLoading(true);
      setError(null);

      try {
        const result = await listEvidence(params);

        const records =
          Array.isArray(result)
            ? result
            : result?.evidence ||
              result?.results ||
              result?.data ||
              [];

        const normalized = records
          .map(normalizeEvidence)
          .filter(Boolean);

        setEvidence(normalized);

        return normalized;
      } catch (err) {
        const message =
          err?.response?.data?.detail ||
          err?.message ||
          "Failed to load evidence.";

        setError(message);

        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Search evidence.
   */
  const search = useCallback(async (query) => {
    setLoading(true);
    setError(null);

    try {
      const result = await searchEvidence(query);

      const records =
        Array.isArray(result)
          ? result
          : result?.evidence ||
            result?.results ||
            result?.data ||
            [];

      const normalized = records
        .map(normalizeEvidence)
        .filter(Boolean);

      setEvidence(normalized);

      return normalized;
    } catch (err) {
      const message =
        err?.response?.data?.detail ||
        err?.message ||
        "Evidence search failed.";

      setError(message);

      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Upload evidence and wait for the backend
   * extraction + ingestion response.
   */
  const upload = useCallback(
    async ({
      evidenceNumber,
      title,
      evidenceType = "document",
      description = "",
      sourceType = "",
      sourceReference = "",
      file,
    }) => {
      setUploading(true);
      setUploadProgress(0);
      setError(null);
      setExtraction(null);
      setIngestion(null);

      try {
        const result = await uploadEvidence({
          caseId,
          evidenceNumber,
          title,
          evidenceType,
          description,
          sourceType,
          sourceReference,
          file,

          onUploadProgress: (event) => {
            if (!event?.total) {
              return;
            }

            const progress = Math.round(
              (event.loaded / event.total) * 100
            );

            setUploadProgress(progress);
          },
        });

        const normalizedEvidence =
          normalizeEvidence(result?.evidence);

        const normalizedExtraction =
          normalizeExtraction(result);

        const normalizedIngestion =
          normalizeIngestion(result);

        if (normalizedEvidence) {
          setSelectedEvidence(
            normalizedEvidence
          );

          setEvidence((current) => {
            const exists = current.some(
              (item) =>
                item.id === normalizedEvidence.id
            );

            if (exists) {
              return current.map((item) =>
                item.id === normalizedEvidence.id
                  ? normalizedEvidence
                  : item
              );
            }

            return [
              normalizedEvidence,
              ...current,
            ];
          });
        }

        setExtraction(normalizedExtraction);
        setIngestion(normalizedIngestion);
        setUploadProgress(100);

        return result;
      } catch (err) {
        const message =
          err?.response?.data?.detail ||
          err?.message ||
          "Evidence upload failed.";

        setError(message);

        throw err;
      } finally {
        setUploading(false);
      }
    },
    [caseId]
  );

  /**
   * Re-run ingestion for an existing evidence record.
   */
  const ingest = useCallback(async (evidenceId) => {
    setLoading(true);
    setError(null);

    try {
      const result =
        await ingestEvidence(evidenceId);

      const normalizedExtraction =
        normalizeExtraction(result);

      const normalizedIngestion =
        normalizeIngestion(result);

      setExtraction(normalizedExtraction);
      setIngestion(normalizedIngestion);

      await loadEvidence();

      return result;
    } catch (err) {
      const message =
        err?.response?.data?.detail ||
        err?.message ||
        "Evidence ingestion failed.";

      setError(message);

      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadEvidence]);

  /**
   * Select an evidence record.
   */
  const selectEvidence = useCallback(
    (item) => {
      setSelectedEvidence(item);
      setError(null);
    },
    []
  );

  /**
   * Clear selected evidence and processing output.
   */
  const clearSelection = useCallback(() => {
    setSelectedEvidence(null);
    setExtraction(null);
    setIngestion(null);
    setError(null);
  }, []);

  /**
   * Load evidence automatically when the hook mounts.
   */
  useEffect(() => {
    loadEvidence().catch(() => {
      // Error is already stored in state.
    });
  }, [loadEvidence]);

  return {
    evidence,
    selectedEvidence,

    extraction,
    ingestion,

    loading,
    uploading,
    uploadProgress,
    error,

    loadEvidence,
    search,
    upload,
    ingest,
    selectEvidence,
    clearSelection,
  };
}