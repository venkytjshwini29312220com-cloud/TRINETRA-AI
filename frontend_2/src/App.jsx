import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  BrainCircuit,
  ChevronRight,
  Database,
  FileSearch,
  GitBranch,
  LayoutDashboard,
  Network,
  Search,
  Settings,
  Moon,
  Sun,
  Shield,
  Sparkles,
} from "lucide-react";

function App() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("trinetra-theme") || "dark";
    } catch {
      return "dark";
    }
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;

    try {
      localStorage.setItem("trinetra-theme", theme);
    } catch {
      // Ignore storage failures.
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((current) =>
      current === "dark" ? "light" : "dark",
    );
  };

  const navigation = [
    {
      label: "Dashboard",
      icon: LayoutDashboard,
      active: true,
    },
    {
      label: "Evidence",
      icon: FileSearch,
    },
    {
      label: "Investigation Graph",
      icon: Network,
    },
    {
      label: "Analytics",
      icon: BarChart3,
    },
    {
      label: "AI Assistant",
      icon: BrainCircuit,
    },
  ];

  return (
    <div className={`tn-shell tn-theme-${theme}`}>
      <Sidebar navigation={navigation} />

      <div className="tn-main">
        <Topbar theme={theme} onToggleTheme={toggleTheme} />

        <motion.main
          className="tn-workspace"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.55,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <div className="tn-workspace-header">
            <div>
              <div className="tn-breadcrumb">
                <span>TRINETRA</span>
                <ChevronRight size={13} />
                <span>COMMAND CENTER</span>
              </div>

              <h1 className="tn-display tn-page-title">
                Investigation Command Center
              </h1>

              <p className="tn-page-subtitle">
                Connected intelligence across entities, evidence,
                relationships, and investigative signals.
              </p>
            </div>

            <motion.div
              className="tn-live-indicator"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.25 }}
            >
              <span className="tn-status-dot tn-pulse" />
              LIVE SYSTEM
            </motion.div>
          </div>

          <div className="tn-stat-grid">
            <StatCard
              icon={Database}
              label="Graph Nodes"
              value="11"
              detail="Connected entities"
            />

            <StatCard
              icon={GitBranch}
              label="Relationships"
              value="8"
              detail="Known connections"
            />

            <StatCard
              icon={FileSearch}
              label="Evidence"
              value="7"
              detail="Processed records"
            />

            <StatCard
              icon={Shield}
              label="Risk Signal"
              value="72"
              detail="Aarav Sharma"
              accent
            />
          </div>

          <div className="tn-dashboard-grid">
            <motion.section
              className="tn-glass tn-ambient tn-hero-panel"
              whileHover={{ y: -2 }}
              transition={{ duration: 0.2 }}
            >
              <div className="tn-panel-header">
                <div>
                  <span className="tn-panel-kicker">
                    INVESTIGATION GRAPH
                  </span>

                  <h2 className="tn-display tn-panel-title">
                    Connected Intelligence
                  </h2>
                </div>

                <div className="tn-panel-chip">
                  <Activity size={13} />
                  LIVE
                </div>
              </div>

              <div className="tn-graph-placeholder">
                <div className="tn-graph-orbit tn-orbit-one" />
                <div className="tn-graph-orbit tn-orbit-two" />
                <div className="tn-graph-orbit tn-orbit-three" />

                <motion.div
                  className="tn-graph-core"
                  animate={{
                    scale: [1, 1.04, 1],
                    boxShadow: [
                      "0 0 20px rgba(34,211,238,0.15)",
                      "0 0 55px rgba(34,211,238,0.32)",
                      "0 0 20px rgba(34,211,238,0.15)",
                    ],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <Network size={30} />
                </motion.div>

                <div className="tn-graph-node node-one">
                  <span />
                  AARAV SHARMA
                </div>

                <div className="tn-graph-node node-two">
                  <span />
                  MEERA RAO
                </div>

                <div className="tn-graph-node node-three">
                  <span />
                  VERTEX TRADING
                </div>

                <div className="tn-graph-node node-four">
                  <span />
                  HDFC BANK
                </div>

                <div className="tn-graph-line line-one" />
                <div className="tn-graph-line line-two" />
                <div className="tn-graph-line line-three" />
                <div className="tn-graph-line line-four" />
              </div>

              <div className="tn-panel-footer">
                <span>
                  <span className="tn-status-dot" />
                  Neo4j connected
                </span>

                <span className="tn-mono">
                  11 NODES / 8 EDGES
                </span>
              </div>
            </motion.section>

            <motion.section
              className="tn-glass tn-side-panel"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <div className="tn-panel-header">
                <div>
                  <span className="tn-panel-kicker">
                    ACTIVE INVESTIGATION
                  </span>

                  <h2 className="tn-display tn-panel-title">
                    INV-TRI-001
                  </h2>
                </div>

                <Sparkles
                  size={18}
                  className="tn-panel-icon"
                />
              </div>

              <div className="tn-investigation-info">
                <p className="tn-investigation-title">
                  Prototype Intelligence Investigation
                </p>

                <p className="tn-investigation-description">
                  Analyze entities, relationships, evidence,
                  risk, and investigative patterns.
                </p>
              </div>

              <div className="tn-detail-row">
                <span>Status</span>
                <strong className="tn-status-text">
                  CREATED
                </strong>
              </div>

              <div className="tn-detail-row">
                <span>Case</span>
                <strong>TRI-PROT-001</strong>
              </div>

              <div className="tn-detail-row">
                <span>Priority</span>
                <strong>MEDIUM</strong>
              </div>

              <div className="tn-detail-row">
                <span>Focus Entity</span>
                <strong>Aarav Sharma</strong>
              </div>

              <button className="tn-action-button">
                <Search size={15} />
                Open Investigation
                <ChevronRight size={15} />
              </button>
            </motion.section>
          </div>
        </motion.main>
      </div>
    </div>
  );
}

