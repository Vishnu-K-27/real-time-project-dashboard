import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, Client, formatRole, Project, User } from "../api";
import { useAuth } from "../auth";

export function Projects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [leads, setLeads] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canCreate = user?.role === "ADMIN" || user?.role === "PROJECT_MANAGER";
  const canDelete = user?.role === "ADMIN";
  const isAdmin = user?.role === "ADMIN";

  async function load() {
    try {
      setLoading(true);
      const res = await api.projects();
      setProjects(res.projects);
      if (canCreate) {
        const [cRes, lRes] = await Promise.all([
          api.clientOptions().catch(() => ({ clients: [] })),
          api.leadOptions().catch(() => ({ leads: [] })),
        ]);
        setClients(cRes.clients);
        setLeads(lRes.leads);
      }
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    try {
      await api.createProject({
        name: fd.get("name"),
        key: String(fd.get("key")).toUpperCase(),
        description: fd.get("description"),
        clientId: fd.get("clientId"),
        leadId: fd.get("leadId") || undefined,
      });
      setShowModal(false);
      await load();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || "Failed to create project");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEdit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editProject) return;
    setError("");
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    try {
      await api.patchProject(editProject.id, {
        name: fd.get("name"),
        description: fd.get("description"),
        clientId: fd.get("clientId"),
        leadId: fd.get("leadId") || undefined,
      });
      setEditProject(null);
      await load();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || "Failed to update project");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(true);
    try {
      await api.deleteProject(id);
      setConfirmDeleteId(null);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || "Failed to delete project");
      setConfirmDeleteId(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="content solo" style={{ maxWidth: 1100, margin: "0 auto", width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: "var(--display)", fontSize: 32, margin: "0 0 6px", fontWeight: 500 }}>Projects</h1>
          <p style={{ color: "var(--text-muted)", margin: 0, fontSize: 14 }}>
            {user?.role === "ADMIN"
              ? "All agency client engagements"
              : user?.role === "PROJECT_MANAGER"
              ? "Client projects created and managed by you"
              : "Projects containing your assigned tasks"}
          </p>
        </div>
        {canCreate && (
          <button className="btn" onClick={() => setShowModal(true)}>+ New project</button>
        )}
      </div>

      {error && <div className="err" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="panel">
        {loading && <div style={{ color: "var(--text-muted)" }}>Loading projects…</div>}
        {!loading && projects.length === 0 && <div className="empty">No projects found in this scope.</div>}
        {!loading && projects.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th>Key</th><th>Name</th><th>Client</th><th>Lead</th><th>Tasks</th><th></th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id} style={confirmDeleteId === p.id ? { background: "#fef2f2" } : undefined}>
                  <td><span className="key">{p.key}</span></td>
                  <td>
                    <strong>{p.name}</strong>
                    <div style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 2 }}>{p.description}</div>
                  </td>
                  <td>{p.client?.name} <span style={{ color: "var(--text-muted)" }}>({p.client?.company})</span></td>
                  <td>{p.createdBy?.name ?? "—"}</td>
                  <td>{p._count?.tasks ?? 0} tasks</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                      {confirmDeleteId === p.id ? (
                        <>
                          <span style={{ fontSize: 13, color: "#dc2626", fontWeight: 600 }}>Delete this project?</span>
                          <button
                            className="btn small"
                            style={{ background: "#dc2626", boxShadow: "none" }}
                            disabled={deleting}
                            onClick={() => handleDelete(p.id)}
                          >
                            {deleting ? "Deleting…" : "Yes, delete"}
                          </button>
                          <button className="btn ghost small" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
                        </>
                      ) : (
                        <>
                          {(isAdmin || user?.id === p.createdById) && (
                            <button className="btn ghost small" title="Edit project" onClick={() => setEditProject(p)}>
                              ✏️ Edit
                            </button>
                          )}
                          <Link to={`/projects/${p.id}`} className="btn ghost small">Open →</Link>
                          {canDelete && (
                            <button
                              className="btn ghost small"
                              title="Delete project"
                              style={{ color: "#dc2626", borderColor: "#fecaca" }}
                              onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(p.id); }}
                            >
                              🗑
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <>
          <div className="drawer-back" onClick={() => setShowModal(false)} />
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
            background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)",
            padding: 28, width: "min(480px, 92vw)", zIndex: 60, boxShadow: "var(--shadow-lg)",
          }}>
            <h2 style={{ fontFamily: "var(--display)", margin: "0 0 16px", fontWeight: 500 }}>Create New Project</h2>
            <form onSubmit={handleCreate}>
              <label className="field"><span>Project Name</span><input name="name" required placeholder="e.g. Atlas Navigation Revamp" /></label>
              <label className="field"><span>Project Key (2-5 letters)</span><input name="key" required maxLength={5} placeholder="e.g. ATL" style={{ textTransform: "uppercase" }} /></label>
              <label className="field"><span>Description</span><textarea name="description" required rows={3} placeholder="Project objectives and deliverable scope" /></label>
              <label className="field">
                <span>Client</span>
                <select name="clientId" required defaultValue="">
                  <option value="" disabled>Select client</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.company} ({c.name})</option>)}
                </select>
              </label>
              {isAdmin && (
                <label className="field">
                  <span>Project Lead (Manager)</span>
                  <select name="leadId" defaultValue={user?.id}>
                    {leads.map((l) => <option key={l.id} value={l.id}>{l.name} ({formatRole(l.role)})</option>)}
                  </select>
                </label>
              )}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
                <button type="button" className="btn ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn" disabled={submitting}>{submitting ? "Creating…" : "Create project"}</button>
              </div>
            </form>
          </div>
        </>
      )}

      {editProject && (
        <>
          <div className="drawer-back" onClick={() => setEditProject(null)} />
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
            background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)",
            padding: 28, width: "min(480px, 92vw)", zIndex: 60, boxShadow: "var(--shadow-lg)",
          }}>
            <h2 style={{ fontFamily: "var(--display)", margin: "0 0 16px", fontWeight: 500 }}>Edit Project Details ({editProject.key})</h2>
            <form onSubmit={handleEdit}>
              <label className="field"><span>Project Name</span><input name="name" required defaultValue={editProject.name} /></label>
              <label className="field"><span>Description</span><textarea name="description" required rows={3} defaultValue={editProject.description} /></label>
              <label className="field">
                <span>Client</span>
                <select name="clientId" required defaultValue={editProject.client?.id}>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.company} ({c.name})</option>)}
                </select>
              </label>
              {isAdmin && (
                <label className="field">
                  <span>Project Lead (Manager)</span>
                  <select name="leadId" defaultValue={editProject.createdBy?.id ?? user?.id}>
                    {leads.map((l) => <option key={l.id} value={l.id}>{l.name} ({formatRole(l.role)})</option>)}
                  </select>
                </label>
              )}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
                <button type="button" className="btn ghost" onClick={() => setEditProject(null)}>Cancel</button>
                <button type="submit" className="btn" disabled={submitting}>{submitting ? "Saving…" : "Save changes"}</button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
