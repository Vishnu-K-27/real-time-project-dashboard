import { FormEvent, useEffect, useState } from "react";
import { api, Role, User } from "../api";
import { useAuth } from "../auth";

export function Team() {
  const { user: me } = useAuth();
  const isAdmin = me?.role === "ADMIN";
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    if (!isAdmin) { setLoading(false); return; }
    try {
      setLoading(true); setError("");
      const res = await api.users();
      setUsers(res.users);
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || "Failed to load team directory");
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [isAdmin]);

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setFormError(""); setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    try {
      await api.createUser({ name: fd.get("name"), email: fd.get("email"), password: fd.get("password"), role: fd.get("role") as Role });
      setShowModal(false);
      if (isAdmin) await load();
    } catch (err: unknown) {
      setFormError((err as { message?: string })?.message || "Failed to add team member");
    } finally { setSubmitting(false); }
  }

  async function handleDelete(id: string) {
    setDeleting(true);
    try {
      await api.deleteUser(id);
      setConfirmDeleteId(null);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || "Failed to delete team member");
      setConfirmDeleteId(null);
    } finally { setDeleting(false); }
  }

  const roleBadge = (role: Role) => {
    if (role === "ADMIN") return <span className="tick done"><i></i>Admin Lead</span>;
    if (role === "PROJECT_MANAGER") return <span className="tick review"><i></i>Project Manager</span>;
    return <span className="tick progress"><i></i>Developer</span>;
  };

  return (
    <div className="content solo" style={{ maxWidth: 1000, margin: "0 auto", width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: "0 0 6px", fontWeight: 500, fontSize: 32 }}>Team Roster</h1>
          <p style={{ margin: 0, fontSize: 14 }}>
            {isAdmin ? "Manage staff accounts, assign roles, and onboard studio members." : "Onboard developers to your projects."}
          </p>
        </div>
        <button className="btn" onClick={() => { setFormError(""); setShowModal(true); }}>+ Add team member</button>
      </div>

      {error && <div className="err" style={{ marginBottom: 16 }}>{error}</div>}

      {isAdmin ? (
        <div className="panel">
          {loading && <div>Loading team roster...</div>}
          {!loading && users.length === 0 && <div className="empty">No team members registered.</div>}
          {!loading && users.length > 0 && (
            <table className="table">
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th></th></tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={confirmDeleteId === u.id ? { background: "#fef2f2" } : undefined}>
                    <td><strong>{u.name}</strong></td>
                    <td>{u.email}</td>
                    <td>{roleBadge(u.role)}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                        {confirmDeleteId === u.id ? (
                          <>
                            <span style={{ fontSize: 13, color: "#dc2626", fontWeight: 600 }}>Remove member?</span>
                            <button
                              className="btn small"
                              style={{ background: "#dc2626", boxShadow: "none" }}
                              disabled={deleting}
                              onClick={() => handleDelete(u.id)}
                            >
                              {deleting ? "Removing…" : "Yes, remove"}
                            </button>
                            <button className="btn ghost small" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
                          </>
                        ) : (
                          <button
                            className="btn ghost small"
                            title={u.id === me?.id ? "Cannot delete your own account" : "Remove member"}
                            style={u.id === me?.id ? { color: "#94a3b8", borderColor: "#e2e8f0", cursor: "not-allowed" } : { color: "#dc2626", borderColor: "#fecaca" }}
                            disabled={u.id === me?.id}
                            onClick={() => setConfirmDeleteId(u.id)}
                          >
                            🗑
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="panel">
          <div className="empty" style={{ padding: "40px 10px" }}>
            As a Project Manager you can onboard new Developer accounts using the button above.
            Contact an Admin to view the full team directory.
          </div>
        </div>
      )}

      {showModal && (
        <>
          <div className="drawer-back" onClick={() => setShowModal(false)} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: 28, width: "min(460px,92vw)", zIndex: 60, boxShadow: "var(--shadow-lg)" }}>
            <h2 style={{ margin: "0 0 16px", fontWeight: 500 }}>Onboard Team Member</h2>
            {formError && <div className="err" style={{ marginBottom: 14, fontSize: 13 }}>{formError}</div>}
            <form onSubmit={handleCreate}>
              <label className="field"><span>Full Name</span><input name="name" required placeholder="e.g. Maya Lin" /></label>
              <label className="field"><span>Email</span><input name="email" type="email" required placeholder="e.g. maya@tide.local" /></label>
              <label className="field"><span>Initial Password</span><input name="password" type="password" required defaultValue="Password123!" /></label>
              <label className="field">
                <span>Role</span>
                <select name="role" defaultValue="DEVELOPER">
                  <option value="DEVELOPER">Developer (Maker)</option>
                  {isAdmin && <option value="PROJECT_MANAGER">Project Manager</option>}
                  {isAdmin && <option value="ADMIN">Admin (Desk Lead)</option>}
                </select>
              </label>
              {!isAdmin && <p style={{ fontSize: 12, marginTop: 6 }}>Project Managers can only onboard Developer accounts.</p>}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
                <button type="button" className="btn ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn" disabled={submitting}>{submitting ? "Saving..." : "Add member"}</button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
