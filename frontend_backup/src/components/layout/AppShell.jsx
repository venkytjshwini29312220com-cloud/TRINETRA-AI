import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

function AppShell() {
  return (
    <div className="tn-shell">
      <Sidebar />

      <div className="tn-main">
        <Topbar />

        <main className="tn-workspace">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppShell;