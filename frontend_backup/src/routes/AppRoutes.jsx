import { BrowserRouter, Route, Routes } from "react-router-dom";

import AppShell from "../components/layout/AppShell";
import Dashboard from "../pages/Dashboard";
import Evidence from "../pages/Evidence";
import Graph from "../pages/Graph";
import Analytics from "../pages/Analytics";
import Assistant from "../pages/Assistant";

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/evidence" element={<Evidence />} />
          <Route path="/graph" element={<Graph />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/assistant" element={<Assistant />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;