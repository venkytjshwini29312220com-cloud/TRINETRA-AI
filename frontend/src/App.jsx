import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  Database,
  FileSearch,
  GitBranch,
  LayoutDashboard,
  Moon,
  Network,
  RefreshCw,
  Search,
  Settings,
  Shield,
  Sparkles,
  Sun,
  TriangleAlert,
  UploadCloud,
} from "lucide-react";

import { getDashboardData } from "./services/dashboardApi";

import { lazy, Suspense } from "react";

const Evidence = lazy(() => import("./pages/Evidence"));
const Graph = lazy(() => import("./pages/Graph"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Assistant = lazy(() => import("./pages/Assistant"));
const Cases = lazy(() => import("./pages/Cases"));

const DEFAULT_INVESTIGATION_ID = 1;
const REFRESH_INTERVAL_MS = 10000;

function formatNumber(value) {
  return Number.isFinite(Number(value))
    ? Number(value).toLocaleString()
    : "—";
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function firstDefined(...values) {
  return values.find(
    (value) =>
      value !== undefined &&
      value !== null
  );
}

function extractRisk(summary) {
  const candidates = [
    summary?.risk?.score,
    summary?.risk?.risk_score,
    summary?.risk?.results?.score,
    summary?.risk?.results?.risk_score,
    summary?.risk?.results?.overall_score,
    summary?.risk?.assessment?.score,
    summary?.risk?.assessment?.risk_score,
  ];

  const raw = candidates.find(
    (value) =>
      value !== undefined &&
      value !== null
  );

  if (raw === undefined) {
    return null;
  }

  const numeric = Number(raw);

  if (!Number.isFinite(numeric)) {
    return null;
  }

  return numeric <= 1
    ? Math.round(numeric * 100)
    : Math.round(numeric);
}

function extractRiskLabel(summary, score) {
  const raw = firstDefined(
    summary?.risk?.severity,
    summary?.risk?.level,
    summary?.risk?.results?.severity,
    summary?.risk?.results?.level,
    summary?.risk?.assessment?.severity
  );

  if (raw) {
    return String(raw).toUpperCase();
  }

  if (score === null) {
    return "UNKNOWN";
  }

  if (score >= 70) {
    return "HIGH";
  }

  if (score >= 40) {
    return "MEDIUM";
  }

  return "LOW";
}

function extractRelationships(summary) {
  const candidates = [
    summary?.graph?.relationships,
    summary?.graph?.results,
    summary?.graph?.connections,
    summary?.graph,
  ];

  const source = candidates.find(
    Array.isArray
  );

  if (!source) {
    return [];
  }

  return source
    .map((item) => ({
      source:
        item?.source_value ||
        item?.value ||
        item?.source ||
        "Unknown",

      target:
        item?.target_value ||
        item?.neighbor_value ||
        item?.target ||
        "Unknown",

      type:
        item?.relationship_type ||
        item?.type ||
        "RELATED TO",

      confidence:
        item?.confidence ??
        item?.relationship_properties
          ?.confidence ??
        null,
    }))
    .filter(
      (item) =>
        item.target !== "Unknown"
    );
}

function extractPatterns(summary) {
  const source = firstDefined(
    summary?.patterns?.results,
    summary?.patterns
  );

  if (!Array.isArray(source)) {
    return [];
  }

  return source.slice(0, 5);
}

/*
 * Convert the browser URL into one of the
 * application page keys.
 *
 * /
 * /evidence
 * /graph
 * /analytics
 * /assistant
 */
function getPageFromPath() {
  const path =
    window.location.pathname
      .replace(/^\/+|\/+$/g, "")
      .toLowerCase();

  switch (path) {
    case "evidence":
      return "evidence";

    case "graph":
      return "graph";

    case "analytics":
      return "analytics";

    case "assistant":
      return "assistant";

    case "cases":
      return "cases";

    case "":
    default:
      return "dashboard";
  }
}

function App() {
  /*
   * NEW:
   * Tracks which application module is currently
   * visible.
   *
   * Dashboard remains the default.
   */
  const [
    activePage,
    setActivePage,
  ] = useState(
    getPageFromPath
  );

  const [theme, setTheme] =
    useState(() => {
      try {
        return (
          localStorage.getItem(
            "trinetra-theme"
          ) || "dark"
        );
      } catch {
        return "dark";
      }
    });

  const [dashboard, setDashboard] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState(null);

  const [lastUpdated, setLastUpdated] =
    useState(null);

  /*
   * Preserve existing theme behavior.
   */
  useEffect(() => {
    document.documentElement.dataset.theme =
      theme;

    try {
      localStorage.setItem(
        "trinetra-theme",
        theme
      );
    } catch {
      // Storage is optional.
    }
  }, [theme]);

  /*
   * Preserve existing dashboard API loading.
   */
  const loadDashboard =
    useCallback(
      async (manual = false) => {
        if (manual) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        try {
          const data =
            await getDashboardData(
              DEFAULT_INVESTIGATION_ID
            );

          setDashboard(data);

          setLastUpdated(
            new Date()
          );

          if (
            data.errors.length ===
            4
          ) {
            setError(
              "TRINETRA API is unreachable. Start the FastAPI backend and refresh."
            );
          } else if (
            data.errors.length > 0
          ) {
            setError(
              `${data.errors.length} dashboard data source(s) failed. Available data is still shown.`
            );
          } else {
            setError(null);
          }
        } catch (
          requestError
        ) {
          setError(
            requestError?.message ||
              "Unable to load dashboard data."
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      []
    );

  /*
   * Preserve automatic dashboard refresh.
   */
  useEffect(() => {
    loadDashboard();

    const interval =
      window.setInterval(
        () =>
          loadDashboard(),
        REFRESH_INTERVAL_MS
      );

    return () =>
      window.clearInterval(
        interval
      );
  }, [loadDashboard]);

  /*
   * NEW:
   * Keep browser Back / Forward buttons
   * synchronized with the application page.
   */
  useEffect(() => {
    const handlePopState =
      () => {
        setActivePage(
          getPageFromPath()
        );
      };

    window.addEventListener(
      "popstate",
      handlePopState
    );

    return () => {
      window.removeEventListener(
        "popstate",
        handlePopState
      );
    };
  }, []);

  /*
   * NEW:
   * Navigation handler.
   *
   * This does NOT reload the application.
   * It switches the existing React page and
   * updates the URL.
   */
  const handleNavigate =
    useCallback(
      (page) => {
        setActivePage(page);

        const path =
          page === "dashboard"
            ? "/"
            : `/${page}`;

        window.history.pushState(
          {},
          "",
          path
        );

        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      },
      []
    );

  /*
   * Existing dashboard data extraction.
   */
  const investigation =
    dashboard?.summary
      ?.investigation || {};

  const caseNumber =
    investigation.case_number ||
    investigation.case_value ||
    "—";

  const riskScore =
    extractRisk(
      dashboard?.summary
    );

  const riskLabel =
    extractRiskLabel(
      dashboard?.summary,
      riskScore
    );

  const relationships =
    useMemo(
      () =>
        extractRelationships(
          dashboard?.summary
        ),
      [dashboard?.summary]
    );

  const patterns =
    useMemo(
      () =>
        extractPatterns(
          dashboard?.summary
        ),
      [dashboard?.summary]
    );

  const evidence =
    Array.isArray(
      dashboard?.evidence
    )
      ? dashboard.evidence
      : [];

  const graphNodes =
    dashboard?.stats?.nodes;

  const graphRelationships =
    dashboard?.stats
      ?.relationships;

  const graphHealthy =
    dashboard?.health?.success &&
    dashboard?.health?.neo4j;

  /*
   * Navigation configuration.
   *
   * Previous navigation was preserved,
   * but now each item has a unique key.
   */
  const navigation = [
    {
      key: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },

    {
      key: "evidence",
      label: "Evidence",
      icon: FileSearch,
    },

    {
      key: "graph",
      label: "Investigation Graph",
      icon: Network,
    },

    {
      key: "analytics",
      label: "Analytics",
      icon: BarChart3,
    },

    {
      key: "assistant",
      label: "AI Assistant",
      icon: BrainCircuit,
    },

    {
      key: "cases",
      label: "Cases",
      icon: GitBranch,
    },
  ];

  /*
   * Page title used by the small route header
   * when we leave the Dashboard.
   */
  const pageTitles = {
    dashboard:
      "Investigation Command Center",

    evidence:
      "Evidence Intelligence",

    graph:
      "Investigation Graph",

    analytics:
      "Investigation Analytics",

    assistant:
      "AI Assistant",

    cases:
      "New Case Intake",
  };

  /*
   * Render the existing pages.
   */
  const renderPage =
    () => {
      switch (
        activePage
      ) {
        case "evidence":
  return (
    <Suspense fallback={<PageLoading />}>
      <Evidence />
    </Suspense>
  );

case "graph":
  return (
    <Suspense fallback={<PageLoading />}>
      <Graph />
    </Suspense>
  );

case "analytics":
  return (
    <Suspense fallback={<PageLoading />}>
      <Analytics />
    </Suspense>
  );

case "assistant":
  return (
    <Suspense fallback={<PageLoading />}>
      <Assistant />
    </Suspense>
  );

  case "cases":
  return (
    <Suspense fallback={<PageLoading />}>
      <Cases />
    </Suspense>
  );

        case "dashboard":
        default:
          /*
           * IMPORTANT:
           * The original Dashboard API-driven
           * interface remains here.
           */
          return (
            <>
              <div className="tn-workspace-header">
                <div>
                  <div className="tn-breadcrumb">
                    <span>
                      TRINETRA
                    </span>

                    <ChevronRight
                      size={13}
                    />

                    <span>
                      COMMAND CENTER
                    </span>
                  </div>

                  <h1 className="tn-display tn-page-title">
                    Investigation Command Center
                  </h1>

                  <p className="tn-page-subtitle">
                    Live investigation
                    state synchronized
                    from PostgreSQL,
                    Neo4j, and the
                    analytics layer.
                  </p>
                </div>

                <div className="tn-dashboard-live-meta">
                  <div className="tn-live-indicator">
                    <span
                      className={`tn-status-dot ${
                        graphHealthy
                          ? "tn-pulse"
                          : ""
                      }`}
                    />

                    {graphHealthy
                      ? "LIVE SYSTEM"
                      : "DEGRADED"}
                  </div>

                  <span className="tn-sync-time">
                    {lastUpdated
                      ? `SYNC ${formatDate(
                          lastUpdated
                        )}`
                      : "SYNCING…"}
                  </span>
                </div>
              </div>

              <AnimatePresence
                initial={false}
              >
                {error && (
                  <motion.div
                    className="tn-dashboard-alert"
                    initial={{
                      opacity: 0,
                      y: -8,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    exit={{
                      opacity: 0,
                      y: -8,
                    }}
                  >
                    <TriangleAlert
                      size={16}
                    />

                    <span>
                      {error}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="tn-stat-grid">
                <StatCard
                  icon={Database}
                  label="Graph Nodes"
                  value={
                    loading
                      ? "…"
                      : formatNumber(
                          graphNodes
                        )
                  }
                  detail="Neo4j live count"
                />

                <StatCard
                  icon={GitBranch}
                  label="Relationships"
                  value={
                    loading
                      ? "…"
                      : formatNumber(
                          graphRelationships
                        )
                  }
                  detail="Neo4j live count"
                />

                <StatCard
                  icon={FileSearch}
                  label="Evidence"
                  value={
                    loading
                      ? "…"
                      : formatNumber(
                          evidence.length
                        )
                  }
                  detail="PostgreSQL records"
                />

                <StatCard
                  icon={Shield}
                  label="Risk Signal"
                  value={
                    loading
                      ? "…"
                      : riskScore ===
                        null
                      ? "—"
                      : `${riskScore}`
                  }
                  detail={
                    riskScore ===
                    null
                      ? "Analytics unavailable"
                      : `${riskLabel} · investigation score`
                  }
                  accent
                />
              </div>

              <div className="tn-dashboard-grid">
                <motion.section
                  className="tn-glass tn-ambient tn-hero-panel"
                  whileHover={{
                    y: -2,
                  }}
                >
                  <div className="tn-panel-header">
                    <div>
                      <span className="tn-panel-kicker">
                        INVESTIGATION
                        GRAPH
                      </span>

                      <h2 className="tn-display tn-panel-title">
                        Connected
                        Intelligence
                      </h2>
                    </div>

                    <div className="tn-panel-chip">
                      <Activity
                        size={13}
                      />

                      {graphHealthy
                        ? "LIVE"
                        : "OFFLINE"}
                    </div>
                  </div>

                  <div className="tn-live-graph-area">
                    {loading &&
                    !dashboard ? (
                      <div className="tn-dashboard-loading">
                        <RefreshCw
                          className="tn-spin"
                          size={22}
                        />

                        <span>
                          Synchronizing
                          investigation
                          data…
                        </span>
                      </div>
                    ) : relationships.length ===
                      0 ? (
                      <div className="tn-dashboard-loading">
                        <Network
                          size={26}
                        />

                        <span>
                          No relationship
                          records
                          returned by
                          the analytics
                          API.
                        </span>
                      </div>
                    ) : (
                      <LiveRelationshipGraph
                        relationships={
                          relationships
                        }
                      />
                    )}
                  </div>

                  <div className="tn-panel-footer">
                    <span>
                      <span
                        className={`tn-status-dot ${
                          graphHealthy
                            ? ""
                            : "tn-status-danger"
                        }`}
                      />

                      {graphHealthy
                        ? "Neo4j connected"
                        : "Neo4j unavailable"}
                    </span>

                    <span className="tn-mono">
                      {formatNumber(
                        graphNodes
                      )}{" "}
                      NODES /{" "}
                      {formatNumber(
                        graphRelationships
                      )}{" "}
                      EDGES
                    </span>
                  </div>
                </motion.section>

                <motion.section
                  className="tn-glass tn-side-panel"
                  initial={{
                    opacity: 0,
                    x: 16,
                  }}
                  animate={{
                    opacity: 1,
                    x: 0,
                  }}
                  transition={{
                    delay: 0.2,
                    duration: 0.5,
                  }}
                >
                  <div className="tn-panel-header">
                    <div>
                      <span className="tn-panel-kicker">
                        ACTIVE
                        INVESTIGATION
                      </span>

                      <h2 className="tn-display tn-panel-title">
                        {investigation.investigation_number ||
                          `INV-${DEFAULT_INVESTIGATION_ID}`}
                      </h2>
                    </div>

                    <Sparkles
                      size={18}
                      className="tn-panel-icon"
                    />
                  </div>

                  <div className="tn-investigation-info">
                    <p className="tn-investigation-title">
                      {investigation.title ||
                        "Investigation unavailable"}
                    </p>

                    <p className="tn-investigation-description">
                      {investigation.objective ||
                        investigation.description ||
                        "Live investigation metadata is loaded from the API."}
                    </p>
                  </div>

                  <div className="tn-detail-row">
                    <span>
                      Status
                    </span>

                    <strong className="tn-status-text">
                      {String(
                        investigation.status ||
                          "UNKNOWN"
                      ).toUpperCase()}
                    </strong>
                  </div>

                  <div className="tn-detail-row">
                    <span>
                      Case
                    </span>

                    <strong>
                      {caseNumber}
                    </strong>
                  </div>

                  <div className="tn-detail-row">
                    <span>
                      Priority
                    </span>

                    <strong>
                      {String(
                        investigation.priority ||
                          "—"
                      ).toUpperCase()}
                    </strong>
                  </div>

                  <div className="tn-detail-row">
                    <span>
                      Last Backend
                      Update
                    </span>

                    <strong>
                      {formatDate(
                        investigation.updated_at
                      )}
                    </strong>
                  </div>

                  <div className="tn-dashboard-source-grid">
                    <SourceStatus
                      label="API"
                      ok={
                        dashboard?.errors
                          ?.length <
                        4
                      }
                    />

                    <SourceStatus
                      label="NEO4J"
                      ok={Boolean(
                        graphHealthy
                      )}
                    />

                    <SourceStatus
                      label="EVIDENCE"
                      ok={
                        dashboard?.evidence !==
                        null
                      }
                    />

                    <SourceStatus
                      label="ANALYTICS"
                      ok={
                        dashboard?.summary
                          ?.success
                      }
                    />
                  </div>
                </motion.section>
              </div>

              <div className="tn-dashboard-lower-grid">
                <section className="tn-glass tn-dashboard-feed">
                  <div className="tn-panel-header">
                    <div>
                      <span className="tn-panel-kicker">
                        RECENT
                        EVIDENCE
                      </span>

                      <h2 className="tn-display tn-panel-title">
                        Evidence
                        Stream
                      </h2>
                    </div>

                    <UploadCloud
                      size={18}
                      className="tn-panel-icon"
                    />
                  </div>

                  <div className="tn-evidence-stream">
                    {evidence
                      .slice(0, 5)
                      .map(
                        (
                          item,
                          index
                        ) => (
                          <motion.div
                            className="tn-evidence-row"
                            key={
                              item.id ||
                              item.evidence_number ||
                              index
                            }
                            initial={{
                              opacity: 0,
                              x: -8,
                            }}
                            animate={{
                              opacity: 1,
                              x: 0,
                            }}
                            transition={{
                              delay:
                                index *
                                0.05,
                            }}
                          >
                            <div className="tn-evidence-icon">
                              <FileSearch
                                size={
                                  15
                                }
                              />
                            </div>

                            <div className="tn-evidence-main">
                              <strong>
                                {item.evidence_number ||
                                  `EVIDENCE ${item.id}`}
                              </strong>

                              <span>
                                {item.title ||
                                  "Untitled evidence"}
                              </span>
                            </div>

                            <div className="tn-evidence-meta">
                              <span>
                                {String(
                                  item.status ||
                                    "UNKNOWN"
                                ).toUpperCase()}
                              </span>

                              <small>
                                {item.created_at
                                  ? formatDate(
                                      item.created_at
                                    )
                                  : "—"}
                              </small>
                            </div>
                          </motion.div>
                        )
                      )}

                    {!loading &&
                      evidence.length ===
                        0 && (
                        <div className="tn-dashboard-empty">
                          No evidence
                          records
                          returned.
                        </div>
                      )}
                  </div>
                </section>

                <section className="tn-glass tn-dashboard-feed">
                  <div className="tn-panel-header">
                    <div>
                      <span className="tn-panel-kicker">
                        ANALYTICAL
                        SIGNALS
                      </span>

                      <h2 className="tn-display tn-panel-title">
                        Detected
                        Patterns
                      </h2>
                    </div>

                    <Shield
                      size={18}
                      className="tn-panel-icon"
                    />
                  </div>

                  <div className="tn-pattern-stream">
                    {patterns.map(
                      (
                        pattern,
                        index
                      ) => (
                        <motion.div
                          className="tn-pattern-row"
                          key={`${pattern.pattern_type || pattern.title || "pattern"}-${index}`}
                          initial={{
                            opacity: 0,
                            y: 5,
                          }}
                          animate={{
                            opacity: 1,
                            y: 0,
                          }}
                          transition={{
                            delay:
                              index *
                              0.05,
                          }}
                        >
                          <div className="tn-pattern-marker" />

                          <div>
                            <strong>
                              {pattern.title ||
                                pattern.pattern_type ||
                                "Analytical pattern"}
                            </strong>

                            <span>
                              {pattern.description ||
                                "Pattern returned by the analytics engine."}
                            </span>
                          </div>

                          <small>
                            {pattern.confidence !=
                            null
                              ? `${Math.round(
                                  Number(
                                    pattern.confidence
                                  ) *
                                    100
                                )}%`
                              : "—"}
                          </small>
                        </motion.div>
                      )
                    )}

                    {!loading &&
                      patterns.length ===
                        0 && (
                        <div className="tn-dashboard-empty">
                          No pattern
                          observations
                          returned.
                        </div>
                      )}
                  </div>
                </section>
              </div>

              <div className="tn-dashboard-disclaimer">
                <CheckCircle2
                  size={14}
                />

                <span>
                  {dashboard?.summary
                    ?.disclaimer ||
                    "Dashboard values are loaded from the TRINETRA backend. Analytical signals require verification against underlying evidence."}
                </span>
              </div>
            </>
          );
      }
    };

  return (
    <div
      className={`tn-shell tn-theme-${theme}`}
    >
      <Sidebar
        navigation={
          navigation
        }
        activePage={
          activePage
        }
        onNavigate={
          handleNavigate
        }
      />

      <div className="tn-main">
        <Topbar
          theme={theme}
          onToggleTheme={() =>
            setTheme(
              (
                current
              ) =>
                current ===
                "dark"
                  ? "light"
                  : "dark"
            )
          }
          onRefresh={() =>
            loadDashboard(
              true
            )
          }
          refreshing={
            refreshing
          }
        />

        <motion.main
          key={activePage}
          className="tn-workspace"
          initial={{
            opacity: 0,
            y: 12,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.55,
            ease: [
              0.22,
              1,
              0.36,
              1,
            ],
          }}
        >
          {/*
           * Small breadcrumb for non-dashboard
           * pages.
           */}
          {activePage !==
            "dashboard" && (
            <div className="tn-page-route-header">
              <div className="tn-breadcrumb">
                <span>
                  TRINETRA
                </span>

                <ChevronRight
                  size={13}
                />

                <span>
                  COMMAND CENTER
                </span>

                <ChevronRight
                  size={13}
                />

                <span>
                  {pageTitles[
                    activePage
                  ]?.toUpperCase()}
                </span>
              </div>
            </div>
          )}

          {renderPage()}
        </motion.main>
      </div>
    </div>
  );
}

function LiveRelationshipGraph({
  relationships,
}) {
  const items =
    relationships.slice(0, 5);

  const nodes = [];
  const seen = new Set();

  items.forEach((item) => {
    [
      item.source,
      item.target,
    ].forEach((value) => {
      if (!seen.has(value)) {
        seen.add(value);
        nodes.push(value);
      }
    });
  });

  return (
    <div className="tn-api-graph">
      <div className="tn-api-graph-grid" />

      {nodes
        .slice(0, 6)
        .map(
          (
            value,
            index
          ) => {
            const angle =
              (index /
                Math.max(
                  nodes.length,
                  1
                )) *
                Math.PI *
                2 -
              Math.PI /
                2;

            const radius =
              nodes.length >
              2
                ? 35
                : 27;

            const x =
              50 +
              Math.cos(
                angle
              ) *
                radius;

            const y =
              50 +
              Math.sin(
                angle
              ) *
                31;

            return (
              <motion.div
                key={value}
                className={`tn-api-node ${
                  index === 0
                    ? "primary"
                    : ""
                }`}
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                }}
                initial={{
                  opacity: 0,
                  scale: 0.7,
                }}
                animate={{
                  opacity: 1,
                  scale: 1,
                }}
                transition={{
                  delay:
                    index *
                    0.07,
                  type: "spring",
                }}
              >
                <span className="tn-api-node-dot" />

                <span>
                  {value}
                </span>
              </motion.div>
            );
          }
        )}

      <div className="tn-api-graph-core">
        <Network
          size={23}
        />

        <span>
          LIVE
        </span>
      </div>

      <div className="tn-api-relationship-list">
        {items
          .slice(0, 3)
          .map(
            (
              item,
              index
            ) => (
              <div
                key={`${item.source}-${item.target}-${index}`}
              >
                <span>
                  {String(
                    item.type ||
                      "RELATED TO"
                  ).replaceAll(
                    "_",
                    " "
                  )}
                </span>

                <small>
                  {
                    item.source
                  }{" "}
                  →{" "}
                  {
                    item.target
                  }
                </small>
              </div>
            )
          )}
      </div>
    </div>
  );
}

function SourceStatus({
  label,
  ok,
}) {
  return (
    <div
      className={`tn-source-status ${
        ok ? "ok" : "bad"
      }`}
    >
      <span className="tn-source-dot" />

      <span>
        {label}
      </span>
    </div>
  );
}

function Sidebar({
  navigation,
  activePage,
  onNavigate,
}) {
  return (
    <motion.aside
      className="tn-sidebar"
      initial={{
        x: -20,
        opacity: 0,
      }}
      animate={{
        x: 0,
        opacity: 1,
      }}
    >
      <div className="tn-brand">
        <div className="tn-brand-mark">
          <span />
          <span />
          <span />
        </div>

        <div>
          <div className="tn-display tn-brand-name">
            TRINETRA
          </div>

          <div className="tn-brand-caption">
            INTELLIGENCE PLATFORM
          </div>
        </div>
      </div>

      <div className="tn-sidebar-section">
        <div className="tn-sidebar-label">
          WORKSPACE
        </div>

        <nav className="tn-nav">
          {navigation.map(
            (
              item,
              index
            ) => {
              const Icon =
                item.icon;

              /*
               * NEW:
               * Active state comes from App state,
               * not hardcoded to Dashboard.
               */
              const active =
                activePage ===
                item.key;

              return (
                <motion.button
                  key={item.key}
                  type="button"
                  className={`tn-nav-item ${
                    active
                      ? "active"
                      : ""
                  }`}
                  initial={{
                    opacity: 0,
                    x: -8,
                  }}
                  animate={{
                    opacity: 1,
                    x: 0,
                  }}
                  transition={{
                    delay:
                      0.08 *
                      index,
                  }}
                  onClick={() =>
                    onNavigate(
                      item.key
                    )
                  }
                  aria-current={
                    active
                      ? "page"
                      : undefined
                  }
                >
                  <Icon
                    size={17}
                  />

                  <span>
                    {item.label}
                  </span>

                  {active && (
                    <motion.div
                      className="tn-nav-active-glow"
                      layoutId="active-nav"
                    />
                  )}
                </motion.button>
              );
            }
          )}
        </nav>
      </div>

      <div className="tn-sidebar-bottom">
        <div className="tn-system-card">
          <div className="tn-system-card-header">
            <span className="tn-status-dot tn-pulse" />

            SYSTEM ONLINE
          </div>

          <div className="tn-system-card-value">
            API-driven command
            center
          </div>

          <div className="tn-system-card-meta tn-mono">
            POSTGRES · NEO4J ·
            ANALYTICS
          </div>
        </div>

        <button
          type="button"
          className="tn-settings-button"
        >
          <Settings
            size={16}
          />

          <span>
            System Settings
          </span>
        </button>

        <div className="tn-sidebar-version tn-mono">
          TRINETRA //
          PROTOTYPE
          <br />
          BUILD 0.2.0
        </div>
      </div>
    </motion.aside>
  );
}

function Topbar({
  theme,
  onToggleTheme,
  onRefresh,
  refreshing,
}) {
  const ThemeIcon =
    theme === "dark"
      ? Sun
      : Moon;

  return (
    <header className="tn-topbar">
      <div className="tn-topbar-left">
        <div className="tn-command-search">
          <Search
            size={15}
          />

          <span>
            Search
            intelligence...
          </span>

          <kbd>
            CTRL
          </kbd>

          <kbd>
            K
          </kbd>
        </div>
      </div>

      <div className="tn-topbar-right">
        <button
          type="button"
          className="tn-refresh-button"
          onClick={
            onRefresh
          }
          title="Refresh live dashboard"
          aria-label="Refresh live dashboard"
        >
          <RefreshCw
            size={14}
            className={
              refreshing
                ? "tn-spin"
                : ""
            }
          />
        </button>

        <button
          type="button"
          className="tn-theme-toggle"
          onClick={
            onToggleTheme
          }
          aria-label={`Switch to ${
            theme ===
            "dark"
              ? "light"
              : "dark"
          } mode`}
          title={`Switch to ${
            theme ===
            "dark"
              ? "light"
              : "dark"
          } mode`}
        >
          <span className="tn-theme-toggle-track">
            <motion.span
              className="tn-theme-toggle-thumb"
              layout
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 30,
              }}
            >
              <ThemeIcon
                size={13}
              />
            </motion.span>
          </span>
        </button>

        <div className="tn-connection">
          <span className="tn-status-dot" />

          <span>
            API SYNC
          </span>
        </div>

        <div className="tn-topbar-divider" />

        <div className="tn-user">
          <div className="tn-user-avatar">
            TI
          </div>

          <div>
            <div className="tn-user-name">
              TRINETRA
            </div>

            <div className="tn-user-role">
              ANALYST
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  detail,
  accent = false,
}) {
  return (
    <motion.div
      className={`tn-glass tn-stat-card ${
        accent
          ? "tn-stat-accent"
          : ""
      }`}
      whileHover={{
        y: -3,
        scale: 1.01,
      }}
      transition={{
        duration: 0.18,
      }}
    >
      <div className="tn-stat-icon">
        <Icon
          size={17}
        />
      </div>

      <div className="tn-stat-content">
        <div className="tn-stat-label">
          {label}
        </div>

        <div className="tn-stat-value tn-display">
          {value}
        </div>

        <div className="tn-stat-detail">
          {detail}
        </div>
      </div>
    </motion.div>
  );
}

function PageLoading() {
  return (
    <div
      className="tn-dashboard-loading"
      style={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      <RefreshCw
        size={24}
        className="tn-spin"
      />

      <span>
        Loading TRINETRA module...
      </span>
    </div>
  );
}

export default App;