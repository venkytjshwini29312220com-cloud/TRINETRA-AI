import { NavLink } from "react-router-dom";
import {
  Activity,
  BarChart3,
  BrainCircuit,
  FileSearch,
  GitBranch,
  LayoutDashboard,
  Shield,
} from "lucide-react";

const navigation = [
  {
    label: "Dashboard",
    path: "/",
    icon: LayoutDashboard,
  },
  {
    label: "Evidence",
    path: "/evidence",
    icon: FileSearch,
  },
  {
    label: "Investigation Graph",
    path: "/graph",
    icon: GitBranch,
  },
  {
    label: "Analytics",
    path: "/analytics",
    icon: BarChart3,
  },
  {
    label: "AI Assistant",
    path: "/assistant",
    icon: BrainCircuit,
  },
];

function Sidebar() {
  return (
    <aside className="tn-sidebar">
      <div className="tn-brand">
        <div className="tn-brand-mark">
          <Shield size={21} strokeWidth={2.2} />
        </div>

        <div>
          <div className="tn-brand-name">TRINETRA</div>
          <div className="tn-brand-subtitle">INTELLIGENCE PLATFORM</div>
        </div>
      </div>

      <div className="tn-sidebar-section">
        <div className="tn-sidebar-label">WORKSPACE</div>

        <nav className="tn-nav">
          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) =>
                  `tn-nav-item ${isActive ? "active" : ""}`
                }
              >
                <Icon size={18} strokeWidth={1.8} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="tn-sidebar-bottom">
        <div className="tn-system-status">
          <span className="tn-status-dot" />
          <div>
            <div className="tn-system-status-title">
              SYSTEM ONLINE
            </div>
            <div className="tn-system-status-subtitle">
              Intelligence services operational
            </div>
          </div>
        </div>

        <div className="tn-version">
          TRINETRA · PROTOTYPE
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;