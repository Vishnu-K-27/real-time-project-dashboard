import { FormEvent, useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { api, Activity, Client, formatRole, Project, Task, User } from "../api";
import { useAuth } from "../auth";
import { Pulse } from "../components/Pulse";
import { TaskTable } from "../components/TaskTable";
import { TaskDrawer } from "../components/TaskDrawer";

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const [showNewTask, setShowNewTask] = useState(false);
  const [showEditProject, setShowEditProject] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [leads, setLeads] = useState<User[]>([]);
  const [devs, setDevs] = useState<User[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const canManage = user?.role === "ADMIN" || user?.role === "PROJECT_MANAGER";
  const isAdmin = user?.role === "ADMIN";

  // URL Query parameter state
  const statusFilter = searchParams.get("status") ?? "";
  const priorityFilter = searchParams.get("priority") ?? "";
  const dueFrom = searchParams.get("dueFrom") ?? "";
  const dueTo = searchParams.get("dueTo") ?? "";

  function updateFilter(key: string, val: string) {
    const next = new URLSearchParams(searchParams);
    if (val) {
      next.set(key, val);
    } else {
      next.delete(key);
    }
    setSearchParams(next);
  }

  async function openEditModal() {
    setError("");
    try {
      const [cRes, lRes] = await Promise.all([
        api.clientOptions().catch(() => ({ clients: [] })),
        api.leadOptions().catch(() => ({ leads: [] })),
      ]);
      setClients(cRes.clients);
      setLeads(lRes.leads);
      setShowEditProject(true);
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || "Failed to load options");
    }
  }

  async function loadData() {
    if (!id) return;
    try {
      setLoading(true);
      setError("");

      const qs = searchParams.toString() ? `?${searchParams.toString()}` : "";
      const [projRes, taskRes, actRes] = await Promise.all([
        api.project(id),
        api.projectTasks(id, qs),
        api.projectActivity(id),
      ]);

      setProject(projRes.project);
      setTasks(taskRes.tasks);
      setActivity(actRes.activity);

      if (canManage) {
        api.developers().then((r) => setDevs(r.users)).catch(() => undefined);
      }
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || "Failed to load project details");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, searchParams.toString()]);

  async function handleEditProject(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!id) return;
    setError("");
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    try {
      await api.patchProject(id, {
        name: fd.get("name"),
        description: fd.get("description"),
        clientId: fd.get("clientId"),
        leadId: fd.get("leadId") || undefined,
      });
      setShowEditProject(false);
      await loadData();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || "Failed to update project");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateTask(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!id) return;
    setError("");
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    try {
      const assignedToId = fd.get("assignedToId");
      await api.createTask(id, {
        title: fd.get("title"),
        description: fd.get("description"),
        priority: fd.get("priority"),
        startDate: fd.get("startDate") ? String(fd.get("startDate")) : undefined,
        dueDate: String(fd.get("dueDate")),
        assignedToId: assignedToId ? String(assignedToId) : null,
      });
      setShowNewTask(false);
      await loadData();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || "Failed to create task");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading && !project) {
    return <div style={{ padding: 32, color: "var(--muted)" }}>Loading project desk…</div>;
  }

  if (error && !project) {
    return (
      <div style={{ padding: 32 }}>
        <div className="err">{error}</div>
        <Link to="/projects" className="btn ghost small" style={{ marginTop: 12 }}>
          &larr; Back to projects
        </Link>
      </div>
    );
  }

  return (
    <div className="content">
      <main className="workspace-main">
        {project && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div className="crumbs" style={{ marginBottom: 4 }}>
                  <Link to="/projects">Projects</Link> / <strong>{project.key}</strong>
                </div>
                <h1 style={{ fontFamily: "var(--display)", fontSize: 28, margin: "0 0 6px", fontWeight: 500 }}>
                  {project.name}
                </h1>
                <p style={{ color: "var(--muted)", margin: 0, fontSize: 14 }}>
                  Client: <strong>{project.client?.company}</strong> ({project.client?.name}) &bull; Lead: <strong>{project.createdBy?.name ?? "—"}</strong>
                </p>
              </div>

              {canManage && (
                <div style={{ display: "flex", gap: 10 }}>
                  <button className="btn ghost" onClick={openEditModal}>
                    ✏️ Edit project
                  </button>
                  <button className="btn" onClick={() => setShowNewTask(true)}>
                    + New task
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="panel" style={{ padding: "12px 16px", marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", marginBottom: 8 }}>
            Filters
          </div>
          <div className="filters">
            <select value={statusFilter} onChange={(e) => updateFilter("status", e.target.value)}>
              <option value="">All Statuses</option>
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="IN_REVIEW">In Review</option>
              <option value="DONE">Done</option>
            </select>

            <select value={priorityFilter} onChange={(e) => updateFilter("priority", e.target.value)}>
              <option value="">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>

            <input
              type="date"
              placeholder="From date"
              title="From date"
              value={dueFrom}
              onChange={(e) => updateFilter("dueFrom", e.target.value)}
            />

            <input
              type="date"
              placeholder="To date"
              title="To date"
              value={dueTo}
              onChange={(e) => updateFilter("dueTo", e.target.value)}
            />

            {(statusFilter || priorityFilter || dueFrom || dueTo) && (
              <button
                className="btn ghost small"
                onClick={() => setSearchParams(new URLSearchParams())}
              >
                Reset filters
              </button>
            )}
          </div>
        </div>

        {error && <div className="err" style={{ marginBottom: 14 }}>{error}</div>}

        <div className="panel">
          {tasks.length === 0 ? (
            <div className="empty">No tasks match your current filter criteria.</div>
          ) : (
            <TaskTable
              tasks={tasks}
              onOpen={setActiveTask}
              canDelete={canManage}
              onDeleted={(id) => setTasks((prev) => prev.filter((t) => t.id !== id))}
            />
          )}
        </div>
      </main>

      <Pulse
        title={`${project?.key ?? "Project"} Activity Feed`}
        items={activity}
        onItems={setActivity}
      />

      {activeTask && (
        <TaskDrawer
          taskId={activeTask.id}
          onClose={() => setActiveTask(null)}
          onChanged={() => {
            loadData();
            setActiveTask(null);
          }}
        />
      )}

      {showNewTask && (
        <>
          <div className="drawer-back" onClick={() => setShowNewTask(false)} />
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              padding: 28,
              width: "min(500px, 92vw)",
              zIndex: 60,
              boxShadow: "var(--shadow-lg)",
            }}
          >
            <h2 style={{ fontFamily: "var(--display)", margin: "0 0 16px", fontWeight: 500 }}>
              Create Task in {project?.key}
            </h2>
            <form onSubmit={handleCreateTask}>
              <label className="field">
                <span>Task Title</span>
                <input name="title" required placeholder="e.g. Implement webhook retry policy" />
              </label>

              <label className="field">
                <span>Description</span>
                <textarea name="description" required rows={3} placeholder="Technical criteria and deliverable specs" />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <label className="field">
                  <span>Priority</span>
                  <select name="priority" defaultValue="MEDIUM">
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </label>

                <label className="field">
                  <span>Start Date</span>
                  <input
                    name="startDate"
                    type="date"
                    required
                    defaultValue={new Date().toISOString().slice(0, 10)}
                  />
                </label>

                <label className="field">
                  <span>Due Date</span>
                  <input
                    name="dueDate"
                    type="date"
                    required
                    defaultValue={new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)}
                  />
                </label>
              </div>

              <label className="field">
                <span>Assign Developer</span>
                <select name="assignedToId" defaultValue="">
                  <option value="">Unassigned</option>
                  {devs.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.email})
                    </option>
                  ))}
                </select>
              </label>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
                <button type="button" className="btn ghost" onClick={() => setShowNewTask(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn" disabled={submitting}>
                  {submitting ? "Saving…" : "Create task"}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {showEditProject && project && (
        <>
          <div className="drawer-back" onClick={() => setShowEditProject(false)} />
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              padding: 28,
              width: "min(480px, 92vw)",
              zIndex: 60,
              boxShadow: "var(--shadow-lg)",
            }}
          >
            <h2 style={{ fontFamily: "var(--display)", margin: "0 0 16px", fontWeight: 500 }}>
              Edit Project Details ({project.key})
            </h2>
            <form onSubmit={handleEditProject}>
              <label className="field">
                <span>Project Name</span>
                <input name="name" required defaultValue={project.name} />
              </label>

              <label className="field">
                <span>Description</span>
                <textarea name="description" required rows={3} defaultValue={project.description} />
              </label>

              <label className="field">
                <span>Client</span>
                <select name="clientId" required defaultValue={project.client?.id}>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company} ({c.name})
                    </option>
                  ))}
                </select>
              </label>

              {isAdmin && (
                <label className="field">
                  <span>Project Lead (Manager)</span>
                  <select name="leadId" defaultValue={project.createdBy?.id ?? user?.id}>
                    {leads.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} ({formatRole(l.role)})
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
                <button type="button" className="btn ghost" onClick={() => setShowEditProject(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn" disabled={submitting}>
                  {submitting ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
