import {
  Bell,
  Command,
  Search,
  Wifi,
} from "lucide-react";

function Topbar() {
  return (
    <header className="tn-topbar">
      <div className="tn-topbar-left">
        <div className="tn-breadcrumb">
          <span>TRINETRA</span>
          <span className="tn-breadcrumb-separator">/</span>
          <span className="tn-breadcrumb-current">
            Intelligence Workspace
          </span>
        </div>
      </div>

      <div className="tn-topbar-right">
        <button className="tn-command-search">
          <Search size={16} />
          <span>Search intelligence...</span>
          <div className="tn-command-shortcut">
            <Command size={12} />
            <span>K</span>
          </div>
        </button>

        <button className="tn-icon-button" title="Network status">
          <Wifi size={17} />
        </button>

        <button className="tn-icon-button" title="Notifications">
          <Bell size={17} />
          <span className="tn-notification-dot" />
        </button>

        <div className="tn-user-status">
          <div className="tn-user-avatar">T</div>

          <div className="tn-user-info">
            <span className="tn-user-name">Analyst</span>
            <span className="tn-user-role">INTELLIGENCE OPS</span>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Topbar;