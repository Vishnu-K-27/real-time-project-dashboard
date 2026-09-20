import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@tide.local");
  const [password, setPassword] = useState("Password123!");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || "Invalid email or password";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function selectDemo(demoEmail: string) {
    setEmail(demoEmail);
    setPassword("Password123!");
  }

  return (
    <div className="login-split">
      <div className="login-brand">
        <div className="brand-header">
          <div className="brand-badge">
            <span className="dot" />
            <span>Real-Time Agency Workbench</span>
          </div>

          <h1>Tide</h1>
          <p>
            The high-velocity project dashboard engineered for internal client management,
            role-scoped task state machines, and live WebSocket activity feeds.
          </p>

          <div className="feature-grid">
            <div className="feature-pill">
              <div className="icon-box">&#x21C4;</div>
              <div>
                <h4>Live WebSockets</h4>
                <span>Zero-polling status stream</span>
              </div>
            </div>

            <div className="feature-pill">
              <div className="icon-box">&#x1F6E1;</div>
              <div>
                <h4>Strict RBAC</h4>
                <span>API-enforced data boundaries</span>
              </div>
            </div>

            <div className="feature-pill">
              <div className="icon-box">&#x23F1;</div>
              <div>
                <h4>Overdue Watchdog</h4>
                <span>Scheduled background cron</span>
              </div>
            </div>

            <div className="feature-pill">
              <div className="icon-box">&#x1F5C4;</div>
              <div>
                <h4>DB Catch-up</h4>
                <span>PostgreSQL event hydration</span>
              </div>
            </div>
          </div>
        </div>

        <div className="demo-credentials-box">
          <div className="demo-title">
            <span>Instant Demo Access</span>
            <code>Password123!</code>
          </div>

          <div className="demo-chips">
            <button
              type="button"
              className="demo-btn"
              onClick={() => selectDemo("admin@tide.local")}
            >
              <span className="badge-pill badge-admin">Admin</span>
              <span>Asha (Desk Lead)</span>
            </button>

            <button
              type="button"
              className="demo-btn"
              onClick={() => selectDemo("maya@tide.local")}
            >
              <span className="badge-pill badge-pm">PM</span>
              <span>Maya (Aurora / Kelp)</span>
            </button>

            <button
              type="button"
              className="demo-btn"
              onClick={() => selectDemo("ravi@tide.local")}
            >
              <span className="badge-pill badge-pm">PM</span>
              <span>Ravi (Lumen Desk)</span>
            </button>

            <button
              type="button"
              className="demo-btn"
              onClick={() => selectDemo("leah@tide.local")}
            >
              <span className="badge-pill badge-dev">Dev</span>
              <span>Leah Chen</span>
            </button>

            <button
              type="button"
              className="demo-btn"
              onClick={() => selectDemo("omar@tide.local")}
            >
              <span className="badge-pill badge-dev">Dev</span>
              <span>Omar Haddad</span>
            </button>
          </div>
        </div>

        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
          Tide Platform &bull; Professional Edition
        </div>
      </div>

      <div className="login-form-wrap">
        <div className="login-card">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontWeight: 800,
                fontSize: 18,
                boxShadow: "0 4px 14px rgba(37, 99, 235, 0.35)",
              }}
            >
              T
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: "var(--text-main)", letterSpacing: "-0.02em" }}>
                Tide Workbench
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Internal Agency Portal</div>
            </div>
          </div>

          <h2>Sign in to workbench</h2>
          <p className="subtitle">
            Enter your credentials to access your role-scoped dashboard.
          </p>

          {error && <div className="err" style={{ marginBottom: 18 }}>{error}</div>}

          <form onSubmit={handleSubmit}>
            <label className="field">
              <span>Work Email</span>
              <input
                type="email"
                required
                placeholder="name@tide.local"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
              />
            </label>

            <label className="field">
              <span>Password</span>
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </label>

            <button
              className="btn"
              type="submit"
              style={{ width: "100%", padding: "13px", marginTop: 10 }}
              disabled={loading}
            >
              {loading ? "Signing in…" : "Sign in to Dashboard →"}
            </button>
          </form>

          <div
            style={{
              marginTop: 24,
              padding: "12px 14px",
              background: "var(--bg-subtle)",
              borderRadius: "var(--radius-sm)",
              fontSize: 12,
              color: "var(--text-muted)",
              textAlign: "center",
            }}
          >
            Click any demo profile on the left for one-click test credentials.
          </div>
        </div>
      </div>
    </div>
  );
}
