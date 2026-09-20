import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { Bell } from "../components/Bell";
import { useRealtime } from "../realtime";

export function Shell() {
  const { user, logout } = useAuth();
  const { onlineCount } = useRealtime();
  const navigate = useNavigate();
  if (!user) return null;

  const roleLabel = { ADMIN: "Admin Lead", PROJECT_MANAGER: "Project Manager", DEVELOPER: "Developer" }[user.role];
  const initials = user.name.split(" ").map((n) => n[0]).join("").slice(0, 2);

  return (
    <div className="shell">
      <aside className="rail">
        <div className="wordmark">
          <div className="logo-icon">T</div>
          <div>
            Tide
            <small>Workspace</small>
          </div>
        </div>

        <NavLink className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} to="/">
          <span style={{ fontSize: 16 }}>&#x25A4;</span>
          <span>Dashboard</span>
        </NavLink>

        <NavLink className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} to="/projects">
          <span style={{ fontSize: 16 }}>&#x1F4C1;</span>
          <span>Projects</span>
        </NavLink>

        {user.role === "DEVELOPER" && (
          <NavLink className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} to="/my-work">
            <span style={{ fontSize: 16 }}>&#x2714;</span>
            <span>My Tasks</span>
          </NavLink>
        )}

        {user.role === "ADMIN" && (
          <>
            <NavLink className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} to="/clients">
              <span style={{ fontSize: 16 }}>&#x1F3E2;</span>
              <span>Clients</span>
            </NavLink>
            <NavLink className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} to="/team">
              <span style={{ fontSize: 16 }}>&#x1F465;</span>
              <span>Team</span>
            </NavLink>
          </>
        )}

        <div className="role-chip">
          <div className="user-meta">
            <div className="user-avatar">{initials}</div>
            <div className="user-info">
              <div className="name">{user.name}</div>
              <div className="role">{roleLabel}</div>
            </div>
          </div>
          <button
            className="btn ghost small"
            style={{
              width: "100%",
              marginTop: 12,
              color: "#cbd5e1",
              borderColor: "#334155",
              background: "#0f172a",
              justifyContent: "center",
            }}
            onClick={async () => {
              await logout();
              navigate("/login");
            }}
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="crumbs">
            <span>Tide</span>
            <span style={{ color: "var(--text-subtle)" }}>/</span>
            <strong>Agency Console</strong>
          </div>

          <div className="top-actions">
            {user.role === "ADMIN" && (
              <div className="presence">
                <span className="pip pulse" />
                <span>{onlineCount ?? 1} online right now</span>
              </div>
            )}
            <Bell />
          </div>
        </header>

        <Outlet />
      </div>
    </div>
  );
}