function Sidebar({ navigation }) {
  return (
    <motion.aside
      className="tn-sidebar"
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1],
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
          {navigation.map((item, index) => {
            const Icon = item.icon;

            return (
              <motion.button
                key={item.label}
                className={`tn-nav-item ${
                  item.active ? "active" : ""
                }`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  delay: 0.08 * index,
                  duration: 0.3,
                }}
              >
                <Icon size={17} />
                <span>{item.label}</span>

                {item.active && (
                  <motion.div
                    className="tn-nav-active-glow"
                    layoutId="active-nav"
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 30,
                    }}
                  />
                )}
              </motion.button>
            );
          })}
        </nav>
      </div>

      <div className="tn-sidebar-bottom">
        <div className="tn-system-card">
          <div className="tn-system-card-header">
            <span className="tn-status-dot tn-pulse" />
            SYSTEM ONLINE
          </div>

          <div className="tn-system-card-value">
            All systems operational
          </div>

          <div className="tn-system-card-meta tn-mono">
            API · NEO4J · NLP
          </div>
        </div>

        <button className="tn-settings-button">
          <Settings size={16} />
          <span>System Settings</span>
        </button>

        <div className="tn-sidebar-version tn-mono">
          TRINETRA // PROTOTYPE
          <br />
          BUILD 0.1.0
        </div>
      </div>
    </motion.aside>
  );
}

function Topbar({ theme, onToggleTheme }) {
  const ThemeIcon = theme === "dark" ? Sun : Moon;

  return (
    <header className="tn-topbar">
      <div className="tn-topbar-left">
        <div className="tn-command-search">
          <Search size={15} />
          <span>Search intelligence...</span>
          <kbd>CTRL</kbd>
          <kbd>K</kbd>
        </div>
      </div>

      <div className="tn-topbar-right">
        <div className="tn-connection">
          <span className="tn-status-dot" />
          <span>CONNECTED</span>
        </div>

        <div className="tn-topbar-divider" />

        <button
          type="button"
          className="tn-theme-toggle"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
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
              <ThemeIcon size={13} />
            </motion.span>
          </span>
        </button>

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
        accent ? "tn-stat-accent" : ""
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
        <Icon size={17} />
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

export default App;