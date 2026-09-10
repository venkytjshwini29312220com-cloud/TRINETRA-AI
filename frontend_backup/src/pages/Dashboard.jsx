import { motion } from "framer-motion";
import {
  Activity,
  Database,
  FileSearch,
  GitBranch,
} from "lucide-react";
import { useEffect, useState } from "react";

import { getGraphStats } from "../services/graphApi";
import PageTransition from "../components/layout/PageTransition";

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const result = await getGraphStats();
        setStats(result);
      } catch (error) {
        console.error("Failed to load graph statistics:", error);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  const graphNodes = stats?.nodes ?? 0;
  const graphRelationships = stats?.relationships ?? 0;

  const statCards = [
    {
      label: "Graph Nodes",
      value: graphNodes,
      icon: Database,
      description: "Entities currently indexed",
    },
    {
      label: "Relationships",
      value: graphRelationships,
      icon: GitBranch,
      description: "Connected intelligence links",
    },
    {
      label: "Evidence",
      value: "—",
      icon: FileSearch,
      description: "Evidence inventory",
    },
    {
      label: "System Status",
      value: loading ? "..." : "ONLINE",
      icon: Activity,
      description: "TRINETRA intelligence services",
    },
  ];

  return (
    <PageTransition>
      <div className="tn-dashboard">
        <section className="tn-page-heading">
          <div>
            <div className="tn-eyebrow">
              INTELLIGENCE OPERATIONS
            </div>

            <h1>Investigation Command Center</h1>

            <p>
              Monitor evidence, entities, relationships, graph
              intelligence, and analytical signals from one workspace.
            </p>
          </div>

          <div className="tn-live-indicator">
            <span className="tn-status-dot" />
            LIVE DATA
          </div>
        </section>

        <section className="tn-stat-grid">
          {statCards.map((card, index) => {
            const Icon = card.icon;

            return (
              <motion.div
                key={card.label}
                className="tn-stat-card tn-glass"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: index * 0.07,
                  duration: 0.4,
                }}
              >
                <div className="tn-stat-icon">
                  <Icon size={19} />
                </div>

                <div className="tn-stat-content">
                  <span className="tn-stat-label">
                    {card.label}
                  </span>

                  <strong className="tn-stat-value">
                    {card.value}
                  </strong>

                  <span className="tn-stat-description">
                    {card.description}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </section>

        <section className="tn-dashboard-grid">
          <div className="tn-hero-panel tn-glass tn-glow-border">
            <div className="tn-panel-header">
              <div>
                <div className="tn-panel-kicker">
                  INVESTIGATION GRAPH
                </div>

                <h2>Connected Intelligence</h2>
              </div>

              <span className="tn-panel-live">
                <span className="tn-status-dot" />
                LIVE
              </span>
            </div>

            <div className="tn-graph-placeholder">
              <div className="tn-graph-core">
                <div className="tn-graph-ring ring-one" />
                <div className="tn-graph-ring ring-two" />
                <div className="tn-graph-ring ring-three" />

                <div className="tn-graph-center">
                  <GitBranch size={28} />
                </div>

                <div className="tn-graph-node node-one" />
                <div className="tn-graph-node node-two" />
                <div className="tn-graph-node node-three" />
                <div className="tn-graph-node node-four" />

                <div className="tn-graph-line line-one" />
                <div className="tn-graph-line line-two" />
                <div className="tn-graph-line line-three" />
                <div className="tn-graph-line line-four" />
              </div>
            </div>

            <div className="tn-graph-footer">
              <span>
                Graph engine connected to Neo4j
              </span>

              <span>
                {graphNodes} nodes · {graphRelationships} relationships
              </span>
            </div>
          </div>

          <aside className="tn-side-panel tn-glass">
            <div className="tn-panel-header">
              <div>
                <div className="tn-panel-kicker">
                  WORKSPACE
                </div>

                <h2>Quick Actions</h2>
              </div>
            </div>

            <div className="tn-action-list">
              <button className="tn-action-card">
                <FileSearch size={20} />
                <div>
                  <strong>Review Evidence</strong>
                  <span>
                    Inspect and process intelligence sources
                  </span>
                </div>
              </button>

              <button className="tn-action-card">
                <GitBranch size={20} />
                <div>
                  <strong>Explore Graph</strong>
                  <span>
                    Investigate connected entities
                  </span>
                </div>
              </button>

              <button className="tn-action-card">
                <Activity size={20} />
                <div>
                  <strong>View Analytics</strong>
                  <span>
                    Review patterns and risk signals
                  </span>
                </div>
              </button>
            </div>
          </aside>
        </section>
      </div>
    </PageTransition>
  );
}

export default Dashboard;