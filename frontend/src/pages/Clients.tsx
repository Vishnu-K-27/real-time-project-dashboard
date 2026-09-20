import { FormEvent, useEffect, useState } from "react";
import { api, Client } from "../api";
import { useAuth } from "../auth";

export function Clients() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canDelete = user?.role === "ADMIN";

  async function load() {
    try {
      setLoading(true);
      setError("");
      const res = await api.clients();
      setClients(res.clients);
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || "Failed to load clients");
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
      await api.createClient({
        name: fd.get("name"),
        company: fd.get("company"),
        email: fd.get("email"),
      });
      setShowModal(false);
      await load();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || "Failed to create client");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(true);
    try {
      await api.deleteClient(id);
      setConfirmDeleteId(null);
      setClients((prev) => prev.filter((c) => c.id !== id));
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || "Failed to delete client");
      setConfirmDeleteId(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="content solo" style={{ maxWidth: 1000, margin: "0 auto", width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: "var(--display)", fontSize: 32, margin: "0 0 6px", fontWeight: 500 }}>Client Directory</h1>
          <p style={{ color: "var(--text-muted)", margin: 0, fontSize: 14 }}>
            External companies and stakeholders partnering with the studio.
          </p>
        </div>
        <button className="btn" onClick={() => setShowModal(true)}>+ New client</button>
      </div>

      {error && <div className="err" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="panel">
        {loading && <div style={{ color: "var(--text-muted)" }}>Loading client directory…</div>}
        {!loading && clients.length === 0 && <div className="empty">No client accounts created yet.</div>}
        {!loading && clients.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th>Company</th><th>Primary Contact</th><th>Email</th><th></th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} style={confirmDeleteId === c.id ? { background: "#fef2f2" } : undefined}>
                  <td><strong>{c.company}</strong></td>
                  <td>{c.name}</td>
                  <td><a href={`mailto:${c.email}`} style={{ color: "var(--primary)" }}>{c.email}</a></td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                      {confirmDeleteId === c.id ? (
                        <>
                          <span style={{ fontSize: 13, color: "#dc2626", fontWeight: 600 }}>Delete this client?</span>
                          <button
                            className="btn small"
                            style={{ background: "#dc2626", boxShadow: "none" }}
                            disabled={deleting}
                            onClick={() => handleDelete(c.id)}
                          >
                            {deleting ? "Deleting…" : "Yes, delete"}
                          </button>
                          <button className="btn ghost small" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
                        </>
                      ) : (
                        canDelete && (
                          <button
                            className="btn ghost small"
                            title="Delete client"
                            style={{ color: "#dc2626", borderColor: "#fecaca" }}
                            onClick={() => setConfirmDeleteId(c.id)}
                          >
                            🗑
                          </button>
                        )
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
            padding: 28, width: "min(460px, 92vw)", zIndex: 60, boxShadow: "var(--shadow-lg)",
          }}>
            <h2 style={{ fontFamily: "var(--display)", margin: "0 0 16px", fontWeight: 500 }}>Add New Client</h2>
            <form onSubmit={handleCreate}>
              <label className="field"><span>Company Name</span><input name="company" required placeholder="e.g. Apex Health Systems" /></label>
              <label className="field"><span>Contact Name</span><input name="name" required placeholder="e.g. Rachel Adams" /></label>
              <label className="field"><span>Email Address</span><input name="email" type="email" required placeholder="e.g. rachel@apexhealth.example" /></label>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
                <button type="button" className="btn ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn" disabled={submitting}>{submitting ? "Saving…" : "Add client"}</button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
