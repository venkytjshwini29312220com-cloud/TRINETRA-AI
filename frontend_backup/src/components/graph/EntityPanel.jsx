import { useEffect, useState } from "react";
import {
  Building2,
  FileText,
  Landmark,
  Network,
  User,
  X,
} from "lucide-react";
import { motion } from "framer-motion";

import { getEntityRelationships } from "../../services/graphApi";

function getEntityIcon(type) {
  const normalized = type?.toLowerCase();

  if (normalized === "person") {
    return User;
  }

  if (
    normalized === "organization" ||
    normalized === "company"
  ) {
    return Building2;
  }

  if (
    normalized === "bank" ||
    normalized === "financial_institution"
  ) {
    return Landmark;
  }

  return Network;
}

function formatRelationship(type) {
  if (!type) {
    return "RELATED TO";
  }

  return type
    .replaceAll("_", " ")
    .toUpperCase();
}

function getRiskLevel(score) {
  if (score === null || score === undefined) {
    return {
      label: "UNKNOWN",
      className: "unknown",
    };
  }

  if (score >= 70) {
    return {
      label: "HIGH",
      className: "high",
    };
  }

  if (score >= 40) {
    return {
      label: "MEDIUM",
      className: "medium",
    };
  }

  return {
    label: "LOW",
    className: "low",
  };
}

function EntityPanel({
  entity,
  onClose,
}) {
  const [relationships, setRelationships] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState(null);

  useEffect(() => {
    if (!entity?.type || !entity?.value) {
      setRelationships([]);
      setError(null);
      return;
    }

    let cancelled = false;

    async function loadRelationships() {
      setLoading(true);
      setError(null);

      try {
        const response =
          await getEntityRelationships(
            entity.type,
            entity.value,
          );

        if (cancelled) {
          return;
        }

        if (!response?.success) {
          throw new Error(
            response?.error ||
              response?.detail ||
              "Unable to load entity intelligence.",
          );
        }

        setRelationships(
          Array.isArray(response.relationships)
            ? response.relationships
            : [],
        );
      } catch (requestError) {
        if (cancelled) {
          return;
        }

        console.error(
          "TRINETRA entity intelligence error:",
          requestError,
        );

        setRelationships([]);

        setError(
          requestError?.response?.data?.detail ||
            requestError?.message ||
            "Unable to load entity relationships.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadRelationships();

    return () => {
      cancelled = true;
    };
  }, [entity]);

  if (!entity) {
    return null;
  }

  const Icon = getEntityIcon(entity.type);

  /*
   * The graph currently provides relationship confidence.
   * Risk will be connected to the entity API when we add
   * the dedicated risk endpoint to the panel.
   *
   * For now, only use a score if the selected entity already
   * carries one.
   */
  const riskScore =
    entity.riskScore ??
    entity.risk_score ??
    null;

  const risk = getRiskLevel(riskScore);

  const visibleRelationships =
    relationships.slice(0, 6);

  return (
    <motion.aside
      className="tn-entity-panel tn-glass"
      initial={{
        opacity: 0,
        x: 35,
      }}
      animate={{
        opacity: 1,
        x: 0,
      }}
      exit={{
        opacity: 0,
        x: 35,
      }}
      transition={{
        duration: 0.25,
        ease: "easeOut",
      }}
    >
      {/* HEADER */}

      <div className="tn-entity-simple-header">
        <div className="tn-entity-identity">
          <div className="tn-entity-icon">
            <Icon size={18} />
          </div>

          <div className="tn-entity-name-block">
            <span className="tn-entity-type">
              {entity.type?.toUpperCase()}
            </span>

            <h3>{entity.value}</h3>
          </div>
        </div>

        <button
          type="button"
          className="tn-entity-close"
          onClick={onClose}
          aria-label="Close entity intelligence"
        >
          <X size={16} />
        </button>
      </div>

      {/* BODY */}

      <div className="tn-entity-simple-body">

        {/* RISK */}

        <section className="tn-simple-risk">
          <div className="tn-simple-section-label">
            RISK ASSESSMENT
          </div>

          {riskScore !== null ? (
            <>
              <div className="tn-risk-main">
                <strong>{riskScore}</strong>

                <span
                  className={`tn-risk-label ${risk.className}`}
                >
                  {risk.label}
                </span>
              </div>

              <div className="tn-risk-track">
                <motion.div
                  className={`tn-risk-fill ${risk.className}`}
                  initial={{ width: 0 }}
                  animate={{
                    width: `${Math.min(
                      100,
                      Math.max(0, riskScore),
                    )}%`,
                  }}
                  transition={{
                    duration: 0.7,
                    ease: "easeOut",
                  }}
                />
              </div>

              <div className="tn-risk-scale">
                <span>0</span>
                <span>50</span>
                <span>100</span>
              </div>
            </>
          ) : (
            <div className="tn-risk-unavailable">
              Risk score unavailable
            </div>
          )}
        </section>

        {/* CONNECTIONS */}

        <section className="tn-simple-connections">
          <div className="tn-simple-section-heading">
            <Network size={14} />

            <span>CONNECTIONS</span>

            <strong>
              {relationships.length}
            </strong>
          </div>

          {loading && (
            <div className="tn-simple-loading">
              <div />
              <div />
              <div />
            </div>
          )}

          {error && (
            <div className="tn-simple-error">
              {error}
            </div>
          )}

          {!loading &&
            !error &&
            relationships.length === 0 && (
              <div className="tn-simple-empty">
                No connections recorded.
              </div>
            )}

          {!loading &&
            !error &&
            visibleRelationships.length > 0 && (
              <div className="tn-simple-relationship-list">
                {visibleRelationships.map(
                  (
                    relationship,
                    index,
                  ) => (
                    <motion.div
                      key={`${relationship.relationship_type}-${relationship.target_value}-${index}`}
                      className="tn-simple-relationship"
                      initial={{
                        opacity: 0,
                        y: 6,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                      }}
                      transition={{
                        delay: index * 0.04,
                      }}
                    >
                      <div className="tn-connection-dot" />

                      <div className="tn-connection-content">
                        <strong>
                          {relationship.target_value ||
                            relationship.target ||
                            "Unknown"}
                        </strong>

                        <span>
                          {formatRelationship(
                            relationship.relationship_type,
                          )}
                        </span>
                      </div>

                      <div className="tn-connection-confidence">
                        {relationship.confidence !==
                        null &&
                        relationship.confidence !==
                          undefined
                          ? `${Math.round(
                              relationship.confidence *
                                100,
                            )}%`
                          : "—"}
                      </div>
                    </motion.div>
                  ),
                )}
              </div>
            )}
        </section>

        {/* SUMMARY */}

        <div className="tn-simple-summary">
          <div>
            <strong>
              {relationships.length}
            </strong>

            <span>RELATIONSHIPS</span>
          </div>

          <div>
            <strong>
              {
                relationships.filter(
                  (item) =>
                    item?.evidence_text ||
                    item?.evidence_id,
                ).length
              }
            </strong>

            <span>EVIDENCE LINKS</span>
          </div>
        </div>
      </div>

      {/* FOOTER */}

      <div className="tn-simple-footer">
        <span className="tn-panel-live-dot" />

        <span>LIVE INTELLIGENCE</span>
      </div>
    </motion.aside>
  );
}

export default EntityPanel;