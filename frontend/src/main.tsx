import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth";
import { RealtimeProvider } from "./realtime";
import { Shell } from "./layout/Shell";
import { Login } from "./pages/Login";
import { Home } from "./pages/Home";
import { Projects } from "./pages/Projects";
import { ProjectDetail } from "./pages/ProjectDetail";
import { MyWork } from "./pages/MyWork";
import { Clients } from "./pages/Clients";
import { Team } from "./pages/Team";
import "./styles.css";

function ProtectedApp() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: "100vh", color: "var(--muted)" }}>
        Loading studio desk…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <RealtimeProvider>
      <Routes>
        <Route element={<Shell />}>
          <Route path="/" element={<Home />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          {user.role === "DEVELOPER" && <Route path="/my-work" element={<MyWork />} />}
          {user.role === "ADMIN" && (
            <>
              <Route path="/clients" element={<Clients />} />
              <Route path="/team" element={<Team />} />
            </>
          )}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </RealtimeProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={<ProtectedApp />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
